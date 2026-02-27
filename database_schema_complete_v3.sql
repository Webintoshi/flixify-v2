-- ============================================
-- FLIXIFY V3 - PRODUCTION-GRADE DATABASE SCHEMA
-- Domain-Driven Design | 7 Bounded Contexts
-- Optimized for: 10M+ users, sub-50ms queries, 99.99% availability
-- ============================================

-- ============================================
-- BOUNDED CONTEXT 1: AUTH & IDENTITY
-- ============================================

-- Core: Single source of truth for user identity
-- NOTE: profiles_ad... ve profiles_safe KALDIRILDI - sadece 1 profiles tablosu
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identity
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    
    -- Account Metadata
    account_number TEXT UNIQUE,
    account_type TEXT DEFAULT 'standard' 
      CHECK (account_type IN ('standard', 'premium', 'enterprise')),
    
    -- Authorization (RBAC)
    role TEXT DEFAULT 'user' 
      CHECK (role IN ('user', 'moderator', 'admin', 'superadmin')),
    is_admin BOOLEAN GENERATED ALWAYS AS (role IN ('admin', 'superadmin')) STORED,
    
    -- Subscription State (denormalized for fast reads)
    subscription_status TEXT DEFAULT 'trial' 
      CHECK (subscription_status IN ('trial', 'active', 'expired', 'suspended', 'cancelled')),
    subscription_plan_id UUID,
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Quotas & Limits
    max_concurrent_streams INTEGER DEFAULT 2 CHECK (max_concurrent_streams > 0 AND max_concurrent_streams <= 10),
    max_devices INTEGER DEFAULT 5 CHECK (max_devices > 0 AND max_devices <= 20),
    daily_stream_quota_minutes INTEGER DEFAULT 480,
    
    -- Preferences (JSONB for flexibility, but with schema validation)
    preferences JSONB DEFAULT '{
      "language": "tr",
      "timezone": "Europe/Istanbul",
      "notifications": {"email": true, "push": true, "sms": false},
      "video_quality": "auto",
      "autoplay": true,
      "subtitle_enabled": true
    }'::jsonb,
    
    -- Security
    mfa_enabled BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_account_number ON public.profiles(account_number) WHERE account_number IS NOT NULL;
CREATE INDEX idx_profiles_subscription ON public.profiles(subscription_status, subscription_ends_at) 
  WHERE subscription_status IN ('trial', 'active');
CREATE INDEX idx_profiles_role ON public.profiles(role) WHERE role IN ('admin', 'superadmin', 'moderator');
CREATE INDEX idx_profiles_created ON public.profiles(created_at DESC);

-- ============================================
-- BOUNDED CONTEXT 2: CONTENT MANAGEMENT
-- ============================================

-- Global channels table (NOT user-scoped - DRY principle)
-- Kullanıcı başına channels YERINE global channels + user_mappings
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- External Reference
    external_id TEXT, -- M3U source ID
    source_type TEXT DEFAULT 'm3u' CHECK (source_type IN ('m3u', 'manual', 'api')),
    
    -- Content Metadata
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    
    -- Categorization
    category_id UUID,
    country_code CHAR(2) DEFAULT 'TR',
    language_code CHAR(2) DEFAULT 'tr',
    tags TEXT[] DEFAULT '{}',
    
    -- Stream URLs (encrypted at application layer)
    stream_url_encrypted TEXT NOT NULL, -- AES-256 encrypted
    stream_url_backup_encrypted TEXT,
    
    -- Technical Specs
    stream_format TEXT DEFAULT 'hls' CHECK (stream_format IN ('hls', 'dash', 'smooth', 'rtmp')),
    resolution TEXT DEFAULT '1080p' CHECK (resolution IN ('480p', '720p', '1080p', '4k')),
    
    -- Status & Health
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false, -- Premium kanallar için ek yetki gerekir
    health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('online', 'offline', 'degraded', 'unknown')),
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    health_check_fail_count INTEGER DEFAULT 0,
    
    -- Analytics
    view_count BIGINT DEFAULT 0,
    total_watch_time_minutes BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_channel_external UNIQUE (external_id, source_type)
);

