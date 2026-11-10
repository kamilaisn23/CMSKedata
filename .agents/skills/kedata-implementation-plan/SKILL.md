---
name: kedata-implementation-plan
description: Use this skill to interview the user and draft an IMPLEMENTATION_PLAN.md — the product-to-engineering handoff that turns the approved PRD and design brief into buildable units. Locks the architecture decision (monolith vs separate FE/BE), the deployment platform (VM + Docker Compose vs serverless Cloud Run) and its constraints, task breakdown with acceptance criteria, dependency order, and definition of done. Trigger when the user says "draft the implementation plan", "break down the work", or "slice the PRD into tasks".
version: 1.4.0
author: Kedata Indonesia
---

# Skill: Kedata Implementation Plan Writer

## Purpose
Produce an **IMPLEMENTATION_PLAN.md** — the closing product-team deliverable that hands the approved PRD + design brief (+ external mockups) to whoever builds the product. The PRD defines *what*; the design brief defines *how it looks*; the implementation plan defines **what to build, in what order, where it runs, and how to know it's done**.

The implementation plan is where **scope gets frozen** and **architecture gets decided**: it locks the codebase topology (monolith vs separate FE/BE), the **deployment platform (VM + Docker Compose vs serverless Cloud Run)** and its constraints, repo layout, and supporting architecture decisions — then breaks the PRD features into ordered tasks with per-task acceptance criteria, dependency order, milestone mapping, env vars, and definition of done. After this document is approved, "what's in" and "where it runs" are settled.

The differentiator is **the grilling**: the agent interviews domain by domain — architecture, deployment, tasks, sequencing, contracts, config, rollout — forcing decisions (especially the architecture and deployment decisions) instead of leaving them open, and recording every assumption and open question.

This skill reads the **PRD first** (mandatory) and the **design brief** (optional but recommended) as its inputs: features, API overview, data model, milestones, env vars, personas, screens, and components are extracted from them, not re-interviewed from scratch. Mockups (external designer output) are referenced, not recreated.

## When to Use
* User command: `/kedata-implementation-plan`
* Autonomous trigger: When the user says "draft the implementation plan", "break down the work", "slice the PRD into tasks", or "prepare the handoff to engineering". Run AFTER the PRD is approved and the design brief (and mockups) exist, BEFORE any code is written.

## Prerequisites & Context Gathering
Before the interview starts, the agent MUST:
1. **Read the PRD first (mandatory input).** Check `docs/PRD.md`, then root `PRD.md`. Extract: features with priorities (§8), API overview (§9), data model (§10), milestones (§13), env vars (§12), acceptance criteria (§5), edge cases (§18). If no PRD exists, STOP and tell the user the PRD must be written first — an implementation plan without a PRD is a guess.
2. **Read the design brief (optional but recommended).** Check `docs/DESIGN_BRIEF.md`, then root `DESIGN_BRIEF.md`. Extract: screens (§5), components (§6), deliverables (§11) — these shape FE task details. If it doesn't exist, note it and proceed with PRD only.
3. **Locate existing artifacts:**
   * Existing implementation plan: check `docs/IMPLEMENTATION_PLAN.md`, then root `IMPLEMENTATION_PLAN.md`. If one exists, **update that same file in place** — do not rewrite from scratch and do not move it. A root `IMPLEMENTATION_PLAN.md` the team has been using stays at root; only new plans default to `docs/IMPLEMENTATION_PLAN.md`.
   * Mockups: if the designer delivered mockups (Figma links, HTML, images), reference them — they are the visual contract for FE tasks.
4. **Frame the interview with the user (2 minutes max):**
   * "I'll interview you on architecture, deployment, task breakdown, sequencing, contracts, config, and rollout. Answer briefly; I'll follow up where I need depth. At the end you'll have an implementation plan ready for engineering."
   * Agree on session budget: full grill (45-60 min) vs focused grill (15-20 min, e.g. first milestone only).

## Interview Protocol (How to Grill)

