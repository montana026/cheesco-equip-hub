import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quotationId, email, name } = body;

    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get quotation details
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('*, rental_requests(id, customer_id)')
      .eq('id', quotationId)
      .single();

    if (quotationError || !quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Verify quotation belongs to this user
    if (quotation.rental_requests.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Not your quotation' }, { status: 403 });
    }

    // Verify quotation is accepted
    if (quotation.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Quotation must be accepted first' }, { status: 400 });
    }

    // Initialize payment
    const payment = await paymentService.initializePayment({
      rentalRequestId: quotation.rental_request_id,
      amount: quotation.total_amount,
      email: email || user.email,
      customerName: name,
      metadata: {
        quotation_id: quotationId,
        rental_request_id: quotation.rental_request_id,
      },
    });

    // Update rental state to PAYMENT_PENDING
    await supabase
      .from('rental_requests')
      .update({ current_state: 'PAYMENT_PENDING' })
      .eq('id', quotation.rental_request_id);

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('Error initializing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
