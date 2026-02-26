/**
 * BUNNY CDN / STREAM SERVICE
 * 
 * Bunny.net entegrasyonu için servis katmanı.
 * - Bunny Stream: Video hosting ve streaming
 * - Bunny CDN: Global CDN cache
 * - Signed URL: Güvenli video erişimi
 */

import { supabase } from './supabase';

// Bunny API Configuration
const BUNNY_STREAM_API_KEY = import.meta.env.VITE_BUNNY_STREAM_API_KEY || '';
const BUNNY_STREAM_LIBRARY_ID = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID || '';
const BUNNY_CDN_URL = import.meta.env.VITE_BUNNY_CDN_URL || '';

// Types
export interface BunnyVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  previewUrl?: string;
  duration: number;
  category?: string;
  country?: string;
}

export interface BunnyStreamResponse {
  videoId: string;
  thumbnail: string;
  preview: string;
  directPlayUrl: string;
  embedUrl: string;
}

/**
 * Generate signed URL for secure streaming
 * Bunny Stream token-based authentication
 */
export function generateSignedUrl(videoId: string): string {
  // Server-side generated signed URL
  // Client'ta sadece API çağrısı yapılır
  return `${BUNNY_CDN_URL}/${videoId}?token=SERVER_GENERATED`;
}

/**
 * Fetch video list from Bunny Stream Library
 */
export async function fetchBunnyVideos(): Promise<BunnyVideo[]> {
  if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
    console.warn('[BUNNY] Stream API not configured');
    return [];
  }

  try {
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
    
    return data.items.map((item: any) => ({
      id: item.guid,
      title: item.title,
      description: item.metaTags?.find((t: any) => t.property === 'description')?.value,
      thumbnailUrl: `https://${BUNNY_STREAM_LIBRARY_ID}.b-cdn.net/${item.guid}/${item.thumbnailFileName}`,
      previewUrl: item.previewUrl,
      duration: item.length,
      category: item.metaTags?.find((t: any) => t.property === 'category')?.value,
      country: item.metaTags?.find((t: any) => t.property === 'country')?.value,
    }));
  } catch (error) {
    console.error('[BUNNY] Failed to fetch videos:', error);
    return [];
  }
}

/**
 * Get stream URL with token
 * Backend API üzerinden alınmalı (güvenlik)
 */
export async function getBunnyStreamUrl(
  videoId: string,
  quality: '1080p' | '720p' | '480p' | '360p' = '1080p'
): Promise<string | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const response = await fetch('/api/bunny/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId, quality }),
    });

    if (!response.ok) {
      throw new Error('Failed to get stream URL');
    }

    const data = await response.json();
    return data.streamUrl;
  } catch (error) {
    console.error('[BUNNY] Failed to get stream URL:', error);
    return null;
  }
}

/**
 * Cache video metadata in Supabase
 * Hızlı erişim için Bunny video bilgilerini cache'le
 */
export async function cacheBunnyVideos(videos: BunnyVideo[]): Promise<void> {
  const { error } = await supabase
    .from('bunny_videos_cache')
    .upsert(
      videos.map(v => ({
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

  if (error) {
    console.error('[BUNNY] Cache error:', error);
  }
}

/**
 * Get cached videos from Supabase
 */
export async function getCachedBunnyVideos(
  category?: string,
  country?: string
): Promise<BunnyVideo[]> {
  let query = supabase
    .from('bunny_videos_cache')
    .select('*')
    .order('updated_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('[BUNNY] Fetch cache error:', error);
    return [];
  }

  return data.map(item => ({
    id: item.video_id,
    title: item.title,
    description: item.description,
    thumbnailUrl: item.thumbnail_url,
    duration: item.duration,
    category: item.category,
    country: item.country,
  }));
}

/**
 * Check if Bunny Stream is configured
 */
export function isBunnyConfigured(): boolean {
  return !!(BUNNY_STREAM_API_KEY && BUNNY_STREAM_LIBRARY_ID);
}

/**
 * Get auth token from Supabase
 */
async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Upload video to Bunny Stream
 * Admin panel üzerinden kullanılır
 */
export async function uploadVideoToBunny(
  file: File,
  title: string,
  metadata?: Record<string, string>
): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // 1. Create video object
    const createResponse = await fetch('/api/bunny/video/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, metadata }),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create video');
    }

    const { videoId, uploadUrl } = await createResponse.json();

    // 2. Upload file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    return { success: true, videoId };
  } catch (error: any) {
    console.error('[BUNNY] Upload error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  fetchBunnyVideos,
  getBunnyStreamUrl,
  cacheBunnyVideos,
  getCachedBunnyVideos,
  isBunnyConfigured,
  uploadVideoToBunny,
};
