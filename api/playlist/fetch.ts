/**
 * PLAYLIST FETCH & PARSE API
 * 
 * Kullanıcının tanımlı M3U URL'sini çeker, parse eder ve kanal listesini döndürür.
 * Client'ta parse etmek yerine server-side parse edilir (performans + güvenlik).
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// M3U Parser
interface M3UChannel {
  id: string;
  name: string;
  rawName: string;
  logo: string;
  group: string;
  url: string;
  countryCode?: string;
}

function parseM3U(content: string): M3UChannel[] {
  const lines = content.split('\n');
  const channels: M3UChannel[] = [];
  let currentChannel: Partial<M3UChannel> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#EXTINF:')) {
      const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
      const groupMatch = trimmed.match(/group-title="([^"]+)"/);
      const commaIndex = trimmed.lastIndexOf(',');
      const rawName = commaIndex !== -1 ? trimmed.substring(commaIndex + 1).trim() : '';

      // Ülke kodunu çıkar (TR:, RU:, vb.)
      const countryMatch = rawName.match(/^([A-Z]{2}):\s*/);
      const countryCode = countryMatch ? countryMatch[1] : null;
      const cleanName = countryMatch ? rawName.substring(countryMatch[0].length).trim() : rawName;

      currentChannel = {
        id: crypto.randomUUID(),
        name: cleanName,
        rawName: rawName,
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Genel',
        countryCode: countryCode || undefined,
      };
    } else if (!trimmed.startsWith('#') && currentChannel.name) {
      channels.push({
        ...currentChannel,
        url: trimmed,
      } as M3UChannel);
      currentChannel = {};
    }
  }

  return channels;
}

// Ülke kodu eşleştirme
const countryMap: Record<string, { name: string; flag: string }> = {
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
    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Kullanıcının M3U URL'sini al
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('m3u_url, subscription_expiry, is_banned')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.is_banned) {
      return res.status(403).json({ error: 'Account banned' });
    }

    if (profile.subscription_expiry && new Date(profile.subscription_expiry) < new Date()) {
      return res.status(403).json({ error: 'Subscription expired' });
    }

    if (!profile.m3u_url) {
      return res.status(400).json({ error: 'No IPTV source configured' });
    }

    // Cache kontrolü - son 5 dakika içinde fetch edilmiş mi?
    const cacheKey = `playlist:${user.id}`;
    const { data: cached } = await supabase
      .from('playlist_cache')
      .select('channels, countries, created_at')
      .eq('user_id', user.id)
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .single();

    if (cached) {
      return res.status(200).json({
        channels: cached.channels,
        countries: cached.countries,
        cached: true,
        fetchedAt: cached.created_at,
      });
    }

    // M3U'yu fetch et
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(profile.m3u_url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Flixify/1.0',
          'Accept': '*/*',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      return res.status(502).json({ error: 'Failed to fetch playlist' });
    }

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: 'Playlist unavailable' });
    }

    const content = await response.text();

    if (!content.includes('#EXTM3U')) {
      return res.status(502).json({ error: 'Invalid playlist format' });
    }

    // Parse et
    const channels = parseM3U(content);

    // Ülkeleri çıkar
    const countryCounts = new Map<string, number>();
    channels.forEach(ch => {
      if (ch.countryCode) {
        countryCounts.set(ch.countryCode, (countryCounts.get(ch.countryCode) || 0) + 1);
      }
    });

    const countries = Array.from(countryCounts.entries())
      .map(([code, count]) => ({
        code,
        name: countryMap[code]?.name || code,
        flag: countryMap[code]?.flag || '🏳️',
        channelCount: count,
      }))
      .sort((a, b) => {
        if (a.code === 'TR') return -1;
        if (b.code === 'TR') return 1;
        return b.channelCount - a.channelCount;
      });

    // Cache'e kaydet
    await supabase
      .from('playlist_cache')
      .upsert({
        user_id: user.id,
        channels: channels.slice(0, 500), // Max 500 kanal cache (performans için)
        countries,
        created_at: new Date().toISOString(),
      });

    // Kanalları veritabanına kaydet (stream URL'leri için)
    // Önce eski kanalları sil
    await supabase
      .from('channels')
      .delete()
      .eq('user_id', user.id);

    // Yeni kanalları ekle (batch insert)
    const channelsToInsert = channels.map(ch => ({
      user_id: user.id,
      external_id: ch.id,
      name: ch.name,
      logo_url: ch.logo,
      group_name: ch.group,
      country_code: ch.countryCode,
      stream_url: ch.url,
      is_active: true,
    }));

    // Batch insert (100'erli)
    for (let i = 0; i < channelsToInsert.length; i += 100) {
      const batch = channelsToInsert.slice(i, i + 100);
      await supabase.from('channels').insert(batch);
    }

    return res.status(200).json({
      channels: channels.slice(0, 1000), // Response limit
      countries,
      totalChannels: channels.length,
      cached: false,
      fetchedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[PLAYLIST ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
