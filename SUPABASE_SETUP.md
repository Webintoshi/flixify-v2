# Supabase Setup Guide - Flixify V2

## 1. Service Role Key Alma

Supabase Dashboard'a git:
```
https://supabase.com/dashboard/project/sdsvnkvmfhaubgcahvzv/settings/api
```

**Project API Keys** bölümünden **service_role** key'i kopyala.

⚠️ **ÖNEMLİ:** Bu key çok güçlüdür, asla client-side kodda kullanma!

## 2. Environment Variables Ayarlama

`.env` dosyasını proje root'una oluştur:

```env
# Client-side (Public)
VITE_SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3Zua3ZtZmhhdWJnY2Fodnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTM1NDgsImV4cCI6MjA4NzM4OTU0OH0.KslfPrwrIhDBlshOG5_KVvTaOEKYw4vuoJ0VBUx01HQ
VITE_API_URL=/api

# Server-side (Private)
SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
SUPABASE_SERVICE_KEY=service_role_key_buraya_yapistir
```

## 3. Database Schema Kurulumu

Supabase Dashboard > SQL Editor'a git ve `database_schema_v2.sql` dosyasının tamamını çalıştır.

```sql
-- Zaten database_schema_v2.sql dosyasında mevcut
```

## 4. Test Sorguları

Kurulum sonrası çalıştırılacak test sorguları:

```sql
-- Test 1: Tablolar oluşmuş mu?
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('channels', 'stream_sessions', 'playlist_cache', 'daily_usage');

-- Test 2: RLS aktif mi?
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('channels', 'stream_sessions', 'playlist_cache');

-- Test 3: Trigger'lar oluşmuş mu?
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

## 5. Örnek Veri Ekleme (Opsiyonel)

```sql
-- Test kullanıcısı için max_concurrent_streams ayarla
UPDATE public.profiles 
SET max_concurrent_streams = 2 
WHERE id = 'test-user-id';
```

## 6. Deploy Öncesi Kontrol Listesi

- [ ] Service role key alındı
- [ ] `.env` dosyası oluşturuldu
- [ ] Database schema uygulandı
- [ ] RLS politikaları aktif
- [ ] Trigger'lar çalışıyor
- [ ] Test sorguları başarılı

## Troubleshooting

### Hata: "relation 'channels' does not exist"
**Çözüm:** Schema henüz uygulanmamış. SQL Editor'dan `database_schema_v2.sql` çalıştır.

### Hata: "permission denied for table channels"
**Çözüm:** RLS politikaları aktif değil. Schema'yı tekrar çalıştır.

### Hata: "Failed to fetch playlist"
**Çözüm:** 
1. Kullanıcının `m3u_url` alanı dolu mu kontrol et
2. Supabase Auth token geçerli mi kontrol et
