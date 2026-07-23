# Design Polish Ledger — overnight world-class loop

Working checklist for the autonomous polish loop. One group per cycle.
Each cycle: audit (tokens / states / contrast / hierarchy / responsive / copy)
→ implement presentation-only fixes → typecheck + lint + targeted tests →
commit + push to `claude/website-redesign-world-class-xoz5sz` (PR #190) →
mark the row, note what changed. Never touch data-fetching, paywall,
entitlement, or scoring logic. Higgsfield generations: catalogue job IDs
here (CDN blocked in sandbox — stills committed later via plan doc §3).

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[✓]` audited, already at bar

| # | Group | Routes / files | Status | Notes |
|---|---|---|---|---|
| 1 | Auth + waitlist funnel | /auth/signin, /auth/error, /waitlist, /sealed | [x] | intro-galaxy atmosphere on signin/error/waitlist; eyebrows; plasma CTAs; focus-ring override removed; waitlist form tokenized + focal submit; sealed type-floor fixes |
| 2 | Trust core | /proof, /verify, /calibration, /track, /how-to-verify-a-record | [x] | WIN/verified → verify mint (not cyan); mono eyebrows sitewide idiom; proof-crystal plate on /verify; legacy ink/BRAND_COLORS migrated; meta type floors. Flagged: bet-tracker/staking-calculator legacy tokens for a later cycle |
| 3 | Performance + ledgers | /performance, /accountability, /clv, /ledger, /glass-ledger | [ ] | |
| 4 | Member area | /dashboard, /watchlist, /account settings surfaces | [ ] | |
| 5 | Tools suite | /tools, /tools/ev-calculator, /tools/no-vig-calculator, /tools/odds-converter, /tools/parlay-calculator | [ ] | |
| 6 | Analysis tools | /optimizer, /parlay-mri, /trends, /weather, /data | [ ] | |
| 7 | Sport verticals | /nflverse, /nhl, /mlb, /stats (landing) | [ ] | plates wired 2026-07-23 |
| 8 | Players suite | /players + /players/* (9 routes) | [ ] | |
| 9 | Stats suite A | /stats/players, /stats/teams, /stats/compare, /stats/comps, /stats/depth, /stats/player/[id] | [ ] | |
| 10 | Stats suite B | /stats/scheme, /stats/scouting, /stats/trenches, /stats/injuries, /stats/watchlist, /stats/alerts, /stats/ask, /stats/expert-board, /stats/proof | [ ] | |
| 11 | Stats sources + media | /stats/sources, /stats/source-graph, /stats/source-suggest, /stats/media/* (6 routes) | [ ] | |
| 12 | Fantasy core | /fantasy, /fantasy/draft, /fantasy/lineup, /fantasy/waivers, /fantasy/trade | [ ] | plate wired 2026-07-23 |
| 13 | Fantasy extended | /fantasy/bestball, /dfs, /props, /contests, /autopilot, /studio, /academy, /scheme, /league-twin, /gm-ledger, /baseline, /connect | [ ] | |
| 14 | Marketing story | /about, /how-we-make-money, /vs/tout-services, /faq, /press, /partners, /media-kit, /contact | [ ] | |
| 15 | Content surfaces | /blog, /journal, /the-beat, /podcast, /newsletter, /gsn, /airwave, /changelog, /case-studies/* | [ ] | |
| 16 | Narrative worlds | /house, /academy, /engine, /fable, /human, /deck, /observatory, /intelligence, /cipher, /vault, /content-lab, /integrations, /promotions | [ ] | |
| 17 | Legal + misc | /terms, /privacy, /responsible-play, /preview/[sport]/[slug] | [ ] | |
| 18 | Game room + today | /room/[gameId], /today, /brief | [ ] | |
| 19 | Cockpit A | /cockpit, /cockpit/command-center, /cockpit/agents, /cockpit/tasks, /cockpit/history | [ ] | tokens done; polish pass |
| 20 | Cockpit B | remaining /cockpit/* (~15 routes) | [ ] | tokens done; polish pass |
| 21 | Admin + statking | /admin/*, /admin/statking/* | [ ] | lowest priority |
| 22 | Shared chrome | Nav, MobileNav, Footer, shared UI components | [ ] | |
| 23 | Higgsfield motion plates | video plates for verticals + fantasy; catalogue job IDs | [ ] | stills done 2026-07-23 (plan doc §3) |
| 24 | Final visual-QA sweep | cross-page consistency re-check, ledger close-out | [ ] | |

Pre-verified at bar (session 1 audit): `/` homepage, `/board`, `/pricing`,
`/picks` — Tier A, art-directed, token-pure. Re-check only in cycle 24.

## Cycle log

- 2026-07-23 05:1x — Ledger created. Loop armed.
- 2026-07-23 05:10 — Cycle 1 (auth funnel) done: 5 files, 177 targeted tests + 3,202 guard tests green.
- 2026-07-23 05:22 — Cycle 2 (trust core) done: 7 files, 250 targeted + 91 guard tests green.
