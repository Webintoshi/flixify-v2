export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'URL parametresi eksik.' }), { 
            status: 400,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    console.log('[PROXY] Request URL:', targetUrl);

    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // IPTV sunucuları için özel headers
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        };

        console.log('[PROXY] Fetching with headers:', Object.keys(fetchHeaders));

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: fetchHeaders,
            redirect: 'follow',
        });

        console.log('[PROXY] Response status:', response.status);
        console.log('[PROXY] Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No response body');
            console.error('[PROXY] Target error:', response.status, errorText.substring(0, 200));
            return new Response(JSON.stringify({ 
                error: 'Target server error',
                status: response.status,
                preview: errorText.substring(0, 500)
            }), { 
                status: response.status,
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json' 
                }
            });
        }

        // Content-Type kontrolü
        const contentType = response.headers.get('content-type') || '';
        console.log('[PROXY] Content-Type:', contentType);

        // M3U içeriğini text olarak al
        const text = await response.text();
        
        console.log('[PROXY] Response length:', text.length);
        console.log('[PROXY] First 300 chars:', text.substring(0, 300));

        // M3U formatı kontrolü
        if (!text.includes('#EXTM3U')) {
            console.warn('[PROXY] ⚠️ Response does not contain #EXTM3U header');
            
            // Belki HTML dönüyordur (login page vs)
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                return new Response(JSON.stringify({ 
                    error: 'Target returned HTML instead of M3U',
                    preview: text.substring(0, 500)
                }), { 
                    status: 400,
                    headers: { 
                        ...corsHeaders, 
                        'Content-Type': 'application/json' 
                    }
                });
            }
        }

        console.log('[PROXY] ✅ Successfully fetched M3U. Size:', text.length, 'bytes');

        // Başarılı yanıt
        return new Response(text, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });

    } catch (error) {
        console.error('[PROXY] ❌ Fetch error:', error.message);
        console.error('[PROXY] Stack:', error.stack);
        
        return new Response(JSON.stringify({ 
            error: 'Proxy fetch failed',
            message: error.message,
            type: error.name
        }), { 
            status: 500,
            headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
            }
        });
    }
}
