# The LLM playbook, applied to this engine

Founder directive, 2026-09-18: look at how real language models are actually built, how they
learn, and turn those concepts into reality here, so this engine holds data, statistics,
analytics, learning and metrics that almost nobody else has.

This document is the transfer. Eight ideas from how frontier models are actually trained,
each mapped to a specific defect or absence measured in THIS repository, with the honest
constraint stated beside it. Nothing here is a metaphor. Every item names the file it lands in.

---

## The one number that frames everything

**We have roughly 2,641 settled picks. That is our entire labelled dataset.**

Every serious modelling decision follows from that number, and most public sports analytics
gets this wrong by reaching for bigger models. A frontier lab facing 2,641 labels would not
train a bigger network. It would do three things, in this order: find more labels, learn a
representation from unlabelled data, and share parameters across related tasks. All three are
available here and none is built.

---

## 0. Train on OUR signals, not on the market, and why that is a loss-function question

Founder directive, and it is the correct diagnosis: if we keep testing against market data we
end up where we have been for ten months.

**The trap has a precise shape.** Our calibration basis is `market_anchored_v4`. A forecaster
whose probability IS the de-vigged market probability scores **perfectly calibrated and has
exactly zero edge**. Calibration against the market measures whether we reproduce the market,
not whether we beat it. Ten months of honest calibration work can therefore coexist with no
edge at all, and that is not a contradiction; it is what the metric was measuring.

The engine's current state makes this concrete rather than theoretical. The 2026-09-13 factor
audit found every signal pick carrying `sources:["elo"]` and `agreement:"SOLO"`: the
independent blend had collapsed to a single model, so the board was running on one signal plus
the market.

**The fix is structural, not a policy.** In the per-stratum head, the market logit enters as a
**fixed offset**: coefficient pinned at 1, unpenalized, never fitted. The model is then
mathematically forbidden from earning credit for reproducing the market, because the market's
contribution is already accounted for before the model gets a single coefficient. Every
parameter it fits can only be paid for by information the market does not already contain.

That is what "trained on our signals" means in code rather than in intention. Without the
offset, a penalized logistic shrinks toward the base rate and quietly relearns the market from
scratch; with it, the only thing left to learn is the residual, which is the edge.

## 0b. "Millions of tests on all our signals": the right ambition, and the method that kills it

We have **2,641 settled picks**. Run a million hypotheses against them at the conventional
threshold and roughly **fifty thousand will clear it by chance alone**. That is not a caution,
it is arithmetic, and it is how essentially every sports model in history has died: it
backtests beautifully and loses money, because the backtest was a search over noise.

**Three things make the volume safe, and the first is already built and has never run.**

1. **False-discovery control, which exists in this repository today.**
   `edge-lab/trials-registry.ts` implements Benjamini-Hochberg step-up at `:170` and
   family-level admission at `:289`, over a registered family key so the correction sees every
   sibling trial. It is reachable only from `scripts/edge-lab/feature-admission.ts`, which
   nothing schedules. **Turning it on is what converts a million tests from a liability into an
   asset.** With it, "we tested a million things" is a defensible claim. Without it, it is the
   confession.

2. **More labels, because the honest number of tests is bounded by labels, not by signals.**
   No amount of signal breadth raises how many independent hypotheses 2,641 outcomes can
   adjudicate. Closing-line value gives a label on every pick within hours and line movement
   gives one per tick, which is one to two orders of magnitude more supervision. That is the
   only lever that genuinely raises the ceiling on how much we can test.

3. **Joint training instead of a million univariate tests, which is the deepest correction.**
   Language models do not run a million separate feature experiments. They train **one model on
   everything at once**. Fitting one regularized model over five hundred signals is
   statistically far safer than running five hundred separate tests, because strength is shared
   across correlated signals and the effective degrees of freedom are controlled by the penalty
   rather than by a multiplicity correction applied after the fact.

   So the goal restates cleanly: **not "test every signal separately a million times", but
   "train on every signal jointly, continuously, with the market as an offset and
   false-discovery control on anything promoted to a named feature".** That is both more
   ambitious and more defensible than the univariate version.

**The order that follows from this.** Signal breadth is necessary and is not sufficient, and
adding breadth before the offset and the FDR gate are live is the specific way this engine
would spend another ten months producing confident numbers that do not survive contact with a
sportsbook.

## 1. Self-supervised pretraining on unlabelled sequence

