import {
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from 'node:fs/promises';
import { join, normalize, relative, dirname, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { FileEntry } from '../types.js';
import { WorkspaceError } from '../errors.js';

export async function createWorkspace(files?: FileEntry[]): Promise<string> {
  const workspacePath = join(tmpdir(), 'codegate', randomUUID());
  await mkdir(workspacePath, { recursive: true });

  if (files) {
    for (const file of files) {
      const resolved = resolveWorkspacePath(workspacePath, file.path);
      await mkdir(dirname(resolved), { recursive: true });
      const content =
        file.encoding === 'base64'
          ? Buffer.from(file.content, 'base64')
          : file.content;
      await writeFile(resolved, content);
    }
  }

  return workspacePath;
}

export async function snapshotWorkspace(
  workspacePath: string,
): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();
  const files = await walkDir(workspacePath);
  for (const filePath of files) {
    const relativePath = relative(workspacePath, filePath);
    const content = await readFile(filePath, 'utf-8');
    snapshot.set(relativePath, content);
  }
  return snapshot;
}

export async function diffWorkspace(
  workspacePath: string,
  snapshot: Map<string, string>,
): Promise<FileEntry[]> {
  const changed: FileEntry[] = [];
  const currentFiles = await walkDir(workspacePath);

  for (const filePath of currentFiles) {
    const relativePath = relative(workspacePath, filePath);
    const content = await readFile(filePath, 'utf-8');
    const original = snapshot.get(relativePath);

    if (original === undefined || original !== content) {
      changed.push({ path: relativePath, content, encoding: 'utf-8' });
    }
  }

  return changed;
}

export async function destroyWorkspace(workspacePath: string): Promise<void> {
  await rm(workspacePath, { recursive: true, force: true });
}

function resolveWorkspacePath(workspace: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    throw new WorkspaceError(`Absolute paths not allowed: ${filePath}`);
  }

  const normalized = normalize(filePath);
  const resolved = join(workspace, normalized);
  const rel = relative(workspace, resolved);

  if (rel.startsWith('..')) {
    throw new WorkspaceError(`Path traversal detected: ${filePath}`);
  }

  return resolved;
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}
