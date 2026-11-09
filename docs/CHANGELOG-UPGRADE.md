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

---

## Phase 4: Question Bank, Templates & Assessments

### Dependency Additions (Justification Table)

No external production dependencies added in Phase 4 (implemented using core Sequelize models, Umzug migrations, and native transaction handlers).

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/migrations/003_questions_and_assessments.js` | ADD | Schema migration creating `questions`, `question_topics`, `test_cases`, `interview_templates`, `assessments`, and `assessment_questions` tables with indexes. | Umzug migrator | Phase 4a |
| `server/src/models/Question.js` | ADD | Sequelize model for technical questions supporting 10 domains, markdown statements, difficulty, type, and starter code. | Models index | Phase 4a |
| `server/src/models/QuestionTopic.js` | ADD | Sequelize model for indexing topic tags associated with questions. | Models index | Phase 4a |
| `server/src/models/TestCase.js` | ADD | Sequelize model storing public and hidden test cases with execution limits and weights. | Models index | Phase 4a |
| `server/src/models/InterviewTemplate.js` | ADD | Sequelize model for structured multi-section interview templates. | Models index | Phase 4a |
| `server/src/models/Assessment.js` | ADD | Sequelize model tracking candidate technical assessments and overall completion scores. | Models index | Phase 4a |
| `server/src/models/AssessmentQuestion.js` | ADD | Sequelize model linking assessment questions, candidate code submissions, and question statuses. | Models index | Phase 4a |
| `server/src/models/index.js` | MODIFY | Registered models and configured relational associations. | Application models | Phase 4a |
| `server/src/serializers/questionSerializer.js` | ADD | DTO serializer enforcing role-based filtering and candidate anti-leak guard stripping hidden test cases and reference key points. | Controllers & tests | Phase 4a |
| `server/src/services/questionService.js` | ADD | Question CRUD, filtering, pagination with 100-limit cap, and randomized selection avoiding past candidate encounters. | Question controller | Phase 4a |
| `server/src/services/templateService.js` | ADD | Template management service for multi-section assessment blueprints. | Assessment service | Phase 4a |
| `server/src/services/assessmentService.js` | ADD | Assessment lifecycle manager with randomized template expansion and submission tracking. | Assessment controller | Phase 4a |
| `server/src/controllers/questionController.js` | ADD | REST controller for question bank operations with audit logging. | Question routes | Phase 4a |
| `server/src/routes/questionRoutes.js` | ADD | Express router mounted at `/api/v1/questions` with permission middleware. | `server/src/app.js` | Phase 4a |
| `server/src/controllers/assessmentController.js` | ADD | REST controller for assessment generation and candidate submissions. | Assessment routes | Phase 4a |
| `server/src/routes/assessmentRoutes.js` | ADD | Express router mounted at `/api/v1/assessments` with IDOR ownership validation. | `server/src/app.js` | Phase 4a |
| `server/src/scripts/seedQuestions.js` | ADD | Idempotent starter question seeder across all 10 technical domains. | `server/package.json` | Phase 4a |
| `server/src/config/permissions.js` | MODIFY | Added granular permissions for questions (`questions:read`, `questions:write`) and assessments (`assessments:read`, `assessments:write`). | Permission middleware | Phase 4a |
| `server/src/app.js` | MODIFY | Mounted versioned routers `/api/v1/questions` and `/api/v1/assessments`. | Application router | Phase 4a |
| `server/tests/question.test.js` | ADD | 8 automated integration tests verifying CRUD, filters, randomized selection, assessment workflows, and candidate anti-leak regression scanner. | Test runner | Phase 4a |
| `docs/verification/phase-4.md` | ADD | Comprehensive Phase 4 verification report with exact execution output and test counts. | Documentation | Phase 4b |

---

## Phase 5: Secure Code Execution

### Dependency Additions (Justification Table)

No external production dependencies added in Phase 5 (implemented using standard Node.js native fetch / HTTP communication, existing BullMQ queue worker infrastructure, and isolated sandbox mock providers).

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/migrations/004_code_execution_submissions.js` | ADD | Schema migration creating `submissions` table with execution statuses, resource metrics, and testResults JSON. | Umzug migrator | Phase 5a |
| `server/src/models/Submission.js` | ADD | Sequelize model tracking code execution submissions, language, pass/fail counts, and normalized status. | Models index | Phase 5a |
| `server/src/models/index.js` | MODIFY | Associated `Submission` with `User`, `Question`, and `Assessment`. | Application models | Phase 5a |
| `server/src/services/execution/CodeExecutionProvider.js` | ADD | Abstract base interface for pluggable multi-language code execution engines. | Execution adapters | Phase 5a |
| `server/src/services/execution/Judge0Adapter.js` | ADD | Production Judge0 API adapter with normalized status mapping, output truncation (10k chars), and network isolation. | Execution factory | Phase 5a |
| `server/src/services/execution/MockExecutionProvider.js` | ADD | Deterministic sandbox execution mock for tests and offline development simulating all error statuses. | Execution factory | Phase 5a |
| `server/src/services/execution/index.js` | ADD | Execution factory resolving active provider based on environment, with defined source/time/memory limits. | Submission service, worker | Phase 5a |
| `server/src/services/submissionService.js` | ADD | Submission submission service enforcing 50k character limits, language validation, candidate anti-leak serialization, and BullMQ enqueuing. | Submission controller | Phase 5a |
| `server/src/controllers/submissionController.js` | ADD | REST controller for code execution submissions and status polling. | Submission routes | Phase 5a |
| `server/src/routes/submissionRoutes.js` | ADD | Express router mounted at `/api/v1/submissions` with authentication and rate limiting. | `server/src/app.js` | Phase 5a |
| `server/src/worker.js` | MODIFY | Added `processCodeExecution` BullMQ consumer running test cases against execution provider and updating submissions. | Worker service | Phase 5a |
| `server/src/config/env.js` | MODIFY | Added schema validation for Judge0 configuration variables (`JUDGE0_ENDPOINT`, `JUDGE0_API_KEY`). | Env config | Phase 5a |
| `server/.env.example` | MODIFY | Documented Judge0 execution engine configuration variables. | Environment templates | Phase 5a |
| `server/tests/execution.test.js` | ADD | 9 automated integration tests verifying language mappings, input length limits, execution transitions, status normalization, candidate privacy, and IDOR protection. | Test runner | Phase 5a |
| `docs/verification/phase-5.md` | ADD | Comprehensive Phase 5 verification report with exact execution output and test counts. | Documentation | Phase 5b |

