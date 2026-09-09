# NCAAF MONEYLINE gap trace — DESIGN vs DEFECT (2026-09-09)

Handoff observation: the live truth surface `marketCoverage` read NCAAF 5 games,
MONEYLINE 0, SPREAD 4, TOTAL 2 at 23:25 UTC on 2026-09-08. This traces the cause.

## What was checked

1. **`packages/prediction-engine/src/scoring.ts:937-965` (`scoreMoneylinePick`).**
   A book-priced MONEYLINE requires `MIN_BOOKMAKERS` priced books on both sides
   AND a de-vigged fair probability for the favoured side of **at least 0.58**
   ("Need strong conviction on ML — higher threshold", line 964-965). SPREAD and
   TOTAL use a different, lower gate: a consensus **vote** across books reaching
   `WEIGHTS.CONSENSUS_MIN_PCT` (0.55, per the market-coverage hint text added in
   PR #725/`claude/launch-nfl-week1-coverage`), not a probability magnitude. A
   0.58 win-probability floor is a real bar: on a slate of competitive games
   (which most FBS matchups are, outside ranked-vs-unranked mismatches), zero
   games clearing it while several clear the lower, differently-shaped
   SPREAD/TOTAL gates is an expected outcome of the gate design, not evidence of
   a defect.

2. **Re-measured the live truth surface just now (2026-09-09 00:00:11 UTC),
   ~35 minutes after the reported snapshot:** NCAAF now reads 9 games,
   MONEYLINE 3 / SPREAD 6 / TOTAL 4, all three markets `"covered"`. The
   `marketCoverage` window is a rolling 72-hour window recomputed on every
   request (`apps/web/lib/board/market-coverage.ts:150-181`, `to = now +
   windowHours`), and picks are written on a cron cadence (not synchronously
   with the window query), so a snapshot at one instant legitimately differs
   from one 35 minutes later as more games enter the window and more publish
   cycles run. The 0-MONEYLINE reading was not persistent.

3. **Conclusion: DESIGN, not a code defect.** The combination of (a) a
   genuinely stricter probability-based gate for MONEYLINE than for SPREAD/
   TOTAL, and (b) a rolling-window/cron-cadence artifact that resolved within
   the hour, fully accounts for the observed "5 games, 0 MONEYLINE" reading. No
   change was made to the scorer, its thresholds, or MIN_BOOKMAKERS (rule 9:
   never weaken a guard; these floors are frozen under MODEL_VERSION).

## The hint-honesty defect that *is* real, and why it was not re-fixed here

`apps/web/lib/board/market-coverage.ts:58-68` (as it stands on `origin/main`,
pre-PR-#725) hard-codes a TOTAL-market hint for `FOOTBALL_SPORTS =
{americanfootball_nfl, americanfootball_ncaaf}` that asserts a specific,
unobserved cause: *"Known cause: the zero-key signal slate is moneyline-only
and ESPN's single-bookmaker odds fail MIN_BOOKMAKERS=2, so totals need a live
odds feed (THE_ODDS_API_KEY or TheRundown)."* The classifier that emits this
hint reads only pick and game counts (`MarketCoverageInput` at line 47-50) —
it cannot see whether a key is present or a feed is flowing, so this text
asserts a fact it cannot verify. That applies identically whether the sport is
NFL or NCAAF, since both share the same `FOOTBALL_SPORTS` branch.

**This defect is already fixed, generically, on an unmerged sibling branch:**
`claude/launch-nfl-week1-coverage` (PR #725), commit `84f8a2b490`
("fix(ops): marketCoverage hints name the scorer gates instead of blaming a
key they cannot see (C-261)"). That commit replaces the sport-specific
`FOOTBALL_SPORTS` branch with a `switch` over `market` that names the real
scorer gates (`MIN_BOOKMAKERS`, the vote floor, `MIN_PUBLISH_CONFIDENCE`, and
for MONEYLINE the same 0.58 fair-probability floor traced above) for **every**
sport, not just football — so merging it resolves NCAAF's hint honesty too,
with no NCAAF-specific carve-out needed.

**Why this doc does not re-implement that fix:** `apps/web/__tests__/
market-coverage.test.ts:13-37` currently pins the exact `FOOTBALL_SPORTS`
TOTAL hint text (including the literal `MIN_BOOKMAKERS=2` and `degraded, not
broken` substrings) as intentional, documented behavior for NCAAF ("the
zero-key gap"). Re-deriving the same generalized fix independently here would
(a) duplicate work already complete and reviewed on PR #725, (b) directly
conflict with that PR's diff to the same lines when it merges, and (c)
override the currently-pinned test without the full context PR #725's own
test suite carries (it replaces this exact test with its own honesty
assertions). The smaller, correct action is to flag this for merge-order
coordination rather than fork the fix: **whoever merges PR #725 gets NCAAF's
honest hint for free; no other agent should touch `market-coverage.ts`'s
`hintFor`/`FOOTBALL_SPORTS` before that lands.**

## What was labeled instead (Step 4, same investigation)

The MONEYLINE-floor finding above (0.58, materially stricter than SPREAD/
TOTAL) and the NCAAF calibration stratum's thin-sample status are documented
together with the calibration honesty fix — see the ledger entry for this
row and `apps/web/lib/calibration/metric-slices.ts`'s new `smallSample` field.

## Sources

- `packages/prediction-engine/src/scoring.ts:937-965`
- `apps/web/lib/board/market-coverage.ts` (this checkout, `origin/main`)
- `https://www.galaxysportsedge.com/api/ops/public-surface-truth`, fetched
  2026-09-09 00:00:11 UTC (saved snapshot referenced above)
- `origin/claude/launch-nfl-week1-coverage` commit `84f8a2b490` and
  `apps/web/__tests__/market-coverage.test.ts` (this checkout)
