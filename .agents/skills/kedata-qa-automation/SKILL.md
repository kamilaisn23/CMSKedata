---
name: kedata-qa-automation
description: "Use this skill to run QA against a URL with Playwright. It opens a real browser against the URL the user gives, or against the local environment when one is running, and executes the cases from TEST_PLAN.md. If no test plan exists, it stops and asks the user to run kedata-test-plan first. Trigger when the user says \"test this URL\", \"run the E2E\", \"open the browser and check\", \"automate QA\", or \"dogfood this\"."
version: 1.1.0
author: Kedata Indonesia
---

# Skill: Kedata QA Automation

## Purpose
Run the approved test cases against a live environment, in a real browser, with Playwright. `kedata-test-plan` decides *what* must be true; this skill opens the browser and checks it.

Two ways in, and only these two:

1. **A URL the user provides** — staging, preview, production, or any deployed environment. Run against that.
2. **No URL given** — look for a running local environment and use that. If nothing is running, say so and ask for a URL. Never guess a port.

The differentiator is **data that matches the contract**. A case fails because the product is wrong, not because the fixture invented a field the catalog does not have. Every value typed into a form or sent as setup comes from `DATA_CATALOG.md` and `API_CONTRACTS.md`.

## When to Use
* User command: `/kedata-qa-automation`
* Autonomous trigger: When the user says "test this URL", "run the E2E", "open the browser and check", "automate QA", "dogfood this", or "check the flow works".
* **Do NOT use** to decide what to test. That is `kedata-test-plan`. If there is no test plan, this skill stops and asks the user to run it.
* **Do NOT use** to review a diff. A run here produces evidence that `kedata-review` can cite.

## Prerequisites & Context Gathering
Before opening a browser, the agent MUST:
1. **Read `TEST_PLAN.md`.** Check `docs/` first, then root. Extract the cases: ID, preconditions, steps, input, expected result. **If it is missing, or it has no cases for the flow the user wants checked, STOP.** Do not invent cases. Ask the user to run `/kedata-test-plan` first, and say which flow has no coverage. Resume only when cases exist.
2. **Resolve the target.** A URL from the user wins. Otherwise check for a running local environment: the dev script in `package.json`, a `Dockerfile` or `compose.yml`, and `ENVIRONMENT_VARIABLES.md` for the port. Probe that port before assuming it is up. Nothing running and no URL given: ask for one.
3. **Read the contracts before typing any data.** `API_CONTRACTS.md` for shapes and status codes, `DATA_CATALOG.md` for fields, types, and limits. A value that contradicts either is a bug in the test, not a finding about the product.
4. **Read `DESIGN_BRIEF.md` §5 and §8 for UI flows.** Screen paths and the empty, error, and loading states are what the assertions check.
5. **Check Playwright.** `npx playwright --version`. If it is not installed, install it into the project and install its browser (`npx playwright install chromium`). Playwright owns the browser; do not reach for a separately installed browser app.

## Interview Protocol (How to Grill)
1. **Confirm the target first.** Repeat back the URL, or the local address you found, and wait. Running against the wrong environment wastes the run.
2. **Confirm which cases.** Name the `TEST_PLAN.md` case IDs this run will execute. No case ID, no run.
3. **Extract the data, don't invent it.** Field values come from the catalog. Ask only where the catalog is silent.
4. **Say where the evidence will land** before the run starts.

## Execution Workflow

### Step 1: Build Contract-Valid Test Data
**Goal:** the inputs the cases type in cannot drift from the catalog.
* For each case, take its input from `DATA_CATALOG.md`: a valid value, the boundary value the case names (min, max, empty, zero), and the invalid value that should produce the contract's documented error status.
* Cross-check against `API_CONTRACTS.md`. The valid input must be a legal request; the invalid input must be one the contract says it rejects, with the status the contract names.
* Seed dependent data first. A case whose precondition is "an order exists" needs that order created through the API before the browser opens, using the same contract-valid data.
* Auth cases log in as the persona from `PRD.md` §4. Credentials come from `ENVIRONMENT_VARIABLES.md` or a `.env.test`, never from the source.
* **No real PII.** Obviously fake values only (`qa-user-001@example.test`).
**Bedrock signal:** every value entered traces to a catalog column, and every expected error traces to a documented status.

