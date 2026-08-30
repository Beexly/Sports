# Final audit — GSE public product (2026-08-06)

## Live scorecard (agent probe)

| Surface | Live | Posture |
|---------|------|---------|
| `/stats` | 404 | Dark (correct) |
| Sitemap `/stats` | absent | Aligned with dark |
| `/fantasy/contests` | 200 | Paper skill; durable DB; practice slate |
| `/api/contests/week` | 200 | JSON week + leaderboard |
| `/podcast` + RSS | 200 | Archive complete |
| `/newsletter` | 200 | Issues + subscribe |
| `/board` `/picks` | 200 | Honest empty / LIVE_BOARD off |
| `/gsn` | 200 | Board or methodology badge |
| Settlement | **CRITICAL** | **139 / 1478 overdue PENDING** |
| Contest storage | postgres | Durable |
| Waitlist storage | (deploy) | Neon bootstrap when live |

## What we fixed this session (ordered by leverage)

1. **Durability honesty** — contests + waitlist refuse ephemeral Vercel writes; Postgres bootstrap tables
2. **Trust-gate** — no banned “lock” slang on public contest copy
3. **Settlement P0** — hourly settle-picks, overdue-first STP, ops bySport (auth detail)
4. **Gates** — StatKing dark default; Contests public skill; footer respects gates
5. **Durable public form rate limits** — cross-instance (this PR)
6. **Ops endpoint** — public summary vs Bearer CRON_SECRET detail (this PR)
7. **Practice slate labeling** — not mistaken for live NFL board (this PR)

## Outside-the-box residual risks (not code theater)

| Risk | Owner action |
|------|----------------|
| Settlement CRITICAL | Confirm CRON_SECRET; watch hourly settle; inspect bySport with Bearer auth |
| Ingestion ~3h stale at probe | free-spine / odds refresh cadence |
| PUBLISH_LEDGER off | Flip when Glass Ledger clock should start |
| LIVE_BOARD off | Keep until settlement HEALTHY + proof bar |
| Open stale PRs (#274/#276) | Already in vercel.json — close as obsolete |
| CI flake history | Trust-gate + lint must stay green on every public copy PR |

## Decision rule

**Finish · dark · or refuse the write.**  
**Settlement CRITICAL > surface polish.**  
**Never open StatKing for vanity.**  
**Never claim live market slate on methodology practice boards.**
