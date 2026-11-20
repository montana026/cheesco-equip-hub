"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getCookieConsent,
  setCookieConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  CookiePreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/cookie-consent";

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setMounted(true);
    const existing = getCookieConsent();
    if (!existing) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      setPreferences(existing);
    }
  }, []);

  // Listen for custom trigger to open preferences modal from footer or cookies page
  useEffect(() => {
    const handleOpenSettings = () => {
      const current = getCookieConsent() || DEFAULT_PREFERENCES;
      setPreferences(current);
      setShowPreferences(true);
      setVisible(false);
    };

    window.addEventListener("cheesco:open-cookie-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("cheesco:open-cookie-settings", handleOpenSettings);
    };
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setVisible(false);
    setShowPreferences(false);
  };

  const handleRejectNonEssential = () => {
    rejectNonEssentialCookies();
    setVisible(false);
    setShowPreferences(false);
  };

  const handleSavePreferences = () => {
    setCookieConsent(preferences);
    setVisible(false);
    setShowPreferences(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* ── Cookie Consent Sticky Banner ─────────────────────────────────── */}
      {visible && !showPreferences && (
        <div
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-800 bg-[#0A0D14]/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-black/80 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              {/* Message */}
              <div className="flex items-start gap-4 max-w-3xl">
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-cheesco-yellow">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-cheesco-yellow">
                      Cookie & Privacy Notice
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                      GDPR / NDPR
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    We use cookies to maintain your login session, ensure rental request integrity, and analyze marketplace traffic.
                    Strictly necessary cookies cannot be disabled. You can choose to accept all or customize your preferences.
                    Learn more in our{" "}
                    <Link href="/cookies" className="text-cheesco-yellow underline hover:text-cheesco-yellow-bright">
                      Cookie Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-cheesco-yellow underline hover:text-cheesco-yellow-bright">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
                >
                  Customize
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto rounded-xl bg-cheesco-yellow px-5 py-2.5 text-xs font-black text-[#0A0D14] shadow-lg transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02] active:scale-[0.98]"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cookie Preferences Modal ────────────────────────────────────── */}
      {showPreferences && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#0E131F] p-6 sm:p-8 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 id="cookie-preferences-title" className="text-lg sm:text-xl font-black text-white">
                  Cookie Preferences Center
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Manage how Cheesco uses cookies. You can update these settings at any time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category Cards */}
            <div className="mt-6 space-y-4">
              {/* 1. Essential Cookies (Locked) */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Strictly Necessary Cookies</span>
                    <span className="rounded bg-cheesco-yellow/20 px-2 py-0.5 text-[10px] font-black uppercase text-cheesco-yellow">
                      Always Active
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-500">Required</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Required for core platform functionality: user authentication, session security (HttpOnly auth tokens),
                  CSRF defense, and equipment rental checkout. These cookies do not store personally identifiable advertising information.
                </p>
              </div>

              {/* 2. Functional Cookies */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Functional Cookies</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, functional: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cheesco-yellow"></div>
                  </label>
                </div>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Remembers your equipment view mode (Grid / List), search filters, active state/city choices,
                  and recent viewed machinery.
                </p>
              </div>

              {/* 3. Analytics Cookies */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Analytics & Performance</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cheesco-yellow"></div>
                  </label>
                </div>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Helps us understand how equipment search, quotations, and merchant listings perform.
                  All collected data is aggregated and anonymized.
                </p>
              </div>

              {/* 4. Marketing Cookies */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Marketing & Attribution</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, marketing: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cheesco-yellow"></div>
                  </label>
                </div>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Allows Cheesco and merchant fleet operators to evaluate sponsored banner conversions and measure partner referral traffic.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-8 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-zinc-700"
              >
                Save Preferences
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto rounded-xl bg-cheesco-yellow px-5 py-2.5 text-xs font-black text-[#0A0D14] shadow-lg transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02] active:scale-[0.98]"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