### Step 2: Write the Playwright Specs
**Goal:** one spec per case, runnable against either target.
* The target is `baseURL`, taken from the resolved URL. The same spec runs against the provided URL and the local environment; only the config changes.
* Each test title carries its case ID: `test('AC3: member sees only their own orders', ...)`.
* Drive the page the way a user does — roles and labels, not CSS structure — so a restyle does not break the run.
* Assert the **expected result from the case**: the visible outcome, the empty state from `DESIGN_BRIEF.md` §8, the status the contract names. Not whatever the screen happens to show today.
* A case with a failure path gets its failure asserted too. Do not stop at the happy path.
**Bedrock signal:** every case in this run has a spec, and each spec names its case ID.

### Step 3: Open the Browser and Run
**Goal:** the user can see the run happen.
* Run headed, not headless: `npx playwright test --headed --workers=1`. The user asked to see the browser open. Headless is for CI, and only when the user says so.
* One worker, so the windows open in case order and the user can follow along.
* Slow the actions enough to watch (`--slowmo`, or a pause between steps) when the user is watching. Remove it for a CI run.
* Let the run finish. Do not kill the browser on the first failure — Playwright captures that case and moves to the next, so one run covers every case.
* A failure stays a failure. Do not add retries to turn a red case green.
**Bedrock signal:** the browser opened against the resolved target, and every case in the run produced a result.

### Step 4: Capture Evidence
**Goal:** output that `kedata-audit` and `kedata-review` can cite without re-running.
* `playwright.config` sets `outputDir` to `test-results/` and keeps a screenshot and trace **on failure**. The directory is gitignored; CI uploads it as an artifact.
* Write `test-results/qa-report.md`, one row per case: `case ID | target URL | pass/fail | evidence path`. Name the target, so a result against localhost is never mistaken for one against staging.
* Never commit `test-results/`.
**Bedrock signal:** every case has a row, and every failure has a screenshot.

### Step 5: Report
* State the target URL and where it came from (given by the user, or detected locally).
* For each case: pass or fail, the expected result from the plan, and the actual result.
* For each failure, say whether it looks like a product bug or a test bug, and why.
* Name the plan's smoke-suite cases that this run did not cover.
* Hand off: a product bug goes to the tracker; a fixture that contradicts the catalog is fixed here.

## Constraints & Guardrails
* **DO NOT** invent cases. No `TEST_PLAN.md`, or no case for the flow: stop and ask the user to run `/kedata-test-plan`. Do not draft cases yourself to keep moving.
* **DO NOT** invent test data. Values come from `DATA_CATALOG.md` and `API_CONTRACTS.md`. Where they are silent, ask.
* **DO NOT** guess the target. No URL and no running local environment: ask for a URL. Never probe random ports or fall back to production on your own.
* **DO NOT** run headed against production unless the user named that URL. Say the target back before running.
* **DO NOT** let a fixture contradict the contract to make a case pass. If valid data is rejected, the product is wrong.
* **DO NOT** use real PII, production data, or credentials committed to source.
* **DO NOT** drive the user's everyday browser. Playwright launches its own.
* **DO NOT** retry a failing case to turn it green.
* **DO NOT** commit `test-results/` or captured session data.

## Evidence a Consumer Can Trust
| Output | Where | Consumed by |
|--------|-------|-------------|
| Playwright specs | `tests/e2e/` | CI, `kedata-review` |
| Failure screenshots + traces | `test-results/` (gitignored, CI artifact) | `kedata-review`, `kedata-audit` |
| Run summary | `test-results/qa-report.md` | `kedata-review`, `kedata-audit` |
