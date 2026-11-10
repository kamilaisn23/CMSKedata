---
name: kedata-review
description: "Use this skill when reviewing a pull request, auditing pending changes, or when the user asks for a code review. Reads the approved artifacts first (implementation plan, PRD, contracts, design brief), then runs the Kedata code-review checklist against them — security, correctness, contract compliance, tests, observability, docs — and reports findings in priority order."
version: 1.3.0
author: Kedata Indonesia
---

# Skill: Kedata Code Review

## Purpose
Run a structured code review against Kedata's house checklist — **verifying the changes against the approved artifacts**, not just against generic best practice. Every PR is checked against the same mandatory gates (contract compliance, Swagger, activity logs, security, testing, docs) so reviewers — human or AI — catch the same class of issues and report findings in a consistent, priority-ordered format. The review is only as good as the artifacts it verifies against: the implementation plan defines *what was supposed to be built*, the contracts define *what the API and data must look like*, and this skill checks the code against them.

## When to Use
* User command: `/kedata-review`
* Autonomous trigger: When the user asks to review a pull request, audit pending changes, or requests a code review; before merging any PR into a Kedata repo.
* **Do NOT use** to scan the whole repository for a backlog — that is `kedata-audit` (repo-wide discovery → issues). This skill reviews one diff against the artifacts and gates its merge.
* **Lean lens:** `kedata-ponytail-review` reviews the same diff for whether every line earns its place (bloat, duplication, missing tests on risky logic). It complements this checklist; it does not replace the artifact checks, and a lean cut that moves an approved artifact goes through `kedata-change`.

