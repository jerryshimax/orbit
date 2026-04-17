-- Orbit: Persistent AI state — proposal audit + run-cost tracking
-- Plan: ~/.claude/plans/lucky-growing-castle.md Phase 1.3
-- Run: psql $DATABASE_URL -f drizzle/0006_ai_state.sql
--
-- Scope (tight): adds proposal audit trail and extends chat_jobs with cost
-- columns. Skips ai_embeddings (no consumer yet, pgvector not enabled).

-- ── 1. Extend chat_jobs with model + token + cost tracking ──────────────────
-- chat_jobs already records prompt/result/tool_calls/timing per user request,
-- so it IS the ai_runs table — we just need to add the cost dimension so we
-- can attribute spend per user, per tool, per model.

ALTER TABLE "chat_jobs"
  ADD COLUMN IF NOT EXISTS "model" varchar(50);

ALTER TABLE "chat_jobs"
  ADD COLUMN IF NOT EXISTS "input_tokens" integer;

ALTER TABLE "chat_jobs"
  ADD COLUMN IF NOT EXISTS "output_tokens" integer;

ALTER TABLE "chat_jobs"
  ADD COLUMN IF NOT EXISTS "cost_usd" numeric(10, 6);

CREATE INDEX IF NOT EXISTS "idx_chatjobs_user_created"
  ON "chat_jobs" ("user_handle", "created_at" DESC);

-- ── 2. ai_proposals: audit every PageBridge proposal Cloud emits ────────────
-- Lets us compute per-target acceptance rate, then feed an auto-apply rule
-- (Phase 1.4): "objective_title proposals are 87% accepted → auto-apply
-- when confidence > 0.9".

CREATE TABLE IF NOT EXISTS "ai_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_job_id" uuid REFERENCES "chat_jobs"("id") ON DELETE SET NULL,
  "user_handle" varchar(50),
  -- What is being proposed against:
  "target_kind" varchar(30) NOT NULL,        -- 'organization' | 'person' | 'opportunity' | 'recon' | 'meeting'
  "target_id" uuid,                          -- the row being edited (null if create-new)
  "target_field" varchar(100) NOT NULL,      -- e.g. "objective_title", "next_step", "headquarters"
  -- The proposal payload:
  "proposed_value" jsonb NOT NULL,
  "prior_value" jsonb,
  "confidence" numeric(3, 2),                -- 0.00–1.00, optional
  "rationale" text,                          -- free text from Cloud
  -- Outcome:
  "outcome" varchar(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'applied' | 'dismissed' | 'refined' | 'auto_applied'
  "outcome_at" timestamp with time zone,
  "refined_count" integer NOT NULL DEFAULT 0,
  "applied_value" jsonb,                     -- what actually got written (may differ from proposed if user inline-edited)
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ai_proposals_user"
  ON "ai_proposals" ("user_handle", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_ai_proposals_target"
  ON "ai_proposals" ("target_kind", "target_field");

CREATE INDEX IF NOT EXISTS "idx_ai_proposals_outcome"
  ON "ai_proposals" ("outcome");

CREATE INDEX IF NOT EXISTS "idx_ai_proposals_chat_job"
  ON "ai_proposals" ("chat_job_id");
