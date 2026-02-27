-- ============================================
-- FLIXIFY V3 - COMPLETE DATABASE SCHEMA
-- Tek dosya - direkt çalıştırılabilir
-- Sıralama: Tablolar -> Indexler -> RLS -> Functions -> Triggers
-- ============================================

-- ============================================
-- 1. TABLES (Önce bağımsız tablolar, sonra FK'li olanlar)
-- ============================================

-- 1.1 System Settings (Bağımsız)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.2 Categories (Bağımsız - kendi içinde hiyerarşi var)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.3 Plans (Bağımsız)
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency CHAR(3) DEFAULT 'TRY',
    max_concurrent_streams INTEGER DEFAULT 2,
    max_devices INTEGER DEFAULT 5,
    includes_premium_channels BOOLEAN DEFAULT false,
    includes_vod BOOLEAN DEFAULT true,
    includes_catchup BOOLEAN DEFAULT false,
    daily_stream_quota_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.4 Channels (categories'e bağımlı)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    source_type TEXT DEFAULT 'm3u' CHECK (source_type IN ('m3u', 'manual', 'api')),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    country_code CHAR(2) DEFAULT 'TR',
    language_code CHAR(2) DEFAULT 'tr',
    tags TEXT[] DEFAULT '{}',
    stream_url_encrypted TEXT NOT NULL DEFAULT 'encrypted',
    stream_url_backup_encrypted TEXT,
    stream_format TEXT DEFAULT 'hls' CHECK (stream_format IN ('hls', 'dash', 'smooth', 'rtmp')),
    resolution TEXT DEFAULT '1080p' CHECK (resolution IN ('480p', '720p', '1080p', '4k')),
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,
    health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('online', 'offline', 'degraded', 'unknown')),
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    health_check_fail_count INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    total_watch_time_minutes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_channel_external UNIQUE (external_id, source_type)
);

-- 1.5 Bunny Videos (categories'e bağımlı)
CREATE TABLE IF NOT EXISTS public.bunny_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    poster_url TEXT,
    duration INTEGER DEFAULT 0,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    country_code CHAR(2) DEFAULT 'TR',
    language_code CHAR(2) DEFAULT 'tr',
    tags TEXT[] DEFAULT '{}',
    genre TEXT[],
    is_premium BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    requires_age_verification BOOLEAN DEFAULT false,
    min_age INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing' CHECK (status IN ('uploading', 'processing', 'available', 'failed', 'deleted')),
    bunny_library_id TEXT DEFAULT '',
    bunny_collection_id TEXT,
    meta_data JSONB DEFAULT '{}'::jsonb,
    view_count BIGINT DEFAULT 0,
    total_watch_time_minutes BIGINT DEFAULT 0,
    average_rating DECIMAL(2,1),
    uploaded_at TIMESTAMP WITH TIME ZONE,
    available_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.6 Profiles (plans'a bağımlı)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    account_number TEXT UNIQUE,
    account_type TEXT DEFAULT 'standard' CHECK (account_type IN ('standard', 'premium', 'enterprise')),
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'superadmin')),
    is_admin BOOLEAN GENERATED ALWAYS AS (role IN ('admin', 'superadmin')) STORED,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'suspended', 'cancelled')),
    subscription_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    max_concurrent_streams INTEGER DEFAULT 2 CHECK (max_concurrent_streams > 0 AND max_concurrent_streams <= 10),
    max_devices INTEGER DEFAULT 5 CHECK (max_devices > 0 AND max_devices <= 20),
    daily_stream_quota_minutes INTEGER DEFAULT 480,
    preferences JSONB DEFAULT '{"language": "tr", "timezone": "Europe/Istanbul", "notifications": {"email": true, "push": true, "sms": false}, "video_quality": "auto", "autoplay": true, "subtitle_enabled": true}'::jsonb,
    mfa_enabled BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 1.7 User Channel Mappings (profiles ve channels'e bağımlı)
CREATE TABLE IF NOT EXISTS public.user_channel_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT false,
    custom_name TEXT,
    custom_logo_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, channel_id)
);

-- 1.8 EPG Data (channels'e bağımlı)
CREATE TABLE IF NOT EXISTS public.epg_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    episode_title TEXT,
    season_number INTEGER,
    episode_number INTEGER,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (CASE WHEN end_time > start_time THEN EXTRACT(EPOCH FROM (end_time - start_time))/60 ELSE 0 END) STORED,
    genre TEXT,
    rating TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT valid_epg_time CHECK (end_time > start_time)
);

