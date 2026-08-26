# W2 Preregistration — Key-Number Home-Favorite Fade (spread 3 & 6)

Written BEFORE holdout-style confirmations beyond the era split below.
Status: **CANDIDATE — NOT SURVIVOR.** Falsifier verdict pending formal
falsifyBind integration; e-value currently FAILS the certification bar.

## Hypothesis (stated before further tests)

NFL key-number structure: home favorites priced at exactly 3 or 6 points
cover at < 50% against the consensus close, because late-game field goals by
underdogs convert expected covers into pushes/losses at these numbers more
often than the market's flat pricing assumes. Mirror side: home dogs +3/+6
cover ≥ 50%. Mechanism documented in betting literature (key-number game
theory around FG increments).

## Data

nflverse games.csv, REG seasons 1999–2025, scored games with total_line>0
(n=6,967; 6,868 after push-free totals filter). Consensus closing spread,
single-book proxy — no prices on the spread itself assumed for the raw rate;
economics computed at standard −110.

## Sign convention (verified empirically, critical)

`spread_line > 0` = HOME team favored. Verified via win-rate split (67.6%
vs 35.1%) and mean cover margin ≈ 0 (+0.069). Cover margin = result −
spread_line.

## Results (all real, exact)

| Slice | n (excl push) | fav cover | z vs 0.5 |
|---|---|---|---|
| All: home fav −3 or −6 | 1,179 | 44.9% | −3.52 |
| Era 1999–2013 | 673 | 44.7% | −2.74 |
| Era 2014–2025 | 506 | 45.3% | −2.13 |
| Mirror: home dog +3/+6 | 756 | 48.8% | — |

Dog-side cover at key numbers (full sample): 55.05% of decided games.
Bernoulli e-process (fixed λ=0.04, y0=0.5) on fav-side misses:
E(all)=0.073, E(1999–2013)=0.211, E(2014–2025)=0.346.

## Honest interpretation

- The naive z=−3.52 is inflated by bucket selection (~40 buckets scanned
  before locking 3&6); Bonferroni ×40 → per-scan α≈0.00125, z=−3.52 survives
  that specific correction but the scan-then-lock procedure is not a clean
  preregistration. Treat as GENERATIVE finding, not confirmation.
- Era split is stable (44.7% / 45.3%), which is evidence FOR persistence and
  AGAINST it being one-era noise.
- The e-value DECAYS across eras (0.211 → 0.346 both << 20): under this
  test's λ, the effect does NOT certify as an edge by our own bar. A better
  calibrated λ (near Kelly 0.056) would grow faster, but we pre-committed to
  reporting the fixed small-λ run.
- Economics IF real: dog side +3/+6 at −110 with p≈0.55 → full-Kelly ~5.6%
  bankroll per bet — implausibly large; real books shade these lines, so the
  tradable edge is strictly smaller than this consensus-close estimate.
- Known confound: consensus line ≠ Pinnacle close; book shading at key
  numbers may already remove this in practice. Without multi-book history we
  cannot measure the residual.

## Verdict per doctrine

**PARKED** (not KILLED: signal stable across eras with mechanism prior;
not SURVIVOR: no falsifyBind pass, e-value < 20, selection-corrected design
still needed). Next cycle: preregister on NEW data (2026 season as it plays
out) with locked λ and one-sided e-process, no post-hoc bucket choice.
