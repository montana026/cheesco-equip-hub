import { describe, it, expect } from 'vitest';

/**
 * Validates the email redirect URL construction and type detection
 */
export function buildSignupRedirectUrl(appUrl: string): string {
  const cleanUrl = (appUrl || 'http://localhost:3000').replace(/\/+$/, '');
  return `${cleanUrl}/auth/callback?next=/login?verified=true`;
}

export function detectIncomingAuthType(params: {
  searchParamsType?: string | null;
  hash: string;
}): 'signup' | 'recovery' | 'unknown' {
  const hash = params.hash || '';
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const urlType = params.searchParamsType || hashParams.get('type');

  if (urlType === 'signup' || urlType === 'email_confirmation' || hash.includes('type=signup')) {
    return 'signup';
  }

  if (urlType === 'recovery' || hash.includes('type=recovery')) {
    return 'recovery';
  }

  return 'unknown';
}

describe('Auth Email Confirmation Flow', () => {
  it('constructs correct emailRedirectTo targeting /auth/callback with login redirect', () => {
    const url = buildSignupRedirectUrl('http://localhost:3000');
    expect(url).toBe('http://localhost:3000/auth/callback?next=/login?verified=true');

    // Handles trailing slashes gracefully
    const urlWithSlash = buildSignupRedirectUrl('https://cheesco.com/');
    expect(urlWithSlash).toBe('https://cheesco.com/auth/callback?next=/login?verified=true');
  });

  it('correctly distinguishes signup confirmation from password recovery even if redirected to reset-password', () => {
    // Signup confirmation hash
    const signupHash = '#access_token=mock_jwt&refresh_token=mock_refresh&type=signup';
    const detectedSignup = detectIncomingAuthType({ hash: signupHash });
    expect(detectedSignup).toBe('signup');

    // Recovery hash
    const recoveryHash = '#access_token=mock_jwt&refresh_token=mock_refresh&type=recovery';
    const detectedRecovery = detectIncomingAuthType({ hash: recoveryHash });
    expect(detectedRecovery).toBe('recovery');
  });
});
