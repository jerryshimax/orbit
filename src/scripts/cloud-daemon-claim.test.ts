import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClaimQuery } from "./cloud-daemon-claim";

test("buildClaimQuery: handle set → params = [handle]", () => {
  const { sql, params } = buildClaimQuery("ray");
  assert.deepEqual(params, ["ray"]);
  assert.ok(
    sql.includes("user_handle = $1"),
    "SQL must include the user_handle AND clause",
  );
  assert.ok(
    sql.includes("$1::text IS NULL"),
    "SQL must retain the NULL escape branch for backwards compat",
  );
});

test("buildClaimQuery: undefined handle → params = [null] (dev fallback)", () => {
  const { sql, params } = buildClaimQuery(undefined);
  assert.deepEqual(params, [null]);
  assert.ok(
    sql.includes("user_handle = $1"),
    "SQL must include the user_handle AND clause in unset mode too",
  );
});

test("buildClaimQuery: SQL orders by created_at ASC and limits to 1", () => {
  const { sql } = buildClaimQuery("jerry");
  assert.ok(sql.includes("ORDER BY created_at ASC"));
  assert.ok(sql.includes("LIMIT 1"));
  assert.ok(sql.includes("status='pending'"));
});
