"use client";

import { useState } from "react";
import type { ChatMessage } from "@/hooks/use-chat";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const [expandedImg, setExpandedImg] = useState<string | null>(null);

  if (message.role === "tool_call") {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <span
          className="material-symbols-rounded text-sm animate-spin"
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
  const attachments = (message as any).attachments as
    | Array<{ url: string; filename: string; contentType: string }>
    | undefined;

  return (
    <>
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-4`}>
        <div
          className={`max-w-[85%] rounded-2xl text-sm leading-relaxed ${
            isUser ? "rounded-br-sm" : "rounded-bl-sm"
          }`}
          style={{
            background: isUser ? "#262a31" : "#181c22",
            color: "var(--text-primary)",
          }}
        >
          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="flex gap-1.5 p-2 pb-0 flex-wrap">
              {attachments.map((att, i) =>
                att.contentType.startsWith("image/") ? (
                  <button
                    key={i}
                    onClick={() => setExpandedImg(att.url)}
                    className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={att.url}
                      alt={att.filename}
                      className="max-h-40 max-w-[200px] rounded-lg object-cover"
                    />
                  </button>
                ) : (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs hover:brightness-125 transition-colors"
                    style={{ background: "#1c2026", color: "var(--text-secondary)" }}
                  >
                    <span className="material-symbols-rounded text-[14px]">
                      description
                    </span>
                    {att.filename}
                  </a>
                )
              )}
            </div>
          )}

          {/* Text content */}
          {message.content && (
            <div className="px-4 py-3">
              {message.content}
              {message.isStreaming && (
                <span
                  className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded image overlay */}
      {expandedImg && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImg(null)}
        >
          <img
            src={expandedImg}
            alt="Expanded"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
