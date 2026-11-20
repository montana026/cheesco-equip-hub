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
    let notes = 'Additional documentation or photos requested by Cheesco operations';
    try {
      const body = await request.json();
      if (body?.notes) notes = body.notes;
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
        status: 'NEEDS_INFO',
        notes: notes,
        updatedAt: new Date().toISOString(),
      },
    };

    // Update equipment to request more information ('NEEDS_INFO' is the valid enum value)
    const { data: equipment, error: updateError } = await supabaseServer
      .from('equipment')
      .update({
        verification_status: 'NEEDS_INFO',
        specs: updatedSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error requesting info:', updateError);
      throw new Error('Failed to request information: ' + updateError.message);
    }

    // Send notification to merchant with request details
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
            title: 'Information Requested for Equipment',
            message: `Cheesco operations requested more information for "${equipment.name}": ${notes}`,
            type: 'INFO',
            category: 'EQUIPMENT',
            actionUrl: '/merchant/listings',
            channels: ['IN_APP', 'EMAIL'],
          });

          // notificationService.send() above already handled IN_APP + email
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify merchant:', notifErr);
    }

    return NextResponse.json({
      success: true,
      data: equipment,
      message: 'Information request sent to merchant',
    });
  } catch (error: any) {
    console.error('[/api/admin/equipment/[id]/request-info] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
