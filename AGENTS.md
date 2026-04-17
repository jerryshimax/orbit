<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database schema rules

Every new table in the `public` schema must ship with `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` in the same migration. The PostgREST roles (`anon`, `authenticated`) have no grants on `public` (revoked in `0007_enable_rls.sql`), so new tables inherit deny-by-default — but enable RLS explicitly anyway, because the schema-level revoke doesn't propagate through `DROP TABLE` + recreate cycles, and any future `GRANT` would immediately re-expose the table.
