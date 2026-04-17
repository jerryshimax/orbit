"use client";

import { useState, useCallback, useRef } from "react";
import type { PageContext } from "@/lib/chat/system-prompt";
import { extractProposals } from "@/lib/chat/proposal-parser";
import { mergeProposal, markProposalRegenerating } from "@/lib/chat/proposal-merge";
import { shouldAutoApplyWithRate } from "@/lib/chat/proposal-rules";

export type ProposalPayload = {
  field: string;
  value: string;
  reasoning?: string;
  confidence?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  draftPayload?: any;
  draftId?: string;
  draftStatus?: "pending" | "approved" | "edited" | "discarded";
  proposalPayload?: ProposalPayload;
  proposalStatus?:
    | "pending"
    | "applied"
    | "dismissed"
    | "regenerating"
    | "auto_applied";
  isStreaming?: boolean;
};

export function useChat(pageContext: PageContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Mirror `messages` in a ref so callbacks (e.g. refineProposal) can read the
  // latest list without re-binding whenever messages change.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Map client-side proposal message IDs → server-side ai_proposals.id
  const proposalIdMapRef = useRef<Map<string, string>>(new Map());

  const sendMessage = useCallback(
    async (text: string, opts?: { transcription?: string; language?: string; attachments?: Array<{ url: string; filename: string; contentType: string }> }) => {
      if ((!text.trim() && !opts?.attachments?.length) || isLoading) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        attachments: opts?.attachments,
      } as any;
      setMessages((prev) => [...prev, userMsg]);

      // Add streaming assistant placeholder
      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);

      setIsLoading(true);
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message: text,
            pageContext,
            attachments: opts?.attachments,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        const persistedFields = new Set<string>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);
            try {
              const event = JSON.parse(json);

              switch (event.type) {
                case "text_delta": {
                  fullText += event.content;
                  const { cleaned, proposals } = extractProposals(fullText);
                  setMessages((prev) => {
                    let next = prev.map((m) =>
                      m.id === assistantId ? { ...m, content: cleaned } : m
                    );
                    for (const p of proposals) {
                      next = mergeProposal(next, p, assistantId);
                    }
                    return next;
                  });
                  // Persist newly-seen proposals to ai_proposals table
                  for (const p of proposals) {
                    if (persistedFields.has(p.field)) continue;
                    persistedFields.add(p.field);
                    const msgId = `proposal-${assistantId}-${p.field}`;
                    fetch("/api/proposals", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        targetKind: pageContext.entityType ?? "unknown",
                        targetId: pageContext.entityId,
                        targetField: p.field,
                        proposedValue: p.value,
                        priorValue: pageContext.formFields?.find(
                          (f) => f.name === p.field
                        )?.value ?? null,
                        confidence: p.confidence,
                        rationale: p.reasoning,
                      }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        if (data.id) {
                          proposalIdMapRef.current.set(msgId, data.id);
                        }
                      })
                      .catch(() => {});
                  }
                  break;
                }

                case "tool_use":
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `tool-${Date.now()}`,
                      role: "tool_call",
                      content: `Using ${event.name}...`,
                      toolName: event.name,
                      toolInput: event.input,
                    },
                  ]);
                  break;

                case "tool_result":
                  // Update the tool_call message with result
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.role === "tool_call" && m.toolName === event.name && !m.toolOutput
                        ? { ...m, toolOutput: event.output, content: `${event.name} complete` }
                        : m
                    )
                  );
                  break;

                case "draft":
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `draft-${event.draftId}`,
                      role: "assistant",
                      content: "",
                      draftPayload: event.payload,
                      draftId: event.draftId,
                      draftStatus: "pending",
                    },
                  ]);
                  break;

                case "done":
                  if (event.conversationId) {
                    setConversationId(event.conversationId);
                  }
                  break;

                case "error":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: `Error: ${event.message}`,
                            isStreaming: false,
                          }
                        : m
                    )
                  );
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        // Mark streaming complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );

        // Auto-apply eligible proposals
        const { proposals: finalProposals } = extractProposals(fullText);
        for (const p of finalProposals) {
          const msgId = `proposal-${assistantId}-${p.field}`;
          const field = pageContext.formFields?.find(
            (f) => f.name === p.field
          );
          const currentValue = field?.value ?? "";

          fetch(`/api/proposals?field=${encodeURIComponent(p.field)}`)
            .then((r) => r.json())
            .then((rateData) => {
              if (shouldAutoApplyWithRate(p, field, currentValue, rateData)) {
                // Mark auto-applied locally — parent component watches for this
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId
                      ? { ...m, proposalStatus: "auto_applied" }
                      : m
                  )
                );
                // Record outcome server-side
                const sId = proposalIdMapRef.current.get(msgId);
                if (sId) {
                  fetch("/api/proposals", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      proposalId: sId,
                      outcome: "auto_applied",
                      appliedValue: p.value,
                    }),
                  }).catch(() => {});
                }
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `Error: ${(err as Error).message}`,
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [conversationId, pageContext, isLoading]
  );

  const approveDraft = useCallback(
    async (draftId: string, editedPayload?: any) => {
      const res = await fetch(`/api/chat/draft/${draftId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          payload: editedPayload,
        }),
      });
      const result = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.draftId === draftId
            ? { ...m, draftStatus: editedPayload ? "edited" : "approved" }
            : m
        )
      );

      return result;
    },
    []
  );

  const discardDraft = useCallback(async (draftId: string) => {
    await fetch(`/api/chat/draft/${draftId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "discard" }),
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.draftId === draftId ? { ...m, draftStatus: "discarded" } : m
      )
    );
  }, []);

  const refineProposal = useCallback(
    async (messageId: string, instruction: string) => {
      const trimmed = instruction.trim();
      if (!trimmed) return;
      const source = messagesRef.current.find((m) => m.id === messageId);
      const proposal = source?.proposalPayload;
      if (!proposal) return;

      setMessages((prev) => markProposalRegenerating(prev, messageId));

      // Record refinement in audit trail
      const serverId = proposalIdMapRef.current.get(messageId);
      if (serverId) {
        fetch("/api/proposals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposalId: serverId, outcome: "refined" }),
        }).catch(() => {});
      }

      const prompt =
        `Refine your proposal for the \`${proposal.field}\` field.\n` +
        `Current value: ${JSON.stringify(proposal.value)}\n` +
        `Tweak: ${trimmed}`;
      await sendMessage(prompt);
    },
    [sendMessage]
  );

  const markProposalApplied = useCallback((id: string, appliedValue?: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, proposalStatus: "applied" } : m))
    );
    const serverId = proposalIdMapRef.current.get(id);
    if (serverId) {
      fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: serverId, outcome: "applied", appliedValue }),
      }).catch(() => {});
    }
  }, []);

  const markProposalDismissed = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, proposalStatus: "dismissed" } : m))
    );
    const serverId = proposalIdMapRef.current.get(id);
    if (serverId) {
      fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: serverId, outcome: "dismissed" }),
      }).catch(() => {});
    }
  }, []);

  const markProposalAutoApplied = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, proposalStatus: "auto_applied" } : m
      )
    );
    const serverId = proposalIdMapRef.current.get(id);
    if (serverId) {
      fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: serverId, outcome: "auto_applied" }),
      }).catch(() => {});
    }
  }, []);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    sendMessage,
    approveDraft,
    discardDraft,
    refineProposal,
    markProposalApplied,
    markProposalDismissed,
    markProposalAutoApplied,
    resetConversation,
  };
}
