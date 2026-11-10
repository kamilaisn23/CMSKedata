---
name: kedata-contracts
description: "Use this skill to interview the user and draft the engineering contract docs — API_CONTRACTS.md, DATA_CATALOG.md, and ENVIRONMENT_VARIABLES.md — from the approved implementation plan. These are the source of truth that backend, frontend, and review consume; contract-first is mandatory when FE/BE are split. Trigger when the user says \"draft the API contract\", \"write the data catalog\", or \"prepare the engineering reference docs\"."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata Contracts — Engineering Reference Docs

## Purpose
Produce the three living engineering reference documents from the approved implementation plan:

- **`API_CONTRACTS.md`** — every endpoint with request/response shapes, path/query params, status codes, error responses, and auth requirements
- **`DATA_CATALOG.md`** — every entity with fields, types, required flags, indexes, relationships, enums, and soft-delete rules
- **`ENVIRONMENT_VARIABLES.md`** — every env var with per-environment matrix and secrets handling

These docs are the **source of truth** for backend implementation, frontend integration, and code review. When the implementation plan §1 chooses **separate FE/BE, contract-first is mandatory: the API contract is the FIRST deliverable** — the frontend team cannot start without it, and the backend cannot be reviewed against a contract that doesn't exist.

The differentiator is **the grilling**: the agent interviews domain by domain — API shapes, data structures, config — until every contract detail is specific enough that two teams could build against it independently without guessing.

This skill **reads the implementation plan first** (mandatory) and the PRD (context). It does NOT decide the stack, the endpoints, or the entities — those were locked in the plan; this skill expands them into full contract detail. Like the other engineering skills, it never improvises scope.

## When to Use
* User command: `/kedata-contracts`
* Autonomous trigger: When the user says "draft the API contract", "write the data catalog", "prepare the engineering reference docs"; when the implementation plan is approved and FE/BE are about to start coding. Run AFTER the implementation plan, BEFORE backend/frontend implementation. For split FE/BE, this is a hard prerequisite — contract-first.

## Prerequisites & Context Gathering
Before the interview starts, the agent MUST:
1. **Read the implementation plan first (mandatory input).** Check `docs/IMPLEMENTATION_PLAN.md`, then root. Extract: §1 architecture (is it split? → contract-first is mandatory), §6 API endpoints (the exact list to contract), §7 data model (the exact entities), §8 env vars (the exact config), §10 DoD. **If missing, STOP — contracts cannot be drafted without the approved implementation plan.**
2. **Read the PRD (context).** Check `docs/PRD.md`, then root. §9 API overview, §10 data model, §12 integrations & env vars, §18 edge cases — the *why* behind the contract; do not re-interview the product.
3. **Locate existing artifacts:** if `docs/API_CONTRACTS.md`, `docs/DATA_CATALOG.md`, or `docs/ENVIRONMENT_VARIABLES.md` exist (or root variants), **update them in place** — never create duplicates, never rewrite from scratch. Note which already exist.
4. **Frame the interview with the user (2 minutes max):** "I'll interview you on API contracts, data catalog, and env vars — expanding the plan's seeds into full contract detail. Answer briefly; I'll follow up where I need depth."

## Interview Protocol (How to Grill)
1. **One domain at a time.** 3-5 starter questions, wait, follow up. Never dump the questionnaire.
2. **Follow up until you hit bedrock.** Every endpoint needs exact request/response shapes and status codes; every entity needs exact fields/types/indexes. "Standard CRUD" is not a contract.
3. **Extract, don't reinvent.** The plan already lists the endpoints, entities, and env vars. This skill adds the *detail* — shapes, codes, types — it does not add new scope.
4. **Trace everything to the plan.** Every contract entry maps to plan §6/§7/§8. Untraceable entries are scope creep.
5. **Contract-first when split.** If plan §1 chose separate FE/BE, treat the API contract as the first deliverable — do not hand off until it is complete enough for the frontend to build against.
6. **Record as you go.** Write each doc's section immediately after its domain.
7. **Don't over-grill.** Stop when answers are repetitive or the user says "you decide" (→ record as Open Question in the doc header).

## Execution Workflow

