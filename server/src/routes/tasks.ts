import { Router, type Request, type Response } from 'express';
import { CreateTaskSchema } from '@cco/shared';
import { createTasksService } from '../services/tasks.js';
import { notFound, badRequest } from '../errors.js';
import { validate } from '../middleware/validate.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function tasksRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createTasksService(database);

  router.get('/', (req: Request, res: Response) => {
    const { status, assigneeAgentId } = req.query;
    const data = service.list(param(req, 'teamId'), {
      status: status as string | undefined,
      assigneeAgentId: assigneeAgentId as string | undefined,
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

  return router;
}
