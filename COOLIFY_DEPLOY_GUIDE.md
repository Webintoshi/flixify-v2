# Coolify Deploy Rehberi - Flixify V2

## 🔐 Environment Variables (Coolify'da Eklenecek)

### 1. Client-Side Variables (VITE_ ile başlayanlar)

Coolify Dashboard → Proje → Environment Variables

```
VITE_SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3Zua3ZtZmhhdWJnY2Fodnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTM1NDgsImV4cCI6MjA4NzM4OTU0OH0.KslfPrwrIhDBlshOG5_KVvTaOEKYw4vuoJ0VBUx01HQ
VITE_API_URL=/api
NODE_ENV=production
VITE_DEV_MODE=false
VITE_ENABLE_DEBUG_LOGS=false
```

### 2. Server-Side Variables (⚠️ ÇOK GÜVENLİ!)

Bu key SADECE Coolify'da saklanmalı, ASLA GitHub'a push edilmemeli!

```
SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3Zua3ZtZmhhdWJnY2Fodnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgxMzU0OCwiZXhwIjoyMDg3Mzg5NTQ4fQ.hmUNVU4zQM85pPosbNNYDerMv8akHeezMbySbiSlPsk
```

**Service Role Key Nasıl Alınır:**
1. Supabase Dashboard → Project Settings → API
2. "service_role secret" key'i kopyala
3. SADECE Coolify'a yapıştır

## 🚀 Deploy Adımları

### Adım 1: Coolify'da Yeni Proje Oluştur
```
Coolify Dashboard → New Project
Project Name: flixify-v2
```

### Adım 2: Git Repository Bağla
```
Source: GitHub
Repository: Webintoshi/flixify-v2
Branch: main
```

### Adım 3: Build Settings
```
Build Pack: Nixpacks (Node.js otomatik algılanır)
Port: 7180 (veya otomatik)
```

### Adım 4: Environment Variables Ekle
Yukarıdaki tüm değişkenleri Coolify Environment Variables bölümüne ekle.

**ÖNEMLİ:** 
- `VITE_` ile başlayanlar client-side (tarayıcıda görünür)
- `SUPABASE_SERVICE_KEY` server-side (gizli)

### Adım 5: Deploy
```
Deploy butonuna tıkla ve logları izle
```

## 🛡️ Güvenlik Kontrol Listesi

- [ ] Service Role Key asla GitHub'da yok
- [ ] `.env` dosyaları `.gitignore`'da
- [ ] Coolify'da sadece gerekli değişkenler var
- [ ] Production URL HTTPS kullanıyor

## 📝 Sorun Giderme

**Build Hatası:**
```bash
# Logları kontrol et
Coolify → Proje → Deployments → Logs
```

**Environment Variable Hatası:**
- VITE_SUPABASE_URL boşluk içermemeli
- Tüm key'ler doğru kopyalanmış olmalı

**Service Role Key Hatası:**
- SUPABASE_SERVICE_KEY tanımlı mı kontrol et
- api/stream/proxy.ts bu key'i kullanıyor
