/**
 * Anthropic tool definitions for the Orbit Chat API.
 * These map to the shared handlers in tool-handlers.ts.
 */

import type Anthropic from "@anthropic-ai/sdk";

export const ORBIT_TOOLS: Anthropic.Tool[] = [
  {
    name: "log_interaction",
    description:
      "Log an interaction (meeting, call, email, etc.). Creates org/person if new. Use for any relationship touchpoint.",
    input_schema: {
      type: "object" as const,
      required: ["contact_name", "organization", "interaction_type", "summary", "team_member"],
      properties: {
        contact_name: { type: "string", description: "Full name of the contact" },
        organization: { type: "string", description: "Organization name" },
        interaction_type: {
          type: "string",
          enum: ["meeting", "call", "email", "conference", "intro", "dd_session", "deck_sent", "follow_up", "commitment", "note", "telegram_message", "wechat_message", "site_visit", "dinner", "board_meeting"],
        },
        summary: { type: "string", description: "Brief summary" },
        team_member: { type: "string", description: "Who logged this (jerry, ray, matt, angel)" },
        source: { type: "string", enum: ["telegram", "email", "meeting_transcript", "web", "brain_sync", "calendar", "manual", "cloud_bot", "wechat"] },
        org_type: { type: "string", enum: ["lp", "portfolio_company", "prospect", "strategic_partner", "developer", "manufacturer", "hyperscaler", "epc", "corporate", "other"] },
        entity_code: { type: "string", description: "Entity (CE, SYN, UUL)" },
        title: { type: "string" },
        location: { type: "string" },
        pipeline_stage: { type: "string", enum: ["prospect", "intro", "meeting", "dd", "soft_circle", "committed", "closed", "passed"] },
        target_commitment: { type: "string", description: "Target in millions USD" },
        email: { type: "string" },
        wechat: { type: "string" },
        introduced_by: { type: "string" },
      },
    },
  },
  {
    name: "pipeline_status",
    description: "Get pipeline summary: counts per stage, commitments, stale orgs.",
    input_schema: {
      type: "object" as const,
      properties: {
        stale_days: { type: "number", description: "Days threshold for stale (default 14)" },
        entity_code: { type: "string", description: "Filter by entity (CE, SYN)" },
      },
    },
  },
  {
    name: "move_stage",
    description: "Move an organization's active opportunity to a new pipeline stage.",
    input_schema: {
      type: "object" as const,
      required: ["organization", "new_stage", "changed_by"],
      properties: {
        organization: { type: "string" },
        new_stage: { type: "string", enum: ["prospect", "intro", "meeting", "dd", "soft_circle", "committed", "closed", "passed"] },
        changed_by: { type: "string" },
        notes: { type: "string" },
        actual_commitment: { type: "string" },
      },
    },
  },
  {
    name: "search_orgs",
    description: "Search organizations by type, stage, staleness, or owner.",
    input_schema: {
      type: "object" as const,
      properties: {
        stage: { type: "string", enum: ["prospect", "intro", "meeting", "dd", "soft_circle", "committed", "closed", "passed"] },
        org_type: { type: "string", enum: ["lp", "portfolio_company", "prospect", "strategic_partner", "developer", "manufacturer", "hyperscaler", "epc", "corporate", "other"] },
        days_since_contact: { type: "number" },
        relationship_owner: { type: "string" },
        query: { type: "string", description: "Free text search on org name" },
        entity_code: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_org_detail",
    description: "Get full org dossier: info, people, opportunities, interactions. Use for meeting prep.",
    input_schema: {
      type: "object" as const,
      required: ["organization"],
      properties: {
        organization: { type: "string" },
      },
    },
  },
  {
    name: "update_contact",
    description: "Update fields on a person or organization.",
    input_schema: {
      type: "object" as const,
      properties: {
        contact_name: { type: "string" },
        organization: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        title: { type: "string" },
        wechat: { type: "string" },
        telegram: { type: "string" },
        linkedin: { type: "string" },
        headquarters: { type: "string" },
        website: { type: "string" },
        aum: { type: "string" },
        target_commitment: { type: "string" },
        org_type: { type: "string" },
        relationship_strength: { type: "string", enum: ["strong", "medium", "weak", "cold"] },
        notes: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "create_draft_record",
    description:
      "Create a draft of new CRM records for user approval. ALWAYS use this before creating or modifying data. Never write directly.",
    input_schema: {
      type: "object" as const,
      required: ["records", "summary"],
      properties: {
        records: {
          type: "array",
          items: {
            type: "object",
            required: ["type", "action", "data"],
            properties: {
              type: { type: "string", enum: ["organization", "person", "interaction", "opportunity", "affiliation"] },
              action: { type: "string", enum: ["find_or_create", "create", "update"] },
              data: { type: "object", description: "The record fields" },
            },
          },
        },
        summary: { type: "string", description: "Human-readable summary of what will be created/updated" },
      },
    },
  },
];

/**
 * Route a tool call to the appropriate handler.
 */
export async function executeToolCall(
  toolName: string,
  toolInput: any
): Promise<any> {
  // Lazy import to avoid circular deps
  const handlers = await import("./tool-handlers");

  switch (toolName) {
    case "log_interaction":
      return handlers.handleLogInteraction(toolInput);
    case "pipeline_status":
      return handlers.handlePipelineStatus(toolInput);
    case "move_stage":
      return handlers.handleMoveStage(toolInput);
    case "search_orgs":
      return handlers.handleSearch(toolInput);
    case "get_org_detail":
      return handlers.handleGetDetail(toolInput);
    case "update_contact":
      return handlers.handleUpdateContact(toolInput);
    case "create_draft_record":
      // Draft records are NOT executed — they're stored as drafts
      // The actual execution happens when the user approves via /api/chat/draft/[id]
      return { status: "draft_created", ...toolInput };
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
