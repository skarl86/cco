import { Router, type Request, type Response } from 'express';
import path from 'node:path';
import type { ExecutionService } from '../services/execution.js';

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
  router.post('/teams/:teamId/agents/:agentId/run', async (req: Request, res: Response) => {
    const { teamId, agentId } = req.params;
    const { prompt, taskId, workingDirectory: rawWd } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }

    const workingDirectory = validateWorkingDirectory(rawWd);
    if (rawWd !== undefined && workingDirectory === undefined) {
      res.status(400).json({ error: 'Invalid workingDirectory' });
      return;
    }

    try {
      const result = await executionService.startRun({
        teamId,
        agentId,
        prompt,
        taskId,
        invocationSource: 'on_demand',
        workingDirectory,
      });
      res.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      res.status(500).json({ error: message });
    }
  });

  // GET /api/teams/:teamId/runs
  router.get('/teams/:teamId/runs', (req: Request, res: Response) => {
    const data = executionService.listRuns(req.params.teamId);
    res.json({ data });
  });

  // GET /api/runs/:id
  router.get('/runs/:id', (req: Request, res: Response) => {
    const run = executionService.getRunById(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    res.json({ data: run });
  });

  return router;
}
