---
name: kedata-change
description: "Use this skill when requirements, scope, or a request change after artifacts are approved — a bug that is really a spec gap, a stakeholder change, a scope cut/add, or a production hotfix. It runs change control: classify the change, trace its impact across PRD → design brief → plan → contracts → test plan, cascade the edits in order with version bumps, and re-approve. Trigger when the user says \"change the requirements\", \"scope change\", \"the spec changed\", \"we need to add/remove X\", or when code and docs have drifted."
version: 1.0.0
author: Kedata Indonesia
---

# Skill: Kedata Change Control

## Purpose
Keep the approved artifacts **the source of truth** when reality moves. Requirements change, a "small tweak" appears mid-build, a bug turns out to be a spec gap, or a hotfix must ship before the docs catch up. Without control, the docs drift from the code and every downstream skill verifies against a lie.

This skill runs **the change loop**: capture the change, classify it, trace its blast radius across the artifact chain (`PRD → DESIGN_BRIEF → IMPLEMENTATION_PLAN → contracts → TEST_PLAN`), apply the edits **in dependency order with version bumps**, and re-approve — so no artifact is left stale and no downstream consumer reads an outdated decision.

The differentiator is **the cascade**: a change that touches the PRD almost always touches the plan, the contracts, and the test plan — because they trace back to it. This skill finds and closes every one of those gaps, rather than patching the first doc and forgetting the rest.

It **does not re-run the whole pipeline** — it applies a surgical, traced change and escalates to a full re-run only when the change is large enough to warrant it.

