-- ============================================
-- BUNNY CDN / STREAM SCHEMA
-- Video hosting ve CDN entegrasyonu için tablolar
-- ============================================

-- 1. BUNNY VIDEOS CACHE TABLE
-- Bunny Stream API'den çekilen video listesi cache'i
CREATE TABLE IF NOT EXISTS public.bunny_videos_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT UNIQUE NOT NULL, -- Bunny video GUID
    
    -- Video Metadata
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration INTEGER DEFAULT 0, -- saniye
    
    -- Categorization
    category TEXT,
    country TEXT DEFAULT 'TR',
    tags TEXT[] DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'available' 
      CHECK (status IN ('processing', 'available', 'failed')),
    
    -- Cache timestamp
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Bunny specific
    bunny_library_id TEXT,
    meta_data JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bunny_videos_category ON public.bunny_videos_cache(category);
CREATE INDEX IF NOT EXISTS idx_bunny_videos_country ON public.bunny_videos_cache(country);
CREATE INDEX IF NOT EXISTS idx_bunny_videos_status ON public.bunny_videos_cache(status);
CREATE INDEX IF NOT EXISTS idx_bunny_videos_updated ON public.bunny_videos_cache(updated_at);

-- 2. BUNNY ACCESS LOGS TABLE
-- Video erişim logları (analytics için)
CREATE TABLE IF NOT EXISTS public.bunny_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    
    -- Access Data
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    
    -- Stream Quality
    quality TEXT DEFAULT '1080p',
    
    -- Usage (opsiyonel)
    watch_duration_seconds INTEGER DEFAULT 0,
    bytes_transferred BIGINT DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bunny_logs_user ON public.bunny_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bunny_logs_video ON public.bunny_access_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_bunny_logs_accessed ON public.bunny_access_logs(accessed_at);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES

-- Bunny videos cache: Herkes okuyabilir (public content)
ALTER TABLE public.bunny_videos_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bunny videos are viewable by everyone" 
ON public.bunny_videos_cache FOR SELECT 
USING (true);

-- Sadece adminler yazabilir
CREATE POLICY "Only admins can modify bunny videos" 
ON public.bunny_videos_cache FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Access logs: Kullanıcılar sadece kendi loglarını görebilir
ALTER TABLE public.bunny_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access logs" 
ON public.bunny_access_logs FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own access logs" 
ON public.bunny_access_logs FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 4. FUNCTIONS

-- Video cache'i güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_bunny_video_cache(
    p_video_id TEXT,
    p_title TEXT,
    p_description TEXT,
    p_thumbnail_url TEXT,
    p_duration INTEGER,
    p_category TEXT DEFAULT NULL,
    p_country TEXT DEFAULT 'TR'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.bunny_videos_cache (
        video_id, title, description, thumbnail_url, 
        duration, category, country, updated_at
    ) VALUES (
        p_video_id, p_title, p_description, p_thumbnail_url,
        p_duration, p_category, p_country, now()
    )
    ON CONFLICT (video_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        thumbnail_url = EXCLUDED.thumbnail_url,
        duration = EXCLUDED.duration,
        category = EXCLUDED.category,
        country = EXCLUDED.country,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının izleme istatistiklerini getir
CREATE OR REPLACE FUNCTION get_user_watch_stats(p_user_id UUID)
RETURNS TABLE (
    total_videos BIGINT,
    total_watch_time INTEGER,
    favorite_category TEXT,
    last_7_days_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT video_id)::BIGINT as total_videos,
        COALESCE(SUM(watch_duration_seconds), 0)::INTEGER as total_watch_time,
        (
            SELECT category FROM public.bunny_access_logs l
            JOIN public.bunny_videos_cache v ON l.video_id = v.video_id
            WHERE l.user_id = p_user_id
            GROUP BY category
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as favorite_category,
        (
            SELECT COUNT(*) FROM public.bunny_access_logs
            WHERE user_id = p_user_id
            AND accessed_at > now() - interval '7 days'
        )::BIGINT as last_7_days_count
    FROM public.bunny_access_logs
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
