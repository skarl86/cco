import { eq, and } from 'drizzle-orm';
import { projects } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createProjectsService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string) {
      return db.select().from(projects).where(eq(projects.teamId, teamId)).all();
    },

    getById(teamId: string, id: string) {
      return db.select().from(projects).where(
        and(eq(projects.teamId, teamId), eq(projects.id, id)),
      ).get();
    },

    create(teamId: string, data: {
      name: string;
      description?: string;
      repoUrl?: string;
      repoPath?: string;
      baseBranch?: string;
      worktreeParentDir?: string;
    }) {
      const now = Date.now();
      const id = generateId('proj');
      const row = {
        id,
        teamId,
        name: data.name,
        description: data.description ?? null,
        status: 'active' as const,
        repoUrl: data.repoUrl ?? null,
        repoPath: data.repoPath ?? null,
        baseBranch: data.baseBranch ?? 'main',
        worktreeParentDir: data.worktreeParentDir ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(projects).values(row).run();
      return row;
    },

    update(teamId: string, id: string, data: {
      name?: string;
      description?: string;
      status?: string;
      repoUrl?: string;
      repoPath?: string;
      baseBranch?: string;
    }) {
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description;
      if (data.status !== undefined) updates.status = data.status;
      if (data.repoUrl !== undefined) updates.repoUrl = data.repoUrl;
      if (data.repoPath !== undefined) updates.repoPath = data.repoPath;
      if (data.baseBranch !== undefined) updates.baseBranch = data.baseBranch;

      db.update(projects).set(updates).where(
        and(eq(projects.teamId, teamId), eq(projects.id, id)),
      ).run();

      return db.select().from(projects).where(
        and(eq(projects.teamId, teamId), eq(projects.id, id)),
      ).get();
    },
  };
}
