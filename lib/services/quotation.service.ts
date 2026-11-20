import { supabaseServer as supabase } from '@/lib/supabase/server';
import type { QuotationStatus } from '@/lib/types';
import { notificationService } from '@/lib/services/notification.service';

export interface CreateQuotationInput {
  rentalRequestId: string;
  merchantBaseRate: number;
  cheescoMarginRate: number; // percentage
  lineItems: Array<{ label: string; amount: number; note?: string }>;
  depositAmount?: number;
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

    const durationDays = rental.duration_days || 1;
    const cheescoManagedRate = input.merchantBaseRate * (1 + input.cheescoMarginRate / 100);
    const rentalCost = cheescoManagedRate * durationDays;

    // Filter out Operator fee from line items (per rule: operator fee removed)
    const baseLineItems = (input.lineItems || []).filter(
      (item) =>
        !item.label.toLowerCase().includes('operator') &&
        !item.label.toLowerCase().includes('vat')
    );

    const lineItemsTotal = baseLineItems.reduce((sum, item) => sum + item.amount, 0);
    const subtotal = rentalCost + lineItemsTotal;

    // Statutory VAT at 7.5%
    const VAT_RATE = 0.075;
    const vatAmount = Math.round(subtotal * VAT_RATE);

    // Guaranteed inclusion of VAT 7.5% line item
    const finalLineItems = [
      ...baseLineItems,
      { label: 'VAT (7.5%)', amount: vatAmount, note: 'Value Added Tax (7.5%)' },
    ];

    // Security deposit is removed (set to 0)
    const depositAmount = 0;
    const totalAmount = subtotal + vatAmount;

    const merchantPayout = input.merchantBaseRate * durationDays;
    const cheescoMargin = totalAmount - merchantPayout - vatAmount;

    // Generate reference number
    const referenceNumber = await this.generateReferenceNumber();

    // Calculate valid until date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (input.validDays || 7));

    // Ensure mandatory terms clause is present
    const mandatoryTermsClause =
      "operator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility";
    let finalTerms = input.terms || '';
    if (!finalTerms.toLowerCase().includes('operator feeding') && !finalTerms.toLowerCase().includes('community charges')) {
      finalTerms = `Operator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility.\n\n${finalTerms}`;
    }

    // Check if quotation already exists for this rental request
    const { data: existingQuote } = await supabase
      .from('quotations')
      .select('id, reference_number, status')
      .eq('rental_request_id', input.rentalRequestId)
      .maybeSingle();

    let data: any = null;
    let error: any = null;

    if (existingQuote) {
      // If a quotation already exists, update it cleanly instead of violating quotations_rental_request_id_key unique constraint
      const updateResult = await supabase
        .from('quotations')
        .update({
          merchant_base_rate: input.merchantBaseRate,
          cheesco_margin_rate: input.cheescoMarginRate,
          cheesco_managed_rate: cheescoManagedRate,
          line_items: finalLineItems,
          subtotal,
          deposit_amount: depositAmount,
          total_amount: totalAmount,
          merchant_payout_total: merchantPayout,
          cheesco_gross_margin: cheescoMargin,
          status: 'DRAFT',
          valid_until: validUntil.toISOString(),
          terms: finalTerms,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingQuote.id)
        .select()
        .single();

      data = updateResult.data;
      error = updateResult.error;
    } else {
      const insertResult = await supabase
        .from('quotations')
        .insert({
          rental_request_id: input.rentalRequestId,
          reference_number: referenceNumber,
          merchant_base_rate: input.merchantBaseRate,
          cheesco_margin_rate: input.cheescoMarginRate,
          cheesco_managed_rate: cheescoManagedRate,
          line_items: finalLineItems,
          subtotal,
          deposit_amount: depositAmount,
          total_amount: totalAmount,
          merchant_payout_total: merchantPayout,
          cheesco_gross_margin: cheescoMargin,
          status: 'DRAFT',
          valid_until: validUntil.toISOString(),
          terms: finalTerms,
        })
        .select()
        .single();

      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) throw error;
    return data;
  },

  /**
   * Send quotation to customer
   * Blocked if quotation has already been sent (SENT / VIEWED / ACCEPTED / DECLINED)
   */
  async send(quotationId: string) {
    // Guard: fetch current status first
    const { data: existing, error: fetchErr } = await supabase
      .from('quotations')
      .select('id, status, reference_number, sent_at')
      .eq('id', quotationId)
      .single();

    if (fetchErr || !existing) throw new Error('Quotation not found');

    const alreadySent = ['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'REVISION_REQUESTED'].includes(
      (existing.status || '').toUpperCase()
    );

    if (alreadySent) {
      throw new Error(
        `Quotation ${existing.reference_number} has already been sent to the client (status: ${existing.status}). ` +
        `To revise it, save a new draft first — the client will NOT be re-notified automatically.`
      );
    }

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

    // Notify customer in-app & via direct official quotation email
    try {
      const { data: rental } = await supabase
        .from('rental_requests')
        .select(`
          id,
          reference_number,
          customer_id,
          equipment_id,
          project_type,
          customer:users!customer_id(id, full_name, email),
          equipment:equipment!inner(id, name, brand, model)
        `)
        .eq('id', data.rental_request_id)
        .single();

      if (rental) {
        // 1. In-app notification
        await supabase.from('notifications').insert({
          user_id: rental.customer_id,
          type: 'QUOTATION',
          title: 'Quotation Ready',
          message: `Your quotation for ${rental.reference_number} is ready for review. Total: ₦${Number(data.total_amount || 0).toLocaleString()}`,
          link: `/dashboard/customer?requestId=${data.rental_request_id}`,
          is_read: false,
        });

        // 2. Direct Quotation Email to Customer
        const customerEmail = (rental as any).customer?.email;
        const customerName = (rental as any).customer?.full_name || 'Valued Client';
        const equipmentName = (rental as any).equipment?.name || 'Equipment';

        if (customerEmail) {
          await notificationService.notifyCustomerQuotationSent({
            customerEmail,
            customerName,
            quotation: {
              referenceNumber: data.reference_number,
              subtotal: data.subtotal,
              totalAmount: data.total_amount,
              validUntil: data.valid_until,
              terms: data.terms,
              lineItems: data.line_items || [],
            },
            rental: {
              id: rental.id,
              referenceNumber: rental.reference_number,
              equipmentName,
              isPurchase: rental.project_type?.startsWith('Purchase'),
            },
          });
        }
      }
    } catch (notifErr) {
      console.warn('Failed to dispatch quotation notifications/email:', notifErr);
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
        link: `/admin/operations?requestId=${data.rental_request_id}`,
        is_read: false,
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
        link: `/admin/operations?requestId=${data.rental_request_id}`,
        is_read: false,
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
      .maybeSingle(); // returns null (not an error) when no quotation exists yet

    if (error) throw error;
    return data; // null when no quotation found
  },

  /**
   * Generate reference number
   */
  async generateReferenceNumber(): Promise<string> {
    const { data } = await supabase.rpc('generate_reference_number', { prefix: 'QUO' });
    return data || `QUO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  },
};
