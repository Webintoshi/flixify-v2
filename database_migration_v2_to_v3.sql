-- ============================================
-- FLIXIFY V2 -> V3 MIGRATION SCRIPT
-- Zero-downtime migration with backward compatibility
-- ============================================

-- ============================================
-- PHASE 1: CREATE NEW TABLES (Expand)
-- ============================================
-- Bu phase'de yeni tablolar oluşturulur, eski tablolar çalışmaya devam eder

BEGIN;

-- 1.1 Yeni core tablolar (eğer yoksa)
\i database_schema_complete_v3.sql

-- 1.2 Default plan oluştur (migration için gerekli)
INSERT INTO public.plans (
    name, slug, description, price_monthly, price_yearly, 
    max_concurrent_streams, max_devices, is_active, is_public
) VALUES 
    ('Basic', 'basic', 'Temel IPTV paketi', 49.90, 499.90, 1, 3, true, true),
    ('Standard', 'standard', 'Standart IPTV paketi', 79.90, 799.90, 2, 5, true, true),
    ('Premium', 'premium', 'Premium IPTV paketi', 129.90, 1299.90, 4, 10, true, true)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ============================================
-- PHASE 2: DATA MIGRATION (Background job)
-- ============================================

-- 2.1 Profiles migration
-- Eksik kolonları doldur
UPDATE public.profiles 
SET subscription_plan_id = (
    SELECT id FROM public.plans WHERE slug = 'standard' LIMIT 1
),
    role = CASE 
        WHEN is_admin = true THEN 'admin'::text
        ELSE 'user'::text
    END
WHERE subscription_plan_id IS NULL;

-- 2.2 Channels migration (user-scoped -> global)
-- Her unique external_id için tek global kanal oluştur
INSERT INTO public.channels (
    external_id, name, logo_url, group_name as category_id, 
    country_code, stream_url_encrypted, stream_url_backup_encrypted,
    is_active, health_status
)
SELECT DISTINCT ON (external_id)
    external_id,
    name,
    logo_url,
    group_name,
    country_code,
    pgp_sym_encrypt(stream_url, current_setting('app.encryption_key')::text),
    pgp_sym_encrypt(stream_url_backup, current_setting('app.encryption_key')::text),
    is_active,
    health_status
FROM public.channels_old -- eski tablo adı
WHERE external_id IS NOT NULL
ON CONFLICT (external_id, source_type) DO NOTHING;

-- 2.3 User channel mappings migration
INSERT INTO public.user_channel_mappings (
    user_id, channel_id, is_favorite, custom_name, sort_order
)
SELECT 
    c_old.user_id,
    c_new.id as channel_id,
    false,
    c_old.name,
    0
FROM public.channels_old c_old
JOIN public.channels c_new ON c_old.external_id = c_new.external_id
WHERE c_old.external_id IS NOT NULL
ON CONFLICT (user_id, channel_id) DO NOTHING;

-- 2.4 Stream sessions migration
INSERT INTO public.stream_sessions (
    id, user_id, channel_id, session_token, ip_address, user_agent,
    started_at, last_activity_at, ended_at, expires_at, is_active,
    bytes_transferred, duration_seconds
)
SELECT 
    id, user_id, channel_id, session_token, ip_address, user_agent,
    started_at, last_activity_at, ended_at, expires_at, is_active,
    bytes_transferred, duration_seconds
FROM public.stream_sessions_old
ON CONFLICT (id) DO NOTHING;

-- 2.5 Bunny videos migration
INSERT INTO public.bunny_videos (
    video_id, title, description, thumbnail_url, duration,
    category_id, country_code, status, bunny_library_id, meta_data
)
SELECT 
    video_id, title, description, thumbnail_url, duration,
    category, country, status, bunny_library_id, meta_data
FROM public.bunny_videos_cache_old
ON CONFLICT (video_id) DO NOTHING;

-- ============================================
-- PHASE 3: BACKWARD COMPATIBILITY VIEWS
-- ============================================

-- 3.1 profiles_safe view (eski kod ile uyumlu)
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
SELECT 
    id, email, full_name, avatar_url, account_number,
    is_admin, subscription_ends_at as subscription_end_date, max_concurrent_streams,
    daily_stream_quota_minutes, subscription_status,
    created_at, updated_at
