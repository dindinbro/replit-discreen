import express from "express";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const PORT = parseInt(process.env.BRIDGE_PORT || "5050", 10);
const BRIDGE_SECRET = process.env.VPS_BRIDGE_SECRET || "";
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

interface DbEntry {
  db: Database.Database;
  tableName: string;
  ftsTableName: string | null;
  contentTableName: string | null;
  columns: string[];
  isFts: boolean;
  ftsWorking: boolean;
}

const databases: Map<string, DbEntry> = new Map();

function detectMainTable(db: Database.Database): {
  tableName: string;
  ftsTableName: string | null;
  contentTableName: string | null;
  columns: string[];
  isFts: boolean;
  ftsWorking: boolean;
} {
  const tables = db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_content' AND name NOT LIKE '%_docsize' AND name NOT LIKE '%_config' AND name NOT LIKE 'sqlite_%'"
    )
    .all() as { name: string; sql: string }[];

  const contentTables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_content'"
    )
    .all() as { name: string }[];

  let ftsTableName: string | null = null;
  let contentTableName: string | null = null;
  let ftsWorking = false;

  if (contentTables.length > 0) {
    contentTableName = contentTables[0].name;
    const baseName = contentTableName.replace(/_content$/, "");

    const ftsExists = tables.some(t => t.name === baseName);
    if (ftsExists) {
      ftsTableName = baseName;
      try {
        db.prepare(`SELECT * FROM "${baseName}" WHERE "${baseName}" MATCH 'test' LIMIT 1`).all();
        ftsWorking = true;
        console.log(`[bridge] FTS5 "${baseName}" is working`);
      } catch (err: any) {
        console.warn(`[bridge] FTS5 "${baseName}" is broken: ${err.message}`);
        ftsWorking = false;
      }
    }

    const pragma = db.prepare(`PRAGMA table_info("${contentTableName}")`).all() as { name: string }[];
    const realCols = pragma.map((p) => p.name).filter(c => c !== "id");
    if (realCols.length > 0) {
      console.log(`[bridge] Content table: "${contentTableName}" columns: [${realCols.join(", ")}]`);
      return { tableName: contentTableName, ftsTableName, contentTableName, columns: realCols, isFts: false, ftsWorking };
    }
  }

  if (tables.length > 0) {
    const first = tables[0];
    const pragma = db.prepare(`PRAGMA table_info("${first.name}")`).all() as { name: string }[];
    const cols = pragma.map((p) => p.name);
    console.log(`[bridge] Regular table: "${first.name}" columns: [${cols.join(", ")}]`);
    return { tableName: first.name, ftsTableName, contentTableName, columns: cols, isFts: false, ftsWorking };
  }

  throw new Error("No usable table found");
}

function loadDatabases(): void {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`[bridge] Data directory not found: ${DATA_DIR}`);
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".db"));
  console.log(`[bridge] Found ${files.length} .db files in ${DATA_DIR}`);

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const key = file.replace(/\.db$/, "").toLowerCase();
    try {
      const db = new Database(filePath, { readonly: true });
      db.pragma("journal_mode = WAL");
      db.pragma("cache_size = -256000");
      db.pragma("mmap_size = 4294967296");
      const info = detectMainTable(db);
      databases.set(key, { db, ...info });
      const stat = fs.statSync(filePath);
      const sizeGb = (stat.size / 1024 / 1024 / 1024).toFixed(1);
      const sizeMb = (stat.size / 1024 / 1024).toFixed(0);
      const sizeStr = stat.size > 1024 * 1024 * 1024 ? `${sizeGb} GB` : `${sizeMb} MB`;
      console.log(`[bridge] Loaded: ${file} (${sizeStr}) → table "${info.tableName}" (${info.columns.length} cols, FTS: ${info.ftsWorking ? "YES" : "NO"})`);
    } catch (err: any) {
      console.error(`[bridge] Failed to load ${file}:`, err?.message);
    }
  }
}

