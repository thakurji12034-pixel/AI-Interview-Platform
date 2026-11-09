# IntelliPrep AI — Security Architecture & Threat Model

This document outlines the security architecture, threat model, authorization controls, cryptographic specifications, and OWASP Top 10 API Security verification governing **IntelliPrep AI**.

---

## 1. Role-Based Access Control (RBAC) & Permission Matrix

IntelliPrep AI enforces a strict three-tier RBAC model (`candidate`, `interviewer`, `admin`). Frontend route guards exist purely for UX; the backend evaluates authorization per-request via `requirePermission(...)` and ownership checks to prevent Insecure Direct Object References (IDOR).

| Permission | Candidate | Interviewer | Admin | Description |
|---|:---:|:---:|:---:|---|
| `interview:view_self` | **Yes** | **Yes** | **Yes** | View interview details where user is candidate or interviewer |
| `interview:cancel_self` | **Yes** | **Yes** | **Yes** | Cancel a scheduled interview session |
| `coding_room:join` | **Yes** | **Yes** | **Yes** | Authenticate and participate in real-time Monaco coding room |
| `profile:manage_self` | **Yes** | **Yes** | **Yes** | View profile and update settings |
| `interview:schedule` | No | **Yes** | **Yes** | Create new interview sessions and invite candidates |
| `interview:edit` | No | **Yes** | **Yes** | Reschedule or adjust duration of scheduled sessions |
| `interview:start` | No | **Yes** | **Yes** | Transition session from `scheduled` to `in_progress` |
| `interview:complete` | No | **Yes** | **Yes** | Mark session as `completed` and close coding room |
| `candidate:view_roster` | No | **Yes** | **Yes** | Query registered candidate directory for scheduling |
| `feedback:submit` | No | **Yes** | **Yes** | Record evaluations and technical ratings |
| `questions:read` | No | **Yes** | **Yes** | View question bank items including reference solutions and hidden tests |
| `questions:write` | No | **Yes** | **Yes** | Create, update, archive, and manage questions and test cases |
| `assessments:read` | No | **Yes** | **Yes** | Read assessments across candidates |
| `assessments:write` | No | **Yes** | **Yes** | Generate assessments and assign question suites to candidates |
| `admin:access` | No | No | **Yes** | Access administrative console routes |
| `user:read_all` | No | No | **Yes** | Paginated directory of all registered accounts |
| `user:manage_role` | No | No | **Yes** | Mutate user roles (candidate, interviewer, admin) |
| `user:manage_status` | No | No | **Yes** | Activate or deactivate user accounts |
| `user:revoke_sessions` | No | No | **Yes** | Invalidate all active refresh tokens for a user |
| `invitation:create` | No | No | **Yes** | Generate cryptographic invitation tokens |
| `invitation:read` | No | No | **Yes** | View active, redeemed, and revoked invitations |
| `invitation:revoke` | No | No | **Yes** | Invalidate pending invitation tokens |
| `audit_log:read` | No | No | **Yes** | Search and filter immutable security audit logs |
| `settings:read` | No | No | **Yes** | Inspect global platform configuration |
| `settings:manage` | No | No | **Yes** | Update system parameters and feature flags |

---

## 2. Authentication & Cryptographic Specifications

### A. Token Family Rotation & Reuse Detection
- **Access Tokens**: Short-lived (15 minutes), signed using `HS256` with 32-byte minimum secret, carried in memory (never in `localStorage`).
- **Algorithm Pinning**: Strictly pinned to `algorithms: ['HS256']` in every `jwt.verify` call across auth middleware, refresh controller, and Socket.io handshake.
- **Refresh Tokens**: Long-lived (7 days), stored in secure `httpOnly`, `SameSite=Lax` cookies scoped to `/api/auth` and `/api/v1/auth`.
- **Token Families**: Each refresh token is assigned a `familyId` (UUIDv4) and persisted as a SHA-256 hash.
- **Replay Attack Mitigation**: If a previously revoked refresh token is presented, the system detects a token reuse attack, instantly revokes all active tokens in that `familyId`, writes a high-priority alert to `audit_logs`, and rejects the request with HTTP 401 (`TOKEN_REUSE_DETECTED`).

### B. Single-Use Cryptographic Invitations
- Public signup is restricted strictly to the `candidate` role.
- Privileged accounts (`interviewer`, `admin`) can only be registered with a 32-byte cryptographic token (`crypto.randomBytes(32)`).
- The database stores only the SHA-256 hash of the token (`tokenHash`).
- Invitations have a 48-hour expiration window, are single-use (`usedAt`), and can be revoked on-demand (`revokedAt`).

### C. Password Policy & Hashing
- Minimum password length: 8 characters.
- Hashing algorithm: `bcryptjs` with 10 salt rounds.
- No plain-text passwords or secret credentials are ever logged or serialized in error payloads.

---

## 3. OWASP Top 10 API Security (2023) Verification Checklist

