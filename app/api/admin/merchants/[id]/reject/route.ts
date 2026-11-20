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
    let reason = "Verification documents could not be validated";
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
        verification_status: "REJECTED",
        verification_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchantId)
      .select()
      .single();

    if (error) {
      console.error("Error rejecting merchant:", error);
      throw error;
    }

    // Send notification to merchant
    try {
      if (merchant?.user_id) {
        await notificationService.send({
          userId: merchant.user_id,
          title: "Merchant Verification Update",
          message: `Your merchant account verification was rejected. Reason: ${reason}. Please update your documentation.`,
          type: "WARNING",
          category: "MERCHANT",
          actionUrl: "/merchant/dashboard",
          channels: ["IN_APP", "EMAIL"],
        });
      }
    } catch (e) {
      console.error("Failed to notify merchant of rejection:", e);
    }

    return NextResponse.json({
      success: true,
      data: merchant,
      message: "Merchant verification rejected",
    });
  } catch (error: any) {
    console.error('[/api/admin/merchants/[id]/reject] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
