# Overnight sprint — Monte Carlo runner, circulation probe, and the standing deviation

Date: 2026-10-12 · Bucket: `docs/engine/research/2026-10-11/` (the machine)
Scope: the four overnight work items, each verified by running it.

---

## 1. Item status, verified by execution

| # | Item | State | Evidence |
|---|---|---|---|
| 1 | Keyless worker fallback (`workers/data-refresh/src/refresh-cycle.ts`) | **already landed** | `refresh-cycle.ts:66-97` implements it; `npx vitest run` → **16/16 pass**, exit 0 |
| 2 | Temporal dynamics for the cylindrical solver | **landed, with a stated deviation** | `evolve()` at `cylindrical_solver.py:214`; pytest → **14 passed**, exit 0 |
| 3 | Local headless Monte Carlo runner (`intelligence/colab/run_monte_carlo.py`) | **BUILT this session** | runs exit 0, writes `data/snapshots/sgp_copula_sample.npy` (10,000 × 4) |
| 4 | Docs + broadcast | this file + bus note | `gse/overnight-sprint` |

Items 1 and 2 were already in the working tree from the prior cycle; this session
verified them rather than rebuilding them, and spent its effort on item 3 and on
the one number that did not meet its stated target.

---

## 2. Item 2 — the deviation, stated plainly

