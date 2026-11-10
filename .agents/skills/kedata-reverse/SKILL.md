---
name: kedata-reverse
description: "Use this skill to bring an existing (brownfield) codebase into the Kedata pipeline — reverse-engineer the missing artifacts (PRD, API_CONTRACTS.md, DATA_CATALOG.md, ENVIRONMENT_VARIABLES.md, a baseline IMPLEMENTATION_PLAN.md) from the code, tests, config, and git history so the pipeline can run. Trigger when the user says \"adopt this repo\", \"we inherited this codebase\", \"there are no docs\", \"reverse-engineer the spec\", or when code exists but the approved artifacts do not."
version: 1.0.0
author: Kedata Indonesia
---

# Skill: Kedata Reverse — Brownfield Onboarding

## Purpose
Bring an **existing codebase with no (or stale) artifacts** into the Kedata pipeline. Every other skill assumes the approved artifacts already exist and reads them — so a brownfield repo (inherited, legacy, or started without the pipeline) has no entry point. This skill is that entry point: it **reverse-engineers the artifacts from the code itself** — endpoints, schema, config, and intent — producing a reconstructed `PRD.md`, contracts, and a baseline `IMPLEMENTATION_PLAN.md` so the downstream pipeline (`kedata-system` → review → repo) can run.

The differentiator is **honesty about inference**: rather than inventing a tidy PRD that pretends certainty, it marks every reconstructed item **Observed** (directly extracted from code) vs **Inferred** (guessed from naming/history) vs **Unknown** (cannot be determined → open question). The output is a starting baseline a human confirms, not a fabricated source of truth.

This skill **reads the code and writes artifacts** — it does not refactor or "fix" the codebase, and it never claims reconstructed docs are approved truth until a human signs off.

## When to Use
* User command: `/kedata-reverse`
* Autonomous trigger: When `kedata-ask` reports code exists but `PRD.md` / `IMPLEMENTATION_PLAN.md` / contracts are missing; when the user says "adopt this repo", "we inherited this codebase", "there are no docs", "reverse-engineer the spec", "get this into the pipeline".
* Run ONCE at the start of work in a brownfield repo, before `kedata-ask` can route the pipeline.
* **Do NOT use** on a greenfield idea (→ `kedata-prd`) or to update an already-approved PRD (→ `kedata-change`).
* **DO NOT** treat reconstructed artifacts as final — they are a `Reconstructed` baseline pending human review.

## Prerequisites & Context Gathering
Before reconstructing, the agent MUST:
1. **Inventory the codebase (mandatory).** Detect the stack(s): `go.mod`, `package.json`, `pyproject.toml`, `Cargo.toml`, `composer.json`, framework hints (Gin/FastAPI/Express/Axum, Nuxt/React). Map the layout (backend/, frontend/, shared/, monorepo?).
2. **Extract the API surface (mandatory).** Find every route/endpoint definition (router files, controllers, decorators, annotations) → method, path, auth, request/response shapes as actually implemented.
3. **Extract the data model (mandatory).** Find models/entities/schemas/migrations → entities, fields, types, indexes, relationships, enums, soft-delete rules.
4. **Extract config (mandatory).** Find env reads (`os.Getenv`, `process.env`, `os.environ`, `std::env`) + `.env.example` → every env var, purpose, secret-or-not.
5. **Read intent sources (recommended).** `README.md`, `AGENTS.md`, `docs/`, commit history (`git log`), PR/MR titles, issue references, tests (they encode requirements) — to reconstruct the *why*.
6. **Locate any partial artifacts** (`docs/` first, then root): reuse whatever exists; the goal is gap-fill, not overwrite. If a PRD already exists, this is `kedata-change`, not `kedata-reverse` — route accordingly.
7. **Frame the session (2 minutes max):** "I'll read the code and reconstruct the missing artifacts — endpoints, schema, config, and as much intent as the code and history reveal. Inferred items are flagged; unknowns become open questions you'll confirm."

## Interview Protocol (How to Grill)
1. **One domain at a time.** Present the extracted facts, then ask 3-5 confirmations, follow up.
2. **Confirm, don't interrogate.** The code is the primary source; the user confirms the *intent* behind observed facts and fills the gaps the code cannot show (personas, success metric, non-goals, priorities).
3. **Tag every item.** `Observed` (from code), `Inferred` (guessed), `Unknown` (→ open question). Never present an inference as fact.
4. **Follow up until bedrock.** A reconstructed AC must be testable ("login returns 401 on bad password"), not a paraphrase ("handles login").
5. **Force priorities.** "Given what's built, what's actually MVP vs a later add?" — the code rarely reveals priority; ask.
6. **Separate "is" from "should be".** Document what the code *does now*; proposed changes are a follow-up `kedata-change`, not part of the reconstruction.
7. **Don't over-grill.** Stop when the code answers; only ask where inference is unsafe.
8. **End with the readback.** "N endpoints, M entities, K env vars reconstructed; X items inferred, Y unknowns. Correct the inferences before we call this baseline."

## Execution Workflow

