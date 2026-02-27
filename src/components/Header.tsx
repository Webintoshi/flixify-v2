import { useState, useEffect, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, User, Menu, X, Tv, LogOut } from 'lucide-react';
import { useContentStore } from '../store/useContentStore';
import { useAuth } from '../contexts/AuthContext';
import { getRoutePath, ROUTES } from '../lib/routing';

interface HeaderProps {
    onMenuClick?: () => void;
}

const navItems: { label: string; type: any; path?: string; routeKey?: keyof typeof ROUTES }[] = [
    { label: 'Ana Sayfa', type: 'all', path: '/', routeKey: 'LANDING' },
    { label: 'Diziler', type: 'series', routeKey: 'SERIES' },
    { label: 'Filmler', type: 'movie', path: '/filmler', routeKey: 'MOVIES' },
    { label: 'Canlı TV', type: 'live', path: '/canli-tv', routeKey: 'LIVE_TV' },
    { label: 'Kategoriler', type: 'all' },
];

// Throttle function for scroll events
function throttle<T extends (...args: any[]) => void>(func: T, limit: number) {
    let inThrottle: boolean;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
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
    const { signOut } = useAuth();

    // Throttled scroll handler
    const handleScroll = useCallback(
        throttle(() => {
            setIsScrolled(window.scrollY > 50);
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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                ? 'bg-background/95 backdrop-blur-md shadow-lg'
                : 'bg-gradient-to-b from-black/80 to-transparent'
                }`}
        >
            <div className="flex items-center justify-between px-4 md:px-8 lg:px-12 h-16 md:h-20">
                {/* Left Section */}
                <div className="flex items-center gap-6 md:gap-10">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden text-white hover:text-primary transition-colors"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <Link
                        to="/"
                        onClick={() => {
                            setActiveContentType('all');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
                    >
                        <Tv size={28} className="text-primary" />
                        <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
                            FLIXIFY
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navItems.map((item) => (
                            item.routeKey ? (
                                <a
                                    key={item.label}
                                    href={getRoutePath(item.routeKey)}
                                    className={`text-sm font-medium transition-colors duration-200 ${location.pathname === (item.path || '/')
                                        ? 'text-white font-semibold'
                                        : 'text-foreground-muted hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                </a>
                            ) : item.path ? (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    className={`text-sm font-medium transition-colors duration-200 ${location.pathname === item.path
                                        ? 'text-white font-semibold'
                                        : 'text-foreground-muted hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <button
                                    key={item.label}
                                    onClick={() => setActiveContentType(item.type)}
                                    className={`text-sm font-medium transition-colors duration-200 ${activeContentType === item.type && location.pathname === '/'
                                        ? 'text-white font-semibold'
                                        : 'text-foreground-muted hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            )
                        ))}
                    </nav>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative">
                        <div
                            className={`flex items-center transition-all duration-300 ${isSearchOpen
                                ? 'bg-white/10 border border-white/30 rounded-full'
                                : ''
                                }`}
                        >
                            <button
                                onClick={toggleSearch}
                                className="p-2 text-white hover:text-primary transition-colors"
                            >
                                <Search size={20} />
                            </button>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder="Ara..."
                                className={`bg-transparent text-white placeholder-foreground-dim text-sm outline-none transition-all duration-300 ${isSearchOpen
                                    ? 'w-32 md:w-48 px-2 py-1 opacity-100'
                                    : 'w-0 px-0 opacity-0'
                                    }`}
                            />
                            {isSearchOpen && searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="p-1 text-foreground-dim hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications */}
                    <button className="hidden md:block p-2 text-white hover:text-gray-300 transition-colors relative mr-1">
                        <Bell size={20} />
                        <span className="absolute top-1 right-1.5 w-2 h-2 bg-primary rounded-full border border-background" />
                    </button>

                    {/* Profile */}
                    <div className="relative">
                        <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        >
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center overflow-hidden border border-border">
                                <img 
                                    src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" 
                                    alt="Profile" 
                                    className="w-full h-full object-cover" 
                                    loading="lazy"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                                />
                                <User size={18} className="text-white absolute -z-10" />
                            </div>
                        </div>

                        {/* Profile Dropdown */}
                        {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-white/20 rounded shadow-xl py-2 z-50">
                                <a
                                    href={getRoutePath('PROFILE')}
                                    onClick={() => setIsProfileMenuOpen(false)}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground-muted hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                    <User size={16} />
                                    Hesap
                                </a>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground-muted hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                >
                                    <LogOut size={16} />
                                    Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-background/98 backdrop-blur-lg border-t border-border">
                    <nav className="flex flex-col p-4 gap-2">
                        {navItems.map((item) => (
                            item.routeKey ? (
                                <a
                                    key={item.label}
                                    href={getRoutePath(item.routeKey)}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-left px-4 py-3 rounded-lg transition-colors ${location.pathname === (item.path || '/')
                                        ? 'bg-primary/20 text-white font-semibold'
                                        : 'text-foreground-muted hover:bg-surface hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                </a>
                            ) : item.path ? (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-left px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path
                                        ? 'bg-primary/20 text-white font-semibold'
                                        : 'text-foreground-muted hover:bg-surface hover:text-white'
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
                                    className={`text-left px-4 py-3 rounded-lg transition-colors ${activeContentType === item.type && location.pathname === '/'
                                        ? 'bg-primary/20 text-white font-semibold'
                                        : 'text-foreground-muted hover:bg-surface hover:text-white'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            )
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
});

export default Header;