CREATE INDEX idx_channels_category ON public.channels(category_id) WHERE is_active = true;
CREATE INDEX idx_channels_country ON public.channels(country_code, language_code) WHERE is_active = true;
CREATE INDEX idx_channels_health ON public.channels(health_status, last_health_check_at);
CREATE INDEX idx_channels_premium ON public.channels(is_premium) WHERE is_premium = true;

-- Categories table (normalized - no more string group names)
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

CREATE INDEX idx_categories_parent ON public.categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_categories_active ON public.categories(is_active, sort_order);

-- EPG (Electronic Program Guide) - TV Guide data
CREATE TABLE IF NOT EXISTS public.epg_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    
    -- Program Info
    title TEXT NOT NULL,
    description TEXT,
    episode_title TEXT,
    season_number INTEGER,
    episode_number INTEGER,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time))/60) STORED,
    
    -- Metadata
    genre TEXT,
    rating TEXT,
    thumbnail_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_epg_time CHECK (end_time > start_time)
);

CREATE INDEX idx_epg_channel_time ON public.epg_data(channel_id, start_time, end_time);
CREATE INDEX idx_epg_current ON public.epg_data(start_time, end_time) 
  WHERE start_time <= now() AND end_time > now();

-- User-Channel mappings (favorites, custom ordering, etc.)
CREATE TABLE IF NOT EXISTS public.user_channel_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    
    -- User-specific settings
    is_favorite BOOLEAN DEFAULT false,
    custom_name TEXT,
    custom_logo_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_user_channels_user ON public.user_channel_mappings(user_id, is_hidden, sort_order);
CREATE INDEX idx_user_channels_favorites ON public.user_channel_mappings(user_id, is_favorite) WHERE is_favorite = true;

-- ============================================
-- BOUNDED CONTEXT 3: STREAMING & SESSIONS
-- ============================================

-- Devices table (license enforcement için kritik)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Device Identification
    device_id TEXT NOT NULL, -- Client-generated unique ID
    device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android', 'android_tv', 'apple_tv', 'smart_tv', 'roku', 'fire_tv')),
    device_name TEXT,
    
    -- Technical
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    
    -- Trust
    is_trusted BOOLEAN DEFAULT false,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Session tracking
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_ip_address INET,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_devices_user ON public.devices(user_id, last_active_at DESC);
CREATE INDEX idx_devices_active ON public.devices(last_active_at) WHERE last_active_at > now() - interval '30 days';

-- Stream Sessions (concurrent limit enforcement)
CREATE TABLE IF NOT EXISTS public.stream_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relations
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
    video_id UUID, -- For VOD content
    
    -- Session Identification
    session_token TEXT UNIQUE NOT NULL, -- JWT veya opaque token
    session_type TEXT DEFAULT 'live' CHECK (session_type IN ('live', 'vod', 'catchup')),
    
    -- Security
    ip_address INET NOT NULL,
    user_agent TEXT,
    geo_country CHAR(2),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    ended_reason TEXT CHECK (ended_reason IN ('user_action', 'timeout', 'limit_reached', 'error', 'admin_action', 'concurrent_limit')),
    
    -- Usage Stats
    bytes_transferred BIGINT DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    buffer_events INTEGER DEFAULT 0,
    quality_switches INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sessions_user_active ON public.stream_sessions(user_id, is_active, expires_at) 
  WHERE is_active = true;
CREATE INDEX idx_sessions_token ON public.stream_sessions(session_token);
CREATE INDEX idx_sessions_device ON public.stream_sessions(device_id, is_active) WHERE is_active = true;
CREATE INDEX idx_sessions_ended ON public.stream_sessions(ended_at) WHERE ended_at IS NULL;

-- ============================================
-- BOUNDED CONTEXT 4: BILLING & PAYMENTS
-- ============================================

