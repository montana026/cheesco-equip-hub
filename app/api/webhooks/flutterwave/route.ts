import { NextRequest, NextResponse } from 'next/server';
import { paymentService, WebhookSignatureError } from '@/lib/services/payment.service';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Failed to parse JSON body' }, { status: 400 });
  }

  const signature = request.headers.get('verif-hash');

  try {
    const result = await paymentService.handleFlutterwaveWebhook(body, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[/api/webhooks/flutterwave] Error:', error);

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
