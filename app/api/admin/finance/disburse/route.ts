import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { fmtNgn } from "@/lib/format";
import { PAYMENT_STATUS } from "@/lib/services/payment.service";

/**
 * Rental states where equipment has been verified as delivered to the customer,
 * meaning merchant escrow payout can be safely unlocked and disbursed.
 * Business owner must confirm this list before going live.
 */
const PAYOUT_ALLOWED_RENTAL_STATES = [
  "DELIVERED",
  "RENTAL_ACTIVE",
  "RETURN_SCHEDULED",
  "RETURN_IN_PROGRESS",
  "POST_RENTAL_INSPECTION",
  "DEPOSIT_SETTLEMENT",
  "COMPLETED",
];

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, ["FINANCE_ADMIN", "SUPER_ADMIN"]);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Forbidden: Finance Admin authorization required" },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { paymentId, rentalRequestId, reference, amount, notes } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId is required for payout disbursement" },
        { status: 400 }
      );
    }

    // 1. Pre-flight check: Inspect payment, rental request state, and quotation payout amounts
    const { data: existingPayment, error: fetchErr } = await supabaseServer
      .from("payments")
      .select(`
        id,
        amount,
        status,
        payout_disbursed_at,
        payout_amount,
        payout_reference,
        rental_request_id,
        quotation_id,
        reference,
        payment_reference
      `)
      .eq("id", paymentId)
      .single();

    if (fetchErr || !existingPayment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    // Idempotency: if already disbursed, return success immediately
    if (existingPayment.payout_disbursed_at) {
      return NextResponse.json({
        success: true,
        message: "Payout was already disbursed (idempotent).",
        disbursedAt: existingPayment.payout_disbursed_at,
      });
    }

    if (existingPayment.status !== PAYMENT_STATUS.CONFIRMED) {
      return NextResponse.json(
        {
          error: `Cannot disburse: payment status is '${existingPayment.status}'. Only CONFIRMED payments can be disbursed.`,
        },
        { status: 409 }
      );
    }

    const rId = existingPayment.rental_request_id || rentalRequestId;
    let rental: any = null;
    let merchantUserId: string | null = null;
    let equipmentName = "Equipment";
    let rentalRef = reference || existingPayment.payment_reference || existingPayment.reference;

    if (rId) {
      const { data: rData } = await supabaseServer
        .from("rental_requests")
        .select(`
          id,
          reference_number,
          merchant_id,
          current_state,
          equipment(name, merchant_profiles(user_id, business_name))
        `)
        .eq("id", rId)
        .single();

      rental = rData;
      if (rental) {
        rentalRef = rental.reference_number || rentalRef;
        const eq: any = rental.equipment;
        equipmentName = eq?.name || equipmentName;
        merchantUserId = eq?.merchant_profiles?.user_id || null;
      }
    }

    // 2. State Guard: Delivery & Inspection check
    // Escrow payout is strictly forbidden if equipment hasn't reached delivered/active/completed status.
    if (!rental) {
      return NextResponse.json(
        { error: "Cannot disburse: associated rental request not found." },
        { status: 409 }
      );
    }

    const currentState = (rental.current_state || "").toUpperCase();
    if (!PAYOUT_ALLOWED_RENTAL_STATES.includes(currentState)) {
      return NextResponse.json(
        {
          error: `Cannot disburse payout: equipment has not reached delivery verification. Rental state is '${currentState}'. Allowed states: ${PAYOUT_ALLOWED_RENTAL_STATES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 3. Amount Validation: Server computes authoritative merchant payout amount
    // Never trust client-supplied amount blindly.
    let quotation: any = null;
    const qId = existingPayment.quotation_id;
    if (qId) {
      const { data: qData } = await supabaseServer
        .from("quotations")
        .select("total_amount, deposit_amount, cheesco_gross_margin, merchant_payout_total")
        .eq("id", qId)
        .single();
      quotation = qData;
    }

    // Fail-closed: cannot disburse without quotation payout figures
    if (!quotation?.merchant_payout_total && !quotation?.cheesco_gross_margin) {
      return NextResponse.json(
        {
          error:
            "Cannot disburse: quotation is missing merchant_payout_total and cheesco_gross_margin. Please update the quotation before disbursing.",
        },
        { status: 409 }
      );
    }

    const totalPaid = Number(existingPayment.amount) || 0;
    const cautionDeposit = Number(quotation?.deposit_amount) || 0;
    const platformMargin = Number(quotation?.cheesco_gross_margin) || 0;
    const computedPayout =
      Number(quotation?.merchant_payout_total) ||
      Math.max(0, totalPaid - platformMargin - cautionDeposit);

    if (computedPayout <= 0) {
      return NextResponse.json(
        { error: "Computed merchant payout amount is zero or negative." },
        { status: 400 }
      );
    }

    // If client supplied an amount, ensure it is positive, finite, and does not exceed computed payout
    let finalPayoutAmount = computedPayout;
    if (amount !== undefined && amount !== null) {
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: "Supplied payout amount must be a finite positive number." },
          { status: 400 }
        );
      }
      if (numAmount > computedPayout + 1) {
        return NextResponse.json(
          {
            error: `Supplied payout amount (${numAmount}) exceeds verified computed payout (${computedPayout}).`,
          },
          { status: 400 }
        );
      }
      finalPayoutAmount = numAmount;
    }

    const nowIso = new Date().toISOString();
    // Unique payout reference for accounting and gateway idempotency
    const uniquePayoutRef = `PO-${existingPayment.id.slice(0, 8)}-${Date.now()}`;

    // 4. Atomic conditional UPDATE — only disburse if CONFIRMED and payout_disbursed_at is NULL
    const { data: updatedRows, error: updateError } = await supabaseServer
      .from("payments")
      .update({
        payout_amount: finalPayoutAmount,
        payout_disbursed_at: nowIso,
        payout_disbursed_by: auth.userId,
        payout_reference: uniquePayoutRef,
        updated_at: nowIso,
      })
      .eq("id", paymentId)
      .eq("status", PAYMENT_STATUS.CONFIRMED)
      .is("payout_disbursed_at", null) // Idempotency guard against race conditions
      .select("id, amount, rental_request_id, payout_amount, payment_reference, reference, payout_reference");

    if (updateError) {
      console.error("Failed to update payout status:", updateError);
      throw updateError;
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Re-read: Double-click or concurrent admin call already completed the disbursement
      const { data: recheck } = await supabaseServer
        .from("payments")
        .select("id, payout_disbursed_at")
        .eq("id", paymentId)
        .single();

      if (recheck?.payout_disbursed_at) {
        return NextResponse.json({
          success: true,
          message: "Payout was already disbursed by another concurrent transaction (idempotent).",
          disbursedAt: recheck.payout_disbursed_at,
        });
      }

      return NextResponse.json(
        { error: "Disbursement update failed: payment could not be transitioned." },
        { status: 409 }
      );
    }

    const formattedAmount = fmtNgn(finalPayoutAmount);

    // 5. Notify merchant if merchant account exists
    if (merchantUserId) {
      await notifyUser(merchantUserId, {
        title: "💰 Escrow Payout Disbursed",
        message: `Your payout of ${formattedAmount} for ${rentalRef} (${equipmentName}) has been processed and disbursed (Ref: ${uniquePayoutRef}).`,
        link: "/merchant/dashboard",
        type: "PAYMENT",
      });
    }

    // 6. Notify all admins
    await notifyAdmins(["FINANCE_ADMIN", "OPERATIONS_ADMIN"], {
      title: "✅ Merchant Payout Disbursed",
      message: `Finance Admin ${auth.email} disbursed ${formattedAmount} for ${rentalRef} (Ref: ${uniquePayoutRef}).`,
      link: "/admin/finance",
      type: "PAYMENT",
    });

    return NextResponse.json({
      success: true,
      message: `Payout of ${formattedAmount} disbursed successfully for ${rentalRef}`,
      payoutReference: uniquePayoutRef,
      disbursedAt: nowIso,
    });
  } catch (error: any) {
    console.error('[/api/admin/finance/disburse] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
