import { Router, type Request, type Response } from 'express';
import { createProjectsService } from '../services/projects.js';
import { badRequest, notFound } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function projectsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createProjectsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(param(req, 'teamId'));
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const project = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!project) throw notFound('Project not found');
    res.json({ data: project });
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, description, repoUrl, repoPath, baseBranch } = req.body;
    if (!name) throw badRequest('name is required');
    const project = service.create(param(req, 'teamId'), { name, description, repoUrl, repoPath, baseBranch });
    res.status(201).json({ data: project });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const updated = service.update(param(req, 'teamId'), param(req, 'id'), req.body);
    if (!updated) throw notFound('Project not found');
    res.json({ data: updated });
  });

  return router;
}
