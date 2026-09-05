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

**Decision record, 2026-09-05.** The founder delegated this call in-session ("make the
most intelligent and aggressive decisions for me"). Decision: **YES, sequenced.** Phase 2
(work package WP-1) starts only after PR #707 has deployed and the first NFL Sunday has
settled clean through the free-first path; nothing changes MODEL_VERSION before that. The
status line above stays PROPOSED until the implementer flips it to IMPLEMENTED with the
Phase 2 commit, so `model-freeze.mjs` keeps guarding the bump. The founder can veto by
editing this paragraph.

Publish, on every book-priced pick and for every tier, a **market-anchored win
probability**: the de-vigged consensus probability of the picked side, computed from the
two-way (or three-way) prices of every book in the snapshot with the Shin method per book
and the median across books (`packages/prediction-engine/src/market-read.ts`,
`consensusNoVig`, exported today and used only by edge-lab). Label it exactly:

> Market-implied win probability NN% (de-vigged consensus of N books at lock).

Keep `confidence` as what it is, a 0-100 **selection score**, rendered as "NN/100", never as
a percent, never called a probability. Signal-slate picks (no book behind them) show no
percentage at all until they carry a proof receipt (they already say "Independent estimate,
not a book price" since 31564d9).

Restate the public calibration claim to say precisely what it measures:

> The reliability curve we publish is the calibration of the displayed market-implied
> probability on our settled moneyline picks. Confidence is a ranking score and is not on
> this chart.

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

## 4. Phases

### Phase 0, shipped (bug fixes, no MODEL_VERSION change)

| Commit | What |
|---|---|
| 31564d9 | Signal slate never overwrites a book-priced moneyline pick; teaser carries no percentage |
| ef24e77 | Public picks route strips any probability from teaser text served without confidence |
| 67730a6 | Confidence tail splits by market (loader forwarded pickType) |
| 8a8f292 | Loaders read the receipt's lock-time marketFairProb when the factor breakdown lost it |

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
- `scoring.ts` (all three scorers): compute the picked side's fair from `consensusNoVig`
  over per-book two-way prices and persist it as `marketFairProb` with
  `marketFairMethod: "shin_consensus"`; keep the current proportional value in a separate
  field (`marketFairProportional`) for CLV continuity (`market-read.ts` methodTag /
  sameMethodOrRefuse). Widen the union at `packages/types/src/index.ts:96`.
- `pick-proof-receipt.ts`: pass `marketFairMethodTag` (already supported at :55-60) so a
  receipt verifier can tell which method produced the committed number.
- `constants.ts`: `MODEL_VERSION = "v5.2.8"`; this doc flips to `status: IMPLEMENTED` in the
  same commit (model-freeze requirement).

Ingestion (`packages/ingestion-pipeline`):
- `generate-signal-slate.ts`: stop writing `confidence = round(trueProb*100)`; write a
  labeled `independentEstimate` in the factor breakdown and a confidence derived from the
  same selection rules as book picks, so the PREMIUM threshold stops being a probability
  threshold. Remove the x1.12 display stretch from any persisted number (keep it, if wanted,
  on rankingP only).

Types and API (`packages/types`, `apps/web`):
- `PublicPick` gains `winProbability: { value, basis: "market_devig" | "independent_estimate", books, method } | null`.
- `/api/picks` maps it from `factorBreakdown.marketFairProb` when `bookmakerCount >= 2`,
  else `null` (never from confidence; FREE viewers get it too: it is public arithmetic).
- `/api/v1/probabilities`: rename `pModel` (today confidence/100) to `confidenceScore` or
  set it null; expose `marketFairProb` with its method (CAL-06).
- `lib/proof/load-proof-of-record.ts`: model-vs-market uses `independentEdge.trueProb`,
  never confidence/100 (CAL-07).

UI and copy (`apps/web/components`, `apps/web/app`):
- Pick card: "Market-implied win probability NN% (de-vigged, N books)" for all tiers;
  confidence stays "NN/100 selection score"; remove "calibrated" from the Edge Index copy
  (`components/home/annotated-sample-signal.tsx:35`) and from `value-gap.tsx:4` (CAL-08,
  CAL-11).
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
