import { GitPullRequest, GitBranch, GitCommit, FileOutput, FileText, Globe, Star, ExternalLink } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge.js';

const TYPE_ICONS: Record<string, typeof GitPullRequest> = {
  pull_request: GitPullRequest,
  branch: GitBranch,
  commit: GitCommit,
  artifact: FileOutput,
  document: FileText,
  preview_url: Globe,
};

interface WorkProductCardProps {
  readonly wp: {
    readonly id: string;
    readonly type: string;
    readonly provider: string;
    readonly title: string;
    readonly url?: string;
    readonly externalId?: string;
    readonly isPrimary?: number;
    readonly status: string;
    readonly reviewState: string;
    readonly summary?: string;
  };
  readonly onReview?: (id: string, state: string) => void;
}

export function WorkProductCard({ wp, onReview }: WorkProductCardProps) {
  const Icon = TYPE_ICONS[wp.type] ?? FileOutput;

  return (
    <div className="rounded-lg p-4" style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
    }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: 'var(--color-accent)' }} />
          {wp.isPrimary === 1 && <Star size={14} style={{ color: 'var(--color-warning)' }} fill="currentColor" />}
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{wp.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={wp.status} />
          {wp.reviewState !== 'none' && <StatusBadge status={wp.reviewState} />}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>{wp.provider}</span>
        {wp.externalId && <span>#{wp.externalId}</span>}
        {wp.url && (
          <a href={wp.url} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1 hover:underline" style={{ color: 'var(--color-accent)' }}>
            Open <ExternalLink size={10} />
          </a>
        )}
      </div>

      {wp.summary && (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{wp.summary}</p>
      )}

      {wp.reviewState === 'needs_review' && onReview && (
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => onReview(wp.id, 'approved')}
            className="px-3 py-1 text-xs font-medium rounded-lg"
            style={{ background: 'var(--color-success)', color: '#fff' }}>
            Approve
          </button>
          <button onClick={() => onReview(wp.id, 'changes_requested')}
            className="px-3 py-1 text-xs font-medium rounded-lg"
            style={{ background: 'var(--color-warning)', color: '#fff' }}>
            Request Changes
          </button>
        </div>
      )}
    </div>
  );
}
