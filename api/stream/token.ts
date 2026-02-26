/**
 * STREAM TOKEN GENERATOR
 * 
 * Kullanıcı video izlemek istediğinde geçici token oluşturur.
 * Bu token ile stream proxy üzerinden güvenli erişim sağlanır.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth token'dan user_id çıkar (Supabase JWT)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // JWT verify (simplified - production'da supabase auth kullanın)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID required' });
    }

    // Kullanıcının bu kanala erişimi var mı kontrol et
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('id', channelId)
      .eq('user_id', user.id)
      .single();

    if (channelError || !channel) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Concurrent stream limit kontrolü
    const { data: sessions, error: sessionError } = await supabase
      .from('stream_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (sessionError) {
      console.error('[TOKEN] Session check error:', sessionError);
    }

    // Max concurrent streams config (default: 2)
    const { data: profile } = await supabase
      .from('profiles')
      .select('max_concurrent_streams')
      .eq('id', user.id)
      .single();

    const maxStreams = profile?.max_concurrent_streams || 2;

    if (sessions && sessions.length >= maxStreams) {
      // En eski session'ı sonlandır
      const oldestSession = sessions[0];
      await supabase
        .from('stream_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', oldestSession.id);
    }

    // Yeni session token oluştur
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 saat geçerli

    const { error: insertError } = await supabase
      .from('stream_sessions')
      .insert({
        user_id: user.id,
        channel_id: channelId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
      });

    if (insertError) {
      console.error('[TOKEN] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    return res.status(200).json({
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      streamUrl: `/api/stream/proxy?channelId=${channelId}&token=${sessionToken}`,
    });

  } catch (error: any) {
    console.error('[TOKEN ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
