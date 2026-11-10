---
name: kedata-audit
description: "Use this skill to scan an entire codebase (not a single diff) and turn findings into a prioritized, deduplicated backlog of GitHub/GitLab issues — bugs, security holes, enhancements, tech debt, missing tests, and doc/deploy drift — plus an AUDIT_REPORT.md. Reuses the kedata-review checklist repo-wide, traces findings to the approved artifacts, and files issues only after a dry-run confirmation. Trigger when the user says \"audit the codebase\", \"find issues\", \"create a backlog\", \"scan the repo for problems\", or after kedata-reverse."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata Audit — Repo-wide Codebase Audit → Issues

## Purpose
Scan the **whole repository** — not a diff — against Kedata's house checklist (`kedata-review` Steps 2–3: security, quality, testing, docs, deploy) plus the approved artifacts, and turn the findings into a **prioritized, deduplicated issue backlog** on GitHub/GitLab, with an `AUDIT_REPORT.md` as the record. It is the **proactive discovery** counterpart to the **reactive** pipeline: the pipeline verifies work already in flight; this skill finds work that should exist.

The differentiators are **dedupe, evidence, and a severity gate**. A repo-wide scan can produce hundreds of findings; the value is not the list, it is the *signal* — every filed issue is deduplicated against the tracker, carries `file:line` evidence and the artifact it violates, and passes a severity/confidence threshold. **Dry-run by default**: it proposes issues, then files only on confirmation.

This skill **creates issues; it does not gate merges** (that is `kedata-review`), **does not execute changes** (that is `kedata-change` / the stack skills), and **does not invent scope** (findings are about existing code quality, never new features).

## When to Use
* User command: `/kedata-audit`
* Autonomous trigger: When the user says "audit the codebase", "find issues", "scan the repo for problems", "create a backlog", "what's wrong with this code"; after `kedata-reverse` (turn its risk flags into issues); on a maintenance cadence; before a release hardening pass.
* **Do NOT use** to review a specific PR/diff → that is `kedata-review`.
* **Lean lens:** `kedata-ponytail-audit` asks the question this skill does not — whether the code should exist at all (dead code, duplication, what to delete or merge) — and writes a report only, filing nothing. Run both; cite its findings instead of re-filing them. A cut that moves an approved artifact goes through `kedata-change`.
* **DO NOT** use to write fixes or new features → `kedata-change` / stack skills.
* **Evidence from QA:** `kedata-qa-automation` leaves per-case results and failure screenshots in `test-results/` (gitignored, uploaded as a CI artifact). Cite them as evidence instead of re-running the suite.

## Prerequisites & Context Gathering
Before scanning, the agent MUST:
1. **Read the approved artifacts (to trace findings, not to re-decide anything):** `docs/` first, then root — `PRD.md` (§18 edge cases), `IMPLEMENTATION_PLAN.md` (§4 stack, §6 endpoints, §7 entities, §8 env vars, §3 platform), `API_CONTRACTS.md`, `DATA_CATALOG.md`, `ENVIRONMENT_VARIABLES.md`, `TEST_PLAN.md`, `DESIGN_BRIEF.md`. Missing artifacts are not a blocker for a quality/security scan, but compliance checks are limited to what exists — say so.
2. **Detect the platform:** GitHub → `gh`; GitLab → `glab`; neither → git-only (emit issue bodies for manual paste). Reuse the `kedata-repo` detection approach.
3. **Detect the stack** from plan §4 / manifests (`go.mod`, `package.json`, `pyproject.toml`, `Cargo.toml`) — determines which scanners and review checks apply. **Read it, never assume.**
4. **Fetch the existing backlog for dedupe:** `gh issue list --state open --limit 200` (or `glab issue list`) — open + recently closed. Note labels in use.
5. **Locate an existing report:** `docs/AUDIT_REPORT.md` (or root). If present, **update in place** and note which findings are new vs carried over — never duplicate.
6. **Ask the user (2 min):** which areas to scan (whole repo vs a subsystem), the severity threshold to file at, the label vocabulary, and whether to sort issues into milestones. Set a cap on issues per run (default 25) to avoid flooding.

## Interview Protocol (How to Grill)
1. **Confirm, don't interrogate.** The code is the primary source; ask only to set scope, threshold, labels, and to confirm ambiguous severity.
2. **Evidence or it doesn't file.** Every finding needs `file:line`, the check/artifact it violates, and impact. "Improve error handling" is not a finding.
3. **Separate fact from judgment.** `Bug`/`Security` are objective (failing check, exposed secret); `Enhancement`/`Tech debt` are judgment — mark confidence.
4. **Dedupe before you propose.** Search the tracker for each finding; if it exists, note "already tracked (#n)" and skip filing.
5. **Respect the threshold.** Below-threshold findings stay in the report as a "watch list", not as issues.
6. **Don't over-scan.** Stop a category when returns are repetitive; prefer signal over exhaustiveness.
7. **End with the readback.** "N findings; M above threshold; K already tracked; proposing J issues. Confirm to file."

## Execution Workflow

