# Deploying Vela

Vela is a standard Next.js 15 app — it deploys to **Vercel** (recommended) or any
Node host with zero code changes. It runs perfectly with **no environment
variables**; each variable below unlocks an extra integration.

## 1. Deploy to Vercel (fastest)

1. Push this repo to GitHub (already done if you're reading this in the repo).
2. Go to [vercel.com/new](https://vercel.com/new), **Import** the repository.
3. Framework preset auto-detects **Next.js** — keep the defaults
   (Build `next build`, Output `.next`). Click **Deploy**.
4. That's it: you get a URL like `https://vela-xxxx.vercel.app`. Because Vela
   ships a PWA manifest + service worker, you (and your family) can **Add to
   Home Screen** and it installs like a native app.

No env vars are required for this first deploy — the app is fully usable, and
AI features fall back to the on-device engines.

## 2. Turn on the integrations (optional)

Add these in **Vercel → Project → Settings → Environment Variables**, then
redeploy. See [`.env.example`](./.env.example) for the full list.

### AI reading (Smart Capture photo/PDF, smarter parsing, recipes)
| Variable | Where to get it |
| --- | --- |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

Once set, the **Photo / PDF** tab in Smart Capture (Today · School · Work) reads
screenshots and syllabus PDFs with Claude. Without it, text + voice still work.

### Grocery delivery (Whole Foods · Aldi · Instacart)
None of these have public "add to cart" APIs, so Vela forwards the grocery list
to a **webhook you control** — typically a
[Zapier](https://zapier.com) or [Make](https://www.make.com) scenario that
receives the JSON order and does something useful (emails you the list, drops it
in a Google Sheet, calls a partner API, etc.).

- Set `WHOLE_FOODS_WEBHOOK_URL`, `ALDI_WEBHOOK_URL`, `INSTACART_WEBHOOK_URL`, **or**
- Let each user paste their own webhook per device in **Settings → Connections**
  (this overrides the env default).

The order payload is stable and documented in
`src/app/api/webhooks/grocery/route.ts`.

### Email & school sign-in (Gmail · Outlook · school)
This is the one integration that needs more than env vars. Reading an inbox
requires OAuth **and** a place to store each user's tokens — a backend concern.
Vela already ships the **initiation** half:

1. Register an OAuth app with each provider you want:
   - Google: [console.cloud.google.com](https://console.cloud.google.com) → OAuth
     consent screen + credentials (scopes: Gmail readonly, Calendar readonly).
   - Microsoft: [Entra ID app registrations](https://entra.microsoft.com)
     (scopes: `Mail.Read`, `Calendars.Read`, `offline_access`).
   - School: whatever IdP your school uses; set `SCHOOL_OAUTH_AUTH_URL` to its
     authorize endpoint.
2. Set the client IDs/secrets and `OAUTH_REDIRECT_URL`
   (e.g. `https://your-app.vercel.app/api/connect/callback`). Register that same
   URL as the redirect URI with each provider.
3. Then **Settings → Connections → Connect** builds the real consent URL and
   sends the user to sign in (see `src/app/api/connect/[provider]/route.ts`).

**Still to build for a full inbox sync** (a follow-up, not in this repo yet): a
`/api/connect/callback` route that exchanges the code for tokens, a secure token
store (e.g. Supabase — schema already sketched in `supabase/schema.sql`), and a
sync job that turns emails into events via the existing capture pipeline. Until
that's added, the Connect buttons will report the provider "isn't set up yet."

## 3. Custom domain & PWA notes

- Add a custom domain in **Vercel → Domains** for a friendlier install name.
- After each deploy the service worker cache version (`public/sw.js`, `CACHE`)
  should be bumped so returning users get fresh assets — it's currently
  `vela-v37`. Bump it on any release that changes cached routes/assets.
- iOS installs use the `apple-touch-icon`; both are already wired in
  `src/app/layout.tsx` and `src/app/manifest.ts`.

## 4. Local production check

```bash
npm ci
npm run build && npm start   # serves the production build on :3000
npm test                     # unit tests
npx tsc --noEmit             # type check
```