## When to Use
* User command: `/kedata-change`
* Autonomous trigger: When the user says "change the requirements", "scope change", "we need to add/remove feature X", "the spec changed", "this bug is actually a missing requirement"; when a new issue contradicts an approved artifact; when code has drifted from the docs; when a hotfix must ship fast.
* Run WHENEVER an approved artifact needs to move — before, during, or after implementation.
* **Do NOT use** to write a brand-new PRD or plan — that is `kedata-prd` / `kedata-implementation-plan`.
* **DO NOT** let the code drift from the PRD silently — if scope changes, run this FIRST, then implement. (This is the PRD's own rule, now enforced by a skill.)

## Prerequisites & Context Gathering
Before doing anything, the agent MUST:
1. **Read all current artifacts** to know the true baseline (`docs/` first, then root): `PRD.md`, `DESIGN_BRIEF.md` (if any), `IMPLEMENTATION_PLAN.md`, `API_CONTRACTS.md`, `DATA_CATALOG.md`, `ENVIRONMENT_VARIABLES.md`, `TEST_PLAN.md` (if any), `DEPLOYMENT.md` (if any). Record each one's current version + status.
2. **Identify the change:** the issue, request, or observed drift. Capture who asked, why, and the deadline/urgency.
3. **Trace the blast radius** before editing anything: which sections of which artifacts the change touches, and which endpoints/entities/tasks/test cases depend on them.
4. **Check the code state:** is the affected area built, in progress, or untouched? (affects whether this is a doc-only change, a re-work, or a hotfix).
5. **Ask the user for clarification IF:** the request is ambiguous, the base/current versions conflict, or the change is large enough that a full pipeline re-run is cheaper than a cascade.

## Execution Workflow

### Step 1: Domain 1 — Capture the Change
**Goal:** a precise, testable statement of what is changing.
* What changes: the requirement, the scope, the contract, the data, or a bug that reveals a gap.
* Why: source (stakeholder, user feedback, incident, tech discovery) and the driver.
* Urgency: planned (normal change loop) vs hotfix (fast path, docs caught up after).
**Bedrock signal:** §1 states the change in one sentence with its source and urgency — no vague "make it better".

### Step 2: Domain 2 — Classify the Change
**Goal:** pick the cheapest correct path.
* **Minor** — wording/priority tweak, no contract/scope impact → update one artifact (usually PRD), bump patch version.
* **Medium** — adds/removes a feature, endpoint, entity, or AC → cascade PRD → plan → contracts → test plan.
* **Major** — shifts personas, architecture, or deployment platform → escalate to `kedata-prd` / `kedata-implementation-plan` to re-run the affected stages.
* **Hotfix** — production incident → implement + deploy first (`kedata-system` Fast Mode), then run this skill to bring the docs back into truth.
**Bedrock signal:** §2 states the class and the path (which artifacts, which skill, order) with a one-line rationale.

### Step 3: Domain 3 — Impact Trace
**Goal:** find every artifact the change touches — no orphans.
* PRD: which § sections (features §8, ACs §5, data §10, API §9, edge cases §18, NFRs §11)?
* Plan: which tasks §5, endpoints §6, entities §7, env vars §8, milestones §9, decisions §4?
* Contracts: which endpoints/fields/status codes/env vars?
* Test plan: which ACs/edge cases/cases become invalid or new?
* Design brief: any screen/component/state affected?
* Build the **impact table** before editing.
**Bedrock signal:** the impact table lists every artifact section touched, with the downstream items that depend on it.

### Step 4: Domain 4 — Cascade the Edits (in order)
**Goal:** apply changes top-down so each lower doc reads the updated one above.
* Order: `IDEA_BRIEF? → PRD → DESIGN_BRIEF? → IMPLEMENTATION_PLAN → contracts (API/DATA/ENV) → TEST_PLAN → DEPLOYMENT?`.
* Update the Decisions Record / version in each touched artifact; mark superseded decisions as `[SUPERSEDED by CR-n]`.
* Keep numbering stable — never renumber sections; never create a second copy.
* For removed scope: mark the removed items and the reason (audit trail), don't silently delete history.
**Bedrock signal:** every artifact in the impact table is updated, version-bumped, and internally consistent with the one above it.

### Step 5: Domain 5 — Code & Task Sync
**Goal:** the build reflects the new truth.
* Re-map tasks: new tasks (owner/effort/milestone/AC), removed tasks, changed ACs.
* Flag in-flight code affected by the change (needs re-work or is now redundant).
* Flag completed code that now violates the change (needs a follow-up task).
* Sync the issue tracker: link the change request, update affected issues.
**Bedrock signal:** §5 lists added/removed/changed tasks and any code that must be revisited.

### Step 6: Domain 6 — Re-Approval Gate
**Goal:** an approved change is now the new baseline.
* Summarize the change, its impact, and anything now out of scope.
* For medium/major: require user re-approval before implementation continues.
* Bump all touched artifacts to their next version and set status appropriately.
**Bedrock signal:** the change record shows approval (name + date) and the new artifact versions.

### Step 7: Draft & Self-Check
* Write `docs/CHANGE_REQUEST.md` **or** append to a `docs/CHANGES.md` log (use whichever the repo already has; if neither, create `docs/CHANGE_REQUEST.md` as the change record, and update the affected artifacts themselves).
* Run the self-check — ALL must pass before presenting:
  - [ ] The change is stated in one testable sentence with source + urgency
  - [ ] Class chosen (minor/medium/major/hotfix) with rationale
  - [ ] Impact table covers every affected artifact section
  - [ ] Every affected artifact is updated in dependency order and version-bumped
  - [ ] No section renumbered; no duplicate file created; superseded decisions marked
  - [ ] Task list re-mapped (added/removed/changed) with ACs
  - [ ] In-flight / completed code that must change is flagged
  - [ ] Test plan updated for changed/new ACs and edge cases
  - [ ] Contracts ↔ data ↔ env remain mutually consistent
  - [ ] Re-approval recorded (name + date) for medium/major change
  - [ ] Issue tracker synced

### Step 8: Review & Sign-Off
* Present with a tight summary: what changed, what it broke downstream, new versions, and anything flagged for re-work.
* **Do not resume implementation until the change is approved** (medium/major). On approval, record it in the change record and updated artifacts.
* Hand off: "Change approved. Artifacts are consistent at [versions]. Resume with `/kedata-system`; review against the new baseline."

## Downstream Consumers (why change control matters)
| Output | Feeds | Consumed By |
|--------|-------|-------------|
| Change record | Audit trail of scope decisions | Team; `kedata-review` (what changed) |
| Updated PRD / brief / plan / contracts | The new source of truth | All downstream skills |
| Re-mapped tasks | Backlog correction | Engineering; `kedata-repo` |
| Updated test plan | Coverage correction | Stack skills; `kedata-review` |
| Version bumps / superseded decisions | Prevents re-litigating settled choices | All downstream work |

## Constraints & Guardrails
* **DO NOT** patch one artifact and leave the others stale — the cascade is the point.
* **DO NOT** silently delete removed scope — mark it with the reason (audit trail).
* **DO NOT** renumber sections or create duplicate files — update in place, bump the version.
* **DO NOT** endorse a major change through a minor path — escalate to `kedata-prd` / `kedata-implementation-plan` when personas, architecture, or platform shift.
* **DO NOT** let code lead the docs — for non-hotfix changes, update the artifacts FIRST, then implement.
* **DO NOT** resume implementation on a medium/major change without re-approval.
* **DO NOT** re-litigate decisions outside the change's scope — keep the change tight and traced.

## Example Output Structure
A complete change record reaches this specificity: a one-sentence change with source, a class + path, an impact table across artifacts, the version bumps, the task re-map, and a recorded re-approval. The skeleton below is the **shape** — replace every `[bracket]`. No `[bracket]` may survive:

# Change Request: CR-[n] — [short title]

**Status:** Draft · **Version:** 0.1 · **Date:** [date] · **Owner:** [Name] · **Linked issue:** [key]

## 1. The Change
[One testable sentence.] **Source:** [stakeholder / user / incident / discovery]. **Urgency:** [planned / hotfix].

## 2. Classification & Path
| Item | Value |
|------|-------|
| Class | Minor / Medium / Major / Hotfix |
| Path | [which artifacts, which skill, order] |
| Rationale | [one line] |

## 3. Impact Table
| Artifact | Section | What changes | Downstream depends on it |
|----------|---------|--------------|--------------------------|
| PRD.md | §8 Core Features | add [feature] | plan §5, contracts §1, test plan §3 |
| API_CONTRACTS.md | §1.2 | new endpoint | frontend, review |

## 4. Artifact Updates (in cascade order)
| Artifact | Old Ver | New Ver | Status | Notes |
|----------|---------|---------|--------|-------|
| PRD.md | 1.0 | 1.1 | Approved | feature added, A9 recorded |

## 5. Task & Code Sync
| Action | Task | Owner | Notes |
|--------|------|-------|-------|
| added | [task] | BE | AC from PRD §5 |
| removed | [task] | — | scope cut |
| revisit | [in-flight code] | FE | now violates §8 |

## 6. New Versions & Re-Approval
Current baseline after change: PRD vX · Plan vY · Contracts vZ · Test Plan vW.
| Approver | Date |
|----------|------|
| [Name] | [date] |

## 7. Open Questions
- Q1: …
