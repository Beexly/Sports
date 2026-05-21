# LAUNCH TONIGHT — Galaxy Sports Edge

**Date:** 2026-05-20
**Goal:** site live at a real domain by end of night.
**Mode:** silent launch — Performance/Vault gated, paywall off, marketing surface drives social traffic.

---

## ▶ Status as of last update

✅ Step 1 — Domain registered (galaxysportsedge.com, Cloudflare)
✅ Step 2 — Vercel project created (Beexly/Sports connected, domain configured)
✅ Step 3 — Anthropic API key obtained (rotate tomorrow)
✅ Step 4 — Google Cloud project + OAuth client created (verify URIs are saved)
✅ Step 5 — NextAuth + Cron secrets generated (in `.launch-secrets/secrets.env`)
✅ Step 6 — Odds API key obtained (free tier — upgrade before day 14)
✅ Step 7 — Stripe test keys obtained
⏳ Step 8 — Neon Postgres (signup pending)
⏳ Step 9 — Upstash Redis (signup pending)
⏳ Step 10 — git push (PowerShell — see CODEX_HANDOFF.md Block 1)
⏳ Step 11 — Vercel env-vars paste (use VERCEL_ENV.txt — see Block 3)
⏳ Step 12 — Trigger deploy + smoke test

**Workspace files ready for you:**
- `CODEX_HANDOFF.md` — every command you need to run, in order
- `VERCEL_ENV.txt` — paste-ready env block
- `.launch-secrets/secrets.env` — generated NextAuth + Cron secrets
- `social/launch-day.md` — three rounds of brand-safe posts for all four platforms

---

## What's already done (Claude shipped this)

You don't need to touch any of this. It's in the repo, tests pass, build succeeds.

- **Brand:** Galaxy Sports Edge, "Find the signal before the market moves." — wired in `apps/web/lib/brand.ts`.
- **Design system:** plasma magenta / ion blue / ultraviolet — applied to homepage, nav, footer, all surfaces.
- **Routes that exist and render 200:** `/`, `/picks`, `/methodology`, `/performance`, `/pricing`, `/observatory`, `/vault`, `/about`, `/press`, `/contact`, `/responsible-play`, `/terms`, `/privacy`, `/dashboard`, `/cockpit`, `/promotions`, `/brief`, `/blog`.
- **Footer:** social row with X / Instagram / Threads / Facebook icons, all defaulted to `pickpilot` handle. **If your actual handle differs, edit one file:** `apps/web/lib/brand.ts` → `SOCIAL`.
- **SEO:** `app/robots.ts`, `app/sitemap.ts`, dynamic OpenGraph image at `app/opengraph-image.tsx` (1200×630 with brand wordmark + tagline — what your social posts will show as the card).
- **Cron routes:** `/api/cron/refresh-odds` wired. Settle-picks + jarvis-snapshot are stubs — fine for tonight, run the worker locally to settle.
- **Deploy-readiness CLI:** `npm run deploy:ready` validates every external dependency before push.
- **Stripe seeder:** `npm run stripe:seed` creates Pro/Elite products in your Stripe account.
- **Trust gates:** all defaulted off. Site renders the silent-collection state honestly. No fake stats.
- **Legal copy:** terms, privacy, responsible-play live and brand-safe.

---

## What you must do tonight — the critical path

**Total time:** ~90 minutes if you don't get stuck.
**Cost:** ~$11 tonight (domain) + ~$30/mo recurring once Odds API turns on.

### Step 1 — Buy a domain ✅ DONE

Registered: **galaxysportsedge.com** at Cloudflare. Expires 2027-05-20. Public WHOIS is redacted by Cloudflare.

### Step 2 — Vercel (10 min, free)

1. Sign up at `vercel.com` with GitHub.
2. Import this repo. Framework: Next.js. Root directory: `apps/web`. **Don't deploy yet.**
3. Settings → Domains → add `galaxysportsedge.com`. Add the DNS records Vercel shows you at Cloudflare.

### Step 3 — Neon Postgres (10 min, free tier)

