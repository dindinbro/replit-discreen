#!/usr/bin/env node
/**
 * Promote a local user to admin role.
 *
 * Usage:
 *   node scripts/make-admin.cjs <username>
 *
 * Example:
 *   node scripts/make-admin.cjs jarvis
 */
const { Pool } = require("pg");

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: node scripts/make-admin.cjs <username>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query(
    "SELECT id, username, role FROM users WHERE username = $1",
    [username]
  );

  if (!rows.length) {
    console.error(`User "${username}" not found.`);
    await pool.end();
    process.exit(1);
  }

  const user = rows[0];
  if (user.role === "admin") {
    console.log(`"${username}" is already an admin. Nothing to do.`);
    await pool.end();
    return;
  }

  await pool.query("UPDATE users SET role = 'admin' WHERE username = $1", [username]);
  await pool.end();

  console.log(`✓ "${username}" (id=${user.id}) promoted from "${user.role}" → "admin".`);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
