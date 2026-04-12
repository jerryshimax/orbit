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

async function processJob(job: any) {
  console.log(`Processing job ${job.id.slice(0, 8)}...`);

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
