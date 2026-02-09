# Contributing to codegate

Thanks for your interest in contributing to codegate. This guide covers how to set up the project for development, run the test suite, and add new providers.

## Development Setup

### Prerequisites

- Node.js 20 or later
- npm 9 or later
- At least one coding agent CLI installed (claude, codex, or aider) for manual testing

### Getting Started

```bash
git clone https://github.com/your-org/codegate.git
cd codegate
npm install
cp .env.example .env
# Edit .env and set CODEGATE_AUTH_TOKEN
```

### Running in Development

```bash
npm run dev
```

This uses `tsx` to watch for changes and auto-restart the server.

### Building

```bash
npm run build
```

Compiles TypeScript to `dist/` with strict mode, ESM, and NodeNext module resolution.

### Type Checking

```bash
npm run typecheck
```

## Running Tests

### Full Suite

```bash
npm test
```

This runs all unit, integration, and E2E tests via vitest.

### Watch Mode

```bash
npm run test:watch
```

### Running Specific Tests

```bash
npx vitest run tests/unit/services/semaphore.test.ts
npx vitest run tests/e2e/
```

### Test Structure

```
tests/
  unit/                     # Isolated unit tests (no I/O, no network)
    config.test.ts
    errors.test.ts
    schemas.test.ts
    middleware/
      error-handler.test.ts
    providers/
      claude-code.test.ts
      codex.test.ts
      aider.test.ts
      registry.test.ts
    services/
      semaphore.test.ts
      tracker.test.ts
      workspace.test.ts
  integration/              # Tests using Hono's app.request() with real middleware
    api.test.ts
  e2e/                      # Full execution flow with a mock provider binary
    helpers.ts
    execution.test.ts
    concurrency.test.ts
    cancellation.test.ts
  fixtures/
    mock-provider.mjs       # Fake CLI binary for E2E testing
```

E2E tests use a `MockProvider` that spawns `tests/fixtures/mock-provider.mjs` as a real child process, exercising the full workspace and process lifecycle without requiring actual coding agent CLIs.

## Adding a Provider

Providers are the core abstraction in codegate. Each provider wraps a coding agent CLI.

### 1. Create the provider class

Create `src/providers/your-provider.ts`:

```typescript
import { BaseProvider } from './base.js';
import type { SpawnSpec, ProviderOutput } from '../types.js';

export class YourProvider extends BaseProvider {
  readonly name = 'your-provider';
  readonly binary = 'your-cli';

  buildSpawnSpec(prompt: string, model: string, cwd: string): SpawnSpec {
    return {
      command: this.binary,
      args: ['--prompt', prompt, '--model', model],
    };
  }

  parseOutput(stdout: string, exitCode: number): ProviderOutput {
    return { output: stdout.trim(), exitCode };
  }
}
```

Key points:
- `name` is the identifier used in API requests (`"provider": "your-provider"`)
- `binary` is the CLI executable name (must be on PATH)
- `buildSpawnSpec` returns the command and arguments to spawn
- `parseOutput` transforms raw stdout into a structured response
- `isAvailable()` is inherited from `BaseProvider` and checks if `binary` is on PATH

### 2. Register it

In `src/app.ts`, add:

```typescript
import { YourProvider } from './providers/your-provider.js';

// In createApp():
registry.register(new YourProvider());
```

### 3. Add tests

- Unit test in `tests/unit/providers/your-provider.test.ts` covering `buildSpawnSpec` and `parseOutput`
- The E2E and integration tests will automatically exercise it via the registry

## Code Style

- TypeScript strict mode with ESM modules
- Use `type` imports for type-only imports
- Use `.js` extensions in import paths (required for NodeNext module resolution)
- Keep files focused and under 500 lines
- No default exports
- Prefer `const` and readonly properties

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `npm run build && npm test` and ensure everything passes
5. Commit with a descriptive message
6. Open a pull request against `main`

### PR Checklist

- [ ] `npm run build` passes with zero errors
- [ ] `npm test` passes (all unit, integration, and E2E tests)
- [ ] New code has corresponding tests
- [ ] No hardcoded secrets or credentials
- [ ] Types are used for all public interfaces

## Reporting Issues

Please include:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version (`node --version`)
- OS and version
- Relevant logs (use `CODEGATE_LOG_LEVEL=debug`)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
