import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification.service';
import { verifyAdminAuth } from '@/lib/admin-auth';
// NOTE: notificationService.send() already persists an IN_APP row + sends email.
// Do NOT also call notifyUser() from lib/notifications — that would double-write.

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await ctx.params;
    let reason = 'Incomplete documentation or specifications';
    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason;
    } catch {
      // noop
    }

    // Verify admin authentication
    const auth = await verifyAdminAuth(request, [
      'VERIFICATION_ADMIN',
      'OPERATIONS_ADMIN',
      'SUPER_ADMIN',
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Admin access required' },
        { status: auth.status || 403 }
      );
    }

    // Fetch existing equipment specs
    const { data: existing } = await supabaseServer
      .from('equipment')
      .select('specs')
      .eq('id', equipmentId)
      .maybeSingle();

    const updatedSpecs = {
      ...(existing?.specs || {}),
      admin_feedback: {
        status: 'REJECTED',
        notes: reason,
        updatedAt: new Date().toISOString(),
      },
    };

    // Update equipment to rejected
    const { data: equipment, error: updateError } = await supabaseServer
      .from('equipment')
      .update({
        verification_status: 'REJECTED',
        availability_status: 'UNAVAILABLE',
        specs: updatedSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting equipment:', updateError);
      throw new Error('Failed to reject equipment: ' + updateError.message);
    }

    // Send notification to merchant with rejection reason
    try {
      if (equipment?.merchant_id) {
        const { data: merchantProfile } = await supabaseServer
          .from('merchant_profiles')
          .select('id, user_id, business_name')
          .eq('id', equipment.merchant_id)
          .maybeSingle();

        if (merchantProfile?.user_id) {
          await notificationService.send({
            userId: merchantProfile.user_id,
            title: 'Equipment Listing Rejected',
            message: `Your equipment listing "${equipment.name}" was not approved. Reason: ${reason}`,
            type: 'WARNING',
            category: 'EQUIPMENT',
            actionUrl: '/merchant/listings',
            channels: ['IN_APP', 'EMAIL'],
          });

          // notificationService.send() above already handled IN_APP + email
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify merchant of rejection:', notifErr);
    }

    return NextResponse.json({
      success: true,
      data: equipment,
      message: 'Equipment rejected',
    });
  } catch (error: any) {
    console.error('[/api/admin/equipment/[id]/reject] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
