import { eq, and, desc, max } from 'drizzle-orm';
import { documents } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createDocumentsService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string, taskId: string) {
      return db
        .select()
        .from(documents)
        .where(and(eq(documents.teamId, teamId), eq(documents.taskId, taskId)))
        .orderBy(desc(documents.version))
        .all();
    },

    getLatest(teamId: string, taskId: string) {
      return db
        .select()
        .from(documents)
        .where(and(eq(documents.teamId, teamId), eq(documents.taskId, taskId)))
        .orderBy(desc(documents.version))
        .limit(1)
        .get();
    },

    getByVersion(teamId: string, taskId: string, version: number) {
      return db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.teamId, teamId),
            eq(documents.taskId, taskId),
            eq(documents.version, version),
          ),
        )
        .get();
    },

    create(
      teamId: string,
      data: {
        taskId: string;
        title?: string;
        content: string;
        authorType?: string;
        authorAgentId?: string;
      },
    ) {
      const maxResult = db
        .select({ maxVersion: max(documents.version) })
        .from(documents)
        .where(
          and(eq(documents.teamId, teamId), eq(documents.taskId, data.taskId)),
        )
        .get();

      const nextVersion = (maxResult?.maxVersion ?? 0) + 1;
      const now = Date.now();
      const id = generateId('doc');

      const row = {
        id,
        teamId,
        taskId: data.taskId,
        version: nextVersion,
        title: data.title ?? null,
        content: data.content,
        authorType: data.authorType ?? 'system',
        authorAgentId: data.authorAgentId ?? null,
        createdAt: now,
      };

      db.insert(documents).values(row).run();
      return row;
    },

    restore(teamId: string, taskId: string, version: number) {
      const source = db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.teamId, teamId),
            eq(documents.taskId, taskId),
            eq(documents.version, version),
          ),
        )
        .get();

      if (!source) return undefined;

      const maxResult = db
        .select({ maxVersion: max(documents.version) })
        .from(documents)
        .where(
          and(eq(documents.teamId, teamId), eq(documents.taskId, taskId)),
        )
        .get();

      const nextVersion = (maxResult?.maxVersion ?? 0) + 1;
      const now = Date.now();
      const id = generateId('doc');

      const row = {
        id,
        teamId,
        taskId,
        version: nextVersion,
        title: source.title,
        content: source.content,
        authorType: source.authorType,
        authorAgentId: source.authorAgentId,
        createdAt: now,
      };

      db.insert(documents).values(row).run();
      return row;
    },
  };
}
