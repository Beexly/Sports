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

6. **NFL spread and total odds ARE being ingested.** Measured 2026-09-20:
   79,526 SPREADS rows and 79,707 TOTALS rows, 11 books, 15 games, 100%
   both-sides priced, fetched fresh that day. Any hypothesis built on "the
   odds are missing" or "the paid leg is not running" is refuted by
   measurement. The zero-published-picks symptom is a PUBLISH-layer deadlock;
   see section 3.

### A method note worth keeping

Four of the five traps above were found by reading source, and the source
readings were all correct. The ingestion hypothesis built on top of them was
still wrong, because the code path being *reachable* says nothing about
whether it *ran*. Source reading establishes what CAN happen; only a
measurement establishes what DID. When those two disagree, the measurement
wins.

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

### SOLVED AND FIXED by Hermes, 2026-09-20. Root cause below. Fix awaiting merge.

**An earlier draft of this handoff blamed ingestion. That was WRONG and is
corrected here.** Hermes ran the diagnostic query against production
(read-only, isolated Neon snapshot, since deleted) and measured:

```
SPREADS  79,526 rows | 11 books | 15 games | 100% both-sides priced
TOTALS   79,707 rows | 11 books | 15 games | 100% both-sides priced
All three markets fetched fresh 2026-09-20 20:02:28Z from oddsapi rows.
```

**The paid leg IS running. The odds ARE ingested. The scorer DOES produce the
picks:** 15 SPREAD + 15 TOTAL rows exist with confidence 50-100, consensus
0.667-1.0, and 6-11 books each. None of the three publish gates kills anything.

### The actual root cause — a publish-layer deadlock

All 30 rows carry `isPublished = false`, and three things combine to make that
permanent:

1. The **stale-pick policy** unpublished them (founder decision 2026-09-05:
   unpublish, never restore).
2. The refresh loop **updates confidence in place but never re-publishes**.
3. The **unique `(gameId, pickType)` constraint** means a fresh mint can never
   take the slot.

Net effect: 30 invisible rows, `picks_touched: 0` across all 10 successful NFL
runs in the preceding 24h, and **no new book-path pick since 2026-09-14**.

### The fix (shipped, needs merge)

Commit `cca14d22a` on `origin/hermes/lane-bc-20260920`, 5 files.

When the slot is held by a PENDING + unpublished row, the write loop now voids
it through the settlement outbox under a new RCA code
`STALE_UNPUBLISHED_SUPERSEDED` (same event shape as the zero-sit void these
rows were headed for at kickoff+24h anyway) and mints a fresh, fully-gated pick
with a new CLV lock.

Published rows are never touched: the side-flip freeze and write-once bet terms
stay intact, with tests pinning all four branches. Verified by Hermes: repo
typecheck exit 0, helper 2/2, process-sport 89/89, apps/web RCA 22/22.

First post-deploy cycle should void the 30 and mint fresh published
spreads/totals.

### Consequence that is now LAUNCH-CRITICAL

After this fix, **NFL spreads and totals depend on the paid Odds API leg**,
because the keyless path is h2h-only. So the credit burn in section 5 stops
being a Week 4 problem:

- 5,477 credits remaining, daily budget 600, `paceOk: false`
- projected exhaustion **2026-09-29**
- mitigation path already exists: `packages/data-ingestion/src/rundown-client.ts:298`
  has `v2MarketKey` mapping spreads and totals, and Rundown is the registered
  fallback. Verify whether it is wired into the NFL path.

### Corrections to earlier claims in this repo's notes

- **Fixture triplication is 2x, not 3x.** Measured: 30 `games` rows for 15
  fixtures, with the odds on the odds-api twin. AGENTS.md's "three rows per
  fixture" note is stale.
- The four source-level hypotheses in section 0 were all correct as *code
  readings*; the ingestion premise built on top of them was operationally
  stale. Keep the section 0 entries, discard any conclusion that NFL
  spread/total odds are missing.

### Structural facts still worth knowing (verified in source)

- The free fallback odds sources emit **h2h ONLY**:
  `packages/data-ingestion/src/espn-odds-client.ts:241,506` and
  `galaxy-kalshi-book.ts:105`. Only the paid Odds API path requests all three
  (`process-sport.ts:418`, `MARKETS = ["h2h","spreads","totals"]`). This is why
  the credit risk above is now load-bearing.
