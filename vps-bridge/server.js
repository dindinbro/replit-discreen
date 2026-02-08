#!/usr/bin/env node
/**
 * Discreen VPS Bridge — SQLite Search API
 * 
 * Ce script tourne sur ton VPS et expose tes fichiers SQLite
 * via une API HTTP securisee que le site Replit interroge.
 *
 * INSTALLATION SUR LE VPS:
 *   1. Copie ce fichier sur ton VPS
 *   2. npm init -y && npm install better-sqlite3 express
 *   3. Modifie DATA_DIR ci-dessous pour pointer vers tes fichiers .db
 *   4. Change le BRIDGE_SECRET pour un mot de passe securise
 *   5. Lance: node server.js
 *   6. (Optionnel) Utilise pm2 pour garder le processus actif:
 *      npm install -g pm2 && pm2 start server.js --name discreen-bridge
 *
 * CONFIGURATION:
 *   - DATA_DIR: Dossier contenant tes fichiers .db (index.db, index2.db, etc.)
 *   - PORT: Port d'ecoute (defaut: 4800)
 *   - BRIDGE_SECRET: Cle secrete partagee avec le site Replit
 */

const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ============ CONFIGURATION ============
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PORT = parseInt(process.env.PORT || "4800", 10);
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "CHANGE_ME_TO_A_SECURE_SECRET";
// =======================================

const app = express();
app.use(express.json());

const dbCache = {};

function loadDatabases() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`[bridge] DATA_DIR not found: ${DATA_DIR}`);
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".db"));
  console.log(`[bridge] Found ${files.length} database file(s) in ${DATA_DIR}`);

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const key = file.replace(/\.db$/, "");

    try {
      const db = new Database(filePath, { readonly: true });
      const info = detectMainTable(db);
      dbCache[key] = { db, ...info, sourceKey: key, filename: file };

      const countRow = db.prepare(`SELECT count(*) as c FROM "${info.tableName}"`).get();
      console.log(`[bridge] ${file} -> table "${info.tableName}" (${info.isFts ? "FTS5" : "regular"}, ${countRow.c} rows)`);
    } catch (err) {
      console.error(`[bridge] Failed to load ${file}:`, err.message);
    }
  }
}

function detectMainTable(db) {
  const tables = db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_content' AND name NOT LIKE '%_docsize' AND name NOT LIKE '%_config' AND name NOT LIKE 'sqlite_%'"
    )
    .all();

  for (const t of tables) {
    if (t.sql && t.sql.toUpperCase().includes("USING FTS5")) {
      const colMatch = t.sql.match(/fts5\(([^)]+)\)/i);
      if (colMatch) {
        const cols = colMatch[1].split(",").map((c) => c.trim().split(/\s+/)[0]);
        return { tableName: t.name, columns: cols, isFts: true };
      }
    }
  }

  if (tables.length > 0) {
    const first = tables[0];
    const pragma = db.prepare(`PRAGMA table_info("${first.name}")`).all();
    const cols = pragma.map((p) => p.name);
    return { tableName: first.name, columns: cols, isFts: false };
  }

  throw new Error("No usable table found");
}

function authMiddleware(req, res, next) {
  const token = req.headers["x-bridge-secret"];
  if (!token || token !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function searchOneDb(info, values, limit, offset) {
  const { db, tableName, columns, isFts, sourceKey } = info;

  if (values.length === 0) return { results: [], total: 0 };

  if (isFts) {
    const ftsTerms = values.map((v) => `"${v.replace(/"/g, '""')}"`);
    const ftsQuery = ftsTerms.join(" ");

    const countRow = db
      .prepare(`SELECT count(*) as total FROM "${tableName}" WHERE "${tableName}" MATCH ?`)
      .get(ftsQuery);

    const rows = db
      .prepare(
        `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE "${tableName}" MATCH ? ORDER BY rank LIMIT ? OFFSET ?`
      )
      .all(ftsQuery, limit, offset);

    return {
      results: rows.map((r) => ({ _source: sourceKey, ...r })),
      total: countRow.total,
    };
  } else {
    const conditions = [];
    const params = [];

    for (const val of values) {
      const orParts = columns.map((c) => `"${c}" LIKE ?`);
      conditions.push(`(${orParts.join(" OR ")})`);
      for (const _c of columns) {
        params.push(`%${val}%`);
      }
    }

    const whereSQL = conditions.join(" AND ");

    const countRow = db
      .prepare(`SELECT count(*) as total FROM "${tableName}" WHERE ${whereSQL}`)
      .get(...params);

    const rows = db
      .prepare(
        `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE ${whereSQL} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return {
      results: rows.map((r) => ({ _source: sourceKey, ...r })),
      total: countRow.total,
    };
  }
}

// Health check (no auth needed)
app.get("/health", (_req, res) => {
  const dbs = Object.keys(dbCache);
  res.json({ status: "ok", databases: dbs.length, names: dbs });
});

// Search endpoint
app.post("/search", authMiddleware, (req, res) => {
  try {
    const { criteria, limit = 20, offset = 0 } = req.body;

    if (!criteria || !Array.isArray(criteria)) {
      return res.status(400).json({ error: "criteria array required" });
    }

    const values = criteria.map((c) => (c.value || "").trim()).filter(Boolean);
    if (values.length === 0) {
      return res.json({ results: [], total: 0 });
    }

    const safeLimit = Math.min(Math.max(1, limit), 50);
    const safeOffset = Math.max(0, offset);

    const dbs = Object.values(dbCache);
    if (dbs.length === 0) {
      return res.json({ results: [], total: 0 });
    }

    let totalCount = 0;
    const dbTotals = [];

    for (const dbInfo of dbs) {
      try {
        const countResult = searchOneDb(dbInfo, values, 0, 0);
        const t = countResult.total || 0;
        totalCount += t;
        dbTotals.push({ info: dbInfo, total: t });
      } catch (err) {
        console.warn(`[bridge] Error counting ${dbInfo.sourceKey}:`, err.message);
      }
    }

    let remaining = safeOffset;
    const allResults = [];
    let needed = safeLimit;

    for (const { info, total } of dbTotals) {
      if (needed <= 0) break;
      if (remaining >= total) {
        remaining -= total;
        continue;
      }

      try {
        const result = searchOneDb(info, values, needed, remaining);
        allResults.push(...result.results);
        needed -= result.results.length;
        remaining = 0;
      } catch (err) {
        console.warn(`[bridge] Error searching ${info.sourceKey}:`, err.message);
      }
    }

    res.json({ results: allResults, total: totalCount });
  } catch (err) {
    console.error("[bridge] Search error:", err);
    res.status(500).json({ error: "Internal search error" });
  }
});

// Info about loaded databases
app.get("/info", authMiddleware, (_req, res) => {
  const info = Object.entries(dbCache).map(([key, db]) => ({
    key,
    filename: db.filename,
    table: db.tableName,
    columns: db.columns,
    isFts: db.isFts,
  }));
  res.json({ databases: info });
});

// Start
loadDatabases();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[bridge] Discreen VPS Bridge running on port ${PORT}`);
  console.log(`[bridge] ${Object.keys(dbCache).length} database(s) loaded`);
  if (BRIDGE_SECRET === "CHANGE_ME_TO_A_SECURE_SECRET") {
    console.warn("[bridge] WARNING: Change BRIDGE_SECRET to a secure value!");
  }
});
