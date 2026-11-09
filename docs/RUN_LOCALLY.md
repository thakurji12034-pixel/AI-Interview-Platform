# IntelliPrep AI – Local Development Run Guide

This guide provides copy-paste Windows PowerShell commands to run **IntelliPrep AI** from scratch on a developer workstation.

---

## 1. Prerequisites

Before starting, ensure the following software is installed on your Windows workstation:

1. **Node.js (v22+ LTS recommended)**:
   ```powershell
   node -v
   # Should output v22.x.x or higher (v24.x supported)
   npm -v
   # Should output v10.x.x or higher
   ```
2. **MySQL Server 8.0+**:
   Ensure MySQL service is running on `127.0.0.1:3306`. Connect to MySQL via PowerShell or MySQL Workbench and create the database:
   ```sql
   CREATE DATABASE interview_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
   *Tip: In PowerShell, you can execute this directly if MySQL CLI is in your PATH:*
   ```powershell
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS interview_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

---

## 2. Environment Configuration

1. In the repository root, copy the provided environment template to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Open `.env` in your text editor and configure your local database credentials:
   ```env
   # Node environment & Port
   NODE_ENV=development
   PORT=5000
   CLIENT_URL=http://localhost:5173

   # MySQL Database Connection
   DB_HOST=127.0.0.1
   DB_NAME=interview_platform
   DB_USER=root
   DB_PASS=YourLocalMySQLPassword

   # Cryptographic JWT Secrets (minimum 32 characters)
   JWT_SECRET=your_32_character_super_secret_access_token_key_here
   JWT_REFRESH_SECRET=your_32_character_super_secret_refresh_token_key_here

   # Development Provider Toggles (In-memory fallback enabled by default)
   ALLOW_MOCK_PROVIDERS=true
   ALLOW_INMEMORY_REDIS=true
   REDIS_MOCK=true
   ```

3. Run the automated pre-flight check script to verify your setup without exposing secrets:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\dev-setup.ps1
   ```
   *Expected Output: All checks marked `[OK]`, ending with `All pre-flight checks passed successfully!`*

---

## 3. Dependency Installation

If you are running from a fresh clone, install dependencies for both server and client:
```powershell
npm install --prefix server
npm install --prefix client
```

---

## 4. Database Setup & Seeding

Execute database schema migrations, question bank seeding, and administrator creation in sequence:

### Step 4.1: Run Schema Migrations
Applies all 7 Umzug database migrations:
```powershell
npm run migrate --prefix server
```

### Step 4.2: Seed the Question Bank
Populates 15 curated technical assessment questions (DSA, System Design, SQL, Frontend, Behavioral) complete with sample test cases and hidden test cases:
```powershell
npm run seed:questions --prefix server
```

### Step 4.3: Seed Initial Administrator Account
Seed the initial administrative account using environment variables in PowerShell:
```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "AdminPassword123!"
$env:ADMIN_NAME = "Platform Administrator"
npm run seed:admin --prefix server
$env:ADMIN_PASSWORD = $null  # Clear secret from session memory
```
*Expected Output: `[ADMIN SEED] Admin account created successfully: admin@example.com`*

---

## 5. Starting the Application

Open two separate PowerShell terminal windows (or tabs) to start the backend and frontend:

### Terminal 1: Backend Server (Port 5000)
```powershell
npm run dev --prefix server
```
*Health check probe:*
```powershell
Invoke-RestMethod http://127.0.0.1:5000/health/live
# Expected: {"status":"ok","uptime":...}
```

### Terminal 2: Frontend Client (Port 5173)
```powershell
npm run dev --prefix client
```
*The client is accessible at `http://localhost:5173`.*

---

## 6. Two-Browser Verification Demo Flow

To verify the complete collaborative lifecycle across multiple roles:

### Step 1: Administrator Logs In (Browser 1 - e.g., Chrome Normal Window)
1. Navigate to `http://localhost:5173/login`.
2. Sign in with the seeded administrator credentials:
   - **Email**: `admin@example.com`
   - **Password**: `AdminPassword123!`
3. In the Admin Dashboard, click **Create Invitation**.
4. Set role to `interviewer` and email `interviewer@example.com`. Click **Generate Invitation**.
5. Copy the generated single-use invitation URL (e.g., `http://localhost:5173/accept-invite?token=...`).
6. Click **Logout**.

