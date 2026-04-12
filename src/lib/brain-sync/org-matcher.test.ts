import { test } from "node:test";
import assert from "node:assert/strict";
import { pickOrgMatch } from "./org-matcher";

const rows = [
  { id: "acme-1", name: "Acme", nameZh: null },
  { id: "acme-2", name: "Acme Corp", nameZh: "艾克美公司" },
  { id: "other-1", name: "Other Inc", nameZh: null },
];

test("pickOrgMatch: returns null for empty candidate", () => {
  assert.equal(pickOrgMatch("", rows), null);
  assert.equal(pickOrgMatch("   ", rows), null);
});

test("pickOrgMatch: exact match wins over fuzzy (plan B5 regression)", () => {
  // Previous ilike-based logic would have matched "Acme Corp" first on "Acme".
  // Exact match should pick "Acme" (id acme-1), not "Acme Corp".
  const r = pickOrgMatch("Acme", rows);
  assert.deepEqual(r, { id: "acme-1", matchType: "exact" });
});

test("pickOrgMatch: exact match is case-insensitive", () => {
  const r = pickOrgMatch("aCME cORP", rows);
  assert.deepEqual(r, { id: "acme-2", matchType: "exact" });
});

test("pickOrgMatch: exact match on name_zh", () => {
  const r = pickOrgMatch("艾克美公司", rows);
  assert.deepEqual(r, { id: "acme-2", matchType: "exact" });
});

test("pickOrgMatch: fuzzy fallback when no exact", () => {
  const r = pickOrgMatch("Acme Corporation International", rows);
  // No exact — should fuzzy-match first row where candidate contains the name.
  // Both Acme and Acme Corp are substrings of the candidate; Acme comes first.
  assert.ok(r);
  assert.equal(r!.matchType, "fuzzy");
  assert.ok(["acme-1", "acme-2"].includes(r!.id));
});

test("pickOrgMatch: returns null when nothing matches", () => {
  const r = pickOrgMatch("Nonexistent Holdings", rows);
  assert.equal(r, null);
});

test("pickOrgMatch: does not exact-match on partial when similar org exists", () => {
  // "Acme Corp" candidate must NOT exact-match "Acme" — it should pick acme-2.
  const r = pickOrgMatch("Acme Corp", rows);
  assert.deepEqual(r, { id: "acme-2", matchType: "exact" });
});
