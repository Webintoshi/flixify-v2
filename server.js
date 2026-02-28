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

// ========== SUPABASE PROXY (HTTP Mode) ==========
const supabaseProxyHandler = async (req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sdsvnkvmfhaubgcahvzv.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  // /api/supabase-proxy/users?select=* -> /users?select=*
  const path = req.path.replace('/api/supabase-proxy', '');
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const supabaseUrl = `${SUPABASE_URL}/rest/v1${path}${queryString}`;
  
  console.log('[SUPABASE-PROXY] Forwarding to:', supabaseUrl);
  
  try {
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': req.headers.authorization || `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': req.headers['content-type'] || 'application/json',
    };
    
    const response = await fetch(supabaseUrl, {
      method: req.method,
      headers: headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    
    const data = await response.text();
    res.status(response.status).set({
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*'
    }).send(data);
    
  } catch (error) {
    console.error('[SUPABASE-PROXY] Error:', error.message);
    res.status(500).json({ error: 'Supabase proxy failed', message: error.message });
  }
};

// ========== XTREAM CODES API PROXY ==========
const IPTV_BASE = 'http://sifiriptvdns.com:80';

const iptvProxyHandler = async (req, res, endpoint) => {
  const { username, password, ...otherParams } = req.query;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  
  const targetUrl = new URL(`${IPTV_BASE}/${endpoint}`);
  targetUrl.searchParams.set('username', username);
  targetUrl.searchParams.set('password', password);
  
  Object.entries(otherParams).forEach(([key, value]) => {
    if (value) targetUrl.searchParams.set(key, value);
  });
  
  console.log(`[IPTV-PROXY] ${endpoint}:`, targetUrl.toString());
  
  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`[IPTV-PROXY] Error:`, error.message);
    res.status(502).json({ error: 'IPTV proxy failed', message: error.message });
  }
};

// ========== ROUTES ==========
// Proxy route - stream proxy
app.get('/api/proxy', proxyHandler);

// Xtream Codes API endpoints
app.get('/api/live-categories', (req, res) => iptvProxyHandler(req, res, 'player_api.php?action=get_live_categories'));
app.get('/api/live-streams', (req, res) => iptvProxyHandler(req, res, 'player_api.php?action=get_live_streams'));
app.get('/api/vod-categories', (req, res) => iptvProxyHandler(req, res, 'player_api.php?action=get_vod_categories'));
app.get('/api/vod', (req, res) => iptvProxyHandler(req, res, 'player_api.php?action=get_vod_streams'));
app.get('/api/series-categories', (req, res) => iptvProxyHandler(req, res, 'player_api.php?action=get_series_categories'));
app.get('/api/series', (req, res) => iptvProxyHandler(req, res, 'player_api.php?action=get_series'));

// Supabase Proxy - HTTP modu için (wildcard route)
app.use('/api/supabase-proxy', supabaseProxyHandler);

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
