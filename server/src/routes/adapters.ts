import { Router, type Request, type Response } from 'express';
import { notFound } from '../errors.js';
import { param } from '../middleware/params.js';
import type { AdapterRegistry } from '../adapters/registry.js';

export function adaptersRouter(registry: AdapterRegistry): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const types = registry.listTypes();
    const data = types.map((type) => {
      const adapter = registry.get(type);
      return {
        type,
        models: adapter?.models ?? null,
      };
    });
    res.json({ data });
  });

  router.get('/:type', (req: Request, res: Response) => {
    const type = param(req, 'type');
    const adapter = registry.get(type);
    if (!adapter) throw notFound(`Adapter "${type}" not found`);

    res.json({
      data: {
        type: adapter.type,
        models: adapter.models ?? null,
      },
    });
  });

  router.post('/:type/test', async (req: Request, res: Response) => {
    const type = param(req, 'type');
    const adapter = registry.get(type);
    if (!adapter) throw notFound(`Adapter "${type}" not found`);

    const result = await adapter.testEnvironment({ config: req.body ?? {} });
    res.json({ data: result });
  });

  return router;
}
