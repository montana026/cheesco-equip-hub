import { supabase } from '@/lib/supabase/client';
import type { QuotationStatus } from '@/lib/types';

export interface CreateQuotationInput {
  rentalRequestId: string;
  merchantBaseRate: number;
  cheescoMarginRate: number; // percentage
  lineItems: Array<{ label: string; amount: number; note?: string }>;
  depositAmount: number;
  terms: string;
  validDays: number;
}

export const quotationService = {
  /**
   * Create quotation for rental request
   */
  async create(input: CreateQuotationInput) {
    // Calculate totals
    const { data: rental } = await supabase
      .from('rental_requests')
      .select('duration_days')
      .eq('id', input.rentalRequestId)
      .single();

    if (!rental) throw new Error('Rental request not found');

    const cheescoManagedRate = input.merchantBaseRate * (1 + input.cheescoMarginRate / 100);
    const rentalCost = cheescoManagedRate * rental.duration_days;

    const lineItemsTotal = input.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const subtotal = rentalCost + lineItemsTotal;
    const totalAmount = subtotal + input.depositAmount;

    const merchantPayout = input.merchantBaseRate * rental.duration_days;
    const cheescoMargin = totalAmount - merchantPayout - input.depositAmount;

    // Generate reference number
    const referenceNumber = await this.generateReferenceNumber();

    // Calculate valid until date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + input.validDays);

    const { data, error } = await supabase
      .from('quotations')
      .insert({
        rental_request_id: input.rentalRequestId,
        reference_number: referenceNumber,
        merchant_base_rate: input.merchantBaseRate,
        cheesco_margin_rate: input.cheescoMarginRate,
        cheesco_managed_rate: cheescoManagedRate,
        line_items: input.lineItems,
        subtotal,
        deposit_amount: input.depositAmount,
        total_amount: totalAmount,
        merchant_payout_total: merchantPayout,
        cheesco_gross_margin: cheescoMargin,
        status: 'DRAFT',
        valid_until: validUntil.toISOString(),
        terms: input.terms,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Send quotation to customer
   */
  async send(quotationId: string) {
    const { data, error } = await supabase
      .from('quotations')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw error;

    // Update rental state
    await supabase
      .from('rental_requests')
      .update({ current_state: 'QUOTATION_SENT' })
      .eq('id', data.rental_request_id);

    // Notify customer
    const { data: rental } = await supabase
      .from('rental_requests')
      .select('customer_id, reference_number')
      .eq('id', data.rental_request_id)
      .single();

    if (rental) {
      await supabase.from('notifications').insert({
        user_id: rental.customer_id,
        type: 'QUOTATION',
        title: 'Quotation Ready',
        message: `Your quotation for ${rental.reference_number} is ready for review.`,
        link: `/dashboard/customer/requests/${data.rental_request_id}`,
      });
    }

    return data;
  },

  /**
   * Mark quotation as viewed
   */
  async markViewed(quotationId: string) {
    const { error } = await supabase
      .from('quotations')
      .update({
        status: 'VIEWED',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .eq('status', 'SENT'); // Only update if currently sent

    if (error) throw error;

    // Update rental state
    const { data: quotation } = await supabase
      .from('quotations')
      .select('rental_request_id')
      .eq('id', quotationId)
      .single();

    if (quotation) {
      await supabase
        .from('rental_requests')
        .update({ current_state: 'QUOTATION_VIEWED' })
        .eq('id', quotation.rental_request_id);
    }
  },

  /**
   * Customer accepts quotation
   */
  async accept(quotationId: string, customerId: string) {
    const { data, error } = await supabase
      .from('quotations')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw error;

    // Update rental state
    await supabase
      .from('rental_requests')
      .update({ current_state: 'QUOTATION_ACCEPTED' })
      .eq('id', data.rental_request_id);

    // Notify operations team to generate agreement
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .in('role', ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);

    if (admins) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: 'QUOTATION',
        title: 'Quotation Accepted',
        message: `Customer has accepted quotation ${data.reference_number}. Generate rental agreement.`,
        link: `/admin/operations/rentals/${data.rental_request_id}`,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return data;
  },

  /**
   * Customer declines quotation
   */
  async decline(quotationId: string, customerId: string) {
    const { data, error } = await supabase
      .from('quotations')
      .update({ status: 'DECLINED' })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Customer requests revision
   */
  async requestRevision(quotationId: string, customerId: string, revisionNotes: string) {
    const { data, error } = await supabase
      .from('quotations')
      .update({ status: 'REVISION_REQUESTED' })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw error;

    // Update rental state
    await supabase
      .from('rental_requests')
      .update({ current_state: 'QUOTATION_REVISION_REQUESTED' })
      .eq('id', data.rental_request_id);

    // Notify operations
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .in('role', ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);

    if (admins) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: 'QUOTATION',
        title: 'Quotation Revision Requested',
        message: `Customer requested revision for ${data.reference_number}`,
        link: `/admin/operations/rentals/${data.rental_request_id}`,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return data;
  },

  /**
   * Get quotation by rental request ID
   */
  async getByRentalRequest(rentalRequestId: string) {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('rental_request_id', rentalRequestId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Generate reference number
   */
  async generateReferenceNumber(): Promise<string> {
    const { data } = await supabase.rpc('generate_reference_number', { prefix: 'QUO' });
    return data || `QUO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  },
};
