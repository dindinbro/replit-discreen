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
  columns: string[];
  isFts: boolean;
}

const databases: Map<string, DbEntry> = new Map();

function detectMainTable(db: Database.Database): { tableName: string; columns: string[]; isFts: boolean } {
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

  if (contentTables.length > 0) {
    const ct = contentTables[0];
    const pragma = db.prepare(`PRAGMA table_info("${ct.name}")`).all() as { name: string }[];
    const realCols = pragma.map((p) => p.name).filter(c => c !== "id");
    if (realCols.length > 0) {
      console.log(`[bridge] Content table: "${ct.name}" columns: [${realCols.join(", ")}]`);
      return { tableName: ct.name, columns: realCols, isFts: false };
    }
  }

  if (tables.length > 0) {
    const first = tables[0];
    const pragma = db.prepare(`PRAGMA table_info("${first.name}")`).all() as { name: string }[];
    const cols = pragma.map((p) => p.name);
    console.log(`[bridge] Regular table: "${first.name}" columns: [${cols.join(", ")}]`);
    return { tableName: first.name, columns: cols, isFts: false };
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
      db.pragma("cache_size = -64000");
      const { tableName, columns, isFts } = detectMainTable(db);
      databases.set(key, { db, tableName, columns, isFts });
      const stat = fs.statSync(filePath);
      const sizeMb = (stat.size / 1024 / 1024).toFixed(0);
      console.log(`[bridge] Loaded: ${file} (${sizeMb} MB) → table "${tableName}" (${columns.length} cols)`);
    } catch (err: any) {
      console.error(`[bridge] Failed to load ${file}:`, err?.message);
    }
  }
}

function buildSearchQuery(entry: DbEntry, criteria: { type: string; value: string }[]): { sql: string; params: string[] } {
  const { tableName, columns } = entry;
  const conditions: string[] = [];
  const params: string[] = [];

  const lineCol = columns.find(c => ["line", "content", "c1"].includes(c.toLowerCase()));
  const sourceCol = columns.find(c => ["source", "c0"].includes(c.toLowerCase()));

  if (!lineCol) {
    return { sql: "", params: [] };
  }

  for (const { value } of criteria) {
    if (!value || !value.trim()) continue;
    conditions.push(`"${lineCol}" LIKE ?`);
    params.push(`%${value.trim()}%`);
  }

  if (conditions.length === 0) {
    return { sql: "", params: [] };
  }

  const selectCols = columns.map(c => `"${c}"`).join(", ");
  const sql = `SELECT ${selectCols} FROM "${tableName}" WHERE ${conditions.join(" AND ")}`;

  return { sql, params };
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  const names = Array.from(databases.keys());
  res.json({
    status: "ok",
    databases: databases.size,
    names,
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

  const allResults: Record<string, unknown>[] = [];
  let totalCount = 0;

  const entries = Array.from(databases.entries());
  for (const [key, entry] of entries) {
    try {
      const { sql, params } = buildSearchQuery(entry, criteria);
      if (!sql) continue;

      const limitedSql = `${sql} LIMIT ? OFFSET ?`;
      const allParams = [...params, limit, offset];

      const rows = entry.db.prepare(limitedSql).all(...allParams) as Record<string, unknown>[];

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
    }
  }

  console.log(`[bridge] Search: ${criteria.map((c: any) => `${c.type}=${c.value}`).join(", ")} → ${allResults.length} results`);
  res.json({ results: allResults, total: totalCount });
});

loadDatabases();

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[bridge] Running on port ${PORT} with ${databases.size} database(s)`);
});
