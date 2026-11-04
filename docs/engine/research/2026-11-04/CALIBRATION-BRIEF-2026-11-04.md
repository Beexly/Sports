# What Our Confidence Score Is Actually Telling Us

**Audience:** product, publishing, and modelling owners
**Basis:** 2,662 settled picks, `prod-settled-sample-full.csv`
**Companion:** `CALIBRATION-STRATIFIED-2026-11-04.md` (method and full statistics)
**Verified against the database:** `CALIBRATION-DB-VERIFICATION-2026-11-04.md`

> **Read this first.** The numbers below come from an 84.7% sample that
> under-sampled the two broken markets. Rerunning on the full production
> population (3,143 WIN/LOSS picks) reproduces every conclusion and moves the
> pooled gap from +8.8 to **+9.4 points** — the sample was biased in the
> conservative direction. Direction, ordering and recommendations are unchanged;
> the pooled and per-market figures below are slightly understated.

---

## The one sentence

> The confidence score gives three different markets almost the same number —
> while those markets actually win at rates 20 points apart.

Everything below is the evidence for that sentence and what to do about it.

---

## The setup

We publish picks with a confidence figure between 50 and 100. Downstream, that
number gets used as if it were the probability of winning: to rank picks, to
compare markets, and in expected-value maths.

That usage assumes one thing — that 70 means seventy percent. This sample is
where that assumption gets tested against what actually happened.

## The conflict

Three markets, 2,662 settlements:

| | picks | claimed | realized | difference |
|---|---|---|---|---|
| MONEYLINE | 1,219 | 65.7% | **66.5%** | +0.8 pts |
| SPREAD | 795 | 65.8% | **45.9%** | **−19.9 pts** |
| TOTAL | 648 | 61.2% | **48.3%** | **−12.9 pts** |

Read the middle column against the right one.

The score says these three markets are nearly identical — it puts them within
**4.6 points** of each other. Reality puts them **20.5 points** apart. Moneyline
picks win about two out of three. Spread picks lose about fifty-four out of a
hundred.

**The score compresses a 20-point difference in reality into a 4-point
difference on the page.** That is the whole problem in one line, and no amount of
recalibration fixes it, because it is not a scaling error — it is a missing
distinction.

## The part that should change how we publish

Within spreads, the score is not just wrong — it is **backwards**:

| confidence band | picks | claimed | realized |
|---|---|---|---|
| 50-60 | 292 | 53.8% | 43.5% |
| 60-70 | 217 | 64.9% | 48.9% |
| 70-80 | 172 | 74.0% | 47.1% |
| 80-90 | 90 | 84.2% | 46.7% |
| **90+** | 24 | **93.4%** | **37.5%** |

The more confident the model is about a spread, the worse that pick does.
A 90+ spread pick claims 93.4% and wins **37.5%**.

This is not "overconfident." Overconfidence would be a consistent offset we could
correct. This is an inverted signal: **the score is most wrong exactly where it
is most emphatic.**

_[Chart: `calibration-reliability-by-market.png` — all three panels, points below
the diagonal are overconfident. The spread curve slopes downward to the right.]_

## The tension worth naming

Moneyline tells a different story, and it is not simply "good":

| confidence band | picks | claimed | realized |
|---|---|---|---|
| **50-60** | 225 | 53.1% | **79.6%** |
| 60-70 | 626 | 63.7% | 60.5% |
| 70-80 | 284 | 74.1% | 66.9% |
| 80-90 | 66 | 83.8% | 66.7% |
| 90+ | 18 | 94.8% | 100.0% |

Moneyline's **lowest-confidence** picks win **79.6%**. Its mid and high bands
underperform their claim. The market's aggregate looks calibrated only because a
large under-confidence error at the bottom and a smaller over-confidence error at
the top cancel out.

So "moneyline is calibrated" is technically true and practically misleading. The
mean is right; **the ordering is inverted in both directions.**

## What it means in money

Flat 1-unit stake on every pick at a −110 price, which needs 52.4% to break even:

| market | picks | win rate | ROI per unit | net units |
|---|---|---|---|---|
| MONEYLINE | 1,219 | 66.5% | **+26.9%** | **+327.4** |
| SPREAD | 795 | 45.9% | **−12.3%** | **−98.2** |
| TOTAL | 648 | 48.3% | **−7.8%** | **−50.5** |
| **all** | 2,662 | 55.9% | +6.7% | +178.7 |

**Moneyline carries the entire result.** Spread and total together give back
almost half of what moneyline earns — 1,443 picks, 54% of volume, net −148.7
units.

And because high-confidence picks skew toward spreads (114 of 217 picks at 80+
are spreads, against 84 moneyline and 19 totals), **any scheme that sizes stakes
by confidence would put the most money on the market that wins 44.7% of the time
while claiming 86.2%.**

> This is a counterfactual, not observed P&L. The evidence file carries no posted
> prices, no stake sizes and no line shopping. It shows the direction and rough
> magnitude of the problem, not what we actually earned.

## The uncomfortable finding underneath

Scored properly — against each market's own base rate rather than against a coin
flip — **the probability does not beat "just predict the average" in any
market**:

| market | our Brier | base-rate Brier | skill |
|---|---|---|---|
| MONEYLINE | 0.2333 | 0.2229 | −4.7% |
| SPREAD | 0.3007 | 0.2483 | −21.1% |
| TOTAL | 0.2635 | 0.2497 | −5.5% |

Negative skill means the *variation* in our probabilities is worse than no
variation at all. The model is adding noise, not resolution — even in moneyline,
where the bets happen to win.

Two things can be true at once, and here they are: **moneyline is profitable and
its probabilities are still uninformative.** The profit comes from the level, not
from the score's ability to discriminate. That distinction matters, because it
means the win rate does not validate the number we print next to it.

## What we should do

**1. Stop attaching a probability to spread and total picks.**
The number is inverted where it matters most. Publish those picks with a
direction and a line, without a probability. This is the change with the highest
ratio of risk removed to work required.

**2. Never use `confidence/100` as a win probability for spreads or totals.**
This is already written in `compute.ts:74-90` as a warning. It is now quantified:
+19.9 and +12.9 points of error, growing with confidence.

**3. Fix moneyline ordering separately — do not recalibrate it.**
A calibration map would rescale the probabilities and leave the inverted ranking
intact. The low band winning 79.6% is a feature or target problem, not a scaling
problem.

**4. Score against the base rate, not against 0.25.**
On a sample averaging 66%, a coin flip is the wrong bar. Every Brier figure we
have quoted against 0.25 flatters us and should be restated.

**5. Do not publish a per-market confidence until the market is modelled
separately.**
One score across three markets is the root cause, not a symptom.

## The ask

Approve removing probability figures from spread and total picks immediately, and
treat moneyline ordering as its own piece of work rather than part of a
calibration cleanup.

## What this analysis does not say

- It does not say the model is unprofitable — moneyline is clearly not.
- It does not say anything about the separate 2,385-pick cut `compute.ts` cites;
  different sample, different numbers.
- It does not establish cause. Market mix, publishing thresholds (we only publish
  above a cut) and model-version drift are entangled. A stratified regression is
  the next step, not a conclusion.
- Version strata look like improvement (v5.0.0 +17.9 pts → v5.2.7 +6.6 pts) but
  version is confounded with market mix, so it is not evidence the fix landed.

---

**Reproduce:** `python scripts/ops/calibration_story.py`
**Method and full statistics:** `CALIBRATION-STRATIFIED-2026-11-04.md`
**Data:** `calibration-story-data.json`
