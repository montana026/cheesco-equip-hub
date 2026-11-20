/* ── Notification Service with Email/SMS/WhatsApp Support ──────────────────── */

import { supabaseServer } from '@/lib/supabase/server';
import { checkDailyQuota, COST_CONTROLS } from '@/lib/rate-limit';
import { escHtml } from '@/lib/format';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  category:
    | 'RENTAL_REQUEST'
    | 'QUOTATION'
    | 'PAYMENT'
    | 'LOGISTICS'
    | 'INSPECTION'
    | 'DEPOSIT'
    | 'AGREEMENT'
    | 'EQUIPMENT'
    | 'MERCHANT'
    | 'DISPUTE'
    | 'SYSTEM';
  referenceId?: string;
  actionUrl?: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
}

class NotificationService {
  /**
   * Send notification through specified channels
   */
  async send(payload: NotificationPayload): Promise<void> {
    const channels = payload.channels || ['IN_APP'];

    try {
      // Always create in-app notification
      await this.createInAppNotification(payload);

      // Send through other channels
      for (const channel of channels) {
        switch (channel) {
          case 'EMAIL':
            await this.sendEmail(payload);
            break;
          case 'SMS':
            await this.sendSMS(payload);
            break;
          case 'WHATSAPP':
            await this.sendWhatsApp(payload);
            break;
        }
      }
    } catch (error) {
      console.error('Notification error:', error);
      // Don't throw - notifications should not break the main flow
    }
  }

  /**
   * Create in-app notification conforming to Supabase notifications table schema:
   * (id, user_id, type: notification_type, title, message, link, is_read, read_at, created_at)
   */
  private async createInAppNotification(payload: NotificationPayload): Promise<void> {
    // Map category or type to the Postgres public.notification_type enum
    const validTypes: Array<
      'RENTAL_REQUEST' | 'QUOTATION' | 'PAYMENT' | 'LOGISTICS' | 'DELIVERY' | 'INSPECTION' | 'DISPUTE' | 'MESSAGE' | 'SYSTEM'
    > = ['RENTAL_REQUEST', 'QUOTATION', 'PAYMENT', 'LOGISTICS', 'DELIVERY', 'INSPECTION', 'DISPUTE', 'MESSAGE', 'SYSTEM'];

    let dbType: any = 'SYSTEM';
    if (validTypes.includes(payload.category as any)) {
      dbType = payload.category;
    } else if (payload.category === 'DEPOSIT') {
      dbType = 'PAYMENT';
    } else {
      dbType = 'SYSTEM';
    }

    const { error } = await supabaseServer.from('notifications').insert({
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: dbType,
      link: payload.actionUrl || null,
      is_read: false,
    });

    if (error) {
      console.error('Failed to insert in-app notification into DB:', error);
    }
  }

