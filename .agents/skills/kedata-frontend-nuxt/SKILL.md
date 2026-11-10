---
name: kedata-frontend-nuxt
description: "Use this skill when writing, converting, or reviewing Kedata frontend code in Vue 3 + Nuxt 3. Reads the stack, screens, and API decisions from the approved artifacts (implementation plan + PRD + design brief + contracts), then enforces Nuxt-specific standards: file-based pages/, Pinia, vee-validate + zod, fetch composables, Vitest, and design preservation from the brief. Pairs with the vendored kedata-design-frontend visual-craft layer for anti-slop UI."
version: 1.3.0
author: Kedata Indonesia
---

# Skill: Kedata Frontend Engineering — Vue 3 + Nuxt 3

## Purpose
Enforce Kedata's frontend engineering standards for the **Vue 3 + Nuxt 3** stack: file-based routing (`pages/`), server state (`@tanstack/vue-query` or `useFetch`/`$fetch`), client state (Pinia), forms (vee-validate + zod), typed API composables, and design fidelity to the approved DESIGN_BRIEF.md. The stack and scope are **read from the approved artifacts** — this skill never decides them.

## When to Use
* User command: `/kedata-frontend-nuxt`
* Autonomous trigger: When writing, converting, or reviewing Vue/Nuxt frontend code in a Kedata repo; when porting an `Rnd FE/` prototype or a React app to Nuxt; when building UI from the design brief + mockups. Load when Nuxt is the stack in play (per plan §4) — not at session start.

## Prerequisites & Context Gathering
Before writing code, the agent MUST read the approved artifacts IN ORDER:
1. **`IMPLEMENTATION_PLAN.md`** — §1 architecture (monolith vs split — where does the FE app live?), §4 stack (confirm Nuxt), §6 API endpoints, §8 env vars, §10 DoD. **If missing, STOP.**
2. **`DESIGN_BRIEF.md`** — visual identity, tokens (§3), screens (§5), components (§6), states (§8), layouts (§9), dark mode (§10) — the visual contract. **Preserve it exactly.**
3. **Contracts:** `API_CONTRACTS.md` (request/response shapes), `ENVIRONMENT_VARIABLES.md` (FE vars like `NUXT_PUBLIC_API_BASE_URL`).
4. **`PRD.md`** — §7 tech stack, §18 edge cases — context.
5. **`TEST_PLAN.md`** — §3 traceability + §4 cases (including loading/error/empty state coverage per brief §8); §5 fixtures. Write the tests the plan specifies.
6. **Existing repo docs (optional hints only):** `COMPONENT_SPECS.md`, `STATE_MANAGEMENT.md`, `API_INTEGRATION.md` — reuse, never a requirement.
7. **Mockups** (external designer output) — the visual target.

**Stack discipline — READ, never decide:** confirm Nuxt from plan §4 / PRD §7. If missing, STOP and escalate.

Ask the user for clarification IF: a design reference conflicts with a new requirement; an API contract is missing for the endpoint being consumed; the task touches an area the plan doesn't cover (→ escalate, don't improvise).