### Step 1: Domain 1 — API Contract (`API_CONTRACTS.md`)
**Goal:** every endpoint from plan §6 expanded to a buildable contract.

Starter questions:
- From plan §6: list every endpoint. For each: method, path, auth.
- What is the response envelope and base path? (Kedata: `{ "data": {}, "message": "", "error": "" }` under `/api/v1/`)
- Which endpoints are first-milestone (must be contracted now) vs later?

Grill follow-ups (per endpoint):
- "What is the exact request body shape — fields, types, required vs optional, validation rules?"
- "What are the path/query params — pagination, filters, sorting?"
- "What status codes can this endpoint return — success AND every failure (400/401/403/404/409/422/500)?"
- "What does the error response look like — field-level errors or a single message?"
- "What auth/role is required — and what happens on 401 vs 403?"
- "Any idempotency or rate-limit requirements?" (cross-check plan §4)

**Bedrock signal:** every endpoint in plan §6 has an entry with request shape, response shape, status codes, and auth — no "TBD".

### Step 2: Domain 2 — Data Catalog (`DATA_CATALOG.md`)
**Goal:** every entity from plan §7 expanded to a complete schema doc.

Starter questions:
- From plan §7: list every entity. For each: fields, types, indexes.
- What naming convention — plural collections/tables, snake_case fields?

Grill follow-ups (per entity):
- "For each field: required or optional? Unique? Default? Constraints (length, enum values)?"
- "Which fields are indexed — and for which query patterns?" (cross-check plan §7 indexes)
- "What are the relationships — one-to-many, many-to-many, self-references? How are they enforced (FK vs app-level)?"
- "Soft delete or hard delete? Which entities?"
- "What happens on parent delete — cascade, restrict, set-null, orphan?"
- "Which entities need history/audit rows?" (cross-check the activity-log standard)
- "Any enums — and what are their exact values?" (match PRD §5 ACs where they exist)

**Bedrock signal:** every entity in plan §7 has fields with types/required/indexes, relationships defined, and delete/audit rules — no "TBD".

### Step 3: Domain 3 — Env Vars (`ENVIRONMENT_VARIABLES.md`)
**Goal:** every env var from plan §8 documented with environment matrix, **structured per service**.

Starter questions:
- From plan §8: list every env var. For each: purpose, dev/staging/prod values, secret or not.
- **If plan §1 split FE/BE: which service owns each var?** Backend vars (DB, JWT, email) vs Frontend vars (`VITE_*` / `NUXT_PUBLIC_*`) live in DIFFERENT `.env` files and deployment units — structure the doc in per-service sections.
- What goes in `.env.example`?

Grill follow-ups:
- "Which vars differ per environment? What are the exact dev values (local DB, local secrets)?"
- "How are secrets provisioned per the plan §3 platform — Secret Manager (Cloud Run) vs `.env`/docker secrets (VM)?"
- "Which vars are required at startup (fail-fast) vs optional with defaults?"
- "Which vars are needed for the first milestone to run locally?"
- "Which vars are shared infra (deployment, domain) vs service-specific?"

**Bedrock signal:** every env var in plan §8 has purpose, per-environment values, secrets handling, AND a service owner — organized per service when split (no mixing BE and FE vars in one flat table).

### Step 4: Domain 4 — Cross-Document Consistency Sweep
**Goal:** the three docs must agree with each other and with the plan.

- Every request/response field in `API_CONTRACTS.md` maps to a field in `DATA_CATALOG.md` (or is a computed/derived value — marked as such).
- Every env var referenced in the API contract (e.g., API keys, base URLs) appears in `ENVIRONMENT_VARIABLES.md`.
- Every endpoint in plan §6, entity in plan §7, and env var in plan §8 has a corresponding contract entry.
- Edge cases from PRD §18 that affect contract shape (e.g., duplicates → 409, invalid input → 422) are captured.

**Bedrock signal:** the three docs are mutually consistent and traceable to the plan — a backend dev and a frontend dev could each build from them independently.

