import { z } from 'zod';
import { insertHevyConnectionSchema, hevyConnections } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
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
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.custom<typeof hevyConnections.$inferSelect>(),
        404: errorSchemas.notFound, // Not connected yet
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/settings',
      input: insertHevyConnectionSchema,
      responses: {
        200: z.custom<typeof hevyConnections.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    refresh: {
      method: 'POST' as const,
      path: '/api/settings/refresh',
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  dashboard: {
    get: {
      method: 'GET' as const,
      path: '/api/dashboard',
      input: z.object({
        year: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.custom<{
          stats: {
            totalLiftedLb: number;
            goalLb: number;
            percentageComplete: number;
            daysRemaining: number;
            aheadBehindLb: number;
            requiredPerDayLb: number;
            projectedYearEndLb: number;
            sessionsCount: number;
            daysLiftedCount: number;
            lastSyncAt: string | null;
          };
          chartData: Array<{
            date: string;
            actualVolume: number;
            targetVolume: number;
            cumulativeActual: number;
            cumulativeTarget: number;
          }>;
          heatmapData: Array<{
            date: string;
            volumeLb: number;
            count: number;
            prCount: number;
          }>;
          recentPrs: Array<{
            id: number;
            date: string;
            type: string;
            exerciseName?: string;
            value: number;
            delta?: number;
          }>;
        }>(),
      },
    },
  },
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
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

// ============================================
// TYPE HELPERS
// ============================================
export type SettingsResponse = z.infer<typeof api.settings.get.responses[200]>;
export type UpdateSettingsInput = z.infer<typeof api.settings.update.input>;
export type DashboardDataResponse = z.infer<typeof api.dashboard.get.responses[200]>;
