import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { AdminRoute } from './components/AdminRoute';
import { AdminLayout } from './layouts/AdminLayout';
import 'flag-icons/css/flag-icons.min.css';
import './App.css';

// Lazy load admin pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminPlans = lazy(() => import('./pages/admin/Plans'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Page Loader
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

// Admin Routes with Layout
const AdminRoutes = () => (
  <AdminProvider>
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  </AdminProvider>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Admin Login - No Layout */}
          <Route 
            path="/admin/login" 
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminLogin />
              </Suspense>
            } 
          />
          
          {/* Admin Routes - Protected & With Layout */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/*" element={<AdminRoutes />} />
          </Route>
          
          {/* Main App Routes - Load from AppRoutes */}
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Main App Routes
import { AppRoutes } from './routes/AppRoutes';

export default App;