**The LLM fact.** The decisive move in language modelling was not a better classifier. It was
realising that raw unlabelled text, run through a self-supervised objective (predict the next
token), produces a representation that transfers to every downstream task with very few labels.

**Applied here.** We have ~2,641 labels and, through nflverse, **millions of unlabelled plays
back to 1999**, each with down, distance, field position, personnel, clock, score state and
outcome. Every one is a free training example for a self-supervised objective:

- **Next-play prediction.** Given the drive so far, predict the next play type and its EPA.
- **Masked-play modelling.** Mask a play in a drive, reconstruct it from both sides.
- **Next-line prediction.** Given a line's movement so far, predict the next tick.

The learned play or drive embedding then feeds the thin-label head as a feature vector,
exactly as a pretrained encoder feeds a small classifier.

**Why this is genuinely rare.** Public sports analytics is almost entirely hand-crafted
features (EPA, success rate, CPOE) fitted with a GLM. The features are human-designed and the
model is shallow. Learning the representation from raw sequence is standard practice in
language and vision and essentially absent from public football modelling.

**Lands in.** A new `packages/prediction-engine/src/representation/` module; the embedding is
persisted per game and consumed as features by the head trainer. Track C, signal plane.

**Honest constraint.** The embedding must be fitted only on plays observable before the
decision time of any pick it scores, or it is leakage wearing a new hat. It inherits ruler T1's
as-of discipline, not an exemption from it.

## 2. The market is a dense label; settlement is a sparse one

**The LLM fact.** RLHF worked because preference comparisons are far cheaper and far denser
than gold answers. You do not need the right answer, only a signal about which of two
candidates is better.

**Applied here.** Settlement yields one label per pick, days later. **Closing-line value yields
a label on every pick within hours, and line movement yields one on every tick.** That is one
to two orders of magnitude more supervision, available continuously, and it is the same
signal professional bettors optimise directly.

This is why ruler T2, same-book closing value, is load bearing far beyond its own metric: once
CLV is honestly measured per book, it becomes a **training target**, not just a report line.

**Lands in.** `packages/prediction-engine/src/clv-capture.ts` for the honest measurement, then
a CLV-labelled training set beside the settled-outcome set. Track E now, Track F when it
trains.

**Honest constraint.** CLV is an auxiliary target, never the win-probability label. A model
fitted only on CLV learns to agree with the closing line, which is a different and lesser goal
than being right. Use it as a dense auxiliary objective in a multi-task head, with the sparse
settled outcome as the primary.

## 3. Chinchilla honesty: we are over-parameterised, not under-modelled

**The LLM fact.** Chinchilla showed the field had been scaling parameters while starving models
of data, and that the optimal ratio is far more data per parameter than anyone was using.

**Applied here, and it is a discipline rather than an ambition.** At ~2,641 labels, any deep
model is far past the point where more parameters help. The correct responses are the three
above: more labels (item 2), representation transfer (item 1), and **parameter sharing through
hierarchical pooling** (item 6). A bigger model is the wrong answer and will look like progress
in backtest.

**Lands in.** This is the rule that governs every modelling PR, and the reason
`edge-lab/logistic.ts`'s penalisation matters: it shrinks toward the base rate when it should
shrink toward the market, which is item 6's job.

## 4. Contamination control is the entire game

**The LLM fact.** The most expensive eval failures in the field are training-set contamination:
the benchmark leaked into pretraining and every number became meaningless. Labs now spend real
effort on decontamination and held-out sets they never touch.

**Applied here, with two contaminations already MEASURED in this repository:**

- `backfill-independent-trueprob.ts` rewrites `independentEdge.trueProb` on **settled** rows,
  from two schedules, using sources that ignore the `commenceTime` they are handed. Any model
  fitted on that column is fitting on the answer. Ruler T1.
- `edge-lab/walk-forward.ts` implements purge, embargo and a sealed holdout correctly and then
  cuts folds **by row index with no group key**, while this repository has documented fixture
  triplication. Rows from one real fixture land on both sides of a boundary. Ruler T5.

**This is where three models either multiply or cancel.** Models that share contaminated folds
are not independent estimates. They are one estimate wearing three labels, and their agreement
is not evidence. Fixing T5 is what makes a three-model ensemble mean anything.

## 5. Build the eval before the capability

**The LLM fact.** Serious labs write the eval first, freeze it, and refuse to optimise against
it. Capability without a trustworthy eval is unmeasurable.

