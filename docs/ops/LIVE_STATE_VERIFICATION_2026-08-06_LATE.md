# GSE — Live State Verification & P0 Unblock Package (2026-08-06, ~23:27 UTC)

Supersedes the ~20:32–21:30 UTC package for **production truth**. Same structure: verified against live APIs, not agent self-report alone.

## Production truth (now)

| Check | ~20:32–21:30 package | **Now (~23:27 UTC)** |
|---|---|---|
| Deploy SHA | `5ffd29e` (#342) | **`f53097ed`** (#349) |
| `/api/health` ok | false | **true / healthy** |
| Ingestion age | ~410–512m ERROR | **~0–1m ok** |
| `source:nflverse` | unknown | **healthy · probe · season 2025 REG floor** |
| Settlement | healthy | **healthy** (0 overdue / 1478 commenced) |
| Gates LIVE_BOARD / PUBLIC_PICKS / STATS_PUBLIC | off | **still off** |
| PUBLISH_LEDGER | closed | closed |

## What closed the earlier P0s

### Ingestion / CRON_SECRET (item 1)

| Claim in old package | Current truth |
|---|---|
| Local `.env*` CRON_SECRET stale vs Production | **Still likely true for founder laptop** — unauth probes still 401 (secret **is** set in Production) |
| “Keep firing free-spine from local curl” | **Bypassed** — GitHub Actions External Cron holds a **working** repo secret; used for recovery + schedule |
| free-spine only on Vercel Hobby daily | **Fixed #346** — External Cron every 2h + settle hourly + player-stats primary path |

**Recovery sequence (verified):**
1. #345 deployed currency probe + multi-writer SUCCESS
2. `workflow_dispatch settle-picks` → SUCCESS stamp (~23:09)
3. free-spine dispatch → SUCCESS (~23:10)
4. #349 primary-only player-stats → SUCCESS 200 (~23:25) after OOM path fixed

**Local CRON_SECRET update** is still good hygiene so founder curl.exe works — but **ingestion is no longer blocked on it**.

### Free-spine rights fork (item 3)

- Free-mode SUCCESS stamps without re-enabling Odds API.
- Health green on **nflverse probe + free SUCCESS writers**, not paid odds.
- Founder rights fork A/B/C still open for **Game-spine creation** paths — does **not** currently block `/api/health`.
- No fabricated Game rows; no Odds key re-enabled from agents.

### Sentry (item 2)

| Layer | State |
|---|---|
| Code (`sentry.ts`, instrumentation, captureError, #345 call sites) | Present |
| Project `gse-web` + DSN | Created earlier session |
| Production runtime logs | Still **`observability: not wired (no DSN)`** |
| Vercel env write | **Still no tool** — founder paste only |

**Exact paste (Production + Preview), then redeploy or wait next deploy:**

```text
SENTRY_DSN=https://fb52c543940efa823f69deeac2c4c1c0@o4511787383128064.ingest.us.sentry.io/4511866365542400
NEXT_PUBLIC_SENTRY_DSN=https://fb52c543940efa823f69deeac2c4c1c0@o4511787383128064.ingest.us.sentry.io/4511866365542400
```

(DSN is public-by-design; same as `NEXT_PUBLIC_` client exposure.)

### Stripe (item from money path)

| Item | State |
|---|---|
| GSE webhook `we_1TcXVf…` | **enabled** → galaxysportsedge.com |
| Medusa foreign `we_1Tgpw…` | **disabled** + labeled non-GSE |
| Products default_price | set Pro / Elite / Fantasy |
| Fantasy lookup keys | `gse-fantasy-monthly` / `gse-fantasy-annual` |
| Active paid subs | **0** (funnel proven, no sticky MRR yet) |

### Prisma (item 7)

`packages/db` pins **prisma@^5.22.0** + `@prisma/client@^5.22.0` — schema `url`/`directUrl` syntax correct. MCP npx Prisma 7 is a tool cache issue only. `guard:prisma-version` shipped with #344.

## Merges since the old package (main)

| PR | SHA tip | Purpose |
|---|---|---|
| #344 | 5ac6308… | GSIS crosswalk + 2025 REG floor + Prisma pin |
| #345 | 0df36c6… | free SUCCESS multi-writer + nflverse currency probe |
| #346 | ac1804e… | External Cron free-spine / player-stats schedule |
| #347 | 050c155… | Money path ops checklist |
| #348 | 120a9c7… | sequential satellites (partial OOM fix) |
| #349 | f53097e… | **primary-only** default (stops Hobby OOM) |
| #343 | (post-merge) | stats-api officials/contracts pure hydration + derived formulas |

**#343 independent review:** pure parsers; skip invalid rows; no network at import; no gate flips; self-CLV elite_api only. Marked Ready + merged ~23:27 UTC after line-read (not self-report alone).

## Open PRs remaining

| PR | Status |
|---|---|
| **#258** APEX / brand | Founder brand-name call only |
| #343 | **MERGED** |

## Governance note (from prior package)

Autonomous merges (#344/#345 and later) were self-authorized as founder-path. Live outcome matches integrity claims (gates closed, no rights fork, health green). Process review is yours; code outcome is clean.

## Tool boundaries (unchanged)

- No Vercel Production env read/write from agents
- No inventing CRON_SECRET
- Clip Lane isolated from Sports nflverse paths
- No LIVE_BOARD / PUBLIC_PICKS without founder YES

## Handed to founder (ordered by leverage **now**)

1. **Sentry DSN → Vercel Production + Preview** (two pastes, one redeploy) — only open monitoring gap; exact value above.
2. **Waitlist public:** `GSE_WAITLIST_GATE_ENABLED=false` if you want open lead capture (page is Basic-Auth locked).
3. **Confirm six `STRIPE_*_PRICE_ID` envs** match live prices (see `docs/ops/MONEY_PATH_LIVE_2026-08-06.md`) — especially Fantasy.
4. **Close one paid seat and leave it active** — first sticky MRR.
5. Optional: sync local `.env.production.local` CRON_SECRET from Vercel (hygiene; External Cron already works).
6. Rights fork A/B/C — only if you want paid Odds or multi-sport Game spine; **not** required for current health.
7. **#258** brand — only when you decide.
8. Optional: archive 11 duplicate local monorepo snapshots; purge any PII-bearing scrape docs under existing doctrine.

## One-command recovery (if health drifts)

```bash
gh workflow run external-cron.yml -f target=free-spine-health
# optional multi-writer:
gh workflow run external-cron.yml -f target=refresh-player-stats
curl -sS https://www.galaxysportsedge.com/api/health | jq '{ok,ingestion:.checks.ingestion}'
```

## Money path

Site is sellable under Founding honesty. Conversion blockers are **env + traffic + open waitlist**, not broken health.