---

## Phase 6: AI Engine & Resume Intelligence

### Dependency Additions (Justification Table)

| Package | Version | Purpose | License | Maintenance Status | Audit Result |
|---|---|---|---|---|---|
| `@google/genai` | ^3.0.0 | Official Google Gen AI SDK for Node.js powering Gemini models. | Apache-2.0 | Actively maintained by Google | 0 high/critical vulnerabilities |
| `multer` | ^2.5.0 | Express multipart/form-data middleware handling secure binary resume file uploads. | MIT | Actively maintained | 0 high/critical vulnerabilities |
| `unpdf` | ^2.1.0 | Universal, zero-dependency PDF text extraction library built on PDF.js. | MIT | Actively maintained by unjs | 0 high/critical vulnerabilities |

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/migrations/005_ai_engine_and_resumes.js` | ADD | Schema migration creating `ai_usage`, `interview_sessions`, `session_questions`, `answers`, `resumes`, and `candidate_skills` tables with indexes. | Umzug migrator | Phase 6a |
| `server/src/models/AiUsage.js` | ADD | Sequelize model tracking AI token usage, latency, purpose, model, and operational status. | Models index | Phase 6a |
| `server/src/models/InterviewSession.js` | ADD | Sequelize model managing timed interview sessions, difficulty, score, and summary. | Models index | Phase 6a |
| `server/src/models/SessionQuestion.js` | ADD | Sequelize model tracking ordered session questions and adaptive follow-up hierarchy. | Models index | Phase 6a |
| `server/src/models/Answer.js` | ADD | Sequelize model storing candidate answers, code submissions, and timing. | Models index | Phase 6a |
| `server/src/models/Resume.js` | ADD | Sequelize model managing resume metadata, storage pointers, and parsed JSON profiles. | Models index | Phase 6a |
| `server/src/models/CandidateSkill.js` | ADD | Sequelize model maintaining candidate skill profiles, categories, proficiency, and verification status. | Models index | Phase 6a |
| `server/src/models/index.js` | MODIFY | Associated all Phase 6 models with User and Question relational graphs. | Application models | Phase 6a |
| `server/src/ai/AiProvider.js` | ADD | Abstract interface definition for pluggable AI generation engines. | Adapters | Phase 6a |
| `server/src/ai/GeminiAdapter.js` | ADD | Official Google Gen AI SDK adapter with request timeouts, structured JSON parsing, and token tracking. | AI factory | Phase 6a |
| `server/src/ai/MockAiProvider.js` | ADD | Deterministic AI sandbox mock with prompt-injection resilience for offline testing. | AI factory | Phase 6a |
| `server/src/ai/index.js` | ADD | AI manager with circuit breaker, response caching, fallback orchestration, and usage logging. | Services | Phase 6a |
| `server/src/ai/prompts/technicalQuestionPrompt.js` | ADD | Versioned technical question prompt template (v1.0) with candidate input safety delimiters. | AI manager | Phase 6a |
| `server/src/ai/prompts/behavioralQuestionPrompt.js` | ADD | Versioned behavioral question prompt template (v1.0) implementing STAR methodology. | AI manager | Phase 6a |
| `server/src/ai/prompts/followUpQuestionPrompt.js` | ADD | Versioned adaptive follow-up prompt template (v1.0) probing candidate response depth. | AI manager | Phase 6a |
| `server/src/ai/prompts/sessionSummaryPrompt.js` | ADD | Versioned holistic session evaluation prompt template (v1.0) generating scores and recommendations. | AI manager | Phase 6a |
| `server/src/ai/prompts/resumeExtractionPrompt.js` | ADD | Versioned resume extraction prompt template (v1.0) extracting structured talent data. | Resume service | Phase 6a |
| `server/src/services/storage/StorageProvider.js` | ADD | Abstract storage provider interface for candidate document assets. | Storage implementations | Phase 6a |
| `server/src/services/storage/LocalStorageProvider.js` | ADD | Local filesystem storage implementation storing resumes in isolated directory outside web root. | Storage factory | Phase 6a |
| `server/src/services/storage/index.js` | ADD | Storage provider singleton resolver. | Resume service | Phase 6a |
| `server/src/services/skillTaxonomy.js` | ADD | Canonical technical skill taxonomy and normalization dictionary. | Resume service | Phase 6a |
| `server/src/services/resumeService.js` | ADD | Resume upload validation, magic byte (%PDF-) verification, unpdf extraction, taxonomy normalization, job matching, and privacy deletion. | Resume controller, worker | Phase 6a |
| `server/src/services/sessionService.js` | ADD | Session configuration, server-authoritative timers, answer submission, adaptive follow-ups, and holistic completion. | Session controller | Phase 6a |
| `server/src/controllers/resumeController.js` | ADD | REST controller for resume uploads, retrieval, deletion, and job description matching. | Resume routes | Phase 6a |
| `server/src/routes/resumeRoutes.js` | ADD | Express router mounted at `/api/v1/resumes` with Multer 5MB limits and auth protection. | `server/src/app.js` | Phase 6a |
| `server/src/controllers/sessionController.js` | ADD | REST controller for interview session lifecycle and adaptive answers. | Session routes | Phase 6a |
| `server/src/routes/sessionRoutes.js` | ADD | Express router mounted at `/api/v1/sessions`. | `server/src/app.js` | Phase 6a |
| `server/src/worker.js` | MODIFY | Added `processResumeParsing` BullMQ consumer calling `resumeService.processResumeParsing`. | Worker runner | Phase 6a |
| `server/src/config/env.js` | MODIFY | Added schema validation for Gemini variables (`GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_MOCK_MODE`). | Env config | Phase 6a |
| `server/.env.example` | MODIFY | Documented AI engine configuration variables. | Environment templates | Phase 6a |
| `.gitignore` | MODIFY | Excluded physical `/server/storage/` folder while preserving `.gitkeep`. | Git tracking | Phase 6a |
| `server/tests/ai.test.js` | ADD | 8 automated integration tests verifying prompt security, AI manager usage logging, session lifecycle, timer expiry, adaptive follow-ups, and IDOR protection. | Test runner | Phase 6a |
| `server/tests/resume.test.js` | ADD | 7 automated integration tests verifying %PDF- magic bytes, upload validation, background extraction, taxonomy normalization, job matching, deletion privacy, and IDOR protection. | Test runner | Phase 6a |
| `docs/verification/phase-6.md` | ADD | Comprehensive Phase 6 verification report with exact execution output and test counts. | Documentation | Phase 6b |






---

## Phase 7: AI Answer Evaluation & Reports

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/migrations/006_evaluations_and_reports.js` | ADD | Schema migration creating `evaluations`, `evaluation_overrides`, and `interview_reports` tables with indexes. | Umzug migrator | Phase 7a |
| `server/src/models/Evaluation.js` | ADD | Sequelize model storing AI rubric evaluations across 5 dimensions, raw JSON, and advisory disclaimers. | Models index | Phase 7a |
| `server/src/models/EvaluationOverride.js` | ADD | Sequelize model storing human interviewer evaluation overrides and notes with audit preservation. | Models index | Phase 7a |
| `server/src/models/InterviewReport.js` | ADD | Sequelize model storing holistic interview reports synthesizing AI scores with verified code execution facts and telemetry timings. | Models index | Phase 7a |
| `server/src/models/index.js` | MODIFY | Linked Evaluation, EvaluationOverride, and InterviewReport into relational associations. | Application models | Phase 7a |
| `server/src/ai/prompts/answerEvaluationPrompt.js` | ADD | Versioned answer evaluation prompt template (v1.0) defining 5 rubric dimensions and score constraints. | AI manager | Phase 7a |
| `server/src/services/evaluationService.js` | ADD | Evaluation generation with server-authoritative weighting, advisory disclaimer enforcement, human override management, and verified telemetry report synthesis. | Controllers, worker | Phase 7a |
| `server/src/controllers/evaluationController.js` | ADD | REST controller handling async evaluation triggers, retrieval, and interviewer overrides. | Evaluation routes | Phase 7a |
| `server/src/routes/evaluationRoutes.js` | ADD | Express router mounted at `/api/v1/evaluations` with RBAC permissions. | `server/src/app.js` | Phase 7a |
| `server/src/controllers/reportController.js` | ADD | REST controller handling interview report generation and session report retrieval. | Report routes | Phase 7a |
| `server/src/routes/reportRoutes.js` | ADD | Express router mounted at `/api/v1/reports`. | `server/src/app.js` | Phase 7a |
| `server/src/worker.js` | MODIFY | Added `processAiEvaluation` queue consumer calling `evaluationService.processAnswerEvaluation`. | Worker runner | Phase 7a |
| `server/tests/evaluation.test.js` | ADD | 8 automated integration tests verifying server-authoritative score weighting, async evaluations, human overrides, disclaimer presence, telemetry synthesis, and IDOR protection. | Test runner | Phase 7a |
| `docs/verification/phase-7.md` | ADD | Comprehensive Phase 7 verification report with exact execution output and test counts. | Documentation | Phase 7b |

