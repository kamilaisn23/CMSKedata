---
name: kedata-backend-rust
description: "Use this skill when writing, refactoring, or reviewing Kedata backend code in Rust (optionally with the Axum framework). Reads the stack and endpoint/data decisions from the approved artifacts (implementation plan + PRD + contracts), then enforces Rust-specific standards: utoipa OpenAPI docs, activity logging, clean architecture (src/ layout), thiserror domain errors, cargo test, and deployment per the plan's platform choice. Pairs with the rust-expert-best-practices-code-review skill (wispbit-ai/skills) for idiomatic Rust."
version: 1.2.0
author: Kedata Indonesia
---

# Skill: Kedata Backend Engineering — Rust (Axum optional)

## Purpose
Enforce Kedata's backend engineering standards for the **Rust** stack (optionally with **Axum**): clean architecture (handler → service → repository → DB), the two mandatory standards (**OpenAPI docs via utoipa** and **Activity Log / Audit Service**), database-first design, `thiserror` domain errors, `cargo test`, and deployment-aware decisions following the implementation plan's platform choice (VM + Docker Compose vs serverless Cloud Run). The stack and scope are **read from the approved artifacts** — this skill never decides them.

## When to Use
* User command: `/kedata-backend-rust`
* Autonomous trigger: When writing, refactoring, or reviewing Rust backend code in a Kedata repo; when designing API endpoints, database schemas, or services in Rust. Load when Rust is the stack in play (per plan §4) — not at session start. Framework is per plan §4: Axum (recommended) or another tower-based framework.

## Prerequisites & Context Gathering
Before writing code, the agent MUST read the approved artifacts IN ORDER:
1. **`IMPLEMENTATION_PLAN.md`** — check `docs/` first, then root. §1 architecture (monolith vs split), §3 deployment platform, §4 stack (confirm Rust + framework + chosen DB), §6 API endpoints, §7 data model, §8 env vars, §10 DoD. **If missing, STOP.**
2. **`PRD.md`** — §7 tech stack, §9 API overview, §10 data model, §18 edge cases — context, not re-interview.
3. **Contracts:** `API_CONTRACTS.md` (shapes + status codes — source of truth), `DATA_CATALOG.md` (schema — update first), `ENVIRONMENT_VARIABLES.md` (config).
4. **`TEST_PLAN.md`** — §3 traceability matrix + §4 test cases for this task; §5 fixtures; §9 exit criteria. Write the tests the plan specifies, not improvised coverage.
5. **Existing repo docs (optional hints only):** `ARCHITECTURE.md` — reuse, never a requirement.

**Stack discipline — READ, never decide:** confirm Rust + framework + DB from plan §4 / PRD §7. If missing, STOP and escalate.

**Database before API:** design or update `DATA_CATALOG.md` before writing endpoints. `API_CONTRACTS.md` is the source of truth — update it as you implement.

Ask the user for clarification IF: a schema change has no migration plan; the endpoint conflicts with an existing contract; the task touches an area the plan doesn't cover (→ escalate, don't improvise).

