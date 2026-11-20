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
    let reason = "Additional business identity or CAC documents required";
    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason;
    } catch {
      // noop
    }

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
        verification_status: "NEEDS_INFO",
        verification_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchantId)
      .select()
      .single();

    if (error) {
      console.error("Error requesting merchant info:", error);
      throw error;
    }

    // Send notification to merchant
    try {
      if (merchant?.user_id) {
        await notificationService.send({
          userId: merchant.user_id,
          title: "Additional Verification Information Needed",
          message: `The Cheesco verification team requested additional information for "${merchant.business_name}": ${reason}. Please update your profile.`,
          type: "INFO",
          category: "MERCHANT",
          actionUrl: "/merchant/dashboard",
          channels: ["IN_APP", "EMAIL"],
        });
      }
    } catch (e) {
      console.error("Failed to notify merchant:", e);
    }

    return NextResponse.json({
      success: true,
      data: merchant,
      message: "Notification sent to merchant requesting additional documents",
    });
  } catch (error: any) {
    console.error('[/api/admin/merchants/[id]/request-info] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
