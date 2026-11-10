---
name: kedata-system
description: "Use this skill at the start of any engineering session inside a Kedata repo — it loads the baseline development rules: read the approved plan artifacts first (implementation plan, PRD, design brief), follow house conventions, and produce production-ready code through the plan → confirm → code → test → verify workflow."
version: 1.2.0
author: Kedata Indonesia
---

# Skill: Kedata System — Engineering Session Baseline

## Purpose
Load the baseline operating rules for an engineering session in a Kedata repo. This is the first engineering skill invoked: it sets the engineer identity, **reads the stack decided upstream** (PRD §7 / plan §4 — never decides it), enforces the **read-before-you-code** discipline (anchored on the approved product artifacts), runs the house development workflow, and carries the code-quality, git, security, and deployment standards. Every task in the session inherits these rules.

**This skill produces NO file artifact** — it is behavioral, not artifact-producing. Its only outputs are ephemeral and conversational: the per-task implementation plan (Step 3) and the Changes Summary (Step 7), used as user-confirmation gates and then left in the conversation. The durable engineering inputs already exist upstream (plan, PRD, brief); this skill reads them and shapes how the work is done.

**Input chain:** the product team has already produced the approved artifacts this skill reads — Implementation Plan (architecture + tasks + DoD), PRD (features + acceptance criteria), Design Brief + mockups (visual/UX contract), the Contracts (API_CONTRACTS.md, DATA_CATALOG.md, ENVIRONMENT_VARIABLES.md), the Test Plan (TEST_PLAN.md — what to test), and the Deployment runbook (DEPLOYMENT.md — how it ships). Engineering does NOT re-interview the product; it reads what was approved.

**Stack-specific context:** this skill is the SHARED baseline only. When a task touches a specific stack, the stack-specific skill for that language (backend: Go / Python / Node / Rust; frontend: React / Nuxt) is loaded for the framework details — project structure, patterns, testing commands. Load it when that stack is in play, not at session start.

## When to Use
* User command: `/kedata-system`
* Autonomous trigger: At the start of any engineering session inside a Kedata repo (detected via AGENTS.md, .cursorrules, or repo naming); when starting work on a task/issue/branch; after switching repos mid-session.
* **Bootstrap pattern (recommended):** consumer repos should reference this skill from their `AGENTS.md` (e.g. "Before any coding task, load the `kedata-system` skill.") so every fresh session auto-loads it — the developer should not have to remember to call `/kedata-system` manually.

## Prerequisites & Context Gathering
Before writing any code, the agent MUST read the relevant approved artifacts IN ORDER. Do not guess conventions, API shapes, folder structures, or scope — everything needed was already decided upstream.

**Mandatory reading checklist (in order):**
1. **`IMPLEMENTATION_PLAN.md`** — check `docs/` first, then root. The engineering contract: §1 architecture decision (monolith vs split), §2 repo/workspace layout, §3 deployment platform (VM vs Cloud Run) + constraints, §4 supporting architecture (DB, auth, storage, testing), §5 task breakdown (the task being worked), §6 endpoints, §7 data model, §8 env vars, §9 dependencies/milestones, §10 DoD. **If this is missing, STOP — engineering cannot start without an approved implementation plan.**
2. **`PRD.md`** — check `docs/` first, then root. Features with priorities (§8), acceptance criteria (§5), API overview (§9), data model (§10), edge cases (§18) — the *why* behind the plan.
3. **`DESIGN_BRIEF.md`** — check `docs/` first, then root. Visual identity, screens (§5), components (§6), states (§8) — the visual contract for FE work. If missing, note it and proceed (FE follows the plan + mockups).
4. **Contracts — `API_CONTRACTS.md`, `DATA_CATALOG.md`, `ENVIRONMENT_VARIABLES.md`** — check `docs/` first, then root. The exact endpoint shapes, entity schemas, and config the code must match. **If these are missing, STOP and escalate — code cannot be written against a contract that doesn't exist.**
5. **Test Plan — `TEST_PLAN.md`** — check `docs/` first, then root. The cases to write per task (§4 test cases, §3 traceability matrix, §5 fixtures, §9 exit criteria). **If missing, note it and recommend `kedata-test-plan` — do not invent coverage.**
6. **Deployment runbook — `DEPLOYMENT.md`** — check `docs/` first, then root. §5 config/secrets, §6 migrations, §7 CI gates, §10 rollout/rollback. If missing, note it and recommend `kedata-deploy` when the task touches infra; do not improvise the deploy model (plan §3 still governs).
7. **Issue / task description** — the specific task from the plan; its acceptance criteria; its milestone.
8. **Optional hints only:** any other repo docs that exist from prior iterations — reuse conventions, never a requirement. If an `AUDIT_REPORT.md` or `CHANGE_REQUEST.md` exists, read it for context on known issues or recent scope changes.

