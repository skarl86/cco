import { Router, type Request, type Response } from 'express';
import { createWorkProductsService } from '../services/work-products.js';
import { createActivityService } from '../services/activity.js';
import { notFound, badRequest } from '../errors.js';
import { param } from '../middleware/params.js';
import { emitEvent } from '../realtime/live-events.js';
import { CreateWorkProductSchema } from '@cco/shared';
import type { Database } from '@cco/db';

/**
 * Task-scoped routes: GET / and POST /
 * Mounted at /api/teams/:teamId/tasks/:taskId/work-products
 */
export function workProductsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createWorkProductsService(database);
  const activity = createActivityService(database);

  router.get('/', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const taskId = param(req, 'taskId');
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const data = service.list(teamId, taskId, type);
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const taskId = param(req, 'taskId');

    const parsed = CreateWorkProductSchema.safeParse({ ...req.body, taskId });
    if (!parsed.success) {
      throw badRequest('Validation failed', parsed.error.flatten());
    }

    const wp = service.create(teamId, parsed.data);

    activity.log({
      teamId,
      actorType: 'system',
      action: 'work_product.created',
      entityType: 'work_product',
      entityId: wp.id,
      detail: { taskId, type: wp.type, title: wp.title },
    });

    emitEvent('work_product.created', teamId, { workProduct: wp });

    res.status(201).json({ data: wp });
  });

  return router;
}

/**
 * Direct access routes: GET /:id, PATCH /:id, DELETE /:id
 * Mounted at /api/teams/:teamId/work-products
 */
export function workProductsDirectRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createWorkProductsService(database);
  const activity = createActivityService(database);

  router.get('/:id', (req: Request, res: Response) => {
    const wp = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!wp) throw notFound('Work product not found');
    res.json({ data: wp });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const id = param(req, 'id');
    const updated = service.update(teamId, id, req.body);
    if (!updated) throw notFound('Work product not found');

    activity.log({
      teamId,
      actorType: 'system',
      action: 'work_product.updated',
      entityType: 'work_product',
      entityId: id,
      detail: { changes: Object.keys(req.body) },
    });

    emitEvent('work_product.updated', teamId, { workProduct: updated });

    res.json({ data: updated });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const id = param(req, 'id');
    const removed = service.remove(teamId, id);
    if (!removed) throw notFound('Work product not found');

    activity.log({
      teamId,
      actorType: 'system',
      action: 'work_product.deleted',
      entityType: 'work_product',
      entityId: id,
      detail: { taskId: removed.taskId, type: removed.type, title: removed.title },
    });

    res.status(204).send();
  });

  return router;
}
