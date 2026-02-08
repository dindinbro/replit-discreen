import { z } from 'zod';
import { SearchRequestSchema, SearchResponseSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  search: {
    perform: {
      method: 'POST' as const,
      path: '/api/search',
      input: SearchRequestSchema,
      responses: {
        200: SearchResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal
      },
    },
    filters: {
      method: 'GET' as const,
      path: '/api/filters',
      responses: {
        200: z.record(z.string()),
      }
    }
  },
};

export type { SearchRequest, SearchResponse } from './schema';

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
