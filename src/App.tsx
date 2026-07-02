import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#c00', background: '#fff' }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { OfficerProfilePage } from './pages/OfficerProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProfilePage } from './pages/AdminProfilePage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';

// Citizen-only guard
const CitizenRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return null;
  if (!user || userProfile?.role !== 'citizen') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Officer guard — pending officers are redirected to the waiting screen
const OfficerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return null;
  if (!user || userProfile?.role !== 'officer') return <Navigate to="/login" replace />;
  if (userProfile?.status === 'pending') return <Navigate to="/pending-approval" replace />;
  return <>{children}</>;
};

// Allows any officer (pending OR approved) — used for profile setup
const OfficerAnyStatusRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return null;
  if (!user || userProfile?.role !== 'officer') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Pending-only guard — approved officers bounce back to the dashboard
const PendingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return null;
  if (!user || userProfile?.role !== 'officer') return <Navigate to="/login" replace />;
  if (userProfile?.status !== 'pending') return <Navigate to="/officer" replace />;
  return <>{children}</>;
};

// Admin-only guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return null;
  if (!user || userProfile?.role !== 'admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AppErrorBoundary>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />

            {/* Citizen */}
            <Route path="/dashboard" element={<CitizenRoute><CitizenDashboard /></CitizenRoute>} />
            <Route path="/report"    element={<CitizenRoute><ReportIssuePage /></CitizenRoute>} />

            {/* Officer — approved only */}
            <Route path="/officer"         element={<OfficerRoute><OfficerDashboard /></OfficerRoute>} />
            {/* Officer profile — pending + approved (fill in details while waiting) */}
            <Route path="/officer/profile" element={<OfficerAnyStatusRoute><OfficerProfilePage /></OfficerAnyStatusRoute>} />

            {/* Pending-approval holding screen */}
            <Route path="/pending-approval" element={<PendingRoute><PendingApprovalPage /></PendingRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><AdminProfilePage /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </AppErrorBoundary>
  );
}
