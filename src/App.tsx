import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { AdminRoute } from './components/AdminRoute';
import 'flag-icons/css/flag-icons.min.css';
import './App.css';

// Lazy load admin pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminPlans = lazy(() => import('./pages/admin/Plans'));

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="p-8 text-white">Yükleniyor...</div>}>
        <Routes>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<AdminRoute />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Admin Routes - Path Based */}
          <Route path="/admin/*" element={<AdminLayout />} />
          
          {/* Main App Routes */}
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
