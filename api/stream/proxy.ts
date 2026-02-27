/**
 * FLIXIFY STREAM PROXY
 * 
 * Amaç:
 * 1. IPTV URL'lerini client'tan gizle (security through obscurity)
 * 2. CORS sorunlarını çöz (server-side proxy)
 * 3. Concurrent stream limiti uygula
 * 4. Token-based authentication
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'X-Session-ID',
};

// Supabase Admin Client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Stream Session Store (In-memory cache - Redis'e taşınabilir)
const activeStreams = new Map<string, {
  userId: string;
  channelId: string;
  startedAt: number;
  ip: string;
}>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
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

    // 2. Channel'ı al (stream URL için)
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('stream_url, name')
      .eq('id', channelId)
      .eq('user_id', session.user_id)
      .single();

    if (channelError || !channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // 3. Concurrent stream kontrolü
    const userStreams = Array.from(activeStreams.values())
      .filter(s => s.userId === session.user_id);
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('max_concurrent_streams')
      .eq('id', session.user_id)
      .single();

    const maxStreams = profile?.max_concurrent_streams || 2;

    if (userStreams.length >= maxStreams) {
      // Eski stream'i sonlandır (FIFO)
      const oldestStream = userStreams.sort((a, b) => a.startedAt - b.startedAt)[0];
      activeStreams.delete(`${oldestStream.userId}:${oldestStream.channelId}`);
    }

    // 4. Stream session'ı kaydet
    const sessionId = `${session.user_id}:${channelId}`;
    activeStreams.set(sessionId, {
      userId: session.user_id,
      channelId: channelId as string,
      startedAt: Date.now(),
      ip: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown',
    });

    // 5. IPTV Origin'e istek at (with retry logic)
    const streamUrl = channel.stream_url;
    console.log('[STREAM PROXY] Fetching stream:', streamUrl.substring(0, 80) + '...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout

    let response;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`[STREAM PROXY] Attempt ${retryCount + 1}/${maxRetries}`);
        
        response = await fetch(streamUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'FlixifyPlayer/1.0',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          },
          // @ts-ignore
          redirect: 'follow',
        });

        console.log('[STREAM PROXY] Response status:', response.status);
        
        if (response.ok) break;
        
        // 4xx hatalarında tekrar deneme (client hatası)
        if (response.status >= 400 && response.status < 500) {
          console.log('[STREAM PROXY] Client error, not retrying');
          break;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * retryCount));
        }
      } catch (err: any) {
        console.error(`[STREAM PROXY] Attempt ${retryCount + 1} failed:`, err.message);
        retryCount++;
        if (retryCount >= maxRetries) {
          clearTimeout(timeout);
          throw err;
        }
      }
    }

    clearTimeout(timeout);

    if (!response || !response.ok) {
      console.error('[STREAM PROXY] All attempts failed. Last status:', response?.status);
      return res.status(502).json({ 
        error: 'Upstream stream unavailable',
        status: response?.status,
        url: streamUrl.substring(0, 100) + '...'
      });
    }

    // 6. Stream'i pipe et
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Session-ID', sessionId);
    
    // CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Body'yi stream olarak gönder
    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'Stream error' });
    }

    // Stream bitince session'ı temizle
    req.on('close', () => {
      activeStreams.delete(sessionId);
      console.log(`[STREAM] Session closed: ${sessionId}`);
    });

    // Pipe stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }

    res.end();

  } catch (error: any) {
    console.error('[STREAM PROXY ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
