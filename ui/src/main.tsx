import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/context/ThemeProvider';
import { ToastProvider } from '@/context/ToastProvider';
import { Shell } from '@/components/layout/Shell';
import { Dashboard } from '@/pages/Dashboard';
import { Agents } from '@/pages/Agents';
import AgentDetail from '@/pages/AgentDetail';
import { Tasks } from '@/pages/Tasks';
import TaskDetail from '@/pages/TaskDetail';
import { Runs } from '@/pages/Runs';
import { Projects } from '@/pages/Projects';
import { Goals } from '@/pages/Goals';
import { Routines } from '@/pages/Routines';
import { Approvals } from '@/pages/Approvals';
import { ActivityPage } from '@/pages/ActivityPage';
import { Costs } from '@/pages/Costs';
import { SettingsPage } from '@/pages/SettingsPage';
import { Workspaces } from '@/pages/Workspaces';
import { CommandPalette } from '@/components/CommandPalette';
import '@/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <CommandPalette />
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Dashboard />} />
                <Route path="agents" element={<Agents />} />
                <Route path="agents/:agentId" element={<AgentDetail />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="tasks/:taskId" element={<TaskDetail />} />
                <Route path="runs" element={<Runs />} />
                <Route path="projects" element={<Projects />} />
                <Route path="goals" element={<Goals />} />
                <Route path="routines" element={<Routines />} />
                <Route path="approvals" element={<Approvals />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="costs" element={<Costs />} />
                <Route path="workspaces" element={<Workspaces />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