## Companion Skill — kedata-design-frontend (visual-craft layer)
This skill enforces *engineering* standards; **`kedata-design-frontend`**
(vendored in this collection under `skills/design/`, adapted from
[tasteskill.dev](https://www.tasteskill.dev/)) enforces *visual* craft — the anti-slop rules
(typography, spacing, color, motion, banned patterns) that stop the UI from looking generated.
Load it before building or restyling any public-facing page or app screen; it complements
this skill, it does not replace the brief or the contracts.

* **Already installed** with this collection — no separate install. It needs Node 22+ and an
  installed Chrome/Edge/Chromium for its `inspect.mjs` gate.
* **Load when:**
  * Landing / marketing / product page → its "page" run.
  * Dashboard, admin, analytics, settings, inbox → read its `references/app-screens.md`
    (app screens have their own run and house rules).
  * Redesigning an existing page → its "Redesign, restyle or review" special case.
* **Gate (required for public pages):** from the project root, run
  `node <kedata-design-frontend>/scripts/lint.mjs <src>` and
  `node <kedata-design-frontend>/scripts/inspect.mjs <url|.output/public/index.html>` (1440 / 768 / 390px,
  writes to `.taste-skill/`). Fix every `FAIL` before finishing; treat each `WARN` as wrong
  unless defensible in one sentence.
* **Boundary & precedence:** `DESIGN_BRIEF.md` is the visual contract — the design skill must not
  invent a new look. Hand it the brief's values (`--keep palette,type`) so it adopts the
  Kedata brand tokens. If the brief mandates a device it bans (e.g. a logo on a
  gradient), keep the brief and note the override in the PR.

## Execution Workflow

### Step 1: Project Structure
Follow the house Nuxt layout:
```
project-root/
├── assets/                   # global styles, images
├── components/
│   ├── ui/                   # shadcn-vue or custom primitives
│   ├── portal/               # authenticated app components
│   ├── landing/              # public/marketing components
│   ├── forms/                # form-specific components
│   └── shared/               # cross-cutting reusable components
├── composables/
│   ├── api/                  # useFetch / TanStack Query composables
│   └── use-*.ts              # generic composables
├── layouts/                  # Nuxt layouts
├── lib/
│   ├── api.ts                # $fetch wrapper
│   └── schemas/              # zod schemas
├── middleware/               # route middleware (auth, admin)
├── pages/                    # Nuxt file-based routes
├── plugins/                  # toast, query client
├── services/                 # typed API service modules
├── stores/                   # Pinia stores
├── types/
└── nuxt.config.ts
```

### Step 2: Architecture Rules
* **Server state:** `@tanstack/vue-query` or `useFetch`/`$fetch` — never `localStorage`/global mutable state for business data.
* **Client state in Pinia** — auth tokens, UI toggles, sidebar, notifications.
* **One service module per API resource** in `services/` — typed, reads `API_CONTRACTS.md`.
* **One query/mutation composable per API pattern** in `composables/api/`.
* **File-based routing only** (`pages/`) — no manual route configs.

### Step 3: Design Fidelity (from the brief)
* Preserve the design brief's visual identity: tokens, screens, components, states — do not invent a new look.
* Mobile-first, responsive (375px+); dark theme per brief §10.
* Indonesian copy for Indonesian products (brief §3.6 voice & tone).
* Feature-flag beyond-MVP scope per plan (e.g., `NUXT_PUBLIC_ENABLE_*` flags).
* Anti-slop craft: for public pages load `kedata-design-frontend` and run its `lint.mjs`/`inspect.mjs` gate (see Companion Skill) — preserve the brief's tokens via `--keep palette,type`.

### Step 4: Auth Rules
* Access token in Pinia + `localStorage` (or `useCookie`); refresh token via backend httpOnly cookie.
* `$fetch` interceptor refreshes on 401, redirects to `/portal/login` on failure.
* Route guards via `middleware/auth.ts` / `middleware/admin.ts`.

### Step 5: Code Quality
* `<script setup lang="ts">`; `defineProps<T>()` + `defineEmits<T>()`; strict mode; no `any`.
* Handle loading, error, and empty states for every server-driven UI (brief §8).
* Never mutate query cache directly except optimistic updates.
* Components <250 lines; add `aria-label`, visible focus rings, keyboard support.

### Step 6: Forms & API Integration
* `vee-validate` + zod resolver; schemas in `lib/schemas/`; inline validation errors; disable submit while submitting; toast feedback.
* Base URL from `useRuntimeConfig().public.apiBaseUrl`.
* Typed service modules only — no raw `$fetch` in components. Reads via `useFetch`/`useQuery`; writes via `$fetch`/`useMutation`; invalidate related queries after mutations; parse API errors to UX.

### Step 7: Testing
* Write the tests `TEST_PLAN.md` specifies for this task (§4 cases incl. loading/error/empty, §5 fixtures).
* Vitest + Vue Test Utils; integration with MSW; Playwright E2E for critical flows.
* Run before finishing: `npm run lint`, `npx nuxi typecheck`, `npm run test`.

### Step 8: Self-Check & Definition of Done
**Self-check — ALL must pass before presenting:**
- [ ] Stack read from plan §4 / PRD §7 (no assumed default)
- [ ] Every screen built matches brief §5 + mockups
- [ ] Every API call uses a typed service matching API_CONTRACTS.md
- [ ] Loading/error/empty states on every server-driven UI (brief §8)
- [ ] No `any` types; strict mode; nuxi typecheck clean
- [ ] Design tokens from brief §3 used (not invented)
- [ ] Dark theme (brief §10) honored
- [ ] Tests added per TEST_PLAN.md (unit/integration/E2E per critical flow)
- [ ] `npm run lint` + `npm run test` + `npm run build` pass
- [ ] Gate run (required for public pages): `lint.mjs` + `inspect.mjs` show 0 FAIL at 1440/768/390 for public pages (or the omission is stated)

**Definition of Done:** feature per implementation plan task; screens match brief + mockups; loading/error/empty states handled; tests added; lint + type checks + build pass; responsive + dark theme verified.

## Third-Party Scripts (GA4/gtag, pixel, dsb.)
* **gtag shim harus push `arguments`, bukan spread array.** `(...args) => dataLayer.push(args)` memasukkan entry sebagai array polos dan gtag.js **mengabaikannya diam-diam** — `config` tidak pernah terdaftar, nol hit, GA melaporkan "not installed" walau script termuat (kejadian nyata di pdfeditor, PR #104). Selalu pola snippet resmi: `function gtag(){ dataLayer.push(arguments) }`, atau pakai modul `nuxt-gtag` (pola docflow-landing: `initMode: 'manual'` + consent gate).
* **Verifikasi tag analytics di browser visible**, bukan headless — headless menekan hit GA (`navigator.webdriver=true`). Bukti minimal: `gtag('get', id, 'client_id')` mengembalikan nilai + request `g/collect` dijawab 204.

## Constraints & Guardrails
* **DO NOT** decide or improvise the stack — read it from plan §4 / PRD §7; if missing, STOP and escalate.
* **DO NOT** use `localStorage`/global mutable state for business/server data — query library or `useFetch`.
* **DO NOT** call `$fetch` directly inside components — typed service modules only.
* **DO NOT** store refresh tokens in `localStorage`.
* **DO NOT** use `any` types; do not create manual route configs.
* **DO NOT** alter the design brief's visual identity unless explicitly asked.
* **DO NOT** let the design skill override the approved brief or contracts — it supplies visual craft only; the brief wins on any conflict.
* **DO NOT** log secrets or tokens; sanitize user-generated HTML; validate input on both client (zod) and server.
* Keep components small and focused; ask before assuming; propose options; flag risks.

## Example Output Structure
Typed service:
```ts
// services/registration.service.ts
export const registrationService = {
  list: (params: ListParams) =>
    $fetch<Page<Registration>>("/api/v1/registrations", { params }),
  submit: (body: SubmitRegistration) =>
    $fetch<Registration>("/api/v1/registrations", { method: "POST", body }),
}
```
Composable:
```ts
// composables/api/useRegistrations.ts
export const useRegistrations = (params: Ref<ListParams>) =>
  useFetch<Page<Registration>>("/api/v1/registrations", { query: params })
```
Component with states:
```vue
<script setup lang="ts">
const { data, pending, error } = await useRegistrations(params)
</script>
<template>
  <SkeletonList v-if="pending" />
  <ErrorState v-else-if="error" :message="error.message" />
  <EmptyState v-else-if="!data?.items.length" cta="Mulai Baca" />
  <div v-else class="grid gap-4 md:grid-cols-3">
    <BookCard v-for="item in data.items" :key="item.id" :book="item" />
  </div>
</template>
```
