import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useTransition, useEffect, useRef } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useUser } from '../contexts/AuthContext';

// Lazy load all page components with prefetch
const LandingPage = lazy(() => import('../components/LandingPage').then(m => ({ default: m.LandingPage })));
const HomePage = lazy(() => import('../components/HomePage').then(m => ({ default: m.HomePage })));
const LiveTVPage = lazy(() => import('../components/LiveTVPage').then(m => ({ default: m.LiveTVPage })));
const MoviesPage = lazy(() => import('../components/MoviesPage').then(m => ({ default: m.MoviesPage })));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Profile = lazy(() => import('../pages/Profile'));

// Preload function for route prefetching
const preloadPage = (page: string) => {
    switch (page) {
        case 'canli-tv':
            return import('../components/LiveTVPage');
        case 'filmler':
            return import('../components/MoviesPage');
        case 'profil':
            return import('../pages/Profile');
        default:
            return Promise.resolve();
    }
};

// Ultra-fast loading fallback
function PageLoader() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
}

// Prefetch wrapper component
function PrefetchWrapper({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Prefetch likely next routes based on current route
        const currentPath = location.pathname;
        
        if (currentPath === '/') {
            // User likely to go to Live TV or Movies
            prefetchTimeoutRef.current = setTimeout(() => {
                preloadPage('canli-tv');
                preloadPage('filmler');
            }, 2000);
        }

        return () => {
            if (prefetchTimeoutRef.current) {
                clearTimeout(prefetchTimeoutRef.current);
            }
        };
    }, [location.pathname]);

    return <>{children}</>;
}

// Index page with optimized auth check
function IndexPage() {
    const user = useUser();
    
    if (user) {
        return (
            <Suspense fallback={<PageLoader />}>
                <HomePage />
            </Suspense>
        );
    }
    return (
        <Suspense fallback={<PageLoader />}>
            <LandingPage />
        </Suspense>
    );
}

// Optimized route with transition
function TransitionRoute({ 
    element, 
    delay = 0 
}: { 
    element: React.ReactNode; 
    delay?: number;
}) {
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => {});
    }, []);

    if (isPending && delay > 0) {
        return <PageLoader />;
    }

    return (
        <Suspense fallback={<PageLoader />}>
            {element}
        </Suspense>
    );
}

export function AppRoutes() {
    return (
        <PrefetchWrapper>
            <Routes>
                <Route path="/giris-yap" element={
                    <TransitionRoute element={<Login />} />
                } />
                <Route path="/kayit-ol" element={
                    <TransitionRoute element={<Register />} />
                } />
                
                <Route path="/" element={<IndexPage />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/canli-tv" element={
                        <TransitionRoute element={<LiveTVPage />} delay={100} />
                    } />
                    <Route path="/filmler" element={
                        <TransitionRoute element={<MoviesPage />} delay={100} />
                    } />
                    <Route path="/profil" element={
                        <TransitionRoute element={<Profile />} delay={50} />
                    } />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </PrefetchWrapper>
    );
}

// Export prefetch function for manual use
export { preloadPage };
