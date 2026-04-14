import { test } from "node:test";
import assert from "node:assert/strict";
import { pickOrgMatch, pickAliasMatch } from "./org-matcher";

const rows = [
  { id: "acme-1", name: "Acme", nameZh: null },
  { id: "acme-2", name: "Acme Corp", nameZh: "艾克美公司" },
  { id: "other-1", name: "Other Inc", nameZh: null },
];

test("pickOrgMatch: returns null for empty candidate", () => {
  assert.equal(pickOrgMatch("", rows), null);
  assert.equal(pickOrgMatch("   ", rows), null);
});

test("pickOrgMatch: exact match on name", () => {
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

test("pickOrgMatch: returns null when no exact match (fuzzy removed)", () => {
  assert.equal(pickOrgMatch("Acme Corporation International", rows), null);
  assert.equal(pickOrgMatch("Nonexistent Holdings", rows), null);
});

test("pickOrgMatch: does not exact-match partial overlap", () => {
  const r = pickOrgMatch("Acme Corp", rows);
  assert.deepEqual(r, { id: "acme-2", matchType: "exact" });
});

const aliasRows = [
  { organizationId: "acme-2", alias: "Acme Corporation" },
  { organizationId: "acme-2", alias: "ACME Ltd." },
  { organizationId: "other-1", alias: "Other Incorporated" },
];

test("pickAliasMatch: returns null for empty candidate", () => {
  assert.equal(pickAliasMatch("", aliasRows), null);
  assert.equal(pickAliasMatch("   ", aliasRows), null);
});

test("pickAliasMatch: case-insensitive alias lookup", () => {
  const r = pickAliasMatch("acme corporation", aliasRows);
  assert.deepEqual(r, { id: "acme-2", matchType: "alias" });
});

test("pickAliasMatch: returns null when no alias matches", () => {
  assert.equal(pickAliasMatch("Unknown Co", aliasRows), null);
});

test("pickAliasMatch: first registered alias wins", () => {
  const r = pickAliasMatch("ACME Ltd.", aliasRows);
  assert.deepEqual(r, { id: "acme-2", matchType: "alias" });
});
