"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { DraftCard } from "@/components/chat/draft-card";
import { ProposalCard } from "@/components/chat/proposal-card";
import type { PageContext } from "@/lib/chat/system-prompt";

const RESEARCH_PAGE_CONTEXT: PageContext = {
  route: "/research",
};

export default function ResearchPage() {
  const {
    messages,
    isLoading,
    sendMessage,
    approveDraft,
    discardDraft,
    refineProposal,
    markProposalApplied,
    markProposalDismissed,
    markProposalAutoApplied,
    resetConversation,
  } = useChat(RESEARCH_PAGE_CONTEXT);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <main className="flex flex-col h-[calc(100dvh-60px)] lg:h-dvh">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 md:px-8 py-4 border-b"
        style={{ borderColor: "#262a31" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-2xl"
            style={{ color: "var(--accent)" }}
          >
            labs
          </span>
          <h1
            className="font-[Manrope] text-xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Research
          </h1>
          <span
            className="font-[JetBrains_Mono] text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-medium"
            style={{ background: "#262a31", color: "var(--text-tertiary)" }}
          >
            Nexus
          </span>
        </div>
        {hasMessages && (
          <button
            onClick={resetConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:opacity-80"
            style={{ background: "#1a1e26", color: "var(--text-secondary)" }}
          >
            <span className="material-symbols-outlined text-[14px]">
              refresh
            </span>
            New research
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center gap-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "#1a1e26" }}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ color: "var(--accent)" }}
              >
                labs
              </span>
            </div>
            <div className="space-y-2">
              <h2
                className="font-[Manrope] text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                AI Supply Chain Research
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                Type a company name to start research. I&apos;ll identify
                tickers, pull financial data, scan Chinese supply chain sources,
                and build the knowledge graph.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "東方電氣",
                "Cambricon 寒武纪",
                "NVIDIA supply chain",
                "泰豪科技",
                "TSMC packaging",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => void sendMessage(example)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:brightness-110"
                  style={{
                    background: "#1a1e26",
                    color: "var(--text-secondary)",
                    border: "1px solid #262a31",
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 space-y-1">
            {messages.map((msg) => {
              if (msg.role === "tool_call" || msg.role === "tool_result") {
                return null;
              }

              if (msg.draftPayload) {
                return (
                  <DraftCard
                    key={msg.id}
                    message={msg}
                    onApprove={(draftId: string) => approveDraft(draftId)}
                    onDiscard={(draftId: string) => discardDraft(draftId)}
                  />
                );
              }

              if (msg.proposalPayload) {
                return (
                  <ProposalCard
                    key={msg.id}
                    message={msg}
                    onApplied={(id: string) => markProposalApplied(id)}
                    onDismissed={(id: string) => markProposalDismissed(id)}
                    onRefine={(id: string, instruction: string) =>
                      refineProposal(id, instruction)
                    }
                    onAutoApplied={(id: string) =>
                      markProposalAutoApplied(id)
                    }
                  />
                );
              }

              return <MessageBubble key={msg.id} message={msg} />;
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 md:px-8 py-4 max-w-3xl mx-auto w-full">
        <ChatInput
          onSend={(text, attachments) =>
            sendMessage(text, attachments ? { attachments } : undefined)
          }
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}
