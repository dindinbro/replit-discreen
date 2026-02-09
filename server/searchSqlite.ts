import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { SearchCriterion } from "@shared/schema";
import { syncDatabasesFromS3 } from "./s3sync";

let useRemoteBridge = false;
let remoteBridgeUrl = "";
let remoteBridgeSecret = "";

let SOURCE_MAP: Record<string, string> = {};

interface DbInfo {
  db: Database.Database;
  tableName: string;
  columns: string[];
  isFts: boolean;
  sourceKey: string;
}

const dbCache: Record<string, DbInfo> = {};

function getDataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "server", "data");
}

function detectMainTable(db: Database.Database): { tableName: string; columns: string[]; isFts: boolean } {
  const tables = db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_content' AND name NOT LIKE '%_docsize' AND name NOT LIKE '%_config' AND name NOT LIKE 'sqlite_%'"
    )
    .all() as { name: string; sql: string }[];

  for (const t of tables) {
    if (t.sql && t.sql.toUpperCase().includes("USING FTS5")) {
      const colMatch = t.sql.match(/fts5\(([^)]+)\)/i);
      if (colMatch) {
        const cols = colMatch[1].split(",").map((c) => c.trim().split(/\s+/)[0]);
        console.log(`[searchSqlite] FTS5 table detected: "${t.name}" columns: [${cols.join(", ")}]`);
        return { tableName: t.name, columns: cols, isFts: true };
      }
    }
  }

  if (tables.length > 0) {
    const first = tables[0];
    const pragma = db.prepare(`PRAGMA table_info("${first.name}")`).all() as { name: string }[];
    const cols = pragma.map((p) => p.name);
    console.log(`[searchSqlite] Regular table detected: "${first.name}" columns: [${cols.join(", ")}]`);
    return { tableName: first.name, columns: cols, isFts: false };
  }

  throw new Error("No usable table found in database");
}

const failedDbs = new Set<string>();

function openDb(sourceKey: string): DbInfo | null {
  if (dbCache[sourceKey]) return dbCache[sourceKey];
  if (failedDbs.has(sourceKey)) return null;

  const filename = SOURCE_MAP[sourceKey];
  if (!filename) return null;

  const filePath = path.join(getDataDir(), filename);
  if (!fs.existsSync(filePath)) return null;

  try {
    const db = new Database(filePath, { readonly: true });
    const { tableName, columns, isFts } = detectMainTable(db);

    const info: DbInfo = { db, tableName, columns, isFts, sourceKey };
    dbCache[sourceKey] = info;
    return info;
  } catch (err) {
    console.warn(`[searchSqlite] ${sourceKey} (${filename}) failed to open, skipping:`, (err as Error).message);
    failedDbs.add(sourceKey);
    return null;
  }
}

function getAvailableDbs(): DbInfo[] {
  const available: DbInfo[] = [];
  for (const key of Object.keys(SOURCE_MAP)) {
    const info = openDb(key);
    if (info) available.push(info);
  }
  return available;
}

export interface SearchResult {
  results: Record<string, unknown>[];
  total: number | null;
}

