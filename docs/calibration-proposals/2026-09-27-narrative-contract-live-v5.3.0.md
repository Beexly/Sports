---
modelVersion: v5.3.0
status: IMPLEMENTED
date: 2026-09-27
author: founder (MiMo support lane, owner-authorized)
supersedes: v5.2.7
---

# CalibrationProposal — narrative_contract STORED→LIVE, ninth week-3 part (v5.2.7 → v5.3.0)

## Decision

Bump `MODEL_VERSION` to **v5.3.0**. The scoring change: a ninth live edge part,
`narrative_contract`, enters the week-3 edge alongside the eight locked parts.
The edge for `2026_03_LAC_BUF` moves from 0.30259224777263855 to
0.30384082052641725 (+0.0012485727537787205 = 0.03 * +0.04161909179262402).

## Why a bump (repo law)

Scoring changed, so the version changes with it. Heuristic confidence weights
are untouched; MIN_PUBLISH_CONFIDENCE stays 50; no env flag flips.

## Evidence (all commands run in-lane 2026-09-27, numbers measured)

- Roster-level walk-forward, train 2018-2024 (n=1942), holdout 2025 (n=285):
  r=+0.112232, slope=+0.051235, se=+0.026966 — |r| >= 0.08 and |slope| > se
  both clear out of sample. f1=0, f2=0; only f3 (no week-3 row) was missing.
- Reproduction: `measure-narrative-contract.ts` exit 0 under tsx,
  `compute-week3-contract.ts` exit 0. Week-3 row from the published 2026
  roster (BUF 57 contract players, LAC 51): gap -0.131M, p_home 0.520809,
  signed +0.041619.
- Registry row appended with the existing 0.03 engine prior (no ninth prior,
  no rescale). `signed_source` names the formula, the fitted intercept
  0.5414884844705745 and slope 0.15808219460661174, and the three files read.
- Verification after the change: engine 847/847 files, 6,144/6,144 tests;
  engine `tsc --noEmit` exit 0; reasoning 23/23. Locked count guards updated
  to name the measured addition (8→9 LIVE, narrative_contract off the dark
  list), never relaxed.
- `publishes_pick` stays false. The provenance seal and the AGENTS.md law
  are unchanged by this promotion.

## Caution (measured, not papered over)

In-sample r halves out of sample on the roster-level variant (train 0.279 →
holdout 0.112). The holdout number is the only one that counts and it clears
both bars, which is why this is recorded as a judgment call: a +0.0012-point
contribution, directionally home, from the weakest of the nine parts.

## What this is — and is NOT

This is a scoring addition for one game-week, from a measured holdout, with
the calibration trail above. It is not a recalibration of confidence, not a
publish-gate flip, and not a win-rate claim. The calibration page stays dark
until the separate founder decision on the page and the probability claims.
