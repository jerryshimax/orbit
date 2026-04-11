"use client";

import { useRef, useEffect } from "react";
import { useChatPanel } from "./chat-provider";
import { useChat } from "@/hooks/use-chat";
import { useChatContext } from "@/hooks/use-chat-context";
import { ChatInput } from "./chat-input";
import { MessageBubble } from "./message-bubble";
import { DraftCard } from "./draft-card";

export function ChatPanel() {
  const { isOpen, setIsOpen } = useChatPanel();
  const pageContext = useChatContext();
  const {
    messages,
    isLoading,
    sendMessage,
    approveDraft,
    discardDraft,
    resetConversation,
  } = useChat(pageContext);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={() => setIsOpen(false)}
      />

      {/* Panel */}
      <div
        className="fixed z-50 flex flex-col
          bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl
          lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-[420px] lg:h-full lg:rounded-none"
        style={{ background: "#10141a", borderLeft: "1px solid #262a31" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid #262a31" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <span
                className="material-symbols-outlined text-sm"
                style={{ color: "#412d00" }}
              >
                pets
              </span>
            </div>
            <div>
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Cloud
              </div>
              <div
                className="text-[10px] font-[Space_Grotesk] uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Graph Intelligence
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetConversation}
              className="p-2 rounded-lg transition-colors hover:bg-[#262a31]"
              title="New conversation"
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: "var(--text-tertiary)" }}
              >
                add
              </span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg transition-colors hover:bg-[#262a31]"
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: "var(--text-tertiary)" }}
              >
                close
              </span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
              <span
                className="material-symbols-outlined text-5xl"
                style={{ color: "#262a31" }}
              >
                chat
              </span>
              <p
                className="text-sm text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                Ask Cloud anything — pipeline, meeting prep, emails,
                objectives, or just tell it what to do.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.draftPayload) {
              return (
                <DraftCard
                  key={msg.id}
                  message={msg}
                  onApprove={approveDraft}
                  onDiscard={discardDraft}
                />
              );
            }
            return <MessageBubble key={msg.id} message={msg} />;
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 pb-safe">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
