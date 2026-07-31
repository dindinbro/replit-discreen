#!/usr/bin/env node
/**
 * make-admin.js — promote a user to admin role
 *
 * Usage:
 *   node scripts/make-admin.js <username>
 *
 * Example:
 *   node scripts/make-admin.js myusername
 */

import pg from "pg";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

// Load .env from project root
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const { Pool } = pg;

const username = process.argv[2];

if (!username) {
  console.error("Usage: node scripts/make-admin.js <username>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const { rows } = await pool.query(
    "SELECT id, username, role FROM users WHERE username = $1",
    [username]
  );

  if (rows.length === 0) {
    console.error(`ERROR: No user found with username "${username}".`);
    await pool.end();
    process.exit(1);
  }

  const user = rows[0];

  if (user.role === "admin") {
    console.log(`User "${username}" (id=${user.id}) is already an admin. Nothing to do.`);
    await pool.end();
    process.exit(0);
  }

  await pool.query(
    "UPDATE users SET role = 'admin' WHERE id = $1",
    [user.id]
  );

  console.log(`✓ User "${username}" (id=${user.id}) has been promoted to admin.`);
  await pool.end();
  process.exit(0);
} catch (err) {
  console.error("ERROR:", err.message);
  await pool.end();
  process.exit(1);
}
