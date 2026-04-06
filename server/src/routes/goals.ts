import { Router, type Request, type Response } from 'express';
import { createGoalsService } from '../services/goals.js';
import { notFound } from '../errors.js';
import { param } from '../middleware/params.js';
import type { Database } from '@cco/db';

export function goalsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createGoalsService(database);

  router.get('/', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const data = service.list(teamId, projectId);
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const goal = service.create(param(req, 'teamId'), req.body);
    res.status(201).json({ data: goal });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const goal = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!goal) throw notFound('Goal not found');
    res.json({ data: goal });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const existing = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!existing) throw notFound('Goal not found');
    const updated = service.update(param(req, 'teamId'), param(req, 'id'), req.body);
    res.json({ data: updated });
  });

  router.get('/:id/children', (req: Request, res: Response) => {
    const existing = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!existing) throw notFound('Goal not found');
    const data = service.listChildren(param(req, 'teamId'), param(req, 'id'));
    res.json({ data });
  });

  return router;
}
