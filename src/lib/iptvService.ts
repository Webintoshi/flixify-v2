/**
 * FLIXIFY IPTV SERVICE - Xtream Codes API
 * 
 * Vultr proxy sunucusu üzerinden Xtream Codes API'ye istek atar
 * Proxy: https://api.flixify.pro (Coolify) veya http://<VULTR_IP>:3001 (geçici)
 * 
 * Xtream Codes API Endpoints:
 * - /api/live-categories (Kategori listesi)
 * - /api/live-streams (Kanal listesi)  
 * - /api/vod (Film listesi)
 * - /api/series (Dizi listesi)
 * - Stream URL: /live/{username}/{password}/{stream_id}.m3u8
 */

// Proxy URL - Coolify'da api.flixify.pro domain'i port 3001'e yönlendirilecek
// Geçici olarak doğrudan Vultr IP kullanılabilir
const PROXY_BASE = 'https://api.flixify.pro';
// const PROXY_BASE = 'http://<VULTR_IP>:3001'; // Domain aktif olana kadar

const IPTV_BASE = 'http://sifiriptvdns.com:80';

// Types
export interface LiveCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface LiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface VodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface Series {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

// Get credentials from localStorage
function getCredentials(): { username: string | null; password: string | null } {
  return {
    username: localStorage.getItem('iptv_username'),
    password: localStorage.getItem('iptv_password'),
  };
}

// Generic API fetch function
async function apiFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { username, password } = getCredentials();
  
  if (!username || !password) {
    throw new Error('IPTV credentials missing. Please login again.');
  }

  const url = new URL(`${PROXY_BASE}${endpoint}`);
  url.searchParams.set('username', username);
  url.searchParams.set('password', password);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  console.log('[IPTV_SERVICE] Fetching:', url.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[IPTV_SERVICE] API error:', res.status, errorText);
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    console.log('[IPTV_SERVICE] Response:', endpoint, Array.isArray(data) ? `${data.length} items` : 'success');
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[IPTV_SERVICE] Fetch error:', error.message);
    throw error;
  }
}

// IPTV Service API
export const IPTVService = {
  // Get live TV categories
  getLiveCategories: (): Promise<LiveCategory[]> => 
    apiFetch<LiveCategory[]>('/api/live-categories'),

  // Get live TV streams
  getLiveStreams: (category_id?: string): Promise<LiveStream[]> =>
    apiFetch<LiveStream[]>('/api/live-streams', category_id ? { category_id } : {}),

  // Get VOD (movies)
  getVOD: (category_id?: string): Promise<VodStream[]> =>
    apiFetch<VodStream[]>('/api/vod', category_id ? { category_id } : {}),

  // Get VOD categories
  getVodCategories: (): Promise<LiveCategory[]> =>
    apiFetch<LiveCategory[]>('/api/vod-categories'),

  // Get series
  getSeries: (category_id?: string): Promise<Series[]> =>
    apiFetch<Series[]>('/api/series', category_id ? { category_id } : {}),

  // Get series categories
  getSeriesCategories: (): Promise<LiveCategory[]> =>
    apiFetch<LiveCategory[]>('/api/series-categories'),

  // Get stream URL for live TV
  getLiveStreamUrl: (stream_id: number): string => {
    const { username, password } = getCredentials();
    if (!username || !password) {
      console.error('[IPTV_SERVICE] Credentials missing for stream URL');
      return '';
    }
    return `${IPTV_BASE}/live/${username}/${password}/${stream_id}.m3u8`;
  },

  // Get VOD stream URL
  getVodUrl: (stream_id: number, container_extension = 'mp4'): string => {
    const { username, password } = getCredentials();
    if (!username || !password) {
      console.error('[IPTV_SERVICE] Credentials missing for VOD URL');
      return '';
    }
    return `${IPTV_BASE}/movie/${username}/${password}/${stream_id}.${container_extension}`;
  },

  // Get series episode stream URL
  getSeriesStreamUrl: (stream_id: number, container_extension = 'mp4'): string => {
    const { username, password } = getCredentials();
    if (!username || !password) {
      console.error('[IPTV_SERVICE] Credentials missing for series URL');
      return '';
    }
    return `${IPTV_BASE}/series/${username}/${password}/${stream_id}.${container_extension}`;
  },

  // Check if credentials exist
  hasCredentials: (): boolean => {
    const { username, password } = getCredentials();
    return !!username && !!password;
  },

  // Clear credentials (logout)
  clearCredentials: (): void => {
    localStorage.removeItem('iptv_username');
    localStorage.removeItem('iptv_password');
  },

  // Set credentials (login)
  setCredentials: (username: string, password: string): void => {
    localStorage.setItem('iptv_username', username);
    localStorage.setItem('iptv_password', password);
  },
};

export default IPTVService;
