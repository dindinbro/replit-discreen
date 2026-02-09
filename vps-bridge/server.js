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

function classifyPart(p) {
  const trimmed = (p || "").trim();
  if (!trimmed) return null;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) return "ip";
  if (/^(\+?\d[\d\s\-().]{6,})$/.test(trimmed) && /\d{7,}/.test(trimmed.replace(/\D/g, ""))) return "telephone";
  if (/^[a-f0-9]{32,128}$/i.test(trimmed)) return "hash";
  if (/^https?:\/\//i.test(trimmed)) return "url";
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/i.test(trimmed)) return "iban";
  if (/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(trimmed) && trimmed.length >= 8 && trimmed.length <= 11) return "bic";
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(trimmed)) return "date_naissance";
  if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(trimmed)) return "date_naissance";
  if (/^\d{5}$/.test(trimmed) && parseInt(trimmed) >= 1000 && parseInt(trimmed) <= 99999) return "code_postal";
  if (/^\d+[\s,]+/.test(trimmed) && /[a-zA-ZÀ-ÿ]/.test(trimmed) && trimmed.length > 5) return "adresse";
  if (/^(mr|mrs|mme|mlle|m\.|monsieur|madame|mademoiselle|homme|femme|male|female|man|woman|his|her|him|h|f|m)$/i.test(trimmed)) return "civilite";
  if (/^[A-Z0-9]{11,17}$/i.test(trimmed) && /\d/.test(trimmed) && /[A-Z]/i.test(trimmed)) {
    if (trimmed.length === 17) return "vin";
  }
  if (/^[a-f0-9]{40}:[a-f0-9]+$/i.test(trimmed)) return "hash";

  return null;
}

function parseLineField(line, source) {
  const parsed = {};

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
    const cls = classifyPart(p);
    if (cls && !parsed[cls]) {
      parsed[cls] = p;
      assigned.add(i);
    }
  }

  const unassigned = parts.filter((_, i) => !assigned.has(i)).filter(Boolean);

  if (unassigned.length > 0 && !parsed["identifiant"] && !parsed["email"]) {
    parsed["identifiant"] = unassigned.shift();
  } else if (unassigned.length >= 2 && !parsed["identifiant"]) {
    parsed["identifiant"] = unassigned.shift();
  }

  if (unassigned.length > 0 && !parsed["password"] && !parsed["hash"]) {
    const next = unassigned[0];
    if (next && /^[a-f0-9]{32,128}$/i.test(next)) {
      parsed["hash"] = unassigned.shift();
    } else {
      parsed["password"] = unassigned.shift();
    }
  }

  if (unassigned.length > 0) {
    let foundPostalCode = !!parsed["code_postal"];
    for (let i = 0; i < unassigned.length; i++) {
      const u = unassigned[i];
      const cls = classifyPart(u);
      if (cls && !parsed[cls]) {
        parsed[cls] = u;
        if (cls === "code_postal") foundPostalCode = true;
        continue;
      }
      if (foundPostalCode && !parsed["ville"] && /^[a-zA-ZÀ-ÿ\s\-']+$/.test(u) && u.length >= 2) {
        parsed["ville"] = u;
        foundPostalCode = false;
        continue;
      }
      if (!parsed["nom"] && /^[a-zA-ZÀ-ÿ\s\-']+$/.test(u) && u.length >= 2 && u.length <= 30) {
        parsed["nom"] = u;
        continue;
      }
      if (!parsed["prenom"] && /^[a-zA-ZÀ-ÿ\s\-']+$/.test(u) && u.length >= 2 && u.length <= 30 && parsed["nom"]) {
        parsed["prenom"] = u;
        continue;
      }
      parsed[`champ_${i + 1}`] = u;
    }
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
  username: ["identifiant", "username", "pseudo", "nom"],
  displayName: ["identifiant", "username", "pseudo", "nom", "name", "prenom"],
  lastName: ["nom", "name", "last_name", "lastname", "surname", "identifiant"],
  firstName: ["prenom", "first_name", "firstname", "identifiant", "nom"],
  phone: ["telephone", "phone", "tel", "mobile"],
  ipAddress: ["ip"],
  address: ["adresse", "address", "rue", "street", "ville", "city", "code_postal"],
  ssn: ["ssn"],
  dob: ["date_naissance", "birthday", "dob", "birth", "date", "bday"],
  yob: ["date_naissance", "birthday", "dob", "birth", "date", "bday"],
  iban: ["iban"],
  bic: ["bic"],
  password: ["password", "hash"],
  hashedPassword: ["hash", "password"],
  discordId: ["discord"],
  macAddress: ["mac"],
  gender: ["gender", "civilite"],
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
    console.log(`[bridge:searchOneDb] FTS on "${sourceKey}": MATCH '${ftsQuery}' LIMIT ${fetchLimit}`);
    const rows = db
      .prepare(
        `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE "${tableName}" MATCH ? ORDER BY rank LIMIT ? OFFSET ?`
      )
      .all(ftsQuery, fetchLimit, offset);
    console.log(`[bridge:searchOneDb] FTS returned ${rows.length} raw rows`);
    if (rows.length > 0) console.log(`[bridge:searchOneDb] Sample row keys: ${Object.keys(rows[0]).join(", ")}`);

    const processed = processResults(rows, sourceKey);
    const filtered = filterResultsByCriteria(processed, criteria);
    console.log(`[bridge:searchOneDb] After filter: ${filtered.length}/${processed.length}`);

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
