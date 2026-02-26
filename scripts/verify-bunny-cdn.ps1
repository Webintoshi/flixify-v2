# ============================================
# BUNNY CDN DOGRULAMA SCRIPTI
# Kurulum sonrasi test ve kontrol
# ============================================

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║            BUNNY CDN DOGRULAMA SCRIPTI                       ║
║                  Flixify.pro                                 ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$DOMAIN = "flixify.pro"
$TESTS_PASSED = 0
$TESTS_FAILED = 0

function Test-URL {
    param(
        [string]$Url,
        [string]$Description
    )
    
    Write-Host "`nTest: $Description" -ForegroundColor Yellow
    Write-Host "URL: $Url"
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method HEAD -TimeoutSec 10 -ErrorAction Stop
        $status = $response.StatusCode
        
        if ($status -eq 200) {
            Write-Host "✓ Basarili (HTTP $status)" -ForegroundColor Green
            
            # Headers kontrol
            $cdnHeader = $response.Headers["CDN-Provider"]
            $cacheHeader = $response.Headers["X-Cache-Status"]
            
            if ($cdnHeader) {
                Write-Host "  CDN: $cdnHeader" -ForegroundColor Gray
            }
            if ($cacheHeader) {
                Write-Host "  Cache: $cacheHeader" -ForegroundColor Gray
            }
            
            return $true
        } else {
            Write-Host "⚠ Uyari (HTTP $status)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "✗ Hata: $_" -ForegroundColor Red
        return $false
    }
}

function Test-DNS {
    Write-Host "`n=== DNS KONTROLU ===" -ForegroundColor Green
    
    try {
        $result = Resolve-DnsName -Name $DOMAIN -Type A -ErrorAction Stop
        Write-Host "✓ DNS A kaydi bulundu" -ForegroundColor Green
        Write-Host "  IP: $($result.IPAddress)" -ForegroundColor Gray
        
        # Bunny IP aralığı kontrolü
        $bunnyRanges = @("185.93", "45.131", "185.7")
        $isBunny = $false
        foreach ($range in $bunnyRanges) {
            if ($result.IPAddress -like "$range*") {
                $isBunny = $true
                break
            }
        }
        
        if ($isBunny) {
            Write-Host "✓ IP Bunny CDN araliginda" -ForegroundColor Green
        } else {
            Write-Host "⚠ IP Bunny CDN araliginda DEGIL" -ForegroundColor Yellow
            Write-Host "  Not: Cloudflare veya baska bir CDN kullaniliyor olabilir" -ForegroundColor Gray
        }
        
        return $true
    } catch {
        Write-Host "✗ DNS hatasi: $_" -ForegroundColor Red
        return $false
    }
}

function Test-SSL {
    Write-Host "`n=== SSL SERTIFIKA KONTROLU ===" -ForegroundColor Green
    
    try {
        $request = [System.Net.HttpWebRequest]::Create("https://$DOMAIN")
        $request.Timeout = 10000
        $request.AllowAutoRedirect = $false
        
        $response = $request.GetResponse()
        $cert = $request.ServicePoint.Certificate
        
        if ($cert) {
            Write-Host "✓ SSL sertifikasi aktif" -ForegroundColor Green
            Write-Host "  Issuer: $($cert.Issuer)" -ForegroundColor Gray
            Write-Host "  Expires: $($cert.GetExpirationDateString())" -ForegroundColor Gray
            
            $response.Close()
            return $true
        } else {
            Write-Host "✗ SSL sertifikasi bulunamadi" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ SSL hatasi: $_" -ForegroundColor Red
        return $false
    }
}

# ============================================
# ANA TESTLER
# ============================================

Write-Host "`nTestler baslatiliyor..." -ForegroundColor Cyan

# DNS Test
if (Test-DNS) { $TESTS_PASSED++ } else { $TESTS_FAILED++ }

# SSL Test
if (Test-SSL) { $TESTS_PASSED++ } else { $TESTS_FAILED++ }

# URL Tests
Write-Host "`n=== URL ERISIM TESTLERI ===" -ForegroundColor Green

$urls = @(
    @{ Url = "https://$DOMAIN"; Description = "Ana Sayfa" },
    @{ Url = "https://$DOMAIN/admin/login"; Description = "Admin Login" },
    @{ Url = "https://$DOMAIN/api/health"; Description = "API Health Check (404 beklenir)" }
)

foreach ($test in $urls) {
    if (Test-URL -Url $test.Url -Description $test.Description) {
        $TESTS_PASSED++
    } else {
        $TESTS_FAILED++
    }
}

# ============================================
# SONUCLAR
# ============================================
Write-Host "`n"
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "SONUCLAR" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Basarili: $TESTS_PASSED" -ForegroundColor Green
Write-Host "Basarisiz: $TESTS_FAILED" -ForegroundColor Red
Write-Host ""

if ($TESTS_FAILED -eq 0) {
    Write-Host "✓ TUM TESTLER BASARILI!" -ForegroundColor Green
    Write-Host "Bunny CDN kurulumu dogru calisiyor." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠ BAZI TESTLER BASARISIZ" -ForegroundColor Yellow
    Write-Host "BUNNY_CDN_MIGRATION_GUIDE.md dosyasini kontrol edin." -ForegroundColor Yellow
    exit 1
}
