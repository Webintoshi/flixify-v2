import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Users, Zap, Settings, LogOut, Menu, X, 
    Tv, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { signOut, profile } = useAuth();
    const { notifications, unreadCount, clearNotifications } = useAdmin();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);


    const handleLogout = async () => {
        await signOut();
        navigate('/admin/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
        { name: 'Paketler', href: '/admin/plans', icon: Zap },
        { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
    ];

    const isActive = (href: string) => {
        if (href === '/admin/dashboard') return pathname === href;
        return pathname.startsWith(href);
    };

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
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                    <Link to="/admin/dashboard" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
                        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                            <Tv size={20} className="text-primary" />
                        </div>
                        <span className="text-lg font-black text-white tracking-tight">
                            FLIXIFY <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded ml-1 align-top tracking-normal font-bold">ADMIN</span>
                        </span>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 py-6 px-4 overflow-y-auto custom-scrollbar">
                    <div className="mb-8">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 px-3">Ana Menü</h3>
                        <nav className="space-y-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                                        ${isActive(item.href)
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                    `}
                                >
                                    <item.icon size={18} className={isActive(item.href) ? 'text-white' : 'group-hover:text-white'} />
                                    <span className="font-bold tracking-wide text-sm">{item.name}</span>
                                    {isActive(item.href) && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Quick Stats */}
                    <div className="px-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Hızlı Bakış</h3>
                        <div className="space-y-2">
                            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sistem Durumu</div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-bold text-green-500">Çevrimiçi</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Section */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                            {profile?.account_number?.substring(0, 1) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-black truncate">Yönetici</div>
                            <div className="text-[10px] text-gray-500 font-mono tracking-wider truncate">
                                {profile?.account_number || 'Admin'}
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all text-xs font-black uppercase tracking-widest border border-red-500/20"
                    >
                        <LogOut size={14} />
                        Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 text-gray-400 hover:text-white lg:hidden rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        
                        {/* Breadcrumb */}
                        <nav className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-bold uppercase tracking-wider">Admin</span>
                            <span>/</span>
                            <span className="text-white font-bold">
                                {navigation.find(n => isActive(n.href))?.name || 'Dashboard'}
                            </span>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[9px] font-black flex items-center justify-center">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                            
                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowNotifications(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                            <span className="font-black uppercase tracking-wider text-sm">Bildirimler</span>
                                            {notifications.length > 0 && (
                                                <button 
                                                    onClick={clearNotifications}
                                                    className="text-[10px] text-gray-500 hover:text-white uppercase"
                                                >
                                                    Temizle
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.slice(0, 5).map((notif) => (
                                                    <div 
                                                        key={notif.id}
                                                        className={`p-4 border-b border-white/5 text-xs ${!notif.read ? 'bg-white/5' : ''}`}
                                                    >
                                                        <div className={`font-bold mb-1 ${
                                                            notif.type === 'error' ? 'text-red-400' :
                                                            notif.type === 'success' ? 'text-green-400' :
                                                            notif.type === 'warning' ? 'text-yellow-400' :
                                                            'text-blue-400'
                                                        }`}>
                                                            {notif.type === 'error' ? 'Hata' :
                                                             notif.type === 'success' ? 'Başarılı' :
                                                             notif.type === 'warning' ? 'Uyarı' : 'Bilgi'}
                                                        </div>
                                                        <div className="text-gray-300">{notif.message}</div>
                                                        <div className="text-[10px] text-gray-500 mt-2">
                                                            {new Date(notif.timestamp).toLocaleTimeString('tr-TR')}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-500 text-xs">
                                                    Bildirim yok
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Back to Site */}
                        <a 
                            href="/" 
                            className="hidden md:flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors hover:bg-white/5 rounded-xl"
                        >
                            ← Siteye Dön
                        </a>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 relative">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 -z-10 pointer-events-none" />
                    {children}
                </div>
            </main>
        </div>
    );
};
