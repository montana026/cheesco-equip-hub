/**
 * Cheesco Equip Hub - GDPR / NDPR / ePrivacy Cookie Consent Manager
 */

export interface CookiePreferences {
  essential: true; // Strictly necessary (always true)
  functional: boolean; // Site preferences, filters, layout settings
  analytics: boolean; // Aggregate usage, page performance metrics
  marketing: boolean; // Campaign tracking, referral attribution
  timestamp?: number;
  version?: string;
}

export const COOKIE_CONSENT_KEY = 'cheesco_cookie_consent';
export const COOKIE_CONSENT_VERSION = '1.0';

export const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: false,
  marketing: false,
  version: COOKIE_CONSENT_VERSION,
};

export const ALL_ACCEPTED_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
  version: COOKIE_CONSENT_VERSION,
};

export const ONLY_ESSENTIAL_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
  version: COOKIE_CONSENT_VERSION,
};

/**
 * Retrieve current cookie preferences from document.cookie or localStorage
 */
export function getCookieConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check document.cookie
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${COOKIE_CONSENT_KEY}=([^;]*)`));
    if (match && match[2]) {
      const parsed = JSON.parse(decodeURIComponent(match[2])) as CookiePreferences;
      if (parsed && parsed.essential === true) {
        return parsed;
      }
    }

    // 2. Fallback to localStorage
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CookiePreferences;
      if (parsed && parsed.essential === true) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cookie preferences:', e);
  }

  return null;
}

/**
 * Save cookie consent choices across both document.cookie and localStorage
 */
export function setCookieConsent(preferences: Partial<CookiePreferences>): CookiePreferences {
  const fullPreferences: CookiePreferences = {
    essential: true, // Always enforced
    functional: Boolean(preferences.functional),
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    timestamp: Date.now(),
    version: COOKIE_CONSENT_VERSION,
  };

  if (typeof window !== 'undefined') {
    const serialized = JSON.stringify(fullPreferences);

    // Persist in localStorage
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, serialized);
    } catch {
      // ignore
    }

    // Persist in document.cookie (1-year validity)
    const maxAge = 365 * 24 * 60 * 60; // 365 days in seconds
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_CONSENT_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;

    // Dispatch global event so UI components immediately reflect the change
    window.dispatchEvent(
      new CustomEvent('cheesco:cookie-consent-updated', { detail: fullPreferences })
    );
  }

  return fullPreferences;
}

/**
 * Accept all cookie categories
 */
export function acceptAllCookies(): CookiePreferences {
  return setCookieConsent(ALL_ACCEPTED_PREFERENCES);
}

/**
 * Reject non-essential cookies (only essential remains active)
 */
export function rejectNonEssentialCookies(): CookiePreferences {
  return setCookieConsent(ONLY_ESSENTIAL_PREFERENCES);
}

/**
 * Check if the user has already recorded their cookie preferences
 */
export function hasRespondedToCookieConsent(): boolean {
  return getCookieConsent() !== null;
}

/**
 * Dispatches a window event to open the Cookie Preferences modal from anywhere (e.g. footer)
 */
export function openCookieSettings(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cheesco:open-cookie-settings'));
  }
}
