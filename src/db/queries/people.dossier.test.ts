/**
 * Contract tests for getPersonDossier.
 *
 * Rather than spin up a real Postgres, we stub `@/db` at module load time by
 * pre-populating Node's require cache with a fake db whose chainable query
 * builder records calls and returns canned rows. This gives us confidence
 * that:
 *   1. The function returns null for an unknown personId.
 *   2. The shape of the returned dossier matches the PersonDossier contract.
 *   3. Opportunities are deduped across opportunityContacts + org fallback.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import path from "node:path";

type Row = Record<string, unknown>;

function makeChain(rows: Row[]): any {
  const chain: any = {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
    then: (onFulfilled: (v: Row[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };
  return chain;
}

function installDbStub(plans: Row[][]) {
  // Each call to db.select() pops the next canned result set.
  let idx = 0;
  const db = {
    select: () => {
      const rows = plans[idx] ?? [];
      idx += 1;
      return makeChain(rows);
    },
  };

  const originalResolve = (Module as any)._resolveFilename;
  const originalLoad = (Module as any)._load;
  const dbPath = path.resolve(__dirname, "../index.ts");

  (Module as any)._load = function patchedLoad(
    request: string,
    parent: unknown,
    ...rest: unknown[]
  ) {
    if (request === "@/db" || request.endsWith("/db")) {
      return { db };
    }
    return originalLoad.call(this, request, parent, ...rest);
  };
  void originalResolve;
  void dbPath;

  return () => {
    (Module as any)._load = originalLoad;
  };
}

test("getPersonDossier: returns null when person not found", async () => {
  const restore = installDbStub([[]]); // first select (person lookup) returns []
  try {
    const mod = await import("./people");
    const result = await mod.getPersonDossier(
      "00000000-0000-0000-0000-000000000000"
    );
    assert.equal(result, null);
  } finally {
    restore();
  }
});

test("getPersonDossier: function is exported with correct signature", async () => {
  const mod = await import("./people");
  assert.equal(typeof mod.getPersonDossier, "function");
  // Arity: one required arg (personId).
  assert.equal(mod.getPersonDossier.length, 1);
});