-- 1.9 Devices (profiles'a bağımlı)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android', 'android_tv', 'apple_tv', 'smart_tv', 'roku', 'fire_tv')),
    device_name TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    is_trusted BOOLEAN DEFAULT false,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, device_id)
);

-- 1.10 Subscriptions (profiles ve plans'e bağımlı)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused', 'expired')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    provider TEXT DEFAULT 'stripe' CHECK (provider IN ('stripe', 'paypal', 'iyzico', 'manual')),
    provider_subscription_id TEXT,
    billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
    cancel_at_period_end BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.11 Payments (profiles ve subscriptions'a bağımlı)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'TRY',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')),
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'iyzico', 'manual')),
    provider_payment_id TEXT NOT NULL,
    provider_invoice_id TEXT,
    description TEXT,
    invoice_url TEXT,
    receipt_url TEXT,
    failure_reason TEXT,
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.12 Stream Sessions (profiles, devices, channels'e bağımlı)
CREATE TABLE IF NOT EXISTS public.stream_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
    video_id UUID,
    session_token TEXT UNIQUE NOT NULL,
    session_type TEXT DEFAULT 'live' CHECK (session_type IN ('live', 'vod', 'catchup')),
    ip_address INET,
    user_agent TEXT,
    geo_country CHAR(2),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    ended_reason TEXT CHECK (ended_reason IN ('user_action', 'timeout', 'limit_reached', 'error', 'admin_action', 'concurrent_limit')),
    bytes_transferred BIGINT DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    buffer_events INTEGER DEFAULT 0,
    quality_switches INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.13 Watch History (profiles ve devices'e bağımlı)
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('vod', 'live', 'catchup')),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    progress_percent INTEGER GENERATED ALWAYS AS (CASE WHEN duration_seconds > 0 THEN LEAST(100, (watched_seconds * 100 / duration_seconds)) ELSE 0 END) STORED,
    is_completed BOOLEAN GENERATED ALWAYS AS (watched_seconds >= duration_seconds * 0.9) STORED,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, video_id, content_type)
);

-- 1.14 Ratings (profiles'a bağımlı)
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, video_id)
);

-- 1.15 CDN Access Logs (profiles ve devices'e bağımlı)
CREATE TABLE IF NOT EXISTS public.cdn_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT,
    channel_id UUID,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    country_code CHAR(2),
    content_type TEXT CHECK (content_type IN ('vod', 'live')),
    quality TEXT DEFAULT '1080p',
    format TEXT DEFAULT 'hls',
    watch_duration_seconds INTEGER DEFAULT 0,
    bytes_transferred BIGINT DEFAULT 0,
    buffer_events INTEGER DEFAULT 0,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    device_type TEXT
);

