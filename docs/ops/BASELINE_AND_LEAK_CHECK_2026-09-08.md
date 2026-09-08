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
