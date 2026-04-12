/**
 * Cloud Daemon — polls Supabase for chat jobs.
 *
 * Routes through Cloud Session Server (localhost:3847) for persistent
 * context. Falls back to direct claude -p if session server is down.
 *
 * NOTE: The Cloud Session Server (~/Ship/cloud-session/) now handles
 * Orbit job polling directly. This daemon is a backup/standalone option.
 *
 * Usage: DATABASE_URL="..." npx tsx src/scripts/cloud-daemon.ts
 */

import postgres from "postgres";
import { execFileSync } from "child_process";
import { buildClaimQuery } from "./cloud-daemon-claim";
import type { CurrentUser } from "@/lib/supabase/get-current-user";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const CLOUD_USER_HANDLE = process.env.CLOUD_USER_HANDLE;

const sql = postgres(DATABASE_URL, { ssl: "require" });
const SESSION_SERVER = "http://localhost:3847";
const POLL_INTERVAL = 2000;

async function isSessionServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${SESSION_SERVER}/status`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function processViaSession(prompt: string, context?: string): Promise<string> {
  const res = await fetch(`${SESSION_SERVER}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt, source: "orbit", context }),
  });

  if (!res.ok) throw new Error(`Session server error: ${res.status}`);
  const data = await res.json();
  return data.response;
}

async function processViaClaude(prompt: string): Promise<string> {
  const result = execFileSync("claude", ["-p", "--model", "sonnet", "--output-format", "text"], {
    encoding: "utf-8",
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
    input: prompt,
  });
  return result.trim();
}

/**
 * Hydrate CurrentUser for a claimed job. Used by any tool-invoking path
 * so entity-scope enforcement can run against the correct user.
 * Fails open (returns undefined) if user_handle is missing or the row
 * isn't found — preserves dev/back-compat behavior.
 */
async function loadUserForJob(job: {
  user_handle?: string | null;
}): Promise<CurrentUser | undefined> {
  if (!job.user_handle) {
    console.warn(
      "  ⚠ job has no user_handle — invoking tools with currentUser=undefined (fail-open)",
    );
    return undefined;
  }
  const rows = await sql`
    SELECT id, handle, email, full_name, role, entity_access, supabase_auth_id
    FROM orbit_users
    WHERE handle = ${job.user_handle}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    console.warn(
      `  ⚠ user_handle=${job.user_handle} not found in orbit_users — fail-open`,
    );
    return undefined;
  }
  return {
    id: row.id as string,
    authId: (row.supabase_auth_id as string) ?? "",
    handle: row.handle as string,
    email: row.email as string,
    fullName: row.full_name as string,
    role: row.role as CurrentUser["role"],
    entityAccess: (row.entity_access as string[]) ?? [],
    isOwner: row.role === "owner",
  };
}

async function processJob(job: any) {
  console.log(`Processing job ${job.id.slice(0, 8)}...`);

  // Hydrate user for downstream tool invocations (no-op for claude/session
  // paths today, but available when tools are called in-process).
  const currentUser = await loadUserForJob(job);
  if (currentUser) {
    console.log(
      `  user=${currentUser.handle} role=${currentUser.role} entities=[${currentUser.entityAccess.join(",")}]`,
    );
  }
  void currentUser;

  await sql`
    UPDATE chat_jobs SET status = 'processing', started_at = now()
    WHERE id = ${job.id}
  `;

  try {
    let result: string;
    const useSession = await isSessionServerUp();

    if (useSession) {
      console.log("  → via Session Server (persistent context)");
      result = await processViaSession(job.prompt, job.page_context ? JSON.stringify(job.page_context) : undefined);
    } else {
      console.log("  → via claude -p (one-shot fallback)");
      result = await processViaClaude(job.prompt);
    }

    await sql`
      UPDATE chat_jobs SET status = 'complete', result = ${result}, completed_at = now()
      WHERE id = ${job.id}
    `;

    console.log(`  Done: ${result.slice(0, 80)}${result.length > 80 ? "..." : ""}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`  Failed: ${errorMsg}`);

    await sql`
      UPDATE chat_jobs SET status = 'failed', error = ${errorMsg}, completed_at = now()
      WHERE id = ${job.id}
    `;
  }
}

async function poll() {
  const { sql: claimSql, params } = buildClaimQuery(CLOUD_USER_HANDLE);
  const jobs = await sql.unsafe(claimSql, params as never[]);
  if (jobs.length > 0) await processJob(jobs[0]);
}

async function main() {
  const sessionUp = await isSessionServerUp();
  console.log("☁️  Orbit Cloud Daemon");
  if (CLOUD_USER_HANDLE) {
    console.log(`   Daemon claiming jobs for user_handle=${CLOUD_USER_HANDLE}`);
  } else {
    console.log(
      "   WARNING: CLOUD_USER_HANDLE unset — claiming ALL jobs (dev mode)",
    );
  }
  console.log(`   Session Server: ${sessionUp ? "✅ connected" : "❌ not running (fallback to claude -p)"}`);
  console.log(`   Polling every ${POLL_INTERVAL / 1000}s...\n`);

  while (true) {
    try { await poll(); } catch (err) { console.error("Poll error:", err); }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

main();
