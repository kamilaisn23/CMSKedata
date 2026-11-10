---
name: kedata-brainstorm
description: "Use this skill to partner on a raw product idea and grill it from a business perspective — problem, market, competition, value proposition, business model, feasibility, go-to-market, and kill criteria — until it matures into a feasible, market-fit idea ready for a PRD. Produces an optional docs/IDEA_BRIEF.md. This step is OPTIONAL and sits BEFORE kedata-prd: if the user is already convinced the idea is sound, they may skip straight to kedata-prd. Trigger when the user says \"I have an idea\", \"let's brainstorm\", \"validate this idea\", \"is this worth building?\", or shares a rough concept that is not yet a product spec."
version: 1.0.0
author: Kedata Indonesia
---

# Skill: Kedata Brainstorm — Raw Idea → Validated Idea

## Purpose
Partner with the user to take a **raw idea** and pressure-test it from a **business/product perspective** until it becomes a **mature, feasible idea with a plausible market/user fit**. The output is an optional **`docs/IDEA_BRIEF.md`** — a distillation of the problem, target market, competition, value proposition, business model, feasibility, go-to-market, and the risks that could kill it, closing with an explicit **verdict**.

The differentiator is **the grilling**: this skill does not cheerlead a shiny idea, and it does not fill a template with optimism. It interviews domain by domain, separates what the user **knows** from what they **believe**, challenges every market claim with "what's your evidence?", forces the idea through customer, competitor, economics, and feasibility scrutiny, and surfaces the assumptions that must be true for the idea to work — before a single requirement is written.

**This stage is OPTIONAL.** It exists so a rough idea gets a fair, honest shake before it is committed to a full PRD and build. If the user is **already convinced** the idea is good (validated by their own research, market knowledge, or experience), they may **skip this skill and go straight to `kedata-prd`** — the `IDEA_BRIEF.md` is NOT a prerequisite for the PRD and is NOT a gate in the delivery pipeline. The only thing mandatory is honesty about which of the two paths is being taken.

## When to Use
* User command: `/kedata-brainstorm`
* Autonomous trigger: When the user shares a **raw or early-stage idea** and wants to discuss, explore, or validate it before writing requirements — "I have an idea…", "let's brainstorm", "is this worth building?", "would anyone pay for this?", "help me think through this idea". Run BEFORE `kedata-prd` when the idea is still unshaped.
* **Do NOT use** when a PRD/approved requirements already exist (the idea has already been committed) — that is `kedata-prd` territory.
* **Do NOT use** for incremental features inside an already-defined product — go straight to `kedata-prd`.

## Prerequisites & Context Gathering
Before the interview starts, the agent MUST:
1. **Assume pre-PRD.** There is no mandated upstream artifact. The repo may contain nothing at all. Do NOT expect a PRD, design brief, or contracts — do NOT block on them.
2. **Locate existing artifacts (hints only):**
   * Existing idea brief: check `docs/IDEA_BRIEF.md` first, then root `IDEA_BRIEF.md`. If one exists, **update that same file in place** (bump the version) — do not rewrite from scratch and do not move it.
   * Existing PRD: `docs/PRD.md` then root `PRD.md`. If a PRD already exists, the idea is likely already committed — confirm with the user whether they want to revisit the idea (rare) or proceed to `kedata-prd`. Do not re-litigate a settled product without explicit intent.
   * Any market research, competitor notes, interview transcripts, or user feedback the user already has — ask for them; evidence beats opinion.
3. **Frame the session (2 minutes max):**
   * "I'll grill this idea with you domain by domain — problem, who it's for and how big, what already exists, why you win, how it makes money, whether you can actually build and sell it, and what would kill it. It's a business conversation, not a feature list. At the end you'll get an honest verdict: proceed, pivot, park, or kill."
   * Agree on session budget: full grill (40-60 min) vs focused grill (15-20 min, e.g. gut-check one dimension).
   * State the optionality plainly: *"If you already believe this is solid, we can skip straight to the PRD — but if we brainstorm, I'll push hard on the weak parts."*

## Interview Protocol (How to Grill)

