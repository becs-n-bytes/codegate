---
sidebar_position: 2
title: API Reference
---

# API Reference

codegate exposes four HTTP endpoints. All `/api/*` endpoints require Bearer token authentication. The `/health` endpoint is unauthenticated.

Base URL: `http://localhost:3000` (default)

## Authentication

All `/api/*` endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <CODEGATE_AUTH_TOKEN>
```

Requests without a valid token receive a `401 Unauthorized` response.

---

## Endpoints

### GET /health

Returns server health, concurrency status, and provider availability. This endpoint does not require authentication and is intended for load balancer health checks.

**Request:**

```bash
curl http://localhost:3000/health
```

**Response (200):**

```json
{
  "status": "ok",
  "activeExecutions": 2,
  "queueDepth": 1,
  "maxConcurrency": 4,
  "providers": [
    { "name": "claude-code", "binary": "claude", "available": true },
    { "name": "codex", "binary": "codex", "available": true },
    { "name": "aider", "binary": "aider", "available": false }
  ],
  "uptime": 3600
}
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `status` | `"ok" \| "shutting_down"` | Server status. `shutting_down` means no new work will be accepted. |
| `activeExecutions` | `number` | Currently running executions |
| `queueDepth` | `number` | Requests waiting for a concurrency slot |
| `maxConcurrency` | `number` | Maximum concurrent executions allowed |
| `providers` | `ProviderInfo[]` | Registered providers and their availability |
| `uptime` | `number` | Server uptime in seconds |

---

### GET /api/providers

Lists all registered providers and whether their CLI binary is available on the server.

**Request:**

```bash
curl http://localhost:3000/api/providers \
  -H "Authorization: Bearer your-secret-token"
```

**Response (200):**

```json
{
  "providers": [
    { "name": "claude-code", "binary": "claude", "available": true },
    { "name": "codex", "binary": "codex", "available": true },
    { "name": "aider", "binary": "aider", "available": false }
  ]
}
```

Each provider entry contains:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Provider identifier used in execution requests |
| `binary` | `string` | CLI binary name that must be on PATH |
| `available` | `boolean` | Whether the binary was found via `which` |

---

### POST /api/execute

Sends a prompt to a coding agent CLI and returns the output along with any files created or modified.

This endpoint accepts both `application/json` and `multipart/form-data` content types.

#### JSON Request

```bash
curl http://localhost:3000/api/execute \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a function that reverses a string",
    "provider": "claude-code",
    "model": "claude-sonnet-4-20250514",
    "timeoutMs": 120000,
    "files": [
      {
        "path": "utils.ts",
        "content": "// existing utilities\nexport function capitalize(s: string) { return s[0].toUpperCase() + s.slice(1); }",
        "encoding": "utf-8"
      }
    ]
  }'
```

**Request body schema:**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `prompt` | `string` | Yes | 1-100,000 chars | The prompt to send to the coding agent |
| `provider` | `string` | Yes | 1-50 chars | Provider name (e.g., `claude-code`, `codex`, `aider`) |
| `model` | `string` | No | 1-100 chars | Model to use. Defaults to `CODEGATE_DEFAULT_MODEL`. |
| `files` | `FileEntry[]` | No | Max 100 entries | Files to place in the workspace before execution |
| `timeoutMs` | `number` | No | 1-600,000 | Execution timeout in ms. Defaults to `CODEGATE_DEFAULT_TIMEOUT_MS`. Capped at `CODEGATE_MAX_TIMEOUT_MS`. |

**FileEntry schema:**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `path` | `string` | Yes | 1-500 chars, relative only | File path relative to workspace root. Absolute paths and path traversal (`../`) are rejected. |
| `content` | `string` | Yes | Max 10 MB | File content |
| `encoding` | `string` | No | `"utf-8"` or `"base64"` | Content encoding. Defaults to `"utf-8"`. |

#### Multipart Request

For uploading actual files from disk:

