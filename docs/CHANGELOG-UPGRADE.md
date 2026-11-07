# IntelliPrep AI — Upgrade Changelog & Dependency Justification

This document tracks all modifications, additions, replacements, and deletions across the phased upgrade of the repository from "AI Interview Platform" to "IntelliPrep AI".

---

## Dependency Policy & Standards
Every dependency added to `server/` or `client/` must be recorded here with:
- **Package Name & Version**
- **Purpose & Scope**
- **License** (Permissive OSI-approved: MIT, Apache-2.0, BSD-3-Clause)
- **Maintenance Status** (Active maintenance, download volume, release frequency)
- **Security Audit Result** (`npm audit` evaluation)

---

## Phase 0: Repository Audit & Baseline

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `docs/audit/AUDIT_REPORT.md` | ADD | Comprehensive repository, architecture, route, socket, database, and security baseline audit. | None | Phase 0 |

---

## Phase 1: Foundation, Quality & Deploy-Readiness

### Dependency Additions (Justification Table)

| Package | Version | Purpose | License | Maintenance Status | Audit Result |
|---|---|---|---|---|---|
| `pino` | ^9.x | High-performance, low-overhead JSON structured logging. | MIT | Actively maintained, >10M weekly downloads | 0 vulnerabilities |
| `pino-http` | ^10.x | Express middleware for request/response structured logging with auto-correlation IDs. | MIT | Actively maintained by Pino core team | 0 vulnerabilities |
| `umzug` | ^3.8.x | Lightweight, programmatic, database-agnostic migration framework for Sequelize. | MIT | Actively maintained by Sequelize organization | 0 vulnerabilities |

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `docs/CHANGELOG-UPGRADE.md` | ADD | Project change tracking and dependency audit registry. | None | Phase 1 |
| `server/src/config/env.js` | ADD | Schema validation of environment variables via Joi, preventing unsafe production configurations. | `server/src/server.js`, `server/src/app.js`, `server/src/config/db.js` | Phase 1a |
| `server/src/utils/logger.js` | ADD | Structured logging with Pino, request ID generation, and header/cookie/password redaction. | `server/src/app.js`, `server/src/middleware/errorHandler.js` | Phase 1a |
| `server/src/utils/AppError.js` | ADD | Centralized application error class with status codes and domain error codes. | `server/src/middleware/errorHandler.js` | Phase 1a |
| `server/src/scripts/createUser.js` | ADD | Idempotent CLI script for creating and updating interviewer/candidate accounts with secure password handling. | `server/package.json` | Phase 1a |
| `server/src/app.js` | MODIFY | Mounted versioned `/api/v1` routes with `/api` alias, added Pino HTTP logging, health endpoints, and centralized error handler. | `server/src/server.js` | Phase 1a |
| `server/src/server.js` | MODIFY | Integrated validated env config, disabled sync outside test mode, and added graceful shutdown. | None | Phase 1a |
| `server/src/config/db.js` | MODIFY | Connected using validated config and added connection pooling parameters. | Models | Phase 1a |
| `server/src/controllers/authController.js` | MODIFY | Pinned algorithms to HS256, restricted public signup to candidates, translated Hinglish comments. | `server/src/routes/authRoutes.js` | Phase 1a |
| `server/src/controllers/interviewController.js` | MODIFY | Standardized error response shape and translated Hinglish comments. | `server/src/routes/interviewRoutes.js` | Phase 1a |
| `server/src/middleware/auth.js` | MODIFY | Pinned JWT verification algorithms to HS256. | Route files | Phase 1a |
| `server/src/middleware/authorize.js` | MODIFY | Standardized forbidden error response format. | Route files | Phase 1a |
| `server/src/middleware/errorHandler.js` | MODIFY | Formatted error payload to `{ error: { code, message, details? } }` with backwards compatibility. | `server/src/app.js` | Phase 1a |
| `server/src/middleware/validate.js` | MODIFY | Standardized validation failure output. | Route files | Phase 1a |
| `server/src/sockets/index.js` | MODIFY | Pinned JWT verification to HS256 and translated Hinglish comments. | `server/src/server.js` | Phase 1a |
| `server/src/validators/authValidator.js` | MODIFY | Enforced password min length 10 and restricted public roles to candidate. | `server/src/controllers/authController.js` | Phase 1a |
| `server/scripts/socketTest.js` | MODIFY | Translated comments and verified against updated server endpoints. | None | Phase 1a |
| `client/package.json` | MODIFY | Added npm override for `dompurify` (^3.4.17) resolving the critical vulnerability. | `client/package-lock.json` | Phase 1a |
| `client/src/api/http.js` | MODIFY | Base URL updated to `/api/v1` and translated Hinglish comments. | Client API calls | Phase 1a |
| `client/src/api/socket.js` | MODIFY | Translated Hinglish comments to professional English. | Coding room | Phase 1a |
| `client/src/context/AuthContext.jsx` | MODIFY | Translated Hinglish comments to professional English. | Client app | Phase 1a |
| `client/src/pages/Dashboard.jsx` | MODIFY | Translated Hinglish comments to professional English. | Dashboard | Phase 1a |
| `client/src/pages/Room.jsx` | MODIFY | Translated Hinglish comments to professional English. | Coding room | Phase 1a |
| `server/jest.config.js` | ADD | Configured Jest runner with setup scripts, test timeout, and execution settings. | `server/package.json` | Phase 1b |
| `server/tests/setup.js` | ADD | Test initialization with strict database safety guard (refuses to run unless DB ends in `_test`). | Test suites | Phase 1b |
| `server/tests/auth.test.js` | ADD | 9 automated integration tests covering full authentication and token rotation flows. | Test runner | Phase 1b |
| `server/tests/interview.test.js` | ADD | 18 automated integration tests covering interview scheduling, conflict checking, and state transitions. | Test runner | Phase 1b |
| `server/tests/socket.test.js` | ADD | 11 automated real-time Socket.io tests on ephemeral port covering auth, syncing, boundaries, and reconnection. | Test runner | Phase 1b |
| `server/src/routes/authRoutes.js` | MODIFY | Skipped rate limiting during `NODE_ENV=test` to prevent test runner throttling. | Auth endpoints | Phase 1b |
| `server/package.json` | MODIFY | Added Jest test runner script and devDependencies (`jest`, `supertest`). | Test execution | Phase 1b |
| `server/src/config/migrator.js` | ADD | Umzug migration runner factory and default instance using Sequelize. | Migration scripts | Phase 1c |
| `server/src/migrations/001_baseline_schema.js` | ADD | Idempotent baseline schema migration with unique roomId index and performance indexes. | Migration runner | Phase 1c |
| `server/src/scripts/migrate.js` | ADD | CLI runner for applying, reverting, and inspecting migration status. | `server/package.json` | Phase 1c |
| `server/src/scripts/testMigrationSafe.js` | ADD | Migration safety verification suite tested on restored pre-intelliprep backup copy. | Test / Verification | Phase 1c |
| `server/package.json` | MODIFY | Added `db:migrate`, `db:migrate:undo`, and `db:migrate:status` npm scripts. | Developer CLI | Phase 1c |
| `server/Dockerfile` | MODIFY | Hardened container execution with non-root `USER node` and `/app` ownership. | Container security | Phase 1d |
| `docker-compose.yml` | MODIFY | Added automated pending migration execution on container startup. | Orchestration | Phase 1d |
| `.github/workflows/ci.yml` | ADD | GitHub Actions CI with TruffleHog secret scanning, lint, audit, MySQL service tests, and build. | CI/CD | Phase 1d |
| `.github/workflows/deploy.yml` | ADD | Manual workflow_dispatch SSH deployment automation using repository secrets. | CI/CD | Phase 1d |
| `.github/dependabot.yml` | ADD | Weekly automated dependency scanning configuration for server, client, and actions. | Security | Phase 1d |
| `server/eslint.config.js` | ADD | Modern ESLint flat configuration for backend Node.js 22. | Code quality | Phase 1d |
| `server/.env.example` | MODIFY | Documented dev interviewer registration override flag. | Configuration | Phase 1d |
| `DEPLOY.md` | MODIFY | Documented `npm run user:create` CLI for production interviewer provisioning and `/health/*` probes. | Documentation | Phase 1d |
| `README.md` | MODIFY | Updated API base path to `/api/v1`, documented migration and automated test execution. | Documentation | Phase 1d |
| `docs/verification/phase-1.md` | ADD | Comprehensive Phase 1 verification report with exact execution output and test counts. | Documentation | Phase 1d |

