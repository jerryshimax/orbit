/**
 * Parser for `claude -p --output-format stream-json` JSONL output.
 *
 * The daemon spawns Claude Code and reads stdout line-by-line. Each line is
 * a self-contained JSON event. This module is a pure transformer: given one
 * line, return whatever useful signal can be extracted (a text delta, a
 * full-message snapshot, or the terminal result envelope).
 *
 * Extracted as a separate module so it can be unit-tested without a live
 * `claude` process — stream shapes are stable enough that fixture testing
 * catches regressions cheaply.
 *
 * Defensive by design: any unknown event shape returns an empty result.
 * Garbage lines (non-JSON) also return empty, never throw. The daemon
 * depends on this — a single malformed line must not kill the stream.
 */

export type StreamFinal = {
  result?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  durationMs?: number;
  isError?: boolean;
};

export type StreamEvent = {
  /** Incremental text to append to the accumulated response. */
  textDelta?: string;
  /** Full text snapshot (replace accumulated). Used when partial stream events are unavailable. */
  textAbsolute?: string;
  /** Tool invocation notice — useful for logging and UI "thinking" indicators. */
  toolUse?: { name: string; input: unknown };
  /** Terminal envelope — result + usage + cost. Arrives at most once. */
  final?: StreamFinal;
};

export function parseStreamLine(line: string): StreamEvent {
  const trimmed = line.trim();
  if (!trimmed) return {};

  let event: any;
  try {
    event = JSON.parse(trimmed);
  } catch {
    return {};
  }

  if (!event || typeof event !== "object") return {};

  // 1. Partial text delta (requires --include-partial-messages).
  if (event.type === "stream_event" && event.event?.type === "content_block_delta") {
    const delta = event.event.delta;
    if (delta?.type === "text_delta" && typeof delta.text === "string") {
      return { textDelta: delta.text };
    }
  }

  // 2. Full assistant message (may include text + tool_use blocks).
  if (event.type === "assistant" && event.message?.content) {
    const blocks = event.message.content;
    if (!Array.isArray(blocks)) return {};

    let text = "";
    let toolUse: StreamEvent["toolUse"];
    for (const block of blocks) {
      if (block?.type === "text" && typeof block.text === "string") {
        text += block.text;
      } else if (block?.type === "tool_use" && typeof block.name === "string") {
        toolUse = { name: block.name, input: block.input };
      }
    }
    const out: StreamEvent = {};
    if (text) out.textAbsolute = text;
    if (toolUse) out.toolUse = toolUse;
    return out;
  }

  // 3. Terminal result envelope.
  if (event.type === "result") {
    const final: StreamFinal = {};
    if (typeof event.result === "string") final.result = event.result;
    if (typeof event.total_cost_usd === "number") final.costUsd = event.total_cost_usd;
    if (typeof event.duration_ms === "number") final.durationMs = event.duration_ms;
    if (typeof event.is_error === "boolean") final.isError = event.is_error;
    if (event.usage && typeof event.usage === "object") {
      if (typeof event.usage.input_tokens === "number") {
        final.inputTokens = event.usage.input_tokens;
      }
      if (typeof event.usage.output_tokens === "number") {
        final.outputTokens = event.usage.output_tokens;
      }
    }
    if (typeof event.model === "string") final.model = event.model;
    return { final };
  }

  return {};
}
