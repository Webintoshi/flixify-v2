import { supabase } from './supabase';

export async function getUserIptvUrl(userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('m3u_url')
        .eq('id', userId)
        .single();

    if (error || !data?.m3u_url) {
        console.warn('[IPTV_SERVICE] Bu kullanıcı için tanımlı M3U bağlantısı bulunamadı.', error);
        return null;
    }

    return data.m3u_url.trim();
}

// HTTP URL'yi HTTPS'ye çevirmeyi dene
function tryHttps(url: string): string {
    if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }
    return url;
}



export async function fetchUserPlaylist(m3uUrl: string): Promise<string | null> {
    let trimmedUrl = m3uUrl.trim();
    
    // URL'deki boşlukları temizle
    trimmedUrl = trimmedUrl.replace(/\s/g, '');

    console.log('[IPTV_SERVICE] ========================================');
    console.log('[IPTV_SERVICE] Starting playlist fetch for:', trimmedUrl.substring(0, 50) + '...');
    console.log('[IPTV_SERVICE] ========================================');

    // ÖNCELİK 0: HTTPS versiyonunu dene (Mixed Content sorununu çözer)
    if (trimmedUrl.startsWith('http://')) {
        const httpsUrl = tryHttps(trimmedUrl);
        console.log('[IPTV_SERVICE] STEP 0: Trying HTTPS version...');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const httpsResponse = await fetch(httpsUrl, {
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            clearTimeout(timeoutId);

            if (httpsResponse.ok) {
                const text = await httpsResponse.text();
                if (text && text.includes('#EXTM3U')) {
                    console.log('[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via HTTPS');
                    console.log('[IPTV_SERVICE] Playlist size:', text.length, 'bytes');
                    return text;
                }
            }
        } catch (err: any) {
            console.warn('[IPTV_SERVICE] HTTPS version failed:', err.message);
        }
    }

    // ÖNCELİK 1: Direct fetch
    console.log('[IPTV_SERVICE] STEP 1: Trying direct fetch...');
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const directResponse = await fetch(trimmedUrl, {
            signal: controller.signal,
            mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (directResponse.ok) {
            const text = await directResponse.text();
            if (text && text.includes('#EXTM3U')) {
                console.log('[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via direct connection');
                console.log('[IPTV_SERVICE] Playlist size:', text.length, 'bytes');
                return text;
            } else {
                console.warn('[IPTV_SERVICE] Direct fetch returned non-M3U content (first 100 chars):', text.substring(0, 100));
            }
        } else {
            console.warn('[IPTV_SERVICE] Direct fetch HTTP error:', directResponse.status);
        }
    } catch (err: any) {
        console.warn('[IPTV_SERVICE] Direct fetch failed:', err.message);
    }

    // ÖNCELİK 2: Flixify Proxy (Server-side)
    console.log('[IPTV_SERVICE] STEP 2: Trying Flixify Proxy...');
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const proxyResponse = await fetch(`/api/proxy?url=${encodeURIComponent(trimmedUrl)}`, {
            signal: controller.signal,
            credentials: 'same-origin'
        });

        clearTimeout(timeoutId);

        if (proxyResponse.ok) {
            const text = await proxyResponse.text();
            if (text && text.includes('#EXTM3U')) {
                console.log('[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via Flixify Proxy');
                console.log('[IPTV_SERVICE] Playlist size:', text.length, 'bytes');
                return text;
            } else {
                console.warn('[IPTV_SERVICE] Proxy returned non-M3U content (first 200 chars):', text.substring(0, 200));
            }
        } else {
            console.warn('[IPTV_SERVICE] Flixify Proxy HTTP error:', proxyResponse.status);
        }
    } catch (err: any) {
        console.warn('[IPTV_SERVICE] Flixify Proxy error:', err.message);
    }

    // ÖNCELİK 3: Public proxies
    const publicProxies = [
        { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmedUrl)}` },
        { name: 'CORS Proxy', url: `https://corsproxy.io/?${encodeURIComponent(trimmedUrl)}` },
        { name: 'ThingProxy', url: `https://thingproxy.freeboard.io/fetch/${trimmedUrl}` }
    ];

    for (const proxy of publicProxies) {
        console.log(`[IPTV_SERVICE] STEP 3: Trying ${proxy.name}...`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(proxy.url, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const text = await response.text();
                if (text && text.includes('#EXTM3U')) {
                    console.log(`[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via ${proxy.name}`);
                    console.log('[IPTV_SERVICE] Playlist size:', text.length, 'bytes');
                    return text;
                } else {
                    console.warn(`[IPTV_SERVICE] ${proxy.name} returned non-M3U content (first 100 chars):`, text.substring(0, 100));
                }
            } else {
                console.warn(`[IPTV_SERVICE] ${proxy.name} HTTP error:`, response.status);
            }
        } catch (err: any) {
            console.warn(`[IPTV_SERVICE] ${proxy.name} error:`, err.message);
        }
    }

    console.error('[IPTV_SERVICE] ❌ FAILED: All fetch methods failed');
    console.log('[IPTV_SERVICE] ========================================');
    return null;
}
