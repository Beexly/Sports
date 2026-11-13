# Calibration proposal — evidence spine, 2026-11-12

**Status: DRAFT. Not implemented. MODEL_VERSION stays v5.3.1 until this is
accepted and implemented.**

## Why a proposal is needed

`MODEL_VERSION` is frozen at `v5.3.1` by `scripts/guardrails/model-freeze.mjs`.
The new evidence path computes a different number from the frozen scorer, so it
cannot simply replace it. It runs beside it, sealed and scored, and moves only
through this document.

## What the current engine actually does

Measured on the live board, not inferred:

- Brier score 0.2484 against 0.25 for a coin flip. The engine is barely better
  than a coin, and the interval on 552 picks does not exclude zero skill.
- Ranking is monotone: picks under 0.55 confidence win 43.4%, picks over 0.65
  win 61.8%. The ordering carries information.
- The probabilities are inflated by roughly 5.2 points. The ordering is right
  and the level is wrong. That is the signature of a missing calibration map,
  not a missing model.
- The production path applies a clamp to [0.01, 0.99] and no fitted map. Fitted
  isotonic and Platt maps exist in the repo and are not called.

## Proposal 1 — apply a fitted calibration map in the new path

**What.** In `run_pregame.ts` Stage E, after the posterior is formed, apply the
isotonic map fitted on the purged, embargoed split. Log both the raw and the
calibrated probability in the sealed manifest.

**Why.** The ranking is already monotone. A monotone map cannot damage the
ordering and can only improve the level. This is the cheapest available
improvement and it is already implemented in the repo.

**What it costs if wrong.** If the map was fitted on a window that overlaps the
scoring window, it will look better than it is. Mitigation: the map must be
fitted on data strictly before the scoring window, and the fit window must be
recorded in the manifest.

**What it does not do.** It does not create edge. A calibrated coin is still a
coin. It makes the number honest, which is a precondition for measuring edge,
not a substitute for it.

## Proposal 2 — fit family coefficients on a frozen window, then calibrate on a later one

**What.** Two disjoint windows:

1. Fit the eight situational family coefficients and the market share on
   2021–2024.
2. Freeze them.
3. Fit the calibration map on 2025.
4. Score on 2026 only.

**Why.** Fitting coefficients and calibration on overlapping history lets each
absorb the other's error. The coefficients learn to compensate for a
miscalibrated level, and the calibration map learns to compensate for
over-fitted coefficients. Both look good in-sample and neither generalises. This
was Grok's first objection and it is correct.

**What it costs if wrong.** Two windows means less data per fit. With eight
families and roughly 1,000 games in the fit window, some families will have
wide intervals. The answer is to fit fewer families, not to widen the window.

## Proposal 3 — promotion needs multiplicity control and a locked dataset

**What.** A family is promoted from shadow to live only if:

- its Clark-West statistic clears a threshold corrected for the number of
  families tested (eight today, so a Bonferroni-style correction or a
  Benjamini-Hochberg FDR at 0.05);
- it is evaluated on a promotion dataset that was locked before the family was
  fitted and is never used for fitting;
- the improvement survives on the locked set, not just the scorecard that
  selected it.

**Why.** Testing eight families and promoting the best one guarantees a false
promotion even when none of them works. This was Grok's second objection and it
is correct.

**What it costs if wrong.** Slower promotion. That is the point.

## Proposal 4 — the binding census needs semantic typing

**What.** An equation is bindable only when every free symbol has a declared
unit, a sign convention, and a grain (per-play vs per-game). Syntax is not
enough.

**Why.** `EPA` per play and `EPA` per game differ by a factor of about 65. A
symbol that binds syntactically to the wrong grain produces a number that is
wrong by two orders of magnitude and looks plausible. This was Grok's third
objection and it is correct.

**Measured consequence.** 41 of 62,900 equations are candidate-bindable at all
(see `equation-binding-census.md`). Semantic typing will reduce that number, not
increase it.

## What this proposal does NOT claim

- It does not claim the engine has edge. Nothing measured so far shows edge
  against the closing line.
- It does not claim the corpus improves forecasts. Corpus support is shrink-only
  and its score measures topical match, not agreement.
- It does not open publication. The walk-forward emission gate stays closed.

## Sequence

1. Implement Proposal 1 in the new path only. Score it in shadow for two weeks.
2. If the shadow Brier beats the market-only baseline out of sample, implement
   Proposal 2 and refit.
3. Only then consider Proposal 3 for the first family.
4. Proposal 4 gates any equation work at all.

## Sign-off

Requires the owner. No agent may move `MODEL_VERSION`.
