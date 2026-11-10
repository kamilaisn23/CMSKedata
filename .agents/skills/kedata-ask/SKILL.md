---
name: kedata-ask
description: "Use this skill when the user does not know where the codebase currently stands in the Kedata delivery pipeline, or asks 'what should I do next?', 'where is this project at?', or is new to the repo. It inspects which approved artifacts exist, tells the user which pipeline step the codebase is at, what must happen next, and which skill to run."
version: 1.2.0
author: Kedata Indonesia
---

# Skill: Kedata Ask — Where Is This Codebase?

## Purpose
Orient anyone — a new developer, a returning user, or an agent in a fresh session — who does not know where the codebase currently stands in the Kedata delivery pipeline. This skill **inspects the approved artifacts on disk** (no guessing), maps what exists to the pipeline stage, and answers three questions: *where is this codebase right now, what is the next step, and which skill should be used?* It is the map of the pipeline: it does not create anything, it tells you where you are and what to run next.

**The pipeline this skill navigates (one skill per artifact / activity):**

| # | Stage | Produces / Does | Skill to run |
|---|-------|-----------------|--------------|
| — | Orientation | reports pipeline position (no artifact) | `kedata-ask` |
| — | Brownfield *(if code exists but artifacts don't)* | reconstructs `PRD.md` + contracts + baseline `IMPLEMENTATION_PLAN.md` | `kedata-reverse` |
| 0 | Idea *(optional)* | `IDEA_BRIEF.md` (business grill of a raw idea) — **not a gate** | `kedata-brainstorm` |
| 1 | Requirements | `PRD.md` (interview) | `kedata-prd` |
| 2 | Design | `DESIGN_BRIEF.md` (reads PRD.md, interview) | `kedata-design-brief` |
| 2.5 | Visuals | build + gate the UI from the brief (or designer/LLM mockups) | `kedata-design-frontend` *(or external)* |
| 3 | Planning | `IMPLEMENTATION_PLAN.md` (reads PRD + brief, interview) | `kedata-implementation-plan` |
| 4 | Contracts | `API_CONTRACTS.md` + `DATA_CATALOG.md` + `ENVIRONMENT_VARIABLES.md` | `kedata-contracts` |
| 4.5 | Test plan | `TEST_PLAN.md` (reads PRD §5/§18 + plan + contracts) | `kedata-test-plan` |
| 5 | Engineering session | Loads the baseline rules (reads all artifacts once per session) | `kedata-system` |
| 6 | Implementation | Write code per the chosen stack (plan §4) | `kedata-backend-*` / `kedata-frontend-*` |
| 6.5 | Deployment | `DEPLOYMENT.md` + Dockerfile/compose/CI (reads plan §3) | `kedata-deploy` |
| 7 | Review | Review the code against the artifacts before merge | `kedata-review` |
| 8 | Repo communication | Open PR/MR, link issues, GitHub/GitLab | `kedata-repo` |
| — | Change control *(anytime)* | Cascades an approved change through the artifacts | `kedata-change` |
| — | Audit *(anytime)* | `AUDIT_REPORT.md` + filed issues (repo-wide scan) | `kedata-audit` |

Artifacts are checked at `docs/<FILE>.md` first, then root `<FILE>.md`. Only these are **gates**:
`PRD.md`, `IMPLEMENTATION_PLAN.md`, the contracts, and `TEST_PLAN.md`. `IDEA_BRIEF.md`,
`DESIGN_BRIEF.md`, `DEPLOYMENT.md`, `AUDIT_REPORT.md`, and `CHANGE_REQUEST.md` are supporting
(or, where noted, optional) — never report a missing one as a hard blocker.

## When to Use
* User command: `/kedata-ask`
* Autonomous trigger: When the user says "what should I do next?", "where is this project at?", "what's the status of this repo?", "I'm new here — what has been done?", or asks which skill to use; at the start of any session where the repo state is unknown.

## Prerequisites & Context Gathering
Before reporting, the agent MUST inspect the repo (do NOT ask the user — the artifacts answer):

1. **Check which pipeline artifacts exist** (`docs/` first, then root):
   * `IDEA_BRIEF.md` *(optional pre-PRD artifact — its absence does NOT block the pipeline)*
   * `PRD.md` *(gate)*
   * `DESIGN_BRIEF.md` *(optional, but required input for FE work)*
   * `IMPLEMENTATION_PLAN.md` *(gate)*
   * `API_CONTRACTS.md`, `DATA_CATALOG.md`, `ENVIRONMENT_VARIABLES.md` *(gate)*
   * `TEST_PLAN.md` *(gate — coverage proof)*
   * `DEPLOYMENT.md` *(supporting — deploy runbook/infra)*
   * `AUDIT_REPORT.md`, `CHANGE_REQUEST.md` *(supporting — not gates)*
2. **Check for code:** backend/frontend directories, `go.mod` / `package.json` / `pyproject.toml` / `Cargo.toml`, `src/` or `app/` folders, plus deploy surface (`Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `cloudbuild.yaml`).
3. **If `IMPLEMENTATION_PLAN.md` exists, read §4** to learn the chosen stack (e.g. "Go + Nuxt") — this determines which backend/frontend skill to recommend — **and §3** to know the deployment platform (VM vs Cloud Run) for `kedata-deploy`.
4. **If code exists, check repo state:** uncommitted changes (`git status`), open PR/MR (`gh pr list` / `glab mr list`), unpushed commits (`git log origin/<branch>..HEAD`), and open issues (`gh issue list`) — audit/backlog context.
5. Ask the user for clarification ONLY IF:
   * The repo has none of the artifacts AND no code — confirm whether this is a brand-new project (→ start at stage 1) or a repo we are joining mid-stream (→ check for a remote/other branch).
   * Code exists but the gating artifacts are missing — offer `kedata-reverse` (reconstruct a baseline) before continuing.
   * The user has a specific goal in mind (e.g. "I want to add a feature") that contradicts the artifact-derived next step — report both, then follow their goal.

## Execution Workflow

### Step 1: Inspect
* Run the artifact checks above and record found/missing for each.
* Read the plan §4 stack (and §3 platform) if the plan exists.

### Step 2: Map to Stage
Find the **furthest completed stage** by the presence of its artifact (each stage's artifact must exist to count as done):
* **Code exists but gating artifacts missing** → brownfield; next is `kedata-reverse` to reconstruct the baseline, then re-run this skill.
* No `PRD.md` and no code → stage 1 not started. If the user also has only a **raw idea**, offer stage 0 (`kedata-brainstorm`, optional) as a business-validity check before the PRD — but make clear the PRD can be written directly if the idea is already validated. Never gate the PRD on an `IDEA_BRIEF.md`.
* `IDEA_BRIEF.md` present, no `PRD.md` → idea validated; next is stage 1 (`kedata-prd`), using the brief as context.
* `PRD.md` only → stages 1 done; next is 2.
* `PRD.md` + `DESIGN_BRIEF.md` → next is visuals (`kedata-design-frontend`) or external mockups, then stage 3.
* `PRD.md` + `DESIGN_BRIEF.md` + `IMPLEMENTATION_PLAN.md` → next is stage 4 (contracts).
* + contracts, no `TEST_PLAN.md` → next is stage 4.5 (`kedata-test-plan`).
* + `TEST_PLAN.md` → planning complete; next is engineering (stages 5–6) via `kedata-system`.
* Code present, no `DEPLOYMENT.md` → implementation in progress; next is stage 6.5 (`kedata-deploy`).
* Code + deploy surface present → next is review (stage 7) then repo (stage 8).
* Open PR/MR → stage 8 in progress; remaining work is review/merge.
* Anytime: an approved artifact must move → `kedata-change`; proactive backlog wanted → `kedata-audit`.

### Step 3: Report Status
Present a compact status report (see Example Output Structure below):
* **Pipeline position** — which stage the codebase is at, with evidence (artifacts found/missing).
* **Next step** — exactly what must happen next.
* **Skill to use** — the skill to run for the next step, and its command.
* **Blockers / notes** — e.g. contracts missing before coding can start; stack not decided in the plan; mockups not produced.

### Step 4: Hand-Off
* If the next skill is not installed, tell the user how to install it: `npx skills@latest add Kedata-Indonesia/vibeskills -s <skill>`.
* End with a clear, single next action — not a list of options.

## Constraints & Guardrails
* **DO NOT** guess the pipeline position — base it on the artifacts actually on disk.
* **DO NOT** create, modify, or fill any artifact — this skill only inspects and reports.
* **DO NOT** re-interview the user for requirements — that is what the artifact-producing skills do.
* **DO NOT** recommend a stack-specific skill unless the plan §4 says that stack.
* **DO NOT** treat `IDEA_BRIEF.md` / `kedata-brainstorm` as a required stage — it is optional; never block the PRD on it or report it as a missing blocker.
* **DO NOT** treat `DEPLOYMENT.md`, `AUDIT_REPORT.md`, or `CHANGE_REQUEST.md` as gates — they are supporting artifacts; report them as "recommended next", not blockers.
* **DO NOT** dump the whole pipeline table unless the user asks — keep the report to where they are, what's next, and what to run.
* Keep the report short and decisive: position, next step, skill, blockers.

## Example Output Structure

## 📍 Where this codebase is

**Stage 4.5 — Planning done, contracts drafted, test plan not yet written.**

| Artifact | Status |
|----------|--------|
| `docs/PRD.md` | ✅ found |
| `docs/DESIGN_BRIEF.md` | ✅ found |
| `docs/IMPLEMENTATION_PLAN.md` | ✅ found (§4: Go + Nuxt 3, MongoDB Atlas · §3: Cloud Run) |
| `docs/API_CONTRACTS.md` | ✅ found |
| `docs/DATA_CATALOG.md` | ✅ found |
| `docs/ENVIRONMENT_VARIABLES.md` | ✅ found |
| `docs/TEST_PLAN.md` | ❌ missing |
| Code | ❌ none yet |

## ➡️ Next step
Draft the test plan — it turns the PRD's acceptance criteria and edge cases into the cases
the stack skills implement and the review verifies coverage against.

**Run:** `/kedata-test-plan` (reads PRD.md §5/§18 + IMPLEMENTATION_PLAN.md + contracts, produces TEST_PLAN.md).

**Not installed?** `npx skills@latest add Kedata-Indonesia/vibeskills -s kedata-test-plan`

## ⚠️ Blockers
- None — this is the correct next step.

---

### Another example — engineering in progress
**Stage 6.5 — Implementation in progress, deployment not configured.**

- `docs/IMPLEMENTATION_PLAN.md` ✅ · contracts ✅ · test plan ✅ · Go code present in `backend/`, no frontend yet
- Stack from plan §4: Go + Gin backend, Nuxt frontend · plan §3: VM + Docker Compose
- Next: implement the remaining frontend → **run `/kedata-frontend-nuxt`**; then configure deployment → **`/kedata-deploy`** (VM + Compose per plan §3); after both are done, run `/kedata-review` before opening the PR, then `/kedata-repo` to open the MR/PR.
