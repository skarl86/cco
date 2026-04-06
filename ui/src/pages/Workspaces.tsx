import { useState } from 'react';
import {
  useWorkspaces,
  useCreateWorkspace,
  useProvisionWorkspace,
  useArchiveWorkspace,
  useProjects,
} from '@/api/queries.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { useTeamId } from '@/hooks/useTeamId.js';
import { Plus, FolderGit2, X, Play, Archive, GitBranch, FolderOpen } from 'lucide-react';

const cardStyle = {
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--color-border)',
};

const inputStyle = {
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
};

export function Workspaces() {
  const teamId = useTeamId();
  const { data: workspaces = [] } = useWorkspaces(teamId);
  const { data: projects = [] } = useProjects(teamId);
  const createWorkspace = useCreateWorkspace(teamId);
  const provisionWorkspace = useProvisionWorkspace(teamId);
  const archiveWorkspace = useArchiveWorkspace(teamId);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [branchName, setBranchName] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspace.mutate(
      {
        name,
        description: description || undefined,
        projectId: projectId || undefined,
        branchName: branchName || undefined,
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setProjectId('');
          setBranchName('');
          setShowForm(false);
        },
      },
    );
  }

  function handleProvision(id: string) {
    provisionWorkspace.mutate(id);
  }

  function handleArchive(id: string) {
    archiveWorkspace.mutate(id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Workspaces
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus size={16} /> New Workspace
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl p-5 mb-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Create Workspace
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 rounded-md"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="feature-auth-flow"
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Branch Name
              </label>
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this workspace be used for?"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg font-medium"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createWorkspace.isPending || !name.trim()}
                className="px-4 py-2 text-sm rounded-lg font-medium text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--color-accent)' }}
              >
                {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workspace grid */}
      {workspaces.length === 0 ? (
        <div className="text-center py-20">
          <FolderGit2
            size={48}
            className="mx-auto mb-3 opacity-20"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No workspaces yet. Create one to isolate agent execution.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws: any) => (
            <div key={ws.id} className="rounded-xl p-5 flex flex-col" style={cardStyle}>
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}
                >
                  <FolderGit2 size={18} />
                </div>
                <StatusBadge status={ws.status} />
              </div>

              <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                {ws.name}
              </h3>

              {ws.description && (
                <p
                  className="text-sm line-clamp-2 mb-3 leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {ws.description}
                </p>
              )}

              <div className="mt-auto space-y-2 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                {ws.branchName && (
                  <div className="flex items-center gap-1.5 text-xs font-mono truncate" style={{ color: 'var(--color-text-muted)' }}>
                    <GitBranch size={12} />
                    {ws.branchName}
                  </div>
                )}
                {ws.workspacePath && (
                  <div className="flex items-center gap-1.5 text-xs font-mono truncate" style={{ color: 'var(--color-text-muted)' }}>
                    <FolderOpen size={12} />
                    {ws.workspacePath}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                {ws.status === 'pending' && (
                  <button
                    onClick={() => handleProvision(ws.id)}
                    disabled={provisionWorkspace.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 transition-opacity"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Play size={12} />
                    {provisionWorkspace.isPending ? 'Provisioning...' : 'Provision'}
                  </button>
                )}
                {ws.status === 'error' && (
                  <button
                    onClick={() => handleProvision(ws.id)}
                    disabled={provisionWorkspace.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 transition-opacity"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Play size={12} />
                    Retry
                  </button>
                )}
                {(ws.status === 'ready' || ws.status === 'error' || ws.status === 'pending') && (
                  <button
                    onClick={() => handleArchive(ws.id)}
                    disabled={archiveWorkspace.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-opacity"
                    style={{
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                )}
              </div>

              {ws.error && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-error)' }}>
                  {ws.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
