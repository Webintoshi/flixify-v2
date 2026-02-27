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

// URL'i temizle
function cleanUrl(url: string): string {
    // Boşlukları temizle
    url = url.replace(/\s/g, '');
    
    // Port 80'i kaldır (HTTP default zaten)
    url = url.replace(':80/', '/');
    
    return url;
}

export async function fetchUserPlaylist(m3uUrl: string): Promise<string | null> {
    let trimmedUrl = cleanUrl(m3uUrl);

    console.log('[IPTV_SERVICE] ========================================');
    console.log('[IPTV_SERVICE] Starting playlist fetch for:', trimmedUrl.substring(0, 80) + '...');
    console.log('[IPTV_SERVICE] Protocol:', trimmedUrl.startsWith('https') ? 'HTTPS' : 'HTTP');
    console.log('[IPTV_SERVICE] ========================================');

    // NOT: IPTV sunucuları genellikle HTTP üzerinde çalışır
    // HTTPS sayfadan HTTP erişim Mixed Content hatası verir
    // Bu yüzden proxy kullanmak zorundayız

    // ÖNCELİK 1: Flixify Proxy (Server-side) - EN GÜVENİLİR YÖNTEM
    console.log('[IPTV_SERVICE] STEP 1: Trying Flixify Proxy...');
    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(trimmedUrl)}`;
        console.log('[IPTV_SERVICE] Proxy URL:', proxyUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const proxyResponse = await fetch(proxyUrl, {
            signal: controller.signal,
            credentials: 'same-origin'
        });

        clearTimeout(timeoutId);

        const responseText = await proxyResponse.text();
        
        console.log('[IPTV_SERVICE] Proxy response status:', proxyResponse.status);
        console.log('[IPTV_SERVICE] Response length:', responseText.length);

        // JSON hata mesajı mı?
        if (responseText.startsWith('{')) {
            try {
                const errorData = JSON.parse(responseText);
                console.error('[IPTV_SERVICE] Proxy returned error:', errorData);
                throw new Error(errorData.error || 'Proxy error');
            } catch (e) {
                // JSON değil, devam et
            }
        }

        // M3U içeriği mi kontrol et
        if (responseText.includes('#EXTM3U')) {
            console.log('[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via Flixify Proxy');
            console.log('[IPTV_SERVICE] Playlist size:', responseText.length, 'bytes');
            return responseText;
        } else {
            console.warn('[IPTV_SERVICE] Proxy returned non-M3U content (first 200 chars):', responseText.substring(0, 200));
        }
    } catch (err: any) {
        console.warn('[IPTV_SERVICE] Flixify Proxy error:', err.message);
    }

    // ÖNCELİK 2: Public CORS proxies (yedek)
    console.log('[IPTV_SERVICE] STEP 2: Trying public CORS proxies...');
    
    const publicProxies = [
        { 
            name: 'AllOrigins', 
            url: `https://api.allorigins.win/get?url=${encodeURIComponent(trimmedUrl)}&raw=true`,
            extract: (text: string) => text
        },
        { 
            name: 'ThingProxy', 
            url: `https://thingproxy.freeboard.io/fetch/${trimmedUrl}`,
            extract: (text: string) => text
        },
        { 
            name: 'CORS Anywhere', 
            url: `https://corsproxy.io/?${encodeURIComponent(trimmedUrl)}`,
            extract: (text: string) => text
        }
    ];

    for (const proxy of publicProxies) {
        console.log(`[IPTV_SERVICE] Trying ${proxy.name}...`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(proxy.url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const text = await response.text();
                const extracted = proxy.extract(text);
                
                if (extracted && extracted.includes('#EXTM3U')) {
                    console.log(`[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via ${proxy.name}`);
                    console.log('[IPTV_SERVICE] Playlist size:', extracted.length, 'bytes');
                    return extracted;
                } else {
                    console.warn(`[IPTV_SERVICE] ${proxy.name} returned non-M3U content`);
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

// Stream URL'sini proxy üzerinden çevir
export function getProxiedStreamUrl(originalUrl: string): string {
    if (!originalUrl) return '';
    
    // Zaten HTTPS ise proxy'ye gerek yok
    if (originalUrl.startsWith('https://')) {
        return originalUrl;
    }
    
    // HTTP stream'leri proxy'den geçir
    return `/api/proxy?url=${encodeURIComponent(originalUrl)}`;
}
