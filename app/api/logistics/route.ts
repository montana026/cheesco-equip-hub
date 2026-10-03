import { NextRequest, NextResponse } from 'next/server';
import { logisticsService } from '@/lib/services/logistics.service';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

    // Assign logistics
    const logistics = await logisticsService.assignLogistics(body);

    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('Error assigning logistics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign logistics' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rentalRequestId = searchParams.get('rentalRequestId');

    if (rentalRequestId) {
      const logistics = await logisticsService.getByRentalRequest(rentalRequestId);
      return NextResponse.json({ success: true, data: logistics });
    }

    // Get all active logistics (admin only)
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logistics = await logisticsService.getActiveLogistics();
    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('Error fetching logistics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logistics' },
      { status: 500 }
    );
  }
}
