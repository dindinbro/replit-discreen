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

function parseLineField(line: string, source: string): Record<string, string> {
  const parsed: Record<string, string> = {};

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
      parsed["identifiant"] = unassigned.shift()!;
    }
  }
  if (unassigned.length > 0) {
    const next = unassigned[0];
    if (next && hashRegex.test(next) && next.length >= 32 && !parsed["hash"]) {
      parsed["hash"] = unassigned.shift()!;
    } else if (next && !parsed["password"]) {
      parsed["password"] = unassigned.shift()!;
    }
  }
  for (let i = 0; i < unassigned.length; i++) {
    parsed[`champ_${i + 1}`] = unassigned[i];
  }

  if (source) parsed["source"] = source;
  return parsed;
}

function processResults(rows: Record<string, string>[], sourceKey: string): Record<string, unknown>[] {
  return rows.map((r) => {
    const line = r["line"] || r["data"] || r["content"] || "";
    const source = r["source"] || "";

    if (line && typeof line === "string" && line.length > 0) {
      const parsed = parseLineField(line, source);
      return { _source: sourceKey, _raw: line, ...parsed };
    }

    const { rownum, ...rest } = r;
    return { _source: sourceKey, ...rest };
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

    const countStmt = db.prepare(
      `SELECT count(*) as total FROM "${tableName}" WHERE "${tableName}" MATCH ?`
    );
    const countRow = countStmt.get(ftsQuery) as { total: number };

    const selectStmt = db.prepare(
      `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE "${tableName}" MATCH ? ORDER BY rank LIMIT ? OFFSET ?`
    );
    const rows = selectStmt.all(ftsQuery, limit, offset) as Record<string, string>[];

    return {
      results: processResults(rows, sourceKey),
      total: countRow.total,
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

    const countStmt = db.prepare(
      `SELECT count(*) as total FROM "${tableName}" WHERE ${whereSQL}`
    );
    const countRow = countStmt.get(...params) as { total: number };

    const selectStmt = db.prepare(
      `SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${tableName}" WHERE ${whereSQL} LIMIT ? OFFSET ?`
    );
    const rows = selectStmt.all(...params, limit, offset) as Record<string, string>[];

    return {
      results: processResults(rows, sourceKey),
      total: countRow.total,
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
      body: JSON.stringify({ criteria, limit, offset }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error(`[searchSqlite] Remote bridge error: ${res.status} ${res.statusText}`);
      return { results: [], total: 0 };
    }

    const data = await res.json() as SearchResult;
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
    return searchRemoteBridge(filled, safeLimit, safeOffset);
  }

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

  let totalCount = 0;
  const dbTotals: { info: DbInfo; total: number }[] = [];

  for (const dbInfo of dbs) {
    try {
      const countResult = searchOneDb(dbInfo, criteria, 0, 0);
      const t = countResult.total ?? 0;
      totalCount += t;
      dbTotals.push({ info: dbInfo, total: t });
    } catch (err: any) {
      console.warn(`[searchSqlite] Error counting ${dbInfo.sourceKey}:`, err?.message);
      if (err?.code === "SQLITE_CORRUPT") {
        failedDbs.add(dbInfo.sourceKey);
        delete dbCache[dbInfo.sourceKey];
      }
    }
  }

  let remaining = offset;
  const allResults: Record<string, unknown>[] = [];
  let needed = limit;

  for (const { info, total } of dbTotals) {
    if (needed <= 0) break;

    if (remaining >= total) {
      remaining -= total;
      continue;
    }

    try {
      const result = searchOneDb(info, criteria, needed, remaining);
      allResults.push(...result.results);
      needed -= result.results.length;
      remaining = 0;
    } catch (err: any) {
      console.warn(`[searchSqlite] Error searching ${info.sourceKey}:`, err?.message);
      if (err?.code === "SQLITE_CORRUPT") {
        failedDbs.add(info.sourceKey);
        delete dbCache[info.sourceKey];
      }
    }
  }

  return {
    results: allResults,
    total: totalCount,
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
          info.db.prepare(`SELECT count(*) FROM "${info.tableName}" LIMIT 1`).get();
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
