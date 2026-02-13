import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { SearchRequest, SearchResponse } from "@shared/routes";

export interface SearchQuota {
  used: number;
  limit: number;
  tier: string;
}

export interface SearchResponseWithQuota extends SearchResponse {
  quota?: SearchQuota;
}

export class SearchLimitError extends Error {
  used: number;
  limit: number;
  tier: string;
  cooldown?: boolean;
  remainingSeconds?: number;

  constructor(message: string, used: number, limit: number, tier: string, cooldown?: boolean, remainingSeconds?: number) {
    super(message);
    this.name = "SearchLimitError";
    this.used = used;
    this.limit = limit;
    this.tier = tier;
    this.cooldown = cooldown;
    this.remainingSeconds = remainingSeconds;
  }
}

export function useSearchFilters() {
  return useQuery({
    queryKey: [api.search.filters.path],
    queryFn: async () => {
      const res = await fetch(api.search.filters.path);
      if (!res.ok) throw new Error("Failed to load filters");
      const schema = api.search.filters.responses[200];
      return schema.parse(await res.json());
    },
  });
}

export interface BreachSearchRequest {
  term: string;
  fields: string[];
}

export interface BreachSearchResponse {
  results: Record<string, unknown>[];
  quota?: SearchQuota;
}

export function useBreachSearch(getAccessToken: () => string | null) {
  return useMutation({
    mutationFn: async (request: BreachSearchRequest): Promise<BreachSearchResponse> => {
      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/breach-search", {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur inconnue" }));
        if (res.status === 429) {
          throw new SearchLimitError(
            err.message || "Limite atteinte",
            err.used || 0,
            err.limit || 0,
            err.tier || "free"
          );
        }
        throw new Error(err.message || "Erreur de recherche externe");
      }

      return (await res.json()) as BreachSearchResponse;
    },
  });
}

export interface LeakosintSearchRequest {
  request: string;
  limit?: number;
  lang?: string;
}

export interface LeakosintSearchResponse {
  results: Record<string, unknown>[];
  raw?: Record<string, unknown>;
  quota?: SearchQuota;
}

export function useLeakosintSearch(getAccessToken: () => string | null) {
  return useMutation({
    mutationFn: async (request: LeakosintSearchRequest): Promise<LeakosintSearchResponse> => {
      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/leakosint-search", {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur inconnue" }));
        if (res.status === 429) {
          throw new SearchLimitError(
            err.message || "Limite atteinte",
            err.used || 0,
            err.limit || 0,
            err.tier || "free"
          );
        }
        throw new Error(err.message || "Erreur de recherche LeakOSINT");
      }

      return (await res.json()) as LeakosintSearchResponse;
    },
  });
}

export function useSearchQuota(getAccessToken: () => string | null) {
  return useQuery({
    queryKey: ["/api/search-quota"],
    queryFn: async () => {
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/search-quota", { headers });
      if (!res.ok) return null;
      return (await res.json()) as SearchQuota & { allowed: boolean };
    },
    refetchInterval: 30000,
  });
}

export function useLeakosintQuota(getAccessToken: () => string | null) {
  return useQuery({
    queryKey: ["/api/leakosint-quota"],
    queryFn: async () => {
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/leakosint-quota", { headers });
      if (!res.ok) return null;
      return (await res.json()) as SearchQuota;
    },
    refetchInterval: 30000,
  });
}

export function usePerformSearch(getAccessToken: () => string | null) {
  return useMutation({
    mutationFn: async (request: SearchRequest): Promise<SearchResponseWithQuota> => {
      const validatedReq = api.search.perform.input.parse(request);

      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(api.search.perform.path, {
        method: api.search.perform.method,
        headers,
        body: JSON.stringify(validatedReq),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Non authentifie. Veuillez vous reconnecter.");
        }
        const err = await res.json().catch(() => ({ message: "Erreur inconnue" }));
        if (res.status === 429) {
          throw new SearchLimitError(
            err.message || "Limite atteinte",
            err.used || 0,
            err.limit || 0,
            err.tier || "free",
            err.cooldown || false,
            err.remainingSeconds || 0
          );
        }
        throw new Error(err.message || "Search failed");
      }

      return (await res.json()) as SearchResponseWithQuota & { cooldownSeconds?: number };
    },
  });
}
