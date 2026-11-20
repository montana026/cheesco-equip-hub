"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

export function ManageCookiesButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-5 py-3 text-xs sm:text-sm font-black text-[#0A0D14] shadow-lg transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
        />
      </svg>
      <span>Manage Cookie Preferences</span>
    </button>
  );
}
