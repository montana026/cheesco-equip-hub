import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, supabaseServer } from '@/lib/supabase/server';
import { setAuthCookies, clearAuthCookies } from '@/lib/cookies';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/auth/refresh
 * Refreshes an expired access token using the HttpOnly `sb-refresh-token` cookie.
 * On success, sets fresh HttpOnly session cookies and returns user details.
 * On failure, clears auth cookies and returns 401.
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`token_refresh:${clientIp}`, 30, 60_000, { failClosed: true });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many refresh attempts. Please slow down.' },
        { status: 429 }
      );
    }

    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token available' },
        { status: 401 }
      );
    }

    const authClient = createAuthClient();
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session) {
      console.warn('[/api/auth/refresh] Refresh session failed:', error?.message);
      const response = NextResponse.json(
        { success: false, error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const userId = data.session.user.id;

    // Fetch authoritative role from users table
    const { data: profile } = await supabaseServer
      .from('users')
      .select('role, full_name')
      .eq('id', userId)
      .maybeSingle();

    const role = profile?.role || data.session.user.app_metadata?.role || 'CUSTOMER';

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: data.session.user.email,
          role,
          name: profile?.full_name || data.session.user.email,
        },
      },
      message: 'Token refreshed successfully',
    });

    setAuthCookies(response, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: userId,
        email: data.session.user.email,
        role,
        name: profile?.full_name || data.session.user.email,
      },
    });

    return response;
  } catch (error: any) {
    console.error('[/api/auth/refresh] Exception:', error);
    const response = NextResponse.json(
      { success: false, error: 'Failed to refresh token' },
      { status: 500 }
    );
    return response;
  }
}
