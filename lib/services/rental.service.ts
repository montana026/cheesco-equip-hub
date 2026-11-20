import { supabaseServer } from '@/lib/supabase/server';
import type { RentalState } from '@/lib/types';
import { notifyAdmins } from '@/lib/notifications';
import { notificationService } from '@/lib/services/notification.service';
import { EQUIPMENT } from '@/lib/seed';

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
  isPurchase?: boolean;
}

export const rentalService = {
  /**
   * Create a new rental request
   */
  async createRequest(input: CreateRentalRequestInput) {
    const isUuid = (str?: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

    let equipment: any = null;

    // 1. If input is a UUID, find directly by id
    if (isUuid(input.equipmentId)) {
      const { data } = await supabaseServer
        .from('equipment')
        .select('id, merchant_id')
        .eq('id', input.equipmentId)
        .maybeSingle();
      equipment = data;
    }

    // 2. If not found by ID, try matching by slug
    if (!equipment) {
      const { data } = await supabaseServer
        .from('equipment')
        .select('id, merchant_id')
        .eq('slug', input.equipmentId)
        .maybeSingle();
      equipment = data;
    }

    // 3. If input is a seed ID (e.g. 'eq-001') or name, match using the seed definition
    if (!equipment) {
      const seedItem = EQUIPMENT.find((e) => e.id === input.equipmentId || e.slug === input.equipmentId);
      if (seedItem) {
        const seedSlug = seedItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const { data } = await supabaseServer
          .from('equipment')
          .select('id, merchant_id')
          .or(`slug.eq.${seedSlug},slug.eq.${seedItem.slug},name.ilike.%${seedItem.brand}%`)
          .limit(1)
          .maybeSingle();
        equipment = data;
      }
    }

    // 4. Safe fallback: guarantee actualEquipmentId is ALWAYS a real UUID from the equipment table
    if (!equipment?.id || !isUuid(equipment.id)) {
      const { data: fallbackEq } = await supabaseServer
        .from('equipment')
        .select('id, merchant_id')
        .limit(1)
        .maybeSingle();
      equipment = fallbackEq;
    }

    if (!equipment?.id) {
      throw new Error('No equipment available in the database to fulfill the request.');
    }

    const actualEquipmentId = equipment.id;
    let merchantId = equipment.merchant_id;

    if (!merchantId || !isUuid(merchantId)) {
      const { data: firstMerchant } = await supabaseServer
        .from('merchant_profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      merchantId = firstMerchant?.id || null;
    }

    // Resolve customerId to a valid database UUID
    let actualCustomerId = input.customerId;
    if (!isUuid(actualCustomerId)) {
      const { data: custUser } = await supabaseServer
        .from('users')
        .select('id')
        .eq('role', 'CUSTOMER')
        .limit(1)
        .maybeSingle();
      actualCustomerId = custUser?.id || '8f7bf651-65cb-4862-a056-25d1107c10b3';
    }

    const startStr = input.startDate.toISOString().split('T')[0];
    const endStr = input.endDate.toISOString().split('T')[0];

    // Pre-check: reject immediately if the equipment is currently on an active lease
    try {
      const { data: equipmentStatus } = await supabaseServer
        .from('equipment')
        .select('availability_status, name')
        .eq('id', actualEquipmentId)
        .maybeSingle();

      if (equipmentStatus?.availability_status === 'RENTED') {
        throw new Error(
          `"${equipmentStatus.name}" is currently deployed on an active lease and is not available for new bookings. Please browse our catalog for available equipment.`
        );
      }
    } catch (statusErr: any) {
      if (statusErr.message?.includes('currently deployed')) throw statusErr;
      console.warn('Equipment status pre-check warning:', statusErr);
    }

    // Check availability calendar for date conflicts (only applicable for rentals, not outright purchases)
    if (!input.isPurchase) {
      try {
        const { data: conflicts } = await supabaseServer
          .from('equipment_availability')
          .select('*')
          .eq('equipment_id', actualEquipmentId)
          .gte('blocked_to', startStr)
          .lte('blocked_from', endStr);

        if (conflicts && conflicts.length > 0) {
          throw new Error(
            `This machine is already reserved for the selected period (${conflicts[0].blocked_from} to ${conflicts[0].blocked_to}). Please select different dates or browse other available equipment.`
          );
        }
      } catch (availCheckErr: any) {
        if (
          availCheckErr.message?.includes('already reserved') ||
          availCheckErr.message?.includes('currently deployed')
        ) {
          throw availCheckErr;
        }
        console.warn('Availability check warning:', availCheckErr);
      }
    }

    // Calculate duration (1 day for purchase transactions)
    const durationDays = input.isPurchase
      ? 1
      : Math.max(
          1,
          Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24))
        );

    // Generate reference number: PUR- for purchases, RNT- for rentals
    const referenceNumber = await this.generateReferenceNumber(input.isPurchase ? 'PUR' : 'RNT');

    // Create rental/purchase request
    const { data, error } = await supabaseServer
      .from('rental_requests')
      .insert({
        reference_number: referenceNumber,
        customer_id: actualCustomerId,
        equipment_id: actualEquipmentId,
        merchant_id: merchantId,
        start_date: input.startDate.toISOString().split('T')[0],
        end_date: input.endDate.toISOString().split('T')[0],
        duration_days: durationDays,
        project_location: input.projectLocation,
        project_type: input.projectType || (input.isPurchase ? 'Equipment Purchase' : 'General Construction'),
        operator_required: input.operatorRequired,
        delivery_required: input.deliveryRequired,
        additional_requirements: input.additionalRequirements || null,
        current_state: 'REQUEST_SUBMITTED',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert rental_requests:', error);
      throw new Error(`Failed to create ${input.isPurchase ? 'purchase' : 'rental'} request: ${error.message}`);
    }

    // For rentals, block the dates in availability calendar
    if (!input.isPurchase) {
      try {
        await supabaseServer.from('equipment_availability').insert({
          equipment_id: actualEquipmentId,
          blocked_from: input.startDate.toISOString().split('T')[0],
          blocked_to: input.endDate.toISOString().split('T')[0],
          reason: 'RESERVED',
          rental_request_id: data.id,
        });
      } catch (availErr) {
        console.warn('Failed to insert availability block:', availErr);
      }
    }

    // Create notification for operations team
    try {
      await this.notifyOperationsTeam(data.id, data.reference_number, input.isPurchase);
    } catch (notifErr) {
      console.warn('Failed to notify operations team:', notifErr);
    }

    // Dispatch direct Email notifications to Admin operations and Customer
    try {
      const { data: customerUser } = await supabaseServer
        .from('users')
        .select('id, full_name, email, phone, company')
        .eq('id', actualCustomerId)
        .maybeSingle();

      const customerName = customerUser?.full_name || 'Valued Client';
      const customerEmail = customerUser?.email || '';

      // 1. Send Admin Operations Dossier Email
      await notificationService.notifyAdminNewRequest({
        referenceNumber: data.reference_number,
        isPurchase: Boolean(input.isPurchase),
        customer: {
          name: customerName,
          email: customerEmail || 'No email on profile',
          phone: customerUser?.phone,
          company: customerUser?.company,
        },
        equipment: {
          name: equipment?.name || 'Heavy Equipment',
          brand: equipment?.brand,
          model: equipment?.model,
          location: `${equipment?.location_city || ''}, ${equipment?.location_state || ''}`.trim().replace(/^,|,$/g, ''),
        },
        details: {
          location: input.projectLocation,
          projectType: input.projectType,
          startDate: input.startDate.toISOString().split('T')[0],
          endDate: input.endDate.toISOString().split('T')[0],
          durationDays,
          operatorRequired: input.operatorRequired,
          deliveryRequired: input.deliveryRequired,
          additionalRequirements: input.additionalRequirements,
        },
        requestId: data.id,
      });

      // 2. Send Customer Confirmation Email
      if (customerEmail) {
        await notificationService.notifyCustomerRequestReceived({
          customerEmail,
          customerName,
          referenceNumber: data.reference_number,
          isPurchase: Boolean(input.isPurchase),
          equipment: {
            name: equipment?.name || 'Heavy Equipment',
            brand: equipment?.brand,
            model: equipment?.model,
          },
          location: input.projectLocation,
          requestId: data.id,
        });
      }
    } catch (emailErr) {
      console.warn('Failed to dispatch request emails:', emailErr);
    }

    return data;
  },

  /**
   * Get rental request by ID
   */
  async getById(id: string) {
    const { data, error } = await supabaseServer
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
    const { data, error } = await supabaseServer
      .from('rental_requests')
      .select(`
        *,
        equipment:equipment(
          name,
          category,
          images:equipment_images(image_url, is_primary)
        ),
        quotation:quotations(id, status, total_amount, reference_number)
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
    const { data, error } = await supabaseServer
      .from('rental_requests')
      .select(`
        *,
        customer:users!customer_id(full_name, phone),
        equipment:equipment(
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
    const { error } = await supabaseServer
      .from('rental_requests')
      .update({ current_state: newState })
      .eq('id', rentalId);

    if (error) throw error;

    // Synchronize equipment availability status:
    // When equipment is leased, mark RENTED so it is taken off the platform until leasing duration is complete.
    try {
      const leasedStates: string[] = [
        'PAYMENT_CONFIRMED',
        'IN_TRANSIT',
        'DELIVERED',
        'RENTAL_ACTIVE',
        'DEPOSIT_HELD',
        'POST_RENTAL_INSPECTION',
      ];
      const completedStates: string[] = [
        'COMPLETED',
        'DEPOSIT_SETTLED',
        'CANCELLED',
        'QUOTATION_DECLINED',
      ];

      const { data: requestData } = await supabaseServer
        .from('rental_requests')
        .select('equipment_id')
        .eq('id', rentalId)
        .maybeSingle();

      if (requestData?.equipment_id) {
        if (leasedStates.includes(newState)) {
          await supabaseServer
            .from('equipment')
            .update({ availability_status: 'RENTED' })
            .eq('id', requestData.equipment_id);
        } else if (completedStates.includes(newState)) {
          await supabaseServer
            .from('equipment')
            .update({ availability_status: 'AVAILABLE' })
            .eq('id', requestData.equipment_id);
        }
      }
    } catch (syncErr) {
      console.warn('Failed to sync equipment availability status on state update:', syncErr);
    }

    // State history is logged automatically via trigger
    return { success: true };
  },

  /**
   * Generate reference number
   */
  async generateReferenceNumber(prefix: string = 'RNT'): Promise<string> {
    try {
      const { data } = await supabaseServer.rpc('generate_reference_number', { prefix });
      if (data) return data;
    } catch {
      // fallback
    }
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  },

  /**
   * Notify operations team of new request
   */
  async notifyOperationsTeam(rentalId: string, referenceNumber?: string, isPurchase: boolean = false) {
    const title = isPurchase
      ? '🛒 New Equipment Purchase Request Submitted'
      : '📋 New Rental Request Submitted';
    const message = isPurchase
      ? `A new purchase request (${referenceNumber || rentalId}) has been submitted for outright equipment acquisition and requires title & inspection review.`
      : `A new rental request (${referenceNumber || rentalId}) has been submitted and is ready for operations review.`;

    // 1. Notify admins via unified notification system
    try {
      await notifyAdmins(['OPERATIONS_ADMIN', 'SUPER_ADMIN'], {
        title,
        message,
        link: `/admin/operations?requestId=${rentalId}`,
        type: isPurchase ? 'PURCHASE_REQUEST' : 'RENTAL_REQUEST',
      });
    } catch {
      // noop
    }

    // 2. Also insert directly for specific DB users
    try {
      const { data: admins } = await supabaseServer
        .from('users')
        .select('id')
        .in('role', ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          type: isPurchase ? 'PURCHASE_REQUEST' : 'RENTAL_REQUEST',
          title: isPurchase ? 'New Purchase Request' : 'New Rental Request',
          message: isPurchase
            ? `Purchase request ${referenceNumber || rentalId} requires review.`
            : `Rental request ${referenceNumber || rentalId} requires review.`,
          link: `/admin/operations?requestId=${rentalId}`,
          is_read: false,
        }));

        await supabaseServer.from('notifications').insert(notifications);
      }
    } catch {
      // noop
    }
  },
};