**Stack resolution — READ the decided stack, never decide it here.**
1. **The stack is decided UPSTREAM, not here.** The product team locked it in the PRD §7 (tech stack table) and the implementation plan §4 (supporting architecture). This skill READS those decisions — it does not interview for the stack.
2. **If the artifacts do NOT specify the stack** (no PRD §7, or plan §4 left choices open) — **STOP and escalate**: "The stack was not locked in the implementation plan. Decide it there first (PRD §7 → plan §4), then engineering can proceed." Do not improvise a stack at engineering time — that is a product decision.

Confirm with the user before coding: which task (from §5 of the plan)? which milestone?

## Execution Workflow

### Step 1: Understand the Task
Read the task from the implementation plan §5 and the linked issue:
1. Task description, owner (BE/FE/shared), effort, priority, milestone
2. Acceptance criteria (from plan §5 + PRD §5)
3. Linked issues and any existing PR/branch
4. QA comments if the task was previously failed

**Bug fixes:** reproduce the bug before fixing; write a failing test first (TDD); verify the fix resolves the exact scenario; check for regressions.
**Features:** break into smaller PRs if >500 lines changed; update docs alongside code.

### Step 2: Read the Relevant Sections
```bash
# confirm the artifacts exist
cat docs/IMPLEMENTATION_PLAN.md | grep -A 20 "## 5. Task Breakdown"
cat docs/PRD.md | grep -A 20 "## 9. API Overview"
cat docs/PRD.md | grep -A 20 "## 10. Data Model"
```
Read only what the task touches — the plan tells you which endpoints, entities, and env vars are in scope.

