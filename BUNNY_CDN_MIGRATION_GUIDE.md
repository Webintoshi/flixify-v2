# 🚀 FLIXIFY.PRO - Bunny CDN Geçiş Rehberi

**Cloudflare → Bunny CDN Migration Guide**

---

## 📋 Ön Hazırlık Checklist

- [ ] Bunny.net hesabı oluşturuldu
- [ ] Stream Library oluşturuldu
- [ ] Pull Zone oluşturuldu
- [ ] Domain DNS yönetim erişimi (domain sağlayıcınız)
- [ ] Mevcut SSL sertifikaları yedeklendi (varsa)
- [ ] Uygulama environment variables hazır

---

## Adım 1: Bunny Stream Library Oluşturma

### 1.1 Stream Library Kurulumu

1. **Bunny Dashboard** → **Stream** → **Add Library**
2. Library Name: `Flixify-Stream`
3. Region: `Europe` (Türkiye için en yakın)
4. **Create Library**

### 1.2 API Key Alma

1. **Account** → **API** → **Add API Key**
2. Name: `Flixify-API-Key`
3. Permissions:
   - ✅ Stream: Read/Write
   - ✅ Storage: Read/Write
   - ✅ Statistics: Read
4. **Add API Key** ve key'i kopyalayın

### 1.3 Library ID Notu

Stream Library sayfasından **Library ID**'yi kopyalayın:
```
Örnek: 12345 (veya uuid formatında)
```

---

## Adım 2: Bunny CDN Pull Zone Oluşturma

### 2.1 Pull Zone Kurulumu

1. **Bunny Dashboard** → **CDN** → **Add Pull Zone**
2. **Name**: `flixify-pro`
3. **Origin URL**: `https://qc80sgkgo08kks8o0wskk0g4.45.32.157.236.sslip.io`
   - Veya mevcut Coolify/Vercel URL'niz
4. **Tier**: `Standard` (başlangıç için yeterli)
5. **Add Pull Zone**

### 2.2 Pull Zone Bilgilerini Not Edin

Oluşturduktan sonra şunları not alın:
```
CDN URL: https://flixify-pro.b-cdn.net
Pull Zone ID: 1234567
```

---

## Adım 3: Custom Domain Ekleme (flixify.pro)

### 3.1 Domain Ekleme

