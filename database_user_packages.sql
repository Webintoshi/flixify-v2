-- ============================================
-- Kullanıcı-Paket İlişkisi Tablosu
-- ============================================

-- Kullanıcı-Paket ilişki tablosu
CREATE TABLE IF NOT EXISTS public.user_packages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, package_id)
);

-- RLS aktif et
ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;

-- Kullanıcı sadece kendi paketlerini görebilir
CREATE POLICY "Users can view own packages" 
    ON public.user_packages 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Admin tüm paketleri yönetebilir
CREATE POLICY "Admin can manage all user packages" 
    ON public.user_packages 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_user_packages_user_id ON public.user_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_package_id ON public.user_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_status ON public.user_packages(status);

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_packages_updated_at ON public.user_packages;
CREATE TRIGGER update_user_packages_updated_at
    BEFORE UPDATE ON public.user_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Paket-Kategori İlişkisi (Hangi pakette hangi kategoriler var)
-- ============================================

CREATE TABLE IF NOT EXISTS public.package_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE NOT NULL,
    category_type VARCHAR(20) CHECK (category_type IN ('live', 'vod', 'series')),
    category_id VARCHAR(100) NOT NULL,
    category_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(package_id, category_type, category_id)
);

ALTER TABLE public.package_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package categories" 
    ON public.package_categories 
    FOR SELECT 
    TO authenticated, anon
    USING (true);

CREATE POLICY "Admin can manage package categories" 
    ON public.package_categories 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE INDEX IF NOT EXISTS idx_package_categories_package_id ON public.package_categories(package_id);
CREATE INDEX IF NOT EXISTS idx_package_categories_type ON public.package_categories(category_type);

-- ============================================
-- Kullanıcının Aktif Paketlerini Getiren Fonksiyon
-- ============================================

CREATE OR REPLACE FUNCTION get_user_active_packages(p_user_id uuid)
RETURNS TABLE (
    package_id uuid,
    package_name VARCHAR,
    status VARCHAR,
    end_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as package_id,
        p.name as package_name,
        up.status,
        up.end_date
    FROM public.user_packages up
    JOIN public.packages p ON up.package_id = p.id
    WHERE up.user_id = p_user_id
    AND up.status = 'active'
    AND (up.end_date IS NULL OR up.end_date > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Kullanıcının Erişebildiği Kategorileri Getiren Fonksiyon
-- ============================================

CREATE OR REPLACE FUNCTION get_user_categories(p_user_id uuid, p_category_type VARCHAR)
RETURNS TABLE (
    category_id VARCHAR,
    category_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        pc.category_id,
        pc.category_name
    FROM public.package_categories pc
    INNER JOIN public.user_packages up ON pc.package_id = up.package_id
    WHERE up.user_id = p_user_id
    AND up.status = 'active'
    AND (up.end_date IS NULL OR up.end_date > now())
    AND pc.category_type = p_category_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