## Prerequisites & Context Gathering
Before reviewing, the agent MUST:
1. **Read the approved artifacts (verify against these, don't guess):**
   * **`IMPLEMENTATION_PLAN.md`** — check `docs/` first, then root. §4 stack (which language skill's standards apply), §5 the task being reviewed (its acceptance criteria), §10 DoD.
   * **`API_CONTRACTS.md`** — every endpoint's request/response shapes and status codes. The code must MATCH these, not just "be updated".
   * **`DATA_CATALOG.md`** — entity schemas, indexes, relationships.
   * **`ENVIRONMENT_VARIABLES.md`** — config the code depends on.
   * **`PRD.md`** — §5 acceptance criteria, §18 edge cases.
   * **`TEST_PLAN.md`** — §3 traceability matrix (which ACs/edge cases must be covered), §4 test cases (what the tests should assert), §9 exit criteria. The diff's tests must match the plan, not just exist.
   * **`DESIGN_BRIEF.md`** — screens (§5), components (§6), states (§8), dark mode (§10) — the FE visual contract.
   * **`DEPLOYMENT.md`** — §5 config/secrets, §6 migrations, §7 CI gates, §10 rollout/rollback — the deploy contract when the diff touches infra.
2. **Identify the changes:** PR/branch and its diff vs. base (`git diff main...HEAD`, `gh pr view`); the linked issue and its acceptance criteria.
3. **Determine scope and stack:** backend (Go/Python/Node/Rust), frontend (React/Nuxt), infra, docs-only. Read the stack from plan §4 — do not assume.
4. Run the local verification commands where possible: `make test`, `make swagger`, build/lint per the stack.
5. Ask the user for clarification IF:
   * The base branch is ambiguous.
   * The diff is enormous (>500 lines) — confirm whether to review everything or a subset.
   * The PR type is unclear (feature, hotfix, refactor, docs-only).
   * The artifacts are missing — review what you can, but flag "cannot verify contract compliance — API_CONTRACTS.md missing".

## Execution Workflow

### Step 1: Verify Against the Contract (Mandatory)
The code must match the approved artifacts. Any mismatch = request changes:
| # | Check | How to Verify |
|---|-------|---------------|
| 1 | Every endpoint in the diff matches `API_CONTRACTS.md` (path, method, request/response shapes, status codes) | Diff each endpoint against the contract entry |
| 2 | No endpoint invented beyond the contract | Any endpoint not in API_CONTRACTS.md is scope creep — flag it |
| 3 | Every schema/field change matches `DATA_CATALOG.md` | Fields, types, indexes, relationships per the catalog |
| 4 | Every env var used exists in `ENVIRONMENT_VARIABLES.md` | Cross-check code references vs the doc |
| 5 | The task satisfies the implementation plan §5 acceptance criteria + §10 DoD | Walk each AC against the implementation |
| 6 | Stack in the code matches plan §4 (no improvised stack) | Frameworks, DB, auth per the plan |
| 7 | Tests cover what `TEST_PLAN.md` §3 requires for this task | Map the diff's tests to the traceability matrix; missing P0 coverage = request changes |

### Step 2: Mandatory Standards (per the stack from plan §4)

**Backend Standards (apply the language's docs approach):**
| # | Check | How to Verify |
|---|-------|---------------|
| 7 | API docs present on all new/modified endpoints | Go: swaggo annotations + `/swagger`; Python: FastAPI `/docs` (protected in prod); Node: swagger-jsdoc; Rust: utoipa |
| 8 | Docs generate without errors | Go: `make swagger`; Python: `openapi.json` builds; Node/Rust: spec compiles |
| 9 | Generated docs committed | Go: `docs/swagger.json` in the diff; others per repo convention |
| 10 | Activity logs emitted for user actions | Search for the activity-log call on auth, CRUD, settings |
| 11 | No `fmt.Println` / `console.log` / `dbg!` in production code | Global search; use structured logger |

**Security:**
| # | Check | How to Verify |
|---|-------|---------------|
| 12 | No hardcoded secrets, tokens, or passwords | Search for `sk-`, `gpat_`, `password =`, `secret =` in diff |
| 13 | No SQL/NoSQL injection | Parameterized queries only — no string concat in DB calls |
| 14 | Input validation on all endpoints | `ShouldBindJSON`, pydantic, zod/joi, serde validation per stack |
| 15 | Auth middleware on protected routes | `middleware.Auth()` or equivalent per framework |
| 16 | Sensitive data not logged | Search logs for `password`, `token`, `secret`, `credit_card` |
| 17 | CORS to specific origins | Not `*` in production; check `ALLOWED_ORIGINS` |

**Code Quality:**
| # | Check | How to Verify |
|---|-------|---------------|
| 18 | Lint passes | `golangci-lint run` / `ruff check` / `eslint` / `cargo clippy` — zero errors |
| 19 | Build passes | `go build ./...` / `npm run build` / `cargo build` / `tsc --noEmit` |
| 20 | No dead code | Unused imports, vars, functions, commented-out blocks |
| 21 | Robust error handling | Every error path returns proper HTTP status + message |
| 22 | No magic numbers/strings | Constants at package level or in config |

**Testing:**
| # | Check | How to Verify |
|---|-------|---------------|
| 23 | Unit/integration tests for new logic match `TEST_PLAN.md` §4 | Happy path + 2 edge cases per function; cite the test case ID from the §3 matrix |
| 24 | All tests pass | `make test` / `npm run test` / `pytest` / `cargo test` — 100% |
| 25 | No unexplained test skips | `t.Skip()` / `it.skip()` / `#[ignore]` need TODO comment or linked issue |

### Step 3: Recommended Checks (Should Pass)
Failures = approve with suggestions:

**Architecture & Design**
| # | Check |
|---|-------|
| 26 | Repository pattern (Handler → Service → Repository → DB) |
| 27 | Single responsibility per function (>50 lines is a red flag) |
| 28 | No circular dependencies |
| 29 | Consistent naming conventions |

**Performance**
| # | Check |
|---|-------|
| 30 | DB queries have indexes (check `DATA_CATALOG.md`) |
| 31 | No N+1 queries |
| 32 | Pagination on list endpoints (default `page=1&size=20`, max `size=100`) |
| 33 | Large operations are async |

**Documentation**
| # | Check |
|---|-------|
| 34 | `API_CONTRACTS.md` updated to match the final code |
| 35 | `DATA_CATALOG.md` updated to match the final schema |
| 36 | `ENVIRONMENT_VARIABLES.md` updated for new config |
| 37 | PR description is clear and links the issue |

**Frontend (if applicable)**
| # | Check |
|---|-------|
| 38 | Screens match the design brief §5 + mockups (not invented) |
| 39 | Design tokens from the brief §3 used (not improvised colors/type) |
| 40 | Loading, error, and empty states per brief §8 |
| 41 | Dark mode per brief §10 |
| 42 | No `any` types in TypeScript |
| 43 | Responsive design checked (375px) |
| 44 | No layout shift |

**Deployment (if the diff touches infra/Dockerfile/CI)**
| # | Check |
|---|-------|
| 45 | Follows the plan §3 platform: stateless rules for Cloud Run ($PORT, no local FS) vs compose stack for VM |
| 46 | Secrets via Secret Manager (Cloud Run) or docker secrets/.env (VM) |
| 47 | No `api.app.kedata.id`-style multi-level subdomains (Cloudflare rule) |
| 48 | Matches `DEPLOYMENT.md` (build/services/migrations/rollout) — a diff that contradicts the runbook needs the runbook updated via `kedata-deploy` |

### Step 4: Language-Specific Deep Checks
Run the deep checklist for the stack in play (from plan §4):
* **Go:** `context.Context` through all layers, `defer` cleanup, `json`/`bson` tags match contracts, `binding` tags on DTOs, `go vet ./...`, `go test -race ./...`.
* **Python:** type hints, `async`/`await` correct (no blocking calls), Pydantic models, specific `except` (no bare), `ruff check .`, `mypy .`.
* **Node.js:** `async/await` not callbacks, zod/joi validation, `Promise.all` for parallel ops, eslint, no `var`.
* **Rust:** `thiserror` domain errors (no `unwrap`/`expect` on user input), blocking calls not in async handlers, utoipa annotations, `cargo clippy` clean, `cargo fmt` applied, `cargo test` (incl. `--release` for timeouts).

### Step 5: Write the Review
* Use the comment templates below.
* Prefix blocking items `[MUST]`, non-blocking `[SHOULD]`.
* Be specific ("Split `handleUpdate` into `validateUpdate` + `applyUpdate`") and acknowledge good work.
* Order findings: contract violations first (Step 1), then mandatory (Step 2), then recommended (Step 3).
* Cite the artifact each finding violates: "contract says `POST /auth/reset-password` returns 422 — code returns 400".

### Step 6: Self-Check Before Presenting
- [ ] Every endpoint in the diff checked against `API_CONTRACTS.md` (Step 1)
- [ ] Every mandatory check (Step 2) has a verdict: pass / fail / not-applicable (with reason)
- [ ] Language deep-checks run for the stack from plan §4
- [ ] Frontend findings cite the design brief section, not generic taste
- [ ] Findings are priority-ordered: contract → mandatory → recommended
- [ ] Every comment names a file/function and gives a concrete fix
- [ ] Verdict is explicit: Request Changes / Approve with Suggestions / LGTM

## Constraints & Guardrails
* **DO NOT** approve a PR with any failed mandatory check or contract violation — request changes.
* **DO NOT** review against generic best practice when an artifact defines the expected behavior — the contracts/plan/brief are the source of truth.
* **DO NOT** rubber-stamp trivial PRs without running the checklist.
* **DO NOT** comment on style that isn't in the checklist — stay scoped.
* **DO NOT** be vague: every comment names the file/function and gives a concrete fix.
* **DO NOT** assume a stack — read it from plan §4 before applying language checks.
* Keep the review priority-ordered: contract violations first, then blockers, then suggestions.

## Example Output Structure

### Request Changes (contract violation or mandatory failure)
## ❌ Changes Requested

### Contract Violations
- [ ] **`POST /auth/reset-password` returns 400 on invalid token** — `API_CONTRACTS.md` §1.2 specifies 422. Return 422 with the error shape from the contract.
- [ ] **New endpoint `GET /api/v1/stats` not in the contract** — scope creep beyond plan §6. Remove or escalate the contract first.

### Mandatory Checks Failed
- [ ] **Swagger annotations missing** on `POST /auth/reset-password` — add `@Param`, `@Success`, `@Failure`
- [ ] **Activity log not emitted** for password reset completion — add activity-log call

### Suggestions
- [ ] Use a constant for token expiry instead of magic number `3600`

Please address the mandatory items and re-request review.

### Approve with Suggestions (only recommended failures)
## ✅ Approved with Suggestions

### Contract & Mandatory Checks
All passed.

### Suggestions (Non-blocking)
- [ ] Consider index on `user_id` for the new `password_resets` collection
- [ ] `handleResetPassword` is 80 lines — split into 2 functions
- [ ] `ErrorState` text differs from the brief §8 copy — align with "Belum ada buku di rak"

Great work! 🎉

### Quick LGTM (trivial)
## ✅ LGTM

Trivial change — all checks pass. Merging.