  /**
   * Directly send an HTML email via Resend
   */
  async sendEmailDirect(opts: {
    to: string;
    toName?: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const rawKey = process.env.RESEND_API_KEY || '';
    const resendApiKey = rawKey.trim();
    if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
      console.log('Resend API key not configured, skipping email to:', opts.to);
      return { success: false, error: 'Resend API key not configured' };
    }

    const fromAddress = process.env.EMAIL_FROM || 'Cheesco Equip Hub <onboarding@resend.dev>';
    const ownerEmail = process.env.SUPPORT_NOTIFICATION_EMAIL || 'miebirichman@gmail.com';

    // Cost Controls & Circuit Breakers: Prevent bill shock on Resend API
    const recipientKey = (opts.to || '').toLowerCase().trim();
    const recipientQuota = await checkDailyQuota('email', recipientKey, COST_CONTROLS.MAX_DAILY_OUTBOUND_EMAILS_PER_RECIPIENT);
    if (!recipientQuota.allowed) {
      console.warn(`[CostControl] Daily email limit (${COST_CONTROLS.MAX_DAILY_OUTBOUND_EMAILS_PER_RECIPIENT}) reached for recipient: ${recipientKey}`);
      return { success: false, error: 'Recipient daily email quota exceeded' };
    }

    const systemQuota = await checkDailyQuota('email', 'global_platform', COST_CONTROLS.MAX_DAILY_OUTBOUND_EMAILS_SYSTEM);
    if (!systemQuota.allowed) {
      console.error(`[CostControl CRITICAL] Global platform email safety cap (${COST_CONTROLS.MAX_DAILY_OUTBOUND_EMAILS_SYSTEM}) tripped!`);
      return { success: false, error: 'Global platform email quota exceeded' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
        }),
      });

      const result = await response.json();

      // If Resend returns 403 because we're using onboarding@resend.dev (which restricts delivery to the account owner)
      if (!response.ok && result?.statusCode === 403 && (result?.message?.includes('own email address') || result?.message?.includes('testing emails'))) {
        console.warn(`Resend sandbox mode: Cannot deliver to ${opts.to}. Routing test copy to owner inbox (${ownerEmail}).`);

        const sandboxNotice = `
          <div style="background:#FFF3CD;border:1px solid #FFEEBA;color:#856404;padding:14px 18px;margin-bottom:24px;border-radius:8px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">
            <strong>⚠️ Resend Sandbox Testing Mode:</strong><br />
            This notification was generated for <strong>${escHtml(opts.toName ? `${opts.toName} <${opts.to}>` : opts.to)}</strong>.<br />
            Because the active sender domain is <code>${escHtml(fromAddress)}</code>, Resend delivered this copy directly to your verified testing email (<code>${escHtml(ownerEmail)}</code>).<br />
            <em>In production with a verified domain (e.g., info@cheescoequiphub.com), this delivers directly to the client's email inbox.</em>
          </div>
        `;

        const retryRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: ownerEmail,
            subject: `[Sandbox: For ${opts.to}] ${opts.subject}`,
            html: `${sandboxNotice}${opts.html}`,
          }),
        });

        const retryJson = await retryRes.json();
        if (retryRes.ok) {
          console.log(`Email successfully delivered to sandbox inbox ${ownerEmail} (intended: ${opts.to})`);
          return { success: true, id: retryJson.id };
        } else {
          console.error('Sandbox retry error:', retryJson);
          return { success: false, error: retryJson.message };
        }
      }

      if (!response.ok) {
        console.error('Resend email error:', result);
        return { success: false, error: result.message || 'Email delivery failed' };
      }

      console.log(`Email successfully delivered to ${opts.to} (ID: ${result.id})`);
      return { success: true, id: result.id };
    } catch (err: any) {
      console.error('sendEmailDirect exception:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send email notification via Resend
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    // Get user email
    const { data: user } = await supabaseServer
      .from('users')
      .select('email, full_name')
      .eq('id', payload.userId)
      .single();

    if (!user?.email) return;

    await this.sendEmailDirect({
      to: user.email,
      toName: user.full_name || 'Valued User',
      subject: payload.title,
      html: this.generateEmailTemplate(payload, user),
    });
  }

  /**
   * Send SMS notification via Termii
   */
  private async sendSMS(payload: NotificationPayload): Promise<void> {
    // Get user phone
    const { data: user } = await supabaseServer
      .from('users')
      .select('phone')
      .eq('id', payload.userId)
      .single();

    if (!user?.phone) return;

    const termiiApiKey = process.env.TERMII_API_KEY;
    const termiiSenderId = process.env.TERMII_SENDER_ID || 'CHEESCO';

    if (!termiiApiKey || termiiApiKey === 'your_termii_api_key_here') {
      console.log('Termii not configured, skipping SMS:', { to: user.phone });
      return;
    }

    // Cost Controls & Circuit Breakers: Prevent bill shock on Termii / Twilio SMS
    const phoneKey = user.phone.replace(/[^0-9]/g, '');
    const phoneQuota = await checkDailyQuota('sms', phoneKey, COST_CONTROLS.MAX_DAILY_OUTBOUND_SMS_PER_PHONE);
    if (!phoneQuota.allowed) {
      console.warn(`[CostControl] Daily SMS limit (${COST_CONTROLS.MAX_DAILY_OUTBOUND_SMS_PER_PHONE}) reached for: ${phoneKey}`);
      return;
    }

    const systemSmsQuota = await checkDailyQuota('sms', 'global_platform', COST_CONTROLS.MAX_DAILY_OUTBOUND_SMS_SYSTEM);
    if (!systemSmsQuota.allowed) {
      console.error(`[CostControl CRITICAL] Global SMS daily spend cap (${COST_CONTROLS.MAX_DAILY_OUTBOUND_SMS_SYSTEM}) tripped!`);
      return;
    }

    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: termiiApiKey,
          to: user.phone,
          from: termiiSenderId,
          sms: `${payload.title}\n${payload.message}`,
          type: 'plain',
          channel: 'generic',
        }),
      });

      const result = await response.json();
      if (result.code !== 'ok') {
        throw new Error(result.message || 'SMS send failed');
      }
    } catch (error) {
      console.error('SMS send error:', error);
    }
  }

  /**
   * Send WhatsApp notification via WhatsApp Business API
   */
  private async sendWhatsApp(payload: NotificationPayload): Promise<void> {
    // Get user phone
    const { data: user } = await supabaseServer
      .from('users')
      .select('phone')
      .eq('id', payload.userId)
      .single();

    if (!user?.phone) return;

    const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      console.log('WhatsApp not configured, skipping WhatsApp:', { to: user.phone });
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: user.phone.replace('+', ''),
            type: 'template',
            template: {
              name: 'notification_template', // Must be pre-approved
              language: { code: 'en' },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: payload.title },
                    { type: 'text', text: payload.message },
                  ],
                },
              ],
            },
          }),
        }
      );

      const result = await response.json();
      if (!result.messages) {
        throw new Error('WhatsApp send failed');
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
    }
  }

  /**
   * Notification templates for common scenarios
   */

  async notifyRentalRequestSubmitted(
    customerId: string,
    rentalRequest: { referenceNumber: string; equipmentName: string }
  ): Promise<void> {
    await this.send({
      userId: customerId,
      title: 'Rental Request Submitted',
      message: `Your rental request ${rentalRequest.referenceNumber} for ${rentalRequest.equipmentName} has been submitted. Cheesco operations will review and prepare your quotation.`,
      type: 'SUCCESS',
      category: 'RENTAL_REQUEST',
      referenceId: rentalRequest.referenceNumber,
      channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
    });
  }

  async notifyQuotationReady(
    customerId: string,
    quotation: { referenceNumber: string; amount: number; rentalRequestId: string }
  ): Promise<void> {
    await this.send({
      userId: customerId,
      title: 'Quotation Ready',
      message: `Your quotation ${quotation.referenceNumber} is ready. Total amount: ₦${quotation.amount.toLocaleString()}. Please review and accept to proceed with payment.`,
      type: 'INFO',
      category: 'QUOTATION',
      referenceId: quotation.referenceNumber,
      actionUrl: `/dashboard/customer?requestId=${quotation.rentalRequestId}`,
      channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
    });
  }

  async notifyPaymentConfirmed(
    customerId: string,
    payment: { amount: number; referenceNumber: string }
  ): Promise<void> {
    await this.send({
      userId: customerId,
      title: 'Payment Confirmed',
      message: `Your payment of ₦${payment.amount.toLocaleString()} has been confirmed. Cheesco operations will now coordinate logistics for equipment delivery.`,
      type: 'SUCCESS',
      category: 'PAYMENT',
      referenceId: payment.referenceNumber,
      channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
    });
  }

  async notifyEquipmentDispatched(
    customerId: string,
    logistics: {
      equipmentName: string;
      driverName: string;
      driverPhone: string;
      estimatedArrival: string;
    }
  ): Promise<void> {
    await this.send({
      userId: customerId,
      title: 'Equipment Dispatched',
      message: `${logistics.equipmentName} is on the way! Driver: ${logistics.driverName} (${logistics.driverPhone}). Estimated arrival: ${new Date(logistics.estimatedArrival).toLocaleString()}.`,
      type: 'INFO',
      category: 'LOGISTICS',
      channels: ['IN_APP', 'SMS', 'WHATSAPP'],
    });
  }

  async notifyEquipmentDelivered(
    customerId: string,
    equipment: { name: string; rentalStartDate: string }
  ): Promise<void> {
    await this.send({
      userId: customerId,
      title: 'Equipment Delivered',
      message: `${equipment.name} has been delivered. Your rental period begins ${new Date(equipment.rentalStartDate).toLocaleDateString()}. Please inspect the equipment and confirm condition.`,
      type: 'SUCCESS',
      category: 'LOGISTICS',
      channels: ['IN_APP', 'WHATSAPP'],
    });
  }

  async notifyDepositSettled(
    customerId: string,
    deposit: { amount: number; refundAmount: number; status: string }
  ): Promise<void> {
    const message = deposit.refundAmount === deposit.amount
      ? `Your full deposit of ₦${deposit.amount.toLocaleString()} will be refunded within 7 business days.`
      : deposit.refundAmount === 0
      ? `Your deposit of ₦${deposit.amount.toLocaleString()} has been fully deducted due to equipment damage.`
      : `Your deposit has been settled. Refund amount: ₦${deposit.refundAmount.toLocaleString()} (Deduction: ₦${(deposit.amount - deposit.refundAmount).toLocaleString()}).`;

    await this.send({
      userId: customerId,
      title: 'Deposit Settled',
      message,
      type: deposit.refundAmount === 0 ? 'WARNING' : 'INFO',
      category: 'DEPOSIT',
      channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
    });
  }

  async notifyEquipmentVerified(
    merchantId: string,
    equipment: { name: string; slug: string }
  ): Promise<void> {
    await this.send({
      userId: merchantId,
      title: 'Equipment Approved',
      message: `Your equipment listing "${equipment.name}" has been verified and is now live on the platform!`,
      type: 'SUCCESS',
      category: 'EQUIPMENT',
      actionUrl: `/equipment/${equipment.slug}`,
      channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
    });
  }

  async notifyEquipmentRejected(
    merchantId: string,
    equipment: { name: string; reason: string }
  ): Promise<void> {
    await this.send({
      userId: merchantId,
      title: 'Equipment Listing Rejected',
      message: `Your equipment listing "${equipment.name}" has been rejected. Reason: ${equipment.reason}`,
      type: 'WARNING',
      category: 'EQUIPMENT',
      channels: ['IN_APP', 'EMAIL'],
    });
  }

  async notifyNewRentalRequest(
    operationsAdminId: string,
    request: { referenceNumber: string; equipmentName: string; customerName: string }
  ): Promise<void> {
    await this.send({
      userId: operationsAdminId,
      title: 'New Rental Request',
      message: `New rental request ${request.referenceNumber} from ${request.customerName} for ${request.equipmentName}.`,
      type: 'INFO',
      category: 'RENTAL_REQUEST',
      actionUrl: '/admin/operations',
      channels: ['IN_APP', 'EMAIL'],
    });
  }

  /**
   * Send comprehensive Admin email when a new Rental or Purchase request is submitted
   */
  async notifyAdminNewRequest(params: {
    referenceNumber: string;
    isPurchase: boolean;
    customer: { name: string; email: string; phone?: string; company?: string };
    equipment: { name: string; brand?: string; model?: string; location?: string };
    details: {
      location: string;
      projectType?: string;
      startDate?: string;
      endDate?: string;
      durationDays?: number;
      scopeOfWork?: string;
      maxTonnage?: string;
      operatorRequired?: boolean;
      deliveryRequired?: boolean;
      intendedIndustry?: string;
      inspectionPreference?: string;
      inspectionDate?: string;
      paymentPreference?: string;
      companyName?: string;
      rcNumber?: string;
      additionalRequirements?: string;
    };
    requestId: string;
  }): Promise<void> {
    const adminEmail = process.env.SUPPORT_NOTIFICATION_EMAIL || 'miebirichman@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = `${appUrl}/admin/operations?requestId=${params.requestId}`;

    const typeTitle = params.isPurchase ? 'Outright Equipment Purchase' : 'Equipment Rental Lease';
    const badgeColor = params.isPurchase ? '#10B981' : '#FDB913';
    const badgeText = params.isPurchase ? 'PURCHASE INQUIRY' : 'RENTAL REQUEST';

    const subject = params.isPurchase
      ? `🛒 [New Purchase Request] ${params.referenceNumber} - ${params.equipment.name}`
      : `📋 [New Rental Request] ${params.referenceNumber} - ${params.equipment.name}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E6EDF3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#161B22;border:1px solid #30363D;border-radius:12px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td style="padding:28px 32px;background-color:#0A0D14;border-bottom:2px solid #FDB913;text-align:left;">
        <span style="font-size:20px;font-weight:900;letter-spacing:1px;color:#FDB913;">CHEESCO EQUIP HUB</span>
        <span style="display:inline-block;margin-left:12px;padding:3px 10px;background-color:${badgeColor};color:#0A0D14;font-size:11px;font-weight:800;border-radius:20px;vertical-align:middle;">
          ${badgeText}
        </span>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 8px 0;font-size:22px;color:#FFFFFF;font-weight:700;">New ${typeTitle} Submitted</h2>
        <p style="margin:0 0 24px 0;font-size:14px;color:#8B949E;">Reference: <strong style="color:#FDB913;">${escHtml(params.referenceNumber)}</strong></p>

        <!-- Customer Summary Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;border:1px solid #21262D;border-radius:8px;margin-bottom:20px;padding:16px;">
          <tr>
            <td colspan="2" style="font-size:12px;font-weight:700;color:#FDB913;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:10px;">
              👤 Customer & Buyer Profile
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;width:40%;">Name:</td>
            <td style="font-size:13px;color:#FFFFFF;font-weight:600;padding:4px 0;">${escHtml(params.customer.name)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Email:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;"><a href="mailto:${escHtml(params.customer.email)}" style="color:#58A6FF;text-decoration:none;">${escHtml(params.customer.email)}</a></td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Phone:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.customer.phone || 'Not provided')}</td>
          </tr>
          ${params.customer.company ? `
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Company:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.customer.company)}</td>
          </tr>
          ` : ''}
          ${params.details.rcNumber ? `
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">CAC RC / Tax ID:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.details.rcNumber)}</td>
          </tr>
          ` : ''}
        </table>

        <!-- Equipment Details Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;border:1px solid #21262D;border-radius:8px;margin-bottom:20px;padding:16px;">
          <tr>
            <td colspan="2" style="font-size:12px;font-weight:700;color:#FDB913;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:10px;">
              🚜 Equipment Information
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;width:40%;">Machine:</td>
            <td style="font-size:13px;color:#FFFFFF;font-weight:600;padding:4px 0;">${escHtml(params.equipment.name)}</td>
          </tr>
          ${params.equipment.brand ? `
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Brand / Model:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.equipment.brand)} ${escHtml(params.equipment.model || '')}</td>
          </tr>
          ` : ''}
          ${params.equipment.location ? `
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Base Location:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.equipment.location)}</td>
          </tr>
          ` : ''}
        </table>

        <!-- Specific Requirements Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;border:1px solid #21262D;border-radius:8px;margin-bottom:28px;padding:16px;">
          <tr>
            <td colspan="2" style="font-size:12px;font-weight:700;color:#FDB913;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:10px;">
              📋 Request Parameters & Logistics
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;width:40%;">Destination / Site:</td>
            <td style="font-size:13px;color:#FFFFFF;font-weight:600;padding:4px 0;">${escHtml(params.details.location)}</td>
          </tr>
          ${params.isPurchase ? `
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Operating Sector:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.details.intendedIndustry || 'General Earthmoving')}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Inspection Mode:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.details.inspectionPreference || 'Physical On-Site')} ${params.details.inspectionDate ? `(Requested: ${escHtml(params.details.inspectionDate)})` : ''}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Payment Structure:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.details.paymentPreference || 'Cheesco Secured Escrow')}</td>
          </tr>
          ` : `
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Rental Period:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.details.startDate || 'Immediate')} to ${escHtml(params.details.endDate || '')} (${params.details.durationDays || 1} Days)</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Nature of Job:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.details.scopeOfWork || 'General Construction')}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Max Load Tonnage:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${params.details.maxTonnage ? `${escHtml(params.details.maxTonnage)} Tons` : 'Standard'}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Certified Operator:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${params.details.operatorRequired ? 'Required' : 'Client Provided'}</td>
          </tr>
          `}
          ${params.details.additionalRequirements ? `
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Client Notes:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">${escHtml(params.details.additionalRequirements)}</td>
          </tr>
          ` : ''}
        </table>

        <!-- CTA Button -->
        <div style="text-align:center;margin-top:28px;">
          <a href="${actionUrl}" style="background-color:#FDB913;color:#0A0D14;text-decoration:none;font-weight:800;font-size:14px;padding:14px 32px;border-radius:8px;display:inline-block;letter-spacing:0.5px;">
            Open Operations Dossier & Issue Quotation →
          </a>
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 32px;background-color:#0A0D14;border-top:1px solid #21262D;text-align:center;font-size:12px;color:#6E7681;">
        Cheesco Equip Hub Operations Desk · Internal Admin Dispatch<br />
        © ${new Date().getFullYear()} Cheesco Equip Hub Nigeria.
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.sendEmailDirect({
      to: adminEmail,
      toName: 'Cheesco Operations Team',
      subject,
      html,
    });
  }

  /**
   * Send confirmation email to Customer when they submit a rental or purchase request
   */
  async notifyCustomerRequestReceived(params: {
    customerEmail: string;
    customerName: string;
    referenceNumber: string;
    isPurchase: boolean;
    equipment: { name: string; brand?: string; model?: string };
    location: string;
    requestId: string;
  }): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = `${appUrl}/dashboard/customer?requestId=${params.requestId}`;

    const typeTitle = params.isPurchase ? 'Equipment Purchase Request' : 'Equipment Rental Request';
    const subject = `Request Received: ${params.equipment.name} (${params.referenceNumber}) - Cheesco Equip Hub`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E6EDF3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#161B22;border:1px solid #30363D;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:28px 32px;background-color:#0A0D14;border-bottom:2px solid #FDB913;text-align:left;">
        <span style="font-size:20px;font-weight:900;letter-spacing:1px;color:#FDB913;">CHEESCO EQUIP HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 12px 0;font-size:22px;color:#FFFFFF;font-weight:700;">We've Received Your Request!</h2>
        <p style="margin:0 0 20px 0;font-size:15px;color:#C9D1D9;line-height:1.6;">
          Dear <strong>${escHtml(params.customerName)}</strong>,<br />
          Thank you for choosing Cheesco Equip Hub. Your <strong>${typeTitle}</strong> for <strong>${escHtml(params.equipment.name)}</strong> has been logged under reference number <strong style="color:#FDB913;">${escHtml(params.referenceNumber)}</strong>.
        </p>

        <!-- Summary Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;border:1px solid #21262D;border-radius:8px;margin-bottom:24px;padding:16px;">
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:6px 0;width:40%;">Equipment:</td>
            <td style="font-size:13px;color:#FFFFFF;font-weight:600;padding:6px 0;">${escHtml(params.equipment.name)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:6px 0;">Reference Number:</td>
            <td style="font-size:13px;color:#FDB913;font-weight:700;padding:6px 0;">${escHtml(params.referenceNumber)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:6px 0;">Project Location:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:6px 0;">${escHtml(params.location)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:6px 0;">Status:</td>
            <td style="font-size:13px;color:#58A6FF;font-weight:600;padding:6px 0;">Operations Review in Progress</td>
          </tr>
        </table>

        <!-- Next Steps -->
        <div style="background-color:#0D1117;border-left:4px solid #FDB913;padding:16px 20px;border-radius:4px;margin-bottom:24px;">
          <h4 style="margin:0 0 8px 0;font-size:14px;color:#FFFFFF;font-weight:700;">What Happens Next?</h4>
          <ol style="margin:0;padding-left:18px;font-size:13px;color:#8B949E;line-height:1.7;">
            ${params.isPurchase ? `
            <li><strong>Title & Customs SGD Audit:</strong> Cheesco legal & operations team verifies asset documentation and clear title.</li>
            <li><strong>Inspection & Proforma:</strong> You will receive an official inspection schedule and Binding Commercial Proforma.</li>
            <li><strong>Secured Escrow & Delivery:</strong> Funds are deposited into Cheesco Escrow and held safely until final handover and title transfer.</li>
            ` : `
            <li><strong>Availability & Readiness:</strong> Cheesco operations confirms machine readiness and mobilization lowbed availability.</li>
            <li><strong>Official Quotation:</strong> An official Binding Quotation with statutory VAT (7.5%) will be issued to your email and dashboard.</li>
            <li><strong>Digital Agreement & Mobilization:</strong> Review and accept your quotation to sign the digital agreement and deploy.</li>
            `}
          </ol>
        </div>

        <!-- Mandatory Client Responsibility Terms -->
        <div style="background-color:#21262D;padding:12px 16px;border-radius:6px;font-size:12px;color:#E6EDF3;margin-bottom:28px;line-height:1.5;">
          <strong>Important Terms:</strong> Operator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility.
        </div>

        <div style="text-align:center;">
          <a href="${actionUrl}" style="background-color:#FDB913;color:#0A0D14;text-decoration:none;font-weight:800;font-size:14px;padding:14px 32px;border-radius:8px;display:inline-block;">
            View Request in Dashboard →
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;background-color:#0A0D14;border-top:1px solid #21262D;text-align:center;font-size:12px;color:#6E7681;">
        Cheesco Equip Hub · Heavy Machinery Marketplace Nigeria<br />
        Need immediate assistance? Reply directly to this email or call +234 800 CHEESCO.
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.sendEmailDirect({
      to: params.customerEmail,
      toName: params.customerName,
      subject,
      html,
    });
  }

  /**
   * Send comprehensive Quotation email to Customer when Admin issues quotation
   */
  async notifyCustomerQuotationSent(params: {
    customerEmail: string;
    customerName: string;
    quotation: {
      referenceNumber: string;
      subtotal: number;
      totalAmount: number;
      validUntil: string;
      terms?: string;
      lineItems?: Array<{ label: string; amount: number; note?: string }>;
    };
    rental: {
      id: string;
      referenceNumber: string;
      equipmentName: string;
      isPurchase?: boolean;
    };
  }): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = `${appUrl}/dashboard/customer?requestId=${params.rental.id}`;

    const subject = `Official Quotation Ready: ${params.quotation.referenceNumber} for ${params.rental.equipmentName} - Cheesco Equip Hub`;

    const formattedSubtotal = Number(params.quotation.subtotal || 0).toLocaleString();
    const formattedTotal = Number(params.quotation.totalAmount || 0).toLocaleString();
    const validUntilDate = params.quotation.validUntil
      ? new Date(params.quotation.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '7 Days from issuance';

    const lineItemsHtml = (params.quotation.lineItems || []).map(item => `
      <tr>
        <td style="font-size:13px;color:#E6EDF3;padding:8px 0;border-bottom:1px solid #21262D;">
          <strong>${escHtml(item.label)}</strong>
          ${item.note ? `<br /><span style="font-size:11px;color:#8B949E;">${escHtml(item.note)}</span>` : ''}
        </td>
        <td style="font-size:13px;color:#FFFFFF;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #21262D;">
          ₦${Number(item.amount || 0).toLocaleString()}
        </td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E6EDF3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#161B22;border:1px solid #30363D;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:28px 32px;background-color:#0A0D14;border-bottom:2px solid #FDB913;text-align:left;">
        <span style="font-size:20px;font-weight:900;letter-spacing:1px;color:#FDB913;">CHEESCO EQUIP HUB</span>
        <span style="float:right;font-size:12px;font-weight:700;color:#FDB913;background:#21262D;padding:4px 10px;border-radius:6px;">
          OFFICIAL QUOTATION
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 8px 0;font-size:22px;color:#FFFFFF;font-weight:700;">Your Quotation is Ready</h2>
        <p style="margin:0 0 20px 0;font-size:15px;color:#C9D1D9;line-height:1.6;">
          Dear <strong>${escHtml(params.customerName)}</strong>,<br />
          Cheesco Operations has prepared your binding quotation for <strong>${escHtml(params.rental.equipmentName)}</strong> (Request Ref: <strong style="color:#FDB913;">${escHtml(params.rental.referenceNumber)}</strong>).
        </p>

        <!-- Quotation Meta Info -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;border:1px solid #21262D;border-radius:8px;margin-bottom:24px;padding:16px;">
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;width:40%;">Quotation Number:</td>
            <td style="font-size:13px;color:#FDB913;font-weight:700;padding:4px 0;">${escHtml(params.quotation.referenceNumber)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Machine:</td>
            <td style="font-size:13px;color:#FFFFFF;font-weight:600;padding:4px 0;">${escHtml(params.rental.equipmentName)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:4px 0;">Validity:</td>
            <td style="font-size:13px;color:#FFFFFF;padding:4px 0;">Valid until <strong>${escHtml(validUntilDate)}</strong></td>
          </tr>
        </table>

        <!-- Line Items Breakdown -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D1117;border:1px solid #21262D;border-radius:8px;margin-bottom:24px;padding:16px;">
          <tr>
            <td colspan="2" style="font-size:12px;font-weight:700;color:#FDB913;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:10px;border-bottom:1px solid #30363D;">
              Financial Breakdown & Commercial Summary
            </td>
          </tr>
          ${lineItemsHtml}
          <tr>
            <td style="font-size:13px;color:#8B949E;padding:10px 0 4px 0;">Subtotal:</td>
            <td style="font-size:13px;color:#FFFFFF;text-align:right;padding:10px 0 4px 0;">₦${formattedSubtotal}</td>
          </tr>
          <tr>
            <td style="font-size:16px;color:#FFFFFF;font-weight:800;padding:12px 0 4px 0;border-top:1px solid #30363D;">Total Payable:</td>
            <td style="font-size:18px;color:#FDB913;font-weight:900;text-align:right;padding:12px 0 4px 0;border-top:1px solid #30363D;">₦${formattedTotal}</td>
          </tr>
        </table>

        <!-- Terms & Conditions Box with Client Feeding/Fueling/Community Clause -->
        <div style="background-color:#0D1117;border-left:4px solid #FDB913;padding:16px 20px;border-radius:4px;margin-bottom:28px;">
          <h4 style="margin:0 0 8px 0;font-size:13px;color:#FDB913;font-weight:700;text-transform:uppercase;">Mandatory Terms & Conditions:</h4>
          <p style="margin:0 0 10px 0;font-size:13px;color:#FFFFFF;line-height:1.6;font-weight:600;">
            "Operator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility."
          </p>
          <p style="margin:0;font-size:12px;color:#8B949E;line-height:1.5;">
            Cheesco Equip Hub guarantees equipment mobilization upon escrow payment receipt. Security deposits are zeroed and statutory VAT (7.5%) is incorporated into this final quote.
          </p>
        </div>

        <!-- Action Button -->
        <div style="text-align:center;margin-bottom:16px;">
          <a href="${actionUrl}" style="background-color:#FDB913;color:#0A0D14;text-decoration:none;font-weight:800;font-size:15px;padding:14px 36px;border-radius:8px;display:inline-block;letter-spacing:0.5px;">
            Review & Accept Quotation →
          </a>
        </div>
        <p style="text-align:center;font-size:12px;color:#8B949E;margin:0;">
          Or log in directly at <a href="${appUrl}/dashboard/customer" style="color:#58A6FF;text-decoration:none;">${appUrl}/dashboard/customer</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;background-color:#0A0D14;border-top:1px solid #21262D;text-align:center;font-size:12px;color:#6E7681;">
        Cheesco Equip Hub · Heavy Machinery Marketplace Nigeria<br />
        This is an official transactional quotation issued by Cheesco Operations Desk.
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.sendEmailDirect({
      to: params.customerEmail,
      toName: params.customerName,
      subject,
      html,
    });
  }
  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabaseServer
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return count || 0;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await supabaseServer
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await supabaseServer
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);
  }

  /**
   * Generate email HTML template
   */
  private generateEmailTemplate(payload: NotificationPayload, user: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(payload.title)}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #000; color: #FDB913; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">CHEESCO EQUIP HUB</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
    <h2 style="color: #000; margin-top: 0;">${escHtml(payload.title)}</h2>
    <p style="font-size: 16px; margin: 20px 0;">${escHtml(payload.message)}</p>

    ${payload.actionUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${escHtml(payload.actionUrl)}"
         style="background: #FDB913; color: #000; padding: 12px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
        View Details
      </a>
    </div>
    ` : ''}
  </div>

  <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
    <p>This is an automated message from Cheesco Equip Hub.</p>
    <p>© ${new Date().getFullYear()} Cheesco Equip Hub. All rights reserved.</p>
  </div>
</body>
</html>
    `;
  }
}

export const notificationService = new NotificationService();