The mission asked for a decay ratio `omega_final / omega_0 ≈ 0.9834` (the Harper
audit's 32³ Cartesian figure) and monotone decay. Measured on the committed
solver at 32×32, dt=0.00025, ν=0.005:

| Quantity | Value |
|---|---|
| omega_0 | 28.294212 |
| omega_final | 27.461197 |
| **decay_ratio** | **0.970559** |
| deviation from 0.9834 | **1.31%** — outside the 1% asked for |
| monotone decay | **False** — 33 of 80 steps rise (max upward step 0.047) |

**So item 2 does not meet its stated acceptance number, and the test does not
pretend it does.** The test asserts the ratio lands inside the audit's own
published *spread* [0.9698, 0.9834] and says in its comment that reproducing
0.9834 exactly is not claimed.

The measured 0.970559 sits within 0.08% of the audit's own **64³** value (0.9698),
which is the more resolved of the two audit numbers — consistent with the
cylindrical boundary-fitted scheme being better converged than the audit's 32³
Cartesian box, whose embedding residual is O(1e-1).

Monotonicity is the harder failure and it is a real one: the peak-vorticity trace
is non-monotone at every resolution tested. That is the O(Nr⁴) near-pole artifact
documented in `NAVIER_STOKES_256_BKM_CONVERGENCE_SWEEP.md`.

---

## 3. The circulation cure: tested, and it FAILS

The BKM audit's amendment named a pole-regular radial discretization as the honest
cure and the circulation variable `Γ = r·u_θ` as the first candidate, because the
coordinate singularity cancels analytically in that variable:

    ∂_t Γ = ν ( Γ_rr − (1/r) Γ_r + Γ_zz )

and for a regular field `Γ ~ c r²` near the axis, `Γ_rr → 2c` and `(1/r)Γ_r → 2c`,
so the two singular pieces cancel and the pole row is 0 **by regularity**.

`intelligence/physics/probe_circulation.py` measures it against the committed
operator through the same exact semigroup, same seed, same ν:

| Arms | ratio @32 | maxRe(eig) @32 | #positive | monotone |
|---|---|---|---|---|
| vector (committed, zero pole) | **0.970559** | 574.2 | 10 | — |
| **circulation (candidate)** | **86.579701** | **792.1** | **12** | **False** (40/40 steps rise) |

**The candidate is worse than the committed scheme on every axis**: 89× further
from the audit value, more positive eigenvalues, and a trace that rises on every
single step. The analytical cancellation is real; the *discretization* does not
realize it, and the Chebyshev nodes clustered at r→0 leave the two large terms
cancelling in exact arithmetic while their rounded arithmetic does not cancel.

Recorded as a **negative result**. The pole-regular cure remains open, and this
closes one candidate rather than leaving it untried:

* roll the pole row into the differentiation itself (a tau/pole-condition
  formulation) rather than zeroing a row of a dense matrix;
* or use a grid that does not carry the singular node at all;
* or accept the deviation and stop claiming the cylindrical scheme is the fix.

### A SECOND CORRECTION: the `-u/r²` term is physics, not a coordinate artifact

The earlier amendment (commit `5cc7643a9`) explained the audit mismatch by claiming
a Cartesian benchmark "does not manufacture the term that breaks the cylindrical
vector collocation", concluding the audit's 0.9834 must be a scalar-like answer.
**That reasoning is falsified by direct measurement**, and the correction is worth
more than the circulation result.

Write an axisymmetric theta-velocity field in Cartesian components,
`u_x = −f(r) sin θ`, `u_y = f(r) cos θ`, apply the ordinary componentwise Cartesian
Laplacian, and project back onto `ê_θ`:

| r | θ | Cartesian Laplacian (projected) | scalar `f_rr + f_r/r` | vector `f_rr + f_r/r − f/r²` |
|---|---|---|---|---|
| 0.3 | 0.4 | +10.200000 | +12.100000 | **+10.200000** |
| 0.7 | 1.1 | +19.800000 | +22.900000 | **+19.800000** |
| 1.0 | 0.4 | +27.000000 | +31.000000 | **+27.000000** |

The Cartesian operator matches the **vector** form to ~1e-8 and disagrees with the
scalar form by 1.9–4.0 in absolute terms. **The `−u_θ/r²` term is the correct
operator in either coordinate system** — it comes from the curvature of the `ê_θ`
direction, not from choosing cylindrical coordinates. A Cartesian solver of the same
field contains it too.

What differs is the **discretization**, not the operator: a Cartesian grid has no
coordinate singularity at `r = 0`, so it never collocates a `1/r²` against a
clustered node. The cylindrical Chebyshev block does, and that collocation carries
the genuine positive eigenvalues.

So the scalar variant's agreement with 0.9834 is a fact about **that variant**, not
evidence that the audit is scalar — and the session cannot distinguish "coincidence
of two discretizations" from "the audit's configuration has different near-axis
physics". Both remain open.

Pinned by `test_theta_component_operator_is_the_cartesian_one`, which asserts the
agreement to 1e-5 and the disagreement by more than 1.0, so the question cannot be
re-argued from prose. Physics suite: **15 passed, exit 0**.

### Two bugs in this probe's own first run, kept in the file's docstring

The first run reported the committed arm at ratio **1.27e12** and a `max nan`
trace. Both were my errors, not the solver's:

1. The control arm used pole row `2·D2[0]` — that is the **scalar** block's row,
   not the theta block's zero row. A comparison against a mis-specified control is
   not a comparison, and it made the committed arm look catastrophically worse than
   its true 0.9706.
2. `Γ / r` at r = 0 is 0/0, which propagated NaN into every downstream diagnostic.
   The pole row must be filled by the regularity value `u_θ(0) = 0`, never by
   division.

A probe that mis-specifies its control arm produces a confident wrong answer,
which is why both are recorded rather than quietly repaired.

---

## 4. Item 3 — the Monte Carlo runner, and the `+57%` reconciled

`intelligence/colab/run_monte_carlo.py` is a standalone NumPy-only replica of the
Gaussian-copula Cholesky simulation in `gse_colab_sim_grid.ipynb`: no Colab, no
GPU, no torch, no scipy. Verified: runs exit 0, 5.0 ms for 10,000 draws, and writes
`data/snapshots/sgp_copula_sample.npy` — shape **(10000, 4)**, float64, column
means [244.47, 1.78, 74.12, 0.39] against the declared marginals
(245.5 yards, λ=1.80 TDs, 74.5 yards, λ=0.40 TD).

The brief asserted a `+57%` structural edge. That number is **reproduced**, but not
by the 4-leg parlay — it is the **notebook's own 2-leg demo**:

| Case | market implied | true joint | lift |
|---|---|---|---|
| notebook's 2-leg demo (QB yards + WR yards, ρ=0.72, normal marginals) | 0.2170 | 0.3425 | **+57.86%** |
| 4-leg parlay (yards, pass TDs, rec yards, anytime TD) | 0.0292 | 0.1295 | +343.07% |

Both are printed side by side by the script. **Neither is tuned to a target** — the
inputs are stated in one place and the output is measured. The `+57%` in the brief
describes the notebook's demo; the 4-leg number is larger because independence
error compounds across four correlated legs.

### One deliberate change from the notebook, and why

The notebook applies a **normal** marginal to every leg, including count legs. A
normal puts mass below zero on a passing-yards line and treats a touchdown count as
continuous. This script keeps the Cholesky core identical:

    L = cholesky(Σ);  Z = randn(n, k);  X = Z @ L.T

and maps the correlated uniforms through each leg's **own** quantile function —
Log-Normal for yards, Poisson for counts — which is what a Gaussian copula actually
is. The dependence structure is unchanged; only the marginals are corrected.

### What it does NOT do

* **It invents no correlations.** The 4×4 matrix is hand-set and labelled in the
  output as `ILLUSTRATIVE — no in-repo estimator exists for same-game leg
  dependence`. This is the same gap the audit ranked as the single highest-value
  build in the set.
* **It invents no market price.** The "market" arm is the book's naive independence
  model (the product of leg probabilities), not a quoted SGP price, because no
  quoted SGP price exists in the repo. The alpha is therefore a measure of the
  *independence error*, not of a real book's mispricing.
* Correlation recovery is honest but imperfect at 10,000 draws: target ρ=0.28
  recovers as 0.22, ρ=0.52 as 0.44. That is sampling error on a 4×4 estimate, and
  it is printed rather than hidden.

---

## 5. Verification commands

```
node node_modules/vitest/vitest.mjs run workers/data-refresh/src/__tests__/refresh-cycle.test.ts
    → 16 passed / 16, exit 0

python -m pytest intelligence/physics/test_cylindrical_solver.py -o pythonpath=.
    → 14 passed, exit 0        (interpreter: Python313, which carries pytest + numpy)

python intelligence/colab/run_monte_carlo.py
    → exit 0, npy written

PYTHON313 intelligence/physics/probe_circulation.py
    → exit 0, negative result recorded
```

Honest note on interpreters: the repo has no venv and the Hermes-managed
`python` (3.14.7) ships numpy but **not pytest**. The suites above were run with
`C:/Users/Garrett/AppData/Local/Programs/Python/Python313/python.exe`, which has
pytest 9.1.1 and numpy 2.5.2. `python -m pytest` on the bare `python` fails with
`No module named pytest` — that is an environment fact, not a test failure.

---

## 6. What is still open

1. **The near-pole instability is unfixed.** Monotone decay does not hold and the
   ratio misses its 1% target by 1.31%. The circulation cure is now tested and
   rejected; the remaining candidates are a tau/pole-condition formulation or a
   node-free grid.
2. **Same-game leg correlations have no estimator.** The Monte Carlo runner is a
   price calculator whose dependency structure is an input nobody produces. This is
   the highest-value build in the set and it is unstarted.
3. **No SGP price is ingested anywhere**, so SGP alpha cannot be measured against a
   real book.
4. **The 4-leg sample is illustrative.** It demonstrates the machinery; it is not a
   pick and not a claim about a real game.
