/**
 * BUNNY CDN IPTV STREAM PROXY
 * 
 * IPTV provider'dan gelen stream'leri Bunny CDN üzerinden proxy eder.
 * Video depolama yok! Sadece caching ve edge delivery.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Bunny CDN Configuration
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || '';
const BUNNY_API_KEY = process.env.BUNNY_CDN_API_KEY || '';

// IPTV Origin URL'sini Bunny CDN üzerinden proxy et
function getBunnyProxyUrl(originUrl: string): string {
  if (!BUNNY_CDN_URL) return originUrl;
  
  // Stream URL'ini Bunny CDN üzerinden proxy et
  // Bunny Pull Zone: flixify.b-cdn.net
  // Origin: IPTV provider URL
  
  const encodedUrl = Buffer.from(originUrl).toString('base64url');
  return `${BUNNY_CDN_URL}/proxy/${encodedUrl}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channelId, token } = req.query;

    if (!channelId || !token) {
      return res.status(400).json({ error: 'Missing channelId or token' });
    }

    // 1. Token doğrulama
    const { data: session, error: sessionError } = await supabase
      .from('stream_sessions')
      .select('user_id, channel_id, expires_at, is_active')
      .eq('session_token', token as string)
      .single();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!session.is_active || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // 2. Channel'ı al
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('stream_url, name')
      .eq('id', channelId)
      .eq('user_id', session.user_id)
      .single();

    if (channelError || !channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // 3. Bunny CDN proxy URL oluştur
    const proxyMode = process.env.STREAM_PROXY_MODE || 'direct';
    let streamUrl: string;

    if (proxyMode === 'bunny' && BUNNY_CDN_URL) {
      // Bunny CDN üzerinden proxy et
      streamUrl = getBunnyProxyUrl(channel.stream_url);
      
      // Bunny cache purge (isteğe bağlı - yeni stream için)
      // Not: Bunny cache'i temizlemek için API çağrısı yapılabilir
    } else {
      // Doğrudan IPTV provider'dan çek
      streamUrl = channel.stream_url;
    }

    // 4. Stream'i client'a yönlendir (redirect)
    // veya proxy et (isteğe bağlı)
    
    // Seçenek A: Redirect (daha hafif)
    // return res.redirect(302, streamUrl);
    
    // Seçenek B: Proxy (daha fazla kontrol)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(streamUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FlixifyPlayer/1.0',
        'Accept': '*/*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: 'Stream unavailable' });
    }

    // Stream headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('X-Stream-Proxy', proxyMode === 'bunny' ? 'bunny-cdn' : 'direct');

    // Pipe stream
    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'Stream error' });
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }

    res.end();

  } catch (error: any) {
    console.error('[BUNNY PROXY ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
