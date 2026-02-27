import express from 'express';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (Coolify/nginx önünde çalışırken gerekli)
app.set('trust proxy', true);

// Body parser (gerekirse)
app.use(express.json());

// CORS headers (gerekirse)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ========== PROXY ENDPOINT ==========
const proxyHandler = async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    console.log('[PROXY] ERROR: Missing url parameter');
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  console.log(`[PROXY] Fetching: ${targetUrl}`);
  
  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    console.log(`[PROXY] Decoded URL: ${decodedUrl}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    console.log(`[PROXY] Response: ${response.status} ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    const body = await response.text();
    console.log(`[PROXY] Body length: ${body.length} bytes`);
    
    if (body.includes('#EXTM3U')) {
      console.log('[PROXY] ✅ Valid M3U playlist');
    }
    
    res.status(response.status).send(body);
    
  } catch (error) {
    console.error('[PROXY] ERROR:', error.message);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message,
      url: targetUrl 
    });
  }
};

app.get('/proxy', proxyHandler);
app.get('/proxy/', proxyHandler);

// Test endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ========== STATIC FILES (React App) ==========
app.use(express.static('/app/dist'));

// SPA fallback - app.use ile yapılmalı, app.get('*') çalışmıyor
app.use((req, res) => {
  res.sendFile('/app/dist/index.html');
});

// HTTP server oluştur
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
});
