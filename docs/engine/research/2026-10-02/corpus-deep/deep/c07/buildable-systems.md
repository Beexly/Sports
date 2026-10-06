# c07 buildable systems — what the deep pass can become (2026-10-02)

Systems a builder could implement from the verified claims. Each names its
research basis, its load-bearing numbers, and its known gaps. Ordered by
evidence strength. None is built yet — these are specs-in-waiting, not claims
of existence.

---

## B1. Calibration-first model selection (evidence: strong, single-season)

**Basis:** 0290 (+34.69% vs −35.17%), 0691 (ECE halving via parent shrinkage).
**System:** rank candidate models by calibration (ECE / reliability), not
accuracy; shrink sparse cells with p̂ = (w + 25·p̂_parent)/(n + 25).
**Gaps:** single-season (C1); the +25 pseudo-count is tuned to one dataset —
re-tune per sport/cell before trusting it.

## B2. Fractional-Kelly + drawdown governor + decorrelated book (evidence: medium)

**Basis:** 1210 (full-Kelly ruin), 1628 (M(k) governor), 0174 (γ=0.4
decorrelation).
**System:** size at fractional Kelly → apply the M(k) drawdown governor →
allocate across a decorrelated portfolio (γ≈0.4).
**Gaps:** joint behavior untested (S2); governor is single-episode (C5);
decorrelation port ≠ paper (C2). Backtest the stack jointly before wiring.

## B3. Edge-decay monitor (evidence: medium, diagnostic)

**Basis:** 0602 (θ = −0.62, HPD (−1.08, −0.17)).
**System:** track edge half-life per signal family; haircut stale edges;
alert when a live edge's age exceeds its estimated half-life.
**Gaps:** diagnostic not prescriptive (C7) — the monitor is honest as a
dashboard, dishonest as a sizer.

## B4. OL-degradation → pressure-funnel detector (evidence: medium)

**Basis:** ol-drag-calibration (tackle ladder), reasoning-depth-spec §6.1
(PIT@CLE worked example).
**System:** ingest OL health/practice participation → propagate through the
tackle ladder → emit pressure-funnel theses with machine-checkable breaking
conditions (quick-game rate, TTT) for L4 review.
**Gaps:** the +0.41 rest figure is struck — do not include a rest term until
re-sourced; ladder is descriptive of past propagation, not a forward model.

## B5. twCRPS-gated forecast combination (evidence: medium)

**Basis:** 1523 (+44.81/+48.90/+49.28% TMCB at γ=5).
**System:** combine ensemble forecasts with tail-weighted CRPS gating.
**Gaps:** carry the EMOS MCB −13.55% cost in every report; γ=5 is the tested
point — other γ values are untested.

## B6. Regime-posterior ratings (evidence: weak — build gap)

**Basis:** 0431 (HMM 0.715), 0940 (Elo sparsity).
**System:** ratings that carry a regime posterior instead of a point; widen
uncertainty when the regime posterior is diffuse.
**Gaps:** no joint regime+rating recipe in the corpus (S6); 2 states not
AIC-validated; data ends 2018. This is a research project, not a port.

## Explicitly NOT buildable from this corpus

- Anything on SHAPEffects (C3 — R² −0.99 even for the winner).
- Anything on 1461's numerics (C4 — steal the equation only).
- Anything on arXiv:2512.18858 (rejected).
- Anything on BDB 2026 data (license unresolved — default posture: no data).
- Momentum staking on the 0643 figures (inflated — re-source first).
