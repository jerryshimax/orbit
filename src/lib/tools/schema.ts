/**
 * Canonical tool definitions for Orbit.
 *
 * Every tool is defined ONCE here using Zod schemas. Both the Anthropic chat
 * API (tools.ts) and the MCP server (orbit-server.ts) derive their
 * format-specific definitions from this file.
 *
 * To add a new tool:
 *   1. Define it in TOOL_DEFS below (name, description, inputSchema).
 *   2. Add a handler case in tool-handlers.ts → dispatchToolCall().
 *   3. Done. Both the web app and MCP server pick it up automatically.
 */

import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import {
  ENTITY_CODES,
  INTERACTION_SOURCES,
  INTERACTION_TYPES,
  ORG_TYPES,
  PIPELINE_STAGE_KEYS,
  RELATIONSHIP_STRENGTHS,
} from "./enums";

// ── Tool definition type ──────���───────────────────────────────────────────

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
}

// ── Helper: build a tool def with type inference ──────────────────────────

function tool<T extends z.ZodRawShape>(
  name: string,
  description: string,
  shape: T,
): ToolDef {
  return { name, description, inputSchema: z.object(shape) };
}

// ── Canonical tool definitions ──────────��─────────────────────────────────

export const TOOL_DEFS: ToolDef[] = [
  // ── CRM core ──
  tool("log_interaction", "Log an interaction (meeting, call, email, etc.). Creates org/person if new. Use for any relationship touchpoint.", {
    contact_name: z.string().describe("Full name of the contact"),
    organization: z.string().describe("Organization name"),
    interaction_type: z.enum(INTERACTION_TYPES).describe("Type of interaction"),
    summary: z.string().describe("Brief summary"),
    team_member: z.string().describe("Who logged this (jerry, ray, matt, angel)"),
    source: z.enum(INTERACTION_SOURCES).default("telegram").optional(),
    org_type: z.enum(ORG_TYPES).optional().describe("Organization type"),
    entity_code: z.string().optional().describe("Entity (CE, SYN, UUL)"),
    title: z.string().optional().describe("Contact's title"),
    location: z.string().optional(),
    pipeline_stage: z.enum(PIPELINE_STAGE_KEYS).optional().describe("Set opportunity stage"),
    target_commitment: z.string().optional().describe("Target in millions USD"),
    email: z.string().optional(),
    wechat: z.string().optional(),
    introduced_by: z.string().optional(),
  }),

  tool("pipeline_status", "Get pipeline summary: counts per stage, commitments, stale orgs.", {
    stale_days: z.number().optional().describe("Days threshold for stale (default 14)"),
    entity_code: z.string().optional().describe("Filter by entity (CE, SYN)"),
  }),

  tool("move_stage", "Move an organization's active opportunity to a new pipeline stage.", {
    organization: z.string(),
    new_stage: z.enum(PIPELINE_STAGE_KEYS),
    changed_by: z.string(),
    notes: z.string().optional(),
    actual_commitment: z.string().optional().describe("Actual commitment in millions (for committed/closed)"),
  }),

  tool("search_orgs", "Search organizations by type, stage, staleness, or owner.", {
    stage: z.enum(PIPELINE_STAGE_KEYS).optional(),
    org_type: z.enum(ORG_TYPES).optional(),
    days_since_contact: z.number().optional(),
    relationship_owner: z.string().optional(),
    query: z.string().optional().describe("Free text search on org name"),
    entity_code: z.string().optional(),
    limit: z.number().optional(),
  }),

  tool("get_org_detail", "Get full org dossier: info, people, opportunities, interactions. Use for meeting prep.", {
    organization: z.string(),
  }),

  tool("update_contact", "Update fields on a person or organization.", {
    contact_name: z.string().optional(),
    organization: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    wechat: z.string().optional(),
    telegram: z.string().optional(),
    linkedin: z.string().optional(),
    headquarters: z.string().optional(),
    website: z.string().optional(),
    aum: z.string().optional(),
    target_commitment: z.string().optional(),
    org_type: z.enum(ORG_TYPES).optional(),
    relationship_strength: z.enum(RELATIONSHIP_STRENGTHS).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),

  // ── Calendar & Email ──
  tool("list_calendar_events", "List calendar events for a date range. Returns GCal events + field trip meetings.", {
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD). Default: today"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD). Default: 7 days from now"),
  }),

  tool("search_emails", "Search Gmail for emails matching a query. Returns subject, from, date, snippet.", {
    query: z.string().describe("Gmail search query (e.g., 'from:ray subject:LP')"),
    max_results: z.number().optional().describe("Max results (default 10)"),
  }),

  tool("draft_email", "Create an email draft in Gmail. Does NOT send — creates a draft for review.", {
    to: z.string().describe("Recipient email address"),
    subject: z.string(),
    body: z.string().describe("Email body (plain text)"),
    cc: z.string().optional().describe("CC email address"),
  }),

  // ── Objectives & Actions ──
  tool("create_objective", "Create a strategic objective with optional deadline and priority.", {
    title: z.string(),
    description: z.string().optional(),
    entity_code: z.enum(ENTITY_CODES).optional(),
    priority: z.string().optional().describe("p0, p1, or p2"),
    deadline: z.string().optional().describe("YYYY-MM-DD"),
  }),

  tool("create_action", "Create an action item, decision, or follow-up. Use type='decision' for things waiting on Jerry's call, 'follow_up' for promises to keep.", {
    title: z.string(),
    type: z.enum(["action", "decision", "follow_up"]).optional().describe("Default: action"),
    priority: z.enum(["p0", "p1", "p2"]).optional(),
    due_date: z.string().optional().describe("YYYY-MM-DD"),
    objective_title: z.string().optional().describe("Link to an objective by title (fuzzy match)"),
    notes: z.string().optional(),
  }),

  tool("list_objectives", "List active objectives with progress.", {
    status: z.enum(["active", "blocked", "complete"]).optional(),
    entity_code: z.string().optional(),
  }),

  tool("list_actions", "List open action items, decisions, or follow-ups.", {
    type: z.enum(["action", "decision", "follow_up"]).optional(),
    status: z.enum(["open", "done", "blocked"]).optional(),
  }),

  tool("create_draft_record", "Create a draft of new CRM records for user approval. ALWAYS use this before creating or modifying data. Never write directly.", {
    records: z.array(
      z.object({
        type: z.enum(["organization", "person", "interaction", "opportunity", "affiliation"]),
        action: z.enum(["find_or_create", "create", "update"]),
        data: z.record(z.string(), z.unknown()).describe("The record fields"),
      }),
    ),
    summary: z.string().describe("Human-readable summary of what will be created/updated"),
  }),
];

