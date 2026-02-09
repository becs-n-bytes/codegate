export interface FileEntry {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface ExecutionRequest {
  prompt: string;
  provider: string;
  model?: string;
  files?: FileEntry[];
  timeoutMs?: number;
}

export interface ExecutionResult {
  requestId: string;
  provider: string;
  model: string;
  output: string;
  exitCode: number;
  durationMs: number;
  files: FileEntry[];
}

export interface SpawnSpec {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ProviderOutput {
  output: string;
  exitCode: number;
}

export interface TrackedExecution {
  requestId: string;
  provider: string;
  startedAt: Date;
  abortController: AbortController;
}

export interface ProviderInfo {
  name: string;
  binary: string;
  available: boolean;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'shutting_down';
  activeExecutions: number;
  queueDepth: number;
  maxConcurrency: number;
  providers: ProviderInfo[];
  uptime: number;
}