### Step 5: Draft & Self-Check
* Fill every section of the templates below from the plan extraction + interview answers — no empty placeholders; "N/A" with a one-line reason.
* Save to: **`docs/API_CONTRACTS.md`**, **`docs/DATA_CATALOG.md`**, **`docs/ENVIRONMENT_VARIABLES.md`** (defaults). EXCEPTION — if the team already uses root variants, update those files in place; never create duplicates.
* Run the contracts self-check — ALL must pass before presenting:
  - [ ] Every endpoint from plan §6 appears in `API_CONTRACTS.md`
  - [ ] Every API entry has: request shape, response shape, status codes (success + failures), auth requirement
  - [ ] Every entity from plan §7 appears in `DATA_CATALOG.md`
  - [ ] Every entity entry has: fields with types/required/indexed, relationships, delete rules
  - [ ] Every env var from plan §8 appears in `ENVIRONMENT_VARIABLES.md`
  - [ ] Every env var entry has: purpose, per-environment values, secret handling
  - [ ] Cross-doc consistency: API fields ↔ catalog fields ↔ env vars all reconcile
  - [ ] Response envelope `{ "data": {}, "message": "", "error": "" }` and `/api/v1/` base path noted
  - [ ] If plan §1 is split FE/BE: API contract is complete (frontend could build from it) — no "TBD"
  - [ ] No scope invented beyond the plan (no new endpoints/entities/env vars)

### Step 6: Review & Sign-Off
* Present the docs with a tight summary: contract coverage (endpoints/entities/env vars contracted), the riskiest contract decisions, and open questions.
* **Do not proceed to backend/frontend implementation until the user approves.** On approval, note the sign-off in each doc header: status `Approved`, version `1.0`, approver + date.
* Hand off: "Contracts approved. Next: draft the test plan — `/kedata-test-plan` (every endpoint's contract test, every AC/edge case). Backend and frontend then build against these docs — for split FE/BE, the API contract is the shared reference."

## Downstream Consumers (why contracts are the engineering source of truth)
| Doc | Section | Consumed By |
|-----|---------|-------------|
| `API_CONTRACTS.md` | Every endpoint's shapes/codes | Backend implementation; frontend integration; code review |
| `DATA_CATALOG.md` | Every entity's schema | Backend implementation (DB layer); code review |
| `ENVIRONMENT_VARIABLES.md` | Every env var + secrets | Backend/frontend setup; `.env.example` generation |
| All three docs | Traceability seed for test cases + deploy config | `kedata-test-plan` (contract tests); `kedata-deploy` (config/secrets) |
| Sign-off status (all three) | Readiness gate | Engineering — Draft contracts must not drive implementation |

## Constraints & Guardrails
* **DO NOT** write code — this skill produces the contract docs, not the build.
* **DO NOT** invent endpoints, entities, or env vars beyond the plan — trace every entry to plan §6/§7/§8.
* **DO NOT** decide the stack or architecture — read them from the plan; escalate if missing.
* **DO NOT** leave "TBD" in a contract — if a detail is unknown, it becomes an Open Question in the doc header and blocks sign-off.
* **DO NOT** create duplicate docs — update the existing `docs/` (or root) files in place.
* **DO NOT** renumber the doc structures below — the section ordering is a stable contract for consumers.

## Example Output Structure
The reference docs that define "complete" for Kedata contracts are the shapes below. Every `[bracket]` and placeholder must be replaced with the confirmed answers — no placeholders survive:

### `API_CONTRACTS.md`
# API Contracts: [Project Name]

**Status:** Draft · **Version:** 0.1 · **Source:** IMPLEMENTATION_PLAN.md §6 / PRD.md §9 · **Envelope:** `{ "data": {}, "message": "", "error": "" }` · **Base path:** `/api/v1/`

## 1. Endpoints
### 1.1 POST `/api/v1/auth/login` — Login (M1)
| Item | Detail |
|------|--------|
| Auth | No |
| Request body | `{ "email": string (required, email), "password": string (required, min 8) }` |
| Response 200 | `{ "data": { "access_token": string, "refresh_token": string, "user": User }, "message": "login success", "error": "" }` |
| Response 401 | `{ "data": {}, "message": "", "error": "invalid credentials" }` |
| Response 422 | `{ "data": {}, "message": "", "error": "validation failed", "errors": { "email": "required" } }` |
| Rate limit | 10/min per IP (plan §4) |
| Notes | Refresh token set as httpOnly cookie (plan §4) |

