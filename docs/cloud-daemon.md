# Cloud Daemon — Per-User Setup

The Cloud daemon polls `chat_jobs` in Supabase and runs Cloud (Claude) against each pending row. In multi-tenant mode, every teammate runs their **own** daemon on their own Mac, and each daemon claims **only their own user's jobs** via the `CLOUD_USER_HANDLE` env var.

## Prerequisites

- Node 20+ (the repo uses `tsx` to run TypeScript directly)
- `npm install` completed at the repo root
- Valid `DATABASE_URL` pointing at the shared Supabase Postgres
- Your Orbit user handle (e.g. `jerry`, `ray`, `matt`, `angel`, `david`) — this must match the `handle` column in `orbit_users`
- Optional: Cloud Session Server (`~/Ship/cloud-session/`) running on `localhost:3847` for persistent context. If not running, the daemon falls back to one-shot `claude -p`.

## Running locally

From the repo root:

```bash
export DATABASE_URL="postgres://..."         # shared Supabase URL
export CLOUD_USER_HANDLE="ray"               # your Orbit handle
npx tsx src/scripts/cloud-daemon.ts
```

On startup you should see:

```
☁️  Orbit Cloud Daemon
   Daemon claiming jobs for user_handle=ray
   Session Server: ...
   Polling every 2s...
```

If `CLOUD_USER_HANDLE` is unset the daemon logs:

```
   WARNING: CLOUD_USER_HANDLE unset — claiming ALL jobs (dev mode)
```

This dev fallback preserves pre-multi-tenant behavior (claim every pending row). **Do not run this mode in parallel with per-user daemons** — it will race them for jobs.

## Install as a LaunchAgent (macOS)

A template is provided at `docs/cloud-daemon.plist.template`. Copy it, substitute your values, and install:

```bash
# 1. Copy and fill in placeholders
cp docs/cloud-daemon.plist.template ~/Library/LaunchAgents/com.cloud.orbit-daemon.plist

# 2. Edit ~/Library/LaunchAgents/com.cloud.orbit-daemon.plist
#    Replace {{USER_HANDLE}}   → your handle (e.g. ray)
#    Replace {{DATABASE_URL}}  → the Supabase connection string
#    Replace {{REPO_PATH}}     → absolute path to the orbit checkout
#    Replace {{NODE_BIN_DIR}}  → dir containing node/npx (e.g. /opt/homebrew/bin)

# 3. Load it
launchctl load ~/Library/LaunchAgents/com.cloud.orbit-daemon.plist

# 4. Check logs
tail -f ~/Library/Logs/cloud-orbit-daemon.log
```

To stop:

```bash
launchctl unload ~/Library/LaunchAgents/com.cloud.orbit-daemon.plist
```

## How the claim query works

The daemon executes:

```sql
SELECT * FROM chat_jobs
WHERE status='pending'
  AND (user_handle = $1 OR $1::text IS NULL)
ORDER BY created_at ASC
LIMIT 1
```

- When `CLOUD_USER_HANDLE` is set, `$1` is the handle and only matching rows are claimed.
- When unset, `$1` is `NULL`, the second branch short-circuits the filter, and any pending row may be claimed (dev mode).

The query builder is isolated in `src/scripts/cloud-daemon-claim.ts` and unit-tested in `src/scripts/cloud-daemon-claim.test.ts`.

## Troubleshooting — "My Cloud is not responding"

1. **Is the daemon running?**
   ```bash
   ps aux | grep cloud-daemon
   launchctl list | grep cloud.orbit-daemon
   ```

2. **Is `CLOUD_USER_HANDLE` set and matching your Orbit handle?**
   In the daemon log, confirm the line `Daemon claiming jobs for user_handle=<you>`. If it says `WARNING: CLOUD_USER_HANDLE unset` you're in dev mode.

3. **Does the handle match `orbit_users.handle`?**
   A mismatch (e.g. `Ray` vs `ray`) means the daemon silently matches nothing. Handles are case-sensitive at the SQL level.

4. **Is Supabase reachable?**
   ```bash
   psql "$DATABASE_URL" -c "SELECT count(*) FROM chat_jobs WHERE status='pending';"
   ```
   Connection errors here usually mean an expired password or IP not whitelisted.

5. **Are jobs being created with the right `user_handle`?**
   The write path is `src/app/api/chat/route.ts`. If rows land with a `NULL` or wrong handle, no per-user daemon will see them.

6. **Session server issues.** If logs show "via claude -p (one-shot fallback)" constantly, the Cloud Session Server isn't running — that's OK for basic responses, but context isn't persistent. Start it from `~/Ship/cloud-session/` if you need it.

## Notes

- The external daemon at `~/Ship/cloud-session/` (out of this repo) must receive the same claim-query patch before multi-tenant mode is safe. That is a separate, manual change.