-- Plans (subscription tiers)
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan Info
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL CHECK (price_monthly >= 0),
    price_yearly DECIMAL(10,2) NOT NULL CHECK (price_yearly >= 0),
    currency CHAR(3) DEFAULT 'TRY',
    
    -- Features
    max_concurrent_streams INTEGER NOT NULL DEFAULT 2,
    max_devices INTEGER NOT NULL DEFAULT 5,
    includes_premium_channels BOOLEAN DEFAULT false,
    includes_vod BOOLEAN DEFAULT true,
    includes_catchup BOOLEAN DEFAULT false,
    
    -- Limits
    daily_stream_quota_minutes INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_plans_active ON public.plans(is_active, is_public, sort_order) WHERE is_active = true AND is_public = true;

-- Subscriptions (subscription lifecycle)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    
    -- Subscription State
    status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused', 'expired')),
    
    -- Timing
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment Provider
    provider TEXT DEFAULT 'stripe' CHECK (provider IN ('stripe', 'paypal', 'iyzico', 'manual')),
    provider_subscription_id TEXT,
    
    -- Billing
    billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status, current_period_end) 
  WHERE status IN ('active', 'trialing', 'past_due');
CREATE INDEX idx_subscriptions_provider ON public.subscriptions(provider, provider_subscription_id) 
  WHERE provider_subscription_id IS NOT NULL;

-- Payments (financial transactions - immutable)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Transaction Details
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'TRY',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')),
    
    -- Provider
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'iyzico', 'manual')),
    provider_payment_id TEXT NOT NULL,
    provider_invoice_id TEXT,
    
    -- Billing Details
    description TEXT,
    invoice_url TEXT,
    receipt_url TEXT,
    
    -- Metadata
    failure_reason TEXT,
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE INDEX idx_payments_status ON public.payments(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_payments_provider ON public.payments(provider, provider_payment_id);

-- ============================================
-- BOUNDED CONTEXT 5: USER ENGAGEMENT
-- ============================================

-- Watch History (VOD ve Catchup için)
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL, -- Bunny video ID veya channel_id
    content_type TEXT NOT NULL CHECK (content_type IN ('vod', 'live', 'catchup')),
    
    -- Progress
    duration_seconds INTEGER NOT NULL,
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    progress_percent INTEGER GENERATED ALWAYS AS (
      CASE WHEN duration_seconds > 0 THEN LEAST(100, (watched_seconds * 100 / duration_seconds)) ELSE 0 END
    ) STORED,
    is_completed BOOLEAN GENERATED ALWAYS AS (watched_seconds >= duration_seconds * 0.9) STORED,
    
    -- Metadata
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(user_id, video_id, content_type)
);

CREATE INDEX idx_watch_history_user ON public.watch_history(user_id, updated_at DESC);
CREATE INDEX idx_watch_history_continue ON public.watch_history(user_id, is_completed, updated_at DESC) 
  WHERE is_completed = false;

-- User Ratings (VOD içerikleri için)
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

CREATE INDEX idx_ratings_video ON public.ratings(video_id, rating);

-- ============================================
-- BOUNDED CONTEXT 6: CDN INTEGRATION (Bunny)
-- ============================================

-- Bunny Videos Cache (VOD content)
CREATE TABLE IF NOT EXISTS public.bunny_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT UNIQUE NOT NULL, -- Bunny video GUID
    
    -- Video Metadata
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    poster_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- saniye
    
    -- Categorization
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    country_code CHAR(2) DEFAULT 'TR',
    language_code CHAR(2) DEFAULT 'tr',
    tags TEXT[] DEFAULT '{}',
    genre TEXT[],
    
    -- Content Flags
    is_premium BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    requires_age_verification BOOLEAN DEFAULT false,
    min_age INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'processing' 
      CHECK (status IN ('uploading', 'processing', 'available', 'failed', 'deleted')),
    
    -- Bunny Specific
    bunny_library_id TEXT NOT NULL,
    bunny_collection_id TEXT,
    meta_data JSONB DEFAULT '{}'::jsonb,
    
    -- Analytics
    view_count BIGINT DEFAULT 0,
    total_watch_time_minutes BIGINT DEFAULT 0,
    average_rating DECIMAL(2,1),
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE,
    available_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bunny_videos_category ON public.bunny_videos(category_id) WHERE status = 'available';
