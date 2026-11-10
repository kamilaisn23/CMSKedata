---
name: kedata-backend-python
description: "Use this skill when writing, refactoring, or reviewing Kedata backend code in Python + FastAPI. Reads the stack and endpoint/data decisions from the approved artifacts (implementation plan + PRD + contracts), then enforces Python-specific standards: auto docs (/docs), activity logging, clean architecture (app/ layout), pydantic validation, pytest, and deployment per the plan's platform choice."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata Backend Engineering — Python + FastAPI

## Purpose
Enforce Kedata's backend engineering standards for the **Python + FastAPI** stack: clean architecture (router → service → repository → DB), the two mandatory standards (**OpenAPI auto-docs at `/docs`** and **Activity Log / Audit Service**), database-first design, pydantic validation, pytest, and deployment-aware decisions following the implementation plan's platform choice (VM + Docker Compose vs serverless Cloud Run). The stack and scope are **read from the approved artifacts** — this skill never decides them.

## When to Use
* User command: `/kedata-backend-python`
* Autonomous trigger: When writing, refactoring, or reviewing Python + FastAPI backend code in a Kedata repo; when designing API endpoints, database schemas, or services in Python. Load when Python is the stack in play (per plan §4) — not at session start.

## Prerequisites & Context Gathering
Before writing code, the agent MUST read the approved artifacts IN ORDER:
1. **`IMPLEMENTATION_PLAN.md`** — check `docs/` first, then root. §1 architecture (monolith vs split), §3 deployment platform, §4 stack (confirm FastAPI + chosen DB), §6 API endpoints, §7 data model, §8 env vars, §10 DoD. **If missing, STOP.**
2. **`PRD.md`** — §7 tech stack, §9 API overview, §10 data model, §18 edge cases — context, not re-interview.
3. **Contracts:** `API_CONTRACTS.md` (shapes + status codes — source of truth), `DATA_CATALOG.md` (schema — update first), `ENVIRONMENT_VARIABLES.md` (config).
4. **`TEST_PLAN.md`** — §3 traceability matrix + §4 test cases for this task; §5 fixtures; §9 exit criteria. Write the tests the plan specifies, not improvised coverage.
5. **Existing repo docs (optional hints only):** `ARCHITECTURE.md` — reuse, never a requirement.

**Stack discipline — READ, never decide:** confirm FastAPI + DB from plan §4 / PRD §7. If missing, STOP and escalate.

**Database before API:** design or update `DATA_CATALOG.md` before writing endpoints. `API_CONTRACTS.md` is the source of truth — update it as you implement.

Ask the user for clarification IF: a schema change has no migration plan; the endpoint conflicts with an existing contract; the task touches an area the plan doesn't cover (→ escalate, don't improvise).

## Execution Workflow

### Step 1: Project Structure
Follow the house Python layout:
```
project-root/
├── app/
│   ├── main.py                 # FastAPI app, routers, exception handlers
│   ├── api/                    # routers/endpoints (HTTP concerns only)
│   ├── core/                   # config, security, logging
│   ├── db/                     # session & migrations
│   ├── models/                 # SQLAlchemy/beanie models
│   ├── schemas/                # pydantic schemas (request/response)
│   ├── repositories/           # data access layer
│   └── services/               # business logic
├── alembic/                    # migrations
├── tests/
├── pyproject.toml
└── Makefile
```

### Step 2: Mandatory Standard 1 — OpenAPI Docs (auto)
* FastAPI auto-generates docs at `/docs` and `/openapi.json` from pydantic schemas + endpoint metadata.
* Give every endpoint: `summary`, `response_model`, `status_code`, `responses` (errors), and `dependencies` (auth).
* **Protect or disable docs in production** (`docs_url=None` behind auth/env flag).

### Step 3: Mandatory Standard 2 — Activity Log / Audit Service
* Async fire-and-forget logging (`asyncio.create_task` or queue) — failures must NOT fail the request.
* Log schema: `user_id`, `action`, `resource_type`, `resource_id`, `metadata` (before/after), `ip_address`, `user_agent`, `request_id`, `timestamp`.
* Admin endpoints: `GET /api/v1/admin/activity-logs` and `GET /api/v1/admin/activity-logs/summary`.
* Indexes: `(user_id, timestamp DESC)`, `(action, timestamp DESC)`, `(resource_type, resource_id)`.

