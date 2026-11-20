import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyCustomerAuth } from "@/lib/admin-auth";
import { PAYMENT_STATUS } from "@/lib/types";

/**
 * GET /api/invoice/[id]
 * id = quotation ID or payment reference
 * Returns all data needed to render the downloadable Cheesco invoice.
 * Platform margin is NOT exposed here — only the client-facing breakdown.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyCustomerAuth(request);

    // In production, enforce authentication
    if (process.env.NODE_ENV === "production" && !auth.authorized) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in to view this invoice" },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;

    // Try to find by quotation ID first, then by reference number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

    let quotationQuery = supabaseServer
      .from("quotations")
      .select("*");

    quotationQuery = isUuid
      ? quotationQuery.eq("id", id)
      : quotationQuery.eq("reference_number", id);

    const { data: quotation, error: qErr } = await quotationQuery.maybeSingle();

    if (qErr || !quotation) {
      // Try finding via payment reference
      const { data: payment } = await supabaseServer
        .from("payments")
        .select("quotation_id, rental_request_id")
        .or(`reference.eq.${id},payment_reference.eq.${id}`)
        .maybeSingle();

      if (!payment?.quotation_id) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const { data: q2 } = await supabaseServer
        .from("quotations")
        .select("*")
        .eq("id", payment.quotation_id)
        .single();

      if (!q2) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

      // Recurse with the found quotation ID
      return buildInvoiceResponse(q2, request, auth);
    }

    return buildInvoiceResponse(quotation, request, auth);
  } catch (err: any) {
    console.error('[/api/invoice/[id]] Error:', err);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}

async function buildInvoiceResponse(quotation: any, _request: NextRequest, auth: any) {
  // Fetch rental request
  const { data: rental } = await supabaseServer
    .from("rental_requests")
    .select(`
      id,
      reference_number,
      customer_id,
      merchant_id,
      equipment_id,
      current_state,
      start_date,
      end_date,
      duration_days,
      project_location,
      project_type,
      additional_requirements,
      created_at,
      equipment(
        id, name, brand, model, year, category,
        merchant_profiles(id, business_name, business_phone, business_address)
      )
    `)
    .eq("id", quotation.rental_request_id)
    .maybeSingle();

  if (!rental) {
    return NextResponse.json({ error: "Associated rental record not found" }, { status: 404 });
  }

  // Authorization check in production:
  // Must be Admin, or Customer who placed request, or Merchant who owns equipment
  if (process.env.NODE_ENV === "production" && auth?.authorized) {
    const isAdmin = [
      "SUPER_ADMIN",
      "OPERATIONS_ADMIN",
      "FINANCE_ADMIN",
      "SUPPORT_ADMIN",
    ].includes(auth.role);

    const isCustomerOwner = rental.customer_id === auth.userId;
    const isMerchantOwner =
      rental.merchant_id === auth.userId ||
      (rental.equipment as any)?.merchant_profiles?.id === auth.userId;

    if (!isAdmin && !isCustomerOwner && !isMerchantOwner) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this invoice" },
        { status: 403 }
      );
    }
  }

  // Fetch customer
  const { data: customer } = rental?.customer_id
    ? await supabaseServer
        .from("users")
        .select("id, full_name, email, phone")
        .eq("id", rental.customer_id)
        .single()
    : { data: null };

  // Fetch payment record
  const { data: payment } = await supabaseServer
    .from("payments")
    .select("id, status, reference, payment_reference, provider, payment_gateway, paid_at, created_at")
    .eq("rental_request_id", quotation.rental_request_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const eq: any = rental?.equipment;
  const merchantProfile: any = eq?.merchant_profiles;

  const isPurchase =
    rental?.reference_number?.startsWith("PUR") ||
    rental?.project_type?.toLowerCase().includes("purchase") ||
    rental?.additional_requirements?.includes("[PURCHASE");

  const transactionType = isPurchase ? "Outright Sale" : "Equipment Rental";

  // Line items — exactly as stored in quotation (VAT included, NO platform margin exposed)
  const lineItems: Array<{ label: string; amount: number; note?: string }> =
    quotation.line_items || [];

  const isPaid = payment?.status === PAYMENT_STATUS.CONFIRMED;

  return NextResponse.json({
    success: true,
    invoice: {
      // Invoice meta
      invoiceNumber: quotation.reference_number,
      issuedAt: quotation.sent_at || quotation.created_at,
      paidAt: payment?.paid_at || null,
      isPaid,
      transactionType, // "Outright Sale" | "Equipment Rental"
      isPurchase,
      status: quotation.status,

      // Rental/Purchase reference
      rentalReference: rental?.reference_number || "",
      rentalState: rental?.current_state || "",
      projectLocation: rental?.project_location || "",
      projectType: rental?.project_type || "",
      startDate: rental?.start_date || null,
      endDate: rental?.end_date || null,
      durationDays: rental?.duration_days || null,

      // Equipment
      equipment: {
        name: eq?.name || "Heavy Equipment Asset",
        brand: eq?.brand || "",
        model: eq?.model || "",
        year: eq?.year || "",
        category: eq?.category || "",
      },

      // Merchant (seller/owner)
      merchant: {
        businessName: merchantProfile?.business_name || "Verified Equipment Merchant",
        phone: merchantProfile?.business_phone || "",
        address: merchantProfile?.business_address || "Nigeria",
      },

      // Client (buyer)
      client: {
        name: customer?.full_name || "Valued Client",
        email: customer?.email || "",
        phone: customer?.phone || "",
      },

      // Financials — client-facing ONLY (no platform margin)
      pricing: {
        lineItems,                                  // includes VAT line item
        subtotal: Number(quotation.subtotal) || 0,
        totalAmount: Number(quotation.total_amount) || 0,
        depositAmount: Number(quotation.deposit_amount) || 0,
        currency: "NGN",
      },

      // Payment
      payment: {
        provider: payment?.provider || payment?.payment_gateway || "paystack",
        reference: payment?.reference || payment?.payment_reference || "",
        status: isPaid ? "PAID" : "PENDING",
      },

      // Terms
      terms: quotation.terms || "",
    },
  });
}
