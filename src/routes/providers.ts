import { Hono } from 'hono';
import type { ProviderRegistry } from '../providers/registry.js';

export function providersRoute(registry: ProviderRegistry): Hono {
  const route = new Hono();

  route.get('/', async (c) => {
    const providers = await registry.listWithAvailability();
    return c.json({ providers });
  });

  return route;
}
