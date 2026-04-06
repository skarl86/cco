import { NavLink, Outlet } from 'react-router';
import { LayoutDashboard, Bot, ListTodo, Play, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/runs', icon: Play, label: 'Runs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function Shell() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            <span className="text-blue-600">CCO</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Claude Code Orchestrator</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50/50">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
