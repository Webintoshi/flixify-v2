/**
 * BUNNY VIDEOS LIST API
 * 
 * Bunny Stream Library'deki tüm videoları listeler.
 * Cache mekanizması ile performans optimizasyonu.
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    // Check cache first (last 5 minutes)
    const { data: cached } = await supabase
      .from('bunny_videos_cache')
      .select('*')
      .gt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1);

    if (cached && cached.length > 0) {
      // Return cached videos
      const { data: videos } = await supabase
        .from('bunny_videos_cache')
        .select('*')
        .order('updated_at', { ascending: false });

      return res.status(200).json({
        videos: videos?.map(v => ({
          id: v.video_id,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnail_url,
          duration: v.duration,
          category: v.category,
          country: v.country,
        })) || [],
        cached: true,
      });
    }

    // Fetch from Bunny API
    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Bunny API error: ${response.status}`);
    }

    const data = await response.json();

    const videos = data.items.map((item: any) => ({
      id: item.guid,
      title: item.title,
      description: item.metaTags?.find((t: any) => t.property === 'description')?.value || '',
      thumbnailUrl: `https://${BUNNY_STREAM_LIBRARY_ID}.b-cdn.net/${item.guid}/${item.thumbnailFileName}`,
      duration: item.length,
      category: item.metaTags?.find((t: any) => t.property === 'category')?.value || '',
      country: item.metaTags?.find((t: any) => t.property === 'country')?.value || '',
    }));

    // Update cache
    await supabase.from('bunny_videos_cache').upsert(
      videos.map((v: any) => ({
        video_id: v.id,
        title: v.title,
        description: v.description,
        thumbnail_url: v.thumbnailUrl,
        duration: v.duration,
        category: v.category,
        country: v.country,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'video_id' }
    );

    return res.status(200).json({
      videos,
      cached: false,
    });

  } catch (error: any) {
    console.error('[BUNNY VIDEOS ERROR]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
