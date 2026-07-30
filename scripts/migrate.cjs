#!/usr/bin/env node
/**
 * Non-interactive database migration script.
 * Generates SQL from the drizzle schema and applies it, skipping already-existing objects.
 * Used by post-merge.sh so drizzle-kit's interactive prompts are bypassed.
 */
const { execSync } = require("child_process");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[migrate] No DATABASE_URL — skipping migrations.");
    return;
  }

  // Generate a fresh migration snapshot (idempotent — overwrites the file)
  const label = "auto_" + Date.now();
  try {
    execSync(`npx drizzle-kit generate --name=${label} 2>&1`, {
      cwd: path.resolve(__dirname, ".."),
      stdio: "pipe",
    });
  } catch (e) {
    console.error("[migrate] drizzle-kit generate failed:", e.stderr?.toString() || e.message);
    process.exit(1);
  }

  // Find the most recently generated migration file
  const migrationsDir = path.resolve(__dirname, "../migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.log("[migrate] No migration files found — nothing to apply.");
    return;
  }

  const latest = path.join(migrationsDir, files[files.length - 1]);
  console.log("[migrate] Applying:", path.basename(latest));

  const sql = fs.readFileSync(latest, "utf8");
  const stmts = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let applied = 0;
  let skipped = 0;

  for (const stmt of stmts) {
    try {
      await pool.query(stmt);
      applied++;
    } catch (e) {
      if (
        e.code === "42P07" || // relation already exists
        e.code === "42710" || // duplicate object
        e.message.includes("already exists")
      ) {
        skipped++;
      } else {
        console.error("[migrate] Error:", e.message.slice(0, 120));
      }
    }
  }

  await pool.end();
  console.log(`[migrate] Applied: ${applied}  Skipped (already exists): ${skipped}`);
}

main().catch((e) => {
  console.error("[migrate] Fatal:", e.message);
  process.exit(1);
});
