/**
 * FLIXIFY V2 - Combined Server (ES Module)
 * 
 * Tek sunucuda:
 * - Static React build (dist/)
 * - /proxy endpoint (IPTV için)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});

// /proxy endpoint - IPTV için
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'URL parametresi eksik. ?url=http://...' });
    }
    
    console.log(`[PROXY] ${targetUrl.substring(0, 80)}...`);
    
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Accept-Language': 'tr-TR,tr;q=0.9',
            },
        });
        
        if (!response.ok) {
            console.error(`[PROXY] HTTP ${response.status}`);
            return res.status(response.status).json({ 
                error: 'Target server error', 
                status: response.status 
            });
        }
        
        const text = await response.text();
        
        if (!text.includes('#EXTM3U')) {
            console.warn('[PROXY] Non-M3U response');
        }
        
        console.log(`[PROXY] Success - ${text.length} bytes`);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(text);
        
    } catch (err) {
        console.error('[PROXY] Error:', err.message);
        res.status(500).json({ error: 'Proxy error', message: err.message });
    }
});

// Static files - React build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA routing - tüm istekleri index.html'e yönlendir (en sonda olmalı)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT}`);
    console.log(`[SERVER] Proxy: http://localhost:${PORT}/proxy`);
});
