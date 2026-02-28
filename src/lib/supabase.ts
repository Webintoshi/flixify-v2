import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing. Check your .env file.');
}

// HTTP modu: Supabase isteklerini proxy üzerinden yap
// Bu, Mixed Content hatasını önler (HTTP site → HTTPS Supabase)
const isHttpMode = typeof window !== 'undefined' && window.location.protocol === 'http:';
const effectiveUrl = isHttpMode 
    ? `${window.location.origin}/api/supabase-proxy` 
    : supabaseUrl;

console.log('[Supabase] Mode:', isHttpMode ? 'HTTP (via proxy)' : 'HTTPS (direct)');

export const supabase = createClient(effectiveUrl, supabaseAnonKey, {
    db: {
        schema: 'public'
    },
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
