import { Router, type Request, type Response } from 'express';
import { CreateTeamSchema } from '@cco/shared';
import { createTeamsService } from '../services/teams.js';
import type { Database } from '@cco/db';

export function teamsRouter(database: Database): Router {
  const router = Router();
  const service = createTeamsService(database);

  router.get('/', (_req: Request, res: Response) => {
    const data = service.list();
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const team = service.getById(req.params.id);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    res.json({ data: team });
  });

  router.post('/', (req: Request, res: Response) => {
    const parsed = CreateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }
    const team = service.create(parsed.data);
    res.status(201).json({ data: team });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const existing = service.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    const updated = service.update(req.params.id, req.body);
    res.json({ data: updated });
  });

  return router;
}
