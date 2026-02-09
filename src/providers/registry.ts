import type { BaseProvider } from './base.js';
import type { ProviderInfo } from '../types.js';
import { ProviderNotFoundError } from '../errors.js';

export class ProviderRegistry {
  private readonly providers = new Map<string, BaseProvider>();

  register(provider: BaseProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): BaseProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderNotFoundError(
        `Unknown provider: ${name}. Available: ${this.names().join(', ')}`,
      );
    }
    return provider;
  }

  names(): string[] {
    return Array.from(this.providers.keys());
  }

  async listWithAvailability(): Promise<ProviderInfo[]> {
    const results: ProviderInfo[] = [];
    for (const provider of this.providers.values()) {
      results.push({
        name: provider.name,
        binary: provider.binary,
        available: await provider.isAvailable(),
      });
    }
    return results;
  }
}
