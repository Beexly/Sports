# Launch truth — what is actually open vs dark (2026-08-06)

## Production probe (live)

| URL | Expected | Notes |
|-----|----------|--------|
| `/stats` | **404** unless `STATS_PUBLIC=true` | Foundation. Do not open for launch vanity. |
| `/fantasy/contests` | **200** free paper skill | Durable entries need Neon (`DATABASE_URL`, not stub). |
| `/podcast` | Episode archive + RSS | Content complete; audio optional later. |
| `/newsletter` | Issues + subscribe form | Subscribe uses waitlist store (file unless `WAITLIST_STORAGE=db` + model). |
| `/board`, `/picks` | Honest-empty until `LIVE_BOARD` | Default **off** by law. Empty ≠ broken. |
| `/gsn` | Transmission | Board-sourced when lanes non-empty; else methodology structure. |

## Non-negotiable product law

1. **Finish or dark** — never "coming soon" on public surfaces.
2. **LIVE_BOARD default off** — no public fires without founder flip + proof bar.
3. **No affiliate / no paid contests / no prize pools**.
4. **No public ROI / guaranteed edge** — copy fences + honesty gates.
5. **Ephemeral storage is not a product** — refuse writes that cannot survive serverless.

## Founder-only flips (do not agent-flip)

| Flag | Effect |
|------|--------|
| `LIVE_BOARD=true` | Allows public fire path (still subject to selective gate + cal) |
| `STATS_PUBLIC=true` | Opens StatKing `/stats/*` + footer link + sitemap |
| `CONTESTS_PUBLIC=false` | Emergency dark Contest Bay |
| `WAITLIST_STORAGE=db` | Only after WaitlistLead model + migration (owner PR3) |

## Highest remaining leverage (ordered)

1. **Neon green + crons healthy** — free-spine, settle, health-alert (already in `vercel.json`).
2. **Durable waitlist model** (owner schema) so newsletter/subscribe survives restarts.
3. **Prove free gamma + free settle on Production Neon** before any LIVE_BOARD thought.
4. **CLV / Glass Ledger clock** — start honest pre-kickoff commits early (uncopyable moat).
5. **Do not merge vanity open-PRs** that open foundation surfaces or paid affiliate paths.

## What agents should stop doing

- Polishing sandbox as if it were production.
- Default-opening StatKing / Airwave live / fantasy as "live".
- Adding Prisma models casually without owner intent (migrate-in-build auto-applies).
- Shipping "complete" write paths on Vercel filesystem.

## Pass-3 (2026-08-06)

| Fix | Detail |
|-----|--------|
| Contest settlements | Postgres `gse_contest_settlements` merged with local file |
| Contest entries | Full-slate required; fail-soft list/enter; email hash pepper env |
| Footer Contests | Respects `isContestsPublic()` (no orphan link when dark) |
| `/api/contests/week` | JSON week + leaderboard + storageMode |
| Ops truth | readiness bootstrap flags + content counts |

## Live production snapshot (agent probe 2026-08-06)

| Signal | Value | Action |
|--------|-------|--------|
| `/api/health` database | ok | — |
| ingestion last success | ~180m at probe | free-spine / odds refresh cadence |
| **settlement capability** | **CRITICAL / unavailable** | **P0: settle-picks must clear overdue PENDING picks** |
| contestStorage | postgres (durable) | good |
| statsPublic | false | correct |
| CI trust-gate | was red on "lock" slang in Contest Bay | use close/submit wording only |

### What actually blocks "launch of the moat"

Not podcast polish. Not StatKing vanity.

1. **Settlement overdue** — public record + CLV starve while PENDING past grace.
2. **LIVE_BOARD off** — correct until proof bar; do not flip.
3. **PUBLISH_LEDGER owner_gated** — Glass Ledger clock starts when founder enables commit path.
4. **CI green** — never merge public copy that contains bare "lock" (betting slang ban).
