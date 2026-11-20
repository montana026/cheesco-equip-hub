import { supabaseServer as supabase } from '@/lib/supabase/server';

export interface AssignLogisticsInput {
  rentalRequestId: string;
  carrierName: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  estimatedPickupDate: string;
  estimatedDeliveryDate: string;
  notes?: string;
}

export interface UpdateLogisticsInput {
  status: string;
  actualPickupDate?: string;
  actualDeliveryDate?: string;
  currentLocation?: string;
  notes?: string;
}

export const logisticsService = {
  /**
   * Assign logistics to a rental request
   */
  async assignLogistics(input: AssignLogisticsInput) {
    const { data: logistics, error } = await supabase
      .from('logistics')
      .insert({
        rental_request_id: input.rentalRequestId,
        carrier_name: input.carrierName,
        driver_name: input.driverName,
        driver_phone: input.driverPhone,
        vehicle_number: input.vehicleNumber,
        pickup_location: input.pickupLocation,
        delivery_location: input.deliveryLocation,
        estimated_pickup_date: input.estimatedPickupDate,
        estimated_delivery_date: input.estimatedDeliveryDate,
        status: 'ASSIGNED',
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Update rental state
    await supabase
      .from('rental_requests')
      .update({ current_state: 'CARRIER_ASSIGNED' })
      .eq('id', input.rentalRequestId);

    // Notify customer
    const { data: rental } = await supabase
      .from('rental_requests')
      .select('customer_id, reference_number')
      .eq('id', input.rentalRequestId)
      .single();

    if (rental) {
      await supabase.from('notifications').insert({
        user_id: rental.customer_id,
        type: 'LOGISTICS',
        title: 'Logistics Assigned',
        message: `Carrier assigned for ${rental.reference_number}. Equipment will be delivered soon.`,
        link: `/dashboard/customer?requestId=${input.rentalRequestId}`,
        is_read: false,
      });
    }

    return logistics;
  },

  /**
   * Update logistics status
   */
  async updateLogisticsStatus(logisticsId: string, input: UpdateLogisticsInput) {
    const { data: logistics, error } = await supabase
      .from('logistics')
      .update({
        status: input.status,
        actual_pickup_date: input.actualPickupDate,
        actual_delivery_date: input.actualDeliveryDate,
        current_location: input.currentLocation,
        notes: input.notes,
      })
      .eq('id', logisticsId)
      .select('*, rental_requests(id, customer_id, reference_number)')
      .single();

    if (error) throw error;

    // Update rental state based on logistics status
    const stateMap: Record<string, string> = {
      PREPARING: 'LOGISTICS_PENDING',
      DISPATCHED: 'IN_TRANSIT',
      IN_TRANSIT: 'IN_TRANSIT',
      ARRIVED: 'PRE_DELIVERY_INSPECTION',
      DELIVERED: 'DELIVERED',
    };

    const newState = stateMap[input.status];
    if (newState) {
      await supabase
        .from('rental_requests')
        .update({ current_state: newState })
        .eq('id', logistics.rental_request_id);
    }

    // Notify customer on status changes
    if (logistics.rental_requests) {
      const notifications: Record<string, { title: string; message: string }> = {
        DISPATCHED: {
          title: 'Equipment Dispatched',
          message: `Equipment for ${logistics.rental_requests.reference_number} is on the way!`,
        },
        ARRIVED: {
          title: 'Equipment Arrived',
          message: `Equipment has arrived at delivery location. Pre-delivery inspection in progress.`,
        },
        DELIVERED: {
          title: 'Equipment Delivered',
          message: `Equipment successfully delivered. Your rental is now active!`,
        },
      };

      const notif = notifications[input.status];
      if (notif) {
        await supabase.from('notifications').insert({
          user_id: logistics.rental_requests.customer_id,
          type: 'LOGISTICS',
          title: notif.title,
          message: notif.message,
          link: `/dashboard/customer?requestId=${logistics.rental_request_id}`,
          is_read: false,
        });
      }
    }

    return logistics;
  },

  /**
   * Get logistics by rental request
   */
  async getByRentalRequest(rentalRequestId: string) {
    const { data, error } = await supabase
      .from('logistics')
      .select('*')
      .eq('rental_request_id', rentalRequestId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Get all active logistics
   */
  async getActiveLogistics() {
    const { data, error } = await supabase
      .from('logistics')
      .select(`
        *,
        rental_requests(
          reference_number,
          customer_id,
          equipment(name)
        )
      `)
      .in('status', ['ASSIGNED', 'PREPARING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED'])
      .order('estimated_delivery_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Confirm delivery
   * Atomic conditional UPDATE on logistics WHERE id=$1 AND status IN ('ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED') ... RETURNING *
   * Triggers rental state change and escrow progression at most once.
   */
  async confirmDelivery(logisticsId: string, confirmedBy: string, notes?: string) {
    const nowIso = new Date().toISOString();

    const { data: updatedRows, error } = await supabase
      .from('logistics')
      .update({
        status: 'DELIVERED',
        actual_delivery_date: nowIso,
        delivery_confirmed_by: confirmedBy,
        notes: notes || '',
        updated_at: nowIso,
      })
      .eq('id', logisticsId)
      .in('status', ['ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED'])
      .select('*');

    if (error) throw error;

    if (!updatedRows || updatedRows.length === 0) {
      const { data: existing, error: fetchErr } = await supabase
        .from('logistics')
        .select('*')
        .eq('id', logisticsId)
        .single();

      if (fetchErr || !existing) throw new Error('Logistics record not found');

      if (existing.status === 'DELIVERED') {
        // Already DELIVERED — idempotent, do not re-run side effects
        return existing;
      }

      throw new Error(
        `Cannot confirm delivery: logistics status is '${existing.status}', expected one of ASSIGNED, DISPATCHED, IN_TRANSIT, ARRIVED`
      );
    }

    const logistics = updatedRows[0];

    // Update rental state to DELIVERED (at most once)
    if (logistics.rental_request_id) {
      await supabase
        .from('rental_requests')
        .update({ current_state: 'DELIVERED' })
        .eq('id', logistics.rental_request_id);
    }

    return logistics;
  },
};
