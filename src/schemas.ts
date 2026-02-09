import { z } from 'zod';

export const FileEntrySchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(10_000_000),
  encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
});

export const ExecutionRequestSchema = z.object({
  prompt: z.string().min(1).max(100_000),
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100).optional(),
  files: z.array(FileEntrySchema).max(100).optional(),
  timeoutMs: z.number().int().positive().max(600_000).optional(),
});
