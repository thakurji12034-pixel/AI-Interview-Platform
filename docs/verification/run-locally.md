# IntelliPrep AI – Local Run Verification Report

**Verification Date**: November 9, 2026  
**Host Machine**: Windows 11 Pro (10.0.26100), PowerShell 5.1 / 7  
**Runtime**: Node.js v24.21.0, npm 11.19.0, MySQL 8.0.46  
**Source Repository**: `D:\ai-interview-platform` (Branch `feature/intelliprep-release`)  
**Isolated Verification Directory**: `D:\tmp_verify`  
**Isolated Verification Database**: `interview_platform_verify`  

---

## 1. Overview & Verification Objective

This document proves that the developer run guide authored in [`docs/RUN_LOCALLY.md`](file:///d:/ai-interview-platform/docs/RUN_LOCALLY.md) is 100% executable and verified from scratch. 

To ensure complete independence from existing workspace state, the repository was cloned to a separate temporary directory (`D:\tmp_verify`), pointing to a newly created database (`interview_platform_verify`). All prerequisites, environment checks, migrations, seed scripts, server health probes, and client builds were executed using only the commands documented in the guide.

---

## 2. Verbatim Commands and Real Execution Output

### Step 1: Fresh Clone and Pre-Flight Check

#### Command:
```powershell
git clone -b feature/intelliprep-release D:\ai-interview-platform D:\tmp_verify
cd D:\tmp_verify
Copy-Item .env.example .env
# Configured DB_NAME=interview_platform_verify, DB_USER=root, DB_HOST=127.0.0.1, JWT_SECRET, JWT_REFRESH_SECRET
powershell -ExecutionPolicy Bypass -File scripts\dev-setup.ps1
```

#### Real Output:
```text
=======================================================
   IntelliPrep AI - Developer Environment Pre-Flight   
=======================================================

[1/4] Checking Node.js Runtime...
  [OK] Node.js is installed: v24.21.0 (meets requirement 22+)

[2/4] Checking npm Package Manager...
  [OK] npm is installed: v11.19.0

[3/4] Checking MySQL Availability...
  [OK] MySQL CLI detected: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe  Ver 8.0.46 for Win64 on x86_64 (MySQL Community Server - GPL)
  [OK] MySQL Server is responding on 127.0.0.1:3306

[4/4] Checking Environment Configuration (.env)...
  [OK] .env file located at repository root (D:\tmp_verify\scripts\..\.env).
  [OK] 'DB_HOST' is set: 127.0.0.1
  [OK] 'DB_NAME' is set: interview_platform_verify
  [OK] 'DB_USER' is set: root
  [OK] 'JWT_SECRET' is set (cryptographic length: 50 characters) [SECRET VALUE HIDDEN]
  [OK] 'JWT_REFRESH_SECRET' is set (cryptographic length: 48 characters) [SECRET VALUE HIDDEN]
  [OK] 'PORT' is set: 5000
  [OK] 'CLIENT_URL' is set: http://localhost:5173
  [OK] 'DB_PASS' is configured [SECRET VALUE HIDDEN]

-------------------------------------------------------
All pre-flight checks passed successfully! Ready for development.
```

---

### Step 2: Database Schema Migrations

#### Command:
```powershell
npm run migrate --prefix server
```

#### Real Output:
```text
> server@1.0.0 migrate
> node src/scripts/migrate.js up

Database connected (interview_platform_verify on 127.0.0.1)
Applying pending migrations...
{ event: 'migrating', name: '001_baseline_schema.js' }
{ event: 'migrated', name: '001_baseline_schema.js', durationSeconds: 0.301 }
{ event: 'migrating', name: '002_rbac_invitations_audit_tokens.js' }
{ event: 'migrated', name: '002_rbac_invitations_audit_tokens.js', durationSeconds: 0.672 }
{ event: 'migrating', name: '003_questions_and_assessments.js' }
{ event: 'migrated', name: '003_questions_and_assessments.js', durationSeconds: 0.623 }
{ event: 'migrating', name: '004_code_execution_submissions.js' }
{ event: 'migrated', name: '004_code_execution_submissions.js', durationSeconds: 0.171 }
{ event: 'migrating', name: '005_ai_engine_and_resumes.js' }
{ event: 'migrated', name: '005_ai_engine_and_resumes.js', durationSeconds: 0.899 }
{ event: 'migrating', name: '006_evaluations_and_reports.js' }
{ event: 'migrated', name: '006_evaluations_and_reports.js', durationSeconds: 0.442 }
{ event: 'migrating', name: '007_collaborative_editor_snapshots.js' }
{ event: 'migrated', name: '007_collaborative_editor_snapshots.js', durationSeconds: 0.335 }
Successfully executed 7 migration(s):
 - 001_baseline_schema.js
 - 002_rbac_invitations_audit_tokens.js
 - 003_questions_and_assessments.js
 - 004_code_execution_submissions.js
 - 005_ai_engine_and_resumes.js
 - 006_evaluations_and_reports.js
 - 007_collaborative_editor_snapshots.js
```

---

### Step 3: Question Bank Seeding

#### Command:
```powershell
npm run seed:questions --prefix server
```

#### Real Output:
```text
> server@1.0.0 seed:questions
> node src/scripts/seedQuestions.js

[SEED-QUESTIONS] Connecting to database...
[SEED-QUESTIONS] Author ID set to: null
[SEED-QUESTIONS] Seeding finished. Created: 10, Skipped: 0.
```

---

### Step 4: Administrator Account Seeding

#### Command:
```powershell
$env:ADMIN_EMAIL = "admin_verify@example.com"
$env:ADMIN_PASSWORD = "VerifyPassword123!"
$env:ADMIN_NAME = "Verify Administrator"
npm run seed:admin --prefix server
$env:ADMIN_PASSWORD = $null
```

#### Real Output:
```text
> server@1.0.0 seed:admin
> node src/scripts/seedAdmin.js

Connected to database for admin seeding.
Successfully created new Administrator account: admin_verify@example.com
```

---

### Step 5: Backend Server Startup & Health Probes

#### Command:
```powershell
$proc = Start-Process node -ArgumentList "server/src/server.js" -PassThru
Start-Sleep -Seconds 3
Invoke-RestMethod http://127.0.0.1:5000/health/ready
Stop-Process -Id $proc.Id -Force
```

#### Real Output:
```json
{
  "status": "ready",
  "checks": {
    "database": "connected",
    "redis": "in-memory-fallback"
  },
  "uptime": 6.3400276,
  "timestamp": "2026-11-09T10:25:42.477Z"
}
```

---

### Step 6: Client Production Build Verification

#### Command:
```powershell
npm run build --prefix client
```

#### Real Output:
```text
> client@0.0.0 build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 3856 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                  0.65 kB │ gzip:     0.38 kB
dist/assets/codicon-DF1abBS2.ttf               153.22 kB
dist/assets/json.worker-CV9fqkUp.js            433.12 kB
dist/assets/html.worker-D9ugpX4y.js            743.37 kB
dist/assets/css.worker-DwfUZ3fB.js           1,078.23 kB
dist/assets/ts.worker-DvEKW8Yk.js            6,927.78 kB
dist/assets/index-CDUtAdvZ.css                 240.21 kB │ gzip:    36.49 kB
dist/assets/index-CYGUwm9M.js                5,055.55 kB │ gzip: 1,321.24 kB
✓ built in 5.33s
```

---

## 3. Post-Verification Cleanup Statement

Following verification:
- The temporary directory `D:\tmp_verify` was completely purged.
- The temporary database `interview_platform_verify` was safely dropped (`DROP DATABASE interview_platform_verify;`).
- Zero residual artifacts or temporary credentials remained on disk.

