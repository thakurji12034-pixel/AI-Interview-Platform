# IntelliPrep AI - Enterprise Upgrade Brief (for Google Antigravity)

## 0. Context and non-negotiable rules

I have an existing, working project called "AI Interview Platform" at D:\ai-interview-platform (Windows, PowerShell). We are upgrading it into "IntelliPrep AI", a secure, production-grade AI interview and technical assessment platform. This is an UPGRADE of the existing repository, never a rewrite and never a disconnected sample project.

Existing stack:
- server/: Node.js, Express 5, Sequelize 6 + mysql2 (MySQL 8, database `interview_platform`), Socket.io 4, JWT, bcryptjs, Joi, helmet, cors, morgan, cookie-parser, express-rate-limit.
- client/: React + Vite + Tailwind CSS v4, axios, react-router-dom, socket.io-client, @monaco-editor/react.

Existing working functionality (must keep working):
- Registration and login (bcrypt, Joi), JWT access token (15 min), refresh token in an httpOnly cookie (path /api/auth) stored as a SHA-256 hash with rotation, logout, session restoration, auth and role middleware.
- Interview scheduling and rescheduling, conflict detection for interviewer and candidate, interview status state machine (scheduled -> in_progress -> completed, cancelled), per-user visibility (other users get 404).
- Socket.io live coding room: JWT handshake auth, DB-checked room join, live code sync, language switching (javascript, python, java, cpp), typing indicator, join/leave events, reconnect recovery from server memory, 50,000 character limit.
- React client: login/register, protected routes, dashboard (stats, filters, interview cards, schedule modal), Monaco coding room.
- Tests: authentication (9 checks) and scheduling (18 checks) were verified earlier through ad-hoc PowerShell scripts, and the socket test is `server/scripts/socketTest.js` (11 PASS expected, needs re-verification after recent changes). Some of these checks may not exist as files in the repo. Do not assume.

Hard rules:
1. Never run destructive commands: no `git reset --hard`, no `git push --force`, no `docker compose down -v`, no `DROP`/`TRUNCATE`, no deleting folders, no overwriting files without a backup. Database changes only through reviewed migrations with a working `down`.
2. Never push to any remote. Commit locally only.
3. Never commit secrets: no .env files, passwords, API keys or tokens. Never print secret values in logs or reports.
4. All source comments, JSDoc, TODOs, commit messages, documentation and visible UI text must be in professional English. No Hindi or Hinglish anywhere in code or comments.
5. Do not mark anything complete unless it is implemented AND verified by actually running it. Never fabricate command output. Paste real output into reports.
6. Do not weaken security or tests to make something pass.
7. Do not leave placeholder code that pretends to be a finished feature. If something cannot be completed (missing credentials, infeasible), implement it behind an interface and a feature flag, mock it in tests, and label it clearly as "not live-verified".
8. Every new dependency must be justified in docs/CHANGELOG-UPGRADE.md (purpose, license, maintenance status, `npm audit` result). Do not add unnecessary dependencies.
9. Environment: Windows + PowerShell. Use npm scripts and cross-platform tooling, avoid bash-only commands in project scripts. Docker Desktop may not be installed on this machine: check before relying on it, and say so if it is missing.

---

## PART 1 - Repository audit (Phase 0, no feature code)

Before changing anything:

1. Safety backup:
   - `git status`, `git branch -a`, `git log --oneline -30`. Do not touch uncommitted work without telling me.
   - Create a local branch `backup/pre-intelliprep` and a tag `pre-intelliprep` at the current HEAD.
   - Back up the database with mysqldump to a folder OUTSIDE the repo (never commit it). Read credentials from server/.env without printing them. If mysqldump is unavailable, tell me and skip.
