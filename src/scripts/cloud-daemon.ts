/**
 * Cloud Daemon — polls Supabase for chat jobs.
 *
 * Two execution paths:
 *   1. Cloud Session Server (localhost:3847) if up — one-shot HTTP call
 *      that keeps persistent Claude context across requests.
 *   2. `claude -p --output-format stream-json` — streams token-by-token,
 *      writing partial result to chat_jobs.result every ~400ms so the
 *      Orbit API route can relay SSE deltas to the browser. Captures
 *      cost + token usage from the terminal envelope.
 *
 * NOTE: The Cloud Session Server (~/Ship/cloud-session/) now handles
 * Orbit job polling directly. This daemon is a backup/standalone option.
 *
 * Usage: DATABASE_URL="..." npx tsx src/scripts/cloud-daemon.ts
 */

import postgres from "postgres";
import { spawn } from "child_process";
import { buildClaimQuery } from "./cloud-daemon-claim";
import { parseStreamLine, type StreamFinal } from "./stream-parser";
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

/**
 * Stream claude -p output line-by-line and push partials to the caller.
 *
 * onPartial is invoked with the full running text (not incremental deltas)
 * so the caller can do a single UPDATE and stay idempotent — the route
 * reader does its own diff against what it has already streamed to the
 * browser. The caller is responsible for debouncing; this function fires
 * onPartial on every token event.
 */
async function processViaClaudeStreaming(
  prompt: string,
  onPartial: (text: string) => void
): Promise<{ text: string; final: StreamFinal }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      [
        "-p",
        "--model",
        "sonnet",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let accumulated = "";
    let final: StreamFinal | undefined;

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf-8");
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const ev = parseStreamLine(line);
        let changed = false;
        if (ev.textDelta) {
          accumulated += ev.textDelta;
          changed = true;
        } else if (ev.textAbsolute && ev.textAbsolute.length > accumulated.length) {
          // Full-message snapshot is longer than what we've streamed via
          // partials — trust the snapshot (it may include text the partial
          // events missed).
          accumulated = ev.textAbsolute;
          changed = true;
        }
        if (ev.toolUse) {
          console.log(`  → tool_use: ${ev.toolUse.name}`);
        }
        if (ev.final) {
          final = ev.final;
        }
        if (changed) {
          try {
            onPartial(accumulated);
          } catch (err) {
            console.error("  onPartial threw:", err);
          }
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString("utf-8");
    });

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
      // Flush any trailing JSON line.
      if (stdoutBuffer.trim()) {
        const ev = parseStreamLine(stdoutBuffer);
        if (ev.final) final = ev.final;
      }
      const text = final?.result ?? accumulated;
      if (code !== 0 && !final) {
        const stderrTail = stderrBuffer.trim().split("\n").slice(-5).join("\n");
        reject(
          new Error(
            `claude exited with code ${code}${stderrTail ? `: ${stderrTail}` : ""}`,
          ),
        );
        return;
      }
      if (final?.isError) {
        reject(new Error(text || "claude returned error envelope"));
        return;
      }
      resolve({ text: text.trim(), final: final ?? {} });
    });

    child.stdin.write(prompt);
    child.stdin.end();

    // Hard timeout — same 120s ceiling as the old one-shot path.
    setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
        reject(new Error("claude streaming timed out after 120s"));
      }
    }, 120_000);
  });
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
    const useSession = await isSessionServerUp();

    if (useSession) {
      // Session Server path — one-shot over HTTP (no partial stream today).
      console.log("  → via Session Server (persistent context)");
      const result = await processViaSession(
        job.prompt,
        job.page_context ? JSON.stringify(job.page_context) : undefined,
      );
      await sql`
        UPDATE chat_jobs SET status = 'complete', result = ${result}, completed_at = now()
        WHERE id = ${job.id}
      `;
      console.log(
        `  Done: ${result.slice(0, 80)}${result.length > 80 ? "..." : ""}`,
      );
      return;
    }

    // Streaming path — flush partials to chat_jobs.result every FLUSH_INTERVAL
    // ms so the Orbit route can relay them to the browser as SSE deltas.
    console.log("  → via claude -p --stream-json (live)");

    const FLUSH_INTERVAL_MS = 400;
    let pending: string | null = null;
    let lastFlushed = "";
    let flushTimer: NodeJS.Timeout | null = null;

    const doFlush = async () => {
      flushTimer = null;
      if (pending === null || pending === lastFlushed) return;
      const toWrite = pending;
      lastFlushed = pending;
      pending = null;
      try {
        await sql`
          UPDATE chat_jobs SET result = ${toWrite}
          WHERE id = ${job.id}
        `;
      } catch (err) {
        console.error("  partial flush failed:", err);
      }
    };

    const scheduleFlush = (text: string) => {
      pending = text;
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        void doFlush();
      }, FLUSH_INTERVAL_MS);
    };

    const { text, final } = await processViaClaudeStreaming(job.prompt, scheduleFlush);

    // Cancel any pending debounced flush — we're about to do the final write.
    if (flushTimer) clearTimeout(flushTimer);

    await sql`
      UPDATE chat_jobs SET
        status = 'complete',
        result = ${text},
        completed_at = now(),
        model = ${final.model ?? null},
        input_tokens = ${final.inputTokens ?? null},
        output_tokens = ${final.outputTokens ?? null},
        cost_usd = ${final.costUsd ?? null}
      WHERE id = ${job.id}
    `;

    console.log(
      `  Done: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}` +
        (final.costUsd !== undefined ? ` · $${final.costUsd.toFixed(4)}` : "") +
        (final.inputTokens !== undefined
          ? ` · ${final.inputTokens}in/${final.outputTokens ?? "?"}out`
          : ""),
    );
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
  console.log(`   Session Server: ${sessionUp ? "✅ connected" : "❌ not running (using claude -p streaming)"}`);
  console.log(`   Polling every ${POLL_INTERVAL / 1000}s...\n`);

  while (true) {
    try { await poll(); } catch (err) { console.error("Poll error:", err); }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

main();
