# GSE handoff — 2026-09-20 Claude session

Written for an agent with **zero context**. Everything below is either measured
(command + output seen) or explicitly marked NOT VERIFIED. Nothing is inferred
and presented as fact.

Repo: `Beexly/Sports`. Branch used this session: `claude/modest-dirac-7skck3`.

---

## 0. READ THIS FIRST — five traps that cost this session real time

Each of these LOOKS like a bug and is not. Do not re-investigate them.

1. **`pricesWorseThanMarket` uses `expectedClv < 0`. Do NOT change it to `<= 0`.**
   `packages/prediction-engine/src/edge-engine.ts:220` sets
   `if (agreement === "CONTRADICTS" || dir <= 0) decision = "PASS"`, and `:201`
   gives CONTRADICTS a shrink multiplier of **0**. So a CONTRADICTS row is, by
   construction, `decision: "PASS"` with `expectedClv: 0` and possibly a
   POSITIVE rawEdge. `packages/types/src/index.ts:81-84` documents exactly zero
   as "no edge either way and is kept", and warns that inverting that asymmetry
   turns a parse bug into "a silent board wipe". Gating on `decision === "PASS"`
   has the same defect. A row at exactly 0 is not a violation.

2. **The board showing games that are not on today's ESPN scoreboard is NOT
   fixture corruption.** Those are real fixtures on FUTURE dates. Verified
   2026-09-20: five NFL rows on the board resolve to real Week 3 games playing
   2026-09-27. The real defect is board SCOPE (a day board carrying next week),
   which AGENTS.md already records. Check other dates before calling anything a
   phantom.

3. **`consensusPct` on spreads is a SIDE-agreement fraction, not a
   line-agreement fraction.** `packages/prediction-engine/src/scoring.ts:443-448`
   counts `spreads.filter((s) => s < 0)`. NFL books disagreeing on -3 vs -3.5
   cannot trip the 0.55 gate. The AGENTS.md framing suggesting otherwise is
   about the reasoning STRING, not the vote.

4. **`isPublishableSpreadLine` cannot block NFL.** `scoring.ts:1071` is
   `if (!isBaseballSport(sportKey)) return true`. It is a baseball run-line
   ladder check only.

5. **The market keys match.** Normalizer emits `"SPREADS"`/`"TOTALS"`
   (`packages/data-ingestion/src/normalizer.ts:105,119`), the scorers filter on
   `"SPREADS"`/`"TOTALS"` (`scoring.ts:413,785`), and the type is
   `"H2H" | "SPREADS" | "TOTALS"` (`packages/types/src/index.ts:353`). There is
   no plural/singular mismatch.

---

## 1. Current production state — measured 2026-09-20 ~16:30 UTC

Source: `https://www.galaxysportsedge.com/api/ops/public-surface-truth`

**Everything is already LIVE. No gate needs flipping.**

```
gates.canExposePublicPicks        true
gates.canExposePerformanceStats   true
gates.envPerformanceStatsEnabled  true
gates.statsPublic                 true
gates.calibrationPublished        true     (source "auto", autoPublish on)
pricingPhaseReadiness.currentPhaseId   PROVEN
revenueLadder.canHonestlyMonetizePublicTrackRecord  true
calibrationEligibility  GREEN, consecutiveGreen 3 / streakRequired 3
  n 527, brier 0.2033, ece 0.0451, eceDebiased 0.030051
  floors: n 100, brier 0.22, ece 0.05  (ALL PASS)
settlement.overduePending 0 ; stalePendingPicks 0 ; schedulerLiveness healthy
```

The surface's own hint: *"Auto-publish policy ON + eligibility GREEN —
performance path unattended. No founder click required."*

### The single blocker to ESTABLISHED

```
pricingPhaseReadiness.unmet  ["closing-line-value beat rate 23% vs 52% required"]
revenueLadder.blockersToNext ["CLV 23.4% < floor 52.4%"]
```

That number is wrong. See section 2.

---

## 2. PRIORITY 1 — the CLV denominator counts ties as losses

**This is the highest-value correctness item in the repo right now.**

### The measurement

```
clvPosture.gradedSampleSize   1677
clvPosture.beatCloseCount      393
clvPosture.matchedCloseCount   720     <-- 43% of the sample
clvPosture.lostToCloseCount    564
clvPosture.beatCloseRate       0.23434704830053668
```

`393 + 720 + 564 = 1677` exactly. `393 / 1677 = 0.23435` — the published rate.
`393 / (393 + 564) = 393 / 957 = 0.41067`.

### Why the ties do not belong in the denominator

