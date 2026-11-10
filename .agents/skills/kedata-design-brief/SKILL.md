---
name: kedata-design-brief
description: Use this skill to interview the user deeply and draft a DESIGN_BRIEF.md in Kedata's house format — the visual/UX context document consumed by mockup design. Reads the approved PRD first, then grills brand identity, design tokens, screens, components, and states. Pairs with `kedata-design-frontend` (the vendored anti-slop visual-craft layer, adapted from tasteskill.dev) for art direction. Trigger when the user says "draft a design brief", "design the UI", or "prepare mockup context".
version: 1.3.0
author: Kedata Indonesia
---

# Skill: Kedata Design Brief Writer

## Purpose
Produce a **DESIGN_BRIEF.md** — the visual/UX companion to the PRD. The PRD answers *"what should we build?"*; the design brief answers *"what should it look like, feel like, and read like?"* It is a distilled context document: personas in design terms, visual identity and design tokens, screen inventory, component inventory, error/empty/loading states, key layouts, and dark mode — **no engineering detail**. This document is the input that mockup design (LLM or human designer) consumes to produce consistent, on-brand UI.

The differentiator is **the grilling**: the agent does not invent a visual identity or copy the first palette that comes to mind. It interviews domain by domain — brand personality, tokens, voice, screens, components, states, layouts — until every visual decision is specific, justified, and captured as a table the mockup generator can follow exactly.

This skill reads the **PRD first** (`docs/PRD.md`, then root `PRD.md`) as its mandatory input: personas, flows, features, and screen hints are extracted from it, not re-interviewed from scratch. A design brief without a PRD is an orphan — if no PRD exists, the skill falls back to interviewing the minimum product fundamentals it needs for design, and flags that the PRD should be written.

## When to Use
* User command: `/kedata-design-brief`
* Autonomous trigger: When starting UI/UX mockup design; when the user says "design the UI", "make a design brief", "prepare design context", or asks an LLM to generate mockups. Run AFTER the PRD is approved, BEFORE mockup design.

## Prerequisites & Context Gathering
Before the interview starts, the agent MUST:
1. **Read the PRD first (mandatory input).** Check `docs/PRD.md`, then root `PRD.md`. The PRD provides: product identity, personas & roles, user flows, features (incl. MVP/V1/V2), and edge cases. The design brief **extracts** from it — do not re-interview the user for product fundamentals that the PRD already answers.
   * If no PRD exists: interview the minimum product fundamentals needed for design (one-sentence product, personas, top 3 flows, feature list) and add a note in §12: "Design brief created without a PRD — product fundamentals to be confirmed."
2. **Locate existing artifacts:**
   * Existing design brief: check `docs/DESIGN_BRIEF.md` first, then root `DESIGN_BRIEF.md`. If one exists, **update that same file in place** — do not rewrite from scratch and do not move it. A root `DESIGN_BRIEF.md` the team has been using stays at root; only new briefs default to `docs/DESIGN_BRIEF.md`.
   * Design references: Figma files, prototypes, existing app, brand guidelines, moodboards — preserve them, don't invent over them.
3. **Frame the interview with the user (2 minutes max):**
   * "I'll interview you on design — brand personality, tokens, voice, screens, components, states, layouts, dark mode. Answer briefly; I'll follow up where I need depth. At the end you'll have a DESIGN_BRIEF.md ready for mockup design."
   * Agree on session budget: full grill (30-45 min) vs focused grill (15-20 min, e.g. only public screens).

