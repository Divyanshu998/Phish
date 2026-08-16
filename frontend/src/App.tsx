import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ScannerPage } from './pages/ScannerPage';
import { ScanDetailPage } from './pages/ScanDetailPage';
import { ThreatsPage } from './pages/ThreatsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ExtensionPage } from './pages/ExtensionPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './pages/AuthPages';
import { authService } from './services/auth';
import './styles/theme.css';

// Protected Layout — wraps all authenticated routes
const ProtectedLayout: React.FC = () => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="soc-layout spiderman-bg-grid">
      <Sidebar />
      <div className="soc-main">
        <Header />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/scanner" element={<ScannerPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/dashboard/scan/:scanId" element={<ScanDetailPage />} />
          <Route path="/dashboard/threats" element={<ThreatsPage />} />
          <Route path="/threats" element={<ThreatsPage />} />
          <Route path="/dashboard/history" element={<HistoryPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboard/extension" element={<ExtensionPage />} />
          <Route path="/extension" element={<ExtensionPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/dashboard/about" element={<AboutPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        {/* Catch-all redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};