**Rules of the interview — apply to every domain:**
1. **One domain at a time.** Ask 3-5 starter questions, wait for answers, then follow up. Never dump the whole questionnaire at once.
2. **Separate knowledge from belief.** For every claim, ask *"Do you know this, or believe it? What's the evidence?"* Mark each claim in the brief as **Evidence** (data, experience, research) or **Assumption** (unproven). This distinction is the core value of the skill — most ideas fail on assumptions taken as facts.
3. **Follow up until you hit bedrock.** A "bedrock" answer is specific, quantified, and decision-ready. "It's a big market" is not bedrock; *"~2.4M Indonesian SMEs sell online, ~15% use a paid tool today"* is. Grill until the number or the honest "I don't know" appears.
4. **Use the 5 Whys to find the real problem.** Keep asking *"why does that matter to the user?"* until you reach a pain worth paying to remove — or discover there isn't one.
5. **Force the competitive question.** No idea exists in a vacuum: what do users do today (including "nothing" / spreadsheets / WhatsApp)? Why will they switch?
6. **Quantify the economics, even roughly.** Price, cost to serve, CAC, payback, volume needed. Order-of-magnitude beats hand-waving; precise-but-fake is worse than honest ranges.
7. **Surface the non-obvious.** Ask about distribution (how the first 100 users arrive), regulation, dependencies, and the single riskiest assumption — the things founders skip.
8. **Record as you go.** After each domain, write the agreed answers into the draft brief section immediately — never wait until the end.
9. **Stay honest, not harsh.** The goal is a better idea, not a dunked-on user. When a dimension is weak, say so plainly and explore the pivot; don't manufacture problems either.
10. **Don't over-grill.** Stop a domain when answers repeat, the user says "I don't know — let's mark it" (→ Open Question in §13), or there's enough to judge. The user's time is the scarcest resource.
11. **End with the readback.** "I've captured the problem as X, market as Y, your wedge as Z, and the riskiest assumption as R. Correct me if wrong." Then deliver the verdict.

## Execution Workflow

### Step 1: Domain 1 — The Idea & the Job-to-be-Done
**Goal:** strip the idea to the problem it actually solves, before any solution pride sets in.

Starter questions:
- Describe the idea in one sentence a stranger would understand.
- What problem does this solve, and for whom — stated as a **job the user is trying to get done**, not a feature.
- What triggered this idea now? (a pain you lived, a gap you saw, a change in the world)
- Why hasn't this been solved already — or has it, badly?

Grill follow-ups:
- "Why is that a real problem?" (repeat until root cause)
- "What does the user do today instead — including nothing? What does the status quo cost them?"
- "Is this a painkiller or a vitamin? Would they pay, or only 'want' it?"
- "Why now — what changed (tech, regulation, behavior) that makes this possible today and not 5 years ago?"
- "If you removed the solution from the sentence, is the problem still compelling?"

**Bedrock signal:** you can write the Problem & JTBD section as a concrete job, a named sufferer, and the status-quo cost — with the "why now" stated.

### Step 2: Domain 2 — Target User & Market
**Goal:** know exactly who the sharpest first customer is, and how big the prize can plausibly grow.

Starter questions:
- Who is the **single best first customer** — the most desperate, reachable segment? (not "everyone")
- How would you find 10 of them this week?
- Roughly how many such users/companies exist (TAM), how many you can realistically reach (SAM), how many you can win early (SOM)?
- What do you know about how they buy — budget, decision-maker, triggers?

Grill follow-ups:
- "Is that a market you can name, or a demographic you're hoping exists?"
- "What's your evidence for the size — a source, or a guess?" (mark Evidence vs Assumption)
- "Who is the **early adopter** — the person with the problem so acute they'll tolerate a rough v1?"
- "Willingness to pay: is this a budget line that already exists, or a new spend you must create?"
- "Which segment are you explicitly NOT serving at first, and why?"
- "Is the market growing, flat, or shrinking — does timing help or hurt?"

**Bedrock signal:** the Target User & Market section names a specific beachhead segment, an order-of-magnitude market size with a source or an explicit "est.", and a willingness-to-pay hypothesis.

