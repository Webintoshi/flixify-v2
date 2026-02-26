/**
 * BUNNY VIDEO CREATE API
 * 
 * Yeni video objesi oluştur ve upload URL'si döndür.
 * Admin panel üzerinden video yükleme için kullanılır.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY!;
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID!;

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

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, metadata = {} } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    // Create video in Bunny Stream
    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          metaTags: Object.entries(metadata).map(([key, value]) => ({
            property: key,
            value: value as string,
          })),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bunny API error: ${error}`);
    }

    const data = await response.json();

    // Get upload URL
    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${data.guid}/upload`,
      {
        method: 'GET',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
        },
      }
    );

    if (!uploadResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl } = await uploadResponse.json();

    return res.status(200).json({
      videoId: data.guid,
      uploadUrl,
      title: data.title,
    });

  } catch (error: any) {
    console.error('[BUNNY CREATE VIDEO ERROR]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
