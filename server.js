import express from 'express';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ========== API ROUTES (/x/p) ==========
const proxyHandler = async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  console.log(`[PROXY] Fetching: ${targetUrl}`);
  
  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'VLC/3.0.18',
        'Accept': '*/*',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    
    const body = await response.text();
    console.log(`[PROXY] ${response.status}, Length: ${body.length}`);
    
    if (body.includes('#EXTM3U')) {
      console.log('[PROXY] ✅ Valid M3U');
    }
    
    res.status(response.status).send(body);
    
  } catch (error) {
    console.error('[PROXY] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Kısa path - nginx conflict olmaması için
app.get('/x/p', proxyHandler);
app.get('/health', (req, res) => res.json({ ok: true }));

// Static files
app.use(express.static('/app/dist'));

// SPA fallback - sadece non-API routes için
app.use((req, res) => {
  res.sendFile('/app/dist/index.html');
});

const server = createServer(app);
server.listen(PORT, () => console.log(`[SERVER] Port ${PORT}`));
