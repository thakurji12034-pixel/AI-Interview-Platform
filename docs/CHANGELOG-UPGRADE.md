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
