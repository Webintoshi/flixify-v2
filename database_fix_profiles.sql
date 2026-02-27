-- ============================================
-- FLIXIFY V2 - PROFILE AUTO-CREATE FIX
-- Bu SQL, auth.users'a kayıt olunduğunda otomatik profiles kaydı oluşturur
-- ============================================

-- 1. Önce profiles tablosunun yapısını doğrula/oluştur
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    account_number TEXT UNIQUE,
    is_admin BOOLEAN DEFAULT false,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    max_concurrent_streams INTEGER DEFAULT 2,
    daily_stream_quota_minutes INTEGER DEFAULT 480,
    subscription_status TEXT DEFAULT 'trial' 
      CHECK (subscription_status IN ('active', 'expired', 'suspended', 'trial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.5 Mevcut tabloya eksik kolonları ekle (eğer yoksa)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_concurrent_streams INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS daily_stream_quota_minutes INTEGER DEFAULT 480,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- subscription_status için CHECK constraint ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_subscription_status_check' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_subscription_status_check 
        CHECK (subscription_status IN ('active', 'expired', 'suspended', 'trial'));
    END IF;
END $$;

-- 2. Profiles tablosu için RLS aktif et
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Mevcut policy'leri temizle ve yeniden oluştur
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;

-- 4. Yeni Policy'ler
-- Herkes profilleri görebilir (gerekli bazı durumlar için)
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

-- Kullanıcılar kendi profillerini güncelleyebilir
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 5. CRITICAL: Auth user oluştuğunda otomatik profil oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, is_admin, subscription_status)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
        'trial'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur (varsa önce sil)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. Admin kullanıcı için is_admin flag'ini ayarla
-- Önce auth.users'dan admin email'ini bul, sonra profiles'ta güncelle
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- auth.users'dan flixify@admin.com kullanıcısını bul
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'flixify@admin.com' 
    LIMIT 1;
    
    -- Eğer bulunduysa, profiles tablosunda is_admin=true yap
    IF admin_user_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET is_admin = true 
        WHERE id = admin_user_id;
        
        -- Eğer profil yoksa oluştur
        IF NOT FOUND THEN
            INSERT INTO public.profiles (id, email, full_name, is_admin, subscription_status)
            SELECT id, email, 'Admin User', true, 'active'
            FROM auth.users 
            WHERE id = admin_user_id;
        END IF;
    END IF;
END $$;

-- 7. Mevcut kullanıcılar için eksik profilleri oluştur
INSERT INTO public.profiles (id, email, full_name, is_admin, subscription_status)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false),
    'trial'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 8. Account number için unique index (eğer varsa)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_account_number 
ON public.profiles(account_number) 
WHERE account_number IS NOT NULL;

-- 9. Admin panel için tüm profilleri çeken fonksiyon
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Sadece admin kullanıcılar çalıştırabilir
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RETURN QUERY SELECT * FROM public.profiles;
    ELSE
        RAISE EXCEPTION 'Yetkisiz erişim: Sadece admin kullanıcılar bu fonksiyonu kullanabilir';
    END IF;
END;
$$;

-- 10. profiles_safe view'ını oluştur (kullanıcıların IPTV bilgilerini görememesi için)
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
SELECT 
    id,
    email,
    full_name,
    avatar_url,
    account_number,
    is_admin,
    subscription_end_date,
    max_concurrent_streams,
    daily_stream_quota_minutes,
    subscription_status,
    created_at,
    updated_at
FROM public.profiles;

-- View için RLS benzeri kısıtlama (isteğe bağlı)
-- Kullanıcılar sadece kendi verilerini görebilir

-- 11. İzinleri ayarla
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles_safe TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;

-- ============================================
-- KURULUM TALİMATLARI:
-- ============================================
-- 1. Supabase Dashboard -> SQL Editor'a git
-- 2. New Query oluştur
-- 3. Bu SQL'i yapıştır ve Run'a tıkla
-- 4. Artık yeni kayıt olan kullanıcılar otomatik profil oluşturacak
-- 5. Admin kullanıcı (flixify@admin.com) admin yetkisine sahip olacak
-- ============================================
