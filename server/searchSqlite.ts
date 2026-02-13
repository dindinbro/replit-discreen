import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { SearchCriterion } from "@shared/schema";
import { syncDatabasesFromS3 } from "./s3sync";
import { searchR2, isR2SearchEnabled } from "./r2-search";

let useRemoteBridge = false;
let remoteBridgeUrl = "";
let remoteBridgeSecret = "";

let SOURCE_MAP: Record<string, string> = {};

const BLACKLISTED_SOURCES = new Set([
  "Pass'Sport.csv",
  "Pass'Sport",
  "PassSport.csv",
  "PassSport",
]);

interface DbInfo {
  db: Database.Database;
  tableName: string;
  columns: string[];
  isFts: boolean;
  sourceKey: string;
}

const dbCache: Record<string, DbInfo> = {};

function getDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "server", "data"),
    path.join(cwd, "data"),
    path.join(cwd, "dist", "data"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith(".db"));
      if (files.length > 0) {
        console.log(`[searchSqlite] Data directory found: ${dir} (${files.length} .db files)`);
        return dir;
      }
    }
  }
  const fallback = candidates[0];
  console.log(`[searchSqlite] No data directory with .db files found, using fallback: ${fallback}`);
  return fallback;
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

export function classifyPart(p: string): string | null {
  const trimmed = p.trim();
  if (!trimmed) return null;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) return "ip";
  if (/^(\+?\d[\d\s\-().]{6,})$/.test(trimmed) && /\d{7,}/.test(trimmed.replace(/\D/g, ""))) return "telephone";
  if (/^[a-f0-9]{32,128}$/i.test(trimmed)) return "hash";
  if (/^https?:\/\//i.test(trimmed)) return "url";
  if (/^(mr|mrs|mme|mlle|m\.|monsieur|madame|mademoiselle|homme|femme|male|female|man|woman|his|her|him|h|f|m|masculin|feminin)$/i.test(trimmed)) return "civilite";
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/i.test(trimmed)) return "iban";
  if (/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(trimmed) && trimmed.length >= 8 && trimmed.length <= 11 && /\d/.test(trimmed)) return "bic";
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(trimmed)) return "date_naissance";
  if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(trimmed)) return "date_naissance";
  if (/^\d{5}$/.test(trimmed) && parseInt(trimmed) >= 1000 && parseInt(trimmed) <= 99999) return "code_postal";
  if (/^\d{5}\.\d+$/.test(trimmed)) return "code_postal";
  if (/^\d+[\s,]+/.test(trimmed) && /[a-zA-ZÀ-ÿ]/.test(trimmed) && trimmed.length > 5) return "adresse";
  if (/^[A-Z0-9]{11,17}$/i.test(trimmed) && /\d/.test(trimmed) && /[A-Z]/i.test(trimmed)) {
    if (trimmed.length === 17) return "vin";
  }
  if (/^[a-f0-9]{40}:[a-f0-9]+$/i.test(trimmed)) return "hash";

  return null;
}

const JSON_FIELD_MAP: Record<string, string> = {
  "email": "email",
  "mail": "email",
  "courriel": "email",
  "nom": "nom",
  "last_name": "nom",
  "lastname": "nom",
  "prenom": "prenom",
  "first_name": "prenom",
  "firstname": "prenom",
  "nom_complet": "nom_complet",
  "full_name": "nom_complet",
  "date_naissance": "date_naissance",
  "dob": "date_naissance",
  "birth_date": "date_naissance",
  "birthday": "date_naissance",
  "anniversaryday": "date_naissance",
  "genre": "civilite",
  "sexe": "civilite",
  "gender": "civilite",
  "civilite": "civilite",
  "civility": "civilite",
  "telephone": "telephone",
  "phone": "telephone",
  "tel": "telephone",
  "mobile": "telephone",
  "msisdn": "telephone",
  "adresse": "adresse",
  "address": "adresse",
  "voie": "adresse",
  "rue": "adresse",
  "street": "adresse",
  "streetname": "adresse",
  "cplt_adresse": "cplt_adresse",
  "code_postal": "code_postal",
  "postal_code": "code_postal",
  "postalcode": "code_postal",
  "zip": "code_postal",
  "ville": "ville",
  "city": "ville",
  "commune": "ville",
  "code_insee": "code_insee",
  "nom_adresse_postale": "nom_adresse_postale",
  "iban": "iban",
  "bic": "bic",
  "password": "password",
  "mot_de_passe": "password",
  "hash": "hash",
  "ip": "ip",
  "ip_address": "ip",
  "login": "identifiant",
  "username": "identifiant",
  "id_psp": "id_psp",
  "matricule": "matricule",
  "organisme": "organisme",
  "situation": "situation",
  "allocataire": "allocataire",
  "qualite": "qualite",
  "boursier": "boursier",
  "offername": "offre",
  "offerdescription": "offre_detail",
  "offerprice": "prix_offre",
  "freeboxid": "freebox_id",
  "status": "statut",
  "internalstatus": "statut_interne",
  "activationdat": "date_activation",
  "firstactivationline": "date_activation_ligne",
  "createdat": "date_creation",
  "modifiedat": "date_modification",
};

