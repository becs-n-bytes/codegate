export abstract class CodegateError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: { code: this.code, message: this.message },
    };
  }
}

export class ValidationError extends CodegateError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class AuthError extends CodegateError {
  readonly code = 'AUTH_ERROR';
  readonly statusCode = 401;
}

export class ProviderNotFoundError extends CodegateError {
  readonly code = 'PROVIDER_NOT_FOUND';
  readonly statusCode = 400;
}

export class ProviderError extends CodegateError {
  readonly code = 'PROVIDER_ERROR';
  readonly statusCode = 502;
}

export class TimeoutError extends CodegateError {
  readonly code = 'TIMEOUT';
  readonly statusCode = 504;
}

export class WorkspaceError extends CodegateError {
  readonly code = 'WORKSPACE_ERROR';
  readonly statusCode = 500;
}

export class CapacityError extends CodegateError {
  readonly code = 'CAPACITY_EXCEEDED';
  readonly statusCode = 503;
}

export class CancelledError extends CodegateError {
  readonly code = 'CANCELLED';
  readonly statusCode = 499;
}
