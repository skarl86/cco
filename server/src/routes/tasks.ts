import { Router, type Request, type Response } from 'express';
import { CreateTaskSchema } from '@cco/shared';
import { createTasksService } from '../services/tasks.js';
import { createCheckoutService } from '../services/checkout.js';
import { notFound, badRequest } from '../errors.js';
import { validate } from '../middleware/validate.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function tasksRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createTasksService(database);
  const checkoutService = createCheckoutService(database);

  router.get('/', (req: Request, res: Response) => {
    const { status, assigneeAgentId, projectId, parentId, q, originKind, labelId } = req.query;
    const data = service.list(param(req, 'teamId'), {
      status: status as string | undefined,
      assigneeAgentId: assigneeAgentId as string | undefined,
      projectId: projectId as string | undefined,
      parentId: parentId as string | undefined,
      q: q as string | undefined,
      originKind: originKind as string | undefined,
      labelId: labelId as string | undefined,
    });
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const task = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!task) throw notFound('Task not found');
    res.json({ data: task });
  });

  router.get('/:id/children', (req: Request, res: Response) => {
    const data = service.listChildren(param(req, 'teamId'), param(req, 'id'));
    res.json({ data });
  });

  router.post('/', validate({ body: CreateTaskSchema }), (req: Request, res: Response) => {
    const task = service.create(param(req, 'teamId'), req.body);
    res.status(201).json({ data: task });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const updated = service.update(param(req, 'teamId'), param(req, 'id'), req.body);
      if (!updated) throw notFound('Task not found');
      res.json({ data: updated });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid status transition')) {
        throw badRequest(err.message);
      }
      throw err;
    }
  });

  router.get('/:id/heartbeat-context', (req: Request, res: Response) => {
    const ctx = service.getHeartbeatContext(param(req, 'teamId'), param(req, 'id'));
    if (!ctx) throw notFound('Task not found');
    res.json({ data: ctx });
  });

  router.post('/:id/checkout', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const taskId = param(req, 'id');
    const { agentId, runId, expectedStatuses } = req.body as {
      agentId?: string;
      runId?: string;
      expectedStatuses?: string[];
    };

    if (!agentId) throw badRequest('agentId is required');

    const actualRunId = runId ?? `cli-${Date.now()}`;
    const result = checkoutService.checkout(teamId, taskId, agentId, actualRunId);

    if (!result.success) {
      throw badRequest(result.error ?? 'Checkout failed');
    }

    const task = service.getById(teamId, taskId);
    res.json({ data: task });
  });

  router.post('/:id/release', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const taskId = param(req, 'id');
    const { newStatus } = req.body as { newStatus?: string };

    const existing = service.getById(teamId, taskId);
    if (!existing) throw notFound('Task not found');

    checkoutService.release(teamId, taskId, newStatus);

    const task = service.getById(teamId, taskId);
    res.json({ data: task });
  });

  return router;
}
