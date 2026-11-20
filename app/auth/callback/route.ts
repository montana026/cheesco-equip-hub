import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, supabaseServer } from '@/lib/supabase/server';
import { setAuthCookies } from '@/lib/cookies';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') || '/login?verified=true';

  const authClient = createAuthClient();

  try {
    let session = null;
    let authError: string | null = null;

    if (token_hash && type) {
      const { data, error } = await authClient.auth.verifyOtp({
        token_hash,
        type,
      });
      if (error) {
        console.error('Supabase auth verifyOtp error:', error.message);
        authError = error.message;
      } else {
        session = data?.session;
      }
    } else if (code) {
      const { data, error } = await authClient.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Supabase auth code exchange error:', error.message);
        authError = error.message;
      } else {
        session = data?.session;
      }
    } else {
      // No recognisable auth params — treat as a failed verification
      authError = 'Missing token_hash/type or code parameter';
    }

    // On any auth error, redirect to error page immediately — do not proceed to `next`
    if (authError || !session) {
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', 'verification_failed');
      return NextResponse.redirect(errorUrl);
    }

    // Build the success redirect first so we can attach cookies to it
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));

    // Query users table for the authoritative role (never trust user_metadata)
    const { data: profile } = await supabaseServer
      .from('users')
      .select('role, full_name')
      .eq('id', session.user.id)
      .maybeSingle();

    const role = profile?.role || session.user.app_metadata?.role || 'CUSTOMER';

    setAuthCookies(response, {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      user: {
        id: session.user.id,
        email: session.user.email,
        role,
        name: profile?.full_name || session.user.email,
      },
    });

    return response;
  } catch (err) {
    console.error('Auth callback exception:', err);
    const errorUrl = new URL('/login', requestUrl.origin);
    errorUrl.searchParams.set('error', 'verification_failed');
    return NextResponse.redirect(errorUrl);
  }
}
