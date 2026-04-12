import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessEntity,
  assertCanAccess,
  filterByEntity,
  OutOfScopeError,
  type ScopedUser,
} from "./scope-filter";

const owner: ScopedUser = {
  isOwner: true,
  entityAccess: ["CE", "SYN", "UUL", "FO", "PERSONAL"],
};

const synUser: ScopedUser = { isOwner: false, entityAccess: ["SYN"] };
const multiUser: ScopedUser = { isOwner: false, entityAccess: ["CE", "SYN"] };
const personalTainted: ScopedUser = {
  isOwner: false,
  entityAccess: ["SYN", "PERSONAL"],
};

test("canAccessEntity: owner sees all entities", () => {
  assert.equal(canAccessEntity(owner, "CE"), true);
  assert.equal(canAccessEntity(owner, "SYN"), true);
  assert.equal(canAccessEntity(owner, "UUL"), true);
  assert.equal(canAccessEntity(owner, "PERSONAL"), true);
  assert.equal(canAccessEntity(owner, "FO"), true);
});

test("canAccessEntity: single-entity user sees only SYN", () => {
  assert.equal(canAccessEntity(synUser, "SYN"), true);
  assert.equal(canAccessEntity(synUser, "CE"), false);
  assert.equal(canAccessEntity(synUser, "UUL"), false);
});

test("canAccessEntity: multi-entity user sees CE + SYN but not UUL", () => {
  assert.equal(canAccessEntity(multiUser, "CE"), true);
  assert.equal(canAccessEntity(multiUser, "SYN"), true);
  assert.equal(canAccessEntity(multiUser, "UUL"), false);
});

test("canAccessEntity: PERSONAL is owner-only even if listed in a non-owner's access", () => {
  assert.equal(canAccessEntity(personalTainted, "PERSONAL"), false);
  // Other entries in their list still work.
  assert.equal(canAccessEntity(personalTainted, "SYN"), true);
});

test("canAccessEntity: null/empty entityCode is always accessible (generic record)", () => {
  assert.equal(canAccessEntity(synUser, null), true);
  assert.equal(canAccessEntity(synUser, undefined), true);
  assert.equal(canAccessEntity(synUser, ""), true);
  assert.equal(canAccessEntity(synUser, "   "), true);
});

test("canAccessEntity: null user fails open (dev/back-compat)", () => {
  // Documented fail-open behavior.
  assert.equal(canAccessEntity(null, "CE"), true);
  assert.equal(canAccessEntity(undefined, "PERSONAL"), true);
});

test("canAccessEntity: entity codes are normalized (trim + upper)", () => {
  assert.equal(canAccessEntity(synUser, " syn "), true);
  assert.equal(canAccessEntity(synUser, "syn"), true);
  assert.equal(canAccessEntity(synUser, "ce"), false);
});

test("assertCanAccess: throws OutOfScopeError with descriptive message", () => {
  assert.throws(
    () => assertCanAccess(synUser, "CE"),
    (err: unknown) => {
      assert.ok(err instanceof OutOfScopeError);
      assert.equal((err as OutOfScopeError).code, "OUT_OF_SCOPE");
      assert.equal((err as OutOfScopeError).entityCode, "CE");
      assert.match((err as Error).message, /CE/);
      assert.match((err as Error).message, /scope/i);
      return true;
    },
  );
});

test("assertCanAccess: no-op when access permitted", () => {
  assert.doesNotThrow(() => assertCanAccess(synUser, "SYN"));
  assert.doesNotThrow(() => assertCanAccess(owner, "PERSONAL"));
  assert.doesNotThrow(() => assertCanAccess(synUser, null));
});

test("filterByEntity: filters mixed rows correctly", () => {
  const rows = [
    { id: 1, entityCode: "CE" },
    { id: 2, entityCode: "SYN" },
    { id: 3, entityCode: "UUL" },
    { id: 4, entityCode: null },
  ];
  const result = filterByEntity(rows, synUser);
  assert.deepEqual(
    result.map((r) => r.id),
    [2, 4],
  );
});

test("filterByEntity: tolerates snake_case entity_code keys", () => {
  const rows = [
    { id: 1, entity_code: "CE" },
    { id: 2, entity_code: "SYN" },
    { id: 3, entity_code: null },
  ];
  const result = filterByEntity(rows, synUser);
  assert.deepEqual(
    result.map((r) => r.id),
    [2, 3],
  );
});

test("filterByEntity: handles mixed camelCase and snake_case in one pass", () => {
  const rows: Array<{
    id: number;
    entityCode?: string | null;
    entity_code?: string | null;
  }> = [
    { id: 1, entityCode: "CE" },
    { id: 2, entity_code: "SYN" },
    { id: 3, entityCode: "UUL" },
  ];
  const result = filterByEntity(rows, multiUser);
  assert.deepEqual(
    result.map((r) => r.id),
    [1, 2],
  );
});

test("filterByEntity: owner sees everything including PERSONAL", () => {
  const rows = [
    { id: 1, entityCode: "CE" },
    { id: 2, entityCode: "PERSONAL" },
    { id: 3, entityCode: "UUL" },
  ];
  const result = filterByEntity(rows, owner);
  assert.equal(result.length, 3);
});

test("filterByEntity: null user is fail-open (no filtering)", () => {
  const rows = [
    { id: 1, entityCode: "CE" },
    { id: 2, entityCode: "PERSONAL" },
  ];
  assert.equal(filterByEntity(rows, null).length, 2);
  assert.equal(filterByEntity(rows, undefined).length, 2);
});
