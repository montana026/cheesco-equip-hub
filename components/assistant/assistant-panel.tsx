"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AssistantEquipmentCard, EquipmentCardData } from "./equipment-card";
import { useTheme } from "@/lib/contexts/theme-context";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  equipmentCards?: EquipmentCardData[];
  quickReplies?: string[];
  isFallback?: boolean;
  timestamp: string;
}

interface AssistantPanelProps {
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_QUICK_REPLIES = [
  "Find equipment for my project",
  "Rent equipment",
  "Buy equipment",
  "Ask a question",
];

const INITIAL_WELCOME_TEXT =
  "Welcome to Cheesco! What are you working on today? I can help you find the right equipment or answer questions.";

const SESSION_STORAGE_KEY = "cheesco_assistant_session_v2";

// ─── Component ───────────────────────────────────────────────────────────────

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const { theme: siteTheme } = useTheme();
  const [panelTheme, setPanelTheme] = useState<"dark" | "light">(
    siteTheme === "light" ? "light" : "dark"
  );
  const [sessionId, setSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeQuickReplies, setActiveQuickReplies] =
    useState<string[]>(DEFAULT_QUICK_REPLIES);

  // Conversation history sent to the server (role + content only)
  const [apiHistory, setApiHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Session init / restore ─────────────────────────────────────────────────
  useEffect(() => {
    let activeSessionId = "";
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            setMessages(parsed.messages);
            setApiHistory(parsed.apiHistory ?? []);
            activeSessionId = parsed.sessionId || "";
            if (
              Array.isArray(parsed.activeQuickReplies) &&
              parsed.activeQuickReplies.length > 0
            ) {
              setActiveQuickReplies(parsed.activeQuickReplies);
            }
          }
        }
      } catch {
        // ignore corrupt storage
      }
    }

    if (!activeSessionId) {
      activeSessionId =
        "sess-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).substring(2, 6);
      setMessages([
        {
          id: "welcome-1",
          role: "assistant",
          text: INITIAL_WELCOME_TEXT,
          quickReplies: DEFAULT_QUICK_REPLIES,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setActiveQuickReplies(DEFAULT_QUICK_REPLIES);
    }
    setSessionId(activeSessionId);
  }, []);

  // ── Persist to sessionStorage ─────────────────────────────────────────────
  useEffect(() => {
    if (sessionId && messages.length > 0 && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ sessionId, messages, apiHistory, activeQuickReplies })
        );
      } catch {
        // ignore quota errors
      }
    }
  }, [messages, apiHistory, sessionId, activeQuickReplies]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Focus on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ─── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const userText = (textToSend ?? input).trim();
    if (!userText || loading) return;

    setInput("");

    const userBubble: ChatMessage = {
      id: "usr-" + Date.now(),
      role: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const nextMessages = [...messages, userBubble];
    setMessages(nextMessages);

    const nextHistory: { role: "user" | "assistant"; content: string }[] = [
      ...apiHistory,
      { role: "user", content: userText },
    ];

    setLoading(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory, sessionId }),
      });

      const data = await res.json();

      const assistantBubble: ChatMessage = {
        id: "ast-" + Date.now(),
        role: "assistant",
        text:
          data.reply ||
          "Our assistant is temporarily unavailable. Please try again or contact our team.",
        equipmentCards: data.equipmentCards ?? [],
        quickReplies: data.quickReplies ?? DEFAULT_QUICK_REPLIES,
        isFallback: Boolean(data.fallback),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages([...nextMessages, assistantBubble]);

      const updatedHistory: { role: "user" | "assistant"; content: string }[] =
        [
          ...nextHistory,
          { role: "assistant", content: data.reply ?? "" },
        ];
      setApiHistory(updatedHistory);

      if (data.quickReplies?.length) {
        setActiveQuickReplies(data.quickReplies);
      }
    } catch {
      const errorBubble: ChatMessage = {
        id: "ast-err-" + Date.now(),
        role: "assistant",
        text: "Unable to connect to the assistant right now. The rest of the site is working normally — feel free to browse our fleet or speak with our team.",
        isFallback: true,
        quickReplies: ["Browse Equipment", "Talk to Our Team"],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages([...nextMessages, errorBubble]);
      setActiveQuickReplies(["Browse Equipment", "Talk to Our Team"]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isDark = panelTheme === "dark";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cheesco Equipment Assistant"
      className={`fixed inset-0 z-50 flex flex-col md:inset-auto md:bottom-24 md:right-6 md:w-[410px] md:h-[620px] md:rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden font-sans ${
        isDark
          ? "bg-[#101E2A] text-[#F8FAFC] border-[#243B52]"
          : "bg-white text-[#334155] border-[#DCE3EA]"
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`px-4 py-3.5 flex items-center justify-between border-b shrink-0 ${
          isDark ? "border-[#243B52] bg-[#07131E]" : "border-[#DCE3EA] bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#07131E] border border-[#FACC15]/30 shrink-0">
            <svg
              className="w-5 h-5 text-[#FACC15]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
              />
            </svg>
          </div>
          <div>
            <div
              className={`font-bold text-sm leading-tight ${
                isDark ? "text-[#F8FAFC]" : "text-[#07131E]"
              }`}
            >
              Cheesco Equipment Assistant
            </div>
            <div
              className={`text-[11px] leading-tight ${
                isDark ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              Here to help with your project
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() =>
              setPanelTheme((t) => (t === "dark" ? "light" : "dark"))
            }
            aria-label="Toggle panel theme"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          isDark ? "bg-[#101E2A]" : "bg-[#F8FAFC]"
        }`}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            {/* Bubble */}
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                msg.role === "user"
                  ? "rounded-br-none bg-[#07131E] text-[#F8FAFC]"
                  : isDark
                  ? "rounded-bl-none bg-[#162636] border border-[#243B52] text-[#F8FAFC]"
                  : "rounded-bl-none bg-white border border-[#E2E8F0] text-[#334155]"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>

            {/* Equipment cards */}
            {msg.equipmentCards && msg.equipmentCards.length > 0 && (
              <div className="mt-3 w-full max-w-[92%]">
                <div
                  className={`flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wide ${
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-[#FACC15]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Matching Verified Machinery ({msg.equipmentCards.length})</span>
                </div>
                <div className="grid gap-3">
                  {msg.equipmentCards.map((item) => (
                    <AssistantEquipmentCard key={item.id} item={item} isDark={isDark} />
                  ))}
                </div>
              </div>
            )}

            {/* Fallback action links */}
            {msg.isFallback && (
              <div className="mt-3 pt-2.5 border-t border-current/10 flex flex-wrap gap-2">
                <Link
                  href="/browse"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#FACC15] text-[#07131E] hover:bg-[#EAB308] transition-colors"
                >
                  Browse All Equipment
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/support"
                  onClick={onClose}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isDark
                      ? "border-[#243B52] bg-[#101E2A] text-zinc-200 hover:border-zinc-400"
                      : "border-[#CBD5E1] bg-white text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  Contact Operations Desk
                </Link>
              </div>
            )}

            {/* Timestamp */}
            <span
              className={`text-[10px] mt-1 px-1 ${
                isDark ? "text-zinc-500" : "text-zinc-400"
              }`}
            >
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start">
            <div
              className={`rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 shadow-sm border ${
                isDark
                  ? "bg-[#162636] border-[#243B52] text-[#F8FAFC]"
                  : "bg-[#F1F5F9] border-[#E2E8F0] text-[#1E293B]"
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15] animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15] animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15] animate-bounce" />
              </div>
              <span
                className={`text-[11px] ml-1.5 font-medium ${
                  isDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                Searching fleet database...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick-reply chips ──────────────────────────────────────────────── */}
      {activeQuickReplies.length > 0 && !loading && (
        <div
          className={`px-4 py-2 border-t flex flex-wrap gap-1.5 shrink-0 ${
            isDark ? "border-[#243B52] bg-[#0D1822]" : "border-[#E2E8F0] bg-zinc-50"
          }`}
        >
          {activeQuickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => handleSendMessage(reply)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition-all text-left font-medium active:scale-95 ${
                isDark
                  ? "bg-[#162636] border-[#243B52] text-zinc-200 hover:border-[#FACC15] hover:text-[#FACC15]"
                  : "bg-white border-[#CBD5E1] text-zinc-700 hover:border-[#07131E] hover:text-[#07131E]"
              }`}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <div
        className={`p-3 border-t shrink-0 ${
          isDark ? "bg-[#07131E] border-[#243B52]" : "bg-white border-[#DCE3EA]"
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Type your equipment or project question..."
              className={`w-full resize-none rounded-xl px-3.5 py-2.5 text-xs sm:text-sm min-h-[44px] max-h-24 focus:outline-none transition-all ${
                isDark
                  ? "bg-[#101E2A] border border-[#243B52] text-[#F8FAFC] placeholder-zinc-500 focus:border-[#FACC15]"
                  : "bg-[#F8FAFC] border border-[#DCE3EA] text-[#334155] placeholder-zinc-400 focus:border-[#07131E]"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold transition-all shadow-sm bg-[#07131E] text-[#FACC15] border border-[#FACC15]/40 hover:bg-[#0E2235] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400 px-1">
          <span>Powered by Cheesco AI · verified fleet data</span>
          <span>Enter to send</span>
        </div>
      </div>
    </div>
  );
}
