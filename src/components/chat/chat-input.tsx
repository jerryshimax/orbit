"use client";

import { useState, useRef, useCallback } from "react";

export function ChatInput({
  onSend,
  isLoading,
}: {
  onSend: (text: string) => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  return (
    <div
      className="flex items-end gap-2 px-4 py-3"
      style={{ borderTop: "1px solid #262a31" }}
    >
      {/* Voice toggle (placeholder — Phase 4) */}
      <button
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
        style={{ background: "#262a31", color: "var(--text-tertiary)" }}
        title="Voice input (coming soon)"
        disabled
      >
        <span className="material-symbols-outlined text-xl">mic</span>
      </button>

      {/* Text input */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Ask Claude anything..."
        rows={1}
        className="flex-1 resize-none bg-transparent outline-none text-sm py-2.5 px-3 rounded-lg"
        style={{
          background: "#262a31",
          color: "var(--text-primary)",
          maxHeight: 120,
        }}
      />

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={!text.trim() || isLoading}
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90"
        style={{
          background:
            text.trim() && !isLoading ? "var(--accent)" : "#262a31",
          color: text.trim() && !isLoading ? "#412d00" : "var(--text-tertiary)",
        }}
      >
        <span className="material-symbols-outlined text-xl">
          {isLoading ? "more_horiz" : "arrow_upward"}
        </span>
      </button>
    </div>
  );
}