### Step 3: Domain 3 — Existing Alternatives & Competition
**Goal:** map reality — what the user does today and who else wants the same wallet.

Starter questions:
- What do target users use today to solve this? (direct competitors, indirect tools, manual workarounds, doing nothing)
- Who are the 3-5 closest alternatives, and what do they cost / do well / do badly?
- Why would someone switch from their current solution to yours?
- What makes you hard to copy once you're working?

Grill follow-ups:
- "What's the 'do nothing' option — and why is it not good enough?"
- "If a big incumbent copied you tomorrow, what's your defense?"
- "What do you do **10x better** for a specific user — not 10% better?"
- "Are there switching costs, network effects, data moats, or brand that compound?"
- "Where is the market saturated vs underserved — are you entering a crowded lane?"
- **Edge cases:** "What if a competitor drops their price to zero? What if a platform (Apple/Google/Meta/Shopee) absorbs this feature?"

**Bedrock signal:** the Competitive Landscape section lists real alternatives (including "nothing"), the switching reason, and a stated moat or honest "no moat yet."

### Step 4: Domain 4 — Value Proposition & Differentiation
**Goal:** a positioning sharp enough that a stranger repeats it correctly.

Starter questions:
- Complete this: *"For [target user] who [struggles with X], we provide [Y] that [delivers Z benefit], unlike [alternative] which [fails at W]."*
- What is the ONE benefit the user feels first? (the wedge)
- What are you deliberately NOT (to keep the promise tight)?
- What proof would convince a skeptic — a demo, a metric, a testimonial, a guarantee?

Grill follow-ups:
- "Say the value prop in the user's own words, not yours."
- "Is the promised benefit measurable to the user — faster, cheaper, more certain by how much?"
- "What's the smallest version that still delivers the core benefit? (that's the wedge for GTM)"
- "Which of these claims is marketing vs something you can prove on day one?"

**Bedrock signal:** the Value Proposition section holds one positioning statement, one named wedge benefit, and at least one concrete proof point.

### Step 5: Domain 5 — Business Model & Unit Economics
**Goal:** how the idea makes money, and whether the numbers can ever work.

Starter questions:
- How does it make money — subscription, transaction fee, license, usage, ads, services, marketplace take-rate?
- What's the price point, and what does the customer compare it against?
- What does it cost to serve one customer (COGS) — hosting, data, support, humans in the loop?
- Roughly what do you spend to acquire one customer (CAC), and how long until you earn it back?

Grill follow-ups:
- "Who pays — the user, the buyer, or a third party? (they may differ)"
- "Does gross margin improve with scale, or get worse?"
- "What's a rough LTV:CAC, or at least the direction — healthy, thin, or unknown?"
- "Is there a fixed cost you can't escape (compliance, capital, hardware, content)?"
- "What's the minimum volume to break even? Is that reachable in your market?"
- **Edge cases:** "What if only 1% convert to paid — does the model still survive? What if churn is 10%/month?"

**Bedrock signal:** the Business Model section names the revenue mechanism, a price, a rough cost-to-serve and CAC direction, and whether the unit economics are plausible, thin, or unknown.

### Step 6: Domain 6 — Feasibility Assessment
**Goal:** can this actually be built, operated, and legally sold by this team — ever, and soon?

Starter questions:
- What's the hardest part to build, and do you know how to build it (or who does)?
- What must be true technically for this to work — an API that exists, data you can access, a model that performs?
- What operational load does this add — support, moderation, delivery, fulfilment, uptime?
- What regulations or legal constraints apply (data privacy/PDP, licensing, payments, health/finance, content)?
- Who's on the team, and what capability is missing?

Grill follow-ups:
- "What's the biggest technical unknown — has it been de-risked, or is it hope?"
- "Does any third party (a platform, a data provider, a partner) control your ability to operate?"
- "What's the minimum viable version — can you build it in weeks, not quarters?"
- "What breaks at 10x users, 10x data, or 10x load?"
- "Are there legal/regulatory gates that must clear before launch, and how long do those take?"
- **Edge cases:** "What if the key API changes pricing, rate-limits, or shuts down? What if the data source is legally off-limits?"