---

## Phase 2: RBAC, Invitations, Admin Core, Audit Logs, Design System & Role Dashboards

### Dependency Additions (Justification Table)

| Package | Version | Purpose | License | Maintenance Status | Audit Result |
|---|---|---|---|---|---|
| `lucide-react` | ^1.16.0 | Modern, lightweight, accessible icon set for role dashboards and navigation. | ISC | Actively maintained, >5M weekly downloads | 0 vulnerabilities |

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/migrations/002_rbac_invitations_audit_tokens.js` | ADD | Migration creating `invitations`, `refresh_tokens`, `audit_logs`, and `platform_settings` tables, and adding `isActive` and `admin` role. | Umzug migrator | Phase 2a |
| `server/src/models/User.js` | MODIFY | Added `admin` to role ENUM and added `isActive` boolean column. | User model | Phase 2a |
| `server/src/models/Invitation.js` | ADD | Model tracking role invitation tokens, expiration, redemption, and inviter association. | Models index | Phase 2a |
| `server/src/models/RefreshToken.js` | ADD | Model tracking token families (`familyId`), SHA-256 hashes, user agent, IP, and revocation status. | Models index | Phase 2a |
| `server/src/models/AuditLog.js` | ADD | Model tracking system-wide administrative actions, targets, details, and client metadata. | Models index | Phase 2a |
| `server/src/models/PlatformSetting.js` | ADD | Model storing dynamic platform settings with typed validation. | Models index | Phase 2a |
| `server/src/scripts/seedAdmin.js` | ADD | Idempotent CLI script for initializing or restoring the primary administrator account. | `server/package.json` | Phase 2a |
| `server/src/config/permissions.js` | ADD | Granular RBAC permission matrix for candidate, interviewer, and admin roles. | Permission middleware | Phase 2b |
| `server/src/middleware/permission.js` | ADD | Middleware verifying authenticated user active status and assigned role permissions. | Route definitions | Phase 2b |
| `server/src/services/authService.js` | ADD | Token family generation, replay detection with full-family revocation, and invitation token redemption. | Auth and admin controllers | Phase 2b |
| `server/src/services/auditService.js` | ADD | Structured logging of administrative and security events to `audit_logs` table. | Admin controller | Phase 2b |
| `server/src/controllers/adminController.js` | ADD | Controller for user directory, status toggle, role change, session termination, invitations, audit logs, and settings. | Admin routes | Phase 2b |
| `server/src/routes/adminRoutes.js` | ADD | Admin REST endpoints mounted at `/api/v1/admin`. | `server/src/app.js` | Phase 2b |
| `server/src/controllers/authController.js` | MODIFY | Added token family creation, token reuse detection handler, and invitation redemption. | Auth routes | Phase 2b |
| `server/tests/admin.test.js` | ADD | 13 automated integration tests verifying RBAC, user management, self-demotion prevention, invitations, and token reuse revocation. | Test runner | Phase 2b |
| `client/src/context/ThemeContext.jsx` | ADD | Dark/light/system theme provider with persistent storage and system preference listener. | Client application | Phase 2c |
| `client/src/context/useTheme.js` | ADD | Standalone theme consumer hook adhering to React Refresh rules. | Theme consumers | Phase 2c |
| `client/src/context/ToastContext.jsx` | ADD | Context and state provider for accessible, auto-dismissing toast notifications. | Client application | Phase 2c |
| `client/src/context/useToast.js` | ADD | Standalone toast consumer hook adhering to React Refresh rules. | Toast consumers | Phase 2c |
| `client/src/components/ui/Button.jsx` | ADD | Accessible button primitive with primary, secondary, danger, and ghost variants. | UI components | Phase 2c |
| `client/src/components/ui/Badge.jsx` | ADD | Status badge primitive for role and interview statuses. | UI components | Phase 2c |
| `client/src/components/ui/Modal.jsx` | ADD | Accessible modal dialog with backdrop dismiss and escape key handler. | UI components | Phase 2c |
| `client/src/components/ui/SkeletonLoader.jsx` | ADD | Animated shimmer loader component for async state loading. | UI components | Phase 2c |
| `client/src/components/ui/EmptyState.jsx` | ADD | Consistent empty state container with icon and action button. | UI components | Phase 2c |
| `client/src/components/layout/AppShell.jsx` | ADD | Modern responsive layout shell with navigation bar, role badge, theme switcher, and logout. | App pages | Phase 2c |
| `client/src/features/dashboard/CandidateDashboard.jsx` | ADD | Candidate dashboard with upcoming/past interviews, room launcher, and stats. | Dashboard page | Phase 2c |
| `client/src/features/dashboard/InterviewerDashboard.jsx` | ADD | Interviewer dashboard with schedule modal, candidate selection, status controls, and metrics. | Dashboard page | Phase 2c |
| `client/src/features/admin/AdminDashboard.jsx` | ADD | Admin panel with user management, status toggles, invitation generator, audit log viewer, and settings. | Dashboard page | Phase 2c |
| `client/src/pages/AcceptInvite.jsx` | ADD | Dedicated onboarding page for accepting and redeeming role invitation tokens. | App router | Phase 2c |
| `client/src/pages/Dashboard.jsx` | MODIFY | Converted to role-based dispatcher rendering Candidate, Interviewer, or Admin dashboard. | App router | Phase 2c |
| `docs/verification/phase-2.md` | ADD | Comprehensive Phase 2 verification report with exact execution output and test counts. | Documentation | Phase 2d |

---

## Phase 3: Redis & Background Job Infrastructure

### Dependency Additions (Justification Table)

| Package | Version | Purpose | License | Maintenance Status | Audit Result |
|---|---|---|---|---|---|
| `ioredis` | ^5.6.x | Robust, full-featured Redis client supporting auto-reconnect, failover, and pipeline batching. | MIT | Actively maintained, >15M weekly downloads | 0 vulnerabilities |
| `bullmq` | ^5.41.x | Enterprise distributed message queue for asynchronous job execution, exponential backoff, and progress tracking. | MIT | Actively maintained by Taskforce.sh | 0 vulnerabilities |
| `rate-limit-redis` | ^4.2.x | Official Redis store for `express-rate-limit` enabling atomic distributed rate limiting across processes. | MIT | Actively maintained | 0 vulnerabilities |

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/config/env.js` | MODIFY | Added Redis configuration (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_MOCK`, `REDIS_ENABLED`). | `server/src/config/redis.js` | Phase 3a |
| `server/.env.example` | MODIFY | Added documented Redis configuration variables for local and production deployment. | Configuration | Phase 3a |
| `.env.example` | MODIFY | Added production Docker Redis environment definitions. | Compose setup | Phase 3a |
| `server/src/config/redis.js` | ADD | Redis connection manager with `ioredis`, fail-fast non-blocking offline queues, health checks, and in-memory mock fallback. | Cache, worker, queues, server | Phase 3a |
| `server/src/services/cacheService.js` | ADD | Application cache service with explicit TTLs, JSON serialization, and pattern-based key invalidation. | Future services & controllers | Phase 3a |
| `server/src/jobs/queueManager.js` | ADD | Central BullMQ queue registry (`code-execution`, `ai-evaluation`, `resume-parsing`) with standardized retry backoff and mock queue adapter. | Worker & future controllers | Phase 3a |
| `server/src/worker.js` | ADD | Dedicated background job worker runner with modular processors and graceful shutdown. | `server/package.json`, Docker Compose | Phase 3a |
| `server/src/middleware/rateLimiter.js` | ADD | Distributed rate limiter with atomic `rate-limit-redis` store and automatic memory store fallback. | `server/src/routes/authRoutes.js` | Phase 3a |
| `server/src/routes/authRoutes.js` | MODIFY | Switched inline rate limiters to centralized `rateLimiter.js`. | Auth endpoints | Phase 3a |
| `server/src/app.js` | MODIFY | Upgraded `/health/ready` probe to evaluate both MySQL and Redis health simultaneously. | Health probes | Phase 3a |
| `server/src/server.js` | MODIFY | Added Redis and Queue cleanup to graceful shutdown handler. | Process management | Phase 3a |
| `docker-compose.yml` | MODIFY | Added `redis:7-alpine` service, `worker` service, and `redis_data` volume. | Container orchestration | Phase 3a |
| `server/tests/redis.test.js` | ADD | 10 automated integration tests covering Redis client, health probes, cache service, and BullMQ queue processing. | Test runner | Phase 3a |
| `docs/verification/phase-3.md` | ADD | Comprehensive Phase 3 verification report with exact execution output and test counts. | Documentation | Phase 3b |


