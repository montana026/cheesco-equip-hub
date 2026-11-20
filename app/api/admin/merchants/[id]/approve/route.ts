import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { notificationService } from "@/lib/services/notification.service";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: merchantId } = await ctx.params;

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

    const { data: merchant, error } = await supabaseServer
      .from("merchant_profiles")
      .update({
        verification_status: "VERIFIED",
        verified_at: new Date().toISOString(),
        verified_by: auth.userId || null,
        verification_notes: "Approved by Verification Admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchantId)
      .select()
      .single();

    if (error) {
      console.error("Error approving merchant:", error);
      throw error;
    }

    // Send notification to merchant
    try {
      if (merchant?.user_id) {
        await notificationService.send({
          userId: merchant.user_id,
          title: "🎉 Business Verification Approved!",
          message: `Congratulations! Your merchant account for "${merchant.business_name}" has been officially verified. You can now list machinery and receive rental inquiries.`,
          type: "SUCCESS",
          category: "MERCHANT",
          actionUrl: "/merchant/dashboard",
          channels: ["IN_APP", "EMAIL", "WHATSAPP"],
        });
      }
    } catch (e) {
      console.error("Failed to notify merchant of approval:", e);
    }

    return NextResponse.json({
      success: true,
      data: merchant,
      message: "Merchant accredited and verified successfully",
    });
  } catch (error: any) {
    console.error('[/api/admin/merchants/[id]/approve] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
