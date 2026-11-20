import { NextRequest, NextResponse } from 'next/server';
import { logisticsService } from '@/lib/services/logistics.service';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: logisticsId } = await ctx.params;
    const body = await request.json();

    // Verify user is operations admin via verifyAdminAuth
    const auth = await verifyAdminAuth(request, ['OPERATIONS_ADMIN', 'SUPER_ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Operations admin access required' },
        { status: auth.status || 403 }
      );
    }

    // Update logistics status
    const logistics = await logisticsService.updateLogisticsStatus(logisticsId, body);

    return NextResponse.json({ success: true, data: logistics });
  } catch (error: any) {
    console.error('[/api/logistics/[id]] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
