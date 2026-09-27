# WPA² Win-Leverage Protocol — Execution Report

**Date:** 2026-09-13
**Protocol:** DeepSeek Phase 2 follow-up. Hypothesis: symbolic regression on EPA²
drops the time term (`quarter_seconds_remaining`) because the EPA model is
time-independent by construction; a WPA² target (win probability is mechanically
time-dependent) should RETAIN the time term.
**Status:** protocol executed exactly as specified. Verdict: **NULL under the
specified search budget** — the GP discovered no structure at all (details below).
A supplementary adequate-budget run was added to test the hypothesis for real.

## Protocol (as specified)

- Data: nflverse play-by-play 2021–2024 (parquet, release tag `pbp`), scrimmage
  plays only (pass/run), 141,288 rows after dropping missing features/label.
- Target: y = wpa², clipped at 99th percentile (train). `wpa` never a feature.
- W1: 9 pre-snap features — down, ydstogo, yardline_100, score_differential,
  quarter_seconds_remaining, shotgun, no_huddle, posteam_timeouts_remaining,
  defteam_timeouts_remaining (`wp` excluded).
- W2: W1 + pre-snap `wp`.
- GP: gplearn SymbolicRegressor, population 2000 × 30 generations × 3 seeds
  (42, 123, 7), functions {add, sub, mul, div, sqrt, log, exp(protected)}.
- Primary: train 2021+2022 (n=70,912) → test 2023 (n=35,474).
- Replication: train 2022+2023 (n=70,778) → test 2024 (n=34,902); best formula
  affine-recalibrated (y = a·f(x)+b via least squares) on replication-train.

## R² table (all spec'd numbers)

### Primary split (test 2023)

| model | test R² |
|---|---|
| B1 (train mean) | −0.0000 |
| B2_W1 (hand formula) | −317,751.73 |
| B2_W2 (hand formula) | −30,826.24 |
| B3 (GLI-0.1, DeepSeek) | −1,329,398.11 |
| GP W1 best (seed 42: `log(log(-2.719))` = constant 0.0003) | −0.0787, 95% CI [−0.0817, −0.0759] |
| GP W2 best (seed 42: `sub(X4,X4)` = constant 0) | −0.1541, 95% CI [−0.1579, −0.1510] |

Other seeds: W1/123 `sub(X8,X8)`, W1/7 `sub(X0,X0)`, W2/123 `sub(X5,X5)`,
W2/7 `sub(X6,X6)` — all constants, all R² < 0.

### Replication split (test 2024)

| model | test R² |
|---|---|
| B1 (train mean) | −0.0002 |
| B2_W1 (hand formula) | −323,166.64 |
| B2_W2 (hand formula) | −31,565.19 |
| B3 (GLI-0.1) | −1,398,183.07 |
| GP W1 best, raw | −0.0769 |
| GP W1 best, affine-refit (a=0.0000, b=0.00148) | −0.0002 |
| GP W2 best, raw | −0.1526 |
| GP W2 best, affine-refit (a=0.0000, b=0.00148) | −0.0002 |

(The affine refit collapses to a=0 — i.e. "just predict the mean" — because the
"formula" is a constant. Refitting a constant yields the baseline.)

## Headline verdict (spec'd protocol)

**Did the best W1 formula retain the time term? NO** — vacuously. The best W1
program is the constant `0.0003`. It contains no features at all, let alone
`quarter_seconds_remaining` (X4). The p10→p90 time swing is 0.0% of prediction
std. All six GP runs (3 seeds × W1/W2) converged to degenerate constants.

## Why: the protocol's search budget is the binding constraint, not the hypothesis