### Step 2: Interviewer Onboarding & Question Setup (Browser 1)
1. Paste the invitation URL in the address bar to land on `/accept-invite`.
2. Fill in the interviewer's name and password, then submit registration.
3. Once logged in to the Interviewer Workspace:
   - Click **Question Bank** -> **New Question**.
   - Fill in question title (e.g., `Reverse Linked List II`), problem statement, sample tests, and hidden tests. Click **Save Question**.
   - Click **Scheduled Sessions** -> **Schedule Interview**.
   - Enter candidate email `candidate@example.com`, select a future time slot, and confirm schedule.

### Step 3: Candidate Portal & Resume Intelligence (Browser 2 - e.g., Incognito Window)
1. Open an Incognito / Private window and navigate to `http://localhost:5173/login`.
2. Toggle to **Create your account** and register:
   - **Name**: `Jordan Candidate`
   - **Email**: `candidate@example.com`
   - **Role**: `Candidate`
3. On the Candidate Portal, click **Upload Resume**:
   - Drag and drop a sample PDF resume (`docs/demo/sample-resume.pdf`).
   - Click **Upload & Extract Skills** to view parsed skills and verification tags.
   - Enter a target job description and click **Analyze Match Score** to view keyword match compatibility.
   - Close the resume modal.

### Step 4: Live Collaborative Coding Room (Browsers 1 & 2 Simultaneously)
1. In Browser 2 (Candidate), locate the scheduled interview session card and click **Join Coding Room**.
2. Copy the room URL (e.g., `http://localhost:5173/room/<roomId>`).
3. In Browser 1 (Interviewer), navigate to that same room URL.
4. Verify:
   - Real-time typing synchronization via Yjs CRDTs.
   - Typing indicator displays `${other.name} is typing...` in the status footer.
   - Click **Run Code** in the top bar to open the execution drawer.
   - Click **Run Code** inside the drawer: observe status `Accepted`, execution runtime, memory, and the amber `Simulated result` badge.
   - Expand **Sample Test Case #1** to view inputs and expected output, and note that **Hidden Test Case #2** shows `Secret Data Redacted`.

### Step 5: Interview Completion & AI Evaluation Report
1. In Browser 1 (Interviewer), return to the dashboard and click **Start**, then **Finish** on the interview card.
2. Click **Report** on the completed interview card.
3. Click **Generate AI Evaluation Report** to generate multi-dimensional scores across Technical Correctness, Problem Solving, and Clarity.
4. Review the AI Advisory Disclaimer.
5. In Browser 2 (Candidate), click **Reports** in the navigation header to view candidate feedback.

---

## 7. Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| **Port 5000 or 5173 in use** | A dangling Node.js or Vite process is holding the TCP port. | In PowerShell, find and kill the process:<br>`Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`<br>`Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |
| **MySQL `ER_ACCESS_DENIED_ERROR`** | Invalid DB credentials or user host restrictions. | Verify `DB_USER` and `DB_PASS` in `.env`. Ensure your MySQL user has access: `GRANT ALL PRIVILEGES ON interview_platform.* TO 'root'@'localhost'; FLUSH PRIVILEGES;` |
| **Redis connection error (`ECONNREFUSED`)** | No local Redis daemon installed or active. | Set `ALLOW_INMEMORY_REDIS=true` and `REDIS_MOCK=true` in `.env`. The server automatically utilizes the bundled `InMemoryRedisMock` without requiring an external Redis service. |
| **Database migrations locked or out-of-sync** | Prior interrupted migration run left schema in an inconsistent state. | Drop and recreate the database, then re-run migrations:<br>`mysql -u root -p -e "DROP DATABASE IF EXISTS interview_platform; CREATE DATABASE interview_platform;"`<br>`npm run migrate --prefix server` |
| **JWT verification errors** | Secret keys are too short or mismatched. | Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env` are at least 32 characters long. You can generate secure keys using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| **CORS errors when accessing API** | `CLIENT_URL` does not match the frontend origin. | Ensure `CLIENT_URL=http://localhost:5173` or `http://127.0.0.1:5173` in `.env`. |