function parsePipeJson(line: string, source: string): Record<string, string> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[{")) return null;

  const parsed: Record<string, string> = {};

  const quotedRegex = /([a-zA-Z_]\w*)\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = quotedRegex.exec(trimmed)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2];
    if (!value || value === "null" || value === "false") continue;

    const mapped = JSON_FIELD_MAP[key];
    if (mapped && !parsed[mapped]) {
      if (mapped.startsWith("date") && value.includes("-") && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const datePart = value.split("t")[0].split("T")[0];
        const parts = datePart.split("-");
        if (parts.length === 3) {
          parsed[mapped] = `${parts[2]}/${parts[1]}/${parts[0]}`;
          continue;
        }
      }
      parsed[mapped] = value;
    }
  }

  const numRegex = /([a-zA-Z_]\w*)\s*:\s*(\d+(?:\.\d+)?)\b/g;
  while ((match = numRegex.exec(trimmed)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2];
    const mapped = JSON_FIELD_MAP[key];
    if (mapped && !parsed[mapped]) {
      parsed[mapped] = value;
    }
  }

  if (parsed["cplt_adresse"] && parsed["adresse"]) {
    parsed["adresse"] = parsed["adresse"] + ", " + parsed["cplt_adresse"];
    delete parsed["cplt_adresse"];
  } else if (parsed["cplt_adresse"]) {
    parsed["adresse"] = parsed["cplt_adresse"];
    delete parsed["cplt_adresse"];
  }

  if (parsed["nom_adresse_postale"]) {
    if (!parsed["adresse"]) {
      parsed["adresse"] = parsed["nom_adresse_postale"];
    }
    delete parsed["nom_adresse_postale"];
  }

  if (Object.keys(parsed).length === 0) return null;

  if (source) parsed["source"] = source;
  return parsed;
}

export function parseLineField(line: string, source: string): Record<string, string> {
  const pipeJsonResult = parsePipeJson(line, source);
  if (pipeJsonResult) return pipeJsonResult;

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
  return rows
    .map((r) => {
      const line = getFieldCI(r, "line", "data", "content");
      const source = getFieldCI(r, "source");

      if (source && BLACKLISTED_SOURCES.has(source)) {
        return null;
      }

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
    })
    .filter((r) => r !== null) as Record<string, unknown>[];
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
  steamId: ["steam", "steamid", "steam_id"],
};

