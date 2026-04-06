import { Router, type Request, type Response } from 'express';
import { createAgentKeysService } from '../services/agent-keys.js';
import { badRequest, notFound } from '../errors.js';
import { param } from '../middleware/params.js';
import type { Database } from '@cco/db';

export function agentKeysRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createAgentKeysService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(param(req, 'teamId'), param(req, 'agentId'));
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw badRequest('name is required');
    }
    const result = service.create(
      param(req, 'teamId'),
      param(req, 'agentId'),
      name.trim(),
    );
    res.status(201).json({ data: result });
  });

  router.delete('/:keyId', (req: Request, res: Response) => {
    const deleted = service.revoke(
      param(req, 'teamId'),
      param(req, 'agentId'),
      param(req, 'keyId'),
    );
    if (!deleted) throw notFound('API key not found');
    res.status(204).end();
  });

  return router;
}
