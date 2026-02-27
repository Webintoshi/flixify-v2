import { NavLink, Outlet } from 'react-router-dom';
import { User, Zap, Smartphone, Receipt, Settings } from 'lucide-react';
import { Header } from '../Header';

const sidebarItems = [
    { id: 'account', path: '/profil', label: 'Hesap Yönetimi', icon: User },
    { id: 'plans', path: '/profil/paketler', label: 'Paketler & Süre Ekle', icon: Zap },
    { id: 'devices', path: '/profil/cihazlar', label: 'Cihazlar', icon: Smartphone },
    { id: 'billing', path: '/profil/odemeler', label: 'Ödemeler & Makbuzlar', icon: Receipt },
    { id: 'settings', path: '/profil/ayarlar', label: 'Ayarlar', icon: Settings },
];

export function ProfileLayout() {
    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pt-28 pb-20">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <div className="flex flex-col gap-1">
                            {sidebarItems.map((item) => (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    end={item.path === '/profil'}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                                            isActive
                                                ? 'bg-primary/10 text-primary font-bold shadow-sm shadow-primary/5'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <item.icon
                                                size={20}
                                                className={isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300'}
                                            />
                                            <span>{item.label}</span>
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 max-w-4xl">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}

export default ProfileLayout;