## Companion Skill — kedata-design-frontend (visual-craft layer)
This brief defines the *contract* (12 sections, tokens, screens, sign-off). **`kedata-design-frontend`**
(adapted from [tasteskill.dev](https://www.tasteskill.dev/), vendored in this collection under
`skills/design/`, MIT — see `THIRD_PARTY_NOTICES.md`) supplies the *craft* — the anti-slop art
direction (typography, spacing, color, motion, banned patterns) that stops the mockups and
UI from looking generated. Use it **alongside** this skill, never instead of it.

* **Already installed** with this collection — no separate install. It needs Node 22+ and an
  installed Chrome/Edge/Chromium for its `inspect.mjs` gate.
* **Load it** before drafting §1 Product Identity and §3 Visual Identity & Tokens so the
  brand personality and palette are *decided*, not defaulted; load it again when §11
  mockups are produced.
  * The direction draw (`node <skill>/scripts/draw.mjs …`) deals 3 researched directions
    (type system, palette, hero, section compositions) instead of the model's default template.
  * App screens (dashboards, admin, settings) follow its `references/app-screens.md` route.
* **Boundary & precedence:** this brief is the source of truth. Pass `--keep palette,type`
  to the draw so it adopts the brief's brand values instead of overriding them;
  where a craft rule conflicts with the approved brief, the **brief wins** — record
  the deviation as an Open Question in §12 (and, if the brand mandates a banned device,
  note it in §11 so the FE run can justify it).

## Interview Protocol (How to Grill)

**Rules of the interview — apply to every domain:**
1. **One domain at a time.** Ask 3-5 starter questions, wait for answers, then follow up. Never dump the whole questionnaire at once.
2. **Follow up until you hit bedrock.** A "bedrock" answer is specific and usable as-is by a mockup generator: hex values, pixel sizes, exact copy. Vague answers ("modern and clean") are not design decisions — grill: *"What exactly does that mean here — colors, spacing, type? Give me an example screen that feels right."*
3. **Extract, don't reinvent.** If the PRD already defines personas, flows, or features, lift them into design terms — do not make the user repeat the product interview.
4. **Justify every visual decision.** The brief's tables must carry *why* (e.g., "warm paper background because white causes eye strain during long reading"). An LLM mockup generator follows tokens better when it understands the rationale.
5. **Probe states, not just the happy screen.** For every screen and component: empty state, error state, loading state, dark mode variant. Visuals are decided by their states, not their happy path.
6. **Quantify everything.** Pixels, px sizes, breakpoints, hex codes, weights. "Big title" is not a token; `36px / 1.2 / 700` is.
7. **Force priorities.** *"If mockup time only covered 5 screens, which ones?"* — the answer defines the launch-critical visuals.
8. **Record as you go.** After each domain, write the agreed answers into the draft brief section immediately — never wait until the end.
9. **Don't over-grill.** Stop a domain when answers become repetitive or the user says "you decide" (→ record as Open Question in §12). The user's time is the scarcest resource.
10. **End with the readback.** "I've captured palette X, type scale Y, screens A/B/C. Correct me if wrong."

## Execution Workflow

### Step 1: Domain 1 — Product Identity & Brand Personality
**Goal:** define the feeling the design must convey.

Starter questions:
- From the PRD: what is the product in one sentence? (confirm, don't re-ask)
- Extract the PRD personas into §2 (design view: who they are, what they see) — this is the grouping source for Domain 4.
- What three adjectives describe the brand personality? (e.g., calm, trustworthy, scholarly)
- If this product were a place, what would it be? (e.g., "a well-lit reading room — not a SaaS dashboard")
- Who is the design for — what does the audience expect visually?

Grill follow-ups:
- "What must the design NEVER look like? (a brand we must not resemble)"
- "Does the personality change per surface — public landing vs admin panel?"
- "Which existing products or designs do you admire? What specifically about them?"
- "What feeling should a first-time visitor have in 5 seconds?"

**Bedrock signal:** you can write §1 Product Identity (with the three brand adjectives and their why) without a placeholder adjective.

### Step 2: Domain 2 — Visual Identity & Design Tokens
**Goal:** the exact tokens (colors, type, spacing, logo) a mockup generator can follow.

Starter questions:
- Base palette: background, surface, text, muted text, accent, success/warning/error — light mode first.
- Typography: which families for display/heading/body/UI/caption? (body font for reading-heavy products should be a readable serif or screen-optimized serif)
- Spacing: what's the base grid unit (typically 4px)? Max content width? Sidebar width?
- Logo: wordmark, icon, favicon, social preview?

Grill follow-ups:
- "Why these colors?" (rationale for every token)
- "What are the dark-mode variants of each token — same hue family, lightened accents?"
- "Are the fonts actually available — Google Fonts, licensed, or self-hosted?"
- "What's the smallest readable size for body and for UI text?"
- "Do tokens map to CSS custom properties (`--color-bg`, `--space-md`)?"
- "Are there secondary/accessory colors (genre colors, category badges) — how many, and are they distinguishable in graph/badges?"

**Bedrock signal:** §3 token tables are fully populated with light+dark values, pixel sizes, and one-line rationales.

### Step 3: Domain 3 — Voice & Tone (Microcopy)
**Goal:** the copy principles the mockups must render.

Starter questions:
- What language is the UI? (e.g., Bahasa Indonesia)
- Formal or warm? Technical or plain? Selling or inviting?
- Show me a button, an empty state, and a success message — what would they say?

Grill follow-ups:
- "Give me do/don't pairs for 3-4 principles." (e.g., warm not formal, clear not technical)
- "What's the voice for errors — apologetic, direct, helpful?"
- "Are contributions framed as invitations or tasks?" (community products differ here)
- "Any terms that are banned or mandated?" (product-specific vocabulary)

**Bedrock signal:** §3.6 Voice & Tone table has 3-4 principles, each with do/don't examples in the UI language.

### Step 4: Domain 4 — Screen Inventory
**Goal:** every unique screen that needs a mockup, grouped by persona.

Starter questions:
- From the PRD: which screens exist? (extract from flows + features)
- Group them: public, user, moderator, admin — the personas from §2 are the grouping keys.
- For each: name, path, and its key elements.
- Map every PRD flow to its screens into §7 (Flow → steps/screens → notes) — no orphan flows.

Grill follow-ups:
- "Which screens did the PRD imply but not name? (empty shelves, search results, error page)"
- "What are the 3 screens that MUST be perfect at launch?"
- "Which screens share a layout skeleton? (list pages, detail pages, forms)"
- "What is the empty/loading state of each screen?" (handled in Domain 6, but note them now)

**Bedrock signal:** §2 lists every PRD persona in design terms; §5 lists every screen grouped by persona, each with a one-line description of its key elements; §7 maps every PRD flow to screens.

### Step 5: Domain 5 — Component Inventory
**Goal:** the reusable components and their states.

Starter questions:
- Which components appear on 3+ screens? (cards, nav, buttons, badges, tables, toasts…)
- For each component: what content does it hold?
- What are its states: default, hover, active, disabled, loading?

Grill follow-ups:
- "What's the card's content in each context — grid vs list vs shelf?"
- "How does the nav adapt: mobile bottom bar vs desktop top bar?"
- "Which components are complex enough to need their own mockup? (editor, graph, data table)"
- "What does the component look like with no data?"

**Bedrock signal:** §6 lists each component with content, states, and mobile vs desktop behavior.

### Step 6: Domain 6 — Error, Empty & Loading States
**Goal:** every key screen's three non-happy states.

Starter questions:
- Empty states: what does first-run / zero-results / cleared-list look like per screen? (illustration + copy?)
- Error states: network failure, validation failure, not-found — what's shown?
- Loading: skeleton screens, spinners, or progress bars — which for which surface?

Grill follow-ups:
- "What's the tone of the empty-state copy — encouraging, playful, neutral?"
- "Is there a CTA in the empty state? (e.g., 'Belum ada buku di rak' + 'Mulai Baca')"
- "How long is loading before a skeleton appears? What happens on timeout?"
- "What's the global 404 / offline experience?"

**Bedrock signal:** §8 covers empty, error, and loading for every screen in §5 — no screen left without its non-happy states.

### Step 7: Domain 7 — Key Layout Patterns
**Goal:** the layout skeletons for the most important screens, mobile + desktop.

Starter questions:
- Mobile-first: what does the #1 screen look like at 375px? At 1440px?
- Reading-focused pages: body max-width, sidebar presence, sticky elements?
- Admin/dense pages: table density, multi-panel?

Grill follow-ups:
- "Which pages are reading-focused (need 65ch body, quiet chrome) vs functional?"
- "Nav at each breakpoint: bottom tab bar (mobile), top nav (desktop)?"
- "What's sticky on desktop: sidebar, table of contents, action bar?"
- "Which layouts are shared skeletons across screens?"

**Bedrock signal:** §4 breakpoints are defined (375px base, 1440px desktop minimum); §9 defines the layout skeleton for the top screens at mobile and desktop using those breakpoints.

### Step 8: Domain 8 — Dark Mode
**Goal:** decide dark mode: required, default, and token mapping.

Starter questions:
- Is dark mode required? Default, toggle, or system-following?
- Which surfaces flip vs stay constant? (background, surface, text, accent)
- Are accent colors lightened in dark mode for contrast?

Grill follow-ups:
- "Does the reading experience differ in dark mode — same serif, same line-height?"
- "How do images/covers behave in dark mode? (no dark filter needed?)"
- "What's the contrast target for body text in dark?" (WCAG AA)
- "Is dark mode in scope for the first mockup pass or later?"

**Bedrock signal:** §10 states dark mode requirement and token mappings — or is explicitly "N/A" with a reason.

### Step 9: Domain 9 — Design Deliverables
**Goal:** what mockup design produces, in what order, and what "done" means.

Starter questions:
- What should mockup design produce — HTML mockups, Figma, both?
- Which screens first, and how many variants per screen?
- Who reviews the mockups, and what's the acceptance bar?

Grill follow-ups:
- "What tool will consume the brief — an LLM prompt, a designer, both?"
- "What's the definition of done for the mockup phase?"
- "Which deliverables must be committed to the repo vs scratch?"

**Bedrock signal:** §11 lists deliverables with order, variant count, and acceptance criteria.

### Step 10: Draft & Self-Check
* Fill every section of the template below from the PRD extraction + interview answers — no empty placeholders; "N/A" with a one-line reason where a section doesn't apply.
* Save to: **`docs/DESIGN_BRIEF.md`** (default). EXCEPTION — if the team already uses root `DESIGN_BRIEF.md`, update that file in place; never create a second copy.
* Set §12 Document Info: status `Draft`, version `0.1`, source PRD version, owner.
* Run the design brief self-check — ALL must pass before presenting:
  - [ ] All 12 sections filled (or explicitly "N/A" with reason)
  - [ ] §1 product identity has no placeholder adjectives ("modern and clean" is NOT a decision)
  - [ ] §2 lists every persona from the PRD in design terms (who they are, what they see)
  - [ ] Every persona in the PRD has screens in §5
  - [ ] §7 maps every PRD flow to screens in §5 (no orphan flows)
  - [ ] Every component in §6 has states listed
  - [ ] Every screen in §5 has empty/error/loading coverage in §8 (or is marked N/A)
  - [ ] Every color token has light AND dark variants (unless dark mode is N/A)
  - [ ] Typography has exact sizes, weights, line-heights — no "big title"
  - [ ] Breakpoints defined in §4; layouts for mobile (375px) AND desktop (1440px) in §9
  - [ ] No engineering detail leaked (no DB schema, API contracts, or algorithms)
  - [ ] §12 lists source PRD + any open design questions
  - [ ] If `kedata-design-frontend` was used: its dealt direction is reflected in §1/§3/§9, any `--keep palette,type` brand values were preserved, and every deviation is logged in §12

### Step 11: Review & Sign-Off
* Present the brief with a tight summary: the visual identity decided, the screens covered, the riskiest assumptions (e.g., dark mode scope, font availability), and open questions.
* **Do not proceed to mockup design until the user approves it.** On approval, update §12: status `Approved`, version `1.0`, approver + date.
* Hand off: "Design brief approved. Feed it as context for mockup design — start with the launch-critical screens from §11 — then hand it to `/kedata-implementation-plan` (FE task scope)."

## Downstream Consumers (why the design brief is the input to design)
| Brief Section | Feeds | Consumed By |
|---------------|-------|-------------|
| §1 Product Identity | Brand consistency | Mockup design; frontend implementation |
| §2 User Personas (Design View) | Who sees what per role | Mockup design (screen grouping); frontend RBAC-aware UI |
| §3 Visual Identity & Tokens | Exact colors/type/spacing | Mockup design; frontend design tokens |
| §3.6 Voice & Tone | UI copy | Mockup design; content writing |
| §4 Responsive Breakpoints | Layout rules | Mockup design; frontend implementation |
| §5 Screen Inventory | Which mockups to build | Mockup design (the screen list) |
| §6 Component Inventory | Reusable UI blocks | Mockup design; component library |
| §7 User Flows (with Screen References) | Navigation & journey order | Mockup design (flow screens); frontend routing |
| §8 Error/Empty/Loading States | Non-happy-path visuals | Mockup design; frontend implementation; `kedata-test-plan` (state coverage cases) |
| §9 Key Layout Patterns | Page skeletons | Mockup design |
| §10 Dark Mode | Token variants | Mockup design; frontend implementation |
| §11 Deliverables | Mockup scope & order | Mockup design (definition of done); `kedata-implementation-plan` (FE task scope) |
| §12 Sign-off status | Readiness gate | Mockup design — a Draft brief must not drive mockups |

## Constraints & Guardrails
* **DO NOT** design mockups or write implementation code — this skill produces the brief, not the visuals.
* **DO NOT** include engineering detail (DB schema, API contracts, algorithms, NFR numbers) — the brief is visual/UX only.
* **DO NOT** re-interview product fundamentals that the PRD already answers — extract, don't reinvent.
* **DO NOT** invent a palette, typeface, or brand personality — confirm each with the user and record the *why*.
* **DO NOT** accept vague visual answers ("modern and clean") — grill to tokens: hex, px, weight, exact copy.
* **DO NOT** leave any screen without its empty/error/loading states — visuals are decided by their states.
* **DO NOT** skip dark mode — decide it or mark it "N/A" with a reason.
* **DO NOT** rewrite an existing brief from scratch — update in place and bump the version.
* **DO NOT** renumber the 12 sections — the numbering is a stable contract mockup design depends on.
* **DO NOT** let `kedata-design-frontend` override the brief — it supplies craft direction; the approved brief supplies the contract and wins on any conflict (log the deviation in §12).

## Example Output Structure
A complete design brief reaches this specificity: a named brand personality with a *why*, token tables with light+dark hex values and rationales, a screen inventory grouped by persona, a component inventory with states, and error/empty/loading coverage for every screen. The skeleton below is the **shape** — replace every `[bracket]` and placeholder description with the concrete, confirmed answers. No `[bracket]` may survive in the delivered brief:

# Design Brief: [Project Name]

**Purpose:** Context document for UI/UX mockup design. **Source:** Extracted from PRD [v1.0]. **Language:** [Bahasa Indonesia (UI), English (tokens)].

## 1. Product Identity
One-sentence product. Pillars/values. Tagline. **Brand personality:** [3 adjectives] — [one-line why, e.g., "like a well-lit reading room, not a SaaS dashboard"].

## 2. User Personas (Design View)
| Persona | Who | What they see |
|---------|-----|---------------|
| [Publik] | [Anyone, no account] | [Landing, search, detail — no bookshelf, no submit] |

**Role inheritance / nav adaptation:** [admin inherits moderator; nav adapts automatically].

## 3. Visual Identity & Design Tokens
### 3.1 Color Palette (light + dark, with why)
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | `#FAF9F6` | `#1A1817` | Page background — warm paper, not white, for long reading |

### 3.2 Secondary Colors (genre/category/badges)

### 3.3 Typography
| Token | Font | Size / Leading | Weight | Usage |
|-------|------|----------------|--------|-------|

### 3.4 Spacing Rhythm (base grid unit, scale, content max, sidebar)

### 3.5 Logo (wordmark, icon, favicon, social preview)

### 3.6 Voice & Tone
| Principle | Do | Don't |
|-----------|----|-------|

## 4. Responsive Breakpoints
| Breakpoint | Width | Device |

## 5. Screen Inventory
### 5.1 Public / 5.2 User / 5.3 Moderator / 5.4 Admin
| # | Screen | Description |
|---|--------|-------------|

## 6. Component Inventory
| Component | Used In | Content | States | Mobile / Desktop |

## 7. User Flows (with Screen References)
| Flow | Steps (screens) | Notes |

## 8. Error, Empty & Loading States
| Screen | Empty | Error | Loading |

## 9. Key Layout Patterns
| Screen | Mobile (375px) | Desktop (1440px) |

## 10. Dark Mode
Required / optional / N/A. Token mappings or explicit reason.

## 11. Design Deliverables
| Deliverable | Order | Variants | Acceptance |

## 12. Document Info & Sign-off
| Field | Value |
|-------|-------|
| Status | Draft / Approved |
| Version | 0.1 → 1.0 |
| Source PRD | [PRD version + location] |
| Author / Owner | [Name] |
| Approver + date | [Name, date] |
| Open design questions | Q1 … / Q2 … |
| File location | `docs/DESIGN_BRIEF.md` |
