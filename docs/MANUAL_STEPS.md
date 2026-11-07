# IntelliPrep AI — Manual Steps & External Credentials Checklist

This document details every action and credential that the platform operator must configure for production or external integrations.

---

## 1. External Service Credentials & Keys

| Service / Variable | Purpose | Status in Platform | Required User Action |
|---|---|---|---|
| `GEMINI_API_KEY` | Powers AI mock interviews, answer evaluation, and resume parsing | Implemented with mock fallback & feature flag `AI_MOCK_MODE=true` | Obtain an API key from Google AI Studio / Vertex AI and set `GEMINI_API_KEY=...` in production `.env`. |
| `JUDGE0_ENDPOINT` / `JUDGE0_API_KEY` | Remote sandbox execution for Java, Python, C++, and JavaScript | Implemented with local sandbox mock and feature flag `CODE_EXECUTION_MOCK=true` | Configure Judge0 CE endpoint or RapidAPI credentials in production `.env`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial seed credentials for administrative dashboard access | Script provided (`npm run seed:admin`) | Set desired initial administrator credentials before running seed. |

---

## 2. Cloud Infrastructure & VM Setup
1. **VM Provisioning**: AWS EC2 or GCP Compute Engine instance (Ubuntu 24.04 LTS).
2. **DNS Record**: Point an `A` record from your domain registrar to the public VM IP.
3. **Firewall Rules**: Open ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).
4. **Environment File**: Copy `.env.example` to `.env` on the host and populate strong secrets using `openssl rand -hex 32`.
5. **Launch**: Execute `docker compose up -d --build`.

---

## 3. Production Safeguards & Demo Mode Overrides

| Environment Flag | Default in Production | Purpose | Required Action for Production Demo |
|---|---|---|---|
| `ALLOW_MOCK_PROVIDERS` | `false` | Prevents server boot if `AI_MOCK_MODE=true` or `EXECUTION_PROVIDER=mock`. | Set to `true` ONLY if running a live demo VM without live Gemini API or Judge0 keys. |
| `ALLOW_INMEMORY_REDIS` | `false` | Causes `/health/ready` to return 503 if Redis cluster is absent. | Set to `true` ONLY if running on a single VM without an external Redis instance. |


