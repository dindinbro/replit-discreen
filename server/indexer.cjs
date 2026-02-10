#!/usr/bin/env node

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const BATCH_SIZE = 5000;

const HELP = `
=== Discreen Database Indexer ===

Usage:
  node indexer.cjs <command> [options]

Commands:
  add <db> <file/folder>    Index un fichier ou tous les fichiers d'un dossier
  stats <db>                Affiche les statistiques de la base
  clear <db>                Vide completement la base (ATTENTION!)
  delete <db> <source>      Supprime toutes les lignes d'une source
  sources <db>              Liste toutes les sources indexees
  search <db> <query>       Recherche rapide dans la base

<db> = "index" ou "incoming" (correspond a index.db ou incoming.db)

Exemples:
  node indexer.cjs add index ./dumps/breach_2024.txt
  node indexer.cjs add index ./dumps/
  node indexer.cjs add incoming ./new_data/leak.csv
  node indexer.cjs stats index
  node indexer.cjs sources index
  node indexer.cjs delete index breach_2024.txt
  node indexer.cjs search index "john.doe@gmail.com"
  node indexer.cjs clear incoming
`;

function getDbPath(dbName) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (dbName === "index") return path.join(dataDir, "index.db");
  if (dbName === "incoming") return path.join(dataDir, "incoming.db");
  console.error(`Base inconnue: "${dbName}". Utilise "index" ou "incoming".`);
  process.exit(1);
}

function openDb(dbName) {
  const dbPath = getDbPath(dbName);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = normal");
  db.pragma("cache_size = -64000");
  db.exec(
    "CREATE VIRTUAL TABLE IF NOT EXISTS records USING fts5(source, content);"
  );
  return db;
}

async function indexFile(db, filePath) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log(`\nIndexation de: ${fileName} (${fileSizeMB} MB)`);

  const insert = db.prepare(
    "INSERT INTO records (source, content) VALUES (?, ?)"
  );

  let lineCount = 0;
  let skipped = 0;
  let batch = [];

  const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const insertBatch = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(row.source, row.content);
    }
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) {
      skipped++;
      continue;
    }

    batch.push({ source: fileName, content: trimmed });
    lineCount++;

    if (batch.length >= BATCH_SIZE) {
      insertBatch(batch);
      process.stdout.write(
        `\r  ${lineCount.toLocaleString("fr-FR")} lignes indexees...`
      );
      batch = [];
    }
  }

  if (batch.length > 0) {
    insertBatch(batch);
  }

  console.log(
    `\r  ${lineCount.toLocaleString("fr-FR")} lignes indexees, ${skipped.toLocaleString("fr-FR")} ignorees (vides/trop courtes)`
  );
  return lineCount;
}

const SUPPORTED_EXT = [".txt", ".csv", ".log", ".json", ".tsv", ".sql", ".dat"];

function findAllFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findAllFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXT.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

async function indexPath(db, targetPath) {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return await indexFile(db, targetPath);
  }

  if (stat.isDirectory()) {
    const files = findAllFiles(targetPath).sort();

    if (files.length === 0) {
      console.log("Aucun fichier compatible trouve dans le dossier et sous-dossiers.");
      console.log("Extensions supportees: " + SUPPORTED_EXT.join(", "));
      return 0;
    }

    console.log(`${files.length} fichier(s) trouves dans ${targetPath} (sous-dossiers inclus)\n`);
    let total = 0;
    let filesDone = 0;

    for (const file of files) {
      filesDone++;
      console.log(`[${filesDone}/${files.length}]`);
      total += await indexFile(db, file);
    }

    console.log(`\nTotal: ${total.toLocaleString("fr-FR")} lignes indexees depuis ${files.length} fichier(s)`);
    return total;
  }
}

