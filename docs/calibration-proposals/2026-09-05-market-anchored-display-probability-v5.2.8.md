---
modelVersion: v5.2.8
status: PROPOSED
date: 2026-09-05
owner_decision_required: true
supersedes: none (v5.2.7 stays frozen until this is IMPLEMENTED by a founder YES)
---

# Market-anchored displayed win probability (v5.2.8)

**Status: PROPOSED.** This document is the complete design and acceptance bar for the
one change that makes the public probability surface honest and world-class at the same
time. It does not change MODEL_VERSION by itself: `scripts/guardrails/model-freeze.mjs`
accepts a bump only when a doc with `status: IMPLEMENTED` and this modelVersion exists,
and that flip is the founder's, after the decision in section 1. Phases 0 and 1 below are
already shipped on `claude/sports-prediction-launch-rtiexc`; Phase 2 is what a founder
YES unlocks.

Brand law applies throughout: the engine is deterministic statistical modeling; the number
proposed here is arithmetic on quoted prices that a reader can recompute by hand.

## 1. Decision (founder)

**Decision record, 2026-09-05 (revised 19:05 UTC).** The founder delegated this call
in-session. Decision: **YES, NOW.** Phase 2 (work package WP-1) starts immediately; it is
the PROVEN unlock, not a post-launch nicety. Measured on production at 19:05 UTC (read-only
SQL over settled MONEYLINE picks that carry a receipt): n 150, Brier 0.1692, Murphy REL
0.0050, ECE 0.0552 on ten equal-width bins. Three of the four floors already pass on the
market-anchored probability; ECE misses by 0.005 on 150 samples, and 610 more settled
moneyline picks have no receipt but can carry a publish-time market probability recomputed
from the append-only odds table (WP-28, zero writes). The eligibility streak is three
consecutive green runs (`CALIBRATION_ELIGIBILITY_STREAK`, default 3) of a cron that fires
every six hours, so GREEN is 12 to 18 hours after the probability source switches, sooner
if the founder triggers the cron by hand. The status line above stays PROPOSED until the
implementer flips it to IMPLEMENTED with the Phase 2 commit, so `model-freeze.mjs` keeps
guarding the bump. The founder can veto by editing this paragraph.

Publish, on every book-priced two-way moneyline pick and for every tier, a **market-anchored
win probability**: the number every receipt already carries. Verified 2026-09-05 against
the minting code (`packages/prediction-engine/src/scoring.ts` scoreMoneylinePick,
`process-sport.ts` receipt mint): each book's quoted price for each side is converted to an
implied probability, the implied probabilities are averaged across the books in the
snapshot, and the two-sided average is normalised to sum to one (proportional de-vig). It
is NOT the Shin-per-book median (`consensusNoVig`); no receipt carries that value, and a
receipt stores one immutable scalar, so the claim must describe what the receipts hold.
Label it exactly:

> Market-implied win probability NN%: every book's price for each side converted to an
> implied probability, averaged across the N books in the snapshot, normalised to sum to
> one, fixed at publish time in this pick's proof receipt.