function buildSearchQuery(
  entry: DbEntry,
  criteria: { type: string; value: string }[],
  limit: number
): { sql: string; params: (string | number)[] } {
  const values = criteria.map(c => c.value?.trim()).filter(Boolean);
  if (values.length === 0) return { sql: "", params: [] };

  if (entry.ftsWorking && entry.ftsTableName) {
    const ftsTerms = values.map(v => `"${v.replace(/"/g, '""')}"`).join(" ");
    const sql = `SELECT * FROM "${entry.ftsTableName}" WHERE "${entry.ftsTableName}" MATCH ? LIMIT ?`;
    return { sql, params: [ftsTerms, limit] };
  }

  const { tableName, columns } = entry;
  const lineCol = columns.find(c => ["line", "content", "c1"].includes(c.toLowerCase()));
  if (!lineCol) return { sql: "", params: [] };

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  for (const value of values) {
    conditions.push(`"${lineCol}" LIKE ?`);
    params.push(`%${value}%`);
  }

  const selectCols = columns.map(c => `"${c}"`).join(", ");
  const sql = `SELECT ${selectCols} FROM "${tableName}" WHERE ${conditions.join(" AND ")} LIMIT ?`;
  params.push(limit);

  return { sql, params };
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  const names = Array.from(databases.keys());
  const details: Record<string, { ftsWorking: boolean; table: string }> = {};
  databases.forEach((v, k) => {
    details[k] = { ftsWorking: v.ftsWorking, table: v.tableName };
  });
  res.json({
    status: "ok",
    databases: databases.size,
    names,
    details,
  });
});

app.post("/search", (req, res) => {
  const secret = req.headers["x-bridge-secret"] as string || "";
  if (BRIDGE_SECRET && secret !== BRIDGE_SECRET) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const { criteria, limit = 100, offset = 0 } = req.body;
  if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
    res.json({ results: [], total: 0 });
    return;
  }

  const cappedLimit = Math.min(limit, 500);
  const allResults: Record<string, unknown>[] = [];
  let totalCount = 0;
  const searchStart = Date.now();

  const entries = Array.from(databases.entries());
  for (const [key, entry] of entries) {
    try {
      const { sql, params } = buildSearchQuery(entry, criteria, cappedLimit);
      if (!sql) continue;

      const queryStart = Date.now();
      const rows = entry.db.prepare(sql).all(...params) as Record<string, unknown>[];
      const queryMs = Date.now() - queryStart;

      console.log(`[bridge] Query on ${key}: ${rows.length} rows in ${queryMs}ms (${entry.ftsWorking ? "FTS" : "LIKE"})`);

      const colMap: Record<string, string> = {};
      for (const col of entry.columns) {
        const lower = col.toLowerCase();
        if (lower === "c0" || lower === "source") colMap[col] = "source";
        else if (lower === "c1" || lower === "line" || lower === "content") colMap[col] = "line";
        else if (lower === "c2" || lower === "rownum") colMap[col] = "rownum";
        else colMap[col] = col;
      }

      for (const row of rows) {
        const mapped: Record<string, unknown> = {};
        for (const [origCol, mappedName] of Object.entries(colMap)) {
          mapped[mappedName] = row[origCol];
        }
        allResults.push(mapped);
      }
      totalCount += rows.length;
    } catch (err: any) {
      console.error(`[bridge] Search error on ${key}:`, err?.message);

      if (entry.ftsWorking && err?.message?.includes("fts5")) {
        console.warn(`[bridge] FTS5 failed at runtime on ${key}, disabling FTS`);
        entry.ftsWorking = false;
      }
    }
  }

  const totalMs = Date.now() - searchStart;
  console.log(`[bridge] Search: ${criteria.map((c: any) => `${c.type}=${c.value}`).join(", ")} → ${allResults.length} results in ${totalMs}ms`);
  res.json({ results: allResults, total: totalCount });
});

loadDatabases();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[bridge] Running on 0.0.0.0:${PORT} with ${databases.size} database(s)`);
});