### Step 1: Domain 1 — Scope, Categories & Policy
**Goal:** what to scan and what is worth filing.
* Confirm scan scope (whole repo / subsystem), severity threshold (default: file P0–P2, watch P3), confidence floor, issue cap, and label vocabulary.
* Category set (from the `kedata-review` checklist): `bug`, `security`, `tech-debt`, `test-gap`, `docs`, `deploy`, `enhancement`.
* Cadence context (one-off audit vs recurring) — affects whether to reuse milestones.
**Bedrock signal:** §1 states scope, threshold, labels, and cap — no ambiguity about what will be filed.

### Step 2: Domain 2 — Reconnaissance & Automated Scanners
**Goal:** let the tools find the cheap, objective findings first.
* Run stack scanners where available: `golangci-lint`, `go vet`, `go test -race`; `ruff`, `mypy`, `pytest`; `eslint`, `tsc --noEmit`, `npm audit`; `cargo clippy`, `cargo fmt --check`, `cargo audit`.
* Dependency/secret/drift scans: outdated + vulnerable deps, secrets in code, `.env.example` drift, TODO/FIXME inventory.
* CI presence + status (from the plan/`kedata-deploy` surface).
**Bedrock signal:** §2 records each scanner run and its raw output count; tool failures are noted, not hidden.

### Step 3: Domain 3 — Artifact-Compliance Scan
**Goal:** find where the code has drifted from what was approved.
* Every endpoint in code ↔ `API_CONTRACTS.md` (extra = scope creep; missing = gap; shape/status mismatch = contract violation).
* Every model/field ↔ `DATA_CATALOG.md` (missing index, changed type, missing migration).
* Every env var read ↔ `ENVIRONMENT_VARIABLES.md` (undocumented var; unused documented var).
* Every PRD §18 P0 edge case ↔ TEST_PLAN coverage (uncovered = `test-gap`).
* Mandatory standards present: API docs (Swagger/utoipa/openapi) + activity logging on state-changing actions.
* If no artifacts exist, skip and note — recommend `kedata-reverse` first.
**Bedrock signal:** each compliance finding cites both the code location and the artifact section it violates.

### Step 4: Domain 4 — Security & Correctness Scan
**Goal:** the must-not-ship class (reuse `kedata-review` §12–17).
* Hardcoded secrets/tokens; sensitive data in logs; string-concatenated DB queries (injection); missing input validation; missing auth middleware on protected routes; CORS `*` in prod; unrate-limited auth/expensive endpoints; unsafe deserialization; missing output sanitization (XSS).
* Correctness: unhandled error paths, unchecked returns, panic/`unwrap` on user input, missing transactions for multi-step writes, race-prone shared state.
**Bedrock signal:** each security finding has severity, `file:line`, exploitability note, and the standard it violates — no speculative "might be insecure".

### Step 5: Domain 5 — Quality, Performance, Docs & Deploy Scan
**Goal:** the debt class (reuse `kedata-review` §26–46).
* Architecture: DB calls in handlers, business logic in controllers, circular deps, functions >50 lines.
* Performance: unindexed queried fields, N+1 queries, unbounded list endpoints (missing pagination), sync long operations.
* Frontend: `any` types, invented design tokens vs `DESIGN_BRIEF.md` §3, missing loading/error/empty states, missing dark mode, inaccessible controls.
* Docs/deploy: `API_CONTRACTS.md` / `DATA_CATALOG.md` stale vs code; deploy config vs plan §3 (statelessness, secrets, multi-level subdomains); missing health check.
**Bedrock signal:** every finding maps to a named checklist item or artifact, with a concrete suggested fix.

### Step 6: Domain 6 — Findings Consolidation & Dedupe
**Goal:** one clean, prioritized list.
* Build the findings table: `ID | Category | Severity | Confidence | Evidence (file:line) | Artifact/Check | Impact | Suggested fix`.
* Dedupe against Step 1's fetched backlog — mark `already tracked (#n)` and drop from the propose set.
* Merge duplicates found within the scan itself (same root cause).
* Sort by severity × confidence; apply the threshold and the cap.
**Bedrock signal:** every proposed issue is unique, evidenced, and above threshold; below-threshold items sit in the report's watch list.

### Step 7: Domain 7 — Dry-Run Proposal (Gate)
**Goal:** the user sees exactly what will be filed.
* Present the proposed issue list (title, category, severity, evidence, labels) and the count.
* Present the watch list separately (found but not filed).
* **Wait for confirmation.** Allow the user to drop, downgrade, or promote items before any issue is created.
**Bedrock signal:** the user approves a concrete, numbered list before anything is filed.

### Step 8: Domain 8 — File the Issues
**Goal:** create the tracking items.
* **GitHub:** `gh issue create --title "…" --body "…" --label "bug,security"` (+ `--milestone` if requested). **GitLab:** `glab issue create`. **Git-only:** emit each issue body as copy-paste markdown.
* Issue body template (below): What / Where (file:line) / Evidence / Impact / Suggested fix / Artifact reference / Detected-by.
* Link related findings; add the audit run id. Never file duplicates from Step 6.
* Respect the cap — if more than the cap qualify, file the top N and list the rest in the report.
**Bedrock signal:** each filed issue has evidence, a label, and a body a developer could act on without re-investigating.

