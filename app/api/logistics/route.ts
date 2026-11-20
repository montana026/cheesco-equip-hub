import { NextRequest, NextResponse } from 'next/server';
import { logisticsService } from '@/lib/services/logistics.service';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyCustomerAuth, verifyAdminAuth } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Operations admin access required' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();

    // Assign logistics
    const logistics = await logisticsService.assignLogistics(body);

    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('[/api/logistics] POST Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rentalRequestId = searchParams.get('rentalRequestId');

    const isAdmin = ['OPERATIONS_ADMIN', 'SUPER_ADMIN'].includes(auth.role);

    if (rentalRequestId) {
      // Ownership check: caller must be the customer, the merchant (by profile id), or an admin
      if (!isAdmin) {
        const { data: rental } = await supabaseServer
          .from('rental_requests')
          .select('customer_id, merchant_id')
          .eq('id', rentalRequestId)
          .single();

        if (!rental) {
          return NextResponse.json({ error: 'Rental request not found' }, { status: 404 });
        }

        const { data: merchantProfile } = await supabaseServer
          .from('merchant_profiles')
          .select('id')
          .eq('user_id', auth.userId)
          .maybeSingle();

        const isMerchantOwner = merchantProfile ? rental.merchant_id === merchantProfile.id : false;
        const isCustomerOwner = rental.customer_id === auth.userId;

        if (!isMerchantOwner && !isCustomerOwner) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const logistics = await logisticsService.getByRentalRequest(rentalRequestId);
      return NextResponse.json({ success: true, data: logistics });
    }

    // Get all active logistics — admin only
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logistics = await logisticsService.getActiveLogistics();
    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('[/api/logistics] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
