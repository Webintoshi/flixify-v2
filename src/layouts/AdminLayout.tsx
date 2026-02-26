import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Zap, Settings, LogOut, Menu, X, Tv } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
    const { pathname } = useLocation();
    const { signOut, profile } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
    };

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
        { name: 'Paketler', href: '/admin/plans', icon: Zap },
        { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex overflow-hidden selection:bg-primary/30">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 h-screen w-72 
                bg-surface/40 backdrop-blur-2xl border-r border-white/10 
                transform transition-transform duration-300 ease-in-out
                flex flex-col
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-20 flex items-center justify-between px-8 border-b border-white/10">
                    <a href="https://flixify.pro" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
                        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                            <Tv size={24} className="text-primary" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">
                            FLIXIFY <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded ml-1 align-top tracking-normal font-bold">ADMIN</span>
                        </span>
                    </a>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 py-8 px-4 overflow-y-auto custom-scrollbar">
                    <div className="mb-8 px-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Ana Menü</h3>
                        <nav className="space-y-2">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
                                            ${isActive
                                                ? 'bg-primary/10 border border-primary/20 text-white shadow-lg shadow-primary/5'
                                                : 'text-gray-400 border border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}
                                        `}
                                    >
                                        <item.icon
                                            size={20}
                                            className={`transition-colors ${isActive ? 'text-primary' : 'group-hover:text-gray-300'}`}
                                        />
                                        <span className="font-bold tracking-wide text-sm">{item.name}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-surface/20">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-black/40 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20">
                            {profile?.account_number?.substring(0, 1)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-black truncate">Aktif Yönetici</div>
                            <div className="text-[10px] text-gray-500 font-mono tracking-wider truncate">
                                {profile?.account_number}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all text-sm font-bold border border-red-500/20 group uppercase tracking-widest mt-2"
                    >
                        <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-6 lg:px-12 backdrop-blur-md bg-black/20 border-b border-white/5 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 text-gray-400 hover:text-white lg:hidden rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="https://flixify.pro" className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 border border-white/5">
                            Platforma Dön
                        </a>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-12 relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 -z-10 pointer-events-none" />
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
