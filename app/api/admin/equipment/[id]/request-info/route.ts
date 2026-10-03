import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const equipmentId = params.id;
    const body = await request.json();

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

    // Update equipment to request more information
    const { data: equipment, error: updateError } = await supabase
      .from('equipment')
      .update({
        verification_status: 'MORE_INFORMATION_REQUIRED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error requesting info:', updateError);
      throw new Error('Failed to request information');
    }

    // TODO: Send notification to merchant with information request

    return NextResponse.json({
      success: true,
      data: equipment,
      message: 'Information request sent to merchant',
    });
  } catch (error: any) {
    console.error('Error in request-info route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to request information' },
      { status: 500 }
    );
  }
}
