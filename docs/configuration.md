# Configuration Reference

codegate is configured entirely through environment variables. Configuration is validated at startup using a Zod schema -- if any required variable is missing or any value fails validation, the server prints a detailed error message and exits with code 1.

## Environment Variables

### CODEGATE_AUTH_TOKEN

| Property | Value |
|---|---|
| Required | Yes |
| Type | `string` |
| Default | _(none)_ |
| Constraints | Minimum 1 character |

Bearer token used to authenticate all `/api/*` requests. Clients must send this in the `Authorization: Bearer <token>` header.

There is no built-in token rotation mechanism. To rotate, restart the server with a new value.

---

### CODEGATE_PORT

| Property | Value |
|---|---|
| Required | No |
| Type | `number` (integer, positive) |
| Default | `3000` |

TCP port for the HTTP server.

---

### CODEGATE_LOG_LEVEL

| Property | Value |
|---|---|
| Required | No |
| Type | `string` (enum) |
| Default | `info` |
| Allowed values | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

Controls the verbosity of structured JSON logs emitted via pino.

---

### CODEGATE_MAX_CONCURRENCY

| Property | Value |
|---|---|
| Required | No |
| Type | `number` (integer, positive) |
| Default | `4` |

Maximum number of CLI executions that can run simultaneously. Additional requests are queued up to `CODEGATE_MAX_QUEUE_SIZE`.

---

### CODEGATE_MAX_QUEUE_SIZE

| Property | Value |
|---|---|
| Required | No |
| Type | `number` (integer, positive) |
| Default | `16` |

Maximum number of requests that can wait in the queue when all concurrency slots are occupied. Requests beyond this limit receive an immediate `503 CAPACITY_EXCEEDED` response.

---

### CODEGATE_QUEUE_TIMEOUT_MS

| Property | Value |
|---|---|
| Required | No |
| Type | `number` (integer, positive, milliseconds) |
| Default | `30000` (30 seconds) |

How long a request can wait in the queue before being rejected with `503 CAPACITY_EXCEEDED`. This prevents requests from waiting indefinitely when the server is under sustained load.

---

### CODEGATE_DEFAULT_TIMEOUT_MS

| Property | Value |
|---|---|
| Required | No |
| Type | `number` (integer, positive, milliseconds) |
| Default | `300000` (5 minutes) |

Default per-execution timeout applied when the request does not specify `timeoutMs`. After this duration, the CLI subprocess receives SIGTERM, and after a 5-second grace period, SIGKILL.

---

### CODEGATE_MAX_TIMEOUT_MS

| Property | Value |
|---|---|
| Required | No |
| Type | `number` (integer, positive, milliseconds) |
| Default | `600000` (10 minutes) |

Upper bound on execution timeouts. If a request specifies a `timeoutMs` value higher than this, it is clamped to this value. This prevents clients from requesting unbounded execution times.

---

### CODEGATE_SHUTDOWN_TIMEOUT_MS

| Property | Value |
|---|---|
| Required | No |
| Type | `number` (integer, positive, milliseconds) |
| Default | `30000` (30 seconds) |

Time allowed for active executions to complete during graceful shutdown. After this period, remaining executions are force-aborted. Set this lower than your orchestrator's kill timeout.

---

### CODEGATE_DEFAULT_MODEL

| Property | Value |
|---|---|
| Required | No |
| Type | `string` |
| Default | `claude-sonnet-4-20250514` |

Model identifier used when the request does not specify a `model` field. The value is passed directly to the CLI provider -- ensure the model is valid for the target provider.

---

### CODEGATE_DEFAULT_PROVIDER

| Property | Value |
|---|---|
| Required | No |
| Type | `string` |
| Default | `claude-code` |

Default provider used when none is specified. Must match a registered provider name.

---

## Config Validation

On startup, codegate parses `process.env` against a Zod schema. If validation fails, the server prints a structured error showing exactly which variables are invalid and exits immediately:

```
Invalid configuration: {
  "CODEGATE_AUTH_TOKEN": {
    "_errors": ["Required"]
  }
}
```

This fail-fast behavior prevents the server from starting with misconfigured values.

---

## Example .env Files

### Development

```env
CODEGATE_AUTH_TOKEN=dev-token-for-local-testing
CODEGATE_PORT=3000
CODEGATE_LOG_LEVEL=debug
CODEGATE_MAX_CONCURRENCY=2
CODEGATE_MAX_QUEUE_SIZE=4
CODEGATE_DEFAULT_TIMEOUT_MS=120000
```

### Production

```env
CODEGATE_AUTH_TOKEN=a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5
CODEGATE_PORT=3000
CODEGATE_LOG_LEVEL=info
CODEGATE_MAX_CONCURRENCY=8
CODEGATE_MAX_QUEUE_SIZE=32
CODEGATE_QUEUE_TIMEOUT_MS=60000
CODEGATE_DEFAULT_TIMEOUT_MS=300000
CODEGATE_MAX_TIMEOUT_MS=600000
CODEGATE_SHUTDOWN_TIMEOUT_MS=45000
```

### High-Throughput

For servers handling many concurrent requests with generous timeouts:

```env
CODEGATE_AUTH_TOKEN=a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5
CODEGATE_PORT=3000
CODEGATE_LOG_LEVEL=warn
CODEGATE_MAX_CONCURRENCY=16
CODEGATE_MAX_QUEUE_SIZE=64
CODEGATE_QUEUE_TIMEOUT_MS=120000
CODEGATE_DEFAULT_TIMEOUT_MS=600000
CODEGATE_MAX_TIMEOUT_MS=600000
CODEGATE_SHUTDOWN_TIMEOUT_MS=60000
```

---

## Summary Table

| Variable | Required | Type | Default | Description |
|---|---|---|---|---|
| `CODEGATE_AUTH_TOKEN` | Yes | string | -- | Bearer token for API auth |
| `CODEGATE_PORT` | No | int | `3000` | HTTP server port |
| `CODEGATE_LOG_LEVEL` | No | enum | `info` | Log verbosity |
| `CODEGATE_MAX_CONCURRENCY` | No | int | `4` | Max parallel executions |
| `CODEGATE_MAX_QUEUE_SIZE` | No | int | `16` | Max queued requests |
| `CODEGATE_QUEUE_TIMEOUT_MS` | No | int (ms) | `30000` | Queue wait timeout |
| `CODEGATE_DEFAULT_TIMEOUT_MS` | No | int (ms) | `300000` | Default execution timeout |
| `CODEGATE_MAX_TIMEOUT_MS` | No | int (ms) | `600000` | Max execution timeout |
| `CODEGATE_SHUTDOWN_TIMEOUT_MS` | No | int (ms) | `30000` | Shutdown drain timeout |
| `CODEGATE_DEFAULT_MODEL` | No | string | `claude-sonnet-4-20250514` | Default model |
| `CODEGATE_DEFAULT_PROVIDER` | No | string | `claude-code` | Default provider |
