import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { fmtNgn } from "@/lib/format";
import { DEPOSIT_STATUS } from "@/lib/services/payment.service";

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
    const { paymentId, rentalRequestId, reference, amount, reason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId is required to release deposit" },
        { status: 400 }
      );
    }

    // 1. Fetch existing payment and quotation details for server-side deposit calculation
    const { data: existingPayment, error: fetchErr } = await supabaseServer
      .from("payments")
      .select(`
        id,
        amount,
        deposit_status,
        deposit_released_at,
        deposit_deduction_amount,
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

    // Idempotency check: if deposit already released, return success immediately
    if (
      existingPayment.deposit_released_at ||
      existingPayment.deposit_status === DEPOSIT_STATUS.RELEASED
    ) {
      return NextResponse.json({
        success: true,
        message: "Caution deposit was already released (idempotent).",
        releasedAt: existingPayment.deposit_released_at,
      });
    }

    if (existingPayment.deposit_status !== DEPOSIT_STATUS.HELD) {
      return NextResponse.json(
        {
          error: `Cannot release deposit: deposit_status is '${existingPayment.deposit_status}'. Only HELD deposits can be released.`,
        },
        { status: 409 }
      );
    }

    // 2. Server-side Amount Calculation
    // Never accept client-supplied amount blindly. Compute held deposit minus verified deductions.
    let quotation: any = null;
    if (existingPayment.quotation_id) {
      const { data: qData } = await supabaseServer
        .from("quotations")
        .select("deposit_amount, total_amount")
        .eq("id", existingPayment.quotation_id)
        .single();
      quotation = qData;
    }

    const heldCautionDeposit =
      Number(quotation?.deposit_amount) || Number(existingPayment.amount) || 0;
    const deductions = Number(existingPayment.deposit_deduction_amount) || 0;
    const maxRefundAllowed = Math.max(0, heldCautionDeposit - deductions);

    if (maxRefundAllowed <= 0) {
      return NextResponse.json(
        { error: "No refundable deposit balance remaining after deductions." },
        { status: 400 }
      );
    }

    // If client specified an amount, ensure it is positive, finite, and <= maxRefundAllowed
    let finalRefundAmount = maxRefundAllowed;
    if (amount !== undefined && amount !== null) {
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: "Supplied refund amount must be a finite positive number." },
          { status: 400 }
        );
      }
      if (numAmount > maxRefundAllowed + 1) {
        return NextResponse.json(
          {
            error: `Supplied refund amount (${numAmount}) exceeds allowable deposit refund (${maxRefundAllowed}).`,
          },
          { status: 400 }
        );
      }
      finalRefundAmount = numAmount;
    }

    const nowIso = new Date().toISOString();
    const uniqueRefundRef = `REFUND-DEP-${existingPayment.id.slice(0, 8)}-${Date.now()}`;

    // 3. Atomic conditional UPDATE — only release if deposit_status = HELD
    const { data: updatedRows, error: updateError } = await supabaseServer
      .from("payments")
      .update({
        deposit_status: DEPOSIT_STATUS.RELEASED,
        deposit_released_at: nowIso,
        deposit_refunded_by: auth.userId,
        refund_amount: finalRefundAmount,
        refund_reason:
          reason || "Caution deposit refund approved following post-demobilization inspection",
        payout_reference: uniqueRefundRef,
        updated_at: nowIso,
      })
      .eq("id", paymentId)
      .eq("deposit_status", DEPOSIT_STATUS.HELD) // Idempotency guard against concurrent clicks
      .select("id, amount, deposit_deduction_amount, rental_request_id, refund_amount, payment_reference, reference, payout_reference");

    if (updateError) {
      console.error("Failed to release deposit:", updateError);
      throw updateError;
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Re-read: Double-click or concurrent admin call already completed the refund
      const { data: recheck } = await supabaseServer
        .from("payments")
        .select("id, deposit_status, deposit_released_at")
        .eq("id", paymentId)
        .single();

      if (recheck?.deposit_released_at || recheck?.deposit_status === DEPOSIT_STATUS.RELEASED) {
        return NextResponse.json({
          success: true,
          message: "Deposit was already released by another concurrent transaction (idempotent).",
          releasedAt: recheck.deposit_released_at,
        });
      }

      return NextResponse.json(
        { error: "Deposit refund update failed: record could not be transitioned." },
        { status: 409 }
      );
    }

    const rId = existingPayment.rental_request_id || rentalRequestId;
    let customerUserId: string | null = null;
    let equipmentName = "Equipment";
    let rentalRef = reference || existingPayment.payment_reference || existingPayment.reference;

    if (rId) {
      const { data: rental } = await supabaseServer
        .from("rental_requests")
        .select(`
          id,
          reference_number,
          customer_id,
          equipment(name)
        `)
        .eq("id", rId)
        .single();

      if (rental) {
        rentalRef = rental.reference_number || rentalRef;
        customerUserId = rental.customer_id;
        const eq: any = rental.equipment;
        equipmentName = eq?.name || equipmentName;
      }
    }

    const formattedAmount = fmtNgn(finalRefundAmount);

    // 4. Notify customer
    if (customerUserId) {
      await notifyUser(customerUserId, {
        title: "🛡️ Caution Deposit Refunded",
        message: `Your caution deposit of ${formattedAmount} for ${rentalRef} (${equipmentName}) has been refunded to your payment account (Ref: ${uniqueRefundRef}).`,
        link: "/dashboard/customer?tab=rentals",
        type: "PAYMENT",
      });
    }

    // 5. Notify all admins
    await notifyAdmins(["FINANCE_ADMIN", "OPERATIONS_ADMIN"], {
      title: "✅ Caution Deposit Released",
      message: `Finance Admin ${auth.email} released caution deposit of ${formattedAmount} for ${rentalRef} (Ref: ${uniqueRefundRef}).`,
      link: "/admin/finance",
      type: "PAYMENT",
    });

    return NextResponse.json({
      success: true,
      message: `Caution deposit of ${formattedAmount} released successfully for ${rentalRef}`,
      refundReference: uniqueRefundRef,
      releasedAt: nowIso,
    });
  } catch (error: any) {
    console.error('[/api/admin/finance/refund-deposit] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
