# IntelliPrep AI — Security Architecture & Threat Model

This document outlines the security architecture, threat model, authorization controls, and cryptographic specifications governing **IntelliPrep AI**.

---

## 1. Role-Based Access Control (RBAC) & Permission Matrix

IntelliPrep AI enforces a strict three-tier RBAC model. Frontend route guards exist purely for UX; the backend evaluates authorization per-request via `requirePermission(...)` and ownership checks to prevent Insecure Direct Object References (IDOR).

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
- **Access Tokens**: Short-lived (15 minutes), signed using `HS256` with 32-byte minimum secret, carried in memory (never `localStorage`).
- **Refresh Tokens**: Long-lived (7 days), stored in secure `httpOnly`, `SameSite=Lax` cookies scoped to `/api/auth` and `/api/v1/auth`.
- **Token Families**: Each refresh token is assigned a `familyId` (UUIDv4) and persisted as a SHA-256 hash.
- **Replay Attack Mitigation**: If a previously revoked refresh token is presented, the system detects a token reuse attack, instantly revokes all active tokens in that `familyId`, writes a high-priority alert to `audit_logs`, and rejects the request with HTTP 401 (`TOKEN_REUSE_DETECTED`).

### B. Single-Use Cryptographic Invitations
- Public signup is restricted strictly to the `candidate` role.
- Privileged accounts (`interviewer`, `admin`) can only be registered with a 32-byte cryptographic token (`crypto.randomBytes(32)`).
- The database stores only the SHA-256 hash of the token (`tokenHash`).
- Invitations have a 48-hour expiration window, are single-use (`usedAt`), and can be revoked on-demand (`revokedAt`).

---

## 3. Assessment Security & Candidate Anti-Leak Guard

### A. Data Sanitization & Strict DTO Serialization
- **Reference Answers & Key Points**: Stored in `questions.referenceKeyPoints`. Strictly stripped from any HTTP or Socket response viewed by a candidate.
- **Hidden Test Cases**: Marked with `isHidden: true` in `test_cases`. Filtered out before candidate serialization; candidates receive only sample public test cases (`isHidden: false`).
- **Automated Regression Scanner**: Automated tests employ `scanPayloadForCandidateLeaks(payload)` to recursively scan candidate responses for any hidden fields or tokens, ensuring 0% data leakage.
- **Insecure Direct Object Reference (IDOR) Mitigation**: Assessments enforce candidate ownership checks. An authenticated candidate attempting to query another candidate's assessment receives HTTP 404 (`ASSESSMENT_NOT_FOUND`), preventing resource enumeration.


### C. Password Policy & Hashing
- Minimum password length: 10 characters.
- Hashing algorithm: `bcrypt` with 10 salt rounds.
- No plain-text passwords or secret credentials are ever logged or serialized in error payloads.

---

## 3. IDOR Prevention & Resource Scoping
- **Interviews**: Every interview retrieval (`GET /interviews/:id`) explicitly verifies that `req.user.id` equals `interview.interviewerId` or `interview.candidateId`. Non-participants receive `404 Not Found` (rather than `403`) to prevent resource enumeration.
- **Socket Rooms**: The `room:join` Socket.io event performs a database check confirming participant association and non-cancelled status before granting room socket admission.
- **Deactivated Accounts**: Deactivated users (`isActive: false`) have all refresh tokens immediately revoked and are denied access at both the HTTP middleware and Socket.io handshake levels.