## Companion Skill — rust-expert-best-practices-code-review (idiomatic-Rust layer)
This skill enforces Kedata's *engineering* standards (layout, mandatory OpenAPI + activity log,
contracts). The **rust-expert-best-practices-code-review** skill from
[wispbit-ai/skills](https://github.com/wispbit-ai/skills) supplies the *idiomatic-Rust craft* —
type safety, error handling, API design, code quality, readability and performance rules — for
writing, refactoring, and reviewing Rust. Load it alongside this skill; it does not replace the
approved artifacts.

* **Install once per project:**
  `npx skills add https://github.com/wispbit-ai/skills --skill rust-expert-best-practices-code-review`.
* **Load when:** before writing/reviewing/refactoring Rust — structs, functions, enums, traits,
  error handling, `Result` types, public APIs, or performance work. Read the individual rule files
  under the skill's `rules/` for detail.
* **Priority order it applies:** type safety (`use-typesafe-`, `use-enum-`) →
  error handling (`result-`, `avoid-panic`) → API design (`use-borrowed-`, `prefer-builder-`) →
  code quality (`use-iterator-`, `prefer-format`) → readability (`use-named-`) →
  performance (`avoid-rc`, `avoid-box`).
* **Boundary & precedence:** it governs *how the Rust is written*, not *what is built* — plan
  §4/§6, `API_CONTRACTS.md`, and `DATA_CATALOG.md` stay the source of truth for scope, endpoints,
  and schema. Where a rule and a Kedata mandatory standard diverge, the **Kedata standard wins**
  (e.g. keep `thiserror` domain errors and `?`-based propagation per Step 4 — both align with
  `result-error-returns` / `avoid-panic`). Note any deliberate deviation in the PR.

## Execution Workflow

### Step 1: Project Structure
Follow the house Rust layout (workspace-ready):
```
project-root/
├── src/
│   ├── main.rs                # entrypoint, state, router wiring
│   ├── config.rs              # env config, fail-fast validation
│   ├── api/                   # handlers, extractors, routes
│   ├── domain/                # models, errors (thiserror)
│   ├── repository/            # data access layer
│   └── service/               # business logic
├── migrations/                # sqlx migrations
├── Cargo.toml
└── Makefile
```

### Step 2: Mandatory Standard 1 — OpenAPI Docs (utoipa)
* Use `utoipa` + `utoipa-swagger-ui` for OpenAPI generation from Rust types.
* Annotate handlers/structs with `#[utoipa::path]` (responses, params, tags); expose Swagger UI at `/swagger` (or `/docs`).
* Protect or disable docs in production.

### Step 3: Mandatory Standard 2 — Activity Log / Audit Service
* Async fire-and-forget logging (`tokio::spawn` or queue) — failures must NOT fail the request.
* Log schema: `user_id`, `action`, `resource_type`, `resource_id`, `metadata` (before/after), `ip_address`, `user_agent`, `request_id`, `timestamp`.
* Admin endpoints: `GET /api/v1/admin/activity-logs` and `GET /api/v1/admin/activity-logs/summary`.
* Indexes: `(user_id, timestamp DESC)`, `(action, timestamp DESC)`, `(resource_type, resource_id)`.

### Step 4: Error Handling (thiserror)
* Define domain errors with `thiserror` — never leak internal error details to clients.
* Map domain errors to HTTP status in a central `IntoResponse` impl.
* Use `tokio` + `sqlx` (or `sea-orm`) async throughout; `tracing` for structured logging with request IDs.

### Step 5: Database Rules
* Repository pattern — no DB calls in handlers. sqlx/sea-orm per plan §4.
* sqlx migrations for schema changes — no manual DB edits in production.
* Index queried fields; transactions for multi-step operations; soft deletes preferred; connection pool configured.

### Step 6: Testing
* Write the tests `TEST_PLAN.md` specifies for this task (§4 cases, §5 fixtures, §3 traceability).
* `cargo test`; unit tests for services, integration tests for repositories (test DB), handler tests with `tower::ServiceExt::oneshot`.
* Target ≥70% coverage on service layer. `cargo clippy` clean; `cargo fmt` applied.
* Idiomatic craft: apply the companion `rust-expert-best-practices-code-review` rules while writing/reviewing (see Companion Skill); `cargo clippy` clean is the floor, not the ceiling.

### Step 7: Deployment Awareness (per plan §3)
The generated config and runbook live in `DEPLOYMENT.md` (from `kedata-deploy`) — follow it; plan §3 governs. If it's missing and the task touches infra, run `/kedata-deploy` rather than improvising.
**Cloud Run:** stateless — no local FS (GCS); listen on `$PORT`; keep requests within the cap; Secret Manager for secrets; health check endpoint; `--min-instances 0`; compile with musl or multi-stage builder for slim images.
**VM + Docker Compose:** one `docker-compose.yml` for the whole stack; migrations as deploy step; backups owned by the team; region near users.
**Cloudflare:** single-level subdomains only (`api.kedata.id` ✓); SSL **Full**.

### Step 8: Self-Check & Definition of Done
**Self-check — ALL must pass before presenting:**
- [ ] Stack read from plan §4 / PRD §7 (no assumed default)
- [ ] Every endpoint built matches plan §6 / API_CONTRACTS.md
- [ ] Every entity matches plan §7 / DATA_CATALOG.md (updated first for new schema)
- [ ] utoipa annotations on every new/modified endpoint; Swagger UI accessible
- [ ] Activity log emitted for every state-changing action
- [ ] thiserror domain errors; no internal error details leaked
- [ ] Migration added for schema changes
- [ ] Tests added per TEST_PLAN.md; ≥70% coverage on service layer; clippy + fmt pass
- [ ] Companion `rust-expert-best-practices-code-review` rules applied (no `unwrap`/`panic!` in request paths, borrowed argument types, iterator transforms over push loops, all enum arms handled)
- [ ] Deployment follows plan §3
- [ ] API_CONTRACTS.md / DATA_CATALOG.md / ENVIRONMENT_VARIABLES.md updated

**Definition of Done:** feature per API contract; OpenAPI updated; activity logs added; tests added; migrations added; clippy + fmt pass; docs updated; deployed to staging and verified.

## Constraints & Guardrails
* **DO NOT** decide or improvise the stack — read it from plan §4 / PRD §7; if missing, STOP and escalate.
* **DO NOT** write an endpoint before the schema is approved (`DATA_CATALOG.md` first).
* **DO NOT** skip OpenAPI annotations or activity logging — both mandatory.
* **DO NOT** leak internal errors (unwrap/expect panics to clients); use thiserror + IntoResponse.
* **DO NOT** put business logic in handlers or repositories.
* **DO NOT** use blocking calls in async handlers; `tokio` throughout.
* **DO NOT** hardcode secrets; use env vars / Secret Manager.
* **DO NOT** let the companion `rust-expert-best-practices-code-review` skill override the approved plan/contracts — it guides idiom only; Kedata's mandatory standards and the artifacts win on conflict.
* Keep functions small and focused; ask before assuming; propose options; flag risks.

## Example Output Structure
Domain error with thiserror:
```rust
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("not found")]
    NotFound,
    #[error("unauthorized")]
    Unauthorized,
    #[error("conflict: {0}")]
    Conflict(String),
}
```
Axum handler with utoipa:
```rust
/// Send password reset email
#[utoipa::path(
    post,
    path = "/api/v1/auth/forgot-password",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "Reset email sent"),
        (status = 400, description = "Validation error"),
    )
)]
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(body): Json<ForgotPasswordRequest>,
) -> Result<Json<Response>, ApiError> {
    state.auth_service.forgot_password(&body.email).await?;
    Ok(Json(Response::ok()))
}
```