**Rules of the interview — apply to every domain:**
1. **One domain at a time.** Ask 3-5 starter questions, wait for answers, then follow up. Never dump the whole questionnaire at once.
2. **Follow up until you hit bedrock.** A "bedrock" answer is specific, quantified, and decision-ready. "The team will figure it out" is not an answer — every task needs an owner, acceptance criteria, and priority.
3. **Force decisions, don't defer them.** The architecture decision (monolith vs split), the deployment platform (VM vs Cloud Run), the repo layout — these MUST be decided here, not left for engineering to improvise. If the user says "I don't know", present the trade-offs and recommend, then record the decision and its rationale.
4. **Extract, don't reinvent.** The PRD already answers features, API, data, milestones, env vars. Lift them into the plan — do not make the user repeat the product interview.
5. **Trace every task to its source.** Every task must map back to a PRD feature, endpoint, entity, or design-brief screen/component. Untraceable tasks are scope creep.
6. **Quantify everything.** Team size, effort estimates (S/M/L), order, milestone dates. Estimates beat absolutes.
7. **Surface the non-obvious.** Ask about deployment topology, platform constraints (statelessness, timeouts, background jobs), secrets, migrations, rollback, feature flags — things the user may not think to mention but engineering will need.
8. **Record as you go.** After each domain, write the agreed answers into the draft plan section immediately — never wait until the end.
9. **Don't over-grill.** Stop a domain when answers become repetitive or the user says "you decide" (→ record as Open Question in §12).
10. **End with the readback.** "I've locked monolith on Cloud Run, 14 tasks in 4 milestones, env vars X/Y/Z. Correct me if wrong."

## Execution Workflow

### Step 1: Domain 1 — Architecture Decision (Codebase Topology)
**Goal:** decide how the codebase is organized BEFORE any task is sized. This is the most expensive decision to reverse — lock it now.