```bash
curl http://localhost:3000/api/execute \
  -H "Authorization: Bearer your-secret-token" \
  -F "prompt=Add error handling to the server" \
  -F "provider=claude-code" \
  -F "files=@server.js" \
  -F "files=@package.json"
```

When using `multipart/form-data`:

- `prompt` and `provider` are form text fields
- `model` and `timeoutMs` are optional form text fields
- `files` are file upload fields (the filename is used as the path)

#### Success Response (200)

```json
{
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "provider": "claude-code",
  "model": "claude-sonnet-4-20250514",
  "output": "I created a reverseString function in utils.ts...",
  "exitCode": 0,
  "durationMs": 8542,
  "files": [
    {
      "path": "utils.ts",
      "content": "// existing utilities\nexport function capitalize(s: string) { ... }\nexport function reverseString(s: string) { ... }",
      "encoding": "utf-8"
    }
  ]
}
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `requestId` | `string` | UUID identifying this execution. Use this to cancel. |
| `provider` | `string` | Provider that handled the execution |
| `model` | `string` | Model that was used |
| `output` | `string` | Text output from the coding agent |
| `exitCode` | `number` | CLI process exit code (0 = success) |
| `durationMs` | `number` | Total execution time in milliseconds |
| `files` | `FileEntry[]` | Files that were created or modified during execution |

The `files` array only includes files that are new or whose content differs from what was provided in the request. Unchanged files are omitted.

---

### POST /api/cancel/:requestId

Cancels an in-flight execution. The CLI subprocess receives SIGTERM via AbortController.

**Request:**

```bash
curl -X POST http://localhost:3000/api/cancel/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer your-secret-token"
```

**Success Response (200):**

```json
{
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "cancelled"
}
```

**Not Found Response (404):**

If the request ID does not match any active execution:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No active execution with id: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

Note: A 404 may mean the execution already completed or was already cancelled.

---

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed Zod schema validation. The message contains field-level details. |
| `PROVIDER_NOT_FOUND` | 400 | The requested provider name is not registered. The message lists available providers. |
| `AUTH_ERROR` | 401 | Missing or invalid Bearer token. |
| `CANCELLED` | 499 | The execution was cancelled via the cancel endpoint. |
| `WORKSPACE_ERROR` | 500 | Failed to create workspace, write files, or perform diff. Includes path traversal rejections. |
| `INTERNAL_ERROR` | 500 | Unhandled server error. Details are logged server-side but not exposed to the client. |
| `PROVIDER_ERROR` | 502 | The CLI subprocess failed to spawn or produced unparseable output. |
| `CAPACITY_EXCEEDED` | 503 | The concurrency queue is full, or the request timed out while waiting in the queue. |
| `TIMEOUT` | 504 | The CLI subprocess did not complete within the configured timeout. |

---

## Rate Limiting and Backpressure

codegate uses a semaphore-based concurrency model rather than traditional rate limiting:

1. **Concurrency limit** -- At most `CODEGATE_MAX_CONCURRENCY` (default: 4) executions run simultaneously.
2. **Queue** -- When all slots are occupied, incoming requests enter a FIFO queue of up to `CODEGATE_MAX_QUEUE_SIZE` (default: 16) entries.
3. **Queue timeout** -- If a queued request is not served within `CODEGATE_QUEUE_TIMEOUT_MS` (default: 30s), it receives a `503 CAPACITY_EXCEEDED` error.
4. **Queue full** -- If the queue is at capacity, new requests are immediately rejected with `503 CAPACITY_EXCEEDED`.

To handle 503 responses, clients should implement retry with exponential backoff.

---

## Cancellation Flow

1. Client sends `POST /api/cancel/:requestId` with a valid Bearer token.
2. The server looks up the request ID in the execution tracker.
3. If found, the associated `AbortController` is aborted, which sends SIGTERM to the CLI subprocess.
4. The execution promise rejects with a `CANCELLED` error (HTTP 499).
5. The workspace is cleaned up in the `finally` block.
6. The cancel endpoint returns `{ requestId, status: "cancelled" }`.

If the execution has already completed or was already cancelled, the cancel endpoint returns 404.