function showStats(db) {
  const count = db.prepare("SELECT count(*) as c FROM records").get();
  const sources = db
    .prepare(
      "SELECT source, count(*) as c FROM records GROUP BY source ORDER BY c DESC"
    )
    .all();

  console.log(`\nTotal: ${count.c.toLocaleString("fr-FR")} lignes`);
  console.log(`Sources: ${sources.length}`);
  console.log("\nTop 20 sources:");
  sources.slice(0, 20).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.source} (${s.c.toLocaleString("fr-FR")} lignes)`);
  });
}

function listSources(db) {
  const sources = db
    .prepare(
      "SELECT source, count(*) as c FROM records GROUP BY source ORDER BY source"
    )
    .all();

  console.log(`\n${sources.length} source(s):\n`);
  sources.forEach((s) => {
    console.log(`  ${s.source} - ${s.c.toLocaleString("fr-FR")} lignes`);
  });
}

function deleteSource(db, source) {
  const count = db
    .prepare("SELECT count(*) as c FROM records WHERE source = ?")
    .get(source);
  if (count.c === 0) {
    console.log(`Aucune ligne trouvee pour la source "${source}".`);
    return;
  }

  db.prepare("DELETE FROM records WHERE source = ?").run(source);
  console.log(
    `${count.c.toLocaleString("fr-FR")} lignes supprimees pour "${source}".`
  );
}

function clearDb(db, dbName) {
  const count = db.prepare("SELECT count(*) as c FROM records").get();
  console.log(
    `ATTENTION: Suppression de ${count.c.toLocaleString("fr-FR")} lignes de ${dbName}.db`
  );
  db.prepare("DELETE FROM records").run();
  console.log("Base videe.");
}

function searchDb(db, query) {
  const sanitized = `"${query.replace(/"/g, '""')}"`;
  const results = db
    .prepare(
      "SELECT source, content FROM records WHERE records MATCH ? ORDER BY rank LIMIT 20"
    )
    .all(sanitized);

  if (results.length === 0) {
    console.log("Aucun resultat.");
    return;
  }

  console.log(`\n${results.length} resultat(s):\n`);
  results.forEach((r) => {
    console.log(`  [${r.source}] ${r.content}`);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];

  if (command === "add") {
    if (args.length < 3) {
      console.error("Usage: node indexer.cjs add <index|incoming> <fichier ou dossier>");
      process.exit(1);
    }
    const db = openDb(args[1]);
    const target = path.resolve(args[2]);

    if (!fs.existsSync(target)) {
      console.error(`Fichier/dossier introuvable: ${target}`);
      process.exit(1);
    }

    const start = Date.now();
    await indexPath(db, target);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Temps: ${elapsed}s`);
    db.close();
  } else if (command === "stats") {
    if (args.length < 2) {
      console.error("Usage: node indexer.cjs stats <index|incoming>");
      process.exit(1);
    }
    const db = openDb(args[1]);
    showStats(db);
    db.close();
  } else if (command === "sources") {
    if (args.length < 2) {
      console.error("Usage: node indexer.cjs sources <index|incoming>");
      process.exit(1);
    }
    const db = openDb(args[1]);
    listSources(db);
    db.close();
  } else if (command === "delete") {
    if (args.length < 3) {
      console.error("Usage: node indexer.cjs delete <index|incoming> <source>");
      process.exit(1);
    }
    const db = openDb(args[1]);
    deleteSource(db, args[2]);
    db.close();
  } else if (command === "clear") {
    if (args.length < 2) {
      console.error("Usage: node indexer.cjs clear <index|incoming>");
      process.exit(1);
    }
    const db = openDb(args[1]);
    clearDb(db, args[1]);
    db.close();
  } else if (command === "search") {
    if (args.length < 3) {
      console.error('Usage: node indexer.cjs search <index|incoming> "query"');
      process.exit(1);
    }
    const db = openDb(args[1]);
    searchDb(db, args[2]);
    db.close();
  } else {
    console.log(HELP);
  }
}

main().catch(console.error);