### Step 1: Domain 1 — Repository Reconnaissance
**Goal:** know what exists before reconstructing anything.
* Stack + layout + entrypoints; monolith vs split; test presence; CI presence; deployment hints (Dockerfile, compose, cloudbuild).
* Existing artifact coverage (which docs already exist).
**Bedrock signal:** §1 records the stack, layout, and which artifacts are missing vs present.

### Step 2: Domain 2 — Reverse the API Contract
**Goal:** `API_CONTRACTS.md` from the actual routes.
* Every endpoint: method, path, auth/role, request shape (DTOs/validators), response shape (serializers), observed status codes.
* Note envelope + base path as implemented (flag if it deviates from the `{data,message,error}` / `/api/v1/` convention).
* Mark each endpoint `Observed` (routes found) or `Inferred` (shape guessed from a model).
* Flag endpoints that look undocumented/testless as risk.
**Bedrock signal:** every route in the code appears as a contract entry with an observed shape or an explicit inference flag.

### Step 3: Domain 3 — Reverse the Data Catalog
**Goal:** `DATA_CATALOG.md` from the schema.
* Every entity/collection/table: fields, types, required, unique, defaults, indexes, relationships, enums, delete rule (from migrations/models/ORM).
* Note FK/cascade behavior as implemented.
* Mark derived/computed fields.
**Bedrock signal:** every model/migration in the code appears as a catalog entry with observed fields + indexes.

### Step 4: Domain 4 — Reverse the Env Surface
**Goal:** `ENVIRONMENT_VARIABLES.md` from config reads.
* Every env var read by the code: purpose (from usage), secret-or-not (from name/usage), which service reads it.
* Cross-check `.env.example`, CI config, Dockerfile, compose.
* Flag vars referenced but never documented, and vars in `.env.example` but unused in code (drift).
**Bedrock signal:** every env var read by code is documented; drift between code and `.env.example` is flagged.

### Step 5: Domain 5 — Reconstruct the PRD
**Goal:** a `PRD.md` that reflects what the product *is*, honestly flagged.
* User stories + ACs from routes, tests, and observed behavior (`Observed` where tests exist, `Inferred` otherwise).
* Personas/roles from auth logic and RBAC checks.
* Features from the endpoint/entity surface; priorities confirmed with the user (the code rarely shows priority).
* Edge cases from tests, validation code, and error handling.
* `Unknown` where the code cannot answer: success metric, non-goals, business intent, roadmap.
* Status starts as **`Reconstructed`**, not `Approved`.
**Bedrock signal:** the PRD covers the observed product surface and carries an explicit open-questions list for everything the code could not reveal.

### Step 6: Domain 6 — Baseline Implementation Plan
**Goal:** a `IMPLEMENTATION_PLAN.md` describing the *current* architecture so the pipeline has a baseline.
* §1 architecture as observed (monolith vs split); §2 layout as observed; §3 deployment as observed (from Dockerfile/compose/CI) or Unknown; §4 stack confirmed from manifests; §6 endpoints / §7 entities / §8 env vars seeded from the reverse-engineering.
* §5 tasks = the existing work as "done" + a backlog for gaps/risks flagged in reconstruction.
* Mark deployments/architecture cells `Observed` or `Unknown`.
**Bedrock signal:** the plan's architecture, stack, and deploy surface match the code; gaps are listed as tasks/open questions.

### Step 7: Domain 7 — Gap Report & Risk Flags
**Goal:** tell the team what the pipeline now knows and what it still doesn't.
* Open questions (everything `Unknown`).
* Risks: undocumented/testless endpoints, secrets in code, drift between code and `.env.example`, missing migrations, no CI.
* Recommended next step: confirm artifacts, then route to `kedata-ask` for the pipeline position.
**Bedrock signal:** §8 lists every unknown and every risk with a recommended action.

### Step 8: Draft & Self-Check
* Write the reconstructed artifacts to their **default locations** (`docs/PRD.md`, `docs/API_CONTRACTS.md`, `docs/DATA_CATALOG.md`, `docs/ENVIRONMENT_VARIABLES.md`, `docs/IMPLEMENTATION_PLAN.md`) — EXCEPTION: if the repo already uses root variants or partial files, update those in place; never duplicate.
* Write the reconstruction report to `docs/RECONSTRUCTION_REPORT.md`.
* Set every reconstructed artifact's status to **`Reconstructed`** (never `Approved`), with the version `0.1` and a clear note that it was reverse-engineered.
* Run the self-check — ALL must pass before presenting:
  - [ ] Every route in the code has an `API_CONTRACTS.md` entry
  - [ ] Every model/migration has a `DATA_CATALOG.md` entry
  - [ ] Every env var read by code is in `ENVIRONMENT_VARIABLES.md`; drift flagged
  - [ ] Reconstructed PRD covers the observed surface; every item tagged Observed / Inferred / Unknown
  - [ ] Baseline plan's architecture + stack match the manifests; deploy surface observed or Unknown
  - [ ] Every `Unknown` appears as an open question
  - [ ] Risks (testless endpoints, secrets, drift, missing CI) listed
  - [ ] All reconstructed artifacts marked `Reconstructed`, not `Approved`
  - [ ] No file overwritten where a real artifact already existed (that path is `kedata-change`)

