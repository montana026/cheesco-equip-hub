import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { notificationService } from '@/lib/services/notification.service';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Send test notification
    await notificationService.send({
      userId: user.id,
      title: 'Test Notification from Cheesco Equip Hub',
      message: 'This is a test email to verify your email service integration is working correctly.',
      type: 'INFO',
      category: 'SYSTEM',
      referenceId: `test-${Date.now()}`,
      channels: ['IN_APP', 'EMAIL'],
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}