import { Router, type Request, type Response } from 'express';
import { CreateTeamSchema } from '@cco/shared';
import { createTeamsService } from '../services/teams.js';
import { notFound } from '../errors.js';
import { validate } from '../middleware/validate.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function teamsRouter(database: Database): Router {
  const router = Router();
  const service = createTeamsService(database);

  router.get('/', (_req: Request, res: Response) => {
    const data = service.list();
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const team = service.getById(param(req, 'id'));
    if (!team) throw notFound('Team not found');
    res.json({ data: team });
  });

  router.post('/', validate({ body: CreateTeamSchema }), (req: Request, res: Response) => {
    const team = service.create(req.body);
    res.status(201).json({ data: team });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const existing = service.getById(param(req, 'id'));
    if (!existing) throw notFound('Team not found');
    const updated = service.update(param(req, 'id'), req.body);
    res.json({ data: updated });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const existing = service.getById(param(req, 'id'));
    if (!existing) throw notFound('Team not found');
    service.remove(param(req, 'id'));
    res.status(204).end();
  });

  return router;
}
