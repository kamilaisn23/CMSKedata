---
name: kedata-prd
description: Use this skill to interview the user deeply and draft a Product Requirements Document in Kedata's house format. The PRD is the first source of truth for implementation planning, API contracts, the data model, code review, and pull request workflows. Trigger when the user says "draft a PRD", "write a product spec", or starts a new product / feature without a PRD on file.
version: 1.6.0
author: Kedata Indonesia
---

# Skill: Kedata PRD Writer

## Purpose
Produce a Product Requirements Document in Kedata's house format through a **structured deep interview**. The PRD is the **first and primary source of truth** for the entire delivery pipeline: implementation planning, backend and frontend engineering, code review, and pull request descriptions. A weak PRD propagates weakness everywhere.

This skill stands alone — it does not depend on any other skill being installed. All house conventions it relies on are embedded below (tech stack defaults, response envelope, API base path, file conventions), so a fresh install works end-to-end.

The differentiator of this skill is **the grilling**: the agent does not fill a template from what the user volunteers. It interviews domain by domain, asks follow-ups until answers are specific and decision-ready, surfaces assumptions, forces priorities, systematically breaks the product with **edge-case probing**, and records every open question. The template below is the *output*; the interview is the *method*.

## When to Use
* User command: `/kedata-prd`
* Autonomous trigger: When starting a new product or feature without a PRD on file; when the user says "draft a PRD", "write a product spec", or asks to define requirements before implementation. Run BEFORE writing code, before designing API contracts, and before the implementation plan.

## Prerequisites & Context Gathering
Before the interview starts, the agent MUST:
1. **Assume PRD-first.** The PRD is the FIRST artifact of the delivery pipeline. The repo contains either an existing PRD or nothing at all. Downstream docs (`docs/API_CONTRACTS.md`, `docs/DATA_CATALOG.md`, `ENVIRONMENT_VARIABLES.md`) are outputs of later steps — do NOT expect them, do NOT wait for them, do NOT block the interview on them. The PRD defines the conventions that those docs will later be generated from.
2. **Locate existing artifacts:**
   * Existing PRD: check `docs/PRD.md` first, then root `PRD.md`. If one exists, **update that same file in place** — do not rewrite from scratch and do not move it. A root `PRD.md` the team has been using stays at root; only new PRDs default to `docs/PRD.md`. If no PRD exists, this is a greenfield draft — the interview below is the source of everything.
   * Issue / task description: read the full issue, note its key/number (e.g. `KEP-123`), and copy any existing acceptance criteria. If no issue exists, the interview extracts the requirements directly from the user.
   * Optional hints only: if any downstream doc happens to exist from a prior iteration, skim it to reuse conventions — but treat it as a hint, never a requirement.
3. **Frame the interview with the user (2 minutes max):**
   * "I'll interview you domain by domain — problem, users, scope, flows, data, API, edge cases, non-functional, delivery. Answer briefly; I'll follow up where I need depth. At the end you'll have a complete PRD and we'll review it for sign-off."
   * Agree on session budget: full grill (45-60 min) vs focused grill (15-20 min, e.g. single feature).

## Interview Protocol (How to Grill)

