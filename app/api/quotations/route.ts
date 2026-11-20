import { NextRequest, NextResponse } from 'next/server';
import { quotationService } from '@/lib/services/quotation.service';
import { verifyAdminAuth, verifyCustomerAuth } from '@/lib/admin-auth';
import { supabaseServer } from '@/lib/supabase/server';

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
    const {
      rentalRequestId,
      merchantBaseRate,
      cheescoMarginRate,
      lineItems,
      depositAmount,
      terms,
      validDays,
    } = body;

    // Create quotation
    const quotation = await quotationService.create({
      rentalRequestId,
      merchantBaseRate,
      cheescoMarginRate,
      lineItems,
      depositAmount,
      terms,
      validDays,
    });

    return NextResponse.json({ success: true, data: quotation });
  } catch (error: any) {
    console.error('[/api/quotations] POST Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce authentication
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Authentication required' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rentalRequestId = searchParams.get('rentalRequestId');

    if (!rentalRequestId) {
      return NextResponse.json({ error: 'rentalRequestId required' }, { status: 400 });
    }

    // 2. Fetch associated rental request to verify ownership
    const { data: rentalReq } = await supabaseServer
      .from('rental_requests')
      .select('id, customer_id, merchant_id')
      .eq('id', rentalRequestId)
      .maybeSingle();

    if (!rentalReq) {
      return NextResponse.json({ error: 'Rental request not found' }, { status: 404 });
    }

    const isAdmin = [
      'SUPER_ADMIN',
      'OPERATIONS_ADMIN',
      'FINANCE_ADMIN',
      'SUPPORT_ADMIN',
    ].includes(auth.role);

    const isCustomerOwner = rentalReq.customer_id === auth.userId;
    const isMerchantOwner = rentalReq.merchant_id === auth.userId;

    // 3. Authorization check
    if (!isAdmin && !isCustomerOwner && !isMerchantOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this quotation' },
        { status: 403 }
      );
    }

    const quotation = await quotationService.getByRentalRequest(rentalRequestId);
    if (!quotation) {
      return NextResponse.json({ success: true, data: null });
    }

    // 4. Data masking: Never expose platform gross margin to customer or merchant
    const sanitized = { ...quotation };
    if (!isAdmin) {
      delete (sanitized as any).cheesco_gross_margin;
      delete (sanitized as any).cheescoMarginRate;
      delete (sanitized as any).cheesco_margin_rate;
    }

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error: any) {
    console.error('[/api/quotations] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
