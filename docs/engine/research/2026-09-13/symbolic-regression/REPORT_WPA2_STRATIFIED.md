# Experiment 2 — Time-stratified SR on WPA² (Redesign A) + Soft-target SR (Redesign C) + Play-type residual gate

**Date:** 2026-09-13 | **Parent analysis:** MOVE-37-ANALYSIS-04 (deepseek-move37-analysis-round-04.md)
**Harness:** tournament.py with all seven §7 fixes (see TOURNAMENT_CHANGELOG_2026-09-13.md)

## 0. Spec correction (documented, not silent)

The analysis (§1.3) defines strata on `quarter_seconds_remaining`: "Q1 plays
(qsec > 2700) — time essentially constant" and "Q4 plays (qsec < 900) — time
varies maximally". **In nflfastR, `quarter_seconds_remaining` is seconds
remaining in the quarter (observed max 900, mean 432).** The paste's author
assumed game-level seconds. With that column the spec's strata are degenerate:
the "Q1" stratum contains 0 rows and the "Q4" stratum contains all rows
(verified: 0 / 141,288 plays with qsec > 2700).

The spec's intent is unambiguous — early-game plays where time is ~constant vs
late-game plays where time varies maximally — so stratification was performed
on `game_seconds_remaining` (observed range 0–3600):

- **EARLY stratum:** game_seconds_remaining > 2700 (1st quarter; time ~constant, control)
- **LATE stratum:** game_seconds_remaining < 900 (4th quarter; time varies maximally)

The SR feature set is **unchanged** (W1 nine features, X4 =
quarter_seconds_remaining). Inside the LATE stratum (all Q4/OT plays),
quarter_seconds_remaining equals game seconds remaining, so the end-of-game
time gradient is present in X4 exactly where the conditional-contribution
hypothesis says it should matter. Row-alignment guard (§7 fix 5) enforced on
every evaluation frame.

## 1. Redesign A — time-stratified SR

Protocol (reused from REPORT_WPA2_ROBUST): y = wpa² clipped at stratum-train
99th pct, standardized on stratum-train; 9 W1 features standardized
(StandardScaler fit on stratum-train); gplearn SymbolicRegressor, log-cosh
fitness, function set {add,sub,mul,div,sqrt,log,abs,inv,tanh}, pop 2000 × 30
gens, parsimony 0.001. Seeds LATE [42,123,7] (critical stratum), EARLY [42,123].
Splits: primary train 2021–2022 → test 2023; replication train 2021–2023 → test 2024.

### 1.1 Probe diagnostics (GBM ceiling gate + gen-0 + affine-calibrated baselines)

| stratum | split | n_tr | n_te | clip99 | tail kurt | GBM ceiling | tier | OLS linear | structure |
|---|---|---|---|---|---|---|---|---|---|
| LATE | primary | 19,121 | 9,453 | 0.0565 | 31.4 | **0.3079** | high | 0.0514 | nonlinear headroom exists |
| LATE | replication | 28,574 | 9,399 | 0.0533 | 29.8 | **0.2979** | high | 0.0420 | nonlinear headroom exists |
| EARLY | primary | 16,013 | 8,082 | 0.0177 | 18.7 | 0.1514 | high | 0.0882 | nonlinear headroom exists |
| EARLY | replication | 24,095 | 7,814 | 0.0178 | 18.8 | 0.1375 | standard | 0.0749 | — |

Gen-0 diagnostics (standardized 1-gen probe, seed 42): all four combos
train ≈ −0.028, test ≈ −0.025…−0.029, gap ≈ 0.00 → **no attractor suspect**
anywhere. The log-cosh landscape is honest in-stratum too.

Baselines (ALL affine-calibrated per §7 fix 1):

| stratum | split | B1 (train mean) | B2 human heuristic (calibrated; contains time term) | B3 GLI-0.1 (calibrated) |
|---|---|---|---|---|
| LATE | primary | −0.0000 | **0.1233** | 0.0201 |
| LATE | replication | −0.0003 | **0.1165** | 0.0172 |
| EARLY | primary | −0.0000 | 0.0129 | 0.0051 |
| EARLY | replication | −0.0000 | 0.0147 | 0.0030 |

Note: the calibrated human heuristic — which *contains* the time term —
explains R² ≈ 0.12 in the LATE stratum (vs 0.053 on full data). The time term
carries real, concentrated signal exactly where the hypothesis predicts. The
question is whether SR can find it.

