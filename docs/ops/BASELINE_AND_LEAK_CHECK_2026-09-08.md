# Baseline and leak check — does the engine beat the market, and is it seeing the future?

2026-09-08. Read-only SELECT against production (`gse-postgres`), no writes. Every
number below was computed by the queries recorded here, not quoted from a prior doc.

Two questions, in the order that matters:

1. **Is the model secretly seeing the future?** A model with leakage looks brilliant
   in testing and dies on Sunday.
2. **Does it beat the dumbest thing that could possibly work?** Most models people are
   proud of never beat a simple baseline, and they never find out because they never
   check.

---

## 1. Leakage: the number the PROVEN gate rests on is clean

`apps/web/lib/calibration/publish-time-market-p.ts:150` — `latestH2hRowPerBookmaker`
filters `fetchedAt <= asOf` where `asOf` is **each pick's own `generatedAt`**. The
batch query in the loader bounds by the *latest* `generatedAt` in the batch, but that
is only a fetch superset; the per-pick resolution re-applies the pick's own bound.

So the market-anchored probability that the entire calibration gate is computed from
is genuinely publish-time bounded. **This was the single highest-stakes leakage
question in the product and it is clean.** Verified by reading the code, not inferred.

The wider leak sweep across the game-row fields, the snapshot boundary, the backtest
split and the season-long aggregates is a separate audit and is not summarised here.

---

## 2. The baseline: measured, not asserted

Population: settled, published, non-bootstrap, non-seed MONEYLINE picks whose signal
snapshot is `eligibleForLearning`, joined to the odds table with the **publish-time
bound applied** (latest H2H row per bookmaker with `fetchedAt <= generatedAt`), then
de-vigged proportionally and read on the side the pick actually took.

`n = 565` of 871 eligible settled moneylines resolve to at least one real book at
publish time (avg 5.24 books per pick). The 306 that do not resolve are not scored
here and nothing below should be extrapolated onto them.

### The headline hit rate is almost entirely the market

| | value |
|---|---|
| model hit rate | **67.79%** |
| mean de-vigged market probability on the same picks | **65.60%** |
| edge over the market | **+2.19 pp** |
| standard error | 1.88 pp |
| **t** | **1.17** |

A 68% hit rate reads like a strong result. It is not, on its own: the market said
these same selections would win 65.6% of the time. The engine picks favourites, and
favourites win. **At t = 1.17 the overall edge does not clear its own error bar.**

### By sport, and one of them is significantly *worse* than the market

| sport | n | edge vs market | SE | t |
|---|---|---|---|---|
| MLB | 371 | +3.37 pp | 2.37 | 1.42 |
| NCAAF | 74 | **+8.32 pp** | 2.85 | **2.92** |
| NFL | 27 | +15.01 pp | 9.39 | 1.60 |
| MLS | 93 | **−11.10 pp** | 5.12 | **−2.17** |

MLS is negative and significantly so — which is expected and already known: a two-way
moneyline on a three-way market is wrong by construction (C-118), and the engine now
refuses to publish them. The settled history still carries them.

NFL's +15 pp at n = 27 is noise; roughly three picks a bin. Do not read a direction
off it.

### Excluding the market that is broken by construction

| | value |
|---|---|
| n | 472 |
| edge over the de-vigged market | **+4.81 pp** |
| standard error | 1.99 pp |
| **t** | **2.41** |
| mean overround still to overcome (the vig) | **3.62 pp** |
| **net of vig** | **≈ +1.2 pp** |

**State the caveats before the conclusion, because they are load-bearing.**

- **The MLS exclusion is post-hoc.** I chose it after seeing that MLS was −11 pp. It
  is defensible on a priori grounds — the construction error is documented, predates
  this measurement, and the engine already refuses to publish those picks — but it was
  still a choice made with the answer visible, and that is worth exactly as much
  scepticism as it sounds like.
- **Selection effect.** These are the picks the engine chose to publish. That is the
  right population for "did our published picks beat the market", and it is not a
  controlled experiment.
- **In-sample.** No time split, no hold-out. Nothing here is out-of-sample validation.
- **The margin is thin where it counts.** The edge is measured against the *fair*
  de-vigged price. Against the price a subscriber can actually take, +4.81 pp against
  3.62 pp of vig leaves roughly **one point**, and one point sits well inside its own
  error bar.

**The honest conclusion: there is a measurable, marginally significant edge over the
market on the non-soccer book, and net of vig it is about a point. That is promising.
It is not proven, and it has never been validated out of sample.**

---

## 3. The gate has no skill floor, and that is the structural finding

`apps/web/lib/ops/calibration-eligibility.ts` gates PROVEN on four floors: sample
size, Brier ≤ 0.22, ECE ≤ 0.05, Murphy reliability ≤ 0.05.

Take a forecaster with **no skill at all** that predicts the base rate `p̄` on every
pick. Every prediction lands in one bin, so from the decomposition in
`packages/prediction-engine/src/probability-calibration.ts`:

- Murphy reliability = `Σ nk(fk − ok)² / n` = **exactly 0** (fk = ok = p̄)
- ECE = `Σ (nk/n)|fk − ok|` = **exactly 0**
- resolution = **0** — it distinguishes nothing
- Brier = uncertainty = `p̄(1 − p̄)`

So **two of the four floors are passed perfectly by a forecaster that knows nothing**,
and the sample-size floor is not a quality bar at all. Only Brier retains any bite,
and its bite is a function of the base rate rather than of skill: at the measured base
rate of 0.652 a constant forecast scores 0.2269 and **fails** the 0.22 floor, while at
0.678 it scores 0.2184 and **passes** it.

