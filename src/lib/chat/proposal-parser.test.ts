import { test } from "node:test";
import assert from "node:assert/strict";
import { extractProposals } from "./proposal-parser";

test("extractProposals: returns empty list when no fences present", () => {
  const { cleaned, proposals } = extractProposals("Here's my reply with no proposal.");
  assert.equal(cleaned, "Here's my reply with no proposal.");
  assert.deepEqual(proposals, []);
});

test("extractProposals: pulls a single proposal and strips the fence", () => {
  const raw = [
    "Here's a draft:",
    "```json-proposal",
    `{"field":"objective","value":"Secure $25M","reasoning":"Ties to Fund I."}`,
    "```",
    "Let me know if you'd like to tweak.",
  ].join("\n");
  const { cleaned, proposals } = extractProposals(raw);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].field, "objective");
  assert.equal(proposals[0].value, "Secure $25M");
  assert.equal(proposals[0].reasoning, "Ties to Fund I.");
  assert.ok(!cleaned.includes("json-proposal"));
  assert.ok(cleaned.includes("Here's a draft:"));
  assert.ok(cleaned.includes("Let me know"));
});

test("extractProposals: pulls multiple proposals in order", () => {
  const raw = [
    "```json-proposal",
    `{"field":"name","value":"Tiger Global"}`,
    "```",
    "and",
    "```json-proposal",
    `{"field":"objective","value":"Raise $25M"}`,
    "```",
  ].join("\n");
  const { proposals } = extractProposals(raw);
  assert.equal(proposals.length, 2);
  assert.equal(proposals[0].field, "name");
  assert.equal(proposals[1].field, "objective");
});

test("extractProposals: tolerates a fence mid-stream (partial JSON)", () => {
  // Simulates SSE streaming where the fence is still mid-parse.
  const raw = "```json-proposal\n{\"field\":\"objec";
  const { cleaned, proposals } = extractProposals(raw);
  assert.equal(proposals.length, 0);
  // Unterminated fence left in cleaned text so a later buffer flush can complete it.
  assert.ok(cleaned.includes("json-proposal"));
});

test("extractProposals: ignores malformed JSON (keeps fence, no proposal)", () => {
  const raw = "```json-proposal\nnot json at all\n```";
  const { proposals } = extractProposals(raw);
  assert.equal(proposals.length, 0);
});

test("extractProposals: requires both field and value to be strings", () => {
  const raw = "```json-proposal\n{\"field\":\"x\"}\n```";
  const { proposals } = extractProposals(raw);
  assert.equal(proposals.length, 0);
});

test("extractProposals: captures confidence when present in [0,1]", () => {
  const raw = [
    "```json-proposal",
    `{"field":"objective","value":"Secure $25M","confidence":0.92}`,
    "```",
  ].join("\n");
  const { proposals } = extractProposals(raw);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].confidence, 0.92);
});

test("extractProposals: drops confidence outside [0,1]", () => {
  const raw = [
    "```json-proposal",
    `{"field":"objective","value":"Secure $25M","confidence":5}`,
    "```",
  ].join("\n");
  const { proposals } = extractProposals(raw);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].confidence, undefined);
});

test("extractProposals: drops non-number confidence", () => {
  const raw = [
    "```json-proposal",
    `{"field":"objective","value":"Secure $25M","confidence":"high"}`,
    "```",
  ].join("\n");
  const { proposals } = extractProposals(raw);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].confidence, undefined);
});
