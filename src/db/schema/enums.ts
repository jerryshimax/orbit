import { pgEnum } from "drizzle-orm/pg-core";

export const lpPipelineStageEnum = pgEnum("lp_pipeline_stage", [
  "prospect",
  "intro",
  "meeting",
  "dd",
  "soft_circle",
  "committed",
  "closed",
  "passed",
]);

export const lpTypeEnum = pgEnum("lp_type", [
  "pension",
  "sovereign_wealth",
  "endowment",
  "foundation",
  "family_office",
  "fund_of_funds",
  "insurance",
  "corporate",
  "hnwi",
  "gp_commit",
  "other",
]);

export const interactionTypeEnum = pgEnum("interaction_type", [
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
]);

export const interactionSourceEnum = pgEnum("interaction_source", [
  "telegram",
  "email",
  "meeting_transcript",
  "web",
  "brain_sync",
]);

export const relationshipStrengthEnum = pgEnum("relationship_strength", [
  "strong",
  "medium",
  "weak",
  "cold",
]);