### Step 9: Draft the Report & Self-Check
* Write `docs/AUDIT_REPORT.md` — the durable record of the run (all findings, filed + watched, plus `already tracked`).
* Update in place if it exists; stamp `Run: <date> · Commit: <sha> · Platform: gh/glab/git`.
* Run the self-check — ALL must pass before finalizing:
  - [ ] Scope, severity threshold, labels, and cap were confirmed with the user
  - [ ] Stack read from plan §4 / manifests (no assumed stack)
  - [ ] Automated scanners run (or their absence noted) per stack
  - [ ] Artifact-compliance findings cite code location + artifact section
  - [ ] Security findings have severity + `file:line` + exploitability/correctness note
  - [ ] Every proposed issue is deduplicated against the existing backlog (or marked already-tracked)
  - [ ] Every filed issue has evidence, a category label, and a severity
  - [ ] Below-threshold findings are in the watch list, not filed
  - [ ] Dry-run confirmation obtained before filing
  - [ ] `AUDIT_REPORT.md` written (new or updated in place); no issue count exceeds the cap

### Step 10: Review & Sign-Off
* Present a tight summary: counts by category and severity, issues filed, already-tracked hits, and the top watch-list items.
* Hand off: "Audit complete — N issues filed, M already tracked. Next: triage in the tracker; act on them via `/kedata-change` (scope) or the stack skills (fixes), then `/kedata-repo` to open the PR that closes them."

## Downstream Consumers (why the audit matters)
| Output | Feeds | Consumed By |
|--------|-------|-------------|
| Filed GitHub/GitLab issues | The backlog | `kedata-change` (scope), stack skills (fix), `kedata-repo` (link/close) |
| `AUDIT_REPORT.md` | Durable audit record + watch list | Team; next audit run (carry-over) |
| Compliance findings | Contract/doc corrections | `kedata-change`, `kedata-review` |
| Security findings | Hardening work | Engineering; incident response if P0 |

## Constraints & Guardrails
* **DO NOT** gate merges — `kedata-review` does that. This skill files work, it does not block.
* **DO NOT** file without deduplicating against the existing backlog first.
* **DO NOT** file without evidence (`file:line` + the check/artifact violated).
* **DO NOT** file below the confirmed severity threshold — keep those in the watch list.
* **DO NOT** file without the dry-run confirmation (unless the user explicitly says "file everything above P2, no review").
* **DO NOT** invent scope — findings are about existing code; new features are out of bounds.
* **DO NOT** re-decide the stack or architecture — read them from plan §4 / PRD §7.
* **DO NOT** exceed the issue cap in one run — file the top N, report the rest.
* **DO NOT** create a second `AUDIT_REPORT.md` — update in place.

## Example Output Structure
A complete audit reaches this specificity: scanners run per stack, a findings table where each row has `file:line` + artifact/check + severity + confidence, a dedupe pass, a dry-run list, filed issues with actionable bodies, and a report. The skeleton below is the **shape** — replace every `[bracket]`. No `[bracket]` may survive:

# Audit Report: [Project Name]

**Run:** [date] · **Commit:** [sha] · **Platform:** [gh / glab / git-only] · **Scope:** [whole repo / subsystem]

## 1. Scope & Policy
| Item | Value |
|------|-------|
| Severity threshold | file P0–P2; watch P3 |
| Confidence floor | certain/likely |
| Issue cap | 25 |
| Labels | bug, security, tech-debt, test-gap, docs, deploy, enhancement |

## 2. Scanners Run
| Scanner | Command | Result |
|---------|---------|--------|
| golangci-lint | `golangci-lint run` | 14 issues |

## 3. Findings
| ID | Category | Sev | Conf | Evidence | Artifact/Check | Impact | Suggested fix |
|----|----------|-----|------|----------|----------------|--------|---------------|
| F1 | security | P0 | certain | `internal/config/config.go:22` | Review §12 | secret in code | move to env, rotate |
| F2 | test-gap | P2 | likely | `internal/api/orders.go:88` | PRD §18 #7 | boundary untested | add test TC-xxx |

## 4. Already Tracked (skipped)
| Finding | Existing issue |
|---------|----------------|
| F3 | #142 |

## 5. Filed Issues
| Issue | Title | Labels | Severity |
|-------|-------|--------|----------|
| #301 | Remove hardcoded JWT secret from config.go | security, P0 | P0 |

## 6. Watch List (below threshold)
| ID | Category | Why kept out |
|----|----------|--------------|
| F9 | enhancement | impact low |

## 7. Summary
[Counts by category/severity; next steps; carry-over for the next run.]

### Issue body template
```markdown
## What
[One-sentence description of the problem.]

## Where
`path/to/file.ext:LINE`

## Evidence
[Failing check / scanner output / artifact section violated.]

## Impact
[What breaks or degrades, and how severe.]

## Suggested fix
[Concrete, minimal direction — not a full design.]

## Reference
Artifact: [API_CONTRACTS.md §1.2 / Review §12 / plan §3]
Detected by: kedata-audit [run date]
```
