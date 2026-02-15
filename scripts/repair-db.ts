import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const targetFile = process.argv[2] || "discreen.db";
const filePath = path.join(DATA_DIR, targetFile);

console.log(`[repair] Checking: ${filePath}`);

if (!fs.existsSync(filePath)) {
  console.error(`[repair] File not found: ${filePath}`);
  process.exit(1);
}

const stat = fs.statSync(filePath);
console.log(`[repair] File size: ${(stat.size / 1024 / 1024 / 1024).toFixed(2)} GB`);

let db: Database.Database;
try {
  db = new Database(filePath, { readonly: true });
  console.log(`[repair] Database opened successfully (readonly)`);
} catch (err: any) {
  console.error(`[repair] FATAL: Cannot open database: ${err.message}`);
  console.log(`[repair] The file may be too corrupted. Re-download from R2 is needed.`);
  console.log(`  1. rm ${filePath}`);
  console.log(`  2. rclone copy r2:discreen/Discreen.db ${DATA_DIR}/ --transfers=1 --multi-thread-streams=0 --progress`);
  console.log(`  3. mv ${path.join(DATA_DIR, "Discreen.db")} ${filePath}`);
  process.exit(1);
}

try {
  const intCheck = db.pragma("integrity_check(1)") as { integrity_check: string }[];
  const result = intCheck[0]?.integrity_check || "unknown";
  console.log(`[repair] Integrity check: ${result}`);
} catch (err: any) {
  console.warn(`[repair] Integrity check failed: ${err.message}`);
}

try {
  const tables = db.prepare(
    "SELECT name, type FROM sqlite_master WHERE type IN ('table') ORDER BY name"
  ).all() as { name: string; type: string }[];
  console.log(`[repair] Tables found: ${tables.length}`);

  const ftsTables: string[] = [];
  const regularTables: string[] = [];

  for (const t of tables) {
    if (t.name.endsWith("_content") || t.name.endsWith("_data") || t.name.endsWith("_idx") || t.name.endsWith("_docsize") || t.name.endsWith("_config")) {
      continue;
    }
    const pragma = db.prepare(`PRAGMA table_info("${t.name}")`).all() as { name: string }[];
    const cols = pragma.map(p => p.name);

    const isFts = tables.some(other => other.name === `${t.name}_content`);

    if (isFts) {
      ftsTables.push(t.name);
      console.log(`[repair]   FTS5: "${t.name}" — columns: [${cols.join(", ")}]`);
    } else {
      regularTables.push(t.name);
      console.log(`[repair]   Table: "${t.name}" — columns: [${cols.join(", ")}]`);
    }
  }

  const contentTables = tables.filter(t => t.name.endsWith("_content"));
  for (const ct of contentTables) {
    const pragma = db.prepare(`PRAGMA table_info("${ct.name}")`).all() as { name: string }[];
    const cols = pragma.map(p => p.name);
    console.log(`[repair]   Content: "${ct.name}" — columns: [${cols.join(", ")}]`);

    try {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${ct.name}"`).get() as { cnt: number };
      console.log(`[repair]   → ${count.cnt.toLocaleString()} rows`);
    } catch (err: any) {
      console.warn(`[repair]   → Cannot count rows: ${err.message}`);
    }
  }

  for (const ct of contentTables) {
    try {
      const sample = db.prepare(`SELECT * FROM "${ct.name}" LIMIT 3`).all();
      console.log(`[repair]   Sample from "${ct.name}":`, JSON.stringify(sample).slice(0, 500));
    } catch (err: any) {
      console.warn(`[repair]   Cannot read sample from "${ct.name}": ${err.message}`);
    }
  }

  const lineCol = contentTables.length > 0 ? (() => {
    const pragma = db.prepare(`PRAGMA table_info("${contentTables[0].name}")`).all() as { name: string }[];
    const cols = pragma.map(p => p.name).filter(c => c !== "id");
    return cols.find(c => ["c1", "line", "content"].includes(c.toLowerCase())) || cols[0];
  })() : null;

  if (lineCol && contentTables.length > 0) {
    console.log(`\n[repair] Testing LIKE search on "${contentTables[0].name}" column "${lineCol}"...`);
    try {
      const testQuery = `SELECT * FROM "${contentTables[0].name}" WHERE "${lineCol}" LIKE ? LIMIT 5`;
      const testResults = db.prepare(testQuery).all("%test%");
      console.log(`[repair] LIKE search works! Got ${testResults.length} results for "test"`);
    } catch (err: any) {
      console.error(`[repair] LIKE search failed: ${err.message}`);
    }
  }

  if (ftsTables.length > 0) {
    console.log(`\n[repair] Testing FTS5 on "${ftsTables[0]}"...`);
    try {
      const ftsQuery = `SELECT * FROM "${ftsTables[0]}" WHERE "${ftsTables[0]}" MATCH ? LIMIT 5`;
      const ftsResults = db.prepare(ftsQuery).all("test");
      console.log(`[repair] FTS5 works! Got ${ftsResults.length} results`);
    } catch (err: any) {
      console.error(`[repair] FTS5 BROKEN: ${err.message}`);
      console.log(`[repair] The bridge uses LIKE search, NOT FTS5 — this may still work.`);
    }
  }

} catch (err: any) {
  console.error(`[repair] Error examining tables: ${err.message}`);
}

db.close();

console.log(`\n[repair] SUMMARY:`);
console.log(`  The bridge server does NOT use FTS5 — it uses LIKE %value% queries.`);
console.log(`  If the database opens and LIKE queries work, the bridge will function.`);
console.log(`  To start the bridge: pm2 restart ecosystem.config.cjs`);
