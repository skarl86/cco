import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, tasks } from '@cco/db';
import { createLabelsService } from './labels.js';

describe('LabelsService', () => {
  let database: Database;
  let service: ReturnType<typeof createLabelsService>;
  const teamId = 'team_lbl';
  const taskId = 'task_lbl';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createLabelsService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Label Team', status: 'active',
      taskPrefix: 'LB', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(tasks).values({
      id: taskId, teamId, title: 'Labelable task',
      status: 'todo', priority: 'medium', originKind: 'manual',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a label', () => {
    const label = service.create(teamId, { name: 'bug' });
    expect(label.id).toBeDefined();
    expect(label.name).toBe('bug');
    expect(label.color).toBe('#6B7280');
    expect(label.teamId).toBe(teamId);
  });

  it('creates a label with custom color', () => {
    const label = service.create(teamId, { name: 'feature', color: '#10B981' });
    expect(label.color).toBe('#10B981');
  });

  it('lists labels for a team', () => {
    const all = service.list(teamId);
    expect(all.length).toBe(2);
    const names = all.map((l) => l.name);
    expect(names).toContain('bug');
    expect(names).toContain('feature');
  });

  it('returns empty list for unknown team', () => {
    const all = service.list('team_nonexistent');
    expect(all).toEqual([]);
  });

  it('syncs task labels', () => {
    const all = service.list(teamId);
    const bugLabel = all.find((l) => l.name === 'bug')!;
    const featureLabel = all.find((l) => l.name === 'feature')!;

    service.syncTaskLabels(teamId, taskId, [bugLabel.id, featureLabel.id]);

    const taskLabels = service.getTaskLabels(teamId, taskId);
    expect(taskLabels.length).toBe(2);
    const labelNames = taskLabels.map((l) => l.name);
    expect(labelNames).toContain('bug');
    expect(labelNames).toContain('feature');
  });

  it('replaces task labels on re-sync', () => {
    const all = service.list(teamId);
    const featureLabel = all.find((l) => l.name === 'feature')!;

    service.syncTaskLabels(teamId, taskId, [featureLabel.id]);

    const taskLabels = service.getTaskLabels(teamId, taskId);
    expect(taskLabels.length).toBe(1);
    expect(taskLabels[0].name).toBe('feature');
  });

  it('clears task labels when syncing empty array', () => {
    service.syncTaskLabels(teamId, taskId, []);
    const taskLabels = service.getTaskLabels(teamId, taskId);
    expect(taskLabels).toEqual([]);
  });

  it('ignores labels from other teams during sync', () => {
    const otherTeamId = 'team_other';
    const now = Date.now();
    database.db.insert(teams).values({
      id: otherTeamId, name: 'Other Team', status: 'active',
      taskPrefix: 'OT', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    const otherLabel = service.create(otherTeamId, { name: 'external' });

    // Try to sync other team's label onto our task
    service.syncTaskLabels(teamId, taskId, [otherLabel.id]);
    const taskLabels = service.getTaskLabels(teamId, taskId);
    expect(taskLabels).toEqual([]);
  });

  it('returns empty for task with no labels', () => {
    const taskLabels = service.getTaskLabels(teamId, 'task_nonexistent');
    expect(taskLabels).toEqual([]);
  });

  it('deletes a label and removes it from tasks', () => {
    const all = service.list(teamId);
    const featureLabel = all.find((l) => l.name === 'feature')!;

    // Attach to task first
    service.syncTaskLabels(teamId, taskId, [featureLabel.id]);
    expect(service.getTaskLabels(teamId, taskId).length).toBe(1);

    // Delete the label
    service.delete(featureLabel.id);

    // Label should be gone
    const remaining = service.list(teamId);
    expect(remaining.find((l) => l.name === 'feature')).toBeUndefined();

    // Task-label association should also be gone
    const taskLabels = service.getTaskLabels(teamId, taskId);
    expect(taskLabels).toEqual([]);
  });
});
