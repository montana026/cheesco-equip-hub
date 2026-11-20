import { NextRequest, NextResponse } from "next/server";
import { getTickets, createTicket } from "@/lib/support-tickets";
import { notifyAdmins } from "@/lib/notifications";
import { notificationService } from "@/lib/services/notification.service";
import { checkRateLimit, checkDailyQuota, COST_CONTROLS, getClientIp } from "@/lib/rate-limit";
import { verifyAdminAuth, verifyCustomerAuth } from "@/lib/admin-auth";
import { escHtml } from "@/lib/format";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, [
      "SUPER_ADMIN",
      "SUPPORT_ADMIN",
      "OPERATIONS_ADMIN",
    ]);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Forbidden" },
        { status: auth.status || 403 }
      );
    }

    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`support_tickets_get:${clientKey}`, 60, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const tickets = await getTickets();
    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    console.error("[/api/support/tickets] Error fetching tickets:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      fullName = "Anonymous",
      email = "",
      phone = "",
      subject = "General Inquiry",
      message = "",
      category: rawCategory = "OTHER",
      priority: rawPriority = "MEDIUM",
      referenceNumber = "",
    } = body;

    // Map legacy / form-friendly category values to the real ticket_category DB enum.
    // Real labels: RENTAL, PAYMENT, EQUIPMENT, DELIVERY, MERCHANT, DISPUTE, ACCOUNT, OTHER
    const CATEGORY_MAP: Record<string, string> = {
      RENTAL_ISSUE: "RENTAL",
      QUOTATION_BILLING: "PAYMENT",
      LOGISTICS_DELIVERY: "DELIVERY",
      MERCHANT_VERIFICATION: "MERCHANT",
      REFUND_DEPOSIT: "PAYMENT",
      GENERAL_INQUIRY: "OTHER",
      // Pass-through real labels unchanged
      RENTAL: "RENTAL",
      PAYMENT: "PAYMENT",
      EQUIPMENT: "EQUIPMENT",
      DELIVERY: "DELIVERY",
      MERCHANT: "MERCHANT",
      DISPUTE: "DISPUTE",
      ACCOUNT: "ACCOUNT",
      OTHER: "OTHER",
    };
    const category = CATEGORY_MAP[rawCategory] ?? "OTHER";

    // Map legacy priority values to the real ticket_priority DB enum.
    // Real labels: LOW, MEDIUM, HIGH, URGENT
    const PRIORITY_MAP: Record<string, string> = {
      NORMAL: "MEDIUM",
      CRITICAL: "URGENT",
      LOW: "LOW",
      MEDIUM: "MEDIUM",
      HIGH: "HIGH",
      URGENT: "URGENT",
    };
    const priority = PRIORITY_MAP[rawPriority] ?? "MEDIUM";

    // 1. Abuse & Cost Controls: Rate limit + Daily Quota
    const clientIp = getClientIp(request);
    const clientKey = email || clientIp;

    const rateLimit = await checkRateLimit(`support_submit:${clientKey}`, 5, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many support ticket submissions. Please wait a minute before submitting again." },
        { status: 429 }
      );
    }

    const quota = await checkDailyQuota(
      "support_ticket",
      clientKey,
      COST_CONTROLS.MAX_DAILY_SUPPORT_TICKETS_PER_USER
    );
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Daily support ticket quota reached (10 tickets/day). For urgent inquiries, please contact our support hotline directly." },
        { status: 429 }
      );
    }

    // Optional user session identification
    let authenticatedUserId: string | null = null;
    try {
      const auth = await verifyCustomerAuth(request);
      if (auth.authorized && auth.userId) {
        authenticatedUserId = auth.userId;
      }
    } catch {}

    const reference = `TCK-${Date.now().toString(36).toUpperCase()}`;

    const newTicket = await createTicket({
      reference,
      customerName: fullName,
      email,
      phone,
      subject,
      message,
      category,
      priority,
      userId: authenticatedUserId,
      referenceNumber,
    });

    // 2. Dispatch notifications asynchronously (safely wrapped so notification failure never fails ticket creation)
    try {
      await notifyAdmins(["SUPPORT_ADMIN", "SUPER_ADMIN"], {
        title: `💬 New Support Ticket: ${subject}`,
        message: `Inquiry from ${fullName} (${email || phone || "Contact Form"}): "${message.slice(0, 100)}"`,
        link: "/admin/support",
        type: "MESSAGE",
      });
    } catch (notifErr) {
      console.warn("[/api/support/tickets] Admin notification warning:", notifErr);
    }

    try {
      const targetEmail =
        process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() ||
        "anthonysamuel026@gmail.com";

      await notificationService.sendEmailDirect({
        to: targetEmail,
        subject: `[Cheesco Support] ${subject} (${reference})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0A0D14; color: #FDB913; padding: 18px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">CHEESCO EQUIP HUB - SUPPORT TICKET</h2>
            </div>
            <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB; border-radius: 0 0 8px 8px;">
              <p><strong>Reference:</strong> ${escHtml(reference)}</p>
              <p><strong>From:</strong> ${escHtml(fullName)} (${escHtml(email)})</p>
              <p><strong>Phone:</strong> ${escHtml(phone) || "Not provided"}</p>
              ${referenceNumber ? `<p><strong>Associated Ref:</strong> ${escHtml(referenceNumber)}</p>` : ""}
              <p><strong>Subject:</strong> ${escHtml(subject)}</p>
              <p><strong>Category:</strong> ${escHtml(category)}</p>
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
              <p><strong>Message:</strong></p>
              <div style="background: #FFFFFF; padding: 16px; border-radius: 6px; border-left: 4px solid #FDB913;">
                ${escHtml(message).replace(/\n/g, "<br/>")}
              </div>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("[/api/support/tickets] Email notification warning:", emailErr);
    }

    return NextResponse.json({
      success: true,
      ticketNumber: reference,
      data: newTicket,
    });
  } catch (error: any) {
    console.error("[/api/support/tickets] Error creating support ticket:", error);
    return NextResponse.json(
      { error: error?.message || "An internal error occurred. Please try again." },
      { status: 500 }
    );
  }
}
