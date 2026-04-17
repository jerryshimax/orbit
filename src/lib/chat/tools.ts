/**
 * Chat API tool layer.
 *
 * ORBIT_TOOLS is derived from the canonical schema (src/lib/tools/schema.ts).
 * This file owns dispatch + audit logging. Handler implementations live in
 * tool-handlers.ts.
 */

import type { CurrentUser } from "@/lib/supabase/get-current-user";
import { db } from "@/db";
import { toolCallLog } from "@/db/schema";
import { toAnthropicTools } from "@/lib/tools/schema";

export const ORBIT_TOOLS = toAnthropicTools();

/**
 * Fire-and-forget audit log. Never blocks the tool response.
 */
function auditToolCall(entry: {
  userHandle: string | undefined;
  toolName: string;
  input: unknown;
  result: unknown;
  error: string | null;
  durationMs: number;
}) {
  db.insert(toolCallLog)
    .values({
      userHandle: entry.userHandle ?? null,
      toolName: entry.toolName,
      input: entry.input as any,
      result: entry.error ? null : (entry.result as any),
      error: entry.error,
      durationMs: entry.durationMs,
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[tool-call-log] insert failed:", err?.message ?? err);
    });
}

/**
 * Route a tool call to the appropriate handler.
 */
export async function executeToolCall(
  toolName: string,
  toolInput: any,
  currentUser?: CurrentUser
): Promise<any> {
  const startedAt = Date.now();
  let result: unknown;
  let errorMessage: string | null = null;
  try {
    result = await dispatchToolCall(toolName, toolInput, currentUser);
    return result;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    auditToolCall({
      userHandle: currentUser?.handle,
      toolName,
      input: toolInput,
      result,
      error: errorMessage,
      durationMs: Date.now() - startedAt,
    });
  }
}

async function dispatchToolCall(
  toolName: string,
  toolInput: any,
  currentUser?: CurrentUser
): Promise<any> {
  // Lazy import to avoid circular deps
  const handlers = await import("./tool-handlers");
  const { filterDraftRecordsByScope } = handlers;

  switch (toolName) {
    case "log_interaction":
      return handlers.handleLogInteraction(toolInput, currentUser);
    case "pipeline_status":
      return handlers.handlePipelineStatus(toolInput, currentUser);
    case "move_stage":
      return handlers.handleMoveStage(toolInput, currentUser);
    case "search_orgs":
      return handlers.handleSearch(toolInput, currentUser);
    case "get_org_detail":
      return handlers.handleGetDetail(toolInput, currentUser);
    case "update_contact":
      return handlers.handleUpdateContact(toolInput, currentUser);
    case "list_calendar_events":
      return handlers.handleListCalendarEvents(toolInput, currentUser);
    case "search_emails":
      return handlers.handleSearchEmails(toolInput, currentUser);
    case "draft_email":
      return handlers.handleDraftEmail(toolInput, currentUser);
    case "create_objective":
      return handlers.handleCreateObjective(toolInput, currentUser);
    case "create_action":
      return handlers.handleCreateAction(toolInput, currentUser);
    case "list_objectives":
      return handlers.handleListObjectives(toolInput, currentUser);
    case "list_actions":
      return handlers.handleListActions(toolInput, currentUser);
    case "create_draft_record": {
      const warnings = filterDraftRecordsByScope(toolInput, currentUser);
      return {
        status: "draft_created",
        ...toolInput,
        ...(warnings.length > 0 ? { scope_warnings: warnings } : {}),
      };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
