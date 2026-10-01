import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

/**
 * Paystack Webhook Handler
 * Verifies payment status and updates rental records
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // Verify webhook signature
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

    if (hash !== signature) {
      console.error('Invalid Paystack signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const event = JSON.parse(body);

    console.log('Paystack webhook received:', event.event);

    // Handle payment success
    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data;

      // Find payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, rental_requests(id, customer_id)')
        .eq('reference', reference)
        .single();

      if (paymentError || !payment) {
        console.error('Payment not found:', reference);
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      // Verify amount matches
      const expectedAmount = payment.amount * 100; // Convert to kobo
      if (amount !== expectedAmount) {
        console.error('Amount mismatch:', { expected: expectedAmount, received: amount });

        await supabase
          .from('payments')
          .update({
            status: 'FAILED',
            metadata: {
              ...payment.metadata,
              error: 'Amount mismatch',
              expected: expectedAmount,
              received: amount,
            },
          })
          .eq('id', payment.id);

        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
      }

      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'SUCCESSFUL',
          paid_at: new Date().toISOString(),
          metadata: {
            ...payment.metadata,
            paystack_data: event.data,
          },
        })
        .eq('id', payment.id);

      // Update deposit status if this is a deposit payment
      if (payment.deposit_id) {
        await supabase
          .from('deposits')
          .update({ status: 'HELD' })
          .eq('id', payment.deposit_id);
      }

      // Update rental state based on payment type
      if (payment.rental_request_id) {
        const { data: rental } = await supabase
          .from('rental_requests')
          .select('current_state')
          .eq('id', payment.rental_request_id)
          .single();

        if (rental?.current_state === 'PAYMENT_PENDING') {
          await supabase
            .from('rental_requests')
            .update({ current_state: 'PAYMENT_CONFIRMED' })
            .eq('id', payment.rental_request_id);

          // Notify operations team to assign logistics
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .in('role', ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);

          if (admins) {
            const notifications = admins.map((admin) => ({
              user_id: admin.id,
              type: 'PAYMENT',
              title: 'Payment Confirmed',
              message: `Payment confirmed for ${reference}. Assign logistics.`,
              link: `/admin/operations/rentals/${payment.rental_request_id}`,
            }));

            await supabase.from('notifications').insert(notifications);
          }

          // Notify customer
          if (payment.rental_requests?.customer_id) {
            await supabase.from('notifications').insert({
              user_id: payment.rental_requests.customer_id,
              type: 'PAYMENT',
              title: 'Payment Confirmed',
              message: 'Your payment has been confirmed. Equipment delivery will be scheduled soon.',
              link: `/dashboard/customer/requests/${payment.rental_request_id}`,
            });
          }
        }
      }

      console.log('Payment processed successfully:', reference);
      return NextResponse.json({ success: true });
    }

    // Handle payment failure
    if (event.event === 'charge.failed') {
      const { reference } = event.data;

      await supabase
        .from('payments')
        .update({
          status: 'FAILED',
          metadata: { paystack_data: event.data },
        })
        .eq('reference', reference);

      console.log('Payment failed:', reference);
      return NextResponse.json({ success: true });
    }

    // Other events
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