1. Sign up at `neon.tech`. Region: `us-east-2` (matches Vercel's `iad1`).
2. Copy the **pooled** connection string → `DATABASE_URL`.
3. Copy the **direct** connection string → `DIRECT_URL`.

### Step 4 — Google OAuth (10 min, free)

1. `console.cloud.google.com` → new project → OAuth consent screen → External. Add `galaxysportsedge.com` to authorized domains.
2. Credentials → OAuth client ID → Web app.
   - Authorized origin: `https://galaxysportsedge.com`
   - Redirect URI: `https://galaxysportsedge.com/api/auth/callback/google`
3. Copy the client ID + secret.

### Step 5 — Secrets (1 min)

In a terminal, twice:

```bash
openssl rand -base64 32   # → NEXTAUTH_SECRET
openssl rand -hex 32      # → CRON_SECRET
```

### Step 6 — The Odds API (5 min, $30/mo)

Sign up at `the-odds-api.com`. Buy the **20k requests/mo** tier. Copy the API key → `THE_ODDS_API_KEY`.

> The free tier (500/mo) works for testing, but it'll exhaust in a day at our 30-minute refresh cadence. Pay the $30.

### Step 7 — Anthropic API (5 min, ~$10 first month)

`console.anthropic.com` → add billing → create key → `ANTHROPIC_API_KEY`. Used for blog content only; never for picks.

### Step 8 — Upstash Redis (5 min, free)

`upstash.com` → create Redis DB → free tier → same region as Vercel. Copy `rediss://...` → `REDIS_URL`.

### Step 9 — Stripe (skip details tonight, 5 min for keys only)

You don't need the paywall live tonight — gates keep it off. But create the account so the env vars exist:

1. Sign up at `stripe.com`. Stay in **Test mode**.
2. Developers → API keys → copy:
   - `STRIPE_SECRET_KEY` (`sk_test_…`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`)
3. Skip products/prices for now — set both `STRIPE_PRO_PRICE_ID` and `STRIPE_ELITE_PRICE_ID` to `price_placeholder` so the env loads. You'll run `npm run stripe:seed` later to create real ones.
4. Skip webhook for tonight. Set `STRIPE_WEBHOOK_SECRET=whsec_placeholder`. The webhook only fires when checkout runs; checkout is gated off.

### Step 10 — Paste env vars into Vercel (10 min)

Vercel project → Settings → Environment Variables. Add for **Production + Preview + Development**:

```
DATABASE_URL=<pooled neon string>
DIRECT_URL=<direct neon string>
NEXTAUTH_SECRET=<openssl output 1>
NEXTAUTH_URL=https://galaxysportsedge.com
GOOGLE_CLIENT_ID=<from step 4>
GOOGLE_CLIENT_SECRET=<from step 4>
THE_ODDS_API_KEY=<from step 6>
ANTHROPIC_API_KEY=<from step 7>
REDIS_URL=<from step 8>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRO_PRICE_ID=price_placeholder
STRIPE_ELITE_PRICE_ID=price_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=https://galaxysportsedge.com
CRON_SECRET=<openssl output 2>
NODE_ENV=production
CANONICAL_HISTORY_ENABLED=true
DERIVED_MODEL_HISTORY_ENABLED=false
PUBLIC_PICKS_ENABLED=false
FEATURED_PICK_PROMOTION_ENABLED=false
PERFORMANCE_STATS_ENABLED=false
PUBLIC_BLOG_ENABLED=false
OUTCOME_LEARNING_ENABLED=false
CONFIDENCE_DISPLAY_MODE=labels
MIN_DATA_QUALITY_FOR_GAME_LOG=40
MIN_SETTLED_PICKS_FOR_LEARNING=100
DEV_FAKE_ADMIN=false
DEMO_PICKS_ENABLED=false
```

### Step 11 — Push and deploy (5 min)

1. From your local repo: `git push origin main` (after committing this session's changes — see "Commit checklist" below).
2. Vercel auto-deploys. Watch the build log. If it goes green, visit `https://galaxysportsedge.com`.
3. If anything is red, **paste the error into ChatGPT/Codex** with the prompt: *"Vercel Next.js 14 build failed with this error — what's the fix?"*

### Step 12 — Smoke test live (5 min)

1. Visit `https://galaxysportsedge.com` → homepage renders, design loads.
2. Click through Picks, Methodology, Performance, About, Press — every link should 200.
3. Hit `https://galaxysportsedge.com/api/health` → should return `{ ok: true }` (or similar — confirms the API layer is alive).
4. Sign in with Google → should land on `/dashboard`.

---

## Commit checklist — before you push

I edited these files in this session. None of it requires you to inspect — but here's what's new in the diff so you know what you're pushing:

- `apps/web/lib/brand.ts` — added Threads, Facebook, X handles to `SOCIAL`
- `apps/web/components/ui/footer.tsx` — social row with icons
- `apps/web/app/about/page.tsx` — new
- `apps/web/app/press/page.tsx` — new
- `apps/web/app/observatory/page.tsx` — new
- `apps/web/app/vault/page.tsx` — new
- `apps/web/app/robots.ts` — new
- `apps/web/app/sitemap.ts` — new
- `apps/web/app/opengraph-image.tsx` — new (dynamic OG card)
- `LAUNCH_TONIGHT.md` — this file

```bash
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
git add -A
git commit -m "Launch-night: social row, /about /press /observatory /vault, SEO essentials, OG image"
git push origin main
```

---

## After tonight — the 30-day silent collection plan

This is the path your platform was built for. Don't skip steps under pressure.

| Day | What happens |
|---|---|
| **Day 1 (tonight)** | Site is live. Social drives traffic. Marketing surface only. No public picks, no stats. |
| **Days 1–7** | Run the data-refresh worker locally or on a small VPS to ingest odds. Settle picks as games finish. Canonical history accumulates silently. |
| **Day 7** | Flip `DERIVED_MODEL_HISTORY_ENABLED=true` once ~30 settled picks exist. |
| **Day 14** | Flip `PUBLIC_PICKS_ENABLED=true` once the slate is healthy. Now visitors see real picks. |
| **Day 21–30** | Flip `PERFORMANCE_STATS_ENABLED=true` once 100+ canonical settled picks exist. Then enable paywall and `npm run stripe:seed`. |
| **Day 30** | Switch Stripe to Live mode. Update STRIPE_* env vars to live keys. First real charge. |

The platform enforces these gates server-side. You cannot accidentally show numbers you don't have.

---

## When you hit a wall — delegate to ChatGPT/Codex

These tasks are the ones I can't do for you because they require browser/account access. Paste these prompts:

**Vercel build error:**
> "I'm deploying a Next.js 14 monorepo to Vercel. Root directory is `apps/web`. Workspaces: `apps/*`, `packages/*`, `workers/*`. Build is failing with this error: `<paste>`. What's the fix?"

**Neon connection string format:**
> "Neon gave me two connection strings. I need to set DATABASE_URL (pooled) and DIRECT_URL (direct). Which is which on Neon's dashboard, and what does the URL format look like?"

**Google OAuth redirect:**
> "I'm setting up Google OAuth for a Next.js app using NextAuth v5 (Auth.js). My domain is `galaxysportsedge.com`. What exact Authorized JavaScript origins and Authorized redirect URIs do I need?"

**Stripe webhook setup later:**
> "I have a Next.js app at `https://galaxysportsedge.com/api/webhooks/stripe`. I need to set up a Stripe webhook in Test mode that listens for subscription lifecycle events. Walk me through exactly which events to enable."

---

## The single most important thing

**You don't need any of this perfect tonight.** You need the site reachable at a real domain so when you post your first social link it lands somewhere real. Everything else — calibrating gates, flipping the paywall, polishing — happens over the next 30 days while the model accumulates the canonical history that makes your public claims defensible.

The platform's defense-in-depth design assumes you'll be running it under pressure. The gates exist exactly so you can't shoot yourself in the foot at midnight.

**Ship the marketing surface. Trust the gates. Sleep.**
