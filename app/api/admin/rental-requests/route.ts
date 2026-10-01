import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'pending';

    // Verify user is operations admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['OPERATIONS_ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden: Operations admin access required' }, { status: 403 });
    }

    // Build query based on filter
    let query = supabase
      .from('rental_requests')
      .select(`
        id,
        reference_number,
        customer_id,
        equipment_id,
        start_date,
        duration_days,
        project_location,
        project_type,
        operator_required,
        delivery_required,
        current_state,
        created_at,
        users!rental_requests_customer_id_fkey(full_name, email),
        equipment(name, merchant_base_rate, merchant_profiles(business_name))
      `)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
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
      ]);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data for frontend
    const requests = data?.map((r: any) => ({
      id: r.id,
      referenceNumber: r.reference_number,
      customerId: r.customer_id,
      customerName: r.users?.full_name || 'Unknown',
      customerEmail: r.users?.email || '',
      equipmentId: r.equipment_id,
      equipmentName: r.equipment?.name || 'Unknown Equipment',
      merchantName: r.equipment?.merchant_profiles?.business_name || 'Unknown Merchant',
      startDate: r.start_date,
      durationDays: r.duration_days,
      projectLocation: r.project_location,
      projectType: r.project_type,
      operatorRequired: r.operator_required,
      deliveryRequired: r.delivery_required,
      currentState: r.current_state,
      createdAt: r.created_at,
      merchantBaseRate: r.equipment?.merchant_base_rate || 0,
    })) || [];

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching rental requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental requests' },
      { status: 500 }
    );
  }
}
