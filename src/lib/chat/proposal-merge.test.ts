import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProposal, markProposalRegenerating } from "./proposal-merge";
import type { ChatMessage } from "@/hooks/use-chat";

function makeUser(id: string, content: string): ChatMessage {
  return { id, role: "user", content };
}

function makeProposalMsg(field: string, value: string): ChatMessage {
  return {
    id: `proposal-assistant1-${field}`,
    role: "assistant",
    content: "",
    proposalPayload: { field, value },
    proposalStatus: "pending",
  };
}

test("mergeProposal: appends when no card exists for the field", () => {
  const msgs: ChatMessage[] = [makeUser("u1", "hi")];
  const out = mergeProposal(msgs, { field: "name", value: "X" }, "assistant1");
  assert.equal(out.length, 2);
  assert.equal(out[1].proposalPayload?.field, "name");
  assert.equal(out[1].proposalPayload?.value, "X");
  assert.equal(out[1].proposalStatus, "pending");
});

test("mergeProposal: updates existing card in place for same field", () => {
  const msgs: ChatMessage[] = [
    makeUser("u1", "hi"),
    makeProposalMsg("name", "Old Value"),
    makeUser("u2", "refine it"),
  ];
  const out = mergeProposal(
    msgs,
    { field: "name", value: "New Value", reasoning: "Tighter" },
    "assistant2"
  );
  assert.equal(out.length, 3, "no new card appended");
  assert.equal(out[1].proposalPayload?.value, "New Value");
  assert.equal(out[1].proposalPayload?.reasoning, "Tighter");
  assert.equal(out[1].id, "proposal-assistant1-name", "id preserved");
  assert.equal(out[1].proposalStatus, "pending");
});

test("mergeProposal: regenerating card flips back to pending on new value", () => {
  const source: ChatMessage = {
    id: "proposal-assistant1-objective",
    role: "assistant",
    content: "",
    proposalPayload: { field: "objective", value: "draft 1" },
    proposalStatus: "regenerating",
  };
  const out = mergeProposal(
    [source],
    { field: "objective", value: "draft 2" },
    "assistant2"
  );
  assert.equal(out[0].proposalStatus, "pending");
  assert.equal(out[0].proposalPayload?.value, "draft 2");
});

test("mergeProposal: preserves order when updating in the middle of the list", () => {
  const msgs: ChatMessage[] = [
    makeProposalMsg("name", "n"),
    makeProposalMsg("objective", "o"),
    makeProposalMsg("entityCode", "CE"),
  ];
  const out = mergeProposal(
    msgs,
    { field: "objective", value: "o2" },
    "assistant2"
  );
  assert.equal(out[0].proposalPayload?.field, "name");
  assert.equal(out[1].proposalPayload?.field, "objective");
  assert.equal(out[1].proposalPayload?.value, "o2");
  assert.equal(out[2].proposalPayload?.field, "entityCode");
});

test("markProposalRegenerating: flips only the target proposal", () => {
  const a = makeProposalMsg("name", "a");
  const b = makeProposalMsg("objective", "b");
  const out = markProposalRegenerating([a, b], b.id);
  assert.equal(out[0].proposalStatus, "pending");
  assert.equal(out[1].proposalStatus, "regenerating");
});

test("markProposalRegenerating: no-op when id not found", () => {
  const a = makeProposalMsg("name", "a");
  const out = markProposalRegenerating([a], "nonexistent");
  assert.equal(out[0].proposalStatus, "pending");
});
