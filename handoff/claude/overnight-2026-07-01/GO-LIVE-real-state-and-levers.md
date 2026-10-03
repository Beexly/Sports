# GO-LIVE — the real production state + the exact levers (2026-07-01)

Grounded in your **actual Vercel production logs** (project `sports-web`), not guesses.

---

## What production actually told me — 3 blockers, ranked

### 1. Database intermittently unreachable (Neon) — 113 errors — **YOUR LEVER**
`Can't reach database server at ep-summer-moon-apv5ccys-pooler.c-7.us-east-1.aws.neon.tech:5432`
Hits `/api/picks`, `/api/performance`, `/cockpit/*`, `/`, and settlement. Spans Jun 3 → Jun 30,
intermittent (the cockpit still renders when the DB is up).

**Why:** Neon compute is suspended / over its limit, or connections are exhausted. The free tier
autosuspends and caps compute-hours; when the cap is hit the endpoint goes unreachable.

**Fix (you):**
1. Neon dashboard → your project → check **compute status + usage/quota**. If suspended or over the
   free-tier limit → **upgrade the Neon plan** (or resume compute). This is likely your single
   biggest reliability win.
2. Confirm `DATABASE_URL` in Vercel prod uses the **-pooler** host (it does) with a role that has grants.
3. **Code-level robustness (already written, just off):** prod connects to Neon over raw TCP (:5432),
   which flakes on serverless cold-starts. The Neon HTTP serverless driver is more robust and the
   adapter is already in the repo (`packages/db/src/neon-serverless-adapter.ts`) — off by default so it
   never blocked a build. To activate (its header has the same steps):
   ```
   npm install @neondatabase/serverless @prisma/adapter-neon   # in packages/db
   # schema.prisma generator block: previewFeatures = ["driverAdapters"]
   npm run db:generate
   # set NEON_SERVERLESS_DRIVER=true in Vercel prod
   ```
   NOTE: this needs a dep install + Prisma regen + wiring `tryBuildNeonServerlessClient()` into the
   client resolution (currently synchronous), so validate on a preview deploy before prod. Rollback =
   unset `NEON_SERVERLESS_DRIVER`. I did not auto-run this — it touches your prod DB driver and needs a
   clean install + preview check first.

### 2. MLB picks rejected as "stale" → 0 picks today — **I FIXED THE CODE**
`[cron:refresh-odds] baseball_mlb failed: Upstream odds are stale: no game has a fresh bookmaker update`
64 occurrences in ~26h. The API call **succeeds** (feed is alive) — the odds are just older than the
gate allowed.

**Why:** the per-game odds-freshness gate used a **1-hour** window, but your `refresh-odds` cron runs
**once daily at 10:00 UTC (6am ET)** — ~13h before MLB first pitch — so every bookmaker timestamp is
>1h old at fetch time → every game dropped → 0 picks, every day. This 1h value also contradicted your
own shared Refresh SLA, which already declares **4h** the staleness line for the daily cron
(`refresh-sla.ts`).

**My fix (committed):** aligned the odds gate to the 4h SLA and exposed it as a knob
`ODDS_FRESHNESS_MAX_HOURS` (config.ts). Ships as 4h; you own the trade.

**To FULLY fix fresh picks (you):** a once-daily 6am fetch still won't have fresh *evening*-game odds.
Two honest options — pick one (or both):
- **Fetch closer to game time:** add afternoon/evening `refresh-odds` cron cycles (e.g. also 18:00 &
  22:00 UTC). Needs **Vercel Pro** (Hobby crons are daily-only) and enough Odds API credits.
- **Widen the knob:** set `ODDS_FRESHNESS_MAX_HOURS=12` to publish morning odds for evening games.
  Trade: picks are based on lines up to 12h old (still fine pregame, but less sharp). *Don't* widen
  past ~12h — that starts publishing genuinely stale lines, which breaks the trust you're selling.
- **Either way:** `THE_ODDS_API_KEY` needs enough monthly credits (the free tier is 500/mo; 3 markets
  × multiple sports × multiple daily fetches burns it fast). A paid Odds API tier is a real cost input.

### 3. `permission denied for table picks` (Postgres 42501) — **YOUR LEVER (1 line)**
The DB app-role lost its grant on `picks`. In the Neon SQL editor:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <your_app_role>;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <your_app_role>;
```

(Minor: a few heavy routes — `/fantasy`, `/nflverse`, `/api/sources/catalog` — OOM'd 4× on the Vercel
function memory limit. Low priority; bump the function memory or lazy-load those if it recurs.)

---

## The gate flips — Vercel → Settings → Environment Variables → Production, then Redeploy
All values are the strings `true` / `false`.

| Env var | Now | Action |
|---|---|---|
| `CANONICAL_HISTORY_ENABLED` | ON | leave |
| `DERIVED_MODEL_HISTORY_ENABLED` | ON | leave |
| `PUBLIC_PICKS_ENABLED` | ON | leave |
| `PERFORMANCE_STATS_ENABLED` | ON | leave |
| `OUTCOME_LEARNING_ENABLED` | ON | leave |
| `FEATURED_PICK_PROMOTION_ENABLED` | off | **set `true`** |
| `PUBLIC_BLOG_ENABLED` | off | **VERIFIED SAFE to set `true`** — the draft-only guardrail scanned 1,079 files and confirmed no code path anywhere writes `publishedAt`, flips a row to PUBLISHED, or sends externally. Flipping this only enables draft GENERATION; publishing remains a manual operator action by construction. |
| `FORCE_NO_BET_IF_STALE` | off | consider `true` — auto-hides picks when data is stale (protects trust while ingestion stabilizes) |
| `CALIBRATION_ADJUSTMENTS_ENABLED` | off | **LEAVE OFF.** Your own code forbids it without the ≥100-settled + held-out-validation audit. Flipping it makes the site display "calibrated win probabilities" that aren't validated — the one flip that makes the product claim something untrue. |

New knob: `ODDS_FRESHNESS_MAX_HOURS` (default 4). Raise to 12 if you want more picks from the daily fetch (see blocker #2 trade).

---

## Revenue (Stripe) — **YOUR LEVER**
Set in Vercel prod: `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`, and the monthly/annual price IDs
(the monthly/annual price-ID wiring was the previously-flagged launch-blocker). Point the Stripe webhook at
the app's webhook route, then run one real checkout end-to-end before announcing.

---

## The honest bottom line
- **The code is launch-ready.** The thing keeping the board empty is **data**: DB reliability + fresh
  odds. That's infra + a modest paid data plan — not code.
- Turning every gate on does **not** by itself create revenue. Win rate is **51.5%** (shown honestly).
  This is a real subscription business that needs the data feed working, then customers — not a switch.
- Sequence that actually gets you to first paying customer: **(1)** fix the DB (Neon) → **(2)** get fresh
  odds flowing (cron timing + Odds API credits) so the board fills with real picks → **(3)** flip the
  remaining safe gates → **(4)** wire Stripe → **(5)** drive traffic. Steps 1, 2 (config), 4, 5 are yours;
  the code for 2 and 3 is done.