### 1.2 SR results — LATE stratum (critical test)

| split | seed | test R² | program | X4 in program | retained |
|---|---|---|---|---|---|
| primary | 42 | 0.0307 | `mul(-0.192, abs(X3))` | No | No |
| primary | 123 | 0.0369 | `log(tanh(inv(sqrt(tanh(X3)))))` | No | No |
| primary | 7 | −0.0263 | `-0.160` (constant) | No | No |
| replication | 42 | 0.0315 | `mul(-0.211, abs(X3))` | No | No |
| replication | 123 | 0.0385 | `log(tanh(inv(sqrt(tanh(X3)))))` | No | No |
| replication | 7 | −0.0220 | `-0.160` (constant) | No | No |

(X3 = score_differential in all cases.)

- Best LATE formula (seed 123, both splits): a baroque transform of
  |score_differential|, R² 0.0369 / 0.0385.
- Smooth-linear test (§7 fix 6): OLS on the same 9 features gives 0.0537 /
  0.0433, **beating** the best SR formula on both splits → kink is decoration.
- The calibrated human time-term heuristic (0.1233 / 0.1165) beats the best
  machine formula by **0.086 / 0.078** — a wider gap than on full data.
- The −0.211 constant reappears bit-identically (replication seed 42), the
  same log-cosh optimum as the full-data run.

### 1.3 SR results — EARLY stratum (control)

| split | seed | test R² | program | X4 in program |
|---|---|---|---|---|
| primary | 42 | 0.0767 | `mul(0.192, X0)` | No |
| primary | 123 | **0.1126** | `sub(X0, tanh(X0))` | No |
| replication | 42 | 0.0675 | `mul(0.192, X0)` | No |
| replication | 123 | **0.0922** | `sub(X0, tanh(X0))` | No |

(X0 = down.)

- Control behaves as expected: **no time term** in the EARLY stratum (time
  ~constant), so the absence of X4 there is not informative — it is the LATE
  absence that carries the verdict.
- Secondary observation (honest, not a discovery claim): both EARLY seeds
  independently found down-only forms; `sub(X0, tanh(X0))` replicates across
  splits (0.1126 / 0.0922) and **beats** the smooth-linear OLS (0.0898 / 0.0777)
  → kink is NOT decoration here; the down effect is genuinely nonlinear
  (saturating transform). Same class as the residual-EPA "down only" finding:
  a trivial single-feature form, interesting only as a coefficient estimate.

### 1.4 Verdict — Redesign A

**SEARCH-SPACE LIMITATION CONFIRMED at the strongest possible test.** No
quarter_seconds_remaining term appears in any of the six LATE-stratum programs
across both splits — not even in-program, let alone retained — despite:
(a) GBM ceiling ≈ 0.30 with confirmed nonlinear headroom above linear,
(b) the calibrated human time-term heuristic explaining R² ≈ 0.12 in-stratum,
(c) an honest (attractor-free) log-cosh landscape, and
(d) the time gradient being maximally exposed by the stratification.

Per the pre-registered interpretation rule, the conditional-contribution
hypothesis is not confirmed; instead the method's inability to assemble the
time term is confirmed under the most favorable conditions the design allows.

## 2. Redesign C — soft target regularization on full WPA² (conditional; A failed → ran)

Protocol: identical to wpa2_robust.py primary split (train 2021–2022 n=70,912
→ test 2023 n=35,474), log-cosh fitness, with ONE change: soft target
regularization beta=0.9 applied to y_train before fitting
(`tournament.soft_target_transform`; Vanneschi & Castelli 2021). Seeds [42,123,7].
GBM ceiling on the (untransformed) split: 0.2168, tier high.

| seed | test R² | program | X4 in program | retained | kink decoration |
|---|---|---|---|---|---|
| 42 | −0.0300 | `-0.168` (constant) | No | No | Yes |
| 123 | −0.0207 | `-0.139` (constant) | No | No | Yes |
| 7 | −0.0030 | `mul(-0.238, sqrt(X3))` | No | No | Yes |

Soft-target diagnostics: train target std 1.0000 → 0.9000, median preserved.
Two of three seeds collapsed to constants; the third found a
sqrt(|score_differential|) variant at R² −0.0030 — **worse** than log-cosh
alone (best 0.0157). The soft-target compression removed what little gradient
the GP was exploiting; it did not preserve conditional structure here.

