---
name: kedata-deploy
description: "Use this skill to turn the implementation plan's deployment decision (§3) into real deployment artifacts and a DEPLOYMENT.md runbook — Dockerfile(s), docker-compose or Cloud Run config, CI/CD pipeline, secrets wiring, migrations, health checks, rollout, and rollback. Reads the plan, contracts, and test plan, then produces the deployable surface. Trigger when the user says \"deploy this\", \"set up CI/CD\", \"write the Dockerfile/compose\", or before the first staging deploy."
version: 1.0.0
author: Kedata Indonesia
---

# Skill: Kedata Deploy

## Purpose
Produce the **deployment artifacts + `DEPLOYMENT.md` runbook** for the platform the implementation plan already chose (`§3`: VM + Docker Compose / Cloud Run / hybrid). Planning decides *where it runs*; this skill makes it actually run — container build, service topology, secrets, migrations, CI/CD, domains, health checks, rollout, and rollback — without re-deciding the platform.

The differentiator is **constraint compliance**: Cloud Run's statelessness/timeout/job rules and a VM's patching/backup/ownership rules are enforced in the generated config, not discovered in production. The plan's `§3` decision is the source of truth; this skill never second-guesses it.

This skill **produces deploy config and the runbook, not application code** — the stack skills own the app; this skill owns how it ships.

## When to Use
* User command: `/kedata-deploy`
* Autonomous trigger: When the user says "deploy this", "set up CI/CD", "write the Dockerfile / docker-compose / cloudbuild", "how do we ship?", or before the first staging/production deploy.
* Run AFTER implementation (or alongside it for the first deployable slice) and BEFORE or WITH `kedata-review` (review checks deployment against plan §3). Run AFTER the plan is approved — never before.
* **Do NOT use** to choose the platform — it is locked in plan §3; escalate if undecided.
* **Do NOT use** to write application features — that is the stack skill.

## Prerequisites & Context Gathering
Before doing anything, the agent MUST:
1. **Read the implementation plan first (mandatory).** `docs/IMPLEMENTATION_PLAN.md`. Extract: §1 architecture (monolith vs split — how many deployables?), §2 repo layout, §3 **platform decision + constraints** (statelessness, background jobs, timeouts, secrets, cost, region, domain, CI/CD), §4 stack (runtime, port, build command), §8 env vars, §11 risks/rollout. **If §3 is "TBD" or missing, STOP** — the platform must be decided in the plan first.
2. **Read the contracts (mandatory).** `ENVIRONMENT_VARIABLES.md` (the exact env matrix + secrets handling), `API_CONTRACTS.md` (base path, health/auth endpoints), `DATA_CATALOG.md` (migrations needed).
3. **Read the test plan (recommended).** `docs/TEST_PLAN.md` §7 (which suites gate a deploy) and §9 (exit criteria) — CI must run them.
4. **Inspect the repo:** `Dockerfile`/`docker-compose.yml`/`cloudbuild.yaml`/`.github/workflows/`/`.gitlab-ci.yml` if present. **Update in place** — never create a second pipeline or duplicate compose file.
5. **Frame the session (2 minutes max):** "I'll generate the deploy surface from plan §3 — build, services, secrets, migrations, CI/CD, rollout, rollback. Confirm the environment names and who can deploy."

## Interview Protocol (How to Grill)
1. **One domain at a time.** 3-5 questions, wait, follow up.
2. **Read the platform, never re-decide it.** If the user wants a different platform, route them back to `kedata-implementation-plan` — do not silently change it here.
3. **Follow up until bedrock.** "Deploy on push" is not an answer — grill for the exact trigger, environment order, and who approves production.
4. **Force the failure path.** Every deploy needs a rollback; every migration needs a backup plan.
5. **Don't over-grill.** Stop when answers repeat or the user says "you decide" (→ Open Question).
6. **End with the readback.** "Plan §3 says [platform], one app service + [worker], region asia-southeast2, CI on push to main, rollback via [method]. Correct me if wrong."

## Execution Workflow

### Step 1: Domain 1 — Deployable Inventory
**Goal:** what ships, as how many units.
* From plan §1/§2: monolith (one deployable) or split (FE + BE, possibly worker).
* From plan §3: services list, region, domains.
* Map each service to its runtime (plan §4) and build command.
**Bedrock signal:** §2 lists every deployable with its runtime, build command, and image/entrypoint — no "TBD".

### Step 2: Domain 2 — Containerization
**Goal:** reproducible, minimal, secure images.
* One multi-stage `Dockerfile` per service (builder → slim runtime).
* Non-root user; no secrets baked into layers; `.dockerignore` written.
* **Cloud Run rules:** listen on `$PORT`; one process per container; stateless (no local FS writes); health/readiness endpoint.
* **VM rules:** compose service with `restart: unless-stopped`, volumes for persistent data, healthcheck.
**Bedrock signal:** every service has a Dockerfile that respects its platform's entrypoint/port/statelessness rules.

