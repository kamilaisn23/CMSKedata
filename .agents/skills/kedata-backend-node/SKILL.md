---
name: kedata-backend-node
description: "Use this skill when writing, refactoring, or reviewing Kedata backend code in Node.js + Express. Reads the stack and endpoint/data decisions from the approved artifacts (implementation plan + PRD + contracts), then enforces Node-specific standards: swagger-jsdoc docs, activity logging, clean architecture (src/ layout), zod validation, Jest/Vitest, and deployment per the plan's platform choice."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata Backend Engineering — Node.js + Express

## Purpose
Enforce Kedata's backend engineering standards for the **Node.js + Express** stack: clean architecture (controller → service → repository → DB), the two mandatory standards (**Swagger via swagger-jsdoc** and **Activity Log / Audit Service**), database-first design, zod validation, Jest/Vitest, and deployment-aware decisions following the implementation plan's platform choice (VM + Docker Compose vs serverless Cloud Run). The stack and scope are **read from the approved artifacts** — this skill never decides them.

## When to Use
* User command: `/kedata-backend-node`
* Autonomous trigger: When writing, refactoring, or reviewing Node.js + Express backend code in a Kedata repo; when designing API endpoints, database schemas, or services in Node. Load when Node is the stack in play (per plan §4) — not at session start.

## Prerequisites & Context Gathering
Before writing code, the agent MUST read the approved artifacts IN ORDER:
1. **`IMPLEMENTATION_PLAN.md`** — check `docs/` first, then root. §1 architecture (monolith vs split), §3 deployment platform, §4 stack (confirm Express + chosen DB), §6 API endpoints, §7 data model, §8 env vars, §10 DoD. **If missing, STOP.**
2. **`PRD.md`** — §7 tech stack, §9 API overview, §10 data model, §18 edge cases — context, not re-interview.
3. **Contracts:** `API_CONTRACTS.md` (shapes + status codes — source of truth), `DATA_CATALOG.md` (schema — update first), `ENVIRONMENT_VARIABLES.md` (config).
4. **`TEST_PLAN.md`** — §3 traceability matrix + §4 test cases for this task; §5 fixtures; §9 exit criteria. Write the tests the plan specifies, not improvised coverage.
5. **Existing repo docs (optional hints only):** `ARCHITECTURE.md` — reuse, never a requirement.

**Stack discipline — READ, never decide:** confirm Express + DB from plan §4 / PRD §7. If missing, STOP and escalate.

**Database before API:** design or update `DATA_CATALOG.md` before writing endpoints. `API_CONTRACTS.md` is the source of truth — update it as you implement.

Ask the user for clarification IF: a schema change has no migration plan; the endpoint conflicts with an existing contract; the task touches an area the plan doesn't cover (→ escalate, don't improvise).

## Execution Workflow

### Step 1: Project Structure
Follow the house Node layout:
```
project-root/
├── src/
│   ├── app.ts                 # Express app, middleware wiring
│   ├── config/                # env config, fail-fast validation
│   ├── controllers/           # HTTP concerns only (parse, call service, respond)
│   ├── middleware/            # auth, CORS, request ID, error handler
│   ├── models/                # Prisma/TypeORM/Mongoose models
│   ├── repositories/          # data access layer
│   ├── routes/                # route definitions
│   ├── services/              # business logic
│   └── utils/                 # response helpers, logger
├── tests/
├── prisma/ (or migrations/)   # schema & migrations
├── package.json
└── tsconfig.json
```

### Step 2: Mandatory Standard 1 — Swagger (swagger-jsdoc)
* Use `swagger-jsdoc` + `swagger-ui-express`; define OpenAPI specs in JSDoc comments or YAML.
* Every endpoint annotated: summary, tags, parameters, requestBody, responses (success + errors).
* Swagger UI accessible at `/api-docs` (or `/swagger`); disabled/protected in production.

### Step 3: Mandatory Standard 2 — Activity Log / Audit Service
* Async fire-and-forget logging (queue/worker) — failures must NOT fail the request.
* Log schema: `user_id`, `action`, `resource_type`, `resource_id`, `metadata` (before/after), `ip_address`, `user_agent`, `request_id`, `timestamp`.
* Admin endpoints: `GET /api/v1/admin/activity-logs` and `GET /api/v1/admin/activity-logs/summary`.
* Indexes: `(user_id, timestamp DESC)`, `(action, timestamp DESC)`, `(resource_type, resource_id)`.

