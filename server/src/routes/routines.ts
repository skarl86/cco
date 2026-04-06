import { Router, type Request, type Response } from 'express';
import { createRoutinesService } from '../services/routines.js';
import { createTasksService } from '../services/tasks.js';
import { badRequest, notFound } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function routinesRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const tasksService = createTasksService(database);
  const service = createRoutinesService(database, tasksService);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(param(req, 'teamId'));
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { title, description, assigneeAgentId, cronExpression, projectId } = req.body;
    if (!title || !assigneeAgentId) {
      throw badRequest('title and assigneeAgentId are required');
    }
    const routine = service.create({
      teamId: param(req, 'teamId'),
      title, description, assigneeAgentId, cronExpression, projectId,
    });
    res.status(201).json({ data: routine });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const updated = service.update(param(req, 'teamId'), param(req, 'id'), req.body);
    if (!updated) throw notFound('Routine not found');
    res.json({ data: updated });
  });

  router.post('/:id/trigger', (req: Request, res: Response) => {
    const task = service.trigger(param(req, 'teamId'), param(req, 'id'));
    if (!task) throw badRequest('Routine not active or not found');
    res.status(201).json({ data: task });
  });

  return router;
}