`packages/prediction-engine/src/clv.ts`:

```ts
function verdictFromValue(value: number, epsilon: number): ClvVerdict {
  if (value > epsilon) return "BEAT_CLOSE";
  if (value < -epsilon) return "LOST_TO_CLOSE";
  return "MATCHED_CLOSE";
}
```

`MATCHED_CLOSE` is a **tie**, assigned when the delta is inside an explicit
epsilon (`DEFAULT_ML_EPSILON = 0.005`, `POINTS_EPSILON = 1e-9`). The module
comment says the epsilon exists "so trivial price wiggles read as MATCHED
rather than a beat/loss". It is NOT a missing-snapshot marker.

**Correction to a document you may be handed:** the "GSE Zero-Day" launch doc
claims MATCHED means the pipeline "failed to match a game against the final
closing snapshot at kickoff due to ingest failures". That is WRONG about the
mechanism. The doc's conclusion (the rate is deflated) is right for a different
reason: ties are in the denominator.

The repo already forbids this exact pattern for win rate —
`apps/web/lib/calibration/compute.ts` `resultToOutcome` docblock: *"counts a
push as half a win AND keeps it in the denominator, dragging every bucket
toward 50% ... Published rates are decided-only."* CLV does worse: it counts a
tie as a full zero.

### Gate safety — this is the part that matters

`apps/web/lib/performance/public-clv-policy.ts:25` holds
`const VIG_BREAK_EVEN = 0.524;`

- current 0.23435 vs 0.524 → FAIL
- corrected 0.41067 vs 0.524 → **STILL FAIL**

**The gate outcome does not change.** ESTABLISHED stays unmet. This is exactly
the scenario AGENTS.md law 3's founder amendment permits: an estimator may be
corrected when it is "derived, documented and tested, keeps every floor value
byte-identical, reports the raw number beside the corrected one, and is
recorded as a ledger row citing this amendment".

### What to build

Publish BOTH, per the amendment:
- `CLV_System` — `beat / (beat + matched + lost)` = 23.4% (unchanged, raw)
- `CLV_Decided` — `beat / (beat + lost)` = 41.1%, with the tie count stated

Requirements:
- **Do NOT move the 0.524 floor.** Ever.
- Report both numbers on the same surface so a reader can reproduce the
  arithmetic.
- State the tie count explicitly ("720 of 1677 graded picks tied the close").
- **Which number the gate reads is a founder decision.** The safe default is to
  leave the gate reading exactly what it reads today and add the decided-only
  figure as disclosure. That is zero gate risk.

### Surfaces that compute a beat rate (check each for the tie denominator)

```
apps/web/lib/tracker/clv.ts:159            rows.filter(r => r.beatClose).length / rows.length
apps/web/lib/intelligence/clv-calibration.ts:133   beatCloseCount / count
apps/web/lib/performance/clv-segments.ts:106       (beatCloseCount / n) * 100
apps/web/lib/performance/public-clv-policy.ts      (publish gate + copy)
apps/web/lib/autonomy/revenue-ladder.ts
apps/web/lib/pricing/phase-readiness.ts
packages/prediction-engine/src/ladder/reduce.ts
```

There are several independent restatements of the same arithmetic. The repo's
own pattern for this is to put the predicate in `@sports/types` and IMPORT it
everywhere (see `pricesWorseThanMarket`), because `@sports/types` survives the
partial `vi.mock` of `@sports/prediction-engine` that nineteen web test files
install. Do the same here rather than editing seven copies.

### Second CLV finding, not yet acted on

PR #867 measured **MLB TOTALS beat the close at 57.76% strict CLV (n=438,
Wilson [0.531, 0.624])** and concluded the pooled 23.2% is a mixing-markets
artifact — "edge is per-market; totals-first". A per-market CLV breakdown is
likely more honest than any pooled figure. NOT INDEPENDENTLY VERIFIED by this
session.

---

## 3. PRIORITY 2 — NFL publishes zero spreads and zero totals

### Measured (72h window, 2026-09-20)

```
americanfootball_nfl   15 games -> MONEYLINE 11, SPREAD 0, TOTAL 0
baseball_mlb           34 games -> MONEYLINE 21, SPREAD  6, TOTAL 10
```

Odds ARE flowing: `oddsInserting` lastSuccess 22 min prior, `withinRefreshSla
true`, `oddsInserted 776` for NFL, both `THE_ODDS_API_KEY` and `THERUNDOWN_API`
present.

Every published NFL pick sampled via `/api/picks?sport=NFL` was a HOME team
moneyline with `hasBookPrice: false` and `line: 0` — i.e. signal-slate rows with
no book behind them. Verified real vs ESPN: Bucs ML, Patriots ML, Ravens ML.