---

## Phase 8: Yjs Collaborative Editor & Snapshots

### Dependency Additions (Justification Table)

| Package | Version | Purpose | License | Maintenance Status | Audit Result |
|---|---|---|---|---|---|
| `yjs` (server & client) | ^13.6.33 | High-performance Conflict-free Replicated Data Type (CRDT) engine for real-time document synchronization. | MIT | Actively maintained, >1.5M weekly downloads | 0 high/critical vulnerabilities |
| `y-monaco` (client) | ^0.1.6 | Direct binding syncing Yjs text types with Monaco Editor models and remote cursors. | MIT | Maintained by Yjs ecosystem | 0 vulnerabilities |
| `monaco-editor` (client) | ^0.57.0 | Self-hosted Monaco core editor bundled locally to enforce strict CSP without external CDNs. | MIT | Microsoft official release | 0 vulnerabilities |
| `y-protocols` (client) | ^1.0.6 | Binary awareness and synchronization protocols for remote collaborative awareness states. | MIT | Maintained by Yjs ecosystem | 0 vulnerabilities |

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/migrations/007_collaborative_editor_snapshots.js` | ADD | Schema migration creating `code_snapshots` and `room_sessions` tables with indexes. | Umzug migrator | Phase 8a |
| `server/src/models/CodeSnapshot.js` | ADD | Sequelize model managing persistent code snapshot history, versions, and raw Yjs update BLOBs. | Models index | Phase 8a |
| `server/src/models/RoomSession.js` | ADD | Sequelize model logging room join and departure events and duration metrics. | Models index | Phase 8a |
| `server/src/models/index.js` | MODIFY | Linked CodeSnapshot and RoomSession with Interview and User models. | Application models | Phase 8a |
| `server/src/config/env.js` | MODIFY | Added `COLLAB_ENGINE` feature flag (legacy vs yjs). | Env config | Phase 8a |
| `server/.env.example` | MODIFY | Documented `COLLAB_ENGINE` configuration flag. | Environment templates | Phase 8a |
| `server/src/sockets/roomStore.js` | ADD | Centralized in-memory Y.Doc room store with debounced snapshot persistence, session tracking, and rate limiting. | Socket layer | Phase 8a |
| `server/src/sockets/yjsHandler.js` | ADD | Yjs Socket.io transport layer supporting 2-step sync, CRDT updates, awareness relay, observer protection, and legacy event interop. | Socket layer | Phase 8a |
| `server/src/sockets/index.js` | MODIFY | Delegated socket initialization to `initYjsSockets` or legacy engine based on feature flag. | Server entry | Phase 8a |
| `server/src/controllers/interviewController.js` | MODIFY | Added endpoints for snapshot retrieval, manual capture, completion snapshot saves, and room sessions timeline. | Interview routes | Phase 8a |
| `server/src/routes/interviewRoutes.js` | MODIFY | Mounted routes `/api/v1/interviews/:id/snapshots` and `/api/v1/interviews/:id/room-sessions`. | `server/src/app.js` | Phase 8a |
| `client/src/config/monaco.js` | ADD | Local Monaco configuration binding `loader.config({ monaco })` for CDN-free offline editor loading. | Client app | Phase 8a |
| `client/src/pages/Room.jsx` | MODIFY | Replaced last-write-wins with Yjs `MonacoBinding`, added observer read-only enforcement, snapshot timeline drawer, and manual snapshot trigger. | Coding room | Phase 8a |
| `client/vite.config.js` | MODIFY | Added module alias resolving Monaco internal paths for Rolldown bundler compatibility. | Build pipeline | Phase 8a |
| `server/tests/collab.test.js` | ADD | 13 automated integration tests verifying handshake auth, Yjs sync, CRDT convergence, language sync, observer restrictions, debounced snapshots, and room session telemetry. | Test runner | Phase 8a |
| `docs/verification/phase-8.md` | ADD | Comprehensive Phase 8 verification report with exact execution output and test counts. | Documentation | Phase 8b |

---

## Phase 9: Role-Scoped Analytics & Performance Visualizations

### Dependency Additions (Justification Table)

| Package | Version | Purpose | License | Maintenance Status | Audit Result |
|---|---|---|---|---|---|
| `recharts` (client) | ^2.15.x | Accessible React visualization library for area, bar, and metric charts. | MIT | Actively maintained, >2M weekly downloads | 0 high/critical vulnerabilities |

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `server/src/services/analyticsService.js` | ADD | Role-scoped aggregate metrics service for candidate score histories, interviewer rubric distributions, admin user velocities, and Redis caching. | `server/src/controllers/analyticsController.js` | Phase 9a |
| `server/src/controllers/analyticsController.js` | ADD | Controller handling authorization and parameter dispatch for candidate, interviewer, and admin analytics. | `server/src/routes/analyticsRoutes.js` | Phase 9a |
| `server/src/routes/analyticsRoutes.js` | ADD | REST API routes mounted under `/api/v1/analytics` and `/api/analytics`. | `server/src/app.js` | Phase 9a |
| `server/src/app.js` | MODIFY | Mounted analytics routes into Express application. | Server entry | Phase 9a |
| `client/src/components/analytics/ScoreProgressionChart.jsx` | ADD | Accessible AreaChart displaying candidate historical scores over time with data table fallback. | Candidate dashboard | Phase 9a |
| `client/src/components/analytics/SkillRadarChart.jsx` | ADD | Accessible horizontal bar chart displaying assessed skills and verification status with data table fallback. | Candidate dashboard | Phase 9a |
| `client/src/components/analytics/ScoreDistributionChart.jsx` | ADD | Accessible histogram bar chart displaying candidate score tiers for interviewers with data table fallback. | Interviewer workspace | Phase 9a |
| `client/src/components/analytics/RubricAveragesChart.jsx` | ADD | Accessible horizontal bar chart displaying 5-dimension rubric performance averages with data table fallback. | Interviewer workspace | Phase 9a |
| `client/src/components/analytics/PlatformThroughputChart.jsx` | ADD | Accessible dashboard charts displaying user population composition, platform throughput, and AI token consumption. | Admin dashboard | Phase 9a |
| `client/src/features/dashboard/CandidateDashboard.jsx` | MODIFY | Integrated visual analytics (`ScoreProgressionChart` and `SkillRadarChart`) with `/analytics/candidate`. | Candidate portal | Phase 9a |
| `client/src/features/dashboard/InterviewerDashboard.jsx` | MODIFY | Integrated visual analytics (`ScoreDistributionChart` and `RubricAveragesChart`) with `/analytics/interviewer`. | Interviewer portal | Phase 9a |
| `client/src/features/admin/AdminDashboard.jsx` | MODIFY | Integrated platform metrics (`PlatformThroughputChart`) with `/analytics/admin`. | Admin portal | Phase 9a |
| `server/tests/analytics.test.js` | ADD | 10 automated integration tests verifying candidate, interviewer, and admin telemetry, Redis caching, date range filters, and RBAC forbidden gates. | Test runner | Phase 9a |
| `docs/verification/phase-9.md` | ADD | Comprehensive Phase 9 verification report with exact execution output and test counts. | Documentation | Phase 9b |
| `docs/PROGRESS.md` | MODIFY | Updated Phase 9 status to Done (124/124 tests). | Tracker | Phase 9b |

---

## Phase 10: Hardening, Accessibility, Final Review & Documentation

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `docs/api/openapi.yaml` | ADD | OpenAPI 3.1 schema specification documenting all REST endpoints, schemas, parameters, security schemes, and status codes. | API specification | Phase 10a |
| `docs/DATABASE.md` | ADD | Database architecture documentation covering all 23 tables, foreign keys, cascades, indexes, and full Mermaid ER diagram. | Database documentation | Phase 10a |
| `docs/SECURITY.md` | ADD | OWASP Top 10 API Security Checklist with verification methodology and codebase cross-references. | Security documentation | Phase 10a |
| `docs/FINAL_REPORT.md` | ADD | Comprehensive enterprise upgrade report covering architecture, phases 0-10, verification gates, and operational runbook. | Project summary | Phase 10a |
| `docs/verification/phase-10.md` | ADD | Comprehensive Phase 10 verification report with gate summaries and verification artifacts. | Documentation | Phase 10b |
| `docs/PROGRESS.md` | MODIFY | Updated Phase 10 status to Done (124/124 tests). | Tracker | Phase 10b |

---

## Phase 11: Frontend Completion & Honest Demo-Mode Signalling

### Dependency Additions (Justification Table)

| Package | Version | Purpose | License | Maintenance Status | Audit Result |
|---|---|---|---|---|---|
| `vitest` (client) | ^5.1.0 | Fast, native Vite test runner for client React component testing. | MIT | Actively maintained | 0 vulnerabilities |
| `@testing-library/react` (client) | ^16.3.2 | Component testing utility for React 19 verifying accessibility and DOM behavior. | MIT | Maintained by Testing Library | 0 vulnerabilities |
| `@testing-library/jest-dom` (client) | ^6.9.1 | Custom Jest / Vitest matchers for asserting DOM node state. | MIT | Maintained by Testing Library | 0 vulnerabilities |
| `jsdom` (client) | ^28.1.0 | Pure JavaScript implementation of WHATWG DOM and HTML standards for testing. | MIT | Actively maintained | 0 vulnerabilities |

### File Change Log

| Path | Action | Reason | Dependent Files Touched | Phase |
|---|---|---|---|---|
| `docs/FRONTEND_COVERAGE.md` | ADD | Complete frontend audit analyzing Modules A–H against existing UI and backend APIs. | Documentation | Phase 11a |
| `server/src/routes/systemRoutes.js` | ADD | Capabilities endpoint `GET /api/v1/system/capabilities` reporting active subsystem providers (AI, execution, redis, collab). | `server/src/app.js` | Phase 11a |
| `server/src/routes/templateRoutes.js` | ADD | REST routes for listing, creating, and deleting interview question templates. | `server/src/app.js` | Phase 11a |
| `server/src/config/env.js` | MODIFY | Added `ALLOW_MOCK_PROVIDERS` and `ALLOW_INMEMORY_REDIS` schema validation and production boot guard. | Server config | Phase 11a |
| `server/src/app.js` | MODIFY | Mounted system capabilities and template management routes. | Server entry | Phase 11a |
| `server/src/server.js` | MODIFY | Automatically attaches in-memory background worker when Redis is mock or fallback. | Server boot | Phase 11a |
| `server/src/services/submissionService.js` | MODIFY | Added `isSimulated` and `provider` tags to code execution results. | Submissions API | Phase 11a |
| `server/src/controllers/evaluationController.js` | MODIFY | Added `listReports` controller with role-scoped querying. | `server/src/routes/reportRoutes.js` | Phase 11a |
| `server/src/routes/reportRoutes.js` | MODIFY | Mounted `GET /api/v1/reports` endpoint for interviewers/admins and candidates. | `server/src/app.js` | Phase 11a |
| `server/tests/systemCapabilities.test.js` | ADD | Integration tests verifying system capabilities endpoint and production readiness guards (4 tests). | Server test runner | Phase 11a |
| `server/tests/redis.test.js` | MODIFY | Updated readiness probe assertion to accommodate fallback labeling. | Server test runner | Phase 11a |
| `client/src/components/layout/CapabilitiesBanner.jsx` | ADD | Persistent warning banner alerting users when AI, code execution, or Redis run in simulated or mock mode. | `client/src/components/layout/AppShell.jsx` | Phase 11b |
| `client/src/components/layout/AppShell.jsx` | MODIFY | Embedded CapabilitiesBanner and added navigation links for Question Bank and Assessment Reports. | Navigation shell | Phase 11b |
| `client/src/features/room/RunCodePanel.jsx` | ADD | Interactive coding runner panel with problem test cases, polling, submission status, hidden test redaction, and simulated badge. | `client/src/pages/Room.jsx` | Phase 11b |
| `client/src/pages/Room.jsx` | MODIFY | Added "Run Code" drawer toggle and wired Monaco editor code accessor. | Live coding room | Phase 11b |
| `client/src/features/reports/ReportView.jsx` | ADD | Comprehensive evaluation report view with dimension rubrics, overall score, strengths, recommendations, verified facts, human override form, and visible AI advisory disclaimer. | `client/src/pages/ReportsPage.jsx` | Phase 11b |
| `client/src/pages/ReportsPage.jsx` | ADD | Dedicated reports page supporting both historical list view and detailed evaluation report views. | `client/src/App.jsx` | Phase 11b |
| `client/src/features/resume/ResumeUploadModal.jsx` | ADD | PDF resume uploader validating %PDF- header, displaying extracted skill badges, and calculating keyword overlap match % against job descriptions. | `CandidateDashboard.jsx` | Phase 11b |
| `client/src/features/practice/MockInterviewSession.jsx` | ADD | AI technical mock interview session with duration/domain configuration, live countdown timer, and sequential answer submission. | `CandidateDashboard.jsx` | Phase 11b |
| `client/src/features/questions/QuestionManager.jsx` | ADD | Question Bank browser with domain/difficulty filters, authoring modal with public/hidden test case builder, and template manager. | `InterviewerDashboard.jsx`, `Dashboard.jsx` | Phase 11b |
| `client/src/features/dashboard/CandidateDashboard.jsx` | MODIFY | Wired Resume Intelligence modal, AI Mock Practice modal, and Report View actions. | Candidate portal | Phase 11b |
| `client/src/features/dashboard/InterviewerDashboard.jsx` | MODIFY | Wired Question Bank tab, Template manager, and Completed Interview Report view action. | Interviewer portal | Phase 11b |
| `client/src/pages/Dashboard.jsx` | MODIFY | Added tab switching between Overview, Question Bank, and Assessment Reports. | Dashboard portal | Phase 11b |
| `client/src/App.jsx` | MODIFY | Registered routes `/reports` and `/reports/:sessionId`. | App router | Phase 11b |
| `client/vite.config.js` | MODIFY | Added Vitest test configuration (`globals: true`, `environment: 'jsdom'`). | Build pipeline | Phase 11b |
| `client/src/setupTests.js` | ADD | Client testing bootstrap configuring `@testing-library/jest-dom`. | Client test runner | Phase 11b |
| `client/src/__tests__/CapabilitiesBanner.test.jsx` | ADD | 3 unit tests verifying simulated system capability badges and honest demo mode disclosure. | Client test runner | Phase 11b |
| `client/src/__tests__/RunCodePanel.test.jsx` | ADD | 2 unit tests verifying code execution runner, status polling, and hidden test redaction. | Client test runner | Phase 11b |
| `client/src/__tests__/ResumeUploadModal.test.jsx` | ADD | 3 unit tests verifying PDF validation, skill extraction badges, and job description match scoring. | Client test runner | Phase 11b |
| `client/src/__tests__/ReportView.test.jsx` | ADD | 2 unit tests verifying evaluation rubrics, human override controls, and AI advisory disclaimer. | Client test runner | Phase 11b |
| `DEPLOY.md` | MODIFY | Documented `ALLOW_MOCK_PROVIDERS` and `ALLOW_INMEMORY_REDIS` production requirements. | Deployment guide | Phase 11c |
| `docs/MANUAL_STEPS.md` | MODIFY | Documented production deployment flags for mock vs live infrastructure. | Operations guide | Phase 11c |
| `docs/LIVE_RUN_REPORT_2.md` | ADD | Comprehensive live run verification report capturing evidence across all Phase 11 frontend interfaces with 8 screenshots. | Verification report | Phase 11c |
| `docs/PROGRESS.md` | MODIFY | Updated Phase 11 status to Done (138/138 tests: 128 server + 10 client). | Progress tracker | Phase 11c |
| `docker-compose.yml` | MODIFY | Added 2GB VM memory limits/reservations on all 5 services, healthchecks on server/worker/caddy, Redis AOF persistence, and resumes_data volume. | Docker orchestration | Release Prep |
| `server/Dockerfile` | MODIFY | Added `/app/storage/resumes` directory initialization and ownership for non-root execution. | Container runtime | Release Prep |
| `deploy/Caddyfile` | MODIFY | Added `/health/*` reverse proxy block to forward health check probes to Node API. | Reverse proxy | Release Prep |
| `.env.production.example` | ADD | Production environment template with grouped variables and secret generation instructions. | Production config | Release Prep |
| `docs/AWS_DEPLOY_CHECKLIST.md` | ADD | Production deployment checklist for AWS EC2 (t4g/t3.small), DuckDNS, Docker, 2GB swap, smoke tests, backup/restore, cost breakdown. | Operations doc | Release Prep |
| `scripts/dev-setup.ps1` | ADD | Local developer pre-flight validation script checking Node 22+, npm, MySQL, and .env without printing secrets. | Developer tooling | Release Prep |
| `scripts/prepush-check.ps1` | ADD | Pre-push security and hygiene scanner checking for leaked secrets, private keys, SQL dumps, uploads, and large files. | Security tooling | Release Prep |
| `docs/RUN_LOCALLY.md` | ADD | Step-by-step Windows PowerShell guide for running IntelliPrep AI from scratch. | Documentation | Release Prep |
| `docs/verification/run-locally.md` | ADD | Documented execution proof of RUN_LOCALLY.md from scratch in isolated directory D:\tmp_verify with temporary database. | Verification doc | Release Prep |