### 1.2 GET `/api/v1/registrations` — List registrations (M2)
| Item | Detail |
|------|--------|
| Auth | Bearer token, role: user |
| Query params | `page` (default 1), `size` (default 20, max 100), `status` (enum) |
| Response 200 | `{ "data": { "items": Registration[], "total": number, "page": number }, ... }` |

## 2. Shared Types
| Type | Shape |
|------|-------|
| User | `{ id, email, role: enum(user, admin), created_at }` |
| Registration | `{ id, user_id, status: enum(diajukan, diverifikasi, ditolak), document_url, created_at }` |

## 3. Open Questions
- Q1: ...

### `DATA_CATALOG.md`
# Data Catalog: [Project Name]

**Status:** Draft · **Version:** 0.1 · **Source:** IMPLEMENTATION_PLAN.md §7 / PRD.md §10 · **DB:** [from plan §4]

## 1. Entities
### 1.1 `users` (collection/table)
| Field | Type | Required | Unique | Indexed | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | Yes | Primary | Primary | User ID |
| `email` | string | Yes | Yes | Yes | User email |
| `password_hash` | string | Yes | No | No | Bcrypt cost ≥ 12 |
| `role` | enum | Yes | No | No | `user`, `admin` |
| `created_at` / `updated_at` | Date | Yes | No | No | Timestamps |

**Indexes:** `{ email: 1 }` unique · **Relationships:** none · **Delete:** soft delete · **Audit:** activity log on role change

### 1.2 `registrations` (collection/table)
| Field | Type | Required | Unique | Indexed | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | Yes | Primary | Primary | Registration ID |
| `user_id` | ObjectId | Yes | No | Compound | FK → users |
| `status` | enum | Yes | No | Yes | `diajukan`, `diverifikasi`, `ditolak` |
| `rejection_reason` | string | No | No | No | Required when `ditolak` |

**Indexes:** `{ user_id: 1, created_at: -1 }` · **Relationships:** `user_id` → users (one-to-many) · **Delete:** soft delete · **Audit:** activity log on status change

## 2. Open Questions
- Q1: ...

### `ENVIRONMENT_VARIABLES.md`
# Environment Variables: [Project Name]

**Status:** Draft · **Version:** 0.1 · **Source:** IMPLEMENTATION_PLAN.md §8 / PRD.md §12 · **Service split:** [monolith / BE+FE split per plan §1]

## 1. Backend Service (`.env` — [Go / FastAPI / Express / Axum])
| Var | Purpose | Dev | Staging | Prod | Secret | Required at startup |
|-----|---------|-----|---------|------|--------|---------------------|
| `MONGODB_URI` | DB connection | `mongodb://localhost:27017/<db>` | `<staging-db-uri>` | `<prod-db-uri>` | Yes | Yes |
| `JWT_SECRET` | Token signing | `<dev-secret>` | `<staging-secret>` | (Secret Manager) | Yes | Yes |
| `SENDGRID_API_KEY` | Transactional email | `<dev-api-key>` | `<staging-api-key>` | (Secret Manager) | Yes | No |

## 2. Frontend Service (`.env` — [React / Nuxt])
| Var | Purpose | Dev | Staging | Prod | Secret | Required at startup |
|-----|---------|-----|---------|------|--------|---------------------|
| `VITE_API_BASE_URL` / `NUXT_PUBLIC_API_BASE_URL` | API base | `http://localhost:8080` | `https://staging.<domain>` | `https://api.<domain>` | No | Yes |

## 3. Shared Infra
| Var | Purpose | Dev | Staging | Prod | Secret |
|-----|---------|-----|---------|------|--------|
| `PROJECT_ID` | GCP project | dev | staging | prod | No |

## 4. Secrets Handling
- Cloud Run (plan §3): secrets via Secret Manager, referenced as env vars
- VM + Docker Compose (plan §3): `.env` file (0600 perms), docker secrets for production

## 5. Open Questions
- Q1: ...
