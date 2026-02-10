import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import readline from "readline";
import type { SearchCriterion } from "@shared/schema";
import { parseLineField, filterResultsByCriteria } from "./searchSqlite";

interface R2SearchConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
}

interface R2FileInfo {
  key: string;
  size: number;
}

export interface R2SearchResult {
  results: Record<string, unknown>[];
  total: number | null;
  partial?: boolean;
}

const BLACKLISTED_SOURCES = new Set([
  "Pass'Sport.csv",
  "Pass'Sport",
  "PassSport.csv",
  "PassSport",
]);

let r2Config: R2SearchConfig | null = null;
let s3Client: S3Client | null = null;
let cachedFileList: R2FileInfo[] | null = null;
let fileListCacheTime = 0;
const FILE_LIST_CACHE_TTL = 5 * 60 * 1000;
const PARALLEL_STREAMS = 10;
const SEARCH_TIMEOUT_MS = 60000;
const SUPPORTED_EXT = [".txt", ".csv", ".log", ".json", ".tsv", ".sql", ".dat"];

function getR2Config(): R2SearchConfig | null {
  if (r2Config) return r2Config;

  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  r2Config = {
    endpoint: endpoint || "",
    region: process.env.S3_REGION || "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    prefix: process.env.R2_DATA_PREFIX || "data-files/",
  };
  return r2Config;
}

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;
  const config = getR2Config();
  if (!config) return null;

  const clientConfig: any = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    clientConfig.forcePathStyle = true;
  }

  s3Client = new S3Client(clientConfig);
  return s3Client;
}

async function listDataFiles(): Promise<R2FileInfo[]> {
  if (cachedFileList && Date.now() - fileListCacheTime < FILE_LIST_CACHE_TTL) {
    return cachedFileList;
  }

  const config = getR2Config();
  const client = getS3Client();
  if (!config || !client) return [];

  const files: R2FileInfo[] = [];
  let continuationToken: string | undefined;

  try {
    do {
      const response = await client.send(new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: config.prefix,
        ContinuationToken: continuationToken,
      }));

      for (const obj of response.Contents || []) {
        if (!obj.Key || !obj.Size) continue;
        const ext = obj.Key.substring(obj.Key.lastIndexOf(".")).toLowerCase();
        if (SUPPORTED_EXT.includes(ext)) {
          files.push({ key: obj.Key, size: obj.Size });
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    cachedFileList = files;
    fileListCacheTime = Date.now();
    console.log(`[r2-search] Cached ${files.length} data files from R2`);
  } catch (err) {
    console.error("[r2-search] Error listing files:", err);
  }

  return files;
}

function getFileName(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1];
}

function lineContainsAnyValue(line: string, searchValues: string[]): boolean {
  const lineLower = line.toLowerCase();
  for (const val of searchValues) {
    if (lineLower.includes(val)) return true;
  }
  return false;
}

async function searchOneFile(
  client: S3Client,
  bucket: string,
  file: R2FileInfo,
  searchValues: string[],
  criteria: SearchCriterion[],
  maxResults: number,
  abortSignal: AbortSignal
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  const fileName = getFileName(file.key);

  if (BLACKLISTED_SOURCES.has(fileName) || BLACKLISTED_SOURCES.has(fileName.replace(/\.[^.]+$/, ""))) {
    return results;
  }

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: file.key,
    }));

    if (!response.Body) return results;

    const stream = response.Body as Readable;
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    const rawMatches: Record<string, string>[] = [];

    for await (const line of rl) {
      if (abortSignal.aborted) {
        stream.destroy();
        break;
      }

      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) continue;

      if (lineContainsAnyValue(trimmed, searchValues)) {
        rawMatches.push({ content: trimmed, source: fileName });

        if (rawMatches.length >= maxResults * 5) {
          stream.destroy();
          break;
        }
      }
    }

    if (rawMatches.length > 0) {
      const processed = rawMatches
        .map((r) => {
          const parsed = parseLineField(r.content, r.source);
          return { _source: "r2", _raw: r.content, ...parsed };
        });

      const filtered = filterResultsByCriteria(processed, criteria);
      results.push(...filtered.slice(0, maxResults));
    }
  } catch (err: any) {
    if (!abortSignal.aborted) {
      console.warn(`[r2-search] Error reading ${file.key}:`, err?.message);
    }
  }

  return results;
}

export async function searchR2(
  criteria: SearchCriterion[],
  limit: number = 20,
  offset: number = 0
): Promise<R2SearchResult> {
  const config = getR2Config();
  const client = getS3Client();

  if (!config || !client) {
    console.error("[r2-search] R2 not configured");
    return { results: [], total: 0 };
  }

  const filled = criteria.filter((c) => c.value.trim());
  if (filled.length === 0) return { results: [], total: 0 };

  const searchValues = filled.map((c) => c.value.trim().toLowerCase());

  const files = await listDataFiles();
  if (files.length === 0) {
    console.warn("[r2-search] No data files found in R2");
    return { results: [], total: 0 };
  }

  console.log(`[r2-search] Searching ${files.length} files for ${filled.length} criteria`);
  const searchStart = Date.now();

  const allResults: Record<string, unknown>[] = [];
  const needed = limit + offset;
  const abortController = new AbortController();
  let partial = false;

  const timeout = setTimeout(() => {
    abortController.abort();
    partial = true;
    console.warn(`[r2-search] Search timeout after ${SEARCH_TIMEOUT_MS}ms`);
  }, SEARCH_TIMEOUT_MS);

  try {
    for (let i = 0; i < files.length; i += PARALLEL_STREAMS) {
      if (allResults.length >= needed || abortController.signal.aborted) break;

      const batch = files.slice(i, i + PARALLEL_STREAMS);
      const remaining = needed - allResults.length;
      const perFile = Math.max(Math.ceil(remaining / batch.length), 10);

      const promises = batch.map((file) =>
        searchOneFile(client, config.bucket, file, searchValues, filled, perFile, abortController.signal)
      );

      const batchResults = await Promise.all(promises);

      for (const fileResults of batchResults) {
        allResults.push(...fileResults);
        if (allResults.length >= needed) {
          abortController.abort();
          break;
        }
      }

      if ((i + PARALLEL_STREAMS) % 50 === 0 || i + PARALLEL_STREAMS >= files.length) {
        console.log(`[r2-search] Progress: ${Math.min(i + PARALLEL_STREAMS, files.length)}/${files.length} files, ${allResults.length} results`);
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  const elapsed = Date.now() - searchStart;
  console.log(`[r2-search] Done in ${elapsed}ms — ${allResults.length} total results, partial: ${partial}`);

  const sliced = allResults.slice(offset, offset + limit);

  return {
    results: sliced,
    total: allResults.length,
    partial,
  };
}

export function isR2SearchEnabled(): boolean {
  return process.env.USE_R2_SEARCH === "true" && !!getR2Config();
}

export async function getR2FileCount(): Promise<number> {
  const files = await listDataFiles();
  return files.length;
}
