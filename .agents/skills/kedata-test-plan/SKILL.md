---
name: kedata-test-plan
description: "Use this skill to turn the approved PRD and contracts into a TEST_PLAN.md — the traceability bridge from acceptance criteria and edge cases to concrete test cases, fixtures, environments, and exit criteria. Reads PRD §5/§18, the implementation plan §4/§5/§10, and the contracts, then produces the test plan every stack skill and the review verify against. Trigger when the user says \"write a test plan\", \"plan the tests\", \"QA plan\", or before implementation starts."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata Test Plan Writer

## Purpose
Produce a **`TEST_PLAN.md`** — the missing link between an approved PRD and executable tests. The PRD defines *what* must be true (§5 acceptance criteria) and *what can break* (§18 edge cases); the implementation plan defines *which tasks and testing strategy* (§4/§5/§10); the contracts define *exact shapes* to test. This skill turns those into a **traceable** set of test cases, fixtures, environments, and exit criteria — so no acceptance criterion and no P0 edge case ships untested.

The differentiator is **traceability, not prose**: every test case cites the artifact it verifies (`AC3`, `§18 row 7`, `POST /api/v1/auth/login`), and every AC/edge case maps to at least one case. A test plan that doesn't trace is a wish list.

This skill **produces the plan, not the tests** — the stack skills (`kedata-backend-*`, `kedata-frontend-*`) write the actual test code; this skill tells them exactly what to write and how to prove it done.

## When to Use
* User command: `/kedata-test-plan`
* Autonomous trigger: When the user says "write a test plan", "plan the tests", "QA plan", "how do we test this?"; after the contracts are approved and before implementation starts. Run AFTER `kedata-contracts`, BEFORE `kedata-system` / implementation.
* **Do NOT use** to write test code — that is the stack skill's job for unit and integration tests, and `kedata-qa-automation` for the E2E suite and its fixtures.
* **Do NOT use** before the PRD is approved — there is nothing to verify against.

## Prerequisites & Context Gathering
Before the interview starts, the agent MUST:
1. **Read the PRD first (mandatory).** `docs/PRD.md`, then root. Extract: §5 user stories + acceptance criteria (each AC becomes ≥1 test case), §18 edge-case register (each P0 row becomes a test case), §4 personas/roles (RBAC test matrix), §11 NFRs (performance/security test targets). **If missing, STOP.**
2. **Read the implementation plan (mandatory).** `docs/IMPLEMENTATION_PLAN.md`. Extract: §1 architecture (monolith vs split — E2E scope), §4 testing strategy (the agreed unit/integration/E2E split), §5 tasks (which task owns which tests), §10 DoD (the test gate). **If missing, STOP.**
3. **Read the contracts (mandatory).** `API_CONTRACTS.md` (every endpoint → contract test: status codes, envelope, error shapes), `DATA_CATALOG.md` (schema constraints → validation tests, indexes → query tests), `ENVIRONMENT_VARIABLES.md` (test environment config).
4. **Read the design brief (optional).** `docs/DESIGN_BRIEF.md` §8 — empty/error/loading states become UI test cases.
5. **Locate existing artifact:** `docs/TEST_PLAN.md` (or root). If it exists, **update in place** and bump the version — never duplicate.
6. **Frame the session (2 minutes max):** "I'll build the test plan from the PRD's ACs and edge cases plus the contracts — levels, cases, fixtures, environments, exit criteria. Answer briefly where I ask; traceability to the artifacts comes from them."

## Interview Protocol (How to Grill)
1. **One domain at a time.** 3-5 starter questions, wait, follow up. Never dump the questionnaire.
2. **Trace everything.** Every case names its source artifact (`AC3`, `§18 #7`, endpoint, entity). Untraceable cases are deleted or attached to a real requirement.
3. **Extract, don't reinvent.** ACs, edge cases, endpoints, and entities are already in the artifacts — lift them; do not re-interview the product.
4. **Follow up until bedrock.** "test it" is not a case — grill for input, action, expected result, and status codes.
5. **Force priority.** "If you could only automate 20 cases before launch, which 20?" — the answer defines the smoke suite.
6. **Cover the negative path.** For every happy case, ask for the failure, boundary, and permission-denied case (these come from PRD §18).
7. **Don't over-grill.** Stop when answers repeat or the user says "you decide" (→ Open Question).
8. **End with the readback.** "X ACs, Y edge cases, Z endpoints covered; smoke suite = N cases. Correct me if wrong."

## Execution Workflow

### Step 1: Domain 1 — Test Strategy & Levels
**Goal:** the shape of the test pyramid, from plan §4.
* Confirm the agreed split (unit / integration / E2E) and the coverage target per layer (backend skills target ≥70% on the service layer).
* Define the smoke suite (launch-critical, runs on every PR) vs the full suite (runs nightly/pre-release).
* Confirm tooling per stack from plan §4 (Go `go test -race`; Python `pytest`; Node Jest/Vitest + supertest; Rust `cargo test`; FE Vitest + Playwright).
**Bedrock signal:** §2 records the level split, coverage targets, tooling, and smoke-vs-full definition — no "TBD".

