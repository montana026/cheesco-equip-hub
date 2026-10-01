import { NextRequest, NextResponse } from 'next/server';
import { quotationService } from '@/lib/services/quotation.service';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json(
      { error: 'Failed to create quotation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rentalRequestId = searchParams.get('rentalRequestId');

    if (!rentalRequestId) {
      return NextResponse.json({ error: 'rentalRequestId required' }, { status: 400 });
    }

    const quotation = await quotationService.getByRentalRequest(rentalRequestId);

    return NextResponse.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotation' },
      { status: 500 }
    );
  }
}
