import { Router, type Request, type Response } from 'express';
import { createDashboardService } from '../services/dashboard.js';
import { badRequest } from '../errors.js';
import { param } from '../middleware/params.js';
import type { Database } from '@cco/db';

export function dashboardRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createDashboardService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.getDashboard(param(req, 'teamId'));
    res.json({ data });
  });

  return router;
}

export function sidebarBadgesRouter(database: Database): Router {
  const router = Router();
  const service = createDashboardService(database);

  router.get('/', (req: Request, res: Response) => {
    const teamId = req.query.teamId;
    if (typeof teamId !== 'string' || !teamId) {
      throw badRequest('teamId query parameter is required');
    }
    const data = service.getSidebarBadges(teamId);
    res.json({ data });
  });

  return router;
}
