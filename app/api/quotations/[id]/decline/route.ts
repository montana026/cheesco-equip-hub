import { NextRequest, NextResponse } from 'next/server';
import { quotationService } from '@/lib/services/quotation.service';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quotationId } = await ctx.params;

    // Verify user is authenticated via verifyCustomerAuth
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    // Verify quotation exists and belongs to this customer
    const { data: quotation } = await supabaseServer
      .from('quotations')
      .select('rental_request_id')
      .eq('id', quotationId)
      .maybeSingle();

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const { data: rental } = await supabaseServer
      .from('rental_requests')
      .select('customer_id')
      .eq('id', quotation.rental_request_id)
      .maybeSingle();

    if (!rental || rental.customer_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Forbidden: Not your quotation' },
        { status: 403 }
      );
    }

    // Decline quotation
    const declinedQuotation = await quotationService.decline(quotationId, auth.userId);

    return NextResponse.json({ success: true, data: declinedQuotation });
  } catch (error) {
    console.error('Error declining quotation:', error);
    return NextResponse.json(
      { error: 'Failed to decline quotation' },
      { status: 500 }
    );
  }
}