### Step 2: Domain 2 — Requirements Traceability Matrix
**Goal:** nothing approved goes untested.
* For every PRD §5 AC: at least one test case ID.
* For every PRD §18 edge case marked P0: at least one test case (or an explicit, reasoned N/A).
* For every plan §5 task: the tests that prove its AC met.
* Build a Traceability Matrix: `AC / edge case → test case ID → level → task`.
**Bedrock signal:** the matrix has a row for every AC and every P0 edge case, each with a test case ID and level.

### Step 3: Domain 3 — Test Case Design
**Goal:** executable test cases, per feature and per endpoint.
* Per feature (PRD §8): happy path, boundary (PRD §18 #7), invalid input (#6), permission boundaries (#8), empty state (#1).
* Per endpoint (contracts): success status + envelope, every documented error status (400/401/403/404/409/422/500), idempotency/retries (#9), pagination limits (#7).
* Per RBAC rule (PRD §4): the role × action matrix — assert 403 for disallowed, filtered data for scoped.
* State-machine transitions (#11): legal transitions pass; illegal transitions return the contract's status.
* Each case: `ID | Source | Level | Preconditions | Steps | Input | Expected result | Priority`.
**Bedrock signal:** every P0 feature and every endpoint has happy + negative + boundary cases with explicit expected results.

### Step 4: Domain 4 — Test Data & Fixtures
**Goal:** deterministic data so tests don't flake.
* Seeded fixtures/factories per entity (valid, boundary, invalid samples).
* Auth fixtures per persona (PRD §4) for RBAC tests.
* Data reset strategy (per-test transaction rollback, snapshot restore, or isolated test DB).
* Anonymized/representative data rules — never real PII in fixtures.
**Bedrock signal:** §6 defines a fixture per entity + per persona, and the reset strategy.

### Step 5: Domain 5 — Environments, Tooling & Automation
**Goal:** where and how the plan runs.
* Test environments (local, CI, staging) and how config is injected (`ENVIRONMENT_VARIABLES.md`).
* CI integration: which suite runs on PR vs merge vs schedule; gating rules.
* Contract testing (schemathesis/Pact/openapi-diff) against `API_CONTRACTS.md`.
* Post-deploy smoke against staging (feeds `kedata-deploy`).
**Bedrock signal:** §7 maps every suite to an environment and a CI trigger, with the gating rule stated.

### Step 6: Domain 6 — Non-Functional Test Approach
**Goal:** the NFRs (PRD §11) get a test method, not just a number.
* Performance: targets from PRD §11 → load smoke test (latency p95, throughput).
* Security: the PRD §18 security probes (#12) → abuse cases (XSS, injection, oversized payload, mass-assignment, rate-limit bypass).
* Accessibility (if UI): brief §8 states + WCAG AA → automated audit + keyboard checklist.
* Reliability: failure/retry (#9), timeout, degraded mode (#10).
**Bedrock signal:** every PRD §11 NFR has a test method and a pass threshold.

### Step 7: Domain 7 — Exit Criteria & Defect Handling
**Goal:** when is testing "done"?
* Exit criteria per milestone (plan §9): all smoke green, all P0 ACs covered, zero open P0/P1 defects, coverage target met.
* Defect severity definitions (P0 blocker → ship-block) and triage owner.
* Regression suite scope and when it runs (pre-release, post-hotfix).
* Sign-off: who declares the build testable.
**Bedrock signal:** §9 states milestone exit criteria, defect severities, and the regression trigger.

### Step 8: Draft & Self-Check
* Fill every section of the template below — no empty placeholders; "N/A" with a one-line reason.
* Save to **`docs/TEST_PLAN.md`** (default). EXCEPTION — if the team already uses root `TEST_PLAN.md`, update that file in place; never create a second copy.
* Set §10 Document Info: status `Draft`, version `0.1`, source PRD + plan + contract versions, owner.
* Run the self-check — ALL must pass before presenting:
  - [ ] Every PRD §5 AC appears in the traceability matrix with ≥1 test case
  - [ ] Every PRD §18 P0 edge case has a test case (or explicit reasoned N/A)
  - [ ] Every `API_CONTRACTS.md` endpoint has a contract test (success + all error codes)
  - [ ] Every RBAC rule (PRD §4) has an allow/deny test
  - [ ] Every NFR (PRD §11) has a test method + threshold
  - [ ] Fixtures defined per entity and per persona; reset strategy stated
  - [ ] Each suite mapped to an environment + CI trigger with gating rule
  - [ ] Exit criteria + defect severities defined per milestone
  - [ ] No test case references a requirement that does not exist in the artifacts

### Step 9: Review & Sign-Off
* Present with a tight summary: AC coverage %, P0 edge-case coverage, endpoint coverage, smoke suite size, riskiest untested areas.
* **Do not proceed to implementation until the user approves.** On approval, update §10: status `Approved`, version `1.0`, approver + date.
* Hand off: "Test plan approved. The stack skills use §5 to write tests; `/kedata-review` uses the traceability matrix to verify coverage."

## Downstream Consumers (why the test plan matters)
| Plan Section | Feeds | Consumed By |
|--------------|-------|-------------|
| §2 Strategy & Levels | Test scaffolding per stack | `kedata-backend-*`, `kedata-frontend-*` |
| §3 Traceability Matrix | Coverage verification | `kedata-review` (testing checks) |
| §4 Test Cases | The actual tests to write | Stack skills; QA |
| §5 Fixtures | Seed/factory code, test DB | Stack skills |
| §6 NFR Tests | Perf/security/a11y jobs | `kedata-deploy` (CI), `kedata-review` |
| §8 Exit Criteria | Milestone/PR gates | `kedata-deploy`, `kedata-repo`, `kedata-review` |
| §10 Sign-off status | Readiness gate | A Draft plan must not drive implementation |

## Constraints & Guardrails
* **DO NOT** write test code — this skill produces the plan; the stack skill writes the tests.
* **DO NOT** invent requirements — every case traces to a PRD AC/edge case, an endpoint, or an NFR.
* **DO NOT** leave a P0 AC or P0 edge case without a case or an explicit reasoned N/A.
* **DO NOT** decide the testing strategy or tooling — read it from plan §4; escalate if it's missing.
* **DO NOT** rewrite an existing plan from scratch — update in place and bump the version.
* **DO NOT** renumber the sections — the numbering is a stable contract downstream references depend on.

## Example Output Structure
A complete test plan reaches this specificity: a level split with coverage targets, a traceability matrix with a row per AC/edge case, per-endpoint contract tests with all status codes, fixtures per entity/persona, environment + CI mapping, and milestone exit criteria. The skeleton below is the **shape** — replace every `[bracket]` and placeholder. No `[bracket]` may survive:

# Test Plan: [Project Name] (KEP-123)

**Status:** Draft · **Version:** 0.1 · **Source:** PRD [v1.0] · Plan [v1.0] · Contracts [v1.0] · **Owner:** [Name]

## 1. Scope
What is in scope (features/milestones) and explicitly out (with reason).

## 2. Strategy & Levels
| Level | Scope | Tooling | Coverage Target | Runs On |
|-------|-------|---------|-----------------|---------|
| Unit | services, pure logic | `go test` / `pytest` / `vitest` | ≥70% service layer | every PR |
| Integration | repository + DB | test DB | key queries | every PR |
| E2E | critical flows | Playwright | smoke flows | merge / nightly |

**Smoke suite:** [the launch-critical cases that run on every PR].

## 3. Requirements Traceability Matrix
| AC / Edge Case | Test Case ID | Level | Task (plan §5) |
|----------------|--------------|-------|----------------|
| AC1 (PRD §5) | TC-001 | Unit | T1 |

## 4. Test Cases
| ID | Source | Level | Preconditions | Steps / Input | Expected Result | Priority |
|----|--------|-------|---------------|---------------|-----------------|----------|
| TC-001 | AC1 | Unit | valid user | register with email X | 201 + user returned | P0 |
| TC-014 | `POST /api/v1/auth/login` | Contract | — | wrong password | 401 + envelope error | P0 |

## 5. RBAC Matrix
| Persona \ Action | Create | Read | Update | Delete |
|-------------------|--------|------|--------|--------|
| admin | ✓ | ✓ | ✓ | ✓ |
| user | ✓ | own | own | ✗ (403) |

## 6. Test Data & Fixtures
| Entity | Fixture / Factory | Valid | Boundary | Invalid |
|--------|-------------------|-------|----------|---------|
| users | `mkUser()` | … | … | … |

**Reset strategy:** [transaction rollback / snapshot restore / isolated DB].

## 7. Environments & CI
| Suite | Environment | Trigger | Gate |
|-------|-------------|---------|------|
| smoke | CI + staging | PR / merge | block merge |
| full | CI | nightly | report |

## 8. Non-Functional Tests
| NFR (PRD §11) | Method | Threshold |
|---------------|--------|-----------|
| API p95 < 200ms | k6 load smoke | p95 ≤ 200ms @ N rps |

## 9. Exit Criteria & Defects
- Exit: [all smoke green, P0 ACs covered, 0 open P0/P1, coverage met].
| Severity | Meaning | Owner |
|----------|---------|-------|
| P0 | blocks release | [Name] |

## 10. Document Info & Sign-off
| Field | Value |
|-------|-------|
| Status | Draft / Approved |
| Version | 0.1 → 1.0 |
| Source PRD / Plan / Contracts | [versions + locations] |
| Author / Owner | [Name] |
| Approver + date | [Name, date] |
| Open questions | Q1 … / Q2 … |
| File location | `docs/TEST_PLAN.md` |