### Step 9: Review & Sign-Off
* Present with a tight summary: endpoints/entities/env vars reconstructed, inference count, unknowns, and top risks.
* **The artifacts are a baseline, not truth**, until the user confirms the inferences. On confirmation, bump the artifacts to `Approved` (v1.0) — or leave them `Reconstructed` and route gaps to `kedata-change` / `kedata-prd`.
* Hand off: "Baseline reconstructed and confirmed. Run `/kedata-ask` to locate the pipeline stage; then continue with `/kedata-system` (or `/kedata-change` for the open items)."

## Downstream Consumers (why reconstruction matters)
| Output | Feeds | Consumed By |
|--------|-------|-------------|
| Reconstructed `PRD.md` | Requirements baseline | `kedata-system`, `kedata-review`, `kedata-change` |
| `API_CONTRACTS.md` / `DATA_CATALOG.md` | The contract to verify against | Stack skills; `kedata-review` |
| `ENVIRONMENT_VARIABLES.md` | Config truth + drift | Engineering setup; `kedata-deploy` |
| Baseline `IMPLEMENTATION_PLAN.md` | Architecture/scope baseline | `kedata-system`, `kedata-ask` |
| `RECONSTRUCTION_REPORT.md` | Unknowns + risks | Team; `kedata-change`, `kedata-prd` |
| `Reconstructed` status | Explicit non-approval gate | Nothing downstream treats it as approved until confirmed |

## Constraints & Guardrails
* **DO NOT** invent intent the code does not show — tag it `Inferred` or `Unknown`, never present it as fact.
* **DO NOT** mark reconstructed artifacts `Approved` — the baseline is `Reconstructed` until a human confirms.
* **DO NOT** overwrite an existing approved artifact — if a PRD/plan already exists, that is `kedata-change`, not reconstruction.
* **DO NOT** refactor or "fix" the code — this skill documents what exists; improvements are follow-up tasks.
* **DO NOT** fabricate the deployment platform if the code doesn't reveal it — mark it `Unknown` and ask.
* **DO NOT** create duplicate files — update any existing partial artifacts in place.
* **DO NOT** renumber sections — reconstructed artifacts use the same stable numbering as the originals.

## Example Output Structure
A complete reconstruction reaches this specificity: every route/entity/env var captured as a contract entry, a PRD that mirrors the observed product with Observed/Inferred/Unknown tags, a baseline plan matching the manifests, and a gap report. The skeleton below is the **shape** — replace every `[bracket]`. No `[bracket]` may survive:

# Reconstruction Report: [Project Name]

**Status:** Reconstructed (pending human confirmation) · **Version:** 0.1 · **Date:** [date] · **Owner:** [Name]

## 1. Repository Reconnaissance
| Item | Finding | Tag |
|------|---------|-----|
| Stack | Go + Gin (go.mod), Nuxt (package.json) | Observed |
| Layout | monolith, backend/ + frontend/ + docs/ | Observed |
| Artifacts present | README.md only | Observed |
| CI | .github/workflows/ci.yml | Observed |

## 2. Reconstructed Artifacts
| Artifact | Location | Status | Coverage |
|----------|----------|--------|----------|
| PRD.md | docs/PRD.md | Reconstructed | [n] features, [m] ACs |
| API_CONTRACTS.md | docs/API_CONTRACTS.md | Reconstructed | [n] endpoints |
| DATA_CATALOG.md | docs/DATA_CATALOG.md | Reconstructed | [m] entities |
| ENVIRONMENT_VARIABLES.md | docs/ENVIRONMENT_VARIABLES.md | Reconstructed | [k] vars |
| IMPLEMENTATION_PLAN.md | docs/IMPLEMENTATION_PLAN.md | Reconstructed | baseline |

## 3. Evidence Summary
| Domain | Source of truth | Count | Observed / Inferred |
|--------|-----------------|-------|---------------------|
| API | router files | [n] | [o] / [i] |
| Data | models + migrations | [m] | [o] / [i] |
| Config | env reads + .env.example | [k] | [o] / [i] |

## 4. Inferences (need confirmation)
| # | Inference | Basis | Confirm? |
|---|-----------|-------|----------|
| I1 | feature [X] is MVP | endpoint exists + tests | ? |

## 5. Open Questions (Unknown)
| # | Question | Impact if wrong |
|---|----------|-----------------|
| Q1 | success metric? | cannot judge priority |

## 6. Risks & Drift
| Risk | Evidence | Recommended action |
|------|----------|--------------------|
| endpoint `/x` has no tests | no test file | add to TEST_PLAN |
| secret in code | `SECRET = "..."` in config.go | move to env, rotate |

## 7. Recommended Next Step
Confirm the inferences above (bump artifacts to `Approved`), then run `/kedata-ask` to locate the pipeline stage. Open items → `/kedata-change`.
