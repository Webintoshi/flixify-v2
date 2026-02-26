# ============================================
# BUNNY CDN KURULUM SCRIPTI
# Flixify.pro Cloudflare → Bunny CDN Geçiş
# ============================================

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║               BUNNY CDN KURULUM SCRIPTI                      ║
║                  Flixify.pro                                 ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""
Write-Host "⚠️  ONEMLI: Bu script DNS yapılandırmasını degistirecektir!" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Devam etmek istiyor musunuz? (E/H)"
if ($confirm -ne 'E' -and $confirm -ne 'e') {
    Write-Host "Islem iptal edildi." -ForegroundColor Red
    exit
}

# ============================================
# ADIM 1: Bilgi Toplama
# ============================================
Write-Host ""
Write-Host "=== ADIM 1: Bunny CDN Bilgileri ===" -ForegroundColor Green
Write-Host ""

$BunnyAPIKey = Read-Host "Bunny Stream API Key"
$BunnyLibraryID = Read-Host "Bunny Stream Library ID"
$BunnyCDNURL = Read-Host "Bunny CDN URL (ornek: https://flixify-pro.b-cdn.net)"
$BunnySecurityKey = Read-Host "Bunny Token Security Key"

$OriginURL = Read-Host "Origin URL (ornek: https://qc80sgkgo08kks8o0wskk0g4.45.32.157.236.sslip.io)"

# ============================================
# ADIM 2: Environment Variables Kontrol
# ============================================
Write-Host ""
Write-Host "=== ADIM 2: Environment Variables ===" -ForegroundColor Green
Write-Host ""

$envFile = ".env.production"

if (Test-Path $envFile) {
    Write-Host "✓ .env.production dosyasi bulundu" -ForegroundColor Green
    
    # Backup oluştur
    Copy-Item $envFile "$envFile.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "✓ Yedek olusturuldu" -ForegroundColor Green
    
    # Bunny değişkenlerini ekle/güncelle
    $envContent = Get-Content $envFile -Raw
    
    # Mevcut Bunny değişkenlerini kaldır
    $envContent = $envContent -replace "BUNNY_.*\r?\n", ""
    
    # Yeni değişkenleri ekle
    $bunnyVars = @"

# ============================================
# BUNNY CDN / STREAM CONFIGURATION
# ============================================
BUNNY_STREAM_API_KEY=$BunnyAPIKey
BUNNY_STREAM_LIBRARY_ID=$BunnyLibraryID
BUNNY_CDN_URL=$BunnyCDNURL
BUNNY_TOKEN_SECURITY_KEY=$BunnySecurityKey
STREAM_PROVIDER_PRIORITY=bunny
"@
    
    Add-Content -Path $envFile -Value $bunnyVars
    Write-Host "✓ Bunny CDN degiskenleri eklendi" -ForegroundColor Green
} else {
    Write-Host "✗ .env.production dosyasi bulunamadi!" -ForegroundColor Red
    exit 1
}

# ============================================
# ADIM 3: DNS Kontrol
# ============================================
Write-Host ""
Write-Host "=== ADIM 3: DNS Kontrol ===" -ForegroundColor Green
Write-Host ""

Write-Host "Mevcut DNS kayitlari kontrol ediliyor..."
try {
    $dnsResult = nslookup flixify.pro 2>&1
    Write-Host "Mevcut DNS:" -ForegroundColor Yellow
    Write-Host $dnsResult
} catch {
    Write-Host "DNS sorgusu basarisiz (normal)" -ForegroundColor Yellow
}

# ============================================
# ADIM 4: Build ve Test
# ============================================
Write-Host ""
Write-Host "=== ADIM 4: Build ve Test ===" -ForegroundColor Green
Write-Host ""

Write-Host "Build baslatiliyor..."
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build basarili" -ForegroundColor Green
} else {
    Write-Host "✗ Build hatasi!" -ForegroundColor Red
    exit 1
}

# ============================================
# ADIM 5: Git Commit
# ============================================
Write-Host ""
Write-Host "=== ADIM 5: Git Commit ===" -ForegroundColor Green
Write-Host ""

$gitAdd = Read-Host "Git commit yapilsin mi? (E/H)"
if ($gitAdd -eq 'E' -or $gitAdd -eq 'e') {
    git add -A
    git commit -m "Configure Bunny CDN environment variables"
    Write-Host "✓ Git commit yapildi" -ForegroundColor Green
    
    $gitPush = Read-Host "Git push yapilsin mi? (E/H)"
    if ($gitPush -eq 'E' -or $gitPush -eq 'e') {
        git push origin main
        Write-Host "✓ Git push yapildi" -ForegroundColor Green
    }
}

# ============================================
# ADIM 6: Sonuc
# ============================================
Write-Host ""
Write-Host "=== KURULUM TAMAMLANDI ===" -ForegroundColor Green
Write-Host ""

Write-Host @"
Yapilacaklar:
1. Bunny Dashboard'dan Pull Zone olusturun
2. flixify.pro domainini Bunny'e ekleyin
3. DNS kayitlarini guncelleyin:
   - Type: A    Name: @    Value: [Bunny IP]
   - Type: CNAME Name: www Value: [Bunny CDN URL]
4. SSL sertifikasinin aktif olmasini bekleyin (5-10 dk)
5. Coolify'da environment variables'i guncelleyin:
   - BUNNY_STREAM_API_KEY
   - BUNNY_STREAM_LIBRARY_ID
   - BUNNY_CDN_URL
   - BUNNY_TOKEN_SECURITY_KEY
6. Redeploy yapin

Test icin:
- https://flixify.pro
- https://flixify.pro/admin

"@ -ForegroundColor Cyan

Write-Host ""
Write-Host "Detayli rehber: BUNNY_CDN_MIGRATION_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
