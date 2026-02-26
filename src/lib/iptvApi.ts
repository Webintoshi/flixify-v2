/**
 * FLIXIFY IPTV API SERVICE
 * 
 * Backend API'leri ile iletişim kuran servis katmanı.
 * Tüm IPTV operasyonları buradan yönetilir.
 */

import { supabase } from './supabase';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Types
export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  countryCode?: string;
  countryName?: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  channelCount: number;
}

export interface PlaylistResponse {
  channels: Channel[];
  countries: Country[];
  totalChannels: number;
  cached: boolean;
  fetchedAt: string;
}

export interface StreamTokenResponse {
  token: string;
  expiresAt: string;
  streamUrl: string;
}

// Get Auth Token
async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

// Fetch Playlist
export async function fetchPlaylist(): Promise<PlaylistResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE}/playlist/fetch`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch playlist');
  }

  return response.json();
}

// Generate Stream Token
export async function generateStreamToken(channelId: string): Promise<StreamTokenResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE}/stream/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channelId }),
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Concurrent stream limit error
    if (response.status === 429) {
      throw new Error('Concurrent stream limit reached. Please close other devices.');
    }
    
    throw new Error(error.error || 'Failed to generate stream token');
  }

  return response.json();
}

// Get Proxy Stream URL
export function getProxyStreamUrl(channelId: string, token: string): string {
  return `${API_BASE}/stream/proxy?channelId=${channelId}&token=${token}`;
}

// End Stream Session (cleanup)
export async function endStreamSession(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/stream/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken: token }),
    });
  } catch (error) {
    console.warn('[IPTV API] Failed to end stream session:', error);
  }
}

// Heartbeat (keep session alive)
export async function sendHeartbeat(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/stream/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken: token }),
    });
  } catch (error) {
    console.warn('[IPTV API] Heartbeat failed:', error);
  }
}

// Filter channels
export function filterChannels(
  channels: Channel[],
  searchQuery: string,
  countryCode?: string
): Channel[] {
  let filtered = channels;

  if (countryCode) {
    filtered = filtered.filter(ch => ch.countryCode === countryCode);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(ch =>
      ch.name.toLowerCase().includes(query) ||
      ch.group.toLowerCase().includes(query)
    );
  }

  return filtered;
}

// Get channels by country
export function getChannelsByCountry(
  channels: Channel[],
  countryCode: string
): Channel[] {
  if (countryCode === 'ALL') return channels;
  return channels.filter(ch => ch.countryCode === countryCode);
}

// Extract countries from channels
export function extractCountries(channels: Channel[]): Country[] {
  const countryMap = new Map<string, { name: string; flag: string; count: number }>();
  
  const countryData: Record<string, { name: string; flag: string }> = {
    'TR': { name: 'Türkiye', flag: '🇹🇷' },
    'RU': { name: 'Rusya', flag: '🇷🇺' },
    'US': { name: 'ABD', flag: '🇺🇸' },
    'UK': { name: 'İngiltere', flag: '🇬🇧' },
    'DE': { name: 'Almanya', flag: '🇩🇪' },
    'FR': { name: 'Fransa', flag: '🇫🇷' },
    'IT': { name: 'İtalya', flag: '🇮🇹' },
    'ES': { name: 'İspanya', flag: '🇪🇸' },
    'NL': { name: 'Hollanda', flag: '🇳🇱' },
    'BE': { name: 'Belçika', flag: '🇧🇪' },
    'AT': { name: 'Avusturya', flag: '🇦🇹' },
    'CH': { name: 'İsviçre', flag: '🇨🇭' },
    'SE': { name: 'İsveç', flag: '🇸🇪' },
    'NO': { name: 'Norveç', flag: '🇳🇴' },
    'DK': { name: 'Danimarka', flag: '🇩🇰' },
    'FI': { name: 'Finlandiya', flag: '🇫🇮' },
    'PL': { name: 'Polonya', flag: '🇵🇱' },
    'CZ': { name: 'Çekya', flag: '🇨🇿' },
    'HU': { name: 'Macaristan', flag: '🇭🇺' },
    'RO': { name: 'Romanya', flag: '🇷🇴' },
    'BG': { name: 'Bulgaristan', flag: '🇧🇬' },
    'HR': { name: 'Hırvatistan', flag: '🇭🇷' },
    'RS': { name: 'Sırbistan', flag: '🇷🇸' },
    'BA': { name: 'Bosna Hersek', flag: '🇧🇦' },
    'AL': { name: 'Arnavutluk', flag: '🇦🇱' },
    'GR': { name: 'Yunanistan', flag: '🇬🇷' },
    'UA': { name: 'Ukrayna', flag: '🇺🇦' },
    'AZ': { name: 'Azerbaycan', flag: '🇦🇿' },
    'KZ': { name: 'Kazakistan', flag: '🇰🇿' },
    'CN': { name: 'Çin', flag: '🇨🇳' },
    'JP': { name: 'Japonya', flag: '🇯🇵' },
    'KR': { name: 'Güney Kore', flag: '🇰🇷' },
    'IN': { name: 'Hindistan', flag: '🇮🇳' },
    'BR': { name: 'Brezilya', flag: '🇧🇷' },
    'AR': { name: 'Arjantin', flag: '🇦🇷' },
    'MX': { name: 'Meksika', flag: '🇲🇽' },
    'CA': { name: 'Kanada', flag: '🇨🇦' },
    'AU': { name: 'Avustralya', flag: '🇦🇺' },
    'ZA': { name: 'Güney Afrika', flag: '🇿🇦' },
    'EG': { name: 'Mısır', flag: '🇪🇬' },
    'SA': { name: 'Suudi Arabistan', flag: '🇸🇦' },
    'AE': { name: 'BAE', flag: '🇦🇪' },
    'QA': { name: 'Katar', flag: '🇶🇦' },
    'KW': { name: 'Kuveyt', flag: '🇰🇼' },
    'TH': { name: 'Tayland', flag: '🇹🇭' },
  };

  channels.forEach(ch => {
    if (ch.countryCode && countryData[ch.countryCode]) {
      const existing = countryMap.get(ch.countryCode);
      if (existing) {
        existing.count++;
      } else {
        countryMap.set(ch.countryCode, {
          name: countryData[ch.countryCode].name,
          flag: countryData[ch.countryCode].flag,
          count: 1,
        });
      }
    }
  });

  const countries: Country[] = Array.from(countryMap.entries()).map(([code, data]) => ({
    code,
    name: data.name,
    flag: data.flag,
    channelCount: data.count,
  }));

  // Türkiye'yi başa al, sonra kanal sayısına göre sırala
  return countries.sort((a, b) => {
    if (a.code === 'TR') return -1;
    if (b.code === 'TR') return 1;
    return b.channelCount - a.channelCount;
  });
}
