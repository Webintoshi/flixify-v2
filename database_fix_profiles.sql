-- ============================================
-- Eksik Profilleri Oluşturma
-- ============================================

-- Auth users'dan profiles tablosuna eksik kullanıcıları ekle
INSERT INTO public.profiles (id, account_number, email, role, subscription_status, created_at)
SELECT 
    au.id,
    COALESCE(p.account_number, '53' || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0')),
    COALESCE(p.email, au.email),
    COALESCE(p.role, 'user'),
    COALESCE(p.subscription_status, 'none'),
    COALESCE(p.created_at, au.created_at)
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- ============================================
-- Trigger: Yeni kullanıcı otomatik profile ekleme
-- ============================================

-- Önce fonksiyon oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, account_number, email, role, subscription_status, created_at)
    VALUES (
        NEW.id,
        '53' || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0'),
        NEW.email,
        'user',
        'none',
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı kaldır (varsa) ve yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS Policy Güncelleme (profiles tablosu)
-- ============================================

-- Admin tüm profilleri görebilir
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Kullanıcı sadece kendi profilini görebilir
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);