2. Read everything that exists (do not assume files or features are missing):
   - Root and per-package package.json and lockfiles, .gitignore, any README, Dockerfile, docker-compose, deploy folder, DEPLOY.md or CI files (a previous task may have created some of them, possibly on a branch such as feature/deploy; inspect all local branches).
   - server/src/**: app.js, server.js, config/, models/, controllers/, routes/, middleware/, services/, validators/, sockets/, and server/scripts/.
   - client/src/**: main.jsx, App.jsx, api/, context/, components/, pages/, plus vite.config.js, eslint.config.js, index.html.
3. Inspect the real database schema: `SHOW CREATE TABLE` for every table, and compare with the Sequelize models. Report any drift.
4. Run the baseline and record exact results:
   - Start the server against local MySQL and run `node scripts/socketTest.js` (expect 11 PASS).
   - client: `npm run lint` and `npm run build`.
   - `npm audit` for server and client.
   - Check whether automated auth and scheduling tests exist in the repo.
5. Write `docs/audit/AUDIT_REPORT.md` containing: architecture map, route table (method, path, auth, role), socket event table, DB schema, baseline test results, defects, security findings, technical debt, risks, and a confirmed/unconfirmed status for each of these KNOWN ISSUES that I already suspect:
   - Public signup lets anyone choose the interviewer role.
   - The temporary route GET /api/auth/interviewer-check may still exist.
   - Server startup uses sequelize.sync() and there are no migrations.
   - Room state and code live in server memory only; sync is last-write-wins.
   - API and socket URLs fall back to localhost and cookies use SameSite=Lax (needs same-origin deployment or a proxy).
   - The client npm audit reported a critical vulnerability.
   - Monaco loads from a CDN (blocks a strict CSP and offline use).
   - The candidate dashboard does not refresh live.
   - The local database contains test data (test@example.com, interviewer@example.com, outsider@example.com, test interviews).
6. STOP after the report. Present the report summary and your concrete plan for Phase 1, then wait for me to reply "proceed". Do not modify application code in Phase 0.

---

## PART 2 - Phased implementation plan

Each phase must leave the application in a working, committed, tested state. Each phase is delivered on its own local branch `feature/intelliprep-phase-N`.

Phase 0 - Audit and backup (P0). No feature code.

Phase 1 - Foundation, quality and deploy-readiness (P0, MUST be finished first; it unlocks submission of the project).
Phase 2 - RBAC, invitations, admin core, audit logs, design system and role dashboards shell (P0).
Phase 3 - Redis and background job infrastructure (P1; prerequisite for Phases 5, 6, 7).
Phase 4 - Question bank, interview templates, assessments (P1).
Phase 5 - Secure code execution (P1; depends on 3 and 4).
Phase 6 - AI engine (questions, follow-ups, sessions, summaries) and resume intelligence (P1; depends on 3 and 4).
Phase 7 - AI answer evaluation and reports (P1; depends on 3 and 6).
Phase 8 - Yjs collaborative editor, persistent snapshots, session history (P2).
Phase 9 - Analytics with Recharts (P2; depends on 4, 5, 7).
Phase 10 - Hardening: security review, performance, accessibility, end-to-end tests, final documentation and ER diagram (P0).

Dependencies: 1 -> 2 -> 3 -> {4 -> 5, 6 -> 7} -> 9; 8 can follow 2 independently; 10 last. If time runs out, stop cleanly after any completed phase. Never start a phase while the previous one has failing tests.

Phase 1 scope (detailed):
- Convert every existing ad-hoc check (auth 9, scheduling 18, socket 11) into automated tests: Jest + Supertest for HTTP, socket.io-client for sockets, against a REAL MySQL test database (separate database name, created by the test setup), not database mocks. Add npm scripts `test`, `test:watch`, `lint`.
- Configuration module with schema validation of environment variables (fail fast with a clear list of missing names). Provide server/.env.example and a root .env.example.
- Structured logging (for example pino) with request IDs and redaction of authorization headers, cookies and passwords. Centralized error handling with an AppError class and consistent JSON error shape `{ error: { code, message, details? } }`; keep existing client-visible messages working or update the client in the same phase.
- API versioning: mount routers under /api/v1 and update the client; keep a temporary /api alias until the client is migrated, then remove it and record that in the changelog.
- Security fixes: remove the interviewer-check test route; set `trust proxy`; rate limiting on login, register and refresh; pin JWT algorithms in verify; make public registration create only candidates (the invitation workflow arrives in Phase 2, so keep a clearly documented temporary dev-only switch if I need an interviewer account before then).
- Database: introduce migrations (Sequelize CLI or Umzug). Create a baseline migration that matches the CURRENT production-like schema and is safe on an existing database (it must not drop or recreate existing tables or data). Disable `sequelize.sync()` outside test mode. Add indexes: users.email unique, interviews (interviewerId, scheduledAt), (candidateId, scheduledAt), status, roomId unique.
- Runtime: database connection retry with backoff, graceful shutdown on SIGTERM and SIGINT (HTTP server, Socket.io, database), health endpoints GET /health/live and GET /health/ready.
- Frontend: environment-aware base URLs (relative /api/v1 and same-origin socket in production, localhost in development), remove Vite template leftovers, correct index.html title and meta, lint and build clean.
- Docker and deployment: multi-stage Dockerfiles for server and client (non-root user), docker-compose.yml for local development (MySQL, server, client), a production compose file with MySQL (named volume, healthcheck, low-memory flags for small VMs), the server (single instance, because room state is in memory), and Caddy (automatic HTTPS, serves the built client, reverse proxies /api and /socket.io, WebSocket capable). All secrets via environment variables.
- CI: GitHub Actions workflow ci.yml: install, lint, tests with MySQL service container, client build, `npm audit --omit=dev --audit-level=high`, docker build. Add a manual `workflow_dispatch` deploy workflow that deploys over SSH using GitHub secrets (documented, disabled by default). Add Dependabot config and secret scanning in CI.
- Documentation: README.md and docs/DEPLOYMENT.md (fresh Ubuntu VM: open ports 22/80/443, swap for small VMs, Docker install, clone, .env, `docker compose up -d --build`, update flow, MySQL backup with mysqldump, troubleshooting table).
Exit criteria for Phase 1: all tests pass, lint and build pass, `docker compose config` validates (and builds if Docker is available), and the app is deployable to a single VM behind HTTPS. Then tell me explicitly: "Phase 1 complete: you can deploy now."

---

## PART 3 - File-level change rules

For EVERY change, follow this procedure:
1. Open and read the current file first. Search the repo (for example ripgrep) for importers and usages before changing exports.
2. Classify the change:
   - MODIFY (default): smallest diff that achieves the goal, preserving unrelated behaviour.
   - ADD: new file, with exact relative path and purpose.
   - REPLACE: only if the file is structurally incompatible with the goal or more than about half its lines change. Before replacing, state the exact relative path, why, what public exports and behaviours are preserved, and which importers must change. Provide the complete replacement.
   - DELETE: only with a written reason, after confirming nothing imports it.
3. Record each entry in docs/CHANGELOG-UPGRADE.md: path, action (MODIFY/ADD/REPLACE/DELETE), reason, dependent files touched, phase.
4. Keep the existing server layout (routes -> controllers (thin) -> services (business logic) -> models, plus middleware, validators, sockets) and add new files in the same style. Add serializers/DTO mappers so internal fields (hidden test cases, reference answers, token hashes, password hashes) can never leak by accident. Frontend: feature folders under client/src/features/<feature>, shared UI under client/src/components/ui, API clients under client/src/api.

Expected treatment of existing files (verify against the real repo first):
- server/src/app.js, server.js: MODIFY (versioned routers, logger, limiters, CSP, shutdown).
- server/src/models/User.js, Interview.js, models/index.js: MODIFY through migrations (new fields and associations).
- server/src/controllers/authController.js and routes/authRoutes.js: MODIFY (invitation-only privileged roles, refresh token families, test route removal); extract logic into services/authService.js.
- server/src/controllers/interviewController.js: MODIFY (pagination, filtering, services).
- server/src/sockets/index.js: keep in Phases 1 to 7. In Phase 8 it may be REPLACED by a modular socket layer, only with a feature flag COLLAB_ENGINE=legacy|yjs and a documented migration of socketTest.
- client/src/pages/Dashboard.jsx: REPLACE in Phase 2 by role-specific dashboards, justified in the changelog.
- client/src/pages/Room.jsx: MODIFY heavily in Phase 8.
- client/src/api/http.js, socket.js: MODIFY.

Database changes: every schema change is a migration with up and down, tested on a copy of the existing data, and never deletes data. Document the safe upgrade path (backup, migrate, verify, rollback) in docs/DATABASE.md.

---

## PART 4 - Technical requirements per module

### Phase 2 - RBAC, invitations, admin, design system (Modules G and security)
- Roles: candidate, interviewer, admin. Permission middleware `requirePermission(...)` backed by a documented permission matrix (docs/SECURITY.md). Enforce ownership checks on the server for every resource (prevent IDOR). Frontend route restrictions are only UX, never security.
- Invitations: admin creates an invitation (email, role, expiry). Only a hash of the one-time token is stored. Registration through the invite link assigns the invited role. Invitations are single-use, expiring and revocable. The first admin is created by an idempotent seed command that reads credentials from environment variables and refuses to run in production without an explicit flag. Public registration creates candidates only.
- Admin: paginated user list with filters, activate/deactivate, role change, session revocation. Every sensitive action writes an audit log entry (actor, action, target, timestamp, IP, no secrets) to an audit_logs table, viewable by admins with pagination and filters.
- Platform settings table (key/value, admin-only, cached).
- Design system: tokens as CSS variables with Tailwind v4 theme, dark and light themes (respect prefers-color-scheme, manual toggle persisted), accessible primitives (use Radix UI or equivalent headless library for dialog, dropdown, tabs, tooltip), toasts, skeleton loaders, empty states, error states, error boundary, sidebar + topbar responsive layout, lazy-loaded routes. TanStack Query for server state. WCAG AA contrast, visible focus, keyboard operable.
- Role dashboards (candidate, interviewer, admin) with the sections listed in Module G below.

### Phase 3 - Redis and jobs
- Redis (docker service) for rate limit storage, cache and BullMQ queues. Separate worker entry point `server/src/worker.js` using the same image and a separate compose service. Queues: code-execution, ai-evaluation, resume-parsing. Jobs must be idempotent, have retries with backoff, timeouts, and failure handling with status visible through the API. Cache with explicit TTLs and invalidation. Health readiness includes Redis. Socket.io Redis adapter only if multi-instance is enabled; default stays single instance (document why).

### Phase 4 - Module F: Question bank and assessments
- Tables: questions, question_topics/tags, test_cases (input, expected output, isHidden, weight, optional time/memory override), interview_templates (sections: topic, count, difficulty, duration), assessments, assessment_questions.
- Question fields: title, statement (markdown, sanitized on render), domain, topic tags, difficulty (beginner, intermediate, advanced), type (coding, mcq, theory, system_design), starter code per language, reference key points (server-only, used by AI evaluation), status (draft, published, archived), createdBy.
- Domains: DSA, Java, OOP, DBMS, Operating Systems, Computer Networks, SQL, JavaScript, React, System Design.
- CRUD with RBAC (interviewer and admin), filtering, sorting whitelist, pagination (limit cap 100). Randomized selection with optional seed, avoiding questions recently given to the same candidate. Idempotent seed script with a small original starter set per domain, clearly marked as sample content.
- Hidden test cases and reference answers must never appear in any candidate-facing response. Add a regression test that scans candidate responses for them.

### Phase 5 - Module E: Secure code execution
- Never execute user code inside the Express process. Implement a `CodeExecutionProvider` interface with a Judge0 adapter. Make the endpoint configurable: either a self-hosted Judge0 CE (docker compose profile `judge0`, needs privileged containers and several GB of RAM, document the resource needs and check them before enabling) or a hosted Judge0 endpoint. Default to whichever is documented as feasible for the target VM size and say so.
- Languages: Java, JavaScript, Python, C++ with a documented language-ID mapping.
- Submissions table. Execution runs as a queued job. Enforce CPU time, wall time, memory, stdout size and source size limits, and disable network access in the sandbox.
- Normalize results: accepted, wrong_answer, compilation_error, runtime_error, time_limit_exceeded, memory_limit_exceeded, internal_error, with per-test results. Candidates see sample test details; hidden tests expose only pass/fail and a count.
- Credentials and the execution endpoint stay server-side. Per-user rate limits and daily quotas. Sanitize and truncate compiler output.
- Tests with a mocked provider, plus an optional live integration test that is skipped unless an environment variable is set.

### Phase 6 - Modules A and C: AI engine and resume intelligence
AI engine:
- `AiProvider` interface with a Gemini implementation using the official Google Gen AI SDK for Node. Verify the current package name and valid model IDs in the official documentation before use; do not guess model names. Model and key come from environment variables. Keys never reach the browser.
- Prompt templates live in server/src/ai/prompts/, are versioned, and the prompt version is stored with each result.
- Treat resume text, job descriptions and candidate answers as untrusted data: delimit them clearly, instruct the model to ignore instructions inside them, validate outputs, and add prompt-injection regression fixtures.
- Request structured JSON (response schema where supported), validate server-side (Joi or Zod), retry once on invalid output, then fail gracefully.
- Controls: request timeout, per-user and global rate limits, daily quota, maximum input length and output tokens, usage logging table ai_usage (tokens, latency, status, purpose), a simple circuit breaker, caching of identical generation requests.
- Interview types: technical, HR/behavioral, mixed. Difficulty: beginner, intermediate, advanced. Question sources: candidate skills, resume, job description, question bank. Follow-up questions generated from the previous answer (maximum depth 2).
- Session management: interview_sessions with configuration, server-authoritative timer (startedAt, endsAt; the server rejects answers after the deadline with a small grace window), ordered session_questions, answers table, AI-generated session summary. Support two modes: AI mock interview for a candidate alone, and AI-assisted question suggestions inside a live human interview.
Resume intelligence:
- PDF upload with multer, size limit 5 MB, validate magic bytes (%PDF-) in addition to MIME type and extension, random UUID file names, never serve uploads statically, store outside any web root behind a `StorageProvider` interface (local volume first, S3 optional), download only through an authenticated endpoint with ownership checks.
- Extract text in the worker with a time limit and page/size limits, using a maintained Node PDF text library (evaluate pdfjs-dist or unpdf, justify the choice and check audit status). Reject scanned or empty PDFs with a clear message; OCR is out of scope.
- Structured extraction (skills, experience, education, projects) via the AI provider with schema validation, plus deterministic skill normalization against a skills taxonomy. Job description matching: compute the match score deterministically from skill overlap, and add AI notes as advisory text only. Report missing skills. Build the candidate skill profile.
- Privacy: store minimum data, allow the candidate to delete their resume and derived data, record deletions in the audit log.

### Phase 7 - Module B: AI answer evaluation
- Evaluation dimensions: technical correctness, relevance, explanation quality, problem-solving approach, communication clarity. Use a rubric in the prompt and a strict JSON schema. Compute overall scores on the server from dimension scores and configurable weights; never trust model arithmetic.
- Output: per-answer scores, overall score, strengths, weaknesses, improvement recommendations, suggested topics, final report. Run asynchronously through the queue with status polling and idempotency.
- Every AI result carries `generatedBy: "ai"`, model name, prompt version and a visible disclaimer: the score is an advisory estimate, not an objective measure of ability or a hiring decision. Interviewers can add human notes and an override annotation stored separately from the AI output.
- Combine AI results with verified facts (code execution results, timings) in the report but label each clearly by source.
- Tests use a mocked provider; add fixtures for malformed model output and prompt injection in answers.

### Phase 8 - Module D: Collaborative editing with Yjs
- Replace last-write-wins with Yjs CRDT. Reuse the existing authenticated Socket.io connection as the transport (custom provider with sync, update and awareness messages) so there is a single authentication path. Use y-monaco for the editor binding and the awareness protocol for remote cursors, selections, names and colors.
- Server keeps a Y.Doc per room, persists snapshots (full state update) to a code_snapshots table on a debounce, on last leave and when the interview completes, and restores them on room creation. Language is stored in a shared Y.Map.
- Authorization on every Yjs message (the socket must be in the room). Support multiple participants and a read-only observer role enforced on the server by dropping updates from read-only sockets. Limit update and document size and apply per-socket rate limits.
- Room session history: room_sessions with join/leave events and snapshot timeline, plus a read-only snapshot viewer for interviewers.
- Keep the legacy engine behind COLLAB_ENGINE until the Yjs tests pass. Reconnect recovery uses the Yjs state vector.
- Self-host Monaco assets (or bundle them) so the Content Security Policy can stay strict and the editor works without a third-party CDN.

### Phase 9 - Module H: Analytics
- Role-scoped analytics endpoints using indexed aggregate queries and Redis caching with TTL and invalidation. Metrics: interview completion statistics, average candidate scores, topic-wise performance, skill gap analysis, coding assessment statistics (acceptance rate, average runtime), interview history over time, candidate progress, recruiter funnel. Date range filters, proper empty states.
- Frontend charts with Recharts, lazy-loaded, accessible (titles, descriptions, a data table alternative).

### Module G dashboards (built across Phases 2, 4, 6, 7, 9)
- Candidate: profile, resume management, upcoming interviews, history, coding assessments, AI reports, skill progression.
- Interviewer: schedule interviews, manage candidates, interview templates, review coding submissions, evaluation notes, candidate reports.
- Admin: users, interviewer invitations, interview sessions, question bank, system statistics, user activity, audit logs, platform settings.

### Cross-cutting technical requirements
- Pagination and filtering on every list endpoint, with whitelisted sort fields.
- Indexes justified by real query patterns (use EXPLAIN on the main queries and record findings).
- OpenAPI specification at docs/api/openapi.yaml kept in sync with the routes.
- Structured logs, audit trails, health checks, graceful shutdown, configuration per environment.
- Modular monolith. The only separate service is the code execution sandbox (plus the worker process).

### Security requirements (verify and improve)
- JWT: pin algorithm, strong secret from environment, issuer and audience claims, short lifetime.
- Refresh tokens: store in a refresh_tokens table (hash, token family, user agent, IP, expiry, revokedAt, replacedBy). Detect reuse of a rotated token and revoke the whole family. Add logout-all and an absolute maximum session lifetime.
- Passwords: minimum length 10, common-password blocklist, bcrypt cost from configuration (at least 12) with rehash on login, throttling or temporary lockout after repeated failures (Redis counters).
- Cookies: httpOnly, Secure in production, SameSite, path scoped. CSRF: same-origin deployment, SameSite protection, require a custom header and JSON content type on cookie-authenticated POST endpoints. Document the reasoning.
- CORS: strict allowlist from environment.
- Input and output: Joi validation with unknown keys stripped, sanitized markdown rendering (rehype-sanitize or DOMPurify), only parameterized Sequelize queries (no string-built SQL), response serializers.
- File upload security as described in Phase 6.
- Socket.io: per-event payload validation, per-socket rate limits, maxHttpBufferSize, room authorization on every event, read-only enforcement.
- Secrets only from environment, .env.example files, secret scanning in CI.
- Dependency audit: run `npm audit` for server and client, fix critical and high findings where compatible, document anything left with the reason.
- docs/SECURITY.md: threat model, controls, permission matrix, known limitations.

### UI/UX requirements
Premium, professional SaaS look: consistent color system and typography, generous spacing, responsive layouts, dark and light themes, accessible forms and controls, loading skeletons, empty and error states, toast notifications, proper modal behaviour (focus trap, Escape, restore focus), no gratuitous animation. All text in professional English.

---

## PART 5 - Testing and verification

Tools: Jest + Supertest (server, against a real MySQL test database), socket.io-client (sockets), Vitest + React Testing Library (client), Playwright (end-to-end).

Required suites (added in the phase that introduces the feature):
- Authentication integration tests (register, login, refresh rotation, reuse detection, logout, lockout).
- Authorization matrix test: every endpoint x every role x expected status, plus IDOR tests (a user must not read another user's interviews, resumes, reports, submissions).
- Interview lifecycle tests: scheduling, conflicts, state machine, visibility.
- Socket tests: auth, room authorization, sync, reconnect, rate limits; Yjs convergence test with two clients editing concurrently.
- AI tests with a mocked provider: schema validation, retry, timeout, quota, prompt-injection fixtures.
- Resume upload tests: valid PDF, wrong magic bytes, oversize, malformed PDF, path traversal file names, empty text PDF.
- Code execution tests with a mock provider (all result types) and an optional live Judge0 test.
- API validation tests, security tests (JWT tampering and alg none, CORS, rate limits, hidden test case leakage, markdown XSS).
- Frontend critical-flow tests and one Playwright flow: register, login, schedule, join the room in two browser contexts, sync code, complete the interview, view the report.

Verification procedure at the end of every phase:
1. Run lint, all tests and the client build.
2. Start the application and smoke test the affected flows manually or with Playwright.
3. Re-run `node scripts/socketTest.js` (or its automated replacement) and report the result.
4. Write docs/verification/phase-N.md with the exact commands run and the real, unedited results, a status table (Done / Partial / Not started / Blocked) per requirement, items that are NOT verified and why, and known risks.

---

## PART 6 - Final deliverables

- Upgraded source code on local branches, one per phase, with conventional commit messages.
- Migrations, seed scripts (idempotent, development only, refusing to run in production without an explicit flag, demo accounts documented).
- Automated test suites and CI workflows (ci.yml, optional deploy.yml, dependabot.yml).
- Docker files, compose files for development and production, Caddyfile, .env.example files.
- Documentation: README.md, docs/ARCHITECTURE.md, docs/API.md and docs/api/openapi.yaml, docs/DATABASE.md with an ER diagram (Mermaid erDiagram generated from the real models), docs/DEPLOYMENT.md, docs/SECURITY.md, docs/TESTING.md, docs/DEMO.md (demo script and accounts), docs/audit/AUDIT_REPORT.md, docs/verification/phase-N.md, docs/CHANGELOG-UPGRADE.md.
- Screenshots in docs/screenshots/ if you can capture them from the running app; otherwise provide an exact checklist of screenshots I must take.
- A final report: feature status table, test results, security review summary, deployment status, open issues, and the exact manual steps I must still do myself (cloud account, VM, domain, API keys, GitHub push, submission form).

---

## PART 7 - Execution rules

1. Work strictly phase by phase. Start with Phase 0 only. Do not start a phase until I reply "proceed".
2. At the start of each phase: re-read the relevant current files, then write a short plan (files to MODIFY, ADD, REPLACE) before coding.
3. Implement, then verify using the Part 5 procedure. Inspect the real results. If something fails, fix the cause (never the test or the security control) and re-run.
4. Commit locally on feature/intelliprep-phase-N. Never push.
5. After each phase, stop and report: what changed (files), what is verified (real output), what is NOT verified, risks, and what the next phase needs from me (credentials, decisions).
6. If a credential (Gemini API key, Judge0 endpoint) is missing, build against the interface with a mock and a feature flag, state clearly that it is not live-verified, and tell me exactly what to provide.
7. If a requirement conflicts with existing behaviour, is infeasible on the target infrastructure, or is ambiguous, stop and ask me instead of guessing.
8. Prioritize production reliability, security and maintainability over the number of features. Phase 1 must be complete and deployable before anything else.
9. Never claim success without verification. Never invent command output, test counts or screenshots.