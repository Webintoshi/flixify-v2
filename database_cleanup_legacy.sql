-- ============================================
-- FLIXIFY V3 - LEGACY CLEANUP SCRIPT
-- ⚠️ DİKKAT: Bu script GERİ ALINAMAZ işlemler içerir!
-- ============================================

-- Önkoşullar (çalıştırmadan önce kontrol et):
-- [ ] Uygulama yeni tablo isimlerini kullanıyor
-- [ ] Eski tablolara yazma işlemi durduruldu
-- [ ] Yeni tablolar stabil çalışıyor
-- [ ] Backup alındı
-- [ ] Maintenance mode aktif (opsiyonel)

-- ============================================
-- STEP 1: Legacy Tabloları Tespit Et
-- ============================================

-- Mevcut tabloları listele
SELECT 
    table_name,
    CASE 
        WHEN table_name LIKE 'profiles_%' AND table_name != 'profiles' THEN 'LEGACY - SİLİNECEK'
        WHEN table_name = 'iptv_credentials' THEN 'LEGACY - SİLİNECEK (encryption taşındı)'
        WHEN table_name LIKE '%_old' THEN 'LEGACY - SİLİNECEK'
        WHEN table_name = 'daily_usage' THEN 'LEGACY - SİLİNECEK (audit_logs''dan hesaplanıyor)'
        WHEN table_name IN ('channels', 'stream_sessions', 'profiles') THEN 'AKTİF - KORUNACAK'
        ELSE 'İNCELE - Manuel kontrol gerekli'
    END as action
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY action, table_name;

-- ============================================
-- STEP 2: Foreign Key Dependencies Kontrolü
-- ============================================

-- Hangi tablolar başka tablolara referans ediliyor?
SELECT 
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY referenced_table, referencing_table;

-- ============================================
-- STEP 3: Legacy Tabloları Yedekle (Opsiyonel)
-- ============================================

-- Eski tabloları backup schema'ya kopyala
CREATE SCHEMA IF NOT EXISTS legacy_backup;

-- profiles_ad... (eğer varsa)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'profiles_ad%'
    ) THEN
        EXECUTE format('CREATE TABLE legacy_backup.%I AS SELECT * FROM public.%I', 
            (SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name LIKE 'profiles_ad%' LIMIT 1),
            (SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name LIKE 'profiles_ad%' LIMIT 1));
    END IF;
END $$;

-- iptv_credentials
CREATE TABLE IF NOT EXISTS legacy_backup.iptv_credentials AS 
SELECT * FROM public.iptv_credentials WHERE 1=0; -- Structure only (sensitive data)

-- daily_usage
CREATE TABLE IF NOT EXISTS legacy_backup.daily_usage AS 
SELECT * FROM public.daily_usage;

-- ============================================
-- STEP 4: Silinecek Tabloları Kaldır
-- ============================================

-- 4.1 profiles_ad... tablosu (eğer varsa ve profiles ile merge edildiyse)
DO $$
DECLARE
    table_name_var text;
BEGIN
    FOR table_name_var IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'profiles_ad%'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', table_name_var);
        RAISE NOTICE 'Dropped table: %', table_name_var;
    END LOOP;
END $$;

-- 4.2 iptv_credentials (artık channels tablosunda encrypted)
-- Önce FK dependencies'leri kaldır
ALTER TABLE IF EXISTS public.iptv_credentials DROP CONSTRAINT IF EXISTS iptv_credentials_user_id_fkey;
-- Tabloyu sil
DROP TABLE IF EXISTS public.iptv_credentials CASCADE;

-- 4.3 Eski channels tablosu (eğer _old suffix'li kopya varsa)
DROP TABLE IF EXISTS public.channels_old CASCADE;

-- 4.4 Eski stream_sessions tablosu
DROP TABLE IF EXISTS public.stream_sessions_old CASCADE;

-- 4.5 Eski bunny_videos_cache tablosu
DROP TABLE IF EXISTS public.bunny_videos_cache_old CASCADE;

-- 4.6 Eski playlist_cache tablosu
DROP TABLE IF EXISTS public.playlist_cache_old CASCADE;

-- 4.7 daily_usage (artık audit_logs + materialized view ile değiştirildi)
DROP TABLE IF EXISTS public.daily_usage CASCADE;

-- 4.8 profiles_safe view (artık gerekli değil, direkt profiles kullanılıyor)
-- Uygulama hala kullanıyorsa silme, yoksa:
-- DROP VIEW IF EXISTS public.profiles_safe;

-- ============================================
-- STEP 5: Cleanup Verification
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
        ) THEN '✅ EXPECTED'
        ELSE '⚠️ UNEXPECTED - Review needed'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY status, table_name;

-- Kalan view'ları listele
SELECT table_name, view_definition 
FROM information_schema.views 
WHERE table_schema = 'public';

-- ============================================
-- STEP 6: Post-Cleanup Optimization
-- ============================================

-- Vacuum analyze (performans için)
VACUUM ANALYZE public.profiles;
VACUUM ANALYZE public.channels;
VACUUM ANALYZE public.stream_sessions;
VACUUM ANALYZE public.audit_logs;

-- Index rebuild (opsiyonel, bloat varsa)
-- REINDEX TABLE CONCURRENTLY public.profiles;
-- REINDEX TABLE CONCURRENTLY public.channels;

-- ============================================
-- ROLLBACK (Eğer yedekten geri yükleme gerekirse)
-- ============================================
/*

Eğer bir şeyler ters giderse ve yedekten geri yüklemen gerekirse:

1. Uygulamayı maintenance mode'a al
2. Yeni tablolara yazmayı durdur
3. Legacy tabloları restore et:

   -- profiles_ad... restore
   CREATE TABLE public.profiles_ad LIKE legacy_backup.profiles_ad;
   INSERT INTO public.profiles_ad SELECT * FROM legacy_backup.profiles_ad;
   
   -- iptv_credentials restore
   CREATE TABLE public.iptv_credentials (...); -- structure
   -- Verileri manuel geri yükle

4. Uygulamayı eski versiyona rollback yap
5. Maintenance mode'u kapat

*/

-- ============================================
-- LEGACY_BACKUP SCHEMA CLEANUP (1 hafta sonra)
-- ============================================
-- Her şey yolundaysa, legacy backup'i de temizle:
-- DROP SCHEMA IF EXISTS legacy_backup CASCADE;
