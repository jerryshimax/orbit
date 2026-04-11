/**
 * Cloud Daemon — runs on Jerry's Mac, polls Supabase for chat jobs,
 * processes them via claude -p (uses Claude Max subscription, no API cost).
 *
 * Usage: DATABASE_URL="..." npx tsx src/scripts/cloud-daemon.ts
 *
 * This should run as a LaunchAgent for always-on operation.
 */

import postgres from "postgres";
import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_PROMPT_LENGTH = 50000;

async function processJob(job: any) {
  console.log(`Processing job ${job.id.slice(0, 8)}...`);

  // Mark as processing
  await sql`
    UPDATE chat_jobs
    SET status = 'processing', started_at = now()
    WHERE id = ${job.id}
  `;

  try {
    // Truncate prompt if too long
    let prompt = job.prompt;
    if (prompt.length > MAX_PROMPT_LENGTH) {
      prompt = prompt.slice(-MAX_PROMPT_LENGTH);
    }

    // Write prompt to temp file
    const tmpFile = `/tmp/orbit-cloud-${job.id}.txt`;
    writeFileSync(tmpFile, prompt);

    // Run claude -p with the prompt (uses Claude Max subscription)
    const result = execFileSync(
      "claude",
      ["-p", "--model", "sonnet", "--output-format", "text"],
      {
        encoding: "utf-8",
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
        input: prompt,
      }
    );

    // Clean up temp file
    try {
      unlinkSync(tmpFile);
    } catch {}

    const responseText = result.trim();

    // Mark as complete
    await sql`
      UPDATE chat_jobs
      SET status = 'complete', result = ${responseText}, completed_at = now()
      WHERE id = ${job.id}
    `;

    console.log(
      `  Done: ${responseText.slice(0, 80)}${responseText.length > 80 ? "..." : ""}`
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`  Failed: ${errorMsg}`);

    await sql`
      UPDATE chat_jobs
      SET status = 'failed', error = ${errorMsg}, completed_at = now()
      WHERE id = ${job.id}
    `;
  }
}

async function poll() {
  const jobs = await sql`
    SELECT * FROM chat_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (jobs.length > 0) {
    await processJob(jobs[0]);
  }
}

async function main() {
  console.log("☁️  Orbit Cloud Daemon started");
  console.log(`   Polling every ${POLL_INTERVAL / 1000}s...`);
  console.log("   Using claude -p (Claude Max subscription)\n");

  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error("Poll error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

main();
