// Supabase Edge Function: flutterwave-webhook
// verify_jwt = false
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const flwSecret = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
  const webhookHash = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  // 1. Verify Flutterwave signature header (verif-hash)
  const incomingHash = req.headers.get("verif-hash");
  if (webhookHash && incomingHash !== webhookHash) {
    console.error("Invalid Flutterwave verif-hash");
    return new Response(JSON.stringify({ error: "Invalid webhook hash" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let eventData: any;
  try {
    eventData = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const transactionId = eventData.data?.id;
  const txRef = eventData.data?.tx_ref;

  if (!txRef) {
    return new Response(JSON.stringify({ message: "No tx_ref in event" }), { status: 200 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 2. Fetch payment row from database by reference
  const { data: payment, error: pErr } = await supabase
    .from("payments")
    .select("*, quotation:quotations(id, status, rental_request_id)")
    .or(`reference.eq.${txRef},payment_reference.eq.${txRef}`)
    .maybeSingle();

  if (pErr || !payment) {
    console.error("Payment not found for reference:", txRef);
    return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404 });
  }

  // 3. IDEMPOTENT: Ignore event if payment is already "paid"
  if (payment.status === "paid" || payment.status === "CONFIRMED") {
    return new Response(
      JSON.stringify({ message: "Payment already processed and marked as paid" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Call Flutterwave verify API
  let verifiedData = eventData.data;
  if (flwSecret && !flwSecret.includes("your_flutterwave") && transactionId) {
    try {
      const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
        headers: {
          Authorization: `Bearer ${flwSecret}`,
        },
      });
      const flwJson = await flwRes.json();
      if (flwJson.status !== "success" || flwJson.data?.status !== "successful") {
        return new Response(JSON.stringify({ error: "Flutterwave verification failed" }), { status: 400 });
      }
      verifiedData = flwJson.data;
    } catch (e: any) {
      console.error("Flutterwave verify API error:", e);
      return new Response(JSON.stringify({ error: "Failed to verify transaction with Flutterwave" }), { status: 500 });
    }
  }

  // 5. Verify amount and currency
  const verifiedAmount = Number(verifiedData.amount);
  const expectedAmount = Number(payment.amount);

  if (Math.abs(verifiedAmount - expectedAmount) > 1) {
    console.error("Amount mismatch:", { verifiedAmount, expectedAmount });
    await supabase
      .from("payments")
      .update({
        status: "failed",
        raw_response: { ...eventData, mismatch: "amount_mismatch", verifiedAmount, expectedAmount },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
  }

  if (verifiedData.currency && verifiedData.currency.toUpperCase() !== "NGN") {
    return new Response(JSON.stringify({ error: "Currency mismatch" }), { status: 400 });
  }

  // 6. Update payment to "paid"
  await supabase
    .from("payments")
    .update({
      status: "paid",
      raw_response: verifiedData,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  // 7. Update quotation to "accepted"
  const quotationId = payment.quotation_id || payment.quotation?.id;
  if (quotationId) {
    await supabase
      .from("quotations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", quotationId);
  }

  // 8. Update rental request to "PAYMENT_CONFIRMED"
  const rentalRequestId = payment.rental_request_id || payment.quotation?.rental_request_id;
  if (rentalRequestId) {
    await supabase
      .from("rental_requests")
      .update({ current_state: "PAYMENT_CONFIRMED" })
      .eq("id", rentalRequestId);

    // Fetch rental + equipment + quotation for rich notifications
    const { data: rental } = await supabase
      .from("rental_requests")
      .select(`
        id, reference_number, customer_id, merchant_id, project_type,
        equipment(id, name, merchant_profiles(id, user_id, business_name))
      `)
      .eq("id", rentalRequestId)
      .maybeSingle();

    const eq: any = rental?.equipment;
    const equipmentName = eq?.name || "Heavy Equipment";
    const isPurchase =
      rental?.reference_number?.startsWith("PUR") ||
      rental?.project_type?.toLowerCase().includes("purchase");
    const transactionType = isPurchase ? "Outright Sale" : "Rental";

    const { data: quotation } = await supabase
      .from("quotations")
      .select("merchant_payout_total, reference_number")
      .eq("id", quotationId)
      .maybeSingle();

    const merchantPayout = Number(quotation?.merchant_payout_total) || 0;
    const invoiceRef = quotation?.reference_number || payment.reference || rentalRequestId;

    // Notify merchant — payout only, no platform charges
    const merchantUserId = eq?.merchant_profiles?.user_id;
    if (merchantUserId) {
      await supabase.from("notifications").insert({
        user_id: merchantUserId,
        type: "PAYMENT",
        title: `✅ Payment Confirmed — ${transactionType}`,
        message: `Payment has been confirmed for your ${transactionType.toLowerCase()} of ${equipmentName} (Ref: ${rental?.reference_number || invoiceRef}). Your payout of ₦${merchantPayout.toLocaleString()} is now held in escrow and will be disbursed upon equipment ${isPurchase ? "handover" : "delivery completion"}.`,
        link: `/merchant/earnings`,
        is_read: false,
      });
    }

    // Notify operations/finance admins
    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .in("role", ["OPERATIONS_ADMIN", "SUPER_ADMIN", "FINANCE_ADMIN"]);

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        user_id: admin.id,
        type: "PAYMENT",
        title: `Payment Confirmed via Flutterwave — ${transactionType}`,
        message: `₦${expectedAmount.toLocaleString()} confirmed for ${transactionType} of ${equipmentName} (${rental?.reference_number || invoiceRef}). Proceed with logistics mobilization.`,
        link: `/admin/operations?requestId=${rentalRequestId}`,
        is_read: false,
      }));
      await supabase.from("notifications").insert(notifications);
    }
  }

  return new Response(
    JSON.stringify({ success: true, message: "Payment verified, quotation accepted" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
