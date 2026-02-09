import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthError,
  ProviderNotFoundError,
  ProviderError,
  TimeoutError,
  WorkspaceError,
  CapacityError,
  CancelledError,
  CodegateError,
} from '../../src/errors.js';

const errorCases = [
  { Cls: ValidationError, code: 'VALIDATION_ERROR', statusCode: 400 },
  { Cls: AuthError, code: 'AUTH_ERROR', statusCode: 401 },
  { Cls: ProviderNotFoundError, code: 'PROVIDER_NOT_FOUND', statusCode: 400 },
  { Cls: ProviderError, code: 'PROVIDER_ERROR', statusCode: 502 },
  { Cls: TimeoutError, code: 'TIMEOUT', statusCode: 504 },
  { Cls: WorkspaceError, code: 'WORKSPACE_ERROR', statusCode: 500 },
  { Cls: CapacityError, code: 'CAPACITY_EXCEEDED', statusCode: 503 },
  { Cls: CancelledError, code: 'CANCELLED', statusCode: 499 },
] as const;

describe('errors', () => {
  for (const { Cls, code, statusCode } of errorCases) {
    describe(Cls.name, () => {
      it(`has code "${code}" and statusCode ${statusCode}`, () => {
        const err = new Cls('test message');
        expect(err.code).toBe(code);
        expect(err.statusCode).toBe(statusCode);
      });

      it('extends CodegateError and Error', () => {
        const err = new Cls('test');
        expect(err).toBeInstanceOf(CodegateError);
        expect(err).toBeInstanceOf(Error);
      });

      it('sets name to class name', () => {
        const err = new Cls('test');
        expect(err.name).toBe(Cls.name);
      });

      it('serializes to JSON with code and message', () => {
        const err = new Cls('something went wrong');
        expect(err.toJSON()).toEqual({
          error: { code, message: 'something went wrong' },
        });
      });

      it('preserves message', () => {
        const err = new Cls('detailed error info');
        expect(err.message).toBe('detailed error info');
      });
    });
  }
});
