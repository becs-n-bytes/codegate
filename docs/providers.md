# Provider Guide

codegate uses a provider abstraction to support multiple coding agent CLIs behind a single API. This document covers the built-in providers, how the abstraction works, and how to add your own.

## How Providers Work

Every provider extends the `BaseProvider` abstract class and implements two methods:

1. **`buildSpawnSpec(prompt, model, cwd)`** -- Returns the command, arguments, and optional environment variables needed to invoke the CLI.
2. **`parseOutput(stdout, exitCode)`** -- Transforms the raw stdout from the CLI into a structured `{ output, exitCode }` result.

The base class handles everything else: process spawning, timeout enforcement, abort signal handling, and error classification. Providers never spawn processes directly.

### Provider Lifecycle

```
BaseProvider.execute()
    |
    v
buildSpawnSpec()        <-- implemented by each provider
    |
    v
spawn(command, args)    <-- handled by BaseProvider
    |
    v
collect stdout/stderr   <-- handled by BaseProvider
    |
    v
parseOutput()           <-- implemented by each provider
    |
    v
return { output, exitCode }
```

### Availability Detection

Each provider exposes an `isAvailable()` method that checks whether the CLI binary exists on `PATH` by running `which <binary>`. The `/health` and `/api/providers` endpoints report this status for every registered provider.

---

## Built-in Providers

### claude-code

| Property | Value |
|---|---|
| Provider name | `claude-code` |
| CLI binary | `claude` |
| Install | `npm install -g @anthropic-ai/claude-code` |

**CLI flags:**

```
claude -p <prompt> --model <model> --output-format json --dangerously-skip-permissions
```

| Flag | Purpose |
|---|---|
| `-p` | Pass the prompt as a CLI argument (non-interactive mode) |
| `--model` | Select the model |
| `--output-format json` | Return structured JSON output |
| `--dangerously-skip-permissions` | Skip interactive permission prompts for file operations |

**Output parsing:** The provider attempts to parse stdout as JSON. It extracts the `result` or `text` field if present, otherwise stringifies the parsed object. If JSON parsing fails, the raw stdout is returned trimmed.

---

### codex

| Property | Value |
|---|---|
| Provider name | `codex` |
| CLI binary | `codex` |
| Install | `npm install -g codex` |

**CLI flags:**

```
codex --quiet --full-auto --model <model> <prompt>
```

| Flag | Purpose |
|---|---|
| `--quiet` | Suppress progress output, only emit the result |
| `--full-auto` | Run without interactive confirmation prompts |
| `--model` | Select the model |

**Output parsing:** Returns the raw stdout trimmed, with no additional parsing. The prompt is passed as a positional argument.

---

### aider

| Property | Value |
|---|---|
| Provider name | `aider` |
| CLI binary | `aider` |
| Install | `pip install aider-chat` |

**CLI flags:**

```
aider --message <prompt> --model <model> --yes --no-auto-commits --no-stream
```

| Flag | Purpose |
|---|---|
| `--message` | Pass the prompt non-interactively |
| `--model` | Select the model |
| `--yes` | Auto-confirm all prompts |
| `--no-auto-commits` | Prevent aider from making git commits (codegate manages the workspace) |
| `--no-stream` | Wait for full output instead of streaming |

**Output parsing:** Returns the raw stdout trimmed, with no additional parsing.

---

## Adding a Custom Provider

To add a new provider, create a class that extends `BaseProvider` and register it in the app setup.

### Step 1: Create the Provider Class

Create a new file at `src/providers/my-agent.ts`:

```typescript
import { BaseProvider } from './base.js';
import type { SpawnSpec, ProviderOutput } from '../types.js';

export class MyAgentProvider extends BaseProvider {
  // Unique name used in API requests (the "provider" field)
  readonly name = 'my-agent';

  // CLI binary that must be on PATH
  readonly binary = 'my-agent-cli';

  buildSpawnSpec(prompt: string, model: string, cwd: string): SpawnSpec {
    return {
      command: this.binary,
      args: [
        '--prompt', prompt,
        '--model', model,
        '--non-interactive',
      ],
      // Optional: additional environment variables for the subprocess
      env: {
        MY_AGENT_WORKSPACE: cwd,
      },
    };
  }

  parseOutput(stdout: string, exitCode: number): ProviderOutput {
    // Transform raw CLI output into the standard format.
    // This example extracts a JSON result field, falling back to raw output.
    try {
      const parsed = JSON.parse(stdout);
      return { output: parsed.answer ?? stdout, exitCode };
    } catch {
      return { output: stdout.trim(), exitCode };
    }
  }
}
```

### Step 2: Register the Provider

In `src/app.ts`, import and register your provider:

```typescript
import { MyAgentProvider } from './providers/my-agent.js';

// Inside createApp():
registry.register(new MyAgentProvider());
```

### Step 3: Install the CLI Binary

Make sure the binary is available on the server's `PATH`. You can verify by checking the `/health` or `/api/providers` endpoint -- your provider should appear with `"available": true`.

### Step 4: Use It

```bash
curl http://localhost:3000/api/execute \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a sorting algorithm",
    "provider": "my-agent"
  }'
```

---

## Provider Interface Reference

### BaseProvider (Abstract)

```typescript
abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly binary: string;

  abstract buildSpawnSpec(prompt: string, model: string, cwd: string): SpawnSpec;
  abstract parseOutput(stdout: string, exitCode: number): ProviderOutput;

  async isAvailable(): Promise<boolean>;
  async execute(
    prompt: string,
    model: string,
    cwd: string,
    signal: AbortSignal,
    timeoutMs: number,
    logger: Logger,
  ): Promise<ProviderOutput>;
}
```

### SpawnSpec

```typescript
interface SpawnSpec {
  command: string;                // CLI binary to execute
  args: string[];                 // Command-line arguments
  env?: Record<string, string>;   // Additional env vars (merged with process.env)
}
```

### ProviderOutput

```typescript
interface ProviderOutput {
  output: string;    // Parsed text output from the CLI
  exitCode: number;  // Process exit code
}
```

---

## Error Handling

The base class maps process errors to codegate error types:

| Scenario | Error Type | HTTP Status |
|---|---|---|
| Binary not found or spawn failure | `ProviderError` | 502 |
| Process exceeds timeout | `TimeoutError` | 504 |
| AbortController signal fires | `CancelledError` | 499 |
| `parseOutput()` throws | `ProviderError` | 502 |

Timeout handling: the base class sends SIGTERM to the subprocess when the timeout fires, waits 5 seconds, then sends SIGKILL if the process has not exited.