### Step 3: Domain 3 — Service Topology & Compose/Cloud Config
**Goal:** the actual runtime wiring.
* **VM + Docker Compose:** one `docker-compose.yml` for the whole stack (app + DB/worker/analytics as decided); named volumes; healthchecks; restart policies; networks.
* **Cloud Run:** service definitions (`cloudbuild.yaml` or deploy script): image, region, `$PORT`, min/max instances, memory/CPU, concurrency, timeout, env + secret refs.
* **Hybrid:** compose for the worker VM, Cloud Run for the app — record the split.
**Bedrock signal:** §3/§4 show the full topology matching plan §3, including every side service and its healthcheck.

### Step 4: Domain 4 — Config & Secrets
**Goal:** correct config per environment, no leaks.
* Map every var from `ENVIRONMENT_VARIABLES.md` to its environment.
* **Cloud Run:** Secret Manager refs for secrets; env vars for non-secrets.
* **VM:** `.env` (0600) or docker secrets; never commit `.env`; keep `.env.example` current.
* Fail-fast startup validation for required vars.
**Bedrock signal:** §5 maps every env var to a provisioning method per environment — no secret in an image or the repo.

### Step 5: Domain 5 — Migrations & Data Safety
**Goal:** schema changes are a deploy step, not a manual edit.
* Migration tool per plan §4 (golang-migrate / alembic / prisma / sqlx).
* Run order: backup → migrate → start new version (or expand/contract for zero-downtime).
* Down migrations / rollback path; who runs them and when.
**Bedrock signal:** §6 states the migration command, order, backup step, and rollback.

### Step 6: Domain 6 — CI/CD Pipeline
**Goal:** build → test → image → deploy, gated.
* Pipeline stages: install → lint → test (suites from TEST_PLAN §7) → build → image push → deploy.
* Environments in order: dev/CI → staging → production; approval gate before production.
* Trigger policy (push to main / tag / manual) from plan §3.
* Platform target: GitHub Actions, GitLab CI, or Cloud Build — match the repo host.
**Bedrock signal:** §7 defines the pipeline stages, triggers, environment order, and production gate.

### Step 7: Domain 7 — Domains, TLS & Edge
**Goal:** reachable, secure URLs.
* Map services to domains (plan §3).
* **Cloudflare rule:** single-level subdomains only (`app.kedata.id` ✓, `api.app.kedata.id` ✗); SSL mode **Full**.
* DNS records, redirects, CORS origins (specific, never `*` in prod).
**Bedrock signal:** §8 lists every domain, its target, TLS mode, and CORS origins.

### Step 8: Domain 8 — Observability & Health
**Goal:** you can tell if it's alive.
* Health/readiness endpoints; structured logs shipped off-host (Cloud Run logs / VM log driver).
* Activity-log destination per stack standard.
* Basic alarms: error rate, latency, restarts, disk (VM).
**Bedrock signal:** §9 defines health checks, log destination, and the minimum alarm set.

### Step 9: Domain 9 — Rollout & Rollback
**Goal:** ship safely, undo quickly.
* Rollout order (staging → canary/percentage → full) per plan §11.
* Rollback: previous image revision (Cloud Run) or `docker compose` previous tag (VM); DB rollback policy.
* Feature flags for risky tasks (plan §4).
* Post-deploy smoke (TEST_PLAN §7).
**Bedrock signal:** §10 states rollout order, rollback command, DB rollback policy, and the post-deploy smoke gate.

### Step 10: Draft & Self-Check
* Write the generated files (Dockerfile, compose/cloud config, CI pipeline, `.dockerignore`, `.env.example`) **and** `docs/DEPLOYMENT.md`.
* Save the runbook to **`docs/DEPLOYMENT.md`** (default). EXCEPTION — if the team already uses root `DEPLOYMENT.md`, update that file in place; never duplicate.
* Set §11 Document Info: status `Draft`, version `0.1`, source plan + contract versions, owner.
* Run the self-check — ALL must pass before presenting:
  - [ ] Platform matches plan §3 exactly — no re-decision
  - [ ] Every deployable has a build path + Dockerfile + healthcheck
  - [ ] Cloud Run: `$PORT`, statelessness, timeout/job handling, Secret Manager all addressed
  - [ ] VM: compose covers the whole stack, volumes, restart policy, backups, patching owner
  - [ ] Every env var from `ENVIRONMENT_VARIABLES.md` is provisioned per environment
  - [ ] No secrets in images, compose files, or the repo; `.env.example` current
  - [ ] Migrations are a deploy step with backup + rollback
  - [ ] CI runs the TEST_PLAN §7 suites and gates merge/deploy
  - [ ] Domains/TLS follow the Cloudflare rule; CORS is specific
  - [ ] Rollout order, rollback command, and post-deploy smoke defined
  - [ ] No duplicate pipeline/compose files