**Rules of the interview — apply to every domain:**
1. **One domain at a time.** Ask 3-5 starter questions, wait for answers, then follow up. Never dump the whole questionnaire at once.
2. **Follow up until you hit bedrock.** A "bedrock" answer is specific, quantified, and decision-ready. If an answer is vague ("the user can manage stuff"), grill: *"What exactly can they do? Where does the button live? What happens if they make a mistake?"*
3. **Use the 5 Whys** on problem statements — keep asking *"why is that a problem?"* until you reach the root cause worth building.
4. **Probe boundaries on every answer.** For every feature, flow, or field: *"What happens when it's empty? When it fails? When two people do it at once? When input is invalid or malicious?"* Edge cases are not a separate concern — they are the difference between a demo and a product.
5. **Force priorities.** *"If you had to cut 50% of these features, which survive?"* — this is how MVP is decided, not by listing everything.
6. **Quantify everything.** Users, scale, latency, file sizes, team size, time. Estimates beat absolutes ("~250 users" beats "some users").
7. **Surface the non-obvious.** Ask about non-goals, failure modes, admin needs, and content/ownership rules the user may not think to mention.
8. **Record as you go.** After each domain, write the agreed answers into the draft PRD section immediately — never wait until the end (the user can correct incrementally).
9. **Don't over-grill.** Stop a domain when: answers become repetitive, the user says "I don't know — you decide" (→ record as Open Question in §16), or you have enough for a decision. The user's time is the scarcest resource.
10. **End with the Decisions Record.** Read back every assumption you made and every open question. "I assumed X, recorded as decision. Correct me if wrong."

## Execution Workflow

### Step 1: Domain 1 — Problem & Value
**Goal:** nail the *why* before the *what*.

Starter questions:
- What is the product, in one sentence?
- Who is it for, and what is their situation today (before this product)?
- What is the specific pain or opportunity — what happens today that is slow, manual, or broken?
- How will we know this worked? (success metric — must be measurable)

Grill follow-ups:
- "Why is that a problem?" (repeat until root cause)
- "What does it cost today — time, money, people — when this problem goes unsolved?"
- "If we shipped nothing, what happens in 6 months?"
- "Is the success metric something you already track, or will we need new instrumentation?"
- "What would make you call this project a failure?"

**Bedrock signal:** you can write the Problem Statement and §1 Overview table without any placeholder.

### Step 2: Domain 2 — Users, Personas & Roles
**Goal:** know exactly who uses the system and what each can do.

Starter questions:
- Who are the distinct user groups? (name each persona: public, user, moderator, admin, etc.)
- For each persona: what is their core need — what do they do *most* in the system?
- Are there roles beyond "logged in"? Who moderates, who administers?
- Is there a role hierarchy — does admin inherit moderator powers?

Grill follow-ups:
- "Who creates accounts — self-signup or admin-managed?"
- "What happens when a user misbehaves (spam, abuse)? Who handles it?"
- "Can a user have multiple roles, or exactly one?"
- "Is there a super-admin / seeded account? Who can never be demoted?"
- "What can a persona see but NOT do? (read-only surfaces)"
- "What about anonymous/guest access — what's public?"
- **Edge cases:** "What happens when a user is banned while logged in? While mid-submission? What happens to their content — deleted, orphaned, or hidden?"

**Bedrock signal:** you can write the Personas & Roles table (§4) with core needs per persona and explicit role rules.

### Step 3: Domain 3 — Scope & Features
**Goal:** decide MVP (P0), V1 (P1), V2 (P2) — and what is explicitly NOT built.

Starter questions:
- List the features you know you need. (write them all down first — no judging yet)
- For each: who is it for, and what problem does it solve for them?
- If we must ship in half the time, which features survive?
- What are you explicitly NOT building in v1?

Grill follow-ups:
- "What's the smallest end-to-end slice a user could actually use? (that's your MVP)"
- "Is feature X table-stakes for launch or a differentiator? Does it affect the success metric?"
- "What does the admin need that users don't? (config, moderation, import/export, logs)"
- "What automation is required vs. manual today? (e.g., link validation, duplicate detection)"
- "Does any feature depend on another — what's the dependency chain?"
- "What did I miss that always exists in products like this?" (search, pagination, empty states, notifications)

**Bedrock signal:** §5 features are prioritized, §14 Out of Scope is written, and every feature has a "for whom / solves what".

### Step 4: Domain 4 — User Flows & UX States
**Goal:** every journey mapped start-to-finish, including failure paths.

Starter questions:
- Walk me through the #1 user journey from entry to done. (the "happy path")
- What are the 2-3 next most important journeys?
- Which screens/pages exist? (landing, dashboard, detail, admin…)
- Are there design references (Figma, existing app, prototype) to preserve?

