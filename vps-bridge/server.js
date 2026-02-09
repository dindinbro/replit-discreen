#!/usr/bin/env node
/**
 * Discreen VPS Bridge — SQLite Search API
 * 
 * Ce script tourne sur ton VPS et expose tes fichiers SQLite
 * via une API HTTP securisee que le site Replit interroge.
 */

const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PORT = parseInt(process.env.PORT || "4800", 10);
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "CHANGE_ME_TO_A_SECURE_SECRET";

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
      db.pragma("busy_timeout = 10000");
      const info = detectMainTable(db);
      dbCache[key] = { db, ...info, sourceKey: key, filename: file };

      db.prepare(`SELECT 1 FROM "${info.tableName}" LIMIT 1`).get();
      console.log(`[bridge] ${file} -> table "${info.tableName}" (${info.isFts ? "FTS5" : "regular"}) OK`);
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

function getFieldCI(r, ...keys) {
  for (const k of keys) {
    if (r[k] !== undefined) return r[k];
    const lower = k.toLowerCase();
    const upper = k.charAt(0).toUpperCase() + k.slice(1);
    if (r[lower] !== undefined) return r[lower];
    if (r[upper] !== undefined) return r[upper];
  }
  for (const k of keys) {
    const found = Object.keys(r).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && r[found] !== undefined) return r[found];
  }
  return "";
}

function parseLineField(line, source) {
  const parsed = {};

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const phoneRegex = /^(\+?\d[\d\s\-().]{6,})$/;
  const hashRegex = /^[a-f0-9]{32,128}$/i;
  const urlRegex = /^https?:\/\//i;

  let sep = ":";
  if (urlRegex.test(line)) {
    const withoutUrls = line.replace(/https?:\/\/[^\s;|,]+/g, "");
    if (withoutUrls.includes(";")) sep = ";";
    else if (withoutUrls.includes("|")) sep = "|";
    else sep = ":";
  } else {
    const semicolons = (line.match(/;/g) || []).length;
    const colons = (line.match(/:/g) || []).length;
    const pipes = (line.match(/\|/g) || []).length;
    if (semicolons > 0 && semicolons >= colons) sep = ";";
    else if (pipes > 0 && pipes >= colons && pipes >= semicolons) sep = "|";
    else sep = ":";
  }

  let parts;
  if (sep === ":" && urlRegex.test(line)) {
    parts = [];
    let remaining = line;
    while (remaining.length > 0) {
      const urlMatch = remaining.match(/^(https?:\/\/[^\s:]+)/i);
      if (urlMatch) {
        parts.push(urlMatch[1]);
        remaining = remaining.slice(urlMatch[1].length);
        if (remaining.startsWith(":")) remaining = remaining.slice(1);
      } else {
        const idx = remaining.indexOf(":");
        if (idx === -1) {
          parts.push(remaining);
          break;
        } else {
          parts.push(remaining.slice(0, idx));
          remaining = remaining.slice(idx + 1);
        }
      }
    }
  } else {
    parts = line.split(sep);
  }

  parts = parts.map((p) => p.trim()).filter(Boolean);

  if (parts.length === 1) {
    parsed["donnee"] = parts[0];
    if (source) parsed["source"] = source;
    return parsed;
  }

  const assigned = new Set();

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    if (emailRegex.test(p) && !parsed["email"]) {
      parsed["email"] = p;
      assigned.add(i);
    } else if (ipRegex.test(p) && !parsed["ip"]) {
      parsed["ip"] = p;
      assigned.add(i);
    } else if (phoneRegex.test(p) && !parsed["telephone"]) {
      parsed["telephone"] = p;
      assigned.add(i);
    } else if (hashRegex.test(p) && p.length >= 32 && !parsed["hash"]) {
      parsed["hash"] = p;
      assigned.add(i);
    }
  }

  const unassigned = parts.filter((_, i) => !assigned.has(i)).filter(Boolean);

  if (unassigned.length > 0) {
    if (!parsed["email"]) {
      parsed["identifiant"] = unassigned.shift();
    } else if (unassigned.length >= 2) {
      parsed["identifiant"] = unassigned.shift();
    }
  }
  if (unassigned.length > 0) {
    const next = unassigned[0];
    if (next && hashRegex.test(next) && next.length >= 32 && !parsed["hash"]) {
      parsed["hash"] = unassigned.shift();
    } else if (next && !parsed["password"]) {
      parsed["password"] = unassigned.shift();
    }
  }
  for (let i = 0; i < unassigned.length; i++) {
    parsed[`champ_${i + 1}`] = unassigned[i];
  }

  if (source) parsed["source"] = source;
  return parsed;
}

function processResults(rows, sourceKey) {
  return rows.map((r) => {
    const line = getFieldCI(r, "line", "data", "content");
    const source = getFieldCI(r, "source");

    if (line && typeof line === "string" && line.length > 0) {
      const parsed = parseLineField(line, source);
      return { _source: sourceKey, _raw: line, ...parsed };
    }

    const cleaned = {};
    for (const [k, v] of Object.entries(r)) {
      if (k.toLowerCase() !== "rownum") {
        cleaned[k] = v;
      }
    }
    return { _source: sourceKey, ...cleaned };
  });
}

