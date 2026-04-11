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
      data-chat-fab
      className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 rounded-xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform z-40"
      style={{
        background: "var(--accent)",
        color: "#412d00",
      }}
      title="Open Cloud"
    >
      <span className="material-symbols-rounded text-2xl">blur_on</span>
    </button>
  );
}
