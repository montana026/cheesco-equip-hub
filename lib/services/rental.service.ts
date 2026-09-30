import { supabase } from '@/lib/supabase/client';
import type { RentalState } from '@/lib/types';

export interface CreateRentalRequestInput {
  customerId: string;
  equipmentId: string;
  startDate: Date;
  endDate: Date;
  projectLocation: string;
  projectType?: string;
  operatorRequired: boolean;
  deliveryRequired: boolean;
  additionalRequirements?: string;
}

export const rentalService = {
  /**
   * Create a new rental request
   */
  async createRequest(input: CreateRentalRequestInput) {
    // First, get equipment details
    const { data: equipment, error: eqError } = await supabase
      .from('equipment')
      .select('merchant_id')
      .eq('id', input.equipmentId)
      .single();

    if (eqError) throw eqError;

    // Check availability
    const { data: conflicts } = await supabase
      .from('equipment_availability')
      .select('*')
      .eq('equipment_id', input.equipmentId)
      .gte('blocked_to', input.startDate.toISOString())
      .lte('blocked_from', input.endDate.toISOString());

    if (conflicts && conflicts.length > 0) {
      throw new Error('Equipment is not available for the selected dates');
    }

    // Calculate duration
    const durationDays = Math.ceil(
      (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Generate reference number
    const referenceNumber = await this.generateReferenceNumber();

    // Create rental request
    const { data, error } = await supabase
      .from('rental_requests')
      .insert({
        reference_number: referenceNumber,
        customer_id: input.customerId,
        equipment_id: input.equipmentId,
        merchant_id: equipment.merchant_id,
        start_date: input.startDate.toISOString().split('T')[0],
        end_date: input.endDate.toISOString().split('T')[0],
        duration_days: durationDays,
        project_location: input.projectLocation,
        project_type: input.projectType,
        operator_required: input.operatorRequired,
        delivery_required: input.deliveryRequired,
        additional_requirements: input.additionalRequirements,
        current_state: 'REQUEST_SUBMITTED',
      })
      .select()
      .single();

    if (error) throw error;

    // Block the dates in availability calendar
    await supabase.from('equipment_availability').insert({
      equipment_id: input.equipmentId,
      blocked_from: input.startDate.toISOString().split('T')[0],
      blocked_to: input.endDate.toISOString().split('T')[0],
      reason: 'RESERVED',
      rental_request_id: data.id,
    });

    // Create notification for operations team
    await this.notifyOperationsTeam(data.id);

    return data;
  },

  /**
   * Get rental request by ID
   */
  async getById(id: string) {
    const { data, error } = await supabase
      .from('rental_requests')
      .select(`
        *,
        customer:users!customer_id(id, full_name, email, phone),
        equipment:equipment!inner(
          *,
          images:equipment_images(image_url, is_primary)
        ),
        merchant:merchant_profiles!merchant_id(business_name, business_phone),
        quotation:quotations(*),
        agreement:rental_agreements(*),
        payments:payments(*),
        logistics:logistics(*),
        state_history:rental_state_history(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get customer's rental requests
   */
  async getCustomerRequests(customerId: string) {
    const { data, error } = await supabase
      .from('rental_requests')
      .select(`
        *,
        equipment:equipment!inner(
          name,
          category,
          images:equipment_images(image_url, is_primary)
        ),
        quotation:quotations(id, status, total_amount)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get merchant's rental requests
   */
  async getMerchantRequests(merchantId: string) {
    const { data, error } = await supabase
      .from('rental_requests')
      .select(`
        *,
        customer:users!customer_id(full_name, phone),
        equipment:equipment!inner(
          name,
          category,
          images:equipment_images(image_url, is_primary)
        ),
        quotation:quotations(id, status, total_amount)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Update rental state
   */
  async updateState(rentalId: string, newState: RentalState, userId: string, notes?: string) {
    const { error } = await supabase
      .from('rental_requests')
      .update({ current_state: newState })
      .eq('id', rentalId);

    if (error) throw error;

    // State history is logged automatically via trigger
    return { success: true };
  },

  /**
   * Generate reference number
   */
  async generateReferenceNumber(): Promise<string> {
    const { data } = await supabase.rpc('generate_reference_number', { prefix: 'RNT' });
    return data || `RNT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  },

  /**
   * Notify operations team of new request
   */
  async notifyOperationsTeam(rentalId: string) {
    // Get operations admins
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .in('role', ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: 'RENTAL_REQUEST',
        title: 'New Rental Request',
        message: 'A new rental request has been submitted and requires verification.',
        link: `/admin/operations/rentals/${rentalId}`,
      }));

      await supabase.from('notifications').insert(notifications);
    }
  },
};
