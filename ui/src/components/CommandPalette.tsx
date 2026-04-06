import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, Bot, ListTodo, Play, Target,
  CalendarClock, ShieldCheck, Activity, DollarSign, FolderGit2, Settings, Search,
} from 'lucide-react';

const ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { path: '/agents', label: 'Agents', icon: Bot, keywords: 'bot team' },
  { path: '/tasks', label: 'Tasks', icon: ListTodo, keywords: 'issues todo' },
  { path: '/runs', label: 'Runs', icon: Play, keywords: 'execution' },
  { path: '/projects', label: 'Projects', icon: Target, keywords: 'repo' },
  { path: '/goals', label: 'Goals', icon: Target, keywords: 'objectives' },
  { path: '/routines', label: 'Routines', icon: CalendarClock, keywords: 'cron schedule' },
  { path: '/approvals', label: 'Approvals', icon: ShieldCheck, keywords: 'review approve' },
  { path: '/activity', label: 'Activity', icon: Activity, keywords: 'log audit' },
  { path: '/workspaces', label: 'Workspaces', icon: FolderGit2, keywords: 'worktree git branch isolation' },
  { path: '/costs', label: 'Costs', icon: DollarSign, keywords: 'budget spend' },
  { path: '/settings', label: 'Settings', icon: Settings, keywords: 'config' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.keywords.includes(q);
      })
    : ITEMS;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSelect(path: string) {
    navigate(path);
    setOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex].path);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'oklch(0% 0 0 / 0.4)' }}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search pages..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--color-bg-alt)', color: 'var(--color-text-muted)' }}
          >
            esc
          </kbd>
        </div>

        <div className="max-h-64 overflow-y-auto py-2">
          {filtered.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleSelect(item.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
                style={{
                  background: i === selectedIndex ? 'var(--color-accent-light)' : 'transparent',
                  color: i === selectedIndex ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>No results</p>
          )}
        </div>
      </div>
    </div>
  );
}