A parallel audit stated flatly that a constant forecast passes all four floors. That
is too strong and depends on which base rate you use — the correction matters, because
the accurate version is still damning enough without overreaching.

**What this means: the gate certifies calibration, not skill.** A product can be
perfectly calibrated and have no edge whatsoever — that is precisely what "agrees with
the market" looks like. Nothing in the eligibility check would notice.

### The smallest honest fix

Add a **skill floor** beside the calibration floors, computed on the same sample:

> Brier Skill Score against the publish-time de-vigged market, `1 − Brier_model /
> Brier_market`, must be **positive** with its confidence interval excluding zero.

The primitives already exist (`brierDecomposition`, and `market-backtest.ts` already
reads the market baseline). Today nothing computes the model, the constant baseline
and the market baseline side by side, so nothing can fail for lack of skill.

This is founder-gated: it tightens a published gate, and law 9 forbids an agent
loosening one — but adding a floor that did not exist is a product decision about what
PROVEN should mean, not a repair an agent should make unilaterally.

---

## 4. What is NOT established

- Whether the 306 unresolved picks behave like the 565 measured ones. Unknown, not assumed.
- Any out-of-sample or forward-tested edge. Nothing here is out-of-sample.
- Whether the +8.32 pp NCAAF result survives more data or a multiple-comparison
  correction across the four sports tested. At n = 74 it should be treated as a lead,
  never as a claim.
- Closing-line value. Beating the *opening* de-vigged price is not the same as beating
  the close, and CLV is the measurement that would settle whether this is real.

---

## 5. The factor audit: eight of fifteen signals have never fired

Applying the handicapping lenses (power gap, QB swing, rest check, line move, unit
mismatch) to our own engine, as a measurement rather than a description.

`pick_signal_snapshots` records, per pick, which signals were present at publish
time. Across **all 3,065 non-bootstrap snapshots**:

| signal | times it has EVER fired |
|---|---|
| `hadRatingsSignal` — the power gap | **0** |
| `hadInjurySignal` — the QB swing | **0** |
| `hadPlayerSignal` — the QB swing | **0** |
| `hadWeatherSignal` | **0** |
| `hadOfficialsSignal` | **0** |
| `hadPaceSignal` | **0** |
| `hadMilestoneSignal` | **0** |
| `hadVenueEnvironmentSignal` | **0** |
| `hadH2HSignal` | 5 (0.16%) |

Eight of the fifteen declared signals have never fired once. Not "rarely" — never,
across every non-bootstrap pick the product has generated.

### A correction to my own first reading of that table

My first draft of this section called the engine "a four-factor model wearing a
fifteen-factor label", implying it expects those inputs and is degraded without
them. **That is wrong, and the code says so in two places.**

`signal-snapshot.ts:172-175` states these flags "remain false until that data is
wired in. Recorded for the audit trail only — they do not move the confidence
score." And `scoring.ts:141-150` builds every shadow-evidence factor with
`weight: 0` and `impact: "neutral"`.

So these are **zero-weight audit fields by design**. They never contributed to a
score, and their absence is not a degradation of a model that was counting on them.
The `had*Signal` flags themselves are read only by the admin dashboard and the pick
audit route — never by the scorer.

The measurement stands; the inference I drew from it did not. Worth recording,
because the wrong version is the more dramatic one and it would have sent someone
looking for a bug that is not there.

### What is actually true, and it still matters

The product has **no power-gap input, no injury or QB input, no weather input**, and
**no unit-mismatch signal in the schema at all**. The factors a handicapper would
reach for first are absent from the model's inputs — not mis-weighted, absent. That
is a capability gap and a roadmap question, not a defect, and it is a better
explanation for a thin measured edge than any threshold is.

### One genuine modelling defect, independent of the above

> `hadLineMovementSignal` and `hadScheduleSignal` differ in **0 of 3,065 rows**.

Perfectly collinear — one condition recorded under two names. Two named factors that
cannot disagree are one factor, and any analysis that treats them as independent
double-counts it. (`hadRestSignal` and `hadAtsFormSignal` differ in 518 of 3,065
overall, so those two are genuinely distinct — but they were collinear within the
settled moneyline subset scored below, which is why they cannot be separated there.)

### Do the signals that DO fire earn their place?

Same edge-vs-market metric as section 2, MLS excluded on the stated a priori grounds,
n = 472. Only three distinct contrasts exist once collinearity is accounted for:

| contrast | n with | n without | edge difference | Welch t |
|---|---|---|---|---|
| line movement (≡ schedule density) | 160 | 312 | **+8.04 pp** | **2.10** |
| rest | 132 | 340 | +7.23 pp | 1.78 |
| venue | 123 | 349 | +5.59 pp | 1.33 |

Read carefully, because it is easy to over-read:

- Only line movement clears two standard errors, and with three contrasts tested even
  that is marginal under any multiple-comparison adjustment.
- **Rest is t = 1.78 — suggestive, not established.** That is the honest answer to
  "is the schedule spot a real edge or a lazy storyline" on our own data: it leans the
  right way and does not clear the bar. Most schedule narratives are smaller than they
  sound, including ours.
- **Observational and confounded.** "Signal present" correlates with data coverage,
  which correlates with sport and fixture prominence. Better-covered games may simply
  be more predictable. None of these differences shows the factor *causes* the edge.

### The actionable questions

1. Are the eight unwired sources worth connecting? Ratings and QB availability are the
   two a handicapper would connect first, and neither exists today.
2. `hadLineMovementSignal` and `hadScheduleSignal` should not both exist if they
   cannot disagree.
3. Nothing here justifies touching MODEL_VERSION or a threshold. The finding is about
   inputs that were never wired, not weights that are wrong.
