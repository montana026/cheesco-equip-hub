import { NextRequest, NextResponse } from 'next/server';
import { quotationService } from '@/lib/services/quotation.service';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/quotations/[id]/send'>
) {
  try {
    const { id: quotationId } = await ctx.params;

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

    // Send quotation
    const quotation = await quotationService.send(quotationId);

    return NextResponse.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error sending quotation:', error);
    return NextResponse.json(
      { error: 'Failed to send quotation' },
      { status: 500 }
    );
  }
}
