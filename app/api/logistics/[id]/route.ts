import { NextRequest, NextResponse } from 'next/server';
import { logisticsService } from '@/lib/services/logistics.service';
import { supabase } from '@/lib/supabase/client';

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/logistics/[id]'>
) {
  try {
    const { id: logisticsId } = await ctx.params;
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

    // Update logistics status
    const logistics = await logisticsService.updateLogisticsStatus(logisticsId, body);

    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('Error updating logistics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update logistics' },
      { status: 500 }
    );
  }
}