### Step 11: Review & Sign-Off
* Present with a tight summary: platform, services, pipeline stages, secrets method, rollout/rollback, and the riskiest deploy risk.
* **Do not deploy until the user approves.** On approval, update §11: status `Approved`, version `1.0`, approver + date.
* Hand off: "Deployment approved. `/kedata-review` checks the infra diff against plan §3; staging deploy can proceed via the pipeline."

## Downstream Consumers (why the deploy surface matters)
| Output | Feeds | Consumed By |
|--------|-------|-------------|
| Dockerfile(s) / compose / cloud config | The deployable runtime | CI/CD; `kedata-review` (deployment checks) |
| `DEPLOYMENT.md` §5 | Config/secrets provisioning | Engineering setup; ops |
| `DEPLOYMENT.md` §6 | Migration runbook | Release owner |
| `DEPLOYMENT.md` §7 | Pipeline definition | CI/CD |
| `DEPLOYMENT.md` §10 | Rollout/rollback | Release owner; incident response |
| Sign-off status | Readiness gate | A Draft runbook must not ship |

## Constraints & Guardrails
* **DO NOT** re-decide the platform — read plan §3; if it's missing or "TBD", STOP and escalate to `kedata-implementation-plan`.
* **DO NOT** write application code — this skill owns deployment config and the runbook.
* **DO NOT** bake secrets into images, compose files, or the repo.
* **DO NOT** ship without a rollback path and a migration/backup plan.
* **DO NOT** create a second Dockerfile/pipeline/compose file — update in place.
* **DO NOT** use multi-level subdomains on Cloudflare (`app.kedata.id` ✓, `api.app.kedata.id` ✗); use SSL Full.
* **DO NOT** renumber the sections — the numbering is a stable contract downstream references depend on.

## Example Output Structure
A complete deploy surface reaches this specificity: one Dockerfile per service honoring its platform's rules, a real compose/cloud config, every env var provisioned per environment, a gated CI pipeline running the test plan suites, and a rollback that names the exact command. The skeleton below is the **shape** — replace every `[bracket]`. No `[bracket]` may survive:

# Deployment: [Project Name] (KEP-123)

**Status:** Draft · **Version:** 0.1 · **Platform:** [VM + Docker Compose / Cloud Run / hybrid] (plan §3) · **Owner:** [Name]

## 1. Scope
What this runbook covers; link to plan §3 and the contracts.

## 2. Deployable Inventory
| Service | Type | Runtime | Build Command | Port | Healthcheck |
|---------|------|---------|---------------|------|-------------|
| api | backend | Go | `go build ./cmd/server` | 8080 | `GET /healthz` |
| web | frontend | Nuxt | `npm run build` | 3000 | `GET /` |

## 3. Containerization
Per service: Dockerfile path, base image, non-root user, `.dockerignore`. Platform rules applied.

## 4. Topology
**VM + Compose:** services, volumes, networks, restart policies, side services.
**Cloud Run:** image, region, min/max instances, memory/CPU, concurrency, timeout.

```
[compose snippet or cloud run service definitions]
```

## 5. Config & Secrets
| Var | Dev | Staging | Prod | Secret | Provisioned By |
|-----|-----|---------|------|--------|----------------|
| `MONGODB_URI` | … | … | … | Yes | Secret Manager / docker secret |

## 6. Migrations
- Tool: [golang-migrate / alembic / prisma / sqlx]
- Order: backup → migrate → start
- Rollback: [down migration / restore snapshot]

## 7. CI/CD
| Stage | Command | Trigger | Gate |
|-------|---------|---------|------|
| test | `make test` + smoke | PR | block merge |
| build | `docker build` | merge to main | — |
| deploy staging | `[command]` | merge to main | auto |
| deploy prod | `[command]` | tag / manual | approval |

## 8. Domains & TLS
| Service | Domain | Target | TLS |
|---------|--------|--------|-----|
| web | app.kedata.id | LB | Cloudflare Full |

## 9. Observability & Health
Health endpoints, log destination, minimum alarms.

## 10. Rollout & Rollback
- Rollout: staging → canary [%] → full
- Rollback: `[exact command]`
- DB rollback: [policy]
- Post-deploy smoke: [TEST_PLAN §7 suite]

## 11. Document Info & Sign-off
| Field | Value |
|-------|-------|
| Status | Draft / Approved |
| Version | 0.1 → 1.0 |
| Source plan / contracts | [versions + locations] |
| Author / Owner | [Name] |
| Approver + date | [Name, date] |
| Open questions | Q1 … / Q2 … |
| File location | `docs/DEPLOYMENT.md` |
