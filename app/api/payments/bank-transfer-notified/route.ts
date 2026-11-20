import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';
import { verifyCustomerAuth } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const result = await paymentService.notifyBankTransferMade(reference);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[/api/payments/bank-transfer-notified] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
