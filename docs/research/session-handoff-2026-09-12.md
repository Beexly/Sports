# Session handoff — 2026-09-12

## What this session was

Founder (Garrett / baxley.garrett@gmail.com) gave an agent full control
over Galaxy Sports Edge (galaxysportsedge.com, repo Beexly/Sports) to:
execute the ASTRA redesign, run an adversarial audit, rebuild the
record, add founder picks, and push toward "the most accurate fantasy
and prediction sports website in 2026."

Founder stepped away. Agent worked autonomously, committed, and merged
20+ PRs to main. Founder returned with detailed feedback. Agent fixed
every item named and shipped another 20+ PRs.

## Where we are NOW

**Production (live truth surface, 2026-09-12T02:00Z):**
- `calibrationEligibility`: GREEN, streak 93
- `canExposePerformanceStats`: true
- `calibrationPublished`: true
- `revenueLadder`: PROVEN
- `settlement`: HEALTHY (0 of 2806 overdue)
- `canonicalSettled`: 2300
- `MODEL_VERSION`: v5.2.7 (untouched)
- Floors: n 100 / Brier 0.22 / ECE 0.05 (untouched)

**The only ESTABLISHED blocker:** CLV beat-close 23.0% vs 52.4% required.
That is a model problem, not a gate problem. The selective path
(δ=0.1, rank on marketFairProb) is ON and the historical projection of
that filtered set passes floors (Brier 0.150, RES 0.041).

**Branch:** `claude/astra-redesign-2026-09-14` — fully merged, 0 ahead
of main. Every commit is on main via PRs #769-#791.

## What was SHIPPED (PRs #769-#791)

### ASTRA 12 owner items
1. Age-21 gate off subscriptions
2. Tiers re-weighted for DFS season (Elite no longer sells dead features)
3. Proof-crystal backgrounds replaced (Field atmosphere)
4. The Beat rebuilt (robotic speechSynthesis REMOVED, full-bleed cinematic)
5. Studio internal-only
6. Academy hidden + noindex
7. Fantasy "gated" badge honesty (live / partly live / sample)
8. Jargon stripped (JSON buttons gone, engine titles plain)
9. Free tools usage moments
10. House collapsed to 4 doors
11. /board vs /picks IA fixed
12. Calibration engines: NOT executed (floor changes are founder-only)

### Record accuracy (the big one)
- PUSH was structurally unreachable for spreads/totals. Published and
  graded the POSTED book line (`published-line.ts`). Scoring math still
  reads the raw mean. MODEL_VERSION unchanged. Ties resolve against us.
- Published bet terms frozen write-once at creation (selection/line/
  reasoning/reasoningShort). Card can no longer show -4.5 while we
  grade -3.0.
- Calibration bucket win rates excluded pushes (were averaging push as
  half a win, flattering sub-50% buckets). Correlation WIN_RATE excluded
  pushes (were counting every push as a loss).
- /api/performance floor counts decided picks only (was counting pushes).

### Founder picks system
- `lib/founder-picks/` — types, create, record, factors
- modelVersion=founder-v1, isBootstrap=false
- ADMIN POST /api/admin/founder-picks, public /founder-picks
- Factor engine: depth chart, teammate OUT, OL OUT, injury, matchup
  split, underlying metric, consensus, rest/B2B
- 15 unit tests covering every factor

### GSE Score + GSE Index
- `lib/fantasy/gse-score.ts` — real player ranking
- LIVE reads processGrade from nflverse; SAMPLE is a pool percentile
- Wired into trade analyzer, draft assistant, best-ball board
- 8 unit tests

### LineStar / PropFinder parity
- Projections table: Sal, Proj, Val, Ceil, L5, M/U, pOwn%, Lev
- Sortable, pin/exclude from the row
- CSV export (DK Classic format)
- Max exposure slider (10-100%)
- Props board: market + team filters
- Scrape reference saved: `docs/research/competitor-scrape-2026-09-12.md`

### Board / House / Beat
- Board: cinematic opening + "You are here" IA strip
- House: weekly rhythm is an actionable calendar with today CTA
- Beat: full-bleed cinematic, scanline atmosphere, no robot voice

### Owner permissions
- `CODE_OWNER_ALLOWLIST` in auth.ts: baxley (full admin), dbax (secondary)
- ADMIN sessions get ELITE in getViewerEntitlements
- Works even when ADMIN_EMAILS env is empty

