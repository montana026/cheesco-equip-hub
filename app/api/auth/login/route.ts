import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';
import { supabaseServer } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { setAuthCookies } from '@/lib/cookies';

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Rate limit: max 10 login attempts per minute keyed by client IP + email.
    // Fail-closed on Upstash errors to prevent brute-force attacks even during Redis transient failures.
    const clientIp = getClientIp(request);
    const normalizedEmail = String(email).toLowerCase().trim();
    const rateLimit = await checkRateLimit(
      `login:${clientIp}:${normalizedEmail}`,
      10,
      60_000,
      { failClosed: true }
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const result = await authService.signIn({ email, password });

    if (!result.session?.access_token) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Fetch the user profile to get their role and display name from the users table.
    // Roles must come strictly from the users table (or secure app_metadata), NEVER user_metadata.
    const userId = result.user?.id || result.session.user?.id || '';
    const { data: profile } = await supabaseServer
      .from('users')
      .select('role, full_name')
      .eq('id', userId)
      .maybeSingle();

    const role: string =
      profile?.role ||
      result.user?.app_metadata?.role ||
      result.session.user?.app_metadata?.role ||
      'CUSTOMER';

    const displayName =
      profile?.full_name ||
      result.user?.user_metadata?.full_name ||
      result.session.user?.user_metadata?.full_name ||
      result.user?.email ||
      result.session.user?.email ||
      email;

    const responseBody = {
      data: {
        user: {
          id: userId,
          email: result.user?.email || result.session.user?.email || email,
          role,
          name: displayName,
        },
      },
      message: 'Logged in successfully',
    };

    const response = NextResponse.json(responseBody);

    // Attach secure HttpOnly session cookies
    setAuthCookies(response, {
      accessToken: result.session.access_token,
      refreshToken: result.session.refresh_token,
      expiresIn: result.session.expires_in,
      user: {
        id: userId,
        email: result.user?.email || result.session.user?.email || email,
        role,
        name: displayName,
      },
    });

    return response;
  } catch (error: any) {
    console.error('[/api/auth/login] Login error:', error);
    // Keep wrong-credentials errors generic — do not leak whether the email exists
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }
}