Grill follow-ups:
- "What happens when the user takes the wrong path — error states, retries, empty states?"
- "What happens mid-flow: draft saved? session lost? concurrent edit?"
- "Who sees what on each screen — what's hidden per role?"
- "What notifications exist and who receives them (in-app, email)?"
- "What about the edge cases: duplicates, deleted items, offline, slow network?"
- "Is there a state machine to document? (e.g., draft → pending → approved → rejected — who can trigger each transition? What are the ILLEGAL transitions and what happens if attempted?)"

**Bedrock signal:** §6 user flows are mapped with happy path + failure states; §8 features carry notes about states.

### Step 5: Domain 5 — Data & Content Model
**Goal:** the entities, fields, relationships, and indexes that everything else hangs on.

Starter questions:
- What are the core entities? (users, books, registrations, submissions…)
- For each entity: what fields does it need?
- What are the relationships between entities? (one-to-many, many-to-many, self-references)
- Which fields do users search/filter/sort by?

Grill follow-ups:
- "What is the primary key / slug / identifier, and is it user-visible?"
- "Which fields are required vs optional? Which are unique?"
- "Which fields are queried often enough to need an index?"
- "Is there history/audit — do we need append-only revisions of content?"
- "What happens to children when a parent is deleted (cascade, soft delete, orphan)?"
- "Is any data imported from an existing system (Obsidian vault, CSV, legacy DB)? What's the mapping?"
- "What's the content format — markdown, rich text, files? Size limits?"
- **Edge cases:** "What happens to references that point at a deleted or never-created record (broken links, orphans)? Is there validation? Auto-stub? Cleanup job?"

**Bedrock signal:** §10 data model lists entities with fields, types, required flags, indexes, and relationships — matching the chosen DB (§7).

### Step 6: Domain 6 — API & Integrations
**Goal:** the endpoints and third-party services the system depends on.

Starter questions:
- Which resources need API endpoints? (map from entities/features)
- Which actions exist per resource? (CRUD + verbs like verify/reject/approve)
- Which endpoints require auth? Which require a specific role?
- Which third-party services are involved? (auth provider, email, storage, analytics, payment…)

Grill follow-ups:
- "What's the response envelope and base path convention?" (Kedata: `{ "data": {}, "message": "", "error": "" }` under `/api/v1/`)
- "Which endpoints need pagination, sorting, filtering?"
- "Which external services have env vars we must document?" (→ §12)
- "Any webhooks, background jobs, or async processing?"
- "Are there rate limits or abuse concerns on any endpoint?"
- "What request/response shapes and status codes must the API contract pin down?" (the backend documentation will be generated from this)
- **Edge cases:** "What happens on idempotent retries (double-submit, network retry)? Timeouts? Partial failures in multi-step operations (are they transactional)? What's the status code for each failure mode?"

**Bedrock signal:** §9 API overview lists endpoint / method / auth / description for every feature; §12 lists integrations with env vars.

### Step 7: Domain 7 — Edge Cases (Cross-Cutting Sweep)
**Goal:** deliberately break the product before it ships. For EVERY feature, entity, and flow already discussed, run the edge-case checklist below. This is the step that turns a PRD into a spec a reviewer and QA can verify against.

Frame: *"Now the expensive part — let's try to break the product. For each feature we listed, I'll ask a few boundary questions. Answer briefly; where you don't know, we mark it open in the register."*

**The Edge-Case Checklist** — apply to each feature/entity/flow; pick the 3-6 questions that apply (do NOT mechanically ask all 16 for a typo-fix feature):