### Lens Switcher fix
- BETTOR / CREATOR / ANALYST were identical strings. Now each is
  genuinely different: FAN=plain English, BETTOR=Edge Index + bet
  meaning, CREATOR=story angle, ANALYST=all numbers.

### Calibration skill metrics (additive, no floors)
- `lib/calibration/skill-metrics.ts` — BSS, NLL, Murphy, null-band ECE
- Wired into computeCalibration as report.skill
- `marketGatesAdvisory` on the live metrics artifact (NOT a gate)

## What is OPEN

### Founder env actions (law 3 — agents cannot flip these)
1. `EVENT_ODDS_INGEST_ENABLED=true` — turns on prop-line ingest. The HB
   props engine, fire gate, and line shop are built and tested.
2. `ADMIN_EMAILS=baxley.garrett@gmail.com,dbax66@icloud.com` — belt-and-
   braces; code allow-list already works.
3. `INTERNAL_LLM_BASE_URL=https://ai-gateway.vercel.sh/v1` +
   `INTERNAL_LLM_API_KEY=<vck_ key>` — Vercel AI Gateway. Key was sent
   in chat, NEVER committed to git.
4. `LINE_ARCHIVE_ENABLED` — already ON (37k+ snapshot rows, C-62).

### Known CI failure
- `dependency-audit` guard: stale waivers for `next` and `postcss`
  (C-305). The vulnerability is gone; the waiver list needs the two
  entries removed. `scripts/guardrails/dependency-audit.mjs` is frozen
  by law 2. **Founder action.**
- All other guardrails pass (25/26).

### Model work (founder-gated by law 3)
- CLV 23% → 52.4% is the ESTABLISHED blocker
- Selective δ=0.1 + marketFairProb ranking is ON
- Historical projection of that filtered set passes floors
- Keep the filter on; accumulate GREEN streak on live filtered publishes
- Do NOT lower floors, do NOT flip PERFORMANCE_STATS, do NOT touch
  MODEL_VERSION without an IMPLEMENTED CalibrationProposal

### Next work order (in priority order)
1. Props env flip (founder) + verify prop lines land in OddsLineSnapshot
2. Owner starts locking founder picks via /founder-picks
3. Wire scrape wave 2 results into the factor engine
4. Recent Form / Matchup columns populate when live data lands
5. CLV 23% → 52.4% (model problem, not a gate problem)
6. Visual polish on /founder-picks and the props board once props are live

## The laws (do not violate)

1. NEVER `git push` to main directly. PRs only.
2. NEVER modify: schema.prisma, migrations, .github/workflows,
   scripts/guardrails, .claude, any .env*, package-lock.json,
   .gitignore, .githooks, ai-control-plane
3. NEVER flip a gate or env flag. Founder-only.
4. NEVER write a claim you did not observe.
5. NEVER mark DONE without the DoD commands actually passing.
6. NEVER `git commit --no-verify`.
7. NEVER install a package, run a migration, or touch a database.
8. NEVER fabricate product data.
9. NEVER weaken a guard to make a test pass.

## Key files

| What | Where |
|---|---|
| Founder picks | `apps/web/lib/founder-picks/` |
| Factor engine | `apps/web/lib/founder-picks/factors.ts` |
| GSE Score | `apps/web/lib/fantasy/gse-score.ts` |
| Projections table | `apps/web/components/fantasy/projections-table.tsx` |
| Published line | `packages/prediction-engine/src/published-line.ts` |
| Skill metrics | `apps/web/lib/calibration/skill-metrics.ts` |
| Per-market gate | `apps/web/lib/ops/per-market-gate.ts` |
| Scrape wave 1 | `docs/research/competitor-scrape-2026-09-12.md` |
| Scrape wave 2 | `docs/research/scrape-wave-2.md` |
| AGENTS.md | Session record + scraping queue + work order |
| Ledger | `docs/ops/AGENT_LEDGER.md` rows A-1..A-41 |

## Verify commands

```bash
npm run typecheck          # exit 0
npm run lint               # exit 0
npm run guardrails         # 25/26 (dependency-audit is founder-only)
node scripts/guardrails/model-freeze.mjs   # MODEL_VERSION v5.2.7
node scripts/guardrails/em-dash-scan.mjs   # OK
node scripts/guardrails/trust-gate.mjs     # OK
npx vitest run lib/founder-picks/factors.test.ts
npx vitest run lib/fantasy/gse-score.test.ts
npx vitest run __tests__/intelligence-graph.test.ts
```

## Times

All customer-facing times are Central (America/Chicago).
`lib/time/central.ts` is the formatter.
