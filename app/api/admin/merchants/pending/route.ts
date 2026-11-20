import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, [
      "VERIFICATION_ADMIN",
      "SUPER_ADMIN",
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Forbidden: Admin access required" },
        { status: auth.status || 403 }
      );
    }

    // Query pending merchants (not verified)
    const { data: merchants, error } = await supabaseServer
      .from("merchant_profiles")
      .select(`
        *,
        user:users!merchant_profiles_user_id_fkey(full_name, email, phone)
      `)
      .neq("verification_status", "VERIFIED")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending merchants:", error);
      throw error;
    }

    // Fetch documents if merchant_documents table exists
    const formatted = await Promise.all(
      (merchants || []).map(async (m: any) => {
        let documents: any[] = [];
        try {
          const { data: docs } = await supabaseServer
            .from("merchant_documents")
            .select("*")
            .eq("merchant_id", m.id);
          if (docs) {
            documents = docs.map((d: any) => ({
              id: d.id,
              documentType: d.document_type || "CAC_CERTIFICATE",
              documentUrl: d.document_url || "",
              uploadedAt: d.created_at || m.created_at,
            }));
          }
        } catch {
          // table might not exist or empty
        }

        return {
          id: m.id,
          userId: m.user_id,
          businessName: m.business_name || "Unnamed Business",
          businessType: m.business_type || "Limited Liability Company",
          registrationNumber: m.business_registration_number || m.rc_number || "RC-Pending",
          contactName: m.user?.full_name || "Representative",
          email: m.user?.email || "",
          phone: m.business_phone || m.user?.phone || "",
          address: m.business_address || "Nigeria",
          verificationStatus: m.verification_status,
          verificationNotes: m.verification_notes,
          documents,
          createdAt: m.created_at,
        };
      })
    );

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('[/api/admin/merchants/pending] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