- The signal slate is **structurally moneyline-only**, not config-gated.
  `packages/ingestion-pipeline/src/generate-signal-slate.ts:499,615` hardcode
  `pickType: "MONEYLINE"`, and `IndependentMarketFairValue`
  (`packages/types/src/index.ts:436`) carries only a win probability — no margin
  distribution and no line. Emitting spreads needs a NEW contract, not a flag.
- `skellam_cover`, the only cover-probability producer, is sport-gated to
  soccer/hockey/baseball (`packages/prediction-engine/src/skellam.ts:135-140`),
  which EXCLUDES NFL. Consequence: the independentEdge / PASS veto is
  structurally unreachable for NFL spreads, so those 30 newly-published rows
  will carry no adverse-edge veto. Watch them.

### Known blocker on the shared lint gate (not owned by this lane)

Untracked file `apps/web/lib/ops/waitUntil.ts:22` fails eslint: it disables
`no-var-requires` but the firing rule is `no-require-imports`. One-line
disable-comment fix. The file is untracked and absent from this session's
working tree, so whoever owns that checkout must fix it.

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

---

## 9. POST-MERGE PRODUCTION READ, 2026-09-20 20:47-21:00 UTC

Measured against live production over public HTTP only. No database access, no
secret, no write. Every number below came from `/api/ops/public-surface-truth`,
`/api/board/state`, `/api/picks`, or ESPN's public scoreboard, and each claim
says which.

### 9.1 What the merges actually did

- **Deployed SHA is `4e140dd02`** (`deployment.sha` on the truth surface), which
  carries #870, the mint-side supersede
  (`packages/ingestion-pipeline/src/supersede-unpublished-pick.ts`). **That
  closes PRIORITY 2 of section 4.** The publish deadlock is fixed upstream and
  the 322-file draft PR #871 is superseded; nothing needs cherry-picking from
  it.
- **PRIORITY 1 is merged** as #872 (`98b88ca86`), not yet deployed at the time
  of this read. It puts one shared `computeClvPushDoctrineRates` in
  `@sports/types` and reports all three CLV denominators side by side.
- **The line-archive freshness monitor is WIRED**, which section 4 recorded as
  TESTED AND UNWIRED. `oddsLineArchiveFreshness` is on the truth surface and
  reads `healthy`, 17 minutes old, 3,601 rows in the recent window.

### 9.2 The live CLV numbers reconcile exactly with #872's arithmetic

`clvPosture`, read 20:47:30Z: graded 1,679 = beat 393 / matched 722 / lost 564.

| reading | value |
|---|---|
| all-graded, `393 / 1679` (what the surface publishes today) | 0.2341 |
| decided-only, `393 / 957` | 0.4107 |
| push rate, `722 / 1679` | 0.4300 |

Neither beat reading approaches the ESTABLISHED 0.524 floor, so #872 moves no
gate verdict, exactly as its description claims. Note the sample has grown since
the 2026-09-19 measurement pinned in the tests (1,587 graded); the tests pin the
arithmetic against fixed counts, not against the live sample, so they do not go
stale as rows settle.

### 9.3 OPEN AND SEVERE: the NFL lane shows NEXT Sunday's fixtures as today's

Four NFL rows sit in the board's `publishedToday` lane: **Arizona Cardinals @
San Francisco 49ers · Houston Texans @ Indianapolis Colts · Carolina Panthers @
Cleveland Browns · Minnesota Vikings @ Tampa Bay Buccaneers**, every one at
`edgeIndex` 26 with `confidence` null (model-signal moneylines).

**All four of those matchups are on ESPN's 2026-09-27 schedule. None is on
2026-09-20.** Checked directly against
`site.api.espn.com/.../nfl/scoreboard?dates=20260920` (14 events) and
`dates=20260927` (14 events). Four out of four is not coincidence: random
fixture cross-linking does not reproduce four real future matchups verbatim.

That lane is query-bounded to today. `state.ts:751-752` filters on
`gameInSlateWindow(slate)`, which is `commenceTime >= start AND < end` for the
Eastern calendar day (`lib/picks/slate-window.ts`). So for those rows to appear,
**our own `games.commenceTime` must place them inside today**, and `/api/picks`
confirms it: the Buccaneers row reads `2026-09-20T17:02:40.000Z` and the Cowboys
row `2026-09-20T20:25:36.000Z`.

