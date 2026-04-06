import { Router, type Request, type Response } from 'express';
import { createCostsService } from '../services/costs.js';
import { param } from '../middleware/params.js';
import type { Database } from '@cco/db';

export function costsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createCostsService(database);

  router.get('/', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const opts: { agentId?: string; from?: number; to?: number; limit?: number } = {};

    if (typeof req.query.agentId === 'string') {
      opts.agentId = req.query.agentId;
    }
    if (typeof req.query.from === 'string') {
      opts.from = Number(req.query.from);
    }
    if (typeof req.query.to === 'string') {
      opts.to = Number(req.query.to);
    }
    if (typeof req.query.limit === 'string') {
      opts.limit = Number(req.query.limit);
    }

    const data = service.list(teamId, opts);
    res.json({ data });
  });

  router.get('/monthly', (req: Request, res: Response) => {
    const data = service.getMonthlySpend(param(req, 'teamId'));
    res.json({ data });
  });

  router.get('/by-agent', (req: Request, res: Response) => {
    const data = service.getSpendByAgent(param(req, 'teamId'));
    res.json({ data });
  });

  return router;
}