Keep `confidence` as what it is, a 0-100 **selection score**, rendered as "NN/100", never as
a percent, never called a probability. Signal-slate picks (no book behind them) show no
percentage at all until they carry a proof receipt (they already say "Independent estimate,
not a book price" since 31564d9).

Restate the public calibration claim to say precisely what it measures:

> The reliability curve we publish is the calibration of that market-implied probability
> on our settled two-way moneyline picks: the average implied probability across books,
> normalised to remove the vig, fixed at publish time and committed to the pick's proof
> receipt, never recomputed. Confidence is a ranking score and is not on this chart.

Scope decision (2026-09-05, delegated): the pooled floors sample is two-way MONEYLINE only.
Spread and total picks carry cover probabilities near 0.5, whose Brier sits near 0.25 by
construction, so pooling them into a 0.22 Brier floor would make the floor unreachable
regardless of skill; their calibration is reported per market on the bake-off surface
instead. Three-way-sport moneylines are excluded structurally (the two-way de-vig drops the
draw mass; the engine does not publish them).

This is the posture ledger row C-28 asked the founder to choose ("either emit a genuine
modelProb or restate the calibration claim to say precisely what it measures"). It is the
second branch, done completely, plus the display change that makes the restated claim the
thing a customer actually sees.

## 2. Why this is the honest path and not a compression

- **It is the only probability in the system that clears the floors.** Live bake-off on
  2026-09-05 (public-surface-truth `provenPath.scoreBakeoff`): confidence Brier 0.2689 /
  ECE 0.116; independent trueProb 0.2593 / 0.1009; marketFairProb 0.234 / 0.053 with
  reliability 0.0046, and that pooled row still mixes spread and total rows whose Brier
  sits near 0.25 by construction (`docs/data/MARKET_CALIBRATION_2026-09-04.md`,
  uncertainty 0.2475). The closing-line moneyline corpus scores Brier 0.2106 on n=2,750.
- **The floors are not lowered.** Brier 0.22, ECE 0.05, Murphy reliability 0.05, n 100,
  streak 3: unchanged. What changes is that they are applied to the number we actually
  display, on the market where a probability claim is meaningful, and reported per market
  (Phase 1, `scoreBakeoffByMarket`).
- **It stops publishing a number that is measurably wrong.** The >= 80 confidence tail
  wins 43.7% while claiming 86.2% (n=167, inverted). Confidence must not be read as a
  probability by anyone; today PRO renders "NN/100" and FREE saw "@ 68%" in the teaser
  until ef24e77.
- **Nothing is fabricated.** Every displayed number is arithmetic on quoted prices that
  were captured at lock and committed to the immutable receipt (`PickProofReceipt`), so a
  customer can recompute it from the receipt payload.
- **The factor model keeps its job.** Which side we publish, its Edge Index, the factor
  trail and the ranking law are untouched. We stop pretending the selection score is a
  forecast; we do not stop selecting.

What this does NOT do: it does not claim an edge, a win rate, or a beat-close rate
(ledger C-32 forbids all three until measured); it does not open PERFORMANCE_STATS,
CALIBRATION_ADJUSTMENTS_ENABLED or any gate; it does not apply a fitted map; it does not
re-grade history.

## 3. Evidence (commands run 2026-09-05, outputs observed)

```
curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth
  calibrationEligibility: RED n=1166 brier=0.2466 ece=0.0573 murphy{res 0.007, rel 0.0059}
  confidenceTail: floor 80 n=167 wins=73 winRate=0.4371 claimedRate=0.8619 verdict=inverted
  provenPath.scoreBakeoff: confidence n=1590 brier=0.2689 ece=0.116
                           independent_trueProb n=973 brier=0.2593 ece=0.1009
                           marketFairProb n=408 brier=0.234 ece=0.053 rel=0.0046 coverage=0.34
```

Read-only SQL against the production database (SELECT only, precedent ledger C-62):

```
settled MONEYLINE picks (isPublished, !isBootstrap, WIN|LOSS): 738
  ... with a market fair in factorBreakdown:                      28  (3.8%)
  Brier of that fair on those 28: 0.2014 (base rate 0.714, uncertainty 0.2041)
MONEYLINE picks by writer, last 30 days:
  MLB  signal-slate rows (bookmakerCount 0): 258 W / 192 L / 4 pending;  book-priced: 13 W / 6 L
  NFL  signal-slate 19 W / 17 L;  book-priced 4 W / 2 pending
  NCAAF signal-slate 19 W / 2 L / 46 pending (all 46 written 15:54-16:05 UTC today); book-priced 2 W / 8 pending
```

The 3.8% is the mechanism, not the market: the signal slate overwrote book-priced rows
with `marketFairProb: null` every cycle (fixed in 31564d9), and the loaders never read the
receipt copy (fixed in 8a8f292). n=28 is far too small to state a Brier; the number above
is recorded as an observation, not a result.

## 3b. Evidence refresh (read-only SQL, 2026-09-13 19:30 UTC)

Section 3 recorded `confidenceTail ... n=167 winRate=0.4371 claimedRate=0.8619
verdict=inverted` and `marketFairProb n=408 brier=0.234 ece=0.053 coverage=0.34`. Both hold
on a much larger sample, and one structural fact is added that the section above does not
state. Population throughout: `isPublished`, not `isBootstrap`, `result` in (WIN, LOSS) so
pushes are never averaged in, `modelVersion <> 'founder-v1'`.

**1. `confidence` against outcomes, n 2,385.** The number `expectedFromConfidence`
(`apps/web/lib/calibration/compute.ts:260`) publishes as the forecast probability on
/calibration:

```
conf    n     claimed  realized   gap
50-54   483   0.5175   0.5280   +0.0105
55-59   312   0.5689   0.4968   -0.0721
60-64   456   0.6206   0.5702   -0.0504
65-69   443   0.6695   0.5305   -0.1390
70-74   294   0.7170   0.5918   -0.1252
75-79   192   0.7704   0.6146   -0.1558
80-84   104   0.8184   0.4423   -0.3761
85-89    73   0.8708   0.5479   -0.3229
90-94    28   0.9179   0.4643   -0.4536
```

Banded: conf 80+ reads n 235, claimed 0.8663, realized 0.5191, gap -0.3472, standard error
0.0326, **z = -10.7**. Conf 50-79 reads n 2,180, claimed 0.6265, realized 0.5491,
z = -7.3. The Brier score of confidence-as-probability on the 80+ band is **0.3617**. A
constant 0.5 forecast scores 0.25, so on its most confident picks this forecast is worse
than saying nothing.

**2. The structural fact, which is the reason this cannot be fixed by calibrating harder.**
`confidence` is not merely overstated, it is NOT MONOTONE in outcome: realized win rate
peaks around conf 75-79 at 0.6146 and falls to 0.4643 by conf 90-94, below the 0.5280 of
the lowest band. The display calibrator
(`packages/prediction-engine/src/calibration-apply.ts:70,80`) is isotonic regression
(PAVA), which is monotone non-decreasing BY CONSTRUCTION. It can flatten the top of a
curve; it can never invert one. So applying it to `confidence` converts a score inversion
into a stated win-probability inversion, and no amount of additional sample changes that.
The fix is not a better calibrator. It is to stop treating this number as a probability,
which is exactly what section 1 proposes.

**3. `rankingP`, for comparison, n 1,390.** Monotone and therefore calibratable:

```
rankingP     n     claimed  realized   gap
0.21-0.39    48    0.3209   0.4583   +0.1374
0.40-0.49    38    0.4559   0.5526   +0.0967
0.49-0.58   307    0.5348   0.5049   -0.0299
0.58-0.68   514    0.6339   0.5875   -0.0464
0.68-0.76   314    0.7138   0.5828   -0.1310
0.77-0.85   134    0.7960   0.6119   -0.1841
0.86-0.95    35    0.8934   0.8286   -0.0648
```

**4. `marketFairProb`, the number section 1 proposes publishing, n 622** (book-priced,
bookmakerCount >= 2):

```
marketFairProb   n    claimed  realized   gap      brier
0.30-0.40        73   0.3695   0.3014   -0.0681   0.2163
0.40-0.50       196   0.4682   0.4592   -0.0090   0.2475
0.50-0.60       247   0.5161   0.4980   -0.0181   0.2496
0.71-0.80        30   0.7563   0.7000   -0.0563   0.2004
0.81-0.90        26   0.8609   0.9231   +0.0622   0.0778
0.90-0.99        50   0.9399   0.8800   -0.0599   0.1047
```

Monotone, and every gap within 0.07. Against the same outcomes the three candidates rank
unambiguously: marketFairProb (monotone, tight), rankingP (monotone, over-confident in the
upper middle), confidence (inverted at the top). That is the proposal's thesis, measured on
15x the sample section 3 had.

**Honest limits.** The top marketFairProb bands are thin (26 and 50 rows) and the 0.60-0.71
band did not reach the 25-row floor, so it is absent rather than zero. This is a
retrospective sample over settled picks, not a forward test. Nothing here measures the Shin
consensus switch that Phase 2 also proposes; it measures the PROPORTIONAL value receipts
carry today, which is the number a reader can recompute. And this section changes no floor,
no gate and no status: `status:` above stays PROPOSED and `model-freeze.mjs` keeps guarding
the bump until a founder flips it.

## 3c. The Shin swap is measured, and it is not justified (2026-09-13)

Section 4's Phase 2 engine bullet was written before section 1 was revised at 19:05 UTC,
and the two contradict. Section 1 decides that the published number is the PROPORTIONAL
de-vig the receipts already carry, and says so explicitly ("It is NOT the Shin-per-book
median (`consensusNoVig`)"); the Phase 2 bullet says to recompute `marketFairProb` from
`consensusNoVig` and relabel it `shin_consensus`. Section 1 is the founder decision record
and it is later, so it governs — but the disagreement deserved a measurement rather than an
argument from ordering.

Both values are already persisted on every scored pick: `marketFairProb` (proportional) and
`marketFairShinProb` (Shin), the latter display-only since the de-vig honesty pass. So the
question is directly answerable on settled outcomes. Read-only SQL, 2026-09-13, population
`isPublished`, not `isBootstrap`, `result` in (WIN, LOSS), `modelVersion <> 'founder-v1'`,
`bookmakerCount >= 2`, both fields present:

```
pickType     n     realized  mean_prop  mean_shin  brier_prop  brier_shin  mean|gap|  max|gap|
ALL         621    0.5362    0.5443     0.5421     0.22259     0.22044     0.00844    0.56500
SPREAD      333    0.4655    0.4620     0.4603     0.23590     0.23584     0.00390    0.03264
TOTAL       186    0.5161    0.5252     0.5270     0.24500     0.24495     0.00181    0.02868
MONEYLINE   102    0.8039    0.8476     0.8371     0.13828     0.12547     0.03535    0.56500
```

Shin looks better on moneylines — 0.1255 against 0.1383 — and that reading does not survive
a paired test:

```
scope                n     mean paired Brier diff (prop - shin)    t
ALL                 621    +0.002151                             1.798
MONEYLINE           102    +0.012808                             1.797
MONEYLINE, |gap| <= 0.1   91    -0.001361                       -1.125
```

Neither figure reaches significance, and the whole moneyline advantage lives in the **11
rows where the two methods disagree by more than 10 percentage points** — degenerate or
wildly lopsided books, not a systematic favourite–longshot correction. Drop those 11 and
Shin is *slightly worse* than proportional. The 0.565 maximum gap is the signature of a
book the Shin solver should have refused, not of a better price.

**Decision: do not swap.** The published number stays proportional. This is also the only
number section 3b actually measured against outcomes (n 622, monotone, every gap within
0.07), the only one a reader can recompute from the receipt payload by hand, and the one
`market-read.ts`'s `sameMethodOrRefuse` CLV continuity already assumes. Swapping to an
unmeasured method while publishing a calibration claim derived from the measured one would
be precisely the failure this product exists to avoid.

What Phase 2 takes from that bullet instead is the part that was right regardless of the
method: **the receipt must name the method it used.** `MARKET_FAIR_METHOD_TAG =
"proportional_devig_v1"` is now committed with every new receipt, so a verifier compares
like with like and a future swap is detectable rather than silent.

### Why MODEL_VERSION stays v5.2.7

The bump in the Phase 2 bullet was a consequence of the Shin swap. With no swap, **no
scoring path changes**: selection, line, confidence, edgeScore, rankingP, marketFairProb and
every factor weight are byte-identical. Phase 2 as built is display, API shape, receipt
metadata and copy.

Bumping anyway would cost something real. The PROVEN/ESTABLISHED gate reads a
**deployed-version slice** (C-292): v5.2.8 would start at n 0 and could not clear the n 100
floor for weeks, deferring the exact milestone this proposal exists to unlock — in exchange
for a version label that describes no change in the math. `model-freeze.mjs` requires an
`IMPLEMENTED` doc *to permit* a bump; it does not require one to happen. So `status:` below
stays PROPOSED for the Shin/ingestion work that is still unbuilt, and the freeze guard stays
green on v5.2.7.

### Deferred from Phase 2, and why

- **`generate-signal-slate.ts` confidence rework.** The bullet says "a confidence derived
  from the same selection rules as book picks" without naming those rules, and a signal-slate
  row has no book price to derive them from. It also changes which rows land PREMIUM (the
  threshold is confidence 70), so it is a live tier change on a path AGENTS.md already
  records as not carrying information (six NFL model-signal picks on 2026-09-13, six home
  teams, three on the identical consensusPct 0.6036). That needs its own measurement and its
  own proposal, not a paragraph in this one. Until then the honest mitigation already holds:
  signal-slate rows publish NO probability at all.
- **Shin as the committed fair.** Measured above; not justified.

## 4. Phases

### Phase 0, shipped (bug fixes, no MODEL_VERSION change)

| Commit | What |
|---|---|
| 31564d9 | Signal slate never overwrites a book-priced moneyline pick; teaser carries no percentage |
| ef24e77 | Public picks route strips any probability from teaser text served without confidence |
| 67730a6 | Confidence tail splits by market (loader forwarded pickType) |
| 8a8f292 | Loaders read the receipt's publish-time marketFairProb when the factor breakdown lost it |

### Phase 1, shipped (claim restatement, no MODEL_VERSION change)

| Commit | What |
|---|---|
| 8a8f292 | Operator note now states the real p hierarchy; SPREAD/TOTAL never scored on confidence/100 |
| (this branch) | `provenPath.scoreBakeoffByMarket`: every score kind reported per market with within-market coverage |

After the next `calibration-metrics` cron and proven-path rebuild in production, the truth
surface will show `marketFairProb|MONEYLINE` on its own row with coverage that reflects
receipts. That row, not the pooled one, is the number section 1 is about. Read it before
deciding; if it does not clear Brier 0.22 on n >= 100, section 1 still holds (the displayed
number is still the honest one) but the copy must say "not yet at our floor".

### Phase 2, proposed (MODEL_VERSION v5.2.7 to v5.2.8)

Engine (`packages/prediction-engine`):
- ~~`scoring.ts` (all three scorers): recompute the fair from `consensusNoVig` and persist it
  as `marketFairProb` with `marketFairMethod: "shin_consensus"`.~~ **WITHDRAWN — see section
  3c.** Measured on 621 settled book-priced picks, the swap is not supported (paired Brier
  difference +0.0022, t = 1.80; the entire moneyline advantage comes from 11 pathological
  books, and excluding them Shin is worse). It also contradicts section 1, which is the
  founder decision record and is later. The published fair stays proportional; `scoring.ts`
  is untouched.
- **DONE** `pick-proof-receipt.ts`: `MARKET_FAIR_METHOD_TAG = "proportional_devig_v1"` is
  committed with every receipt minted from `process-sport.ts`, so a verifier can tell which
  method produced the committed number instead of assuming one. Additive — an older receipt
  still verifies against its own payload, where an absent tag commits as "none".
- ~~`constants.ts`: `MODEL_VERSION = "v5.2.8"`.~~ **NOT BUMPED — see section 3c.** The bump
  was a consequence of the withdrawn swap; no scoring path changes, and a gratuitous bump
  resets the deployed-version calibration slice to n 0 and defers PROVEN.

Ingestion (`packages/ingestion-pipeline`):
- `generate-signal-slate.ts`: stop writing `confidence = round(trueProb*100)`; write a
  labeled `independentEstimate` in the factor breakdown and a confidence derived from the
  same selection rules as book picks, so the PREMIUM threshold stops being a probability
  threshold. Remove the x1.12 display stretch from any persisted number (keep it, if wanted,
  on rankingP only).

Types and API (`packages/types`, `apps/web`):
- **DONE** `PublicPick` gains `winProbability: { value, basis: "market_devig" |
  "independent_estimate", books, method } | null`. `independent_estimate` is reserved and
  NEVER emitted (a test pins it): no estimator here has been shown to carry information at
  publish time, and a labeled guess is still a guess.
- **DONE** `/api/picks` maps it when `bookmakerCount >= 2`, else omits the key — **for every
  tier**, never from confidence. Source is the immutable **receipt**, not `factorBreakdown`,
  which a refresh cycle can rewrite; `N` is the mint-time snapshot count. Phase 1's
  `canSeeConfidence` gate is removed and `resolveMarketImplied` no longer takes a viewer at
  all, so it cannot be re-gated silently. Confidence, `confidenceCalibrated` and the factor
  trail stay paid; the Edge Index was already free by separate design.
- **DONE** `/api/v1/probabilities`: `pModel` is retired and pinned to `null` (kept so no
  integrator breaks on a missing key, valueless so none can read a wrong number); the score
  ships as `confidenceScore` on its own 0-100 scale; `marketFairMethod` names the de-vig
  (CAL-06).
- **ALREADY DONE** `lib/proof/load-proof-of-record.ts`: `modelVsMarketPp` is already pinned
  to `null` with the reasoning in place. Verified, not re-fixed (CAL-07).

UI and copy (`apps/web/components`, `apps/web/app`):
- **DONE** Pick card renders the verified label for all tiers; confidence stays "NN/100".
  `annotated-sample-signal.tsx` was already clean (CAL-08 done earlier); `value-gap.tsx:4`
  no longer calls the ranking probability "calibrated" (CAL-11).
- **OPEN** `/calibration` and `/methodology` restatement, and the
  `CONFIDENCE_DISPLAY_MODE` wiring (CAL-10).
- `/calibration` and `/methodology`: the restated claim from section 1, plus the per-market
  table from `scoreBakeoffByMarket`.
- Wire `CONFIDENCE_DISPLAY_MODE` (default "labels") into the confidence badge so the raw
  score has an honesty boundary (CAL-10).

Tests to update or add: `scoring.test.ts` (tier split, marketFairProb + receipt),
`devig-method-honesty.test.ts` (pins `marketFairMethod === "proportional"` today),
`market-read.test.ts`, `pick-proof-receipt.test.ts`, `ranking-prob.test.ts`,
`live-calibration-p.test.ts`, `proven-path-engine.test.ts`, `picks-paywall-copy-truth.test.ts`,
`home-signal-anatomy.test.tsx`, plus a new `public-win-probability.test.ts` asserting FREE
and PRO both receive `winProbability` and neither receives confidence as a percent.

Acceptance (all must hold before `status: IMPLEMENTED`):

```
node scripts/guardrails/model-freeze.mjs                      # exit 0 with the IMPLEMENTED doc
npm run typecheck && npm run lint && npm run lint:brand        # exit 0
cd packages/prediction-engine && npx vitest run                # green
cd apps/web && npx vitest run __tests__/public-win-probability.test.ts __tests__/picks-paywall-copy-truth.test.ts
curl -sS https://www.galaxysportsedge.com/api/picks | jq '[.data[] | select(.winProbability != null)] | length'   # > 0 after deploy
curl -sS https://www.galaxysportsedge.com/api/picks | jq -r '.data[].reasoning' | grep -Ec '[0-9]+ ?%'             # 0 for anonymous
```

## 5. What could break, and the guard for each

| Risk | Guard |
|---|---|
| Receipt column-vs-payload verification (`receipt-proof.ts:84-95`) if the fair method changes without a tag | Method tag in the receipt; verifier compares like with like |
| CLV baseline continuity if the fair method changes mid-season | CLV keeps grading on the proportional field; the Shin number is display and calibration only |
| Selective edge filter semantics (`selective-publish.ts:70-73`) if marketP scale shifts | Filter reads the proportional field until re-tuned in a separate proposal |
| Brand lint on new copy | `npm run lint:brand` and `scripts/guardrails/trust-gate.mjs` in the verify block |
| Public confusion between "win probability" and "confidence" | Never render confidence with a percent sign anywhere; tests pin it |

## 6. Gates still OFF after Phase 2

`CALIBRATION_ADJUSTMENTS_ENABLED`, `CALIBRATION_AUTO_PUBLISH`, `PERFORMANCE_STATS_ENABLED`,
`LIVE_BOARD`, `PUBLISH_LEDGER`, `RANKING_PAUSE_APPLY` default: all unchanged. Floors:
unchanged. The PROVEN ladder step still requires eligibility GREEN x3 plus a published
calibration; this proposal makes that measurement honest, it does not grant it.