**Applied here, and we are genuinely ahead.** The certification gate already exists with real
floors (n 100, Brier 0.22, debiased ECE 0.05, Murphy reliability 0.05, a three-run streak, a
named basis tag), it is bias-corrected, and it reports raw beside corrected. That is better
eval discipline than most public sports models have.

**The rule that keeps it worth something:** the floors never move to let a model pass. The gate
constrains only what number reaches a customer; it never constrains what we build, capture,
compute, persist or instrument.

## 6. Mixture of experts is per-stratum heads with a shared trunk

**The LLM fact.** Sparse expert routing gets specialised capacity without paying dense compute,
while a shared trunk keeps the common structure in one place.

**Applied here.** Per sport by market heads, sharing a trunk, with the market logit entering as
a **fixed offset** rather than a fitted coefficient. That offset is the whole trick: it forces
the head to learn only the residual against the market instead of relearning the market, which
is what a naively penalised logistic does when it shrinks toward the base rate.

Thin strata (NFL has ~70 settled picks ever) borrow strength from thick ones through partial
pooling rather than getting their own free parameters. That is parameter sharing, stated
statistically.

**Lands in.** `packages/prediction-engine/src/heads/`, head-serve queue, plus
`edge-lab/logit-pool.ts` and `calibration-blend.ts`, both of which exist and have never run.

## 7. Distillation: fit expensive offline, serve cheap

**The LLM fact.** Train a large teacher, distil into a small student that serves at a fraction
of the cost with most of the quality.

**Applied here.** Fit the hierarchical model offline on the full history, then distil it into a
small scorer that runs inside the request path. The certification gate then certifies the
student, because the student is what a customer actually meets.

## 8. The loop is the product

**The LLM fact.** Models improve because a loop runs continuously and automatically: data
lands, the model trains, an eval scores it, the winner deploys, the deployment produces more
data. Nobody hand-runs it.

**Applied here, and this is the largest single gap.** Every component of that loop exists in
this repository and **not one is wired**: `walk-forward.ts` is scheduled by nothing;
`trials-registry.ts` implements a hash chain and Benjamini-Hochberg control and has never run;
`placebo.ts`, `logit-pool.ts`, `logistic.ts` and `calibration-blend.ts` have never run;
`evidence-readiness-matrix.ts` defines 13 factor keys and is called by nothing at runtime;
`packages/feature-store` is point-in-time validated and holds zero registered features;
`baee-ensemble.ts` implements Bayesian model averaging and has had `BAEE_NUM_MODELS` pinned at
1 with an empty endpoint list since the constant was written, so it has never had a second
model to average.

**Ten months of work has not compounded because the loop was never closed.** Closing it is what
makes every other item on this list accumulate instead of evaporate.

---

## What this gives us that almost nobody else has

Stated as claims that can be checked, not as marketing:

1. **A learned representation of play sequence**, rather than only hand-crafted efficiency
   metrics. Public football analytics is almost entirely the latter.
2. **Dense market-derived labels** beside sparse settled outcomes, giving one to two orders of
   magnitude more supervision.
3. **Point-in-time correctness enforced in the type system**, via a typed `trueProbBasis` that
   a trainer filters on, rather than a prose rationale string a human has to read.
4. **Fixture-grouped walk-forward with purge and embargo.** Public models overwhelmingly use
   random splits, and the literature (Brill et al. 2024) shows play-level expected points
   inherits drive-level dependence, so random splits inflate measured skill.
5. **Pre-registration with a numeric kill line and false-discovery control** on every feature
   family, so a family that dies is recorded as dead instead of quietly reappearing.
6. **A certification gate with bias-corrected ECE that reports raw beside corrected**, and
   floors that do not move.

Items 3 through 6 are largely built or specced. Items 1 and 2 are the new capability this
document adds, and they are the two that change what the engine can learn rather than how
honestly it reports.

---

## The order, and why

1. **Rulers first** (T1 as-of, T2 same-book CLV, T5 fold independence). Items 1, 2 and 4 above
   are all downstream of them: a representation fitted on leaked data, a CLV label measured
   with a drifting book set, or an ensemble sharing contaminated folds are each worse than not
   building them, because they produce confident numbers that are wrong.
2. **Capture everything, now.** Item 1 needs unlabelled sequence and item 2 needs line ticks.
   Both accrue in wall-clock time, so every deferred day is sample that never exists.
3. **Close the loop.** Item 8 is what turns the first two into compounding rather than a
   one-off.
4. **Then the representation and the dense labels**, which is where the engine starts holding
   things almost nobody else holds.