const CRITERION_TO_PARSED_FIELDS = {
  email: ["email", "mail"],
  username: ["identifiant", "username", "pseudo"],
  displayName: ["identifiant", "username", "pseudo", "nom", "name"],
  lastName: ["nom", "name", "last_name", "lastname", "surname", "identifiant"],
  firstName: ["prenom", "first_name", "firstname", "identifiant"],
  phone: ["telephone", "phone", "tel", "mobile"],
  ipAddress: ["ip"],
  address: ["adresse", "address", "rue", "street", "ville", "city"],
  ssn: ["ssn"],
  dob: ["date_naissance", "birthday", "dob", "birth", "date", "bday"],
  yob: ["date_naissance", "birthday", "dob", "birth", "date", "bday"],
  iban: ["iban"],
  bic: ["bic"],
  password: ["password", "hash"],
  hashedPassword: ["hash", "password"],
  discordId: ["discord"],
  macAddress: ["mac"],
  gender: ["gender"],
  vin: ["vin"],
  fivemLicense: ["fivem"],
};

function filterResultsByCriteria(results, criteria) {
  if (!criteria || criteria.length === 0) return results;

  return results.filter((row) => {
    for (const criterion of criteria) {
      const allowedFields = CRITERION_TO_PARSED_FIELDS[criterion.type];
      if (!allowedFields) continue;
      const searchVal = (criterion.value || "").trim().toLowerCase();
      if (!searchVal) continue;

      let foundInAllowedField = false;
      for (const [key, val] of Object.entries(row)) {
        if (key.startsWith("_")) continue;
        const keyLower = key.toLowerCase();
        if (allowedFields.includes(keyLower)) {
          const strVal = String(val || "").toLowerCase();
          if (strVal.includes(searchVal)) {
            foundInAllowedField = true;
            break;
          }
        }
      }

      if (!foundInAllowedField) {
        const raw = String(row["_raw"] || "").toLowerCase();
        if (raw.includes(searchVal)) {
          foundInAllowedField = true;
        }
      }

      if (!foundInAllowedField) {
        let foundAnywhere = false;
        for (const [key, val] of Object.entries(row)) {
          if (key.startsWith("_")) continue;
          const strVal = String(val || "").toLowerCase();
          if (strVal.includes(searchVal)) {
            foundAnywhere = true;
            break;
          }
        }
        if (!foundAnywhere) return false;
      }
    }
    return true;
  });
}

function authMiddleware(req, res, next) {
  const token = req.headers["x-bridge-secret"];
  if (!token || token !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function searchOneDb(info, criteria, limit, offset) {
  const { db, tableName, columns, isFts, sourceKey } = info;

  const values = criteria.map((c) => (c.value || "").trim()).filter(Boolean);
  if (values.length === 0) return { results: [], total: null };

  if (isFts) {
    const ftsTerms = values.map((v) => `"${v.replace(/"/g, '""')}"`);
    const ftsQuery = ftsTerms.join(" ");

    const fetchLimit = Math.max(limit * 5, 100);
    const rows = db
      .prepare(
        `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE "${tableName}" MATCH ? ORDER BY rank LIMIT ? OFFSET ?`
      )
      .all(ftsQuery, fetchLimit, offset);

    const processed = processResults(rows, sourceKey);
    const filtered = filterResultsByCriteria(processed, criteria);

    return {
      results: filtered.slice(0, limit),
      total: null,
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

    const fetchLimit = Math.max(limit * 5, 100);
    const rows = db
      .prepare(
        `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE ${whereSQL} LIMIT ? OFFSET ?`
      )
      .all(...params, fetchLimit, offset);

    const processed = processResults(rows, sourceKey);
    const filtered = filterResultsByCriteria(processed, criteria);

    return {
      results: filtered.slice(0, limit),
      total: null,
    };
  }
}

app.get("/health", (_req, res) => {
  const dbs = Object.keys(dbCache);
  res.json({ status: "ok", databases: dbs.length, names: dbs });
});

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

    const allResults = [];
    let needed = safeLimit;

    for (const dbInfo of dbs) {
      if (needed <= 0) break;
      try {
        const result = searchOneDb(dbInfo, criteria, needed, safeOffset);
        allResults.push(...result.results);
        needed -= result.results.length;
      } catch (err) {
        console.warn(`[bridge] Error searching ${dbInfo.sourceKey}:`, err.message);
      }
    }

    res.json({ results: allResults, total: allResults.length > 0 ? allResults.length : 0 });
  } catch (err) {
    console.error("[bridge] Search error:", err);
    res.status(500).json({ error: "Internal search error" });
  }
});

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

loadDatabases();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[bridge] Discreen VPS Bridge running on port ${PORT}`);
  console.log(`[bridge] ${Object.keys(dbCache).length} database(s) loaded`);
  if (BRIDGE_SECRET === "CHANGE_ME_TO_A_SECURE_SECRET") {
    console.warn("[bridge] WARNING: Change BRIDGE_SECRET to a secure value!");
  }
});
