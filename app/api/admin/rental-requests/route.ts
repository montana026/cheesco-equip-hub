import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { notifyAdmins, notifyUser } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'pending';

    // Verify user is an authenticated admin (Super, Operations, Verification, Support, Finance)
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Admin access required' },
        { status: auth.status || 403 }
      );
    }

    const requestId = searchParams.get('id') || searchParams.get('requestId');

    // Build query based on filter
    let query = supabaseServer
      .from('rental_requests')
      .select(`
        id,
        reference_number,
        customer_id,
        equipment_id,
        merchant_id,
        start_date,
        end_date,
        duration_days,
        project_location,
        project_type,
        operator_required,
        delivery_required,
        additional_requirements,
        current_state,
        created_at,
        users!rental_requests_customer_id_fkey(full_name, email, phone),
        equipment(name, merchant_rental_rate, sale_price, listing_type, merchant_profiles(business_name))
      `)
      .order('created_at', { ascending: false });

    if (requestId) {
      query = query.eq('id', requestId);
    } else if (filter === 'pending') {
      query = query.in('current_state', [
        'REQUEST_SUBMITTED',
        'CHEESCO_REVIEWING',
        'EQUIPMENT_VERIFICATION_CHECK',
        'AVAILABILITY_CONFIRMED',
      ]);
    } else if (filter === 'quoted') {
      query = query.like('current_state', '%QUOTATION%');
    } else if (filter === 'active') {
      query = query.in('current_state', [
        'RENTAL_ACTIVE',
        'IN_TRANSIT',
        'DELIVERED',
        'PRE_DELIVERY_INSPECTION',
        'DEPOSIT_HELD',
      ]);
    } else if (filter === 'payment') {
      query = query.in('current_state', [
        'PAYMENT_PENDING',
        'PAYMENT_CONFIRMED',
        'PAYMENT_PARTIALLY_RECEIVED',
      ]);
    } else if (filter === 'completed') {
      query = query.in('current_state', [
        'COMPLETED',
        'CANCELLED',
        'DISPUTED',
      ]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error in admin rental-requests:', error);
      throw error;
    }

    // Transform data for frontend
    const requests = data?.map((r: any) => {
      const isPurchase =
        r.reference_number?.startsWith('PUR') ||
        r.additional_requirements?.includes('[PURCHASE') ||
        r.project_type?.includes('Purchase');

      const baseRate = isPurchase
        ? (r.equipment?.sale_price || r.equipment?.merchant_rental_rate || 0)
        : (r.equipment?.merchant_rental_rate || 0);

      return {
        id: r.id,
        referenceNumber: r.reference_number,
        customerId: r.customer_id,
        customerName: r.users?.full_name || 'Customer Client',
        customerEmail: r.users?.email || '',
        customerPhone: r.users?.phone || '',
        equipmentId: r.equipment_id,
        equipmentName: r.equipment?.name || 'Heavy Equipment Asset',
        merchantName: r.equipment?.merchant_profiles?.business_name || 'Equipment Merchant',
        startDate: r.start_date,
        endDate: r.end_date,
        durationDays: r.duration_days,
        projectLocation: r.project_location,
        projectType: r.project_type,
        operatorRequired: Boolean(r.operator_required),
        deliveryRequired: Boolean(r.delivery_required),
        additionalRequirements: r.additional_requirements || '',
        currentState: r.current_state,
        createdAt: r.created_at,
        merchantBaseRate: baseRate,
        isPurchase,
      };
    }) || [];

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching rental requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental requests' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Operations admin access required' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { id, currentState } = body;

    if (!id || !currentState) {
      return NextResponse.json({ error: 'Missing required fields: id and currentState' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('rental_requests')
      .update({
        current_state: currentState,
        reviewed_by: auth.userId || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating rental request status:', error);
      throw error;
    }

    // Proactively notify customer, merchant, and finance admins
    try {
      const stateLabel = currentState.replace(/_/g, " ");

      if (data?.customer_id) {
        await notifyUser(data.customer_id, {
          title: `Status: ${stateLabel}`,
          message: `Your request ${data.reference_number || "order"} has been updated to ${stateLabel}.`,
          link: `/dashboard/customer?requestId=${data.id}`,
          type: "RENTAL_REQUEST",
        });
      }

      if (data?.merchant_id) {
        const { data: merchProfile } = await supabaseServer
          .from("merchant_profiles")
          .select("user_id")
          .eq("id", data.merchant_id)
          .single();

        // Determine sale vs rental for merchant notification
        const isSale =
          data.reference_number?.startsWith("PUR") ||
          data.additional_requirements?.includes("[PURCHASE") ||
          data.project_type?.includes("Purchase");
        const txType = isSale ? "Outright Sale" : "Rental";

        if (merchProfile?.user_id) {
          await notifyUser(merchProfile.user_id, {
            title: `${txType} Order Update — ${stateLabel}`,
            message: `Your ${txType.toLowerCase()} order ${data.reference_number || "order"} has progressed to ${stateLabel}. Log in to your merchant dashboard for details.`,
            link: "/merchant/dashboard",
            type: "RENTAL_REQUEST",
          });
        }
      }

      if (["DELIVERED", "COMPLETED", "RENTAL_ACTIVE"].includes(currentState)) {
        await notifyAdmins(["FINANCE_ADMIN"], {
          title: "💰 Escrow Payout Ready",
          message: `Request ${data.reference_number} is now ${stateLabel}. Milestone reached; escrow payout is ready for disbursement.`,
          link: "/admin/finance",
          type: "PAYMENT",
        });
      }
    } catch (notifErr) {
      console.warn("Could not dispatch status change notification:", notifErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[/api/admin/rental-requests] Failed to update rental request state:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

