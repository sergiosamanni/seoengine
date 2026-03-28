import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClientProvider } from './contexts/ClientContext';
import { Toaster } from './components/ui/sonner';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { UsersPage } from './pages/UsersPage';
import { ClientReportsPage } from './pages/reports/ClientReportsPage';
import { CitationsPage } from './pages/CitationsPage';
import { GmbPage } from './pages/GmbPage';
import { ReportEditPage } from './pages/reports/ReportEditPage';
import { SeoGeoGuidelines } from './pages/SeoGeoGuidelines';
import RedditPage from './pages/RedditPage';
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
      <Route path="/login" element={user ? <Navigate to={isAdmin ? "/dashboard" : "/generate"} replace /> : <LoginPage />} />

      {/* Admin: Unified Dashboard (stats + clients) */}
      <Route path="/dashboard" element={<ProtectedRoute adminOnly><DashboardPage /></ProtectedRoute>} />

      {/* Admin: Client detail pages (Unified) */}
      <Route path="/clients/:clientId" element={<ProtectedRoute adminOnly><GeneratorPage /></ProtectedRoute>} />
      <Route path="/clients/:clientId/config" element={<ProtectedRoute adminOnly><GeneratorPage /></ProtectedRoute>} />
      <Route path="/clients/:clientId/generate" element={<ProtectedRoute adminOnly><GeneratorPage /></ProtectedRoute>} />
      <Route path="/clients/:clientId/gsc" element={<ProtectedRoute adminOnly><GeneratorPage /></ProtectedRoute>} />

      {/* Admin: Users management */}
      <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />

      {/* Admin: Reports section (Direct access via client cards) */}
      <Route path="/reports/client/:clientId" element={<ProtectedRoute adminOnly><ClientReportsPage /></ProtectedRoute>} />
      <Route path="/reports/:reportId" element={<ProtectedRoute adminOnly><ReportEditPage /></ProtectedRoute>} />
      <Route path="/citations" element={<ProtectedRoute adminOnly><CitationsPage /></ProtectedRoute>} />
      <Route path="/gmb" element={<ProtectedRoute adminOnly><GmbPage /></ProtectedRoute>} />
      <Route path="/reddit" element={<ProtectedRoute adminOnly><RedditPage /></ProtectedRoute>} />
      <Route path="/seo-geo-guidelines" element={<ProtectedRoute adminOnly><SeoGeoGuidelines /></ProtectedRoute>} />

      {/* Shared: Activity Log */}
      <Route path="/activity-log" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />

      {/* Client: Generate */}
      <Route path="/generate" element={<ProtectedRoute><GeneratorPage /></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute><GeneratorPage /></ProtectedRoute>} />
      <Route path="/configuration" element={<ProtectedRoute><GeneratorPage /></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/clients" element={<Navigate to="/dashboard" replace />} />
      <Route path="/articles" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Navigate to={user ? (isAdmin ? "/dashboard" : "/generate") : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ClientProvider>
          <AppRoutes />
        </ClientProvider>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </Router>
  );
}

export default App;
