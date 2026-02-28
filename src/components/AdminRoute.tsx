import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AdminRoute: React.FC = () => {
    const { session, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/admin/login" replace />;
    }

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="bg-surface/90 p-8 rounded-2xl border border-red-500/20 text-center max-w-md shadow-2xl backdrop-blur-sm">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                    </div>
                    <h2 className="text-red-500 text-xl font-bold mb-4 uppercase tracking-wider">Yetkisiz Erişim</h2>
                    <p className="text-gray-300 mb-6 font-medium text-sm leading-relaxed">
                        Admin paneline erişim yetkiniz bulunmuyor.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded font-black transition-all uppercase tracking-wider text-sm shadow-lg w-full"
                    >
                        Ana Sayfaya Dön
                    </button>
                </div>
            </div>
        );
    }

    // Admin kullanıcılar için subscription kontrolü yapma
    // Sadece admin olmayan kullanıcılar için geçerli
    if (profile.role !== 'admin' && profile.role !== 'superadmin' && profile.subscription_status === 'suspended') {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
