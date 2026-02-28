/**
 * Supabase Proxy for HTTP Mode
 * 
 * HTTP siteden HTTPS Supabase'e güvenli bağlantı için proxy
 * Coolify'da /api/supabase-proxy olarak çalışır
 */

export const config = {
    runtime: 'edge',
};

// Supabase bilgilerini environment'dan al
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sdsvnkvmfhaubgcahvzv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/supabase-proxy', '');
    
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'apikey, Authorization, Content-Type, X-Client-Info',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Supabase REST API URL oluştur
        const supabaseUrl = `${SUPABASE_URL}/rest/v1${path}${url.search}`;
        
        console.log('[SUPABASE-PROXY] Forwarding to:', supabaseUrl);

        // Headers'ı kopyala
        const headers = new Headers();
        headers.set('apikey', SUPABASE_ANON_KEY);
        headers.set('Authorization', req.headers.get('Authorization') || `Bearer ${SUPABASE_ANON_KEY}`);
        headers.set('Content-Type', req.headers.get('Content-Type') || 'application/json');
        
        // Request body'yi al
        let body = null;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            body = await req.text();
        }

        // Supabase'e istek at
        const response = await fetch(supabaseUrl, {
            method: req.method,
            headers: headers,
            body: body,
        });

        // Yanıtı kopyala
        const responseHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            responseHeaders.set(key, value);
        });

        const responseBody = await response.arrayBuffer();

        return new Response(responseBody, {
            status: response.status,
            headers: responseHeaders,
        });

    } catch (error) {
        console.error('[SUPABASE-PROXY] Error:', error.message);
        
        return new Response(JSON.stringify({ 
            error: 'Supabase proxy failed',
            message: error.message 
        }), { 
            status: 500,
            headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
            }
        });
    }
}