### What has been RULED OUT from source (do not re-check — see section 0)

consensusPct, `isPublishableSpreadLine`, market-key mismatch, and the
line-integrity guard (`scoring.ts:1130` reads
`LINE_INTEGRITY_PUBLISH_GUARD_ENABLED`, default OFF — note this is a DIFFERENT
variable from `LINE_INTEGRITY_VOID_ENABLED`; **founder should confirm the
PUBLISH_GUARD one is unset in Vercel**).

### What is still open

`scoreSpreadPick` has no sport-specific branch that can single out NFL, so this
is an INPUT SHAPE problem. It needs one database query, which no agent session
in this repo can run (law 7 forbids touching a database):

```sql
SELECT market, COUNT(*) AS rows,
       COUNT(DISTINCT bookmaker) AS books,
       COUNT(*) FILTER (WHERE "homeSpreadPrice" IS NOT NULL
                          AND "awaySpreadPrice" IS NOT NULL) AS both_priced
FROM odds o JOIN games g ON g.id = o."gameId"
WHERE g.sport = 'americanfootball_nfl'
  AND g."commenceTime" BETWEEN now() AND now() + interval '72 hours'
GROUP BY market;
```

- SPREADS/TOTALS rows = 0 → ingestion problem, do NOT touch `scoring.ts`
- rows exist but `both_priced` = 0 → normalizer problem (`normalizer.ts:111`)
- >= 2 books both-priced → genuinely a scoring gate; instrument the `return null`
  sites at `scoring.ts:432, 439, 448, 461, 474` with per-game counters

### Relevant structural facts (verified in source)

- The free fallback odds sources emit **h2h ONLY**:
  `packages/data-ingestion/src/espn-odds-client.ts:241,506` and
  `galaxy-kalshi-book.ts:105`. Only the paid Odds API path requests all three
  (`process-sport.ts:418`, `MARKETS = ["h2h","spreads","totals"]`).
  `process-sport.ts:400-420` skips the paid leg entirely when the payment
  circuit is open or `paidCallJustified` is false.
- The signal slate is **structurally moneyline-only**, not config-gated.
  `packages/ingestion-pipeline/src/generate-signal-slate.ts:499,615` hardcode
  `pickType: "MONEYLINE"`, and `IndependentMarketFairValue`
  (`packages/types/src/index.ts:436`) carries only a win probability — no margin
  distribution and no line. Emitting spreads needs a NEW contract, not a flag.
- `skellam_cover`, the only cover-probability producer, is sport-gated to
  soccer/hockey/baseball (`packages/prediction-engine/src/skellam.ts:135-140`),
  which EXCLUDES NFL. Consequence: the independentEdge / PASS veto is
  structurally unreachable for NFL spreads.

---

## 4. PRIORITY 3 — `main` CI is red on one job

`main` currently passes **11 of 12** CI jobs. The one failure is
`Test, type-check, lint, Prisma`, and within it only the step
`Run tests (all workspaces)`. `Lint` and `Type check` both pass in that same
job.

Evidence it is not code-related: it fails identically on documentation-only
commits (`4a50a04`, `d91c378` — CSVs and markdown only).

`npm run guardrails` passes **26/26** locally. The guardrail suite is not the
problem; find the failing workspace.

**Already fixed this session (do not re-investigate):** `Trust gate` and
`All guardrails` were also red. CI named the hits:

```
AGENTS.md:3064  [banned.lock]               "...server-side lock..."
AGENTS.md:3149  [banned.lock]               "...one server-side lock..."
AGENTS.md:3043  [banned.guaranteed-outcome] "guaranteed-valid structured outputs..."
```

The research notes used "lock" (banned betting slang) and "guaranteed-valid".
Both are now reworded on `main` and both jobs are green.

---

## 5. PRIORITY 4 — props cannot be stored

```prisma
enum PickType {
  SPREAD
  MONEYLINE
  TOTAL
}
```

There is **no `PROP`**. A prop pick cannot be stored, published, settled or
graded.

Meanwhile **31 hierarchical-Bayes prop models exist** in
`packages/prediction-engine/src/edge-lab/` (pass yards/TD, rush yards/attempts/
TD, receptions, rec TD, INTs, sacks, anytime TD, completions, aDOT/separation,
air/YAC, CPOE, snap exposure) plus `props-fire-gate`, `props-juice-floor`,
`props-line-shop`, `props-priced-edge`. They are exported from
`packages/prediction-engine/src/index.ts:1304-1336` and consumed by
`packages/quote-plane/src/pm-quote-gate.ts`, so they are wired, not orphaned.

