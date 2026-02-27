import { supabase } from './supabase';

// Coolify Proxy Server URL
// Aynı container'da çalışan proxy (nginx üzerinden /proxy path)
const PROXY_BASE_URL = '/x/p';

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
    return url;
}

export async function fetchUserPlaylist(m3uUrl: string): Promise<string | null> {
    let trimmedUrl = cleanUrl(m3uUrl);

    console.log('[IPTV_SERVICE] ========================================');
    console.log('[IPTV_SERVICE] Starting playlist fetch for:', trimmedUrl.substring(0, 80) + '...');
    console.log('[IPTV_SERVICE] Protocol:', trimmedUrl.startsWith('https') ? 'HTTPS' : 'HTTP');
    console.log('[IPTV_SERVICE] Proxy URL:', PROXY_BASE_URL);
    console.log('[IPTV_SERVICE] ========================================');

    // IPTV sunucuları HTTP üzerinde çalışır
    // Coolify Proxy Server üzerinden istek at

    console.log('[IPTV_SERVICE] Trying Coolify Proxy Server...');
    try {
        const proxyUrl = `${PROXY_BASE_URL}?url=${encodeURIComponent(trimmedUrl)}`;
        console.log('[IPTV_SERVICE] Full proxy URL:', proxyUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: {
                'Origin': window.location.origin,
            }
        });

        clearTimeout(timeoutId);

        console.log('[IPTV_SERVICE] Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[IPTV_SERVICE] Proxy error:', response.status, errorText.substring(0, 200));
            throw new Error(`Proxy error: ${response.status}`);
        }

        const text = await response.text();
        console.log('[IPTV_SERVICE] Response length:', text.length);

        // M3U kontrolü
        if (text.includes('#EXTM3U')) {
            console.log('[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via Coolify Proxy');
            console.log('[IPTV_SERVICE] Playlist size:', text.length, 'bytes');
            return text;
        } else {
            console.warn('[IPTV_SERVICE] Response does not contain #EXTM3U');
            console.warn('[IPTV_SERVICE] First 300 chars:', text.substring(0, 300));
            
            // HTML mi dönüyor?
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                throw new Error('Proxy returned HTML instead of M3U');
            }
        }
    } catch (err: any) {
        console.error('[IPTV_SERVICE] Coolify Proxy error:', err.message);
        
        // Proxy çalışmıyorsa, public CORS proxy'leri dene
        console.log('[IPTV_SERVICE] Trying public CORS proxies as fallback...');
    }

    // YEDEK: Public CORS proxies
    const publicProxies = [
        { 
            name: 'AllOrigins', 
            url: `https://api.allorigins.win/get?url=${encodeURIComponent(trimmedUrl)}&raw=true`,
        },
        { 
            name: 'CORS Anywhere', 
            url: `https://corsproxy.io/?${encodeURIComponent(trimmedUrl)}`,
        }
    ];

    for (const proxy of publicProxies) {
        console.log(`[IPTV_SERVICE] Trying ${proxy.name}...`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(proxy.url, {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const text = await response.text();
                
                if (text && text.includes('#EXTM3U')) {
                    console.log(`[IPTV_SERVICE] ✅ SUCCESS: Fetched M3U via ${proxy.name}`);
                    console.log('[IPTV_SERVICE] Playlist size:', text.length, 'bytes');
                    return text;
                }
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
    return `${PROXY_BASE_URL}/?url=${encodeURIComponent(originalUrl)}`;
}
