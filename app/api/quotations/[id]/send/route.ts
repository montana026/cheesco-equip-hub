import { NextRequest, NextResponse } from 'next/server';
import { quotationService } from '@/lib/services/quotation.service';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request, ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Operations admin access required' },
        { status: auth.status || 403 }
      );
    }

    const { id: quotationId } = await ctx.params;

    // Send quotation
    const quotation = await quotationService.send(quotationId);

    return NextResponse.json({ success: true, data: quotation });
  } catch (error: any) {
    console.error('[/api/quotations/[id]/send] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