| # | Category | Probe |
|---|----------|-------|
| 1 | **Empty states** | What does the screen/API show when there is no data? (first-run, zero search results, cleared list, brand-new account) |
| 2 | **Null & missing** | Which fields can be empty or absent? What is the default? Does any logic break on null? |
| 3 | **Duplicates** | What happens on duplicate submissions, titles, emails, or tags? Auto-detect, warn, block, or allow with flag? |
| 4 | **Concurrency** | Two users editing/submitting the same record at once — last-write-wins, optimistic locking, conflict detection with rebase? |
| 5 | **Deletion & cascades** | Delete a parent — what happens to children, related records, history? Hard vs soft delete? Who can delete what? |
| 6 | **Invalid input** | What validation exists — formats, lengths, allowed characters, type coercion? Client-only or server-enforced too? |
| 7 | **Boundary values** | Min/max on numbers, string length limits, pagination caps, upload size limits — what happens exactly AT the limit and PAST it? |
| 8 | **Permissions boundaries** | What happens when a user without role X calls endpoint Y — explicit 403 or silently filtered data? What is public vs private per field? |
| 9 | **Failure & retries** | What happens on timeout or 5xx? Is the operation retried? Are writes idempotent? What error message does the user see? |
| 10 | **Offline / slow network** | Degraded mode, optimistic UI, cached reads? What breaks and what must never break? |
| 11 | **State-machine transitions** | For each status field: which transitions are legal? What is an illegal transition and what happens if attempted (blocked, 409, ignored)? |
| 12 | **Security abuse** | Malicious input — XSS, path traversal, huge payloads, rate-limit bypass, mass assignment. Where are the boundaries? |
| 13 | **Unicode / special chars** | Titles, names, IDs with unicode, emoji, markdown injection, reserved characters in slugs/paths? |
| 14 | **Scale extremes** | What happens at maximum volume (10k records, 5000 graph nodes, 50MB zip)? Degrades gracefully or falls over? |
| 15 | **Cross-entity orphans** | References pointing to deleted/missing records — broken links, dangling FKs. Validation? Auto-stub? Cleanup? |
| 16 | **Time & scheduling** | Timezones, DST, expiry, TTL, scheduled jobs — what happens at boundaries (midnight, year rollover, token expiry mid-action)? |

**Bedrock signal:** every P0 feature/entity has its edge cases recorded — either resolved into acceptance criteria (§5) or the §18 register, or explicitly flagged as an open question (§16). The user should feel mildly exhausted and significantly more confident.

### Step 8: Domain 8 — Non-Functional Requirements
**Goal:** performance, security, responsive, availability targets — with implementation notes.

Starter questions:
- What are the performance expectations (page load, API latency, search)?
- What security concerns are top of mind? (auth, XSS, uploads, rate limits, secrets)
- What devices/viewports must work? (mobile-first? desktop-only admin?)
- What availability/scale targets exist? (uptime, concurrent users, data volume)

Grill follow-ups:
- "What's the expected scale in 6-12 months — users, records, file sizes?" (drives indexes & caching)
- "Which pages are public vs behind auth — what must be SEO-visible?"
- "Any compliance requirements (data retention, privacy, GDPR/Indonesia PDP)?"
- "What's the hosting reality — cloud, VPS, region? Latency constraints?"
- "What happens on a bad day — backup, restore, rollback plan?"
- "Which NFRs have an *implementation* note, not just a number?" (e.g., "LCP < 1.5s via SSG + static cache")

**Bedrock signal:** §11 NFRs have targets AND implementation notes, and reference the real deployment target.

### Step 9: Domain 9 — Delivery & Risk
**Goal:** milestones, team, and the risks worth writing down.

Starter questions:
- What are the milestones, in order, with rough timeframes?
- Who is available to build and review this? (affects scope realism)
- What keeps you up at night about this project?

Grill follow-ups:
- "Which milestone has the most unknowns — should it move earlier?"
- "What existing systems will this touch (and possibly break)?"
- "What are the top 3 risks — impact and likelihood — and what mitigates each?"
- "What's the definition of done for the FIRST milestone?"
- "What would make you kill this project early?"

