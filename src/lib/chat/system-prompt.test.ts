import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt } from "./system-prompt";

test("buildSystemPrompt: no user → legacy Jerry-centric prompt", () => {
  const p = buildSystemPrompt({});
  assert.match(p, /Cloud/);
  assert.match(p, /Jerry Shi/);
  assert.match(p, /GP\/Managing Partner/);
  assert.match(p, /Address Jerry by first name/);
});

test("buildSystemPrompt: owner (Jerry) signed in → owner persona", () => {
  const p = buildSystemPrompt({
    currentUser: {
      handle: "jerry",
      fullName: "Jerry Shi",
      role: "owner",
      entityAccess: ["CE", "SYN", "UUL", "FO", "PERSONAL"],
      isOwner: true,
    },
  });
  assert.match(p, /Address Jerry by first name/);
  assert.doesNotMatch(p, /You are currently helping/);
});

test("buildSystemPrompt: partner signed in → team-member persona with scope", () => {
  const p = buildSystemPrompt({
    currentUser: {
      handle: "angel",
      fullName: "Angel Zhou",
      role: "principal",
      entityAccess: ["SYN"],
      isOwner: false,
    },
  });
  assert.match(p, /currently helping Angel Zhou/);
  assert.match(p, /principal/);
  assert.match(p, /@angel/);
  assert.match(p, /You work on SYN/);
  assert.match(p, /Do NOT reach into entity data outside that scope/);
  assert.match(p, /suggest they ask Jerry/);
});

test("buildSystemPrompt: multi-entity partner → scope lists all entities", () => {
  const p = buildSystemPrompt({
    currentUser: {
      handle: "matt",
      fullName: "Matt Somebody",
      role: "partner",
      entityAccess: ["CE", "SYN"],
      isOwner: false,
    },
  });
  assert.match(p, /You work across CE, SYN/);
});

test("buildSystemPrompt: partner first name used throughout", () => {
  const p = buildSystemPrompt({
    currentUser: {
      handle: "ray",
      fullName: "Ray Mao",
      role: "partner",
      entityAccess: ["CE"],
      isOwner: false,
    },
  });
  assert.match(p, /Ray may speak English/);
  assert.match(p, /Ray is always context-switching/);
  assert.doesNotMatch(p, /Jerry is always context-switching/);
});

test("buildSystemPrompt: defaults team_member to the signed-in user's handle", () => {
  const p = buildSystemPrompt({
    currentUser: {
      handle: "angel",
      fullName: "Angel Zhou",
      role: "principal",
      entityAccess: ["SYN"],
      isOwner: false,
    },
  });
  assert.match(p, /Default team_member to "angel"/);
});

test("buildSystemPrompt: single-entity partner defaults entity_code to their scope", () => {
  const p = buildSystemPrompt({
    currentUser: {
      handle: "angel",
      fullName: "Angel Zhou",
      role: "principal",
      entityAccess: ["SYN"],
      isOwner: false,
    },
  });
  assert.match(p, /Default entity_code to "SYN"/);
});
