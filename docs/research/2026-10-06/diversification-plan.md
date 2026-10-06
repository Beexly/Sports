# Infrastructure Diversification Plan — Database & Hosting

**Date:** 2026-10-06
**Status:** Research complete. Phase 1 ready to execute.
**Goal:** Cut the ~$178/mo bill. Diversify off single-vendor concentration. Never break production.

---

## 1. Current state (verified 2026-10-05/06)

| Component | Current | Cost |
|---|---|---|
| Vercel Pro seat | Pro plan | ~$20/mo |
| Vercel metered (Sep 1–Oct 5) | Build CPU ~$27, v0 seats ~$24, Fluid CPU/memory ~$15 | ~$84/35d |
| Unreconciled | ~$90 (suspected Neon overages — NOT verified) | ~$90/mo |
| **Total** | | **~$178/mo** |

**Already executed (2026-10-05):**
- Preview deployments disabled on sports-web → kills the ~$27/mo build CPU driver
- 10 dead sample projects paused (reversible)
- v0 cancel + spend budget: still Garrett's taps

**Workload map (from repo):**
- `sports-web` — Next.js monorepo, production at galaxysportsedge.com, Vercel Pro
- 22 cron routes in `vercel.json` → **~20,550 invocations/month** (calculated from schedules)
  - Hot (every 15 min): `refresh-odds`, `board-fill`, `health-alert`, `generate-signal-slate`, `autonomy-cycle` (~2,880/mo each)
  - Warm (hourly): `settle-picks`, `reconcile-entitlements`, `drain-ai-telemetry-recovery`, `repair-checkout-attempts`, `jarvis-snapshot`, `refresh-player-stats` (~720–1,440/mo each)
  - Cold (daily): drafts, backfills, calibration, truth jobs (~30/mo each)
