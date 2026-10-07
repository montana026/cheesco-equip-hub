import { NextRequest, NextResponse } from 'next/server';
import { quotationService } from '@/lib/services/quotation.service';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/quotations/[id]/decline'>
) {
  try {
    const { id: quotationId } = await ctx.params;

    // Verify user is authenticated customer
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify quotation belongs to this customer
    const { data: quotation } = await supabase
      .from('quotations')
      .select('rental_request_id')
      .eq('id', quotationId)
      .single();

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const { data: rental } = await supabase
      .from('rental_requests')
      .select('customer_id')
      .eq('id', quotation.rental_request_id)
      .single();

    if (!rental || rental.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Not your quotation' }, { status: 403 });
    }

    // Decline quotation
    const declinedQuotation = await quotationService.decline(quotationId, user.id);

    return NextResponse.json({ success: true, data: declinedQuotation });
  } catch (error) {
    console.error('Error declining quotation:', error);
    return NextResponse.json(
      { error: 'Failed to decline quotation' },
      { status: 500 }
    );
  }
}
