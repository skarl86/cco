import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams } from '@cco/db';
import { createProjectsService } from './projects.js';

describe('ProjectsService', () => {
  let database: Database;
  let service: ReturnType<typeof createProjectsService>;
  const teamId = 'team_proj';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createProjectsService(database);
    const now = Date.now();
    database.db.insert(teams).values({
      id: teamId, name: 'Proj Team', status: 'active',
      taskPrefix: 'PJ', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a project', () => {
    const project = service.create(teamId, {
      name: 'CCO Core',
      description: 'Main orchestrator project',
      repoPath: '/tmp/cco-test',
      baseBranch: 'main',
    });
    expect(project.id).toBeDefined();
    expect(project.name).toBe('CCO Core');
    expect(project.status).toBe('active');
    expect(project.baseBranch).toBe('main');
  });

  it('lists projects', () => {
    const list = service.list(teamId);
    expect(list.length).toBe(1);
  });

  it('gets by id', () => {
    const created = service.create(teamId, { name: 'Get Test' });
    const found = service.getById(teamId, created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Get Test');
  });

  it('updates a project', () => {
    const created = service.create(teamId, { name: 'Update Test' });
    const updated = service.update(teamId, created.id, {
      name: 'Updated Project',
      status: 'archived',
    });
    expect(updated!.name).toBe('Updated Project');
    expect(updated!.status).toBe('archived');
  });
});
