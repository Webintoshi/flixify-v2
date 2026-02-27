import express from 'express';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ========== PROXY ENDPOINT (/api/proxy) ==========
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
        'User-Agent': req.headers['user-agent'] || 'VLC/3.0.18',
        'Accept': '*/*',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    const body = await response.text();
    console.log(`[PROXY] Response: ${response.status}, Length: ${body.length}`);
    
    res.status(response.status).send(body);
    
  } catch (error) {
    console.error('[PROXY] ERROR:', error.message);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
};

// /api/proxy ve /api/proxy/ ikisini de destekle
app.get('/api/proxy', proxyHandler);
app.get('/api/proxy/', proxyHandler);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Static files
app.use(express.static('/app/dist'));

// SPA fallback
app.use((req, res) => {
  res.sendFile('/app/dist/index.html');
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
});
