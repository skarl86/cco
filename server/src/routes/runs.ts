import { Router, type Request, type Response } from 'express';
import path from 'node:path';
import type { ExecutionService } from '../services/execution.js';
import { badRequest, notFound } from '../errors.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { param } from '../middleware/params.js';

function validateWorkingDirectory(input: unknown): string | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'string') return undefined;
  const resolved = path.resolve(input);
  if (resolved.includes('..')) return undefined;
  return resolved;
}

export function runsRouter(executionService: ExecutionService): Router {
  const router = Router({ mergeParams: true });

  // POST /api/teams/:teamId/agents/:agentId/run
  router.post('/teams/:teamId/agents/:agentId/run', asyncHandler(async (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const agentId = param(req, 'agentId');
    const { prompt, taskId, workingDirectory: rawWd } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      throw badRequest('prompt is required');
    }

    const workingDirectory = validateWorkingDirectory(rawWd);
    if (rawWd !== undefined && workingDirectory === undefined) {
      throw badRequest('Invalid workingDirectory');
    }

    const result = await executionService.startRun({
      teamId,
      agentId,
      prompt,
      taskId,
      invocationSource: 'on_demand',
      workingDirectory,
    });
    res.json({ data: result });
  }));

  // GET /api/teams/:teamId/runs
  router.get('/teams/:teamId/runs', (req: Request, res: Response) => {
    const data = executionService.listRuns(param(req, 'teamId'));
    res.json({ data });
  });

  // GET /api/runs/:id
  router.get('/runs/:id', (req: Request, res: Response) => {
    const run = executionService.getRunById(param(req, 'id'));
    if (!run) throw notFound('Run not found');
    res.json({ data: run });
  });

  return router;
}