- Neon Postgres (`gse-postgres/neondb`) — engine predictions DB; `/board` + `/picks` currently `DB_UNREACHABLE` (credential rotation pending — Garrett's tap)
- NGS ingestion (`/api/cron/ngs-ingest`) + backfills (`/api/ops/ngs-backfill`) — heaviest compute per invocation

**Key cost insight:** 20.5K invocations/mo is far under Vercel's 1M included allowance. Invocations are NOT the cost driver — **Fluid CPU/memory per invocation is** (~$15/mo). The heavy crons (odds refresh, NGS ingest, backfills, board-fill) do DB-heavy work on every run.

---

## 2. Free tier research (2026 pricing, verified against official docs)

### Postgres

| Provider | Free tier | Limits | Credit card | Verdict |
|---|---|---|---|---|
| **Neon** (current) | $0 | 100 CU-hrs/project/mo, 0.5 GB/project, 10 branches, 5-min scale-to-zero, 5 GB egress | No | Keep for now — best PG free tier, already wired |
| **Supabase** | $0 | 500 MB DB, 5 GB egress/mo, 2 projects, 500K edge fn invoc/mo, 50K MAU auth. **Pauses after 7 days idle** (10–30s cold start) | No | Best shadow/secondary. Pause behavior disqualifies it for hot paths |
| **Turso** (libSQL/SQLite) | $0 | 5 GB storage, 500M row reads/mo, 10M writes/mo, 100 DBs | No | NOT Postgres. Single-writer constraint. Useful for edge caches, not the engine DB |
| **PlanetScale** | None | Free tier removed 2024. Minimum $39/mo | Yes | Excluded |
| **Cloudflare D1** (SQLite) | $0 | 5 GB, 5M row reads/day, 100K writes/day | No | Couples DB to Workers. Fine for cron state, not the engine |

**Postgres conclusion:** Neon free is the best fit and it's already wired. Supabase free is the shadow/secondary pick. No Postgres migration recommended until the Neon bill is audited — the $90 unreconciled might be Neon overages, in which case the fix is usage reduction (fewer branches, less compute), not migration.

### Hosting / functions

| Provider | Free tier | Limits | Card | Verdict |
|---|---|---|---|---|
| **Vercel Hobby** | $0 | 100 GB BW, 1M invoc. **Non-commercial ONLY** | No | Excluded for GSE (commercial project — ToS violation) |
| **Vercel Pro** (current) | $20/seat | 1TB BW, metered builds ($0.014–0.126/min), Fluid compute | Yes | Keep sports-web here for now |
| **Cloudflare Workers** free | $0 | 100K req/day (~3M/mo), 10ms CPU. **NO cron triggers** | No | Great for webhooks/APIs, can't do scheduled work |
| **Cloudflare Workers** paid | **$5/mo** | 10M req + 30M CPU-ms included, **cron triggers YES** | Yes | **Best cron host.** Flat $5 replaces metered Fluid |
| **Cloudflare Pages** | $0 | Unlimited bandwidth, commercial OK | No | Evaluate for sports-web (Next.js compat needs testing) |
| **Fly.io** | None | 2 VM-hour trial only, then ~$2–5/mo min | Yes | Excluded (no free tier) |
| **Railway** | $1 credit | Trial only | Yes | Excluded |
| **Render** | Free web | 512MB/0.1 CPU, cold starts, PG 30 days only | No | Backup option only |
| **Netlify** | Credit-based | Free plan unchanged, sites suspended on overage | No | Not better than CF Pages |

**Hosting conclusion:** Cloudflare Workers ($5/mo paid) is the clear cron-migration target. Cloudflare Pages ($0) is the sports-web evaluation target for Phase 3.

---

## 3. Phased migration plan

### Phase 1 — This week. $0 cost. Zero production risk.

| Action | Owner | Savings |
|---|---|---|
| Cancel v0 seats | Garrett (dashboard tap) | **−$24/mo** |
| Confirm preview builds stay off | Done 2026-10-05 | **−$27/mo** (already saving) |
| Configure Vercel spend budget + alerts | Garrett (dashboard tap) | $0 (prevents surprises) |
| Audit Neon console: identify the $90 unreconciled | Garrett (console tap) | Unknown — could be the biggest lever |
| Reduce Neon branch sprawl (delete stale branches) | Agent (safe, reversible) | Reduces storage/compute |

**Phase 1 total: $178 → ~$127/mo (−$51/mo)**

### Phase 2 — Low risk. Migrate shadow/heavy crons to Cloudflare Workers.

**Target:** the 5 hottest crons (`refresh-odds`, `board-fill`, `generate-signal-slate`, `autonomy-cycle`, `health-alert` = ~14,400 invoc/mo) plus NGS ingest and backfills.

**Why:** These are the Fluid compute drivers. CF Workers paid is $5/mo flat for 10M requests — the entire 20.5K/mo cron volume fits in the included allowance with 500× headroom.

**How (rollback-safe):**
1. Rewrite each cron handler as a Worker (they're simple HTTP handlers hitting Neon via HTTP driver — portable)
2. Deploy to Workers, keep Vercel crons as fallback for 1 week (dual-run)
3. Cut over by disabling the Vercel cron schedule; rollback = re-enable the schedule
4. Supabase free as shadow DB for noncritical reads (feature flags, cached aggregates) — $0

**Phase 2 total: ~$127 → ~$100–110/mo (−$20/mo, replaces ~$15 Fluid + reduces Neon compute)**

### Phase 3 — Evaluate. No action without testing.

- **sports-web → Cloudflare Pages:** needs Next.js compatibility testing (ISR, middleware, image optimization). Build a staging deploy, run Lighthouse + full click-through, compare. Do NOT migrate blind.
- **Neon → Supabase decision:** only after the Neon audit (Phase 1). If Neon overages are the $90, fix usage first. Supabase's 7-day pause disqualifies it for the hot path — it would be a cold/secondary only.
- **Turso for edge caches:** evaluate for read-heavy, low-write workloads (leaderboards, cached aggregates).

---

## 4. What NOT to do

- Do NOT move sports-web off Vercel without a tested Pages deploy + rollback plan
- Do NOT migrate the Neon production DB without a tested restore procedure
- Do NOT put anything on Fly.io/Railway (no free tier — they'd ADD cost)
- Do NOT use Vercel Hobby for anything commercial (ToS violation, site goes offline at limits)
- Do NOT touch `gse-grok-build-sandbox` (isolated by design)

---

## 5. Open questions (need Garrett's taps)

1. **Neon console audit** — what is the $90/mo unreconciled? (console.neon.tech → billing)
2. **Vercel spend budget** — set alerts at $50/$100/$150 (vercel.com dashboard → settings → billing)
3. **v0 cancel** — removes $24/mo seat charge

---

## Sources

- Supabase pricing: supabase.com/pricing + docs (verified Sep 2026 via dev.to/medium/GitHub mirrors)
- Neon pricing: neon.com/pricing (100 CU-hrs, 0.5 GB/project, 10 branches — verified 2026)
- Cloudflare Workers/Pages pricing: developers.cloudflare.com + toolradar/blazingcdn (verified 2026)
- Vercel Hobby/Pro limits: vercel.com/pricing + temps.sh (verified Aug 2026)
- Fly.io: no free tier for new accounts (verified 2026 — trial only)
- Turso: turso.tech/pricing (5 GB, 500M reads — verified Sep 2026)
- Cron inventory: Beexly/Sports `apps/web/vercel.json` (22 routes, ~20.5K invoc/mo calculated)
