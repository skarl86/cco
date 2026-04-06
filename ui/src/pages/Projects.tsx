import { useState } from 'react';
import { Link } from 'react-router';
import { useProjects, useCreateProject } from '@/api/queries.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { useTeamId } from '@/hooks/useTeamId.js';
import { Plus, FolderGit2, ExternalLink, X } from 'lucide-react';

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

export function Projects() {
  const teamId = useTeamId();
  const { data: projects = [] } = useProjects(teamId);
  const createProject = useCreateProject(teamId);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate(
      {
        name,
        description: description || undefined,
        repoUrl: repoUrl || undefined,
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setRepoUrl('');
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Projects</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl p-5 mb-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Create Project
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-md" style={{ color: 'var(--color-text-muted)' }}>
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
                  placeholder="My Project"
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Repository URL
                </label>
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
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
                disabled={createProject.isPending || !name.trim()}
                className="px-4 py-2 text-sm rounded-lg font-medium text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--color-accent)' }}
              >
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderGit2 size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No projects yet. Create one to organize your work.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="rounded-xl p-5 transition-all group"
              style={{
                ...cardStyle,
                textDecoration: 'none',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}
                >
                  <FolderGit2 size={18} />
                </div>
                {project.status && <StatusBadge status={project.status} />}
              </div>
              <h3
                className="font-semibold mb-1 group-hover:underline"
                style={{ color: 'var(--color-text)' }}
              >
                {project.name}
              </h3>
              {project.description && (
                <p
                  className="text-sm line-clamp-2 mb-3 leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {project.description}
                </p>
              )}
              {project.repoUrl && (
                <div
                  className="flex items-center gap-1.5 text-xs font-mono truncate mt-auto pt-3"
                  style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}
                >
                  <ExternalLink size={12} />
                  {project.repoUrl.replace(/^https?:\/\//, '')}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
