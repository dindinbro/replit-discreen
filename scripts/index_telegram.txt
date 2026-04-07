const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const INPUT_DIR = "D:\\DB\\telegram";
const OUTPUT_DB = "D:\\DB\\telegram\\indexed.db";

const db = new Database(OUTPUT_DB);

db.exec(`
  CREATE TABLE IF NOT EXISTS telegram (
    id          INTEGER PRIMARY KEY,
    telegram_id TEXT,
    pseudo      TEXT,
    numero      TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_telegram_id ON telegram(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_pseudo      ON telegram(pseudo);
  CREATE INDEX IF NOT EXISTS idx_numero      ON telegram(numero);
`);

const insert = db.prepare(`
  INSERT OR IGNORE INTO telegram (telegram_id, pseudo, numero)
  VALUES (@telegram_id, @pseudo, @numero)
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row);
});

const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".txt") || f.endsWith(".sql"));
console.log(`📂 ${files.length} fichier(s) trouvé(s) dans ${INPUT_DIR}\n`);

let totalCount = 0;

for (const file of files) {
  const filePath = path.join(INPUT_DIR, file);
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  let batch = [], fileCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("(")) continue;

    const tokens = [];
    const re = /(\d+)|'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(trimmed)) !== null) {
      tokens.push(m[1] !== undefined ? m[1] : m[2]);
    }
    if (tokens.length < 2) continue;

    const [telegramId, pseudo, numero] = tokens;

    batch.push({
      telegram_id: telegramId || "",
      pseudo:      pseudo     || "",
      numero:      numero     || "",
    });

    if (batch.length >= 5000) {
      insertMany(batch);
      fileCount += batch.length;
      batch = [];
      process.stdout.write(`\r  ⏳ [${file}] ${fileCount} lignes...`);
    }
  }

  if (batch.length) {
    insertMany(batch);
    fileCount += batch.length;
  }

  totalCount += fileCount;
  console.log(`\r  ✅ [${file}] ${fileCount} lignes indexées`);
}

db.close();
console.log(`\n🎉 Total : ${totalCount} lignes → ${OUTPUT_DB}`);
