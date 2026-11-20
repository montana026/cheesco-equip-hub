// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import {
  COOKIE_NAMES,
  AUTH_COOKIE_OPTIONS,
  CLIENT_COOKIE_OPTIONS,
  setAuthCookies,
  clearAuthCookies,
} from '@/lib/cookies';
import {
  DEFAULT_PREFERENCES,
  ALL_ACCEPTED_PREFERENCES,
  ONLY_ESSENTIAL_PREFERENCES,
  setCookieConsent,
  getCookieConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  hasRespondedToCookieConsent,
  COOKIE_CONSENT_KEY,
} from '@/lib/cookie-consent';

describe('Cookies & Privacy Suite', () => {
  describe('HTTP Auth & Session Cookies (lib/cookies.ts)', () => {
    it('sets secure HttpOnly cookies for access tokens, refresh tokens, and session claims', () => {
      const response = NextResponse.json({ success: true });
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token';
      const refreshToken = 'test-refresh-token-123';
      const user = {
        id: 'usr-12345',
        email: 'engineer@construction.ng',
        role: 'CUSTOMER',
        name: 'Emeka Engineer',
      };

      setAuthCookies(response, {
        accessToken: testToken,
        refreshToken,
        expiresIn: 3600,
        user,
      });

      // Verify auth_token
      const authToken = response.cookies.get(COOKIE_NAMES.AUTH_TOKEN);
      expect(authToken).toBeDefined();
      expect(authToken?.value).toBe(testToken);
      expect(authToken?.httpOnly).toBe(true);
      expect(authToken?.sameSite).toBe('lax');
      expect(authToken?.path).toBe('/');

      // Verify sb-access-token
      const sbToken = response.cookies.get(COOKIE_NAMES.SB_ACCESS_TOKEN);
      expect(sbToken).toBeDefined();
      expect(sbToken?.value).toBe(testToken);
      expect(sbToken?.httpOnly).toBe(true);

      // Verify sb-refresh-token
      const sbRefresh = response.cookies.get(COOKIE_NAMES.SB_REFRESH_TOKEN);
      expect(sbRefresh).toBeDefined();
      expect(sbRefresh?.value).toBe(refreshToken);
      expect(sbRefresh?.httpOnly).toBe(true);

      // Verify unified session cookie
      const sessionCookie = response.cookies.get(COOKIE_NAMES.SESSION);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value.startsWith('hdr.')).toBe(true);
      expect(sessionCookie?.httpOnly).toBe(true);

      // Verify client-readable auth status
      const authStatus = response.cookies.get(COOKIE_NAMES.AUTH_STATUS);
      expect(authStatus).toBeDefined();
      expect(authStatus?.value).toBe('authenticated');
      expect(authStatus?.httpOnly).toBe(false);
    });

    it('clears all session and auth cookies upon signout', () => {
      const response = NextResponse.json({ success: true });

      // First set cookies
      setAuthCookies(response, { accessToken: 'token-to-delete' });
      expect(response.cookies.get(COOKIE_NAMES.AUTH_TOKEN)).toBeDefined();

      // Clear them
      clearAuthCookies(response);

      const clearedAuth = response.cookies.get(COOKIE_NAMES.AUTH_TOKEN);
      // Value should be empty string or deleted with maxAge 0
      expect(clearedAuth?.value === '' || !clearedAuth).toBe(true);
    });
  });

  describe('GDPR/NDPR Cookie Consent Manager (lib/cookie-consent.ts)', () => {
    beforeEach(() => {
      // Clear mock localStorage and document.cookie
      localStorage.clear();
      document.cookie = `${COOKIE_CONSENT_KEY}=; path=/; max-age=0`;
    });

    it('has strict essential=true in default preferences with optional categories disabled', () => {
      expect(DEFAULT_PREFERENCES.essential).toBe(true);
      expect(DEFAULT_PREFERENCES.analytics).toBe(false);
      expect(DEFAULT_PREFERENCES.marketing).toBe(false);
    });

    it('saves user consent preferences in localStorage and document.cookie', () => {
      expect(hasRespondedToCookieConsent()).toBe(false);

      const saved = setCookieConsent({
        functional: true,
        analytics: true,
        marketing: false,
      });

      expect(saved.essential).toBe(true);
      expect(saved.analytics).toBe(true);
      expect(saved.marketing).toBe(false);
      expect(hasRespondedToCookieConsent()).toBe(true);

      // Read back
      const retrieved = getCookieConsent();
      expect(retrieved?.essential).toBe(true);
      expect(retrieved?.analytics).toBe(true);
      expect(retrieved?.marketing).toBe(false);
    });

    it('acceptAllCookies sets all categories to true while preserving essential', () => {
      const accepted = acceptAllCookies();
      expect(accepted.essential).toBe(true);
      expect(accepted.functional).toBe(true);
      expect(accepted.analytics).toBe(true);
      expect(accepted.marketing).toBe(true);

      const retrieved = getCookieConsent();
      expect(retrieved?.analytics).toBe(true);
      expect(retrieved?.marketing).toBe(true);
    });

    it('rejectNonEssentialCookies disables analytics and marketing while keeping essential active', () => {
      const rejected = rejectNonEssentialCookies();
      expect(rejected.essential).toBe(true);
      expect(rejected.functional).toBe(false);
      expect(rejected.analytics).toBe(false);
      expect(rejected.marketing).toBe(false);

      const retrieved = getCookieConsent();
      expect(retrieved?.essential).toBe(true);
      expect(retrieved?.analytics).toBe(false);
      expect(retrieved?.marketing).toBe(false);
    });
  });
});
