-- ============================================
-- FLIXIFY V3 - SCHEMA DOGRULAMA
-- Kurulum sonrası çalıştırılabilir
-- ============================================

-- ============================================
-- 1. TABLO KONTROLU
-- ============================================
SELECT 'TABLO KONTROLU' as check_type;

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
        ) THEN '✅'
        ELSE '❌'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. RLS POLICY KONTROLU
-- ============================================
SELECT 'RLS POLICY KONTROLU' as check_type;

SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 3. INDEX KONTROLU
-- ============================================
SELECT 'INDEX KONTROLU' as check_type;

SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemename = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. FOREIGN KEY KONTROLU
-- ============================================
SELECT 'FOREIGN KEY KONTROLU' as check_type;

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================
-- 5. TRIGGER KONTROLU
-- ============================================
SELECT 'TRIGGER KONTROLU' as check_type;

SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 6. DEFAULT DATA KONTROLU
-- ============================================
SELECT 'DEFAULT DATA KONTROLU' as check_type;

SELECT 'Plans' as data_type, COUNT(*) as count FROM public.plans
UNION ALL
SELECT 'Categories', COUNT(*) FROM public.categories
UNION ALL
SELECT 'System Settings', COUNT(*) FROM public.system_settings;

-- ============================================
-- 7. VIEW KONTROLU
-- ============================================
SELECT 'VIEW KONTROLU' as check_type;

SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 8. ESKI TABLO KONTROLU (Temizlenmiş mi?)
-- ============================================
SELECT 'ESKI TABLO KONTROLU (Bunlar GORUNMEMELI)' as check_type;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (table_name LIKE 'profiles_ad%' 
     OR table_name LIKE 'profile_ad%'
     OR table_name = 'iptv_credentials'
     OR table_name = 'daily_usage'
     OR table_name LIKE '%_old');

-- ============================================
-- SONUC
-- ============================================
SELECT 'Kontroller tamamlandı!' as sonuc;
