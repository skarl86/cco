import { Router, type Request, type Response } from 'express';
import type { SecretsProvider } from '../secrets/index.js';
import { badRequest, notFound } from '../errors.js';
import { param } from '../middleware/params.js';

export function secretsRouter(secrets: SecretsProvider): Router {
  const router = Router({ mergeParams: true });

  router.get('/', (_req: Request, res: Response) => {
    const names = secrets.list();
    res.json({ data: names.map((name) => ({ name })) });
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, value } = req.body as { name?: string; value?: string };

    if (!name || typeof name !== 'string') {
      throw badRequest('Missing or invalid "name"');
    }
    if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(name)) {
      throw badRequest('Secret name must be 1-128 alphanumeric, underscore, or hyphen characters');
    }
    if (!value || typeof value !== 'string') {
      throw badRequest('Missing or invalid "value"');
    }

    secrets.set(name, value);
    res.status(201).json({ data: { name } });
  });

  router.delete('/:name', (req: Request, res: Response) => {
    const name = param(req, 'name');
    const existing = secrets.get(name);
    if (existing === null) {
      throw notFound('Secret not found');
    }
    secrets.delete(name);
    res.status(204).end();
  });

  return router;
}
