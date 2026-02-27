/**
 * SIMPLE URL PROXY
 * 
 * Kullanım: /api/p?url=<encoded_url>
 * Amaç: HTTP IPTV URL'lerini HTTPS üzerinden proxy etmek (CORS çözümü)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin, Accept',
  'Access-Control-Expose-Headers': 'Content-Type, Content-Length',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  // URL validation
  try {
    new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  console.log('[URL PROXY] Fetching:', targetUrl.substring(0, 100) + '...');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout

    const response = await fetch(targetUrl, {
      method: req.method,
      signal: controller.signal,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'FlixifyPlayer/1.0',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      // @ts-ignore - Node.js fetch specific option
      redirect: 'follow',
    });

    clearTimeout(timeout);

    console.log('[URL PROXY] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[URL PROXY] Upstream error:', response.status, errorText.substring(0, 200));
      return res.status(response.status).json({ 
        error: 'Upstream request failed',
        status: response.status 
      });
    }

    // CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Content headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Cache control
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Handle HEAD request
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'No response body' });
    }

    // Stream with backpressure handling
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Buffer'ı kontrollü yaz
        const buffer = Buffer.from(value);
        const canContinue = res.write(buffer);
        
        // Backpressure varsa bekle
        if (!canContinue) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
      
      res.end();
    } catch (streamError: any) {
      console.error('[URL PROXY] Stream error:', streamError.message);
      // Client bağlantısı kapanmış olabilir, sessizce çık
      if (!res.writableEnded) {
        res.end();
      }
    }

  } catch (error: any) {
    console.error('[URL PROXY ERROR]', error.name, error.message);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    return res.status(502).json({ 
      error: 'Proxy request failed',
      message: error.message 
    });
  }
}
