---
name: kedata-repo
description: "Use this skill for GitHub/GitLab communication in a Kedata repo: draft and open PR/MR descriptions in the house template, summarize a branch's changes, link issues, and gather repo context via the platform CLI (gh / glab). Trigger when the user asks to open a pull request, write a PR/MR description, or handle an issue."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata Repo — GitHub/GitLab Communication

## Purpose
Handle all repository-platform communication in a Kedata repo: draft and open **pull requests (GitHub) / merge requests (GitLab)** in the house template, summarize branch changes, and link issues. The skill detects the platform (GitHub via `gh`, GitLab via `glab`, or git-only) and uses the right tooling, so PRs/MRs communicate the same information every time: what changed, why, what type of change, whether mandatory checks pass, and which issue it closes. The template encodes Kedata's non-negotiable backend standards (Swagger + Activity Log) directly into the checklist so they can't be skipped.

## When to Use
* User command: `/kedata-repo`
* Autonomous trigger: When the user asks to open a PR/MR, write a PR/MR description, summarise a branch's changes, or handle a linked issue; when a feature/bugfix branch is ready to merge.

## Prerequisites & Context Gathering
Before drafting anything, the agent MUST gather repo context:
1. **Run the helper script** (installed with this skill): `bash scripts/repo-context.sh [base]` — it detects the platform (`gh`/`glab`/none), prints the current branch, base branch, commits since base, diff stat, changed files, the issue key from the branch name (e.g. `feature/KEP-123-short-desc` → `KEP-123`), and any existing PR/MR for the branch.
2. **Detect the platform:** GitHub → `gh`; GitLab → `glab`; neither installed → git-only (output the body for manual paste).
3. Read the approved artifacts if the diff touches code: `IMPLEMENTATION_PLAN.md` §5 (task ACs), `API_CONTRACTS.md`, `DATA_CATALOG.md`, `TEST_PLAN.md` (which ACs/edge cases this PR covers), and `DEPLOYMENT.md` if the diff touches infra — the PR description should reflect what was agreed, not improvise.
4. Note any related `AUDIT_REPORT.md` / `CHANGE_REQUEST.md` — issues filed by `kedata-audit` and changes cascaded by `kedata-change` are what this PR/MR closes (`Closes #n`).
4. Ask the user for clarification IF:
   * The target base branch is ambiguous (main vs. develop vs. release).
   * The diff spans multiple unrelated features — suggest splitting into separate PRs/MRs.
   * There is no issue number to link.

## Execution Workflow

### Step 1: Gather Context
* Run `bash scripts/repo-context.sh` (or pass an explicit base: `bash scripts/repo-context.sh develop`).
* Read the platform line: `gh` / `glab` / git-only. If the CLI exists but auth is missing, tell the user to run `gh auth login` / `glab auth login` first.
* List commits, summarize the diff by area (backend / frontend / docs / infra), and note endpoint/schema/env-var changes.

### Step 2: Draft the PR/MR Body
* Fill the template below with concrete, accurate detail — no placeholder text.
* Keep the Summary to one line; push detail into Changes.

### Step 3: Complete the Mandatory Checks Checklist
* Verify each item against the actual diff (Swagger annotations, `make swagger`, activity logs, secrets, tests, lint, build, docs).
* Leave unchecked items as `[ ]` — do NOT pre-check them.

### Step 4: Open or Hand-Off
* **GitHub (`gh`):** open with `gh pr create --base <base> --title "<summary>" --body "<body>"` (or write body to a file and use `--body-file`). Link the issue with `Closes #123` in the body.
* **GitLab (`glab`):** open with `glab mr create --target-branch <base> --title "<summary>" --description "<body>"`.
* **Git-only:** output the full body in a code block for copy-paste, and tell the user where to open the PR/MR.
* If any mandatory item is unchecked, tell the user which checks still need attention before merge — do not open a PR/MR with a knowingly failing checklist.

## Constraints & Guardrails
* **DO NOT** invent changes that aren't in the diff — the body must reflect reality.
* **DO NOT** pre-check the mandatory checklist — it must reflect reality.
* **DO NOT** add a Screenshots section when there are no UI changes.
* **DO NOT** fabricate issue/PR numbers — read them from `repo-context.sh` output or `gh`/`glab`.
* **DO NOT** push or open anything without the user's confirmation (draft the body first, then open on request).
* Keep the Summary short; put the detail in Changes.

## Example Output Structure

## Summary
Add password reset flow for users who forgot their passwords.

## Changes
- New PasswordReset model and repository
- Two new API endpoints: `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
- SendGrid email integration
- Rate limiting (3 requests/hour per email)

## Type
- [x] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Test
- [ ] Documentation
- [ ] DevOps
- [ ] Hotfix

## Mandatory Checks
- [x] Code follows the implementation plan (docs/IMPLEMENTATION_PLAN.md) and contracts
- [x] Swagger annotations added to all new/modified endpoints
- [x] `make swagger` runs without errors
- [x] `docs/swagger.json` updated and committed
- [x] Activity logs emitted for user actions (auth, CRUD, settings)
- [x] No hardcoded secrets, tokens, or passwords
- [x] No `fmt.Println` / `console.log` debug prints
- [x] Input validation on all endpoints
- [x] Auth middleware on protected routes
- [x] Tests added/updated
- [x] All tests pass (`make test` / `npm run test`)
- [x] Lint passes (`golangci-lint run` / `npm run lint`)
- [x] Build passes (`go build` / `npm run build`)
- [x] `API_CONTRACTS.md` updated (if endpoints changed)
- [x] `DATA_CATALOG.md` updated (if schema changed)
- [x] Tests cover the `TEST_PLAN.md` §3 matrix for this task
- [x] `DEPLOYMENT.md` updated (if infra/build changed)

## Screenshots / Demo (if UI changes)
[Add screenshots here]

## Related Issues
Closes #123
