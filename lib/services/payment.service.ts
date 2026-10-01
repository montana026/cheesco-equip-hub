import { supabase } from '@/lib/supabase/client';
import type { PaymentType, PaymentStatus } from '@/lib/types';

export interface InitiatePaymentInput {
  rentalRequestId?: string;
  amount: number;
  email: string;
  customerName: string;
  metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export const paymentService = {
  /**
   * Initialize payment with Paystack
   */
  async initializePayment(input: InitiatePaymentInput): Promise<InitializePaymentResponse> {
    const reference = `CHE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create payment record in database
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        rental_request_id: input.rentalRequestId,
        amount: input.amount,
        reference,
        status: 'PENDING',
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize Paystack transaction
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amount * 100, // Convert to kobo
        reference,
        metadata: {
          customer_name: input.customerName,
          ...input.metadata,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/payments/verify`,
      }),
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || 'Failed to initialize payment');
    }

    return {
      reference,
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
    };
  },

  /**
   * Verify payment with Paystack
   */
  async verifyPayment(reference: string) {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    // Verify with Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const result = await response.json();

    if (!result.status) {
      throw new Error('Payment verification failed');
    }

    const paystackData = result.data;

    // Update payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: paystackData.status === 'success' ? 'SUCCESSFUL' : 'FAILED',
        paid_at: paystackData.status === 'success' ? new Date().toISOString() : null,
        metadata: { paystack_data: paystackData },
      })
      .eq('reference', reference)
      .select('*, rental_requests(id, customer_id)')
      .single();

    if (error) throw error;

    // Update rental state if payment successful
    if (paystackData.status === 'success' && payment.rental_request_id) {
      await supabase
        .from('rental_requests')
        .update({ current_state: 'PAYMENT_CONFIRMED' })
        .eq('id', payment.rental_request_id);

      // Notify operations team
      await this.notifyPaymentConfirmed(payment.rental_request_id);
    }

    return {
      status: paystackData.status,
      amount: paystackData.amount / 100, // Convert from kobo
      reference: paystackData.reference,
      paidAt: paystackData.paid_at,
    };
  },

  /**
   * Get payment by reference
   */
  async getByReference(reference: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get customer's payment history
   */
  async getCustomerPayments(customerId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        rental_request:rental_requests(
          reference_number,
          equipment:equipment(name)
        )
      `)
      .eq('payer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Release deposit
   */
  async releaseDeposit(paymentId: string) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        deposit_status: 'RELEASED',
        deposit_released_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('payment_type', 'DAMAGE_DEPOSIT')
      .select()
      .single();

    if (error) throw error;

    // Notify customer
    if (data.rental_request_id) {
      const { data: rental } = await supabase
        .from('rental_requests')
        .select('customer_id, reference_number')
        .eq('id', data.rental_request_id)
        .single();

      if (rental) {
        await supabase.from('notifications').insert({
          user_id: rental.customer_id,
          type: 'PAYMENT',
          title: 'Deposit Released',
          message: `Your deposit for ${rental.reference_number} has been released.`,
        });
      }
    }

    return data;
  },

  /**
   * Deduct from deposit
   */
  async deductFromDeposit(paymentId: string, deductionAmount: number, reason: string) {
    const { data: payment } = await supabase
      .from('payments')
      .select('amount')
      .eq('id', paymentId)
      .single();

    if (!payment) throw new Error('Payment not found');

    const newStatus = deductionAmount >= payment.amount ? 'FULLY_DEDUCTED' : 'PARTIALLY_DEDUCTED';

    const { data, error } = await supabase
      .from('payments')
      .update({
        deposit_status: newStatus,
        deposit_deduction_amount: deductionAmount,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // Notify customer
    if (data.rental_request_id) {
      const { data: rental } = await supabase
        .from('rental_requests')
        .select('customer_id, reference_number')
        .eq('id', data.rental_request_id)
        .single();

      if (rental) {
        await supabase.from('notifications').insert({
          user_id: rental.customer_id,
          type: 'PAYMENT',
          title: 'Deposit Deduction',
          message: `₦${deductionAmount.toLocaleString()} has been deducted from your deposit for ${rental.reference_number}. Reason: ${reason}`,
        });
      }
    }

    return data;
  },

  /**
   * Notify operations team of confirmed payment
   */
  async notifyPaymentConfirmed(rentalRequestId: string) {
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .in('role', ['OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN']);

    if (admins) {
      const { data: rental } = await supabase
        .from('rental_requests')
        .select('reference_number')
        .eq('id', rentalRequestId)
        .single();

      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: 'PAYMENT',
        title: 'Payment Confirmed',
        message: `Payment confirmed for ${rental?.reference_number}. Proceed with logistics assignment.`,
        link: `/admin/operations/rentals/${rentalRequestId}`,
      }));

      await supabase.from('notifications').insert(notifications);
    }
  },
};
