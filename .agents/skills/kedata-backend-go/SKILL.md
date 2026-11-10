---
name: kedata-backend-go
description: "Use this skill when writing, refactoring, or reviewing Kedata backend code in Go + Gin. Reads the stack and endpoint/data decisions from the approved artifacts (implementation plan + PRD + contracts), then enforces Go-specific standards: swaggo Swagger, activity logging, clean architecture (internal/ layout), httperr error handling, and deployment per the plan's platform choice."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata Backend Engineering — Go + Gin

## Purpose
Enforce Kedata's backend engineering standards for the **Go + Gin** stack: clean architecture (handler → service → repository → DB), the two mandatory standards (**Swagger via swaggo** and **Activity Log / Audit Service**), database-first design, `httperr` error handling, and deployment-aware decisions following the implementation plan's platform choice (VM + Docker Compose vs serverless Cloud Run). The stack and scope are **read from the approved artifacts** — this skill never decides them.

## When to Use
* User command: `/kedata-backend-go`
* Autonomous trigger: When writing, refactoring, or reviewing Go + Gin backend code in a Kedata repo; when designing API endpoints, database schemas, or services in Go. Load when Go is the stack in play (per plan §4) — not at session start.

## Prerequisites & Context Gathering
Before writing code, the agent MUST read the approved artifacts IN ORDER:
1. **`IMPLEMENTATION_PLAN.md`** — check `docs/` first, then root. §1 architecture (monolith vs split — where does the Go service live?), §3 deployment platform, §4 stack (confirm Go + Gin + chosen DB), §6 API endpoints (the exact list to build), §7 data model, §8 env vars, §10 DoD. **If missing, STOP — backend work requires the approved implementation plan.**
2. **`PRD.md`** — §7 tech stack, §9 API overview, §10 data model, §18 edge cases — context, not re-interview.
3. **Contracts:** `API_CONTRACTS.md` (request/response shapes + status codes — the source of truth), `DATA_CATALOG.md` (schema — update first for new schema), `ENVIRONMENT_VARIABLES.md` (config).
4. **`TEST_PLAN.md`** — §3 traceability matrix + §4 test cases for this task; §5 fixtures; §9 exit criteria. Write the tests the plan specifies, not improvised coverage.
5. **Existing repo docs (optional hints only):** `ARCHITECTURE.md` — reuse, never a requirement.

**Stack discipline — READ, never decide:** confirm Go + Gin + DB from plan §4 / PRD §7. If the artifacts don't specify, STOP and escalate: "The stack was not locked in the implementation plan."

**Database before API:** design or update `DATA_CATALOG.md` before writing endpoints. No endpoint without an approved schema. `API_CONTRACTS.md` is the source of truth for request/response shapes and status codes — update it as you implement.

Ask the user for clarification IF: a schema change has no migration plan; the endpoint conflicts with an existing contract; the task touches an area the plan doesn't cover (→ escalate the plan, don't improvise).

## Execution Workflow

### Step 1: Project Structure
Follow the house Go layout:
```
project-root/
├── cmd/server/main.go           # entrypoint, dependency wiring
├── internal/
│   ├── config/                  # env config, fail-fast validation
│   ├── delivery/http/
│   │   ├── handler/             # route handlers (HTTP concerns only)
│   │   ├── middleware/          # auth, CORS, request ID, logging
│   │   └── router.go
│   ├── domain/
│   │   ├── models/              # entity structs
│   │   └── errors.go            # domain errors
│   ├── repository/              # data access (interfaces + impl)
│   └── service/                 # business logic
├── pkg/                         # jwt, password, validator, response, logger
├── docs/                        # generated Swagger files
├── migrations/                  # golang-migrate / goose
├── Makefile
└── go.mod
```

### Step 2: Mandatory Standard 1 — Swagger (swaggo)
* Use `swaggo/gin-swagger`. Annotate every handler with godoc comments (`@Summary`, `@Param`, `@Success`, `@Failure`, `@Router`).
* Run `make swagger` to regenerate `docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`; commit generated docs.
* Swagger UI accessible at `/swagger`.

Swagger checklist: UI accessible; every endpoint annotated; request bodies typed; response codes 200, 201, 400, 401, 403, 404, 409, 422, 500; security definitions on auth endpoints; `make swagger` exists; CI validates generation.

