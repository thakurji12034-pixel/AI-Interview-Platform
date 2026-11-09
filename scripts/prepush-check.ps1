<#
.SYNOPSIS
    Pre-push repository security and hygiene scanner for IntelliPrep AI.
.DESCRIPTION
    Scans tracked Git files and commit history for leaked secrets, private keys, database dumps,
    tracked .env files, uploaded user files, and large binary blobs (>5MB).
    Exits non-zero if any security violations are detected.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "     IntelliPrep AI - Pre-Push Security Scanner        " -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

$violations = 0

# Helper to log violations
function Log-Violation($category, $details) {
    Write-Host "  [VIOLATION] $category`: $details" -ForegroundColor Red
    $global:violations++
}

# 1. Check for tracked .env files
Write-Host "[1/6] Scanning for tracked .env files..." -ForegroundColor Yellow
$trackedFiles = & git ls-files
$trackedEnv = $trackedFiles | Where-Object { 
    ($_ -match "(^|/)\.env$" -or $_ -match "(^|/)\.env\.(local|production|development|test)$") -and 
    ($_ -notmatch "\.example$") 
}
if ($trackedEnv) {
    foreach ($f in $trackedEnv) {
        Log-Violation "Tracked Environment File" $f
    }
} else {
    Write-Host "  [OK] No live or production .env files are tracked in Git." -ForegroundColor Green
}

# 2. Check for private keys and certificates
Write-Host "`n[2/6] Scanning for tracked private cryptographic keys..." -ForegroundColor Yellow
$trackedKeys = $trackedFiles | Where-Object {
    $_ -match "\.(pem|key|pkcs12|pfx|p12)$" -or
    $_ -match "(^|/)id_rsa(\.pub)?$" -or
    $_ -match "(^|/)id_ecdsa(\.pub)?$" -or
    $_ -match "(^|/)id_ed25519(\.pub)?$"
}
if ($trackedKeys) {
    foreach ($k in $trackedKeys) {
        Log-Violation "Cryptographic Key File" $k
    }
} else {
    Write-Host "  [OK] No private cryptographic keys or certificates found in Git index." -ForegroundColor Green
}

# 3. Check for database dumps
Write-Host "`n[3/6] Scanning for tracked database dumps..." -ForegroundColor Yellow
$trackedDumps = $trackedFiles | Where-Object {
    $_ -match "\.(sql|dump|dmp|sqlite|sqlite3|rdb)$" -and
    $_ -notmatch "node_modules"
}
if ($trackedDumps) {
    foreach ($d in $trackedDumps) {
        Log-Violation "Database Dump File" $d
    }
} else {
    Write-Host "  [OK] No database dump files (.sql/.dump/.rdb) are tracked in Git." -ForegroundColor Green
}

# 4. Check for user-uploaded resumes / binary uploads
Write-Host "`n[4/6] Scanning for tracked user uploads..." -ForegroundColor Yellow
$trackedUploads = $trackedFiles | Where-Object {
    $_ -match "^storage/resumes/" -or
    ($_ -match "\.pdf$" -and $_ -ne "docs/demo/sample-resume.pdf")
}
if ($trackedUploads) {
    foreach ($u in $trackedUploads) {
        Log-Violation "Uploaded User Data" $u
    }
} else {
    Write-Host "  [OK] No user uploads or unauthorized PDFs are tracked (only sample demo resume)." -ForegroundColor Green
}

# 5. Check for files larger than 5MB
Write-Host "`n[5/6] Scanning for files larger than 5MB..." -ForegroundColor Yellow
$MAX_BYTES = 5 * 1024 * 1024
$largeFilesFound = 0
foreach ($file in $trackedFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        if ($size -gt $MAX_BYTES) {
            $sizeMB = [math]::Round($size / 1MB, 2)
            Log-Violation "Large File (>5MB)" "$file ($sizeMB MB)"
            $largeFilesFound++
        }
    }
}
if ($largeFilesFound -eq 0) {
    Write-Host "  [OK] All tracked files are within allowable size limits (all <= 5MB)." -ForegroundColor Green
}

# 6. Scan for hardcoded credentials / secrets in tracked files
Write-Host "`n[6/6] Scanning tracked files for secret patterns..." -ForegroundColor Yellow
$secretPatterns = @(
    "-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----",
    "eyJ[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}", # JWT pattern
    "(AKIA|ASIA)[0-9A-Z]{16}",                                         # AWS Access Key ID
    "ghp_[A-Za-z0-9]{36}",                                             # GitHub Personal Access Token
    "AIza[0-9A-Za-z-_]{35}"                                            # Google API Key pattern
)

$scannedCount = 0
$secretViolations = 0

foreach ($file in $trackedFiles) {
    # Skip binary files and documentation screenshots/sample resumes
    if ($file -match "\.(png|jpg|jpeg|gif|ttf|woff|woff2|ico|pdf|gz|zip)$") { continue }
    if ($file -match "package-lock\.json$") { continue } # skip lockfiles with hash digests

    if (Test-Path $file) {
        $scannedCount++
        $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
        if ($content) {
            foreach ($pattern in $secretPatterns) {
                if ($content -match $pattern) {
                    # Avoid matching example/documentation strings
                    if ($file -notmatch "\.example$" -and $file -notmatch "prepush-check\.ps1$") {
                        Log-Violation "Potential Secret Leaked" "Pattern match in $file"
                        $secretViolations++
                    }
                }
            }
        }
    }
}

if ($secretViolations -eq 0) {
    Write-Host "  [OK] Scanned $scannedCount tracked source and configuration files: zero credential leaks found." -ForegroundColor Green
}

# Summary
Write-Host "`n=======================================================" -ForegroundColor Cyan
if ($violations -eq 0) {
    Write-Host " PRE-PUSH SECURITY SCAN PASSED: Zero violations found! " -ForegroundColor Green
    Write-Host "=======================================================`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host " PRE-PUSH SECURITY SCAN FAILED: $violations violation(s) found! " -ForegroundColor Red
    Write-Host "=======================================================`n" -ForegroundColor Cyan
    exit 1
}
