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

// ========== API ROUTES ==========

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'http://sifiriptvdns.com/',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    
    const body = await response.text();
    console.log(`[PROXY] Status: ${response.status}, Length: ${body.length}`);
    console.log(`[PROXY] Body preview: ${body.substring(0, 200)}`);
    
    if (body.includes('#EXTM3U')) {
      console.log('[PROXY] ✅ Valid M3U');
    }
    
    res.status(response.status).send(body);
    
  } catch (error) {
    console.error('[PROXY] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// /api/p = proxy
app.get('/api/p', proxyHandler);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Outbound IP check
app.get('/api/ip', async (req, res) => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    res.json({ outbound_ip: data.ip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Static files
app.use(express.static('/app/dist'));

// SPA fallback
app.use((req, res) => {
  res.sendFile('/app/dist/index.html');
});

const server = createServer(app);
server.listen(PORT, () => console.log(`[SERVER] Port ${PORT}`));
