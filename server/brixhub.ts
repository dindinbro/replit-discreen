import type { SearchCriterion } from "@shared/schema";

const BRIXHUB_BASE_URL = "https://api.brixhub.is/api/v1";

// Discreen's internal filter types mapped to BrixHub's parametric search
// fields, so the existing multi-criteria search can feed this source too.
const CRITERION_TO_BRIXHUB_FIELD: Partial<Record<SearchCriterion["type"], string>> = {
  username: "nom_utilisateur",
  displayName: "nom_affichage",
  ipAddress: "adresse_ip",
  email: "email",
  address: "adresse",
  lastName: "nom_famille",
  firstName: "prenom",
  ssn: "nir",
  phone: "telephone",
  gender: "genre",
  dob: "date_naissance",
  yob: "annee_naissance",
  city: "ville",
  zipCode: "code_postal",
  iban: "iban",
  bic: "bic",
  vin: "vin_plaque",
  discordId: "discord_id",
  fivemLicense: "fivem_license",
  steamId: "steam_id",
  fivemId: "fivem_id",
  xbox: "xbox_live_id",
  live: "live_id",
};

// All fields BrixHub's POST /search accepts, per https://api.brixhub.is/api/v1/docs
export const BRIXHUB_SEARCH_FIELDS = [
  "nom_famille", "prenom", "nom_naissance", "nom_affichage", "nom_utilisateur",
  "date_naissance", "annee_naissance", "jour_naissance", "mois_naissance", "genre", "civilite",
  "email", "telephone", "mobile", "adresse_ip",
  "adresse", "complement_adresse", "code_postal", "ville", "ville_naissance",
  "lieu_naissance", "pays", "region", "departement",
  "nir", "iban", "bic", "siret", "siren",
  "vin_plaque", "immatriculation", "numero_serie", "marque", "modele",
  "societe", "profession", "fonction",
  "steam_id", "fivem_license", "fivem_license2", "fivem_id", "xbox_live_id", "live_id", "discord_id",
] as const;

export type BrixhubField = typeof BRIXHUB_SEARCH_FIELDS[number];

export interface BrixhubProfile extends Record<string, unknown> {
  _sources?: string[];
  _confidence?: number;
}

export interface BrixhubSearchMeta {
  total: number;
  total_is_capped?: boolean;
  page: number;
  per_page: number;
  pages: number;
  took_ms: number;
}

export interface BrixhubSearchResult {
  results: BrixhubProfile[];
  meta: BrixhubSearchMeta | null;
  error?: string;
}

export function isBrixhubConfigured(): boolean {
  return !!process.env.BRIXHUB_API_KEY;
}

export function mapCriteriaToBrixhubParams(criteria: SearchCriterion[]): Partial<Record<BrixhubField, string>> {
  const params: Partial<Record<BrixhubField, string>> = {};
  for (const c of criteria) {
    const field = CRITERION_TO_BRIXHUB_FIELD[c.type];
    if (field) params[field as BrixhubField] = c.value;
  }
  return params;
}

async function brixhubSearchRequest(
  params: Record<string, unknown>,
): Promise<BrixhubSearchResult> {
  const empty: BrixhubSearchResult = { results: [], meta: null };
  const apiKey = process.env.BRIXHUB_API_KEY;
  if (!apiKey) return empty;

  try {
    const response = await fetch(`${BRIXHUB_BASE_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.message || `HTTP ${response.status}`;
      console.error(`[brixhub] search failed: ${message}`);
      return { ...empty, error: message };
    }

    const ct = (response.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      console.error("[brixhub] search returned non-JSON response");
      return { ...empty, error: "non_json_response" };
    }

    const body = await response.json();
    const results = body?.data?.results;
    if (!Array.isArray(results)) return empty;

    return {
      results: results.map((r: Record<string, unknown>) => ({ _source: "brixhub", ...r })),
      meta: body?.meta ?? null,
    };
  } catch (err) {
    console.error("[brixhub] search error:", err);
    return { ...empty, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

// Used by the generic multi-criteria search (/api/search, /api/v1/search) to
// fold BrixHub in as one more aggregated source.
export async function brixhubParametricSearch(
  criteria: SearchCriterion[],
  opts: { page?: number; perPage?: number; flexible?: boolean } = {},
): Promise<BrixhubSearchResult> {
  const params = mapCriteriaToBrixhubParams(criteria);
  if (Object.keys(params).length === 0) return { results: [], meta: null };

  return brixhubSearchRequest({
    ...params,
    page: opts.page ?? 1,
    per_page: opts.perPage ?? 10,
    flexible: opts.flexible ?? true,
  });
}

// Used by the dedicated /api/v1/parametric-search endpoint, which exposes
// BrixHub's full field set directly instead of going through the app's
// smaller internal SearchFilterType enum.
export async function brixhubRawSearch(
  fields: Partial<Record<BrixhubField, string>>,
  opts: { page?: number; perPage?: number; flexible?: boolean } = {},
): Promise<BrixhubSearchResult> {
  return brixhubSearchRequest({
    ...fields,
    page: opts.page ?? 1,
    per_page: opts.perPage ?? 10,
    flexible: opts.flexible ?? false,
  });
}
