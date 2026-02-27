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
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://flixify.pro,http://localhost:5173').split(',');

const server = http.createServer(async (req, res) => {
    // CORS Headers
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // URL parse
    const parsedUrl = url.parse(req.url, true);
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

        const options = {
            hostname: targetParsed.hostname,
            port: targetParsed.port || (isHttps ? 443 : 80),
            path: targetParsed.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Accept-Language': 'tr-TR,tr;q=0.9',
                'Referer': targetUrl,
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