-- 1.16 Audit Logs (profiles'a bağımlı)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL CHECK (action IN ('login', 'logout', 'password_change', 'profile_update', 'subscription_created', 'subscription_cancelled', 'payment_completed', 'stream_started', 'stream_ended', 'device_added', 'device_removed', 'settings_changed', 'content_accessed', 'admin_action')),
    resource_type TEXT,
    resource_id TEXT,
    ip_address INET,
    user_agent TEXT,
    geo_country CHAR(2),
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.17 Notifications (profiles'a bağımlı)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('system', 'subscription', 'payment', 'content', 'security')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    sent_via TEXT[] DEFAULT '{}',
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_account_number ON public.profiles(account_number) WHERE account_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_status, subscription_ends_at) WHERE subscription_status IN ('trial', 'active');
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role IN ('admin', 'superadmin', 'moderator');
CREATE INDEX IF NOT EXISTS idx_profiles_created ON public.profiles(created_at DESC);

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_category ON public.channels(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_channels_country ON public.channels(country_code, language_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_channels_health ON public.channels(health_status, last_health_check_at);
CREATE INDEX IF NOT EXISTS idx_channels_premium ON public.channels(is_premium) WHERE is_premium = true;

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active, sort_order);

-- EPG indexes
CREATE INDEX IF NOT EXISTS idx_epg_channel_time ON public.epg_data(channel_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_epg_current ON public.epg_data(start_time, end_time);

-- User channel mappings indexes
CREATE INDEX IF NOT EXISTS idx_user_channels_user ON public.user_channel_mappings(user_id, is_hidden, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_channels_favorites ON public.user_channel_mappings(user_id, is_favorite) WHERE is_favorite = true;

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_user ON public.devices(user_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_active ON public.devices(last_active_at DESC);

-- Stream sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON public.stream_sessions(user_id, is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.stream_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON public.stream_sessions(device_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_ended ON public.stream_sessions(ended_at) WHERE ended_at IS NULL;

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active, is_public, sort_order) WHERE is_active = true AND is_public = true;

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status, current_period_end) WHERE status IN ('active', 'trialing', 'past_due');
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider, provider_payment_id);

-- Watch history indexes
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON public.watch_history(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_continue ON public.watch_history(user_id, is_completed, updated_at DESC) WHERE is_completed = false;

-- Ratings indexes
CREATE INDEX IF NOT EXISTS idx_ratings_video ON public.ratings(video_id, rating);

-- Bunny videos indexes
CREATE INDEX IF NOT EXISTS idx_bunny_videos_category ON public.bunny_videos(category_id) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_bunny_videos_featured ON public.bunny_videos(is_featured, created_at DESC) WHERE is_featured = true AND status = 'available';
CREATE INDEX IF NOT EXISTS idx_bunny_videos_premium ON public.bunny_videos(is_premium, category_id) WHERE is_premium = true AND status = 'available';
CREATE INDEX IF NOT EXISTS idx_bunny_videos_status ON public.bunny_videos(status, updated_at);

-- CDN access logs indexes
CREATE INDEX IF NOT EXISTS idx_cdn_logs_user ON public.cdn_access_logs(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cdn_logs_video ON public.cdn_access_logs(video_id, accessed_at DESC) WHERE video_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cdn_logs_time ON public.cdn_access_logs(accessed_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity, created_at) WHERE severity IN ('error', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_channel_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cdn_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bunny_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epg_data ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Channels policies (public read for active)
DROP POLICY IF EXISTS "Active channels are viewable by authenticated users" ON public.channels;
CREATE POLICY "Active channels are viewable by authenticated users" ON public.channels FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Only admins can modify channels" ON public.channels;
CREATE POLICY "Only admins can modify channels" ON public.channels FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- User channel mappings policies
DROP POLICY IF EXISTS "Users can manage own channel mappings" ON public.user_channel_mappings;
CREATE POLICY "Users can manage own channel mappings" ON public.user_channel_mappings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Stream sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.stream_sessions;
CREATE POLICY "Users can view own sessions" ON public.stream_sessions FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Devices policies
DROP POLICY IF EXISTS "Users can manage own devices" ON public.devices;
CREATE POLICY "Users can manage own devices" ON public.devices FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (user_id = auth.uid());

-- Watch history policies
DROP POLICY IF EXISTS "Users can manage own watch history" ON public.watch_history;
CREATE POLICY "Users can manage own watch history" ON public.watch_history FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Ratings policies
DROP POLICY IF EXISTS "Users can manage own ratings" ON public.ratings;
CREATE POLICY "Users can manage own ratings" ON public.ratings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Notifications policies
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- CDN access logs policies
DROP POLICY IF EXISTS "Users can view own CDN logs" ON public.cdn_access_logs;
CREATE POLICY "Users can view own CDN logs" ON public.cdn_access_logs FOR SELECT USING (user_id = auth.uid());

-- Audit logs policies (admin only)
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Bunny videos policies (public read)
DROP POLICY IF EXISTS "Bunny videos are viewable by everyone" ON public.bunny_videos;
CREATE POLICY "Bunny videos are viewable by everyone" ON public.bunny_videos FOR SELECT USING (status = 'available');

DROP POLICY IF EXISTS "Only admins can modify bunny videos" ON public.bunny_videos;
CREATE POLICY "Only admins can modify bunny videos" ON public.bunny_videos FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Categories policies (public read)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Only admins can modify categories" ON public.categories;
CREATE POLICY "Only admins can modify categories" ON public.categories FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- EPG policies
DROP POLICY IF EXISTS "EPG data is viewable by authenticated users" ON public.epg_data;
CREATE POLICY "EPG data is viewable by authenticated users" ON public.epg_data FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

-- Plans policies (public read)
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (is_public = true AND is_active = true);

DROP POLICY IF EXISTS "Only admins can modify plans" ON public.plans;
CREATE POLICY "Only admins can modify plans" ON public.plans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- System settings policies (admin only)
DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;
CREATE POLICY "Only admins can manage system settings" ON public.system_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_plan_id UUID;
BEGIN
    SELECT id INTO default_plan_id FROM public.plans WHERE is_active = true AND is_public = true ORDER BY price_monthly ASC LIMIT 1;
    INSERT INTO public.profiles (id, email, full_name, role, subscription_status, subscription_plan_id)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Kullanıcı'), COALESCE(NEW.raw_user_meta_data->>'role', 'user'), 'trial', default_plan_id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check concurrent streams limit
CREATE OR REPLACE FUNCTION check_concurrent_streams()
RETURNS TRIGGER AS $$
DECLARE
    current_streams INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT max_concurrent_streams INTO max_allowed FROM public.profiles WHERE id = NEW.user_id;
    max_allowed := COALESCE(max_allowed, 2);
    SELECT COUNT(*) INTO current_streams FROM public.stream_sessions WHERE user_id = NEW.user_id AND is_active = true AND expires_at > now() AND id != NEW.id;
    IF current_streams >= max_allowed THEN
        UPDATE public.stream_sessions SET is_active = false, ended_at = now(), ended_reason = 'concurrent_limit'
        WHERE id = (SELECT id FROM public.stream_sessions WHERE user_id = NEW.user_id AND is_active = true ORDER BY started_at ASC LIMIT 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check device limit
CREATE OR REPLACE FUNCTION check_device_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_devices INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT max_devices INTO max_allowed FROM public.profiles WHERE id = NEW.user_id;
    max_allowed := COALESCE(max_allowed, 5);
    SELECT COUNT(*) INTO current_devices FROM public.devices WHERE user_id = NEW.user_id;
    IF current_devices >= max_allowed THEN
        DELETE FROM public.devices WHERE id = (SELECT id FROM public.devices WHERE user_id = NEW.user_id ORDER BY last_active_at ASC LIMIT 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    closed_count INTEGER;
BEGIN
    UPDATE public.stream_sessions SET is_active = false, ended_at = now(), ended_reason = 'timeout'
    WHERE is_active = true AND expires_at < now();
    GET DIAGNOSTICS closed_count = ROW_COUNT;
    RETURN closed_count;
END;
$$ LANGUAGE plpgsql;

-- Create audit log
CREATE OR REPLACE FUNCTION create_audit_log(p_user_id UUID, p_action TEXT, p_resource_type TEXT, p_resource_id TEXT, p_old_values JSONB DEFAULT NULL, p_new_values JSONB DEFAULT NULL, p_severity TEXT DEFAULT 'info')
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
    INSERT INTO public.audit_logs (user_id, user_email, action, resource_type, resource_id, old_values, new_values, severity)
    VALUES (p_user_id, v_email, p_action, p_resource_type, p_resource_id, p_old_values, p_new_values, p_severity)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Auth user created trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_channel_mappings_updated_at ON public.user_channel_mappings;
CREATE TRIGGER update_user_channel_mappings_updated_at BEFORE UPDATE ON public.user_channel_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watch_history_updated_at ON public.watch_history;
CREATE TRIGGER update_watch_history_updated_at BEFORE UPDATE ON public.watch_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ratings_updated_at ON public.ratings;
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bunny_videos_updated_at ON public.bunny_videos;
CREATE TRIGGER update_bunny_videos_updated_at BEFORE UPDATE ON public.bunny_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Limit enforcement triggers
DROP TRIGGER IF EXISTS enforce_stream_limit ON public.stream_sessions;
CREATE TRIGGER enforce_stream_limit BEFORE INSERT ON public.stream_sessions FOR EACH ROW EXECUTE FUNCTION check_concurrent_streams();

DROP TRIGGER IF EXISTS enforce_device_limit ON public.devices;
CREATE TRIGGER enforce_device_limit BEFORE INSERT ON public.devices FOR EACH ROW EXECUTE FUNCTION check_device_limit();

-- ============================================
-- 6. VIEWS
-- ============================================

-- Active streams view (admin monitoring)
DROP VIEW IF EXISTS public.active_streams;
CREATE VIEW public.active_streams AS
SELECT ss.id, ss.user_id, p.email, p.full_name, p.account_number, ss.channel_id, c.name as channel_name, ss.device_id, d.device_name, d.device_type, ss.session_type, ss.started_at, ss.expires_at, ss.ip_address, EXTRACT(EPOCH FROM (now() - ss.started_at))/60 as duration_minutes, ss.quality_switches, ss.buffer_events
FROM public.stream_sessions ss
JOIN public.profiles p ON ss.user_id = p.id
LEFT JOIN public.channels c ON ss.channel_id = c.id
LEFT JOIN public.devices d ON ss.device_id = d.id
WHERE ss.is_active = true AND ss.expires_at > now();

-- Daily stats view
DROP VIEW IF EXISTS public.daily_stats;
CREATE VIEW public.daily_stats AS
SELECT DATE(created_at) as date, COUNT(*) FILTER (WHERE action = 'login') as total_logins, COUNT(*) FILTER (WHERE action = 'stream_started') as total_streams_started, COUNT(DISTINCT user_id) FILTER (WHERE action = 'stream_started') as unique_streamers, COUNT(*) FILTER (WHERE action = 'payment_completed') as total_payments, COALESCE(SUM((new_values->>'amount')::decimal) FILTER (WHERE action = 'payment_completed'), 0) as total_revenue
FROM public.audit_logs
WHERE created_at > now() - interval '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- User dashboard view
DROP VIEW IF EXISTS public.user_dashboard;
CREATE VIEW public.user_dashboard AS
SELECT p.id as user_id, p.email, p.full_name, p.subscription_status, p.subscription_ends_at, pl.name as plan_name, pl.max_concurrent_streams, pl.max_devices, (SELECT COUNT(*) FROM public.stream_sessions WHERE user_id = p.id AND is_active = true AND expires_at > now()) as active_streams, (SELECT COUNT(*) FROM public.devices WHERE user_id = p.id AND last_active_at > now() - interval '30 days') as active_devices, (SELECT COUNT(*) FROM public.notifications WHERE user_id = p.id AND is_read = false) as unread_notifications
FROM public.profiles p
LEFT JOIN public.plans pl ON p.subscription_plan_id = pl.id;

-- Profiles safe view (backward compatibility)
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
SELECT id, email, full_name, avatar_url, account_number, is_admin, subscription_ends_at, max_concurrent_streams, daily_stream_quota_minutes, subscription_status, created_at, updated_at
FROM public.profiles
WHERE deleted_at IS NULL;

-- ============================================
-- 7. DEFAULT DATA
-- ============================================

-- Insert default plans
INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, max_concurrent_streams, max_devices, includes_premium_channels, includes_vod, is_active, is_public, sort_order) VALUES
('Temel', 'basic', 'Temel IPTV paketi - 1 ekran', 49.90, 499.90, 1, 3, false, true, true, true, 1),
('Standart', 'standard', 'Standart IPTV paketi - 2 ekran', 79.90, 799.90, 2, 5, false, true, true, true, 2),
('Premium', 'premium', 'Premium IPTV paketi - 4 ekran + premium kanallar', 129.90, 1299.90, 4, 10, true, true, true, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Insert default categories
INSERT INTO public.categories (name, slug, description, sort_order, is_active) VALUES
('Genel', 'genel', 'Genel kanallar', 1, true),
('Spor', 'spor', 'Spor kanalları', 2, true),
('Haber', 'haber', 'Haber kanalları', 3, true),
('Eğlence', 'eglence', 'Eğlence kanalları', 4, true),
('Belgesel', 'belgesel', 'Belgesel kanalları', 5, true),
('Çocuk', 'cocuk', 'Çocuk kanalları', 6, true),
('Film', 'film', 'Film kanalları', 7, true),
('Dizi', 'dizi', 'Dizi kanalları', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('maintenance_mode', '{"enabled": false, "message": "Sistem bakımda"}'::jsonb, 'Bakım modu ayarları'),
('registration_enabled', '{"enabled": true}'::jsonb, 'Yeni kayıt aktif mi'),
('stream_quality_options', '{"qualities": ["auto", "480p", "720p", "1080p"], "default": "auto"}'::jsonb, 'Stream kalite seçenekleri'),
('max_session_duration_hours', '{"value": 4}'::jsonb, 'Maksimum session süresi'),
('session_timeout_minutes', '{"value": 30}'::jsonb, 'Inaktif session timeout')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 8. GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- 9. COMMENTS
-- ============================================

COMMENT ON TABLE public.profiles IS 'Kullanıcı profilleri - tek kaynak';
COMMENT ON TABLE public.channels IS 'Global kanal kataloğu';
COMMENT ON TABLE public.user_channel_mappings IS 'Kullanıcı-kanal ilişkileri';
COMMENT ON TABLE public.devices IS 'Cihaz yönetimi ve lisans kontrolü';
COMMENT ON TABLE public.stream_sessions IS 'Aktif stream oturumları';
COMMENT ON TABLE public.audit_logs IS 'Denetim kayıtları - GDPR uyumlu';
COMMENT ON TABLE public.subscriptions IS 'Abonelik yaşam döngüsü';
COMMENT ON TABLE public.payments IS 'Finansal işlemler - değiştirilemez';
COMMENT ON COLUMN public.channels.stream_url_encrypted IS 'AES-256 ile şifrelenmiş - backend deşifre etmeli';

-- ============================================
-- KURULUM TAMAMLANDI
-- ============================================
SELECT 'Schema kurulumu tamamlandı!' as status;
