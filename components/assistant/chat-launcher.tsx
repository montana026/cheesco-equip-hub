"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Code splitting: Lazy-load the chat panel only when the visitor first opens the widget
const LazyAssistantPanel = dynamic(
  () => import("./assistant-panel").then((mod) => mod.AssistantPanel),
  { ssr: false }
);

export function ChatLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleToggle = () => {
    if (!hasInteracted) setHasInteracted(true);
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Floating launcher button (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        {!isOpen && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Open Cheesco Equipment Assistant"
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#07131E] text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-[#FACC15]/30 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/20"
          >
            {/* Pulsing online status indicator */}
            <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FACC15] opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FACC15] border-2 border-[#07131E]" />
            </span>

            {/* Chat Icon */}
            <svg
              className="w-6 h-6 text-white transition-transform duration-200 group-hover:rotate-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>

            {/* Hover Tooltip on desktop */}
            <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-xl bg-[#07131E]/95 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white shadow-lg border border-[#FACC15]/20 transition-opacity md:group-hover:block">
              Cheesco Equipment Assistant
            </span>
          </button>
        )}
      </div>

      {/* Lazy-loaded Assistant Panel */}
      {isOpen && (
        <LazyAssistantPanel onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
