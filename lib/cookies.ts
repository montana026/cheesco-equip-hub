import { NextResponse } from 'next/server';
import { isRealProduction } from '@/lib/startup-check';

/**
 * Cookie Names used across Cheesco Equip Hub
 */
export const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth_token',
  SB_ACCESS_TOKEN: 'sb-access-token',
  SB_REFRESH_TOKEN: 'sb-refresh-token',
  SESSION: 'cheesco.session.v1',
  AUTH_STATUS: 'cheesco.auth.status',
  COOKIE_CONSENT: 'cheesco_cookie_consent',
} as const;

/**
 * Default secure cookie options for sensitive authentication credentials
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  // Secure flag only on real production deployments (Vercel, Render, etc.).
  // A plain `npm start` on localhost sets neither VERCEL_ENV nor DEPLOY_ENV,
  // so cookies work over plain HTTP in local testing.
  secure: isRealProduction(),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Cookie options for client-accessible indicator flags (e.g., auth status or consent)
 */
export const CLIENT_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isRealProduction(),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

export interface SetAuthCookiesInput {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email?: string;
    role?: string;
    name?: string;
  };
}

/**
 * Attaches secure session and auth cookies to a NextResponse.
 * Employs HttpOnly and Lax SameSite to prevent XSS credential theft and CSRF attacks.
 */
export function setAuthCookies(response: NextResponse, input: SetAuthCookiesInput): void {
  const maxAge = input.expiresIn ? Math.max(3600, input.expiresIn) : AUTH_COOKIE_OPTIONS.maxAge;

  // 1. Primary auth access token (HttpOnly)
  response.cookies.set(COOKIE_NAMES.AUTH_TOKEN, input.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge,
  });

  // 2. Supabase access token (HttpOnly)
  response.cookies.set(COOKIE_NAMES.SB_ACCESS_TOKEN, input.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge,
  });

  // 3. Supabase refresh token if available (HttpOnly, 30-day lifetime)
  if (input.refreshToken) {
    response.cookies.set(COOKIE_NAMES.SB_REFRESH_TOKEN, input.refreshToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  // 4. Unified claims session cookie if user details are present (HttpOnly)
  if (input.user) {
    const payload = {
      sub: input.user.id,
      name: input.user.name || input.user.email || '',
      email: input.user.email || '',
      role: input.user.role || 'CUSTOMER',
      iat: Date.now(),
      exp: Date.now() + maxAge * 1000,
    };
    const sessionToken = `hdr.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
    response.cookies.set(COOKIE_NAMES.SESSION, sessionToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge,
    });
  }

  // 5. Client-readable authentication status indicator (NOT a sensitive secret)
  // 30-day lifetime matches the refresh token so the browser can short-circuit /api/auth/me
  response.cookies.set(COOKIE_NAMES.AUTH_STATUS, 'authenticated', {
    ...CLIENT_COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60,
  });
}

/**
 * Thoroughly removes all authentication and session cookies from the response.
 */
export function clearAuthCookies(response: NextResponse): void {
  const expiredOptions = {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };

  response.cookies.delete(COOKIE_NAMES.AUTH_TOKEN);
  response.cookies.delete(COOKIE_NAMES.SB_ACCESS_TOKEN);
  response.cookies.delete(COOKIE_NAMES.SB_REFRESH_TOKEN);
  response.cookies.delete(COOKIE_NAMES.SESSION);
  response.cookies.delete(COOKIE_NAMES.AUTH_STATUS);

  // Set explicit expiration headers for maximum browser compatibility
  response.cookies.set(COOKIE_NAMES.AUTH_TOKEN, '', expiredOptions);
  response.cookies.set(COOKIE_NAMES.SB_ACCESS_TOKEN, '', expiredOptions);
  response.cookies.set(COOKIE_NAMES.SB_REFRESH_TOKEN, '', expiredOptions);
  response.cookies.set(COOKIE_NAMES.SESSION, '', expiredOptions);
  response.cookies.set(COOKIE_NAMES.AUTH_STATUS, '', expiredOptions);
}
