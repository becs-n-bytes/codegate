import { describe, it, expect, afterEach } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createWorkspace,
  snapshotWorkspace,
  diffWorkspace,
  destroyWorkspace,
} from '../../../src/services/workspace.js';
import { WorkspaceError } from '../../../src/errors.js';

const workspaces: string[] = [];

afterEach(async () => {
  for (const ws of workspaces) {
    await destroyWorkspace(ws).catch(() => {});
  }
  workspaces.length = 0;
});

describe('createWorkspace', () => {
  it('creates an empty workspace directory', async () => {
    const ws = await createWorkspace();
    workspaces.push(ws);

    const info = await stat(ws);
    expect(info.isDirectory()).toBe(true);
  });

  it('seeds files into workspace', async () => {
    const ws = await createWorkspace([
      { path: 'hello.txt', content: 'world' },
      { path: 'src/main.ts', content: 'console.log("hi")' },
    ]);
    workspaces.push(ws);

    const hello = await readFile(join(ws, 'hello.txt'), 'utf-8');
    expect(hello).toBe('world');

    const main = await readFile(join(ws, 'src/main.ts'), 'utf-8');
    expect(main).toBe('console.log("hi")');
  });

  it('handles base64 encoded files', async () => {
    const content = Buffer.from('binary content').toString('base64');
    const ws = await createWorkspace([
      { path: 'data.bin', content, encoding: 'base64' },
    ]);
    workspaces.push(ws);

    const data = await readFile(join(ws, 'data.bin'), 'utf-8');
    expect(data).toBe('binary content');
  });

  it('creates nested directories automatically', async () => {
    const ws = await createWorkspace([
      { path: 'a/b/c/deep.txt', content: 'deep' },
    ]);
    workspaces.push(ws);

    const deep = await readFile(join(ws, 'a/b/c/deep.txt'), 'utf-8');
    expect(deep).toBe('deep');
  });

  it('rejects absolute paths', async () => {
    await expect(
      createWorkspace([{ path: '/etc/passwd', content: 'hack' }]),
    ).rejects.toThrow(WorkspaceError);
    await expect(
      createWorkspace([{ path: '/etc/passwd', content: 'hack' }]),
    ).rejects.toThrow('Absolute paths not allowed');
  });

  it('rejects path traversal attempts', async () => {
    await expect(
      createWorkspace([{ path: '../../../etc/passwd', content: 'hack' }]),
    ).rejects.toThrow(WorkspaceError);
    await expect(
      createWorkspace([{ path: '../../../etc/passwd', content: 'hack' }]),
    ).rejects.toThrow('Path traversal detected');
  });
});

describe('snapshotWorkspace', () => {
  it('captures all files with relative paths', async () => {
    const ws = await createWorkspace([
      { path: 'a.txt', content: 'aaa' },
      { path: 'sub/b.txt', content: 'bbb' },
    ]);
    workspaces.push(ws);

    const snapshot = await snapshotWorkspace(ws);

    expect(snapshot.size).toBe(2);
    expect(snapshot.get('a.txt')).toBe('aaa');
    expect(snapshot.get('sub/b.txt')).toBe('bbb');
  });

  it('returns empty map for empty workspace', async () => {
    const ws = await createWorkspace();
    workspaces.push(ws);

    const snapshot = await snapshotWorkspace(ws);
    expect(snapshot.size).toBe(0);
  });
});

describe('diffWorkspace', () => {
  it('detects new files', async () => {
    const ws = await createWorkspace([
      { path: 'original.txt', content: 'original' },
    ]);
    workspaces.push(ws);

    const snapshot = await snapshotWorkspace(ws);

    // Simulate provider creating a new file
    const { writeFile: wf } = await import('node:fs/promises');
    await wf(join(ws, 'new-file.txt'), 'created by provider');

    const diff = await diffWorkspace(ws, snapshot);

    expect(diff).toHaveLength(1);
    expect(diff[0].path).toBe('new-file.txt');
    expect(diff[0].content).toBe('created by provider');
  });

  it('detects modified files', async () => {
    const ws = await createWorkspace([
      { path: 'file.txt', content: 'before' },
    ]);
    workspaces.push(ws);

    const snapshot = await snapshotWorkspace(ws);

    const { writeFile: wf } = await import('node:fs/promises');
    await wf(join(ws, 'file.txt'), 'after');

    const diff = await diffWorkspace(ws, snapshot);

    expect(diff).toHaveLength(1);
    expect(diff[0].path).toBe('file.txt');
    expect(diff[0].content).toBe('after');
  });

  it('ignores unchanged files', async () => {
    const ws = await createWorkspace([
      { path: 'unchanged.txt', content: 'same' },
      { path: 'changed.txt', content: 'before' },
    ]);
    workspaces.push(ws);

    const snapshot = await snapshotWorkspace(ws);

    const { writeFile: wf } = await import('node:fs/promises');
    await wf(join(ws, 'changed.txt'), 'after');

    const diff = await diffWorkspace(ws, snapshot);

    expect(diff).toHaveLength(1);
    expect(diff[0].path).toBe('changed.txt');
  });

  it('returns empty array when nothing changed', async () => {
    const ws = await createWorkspace([
      { path: 'file.txt', content: 'content' },
    ]);
    workspaces.push(ws);

    const snapshot = await snapshotWorkspace(ws);
    const diff = await diffWorkspace(ws, snapshot);

    expect(diff).toHaveLength(0);
  });
});

describe('destroyWorkspace', () => {
  it('removes workspace directory entirely', async () => {
    const ws = await createWorkspace([
      { path: 'file.txt', content: 'delete me' },
    ]);

    await destroyWorkspace(ws);

    await expect(stat(ws)).rejects.toThrow();
  });

  it('does not throw for non-existent workspace', async () => {
    await expect(
      destroyWorkspace('/tmp/codegate/nonexistent-uuid'),
    ).resolves.toBeUndefined();
  });
});
