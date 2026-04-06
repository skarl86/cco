import { Router, type Request, type Response } from 'express';
import { CreateAgentSchema } from '@cco/shared';
import { createAgentsService } from '../services/agents.js';
import { notFound } from '../errors.js';
import { validate } from '../middleware/validate.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function agentsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createAgentsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(param(req, 'teamId'));
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const agent = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!agent) throw notFound('Agent not found');
    res.json({ data: agent });
  });

  router.post('/', validate({ body: CreateAgentSchema }), (req: Request, res: Response) => {
    const agent = service.create(param(req, 'teamId'), req.body);
    res.status(201).json({ data: agent });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const existing = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!existing) throw notFound('Agent not found');
    const updated = service.update(param(req, 'teamId'), param(req, 'id'), req.body);
    res.json({ data: updated });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const existing = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!existing) throw notFound('Agent not found');
    service.remove(param(req, 'teamId'), param(req, 'id'));
    res.status(204).end();
  });

  return router;
}