1. Pull Zone → **Custom Domains** → **Add Custom Domain**
2. **Domain**: `flixify.pro`
3. **Enable SSL**: ✅ (Let's Encrypt)
4. **Force SSL**: ✅ (HTTP → HTTPS yönlendirme)
5. **Add Domain**

### 3.2 SSL Sertifikası

Bunny otomatik Let's Encrypt sertifikası oluşturacak:
- **Status**: `Pending` → `Active` (1-5 dakika)
- **SSL Type**: `Let's Encrypt v2`

---

## Adım 4: DNS Yapılandırması (Kritik Adım)

### 4.1 Mevcut Cloudflare DNS Kayıtlarını Yedekle

Cloudflare Dashboard → flixify.pro → DNS → Export

### 4.2 Bunny CDN DNS Kayıtları

Domain sağlayıcınıza (GoDaddy, Namecheap, vb.) veya DNS yöneticinize gidin:

#### A Kaydı (Root Domain)
```
Type:    A
Name:    @
Value:   Bunny Pull Zone IP'si (Bunny Dashboard'dan alın)
TTL:     600
```

#### CNAME Kaydı (WWW)
```
Type:    CNAME
Name:    www
Value:   flixify-pro.b-cdn.net
TTL:     600
```

#### CNAME Kaydı (API - Vercel/CDN için)
```
Type:    CNAME
Name:    api
Value:   cname.vercel-dns.com (veya Coolify URL)
TTL:     600
```

### 4.3 Bunny Dashboard'dan IP Adresi Alma

1. Bunny Dashboard → **Pull Zones** → **flixify-pro**
2. **General** → **Hostname Information**
3. **IPv4 Address** kısmındaki IP'yi kopyalayın

Örnek:
```
185.93.1.1  (Bu IP'yi A kaydına yazın)
```

---

## Adım 5: DNS Değişikliği ve Propagation

### 5.1 DNS Değişikliği

DNS yöneticinizde (domain sağlayıcınız):

**Eski Cloudflare DNS'i kaldırın:**
```
# ESKİ (Cloudflare)
Type: A    Name: @    Value: 104.21.xx.xx

# YENİ (Bunny CDN)
Type: A    Name: @    Value: 185.93.1.1 (Bunny IP)
```

### 5.2 Propagation Kontrolü

DNS değişikliği global olarak yayılması 5-60 dakika sürebilir.

Kontrol komutu:
```bash
# Windows
nslookup flixify.pro

# Mac/Linux
dig flixify.pro

# Online araç
https://dnschecker.org/#A/flixify.pro
```

---

## Adım 6: Bunny CDN Cache Kuralları

### 6.1 Cache Rules Yapılandırması

Pull Zone → **Cache** → **Add Cache Rule**

#### Rule 1: API Endpoints (No Cache)
```
Name: API No-Cache
Match: /api/*
Cache Expiration: 0 seconds (No Cache)
Query String: Forward all
```

#### Rule 2: Static Assets (Long Cache)
```
Name: Static Assets
Match: *.css, *.js, *.png, *.jpg, *.svg, *.woff2
Cache Expiration: 1 year
Browser Cache: 1 year
```

#### Rule 3: Video Files
```
Name: Video Content
Match: *.m3u8, *.ts, *.mp4
Cache Expiration: 1 hour
Query String: Forward all
```

### 6.2 Browser Cache TTL

**General** → **Browser Cache TTL**:
```
Static Files: 1 year
Dynamic Content: 5 minutes
```

---

## Adım 7: Güvenlik Ayarları

### 7.1 Hotlink Protection

**Security** → **Hotlink Protection**:
```
Enable: ✅
Allowed Referrers: flixify.pro, www.flixify.pro
```

### 7.2 IP Access Rules (Opsiyonel)

**Security** → **IP Access Rules**:
```
# Türkiye'den erişimi sınırlamak için
Action: Block
Countries: (istenmeyen ülkeler)
```

### 7.3 Token Authentication (Stream için)

Stream Library → **Security** → **Enable Token Authentication**

Bu özellik otomatik olarak API'mizde kullanılıyor.

---

## Adım 8: Coolify/Vercel Environment Variables

### 8.1 Environment Variables Güncelleme

Coolify Dashboard → Flixify Project → Environment Variables:

```env
# Bunny Stream
BUNNY_STREAM_API_KEY=ak-xxxx-xxxx-xxxx
BUNNY_STREAM_LIBRARY_ID=12345

# Bunny CDN
BUNNY_CDN_URL=https://flixify.pro
# veya https://flixify-pro.b-cdn.net (Bunny URL)
BUNNY_CDN_API_KEY=ak-xxxx-xxxx
BUNNY_TOKEN_SECURITY_KEY=your-security-key

# Supabase (Mevcut)
SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### 8.2 Redeploy

Değişikliklerden sonra uygulamayı yeniden deploy edin.

---

## Adım 9: SSL/TLS Sertifikası Doğrulama

### 9.1 SSL Status Kontrolü

Bunny Dashboard → **Pull Zone** → **Custom Domains**:

```
flixify.pro
Status: ✅ Active
SSL: Let's Encrypt v2
Expires: 2026-05-27
```

### 9.2 SSL Test

```bash
curl -I https://flixify.pro

# Beklenen çıktı:
HTTP/2 200
ssl: TLSv1.3
```

---

## Adım 10: Test ve Doğrulama

### 10.1 Ana Site Testi

```bash
# Site erişilebilirlik
curl -s -o /dev/null -w "%{http_code}" https://flixify.pro

# Beklenen: 200
```

### 10.2 Admin Panel Testi

```
https://flixify.pro/admin/login
→ Bunny CDN üzerinden yüklenmeli
```

### 10.3 Stream Testi

1. Admin panelden video yükleyin
2. Video listesinden bir video seçin
3. Oynatma testi yapın
4. Network tab'dan URL'i kontrol edin:
   ```
   flixify.pro (Bunny CDN) üzerinden gelmeli
   ```

---

## 🔧 Hata Ayıklama

### Sorun 1: DNS Propagation Yavaş

**Çözüm:**
```bash
# Local DNS cache temizleme
# Windows:
ipconfig /flushdns

# Mac:
sudo killall -HUP mDNSResponder
```

### Sorun 2: SSL Hatası

**Kontrol:**
```bash
openssl s_client -connect flixify.pro:443 -servername flixify.pro
```

**Çözüm:**
- Bunny Dashboard → Custom Domain → SSL: Re-issue
- 5-10 dakika bekle

### Sorun 3: Origin Connection Error

**Kontrol:**
```bash
curl -I https://qc80sgkgo08kks8o0wskk0g4.45.32.157.236.sslip.io
```

**Çözüm:**
- Origin URL doğru mu kontrol edin
- Coolify/Vercel uygulaması çalışıyor mu?
- Firewall kurallarını kontrol edin

### Sorun 4: Cache Çalışmıyor

**Kontrol:**
```bash
curl -I https://flixify.pro
# X-Cache-Status header'ı görünmeli
```

**Çözüm:**
- Cache rules'ları kontrol edin
- URL pattern'leri doğru mu?

---

## 📊 Performans Optimizasyonu

### Bunny Dashboard İstatistikleri

**Pull Zone** → **Statistics**:
- Cache Hit Ratio: >85% olmalı
- Bandwidth Usage: İzleme
- Request Count: Analiz

### Optimizasyon Önerileri

1. **Enable GZIP/Brotli**: ✅ (Varsayılan açık)
2. **HTTP/2 Server Push**: ✅ 
3. **Minify CSS/JS**: Build sürecinde
4. **Image Optimization**: WebP formatı kullanın

---

## 🔄 Rollback Planı

Eğer bir sorun oluşursa eski Cloudflare yapılandırmasına dönün:

### 5 Dakikada Rollback:

1. **DNS Yöneticinize gidin**
2. **Cloudflare DNS kayıtlarını geri yükleyin:**
   ```
   Type: A    Name: @    Value: 104.21.xx.xx (Cloudflare IP)
   ```
3. **TTL değerini düşürün (300)**
4. **5-10 dakika bekleyin**

Site eski Cloudflare yapılandırmasına dönecektir.

---

## ✅ Post-Migration Checklist

- [ ] https://flixify.pro erişilebilir
- [ ] Admin panel çalışıyor
- [ ] Video yükleme/izleme test edildi
- [ ] API endpoints çalışıyor
- [ ] SSL sertifikası aktif
- [ ] Cache hit ratio >80%
- [ ] Mobile test yapıldı
- [ ] CDN purging test edildi

---

## 📞 Destek

**Bunny Support:**
- https://bunny.net/support
- support@bunny.net

**Flixify Dokümantasyon:**
- ENVIRONMENT.md
- COOLIFY_DEPLOY.md

---

**Son Güncelleme:** 2026-02-27
**Hazırlayan:** Flixify Dev Team