| Risk Category | Protection Mechanism in IntelliPrep AI | Verification Status |
|---|---|:---:|
| **API1: Broken Object Level Authorization (BOLA)** | User ID and role ownership verified on every entity query (`interviews`, `assessments`, `sessions`, `evaluations`, `reports`). Non-participants receive `404 Not Found` (rather than `403`) to prevent resource enumeration. | **PASS** (Verified across 12 test suites) |
| **API2: Broken Authentication** | HS256 algorithm pinning, short-lived 15-minute access tokens, SHA-256 hashed refresh token families with automatic reuse detection, secure `httpOnly` cookie delivery, and distributed rate limiting. | **PASS** (Verified in `auth.test.js` & `redis.test.js`) |
| **API3: Broken Object Property Level Authorization** | Server-side DTO sanitization via `sanitizeCandidateQuestion()` and `scanPayloadForCandidateLeaks()`. Candidates never receive `referenceKeyPoints` or hidden test cases. | **PASS** (Verified in `question.test.js`) |
| **API4: Unrestricted Resource Consumption** | Distributed rate limiting via `rate-limit-redis` (login/register: 20 req/15m; execution: 30 req/min; AI calls: 20 req/min; snapshots: 3s debounce). Execution timeouts (2s) and memory limits (128MB). | **PASS** (Verified in `rateLimiter.js` & `redis.test.js`) |
| **API5: Broken Function Level Authorization (BFLA)** | Hierarchical RBAC verified via `requirePermission(...)` middleware before controller dispatch. Candidates cannot invoke question creation, evaluations, admin routes, or execution overrides. | **PASS** (Verified in `admin.test.js` & `analytics.test.js`) |
| **API6: Unrestricted Access to Sensitive Business Flows** | Single-use invitation tokens for interviewer/admin provisioning. Public registration cannot specify elevated roles. | **PASS** (Verified in `admin.test.js`) |
| **API7: Server-Side Request Forgery (SSRF)** | Judge0 and Gemini endpoints are server-configured environment variables, never accepted as user-supplied URLs. | **PASS** (Verified in `executionService.js` & `aiManager.js`) |
| **API8: Security Misconfiguration** | Helmet security headers with strict CSP, CORS aligned to single origin, `trust proxy` enabled behind reverse proxy, Docker containers running as non-root user `node`. | **PASS** (Verified in Dockerfile & `app.js`) |
| **API9: Improper Inventory Management** | Both `/api/v1/*` and legacy `/api/*` endpoints documented in OpenAPI 3.1 schema. Deprecated endpoints monitored. | **PASS** (Verified in `docs/api/openapi.yaml`) |
| **API10: Unsafe Consumption of APIs** | External Gemini LLM responses validated against JSON schemas; score calculations computed server-side from dimension weights rather than trusting LLM arithmetic. Pluggable fallback circuits. | **PASS** (Verified in `evaluationService.js`) |

---

## 4. Assessment Security & Candidate Anti-Leak Guard

- **Reference Key Points**: Stored in `questions.referenceKeyPoints`. Strictly stripped from any HTTP or Socket response viewed by a candidate.
- **Hidden Test Cases**: Marked with `isHidden: true` in `test_cases`. Filtered out before candidate serialization; candidates receive only sample public test cases (`isHidden: false`).
- **Automated Regression Scanner**: Automated tests employ `scanPayloadForCandidateLeaks(payload)` to recursively scan candidate responses for any hidden fields or tokens, ensuring 0% data leakage.
- **Insecure Direct Object Reference (IDOR) Mitigation**: Assessments enforce candidate ownership checks. An authenticated candidate attempting to query another candidate's assessment receives HTTP 404 (`ASSESSMENT_NOT_FOUND`).

---

## 5. Sandboxed Code Execution Security

- **Multi-Language Support**: Javascript, Python, Java, C++.
- **Execution Sandboxing**: Pluggable architecture supporting Judge0 API or isolated execution runners.
- **Limits Enforced**:
  - Max source code size: 50,000 characters.
  - CPU Wall Time Limit: 2.0 seconds (`timeLimitMs: 2000`).
  - Memory Limit: 128 MB (`memoryLimitKb: 128000`).
  - Rate Limiter: Max 30 code executions per minute per user.
- **Output Sanitization**: Stdout and stderr truncated to 10,000 characters to prevent buffer exhaustion attacks.

---

## 6. AI Engine Security & Prompt Injection Defense

- **System Instruction Isolation**: Core evaluator prompts are pinned server-side (`v1.0`) and isolated from candidate input.
- **XML Delimiter Isolation**: Untrusted candidate answers and code snippets are escaped and wrapped in strict `<candidate_answer>` and `<candidate_code>` tags to prevent prompt injection and instruction overrides.
- **Server-Authoritative Score Weighting**: Overall score is calculated on the server using deterministic weights ($35\%$ Correctness, $25\%$ Problem Solving, $20\%$ Explanation, $10\%$ Relevance, $10\%$ Communication), never trusting model arithmetic.
- **Human In The Loop (HITL)**: Interviewers can record overrides with reason notes, preserving raw AI evaluation telemetry intact.
- **Advisory Disclaimers**: Every AI-generated report carries an explicit advisory disclaimer stating recommendations are assistive and subject to human oversight.

---

## 7. Real-Time Collaborative CRDT & Observer Security

- **Authentication Handshake**: Socket connection requires valid Bearer JWT access token; unauthenticated sockets are immediately rejected.
- **Room Join Authorization**: Server validates database relationship before granting room socket admission.
- **Server-Authoritative Observer Protection**: Users with `observer` role receive synchronized document updates but their incoming edit packets are strictly dropped by `yjsHandler.js`, preventing tampering.
- **Snapshot Rate Limiting**: Automatic debounced snapshots (3-second debounce window) prevent snapshot flooding.