function classifyPart(p: string): string | null {
  const trimmed = p.trim();
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

function parseLineField(line: string, source: string): Record<string, string> {
  const parsed: Record<string, string> = {};

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

  let parts: string[];
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

  const assigned = new Set<number>();

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
    parsed["identifiant"] = unassigned.shift()!;
  } else if (unassigned.length >= 2 && !parsed["identifiant"]) {
    parsed["identifiant"] = unassigned.shift()!;
  }

  if (unassigned.length > 0 && !parsed["password"] && !parsed["hash"]) {
    const next = unassigned[0];
    if (next && /^[a-f0-9]{32,128}$/i.test(next)) {
      parsed["hash"] = unassigned.shift()!;
    } else {
      parsed["password"] = unassigned.shift()!;
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

function getFieldCI(r: Record<string, string>, ...keys: string[]): string {
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

function processResults(rows: Record<string, string>[], sourceKey: string): Record<string, unknown>[] {
  return rows.map((r) => {
    const line = getFieldCI(r, "line", "data", "content");
    const source = getFieldCI(r, "source");

    if (line && typeof line === "string" && line.length > 0) {
      const parsed = parseLineField(line, source);
      return { _source: sourceKey, _raw: line, ...parsed };
    }

    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      if (k.toLowerCase() !== "rownum") {
        cleaned[k] = v;
      }
    }
    return { _source: sourceKey, ...cleaned };
  });
}

const CRITERION_TO_PARSED_FIELDS: Record<string, string[]> = {
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

function filterResultsByCriteria(
  results: Record<string, unknown>[],
  criteria: SearchCriterion[]
): Record<string, unknown>[] {
  if (criteria.length === 0) return results;

  return results.filter((row) => {
    for (const criterion of criteria) {
      const allowedFields = CRITERION_TO_PARSED_FIELDS[criterion.type];
      if (!allowedFields) continue;
      const searchVal = criterion.value.trim().toLowerCase();
      if (!searchVal) continue;

      let foundInAllowedField = false;
      for (const [key, val] of Object.entries(row)) {
        if (key.startsWith("_")) continue;
        const keyLower = key.toLowerCase();
        if (allowedFields.includes(keyLower)) {
          const strVal = String(val ?? "").toLowerCase();
          if (strVal.includes(searchVal)) {
            foundInAllowedField = true;
            break;
          }
        }
      }

      if (!foundInAllowedField) {
        const raw = String(row["_raw"] ?? "").toLowerCase();
        if (raw.includes(searchVal)) {
          foundInAllowedField = true;
        }
      }

      if (!foundInAllowedField) {
        let foundAnywhere = false;
        for (const [key, val] of Object.entries(row)) {
          if (key.startsWith("_")) continue;
          const strVal = String(val ?? "").toLowerCase();
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

function searchOneDb(
  info: DbInfo,
  criteria: SearchCriterion[],
  limit: number,
  offset: number
): SearchResult {
  const { db, tableName, columns, isFts, sourceKey } = info;

  const values = criteria.map((c) => c.value.trim()).filter(Boolean);
  if (values.length === 0) return { results: [], total: 0 };

  if (isFts) {
    const ftsTerms = values.map((v) => `"${v.replace(/"/g, '""')}"`);
    const ftsQuery = ftsTerms.join(" ");

    const fetchLimit = Math.max(limit * 5, 100);
    console.log(`[searchOneDb] FTS query on "${sourceKey}": MATCH '${ftsQuery}' LIMIT ${fetchLimit} OFFSET ${offset}`);
    const selectStmt = db.prepare(
      `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE "${tableName}" MATCH ? ORDER BY rank LIMIT ? OFFSET ?`
    );
    const rows = selectStmt.all(ftsQuery, fetchLimit, offset) as Record<string, string>[];
    console.log(`[searchOneDb] FTS returned ${rows.length} raw rows from "${sourceKey}"`);

    const processed = processResults(rows, sourceKey);
    const filtered = filterResultsByCriteria(processed, criteria);
    console.log(`[searchOneDb] After filter: ${filtered.length} results (from ${processed.length} processed)`);

    return {
      results: filtered.slice(0, limit),
      total: null,
    };
  } else {
    const conditions: string[] = [];
    const params: string[] = [];

    for (const val of values) {
      const orParts = columns.map((c) => `"${c}" LIKE ?`);
      conditions.push(`(${orParts.join(" OR ")})`);
      for (const _c of columns) {
        params.push(`%${val}%`);
      }
    }

    const whereSQL = conditions.join(" AND ");

    const fetchLimit = Math.max(limit * 5, 100);
    const selectStmt = db.prepare(
      `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE ${whereSQL} LIMIT ? OFFSET ?`
    );
    const rows = selectStmt.all(...params, fetchLimit, offset) as Record<string, string>[];

    const processed = processResults(rows, sourceKey);
    const filtered = filterResultsByCriteria(processed, criteria);
    return {
      results: filtered.slice(0, limit),
      total: null,
    };
  }
}

async function searchRemoteBridge(
  criteria: SearchCriterion[],
  limit: number,
  offset: number
): Promise<SearchResult> {
  try {
    const res = await fetch(`${remoteBridgeUrl}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Secret": remoteBridgeSecret,
      },
      body: JSON.stringify({ criteria, limit: limit * 5, offset }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error(`[searchSqlite] Remote bridge error: ${res.status} ${res.statusText}`);
      return { results: [], total: 0 };
    }

    const data = await res.json() as SearchResult;
    console.log(`[searchRemoteBridge] Bridge returned ${data.results?.length ?? 0} results`);

    if (data.results && data.results.length > 0) {
      const firstRow = data.results[0];
      const hasRawFields = Object.keys(firstRow).some(k => 
        ["Line", "line", "Content", "content", "Rownum", "rownum", "Source", "source"].includes(k)
      );
      const hasParsedFields = Object.keys(firstRow).some(k => 
        ["_source", "_raw", "email", "identifiant", "password", "telephone"].includes(k)
      );

      if (hasRawFields && !hasParsedFields) {
        const processed = processResults(
          data.results as unknown as Record<string, string>[],
          "discreen"
        );
        const filtered = filterResultsByCriteria(processed, criteria);
        return {
          results: filtered.slice(0, limit) as SearchResult["results"],
          total: data.total,
        };
      }
    }

    return data;
  } catch (err) {
    console.error("[searchSqlite] Remote bridge request failed:", err);
    return { results: [], total: 0 };
  }
}

export function searchAllIndexes(
  criteria: SearchCriterion[],
  limit: number = 20,
  offset: number = 0
): SearchResult | Promise<SearchResult> {
  const filled = criteria.filter((c) => c.value.trim());
  if (filled.length === 0) {
    return { results: [], total: 0 };
  }

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const safeOffset = Math.max(0, offset);

  if (useRemoteBridge) {
    console.log(`[searchAllIndexes] Using REMOTE BRIDGE for ${filled.length} criteria`);
    return searchRemoteBridge(filled, safeLimit, safeOffset);
  }

  console.log(`[searchAllIndexes] Using LOCAL search for ${filled.length} criteria`);
  return searchLocal(filled, safeLimit, safeOffset);
}

function searchLocal(
  criteria: SearchCriterion[],
  limit: number,
  offset: number
): SearchResult {
  const dbs = getAvailableDbs();
  if (dbs.length === 0) {
    return { results: [], total: 0 };
  }

  const allResults: Record<string, unknown>[] = [];
  let needed = limit;

  for (const dbInfo of dbs) {
    if (needed <= 0) break;
    try {
      const result = searchOneDb(dbInfo, criteria, needed, offset);
      allResults.push(...result.results);
      needed -= result.results.length;
    } catch (err: any) {
      console.warn(`[searchSqlite] Error searching ${dbInfo.sourceKey}:`, err?.message);
      if (err?.code === "SQLITE_CORRUPT") {
        failedDbs.add(dbInfo.sourceKey);
        delete dbCache[dbInfo.sourceKey];
      }
    }
  }

  return {
    results: allResults,
    total: allResults.length,
  };
}

export async function initSearchDatabases(): Promise<void> {
  const vpsUrl = process.env.VPS_SEARCH_URL;
  const vpsSecret = process.env.VPS_BRIDGE_SECRET;

  if (vpsUrl) {
    remoteBridgeUrl = vpsUrl.replace(/\/+$/, "");
    remoteBridgeSecret = vpsSecret || "";
    useRemoteBridge = true;
    console.log(`[searchSqlite] Remote VPS bridge configured: ${remoteBridgeUrl}`);

    try {
      const healthRes = await fetch(`${remoteBridgeUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (healthRes.ok) {
        const health = await healthRes.json() as { databases: number; names: string[] };
        console.log(`[searchSqlite] VPS bridge online: ${health.databases} database(s) [${health.names?.join(", ")}]`);
      } else {
        console.warn(`[searchSqlite] VPS bridge health check failed: ${healthRes.status}`);
      }
    } catch (err) {
      console.warn("[searchSqlite] VPS bridge health check failed — will retry on search:", err);
    }
    return;
  }

  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (process.env.SKIP_S3_SYNC === "true") {
    console.log("[s3sync] SKIP_S3_SYNC=true — skipping remote sync");
  } else {
    await syncDatabasesFromS3(dataDir);
  }

  const BLACKLISTED_FILES = new Set(["index2.db"]);
  const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith(".db") && !BLACKLISTED_FILES.has(f));
  if (dbFiles.length > 0) {
    SOURCE_MAP = {};
    dbFiles.forEach((filename, i) => {
      const key = filename.replace(/\.db$/, "");
      SOURCE_MAP[key] = filename;
    });
  }

  const keysToRemove: string[] = [];
  for (const [key, filename] of Object.entries(SOURCE_MAP)) {
    const filePath = path.join(dataDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const info = openDb(key);
        if (info) {
          info.db.prepare(`SELECT 1 FROM "${info.tableName}" LIMIT 1`).get();
          console.log(`[searchSqlite] ${key} (${filename}) loaded and verified`);
        } else {
          keysToRemove.push(key);
        }
      } catch (err: any) {
        console.warn(`[searchSqlite] ${key} (${filename}) failed verification, removing:`, err?.message);
        failedDbs.add(key);
        delete dbCache[key];
        keysToRemove.push(key);
      }
    } else {
      console.log(`[searchSqlite] ${key} (${filename}) not found — skipping`);
      keysToRemove.push(key);
    }
  }
  for (const k of keysToRemove) {
    delete SOURCE_MAP[k];
  }
  console.log(`[searchSqlite] Active databases: ${Object.keys(SOURCE_MAP).join(", ") || "none"}`);
}
