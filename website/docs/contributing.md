---
sidebar_position: 6
title: Contributing
---

# Contributing to codegate

Thank you for your interest in contributing to codegate! This guide will help you get set up and understand the contribution workflow.

## Development Setup

### Prerequisites

- Node.js 22+
- npm 10+
- At least one CLI agent for integration testing:
  - `claude` (Claude Code)
  - `codex` (Codex CLI)
  - `aider` (Aider)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/codegate.git
cd codegate

# Install dependencies
npm install

# Set the auth token for local testing
export CODEGATE_AUTH_TOKEN="dev-token"

# Start the dev server (auto-reloads on changes)
npm run dev

# In another terminal, verify it works
curl http://localhost:3000/health
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with `tsx watch` (auto-reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Run the full test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Type-check without emitting files |

---

## Project Structure

```
src/
  types.ts              # Shared TypeScript interfaces
  errors.ts             # Error class hierarchy
  schemas.ts            # Zod validation schemas
  config.ts             # Environment variable loading
  app.ts                # Hono app factory
  main.ts               # Entry point
  providers/
    base.ts             # Abstract BaseProvider
    claude-code.ts      # Claude Code provider
    codex.ts            # Codex provider
    aider.ts            # Aider provider
    registry.ts         # Provider registry
  services/
    semaphore.ts        # Async semaphore with bounded queue
    tracker.ts          # Execution tracker for cancellation
    workspace.ts        # Workspace lifecycle (create/snapshot/diff/destroy)
    executor.ts         # Execution orchestrator
  middleware/
    error-handler.ts    # Global error handler
  routes/
    execute.ts          # POST /api/execute
    health.ts           # GET /health
    providers.ts        # GET /api/providers
    cancel.ts           # POST /api/cancel/:requestId
```

---

## Testing

The project uses [Vitest](https://vitest.dev/) as its test runner.

### Test Structure

```
tests/
  unit/                 # Unit tests (isolated, mocked dependencies)
  integration/          # Integration tests (Hono app with mocked providers)
  e2e/                  # End-to-end tests (real process spawning)
  fixtures/             # Test fixtures (mock CLI binaries)
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npx vitest tests/unit/services/semaphore.test.ts

# E2E tests only
npx vitest tests/e2e/
```

### Writing Tests

- **Unit tests** should mock all external dependencies. Use `vi.mock()` for module mocks and `vi.fn()` for function stubs.
- **Integration tests** use the real Hono app with mocked providers (providers that return immediately without spawning processes).
- **E2E tests** use the mock provider binary at `tests/fixtures/mock-provider.mjs`, which simulates CLI behavior without calling external APIs.

---

## Adding a Provider

1. Create `src/providers/my-agent.ts` extending `BaseProvider`
2. Implement `buildSpawnSpec()` and `parseOutput()`
3. Register in `src/app.ts`
4. Add unit tests in `tests/unit/providers/my-agent.test.ts`
5. Update the provider documentation

See the [Provider Guide](/docs/providers#adding-a-custom-provider) for a complete tutorial.

---

## Code Style

- **TypeScript** with strict mode enabled
- **ESM** modules (no CommonJS `require()`)
- Keep files under **500 lines**
- Use **named exports** (no default exports)
- Error handling via the **error class hierarchy** in `src/errors.ts`
- Validate inputs at the boundary using **Zod schemas**
- Structured logging via **pino** (never use `console.log`)

---

## Pull Request Checklist

Before opening a PR, please ensure:

- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] New code has corresponding tests
- [ ] No hardcoded secrets or credentials
- [ ] Error cases are handled and return appropriate error codes
- [ ] Documentation is updated if the public API changes

---

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub with:

1. A clear description of the problem or feature
2. Steps to reproduce (for bugs)
3. Expected vs actual behavior
4. Your environment (Node.js version, OS, provider versions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
