import { z } from 'zod';

const ConfigSchema = z.object({
  CODEGATE_AUTH_TOKEN: z.string().min(1),
  CODEGATE_PORT: z.coerce.number().int().positive().default(3000),
  CODEGATE_LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  CODEGATE_MAX_CONCURRENCY: z.coerce.number().int().positive().default(4),
  CODEGATE_MAX_QUEUE_SIZE: z.coerce.number().int().positive().default(16),
  CODEGATE_QUEUE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  CODEGATE_DEFAULT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(300_000),
  CODEGATE_MAX_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(600_000),
  CODEGATE_SHUTDOWN_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),
  CODEGATE_DEFAULT_MODEL: z.string().default('claude-sonnet-4-20250514'),
  CODEGATE_DEFAULT_PROVIDER: z.string().default('claude-code'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error('Invalid configuration:', JSON.stringify(formatted, null, 2));
    process.exit(1);
  }
  return result.data;
}
