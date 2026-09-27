# Experiment 1 — Robustified WPA² SR with log-cosh loss (MOVE-37-ANALYSIS-02, §2)

**Date:** 2026-09-13 | **Verdict: FALSIFIED** — time-term hypothesis rejected;
method declared incapable of solving this target (per the pre-registered falsification rule).

## What was run

Target y = wpa², clipped at 99th pct of train, standardized on train. 9 pre-snap
features (W1 set). gplearn SymbolicRegressor, **log-cosh fitness** (custom metric
via `gplearn.fitness.make_fitness`), function set
{add,sub,mul,div,sqrt,log,abs,inv,tanh}, pop 2000 × 30 gens, parsimony 0.001,
features standardized (same as round 1 — isolates the fitness intervention).

Corrections to the paste's code (documented): `make_fitness` imported from
`gplearn.fitness` (paste wrongly used `gplearn.functions` — would have crashed);
wp/qsec carried in the same filtered frame as X (alignment by construction);
B3 (GLI-0.1) added with affine calibration; replication SR rerun and
shuffled-target null added per the falsification rule's "both splits" clause.

## Baselines (primary: train 2021–2022 n=70,912 → test 2023 n=35,474)

| model | test R² |
|---|---|
| B1 (train mean) | −0.0000 |
| B2 (human heuristic, raw per spec) | −0.2755 |
| B2 (human heuristic, affine-calibrated — sensitivity check) | **0.0531** |
| B3 (GLI-0.1, affine-calibrated) | 0.0037 |
| B3 (GLI-0.1, raw) | −17.6215 (scale mismatch, meaningless) |
| B4 (HGB signal ceiling) | 0.2168 |
| **Best SR (log-cosh, seed 42)** | **0.0157** |

SR seeds: 42 → R² 0.0157 (`mul(-0.211, abs(X3))` = −0.211·|score_differential|);
123 → R² −0.0156 (constant −0.120); 7 → R² −0.0030
(`log(tanh(inv(sqrt(sqrt(X3)))))`, a near-constant transform of |score_differential|).
**No seed's program contains X4 (quarter_seconds_remaining).**

## The heavy-tail attractor is GONE under log-cosh

Gen-0 diagnostic (implied train R² of the generation-0 best program):
seed 42 → −0.0153; seed 123 → −0.0226; seed 7 → −0.0566.
Round 1's MSE signature was gen-0 implied R² ≈ 0.63 (impossible as real signal —
the GP latching onto tail noise). Under log-cosh the gen-0 best is perfectly
ordinary. **DeepSeek's diagnosis was correct and the prescribed fix works as
intended: the pathological selection dynamics are eliminated.** The GP now does
honest search. It just finds no signal: best R² 0.0157 against a 0.2168 ceiling.

## Replication (train 2021–2023 n=106,386 → test 2024 n=34,902, seed 42)

R² = 0.0183, program = `mul(-0.211, abs(X3))` — **bit-identical formula to the
primary run, including the constant −0.211**, despite different training data.
The log-cosh optimum at −0.211·|score_differential| is remarkably stable. It still
contains no time term.

## Shuffled-target null

Refit on within-game-shuffled train y (seed 42): program collapses to the bare
constant `−0.211`, test R² = −0.0463 ≤ 0.05 → null behaves correctly.

## Pre-registered criteria

| # | criterion | observed | pass |
|---|---|---|---|
| 1 | Best SR holdout R² > 0.05 | 0.0157 | **FAIL** |
| 2 | Best SR beats B2 by ≥ 0.02 | +0.2912 vs raw B2 (−0.2755) | PASS* |
| 3 | Replicates at R² > 0.03 on 2024 | 0.0183 | **FAIL** |
| 4 | Best formula retains quarter_seconds_remaining | X4 in neither split's program | **FAIL** |
| 5 | Shuffled-target R² ≤ 0.05 | −0.0463 | PASS |

\* Criterion 2 passes only because the spec's B2 is uncalibrated (always
non-negative against a zero-mean target). Against the fairly calibrated human
heuristic (R² 0.0531) the best SR formula **loses by 0.0374**. The calibrated
human heuristic — which *contains* the time term — beats the machine's formula,
which dropped it.

## Falsification

The rule: "If the best formula collapses to a constant OR drops the time term on
**both splits**, the time-term hypothesis is rejected and the method is declared
incapable of solving this target." The best formula drops X4 on both splits
(and a second seed collapsed to a constant outright). **FALSIFIED.**

Note what this does and doesn't say: the *time-term hypothesis for WPA²* is
rejected under this method, and the method (even robustified) cannot solve this
target — best R² 0.016 vs ceiling 0.217. It does NOT say time is irrelevant to
win leverage (HGB finds real signal; the calibrated human time-term heuristic
beats the machine). The residual method (§4 / Experiment 3) is a different
target and is unaffected by this verdict.

## Reproducibility

- `wpa2_robust.py` — full protocol, phased + checkpointed (rerunnable)
- `wpa2_robust.log` — run log; `wpa2_robust_ests/` — fitted estimators per seed
- `wpa2_robust_results.csv`, `wpa2_robust_summary.json`,
  `wpa2_robust_eval_primary.json`, `wpa2_robust_eval_repl_shuff.json`
- No Huber fallback was needed — log-cosh was numerically stable throughout.
