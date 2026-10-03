# Service Integrations Setup Guide

This guide explains how to integrate external services (Email, SMS, WhatsApp, Storage) with Cheesco Equip Hub.

---

## 1. Supabase Storage Setup

### Create Storage Buckets

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('equipment-images', 'equipment-images', true),
  ('equipment-documents', 'equipment-documents', false),
  ('inspection-photos', 'inspection-photos', false),
  ('merchant-documents', 'merchant-documents', false);

-- Set up RLS policies for equipment-images (public)
CREATE POLICY "Public access to equipment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'equipment-images' 
  AND auth.role() = 'authenticated'
);

-- RLS policies for equipment-documents (private)
CREATE POLICY "Admins can view equipment documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'equipment-documents'
  AND (
    auth.jwt() ->> 'role' IN ('OPERATIONS_ADMIN', 'VERIFICATION_ADMIN', 'SUPER_ADMIN')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Merchants can upload equipment documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'equipment-documents'
  AND auth.role() = 'authenticated'
);

-- RLS policies for inspection-photos (private)
CREATE POLICY "Authorized users can view inspection photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspection-photos'
  AND auth.jwt() ->> 'role' IN ('OPERATIONS_ADMIN', 'SUPER_ADMIN', 'CUSTOMER')
);

CREATE POLICY "Admins can upload inspection photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-photos'
  AND auth.jwt() ->> 'role' IN ('OPERATIONS_ADMIN', 'SUPER_ADMIN')
);

-- RLS policies for merchant-documents (private)
CREATE POLICY "Admins can view merchant documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'merchant-documents'
  AND auth.jwt() ->> 'role' IN ('VERIFICATION_ADMIN', 'SUPER_ADMIN')
);

CREATE POLICY "Merchants can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'merchant-documents'
  AND auth.role() = 'authenticated'
);
```

### Update Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 2. Email Service (Resend) Setup

### Sign Up & Get API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up for an account
3. Verify your domain or use `onboarding@resend.dev` for testing
4. Get your API key from the dashboard

### Install Package

```bash
npm install resend
```

### Update Environment Variables

Add to `.env.local`:

```bash
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=Cheesco Equip Hub <notifications@yourdomain.com>
```

### Integration Code

Update `lib/services/notification.service.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

private async sendEmail(payload: NotificationPayload): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', payload.userId)
    .single();

  if (!user?.email) return;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject: payload.title,
      html: this.generateEmailTemplate(payload, user),
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
}
```

---

## 3. SMS Service (Termii) Setup

Termii is popular in Nigeria and supports local Nigerian numbers.

### Sign Up & Get API Key

1. Go to [https://termii.com](https://termii.com)
2. Sign up for an account
3. Verify your account
4. Get your API key from Settings
5. Register a sender ID (e.g., "CHEESCO")

### Install Package

```bash
npm install node-fetch
```

### Update Environment Variables

Add to `.env.local`:

```bash
TERMII_API_KEY=your_termii_api_key
TERMII_SENDER_ID=CHEESCO
```

### Integration Code

Update `lib/services/notification.service.ts`:

```typescript
private async sendSMS(payload: NotificationPayload): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('phone')
    .eq('id', payload.userId)
    .single();

  if (!user?.phone) return;

  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        to: user.phone,
        from: process.env.TERMII_SENDER_ID,
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
```

---

## 4. WhatsApp Business API Setup

### Option A: Official WhatsApp Business API (Recommended for Production)

1. Go to [Meta Business Suite](https://business.facebook.com)
2. Create a business account
3. Set up WhatsApp Business API
4. Get your Phone Number ID and Access Token
5. Create message templates and get them approved

### Update Environment Variables

Add to `.env.local`:

```bash
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### Integration Code

Update `lib/services/notification.service.ts`:

```typescript
private async sendWhatsApp(payload: NotificationPayload): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('phone')
    .eq('id', payload.userId)
    .single();

  if (!user?.phone) return;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
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
```

### Option B: Twilio WhatsApp (Easier for Testing)

```bash
npm install twilio
```

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

private async sendWhatsApp(payload: NotificationPayload): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('phone')
    .eq('id', payload.userId)
    .single();

  if (!user?.phone) return;

  try {
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${user.phone}`,
      body: `*${payload.title}*\n\n${payload.message}`,
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
  }
}
```

---

## 5. Paystack Refunds Setup

### Update Environment Variables

Already configured, but ensure you have:

```bash
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
```

### Integration Code

Create `lib/services/paystack.service.ts`:

```typescript
export async function initiateRefund(
  paymentReference: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: paymentReference,
        amount: amount * 100, // Convert to kobo
        merchant_note: reason,
      }),
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || 'Refund failed');
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Paystack refund error:', error);
    return { success: false, error: error.message };
  }
}
```

Update `app/api/deposits/settle/route.ts` to trigger actual refunds:

```typescript
import { initiateRefund } from '@/lib/services/paystack.service';

// After creating refund record
if (refundAmount > 0 && depositPayment.payment_reference) {
  const refundResult = await initiateRefund(
    depositPayment.payment_reference,
    refundAmount,
    reason || 'Deposit refund after rental completion'
  );

  if (refundResult.success) {
    // Update refund record with Paystack response
    await supabase
      .from('payments')
      .update({
        status: 'REFUNDED',
        gateway_response: refundResult.data,
      })
      .eq('rental_request_id', rentalRequestId)
      .eq('payment_type', 'DAMAGE_DEPOSIT')
      .eq('status', 'PENDING');
  }
}
```

---

## 6. Testing Integrations

### Test Email

```bash
# In your terminal or via API call
curl -X POST http://localhost:3000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

### Test SMS

```bash
curl -X POST http://localhost:3000/api/test/sms \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

### Test WhatsApp

```bash
curl -X POST http://localhost:3000/api/test/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

### Test Storage Upload

```bash
curl -X POST http://localhost:3000/api/test/storage \
  -F "file=@/path/to/image.jpg"
```

---

## 7. Production Checklist

Before going live:

- [ ] Create Supabase Storage buckets with RLS policies
- [ ] Verify domain for email sending (Resend)
- [ ] Fund Termii account for SMS (minimum ₦5,000)
- [ ] Get WhatsApp Business API approved templates
- [ ] Test all notification channels
- [ ] Set up webhook endpoints for service callbacks
- [ ] Configure proper error logging (Sentry)
- [ ] Set up monitoring for service failures
- [ ] Document escalation procedures
- [ ] Train operations team on notification system

---

## 8. Cost Estimates (Monthly)

### Supabase Storage
- Free tier: 1GB storage, 2GB bandwidth
- Pro: $25/month (100GB storage, 200GB bandwidth)

### Resend Email
- Free: 3,000 emails/month
- Pro: $20/month for 50,000 emails

### Termii SMS (Nigeria)
- ~₦2-4 per SMS
- 1000 SMS ≈ ₦3,000

### WhatsApp Business API
- Free for first 1,000 conversations/month
- Then ~₦50-100 per conversation

**Estimated Total for 1000 monthly transactions**: ₦15,000 - ₦25,000

---

## Support

For integration issues:
- Supabase: [https://supabase.com/docs](https://supabase.com/docs)
- Resend: [https://resend.com/docs](https://resend.com/docs)
- Termii: [https://developers.termii.com](https://developers.termii.com)
- WhatsApp: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- Paystack: [https://paystack.com/docs](https://paystack.com/docs)
