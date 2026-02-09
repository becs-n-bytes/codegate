import { Hono } from 'hono';
import { ExecutionRequestSchema } from '../schemas.js';
import { ValidationError } from '../errors.js';
import type { Executor } from '../services/executor.js';

export function executeRoute(executor: Executor): Hono {
  const route = new Hono();

  route.post('/', async (c) => {
    const contentType = c.req.header('content-type') ?? '';
    let body: unknown;

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const prompt = formData.get('prompt');
      const provider = formData.get('provider');
      const model = formData.get('model');
      const timeoutMs = formData.get('timeoutMs');
      const fileEntries = formData.getAll('files');

      const files = await Promise.all(
        fileEntries.map(async (f) => {
          if (f instanceof File) {
            return {
              path: f.name,
              content: await f.text(),
              encoding: 'utf-8' as const,
            };
          }
          return null;
        }),
      );

      const validFiles = files.filter(
        (f): f is NonNullable<typeof f> => f !== null,
      );

      body = {
        prompt,
        provider,
        model: model || undefined,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
        files: validFiles.length > 0 ? validFiles : undefined,
      };
    } else {
      body = await c.req.json();
    }

    const parsed = ExecutionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      );
    }

    const result = await executor.execute(parsed.data);
    return c.json(result);
  });

  return route;
}
