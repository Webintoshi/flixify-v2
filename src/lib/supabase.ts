import { createClient } from '@supabase/supabase-js';

// Gerçek Supabase URL (fallback)
const REAL_SUPABASE_URL = 'https://sdsvnkvmfhaubgcahvzv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug için log
console.log('[Supabase] ENV URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('[Supabase] ENV Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// HTTP modu kontrolü
const isHttpMode = typeof window !== 'undefined' && window.location.protocol === 'http:';

// Supabase client için HER ZAMAN gerçek URL kullan
// (Relative path kabul etmez)
const effectiveUrl = REAL_SUPABASE_URL;

console.log('[Supabase] Protocol:', typeof window !== 'undefined' ? window.location.protocol : 'server');
console.log('[Supabase] Is HTTP Mode:', isHttpMode);
console.log('[Supabase] Supabase URL:', effectiveUrl);
console.log('[Supabase] Custom Fetch:', !!customFetch);

// HTTP modunda custom fetch kullan (Mixed Content önlemek için)
// Supabase HTTPS gerektirir, bizim sitemiz HTTP olduğunda proxy kullanmalıyız
const customFetch = isHttpMode 
    ? (url: string | Request | URL, options: any) => {
        // URL'i string'e çevir
        const urlString = url instanceof Request 
            ? url.url 
            : url instanceof URL 
                ? url.toString() 
                : url;
        
        // Supabase URL'ini proxy URL'sine çevir
        // https://sdsvnkvmfhaubgcahvzv.supabase.co/rest/v1/users -> http://flixify.pro/api/supabase-proxy/users
        if (typeof urlString === 'string' && urlString.includes('supabase.co')) {
            try {
                const urlObj = new URL(urlString);
                const path = urlObj.pathname; // /rest/v1/users
                const query = urlObj.search;  // ?select=*
                
                // Proxy URL oluştur
                const proxyUrl = `${window.location.origin}/api/supabase-proxy${path}${query}`;
                
                console.log('[Supabase Fetch] HTTP mode - Proxy:', proxyUrl);
                return fetch(proxyUrl, options);
            } catch (e) {
                console.error('[Supabase Fetch] URL parse error:', e);
            }
        }
        
        return fetch(url, options);
    }
    : undefined;

export const supabase = createClient(effectiveUrl, supabaseAnonKey, {
    db: {
        schema: 'public'
    },
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'flixify-auth-token',
        storage: typeof window !== 'undefined' ? localStorage : undefined
    },
    // HTTP modunda custom fetch kullan
    ...(customFetch && { fetch: customFetch }),
    // Realtime ayarları
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Auth state değişikliklerini dinle
if (typeof window !== 'undefined') {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Supabase Auth] Event:', event);
        
        if (event === 'SIGNED_IN' && session) {
            console.log('[Supabase Auth] User signed in:', session.user.id);
        } else if (event === 'SIGNED_OUT') {
            console.log('[Supabase Auth] User signed out');
        }
    });
}

export default supabase;