### Step 3: Mandatory Standard 2 — Activity Log / Audit Service
* Async fire-and-forget logging (goroutine or queue) — logging failures must NOT fail the main request.
* Log schema: `user_id`, `action`, `resource_type`, `resource_id`, `metadata` (before/after), `ip_address`, `user_agent`, `request_id`, `timestamp`.
* Admin endpoints: `GET /api/v1/admin/activity-logs` and `GET /api/v1/admin/activity-logs/summary`.
* Indexes: `(user_id, timestamp DESC)`, `(action, timestamp DESC)`, `(resource_type, resource_id)`.

### Step 4: Error Handling (httperr)
* Never return raw errors to clients — use `httperr` for standardized responses; log with `zap` context.
* Centralized domain errors: `ErrNotFound`, `ErrUnauthorized`, `ErrForbidden`, `ErrConflict`, `ErrValidation`; map to HTTP status in handlers.
* Use `context.Context` through all layers with timeouts.

### Step 5: Database Rules
* Repository pattern — no DB calls in handlers. sqlx/pgx/GORM per plan §4.
* Migrations (golang-migrate/goose) for schema changes — no manual DB edits in production.
* Index queried fields; transactions for multi-step operations; soft deletes preferred; connection pooling configured.

### Step 6: Testing
* Write the tests `TEST_PLAN.md` specifies for this task (§4 cases, §5 fixtures, §3 traceability).
* `go test ./...` + `go vet ./...`; unit tests for services, integration tests for repositories, handler tests with httptest.
* Target ≥70% coverage on service layer. Race detector: `go test -race ./...`.

### Step 7: Deployment Awareness (per plan §3)
The generated config and runbook live in `DEPLOYMENT.md` (from `kedata-deploy`) — follow it; plan §3 governs. If it's missing and the task touches infra, run `/kedata-deploy` rather than improvising.
**Cloud Run:** stateless — no local FS (GCS); listen on `$PORT`; keep requests within the cap (default 5m, max ~60m); Secret Manager for secrets; health check endpoint; `--min-instances 0` for cost.
**VM + Docker Compose:** one `docker-compose.yml` for the whole stack; migrations as deploy step; backups owned by the team; region near users.
**Cloudflare:** single-level subdomains only (`api.kedata.id` ✓); SSL **Full**.

### Step 8: Self-Check & Definition of Done
**Self-check — ALL must pass before presenting:**
- [ ] Stack read from plan §4 / PRD §7 (no assumed default)
- [ ] Every endpoint built matches plan §6 / API_CONTRACTS.md
- [ ] Every entity matches plan §7 / DATA_CATALOG.md (updated first for new schema)
- [ ] Swagger annotations on every new/modified endpoint; `make swagger` runs; docs committed
- [ ] Activity log emitted for every state-changing action
- [ ] No raw errors to clients; domain errors mapped to HTTP status codes
- [ ] Migrations added; tests added per TEST_PLAN.md; ≥70% coverage on service layer
- [ ] Deployment follows plan §3
- [ ] API_CONTRACTS.md / DATA_CATALOG.md / ENVIRONMENT_VARIABLES.md updated

**Definition of Done:** feature per API contract; Swagger updated+generated; activity logs added; tests added; migrations added; lint + type checks pass; docs updated; deployed to staging and verified.

## Constraints & Guardrails
* **DO NOT** decide or improvise the stack — read it from plan §4 / PRD §7; if missing, STOP and escalate.
* **DO NOT** write an endpoint before the schema is approved (`DATA_CATALOG.md` first).
* **DO NOT** skip Swagger annotations or activity logging — both mandatory.
* **DO NOT** return raw errors or password hashes to clients.
* **DO NOT** put business logic in handlers or repositories.
* **DO NOT** hardcode secrets; use env vars / Secret Manager.
* **DO NOT** use string concatenation in DB queries (SQL/NoSQL injection).
* Keep functions small and focused; ask before assuming; propose options; flag risks.

## Example Output Structure
Error handling pattern:
```go
if err != nil {
    logger.Error("failed to create password reset", zap.Error(err))
    return nil, httperr.InternalServerError("failed to process request")
}
```
Repository pattern:
```go
func (r *PasswordResetRepository) Create(ctx context.Context, pr *models.PasswordReset) error {
    _, err := r.collection.InsertOne(ctx, pr)
    return err
}
```
Swagger handler annotation:
```go
// ForgotPassword handles POST /api/v1/auth/forgot-password
// @Summary Send password reset email
// @Tags auth
// @Accept json
// @Produce json
// @Param body body ForgotPasswordRequest true "Request"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Router /api/v1/auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *gin.Context) { ... }
```
