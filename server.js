import express from 'express';
import { createServer } from 'http';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(express.json());

// CORS - tüm origin'lere izin ver
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// ========== PROXY HANDLER ==========
const proxyHandler = async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }
  
  console.log(`[PROXY] Fetching: ${decodedUrl.substring(0, 100)}...`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': decodedUrl,
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    
    clearTimeout(timeout);
    
    console.log(`[PROXY] Response: ${response.status}`);
    
    // Content headers
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    
    // Stream olarak gönder (büyük dosyalar için)
    if (response.body) {
      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      const body = await response.text();
      res.status(response.status).send(body);
    }
    
  } catch (error) {
    console.error('[PROXY] ERROR:', error.message);
    res.status(502).json({ error: 'Proxy failed', message: error.message });
  }
};

// ========== ROUTES ==========
// Proxy route - root level'da (nginx/Vercel'den bağımsız)
app.get('/p', proxyHandler);

// Health check  
app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

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

// Static files - Vite build output
app.use(express.static('dist'));

// SPA fallback
app.use((req, res) => {
  res.sendFile('dist/index.html', { root: process.cwd() });
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] Proxy endpoint: http://localhost:${PORT}/proxy?url=...`);
});
