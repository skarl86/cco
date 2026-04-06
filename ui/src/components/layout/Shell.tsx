import { NavLink, Outlet } from 'react-router';
import {
  LayoutDashboard, Bot, ListTodo, Play, Settings,
  Target, CalendarClock, ShieldCheck, Activity, DollarSign,
  FolderGit2, Moon, Sun,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/runs', icon: Play, label: 'Runs' },
  { to: '/projects', icon: Target, label: 'Projects' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/routines', icon: CalendarClock, label: 'Routines' },
  { to: '/approvals', icon: ShieldCheck, label: 'Approvals' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/workspaces', icon: FolderGit2, label: 'Workspaces' },
  { to: '/costs', icon: DollarSign, label: 'Costs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function Shell() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen" style={{ background: 'var(--color-bg)' }}>
      <aside
        className="w-56 shrink-0 flex flex-col"
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}
      >
        <div className="p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-accent)' }}>
            CCO
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Claude Code Orchestrator
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={({ isActive }) => ({
                background: isActive ? 'var(--color-accent-light)' : 'transparent',
                color: isActive ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
              })}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
