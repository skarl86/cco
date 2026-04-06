import { Router, type Request, type Response } from 'express';
import { createExecutionWorkspacesService } from '../services/execution-workspaces.js';
import { badRequest, notFound } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function workspacesRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createExecutionWorkspacesService(database);

  router.get('/', (req: Request, res: Response) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const data = service.list(param(req, 'teamId'), projectId);
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, description, projectId, branchName, baseRef } = req.body;
    if (!name) throw badRequest('name is required');
    const workspace = service.create(param(req, 'teamId'), {
      name,
      description,
      projectId,
      branchName,
      baseRef,
    });
    res.status(201).json({ data: workspace });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const workspace = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!workspace) throw notFound('Workspace not found');
    res.json({ data: workspace });
  });

  router.post('/:id/provision', (req: Request, res: Response) => {
    const workspace = service.provision(param(req, 'teamId'), param(req, 'id'));
    if (!workspace) throw notFound('Workspace not found');
    res.json({ data: workspace });
  });

  router.post('/:id/archive', (req: Request, res: Response) => {
    const workspace = service.archive(param(req, 'teamId'), param(req, 'id'));
    if (!workspace) throw notFound('Workspace not found');
    res.json({ data: workspace });
  });

  router.get('/:id/runs', (req: Request, res: Response) => {
    const workspace = service.getById(param(req, 'teamId'), param(req, 'id'));
    if (!workspace) throw notFound('Workspace not found');
    const data = service.listRuns(param(req, 'teamId'), param(req, 'id'));
    res.json({ data });
  });

  return router;
}
