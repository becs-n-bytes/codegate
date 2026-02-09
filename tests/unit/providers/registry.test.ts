import { describe, it, expect, vi } from 'vitest';
import { ProviderRegistry } from '../../../src/providers/registry.js';
import { ClaudeCodeProvider } from '../../../src/providers/claude-code.js';
import { CodexProvider } from '../../../src/providers/codex.js';
import { AiderProvider } from '../../../src/providers/aider.js';
import { ProviderNotFoundError } from '../../../src/errors.js';

describe('ProviderRegistry', () => {
  it('registers and retrieves a provider', () => {
    const registry = new ProviderRegistry();
    const provider = new ClaudeCodeProvider();

    registry.register(provider);

    expect(registry.get('claude-code')).toBe(provider);
  });

  it('throws ProviderNotFoundError for unknown provider', () => {
    const registry = new ProviderRegistry();
    registry.register(new ClaudeCodeProvider());

    expect(() => registry.get('unknown')).toThrow(ProviderNotFoundError);
    expect(() => registry.get('unknown')).toThrow('Unknown provider: unknown');
  });

  it('includes available providers in error message', () => {
    const registry = new ProviderRegistry();
    registry.register(new ClaudeCodeProvider());
    registry.register(new CodexProvider());

    try {
      registry.get('missing');
    } catch (err) {
      expect((err as Error).message).toContain('claude-code');
      expect((err as Error).message).toContain('codex');
    }
  });

  it('lists provider names', () => {
    const registry = new ProviderRegistry();
    registry.register(new ClaudeCodeProvider());
    registry.register(new CodexProvider());
    registry.register(new AiderProvider());

    expect(registry.names()).toEqual(['claude-code', 'codex', 'aider']);
  });

  it('lists providers with availability', async () => {
    const registry = new ProviderRegistry();
    const claude = new ClaudeCodeProvider();
    const codex = new CodexProvider();

    vi.spyOn(claude, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(codex, 'isAvailable').mockResolvedValue(false);

    registry.register(claude);
    registry.register(codex);

    const list = await registry.listWithAvailability();

    expect(list).toEqual([
      { name: 'claude-code', binary: 'claude', available: true },
      { name: 'codex', binary: 'codex', available: false },
    ]);
  });
});
