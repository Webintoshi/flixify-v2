# Coolify + Bunny CDN HTTP Geçiş Rehberi

## Yapılan Değişiklikler

### 1. `src/lib/iptvService.ts`
```typescript
// ESKİ: const PROXY_BASE = 'https://api.flixify.pro';
// YENİ: const PROXY_BASE = 'http://api.flixify.pro';
```

### 2. `proxy-server.js`
```javascript
// ESKİ: const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://flixify.pro,http://localhost:5173').split(',');
// YENİ: const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://flixify.pro,http://localhost:5173').split(',');
```

### 3. Coolify Environment Variables
Aşağıdaki environment variable'ları Coolify Dashboard'da güncelleyin:

```env
# Proxy için izinli origin'ler
ALLOWED_ORIGINS=http://flixify.pro,http://localhost:5173,http://localhost:3000

# Bunny CDN URL (eğer kullanıyorsanız)
BUNNY_CDN_URL=http://flixify.b-cdn.net

# Supabase (HTTPS zorunlu - değiştirmeyin!)
VITE_SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
```

### 4. Mixed Content Hatası Çözümü

HTTP kullanırken tarayıcı "Mixed Content" hatası verebilir. Çünkü:
- Supabase HTTPS zorunlu
- Bunny Stream HTTPS zorunlu
- TMDB/Wikipedia görseller HTTPS

Bu hatayı önlemek için `index.html` güncellenecek:
```html
<!-- HTTP modunda mixed content izni için -->
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

**NOT:** Bu satırı KALDIRIN (veya yorum yapın) HTTP modunda!