Those timestamps are the second piece of evidence. Real NFL kickoffs land on
`:00:00`, `:05:00`, `:20:00`, `:25:00`. `17:02:40` and `20:25:36` are off-grid by
seconds, which is what a synthesized timestamp looks like, not a sourced one.
For contrast, the rows that are correctly dated carry clean times: querying
`/api/picks?sport=NFL&date=2026-09-27` returns **Detroit Lions -7.0 (SPREAD)**
and **OVER 48.0 (TOTAL)** at `2026-09-27T17:00:00.000Z`, which matches ESPN's
NYJ @ DET 17:00Z exactly.

**Stated at its real strength.** MEASURED: the four matchups, their presence in
the today-bounded lane, the two off-grid `commenceTime` values, the clean
`commenceTime` on the 9/27 rows, and the ESPN schedule for both days. INFERRED:
that the cause is fixture dating stamping next week's games about seven days
early. I could not read the `games` table (law 7), so the mechanism is an
inference from the public surface, not an observation.

**Two things this finding is NOT**, both because this session already got one of
them wrong today and the correction belongs next to the claim:

- It is **not** the phantom-fixture alarm raised earlier in this session and
  retracted. These fixtures are real; their date is what disagrees.
- It is **not** the horizon-scope defect AGENTS.md records ("a day board should
  not carry January"). **A horizon bound would not catch these rows**, because
  by their stored `commenceTime` they are already inside today. Bounding the
  board would hide the symptom and leave the wrong date in the row that gets
  graded.

**Do not patch this from the board side.** The fix is upstream in fixture
dating, and it needs a database read this session may not make.

### 9.4 Also open: tomorrow's only NFL game has no pick

`/api/picks?sport=NFL&date=2026-09-21` returns `totalAvailableToday: 0`. The
2026-09-21 Eastern slate has exactly one game, NYG @ LAR
(`2026-09-22T00:15Z` = 8:15pm ET Monday). Nothing is published on it in any
market.

Tonight's IND @ KC (`2026-09-21T00:20Z` = 8:20pm ET, inside the **2026-09-20**
Eastern slate) is inside today's `totalAvailableToday: 11`, but the FREE tier
caps the response at 2 rows, so this read cannot confirm which of the 11 it is.
A `:premium`-scoped read of `/api/v1/signals` would settle it.

### 9.5 Unchanged and still open

`oddsInserting.dualPath.credits` reads remaining 5,341 / used 14,659, `paceOk:
false`, projected exhaustion **2026-09-29T11:27Z** on a linear unthrottled
basis. Now that NFL spreads and totals depend on the paid leg, that date is a
launch constraint and not just a bill. Founder-only.

### 9.6 Where §9.3 is NOT, so nobody re-treads it

The obvious suspect for a cross-week fixture mix-up is the identity matcher, and
it is **ruled out by source**. `packages/ingestion-pipeline/src/game-identity.ts`
matches an incoming probe to an existing row only inside
`commenceMatchMsFor(sportKey)`, which is `GAME_IDENTITY_COMMENCE_MATCH_MS` = **18
hours** for everything except baseball, and only when the **team pair matches
order-insensitively**. An 18-hour window cannot span seven days, and a MIN @ TB
probe can only ever twin with another MIN @ TB row. The matcher also fails
closed: it returns null on a tie, on an ambiguous prefix match, and on an
orientation conflict, which it logs rather than merging.

So the wrong `commenceTime` is not created by merging. It is either supplied by
the source for those four fixtures or assigned at fixture creation. That is
where the next pass should start: `seed-games-from-espn.ts`, `normalizer.ts`
(`new Date(event.commence_time)`), and whichever provider supplied these four
rows.

One honest limit on §9.3's evidence: the ESPN scoreboard endpoint is queried per
day and can return a week's events. Both queries came back with a coherent
single-day slate (14 events on 2026-09-20 running 17:00Z to 00:20Z, 14 on
2026-09-27 running 17:00Z to 00:20Z), and the operative measurement does not
depend on that detail either way: the four matchups appear in the 9/27 response
and are absent from the 9/20 one.
