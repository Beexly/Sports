# Launch corner audit — 2026-08-06 (broad, not single-silo)

## Live (probed)
| Signal | Result |
|--------|--------|
| Health | healthy |
| Settlement | overdue 0 HEALTHY |
| Contests / waitlist | postgres |
| Trust chrome | security.txt ads humans 200 |
| Sitemap density | ~65 URLs (preview flood fixed) |
| News sitemap | 3 entries (issue 003 window) |
| Picks / stats gates | 503 / dark (correct) |
| Cron unauth | 401 |
| Free-lane / Jynx auto | still off (founder env) |
| Prod SHA | catching main (trust chrome live) |

## Corners checked
- Cipher claim-only (API + UI copy)
- Free + paid settle repair drains (CLV / snapshot / TEAM_GAME_LOG)
- CSP / ads / security / humans
- Sitemap not drowning crawl budget
- Personal hive stack **not** in monorepo
- Open PRs left for premise review (no bulk-merge)
- Stripe foreign webhook = founder Stripe UI
- `/intelligence/engines` OOM once historically — `maxDuration=60` already; monitor after traffic

## Agent ships this wave
Cipher UI claim-only · founderNextSteps + billing/analytics · this scorecard
