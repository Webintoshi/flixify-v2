/**
 * Simple Routing Utility
 * All routes now use HTTPS on flixify.pro (Bunny CDN)
 */

export const ROUTES = {
    LANDING: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profil',
    MOVIES: '/filmler',
    SERIES: '/diziler',
    LIVE_TV: '/canli-tv',
    SEARCH: '/search',
    FAVORITES: '/favoriler'
} as const;

export type RouteKey = keyof typeof ROUTES;

/**
 * Get route path - All routes are now on same domain with HTTPS
 */
export function getRoutePath(routeKey: RouteKey): string {
    return ROUTES[routeKey];
}

/**
 * Navigate to route
 */
export function navigateTo(routeKey: RouteKey) {
    window.location.pathname = ROUTES[routeKey];
}

/**
 * Check if route exists
 */
export function isValidRoute(pathname: string): boolean {
    return Object.values(ROUTES).includes(pathname as any);
}
