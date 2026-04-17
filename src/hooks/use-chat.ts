"use client";

import { useState, useCallback, useRef } from "react";
import type { PageContext } from "@/lib/chat/system-prompt";
import { extractProposals } from "@/lib/chat/proposal-parser";
import { mergeProposal, markProposalRegenerating } from "@/lib/chat/proposal-merge";

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
                    // mergeProposal is idempotent per field: re-parsing the
                    // full buffer each delta is safe — same field just updates
                    // the same card.
                    for (const p of proposals) {
                      next = mergeProposal(next, p, assistantId);
                    }
                    return next;
                  });
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

      const prompt =
        `Refine your proposal for the \`${proposal.field}\` field.\n` +
        `Current value: ${JSON.stringify(proposal.value)}\n` +
        `Tweak: ${trimmed}`;
      await sendMessage(prompt);
    },
    [sendMessage]
  );

  const markProposalApplied = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, proposalStatus: "applied" } : m))
    );
  }, []);

  const markProposalDismissed = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, proposalStatus: "dismissed" } : m))
    );
  }, []);

  const markProposalAutoApplied = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, proposalStatus: "auto_applied" } : m
      )
    );
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
