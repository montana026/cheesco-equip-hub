// Supabase Edge Function: paystack-webhook
// verify_jwt = false
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper: HMAC SHA-512 verification in Web Crypto / Deno
async function verifyPaystackSignature(secret: string, bodyText: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
  const hexSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hexSignature.toLowerCase() === signature.toLowerCase();
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const signature = req.headers.get("x-paystack-signature");
  const rawBody = await req.text();

  // If secret key is configured, verify HMAC signature
  if (paystackSecret && !paystackSecret.includes("your_paystack") && signature) {
    const isValid = await verifyPaystackSignature(paystackSecret, rawBody, signature);
    if (!isValid) {
      console.error("Invalid Paystack webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let eventData: any;
  try {
    eventData = JSON.parse(rawBody);
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const event = eventData.event;
  const reference = eventData.data?.reference;

  if (event !== "charge.success" || !reference) {
    // Acknowledge non-charge events
    return new Response(JSON.stringify({ message: "Event ignored" }), { status: 200 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Fetch payment row from database
  const { data: payment, error: pErr } = await supabase
    .from("payments")
    .select("*, quotation:quotations(id, status, rental_request_id)")
    .or(`reference.eq.${reference},payment_reference.eq.${reference}`)
    .maybeSingle();

  if (pErr || !payment) {
    console.error("Payment not found for reference:", reference);
    return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404 });
  }

  // 2. IDEMPOTENT: Ignore event if payment is already "paid"
  if (payment.status === "paid" || payment.status === "CONFIRMED") {
    return new Response(
      JSON.stringify({ message: "Payment already processed and marked as paid" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Call Paystack verify API to verify the transaction officially
  let verifiedData: any = eventData.data;
  if (paystackSecret && !paystackSecret.includes("your_paystack")) {
    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      });
      const verifyJson = await verifyRes.json();
      if (!verifyJson.status || verifyJson.data?.status !== "success") {
        return new Response(JSON.stringify({ error: "Paystack verification failed" }), { status: 400 });
      }
      verifiedData = verifyJson.data;
    } catch (e: any) {
      console.error("Paystack verify API error:", e);
      return new Response(JSON.stringify({ error: "Failed to verify transaction with Paystack" }), { status: 500 });
    }
  }

  // 4. Verify amount and currency
  const verifiedAmountNaira = verifiedData.amount / 100; // Paystack is in kobo
  const expectedAmountNaira = Number(payment.amount);

  if (Math.abs(verifiedAmountNaira - expectedAmountNaira) > 1) {
    console.error("Amount mismatch:", { verifiedAmountNaira, expectedAmountNaira });
    await supabase
      .from("payments")
      .update({
        status: "failed",
        raw_response: { ...eventData, mismatch: "amount_mismatch", verifiedAmountNaira, expectedAmountNaira },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
  }

  if (verifiedData.currency && verifiedData.currency.toUpperCase() !== "NGN") {
    return new Response(JSON.stringify({ error: "Currency mismatch" }), { status: 400 });
  }

  // 5. Update payment to "paid"
  await supabase
    .from("payments")
    .update({
      status: "paid",
      raw_response: verifiedData,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  // 6. Update quotation to "accepted"
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

  // 7. Update rental request to "PAYMENT_CONFIRMED"
  const rentalRequestId = payment.rental_request_id || payment.quotation?.rental_request_id;
  if (rentalRequestId) {
    await supabase
      .from("rental_requests")
      .update({ current_state: "PAYMENT_CONFIRMED" })
      .eq("id", rentalRequestId);

    // Fetch rental + equipment + quotation details for rich notifications
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

    // Fetch quotation for merchant payout amount
    const { data: quotation } = await supabase
      .from("quotations")
      .select("merchant_payout_total, total_amount, reference_number")
      .eq("id", quotationId)
      .maybeSingle();

    const merchantPayout = Number(quotation?.merchant_payout_total) || 0;
    const invoiceRef = quotation?.reference_number || payment.reference || rentalRequestId;

    // Notify merchant — show only their payout, NOT platform charges
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
        title: `Payment Confirmed via Paystack — ${transactionType}`,
        message: `₦${expectedAmountNaira.toLocaleString()} confirmed for ${transactionType} of ${equipmentName} (${rental?.reference_number || invoiceRef}). Proceed with logistics mobilization.`,
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