**Bedrock signal:** the Feasibility section names the hardest technical piece and its state (known/unknown), the operational and regulatory constraints, and the team gap — with a realistic minimal build scope.

### Step 7: Domain 7 — Go-to-Market & Distribution
**Goal:** the path to the first real users — because a great product nobody finds is a failed idea.

Starter questions:
- Where do these users already gather? (communities, marketplaces, offline, search, social, partners)
- What's the first channel you'd test, and how much does it cost?
- How do the **first 100 users** arrive concretely?
- What's the wedge that gets the first users in — a free tool, a content play, a partnership, a manual concierge?

Grill follow-ups:
- "Is there a channel where you can reach this segment cheaply, or is every channel expensive?"
- "Does the product have a built-in loop (referral, sharing, network effect) or must you pay for every user forever?"
- "What's the sales motion — self-serve, sales-led, community-led, marketplace?"
- "What's the one metric you'd watch weekly to know GTM is working?"
- "What existing audience, partnership, or unfair advantage do you bring here?"

**Bedrock signal:** the Go-to-Market section names a concrete first channel with a cost, a first-100-users plan, and whether growth is paid, looped, or earned.

### Step 8: Domain 8 — Riskiest Assumptions, Risks & Kill Criteria
**Goal:** make the make-or-break assumptions explicit and testable — and decide in advance what would kill the idea.

Starter questions:
- What ONE assumption, if false, kills the whole idea? (the riskiest assumption)
- How would you test that assumption cheaply, before building much?
- What could go wrong — market, execution, competition, regulation, money, timing?
- What would make you walk away from this idea?

Grill follow-ups:
- "For each top risk: how likely, how damaging, and what's the cheap test or mitigation?"
- "What's the smallest experiment that could invalidate the idea — and would you actually run it?"
- "What's your kill criterion — a date, a metric, or a threshold that means 'stop'?"
- "What are you emotionally attached to here that the evidence doesn't support?"
- "What would you need to learn in 30 days to justify a PRD?"

**Bedrock signal:** the Riskiest Assumptions section lists the one killer assumption plus a cheap test, the top risks with mitigations, and an explicit kill criterion.

### Step 9: Domain 9 — Verdict & Next Step
**Goal:** an honest verdict, not a participation trophy.

Assess the evidence gathered and give one of:
- **Proceed** — problem, market, wedge, and feasibility hold; the riskiest assumption is testable and worth testing (or already validated). Recommend the immediate next step.
- **Pivot** — the core is promising but a load-bearing element (segment, wedge, model, channel) is wrong; propose the specific pivot and re-run the affected domains.
- **Park** — interesting but premature: timing, capability, or evidence is missing. Note what would need to change.
- **Kill** — the problem isn't real, nobody pays, or it can't be built/sold feasibly. Say so plainly with the reason.

Then:
- If **Proceed** (or Pivot-then-proceed) → hand off: *"Idea validated. Next, run `/kedata-prd` to turn this into requirements."* Point the PRD to `docs/IDEA_BRIEF.md` as context.
- If the user is **already convinced** regardless of the verdict → respect it and route to `/kedata-prd`, but record the open risks in the brief so the PRD carries them forward.
- Never proceed to a build recommendation from this skill — the only downstream skill is `kedata-prd`.

**Bedrock signal:** a written verdict with its reasoning, and a single clear next action.

### Step 10: Draft & Self-Check
* Fill every section of the template below from the interview — no empty placeholders; "N/A" with a one-line reason where a section doesn't apply.
* Save to **`docs/IDEA_BRIEF.md`** (default). EXCEPTION — if the team already uses root `IDEA_BRIEF.md`, update that file in place; never create a second copy.
* Set §13 Document Info: status `Draft`, version `0.1`, owner.
* Run the self-check — ALL must pass before presenting:
  - [ ] All 13 sections filled (or explicitly "N/A" with reason)
  - [ ] Every market/economic claim is tagged **Evidence** or **Assumption** (§13 register)
  - [ ] The target segment is specific (a beachhead), not "everyone"
  - [ ] Competition includes the "do nothing" alternative and states a switching reason
  - [ ] Value proposition is one sentence and names one wedge benefit
  - [ ] Business model states revenue mechanism + a price + a cost/CAC direction
  - [ ] Feasibility names the hardest technical piece and its state (known/unknown)
  - [ ] Go-to-market names a first channel and a first-100-users plan
  - [ ] The single riskiest assumption has a cheap test
  - [ ] A kill criterion is stated
  - [ ] The verdict is explicit (Proceed / Pivot / Park / Kill) with reasoning
  - [ ] Next step is stated (default: `kedata-prd`)

