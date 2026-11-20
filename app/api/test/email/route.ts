import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification.service';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 1. Cost Control: Strictly disable testing endpoints in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // 2. Require Super Admin auth even in development/staging
    const auth = await verifyAdminAuth(request, ['SUPER_ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Super Admins can dispatch test emails' },
        { status: auth.status || 401 }
      );
    }

    // 3. Strict rate limiting on test dispatch: max 3 per minute
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`test_email:${clientIp}`, 3, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for test emails. Please wait a minute.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get user info
    const { data: user } = await supabaseServer
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
    console.error('[/api/test/email] Error sending test email:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}