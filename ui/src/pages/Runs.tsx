import { useState } from 'react';
import { useRuns, useRun } from '@/api/queries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTeamId } from '@/hooks/useTeamId';
import { Play, X, Clock, Cpu, FileText } from 'lucide-react';

export function Runs() {
  const teamId = useTeamId();
  const { data: runs = [] } = useRuns(teamId);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  return (
    <div className="flex gap-6">
      <div className={selectedRunId ? 'w-1/2 shrink-0' : 'w-full'}>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Runs</h2>

        {runs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Play size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No runs yet. Execute an agent to see results here.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Run ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run: any) => {
                  const duration = run.finishedAt && run.startedAt
                    ? `${((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s`
                    : '—';
                  const isSelected = selectedRunId === run.id;
                  return (
                    <tr
                      key={run.id}
                      onClick={() => setSelectedRunId(isSelected ? null : run.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-2 border-l-blue-500'
                          : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{run.id.slice(0, 16)}</td>
                      <td className="px-5 py-3 text-gray-700">{run.agentId.slice(0, 16)}</td>
                      <td className="px-5 py-3"><StatusBadge status={run.status} /></td>
                      <td className="px-5 py-3 text-gray-500 capitalize">{run.invocationSource.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-500">{duration}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400">{new Date(run.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRunId && (
        <RunDetail runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
      )}
    </div>
  );
}

function RunDetail({ runId, onClose }: { runId: string; onClose: () => void }) {
  const { data: run, isLoading } = useRun(runId);

  if (isLoading) {
    return (
      <div className="flex-1 rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex-1 rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-400">
        Run not found.
      </div>
    );
  }

  const duration = run.finishedAt && run.startedAt
    ? `${((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s`
    : '—';

  const resultJson = run.resultJson ? (typeof run.resultJson === 'string' ? JSON.parse(run.resultJson) : run.resultJson) : null;
  const summary = resultJson?.summary ?? null;

  return (
    <div className="flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <StatusBadge status={run.status} />
          <span className="font-mono text-xs text-gray-400">{run.id}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-200 transition-colors">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-4 px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={14} className="text-gray-400" />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Cpu size={14} className="text-gray-400" />
          <span className="truncate">{run.agentId.slice(0, 20)}</span>
        </div>
        {run.exitCode !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText size={14} className="text-gray-400" />
            <span>Exit: {run.exitCode}</span>
          </div>
        )}
      </div>

      {/* Usage */}
      {run.usageJson && (
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <UsageBar usage={typeof run.usageJson === 'string' ? JSON.parse(run.usageJson) : run.usageJson} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Summary (assistant output) */}
        {summary && (
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary</h4>
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{summary}</div>
          </div>
        )}

        {/* Error */}
        {run.error && (
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Error</h4>
            <pre className="text-xs text-red-700 bg-red-50 rounded-lg p-3 overflow-x-auto">{run.error}</pre>
          </div>
        )}

        {/* Stdout */}
        {run.stdoutExcerpt && (
          <div className="px-5 py-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Output Log
              <span className="ml-2 text-gray-400 normal-case font-normal">
                ({(run.stdoutExcerpt.length / 1000).toFixed(1)}KB)
              </span>
            </h4>
            <pre className="text-xs text-gray-600 bg-gray-900 text-gray-300 rounded-lg p-4 overflow-x-auto max-h-96 font-mono leading-relaxed">
              {formatStdout(run.stdoutExcerpt)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function UsageBar({ usage }: { usage: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } }) {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cached = usage.cachedInputTokens ?? 0;
  const total = input + output;

  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span>Tokens:</span>
      <span className="font-mono">{input.toLocaleString()} in</span>
      <span className="font-mono">{output.toLocaleString()} out</span>
      {cached > 0 && <span className="font-mono text-gray-400">({cached.toLocaleString()} cached)</span>}
      <span className="font-mono font-medium text-gray-700">{total.toLocaleString()} total</span>
    </div>
  );
}

function formatStdout(raw: string): string {
  const lines = raw.split('\n');
  const meaningful: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed);
      const type = event.type;
      const subtype = event.subtype;

      // Skip hook/system noise
      if (type === 'system' && (subtype === 'hook_started' || subtype === 'hook_response')) continue;

      if (type === 'assistant') {
        const content = event.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              meaningful.push(`[assistant] ${block.text}`);
            }
            if (block.type === 'tool_use') {
              const input = typeof block.input === 'object' ? JSON.stringify(block.input).slice(0, 200) : '';
              meaningful.push(`[tool] ${block.name}(${input})`);
            }
          }
        }
      } else if (type === 'tool_result' || type === 'result') {
        const content = event.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              meaningful.push(`[result] ${block.text.slice(0, 500)}`);
            }
          }
        }
      } else if (type === 'system' && subtype === 'init') {
        meaningful.push(`[system] Session: ${event.session_id ?? '?'}, Model: ${event.model ?? '?'}`);
      }
    } catch {
      // Non-JSON line, include as-is
      meaningful.push(trimmed);
    }
  }

  return meaningful.length > 0 ? meaningful.join('\n') : raw.slice(0, 2000);
}
