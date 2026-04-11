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
  // ── Calendar & Email tools ──
  {
    name: "list_calendar_events",
    description: "List calendar events for a date range. Returns GCal events + field trip meetings.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_date: { type: "string", description: "Start date (YYYY-MM-DD). Default: today" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD). Default: 7 days from now" },
      },
    },
  },
  {
    name: "search_emails",
    description: "Search Gmail for emails matching a query. Returns subject, from, date, snippet.",
    input_schema: {
      type: "object" as const,
      required: ["query"],
      properties: {
        query: { type: "string", description: "Gmail search query (e.g., 'from:ray subject:LP')" },
        max_results: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "draft_email",
    description: "Create an email draft in Gmail. Does NOT send — creates a draft for review.",
    input_schema: {
      type: "object" as const,
      required: ["to", "subject", "body"],
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string" },
        body: { type: "string", description: "Email body (plain text)" },
        cc: { type: "string", description: "CC email address" },
      },
    },
  },
  // ── Objectives & Actions tools ──
  {
    name: "create_objective",
    description: "Create a strategic objective with optional deadline and priority.",
    input_schema: {
      type: "object" as const,
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        entity_code: { type: "string", enum: ["CE", "SYN", "UUL", "FO"] },
        priority: { type: "string", enum: ["p0", "p1", "p2"] },
        deadline: { type: "string", description: "YYYY-MM-DD" },
      },
    },
  },
  {
    name: "create_action",
    description: "Create an action item, decision, or follow-up. Use type='decision' for things waiting on Jerry's call, 'follow_up' for promises to keep.",
    input_schema: {
      type: "object" as const,
      required: ["title"],
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: ["action", "decision", "follow_up"], description: "Default: action" },
        priority: { type: "string", enum: ["p0", "p1", "p2"] },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        objective_title: { type: "string", description: "Link to an objective by title (fuzzy match)" },
        notes: { type: "string" },
      },
    },
  },
  {
    name: "list_objectives",
    description: "List active objectives with progress.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["active", "blocked", "complete"] },
        entity_code: { type: "string" },
      },
    },
  },
  {
    name: "list_actions",
    description: "List open action items, decisions, or follow-ups.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["action", "decision", "follow_up"] },
        status: { type: "string", enum: ["open", "done", "blocked"] },
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
    case "list_calendar_events":
      return handlers.handleListCalendarEvents(toolInput);
    case "search_emails":
      return handlers.handleSearchEmails(toolInput);
    case "draft_email":
      return handlers.handleDraftEmail(toolInput);
    case "create_objective":
      return handlers.handleCreateObjective(toolInput);
    case "create_action":
      return handlers.handleCreateAction(toolInput);
    case "list_objectives":
      return handlers.handleListObjectives(toolInput);
    case "list_actions":
      return handlers.handleListActions(toolInput);
    case "create_draft_record":
      return { status: "draft_created", ...toolInput };
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
