import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { CodegateError } from '../errors.js';
import type { Logger } from 'pino';

export function createErrorHandler(logger: Logger): ErrorHandler {
  return (err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    if (err instanceof CodegateError) {
      logger.warn({ code: err.code, message: err.message }, 'Request error');
      return c.json(err.toJSON(), err.statusCode as ContentfulStatusCode);
    }

    logger.error({ err }, 'Unhandled error');
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500,
    );
  };
}
