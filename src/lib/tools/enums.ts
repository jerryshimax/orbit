/**
 * Single source of truth for tool-facing enum values.
 *
 * Both the chat tool definitions (`src/lib/chat/tools.ts`) and the MCP server
 * (`src/mcp/orbit-server.ts`) import these so a new pipeline stage / org type
 * / interaction type added in one place is automatically available in the
 * other. Drift between the two surfaces was the reason `update_contact` and
 * `lp_update_contact` started accepting different `org_type` values.
 *
 * `PIPELINE_STAGE_KEYS` must stay in sync with the canonical UI table in
 * `src/lib/constants.ts` — `assertPipelineStagesMatchKeys` below enforces this
 * at module load and at typecheck time.
 */

import { PIPELINE_STAGES } from "@/lib/constants";

export const PIPELINE_STAGE_KEYS = [
  "prospect",
  "intro",
  "meeting",
  "dd",
  "soft_circle",
  "committed",
  "closed",
  "passed",
] as const;

type PipelineStageKeysFromConstants = (typeof PIPELINE_STAGES)[number]["key"];
type PipelineStageKeysHere = (typeof PIPELINE_STAGE_KEYS)[number];
// Mutual assignment: any drift between the two lists fails typecheck.
const _stageKeyParity: PipelineStageKeysFromConstants extends PipelineStageKeysHere
  ? PipelineStageKeysHere extends PipelineStageKeysFromConstants
    ? true
    : never
  : never = true;
void _stageKeyParity;

export const INTERACTION_TYPES = [
  "meeting",
  "call",
  "email",
  "conference",
  "intro",
  "dd_session",
  "deck_sent",
  "follow_up",
  "commitment",
  "note",
  "telegram_message",
  "wechat_message",
  "site_visit",
  "dinner",
  "board_meeting",
] as const;

export const INTERACTION_SOURCES = [
  "telegram",
  "email",
  "meeting_transcript",
  "web",
  "brain_sync",
  "calendar",
  "manual",
  "cloud_bot",
  "wechat",
] as const;

export const ORG_TYPES = [
  "lp",
  "portfolio_company",
  "prospect",
  "strategic_partner",
  "developer",
  "manufacturer",
  "hyperscaler",
  "epc",
  "corporate",
  "other",
] as const;

export const RELATIONSHIP_STRENGTHS = ["strong", "medium", "weak", "cold"] as const;

export const ENTITY_CODES = ["CE", "SYN", "UUL", "FO"] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGE_KEYS)[number];
export type InteractionType = (typeof INTERACTION_TYPES)[number];
export type InteractionSource = (typeof INTERACTION_SOURCES)[number];
export type OrgType = (typeof ORG_TYPES)[number];
export type RelationshipStrength = (typeof RELATIONSHIP_STRENGTHS)[number];
export type EntityCode = (typeof ENTITY_CODES)[number];
