# Flixify V3 - Database Architecture Guide

## 📊 Mevcut Yapı Analizi (V2)

### Tespit Edilen Sorunlar

| Tablo | Problem | Risk | Çözüm |
|-------|---------|------|-------|
| `profiles` + `profiles_safe` + `profiles_ad...` | 3 ayrı profil tablosu | Data inconsistency, update anomaly | Tek `profiles` tablosu + RLS |
| `channels` (user-scoped) | Her kullanıcı için aynı kanallar tekrarlanıyor | 1M users = 1B rows, storage waste | Global `channels` + `user_channel_mappings` |
| `iptv_credentials` | Plaintext storage | Security breach | Encryption at rest (AES-256) |
| `playlist_cache` | JSONB blob | Query performance killer | Normalized structure |
| `stream_sessions` | No device tracking | License enforcement impossible | `devices` table + FK |
| `daily_usage` | Aggregated only | No drill-down capability | `audit_logs` + materialized views |

## ✅ Yeni Yapı (V3) - 7 Bounded Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLIXIFY V3 DATABASE SCHEMA                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ AUTH & IDENTITY │  │   CONTENT MGMT  │  │ STREAMING &     │      │
│  │                 │  │                 │  │ SESSIONS        │      │
│  │ • profiles      │  │ • channels      │  │                 │      │
│  │ • auth hooks    │  │ • categories    │  │ • stream_sessions│     │
│  │ • audit_logs    │  │ • epg_data      │  │ • devices       │      │
│  │                 │  │ • user_mappings │  │                 │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ BILLING &       │  │ USER ENGAGEMENT │  │ CDN INTEGRATION │      │
│  │ PAYMENTS        │  │                 │  │                 │      │
│  │                 │  │ • watch_history │  │ • bunny_videos  │      │
│  │ • plans         │  │ • ratings       │  │ • cdn_access_logs│     │
│  │ • subscriptions │  │ • notifications │  │                 │      │
│  │ • payments      │  │ • system_settings│ │                 │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 🗂️ Tablo Detayları

### 1. AUTH & IDENTITY

#### `profiles` (Single Source of Truth)
```sql
-- Kaldırılan tablolar: profiles_safe, profiles_ad...
-- Artık sadece 1 tablo + RLS policies

Key Features:
- Soft delete (deleted_at)
- RBAC (role: user/moderator/admin/superadmin)
- Preferences JSONB (extensible)
- MFA support
```

**Indexes:**
- `idx_profiles_subscription` - Active subscription queries
- `idx_profiles_role` - Admin panel queries

#### `audit_logs` (GDPR Compliance)
```sql
-- Her kritik aksiyon loglanır
-- PII masking (user_email sadece log için)
-- 90+ gün retention (configurable)
```

### 2. CONTENT MANAGEMENT

#### `channels` (Global Catalog)
```sql
-- Eski: Her user için ayrı kanal satırı
-- Yeni: Global kanallar + user_channel_mappings

Key Changes:
- stream_url_encrypted (AES-256)
- source_type (m3u/manual/api)
- health_status + health_check_fail_count
```

#### `user_channel_mappings`
```sql
-- User-specific channel settings
- is_favorite
- custom_name
- sort_order
- is_hidden
```

#### `categories` (Normalized)
```sql
-- Eski: channels.group_name (string)
-- Yeni: categories table + parent-child hierarchy
```

### 3. STREAMING & SESSIONS

#### `devices` (License Enforcement)
```sql
-- CRITICAL: Device limit enforcement
- device_id (client-generated)
- device_type enum
- is_trusted
- last_active_at
```

#### `stream_sessions`
```sql
-- Concurrent stream limit enforcement
- session_token (JWT/opaque)
- device_id (FK)
- quality_switches, buffer_events (QoS)
- ended_reason (analytics)
```

### 4. BILLING & PAYMENTS

#### `plans`
```sql
- Subscription tiers
- Feature flags (includes_premium_channels, etc.)
- Stripe price ID mapping
```

#### `subscriptions`
```sql
- Lifecycle management (trialing, active, past_due, etc.)
- Provider abstraction (stripe, paypal, iyzico)
- cancel_at_period_end
```

#### `payments` (Immutable)
```sql
- Financial transactions
- Immutable (no UPDATE, only INSERT)
- provider_payment_id for reconciliation
```

### 5. CDN INTEGRATION

#### `bunny_videos`
```sql
-- Eski: bunny_videos_cache
-- Yeni: bunny_videos (primary table)

Features:
- is_premium flag
- requires_age_verification
- average_rating
- view_count
```

## 🔒 Security Model

### Encryption
- **Stream URLs:** AES-256, application-layer
- **PII:** Masked in audit_logs
- **Credentials:** Never stored plaintext

### RLS Policies
```sql
-- Her tablo için granular RLS
profiles: Users can only access own data (admins exception)
channels: Public read for active channels
stream_sessions: User isolation + admin monitoring
devices: User-scoped with limit enforcement
audit_logs: Admin-only
```

## 📈 Performance Optimizations

### Indexing Strategy
| Table | Index | Use Case |
|-------|-------|----------|
| profiles | `idx_profiles_subscription` | Active user queries |
| channels | `idx_channels_health` | Health check monitoring |
| stream_sessions | `idx_sessions_user_active` | Concurrent limit check |
| audit_logs | `idx_audit_logs_time` | Retention cleanup |

### Partitioning Candidates
- `audit_logs` - Partition by created_at (monthly)
- `cdn_access_logs` - Partition by accessed_at (daily)
- `stream_sessions` - Partition by created_at (monthly)

### Materialized Views
```sql
-- Daily stats (refresh: every hour)
-- User dashboard (refresh: on demand)
```

## 🔄 Migration Path

### Phase 1: Expand (Zero-downtime)
1. Yeni tabloları oluştur
2. Eski tablolar çalışmaya devam et
3. Dual-write (yeni veriler her iki tabloya)

### Phase 2: Migrate (Background)
1. Eski verileri yeni tablolara kopyala
2. Views ile backward compatibility

### Phase 3: Contract (Cleanup)
1. Eski tablolara yazmayı durdur
2. Eski tabloları kaldır

## 🚀 Deployment Checklist

- [ ] Backup alındı
- [ ] Yeni tablolar oluşturuldu
- [ ] RLS policies aktif
- [ ] Triggers test edildi
- [ ] Migration script çalıştırıldı
- [ ] Row counts doğrulandı
- [ ] Uygulama yeni yapıyı kullanıyor
- [ ] Legacy cleanup tamamlandı

## 📊 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Storage (1M users) | ~500GB | ~50GB | **10x** |
| Query latency (p95) | ~200ms | ~20ms | **10x** |
| Concurrent streams | Race conditions | Atomic enforcement | **Reliable** |
| Security audit | Failed | Compliant | **Pass** |
| Data consistency | Anomalies | ACID | **Strong** |
