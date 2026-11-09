<#
.SYNOPSIS
    Pre-flight developer environment check for IntelliPrep AI.
.DESCRIPTION
    Validates Node.js (22+), npm, MySQL, and required environment variables in .env without printing secret values.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "   IntelliPrep AI - Developer Environment Pre-Flight   " -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

$hasErrors = $false

# 1. Check Node.js
Write-Host "[1/4] Checking Node.js Runtime..." -ForegroundColor Yellow
try {
    $nodeVer = & node -v 2>$null
    if ($nodeVer -match "v(\d+)\.") {
        $major = [int]$matches[1]
        if ($major -ge 22) {
            Write-Host "  [OK] Node.js is installed: $nodeVer (meets requirement 22+)" -ForegroundColor Green
        } elseif ($major -ge 20) {
            Write-Host "  [WARN] Node.js is installed: $nodeVer (Node 22+ LTS is recommended)" -ForegroundColor Yellow
        } else {
            Write-Host "  [FAIL] Node.js version $nodeVer is too old. Please install Node.js 22 LTS." -ForegroundColor Red
            $hasErrors = $true
        }
    } else {
        Write-Host "  [FAIL] Node.js is not recognized in PATH." -ForegroundColor Red
        $hasErrors = $true
    }
} catch {
    Write-Host "  [FAIL] Error detecting Node.js: $_" -ForegroundColor Red
    $hasErrors = $true
}

# 2. Check npm
Write-Host "`n[2/4] Checking npm Package Manager..." -ForegroundColor Yellow
try {
    $npmVer = & npm -v 2>$null
    if ($npmVer) {
        Write-Host "  [OK] npm is installed: v$npmVer" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] npm is not recognized in PATH." -ForegroundColor Red
        $hasErrors = $true
    }
} catch {
    Write-Host "  [FAIL] Error detecting npm: $_" -ForegroundColor Red
    $hasErrors = $true
}

# 3. Check MySQL Client / Service
Write-Host "`n[3/4] Checking MySQL Availability..." -ForegroundColor Yellow
$mysqlFound = $false
try {
    $mysqlVer = & mysql --version 2>$null
    if ($mysqlVer) {
        Write-Host "  [OK] MySQL CLI detected: $mysqlVer" -ForegroundColor Green
        $mysqlFound = $true
    }
} catch {}

# Also test TCP connection to default MySQL port 3306
$tcpClient = New-Object System.Net.Sockets.TcpClient
$asyncResult = $tcpClient.BeginConnect("127.0.0.1", 3306, $null, $null)
$connected = $asyncResult.AsyncWaitHandle.WaitOne(1500, $false)
if ($connected -and $tcpClient.Connected) {
    Write-Host "  [OK] MySQL Server is responding on 127.0.0.1:3306" -ForegroundColor Green
    $tcpClient.Close()
    $mysqlFound = $true
} else {
    $tcpClient.Close()
    if (-not $mysqlFound) {
        Write-Host "  [WARN] MySQL CLI not in PATH and port 3306 did not respond immediately." -ForegroundColor Yellow
        Write-Host "         Ensure MySQL 8.0+ service is running before starting the server." -ForegroundColor Yellow
    }
}

# 4. Check Environment Configuration (.env)
Write-Host "`n[4/4] Checking Environment Configuration (.env)..." -ForegroundColor Yellow

$rootEnvPath = Join-Path $PSScriptRoot "..\.env"
$serverEnvPath = Join-Path $PSScriptRoot "..\server\.env"
$envExamplePath = Join-Path $PSScriptRoot "..\.env.example"

$envPath = $null
if (Test-Path $rootEnvPath) {
    $envPath = $rootEnvPath
    Write-Host "  [OK] .env file located at repository root ($rootEnvPath)." -ForegroundColor Green
} elseif (Test-Path $serverEnvPath) {
    $envPath = $serverEnvPath
    Write-Host "  [OK] .env file located in server/ directory ($serverEnvPath)." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] .env file not found at repository root or server/ directory." -ForegroundColor Red
    if (Test-Path $envExamplePath) {
        Write-Host "         Please copy .env.example to .env and configure credentials:" -ForegroundColor Yellow
        Write-Host "         Copy-Item .env.example .env" -ForegroundColor Cyan
    }
    $hasErrors = $true
}

if ($envPath) {
    
    # Parse .env key-value pairs without printing secrets
    $parsedEnv = @{}
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim('"').Trim("'")
                $parsedEnv[$key] = $val
            }
        }
    }

    $requiredVars = @("DB_HOST", "DB_NAME", "DB_USER", "JWT_SECRET", "JWT_REFRESH_SECRET")
    $recommendedVars = @("PORT", "CLIENT_URL", "DB_PASS")

    foreach ($var in $requiredVars) {
        if (-not $parsedEnv.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($parsedEnv[$var])) {
            Write-Host "  [FAIL] Required variable '$var' is missing or empty." -ForegroundColor Red
            $hasErrors = $true
        } else {
            # Check secret length requirements
            if ($var -eq "JWT_SECRET" -or $var -eq "JWT_REFRESH_SECRET") {
                $len = $parsedEnv[$var].Length
                if ($len -lt 32) {
                    Write-Host "  [FAIL] '$var' must be at least 32 characters long (current: $len chars)." -ForegroundColor Red
                    $hasErrors = $true
                } else {
                    Write-Host "  [OK] '$var' is set (cryptographic length: $len characters) [SECRET VALUE HIDDEN]" -ForegroundColor Green
                }
            } else {
                # Safe non-secret variable
                $val = $parsedEnv[$var]
                Write-Host "  [OK] '$var' is set: $val" -ForegroundColor Green
            }
        }
    }

    foreach ($var in $recommendedVars) {
        if ($parsedEnv.ContainsKey($var)) {
            if ($var -eq "DB_PASS") {
                Write-Host "  [OK] '$var' is configured [SECRET VALUE HIDDEN]" -ForegroundColor Green
            } else {
                Write-Host "  [OK] '$var' is set: $($parsedEnv[$var])" -ForegroundColor Green
            }
        } else {
            Write-Host "  [INFO] '$var' not set in .env (will use application default)" -ForegroundColor Gray
        }
    }
}

Write-Host "`n-------------------------------------------------------" -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "Pre-flight checks failed. Please resolve the items marked [FAIL] above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All pre-flight checks passed successfully! Ready for development." -ForegroundColor Green
    exit 0
}
