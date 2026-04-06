import { eq, and } from 'drizzle-orm';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { executionWorkspaces, workspaceRuns, projects } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

function workspacesDir(): string {
  return path.join(os.homedir(), '.cco', 'workspaces');
}

export function createExecutionWorkspacesService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string, projectId?: string) {
      if (projectId) {
        return db
          .select()
          .from(executionWorkspaces)
          .where(and(eq(executionWorkspaces.teamId, teamId), eq(executionWorkspaces.projectId, projectId)))
          .all();
      }
      return db.select().from(executionWorkspaces).where(eq(executionWorkspaces.teamId, teamId)).all();
    },

    getById(teamId: string, id: string) {
      return db
        .select()
        .from(executionWorkspaces)
        .where(and(eq(executionWorkspaces.teamId, teamId), eq(executionWorkspaces.id, id)))
        .get();
    },

    create(
      teamId: string,
      data: {
        name: string;
        description?: string;
        projectId?: string;
        branchName?: string;
        baseRef?: string;
      },
    ) {
      const now = Date.now();
      const id = generateId('ws');
      const wsPath = path.join(workspacesDir(), id);
      const row = {
        id,
        teamId,
        name: data.name,
        description: data.description ?? null,
        projectId: data.projectId ?? null,
        status: 'pending' as const,
        workspacePath: wsPath,
        branchName: data.branchName ?? null,
        baseRef: data.baseRef ?? 'main',
        error: null,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(executionWorkspaces).values(row).run();
      return row;
    },

    provision(teamId: string, id: string) {
      const workspace = db
        .select()
        .from(executionWorkspaces)
        .where(and(eq(executionWorkspaces.teamId, teamId), eq(executionWorkspaces.id, id)))
        .get();

      if (!workspace) return null;

      const now = Date.now();

      // Update status to provisioning
      db.update(executionWorkspaces)
        .set({ status: 'provisioning', updatedAt: now })
        .where(eq(executionWorkspaces.id, id))
        .run();

      // If workspace has a project, look up the repo path
      let repoPath: string | null = null;
      if (workspace.projectId) {
        const project = db
          .select()
          .from(projects)
          .where(eq(projects.id, workspace.projectId))
          .get();
        repoPath = project?.repoPath ?? null;
      }

      if (!repoPath) {
        db.update(executionWorkspaces)
          .set({ status: 'error', error: 'No repository path configured on project', updatedAt: Date.now() })
          .where(eq(executionWorkspaces.id, id))
          .run();
        return db
          .select()
          .from(executionWorkspaces)
          .where(eq(executionWorkspaces.id, id))
          .get();
      }

      try {
        const wsPath = workspace.workspacePath ?? path.join(workspacesDir(), id);
        const branch = workspace.branchName ?? `cco/workspace/${id}`;
        const baseRef = workspace.baseRef ?? 'main';

        // Ensure the parent directory exists
        fs.mkdirSync(path.dirname(wsPath), { recursive: true });

        // Create git worktree
        execFileSync('git', ['worktree', 'add', '-b', branch, wsPath, baseRef], {
          cwd: repoPath,
          stdio: 'pipe',
        });

        db.update(executionWorkspaces)
          .set({
            status: 'ready',
            workspacePath: wsPath,
            branchName: branch,
            error: null,
            updatedAt: Date.now(),
          })
          .where(eq(executionWorkspaces.id, id))
          .run();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown provisioning error';
        db.update(executionWorkspaces)
          .set({ status: 'error', error: message, updatedAt: Date.now() })
          .where(eq(executionWorkspaces.id, id))
          .run();
      }

      return db
        .select()
        .from(executionWorkspaces)
        .where(eq(executionWorkspaces.id, id))
        .get();
    },

    archive(teamId: string, id: string) {
      const workspace = db
        .select()
        .from(executionWorkspaces)
        .where(and(eq(executionWorkspaces.teamId, teamId), eq(executionWorkspaces.id, id)))
        .get();

      if (!workspace) return null;

      // Clean up git worktree if workspace path exists
      if (workspace.workspacePath && workspace.projectId) {
        const project = db
          .select()
          .from(projects)
          .where(eq(projects.id, workspace.projectId))
          .get();

        if (project?.repoPath && fs.existsSync(workspace.workspacePath)) {
          try {
            execFileSync('git', ['worktree', 'remove', workspace.workspacePath, '--force'], {
              cwd: project.repoPath,
              stdio: 'pipe',
            });
          } catch {
            // Best-effort cleanup — continue archiving even if worktree removal fails
          }
        }
      }

      db.update(executionWorkspaces)
        .set({ status: 'archived', updatedAt: Date.now() })
        .where(eq(executionWorkspaces.id, id))
        .run();

      return db
        .select()
        .from(executionWorkspaces)
        .where(eq(executionWorkspaces.id, id))
        .get();
    },

    listRuns(teamId: string, workspaceId: string) {
      return db
        .select()
        .from(workspaceRuns)
        .where(and(eq(workspaceRuns.teamId, teamId), eq(workspaceRuns.workspaceId, workspaceId)))
        .all();
    },
  };
}