### Step 11: Review & Sign-Off
* Present the brief with a tight summary: the strongest part of the idea, the weakest part, the single riskiest assumption, and the verdict.
* **The verdict IS the deliverable** — do not soften a Kill or Pad a Park. If the user disagrees, record both views in §13 and respect their call.
* On agreement, update §13: status `Approved`, version `1.0`, approver + date.
* Hand off: *"Idea brief approved. Next: `/kedata-prd` — bring `docs/IDEA_BRIEF.md` as context. (Or, if you were already convinced, skip the brief entirely and go straight to `/kedata-prd`.)"*

## Downstream Consumers (why the idea brief helps)
| Brief Section | Feeds | Consumed By |
|---------------|-------|-------------|
| §2 Problem & JTBD | PRD §2 Problem Statement, §1 Overview | `kedata-prd` |
| §3 Target User & Market | PRD §4 Personas, §1 success metric | `kedata-prd` |
| §4 Competitive Landscape | PRD §3 Non-Goals, §8 differentiation | `kedata-prd` |
| §5 Value Proposition | PRD §1 Overview, §8 features framing | `kedata-prd` |
| §6 Business Model | PRD §7 tech stack (cost/serve), §11 NFRs (scale) | `kedata-prd` |
| §7 Feasibility | PRD §7 tech stack, §15 risks | `kedata-prd`; implementation planning |
| §8 Go-to-Market | PRD §13 milestones, success metric | `kedata-prd` |
| §9 Riskiest Assumptions & Tests | PRD §15 risks, §16 open questions | `kedata-prd`; decision to proceed |
| §11 Verdict | Go/no-go to write a PRD at all | The user; the team |
| §13 Decisions Record | Prevents re-litigating settled choices | All downstream work |

**Note:** the IDEA_BRIEF is **optional input**, not a required artifact. It is NOT part of `kedata-ask`'s mandatory pipeline gates — a PRD may be written with or without one.

## Constraints & Guardrails
* **DO NOT** treat this stage as mandatory — a convinced user may go straight to `kedata-prd`; the `IDEA_BRIEF.md` is not a gate.
* **DO NOT** cheerlead. If the problem isn't real, nobody pays, or it can't be built/sold, say so with the reason (Kill is a valid, valuable outcome).
* **DO NOT** accept market or financial claims as facts — mark every one **Evidence** or **Assumption**, and demand the source or the honest "I don't know".
* **DO NOT** write requirements, user stories, API contracts, or code — those are `kedata-prd` and downstream. This is the business/idea layer only.
* **DO NOT** invent market sizes, competitor facts, or pricing — confirm with the user, cite their source, or label the estimate.
* **DO NOT** dump the full questionnaire at once — one domain, 3-5 questions, follow up, move on.
* **DO NOT** skip the riskiest-assumption and kill-criteria questions — they are the point of validating before building.
* **DO NOT** let the idea skip this check silently *and* skip it loudly — always state which path (brainstorm-then-PRD, or PRD-direct) is being taken.
* **DO NOT** rewrite an existing idea brief from scratch — update in place and bump the version.
* **DO NOT** renumber the 13 sections — the numbering is a stable contract downstream references depend on.

## Example Output Structure
A complete idea brief reaches this specificity: a named beachhead segment, order-of-magnitude market numbers tagged as evidence or assumption, real competitors including "do nothing", a one-sentence positioning, a revenue mechanism with a price and a cost direction, a feasibility verdict on the hardest technical piece, a first-channel GTM plan, one killer assumption with a cheap test, a kill criterion, and an explicit verdict. The skeleton below is the **shape** — replace every `[bracket]` and placeholder description with the concrete, confirmed answers. No `[bracket]` may survive in the delivered brief:

