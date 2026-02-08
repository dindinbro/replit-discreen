import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { SearchCriterion } from "@shared/schema";
import { syncDatabasesFromS3 } from "./s3sync";

let useRemoteBridge = false;
let remoteBridgeUrl = "";
let remoteBridgeSecret = "";

let SOURCE_MAP: Record<string, string> = {
  index1: "index.db",
  index2: "index2.db",
};

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

function openDb(sourceKey: string): DbInfo | null {
  if (dbCache[sourceKey]) return dbCache[sourceKey];

  const filename = SOURCE_MAP[sourceKey];
  if (!filename) return null;

  const filePath = path.join(getDataDir(), filename);
  if (!fs.existsSync(filePath)) return null;

  const db = new Database(filePath, { readonly: true });
  const { tableName, columns, isFts } = detectMainTable(db);

  const info: DbInfo = { db, tableName, columns, isFts, sourceKey };
  dbCache[sourceKey] = info;
  return info;
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
      results: rows.map((r) => ({ _source: sourceKey, ...r })),
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
      results: rows.map((r) => ({ _source: sourceKey, ...r })),
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
    } catch (err) {
      console.warn(`[searchSqlite] Error counting ${dbInfo.sourceKey}:`, err);
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
    } catch (err) {
      console.warn(`[searchSqlite] Error searching ${info.sourceKey}:`, err);
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

  await syncDatabasesFromS3(dataDir);

  const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith(".db"));
  if (dbFiles.length > 0) {
    SOURCE_MAP = {};
    dbFiles.forEach((filename, i) => {
      const key = filename.replace(/\.db$/, "");
      SOURCE_MAP[key] = filename;
    });
  }

  for (const [key, filename] of Object.entries(SOURCE_MAP)) {
    const filePath = path.join(dataDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        openDb(key);
        console.log(`[searchSqlite] ${key} (${filename}) loaded successfully`);
      } catch (err) {
        console.warn(`[searchSqlite] ${key} (${filename}) could not be loaded:`, err);
      }
    } else {
      console.log(`[searchSqlite] ${key} (${filename}) not found — will be available when the file is added`);
    }
  }
}
