import { NextRequest, NextResponse } from 'next/server';
import { paymentService, WebhookSignatureError } from '@/lib/services/payment.service';

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  const signature = request.headers.get('x-paystack-signature');

  try {
    const result = await paymentService.handlePaystackWebhook(rawBody, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[/api/webhooks/paystack] Error:', error);

    if (error instanceof WebhookSignatureError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