### Step 4: Validation & Error Handling
* Pydantic models for all request/response validation — never trust the client.
* Custom exception handlers mapping domain errors to HTTP status; never leak raw exceptions/tracebacks.
* `try/except` catches specific exceptions, not bare `except:`.
* Type hints on all function signatures; `async`/`await` correct (no blocking calls in async functions).

### Step 5: Database Rules
* Repository pattern — no DB calls in routers. SQLAlchemy/beanie per plan §4.
* Alembic migrations for schema changes — no manual DB edits in production.
* Index queried fields; transactions for multi-step operations; soft deletes preferred; connection pooling configured.

### Step 6: Testing
* Write the tests `TEST_PLAN.md` specifies for this task (§4 cases, §5 fixtures, §3 traceability).
* `pytest`; unit tests for services, integration tests for repositories, API tests with FastAPI TestClient.
* Target ≥70% coverage on service layer. `ruff check .` and `mypy .` pass (if enabled).

### Step 7: Deployment Awareness (per plan §3)
The generated config and runbook live in `DEPLOYMENT.md` (from `kedata-deploy`) — follow it; plan §3 governs. If it's missing and the task touches infra, run `/kedata-deploy` rather than improvising.
**Cloud Run:** stateless — no local FS (GCS); listen on `$PORT` (uvicorn reads it); keep requests within the cap; Secret Manager for secrets; health check endpoint; `--min-instances 0`.
**VM + Docker Compose:** one `docker-compose.yml` for the whole stack; migrations as deploy step; backups owned by the team; region near users.
**Cloudflare:** single-level subdomains only (`api.kedata.id` ✓); SSL **Full**.

### Step 8: Self-Check & Definition of Done
**Self-check — ALL must pass before presenting:**
- [ ] Stack read from plan §4 / PRD §7 (no assumed default)
- [ ] Every endpoint built matches plan §6 / API_CONTRACTS.md
- [ ] Every entity matches plan §7 / DATA_CATALOG.md (updated first for new schema)
- [ ] Docs enabled at `/docs` (dev), disabled in production; every endpoint has response_model + error responses
- [ ] Activity log emitted for every state-changing action
- [ ] Pydantic validation on all inputs; no raw exceptions to clients
- [ ] Alembic migration added for schema changes
- [ ] Tests added per TEST_PLAN.md; ≥70% coverage on service layer; ruff/mypy pass
- [ ] Deployment follows plan §3
- [ ] API_CONTRACTS.md / DATA_CATALOG.md / ENVIRONMENT_VARIABLES.md updated

**Definition of Done:** feature per API contract; docs updated+generated; activity logs added; tests added; migrations added; lint + type checks pass; docs updated; deployed to staging and verified.

## Constraints & Guardrails
* **DO NOT** decide or improvise the stack — read it from plan §4 / PRD §7; if missing, STOP and escalate.
* **DO NOT** write an endpoint before the schema is approved (`DATA_CATALOG.md` first).
* **DO NOT** skip activity logging — mandatory.
* **DO NOT** leak raw exceptions or password hashes to clients.
* **DO NOT** put business logic in routers or repositories.
* **DO NOT** do blocking calls in async handlers.
* **DO NOT** hardcode secrets; use env vars / Secret Manager.
* Keep functions small and focused; ask before assuming; propose options; flag risks.

## Example Output Structure
Router with pydantic schema:
```python
@router.post("/api/v1/auth/forgot-password", response_model=Response, status_code=200,
             summary="Send password reset email",
             responses={400: {"model": Response}, 404: {"model": Response}})
async def forgot_password(body: ForgotPasswordRequest, request: Request):
    """Send a password reset email."""
    try:
        await auth_service.forgot_password(body.email)
    except DomainError as e:
        raise http_exc_for(e) from e
    return Response(data={}, message="reset email sent")
```
Pydantic schema:
```python
class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
```
