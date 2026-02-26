/**
 * BUNNY STREAM API - Get Secure Stream URL
 * 
 * Token-based authentication ile güvenli stream URL üretir.
 * Signed URL ile video çalma güvenliği sağlanır.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Bunny Configuration
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID!;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL!;
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_SECURITY_KEY!;

/**
 * Generate signed URL for Bunny Stream
 * Token expires after specified hours
 */
function generateSignedUrl(videoId: string, expirationHours: number = 4): string {
  if (!BUNNY_TOKEN_KEY) {
    // No security key, return direct URL (development only)
    return `${BUNNY_CDN_URL}/${videoId}/playlist.m3u8`;
  }

  const expires = Math.floor(Date.now() / 1000) + (expirationHours * 3600);
  const token = crypto
    .createHash('sha256')
    .update(`${BUNNY_TOKEN_KEY}${videoId}${expires}`)
    .digest('hex');

  return `${BUNNY_CDN_URL}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;
}

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
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { videoId, quality = '1080p' } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID required' });
    }

    // Check subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_expiry, is_banned')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      return res.status(403).json({ error: 'Account banned' });
    }

    if (profile?.subscription_expiry && new Date(profile.subscription_expiry) < new Date()) {
      return res.status(403).json({ error: 'Subscription expired' });
    }

    // Generate signed URL
    const streamUrl = generateSignedUrl(videoId, 4); // 4 hours expiration
    const thumbnailUrl = `${BUNNY_CDN_URL}/${videoId}/thumbnail.jpg`;

    // Log access
    await supabase.from('bunny_access_logs').insert({
      user_id: user.id,
      video_id: videoId,
      accessed_at: new Date().toISOString(),
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });

    return res.status(200).json({
      streamUrl,
      thumbnailUrl,
      videoId,
      expiresIn: 4 * 60 * 60, // 4 hours in seconds
    });

  } catch (error: any) {
    console.error('[BUNNY STREAM ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
