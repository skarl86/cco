import { Router, type Request, type Response } from 'express';
import { createActivityService } from '../services/activity.js';
import { param } from '../middleware/params.js';
import type { Database } from '@cco/db';

export function activityRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createActivityService(database);

  router.get('/', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
    const data = service.list(teamId, Number.isFinite(limit) && limit > 0 ? limit : 50);
    res.json({ data });
  });

  return router;
}
