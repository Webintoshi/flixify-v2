import { useState, useEffect, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, User, Menu, X, Tv, LogOut, ChevronDown } from 'lucide-react';
import { useContentStore } from '../store/useContentStore';
import { useAuth } from '../contexts/AuthContext';
import { getRoutePath, ROUTES } from '../lib/routing';

interface HeaderProps {
    onMenuClick?: () => void;
}

const navItems: { label: string; type: any; path?: string; routeKey?: keyof typeof ROUTES }[] = [
    { label: 'Ana Sayfa', type: 'all', path: '/', routeKey: 'LANDING' },
    { label: 'Filmler', type: 'movie', path: '/filmler', routeKey: 'MOVIES' },
    { label: 'Diziler', type: 'series', routeKey: 'SERIES' },
    { label: 'Canlı TV', type: 'live', path: '/canli-tv', routeKey: 'LIVE_TV' },
];

// Throttle function for scroll events
function throttle<T extends (...args: any[]) => void>(func: T, limit: number) {
    let inThrottle: boolean;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export const Header = memo(function Header(_props: HeaderProps) {
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    // Use selectors to prevent unnecessary re-renders
    const setActiveContentType = useContentStore(state => state.setActiveContentType);
    const activeContentType = useContentStore(state => state.activeContentType);
    const searchQuery = useContentStore(state => state.searchQuery);
    const setSearchQuery = useContentStore(state => state.setSearchQuery);
    const { user, signOut } = useAuth();

    // Throttled scroll handler
    const handleScroll = useCallback(
        throttle(() => {
            setIsScrolled(window.scrollY > 20);
        }, 100),
        []
    );

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, [setSearchQuery]);

    const toggleSearch = useCallback(() => {
        setIsSearchOpen(prev => !prev);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setIsSearchOpen(false);
    }, [setSearchQuery]);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled
                    ? 'bg-background/95 backdrop-blur-md border-border shadow-lg py-3'
                    : 'bg-transparent border-transparent py-4'
                }`}
        >
            <div className="flex items-center justify-between px-6 md:px-12">
                {/* Left Section: Logo & Nav */}
                <div className="flex items-center gap-12">
                    {/* Logo */}
                    <Link
                        to="/"
                        onClick={() => {
                            setActiveContentType('all');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 group"
                    >
                        <Tv size={28} className="text-primary group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-1">
                            FLIXIFY
                            <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded ml-1 align-top tracking-normal font-bold shadow-lg shadow-primary/30">
                                PRO
                            </span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => {
                            const isActive = item.routeKey
                                ? location.pathname === (item.path || '/')
                                : activeContentType === item.type && location.pathname === '/';

                            return item.routeKey ? (
                                <Link
                                    key={item.label}
                                    to={item.path || '/'}
                                    className={`text-sm font-semibold transition-all duration-200 relative group ${isActive
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                    <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-primary rounded-full transform transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                                </Link>
                            ) : (
                                <button
                                    key={item.label}
                                    onClick={() => setActiveContentType(item.type)}
                                    className={`text-sm font-semibold transition-all duration-200 relative group ${isActive
                                            ? 'text-white'
                                            : 'text-gray-300 hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                    <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-primary rounded-full transform transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-6">
                    {user ? (
                        // Logged In State
                        <>
                            {/* Search */}
                            <div className={`relative flex items-center ${isSearchOpen ? 'w-full md:w-auto' : ''}`}>
                                <div
                                    className={`flex items-center transition-all duration-300 overflow-hidden ${isSearchOpen
                                            ? 'w-48 bg-white/10 border border-white/20 rounded-full px-3 py-1.5'
                                            : 'w-8 bg-transparent border-transparent'
                                        }`}
                                >
                                    <button
                                        onClick={toggleSearch}
                                        className={`text-gray-300 hover:text-white transition-colors ${isSearchOpen ? 'mr-2' : ''}`}
                                    >
                                        <Search size={20} />
                                    </button>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={handleSearch}
                                        placeholder="İçerik ara..."
                                        className={`bg-transparent text-white placeholder-gray-400 text-sm outline-none w-full transition-opacity duration-200 ${isSearchOpen ? 'opacity-100' : 'opacity-0'}`}
                                        autoFocus={isSearchOpen}
                                    />
                                    {isSearchOpen && searchQuery && (
                                        <button
                                            onClick={clearSearch}
                                            className="ml-2 text-gray-400 hover:text-white"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Notifications */}
                            <button className="hidden md:block relative text-gray-300 hover:text-white transition-colors group">
                                <Bell size={20} className="group-hover:rotate-12 transition-transform duration-300" />
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
                            </button>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center gap-2 focus:outline-none group"
                                >
                                    <div className="w-8 h-8 rounded-md bg-zinc-800 overflow-hidden border border-white/20 group-hover:border-primary transition-colors duration-300">
                                        <img
                                            src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                        <User size={18} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10" />
                                    </div>
                                    <ChevronDown size={14} className={`text-gray-300 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isProfileMenuOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setIsProfileMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-3 w-56 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl py-2 z-50 transform origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                            <div className="px-4 py-3 border-b border-white/10 mb-2">
                                                <p className="text-sm text-white font-medium truncate">{user.email}</p>
                                                <p className="text-xs text-gray-400">Üye</p>
                                            </div>
                                            
                                            <Link
                                                to={getRoutePath('PROFILE')}
                                                onClick={() => setIsProfileMenuOpen(false)}
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                                            >
                                                <User size={16} />
                                                Hesabım
                                            </Link>
                                            <div className="h-px bg-white/10 my-2" />
                                            <button
                                                onClick={() => signOut()}
                                                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                                            >
                                                <LogOut size={16} />
                                                Çıkış Yap
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        // Logged Out State
                        <>
                            <Link 
                                to={getRoutePath('LOGIN')}
                                className="text-gray-300 hover:text-white transition-colors text-sm font-semibold hidden md:block"
                            >
                                Giriş Yap
                            </Link>
                            <Link 
                                to={getRoutePath('REGISTER')}
                                className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-md font-semibold text-sm transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
                            >
                                Hesap Oluştur
                            </Link>
                        </>
                    )}

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden text-white hover:text-primary transition-colors"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`md:hidden fixed inset-x-0 top-[60px] bg-background/98 backdrop-blur-xl border-b border-white/10 transition-all duration-300 ease-in-out transform origin-top ${isMobileMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0'}`}>
                <nav className="flex flex-col p-6 gap-4">
                    {navItems.map((item) => (
                        item.routeKey ? (
                            <Link
                                key={item.label}
                                to={item.path || '/'}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`text-lg font-medium px-4 py-3 rounded-lg transition-colors ${
                                    location.pathname === (item.path || '/')
                                    ? 'bg-primary/20 text-white' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <button
                                key={item.label}
                                onClick={() => {
                                    setActiveContentType(item.type);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`text-left text-lg font-medium px-4 py-3 rounded-lg transition-colors ${
                                    activeContentType === item.type && location.pathname === '/'
                                    ? 'bg-primary/20 text-white' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {item.label}
                            </button>
                        )
                    ))}
                    
                    {!user && (
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
                            <Link 
                                to={getRoutePath('LOGIN')}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-center py-3 text-gray-300 hover:text-white font-semibold"
                            >
                                Giriş Yap
                            </Link>
                            <Link 
                                to={getRoutePath('REGISTER')}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-center bg-primary text-white py-3 rounded-lg font-bold shadow-lg shadow-primary/20"
                            >
                                Hemen Üye Ol
                            </Link>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
});

export default Header;
