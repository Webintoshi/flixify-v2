import { createClient } from '@supabase/supabase-js';

// Environment variable'ları al (fallback ile)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sdsvnkvmfhaubgcahvzv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug için log
console.log('[Supabase] ENV URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('[Supabase] ENV Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseAnonKey) {
    console.error('[Supabase] WARNING: Anon Key is missing!');
}

// HTTP modu kontrolü
const isHttpMode = typeof window !== 'undefined' && window.location.protocol === 'http:';

// HTTP modunda proxy kullan, HTTPS modunda direkt bağlan
const effectiveUrl = isHttpMode 
    ? `${window.location.origin}/api/supabase-proxy` 
    : supabaseUrl;

console.log('[Supabase] Mode:', isHttpMode ? 'HTTP (via proxy)' : 'HTTPS (direct)');
console.log('[Supabase] URL:', effectiveUrl);

// HTTP modunda custom fetch kullan
const customFetch = isHttpMode 
    ? (url: string, options: any) => {
        // Supabase'in gönderdiği URL'yi proxy URL'sine çevir
        // Örn: https://sdsvnkvmfhaubgcahvzv.supabase.co/rest/v1/users
        // -> /api/supabase-proxy/users
        
        if (typeof url === 'string' && url.includes('supabase.co')) {
            try {
                const urlObj = new URL(url);
                const path = urlObj.pathname.replace('/rest/v1', '');
                const query = urlObj.search;
                const proxyUrl = `${window.location.origin}/api/supabase-proxy${path}${query}`;
                
                console.log('[Supabase Fetch] Proxy:', proxyUrl);
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
