import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Shell } from '@/components/layout/Shell';
import { Dashboard } from '@/pages/Dashboard';
import { Agents } from '@/pages/Agents';
import { Tasks } from '@/pages/Tasks';
import { Runs } from '@/pages/Runs';
import { SettingsPage } from '@/pages/SettingsPage';
import '@/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="runs" element={<Runs />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