### Step 4: Validation & Error Handling
* zod (or joi) schemas for all request validation — never trust the client.
* Central error-handling middleware mapping domain errors to HTTP status; never return stack traces.
* `async/await` throughout — no callback hell. `Promise.all` for parallel async ops.
* No `var` — use `const`/`let`. TypeScript strict mode.

### Step 5: Database Rules
* Repository pattern — no DB calls in controllers. Prisma/TypeORM/Mongoose per plan §4.
* Prisma migrate / TypeORM migrations for schema changes — no manual DB edits in production.
* Index queried fields; transactions for multi-step operations; soft deletes preferred; connection pooling configured.

### Step 6: Testing
* Write the tests `TEST_PLAN.md` specifies for this task (§4 cases, §5 fixtures, §3 traceability).
* Jest or Vitest; unit tests for services, integration tests for repositories, API tests with supertest.
* Target ≥70% coverage on service layer. `eslint` passes; `tsc --noEmit` clean.

### Step 7: Deployment Awareness (per plan §3)
The generated config and runbook live in `DEPLOYMENT.md` (from `kedata-deploy`) — follow it; plan §3 governs. If it's missing and the task touches infra, run `/kedata-deploy` rather than improvising.
**Cloud Run:** stateless — no local FS (GCS); listen on `$PORT`; keep requests within the cap; Secret Manager for secrets; health check endpoint; `--min-instances 0`.
**VM + Docker Compose:** one `docker-compose.yml` for the whole stack; migrations as deploy step; backups owned by the team; region near users.
**Cloudflare:** single-level subdomains only (`api.kedata.id` ✓); SSL **Full**.

### Step 8: Self-Check & Definition of Done
**Self-check — ALL must pass before presenting:**
- [ ] Stack read from plan §4 / PRD §7 (no assumed default)
- [ ] Every endpoint built matches plan §6 / API_CONTRACTS.md
- [ ] Every entity matches plan §7 / DATA_CATALOG.md (updated first for new schema)
- [ ] Swagger annotations on every new/modified endpoint; UI accessible
- [ ] Activity log emitted for every state-changing action
- [ ] zod validation on all inputs; no raw errors/stack traces to clients
- [ ] Migration added for schema changes
- [ ] Tests added per TEST_PLAN.md; ≥70% coverage on service layer; eslint + tsc pass
- [ ] Deployment follows plan §3
- [ ] API_CONTRACTS.md / DATA_CATALOG.md / ENVIRONMENT_VARIABLES.md updated

**Definition of Done:** feature per API contract; Swagger updated; activity logs added; tests added; migrations added; lint + type checks pass; docs updated; deployed to staging and verified.

## Constraints & Guardrails
* **DO NOT** decide or improvise the stack — read it from plan §4 / PRD §7; if missing, STOP and escalate.
* **DO NOT** write an endpoint before the schema is approved (`DATA_CATALOG.md` first).
* **DO NOT** skip Swagger annotations or activity logging — both mandatory.
* **DO NOT** return raw errors, stack traces, or password hashes to clients.
* **DO NOT** put business logic in controllers or repositories.
* **DO NOT** use callbacks; `async/await` everywhere. No `var`.
* **DO NOT** hardcode secrets; use env vars / Secret Manager.
* Keep functions small and focused; ask before assuming; propose options; flag risks.

## Example Output Structure
Controller with zod validation:
```ts
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = ForgotPasswordSchema.parse(req.body) // throws ZodError → 422
    await authService.forgotPassword(body.email)
    res.json({ data: {}, message: "reset email sent", error: "" })
  } catch (err) {
    next(err) // central error middleware maps to status
  }
}
```
Central error middleware:
```ts
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) return res.status(422).json({ data: {}, message: "", error: "validation failed", errors: err.flatten() })
  if (err instanceof DomainError) return res.status(err.status).json({ data: {}, message: "", error: err.message })
  logger.error(err)
  return res.status(500).json({ data: {}, message: "", error: "internal error" })
})
```
