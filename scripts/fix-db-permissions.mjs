import { readFileSync } from "fs";
import { createRequire } from "module";

// Load .env manually
try {
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const require = createRequire(import.meta.url);
const pg = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL non définie dans .env");
  process.exit(1);
}

// Extract current user from URL
const userMatch = url.match(/postgresql?:\/\/([^:@]+)/);
const dbUser = userMatch ? userMatch[1] : "discreen";

console.log(`🔧 Connexion à la DB (user: ${dbUser})...`);

const pool = new pg.Pool({ connectionString: url, ssl: false });

const queries = [
  `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO "${dbUser}"`,
  `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${dbUser}"`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`,
];

let ok = 0;
let fail = 0;

for (const q of queries) {
  try {
    await pool.query(q);
    console.log(`  ✅ ${q.slice(0, 60)}...`);
    ok++;
  } catch (e) {
    console.log(`  ⚠️  ${q.slice(0, 60)}... → ${e.message}`);
    fail++;
  }
}

await pool.end();

if (fail === 0) {
  console.log(`\n✅ Toutes les permissions sont correctes. Redémarre pm2 :`);
  console.log(`   pm2 restart ecosystem.config.cjs`);
} else if (ok > 0) {
  console.log(`\n⚠️  ${ok}/${ok + fail} permissions appliquées. Redémarre pm2 :`);
  console.log(`   pm2 restart ecosystem.config.cjs`);
} else {
  console.log(`\n❌ Impossible d'appliquer les permissions via DATABASE_URL.`);
  console.log(`   L'utilisateur "${dbUser}" n'est pas propriétaire des séquences.`);
  console.log(`\n   Essaie avec TCP (bypasse l'auth peer) :`);
  console.log(`   psql -h 127.0.0.1 -U postgres -d discreen -W -c "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${dbUser}; GRANT ALL ON ALL TABLES IN SCHEMA public TO ${dbUser};"`);
  console.log(`\n   Ou via su :`);
  console.log(`   su postgres -c 'psql -d discreen -c "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${dbUser};"'`);
}
