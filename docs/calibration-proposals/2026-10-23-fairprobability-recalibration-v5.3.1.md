---
modelVersion: v5.3.1
status: IMPLEMENTED
date: 2026-10-23
author: hermes fairProbability recalibration
supersedes: v5.3.0
---

# CalibrationProposal — published fairProbability recalibrated toward the market (v5.3.0 → v5.3.1)

## Decision

Bump `MODEL_VERSION` to **v5.3.1** and publish the stored `fairProbability` as a
fixed mix of the engine's `rankingP` and the de-vigged market fair probability, at
an **engine weight of 0.15**.

1. `engine/probability-recalibration.ts` owns the mix and its clamp (0.01–0.99).
2. `scoring.ts` runs it at both sites that publish `fairProbability` (spread and
   the second scoring path); when either input is unusable the other passes
   through and the record says whether the market actually entered.
3. `rankingP`, `confidence`, composite weights, every gate and every floor are
   UNCHANGED. Ranking order does not move — `marketFairProb` already carried the
   comparator basis since PR #1195's earlier commit. Only the published number moves.
4. Totals keep `fairProbability: null` on this version; they carry no
   engine-derived probability of their own to mix, so the prose says
   "model unpriced" rather than inventing one.

## What this is — and is NOT

This is a **calibration correction of one published number**, not a modelling
change. It is not an isotonic map, not a per-market fit, and it does not touch
`calibration/`. It does not flip `CALIBRATION_ADJUSTMENTS_ENABLED`, `PUBLIC_PICKS`
or `FORCE_NO_BET_IF_STALE`.

## Evidence

Measured 2026-10-23 on 552 settled production picks (read-only, `hermes_ro`):

- stated 56.3% v actual 52.2% — **4.1 points overconfident**;
- correlation of the stated number with the result: **.1114**;
- Brier **.2532** against the market's **.2158** and the coin's **.2500** — the
  published number was worse than saying 50% every time;
- band shape: .45–.55 stated hit .433–.488, .60+ hit .615 against a stated .679.

Engine weight fitted on the oldest 70% (n=386) chose **0.15**; on the untouched
newest 30% (n=166) it scored **.2314** v engine .2642 and market .2299. Over all
552 the mixed number is **.2154** v market .2158 — it edges the close — and
overconfidence falls 4.1 → 1.2 points.

## Risk

The mix inherits market errors: a soft or stale close degrades the published
number, where the engine alone would have been independent of it. The out-of-time
gap between .2314 (test) and .2154 (all rows) is the honest width of that risk.
A fit that only holds in-sample would show up as the test figure failing to beat
the engine's — it does not.

## Rollback

Set `ENGINE_WEIGHT` to 1 to restore raw `rankingP` exactly, or revert to v5.3.0.
The constant is the whole change; no data migration is involved.
