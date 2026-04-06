/**
 * CCO configuration schema — Zod-validated, matching Paperclip's layered config approach.
 */

import { z } from 'zod';

export const DatabaseBackupConfigSchema = z.object({
  enabled: z.boolean().default(false),
  intervalMinutes: z.number().int().positive().default(60),
  retentionDays: z.number().int().positive().default(30),
  dir: z.string().optional(),
});

export const DatabaseConfigSchema = z.object({
  mode: z.enum(['sqlite']).default('sqlite'),
  path: z.string().optional(),
  backup: DatabaseBackupConfigSchema.optional(),
});

export const ServerConfigSchema = z.object({
  host: z.string().default('127.0.0.1'),
  port: z.number().int().min(1).max(65535).default(3100),
  serveUi: z.boolean().default(true),
});

export const SchedulerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  intervalMs: z.number().int().positive().default(60000),
});

export const AuthConfigSchema = z.object({
  apiKey: z.string().optional(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export const TelemetryConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

export const MetaSchema = z.object({
  version: z.string().default('1'),
  updatedAt: z.string().optional(),
  source: z.string().optional(),
});

export const CcoConfigSchema = z.object({
  $meta: MetaSchema.optional(),
  database: DatabaseConfigSchema.optional(),
  server: ServerConfigSchema.optional(),
  scheduler: SchedulerConfigSchema.optional(),
  auth: AuthConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
  telemetry: TelemetryConfigSchema.optional(),
});

export type CcoConfig = z.infer<typeof CcoConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type SchedulerConfig = z.infer<typeof SchedulerConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

/** Parse config with defaults filled in for missing optional sections */
export function parseConfig(raw: unknown): CcoConfig {
  return CcoConfigSchema.parse(raw);
}
