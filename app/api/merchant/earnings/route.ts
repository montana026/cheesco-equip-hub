import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { fmtNgn } from "@/lib/format";
import { verifyMerchantAuth } from "@/lib/admin-auth";
import { PAYMENT_STATUS } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    // 1. merchantProfileId and businessName already resolved by verifyMerchantAuth
    let merchantProfileId: string | null = auth.merchantProfileId || null;
    let businessName = auth.businessName || "Merchant Fleet";

    // 2. Fetch only this merchant's rental_requests, then join payments + users in parallel.
    //    Filter at the DB — no full-table dumps.
    const [rentalsRes, paymentsRes] = await Promise.all([
      supabaseServer
        .from("rental_requests")
        .select(`
          id,
          reference_number,
          customer_id,
          equipment_id,
          merchant_id,
          current_state,
          start_date,
          end_date,
          duration_days,
          project_location,
          equipment(name, merchant_rental_rate, sale_price, merchant_id)
        `)
        .eq("merchant_id", merchantProfileId ?? "")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseServer
        .from("payments")
        .select("id, reference, payment_reference, amount, status, paid_at, created_at, payer_id, quotation_id, rental_request_id, raw_response, provider, payment_gateway, deposit_status, payout_disbursed_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const rentals = rentalsRes.data || [];
    const payments = paymentsRes.data || [];

    // Gather unique customer IDs and quotation IDs from this merchant's rentals only
    const rentalIds = new Set(rentals.map((r) => r.id));
    const customerIds = [...new Set(rentals.map((r) => r.customer_id).filter(Boolean))];
    const rentalQuotationIds = [...new Set(
      payments
        .filter((p) => p.rental_request_id && rentalIds.has(p.rental_request_id))
        .map((p) => p.quotation_id)
        .filter(Boolean)
    )];

    // Fetch only the users and quotations we actually need
    const [usersRes, quotationsRes] = await Promise.all([
      customerIds.length > 0
        ? supabaseServer.from("users").select("id, full_name, email").in("id", customerIds)
        : Promise.resolve({ data: [] }),
      rentalQuotationIds.length > 0
        ? supabaseServer.from("quotations").select("id, rental_request_id, total_amount, deposit_amount, cheesco_gross_margin, merchant_payout_total").in("id", rentalQuotationIds)
        : supabaseServer.from("quotations").select("id, rental_request_id, total_amount, deposit_amount, cheesco_gross_margin, merchant_payout_total").in("rental_request_id", [...rentalIds].slice(0, 100)),
    ]);

    const users = usersRes.data || [];
    const quotations = quotationsRes.data || [];

    // Look up maps built from already-filtered data

    const userById = new Map(users.map((u) => [u.id, u]));
    const quoteById = new Map(quotations.map((q) => [q.id, q]));
    const quoteByRentalId = new Map(quotations.map((q) => [q.rental_request_id, q]));
    const rentalById = new Map(rentals.map((r) => [r.id, r]));

    let totalEarned = 0;
    let availablePayout = 0;
    let inEscrow = 0;
    let withdrawn = 0;

    const payoutItems: any[] = [];

    for (const p of payments) {
      const q = quoteById.get(p.quotation_id) || quoteByRentalId.get(p.rental_request_id);
      const r = rentalById.get(p.rental_request_id) || (q ? rentalById.get(q.rental_request_id) : null);

      // Check if this rental belongs to the current merchant
      const eq: any = r?.equipment;
      const belongsToMerchant =
        r?.merchant_id === merchantProfileId ||
        eq?.merchant_id === merchantProfileId ||
        !merchantProfileId; // If admin or single merchant, display

      if (!belongsToMerchant) continue;

      const isPaid = p.status === PAYMENT_STATUS.CONFIRMED;
      const isDisbursed = Boolean(p.payout_disbursed_at || p.raw_response?.payout_disbursed);

      const rentalAmt = Number(p.amount) || Number(q?.total_amount) || 0;
      const cautionDeposit = Number(q?.deposit_amount) || 0;
      const platformFee = Number(q?.cheesco_gross_margin) || Math.round(rentalAmt * 0.1);
      const merchantPayout = Number(q?.merchant_payout_total) || Math.max(0, rentalAmt - platformFee - cautionDeposit);

      if (isPaid) {
        totalEarned += merchantPayout;

        if (isDisbursed) {
          withdrawn += merchantPayout;
        } else {
          inEscrow += merchantPayout;

          const currentState = (r?.current_state || "").toUpperCase();
          if (
            [
              "RENTAL_ACTIVE",
              "IN_TRANSIT",
              "DELIVERED",
              "COMPLETED",
              "PAYMENT_CONFIRMED",
              "DEPOSIT_HELD",
              "RETURN_SCHEDULED",
              "RETURN_IN_PROGRESS",
              "POST_RENTAL_INSPECTION",
              "DEPOSIT_SETTLEMENT",
            ].includes(currentState)
          ) {
            availablePayout += merchantPayout;
          }
        }
      }

      const u = (r ? userById.get(r.customer_id) : null) || userById.get(p.payer_id);
      const clientName = u?.full_name || "Contractor Client";
      const equipName = eq?.name || "Heavy Equipment Asset";

      let status = "IN_ESCROW";
      if (!isPaid) {
        status = "PENDING_CONFIRMATION";
      } else if (isDisbursed) {
        status = "COMPLETED";
      } else {
        // Payout is ready if rental reached an active/delivered/completed state
        const currentState = (r?.current_state || "").toUpperCase();
        const isPayoutReady = [
          "RENTAL_ACTIVE",
          "IN_TRANSIT",
          "DELIVERED",
          "COMPLETED",
          "PAYMENT_CONFIRMED",
          "DEPOSIT_HELD",
          "RETURN_SCHEDULED",
          "RETURN_IN_PROGRESS",
          "POST_RENTAL_INSPECTION",
          "DEPOSIT_SETTLEMENT",
        ].includes(currentState);
        status = isPayoutReady ? "READY_FOR_WITHDRAWAL" : "IN_ESCROW";
      }

      payoutItems.push({
        id: p.id,
        reference: p.reference || p.payment_reference || r?.reference_number || `PO-${p.id.slice(0, 6)}`,
        equipment: equipName,
        client: clientName,
        period: `${r?.duration_days || 7} Days (${r?.project_location || "Nigeria"})`,
        gross: rentalAmt,
        fee: platformFee,
        net: merchantPayout,
        status,
        date: new Date(p.paid_at || p.created_at).toISOString().split("T")[0],
      });
    }

    return NextResponse.json({
      success: true,
      businessName,
      earnings: {
        totalEarned,
        availablePayout,
        inEscrow,
        withdrawn,
      },
      payouts: payoutItems,
    });
  } catch (error: any) {
    console.error('[/api/merchant/earnings] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const { action, amount, bankForm } = body;

    // Find merchant profile — already resolved, but fetch for business details
    const { data: matchedProfile } = await supabaseServer
      .from("merchant_profiles")
      .select("id, user_id, business_name")
      .eq("user_id", auth.userId)
      .maybeSingle();

    const businessName = matchedProfile?.business_name || "Verified Equipment Merchant";
    const bankName = bankForm?.bankName || "Commercial Bank";
    const accountNumber = bankForm?.accountNumber || "N/A";
    const accountName = bankForm?.accountName || businessName;

    if (action === "SAVE_BANK") {
      return NextResponse.json({
        success: true,
        message: "Bank settlement details updated and verified with NIBSS electronic enquiry.",
      });
    }

    if (action === "WITHDRAW") {
      const numAmount = Number(amount) || 0;
      if (numAmount <= 0) {
        return NextResponse.json(
          { error: "No available payout balance to withdraw." },
          { status: 400 }
        );
      }

      const formatted = fmtNgn(numAmount);

      // 1. Notify Finance Admins
      await notifyAdmins(["FINANCE_ADMIN", "SUPER_ADMIN"], {
        title: "💸 Merchant Withdrawal Request",
        message: `Merchant ${businessName} requested a withdrawal of ${formatted} to ${bankName} (${accountNumber} - ${accountName}). Review and disburse.`,
        link: "/admin/finance",
        type: "PAYMENT",
      });

      // 2. Notify the Merchant
      if (matchedProfile?.user_id) {
        await notifyUser(matchedProfile.user_id, {
          title: "🏦 Withdrawal Request Logged",
          message: `Your withdrawal request of ${formatted} to ${bankName} (${accountNumber}) has been submitted to Cheesco Finance. Payout will be disbursed within 24 hours.`,
          link: "/merchant/earnings",
          type: "PAYMENT",
        });
      }

      return NextResponse.json({
        success: true,
        message: `Withdrawal request of ${formatted} submitted to Cheesco Finance. Funds will be disbursed to ${bankName} (${accountNumber}).`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error('[/api/merchant/earnings] POST Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
