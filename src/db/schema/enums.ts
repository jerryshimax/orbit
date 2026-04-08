import { pgEnum } from "drizzle-orm/pg-core";

// ─── Legacy enums (kept for backward compat during migration) ───

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

// ─── Universal enums ───

export const visibilityTierEnum = pgEnum("visibility_tier", [
  "public",
  "team",
  "entity",
  "private",
]);

export const orgTypeEnum = pgEnum("org_type", [
  "lp",
  "portfolio_company",
  "prospect",
  "strategic_partner",
  "service_provider",
  "carrier",
  "vendor",
  "government",
  "developer",
  "manufacturer",
  "hyperscaler",
  "epc",
  "corporate",
  "personal",
  "other",
]);

export const opportunityTypeEnum = pgEnum("opportunity_type", [
  "vc_investment",
  "pe_investment",
  "lp_commitment",
  "sales_deal",
  "partnership",
  "acquisition",
]);

export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "active",
  "won",
  "lost",
  "on_hold",
  "dead",
]);

export const contactChannelTypeEnum = pgEnum("contact_channel_type", [
  "email",
  "phone",
  "wechat",
  "telegram",
  "linkedin",
  "twitter",
  "whatsapp",
  "other",
]);

export const noteTypeEnum = pgEnum("note_type", [
  "general",
  "meeting_prep",
  "debrief",
  "deal_memo",
  "research",
  "action_item",
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
  "telegram_message",
  "wechat_message",
  "site_visit",
  "dinner",
  "board_meeting",
]);

export const interactionSourceEnum = pgEnum("interaction_source", [
  "telegram",
  "email",
  "meeting_transcript",
  "web",
  "brain_sync",
  "calendar",
  "manual",
  "cloud_bot",
  "wechat",
]);

export const relationshipStrengthEnum = pgEnum("relationship_strength", [
  "strong",
  "medium",
  "weak",
  "cold",
]);