CREATE INDEX idx_bunny_videos_featured ON public.bunny_videos(is_featured, created_at DESC) 
  WHERE is_featured = true AND status = 'available';
CREATE INDEX idx_bunny_videos_premium ON public.bunny_videos(is_premium, category_id) 
  WHERE is_premium = true AND status = 'available';
CREATE INDEX idx_bunny_videos_status ON public.bunny_videos(status, updated_at);

-- CDN Access Logs (analytics)
CREATE TABLE IF NOT EXISTS public.cdn_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT,
    channel_id UUID,
    
    -- Access Details
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    country_code CHAR(2),
    
    -- Stream Details
    content_type TEXT CHECK (content_type IN ('vod', 'live')),
    quality TEXT DEFAULT '1080p',
    format TEXT DEFAULT 'hls',
    
    -- Usage (client'dan batch olarak gönderilir)
    watch_duration_seconds INTEGER DEFAULT 0,
    bytes_transferred BIGINT DEFAULT 0,
    buffer_events INTEGER DEFAULT 0,
    
    -- Device
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    device_type TEXT
);

CREATE INDEX idx_cdn_logs_user ON public.cdn_access_logs(user_id, accessed_at DESC);
CREATE INDEX idx_cdn_logs_video ON public.cdn_access_logs(video_id, accessed_at DESC) 
  WHERE video_id IS NOT NULL;
CREATE INDEX idx_cdn_logs_time ON public.cdn_access_logs(accessed_at) 
  WHERE accessed_at > now() - interval '7 days';

-- ============================================
-- BOUNDED CONTEXT 7: SYSTEM & OBSERVABILITY
-- ============================================

-- Audit Logs (compliance ve security için kritik)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    
    -- Action
    action TEXT NOT NULL CHECK (action IN (
      'login', 'logout', 'password_change', 'profile_update',
      'subscription_created', 'subscription_cancelled', 'payment_completed',
      'stream_started', 'stream_ended', 'device_added', 'device_removed',
      'settings_changed', 'content_accessed', 'admin_action'
    )),
    resource_type TEXT, -- 'profile', 'subscription', 'payment', etc.
    resource_id TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    geo_country CHAR(2),
    
    -- Data (GDPR uyumlu - PII maskele)
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    
    -- Severity
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity, created_at) 
  WHERE severity IN ('error', 'critical');
CREATE INDEX idx_audit_logs_time ON public.audit_logs(created_at) 
  WHERE created_at > now() - interval '30 days';

-- Notifications (user notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Content
    type TEXT NOT NULL CHECK (type IN ('system', 'subscription', 'payment', 'content', 'security')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery
    sent_via TEXT[] DEFAULT '{}', -- ['push', 'email', 'sms']
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, created_at DESC) 
  WHERE is_read = false;

-- System Settings (feature flags, maintenance mode, etc.)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
));

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Channels RLS (public read for active channels)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active channels are viewable by authenticated users" 
ON public.channels FOR SELECT 
USING (is_active = true AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Only admins can modify channels" 
ON public.channels FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
));

-- User Channel Mappings RLS
ALTER TABLE public.user_channel_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own channel mappings" 
ON public.user_channel_mappings FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Stream Sessions RLS
ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" 
ON public.stream_sessions FOR SELECT 
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
));

-- Devices RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices" 
ON public.devices FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Subscriptions RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions FOR SELECT 
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
));

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" 
ON public.payments FOR SELECT 
USING (user_id = auth.uid());

-- Watch History RLS
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watch history" 
ON public.watch_history FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications" 
ON public.notifications FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- CDN Access Logs RLS
ALTER TABLE public.cdn_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CDN logs" 
ON public.cdn_access_logs FOR SELECT 
USING (user_id = auth.uid());