# Idea Brief: [Working Name]

**Status:** Draft · **Version:** 0.1 · **Owner:** [Name] · **Date:** [date]

## 1. Idea Snapshot
| Item | Detail |
|------|--------|
| **One-liner** | [idea in one sentence] |
| **Job-to-be-done** | [the job the user is hiring this for] |
| **Target user** | [beachhead segment] |
| **Category** | [existing category or new] |
| **Stage** | [raw / validated / de-risked] |
| **Why now** | [the change that makes this possible today] |

## 2. Problem & Job-to-be-Done
The problem, who suffers it, the status-quo cost, and the root cause (evidence vs assumption tagged).

## 3. Target User & Market
| Segment | Description | Size (TAM/SAM/SOM, with source or "est.") | Willingness to pay |
|---------|-------------|-------------------------------------------|--------------------|
Beachhead = [the one segment first]. Explicitly NOT serving: [segments].

## 4. Existing Alternatives & Competition
| Alternative | Type (direct/indirect/do-nothing) | What it does well | Where it fails | Why users switch to us |
|-------------|-----------------------------------|-------------------|----------------|------------------------|
**Moat / defensibility:** [network effect / data / switching cost / brand / none yet].

## 5. Value Proposition & Differentiation
Positioning: *"For [user] who [struggle], we provide [Y] that [benefit], unlike [alternative] which [fails]."*
**Wedge benefit:** [the one benefit felt first]. **Proof point:** [demo/metric/testimonial/guarantee]. **We are NOT:** [deliberate non-claims].

## 6. Business Model & Unit Economics
| Item | Detail |
|------|--------|
| **Revenue mechanism** | [subscription / take-rate / license / usage / …] |
| **Price** | [amount + comparison anchor] |
| **Cost to serve** | [rough COGS per customer] |
| **CAC direction** | [rough + payback] |
| **Break-even volume** | [minimum viable scale] |
Unit sanity: [plausible / thin / unknown]. Evidence vs assumption: [tag].

## 7. Feasibility Assessment
| Dimension | Finding | State |
|-----------|---------|-------|
| Hardest technical piece | [what it is] | known / unknown / de-risked |
| Data/API dependencies | [third parties that gate us] | … |
| Operational load | [support/moderation/fulfilment] | … |
| Regulatory/legal | [PDP, licensing, payments, …] | … |
| Team capability gap | [missing skill or person] | … |
**Minimal viable build scope:** [what v1 could be, and rough effort].

## 8. Go-to-Market & Distribution
| Item | Detail |
|------|--------|
| **First channel** | [where + rough cost] |
| **First 100 users** | [concrete plan] |
| **Sales motion** | [self-serve / sales-led / community / marketplace] |
| **Growth loop** | [referral / sharing / network effect / none — paid only] |
| **Weekly metric** | [the signal GTM works] |

## 9. Riskiest Assumptions & Validation Plan
| # | Assumption (if false, idea dies?) | Type | Cheap test | Status |
|---|-----------------------------------|------|------------|--------|
**Kill criterion:** [date / metric / threshold that means stop].

## 10. Risks & Mitigations
| Risk | Category | Impact | Likelihood | Mitigation / early signal |

## 11. Verdict
**Verdict: Proceed / Pivot / Park / Kill.**
Reasoning: [2-4 sentences citing the evidence and the killer assumption].
If Pivot: [the specific pivot and which domains to re-run].
**Next step:** run `/kedata-prd` with this brief as context. (Optional — skip if already convinced.)

## 12. Sources & Evidence
Links to market research, competitor notes, user conversations, or prior validation the user supplied. Mark which sections they support.

## 13. Document Info & Sign-off
| Field | Value |
|-------|-------|
| Status | Draft / Approved |
| Version | 0.1 → 1.0 |
| Author / Owner | [Name] |
| Approver + date | [Name, date] |
| Decisions Record | A1 [assumption]… / Q1 [open question]… |
| File location | `docs/IDEA_BRIEF.md` (or root `IDEA_BRIEF.md` if that's the existing convention) |
