import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Borrowers } from './pages/Borrowers';
import { Loans } from './pages/Loans';
import { Collateral } from './pages/Collateral';
import { Payments } from './pages/Payments';
import { Receipts } from './pages/Receipts';
import { Redemption } from './pages/Redemption';
import { Notifications } from './pages/Notifications';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-amber-400">
        <div className="text-center font-bold text-sm tracking-wide">Initializing E-Loan Session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="borrowers" element={<Borrowers />} />
            <Route path="loans" element={<Loans />} />
            <Route path="collateral" element={<Collateral />} />
            <Route path="payments" element={<Payments />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="redemption" element={<Redemption />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="reports" element={<Reports />} />
            <Route
              path="settings"
              element={
                <ProtectedRoute adminOnly>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
