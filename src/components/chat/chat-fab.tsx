"use client";

import { useChatPanel } from "./chat-provider";

/**
 * Floating action button that opens the Claude chat panel.
 * Fixed bottom-right, above mobile safe area.
 */
export function ChatFab() {
  const { toggle, isOpen } = useChatPanel();

  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform z-40"
      style={{
        background: "var(--accent)",
        color: "#412d00",
      }}
      title="Open Claude"
    >
      <span className="material-symbols-outlined text-2xl">chat</span>
    </button>
  );
}
