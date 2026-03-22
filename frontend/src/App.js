import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { UsersPage } from './pages/UsersPage';
import { GscPage } from './pages/GscPage';
import { ClientWorkspace } from './pages/ClientWorkspace';
import { GuidePage } from './pages/GuidePage';
import './App.css';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/generate" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
};

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={isAdmin ? "/clients" : "/generate"} replace /> : <LoginPage />} />

      {/* Admin: Unified Dashboard (stats + clients) */}
      <Route path="/dashboard" element={<Navigate to="/clients" replace />} />
      <Route path="/clients" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      {/* Admin/Client: Client detail pages (Unified Workspace) */}
      <Route path="/clients/:clientId" element={<ProtectedRoute><ClientWorkspace /></ProtectedRoute>} />
      <Route path="/clients/:clientId/workspace" element={<ProtectedRoute><ClientWorkspace /></ProtectedRoute>} />

      {/* Legacy Admin: compatibility redirects or temporary access */}
      <Route path="/clients/:clientId/config" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
      <Route path="/clients/:clientId/generate" element={<ProtectedRoute><GeneratorPage /></ProtectedRoute>} />
      <Route path="/clients/:clientId/gsc" element={<ProtectedRoute><GscPage /></ProtectedRoute>} />

      {/* Admin: Users management */}
      <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />

      {/* Admin: Guide */}
      <Route path="/guide" element={<ProtectedRoute adminOnly><GuidePage /></ProtectedRoute>} />

      {/* Shared: Activity Log */}
      <Route path="/activity-log" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />

      {/* Client: Generate */}
      <Route path="/generate" element={<ProtectedRoute><GeneratorPage /></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
      <Route path="/configuration" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/articles" element={<Navigate to="/clients" replace />} />
      <Route path="/" element={<Navigate to={user ? (isAdmin ? "/clients" : "/generate") : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </Router>
  );
}

export default App;
