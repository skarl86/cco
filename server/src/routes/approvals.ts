import { Router, type Request, type Response } from 'express';
import { createApprovalsService } from '../services/approvals.js';
import type { Database } from '@cco/db';

export function approvalsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createApprovalsService(database);

  router.get('/', (req: Request, res: Response) => {
    const { status } = req.query;
    const data = status === 'pending'
      ? service.listPending(req.params.teamId)
      : service.list(req.params.teamId);
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const approval = service.getById(req.params.teamId, req.params.id);
    if (!approval) {
      res.status(404).json({ error: 'Approval not found' });
      return;
    }
    res.json({ data: approval });
  });

  router.post('/', (req: Request, res: Response) => {
    const { type, requestedByAgentId, payload } = req.body;
    if (!type || !payload) {
      res.status(400).json({ error: 'type and payload are required' });
      return;
    }
    const approval = service.create({
      teamId: req.params.teamId,
      type,
      requestedByAgentId,
      payload,
    });
    res.status(201).json({ data: approval });
  });

  router.post('/:id/decide', (req: Request, res: Response) => {
    const { decision, note } = req.body;
    if (!decision || !['approved', 'rejected'].includes(decision)) {
      res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
      return;
    }
    try {
      const result = service.decide(req.params.teamId, req.params.id, decision, note);
      res.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Decision failed';
      res.status(400).json({ error: message });
    }
  });

  return router;
}
