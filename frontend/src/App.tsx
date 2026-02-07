import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import { authApi } from './lib/api';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import CalendarPage from './pages/CalendarPage';
import FocusPage from './pages/FocusPage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SessionValidator({ children }: { children: React.ReactNode }) {
  const { user, setUser, clearUser } = useAuthStore();
  const [ready, setReady] = useState(!user);

  useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await authApi.me();
        setUser(res.user);
        return res.user;
      } catch {
        clearUser();
        return null;
      } finally {
        setReady(true);
      }
    },
    enabled: !!user && !ready,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  if (!ready) return <LoadingSpinner />;
  return <>{children}</>;
}

export default function App() {
  return (
    <SessionValidator>
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/focus" element={<ProtectedRoute><FocusPage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="creator-dashboard" element={<CreatorDashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </SessionValidator>
  );
}
