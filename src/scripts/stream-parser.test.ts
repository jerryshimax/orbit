import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStreamLine } from "./stream-parser";

test("parseStreamLine: empty line returns empty event", () => {
  assert.deepEqual(parseStreamLine(""), {});
  assert.deepEqual(parseStreamLine("   "), {});
});

test("parseStreamLine: malformed JSON returns empty event (no throw)", () => {
  assert.deepEqual(parseStreamLine("not json"), {});
  assert.deepEqual(parseStreamLine('{"unterminated":'), {});
});

test("parseStreamLine: unknown event type returns empty", () => {
  const line = JSON.stringify({ type: "system", subtype: "init", session_id: "abc" });
  assert.deepEqual(parseStreamLine(line), {});
});

test("parseStreamLine: partial content_block_delta → textDelta", () => {
  const line = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "Hello" },
    },
  });
  assert.deepEqual(parseStreamLine(line), { textDelta: "Hello" });
});

test("parseStreamLine: ignores non-text deltas (e.g., input_json)", () => {
  const line = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_delta",
      delta: { type: "input_json_delta", partial_json: '{"x":1}' },
    },
  });
  assert.deepEqual(parseStreamLine(line), {});
});

test("parseStreamLine: full assistant text message → textAbsolute", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: {
      id: "msg_1",
      role: "assistant",
      content: [{ type: "text", text: "Full response." }],
    },
  });
  assert.deepEqual(parseStreamLine(line), { textAbsolute: "Full response." });
});

test("parseStreamLine: assistant message concatenates multi-block text", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: {
      content: [
        { type: "text", text: "Part 1. " },
        { type: "text", text: "Part 2." },
      ],
    },
  });
  assert.equal(parseStreamLine(line).textAbsolute, "Part 1. Part 2.");
});

test("parseStreamLine: assistant message extracts tool_use block", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: {
      content: [
        { type: "text", text: "Looking up…" },
        { type: "tool_use", id: "t1", name: "search_orgs", input: { query: "Tiger" } },
      ],
    },
  });
  const parsed = parseStreamLine(line);
  assert.equal(parsed.textAbsolute, "Looking up…");
  assert.deepEqual(parsed.toolUse, { name: "search_orgs", input: { query: "Tiger" } });
});

test("parseStreamLine: tolerates malformed assistant shape", () => {
  const line = JSON.stringify({ type: "assistant", message: { content: "not an array" } });
  assert.deepEqual(parseStreamLine(line), {});
});

test("parseStreamLine: result event → final envelope with cost + tokens", () => {
  const line = JSON.stringify({
    type: "result",
    subtype: "success",
    result: "Final answer.",
    duration_ms: 4321,
    total_cost_usd: 0.0456,
    is_error: false,
    model: "claude-sonnet-4-6",
    usage: {
      input_tokens: 1200,
      output_tokens: 300,
    },
  });
  assert.deepEqual(parseStreamLine(line), {
    final: {
      result: "Final answer.",
      costUsd: 0.0456,
      durationMs: 4321,
      isError: false,
      model: "claude-sonnet-4-6",
      inputTokens: 1200,
      outputTokens: 300,
    },
  });
});

test("parseStreamLine: result with missing fields still extracts what's present", () => {
  const line = JSON.stringify({ type: "result", subtype: "success", result: "ok" });
  assert.deepEqual(parseStreamLine(line), { final: { result: "ok" } });
});

test("parseStreamLine: result with error flag captured", () => {
  const line = JSON.stringify({ type: "result", subtype: "error", is_error: true });
  assert.deepEqual(parseStreamLine(line), { final: { isError: true } });
});

test("parseStreamLine: non-object JSON returns empty", () => {
  assert.deepEqual(parseStreamLine("null"), {});
  assert.deepEqual(parseStreamLine('"string"'), {});
  assert.deepEqual(parseStreamLine("42"), {});
  assert.deepEqual(parseStreamLine("[]"), {});
});