**Bedrock signal:** §13 milestones are ordered with deliverables; §15 risks have mitigations; the failure criteria from Domain 1 is honored.

### Step 10: Draft & Self-Check
* Fill every section of the template below from the interview answers — no empty placeholders; "N/A" with a one-line reason where a section doesn't apply.
* **Save location rule:** the default is **`docs/PRD.md`** (the Kedata project convention). EXCEPTION — if the user/team has already been using `PRD.md` at the repo root, update that root file in place instead; do not move it and do not create a second copy in `docs/`. Note the final location in §17.
* Set §17 Document Info: status `Draft`, version `0.1`, issue key(s), owner.
* Run the PRD self-check — ALL must pass before presenting:
  - [ ] All 18 sections filled (or explicitly "N/A" with reason)
  - [ ] Every persona in §4 has core needs and role rules
  - [ ] Every user story has acceptance criteria
  - [ ] Every feature row in §8 maps to an endpoint in §9 and an entity in §10 (no orphans); pure-UI features (landing page, empty states) are marked "N/A — UI-only"
  - [ ] Every API endpoint has: method, path under `/api/v1/`, auth flag, description
  - [ ] Every entity has indexed fields defined
  - [ ] Every env var referenced anywhere appears in §12
  - [ ] Response envelope convention noted in §9
  - [ ] §7 tech stack fully confirmed by the user (no unconfirmed defaults)
  - [ ] **§18 edge-case register covers every P0 feature (at minimum); each entry has expected behavior decided OR is flagged open in §16**
  - [ ] §16 Decisions Record lists every assumption made and every open question

### Step 11: Review & Sign-Off
* Present the PRD to the user with a tight summary: what was decided, the 3-5 riskiest assumptions, the most dangerous edge cases, and the open questions.
* **Do not proceed to implementation until the user approves it.** On approval, update §17: status `Approved`, version `1.0`, approver + date.
* Hand off: "PRD approved. Next: draft the design brief (`/kedata-design-brief`, if UI), then the implementation plan, contracts, and test plan — then begin coding per the stack standards. If scope changes later, run `/kedata-change` first."

## Downstream Consumers (why the PRD is the first source)
| PRD Section | Feeds | Consumed By |
|-------------|-------|-------------|
| §5 User Stories & Acceptance Criteria | Verification criteria | Implementation planning; `kedata-test-plan` (each AC → ≥1 test case); code review (testing/acceptance) |
| §4 Personas & Roles | Auth + RBAC design | Backend & frontend engineering; `kedata-test-plan` (RBAC matrix) |
| §7 Tech Stack | Architecture decisions | Backend & frontend engineering |
| §8 Core Features | Implementation plan | Implementation planning |
| §9 API Overview | `docs/API_CONTRACTS.md` | Backend engineering; code review |
| §10 Data Model | `docs/DATA_CATALOG.md` | Backend engineering |
| §11 NFRs | Performance/security targets | Backend engineering; code review |
| §12 Integrations & Env Vars | `ENVIRONMENT_VARIABLES.md`, `.env.example` | Backend engineering; project setup |
| **§18 Edge Cases register** | **Test plan seed, boundary/negative test cases** | **`kedata-test-plan` (§3 traceability matrix); code review (testing checks); QA** |
| §16 Decisions Record | Future change requests | All downstream work — prevents re-litigating settled decisions |
| §17 Sign-off status | Readiness gate | All downstream work — a Draft PRD must never be implemented |