// Derive a union type of all tool names for type-safe dispatch
export type ToolName = (typeof TOOL_DEFS)[number]["name"];

// ── Zod v4 → JSON Schema converter ──────────────��────────────────────────
// Targeted converter for the field types used in tool defs. Zod v4's
// internal _zod.def structure is the source of truth.

function zodFieldToJsonSchema(field: z.ZodTypeAny): Record<string, unknown> {
  const def = (field as any)._zod?.def;
  if (!def) return { type: "string" };

  const result: Record<string, unknown> = {};

  // Unwrap optional/default wrappers
  if (def.type === "optional" || def.type === "default") {
    const inner = zodFieldToJsonSchema(def.innerType);
    // description lives on the outer wrapper in Zod v4
    const desc = (field as any).description;
    if (desc) inner.description = desc;
    return inner;
  }

  switch (def.type) {
    case "string":
      result.type = "string";
      break;
    case "number":
      result.type = "number";
      break;
    case "boolean":
      result.type = "boolean";
      break;
    case "enum":
      result.type = "string";
      result.enum = Object.values(def.entries);
      break;
    case "array":
      result.type = "array";
      result.items = zodFieldToJsonSchema(def.element);
      break;
    case "object": {
      result.type = "object";
      const props: Record<string, unknown> = {};
      const req: string[] = [];
      for (const [k, v] of Object.entries(def.shape as Record<string, z.ZodTypeAny>)) {
        props[k] = zodFieldToJsonSchema(v);
        const innerDef = (v as any)._zod?.def;
        if (innerDef?.type !== "optional" && innerDef?.type !== "default") {
          req.push(k);
        }
      }
      result.properties = props;
      if (req.length > 0) result.required = req;
      break;
    }
    case "record":
      result.type = "object";
      break;
    case "unknown":
    case "any":
      // No type constraint
      break;
    default:
      result.type = "string";
  }

  const desc = (field as any).description;
  if (desc) result.description = desc;

  return result;
}

function zodObjectToJsonSchema(schema: z.ZodObject<any>): Record<string, unknown> {
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(shape)) {
    properties[key] = zodFieldToJsonSchema(field);
    const def = (field as any)._zod?.def;
    if (def?.type !== "optional" && def?.type !== "default") {
      required.push(key);
    }
  }

  return {
    type: "object" as const,
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

// ── Format converters ─────────────────────────────────────────────────────

/**
 * Convert canonical tool defs → Anthropic API tool format.
 * Used by the web app chat API route.
 */
export function toAnthropicTools(): Anthropic.Tool[] {
  return TOOL_DEFS.map((def) => ({
    name: def.name,
    description: def.description,
    input_schema: zodObjectToJsonSchema(def.inputSchema) as Anthropic.Tool["input_schema"],
  }));
}

/**
 * Get tool defs for MCP server registration.
 * Returns { name, description, inputSchema } where inputSchema is the raw
 * Zod shape object — MCP SDK's server.tool() accepts Zod shapes directly.
 */
export function getMcpToolDefs(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
}> {
  return TOOL_DEFS.map((def) => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema.shape as Record<string, z.ZodTypeAny>,
  }));
}
