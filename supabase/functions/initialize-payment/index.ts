// Supabase Edge Function: initialize-payment
// Input: quotation_id, provider ('paystack' | 'flutterwave' | 'bank_transfer')
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { quotation_id, provider } = await req.json();

    if (!quotation_id || !provider) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: quotation_id and provider" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["paystack", "flutterwave", "bank_transfer"].includes(provider)) {
      return new Response(
        JSON.stringify({ error: "Invalid provider. Must be paystack, flutterwave, or bank_transfer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    const flutterwaveSecret = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
    const appUrl = Deno.env.get("APP_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Load the quotation directly from the database (NEVER TRUST AMOUNT FROM FRONTEND)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quotation_id);
    let qQuery = supabase
      .from("quotations")
      .select("id, total_amount, reference_number, rental_request_id, status, rental_requests(id, customer_id)");

    if (isUuid) {
      qQuery = qQuery.eq("id", quotation_id);
    } else {
      qQuery = qQuery.eq("reference_number", quotation_id);
    }

    const { data: quotation, error: qErr } = await qQuery.maybeSingle();

    if (qErr || !quotation) {
      console.error("Quotation query error in Edge Function:", qErr, { quotation_id });
      return new Response(
        JSON.stringify({ error: "Quotation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = Number(quotation.total_amount);
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid quotation amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Generate a unique reference
    const timestamp = Date.now();
    const randomHex = crypto.randomUUID().split("-")[0].toUpperCase();
    const prefix = provider === "paystack" ? "PAY" : provider === "flutterwave" ? "FLW" : "BNK";
    const reference = `CHE-${prefix}-${timestamp}-${randomHex}`;

    // Extract customer details from relation
    const rentalReq = Array.isArray(quotation.rental_requests)
      ? quotation.rental_requests[0]
      : quotation.rental_requests;
    const customerId = rentalReq?.customer_id;

    let customerEmail = "customer@cheesco.ng";
    let customerName = "Valued Customer";
    let customerPhone = "";

    if (customerId) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("email, full_name, phone")
        .eq("id", customerId)
        .maybeSingle();

      if (userProfile) {
        customerEmail = userProfile.email || customerEmail;
        customerName = userProfile.full_name || customerName;
        customerPhone = userProfile.phone || "";
      }
    }

    // 3. Insert "pending" payment row into payments table
    // (We populate both the standard schema columns and legacy fallback columns for backward compatibility)
    const paymentPayload = {
      quotation_id: quotation.id,
      rental_request_id: quotation.rental_request_id,
      provider: provider,
      payment_gateway: provider.toUpperCase(),
      reference: reference,
      payment_reference: reference,
      amount: amount,
      currency: "NGN",
      status: "pending",
      raw_response: { initiated_at: new Date().toISOString() },
    };

    const { error: insertErr } = await supabase
      .from("payments")
      .insert(paymentPayload);

    if (insertErr) {
      console.error("Payment insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to record pending payment", details: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const redirectUrl = `${appUrl}/payment-status?ref=${encodeURIComponent(reference)}`;

    // 4. Initialize with provider
    if (provider === "paystack") {
      const isPlaceholder = !paystackSecret || paystackSecret.includes("your_paystack") || !paystackSecret.startsWith("sk_");

      if (isPlaceholder) {
        // Fallback simulation mode if credentials not yet configured in dashboard
        return new Response(
          JSON.stringify({
            checkout_url: `${redirectUrl}&simulate=paystack`,
            reference: reference,
            amount: amount,
            currency: "NGN",
            provider: "paystack",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: Math.round(amount * 100), // convert to kobo
          reference: reference,
          callback_url: redirectUrl,
          metadata: {
            quotation_id: quotation.id,
            quotation_reference: quotation.reference_number,
            rental_request_id: quotation.rental_request_id,
          },
        }),
      });

      const psData = await paystackRes.json();
      if (!psData.status || !psData.data?.authorization_url) {
        throw new Error(psData.message || "Failed to initialize Paystack transaction");
      }

      return new Response(
        JSON.stringify({
          checkout_url: psData.data.authorization_url,
          reference: reference,
          amount: amount,
          currency: "NGN",
          provider: "paystack",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "flutterwave") {
      const isPlaceholder = !flutterwaveSecret || flutterwaveSecret.includes("your_flutterwave");

      if (isPlaceholder) {
        return new Response(
          JSON.stringify({
            checkout_url: `${redirectUrl}&simulate=flutterwave`,
            reference: reference,
            amount: amount,
            currency: "NGN",
            provider: "flutterwave",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flutterwaveSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: amount,
          currency: "NGN",
          redirect_url: redirectUrl,
          customer: {
            email: customerEmail,
            name: customerName,
            phonenumber: customerPhone,
          },
          customizations: {
            title: "Cheesco Equip Hub",
            description: `Payment for Quotation ${quotation.reference_number}`,
            logo: `${appUrl}/cheesco-logo.png`,
          },
          meta: {
            quotation_id: quotation.id,
            rental_request_id: quotation.rental_request_id,
          },
        }),
      });

      const flwData = await flwRes.json();
      if (flwData.status !== "success" || !flwData.data?.link) {
        throw new Error(flwData.message || "Failed to initialize Flutterwave payment");
      }

      return new Response(
        JSON.stringify({
          checkout_url: flwData.data.link,
          reference: reference,
          amount: amount,
          currency: "NGN",
          provider: "flutterwave",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "bank_transfer") {
      return new Response(
        JSON.stringify({
          checkout_url: null,
          reference: reference,
          amount: amount,
          currency: "NGN",
          provider: "bank_transfer",
          bank_details: {
            bank_name: "Zenith Bank Plc",
            account_name: "Cheesco Global Concept Ltd",
            account_number: "1224890331",
            narration: reference,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unhandled provider" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("initialize-payment error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