FROM public.profiles
WHERE deleted_at IS NULL;

-- 3.2 Eski tablo isimleri için views (uygulama kodunu değiştirme)
-- Uygulama kodunda eski tablo isimleri kullanılıyorsa, view ile yönlendir

-- bunny_videos_cache -> bunny_videos
DROP VIEW IF EXISTS public.bunny_videos_cache;
CREATE VIEW public.bunny_videos_cache AS SELECT * FROM public.bunny_videos;

-- playlist_cache artık channels + user_channel_mappings üzerinden
-- Eğer eski kod playlist_cache'e başvuruyorsa, bu view ile uyumluluk sağla
DROP VIEW IF EXISTS public.playlist_cache;
CREATE VIEW public.playlist_cache AS
SELECT 
    ucm.user_id,
    jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'name', COALESCE(ucm.custom_name, c.name),
            'logo_url', COALESCE(ucm.custom_logo_url, c.logo_url),
            'category', cat.name,
            'country', c.country_code,
            'is_favorite', ucm.is_favorite,
            'sort_order', ucm.sort_order
        ) ORDER BY ucm.sort_order, c.name
    ) as channels,
    jsonb_build_object(
        'total_channels', COUNT(*),
        'favorite_count', COUNT(*) FILTER (WHERE ucm.is_favorite = true)
    ) as metadata
FROM public.user_channel_mappings ucm
JOIN public.channels c ON ucm.channel_id = c.id
LEFT JOIN public.categories cat ON c.category_id = cat.id
WHERE c.is_active = true AND ucm.is_hidden = false
GROUP BY ucm.user_id;

-- ============================================
-- PHASE 4: CLEANUP (Contract)
-- ============================================
-- Uygulama kodu tamamen yeni tablolara migrate edildikten sonra çalıştır

-- 4.1 Eski tabloları kaldır (UYARI: Bu işlem geri alınamaz!)
-- Önce uygulamanın yeni tabloları kullandığından emin olun!

-- DROP TABLE IF EXISTS public.profiles_ad...; -- Eğer varsa
-- DROP TABLE IF EXISTS public.iptv_credentials; -- Şifrelenmiş hali channels tablosunda
-- DROP TABLE IF EXISTS public.channels_old; -- Veriler global channels tablosuna taşındı
-- DROP TABLE IF EXISTS public.stream_sessions_old;
-- DROP TABLE IF EXISTS public.bunny_videos_cache_old;
-- DROP TABLE IF EXISTS public.playlist_cache_old;
-- DROP TABLE IF EXISTS public.daily_usage; -- Veriler audit_logs ve stream_sessions'dan hesaplanabilir

-- 4.2 Eski views'ları kaldır (uygulama yeni tablo isimlerini kullanıyorsa)
-- DROP VIEW IF EXISTS public.bunny_videos_cache;
-- DROP VIEW IF EXISTS public.playlist_cache;

-- ============================================
-- PHASE 5: POST-MIGRATION VERIFICATION
-- ============================================

-- 5.1 Row count verification
SELECT 
    'profiles' as table_name, COUNT(*) as row_count FROM public.profiles
UNION ALL
SELECT 'channels', COUNT(*) FROM public.channels
UNION ALL
SELECT 'user_channel_mappings', COUNT(*) FROM public.user_channel_mappings
UNION ALL
SELECT 'stream_sessions', COUNT(*) FROM public.stream_sessions
UNION ALL
SELECT 'devices', COUNT(*) FROM public.devices
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM public.subscriptions
UNION ALL
SELECT 'payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM public.audit_logs;

-- 5.2 RLS policy verification
SELECT 
    schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5.3 Index verification
SELECT 
    tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemename = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- ROLLBACK PROCEDURE (gerekirse)
-- ============================================
/*
Eğer bir şeyler ters giderse:

1. Yeni tablolara yazmayı durdur
2. Eski tablolara yazmayı başlat (uygulama kodu rollback)
3. Yeni tabloları DROP et (veri kaybı olur!)
4. Eski yapıya geri dön

NOT: Bu migration'da veri kaybı minimumdur çünkü:
- Eski tablolar silinmeden önce veri kopyalandı
- Views ile backward compatibility sağlandı
*/
