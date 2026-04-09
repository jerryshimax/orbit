"use client";

import type { ChatMessage } from "@/hooks/use-chat";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "tool_call") {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <span
          className="material-symbols-outlined text-sm animate-spin"
          style={{ color: "var(--accent)" }}
        >
          progress_activity
        </span>
        <span
          className="text-xs font-[Space_Grotesk] uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {message.toolOutput
            ? `${message.toolName} complete`
            : `Using ${message.toolName}...`}
        </span>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-4`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser ? "rounded-br-sm" : "rounded-bl-sm"
        }`}
        style={{
          background: isUser ? "#262a31" : "#181c22",
          color: "var(--text-primary)",
        }}
      >
        {message.content}
        {message.isStreaming && (
          <span
            className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm"
            style={{ background: "var(--accent)" }}
          />
        )}
      </div>
    </div>
  );
}
