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
