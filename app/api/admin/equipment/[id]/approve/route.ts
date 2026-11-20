import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification.service';
import { verifyAdminAuth } from '@/lib/admin-auth';
// NOTE: notificationService.send() already persists an IN_APP row + sends email/WhatsApp.
// Do NOT call notifyUser() / notifyAdmins() from lib/notifications for the same event —
// that would write a second DB row and show the notification twice in the bell.

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await ctx.params;

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
        status: 'VERIFIED',
        notes: 'Listing verified and approved for public marketplace.',
        updatedAt: new Date().toISOString(),
      },
    };

    // Update equipment to verified and available
    const { data: equipment, error: updateError } = await supabaseServer
      .from('equipment')
      .update({
        verification_status: 'VERIFIED',
        availability_status: 'AVAILABLE',
        specs: updatedSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving equipment:', updateError);
      throw new Error('Failed to approve equipment: ' + updateError.message);
    }

    // Send notification to merchant
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
            title: 'Equipment Listing Approved',
            message: `Your equipment listing "${equipment.name}" has been verified and is now live on the platform!`,
            type: 'SUCCESS',
            category: 'EQUIPMENT',
            referenceId: equipment.slug,
            actionUrl: `/equipment/${equipment.slug}`,
            channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
          });

          // notificationService.send() above already handled IN_APP + email + WhatsApp
        }
      }
    } catch (notificationError) {
      console.error('Failed to send equipment approval notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      data: equipment,
      message: 'Equipment approved and published successfully',
    });
  } catch (error: any) {
    console.error('[/api/admin/equipment/[id]/approve] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