export function filterResultsByCriteria(
  results: Record<string, unknown>[],
  criteria: SearchCriterion[]
): Record<string, unknown>[] {
  if (criteria.length === 0) return results;

  const hasMultipleCriteria = criteria.filter(c => c.value.trim()).length > 1;

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
        if (hasMultipleCriteria) {
          const rawParts = raw.split(/[;|:,\t]+/).map(p => p.trim().toLowerCase());
          const matched = rawParts.some(part => part.includes(searchVal));
          if (matched) {
            foundInAllowedField = true;
          }
        } else {
          if (raw.includes(searchVal)) {
            foundInAllowedField = true;
          }
        }
      }

      if (!foundInAllowedField) {
        if (hasMultipleCriteria) {
          return false;
        }
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

export async function searchAllIndexes(
  criteria: SearchCriterion[],
  limit: number = 20,
  offset: number = 0
): Promise<SearchResult> {
  const filled = criteria.filter((c) => c.value.trim());
  if (filled.length === 0) {
    return { results: [], total: 0 };
  }

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const safeOffset = Math.max(0, offset);

  const hasLocalDbs = Object.keys(SOURCE_MAP).length > 0;

  if (useRemoteBridge && hasLocalDbs) {
    console.log(`[searchAllIndexes] Using BRIDGE + LOCAL .db in parallel for ${filled.length} criteria`);
    const fetchLimit = safeLimit * 2;
    const [bridgeResult, localResult] = await Promise.all([
      searchRemoteBridge(filled, fetchLimit, safeOffset).catch((err: any) => {
        console.error("[searchAllIndexes] Bridge failed:", err);
        return { results: [] as SearchResult["results"], total: 0 };
      }),
      Promise.resolve().then(() => searchLocal(filled, fetchLimit, safeOffset)).catch((err: any) => {
        console.error("[searchAllIndexes] Local search failed:", err);
        return { results: [] as SearchResult["results"], total: 0 };
      }),
    ]);
    const combined: SearchResult["results"] = [];
    const half = Math.ceil(safeLimit / 2);
    const localSlice = localResult.results.slice(0, half);
    const bridgeSlice = bridgeResult.results.slice(0, half);
    combined.push(...localSlice, ...bridgeSlice);
    const remaining = safeLimit - combined.length;
    if (remaining > 0) {
      const extra = [...bridgeResult.results.slice(half), ...localResult.results.slice(half)];
      combined.push(...extra.slice(0, remaining));
    }
    const total = (bridgeResult.total || 0) + (localResult.total || 0);
    console.log(`[searchAllIndexes] Combined: ${bridgeResult.results.length} bridge + ${localResult.results.length} local = ${combined.length} (showing ${combined.length})`);
    return { results: combined, total };
  }

  if (useRemoteBridge) {
    console.log(`[searchAllIndexes] Using REMOTE BRIDGE for ${filled.length} criteria`);
    const bridgeResult = await searchRemoteBridge(filled, safeLimit, safeOffset);
    if (bridgeResult.results.length > 0) {
      return bridgeResult;
    }
    console.log(`[searchAllIndexes] Bridge returned 0 results, trying fallback sources...`);
  }

  if (hasLocalDbs) {
    console.log(`[searchAllIndexes] Using LOCAL search for ${filled.length} criteria`);
    return searchLocal(filled, safeLimit, safeOffset);
  }

  if (isR2SearchEnabled()) {
    console.log(`[searchAllIndexes] Using R2 STREAMING search for ${filled.length} criteria`);
    return searchR2(filled, safeLimit, safeOffset);
  }

  console.log(`[searchAllIndexes] No search sources available`);
  return { results: [], total: 0 };
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

    let bridgeOnline = false;
    try {
      const healthRes = await fetch(`${remoteBridgeUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (healthRes.ok) {
        const health = await healthRes.json() as { databases: number; names: string[] };
        console.log(`[searchSqlite] VPS bridge online: ${health.databases} database(s) [${health.names?.join(", ")}]`);
        bridgeOnline = true;
      } else {
        console.warn(`[searchSqlite] VPS bridge health check failed: ${healthRes.status}`);
      }
    } catch (err) {
      console.warn("[searchSqlite] VPS bridge health check failed — will retry on search:", err);
    }
    if (!bridgeOnline) {
      useRemoteBridge = false;
      console.log("[searchSqlite] Bridge offline — disabled remote bridge, loading local .db files as fallback...");
    } else {
      console.log("[searchSqlite] Bridge online — also loading local .db files to combine results...");
    }
  }

  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (process.env.SKIP_S3_SYNC === "true") {
    console.log("[s3sync] SKIP_S3_SYNC=true — skipping remote sync");
  } else {
    console.log("[s3sync] Starting background database sync from S3...");
    syncDatabasesFromS3(dataDir).then((downloaded) => {
      if (downloaded.length > 0) {
        console.log(`[s3sync] Background sync complete: ${downloaded.join(", ")}`);
        const BLACKLISTED_FILES_BG = new Set(["index2.db"]);
        const newDbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith(".db") && !BLACKLISTED_FILES_BG.has(f));
        for (const file of newDbFiles) {
          const sourceKey = file.replace(/\.db$/i, "");
          if (!SOURCE_MAP[sourceKey]) {
            SOURCE_MAP[sourceKey] = file;
            try {
              const info = openDb(sourceKey);
              if (info) {
                console.log(`[searchSqlite] Hot-loaded database: ${sourceKey}`);
              }
            } catch (err: any) {
              console.warn(`[searchSqlite] Failed to hot-load ${file}:`, err?.message);
              delete SOURCE_MAP[sourceKey];
            }
          }
        }
        console.log(`[searchSqlite] Active databases after sync: ${Object.keys(SOURCE_MAP).join(", ") || "none"}`);
      } else {
        console.log("[s3sync] Background sync: no new files downloaded");
      }
    }).catch((err) => {
      console.error("[s3sync] Background sync error:", err);
    });
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
