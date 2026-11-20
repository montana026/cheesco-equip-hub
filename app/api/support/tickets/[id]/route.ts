import { NextRequest, NextResponse } from "next/server";
import { updateTicketStatus, addTicketReply } from "@/lib/support-tickets";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { notifyUser } from "@/lib/notifications";
import { escHtml } from "@/lib/format";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const { status, replyMessage, reply } = body;

    // Verify admin access for any admin role
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Forbidden: Admin access required" },
        { status: auth.status || 403 }
      );
    }

    let updatedTicket = null;

    // 1. Handle official reply
    const messageText = (replyMessage || reply || "").trim();
    if (messageText) {
      updatedTicket = await addTicketReply(id, {
        sender: auth.email || "Cheesco Support Desk",
        message: messageText,
      });

      // Dispatch reply email to the customer
      if (updatedTicket?.email) {
        const resendApiKey = process.env.RESEND_API_KEY?.trim();
        if (resendApiKey && resendApiKey !== "your_resend_api_key_here") {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: process.env.EMAIL_FROM || "Cheesco Equip Hub <onboarding@resend.dev>",
                to: updatedTicket.email,
                subject: `Re: [Cheesco Support] ${updatedTicket.subject} (${updatedTicket.reference})`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #0A0D14; color: #FDB913; padding: 18px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h2 style="margin: 0;">CHEESCO EQUIP HUB SUPPORT</h2>
                    </div>
                    <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB; border-radius: 0 0 8px 8px;">
                      <p>Hello <strong>${escHtml(updatedTicket.customerName)}</strong>,</p>
                      <p>Our operations support desk has replied to your inquiry (Reference: <strong>${escHtml(updatedTicket.reference)}</strong>):</p>
                      <div style="background: #FFFFFF; padding: 18px; border-radius: 6px; border-left: 4px solid #FDB913; margin: 20px 0; font-size: 15px; line-height: 1.6;">
                        ${escHtml(messageText).replace(/\n/g, "<br/>")}
                      </div>
                      <p style="color: #6B7280; font-size: 13px;">If you have further questions, you can reply directly to this email or contact us at +234 813 456 7890.</p>
                    </div>
                  </div>
                `,
              }),
            });
          } catch (emailErr) {
            console.warn("Failed to dispatch customer reply email via Resend:", emailErr);
          }
        }
      }
    }

    // 2. Handle status update (e.g. RESOLVED)
    if (status) {
      updatedTicket = await updateTicketStatus(id, status);
    }

    if (!updatedTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: messageText ? "Reply sent successfully" : `Ticket marked as ${status}`,
    });
  } catch (error: any) {
    console.error("[/api/support/tickets/[id]] Error updating support ticket:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 }
    );
  }
}
