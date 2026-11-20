// Supabase Edge Function: confirm-bank-transfer
// Admin only: Marks a bank transfer payment as "paid" and the quotation as "accepted".
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify that the caller is an authenticated Admin
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);

    let isAdmin = false;
    let adminUserId = "";

    if (!userErr && userData?.user) {
      adminUserId = userData.user.id;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", adminUserId)
        .maybeSingle();

      if (profile && ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(profile.role)) {
        isAdmin = true;
      }
    } else {
      // Check custom session token payload if standard JWT failed
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          if (["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(payload.role)) {
            isAdmin = true;
            adminUserId = payload.sub || payload.id || "";
          }
        }
      } catch (_e) {
        // invalid token
      }
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { reference, payment_id } = await req.json();

    if (!reference && !payment_id) {
      return new Response(
        JSON.stringify({ error: "Missing reference or payment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Locate the payment record
    let query = supabase.from("payments").select("*, quotation:quotations(id, status, rental_request_id)");
    if (payment_id) {
      query = query.eq("id", payment_id);
    } else {
      query = query.or(`reference.eq.${reference},payment_reference.eq.${reference}`);
    }

    const { data: payment, error: pErr } = await query.maybeSingle();

    if (pErr || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Mark payment as "paid"
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("payments")
      .update({
        status: "paid",
        raw_response: {
          ...payment.raw_response,
          confirmed_by_admin: adminUserId,
          confirmed_at: nowIso,
          method: "bank_transfer_manual_verification",
        },
        paid_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", payment.id);

    if (updateErr) {
      throw updateErr;
    }

    // 4. Mark quotation as "accepted"
    const quotationId = payment.quotation_id || payment.quotation?.id;
    if (quotationId) {
      await supabase
        .from("quotations")
        .update({
          status: "accepted",
          accepted_at: nowIso,
        })
        .eq("id", quotationId);
    }

    // 5. Update rental request to "PAYMENT_CONFIRMED"
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
        .single();

      const eq: any = rental?.equipment;
      const equipmentName = eq?.name || "Heavy Equipment";
      const isPurchase =
        rental?.reference_number?.startsWith("PUR") ||
        rental?.project_type?.toLowerCase().includes("purchase");
      const transactionType = isPurchase ? "Outright Sale" : "Rental";

      const { data: quotation } = await supabase
        .from("quotations")
        .select("merchant_payout_total, reference_number")
        .eq("id", payment.quotation_id)
        .maybeSingle();

      const merchantPayout = Number(quotation?.merchant_payout_total) || 0;
      const invoiceRef = quotation?.reference_number || payment.reference || rentalRequestId;

      // Notify customer
      if (rental?.customer_id) {
        await supabase.from("notifications").insert({
          user_id: rental.customer_id,
          type: "PAYMENT",
          title: "✅ Bank Transfer Confirmed",
          message: `Your bank transfer payment for ${transactionType.toLowerCase()} of ${equipmentName} (Ref: ${rental.reference_number || invoiceRef}) has been verified and confirmed. Equipment ${isPurchase ? "handover" : "dispatch"} is now being scheduled!`,
          link: `/dashboard/customer?tab=rentals`,
          is_read: false,
        });
      }

      // Notify merchant — payout only, no platform charges
      const merchantUserId = eq?.merchant_profiles?.user_id;
      if (merchantUserId) {
        await supabase.from("notifications").insert({
          user_id: merchantUserId,
          type: "PAYMENT",
          title: `✅ Payment Confirmed — ${transactionType}`,
          message: `Bank transfer payment has been confirmed for your ${transactionType.toLowerCase()} of ${equipmentName} (Ref: ${rental?.reference_number || invoiceRef}). Your payout of ₦${merchantPayout.toLocaleString()} is now held in escrow and will be disbursed upon ${isPurchase ? "handover completion" : "delivery and site acceptance"}.`,
          link: `/merchant/earnings`,
          is_read: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Bank transfer confirmed as paid, quotation accepted, rental marked PAYMENT_CONFIRMED",
        payment_id: payment.id,
        reference: payment.reference || payment.payment_reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("confirm-bank-transfer error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
