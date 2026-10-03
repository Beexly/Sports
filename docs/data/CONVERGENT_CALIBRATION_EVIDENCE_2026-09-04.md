# Convergent calibration evidence — 2026-09-04

Three independent measurements, three different populations, three different
methods — one answer: the confidence score has no resolution, and the ≥80 tail
wins LESS often than the board average. Two of these were taken on live
production data one day apart; one is a historical replay of the frozen model
across 27 seasons. They agree. That is no longer a suspicion; it is corroborated.

## The three measurements, side by side

| # | Population | Method | Result | Recorded in |
|---|---|---|---|---|
| 1 | 152 graded picks at confidence ≥80, live production, read 2026-09-02 | win rate vs claimed rate | 61 wins (40.13%) vs mean claimed 86% — inverted | `docs/ops/CLAUDE_DECISIONS_20260902.md` D3; production re-read 2026-09-03 with 0 bootstrap/unpublished/seed rows in the population confirmed the same verdict |
| 2 | 1,663 graded WIN/LOSS picks, live production | Brier decomposition | resolution term 0.0054 (≈0) | `docs/ops/CLAUDE_DECISIONS_20260902.md` D2 (Murphy uncertainty 0.2493 vs base rate 52.6%) |
| 3 | 13,646 spread/total picks, 1999-2025 replay of the frozen model | AUC (Mann-Whitney), seeded permutation p | AUC 0.4965, p = 0.4113 — no discrimination; controls (\|line\| magnitude 0.4982, rest 0.5019, week 0.5073) all ≈0.50 | PR #698, `scripts/analytics/replay-discrimination.ts` |

## What convergence means here

- Different data: measurement 1 is the ≥80 tail only; measurement 2 is all
  graded picks; measurement 3 is 27 seasons of historical replay. Overlap
  between the populations is at most incidental.
- Different methods: raw win-rate comparison, Brier resolution, and
  rank-statistic AUC with permutation significance. They share no estimator.
- Same answer: zero resolution in each. The replay's synthetic pricing (both
  sides at −110) cannot explain the live measurements away — the live tail is
  inverted on its own, and the live resolution term is ≈0 on its own. The replay
  AUC independently lands at 0.4965, i.e. a coin flip.

Stated plainly, without softening: **the ≥80 tier currently wins less often
than the board average** (40% vs 52.70% blended win rate on the 1999-2025
replay, which is itself an artifact of averaging markets priced differently —
the honest ROI on that corpus is −5.48% per unit staked). A pick the model
labels ~86% wins at 40%. This is corroborated, not suspected.

## Provenance and corrections

- All three numbers were recorded by commands that were run; none originates in
  this document. Measurement 1 and 2 come from live production reads recorded in
  the 2026-09-02 decisions file; measurement 3 from the replay AUC run recorded
  in PR #698's body and script header.
- Any measurement predating the nflverse `spread_line` sign fix (PR #695) is
  void as corpus-poisoned; none of the three above predates it in derivation —
  measurement 3's replay was run on the fixed corpus.
- Earlier claim, corrected in #698 by its own author: confidence is NOT "mildly
  anti-informative" from the 70-79 band; the correct statement is no
  discrimination (AUC ≈ 0.5). This document keeps the corrected wording.
- One earlier live read reported the tail at 37%; the corrected observed value
  is 61/152 (40.13%), stated in the decisions file's own report-inconsistencies
  section. This document uses the corrected value.

## Consequence (already decided elsewhere; repeated for the record)

- D2 (2026-09-02): calibration floors stay at Brier ≤ 0.22 / ECE ≤ 0.05;
  nothing calibrated is published; PERFORMANCE_STATS, LIVE_BOARD,
  PUBLISH_LEDGER stay closed; publish the honest "collecting" state.
- D3 (2026-09-02): the inverted ≥80 tail is monitored, never shipped as
  probability. It is the first item for the next calibration proposal.
- No MODEL_VERSION change four days out from launch (D2/D3 context); the next
  calibration proposal owns any such recommendation. Writing that proposal is
  agent work; flipping the version is the founder's.

## Related artifacts

- `docs/data/NFL_REPLAY_CALIBRATION_2026-09-04.md` — the replay measurement
  corpus, 52.70% blended win rate, −5.48% ROI, Wilson-bound slice tests.
- `docs/ops/CLAUDE_DECISIONS_20260902.md` — D2 (floors, live resolution), D3
  (inverted tail monitor).
- PR #698 / `scripts/analytics/replay-discrimination.ts` — the AUC method, its
  honest scope note, and the control fields.
- Wave 3 main build (in progress on `hermes/night-2026-09-04`):
  `scripts/analytics/replay-calibration.ts` — walk-forward market calibration,
  reliability curves, Brier decomposition, ECE with bootstrap CIs.
