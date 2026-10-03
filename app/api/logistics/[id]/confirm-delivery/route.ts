import { NextRequest, NextResponse } from 'next/server';
import { logisticsService } from '@/lib/services/logistics.service';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logisticsId = params.id;
    const body = await request.json();
    const { notes } = body;

    // Verify user is authenticated (customer or admin)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Confirm delivery
    const logistics = await logisticsService.confirmDelivery(logisticsId, user.id, notes);

    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('Error confirming delivery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm delivery' },
      { status: 500 }
    );
  }
}
