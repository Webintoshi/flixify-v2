-- ============================================
-- FLIXIFY V2 - DATABASE SCHEMA
-- IPTV Platform Optimized
-- ============================================

-- 1. PROFILES TABLE (Güncellenmiş)
-- Mevcut profiles tablosuna yeni kolonlar eklenir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS max_concurrent_streams INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS daily_stream_quota_minutes INTEGER DEFAULT 480,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' 
  CHECK (subscription_status IN ('active', 'expired', 'suspended', 'trial')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. CHANNELS TABLE (Yeni)
-- Her kullanıcının kanalları (M3U parse sonrası)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Channel Metadata
    external_id TEXT, -- M3U'daki ID
    name TEXT NOT NULL,
    logo_url TEXT,
    group_name TEXT DEFAULT 'Genel',
    country_code TEXT,
    
    -- Stream URLs (Asla client'a gönderilmez!)
    stream_url TEXT NOT NULL,
    stream_url_backup TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    health_status TEXT DEFAULT 'unknown' 
      CHECK (health_status IN ('online', 'offline', 'unknown')),
    last_checked_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Index
    CONSTRAINT unique_channel_per_user UNIQUE (user_id, external_id)
);

-- Indexes for channels
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON public.channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_group ON public.channels(group_name);
CREATE INDEX IF NOT EXISTS idx_channels_country ON public.channels(country_code);
CREATE INDEX IF NOT EXISTS idx_channels_active ON public.channels(user_id, is_active);

-- 3. STREAM SESSIONS TABLE (Yeni)
-- Aktif stream'leri takip etmek için
CREATE TABLE IF NOT EXISTS public.stream_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    
    -- Session Data
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Usage Stats (Opsiyonel analytics)
    bytes_transferred BIGINT DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.stream_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.stream_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.stream_sessions(user_id, is_active) 
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.stream_sessions(expires_at);

-- 4. PLAYLIST CACHE TABLE (Yeni)
-- Parse edilmiş playlist cache'i
CREATE TABLE IF NOT EXISTS public.playlist_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Cached Data (JSONB)
    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    countries JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_cache_user ON public.playlist_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_cache_created ON public.playlist_cache(created_at);

-- 5. DAILY USAGE TABLE (Yeni)
-- Günlük kullanım istatistikleri
CREATE TABLE IF NOT EXISTS public.daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    stream_count INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    bytes_transferred BIGINT DEFAULT 0,
    
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_user ON public.daily_usage(user_id, date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Channels table RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_channels_isolation ON public.channels;
CREATE POLICY user_channels_isolation ON public.channels
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Stream sessions RLS
ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_sessions_isolation ON public.stream_sessions;
CREATE POLICY user_sessions_isolation ON public.stream_sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Playlist cache RLS
ALTER TABLE public.playlist_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_cache_isolation ON public.playlist_cache;
CREATE POLICY user_cache_isolation ON public.playlist_cache
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Daily usage RLS
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_usage_isolation ON public.daily_usage;
CREATE POLICY user_usage_isolation ON public.daily_usage
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Concurrent stream limit enforcement
CREATE OR REPLACE FUNCTION check_concurrent_streams()
RETURNS TRIGGER AS $$
DECLARE
    current_streams INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Max concurrent streams limitini al
    SELECT max_concurrent_streams INTO max_allowed
    FROM public.profiles 
    WHERE id = NEW.user_id;
    
    max_allowed := COALESCE(max_allowed, 2);
    
    -- Aktif stream sayısını hesapla
    SELECT COUNT(*) INTO current_streams
    FROM public.stream_sessions
    WHERE user_id = NEW.user_id 
      AND is_active = true 
      AND expires_at > now();
    
    -- Limit aşılmış mı kontrol et
    IF current_streams >= max_allowed THEN
        -- En eski stream'i sonlandır
        UPDATE public.stream_sessions
        SET is_active = false, 
            ended_at = now()
        WHERE id = (
            SELECT id 
            FROM public.stream_sessions 
            WHERE user_id = NEW.user_id 
              AND is_active = true
            ORDER BY started_at ASC 
            LIMIT 1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Yeni stream session oluşturulmadan önce limit kontrolü
DROP TRIGGER IF EXISTS enforce_stream_limit ON public.stream_sessions;
CREATE TRIGGER enforce_stream_limit
    BEFORE INSERT ON public.stream_sessions
    FOR EACH ROW 
    EXECUTE FUNCTION check_concurrent_streams();

-- Function: Usage statistics update
CREATE OR REPLACE FUNCTION update_stream_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        -- Stream sonlandığında istatistikleri güncelle
        INSERT INTO public.daily_usage (user_id, date, stream_count, total_minutes)
        VALUES (
            NEW.user_id,
            CURRENT_DATE,
            1,
            EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60
        )
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            stream_count = daily_usage.stream_count + 1,
            total_minutes = daily_usage.total_minutes + EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Stream sonlandığında istatistikleri güncelle
DROP TRIGGER IF EXISTS update_stats_on_stream_end ON public.stream_sessions;
CREATE TRIGGER update_stats_on_stream_end
    AFTER UPDATE ON public.stream_sessions
    FOR EACH ROW
    WHEN (NEW.ended_at IS DISTINCT FROM OLD.ended_at)
    EXECUTE FUNCTION update_stream_stats();

-- Function: Expired sessions cleanup (cron job ile çalıştırılabilir)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE public.stream_sessions
    SET is_active = false,
        ended_at = now()
    WHERE is_active = true 
      AND expires_at < now();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- Active streams view (admin için)
CREATE OR REPLACE VIEW public.active_streams AS
SELECT 
    ss.id,
    ss.user_id,
    p.account_number,
    ss.channel_id,
    c.name as channel_name,
    ss.started_at,
    ss.expires_at,
    ss.ip_address,
    EXTRACT(EPOCH FROM (now() - ss.started_at))/60 as duration_minutes
FROM public.stream_sessions ss
JOIN public.profiles p ON ss.user_id = p.id
JOIN public.channels c ON ss.channel_id = c.id
WHERE ss.is_active = true 
  AND ss.expires_at > now();

-- Daily stats view (admin için)
CREATE OR REPLACE VIEW public.daily_stats AS
SELECT 
    date,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(stream_count) as total_streams,
    SUM(total_minutes) as total_minutes,
    ROUND(AVG(total_minutes), 2) as avg_minutes_per_user
FROM public.daily_usage
GROUP BY date
ORDER BY date DESC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.channels IS 'Kullanıcı başına parse edilmiş IPTV kanalları';
COMMENT ON TABLE public.stream_sessions IS 'Aktif stream sessionları (concurrent limit için)';
COMMENT ON TABLE public.playlist_cache IS 'Parse edilmiş playlist cache (5 dakika TTL)';
COMMENT ON TABLE public.daily_usage IS 'Günlük kullanım istatistikleri';

COMMENT ON COLUMN public.profiles.max_concurrent_streams IS 'Aynı anda izlenebilir maksimum ekran sayısı (default: 2)';
COMMENT ON COLUMN public.channels.stream_url IS 'Asla client tarafına gönderilmemeli!';
