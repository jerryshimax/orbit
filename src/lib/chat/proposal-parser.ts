/**
 * Parses `json-proposal` fenced code blocks out of Cloud's streamed text.
 *
 * Format Cloud is instructed to emit (see system-prompt.ts):
 *   ```json-proposal
 *   {"field":"objective","value":"...","reasoning":"..."}
 *   ```
 *
 * Returns the cleaned text (with the proposal fences stripped) plus the
 * extracted proposals, so the assistant message can render plain prose while
 * proposals surface as separate ProposalCard messages.
 */

export type ParsedProposal = {
  field: string;
  value: string;
  reasoning?: string;
  confidence?: number;
};

const FENCE_RE = /```json-proposal\s*\n([\s\S]*?)\n```/g;

export function extractProposals(text: string): {
  cleaned: string;
  proposals: ParsedProposal[];
} {
  const proposals: ParsedProposal[] = [];
  FENCE_RE.lastIndex = 0;

  const cleaned = text.replace(FENCE_RE, (_match, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return "";
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed &&
        typeof parsed.field === "string" &&
        typeof parsed.value === "string"
      ) {
        const confidence =
          typeof parsed.confidence === "number" &&
          parsed.confidence >= 0 &&
          parsed.confidence <= 1
            ? parsed.confidence
            : undefined;
        proposals.push({
          field: parsed.field,
          value: parsed.value,
          reasoning:
            typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
          confidence,
        });
        return "";
      }
    } catch {
      // Malformed JSON — leave as-is so user can see it.
      return _match;
    }
    return _match;
  });

  // Collapse extra blank lines left behind by stripped fences.
  return {
    cleaned: cleaned.replace(/\n{3,}/g, "\n\n").trimEnd(),
    proposals,
  };
}
