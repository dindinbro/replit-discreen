import "dotenv/config";

const REQUIRED = [
  { key: "DATABASE_URL", label: "PostgreSQL" },
  { key: "VITE_SUPABASE_URL", label: "Supabase URL", alt: "SUPABASE_URL" },
  { key: "VITE_SUPABASE_ANON_KEY", label: "Supabase Anon Key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Key" },
  { key: "DISCORD_BOT_TOKEN", label: "Discord Bot Token" },
  { key: "DISCORD_CLIENT_ID", label: "Discord Client ID" },
];

const OPTIONAL = [
  { key: "NOWPAYMENTS_API_KEY", label: "NOWPayments (paiements)" },
  { key: "NOWPAYMENTS_IPN_SECRET", label: "NOWPayments IPN secret" },
  { key: "LEAK_OSINT_API_KEY", label: "LeakOSINT", alt: "LEAKOSINT_API_KEY" },
  { key: "BREACH_API_KEY", label: "Breach.vip" },
  { key: "S3_ENDPOINT", label: "Cloudflare R2 endpoint" },
  { key: "S3_BUCKET", label: "R2 bucket name" },
  { key: "S3_ACCESS_KEY_ID", label: "R2 access key" },
  { key: "S3_SECRET_ACCESS_KEY", label: "R2 secret key" },
  { key: "DISCORD_WEBHOOK_URL", label: "Discord Webhook (general)" },
  { key: "DISCORD_SEARCH_WEBHOOK_URL", label: "Discord Webhook (search)" },
  { key: "VPS_SEARCH_URL", label: "VPS Search Bridge URL" },
  { key: "VPS_BRIDGE_SECRET", label: "VPS Bridge Secret" },
];

function check(entry) {
  if (process.env[entry.key]) return true;
  if (entry.alt && process.env[entry.alt]) return true;
  return false;
}

console.log("\n=== Discreen - Environment Check ===\n");

let hasErrors = false;

console.log("Required:");
for (const entry of REQUIRED) {
  const ok = check(entry);
  const icon = ok ? "  OK " : " MISS";
  console.log(`  [${icon}] ${entry.label} (${entry.key})`);
  if (!ok) hasErrors = true;
}

console.log("\nOptional:");
for (const entry of OPTIONAL) {
  const ok = check(entry);
  const icon = ok ? "  OK " : "    -";
  console.log(`  [${icon}] ${entry.label} (${entry.key})`);
}

console.log("");

if (hasErrors) {
  console.error("Some required variables are missing. Copy .env.example to .env and fill in the values:");
  console.error("  cp .env.example .env && nano .env\n");
  process.exit(1);
} else {
  console.log("All required variables are set.\n");
}