-- Audit Logs RLS (sadece adminler)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_channel_mappings_updated_at BEFORE UPDATE ON public.user_channel_mappings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_watch_history_updated_at BEFORE UPDATE ON public.watch_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_plan_id UUID;
BEGIN
    -- Get default plan
    SELECT id INTO default_plan_id FROM public.plans 
    WHERE is_active = true AND is_public = true 
    ORDER BY price_monthly ASC LIMIT 1;
    
    INSERT INTO public.profiles (
        id, email, full_name, role, subscription_status, subscription_plan_id
    ) VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Kullanıcı'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        'trial',
        default_plan_id
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Concurrent stream limit enforcement
CREATE OR REPLACE FUNCTION check_concurrent_streams()
RETURNS TRIGGER AS $$
DECLARE
    current_streams INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT max_concurrent_streams INTO max_allowed
    FROM public.profiles WHERE id = NEW.user_id;
    
    max_allowed := COALESCE(max_allowed, 2);
    
    SELECT COUNT(*) INTO current_streams
    FROM public.stream_sessions
    WHERE user_id = NEW.user_id 
      AND is_active = true 
      AND expires_at > now()
      AND id != NEW.id;
    
    IF current_streams >= max_allowed THEN
        -- En eski stream'i sonlandır (graceful degradation)
        UPDATE public.stream_sessions
        SET is_active = false, 
            ended_at = now(),
            ended_reason = 'concurrent_limit'
        WHERE id = (
            SELECT id FROM public.stream_sessions 
            WHERE user_id = NEW.user_id AND is_active = true
            ORDER BY started_at ASC LIMIT 1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_stream_limit ON public.stream_sessions;
CREATE TRIGGER enforce_stream_limit
    BEFORE INSERT ON public.stream_sessions
    FOR EACH ROW EXECUTE FUNCTION check_concurrent_streams();

-- Device limit enforcement
CREATE OR REPLACE FUNCTION check_device_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_devices INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT max_devices INTO max_allowed
    FROM public.profiles WHERE id = NEW.user_id;
    
    max_allowed := COALESCE(max_allowed, 5);
    
    SELECT COUNT(*) INTO current_devices
    FROM public.devices WHERE user_id = NEW.user_id;
    
    IF current_devices >= max_allowed THEN
        -- En eski device'ı sil
        DELETE FROM public.devices
        WHERE id = (
            SELECT id FROM public.devices 
            WHERE user_id = NEW.user_id 
            ORDER BY last_active_at ASC LIMIT 1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_device_limit ON public.devices;
CREATE TRIGGER enforce_device_limit
    BEFORE INSERT ON public.devices
    FOR EACH ROW EXECUTE FUNCTION check_device_limit();

-- Cleanup expired sessions function (cron job için)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    closed_count INTEGER;
BEGIN
    UPDATE public.stream_sessions
    SET is_active = false,
        ended_at = now(),
        ended_reason = 'timeout'
    WHERE is_active = true 
      AND expires_at < now();
    
    GET DIAGNOSTICS closed_count = ROW_COUNT;
    RETURN closed_count;
END;
$$ LANGUAGE plpgsql;

-- Audit log function
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
    
    INSERT INTO public.audit_logs (
        user_id, user_email, action, resource_type, resource_id,
        old_values, new_values, severity
    ) VALUES (
        p_user_id, v_email, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_severity
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEWS (for simplified access patterns)
-- ============================================

-- Active streams view (admin monitoring)
CREATE OR REPLACE VIEW public.active_streams AS
SELECT 
    ss.id,
    ss.user_id,
    p.email,
    p.full_name,
    p.account_number,
    ss.channel_id,
    c.name as channel_name,
    ss.device_id,
    d.device_name,
    d.device_type,
    ss.session_type,
    ss.started_at,
    ss.expires_at,
    ss.ip_address,
    EXTRACT(EPOCH FROM (now() - ss.started_at))/60 as duration_minutes,
    ss.quality_switches,
    ss.buffer_events
FROM public.stream_sessions ss
JOIN public.profiles p ON ss.user_id = p.id
LEFT JOIN public.channels c ON ss.channel_id = c.id
LEFT JOIN public.devices d ON ss.device_id = d.id
WHERE ss.is_active = true AND ss.expires_at > now();

-- Daily stats view
CREATE OR REPLACE VIEW public.daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE action = 'login') as total_logins,
    COUNT(*) FILTER (WHERE action = 'stream_started') as total_streams_started,
    COUNT(DISTINCT user_id) FILTER (WHERE action = 'stream_started') as unique_streamers,
    COUNT(*) FILTER (WHERE action = 'payment_completed') as total_payments,
    SUM((new_values->>'amount')::decimal) FILTER (WHERE action = 'payment_completed') as total_revenue
FROM public.audit_logs
WHERE created_at > now() - interval '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- User dashboard view (aggregated data)
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.subscription_status,
    p.subscription_ends_at,
    pl.name as plan_name,
    pl.max_concurrent_streams,
    pl.max_devices,
    (
        SELECT COUNT(*) FROM public.stream_sessions 
        WHERE user_id = p.id AND is_active = true AND expires_at > now()
    ) as active_streams,
    (
        SELECT COUNT(*) FROM public.devices 
        WHERE user_id = p.id AND last_active_at > now() - interval '30 days'
    ) as active_devices,
    (
        SELECT COUNT(*) FROM public.notifications 
        WHERE user_id = p.id AND is_read = false
    ) as unread_notifications,
    (
        SELECT json_agg(json_build_object(
            'id', wh.video_id,
            'watched_seconds', wh.watched_seconds,
            'duration_seconds', wh.duration_seconds,
            'updated_at', wh.updated_at
        )) FROM public.watch_history wh 
        WHERE wh.user_id = p.id AND wh.is_completed = false 
        ORDER BY wh.updated_at DESC LIMIT 5
    ) as continue_watching
FROM public.profiles p
LEFT JOIN public.plans pl ON p.subscription_plan_id = pl.id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.profiles IS 'Single source of truth for user identity - profiles_ad ve profiles_safe KALDIRILDI';
COMMENT ON TABLE public.channels IS 'Global channel catalog - user-specific data user_channel_mappings tablosunda';
COMMENT ON TABLE public.devices IS 'Device license enforcement için kritik';
COMMENT ON TABLE public.stream_sessions IS 'Concurrent stream limit enforcement';
COMMENT ON TABLE public.audit_logs IS 'GDPR compliance ve security auditing için zorunlu';
COMMENT ON TABLE public.payments IS 'Immutable financial transactions';
COMMENT ON COLUMN public.channels.stream_url_encrypted IS 'AES-256 ile şifrelenmiş - application layer''de decrypt edilir';
COMMENT ON COLUMN public.iptv_credentials IS 'KALDIRILDI - credentials artık encrypted olarak channels tablosunda';
COMMENT ON TABLE public.playlist_cache IS 'KALDIRILDI - channels + user_channel_mappings ile değiştirildi';

-- ============================================
-- MIGRATION NOTES
-- ============================================

/*
MEVCUTTAN YENİYE MİGRASYON:

1. profiles_safe VIEW olarak bırakıldı (backward compatibility)
   CREATE VIEW public.profiles_safe AS 
   SELECT * FROM public.profiles 
   WHERE deleted_at IS NULL;

2. profiles_ad... tablosu KALDIRILACAK - veriler profiles tablosuna merge edilecek

3. iptv_credentials tablosu KALDIRILACAK:
   - Stream URL'ler channels.stream_url_encrypted kolonuna taşınacak
   - Login credentials uygulama-layer encryption ile saklanacak

4. playlist_cache tablosu KALDIRILACAK:
   - Yerine: channels + user_channel_mappings kullanılacak

5. Data migration script'i:
   - Eski tablolardan yeni tablolara veri aktarımı
   - Stream URL'lerin şifrelenmesi
   - Kanal verilerinin normalize edilmesi
*/
