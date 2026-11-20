import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { PAYMENT_STATUS, DEPOSIT_STATUS } from "@/lib/types";

export interface FinanceTransaction {
  id: string;
  paymentId: string;
  reference: string;
  rentalRequestId?: string;
  quotationId?: string;
  customerName: string;
  customerEmail: string;
  merchantName: string;
  merchantBank?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    phone?: string;
  };
  equipmentName: string;
  rentalAmount: number;
  cautionDeposit: number;
  platformFee: number;
  merchantPayout: number;
  paymentMethod: string;
  paymentStatus: "CONFIRMED" | "PENDING" | "FAILED" | string;
  escrowStatus: "ESCROW_HELD" | "PAYOUT_READY" | "DISBURSED" | "DEPOSIT_REFUNDED" | "PENDING_PAYMENT";
  depositStatus: "HELD" | "RELEASED" | "PARTIALLY_DEDUCTED" | "NONE";
  date: string;
  paidAt?: string;
  payoutDisbursedAt?: string;
  isPurchase: boolean;
  rentalState: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, [
      "FINANCE_ADMIN",
      "SUPER_ADMIN",
      "OPERATIONS_ADMIN",
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Forbidden: Finance or Super Admin access required" },
        { status: auth.status || 403 }
      );
    }

    // 1. Fetch live records from database using service role client
    const [paymentsRes, quotationsRes, rentalsRes, usersRes, merchantsRes] = await Promise.all([
      supabaseServer
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseServer.from("quotations").select("*"),
      supabaseServer.from("rental_requests").select(`
        id,
        reference_number,
        customer_id,
        equipment_id,
        merchant_id,
        current_state,
        start_date,
        end_date,
        duration_days,
        additional_requirements,
        project_type,
        equipment(name, merchant_rental_rate, sale_price, merchant_profiles(id, business_name, business_phone, verification_notes))
      `),
      supabaseServer.from("users").select("id, full_name, email, phone"),
      supabaseServer.from("merchant_profiles").select("*"),
    ]);

    if (paymentsRes.error) {
      console.error("Error querying payments:", paymentsRes.error);
      throw paymentsRes.error;
    }

    const payments = paymentsRes.data || [];
    const quotations = quotationsRes.data || [];
    const rentals = rentalsRes.data || [];
    const users = usersRes.data || [];
    const merchants = merchantsRes.data || [];

    // Build lookup maps for fast indexed joins
    const userById = new Map(users.map((u) => [u.id, u]));
    const quoteById = new Map(quotations.map((q) => [q.id, q]));
    const quoteByRentalId = new Map(quotations.map((q) => [q.rental_request_id, q]));
    const rentalById = new Map(rentals.map((r) => [r.id, r]));
    const merchantById = new Map(merchants.map((m) => [m.id, m]));

    let totalEscrowVault = 0;
    let pendingPayoutsSum = 0;
    let platformRevenueSum = 0;
    let cautionDepositsHeldSum = 0;
    let disbursedTotalSum = 0;
    let totalGrossVolume = 0;

    // Track seen payment references to avoid duplicates
    const seenPaymentIds = new Set<string>();

    const transactions: FinanceTransaction[] = [];

    // Process all payment records
    for (const p of payments) {
      seenPaymentIds.add(p.id);

      const q = quoteById.get(p.quotation_id) || quoteByRentalId.get(p.rental_request_id);
      const r = rentalById.get(p.rental_request_id) || (q ? rentalById.get(q.rental_request_id) : null);
      const u = (r ? userById.get(r.customer_id) : null) || userById.get(p.payer_id);

      const isPurchase = Boolean(
        r?.reference_number?.startsWith("PUR") ||
        r?.additional_requirements?.includes("[PURCHASE") ||
        r?.project_type?.includes("Purchase")
      );

      const rentalAmt = Number(p.amount) || Number(q?.total_amount) || 0;
      const cautionDeposit = Number(q?.deposit_amount) || 0;
      const platformFee = Number(q?.cheesco_gross_margin) || Math.round(rentalAmt * (isPurchase ? 0.08 : 0.1));
      const merchantPayout = Number(q?.merchant_payout_total) || Math.max(0, rentalAmt - platformFee - cautionDeposit);

      const isPaid = p.status === PAYMENT_STATUS.CONFIRMED;
      const isDisbursed = Boolean(p.payout_disbursed_at || p.raw_response?.payout_disbursed);
      const isDepositRefunded = p.deposit_status === DEPOSIT_STATUS.RELEASED || Boolean(p.deposit_released_at || p.raw_response?.deposit_refunded);

      const currentState = (r?.current_state || "").toUpperCase();

      // Determine escrow status
      let escrowStatus: FinanceTransaction["escrowStatus"] = "ESCROW_HELD";
      if (!isPaid) {
        escrowStatus = "PENDING_PAYMENT";
      } else if (isDisbursed) {
        escrowStatus = "DISBURSED";
      } else if (isDepositRefunded && cautionDeposit > 0 && rentalAmt === cautionDeposit) {
        escrowStatus = "DEPOSIT_REFUNDED";
      } else if (
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
        // If payment is confirmed and rental is confirmed/active/delivered, payout is ready
        escrowStatus = "PAYOUT_READY";
      } else {
        escrowStatus = "ESCROW_HELD";
      }

      // Aggregate calculations
      if (isPaid) {
        totalGrossVolume += rentalAmt;
        platformRevenueSum += platformFee;

        if (isDisbursed) {
          disbursedTotalSum += merchantPayout;
        } else {
          totalEscrowVault += rentalAmt;
          pendingPayoutsSum += merchantPayout;
        }

        if (cautionDeposit > 0) {
          if (!isDepositRefunded) {
            cautionDepositsHeldSum += cautionDeposit;
          }
        }
      }

      const eq: any = r?.equipment;
      const equipName = eq?.name || "Heavy Equipment Asset";
      const merchProfile = eq?.merchant_profiles || (r?.merchant_id ? merchantById.get(r.merchant_id) : null);
      const merchName = merchProfile?.business_name || "Verified Equipment Merchant";

      // Parse settlement bank details
      const merchantBank = {
        bankName: "Commercial Bank",
        accountNumber: "0123456789",
        accountName: merchName,
        phone: merchProfile?.business_phone || undefined,
      };

      const notesRaw = merchProfile?.verification_notes;
      if (notesRaw) {
        try {
          const parsed = typeof notesRaw === "string" ? JSON.parse(notesRaw) : notesRaw;
          if (parsed.bank_name) merchantBank.bankName = parsed.bank_name;
          if (parsed.account_number) merchantBank.accountNumber = parsed.account_number;
          if (parsed.account_name) merchantBank.accountName = parsed.account_name;
        } catch {
          // ignore
        }
      }

      const txDate = p.paid_at || p.created_at || new Date().toISOString();

      transactions.push({
        id: p.id,
        paymentId: p.id,
        reference: p.reference || p.payment_reference || r?.reference_number || `TX-${p.id.slice(0, 8)}`,
        rentalRequestId: r?.id,
        quotationId: q?.id,
        customerName: u?.full_name || u?.email || "Contractor Client",
        customerEmail: u?.email || "",
        merchantName: merchName,
        merchantBank,
        equipmentName: equipName,
        rentalAmount: rentalAmt,
        cautionDeposit,
        platformFee,
        merchantPayout,
        paymentMethod: p.provider || p.payment_gateway || "paystack",
        paymentStatus: isPaid ? "CONFIRMED" : p.status || "PENDING",
        escrowStatus,
        depositStatus: isDepositRefunded ? "RELEASED" : cautionDeposit > 0 ? "HELD" : "NONE",
        date: new Date(txDate).toISOString().split("T")[0],
        paidAt: p.paid_at || undefined,
        payoutDisbursedAt: p.raw_response?.payout_disbursed_at || undefined,
        isPurchase,
        rentalState: currentState || "PENDING",
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalEscrow: totalEscrowVault,
        pendingPayouts: pendingPayoutsSum,
        platformRevenue: platformRevenueSum,
        cautionDepositsHeld: cautionDepositsHeldSum,
        totalVolume: totalGrossVolume,
        disbursedTotal: disbursedTotalSum,
      },
      transactions,
    });
  } catch (error: any) {
    console.error('[/api/admin/finance] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
