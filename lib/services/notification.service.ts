/* ── Notification Service with Email/SMS/WhatsApp Support ──────────────────── */

import { supabase } from '@/lib/supabase/client';

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
   * Create in-app notification
   */
  private async createInAppNotification(payload: NotificationPayload): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      category: payload.category,
      reference_id: payload.referenceId,
      action_url: payload.actionUrl,
      metadata: payload.metadata || {},
      read: false,
    });
  }

  /**
   * Send email notification via Resend
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    // Get user email
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', payload.userId)
      .single();

    if (!user?.email) return;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
      console.log('Resend not configured, skipping email:', { to: user.email, subject: payload.title });
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Cheesco Equip Hub <notifications@cheescoequiphub.com>',
          to: user.email,
          subject: payload.title,
          html: this.generateEmailTemplate(payload, user),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Email send failed');
      }
    } catch (error) {
      console.error('Email send error:', error);
    }
  }

  /**
   * Send SMS notification via Termii
   */
  private async sendSMS(payload: NotificationPayload): Promise<void> {
    // Get user phone
    const { data: user } = await supabase
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
    const { data: user } = await supabase
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
      actionUrl: `/dashboard/customer/quotations/${quotation.referenceNumber}`,
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
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return count || 0;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
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
  <title>${payload.title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #000; color: #FDB913; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">CHEESCO EQUIP HUB</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
    <h2 style="color: #000; margin-top: 0;">${payload.title}</h2>
    <p style="font-size: 16px; margin: 20px 0;">${payload.message}</p>

    ${payload.actionUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${payload.actionUrl}"
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
