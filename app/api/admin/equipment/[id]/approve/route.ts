import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { notificationService } from '@/lib/services/notification.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const equipmentId = params.id;

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has verification admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['VERIFICATION_ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Verification admin access required' },
        { status: 403 }
      );
    }

    // Update equipment to verified and available
    const { data: equipment, error: updateError } = await supabase
      .from('equipment')
      .update({
        verification_status: 'VERIFIED',
        availability_status: 'AVAILABLE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving equipment:', updateError);
      throw new Error('Failed to approve equipment');
    }

    // Send notification to merchant
    try {
      // Get equipment with merchant info
      const { data: equipmentWithMerchant } = await supabase
        .from('equipment')
        .select(`
          *,
          merchant_profiles!merchant_id(user_id, business_name)
        `)
        .eq('id', equipmentId)
        .single();

      if (equipmentWithMerchant && equipmentWithMerchant.merchant_profiles && equipmentWithMerchant.merchant_profiles.length > 0) {
        const merchantProfile = equipmentWithMerchant.merchant_profiles[0];
        await notificationService.send({
          userId: merchantProfile.user_id,
          title: 'Equipment Approved',
          message: `Your equipment listing "${equipment.name}" has been verified and is now live on the platform!`,
          type: 'SUCCESS',
          category: 'EQUIPMENT',
          referenceId: equipment.slug,
          actionUrl: `/equipment/${equipment.slug}`,
          channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        });
      }
    } catch (notificationError) {
      console.error('Failed to send equipment approval notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      data: equipment,
      message: 'Equipment approved and published successfully',
    });
  } catch (error: any) {
    console.error('Error in approve route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve equipment' },
      { status: 500 }
    );
  }
}
