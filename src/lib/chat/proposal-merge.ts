import type { ChatMessage, ProposalPayload } from "@/hooks/use-chat";

/**
 * Merge a newly-parsed proposal into the current message list.
 *
 * Invariant: at most one ProposalCard per field per conversation. If a card
 * already exists for `proposal.field`, update it in place (new value/reasoning,
 * status reset to "pending"). Otherwise, append a new card.
 *
 * The updated message keeps its original id and position so the UI never
 * re-mounts the card — a subtle transition is possible, but no chat reflow.
 */
export function mergeProposal(
  messages: ChatMessage[],
  proposal: ProposalPayload,
  parentAssistantId: string
): ChatMessage[] {
  const existingIdx = messages.findIndex(
    (m) => m.proposalPayload?.field === proposal.field
  );

  if (existingIdx >= 0) {
    const next = messages.slice();
    const existing = next[existingIdx];
    next[existingIdx] = {
      ...existing,
      proposalPayload: proposal,
      proposalStatus: "pending",
    };
    return next;
  }

  const newCard: ChatMessage = {
    id: `proposal-${parentAssistantId}-${proposal.field}`,
    role: "assistant",
    content: "",
    proposalPayload: proposal,
    proposalStatus: "pending",
  };
  return [...messages, newCard];
}

/**
 * Mark a specific proposal message as regenerating. No-op if the message
 * doesn't exist or already has a terminal status.
 */
export function markProposalRegenerating(
  messages: ChatMessage[],
  messageId: string
): ChatMessage[] {
  return messages.map((m) =>
    m.id === messageId && m.proposalPayload
      ? { ...m, proposalStatus: "regenerating" }
      : m
  );
}