### Step 3: Plan the Implementation
Write a brief plan before coding, then **wait for user confirmation** for non-trivial tasks (>50 lines):
- Files to create / modify (per the plan's architecture — monolith service layer or FE/BE split)
- API endpoints (from plan §6) / DB changes (from plan §7)
- Env vars (from plan §8)
- Step-by-step order
- Risks

For trivial changes (typo, small UI tweak, single-function refactor, config value): make the change directly → run tests → commit (Fast Mode). For new features/modules: plan → review with user → write tests first (TDD).

### Step 4: Write Code
Follow the conventions from the plan and PRD. House patterns:

**Backend (Go):**
```go
// Error handling — never return raw errors to clients
if err != nil {
    logger.Error("failed to create password reset", zap.Error(err))
    return nil, httperr.InternalServerError("failed to process request")
}

// Repository pattern — no DB calls in handlers
func (r *PasswordResetRepository) Create(ctx context.Context, pr *models.PasswordReset) error {
    _, err := r.collection.InsertOne(ctx, pr)
    return err
}
```

**Frontend (Nuxt/Vue):** composables for API calls (`usePasswordReset`), `<script setup lang="ts">` components with explicit `loading`/`error` state.

### Step 5: Write Tests
* Write the tests `TEST_PLAN.md` §4 specifies for this task — trace each to its source via the §3 matrix; use the §5 fixtures and meet the §9 exit criteria. Do not invent coverage the plan didn't set.
* Backend: `make test` or `go test ./internal/... -v -count=1`; coverage with `-coverprofile`.
* Frontend: `npm run test`; coverage `npm run test:coverage`.

### Step 6: Update Documentation
After implementing, update the relevant docs: `API_CONTRACTS.md` (endpoints), `DATA_CATALOG.md` (collections/fields), `COMPONENT_SPECS.md` (components), `ENVIRONMENT_VARIABLES.md` (env vars, both `.env` and `.env.example`). If the change affects test coverage or deploy config, update `TEST_PLAN.md` / `DEPLOYMENT.md` accordingly — or route the scope change through `kedata-change` first.

### Step 7: Review Before Accepting (Human Verification)
Before the user accepts any changes, provide a Changes Summary (What changed / Why / Risks & Gotchas / Verification checklist) and **do not proceed until the user confirms**.

### Step 8: Verify Before Submitting
**Backend:**
```bash
make test          # all tests pass
golangci-lint run  # lint passes
go build ./...     # compiles
make swagger       # swagger docs generate without errors
```
- [ ] Every new endpoint has Swagger annotations
- [ ] `make swagger` runs without errors; `docs/swagger.json` updated and committed
- [ ] Activity logs emitted for user actions (login, CRUD, settings changes)
- [ ] Admin can query logs via `GET /admin/activity-logs`

**Frontend:**
```bash
npm run test       # all tests pass
npm run lint       # lint passes
npm run build      # builds without errors
```
- [ ] Layout described (or ASCII wireframe provided)
- [ ] Responsive breakpoints tested (1920px, 768px, 375px)
- [ ] Hover/focus/active states described
- [ ] Dark theme compatibility verified

## Shared Code Quality Standards
These apply to every language — the language-specific details (project structure, framework patterns, testing commands) live in the stack-specific skill for the language being worked, which is loaded when that stack is in play.

1. **Error handling:** never return raw errors to clients; standardized error responses; log with context.
2. **Data access:** repository pattern — no DB calls in handlers/controllers; `context`/timeouts; index queried fields; transactions for multi-step operations.
3. **API design:** base path `/api/v1/`; plural nouns (`/users`); consistent response shape `{ "data": {}, "message": "", "error": "" }`.
4. **Validation:** validate all input at the entry point (handler/controller), never trust the client.
5. **Type safety (frontend):** strict mode; no `any`; type all props, emits, composable returns.
6. **State (frontend):** server state in a query library; client state in a store; never `localStorage`/global mutable state for business data.
7. **API integration (frontend):** typed service modules; explicit loading/error states; interceptors for auth token injection.
8. **Styling (frontend):** Tailwind utility classes; design tokens from the Design Brief; dark theme default.

## Environment Variables
Always check before using an env var: is it in `.env`? in `.env.example`? documented in `ENVIRONMENT_VARIABLES.md`?

**Rules:** add new env vars to BOTH `.env` and `.env.example`; update `ENVIRONMENT_VARIABLES.md`; never commit `.env` — only `.env.example`; secrets in production follow the plan §3 decision (Secret Manager for Cloud Run, docker secrets/`.env` on a VM).

## Deployment Awareness
Follow the **deployment platform decision in the implementation plan §3** — this overrides any generic default. The generated config and runbook live in `DEPLOYMENT.md` (produced by `kedata-deploy`); follow it. If it's missing and the task touches infra/Dockerfile/CI, run `/kedata-deploy` rather than improvising.

**If VM + Docker Compose:**
- One `docker-compose.yml` for the whole stack (app + any side services: DB, worker, analytics)
- Patching, backups, and uptime are owned by the team — build for it
- Fixed monthly cost; region matters for latency (choose near users)

**If Cloud Run (serverless):**
- Services are stateless — no local file storage (use GCS); filesystem is ephemeral
- Request timeouts: stay within the Cloud Run cap (default 5m, max ~60m) — long work goes to background jobs
- Background jobs/cron: Cloud Scheduler hitting an endpoint, Cloud Tasks, or a worker service — not in-request
- Use Secret Manager for secrets; `--min-instances 0` to save cost (accept cold starts)
- Service must listen on `$PORT`; one container per service

**Cloudflare:** domain mapping via Cloudflare Workers; single-level subdomains only (`app.kedata.id` ✓, `api.app.kedata.id` ✗); SSL mode **Full**.

## Git & GitHub
* **Branches:** `feature/123-password-reset`, `bugfix/456-login-crash`, `hotfix/auth-down`, `docs/api-contracts`, `refactor/user-service`.
* **Commits:** conventional commits, e.g. `feat(auth): add password reset endpoints (#123)` with a bullet body and `Fixes #123`.
* **PRs:** summary, changes, type, checklist, related issues — link the issue with `Closes #123`.

## Security Rules
1. **Never hardcode secrets** — env vars or Secret Manager.
2. **Never log sensitive data** — emails, tokens, passwords.
3. **Validate all inputs** — backend AND frontend.
4. **Parameterized queries** — no string concatenation in DB queries.
5. **Hash passwords** with bcrypt (cost ≥ 12).
6. **JWT secrets** ≥ 32 bytes, rotated periodically.
7. **CORS** to specific origins, not `*`.
8. **Rate limit** auth endpoints and expensive operations.
9. **Sanitize user content** before rendering (XSS prevention).

## Performance Rules
1. **Database:** indexes for queried fields; pagination for lists (default 20); avoid N+1 queries.
2. **API:** response target <200ms for simple reads; caching for frequently-read data; gzip.
3. **Frontend:** lazy-load routes and heavy components; optimize images (WebP, responsive); debounce search (300ms).

## Communication Style
1. **Ask before assuming** — "Should the reset token be 32 or 64 bytes?"
2. **Propose options** — "I can implement this as A or B. A is simpler, B handles edge cases."
3. **Show your work** — "I've read IMPLEMENTATION_PLAN.md §5 — the task ACs are X, Y, Z."
4. **Flag risks** — "This approach stores tokens in plain text. Should I encrypt them?"
5. **Update docs** — "I've updated API_CONTRACTS.md with the new endpoint."

## Constraints & Guardrails
* **DO NOT** write code before reading the implementation plan — engineering without the approved plan is scope drift.
* **DO NOT** decide or improvise the stack at engineering time — read it from PRD §7 / plan §4; if it's missing, STOP and escalate to the product team.
* **DO NOT** re-interview the product team — the plan, PRD, and brief already decided scope; read them.
* **DO NOT** deviate from the plan's architecture or deployment decisions — if the plan is wrong, escalate to update the plan first.
* **DO NOT** change scope mid-task — if a requirement moves, run `kedata-change` FIRST (PRD → plan → contracts → test plan), then resume. Never let code lead the docs.
* **DO NOT** skip Swagger annotations or activity logs on any backend change.
* **DO NOT** return raw errors to clients or log sensitive data.
* **DO NOT** hardcode secrets or commit `.env`.
* **DO NOT** use string concatenation in DB queries.
* **DO NOT** proceed past the implementation plan or changes summary without user confirmation.
* Keep responses dense; ask before assuming; propose options; flag risks; show your work.

## Example Output Structure
Implementation plan for the task (before coding, for non-trivial tasks):
```markdown
## Task: [KEP-123] Add password reset endpoint
### Files to Create
- internal/models/password_reset.go
- internal/service/password_reset_service.go
- internal/api/password_reset_handler.go
### Files to Modify
- internal/routes/routes.go
### API Endpoints (from plan §6)
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
### DB Changes (from plan §7)
- New collection: password_resets
### Env Vars (from plan §8)
- SENDGRID_API_KEY
- PASSWORD_RESET_EXPIRY=3600
### Step-by-Step Order
1. Model → 2. Repository → 3. Service → 4. Handler + Swagger → 5. Wire routes → 6. Tests → 7. Docs
```

Changes summary (before accepting work):
```markdown
## Changes Summary
### What changed
- Added PasswordResetService with token generation
- Added 2 endpoints: POST /auth/forgot-password and POST /auth/reset-password
- Added password_resets collection with TTL index
### Why
- Users need a way to recover forgotten passwords
### Risks / Gotchas
- Token is hashed before storage (not plain text)
- Rate limit: 3 requests/hour per email
### Verification
- [ ] make test passes
- [ ] make swagger passes
- [ ] Swagger UI shows new endpoints
```