### Verdict — Redesign C

**SR METHOD DECLARED STRUCTURALLY INCAPABLE of this target class** (per the
analysis's pre-registered rule: "If C fails, the SR method is declared
structurally incapable of this target class"). Neither stratification (the
strongest test of the conditional-contribution hypothesis) nor soft target
regularization (the strongest anti-overfitting remedy in the literature
surveyed) enables the GP to discover the time term that the calibrated human
heuristic uses to reach R² ≈ 0.12 in the late-game stratum.

## 3. Play-type residual gate probe (§3.4)

Target = pass_indicator − xpass (nflfastR's xPass column), same rows throughout
(row-alignment guard enforced), W1 9 features. Baseline registry check:
`play_type` → xPass exists → **residual-only, SR on raw play-type would be
circular** (confirmed before running).

| split | n_tr | n_te | resid mean | tail kurt | GBM ceiling | tier | OLS linear | verdict |
|---|---|---|---|---|---|---|---|---|
| primary (2021–22→2023) | 70,912 | 35,474 | −0.0431 | −1.04 | **0.0527** | standard | 0.0400 | CONTINUE — kill threshold not met |
| replication (2021–23→2024) | 106,386 | 34,902 | −0.0437 | −1.04 | **0.0375** | low-signal | 0.0264 | CONTINUE — low-signal flag |

- The pre-registered prediction (ceiling < 0.03 → kill) **did not hold**:
  0.0527 / 0.0375 clear the kill threshold, so per the mechanical gate SR is
  not skipped. **No SR was run** — per tasking, the probe stops at the gate;
  the spend decision goes back to the theorist.
- Caveats for the theorist: (i) the residual signal is thin and mostly linear
  (OLS captures 0.040/0.026 of 0.053/0.038 — little nonlinear headroom, so SR's
  discovery space offers limited advantage); (ii) the residual is bounded in
  [−1,1] with kurtosis −1.04 → light-tailed → **MSE** (not log-cosh) is the
  correct fitness per §7 fix 4 if SR is ever run here; (iii) residual mean
  ≈ −0.043: xPass overpredicts pass probability by ~4.3pp on this
  pass/run-filtered sample — possible miscalibration finding or
  sample-selection artifact (xPass was trained on all play types); reported
  as observation, not claim.

## 4. IRL coaching-utility (atlas rank 1) — NOT attempted

Per tasking: the IRL fourth-down refinement needs a runnable protocol spec
from DeepSeek first (Sandholtz et al. 2024 executed the base experiment; GSE's
version must be specified as a refinement: full utility-function recovery +
real-time decision prediction). **Awaiting spec.** No code written, no compute
spent.

## 5. Artifacts

- `wpa2_stratified.py` — Redesign A protocol (phased + checkpointed)
- `wpa2_stratified.log` — full stdout
- `wpa2_strat_ests/` — 10 fitted estimators (LATE×{primary,replication}×3 seeds, EARLY×{primary,replication}×2 seeds)
- `wpa2_strat_probe.json` — gates, gen-0 diagnostics, calibrated baselines per stratum×split
- `wpa2_strat_eval_{LATE,EARLY}_{primary,replication}.json` — per-seed programs, R², time-term checks, smooth-linear tests
- `wpa2_strat_summary.json` — assembled verdicts
- `wpa2_softtarget.py` / `wpa2_softtarget.log` / `wpa2_softtarget_ests/` / `wpa2_softtarget_results.json` — Redesign C
- `playtype_resid_gate.json` — §3.4 gate probe numbers
- `TOURNAMENT_CHANGELOG_2026-09-13.md` — the seven harness fixes
- `tournament.py` — harness with fixes (also at `~/workspace/gse-discovery/tournament.py`)

## 6. Known limitations

- Gen-0 "implied train R²" extraction inside `phase_eval` returned NaN:
  gplearn 0.4.3 does not retain `raw_fitness_` on generation-0 programs after a
  full 30-generation fit (verified: present on last-gen programs, absent on
  gen-0). The authoritative gen-0 diagnostics are the probe-phase values from
  the standardized `gen0_diagnostic` (1-generation fits), which are real and
  reported in §1.1.
- OT plays fall in the LATE stratum (gsr < 900 includes OT); negligible count,
  no material effect.
- Stratification uses game_seconds_remaining while the SR feature remains
  quarter_seconds_remaining — the documented correction in §0; in Q4 the two
  coincide.
