import { NextRequest, NextResponse } from 'next/server';
import { logisticsService } from '@/lib/services/logistics.service';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyCustomerAuth } from '@/lib/admin-auth';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate first
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { id: logisticsId } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    const isAdmin = ['OPERATIONS_ADMIN', 'SUPER_ADMIN'].includes(auth.role);

    // Look up the logistics record to check ownership
    const { data: logisticsRecord, error: logError } = await supabaseServer
      .from('logistics')
      .select('id, rental_request_id')
      .eq('id', logisticsId)
      .single();

    if (logError || !logisticsRecord) {
      return NextResponse.json({ error: 'Logistics record not found' }, { status: 404 });
    }

    // Ownership check: only the rental's customer (the recipient of the equipment) or an operations admin may confirm delivery.
    // Merchants cannot self-certify delivery receipt to prevent fraudulent escrow releases.
    if (!isAdmin) {
      const { data: rental, error: rentError } = await supabaseServer
        .from('rental_requests')
        .select('customer_id')
        .eq('id', logisticsRecord.rental_request_id)
        .single();

      if (rentError || !rental) {
        return NextResponse.json({ error: 'Rental request not found' }, { status: 404 });
      }

      const isCustomerOwner = rental.customer_id === auth.userId;

      if (!isCustomerOwner) {
        return NextResponse.json(
          { error: 'Forbidden: Only the customer receiving the equipment or an operations admin may confirm delivery' },
          { status: 403 }
        );
      }
    }

    // Confirm delivery
    const logistics = await logisticsService.confirmDelivery(logisticsId, auth.userId, notes);

    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('[/api/logistics/[id]/confirm-delivery] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
