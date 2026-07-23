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
| 3 | Performance + ledgers | /performance, /accountability, /clv, /ledger, /glass-ledger | [x] | /ledger fully retokenized (LOSS was plasma — fixed to alert); bet-tracker + staking-calculator off BRAND_COLORS inline styles; WIN→verify sitewide in group; mono eyebrows; NUMERIC_TEXT_CLASS unification; tablet grid fix on /accountability |
| 4 | Member area | /dashboard, /watchlist | [x] | dashboard fully retokenized (predated token system): plasma CTAs, confidence-ladder bar, mono eyebrows, NUMERIC_TEXT_CLASS, honest empty state; watchlist inviting empty state + honest setup-vs-outage split. Note: no account/settings page exists |
| 5 | Tools suite | /tools, /tools/ev-calculator, /tools/no-vig-calculator, /tools/odds-converter, /tools/parlay-calculator | [x] | negative EV was plasma → alert; focus-ring suppression removed on all inputs; aria-live results; inline hex/BRAND_COLORS purged; mono eyebrows + NUMERIC_TEXT_CLASS |
| 6 | Analysis tools | /optimizer, /parlay-mri, /trends, /weather, /data | [x] | parlay-genome verdict ladder off plasma-as-negative (cyan/UV/caution/alert); focus rings restored; aria-live vitals; sr-only table captions; TREND LAB eyebrow; optimizer+data already clean. Note: ~25 other pages still import BRAND_COLORS — covered by their own groups |
| 7 | Sport verticals | /nflverse, /nhl, /mlb, /stats (landing) | [x] | plate wiring verified; N/A→STAT_PLACEHOLDER; sr-only captions + tabular-nums on all tables; nflverse eyebrow + CC-BY Attribution added; stats landing double-arrow bug fixed; ScoreRing hexes → CSS vars |
| 8 | Players suite | /players + /players/* (9 routes) | [x] | sub-routes are redirect shims; real surface /players polished: negative Form Δ off plasma → alert; STAT_PLACEHOLDER; DataTable gains sr-only caption prop → all 17 Player Lab tables named; lens rail → semantic nav. Flagged: error-boundary family (app/error, players/error, stats/error) for a single future pass |
| 9 | Stats suite A | /stats/players, /stats/teams, /stats/compare, /stats/comps, /stats/depth, /stats/player/[id] | [x] | table cell-padding defect fixed; compare-page winner-badged-as-warning semantic bug fixed; honest empty states added; sr-only captions; copy-paste empty-state bug on player profile. Flagged: [id] canonical points at list page (SEO, future cycle) |
| 10 | Stats suite B | /stats/scheme, /stats/scouting, /stats/trenches, /stats/injuries, /stats/watchlist, /stats/alerts, /stats/ask, /stats/expert-board, /stats/proof | [x] | honest fixture-vs-live ribbon fixes; alert-tone-for-magnitude misuse fixed; ask page gets ribbon + rebuilt form; empty states everywhere; scheme+alerts are redirects. Flagged: title-case SectionHeader idiom for a doctrine decision |
| 11 | Stats sources + media | /stats/sources, /stats/source-graph, /stats/source-suggest, /stats/media/* (6 routes) | [x] | semantic-tone fixes on charts; honest empty states for zero-snapshot cards; form focus/placeholder tokens; sr-only captions; aria-current tabs; rights/attribution copy kept verbatim; 4 media platform routes are redirects |
| 12 | Fantasy core | /fantasy, /fantasy/draft, /fantasy/lineup, /fantasy/waivers, /fantasy/trade | [x] | FantasyShell off BRAND_COLORS w/ semantic accent prop (hex fallback for stragglers); invisible honesty-note contrast fixed (ink-500→ion-2); draft/lineup/waiver/trade boards: plasma-as-negative fixes, emoji removed, FAAB ladder aligned to confidence ladder, tabular numerals. Remaining: bestball-board + other shell consumers (cycle 13) |
| 13 | Fantasy extended | /fantasy/bestball, /dfs, /props, /contests, /autopilot, /studio, /academy, /scheme, /league-twin, /gm-ledger, /baseline, /connect | [x] | all 12 pages on semantic shell accents, BRAND_COLORS dropped; bestball/dfs/props/dk-import/sleeper-connect boards fully tokenized w/ plasma-as-negative fixes. Remaining debt (self-contained, future cycle): gm-ledger-view, gm-academy, gm-autopilot, league-twin-galaxy, scheme-intel, studio-host/brief components |
| 14 | Marketing story | /about, /how-we-make-money, /vs/tout-services, /faq, /press, /partners, /media-kit, /contact | [x] | how-we-make-money off BRAND_COLORS/inline styles; ink-500 sub-AA meta fixed across group; press card-border bleed fixed; numerals off display font; copy meaning untouched (525 guard tests) |
| 15 | Content surfaces | /blog, /journal, /the-beat, /podcast, /newsletter, /gsn, /airwave, /changelog, /case-studies/* | [x] | all pages BRAND_COLORS-free; blog paywall card + featured/sport chips re-toned (caution→plasma/UV); journal UV eyebrows; time elements + reading measures; ink-500 contrast failures fixed; empty states bordered. Remaining: dynamic hex tone-maps inside the-beat/galaxy-broadcast/pundit-ledger/transmission components |
| 16 | Narrative worlds | /house, /academy, /engine, /fable, /human, /deck, /observatory, /intelligence, /cipher, /vault, /content-lab, /integrations, /promotions | [x] | all BRAND_COLORS/ink/brand-* purged; observatory invisible-emphasis fix; promotions plasma CTA w/ dark ink; deck dots → token vars; cipher terminal finished; fable + integrations already clean |
| 17 | Legal + misc | /terms, /privacy, /responsible-play, /preview/[sport]/[slug] | [x] | responsible-play: fixed a live render-crash bug (BRAND_COLORS used without import) + full token purge + a11y heading fix; preview page eyebrow idiom + heading; terms/privacy already reference-quality |
| 18 | Game room + today | /room/[gameId], /today, /brief | [x] | room: finished earlier cyan cleanup, dead hover no-ops fixed, heading-level a11y fix; today + brief: BRAND_COLORS inline styles → tokens, plasma CTA idiom |
| 19 | Cockpit A | /cockpit, /cockpit/command-center, /cockpit/agents, /cockpit/tasks, /cockpit/history | [x] | legacy brand-* aliases → plasma; found + fixed a palette-cohesion CI blind spot (ring-offset-gray-950 slipped past the regex, now closed sitewide); tasks queue reordered urgent-first w/ tone-driven badges; dense table gains aria-label |
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
- 2026-07-23 05:35 — Cycle 3 (performance + ledgers) done: 7 files, 370 targeted + 231 guard tests green.
- 2026-07-23 05:45 — Cycle 4 (member area) done: 2 files, 146 targeted + 92 guard tests green.
- 2026-07-23 05:55 — Cycle 5 (tools suite) done: 12 files, 100 targeted + 40 tangential tests green.
- 2026-07-23 06:05 — Cycle 6 (analysis tools) done: 5 files, 69 targeted + 3,312 guard tests green.
- 2026-07-23 06:15 — Cycle 7 (sport verticals) done: 5 files, 102 targeted + 3,259 guard tests green.
- 2026-07-23 06:25 — Cycle 8 (players suite) done: 5 files, 35 targeted tests green.
- 2026-07-23 06:35 — Cycle 9 (stats suite A) done: 7 files, 50 targeted + 24 tangential tests green.
- 2026-07-23 06:45 — Cycle 10 (stats suite B) done: 7 files, 50 targeted + 33 tangential tests green.
- 2026-07-23 06:55 — Cycle 11 (stats sources + media) done: 6 files, 94 targeted + 33 tangential tests green.
- 2026-07-23 07:05 — Cycle 12 (fantasy core) done: 13 files, 185 targeted + 1,509 guard tests green.
- 2026-07-23 07:15 — Cycle 13 (fantasy extended) done: 17 files, 197 targeted + 80 tangential tests green.
- 2026-07-23 07:28 — Cycle 14 (marketing story) done: 8 files, 525 tests green.
- 2026-07-23 07:40 — Cycle 15 (content surfaces) done: 15 files, 307 targeted + 151 tangential tests green.
- 2026-07-23 07:52 — Cycle 16 (narrative worlds) done: 12 files, 552 targeted + 73 tangential tests green.
- 2026-07-23 12:45 — Cycles 17+18 (legal/misc/game room) done: 7 files, 80 targeted + 55 tangential tests green. (Session switched Fable 5 → Sonnet 5 mid-loop after hitting a usage limit; loop continues unaffected.)
- 2026-07-23 12:48 — Cycle 19 (cockpit A) done: 5 files, 333 targeted + 213 tangential tests green. Extended palette-cohesion's STALE regex to cover ring-offset-*/focus-visible:ring-offset-* (closes the gap cycle 19 found).
