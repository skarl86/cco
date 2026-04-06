import { Router, type Request, type Response } from 'express';
import { createApprovalsService } from '../services/approvals.js';
import { badRequest, notFound } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function approvalsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createApprovalsService(database);

  router.get('/', (req: Request, res: Response) => {
    const { status } = req.query;
    const data = status === 'pending'
      ? service.listPending(param(req, 'teamId'))
      : service.list(param(req, 'teamId'));
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const approval = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!approval) throw notFound('Approval not found');
    res.json({ data: approval });
  });

  router.post('/', (req: Request, res: Response) => {
    const { type, requestedByAgentId, payload } = req.body;
    if (!type || !payload) {
      throw badRequest('type and payload are required');
    }
    const approval = service.create({
      teamId: param(req, 'teamId') as string,
      type,
      requestedByAgentId,
      payload,
    });
    res.status(201).json({ data: approval });
  });

  router.post('/:id/decide', (req: Request, res: Response) => {
    const { decision, note } = req.body;
    if (!decision || !['approved', 'rejected'].includes(decision)) {
      throw badRequest('decision must be "approved" or "rejected"');
    }
    const result = service.decide(param(req, 'teamId'), param(req, 'id'), decision, note);
    res.json({ data: result });
  });

  return router;
}
