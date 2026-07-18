# Vela — Life Management Hub

Vela is a calm, premium web app that pulls work, school, meals, fitness, and family into
one place — built to **reduce cognitive load**, not add another inbox.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — app works with zero config
npm run dev                  # http://localhost:3000
npm test                     # unit tests (NLP parser, dates, selectors, recipe engine)
```

Everything works out of the box with no accounts and no API keys: state
persists on-device, and the AI features fall back to deterministic on-device
engines. Add `ANTHROPIC_API_KEY` to `.env.local` to upgrade the Reverse Recipe
Engine and natural-language parsing to Claude.

## Deploy

Vela deploys to **Vercel** with zero config (Next.js 15), and runs with **no
environment variables** — each one just unlocks an extra integration. Import the
repo at [vercel.com/new](https://vercel.com/new) and click Deploy. To turn on AI
photo/PDF reading, grocery webhooks, or email/school sign-in, see
**[DEPLOY.md](./DEPLOY.md)** and **[.env.example](./.env.example)**.

**Installable (PWA):** Vela ships a web manifest, app icons, and an offline
service worker — once deployed over HTTPS it installs to a phone home screen
and launches full-screen like a native app. First launch runs a lightweight
onboarding (your name + theme); everything else is editable from **Settings**
(`/settings`), including a JSON backup export/import and a reset-to-fresh.

## The modules

| Route | Module | What it does |
| --- | --- | --- |
| `/` | **Daily Compass** | Morning/evening mood check-in (~20s), energy-aware daily plan, natural-language quick add, a time-block calendar (day view on an hour grid), a single aggregated timeline of today's meetings, deadlines, family activities, and meals, and a 14-day mood trend chart. |
| `/work` | **Work Hub** | Professional projects with document/correspondence tracking refs, task lists, the meeting schedule, and file attachments per project. |
| `/school` | **School Hub** | Self-paced CS degree tracker. Courses → units → topics (e.g. the 7-unit Discrete Math course with Graph Theory), plus assignment deadlines. Attach syllabi, notes, and PDFs to any course or unit. |
| `/meals` | **Nutrition & Grocery** | Seafood & plant-based (dairy-free), high-volume/low-calorie defaults. A daily **food & calorie tracker** (calories + protein logged against editable targets). Check off pantry ingredients → the Reverse Recipe Engine generates a meal from exactly those items. A 7-day × 3-slot week planner grid, plus grocery lists generated from planned meals + pantry gaps, routed to delivery-service webhooks (Whole Foods / Aldi / Instacart placeholders). |
| `/fitness` | **Fitness & Wellness** | Goal-based training plan and an at-home workout library filtered to the equipment you own (rower, bike, dumbbells, kettlebells, ropes, medicine ball, bands) — tap any workout into your routines. **Weight-loss accountability** (log weight, set a goal, watch the trend) and the interactive **8-Week Glute & Sculpt program** — every day labeled with its workouts and checked off week by week. Streaks, one-tap effort logging, a habit tracker (streak rings), and daily water intake. |
| `/family` | **Family & General Store** | Kid-tagged activity calendar, a per-kid weekly breakfast/lunch/dinner meal planner with calorie totals, and a gamified points economy — chores earn points, the General Store spends them, with a full ledger. |
| `/notes` | **Notes** | Your family brain — the one place for the things you keep meaning to remember: notes, lists, and important files, with pinning and attachments. |

## Zero-friction UX

- **Natural language everywhere it matters** — "Add a meeting tomorrow at 2 PM
  for policy review" is parsed instantly by a deterministic on-device parser
  (`src/core/nlp/parser.ts`). Ambiguous phrases escalate to `/api/ai/parse`
  (Claude with a strict JSON schema) and land in the right module
  automatically.
- **Smart Capture (text · screenshot · PDF · voice → plan)** — paste a school
  email, upload a syllabus PDF or a screenshot of a class schedule, or dictate a
  brain-dump, and Vela extracts every date, deadline, and appointment into a
  reviewable list you confirm in one tap. Available on **Today, School, and
  Work** (`/api/ai/capture` reads images and PDFs with Claude; text and voice
  fall back to an on-device multi-item extractor in `src/core/nlp/extract.ts`).
- **Energy-aware plan** — tell Vela your capacity for the day in one tap and
  the Today "plan" right-sizes itself: fixed commitments (meetings, deadlines,
  appointments) always show, flexible work fills the rest, and anything over
  capacity is reported as "waiting" rather than looming (`todaysPlan` in
  `src/core/selectors.ts`).
- **Weekly Life Balance** — five rings (family, school, work, health, mind)
  scored from real 7-day activity, with a gentle nudge toward whatever's gone
  quiet.
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
- `WHOLE_FOODS_WEBHOOK_URL` / `ALDI_WEBHOOK_URL` / `INSTACART_WEBHOOK_URL` —
  forward grocery orders to a delivery automation (until first-party partner
  APIs exist, point these at a Zapier/Make scenario or your own service).
