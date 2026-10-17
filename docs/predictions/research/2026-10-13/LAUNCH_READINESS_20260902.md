# Launch readiness — end-of-session report, 2026-09-02

Scope: NFL Week 1 (kickoff Thu 2026-09-10, main slate Sun 09-13) and the NCAA football season
already in progress (Week 2 Sat 09-05). Everything below was either observed (database read,
live endpoint, test output) or landed in PR #684 on branch `claude/audit-code-setup-v6-v9z8cd`.
Companion: `PICKS_STATE_2026-09-02.md` (the numbers).

## 1. What was wrong and what changed (all in PR #684)

| Area | Found | Landed |
|---|---|---|
| Settlement (P0) | 92 picks overdue; paid scores fetch dead since Aug 24 with no trace; backfill skipped the 6h-3d band and starved behind 50 held rows; matcher held every series game and matched city-only names to the wrong team; autonomy's "free settle" ran the paid branch | Free-path fallback per failed sport in the same cron cycle; backfill window = 6h grace, cap 200, holds recorded with reason; nearest-start-time matcher, city-only ambiguity hold; `?path=free` from the executor; Sentry on every swallowed catch; free-spine error text persisted |
| Duplicate games | Every game up to 3 rows (Odds API hash / TheRundown hex with city-only names / two ESPN id formats); NFL Week 1 already has all three | Canonical game identity at the ingestion layer (team pair + 18h window, ambiguous prefixes fail closed, kill switch `GAME_IDENTITY_MERGE_DISABLED`), TheRundown names composed with mascot, paid settle falls back to the resolver. Existing duplicates are NOT merged automatically (owner-reviewed offline job). |
| NFL data currency | Every nflverse ingestion cron pinned to season 2025 for the whole 2026 season | Crons ask for the labelled season and fall back to the completed floor until nflverse publishes week 1; display surfaces keep the floor |
| Stale picks | 18 published picks from v5.0.0 on May lines waiting on Sept/Nov games | Excluded from the conviction gate; counted on the ops truth surface; supersede/void left to the owner |
| Pricing ladder | CLV beat-close rate hard-wired to null; phase evaluator never called | Real CLV counts wired (24.0% today); `pricingPhaseReadiness` published |
| Monitoring | `/api/health` stayed 200 through the settlement outage; watchdog red 5 days with no channel; `daily-truth` never scheduled; smoke scripts crying wolf | `?strict=1` mode for uptime monitors; daily-truth is the 22nd cron; smoke expectations fixed; launch checker built |
| Docs vs reality | Docs said PUBLIC_PICKS must not be flipped (it is on), Actions minutes unavailable (they run), pre-push "last gate" | Corrected with dates and evidence |
| Copy honesty | FAQ defined Edge Index as a win-probability-like rating with a loss rate; FAQ described a nonexistent "Eclipse Gate" grade; Parlay MRI sample legs unlabelled on screen | Fixed |
| NCAA settlement rights | henrygd fetched without clearance in the runner | Gated (fails closed) until the owner registers the source (HENRYGD-REG) |

## 2. What the owner must do (in order)

1. **Merge PR #684 and let the production build run.** The build gate applies the baseline
   migration once; the hourly settle cron then drains the backlog via the free fallback.
   Run `npm run launch:ready` after the deploy; settlement should read HEALTHY within two
   cycles. Anything still held shows up with a reason on `/api/cron/settle-picks?path=free`
   (`matchDebug`) and in the backfill's `unresolved`.
2. **The Odds API key.** The provider has rejected the key since 2026-08-24 15:05 UTC (odds
   fell over to TheRundown; scores fetch throwing). Renew or replace it in Vercel, or leave
   it absent so the whole path is free by design. With the fallback landed, either state is
   safe; a dead key just wastes one failing call per sport per hour.
3. **`HEALTH_ALERT_WEBHOOK_URL`** in Vercel production (Slack/Discord webhook) and point the
   external uptime monitor at `https://www.galaxysportsedge.com/api/health?strict=1`.
4. **Elite alerts**: set `RESEND_API_KEY`, `ALERTS_EMAIL_FROM`, the three VAPID vars, then
   `WATCHLIST_ALERTS_ENABLED=true`; verify with `npm run ops:alert-smoke -- --send --to you@…`.
5. **Decide NFL moneyline.** The live diagnostics flag `americanfootball_nfl|MONEYLINE` as
   significance-dead (preseason record 21–15 at 62 avg confidence; ranking resolution ≈ 0)
   and it is in the pause *plan* but not the applied set. Pause it for Week 1 (durable
   RANKING_PAUSE_APPLY, founder YES) or accept and disclose.
6. **Stale v5.0.0 picks (18)**: supersede or void from the owner queue before Sept 5/13
   kickoffs; the count is on `/api/ops/public-surface-truth → stalePendingPicks`.
7. **HENRYGD-REG**: register (or reject) the henrygd NCAA API in the rights registry to
   restore dual-source NCAA settlement.
8. **Duplicate-row cleanup**: after the identity fix is live and Week 1 has settled, run an
   owner-reviewed merge of the existing duplicate game rows (picks on all variants; do not
   auto-merge rows carrying published picks).
9. **CI blocking replay patch** (BASELINE-MIG), unchanged from earlier today.
10. **NEON-RO / CONN-PRUNE / PUSH-PROTECT / BRANCH-PROTECT** as listed in OPERATOR_TASKS.

## 3. What stays closed, on purpose

- PERFORMANCE_STATS, LIVE_BOARD, PUBLISH_LEDGER: calibration eligibility is RED (Brier 0.243
  vs 0.22, ECE 0.051 vs 0.05). No threshold was touched; the honest state is "collecting".
- MODEL_VERSION stays v5.2.7; no calibration activation before the sample clears the floors.
- Registry rows were not widened to make any test pass.

## 4. Known gaps not closed this session (ranked)

1. CFB totals have no free-tier fallback: the no-key signal slate only produces moneyline. If
   both odds keys fail on a Saturday, CFB totals silently drop to zero. Needs a totals
   estimator on the signal path or an explicit `totalsCoverage` flag.
2. Existing duplicate game rows (MLB 284, MLS 75, NFL 48, NCAAF 45 ESPN-id groups) remain
   until the owner-reviewed merge.
3. `refresh-player-stats` satellites (injuries, snaps, depth, NGS) never run on schedule
   (`mode=full` is manual); the scorer does not consume injuries today, so not a Week 1 blocker.
4. No preseason vs regular-season distinction in scoring (preseason is over; note for 2027).
5. Edge-lab kernel slots from LAUNCH_RUNBOOK §5 do not exist; the EDGE gate's own definition
   is unmet. Research work, not a launch-week code change.
6. `recommendStake` in prediction-engine is dead code that would diverge from real pick data
   if wired; delete or rewrite before any use.

## 5. Validation

Local: typecheck (22 workspaces) clean; lint clean; guardrails 26/26; lint:brand 3,685; the
targeted settlement, autonomy, health, truth, board, season-resolver and ingestion suites
green (numbers in each commit message); full apps/web suite run at session end.
CI: every guard job green on each push; the one Test-job failure (a test mock missing the new
export) was fixed in 46bcb31fa.
