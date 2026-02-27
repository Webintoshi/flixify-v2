export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'URL parametresi eksik.' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    console.log('[PROXY] Fetching:', targetUrl.substring(0, 80) + '...');

    try {
        const headersToForward = new Headers();
        headersToForward.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        headersToForward.set('accept', '*/*');
        headersToForward.set('accept-language', 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7');

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: headersToForward,
            redirect: 'follow',
        });

        console.log('[PROXY] Response status:', response.status);

        if (!response.ok) {
            return new Response(JSON.stringify({ 
                error: 'Target server error',
                status: response.status 
            }), { 
                status: response.status,
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json' 
                }
            });
        }

        const contentType = response.headers.get('content-type') || '';
        console.log('[PROXY] Content-Type:', contentType);

        // M3U içeriğini kontrol et
        const text = await response.text();
        
        if (!text.includes('#EXTM3U')) {
            console.warn('[PROXY] Response does not contain M3U content. First 200 chars:', text.substring(0, 200));
            return new Response(JSON.stringify({ 
                error: 'Invalid M3U content',
                preview: text.substring(0, 500)
            }), { 
                status: 400,
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'application/json' 
                }
            });
        }

        console.log('[PROXY] Successfully fetched M3U. Size:', text.length, 'bytes');

        return new Response(text, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('[PROXY] Error:', error.message);
        return new Response(JSON.stringify({ 
            error: 'Proxy Hatası',
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