## Constraints & Guardrails
* **DO NOT** write code, design API contracts, or start the implementation plan while the PRD status is `Draft` — requirements must be approved first.
* **DO NOT** accept vague answers — grill until they are specific and quantified. Vague in, vague product.
* **DO NOT** dump the full questionnaire at once — one domain, 3-5 questions, follow up, move on.
* **DO NOT** skip the edge-case sweep (Step 7) for any P0 feature — "we'll handle it later" is how edge cases become production incidents.
* **DO NOT** invent a tech stack, acceptance criteria, or success metrics — confirm each with the user.
* **DO NOT** leave assumptions silent — every assumption you make goes into §16 Decisions Record.
* **DO NOT** let the code drift from the PRD: if scope changes during implementation, update the PRD FIRST, then the implementation plan.
* **DO NOT** rewrite an existing PRD from scratch — interview against the gaps and bump the version.
* **DO NOT** renumber the 18 sections — the numbering is a stable contract downstream references depend on.

## Example Output Structure
A complete PRD reaches this specificity: personas with role rules, numbered functional requirements (FR1.1, FR2.2…), NFRs with implementation notes, an entity schema with indexes, milestones mapped to features, a Decisions Record, and an Edge Cases register. The skeleton below is the **shape** — replace every `[bracket]` and placeholder description with the concrete, confirmed answers from the interview. No `[bracket]` may survive in the delivered PRD:

# PRD: [Project Name] (KEP-123)
**Status:** Draft · **Version:** 0.1 · **Owner:** [Name] · **Issue:** [key]

## 1. Overview
| Item | Detail |
|------|--------|
| **What** | One-sentence description |
| **Who** | Target users |
| **Why** | Problem being solved |
| **Success Metric** | Measurable success signal |

## 2. Problem Statement
What happens today that is slow/manual/broken — with the cost of leaving it unsolved.

## 3. Goals & Non-Goals
- **Goals:** pillar- or area-organized outcomes
- **Non-Goals:** explicitly NOT building in v1

## 4. User Personas & Roles
| Persona | Description | Core Needs | Role rules |

## 5. User Stories & Acceptance Criteria
- [ ] As a **[persona]**, I want **[feature]**, so that **[benefit]**
  - [ ] AC1 … / AC2 … / AC3 …

## 6. User Flows
Happy path diagrams + failure/edge paths; state transitions per entity (including illegal transitions).

## 7. Tech Stack
| Layer | Technology | Version | Confirmed |

## 8. Core Features (MVP / V1 / V2)
| # | Feature | For Whom / Solves What | Priority | BE | FE | Notes |

## 9. API Overview
Response envelope `{ "data": {}, "message": "", "error": "" }` under `/api/v1/`.
| Endpoint | Method | Auth | Description |

## 10. Data Model
*(Collection for MongoDB, Table for SQL — match §7.)*
| Entity | Field | Type | Required | Indexed | Description |

## 11. Non-Functional Requirements
| Requirement | Target | Implementation |

## 12. Third-Party Integrations & Env Vars
| Service | Purpose | Env Vars |

## 13. Milestones & Timeline
| Phase | Features | Target | Deliverable |

## 14. Out of Scope
Explicitly excluded items (with reasons).

## 15. Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |

## 16. Decisions Record
Every assumption (A1, A2…) and open question (Q1, Q2…) from the interview, with resolution status.

## 17. Document Info & Sign-off
| Field | Value |
|-------|-------|
| Status | Draft / Approved |
| Version | 0.1 → 1.0 |
| Author / Owner | [Name] |
| Issue key(s) | KEP-123 |
| Approver + date | [Name, date] |
| PRD file location | `docs/PRD.md` (or root `PRD.md` if that's the existing convention) |

## 18. Edge Cases Register
The output of the Step 7 sweep — one row per (feature/entity, edge case). This is the seed for the test plan and the code review testing checks.

| Feature / Entity | Edge Case | Expected Behavior | Status |
|------------------|-----------|-------------------|--------|
| Submission form | Duplicate title submitted | Warn contributor, flag for moderator | Decided |
| Parent record delete | Record referenced by 3 related records | Block delete; show referencing records (or soft-delete + mark broken) | Open → Q7 |
| Edit (regular user) | Content changed since base revision | Prompt rebase: reload diff, apply onto latest | Decided |
