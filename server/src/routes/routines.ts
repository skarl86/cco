import { Router, type Request, type Response } from 'express';
import { createRoutinesService } from '../services/routines.js';
import { createTasksService } from '../services/tasks.js';
import type { Database } from '@cco/db';

export function routinesRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const tasksService = createTasksService(database);
  const service = createRoutinesService(database, tasksService);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(req.params.teamId);
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { title, description, assigneeAgentId, cronExpression, projectId } = req.body;
    if (!title || !assigneeAgentId) {
      res.status(400).json({ error: 'title and assigneeAgentId are required' });
      return;
    }
    const routine = service.create({
      teamId: req.params.teamId,
      title, description, assigneeAgentId, cronExpression, projectId,
    });
    res.status(201).json({ data: routine });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const updated = service.update(req.params.teamId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Routine not found' });
      return;
    }
    res.json({ data: updated });
  });

  router.post('/:id/trigger', (req: Request, res: Response) => {
    const task = service.trigger(req.params.teamId, req.params.id);
    if (!task) {
      res.status(400).json({ error: 'Routine not active or not found' });
      return;
    }
    res.status(201).json({ data: task });
  });

  return router;
}
