# Compass — Life Management Hub

A calm, premium web app that pulls work, school, meals, fitness, and family into
one place — built to **reduce cognitive load**, not add another inbox.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — app works with zero config
npm run dev                  # http://localhost:3000
```

Everything works out of the box with no accounts and no API keys: state
persists on-device, and the AI features fall back to deterministic on-device
engines. Add `ANTHROPIC_API_KEY` to `.env.local` to upgrade the Reverse Recipe
Engine and natural-language parsing to Claude.

## The modules

| Route | Module | What it does |
| --- | --- | --- |
| `/` | **Daily Compass** | Morning/evening mood check-in (~20s), natural-language quick add, and a single aggregated timeline of today's meetings, deadlines, family activities, and meals. |
| `/work` | **Work Hub** | Professional projects with document/correspondence tracking refs, task lists, and the meeting schedule. |
| `/school` | **School Hub** | Self-paced CS degree tracker. Courses → units → topics (e.g. the 7-unit Discrete Math course with Graph Theory), plus assignment deadlines. |
| `/meals` | **Nutrition & Grocery** | Vegan, high-volume/low-calorie defaults. Check off pantry ingredients → the Reverse Recipe Engine generates a meal from exactly those items. Grocery lists generate from planned meals + pantry gaps and route to delivery-service webhooks (Whole Foods / Aldi placeholders). |
| `/fitness` | **Fitness Log** | Pre-configured Lagree Pilates, glute training (Russian deadlifts et al.), and active recovery routines. One-tap effort logging. |
| `/family` | **Family & General Store** | Kid-tagged activity calendar and a gamified points economy — chores earn points, the General Store spends them, with a full ledger. |

## Zero-friction UX

- **Natural language everywhere it matters** — "Add a meeting tomorrow at 2 PM
  for policy review" is parsed instantly by a deterministic on-device parser
  (`src/core/nlp/parser.ts`). Ambiguous phrases escalate to `/api/ai/parse`
  (Claude with a strict JSON schema) and land in the right module
  automatically.
- **Seeded, not empty** — day one is pre-configured around real life (courses,
  routines, pantry, chores) so there's no setup tax.
- **Graceful degradation** — every AI path has a local fallback; every fetch
  failure surfaces a human message, never a crash.

## Architecture

```
src/
  core/            ← platform-agnostic domain layer (React Native ready)
    types.ts       ← strict domain types, no DOM/Next imports
    dates.ts       ← date helpers
    nlp/parser.ts  ← deterministic quick-add parser
    ai/localRecipe.ts ← on-device recipe fallback
    data/seed.ts   ← day-one seed data
    store/hub.ts   ← Zustand store (persist) — all state + actions
    selectors.ts   ← timeline aggregation, course progress
  components/      ← web UI (Shell, QuickAdd, primitives)
  app/             ← Next.js App Router pages + API routes
    api/ai/recipe  ← Reverse Recipe Engine (Claude → local fallback)
    api/ai/parse   ← NL parsing escalation (Claude → local fallback)
    api/webhooks/grocery ← delivery-service routing placeholder
supabase/schema.sql ← proposed PostgreSQL backend (RLS per user)
```

### React Native portability (App Store path)

The rule enforced throughout: **`src/core/` imports nothing from the DOM,
Next.js, or Tailwind.** Porting to React Native/Expo means:

1. Reuse `src/core/` verbatim — types, parser, store, selectors, seed data.
2. Swap the Zustand persistence adapter: `localStorage` →
   `AsyncStorage` (one line in `store/hub.ts`).
3. Rebuild the view layer with RN primitives; the design tokens in
   `tailwind.config.ts` (colors, radii, type scale) transfer directly to a
   NativeWind or StyleSheet theme.
4. Point the app at the same API routes (deployed on Vercel) — the AI and
   webhook endpoints are plain HTTP.

### Backend

The app currently persists to device storage (key `life-hub-v1`), which mirrors
the proposed **Supabase/PostgreSQL schema** in `supabase/schema.sql` —
relational tables for users ↔ projects ↔ courses ↔ meals ↔ schedules with
row-level security. Adopting it later is a mapping exercise, not a rewrite:
each store slice corresponds to a table, and a thin sync layer (supabase-js)
replaces the persist middleware.

### Error handling

- TypeScript `strict` + `noUncheckedIndexedAccess` across the codebase.
- Route-level (`error.tsx`) and root-level (`global-error.tsx`) error
  boundaries.
- API routes validate input, type their payloads, and degrade to local engines
  rather than returning 5xx for AI failures.

## Environment variables

See `.env.example`. All optional:

- `ANTHROPIC_API_KEY` — enables Claude for recipes + NL parsing.
- `WHOLE_FOODS_WEBHOOK_URL` / `ALDI_WEBHOOK_URL` — forward grocery orders to a
  delivery automation (until first-party partner APIs exist, point these at a
  Zapier/Make scenario or your own service).
