---
name: Discreen V2 schema migration
description: How schema was applied and the drizzle-kit push workaround.
---

# Discreen V2 — Schema migration

## Rule
`drizzle-kit push` on this project hangs on interactive prompts (unique constraint on discount_codes). Use the node migration script workaround instead.

**Why:** drizzle-kit push asks "truncate or not?" interactively; piping stdin doesn't help; `--strict` still prompts.

## How to apply
Run `npx drizzle-kit generate --name=<label>` to generate SQL, then apply it with:
```js
const sql = fs.readFileSync('migrations/<file>.sql', 'utf8');
const stmts = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
for (const stmt of stmts) {
  try { await pool.query(stmt); }
  catch (e) { if (e.code !== '42P07' && e.code !== '42710' && !e.message.includes('already exists')) throw e; }
}
```

## Users table (V2)
Added columns: `password_hash text`, `email text`, `role text DEFAULT 'free' NOT NULL`, `created_at timestamp DEFAULT now()`, UNIQUE on `username`.
