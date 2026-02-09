---
sidebar_position: 5
title: Deployment Guide
---

# Deployment Guide

This document covers running codegate in development, Docker, and production environments.

## Local Development

### Prerequisites

- Node.js 22 or later
- At least one coding agent CLI installed and on PATH:
  - `claude` (Claude Code): `npm install -g @anthropic-ai/claude-code`
  - `codex` (Codex): `npm install -g codex`
  - `aider` (Aider): `pip install aider-chat`

### Setup

```bash
# Install dependencies
npm install

# Set the required auth token
export CODEGATE_AUTH_TOKEN="dev-token"

# Start in development mode (auto-reload on file changes)
npm run dev
```

The dev server uses `tsx watch` to recompile and restart on every change to `src/`.

### Build and Run

```bash
# Compile TypeScript to dist/
npm run build

# Start the compiled server
npm start
```

### Verify

```bash
curl http://localhost:3000/health
```

You should see `"status": "ok"` and a list of providers with their availability.

---

## Docker

### Build the Image

The Dockerfile uses a multi-stage approach: it installs the three CLI binaries globally, copies the compiled `dist/` directory and production dependencies, and runs as a non-root `codegate` user.

**Important:** Build the TypeScript project before building the Docker image, since the Dockerfile copies `dist/` directly.

```bash
npm run build
docker build -t codegate .
```

### Run the Container

```bash
docker run -p 3000:3000 \
  -e CODEGATE_AUTH_TOKEN="your-secret-token" \
  codegate
```

With additional configuration:

```bash
docker run -p 3000:3000 \
  -e CODEGATE_AUTH_TOKEN="your-secret-token" \
  -e CODEGATE_MAX_CONCURRENCY=8 \
  -e CODEGATE_LOG_LEVEL=debug \
  codegate
```

### Docker Compose

Create a `.env` file in the project root:

```env
CODEGATE_AUTH_TOKEN=your-secret-token
CODEGATE_PORT=3000
CODEGATE_MAX_CONCURRENCY=4
CODEGATE_LOG_LEVEL=info
```

Then:

```bash
docker compose up
```

The compose file maps the port from the `CODEGATE_PORT` environment variable (defaulting to 3000), reads all configuration from the `.env` file, and sets `restart: unless-stopped`.

```bash
# Run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## Production Checklist

### Authentication

- Set `CODEGATE_AUTH_TOKEN` to a strong, randomly generated value (at least 32 characters).
- Rotate the token by restarting the server with a new value.
- Use HTTPS in front of codegate (via a reverse proxy or load balancer) to protect the token in transit.

### Concurrency Tuning

The default concurrency settings are conservative. Adjust based on your server resources:

| Variable | Default | Guidance |
|---|---|---|
| `CODEGATE_MAX_CONCURRENCY` | 4 | Each execution spawns a CLI subprocess. Set this based on available CPU and memory. CLI agents can be memory-intensive. |
| `CODEGATE_MAX_QUEUE_SIZE` | 16 | Maximum requests waiting for a slot. Higher values absorb more bursts but increase tail latency. |
| `CODEGATE_QUEUE_TIMEOUT_MS` | 30000 | How long a queued request waits before receiving 503. Match to your clients' timeout expectations. |

### Timeouts

| Variable | Default | Guidance |
|---|---|---|
| `CODEGATE_DEFAULT_TIMEOUT_MS` | 300000 (5 min) | Default per-execution timeout. Coding agents can take minutes for complex prompts. |
| `CODEGATE_MAX_TIMEOUT_MS` | 600000 (10 min) | Upper bound on client-requested timeouts. Prevents unbounded resource consumption. |
| `CODEGATE_SHUTDOWN_TIMEOUT_MS` | 30000 (30s) | Time allowed to drain active executions during shutdown. Should be less than your orchestrator's kill timeout (e.g., Kubernetes `terminationGracePeriodSeconds`). |

### Logging

- Set `CODEGATE_LOG_LEVEL=info` for production. Use `debug` or `trace` only for troubleshooting.
- Logs are structured JSON via [pino](https://github.com/pinojs/pino). Pipe to your log aggregator.
- For human-readable logs during development, pipe through `pino-pretty`:

```bash
npm run dev | npx pino-pretty
```

---

## Health Check Configuration

The `GET /health` endpoint is unauthenticated and designed for load balancer health checks.

### Response Status Codes

The endpoint always returns HTTP 200 with a JSON body. Use the `status` field to determine health:

| `status` value | Meaning |
|---|---|
| `ok` | Server is healthy and accepting work |
| `shutting_down` | Server received SIGTERM/SIGINT and is draining. Do not send new requests. |

### Load Balancer Configuration Examples

**AWS ALB / NLB:**

- Path: `/health`
- Protocol: HTTP
- Interval: 10 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

**Kubernetes liveness/readiness:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 2
  periodSeconds: 5
```

For readiness probes, you can inspect the response body and mark the pod not-ready when `status` is `shutting_down`.

---

## Graceful Shutdown

codegate handles `SIGTERM` and `SIGINT` with a multi-phase shutdown:

1. **Stop accepting** -- The HTTP server closes, rejecting new connections. The health endpoint starts returning `"status": "shutting_down"`.
2. **Reject queued requests** -- All requests waiting in the semaphore queue are immediately rejected with `CAPACITY_EXCEEDED` ("Server is shutting down").
3. **Drain active executions** -- The server waits up to `CODEGATE_SHUTDOWN_TIMEOUT_MS` (default: 30s) for running executions to finish. It polls every 100ms.
4. **Force-abort remaining** -- After the drain timeout, any executions still running are force-aborted via their AbortController. Each subprocess receives the abort signal.
5. **Exit** -- The process exits with code 0.

### Implications for Orchestrators

- Set your orchestrator's kill timeout (e.g., Kubernetes `terminationGracePeriodSeconds`) higher than `CODEGATE_SHUTDOWN_TIMEOUT_MS` to allow the full drain cycle.
- Example: if `CODEGATE_SHUTDOWN_TIMEOUT_MS=30000`, set `terminationGracePeriodSeconds: 45`.

---

## Resource Requirements

### Minimum (development / light usage)

- 1 CPU core
- 512 MB RAM
- Concurrency: 1-2

### Recommended (production)

- 2-4 CPU cores
- 2-4 GB RAM
- Concurrency: 4-8

### Scaling Considerations

- Each execution spawns a CLI subprocess that may itself call external APIs (e.g., Anthropic, OpenAI). Network bandwidth and API rate limits may be the bottleneck before CPU or memory.
- Workspaces use temporary directories on disk. Ensure sufficient space in the OS temp directory (`/tmp` on Linux). Each workspace is cleaned up after execution.
- codegate is stateless -- scale horizontally by running multiple instances behind a load balancer. Each instance manages its own concurrency semaphore independently.
- Monitor the `/health` endpoint's `queueDepth` and `activeExecutions` fields to inform scaling decisions.