Starter questions:
- What is the team size that will build and maintain this? (the #1 split trigger)
- Will there ever be mobile clients, a public API, or independent scaling needs?
- What is the deployment topology today — one service or many?

**The decision rule (present it, grill it, then decide):**
* **Choose monolith** when: 1-2 engineers, no mobile clients, no public API, no independent scaling need, deployment is a single unit. Inside the monolith, still extract a clean service layer (backend service / frontend app / shared contracts) so a future split doesn't require a rewrite.
* **Choose separate FE/BE** when: ≥3 engineers working in parallel, mobile clients will consume the API, a public API is planned, or FE/BE need independent scaling/deployment. Contract-first becomes mandatory: the API contract is the FIRST deliverable.
* **Split triggers (decision criteria):** mobile API clients, public API, >2 engineers, independent scaling, independent release cadence. If none of these exist today, start monolith — splitting later on a clean service layer is cheaper than two codebases from day one.

Grill follow-ups:
- "If monolith: where does the service layer live? What would force a split later?"
- "If separate: what is the contract-first deliverable? How are shared types kept in sync?"
- "Monorepo vs polyrepo: do FE and BE share types? How coupled is release?"
- "What is the cost of each choice — starting split vs migrating later?"
- "Who deploys what? Single service or multiple?"

**Bedrock signal:** §1 records the topology decision (monolith vs separate) WITH its rationale and the split-trigger criteria — no "TBD". §2 records the repo/workspace layout (monorepo vs polyrepo, folder structure).

### Step 2: Domain 2 — Deployment Platform & Operations Decision
**Goal:** decide WHERE the product runs — VM + Docker Compose vs serverless Cloud Run — and understand the constraints before any task is sized. This decision is as expensive to reverse as codebase topology: it changes the Dockerfile vs docker-compose surface, statelessness rules, background-job handling, cost model, and ops burden.

Starter questions:
- Where is this product expected to run — a VM you manage (Docker Compose) or managed serverless (Cloud Run)?
- Are there background jobs, cron, websockets, or long-running processes? (the #1 platform decider)
- Is there state that must live on the host — local files, volumes, side services (analytics, DB on the same box)?
- Who operates it — is there an ops person, or does it need to be managed for the team?

**The decision rule (present it, grill it, then decide):**
* **Choose VM + Docker Compose** when: background workers/cron/websockets are core, state must persist on the host, side services (analytics, DB, workers) are co-located, you want full control of the runtime and fixed predictable cost, or the team is comfortable owning patching/backups/uptime. Docker Compose handles the whole stack in one file; the VM is the single unit.
* **Choose Cloud Run (serverless)** when: the app is request/response HTTP, stateless by design, wants autoscaling to zero (cost saving), and the team wants managed patching/uptime without VPS ops. A single Dockerfile per service is enough; no VM to maintain.
* **Constraints to grill before choosing Cloud Run:**
  - **Statelessness** — no local file storage (use GCS); the filesystem is ephemeral.
  - **Request timeout** — Cloud Run caps request duration (default 5m, max ~60m). Long-running work needs background jobs elsewhere (Cloud Tasks, Scheduler, a worker).
  - **Background jobs / cron / websockets** — NOT a natural fit: cron needs Cloud Scheduler hitting an endpoint; long jobs need workers; websockets have concurrency/connection limits.
  - **Memory/CPU limits** — heavy tasks need bigger instances or a worker; cost scales with allocation.
  - **Cold starts** — autoscale-to-zero means cold-start latency on first request (mitigate with min-instances > 0, at a cost).
  - **Port & entrypoint** — service must listen on `$PORT`; one container per service (no multi-process like a VM).
  - **Cost model** — pay-per-request/CPU/memory vs fixed monthly VM. For steady high traffic, a VM can be cheaper; for spiky traffic, Cloud Run wins.
* **Hybrid is allowed but must be explicit:** e.g., app on Cloud Run + a small VM for workers/cron. Adds an ops surface — only choose it when there is a concrete need, and record the reason.

Grill follow-ups:
- "What runs beyond request/response — cron, queues, websockets, file processing? (this decides the platform)"
- "If serverless: where do background jobs live — Cloud Scheduler hitting an endpoint, Cloud Tasks, or a worker service?"
- "If VM: who patches the OS, runs backups, owns uptime? What's the acceptable downtime window?"
- "What's the cost model expectation — pay-per-use autoscaling or fixed monthly VPS?"
- "Where are the users — does region/latency constrain the host (e.g., users in Indonesia → asia-southeast2)?"
- "Does the product need co-located services (analytics like Plausible CE, a DB) on the same host?"
- "What's the CI/CD — deploy on push, on tag, manual? One pipeline or per service?"

**Bedrock signal:** §3 records the platform decision (VM + Docker Compose / Cloud Run / hybrid) WITH its rationale, the constraint implications (statelessness, background jobs, timeouts) and how each is handled, the service/region/domain list, and the CI/CD approach — no "TBD".

### Step 3: Domain 3 — Supporting Architecture Decisions
**Goal:** lock the supporting architecture so engineering doesn't improvise it.

Starter questions:
- Backend framework: confirm from PRD §7 (e.g., Go + Gin / FastAPI / Express). Migration tooling? Who owns schema changes?
- Frontend framework: confirm from PRD §7 (e.g., Nuxt 3 / React + TanStack Start).
- Database: confirm from PRD §7.
- Auth: JWT access/refresh? Where do tokens live (httpOnly cookie vs header)?
- File storage: GCS, local, or direct-to-cloud upload? (from PRD §12 integrations)
- Testing strategy: unit / integration / E2E split per layer?

Grill follow-ups:
- "Confirm each framework from PRD §7 — if the PRD left a layer open, decide it NOW and record it here; do not leave it for engineering to guess."
- "What migration workflow — migration files, down migrations, who runs them?"
- "Where does secrets management live — Secret Manager, env, .env.example?"
- "Caching: what needs it (Redis, CDN, ISR)? What's cache invalidation?"
- "Is there a background-job / worker need, or is everything request/response?" (cross-check with the §3 platform decision)
- "What's the feature-flag approach for half-shipped features?"

**Bedrock signal:** §4 records every supporting decision with a one-line rationale — including the Backend and Frontend framework rows, which must be confirmed (from PRD §7 or decided here), never blank.

### Step 4: Domain 4 — Task Breakdown
**Goal:** turn every PRD feature into an ordered, owner-assigned task with acceptance criteria.

Starter questions:
- List every task from PRD §8 features (+ §9 endpoints, §10 entities). No judging yet.
- For each task: description, owner (BE / FE / shared), effort (S/M/L), priority, milestone.
- Map each FE task to design-brief screens/components (§5/§6) and mockups.

Grill follow-ups:
- "What's the smallest slice that delivers end-to-end value? (that's task #1)"
- "Which tasks are blockers for others?"
- "Cut 50% — which tasks survive? (what's truly in the first milestone)"
- "Which tasks have acceptance criteria that the PRD already defines? Which need new ACs?"
- "Are there shared/contract tasks (types, API client, design tokens) before BE or FE tasks?"

**Bedrock signal:** §5 lists every task with owner, effort, priority, milestone, and acceptance criteria — and every PRD feature maps to at least one task (no orphan features).

### Step 5: Domain 5 — Dependency Order & Milestones
**Goal:** an executable sequence, not a flat list.

Starter questions:
- What's the critical path — which task must finish before anything else can start?
- Which tasks can run in parallel (BE and FE on the same feature, once the contract exists)?
- Map tasks to PRD §13 milestones.

Grill follow-ups:
- "What has the most unknowns — should it move earlier to de-risk?"
- "What's the definition of done for the FIRST milestone?"
- "Which tasks are safe to parallelize across 2+ people?"
- "What would a demo look like at the end of each milestone?"

**Bedrock signal:** §9 orders tasks with no circular dependencies, milestone mapping, and a defined first-milestone DoD; §10 defines per-task and global Definition of Done.

### Step 6: Domain 6 — API Contract & Data Model Seeds
**Goal:** the plan carries the exact endpoints and entities that will seed the contract docs.

Starter questions:
- From PRD §9: list every endpoint with method, path, auth, description.
- From PRD §10: list every entity with fields, types, indexes.
- Flag which endpoints/entities are needed for the FIRST milestone.

Grill follow-ups:
- "Which endpoints have ambiguous request/response shapes? (needs contract work first)"
- "Which entities need migrations in the first milestone?"
- "What's the API response envelope?" (Kedata: `{ "data": {}, "message": "", "error": "" }` under `/api/v1/`)
- "Which endpoints are blocked by third-party integrations (auth, email, storage)?"

**Bedrock signal:** §6 and §7 reproduce the full endpoint and entity lists from the PRD, with first-milestone items flagged.

### Step 7: Domain 7 — Env Vars & Config
**Goal:** every env var, per environment, before engineering starts.

Starter questions:
- From PRD §12: list every env var.
- For each: which environments need it (dev/staging/prod)? Secrets or non-secrets?

Grill follow-ups:
- "Which vars differ per environment? What's in `.env.example`?"
- "How are secrets provisioned in production?" (cross-check with the §3 platform decision: Secret Manager for Cloud Run vs `.env` file / docker secrets on a VM)
- "Which vars are needed for the first milestone to run locally?"

**Bedrock signal:** §8 lists every env var with environment matrix and secrets handling.

### Step 8: Domain 8 — Risks & Rollout
**Goal:** what breaks, what's the rollout order, and how do we roll back.

Starter questions:
- From PRD §15: carry the top risks.
- What are implementation-specific risks (migrations, integration timing, third-party limits, platform constraints)?

Grill follow-ups:
- "What breaks first if we ship? What's the rollback plan?"
- "Is there a feature-flag or phased rollout for the riskiest tasks?"
- "What's the acceptance bar before production deploy?"

**Bedrock signal:** §11 lists risks with mitigations, a rollout order, and a rollback plan.

### Step 9: Draft & Self-Check
* Fill every section of the template below from the PRD extraction + interview answers — no empty placeholders; "N/A" with a one-line reason where a section doesn't apply.
* Save to: **`docs/IMPLEMENTATION_PLAN.md`** (default). EXCEPTION — if the team already uses root `IMPLEMENTATION_PLAN.md`, update that file in place; never create a second copy.
* Set §12 Document Info: status `Draft`, version `0.1`, source PRD version + design brief version, owner.
* Run the implementation plan self-check — ALL must pass before presenting:
  - [ ] All 12 sections filled (or explicitly "N/A" with reason)
  - [ ] §1 architecture decision is LOCKED (monolith vs separate FE/BE) with rationale — no "TBD"
  - [ ] §3 deployment platform is LOCKED (VM + Docker Compose / Cloud Run / hybrid) with rationale — no "TBD"
  - [ ] §3 constraint implications addressed: statelessness, background jobs/cron, timeouts, secrets, cost model (each decided or explicitly "N/A" with reason)
  - [ ] Every PRD feature (§8) maps to at least one task in §5 (no orphan features)
  - [ ] Every task has owner (BE/FE/shared), effort (S/M/L), priority, milestone, and acceptance criteria
  - [ ] §4 records every supporting decision (backend framework, frontend framework, secrets, caching, background jobs, feature flags) — decided or explicitly "N/A" with reason; framework rows never blank
  - [ ] Every PRD endpoint (§9) appears in §6
  - [ ] Every PRD entity (§10) appears in §7
  - [ ] Every env var from PRD §12 appears in §8
  - [ ] §9 dependency order is executable — no circular dependencies
  - [ ] First-milestone DoD defined in §9
  - [ ] No engineering detail omitted that blocks a task (contract shapes, migration needs, integration keys)
  - [ ] §12 lists source docs + any open questions

### Step 10: Review & Sign-Off
* Present the plan with a tight summary: the architecture and deployment decisions and why, the task count per milestone, the riskiest tasks, and the open questions.
* **Do not proceed to implementation until the user approves it.** On approval, update §12: status `Approved`, version `1.0`, approver + date.
* Hand off: "Implementation plan approved. Next: draft the contracts — `/kedata-contracts`, then `/kedata-test-plan`. The architecture, deployment platform, and task order are locked — engineering can start with the first-milestone tasks once contracts + test plan are approved."

## Downstream Consumers (why the implementation plan is the handoff)
| Plan Section | Feeds | Consumed By |
|--------------|-------|-------------|
| §1 Architecture Decision | Codebase topology, repo setup | Engineering kickoff — determines everything below |
| §2 Repo & Workspace Layout | Folder structure, monorepo config | Engineering setup |
| §3 Deployment Platform & Topology | Dockerfile vs docker-compose, services, regions, domains, CI/CD | DevOps / deployment — platform constraints shape the build |
| §4 Supporting Architecture | DB, auth, storage, testing strategy | Engineering (each stack); `kedata-test-plan` (the §4 testing strategy seeds the plan) |
| §5 Task Breakdown | What to build, in what order | Engineering backlog; review verification |
| §6 API Endpoints | `API_CONTRACTS.md` | Backend engineering; code review |
| §7 Data Model | `DATA_CATALOG.md` | Backend engineering |
| §8 Env Vars & Config | `ENVIRONMENT_VARIABLES.md`, `.env.example` | Engineering setup |
| §3 Deployment Platform & Topology | Dockerfile vs docker-compose, services, regions, domains, CI/CD | `kedata-deploy` — turns the decision into real infra + runbook |
| §9 Dependency Order & Milestones | Execution sequence | Engineering planning |
| §10 Definition of Done | Per-task completion bar | Engineering; code review |
| §11 Risks & Rollout | Rollout order, rollback | Deployment |
| §12 Sign-off status | Readiness gate | Engineering — a Draft plan must not start implementation |

## Constraints & Guardrails
* **DO NOT** write code or implement tasks — this skill produces the plan, not the build.
* **DO NOT** leave the architecture decision open — monolith vs separate FE/BE MUST be decided with rationale in §1.
* **DO NOT** leave the deployment platform decision open — VM + Docker Compose vs Cloud Run MUST be decided with rationale in §3, including how the platform's constraints (statelessness, background jobs, timeouts) are handled.
* **DO NOT** invent tasks without a PRD/brief/mockup source — untraceable tasks are scope creep.
* **DO NOT** re-interview product fundamentals that the PRD already answers — extract, don't reinvent.
* **DO NOT** skip the design brief if it exists — FE tasks need its screens/components.
* **DO NOT** leave env vars, endpoints, or entities out — engineering will hit them in the first week.
* **DO NOT** rewrite an existing plan from scratch — update in place and bump the version.
* **DO NOT** renumber the 12 sections — the numbering is a stable contract downstream references depend on.

## Example Output Structure
A complete implementation plan reaches this specificity: a locked architecture decision with rationale and split triggers, a locked deployment platform with constraint handling, a task list where every task has owner/effort/priority/AC, an executable dependency order, and full endpoint/entity/env-var lists seeded from the PRD. The skeleton below is the **shape** — replace every `[bracket]` and placeholder description with the concrete, confirmed answers. No `[bracket]` may survive in the delivered plan:

# Implementation Plan: [Project Name] (KEP-123)

**Status:** Draft · **Version:** 0.1 · **Source PRD:** [PRD v1.0, docs/PRD.md] · **Source Brief:** [Design Brief v1.0, docs/DESIGN_BRIEF.md]

## 1. Architecture Decision
| Decision | Choice | Rationale | Split Trigger (if monolith) |
|----------|--------|-----------|------------------------------|
| Codebase topology | Monolith | 2 engineers, no mobile clients, single deploy | Mobile client / public API / >2 engineers / independent scaling |

**Decision record:** "Start monolith with a clean service layer (backend service, frontend app, shared contracts). Split only when a concrete trigger appears — migrating later is cheaper than two codebases from day one."

## 2. Repo & Workspace Layout
```
project-root/
├── backend/          # service layer
├── frontend/         # app
├── shared/           # types, contracts
└── docs/
```
Monorepo vs polyrepo: [monorepo — shared types, single CI].

## 3. Deployment Platform & Topology
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | [VM + Docker Compose / Cloud Run / hybrid] | [why] |
| Constraint: statelessness | [No local FS — GCS for files] | [platform rule] |
| Constraint: background jobs | [Cloud Scheduler → endpoint / worker service / none] | [decided] |
| Constraint: request timeout | [Within Cloud Run 60m cap / VM no cap] | [decided] |
| Services | [1 (app) / app + worker] | — |
| Region | asia-southeast2 | Users in Indonesia |
| Domain | app.kedata.id | Cloudflare |
| CI/CD | [push → build → deploy / manual] | — |

## 4. Supporting Architecture
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | Go + Gin | PRD §7 |
| Frontend framework | Nuxt 3 + TypeScript (strict) | PRD §7 |
| Database | MongoDB Atlas | PRD §7 |
| Migrations | [golang-migrate / prisma migrate] | — |
| Auth | JWT access 15m / refresh 7d | PRD §7 |
| File storage | GCS | PRD §12 |
| Secrets management | [Secret Manager / .env] | — |
| Caching | [Redis / CDN / ISR / none] | — |
| Background jobs | [worker / none — request-response only] | — |
| Feature flags | [flag library / env-based / none] | — |
| Testing | unit + integration + E2E | per task |

## 5. Task Breakdown
| # | Task | Owner | Effort | Priority | Milestone | Acceptance Criteria |
|---|------|-------|--------|----------|-----------|---------------------|
| 1 | [Auth: register/login/refresh] | BE | M | P0 | M1 | PRD §5 AC1-AC3 + Swagger docs |

## 6. API Endpoints (seeded from PRD §9)
| Endpoint | Method | Auth | Milestone | Notes |
|----------|--------|------|-----------|-------|
| `/api/v1/auth/login` | POST | No | M1 | — |

## 7. Data Model (seeded from PRD §10)
| Entity | Fields | Indexes | Milestone |
|--------|--------|---------|-----------|
| `users` | email, password_hash, role | email unique | M1 |

## 8. Env Vars & Config (from PRD §12)
| Var | Dev | Staging | Prod | Secret? |
|-----|-----|---------|------|---------|
| `MONGODB_URI` | `<local-db-uri>` | `<staging-db-uri>` | `<prod-db-uri>` | Yes |

## 9. Dependency Order & Milestones
```
M1: T1 (auth BE) → T2 (auth FE) → T3 (shared types)
M2: ...
```
**First-milestone DoD:** [all M1 tasks done, contract docs updated, deployable to staging].

## 10. Definition of Done
Per task: [ACs pass, tests added, docs updated, Swagger regenerated where backend]. Global: [all milestones shipped, staging verified].

## 11. Risks & Rollout
| Risk | Mitigation | Rollout |
|------|------------|---------|
| [Migration breaks data] | [Backup + down migrations] | [Phased: staging → canary → prod] |

## 12. Document Info & Sign-off
| Field | Value |
|-------|-------|
| Status | Draft / Approved |
| Version | 0.1 → 1.0 |
| Source PRD | [version + location] |
| Source Design Brief | [version + location] |
| Author / Owner | [Name] |
| Approver + date | [Name, date] |
| Open questions | Q1 … / Q2 … |
| File location | `docs/IMPLEMENTATION_PLAN.md` |
