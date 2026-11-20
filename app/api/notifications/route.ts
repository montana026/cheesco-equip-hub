import { NextRequest, NextResponse } from "next/server";
import { getNotifications, markNotificationsAsRead } from "@/lib/notifications";
import { verifyCustomerAuth } from "@/lib/admin-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`notifications_get:${clientKey}`, 60, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const { notifications, unreadCount } = await getNotifications(auth.userId, auth.role);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[/api/notifications] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`notifications_patch:${clientKey}`, 30, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    await markNotificationsAsRead(auth.userId, { notificationId, markAll });

    return NextResponse.json({ success: true, message: "Notifications updated" });
  } catch (error: any) {
    console.error('[/api/notifications] PATCH Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
