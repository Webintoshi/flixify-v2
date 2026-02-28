/**
 * Coolify Proxy Server for IPTV
 * 
 * Bu server HTTP IPTV isteklerini proxyler.
 * Coolify'da ayrı bir service olarak çalıştırılmalı.
 * 
 * Environment Variables:
 * - PORT: Proxy port (default: 3001)
 * - ALLOWED_ORIGINS: CORS izinli domainler (örn: https://flixify.pro)
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://flixify.pro,http://www.flixify.pro,http://localhost:5173,http://localhost:3000').split(',');

const IPTV_BASE = 'http://sifiriptvdns.com:80';

const server = http.createServer(async (req, res) => {
    // CORS Headers - Tüm origin'lere izin ver
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // URL parse
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Xtream Codes API endpoint'leri
    const xtreamEndpoints = {
        '/api/live-categories': 'player_api.php?action=get_live_categories',
        '/api/live-streams': 'player_api.php?action=get_live_streams',
        '/api/vod-categories': 'player_api.php?action=get_vod_categories',
        '/api/vod': 'player_api.php?action=get_vod_streams',
        '/api/series-categories': 'player_api.php?action=get_series_categories',
        '/api/series': 'player_api.php?action=get_series',
    };
    
    // Eğer Xtream API endpoint'i ise
    if (xtreamEndpoints[pathname]) {
        const { username, password, ...otherParams } = parsedUrl.query;
        
        if (!username || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing username or password' }));
            return;
        }
        
        const targetUrl = new URL(`${IPTV_BASE}/${xtreamEndpoints[pathname]}`);
        targetUrl.searchParams.set('username', username);
        targetUrl.searchParams.set('password', password);
        
        Object.entries(otherParams).forEach(([key, value]) => {
            if (value) targetUrl.searchParams.set(key, value);
        });
        
        console.log(`[IPTV-PROXY] ${pathname}:`, targetUrl.toString());
        
        try {
            const response = await fetch(targetUrl.toString());
            const data = await response.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error(`[IPTV-PROXY] Error:`, error.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'IPTV proxy failed', message: error.message }));
        }
        return;
    }
    
    // Normal stream proxy
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL parametresi eksik. ?url=http://...' }));
        return;
    }

    console.log(`[PROXY] ${req.method} ${targetUrl.substring(0, 80)}...`);

    try {
        const targetParsed = url.parse(targetUrl);
        const isHttps = targetParsed.protocol === 'https:';
        const client = isHttps ? https : http;

        // Tüm headers'ı ilet (Authorization dahil)
        const options = {
            hostname: targetParsed.hostname,
            port: targetParsed.port || (isHttps ? 443 : 80),
            path: targetParsed.path,
            method: 'GET',
            headers: {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': req.headers['accept'] || '*/*',
                'Accept-Language': req.headers['accept-language'] || 'tr-TR,tr;q=0.9',
                'Referer': targetUrl,
                'Authorization': req.headers['authorization'] || '',
            },
            timeout: 30000,
        };

        const proxyReq = client.request(options, (proxyRes) => {
            console.log(`[PROXY] Response: ${proxyRes.statusCode}`);
            
            // Content-Type'ı koru
            const contentType = proxyRes.headers['content-type'];
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            }
            
            res.writeHead(proxyRes.statusCode);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('[PROXY] Error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
        });

        proxyReq.on('timeout', () => {
            console.error('[PROXY] Timeout');
            proxyReq.destroy();
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Gateway timeout' }));
        });

        proxyReq.end();

    } catch (err) {
        console.error('[PROXY] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal error', message: err.message }));
    }
});

server.listen(PORT, () => {
    console.log(`[PROXY] Server running on port ${PORT}`);
    console.log(`[PROXY] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
