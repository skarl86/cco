import { useState } from 'react';
import { useApprovals, useDecideApproval } from '@/api/queries.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { useTeamId } from '@/hooks/useTeamId.js';
import { ShieldCheck, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

const cardStyle = {
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--color-border)',
};

type TabValue = 'pending' | 'all';

export function Approvals() {
  const teamId = useTeamId();
  const [tab, setTab] = useState<TabValue>('pending');
  const statusFilter = tab === 'pending' ? 'pending' : undefined;
  const { data: approvals = [] } = useApprovals(teamId, statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Approvals</h2>
        <span className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {approvals.length} item{approvals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg mb-6 w-fit"
        style={{ background: 'var(--color-bg-alt)' }}
      >
        {(['pending', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors"
            style={{
              background: tab === t ? 'var(--color-surface)' : 'transparent',
              color: tab === t ? 'var(--color-text)' : 'var(--color-text-muted)',
              boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-20">
          <ShieldCheck size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {tab === 'pending' ? 'No pending approvals.' : 'No approvals found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval: any) => (
            <ApprovalCard key={approval.id} approval={approval} teamId={teamId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ approval, teamId }: { approval: any; teamId: string }) {
  const decideApproval = useDecideApproval(teamId);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  const isPending = approval.status === 'pending';

  function handleDecision(decision: 'approved' | 'rejected') {
    decideApproval.mutate({
      id: approval.id,
      decision,
      note: note || undefined,
    });
  }

  return (
    <div className="rounded-xl p-5" style={cardStyle}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: isPending ? 'var(--color-warning-light)' : 'var(--color-bg-alt)',
              color: isPending ? 'var(--color-warning)' : 'var(--color-text-muted)',
            }}
          >
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize" style={{ color: 'var(--color-text)' }}>
                {approval.type ?? 'approval'}
              </span>
              <StatusBadge status={approval.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {approval.requesterId && (
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  by {approval.requesterId.slice(0, 12)}
                </span>
              )}
              <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(approval.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payload viewer */}
      {approval.payload && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Payload
          </button>
          {expanded && (
            <pre
              className="mt-2 text-xs p-3 rounded-lg overflow-x-auto font-mono leading-relaxed"
              style={{ background: 'var(--color-bg-alt)', color: 'var(--color-text-secondary)' }}
            >
              {typeof approval.payload === 'string'
                ? approval.payload
                : JSON.stringify(approval.payload, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Actions for pending approvals */}
      {isPending && (
        <div
          className="flex items-center gap-3 pt-3"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note..."
            className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none"
            style={{
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          />
          <button
            onClick={() => handleDecision('approved')}
            disabled={decideApproval.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--color-success)' }}
          >
            <Check size={14} /> Approve
          </button>
          <button
            onClick={() => handleDecision('rejected')}
            disabled={decideApproval.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--color-error)' }}
          >
            <X size={14} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