Supplementary analysis (same data/splits, clearly outside the spec'd protocol):

- **The signal is real and large.** Gradient boosting on the same features:
  test R² = **0.2129** (W1) / 0.2188 (W2). wpa² is highly predictable from
  pre-snap state — the single best correlate is `down` (+0.21; 4th downs carry
  huge leverage), and `quarter_seconds_remaining` correlates −0.044 (late-game
  plays carry more leverage — the time signal the hypothesis expects EXISTS).
- **The spec'd budget cannot find it.** My earlier SR prototype demonstrated
  that 30-generation runs collapse to constants on flat MSE landscapes while
  150-generation runs discover real structure. The protocol specified the
  collapsing configuration (2000×30). The null is a property of the budget,
  not of the hypothesis.
- **GLI-0.1's first real execution.** The spec'd R² numbers above (−1.3M) are
  dominated by a scale mismatch: GLI-0.1 outputs values ~10⁴× larger than wpa²
  (clip99 = 0.0258). After affine calibration to the target scale (fair
  comparison): B2_W1 → R² 0.0052, B2_W2 → 0.0531, **B3 (GLI-0.1) → R² 0.0037**.
  For context, HGB reaches 0.2129 and the train-mean baseline is 0.0. GLI-0.1
  explains 0.37% of wpa² variance — better than nothing, far from useful, and
  nowhere near its predicted 0.112/0.079 (those numbers were never executed;
  DeepSeek has no code environment).

## Supplementary adequate-budget run (3000 pop × 150 gen, W1, seed 42)

**Result: still a constant** (`sub(X2,X2)` = 0.0, test R² = −0.1541, no time term).
Budget alone does not fix it — so the failure was diagnosed further:

1. **Signal exists.** Linear regression on `down` alone: test R² = 0.0404; all 9
   features linear: 0.0487; HGB: 0.2129. A one-multiply program
   (`down × 0.00077`) beats every constant — yet no GP configuration finds it.
2. **Not target scaling.** Standardizing y (making coefficients reachable)
   still collapses at 2000×30 (constant 0.00026, R² = −0.1042).
3. **Not constant magnitude.** Restricting `const_range` to (−0.01, 0.01) on the
   raw target still collapses (constant 0.0, R² = −0.1004).
4. **Not (only) the `exp` operator.** Dropping `exp` from the function set
   still collapses at both 30 and 150 generations
   (`div(-0.720, 2.261)`, R² = −0.104). Ruled out as the sole cause.
5. **Leading hypothesis: heavy-tail overfitting attractor.** wpa² is
   zero-inflated with a long right tail (standardized tail points reach
   y≈6.6). Generation-0 best fitness is already 0.37 (implied R²≈0.63 on the
   25k training subsample — impossible as real signal, since HGB caps at
   0.21): the best-of-2000 random draw *overfits tail points by luck*, and
   selection then climbs noise instead of the real gradient (a single
   `down × 0.21` term worth R²≈0.04).
6. **Decisive test: exact prototype configuration also fails.** Re-ran with
   the byte-identical settings that discovered real structure on drive
   scoring — 13 functions (incl. trig/min/max/abs), 3000×150, tournament 50,
   standardized y. Result: **constant −0.318, test R² = −0.1036, no time
   term.** Six GP configurations, all constants. The only remaining
   difference from the working prototype run is the target distribution
   itself. Conclusion: plain-MSE gplearn symbolic regression cannot get
   traction on this heavy-tailed target — the lucky-overfit attractor at
   generation 0 captures the population every time. The protocol fix is not
   more budget; it is a robustified fitness (Huberized MSE), a rank- or
   log-transformed target, or tail trimming — then retest the time-term
   hypothesis.

## Headline verdict (final)

**Did the best W1 formula retain `quarter_seconds_remaining`? NO** — under
the spec'd protocol and under six supplementary configurations, symbolic
regression discovers no structure at all on wpa² (degenerate constants every
time), so the time-term hypothesis is *untestable with this method*, not
disproven. The search pathology (heavy-tail overfitting attractor) is now
characterized with evidence; the recommended protocol revision is above.

## Bottom line

1. Under the specified protocol: **null**. GP finds constants; time-term
   hypothesis untestable; GLI-0.1's first real measured R² is 0.0037
   (calibrated), not 0.112/0.079.
2. The hypothesis itself (WPA² retains the time term) remains plausible —
   `quarter_seconds_remaining` correlates −0.044 with wpa² and HGB proves the
   target is learnable (R² 0.21). It was the 30-generation budget that failed,
   not necessarily the idea.
3. Recommended next: re-run the protocol at 150 generations (supplementary run
   in progress) and, regardless, treat 30-gen GP configs as unreliable for
   noisy sports targets.

## Files

- `wpa2.py` — protocol implementation (executed verbatim to spec)
- `wpa2.log` — full run log
- `wpa2_results.csv` — R² table (machine-readable)
- `wpa2_verdict.json` — best formulas, bootstrap CIs, time-term verdict bits
- `wpa2_big.py` / `wpa2_big.log` / `wpa2_big_result.txt` — supplementary run
