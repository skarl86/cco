import { Router, type Request, type Response } from 'express';
import { CreateAgentSchema } from '@cco/shared';
import { createAgentsService } from '../services/agents.js';
import type { Database } from '@cco/db';

export function agentsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createAgentsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(req.params.teamId);
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const agent = service.getById(req.params.teamId, req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ data: agent });
  });

  router.post('/', (req: Request, res: Response) => {
    const parsed = CreateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }
    const agent = service.create(req.params.teamId, parsed.data);
    res.status(201).json({ data: agent });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const existing = service.getById(req.params.teamId, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const updated = service.update(req.params.teamId, req.params.id, req.body);
    res.json({ data: updated });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const existing = service.getById(req.params.teamId, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    service.remove(req.params.teamId, req.params.id);
    res.status(204).end();
  });

  return router;
}
