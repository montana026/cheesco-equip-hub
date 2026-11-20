import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { setAuthCookies, clearAuthCookies } from '@/lib/cookies';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/auth/session
 * Establishes HttpOnly session cookies from a client-side Supabase token
 * (e.g. after auto-sign-in post-signup). The token is verified server-side
 * with supabase.auth.getUser before any cookie is set.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit at the same tier as login — prevents cookie-stuffing abuse
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`session:${clientIp}`, 10, 60_000, { failClosed: true });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { accessToken, refreshToken, expiresIn } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'accessToken is required' },
        { status: 400 }
      );
    }

    // Verify the token server-side before trusting it
    const { data: { user: authUser }, error: authErr } =
      await supabaseServer.auth.getUser(accessToken);

    if (authErr || !authUser) {
      console.warn('[/api/auth/session] Rejected invalid token:', authErr?.message);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch role from users table
    const { data: profile } = await supabaseServer
      .from('users')
      .select('role, full_name')
      .eq('id', authUser.id)
      .maybeSingle();

    const response = NextResponse.json({
      success: true,
      message: 'Session established',
    });

    setAuthCookies(response, {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: authUser.id,
        email: authUser.email,
        role: profile?.role || authUser.app_metadata?.role || 'CUSTOMER',
        name: profile?.full_name || authUser.email,
      },
    });

    return response;
  } catch (error: any) {
    console.error('[/api/auth/session] Error setting session cookies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to establish session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Clears all HttpOnly auth cookies.
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Session cleared',
  });
  clearAuthCookies(response);
  return response;
}
