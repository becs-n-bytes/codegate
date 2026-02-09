---
sidebar_position: 1
title: Getting Started
slug: /intro
---

# codegate

Provider-agnostic HTTP gateway to coding agent CLIs (Claude Code, Codex, Aider).

codegate exposes a single REST API that accepts a prompt and a provider name, spawns the corresponding CLI in an isolated workspace, and returns the output along with any files that were created or modified.

## Features

- **Provider-agnostic** -- swap between Claude Code, Codex, and Aider with a single field change
- **Workspace isolation** -- every execution runs in a temporary directory that is destroyed after completion
- **File diffing** -- automatically detects and returns files created or changed during execution
- **Backpressure** -- semaphore-based concurrency control with a bounded queue prevents overload
- **Cancellation** -- abort any in-flight execution by request ID
- **Graceful shutdown** -- drains the queue and force-aborts remaining work on SIGTERM/SIGINT

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set your auth token

```bash
export CODEGATE_AUTH_TOKEN="your-secret-token"
```

### 3. Start the server

```bash
npm run build && npm start
```

The server starts on port 3000 by default. For development with auto-reload:

```bash
npm run dev
```

## API Overview

### Health Check

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "activeExecutions": 0,
  "queueDepth": 0,
  "maxConcurrency": 4,
  "providers": [
    { "name": "claude-code", "binary": "claude", "available": true },
    { "name": "codex", "binary": "codex", "available": true },
    { "name": "aider", "binary": "aider", "available": false }
  ],
  "uptime": 42
}
```

### Execute a Prompt

```bash
curl http://localhost:3000/api/execute \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a hello world Express server in index.js",
    "provider": "claude-code"
  }'
```

```json
{
  "requestId": "a1b2c3d4-...",
  "provider": "claude-code",
  "model": "claude-sonnet-4-20250514",
  "output": "I created index.js with a basic Express server...",
  "exitCode": 0,
  "durationMs": 12340,
  "files": [
    {
      "path": "index.js",
      "content": "const express = require('express');\n...",
      "encoding": "utf-8"
    }
  ]
}
```

### Execute with Input Files

```bash
curl http://localhost:3000/api/execute \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add input validation to the handler",
    "provider": "claude-code",
    "files": [
      {
        "path": "handler.js",
        "content": "function handle(req) { return req.body; }"
      }
    ]
  }'
```

### Cancel an Execution

```bash
curl -X POST http://localhost:3000/api/cancel/a1b2c3d4-... \
  -H "Authorization: Bearer your-secret-token"
```

```json
{
  "requestId": "a1b2c3d4-...",
  "status": "cancelled"
}
```

## Architecture

```
POST /api/execute
        |
        v
  Bearer Auth Middleware
        |
        v
  Zod Schema Validation
        |
        v
  Semaphore.acquire()  -----> 503 if queue full
        |
        v
  createWorkspace(files)  --> temp dir + write input files
        |
        v
  snapshotWorkspace()    --> record initial file state
        |
        v
  provider.execute()     --> spawn CLI subprocess
        |
        v
  diffWorkspace()        --> detect new/modified files
        |
        v
  Return { output, files }
        |
        v
  finally: destroyWorkspace() + semaphore.release()
```

Key design points:

- **Hono** handles HTTP routing and middleware
- **Semaphore** enforces bounded concurrency with a fixed-size queue
- **Workspace** provides filesystem isolation using OS temp directories
- **BaseProvider** handles all process spawning; concrete providers only define CLI args and output parsing
- **ExecutionTracker** enables cancellation of in-flight requests via AbortController

## Providers

codegate ships with three built-in providers:

| Provider | CLI Binary | Description |
|---|---|---|
| `claude-code` | `claude` | Anthropic's Claude Code CLI |
| `codex` | `codex` | OpenAI's Codex CLI |
| `aider` | `aider` | Aider AI pair programming CLI |

Each provider must have its CLI binary installed and on `PATH`. The `/health` endpoint reports availability for each provider.

See the [Provider Guide](./providers) for CLI flags, output parsing details, and how to add custom providers.

## Docker

```bash
npm run build
docker build -t codegate .
docker run -p 3000:3000 -e CODEGATE_AUTH_TOKEN=your-secret-token codegate
```

With Docker Compose, create a `.env` file with your configuration, then:

```bash
docker compose up
```

See the [Deployment Guide](./deployment) for production deployment guidance.

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type-check without emitting
npm run typecheck
```

The project uses [Vitest](https://vitest.dev/) as its test runner.

## License

MIT