To unblock, in order:
1. A migration adding `PROP` to `PickType`. **`schema.prisma` and
   `migrations/**` are frozen to agents by AGENTS.md law 2 — this is a human
   action.**
2. `EVENT_ODDS_INGEST_ENABLED=true` (`event-odds-ingest.ts:104`). Recorded as
   already ON; re-confirm.
3. Settlement and grading for prop outcomes. Nothing exists. A prop you can
   publish but cannot grade is worse than no prop, because it enters the track
   record ungraded.

This is multi-day work with a schema migration. It is not a flag flip.

---

## 6. What shipped this session

**Merged to `main`:**
- **#868** — bounded the odds-table recompute. An unbounded query pulling
  1,641,812 rows was OOM-killing `/api/ops/public-surface-truth`,
  `/api/cron/calibration-metrics` and `/api/cron/autonomy-cycle`. Dead since
  2026-09-13. Production verified back: HTTP 200, calibration GREEN.
  Basis moved `market_anchored_v4` -> `v5`, which restarted the calibration
  streak by design; it recovered to 3/3 within the session.
- **#866** — ranking basis census, Jackknife+ intervals, steam-curvature
  estimators. The only conflict was `AGENTS.md` (append vs append), resolved as
  a union keeping main's two trust-gate rewordings per law 9 — which is what
  fixed the two CI jobs in section 4.

**Open: PR #869** (`claude/modest-dirac-7skck3`), ready for review, CodeRabbit
"no actionable comments", Codacy 0 issues:
1. `todayBounds()` used the Node process zone (UTC on Vercel), so the board's
   "today" ended at 8:00pm ET and an NFL afternoon slate dropped out of the
   gated and scoring lanes mid-evening. Now uses `resolveSlateWindow`, the
   DST-correct Eastern helper `/api/picks` has used since 2026-09-05.
2. Three public surfaces labelled `confidence/100` as a forecast (axis
   "predicted", caption "the diagonal is perfect calibration", a stat reading
   "Expected 87%" beside "Observed 52%"). Live `confidenceTail` is
   **Brier 0.3616 at n 249** — worse than a constant 0.5 forecast, which scores
   0.25. All three relabelled to name it a score.
3. `brierRead()` returned "Better than a coin flip" for `brier <= 0.25`, but a
   constant 0.5 forecast scores EXACTLY 0.25, so the boundary claimed a win for
   a draw. Now strict `<`. Also removed "Confidence tracks outcomes closely",
   which asserts the one thing the repo has measured to be false.
4. `/api/v1/signals` and `/api/v1/probabilities` applied NEITHER
   adverse-edge suppression nor model-signal coherence, so rows the board and
   `/api/picks` suppress as adverse still shipped to B2B consumers. Both now
   filter, guard-before-cap.

Verification on that PR: tsc 0 errors in all 7 files; 1,655 tests across four
suites; trust-gate 2281 files; em-dash; api-v1-boundary; lint:brand 4033/4033.

---

## 7. Hard rules — breaking one discards the work

From `AGENTS.md`. These are not negotiable.

- **NEVER modify:** `packages/db/prisma/schema.prisma`, `migrations/**`,
  `.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`,
  `package-lock.json`, `.gitignore`, `.githooks/**`,
  `apps/web/lib/ai-control-plane/**`.
- **NEVER flip a gate or env flag.** Estimator corrections are permitted only
  under the founder amendment (floors byte-identical, raw reported beside
  corrected, ledger row citing the amendment).
- **NEVER weaken a guard to make a test pass.** Reword the source, not the
  guard. The trust-gate fix in section 4 is the model.
- **NEVER fabricate product data.** No mock picks, sample odds, placeholder win
  rates.
- **NEVER write a claim you did not observe.** Not run -> write NOT RUN.
  Failed -> paste the error.
- **NEVER touch a database**, install a package, or run a migration.
- The scanners read `AGENTS.md` too. A note that QUOTES a banned token trips the
  same rule. Describe the offending string, never reproduce it, and re-run
  `npm run guardrails` after editing `AGENTS.md`.

## 8. Verify block before every commit

```bash
npm run typecheck                  # exit 0, real exit code, never piped away
npm run lint                       # exit 0
npx vitest run <the task's test>   # green
npm run guardrails                 # 26/26
```

Known environment quirk: invoking vitest with `--root apps/web` from the repo
root makes tests that resolve paths from `process.cwd()` fail on ENOENT. Run
from `apps/web`. That is a harness artifact, not a real failure.
