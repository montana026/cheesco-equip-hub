import { supabase } from '@/lib/supabase/client';
import type { PaymentType, PaymentStatus } from '@/lib/types';

export interface InitiatePaymentInput {
  rentalRequestId?: string;
  quotationId?: string;
  amount: number;
  paymentType: PaymentType;
  payerId: string;
  email: string;
}

export const paymentService = {
  /**
   * Initiate payment with Paystack
   */
  async initiatePayment(input: InitiatePaymentInput) {
    const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        rental_request_id: input.rentalRequestId,
        quotation_id: input.quotationId,
        payer_id: input.payerId,
        amount: input.amount,
        currency: 'NGN',
        payment_type: input.paymentType,
        status: 'PENDING',
        payment_reference: reference,
        payment_gateway: 'PAYSTACK',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      paymentId: payment.id,
      reference,
      amount: input.amount,
      email: input.email,
    };
  },

  /**
   * Verify payment with Paystack
   */
  async verifyPayment(reference: string) {
    // In production, this would call Paystack's verification endpoint
    // For now, we'll simulate verification
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*, rental_request:rental_requests(*)')
      .eq('payment_reference', reference)
      .single();

    if (error) throw error;

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'CONFIRMED',
        paid_at: new Date().toISOString(),
      })
      .eq('payment_reference', reference);

    if (updateError) throw updateError;

    // Update rental state if this is a rental payment
    if (payment.rental_request_id) {
      await supabase
        .from('rental_requests')
        .update({ current_state: 'PAYMENT_CONFIRMED' })
        .eq('id', payment.rental_request_id);

      // Notify operations team
      await this.notifyPaymentConfirmed(payment.rental_request_id);
    }

    return payment;
  },

  /**
   * Get payment by reference
   */
  async getByReference(reference: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', reference)
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
