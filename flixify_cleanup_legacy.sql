-- ============================================
-- FLIXIFY V3 - LEGACY TABLO TEMIZLEME
-- DİKKAT: Bu script GERİ ALINAMAZ işlemler içerir!
-- ============================================

-- Önce yedekleme schema'sı oluştur (güvenlik için)
CREATE SCHEMA IF NOT EXISTS legacy_backup;

-- ============================================
-- 1. YEDEKLEME (İsteğe bağlı ama önerilir)
-- ============================================

-- Eski tabloları yedekle (eğer varsa)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- profiles_ad... benzeri tabloları bul ve yedekle
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'profiles_ad%'
    LOOP
        EXECUTE format('CREATE TABLE IF NOT EXISTS legacy_backup.%I AS SELECT * FROM public.%I', r.table_name, r.table_name);
        RAISE NOTICE 'Yedeklendi: %', r.table_name;
    END LOOP;
END $$;

-- Diğer kritik tabloları yedekle
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'iptv_credentials') THEN
        CREATE TABLE IF NOT EXISTS legacy_backup.iptv_credentials AS SELECT * FROM public.iptv_credentials;
        RAISE NOTICE 'Yedeklendi: iptv_credentials';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_usage') THEN
        CREATE TABLE IF NOT EXISTS legacy_backup.daily_usage AS SELECT * FROM public.daily_usage;
        RAISE NOTICE 'Yedeklendi: daily_usage';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'playlist_cache') THEN
        CREATE TABLE IF NOT EXISTS legacy_backup.playlist_cache AS SELECT * FROM public.playlist_cache;
        RAISE NOTICE 'Yedeklendi: playlist_cache';
    END IF;
END $$;

-- ============================================
-- 2. VIEWS TEMIZLEME (Önce views'ları kaldır)
-- ============================================

DROP VIEW IF EXISTS public.playlist_cache;
DROP VIEW IF EXISTS public.bunny_videos_cache;

-- ============================================
-- 3. ESKI TABLOLARI KALDIRMA
-- ============================================

-- 3.1 profiles_ad... tablolarını kaldır
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE 'profiles_ad%' OR table_name LIKE 'profile_ad%')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.table_name);
        RAISE NOTICE 'Silindi: %', r.table_name;
    END LOOP;
END $$;

-- 3.2 iptv_credentials tablosunu kaldır (artık channels'de şifreli)
DROP TABLE IF EXISTS public.iptv_credentials CASCADE;

-- 3.3 Eski versiyon tablolarını kaldır (_old suffix'li)
DROP TABLE IF EXISTS public.channels_old CASCADE;
DROP TABLE IF EXISTS public.stream_sessions_old CASCADE;
DROP TABLE IF EXISTS public.profiles_old CASCADE;
DROP TABLE IF EXISTS public.bunny_videos_cache_old CASCADE;
DROP TABLE IF EXISTS public.playlist_cache_old CASCADE;

-- 3.4 daily_usage tablosunu kaldır (artık audit_logs'dan hesaplanıyor)
DROP TABLE IF EXISTS public.daily_usage CASCADE;

-- 3.5 Eski fonksiyonları kaldır
DROP FUNCTION IF EXISTS public.get_all_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_watch_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_bunny_video_cache(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE;

-- ============================================
-- 4. DOGRULAMA
-- ============================================

-- Kalan tabloları listele
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'profiles', 'channels', 'categories', 'epg_data',
            'user_channel_mappings', 'devices', 'stream_sessions',
            'plans', 'subscriptions', 'payments',
            'watch_history', 'ratings',
            'bunny_videos', 'cdn_access_logs',
            'audit_logs', 'notifications', 'system_settings'
        ) THEN '✅ BEKLENEN (KORUNDU)'
        ELSE '⚠️ KONTROL EDILMELI'
    END as durum
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY durum, table_name;

-- ============================================
-- 5. SON TEMIZLIK (1 hafta sonra çalıştırılabilir)
-- ============================================
-- Her şey yolundaysa yedekleri de sil:
-- DROP SCHEMA IF EXISTS legacy_backup CASCADE;

SELECT 'Eski tablolar temizlendi!' as sonuc;
