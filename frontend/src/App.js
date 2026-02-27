import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { SessionHistoryPage } from './pages/SessionHistoryPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { DashboardLayout } from './components/DashboardLayout';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />

      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      <Route path="/clients" element={
        <ProtectedRoute adminOnly>
          <ClientsPage />
        </ProtectedRoute>
      } />

      <Route path="/clients/:clientId" element={
        <ProtectedRoute adminOnly>
          <ConfigurationPage />
        </ProtectedRoute>
      } />

      <Route path="/clients/:clientId/generate" element={
        <ProtectedRoute adminOnly>
          <GeneratorPage />
        </ProtectedRoute>
      } />

      <Route path="/configuration" element={
        <ProtectedRoute>
          <ConfigurationPage />
        </ProtectedRoute>
      } />

      <Route path="/generator" element={
        <ProtectedRoute>
          <GeneratorPage />
        </ProtectedRoute>
      } />

      <Route path="/articles" element={
        <ProtectedRoute>
          <ArticlesPage />
        </ProtectedRoute>
      } />

      <Route path="/history" element={
        <ProtectedRoute>
          <SessionHistoryPage />
        </ProtectedRoute>
      } />

      <Route path="/clients/:clientId/history" element={
        <ProtectedRoute adminOnly>
          <SessionHistoryPage />
        </ProtectedRoute>
      } />

      <Route path="/activity" element={
        <ProtectedRoute adminOnly>
          <ActivityLogPage />
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute adminOnly>
          <div className="p-8">
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope']">Impostazioni</h1>
            <p className="text-slate-500 mt-2">Coming soon...</p>
          </div>
        </ProtectedRoute>
      } />

      {/* Redirect root to dashboard or login */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
