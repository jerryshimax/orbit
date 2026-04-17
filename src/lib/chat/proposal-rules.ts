/**
 * Auto-apply rules for PageBridge proposals (Phase 1.4).
 *
 * The thesis: Jerry should approve proposals that matter, not every single one.
 * High-confidence edits to free-text fields with no prior value are safe to
 * auto-apply — he still sees the card flash (transparency), but doesn't have
 * to click. Categorical fields (pipeline stage, entity code) and money fields
 * (commitments, deal size) always require explicit approval regardless of
 * confidence — the blast radius of a wrong auto-apply there is too high.
 */

import type { PageField } from "./page-bridge";
import type { ProposalPayload } from "@/hooks/use-chat";

/**
 * Fields that NEVER auto-apply, even at confidence 1.0. These are categorical
 * or money-bearing — a wrong value distorts reporting, pipeline metrics, or
 * LP-facing numbers. Jerry eats the friction of clicking Apply here.
 */
export const AUTO_APPLY_DENY_LIST: readonly string[] = [
  "pipeline_stage",
  "stage",
  "entity_code",
  "entity",
  "target_commitment",
  "actual_commitment",
  "commitment",
  "commitment_amount",
  "deal_size",
  "check_size",
  "valuation",
  "org_type",
  "relationship_strength",
];

export const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.9;

/**
 * Returns true if this proposal can skip the approval step.
 *
 * Rule: free-text field + not on deny list + no prior value + confidence
 * meets threshold. All four must hold. Missing confidence blocks auto-apply
 * — an unscored proposal is treated as low confidence by default.
 */
export function shouldAutoApply(
  proposal: ProposalPayload,
  field: PageField | undefined,
  currentValue: string
): boolean {
  if (!field) return false;
  if (field.type !== "text" && field.type !== "textarea") return false;
  if (AUTO_APPLY_DENY_LIST.includes(field.name)) return false;
  if (currentValue && currentValue.trim().length > 0) return false;
  if (typeof proposal.confidence !== "number") return false;
  return proposal.confidence >= AUTO_APPLY_CONFIDENCE_THRESHOLD;
}
