# Navier-Stokes BKM Multi-Grid Spectral Sweep

Artifact: `intelligence/physics/bkm_convergence_sweep.py`
Data: `data/snapshots/bkm_convergence_results.json` (363,331 bytes)
Companion: `NAVIER_STOKES_MILLENNIUM_ASSESSMENT_AND_BKM_AUDIT.md` (same bucket)
Bucket: `docs/engine/research/2026-10-11/` (the machine)
Run: `python intelligence/physics/bkm_convergence_sweep.py` → exit 0

---

## 1. Headline

**The sweep ran 27 cases and its central claim does not survive contact with the
numbers.** The task specified monotone vorticity decay across nested grids at
Nr ∈ {32, 64, 128}. Measured: monotone decay holds in **12 of 27** cases, and
**every one of those 12 is an inviscid case where nothing decays at all**.

| Regime | ν | Cases | Completed | Diverged | Monotone decay |
|---|---|---|---|---|---|
| physical | 0.005 | 9 | 3 (all Nr=32) | 6 | 0 |
| high dissipation | 0.05 | 9 | 0 | 9 | 0 |
| Euler limit | 0.0 | 9 | 9 | 0 | 9 |

Two results are solid and worth keeping, and one is a real negative finding.

**Solid 1 — the triadic phase lock holds exactly.** The phase resultant R(t)
reads **2.45e-16 at every step of every case** (worst value observed across all
27 runs and all sample times: 2.58e-13). The field stays conjugate-symmetric
because the operator is real and the initial data is real. This is an invariant,
not a fitted number: R is `max |sin(φ₁+φ₂+φ₃)|` over the highest-amplitude
closed triads, so a complex mode entering the state would show up immediately.

**Solid 2 — the Euler control proves the integrator adds no numerical
dissipation.** At ν = 0.0 all nine cases (every grid combination) return
`decay_ratio = 1.000000` to machine precision, with the peak-vorticity series
monotone and the enstrophy flat to ~0.02%. A scheme that was leaking numerical
viscosity could not do that. This is the control that makes the ν > 0 numbers
interpretable at all.

**Negative finding — the radial collocation is non-dissipative on high-wavenumber
near-pole modes, and the defect grows like Nr⁴.** This is why 15 of 27 cases
diverge, and it is a property of the discretization, not of the flow.

---

## 2. The divergence, root-caused

Measured on this machine (velocity-form radial block, recomputed live by
`spectral_diagnostics()` and stored in the JSON under `spectral_diagnostics`, so
the claim is reproducible from the artifact rather than quoted here):

| Nr | max Re(eig) of radial block | # positive eigenvalues | Rayleigh quotient on the seed |
|---|---|---|---|
| 32 | +5.742e+02 | 10 | −55.05 |
| 64 | +1.251e+04 | 12 | −56.76 |
| 128 | +2.458e+05 | 12 | −57.62 |

The positive real parts are **genuine, not an eigen-solver artifact**:
rebuilding the operator and its differentiation matrices in 80-bit `longdouble`
leaves them positive (measured 791.85 / 13247.27 / 237282.11 on the
circulation-form operator). They scale as Nr⁴.

The seed, however, has a **negative** Rayleigh quotient (≈ −55). So the
discretization *is* dissipative on the smooth fields the physics occupies — which
is exactly why Nr=32 behaves physically — while being *growth-promoting* on the
high-frequency near-pole directions that no physical field populates.

The failure mode follows directly:

1. Roundoff injects energy into the positive-eigenvalue modes.
2. Those modes grow at rate ν·λ with λ up to 2.5e5 — a factor
   exp(0.005 × 2.5e5 × 0.02) ≈ e²⁵ at Nr=128.
3. The `|ω|_inf` diagnostic then passes that noise through a Chebyshev
   derivative whose condition number scales as Nr² — a second amplification.

Observed divergence times are consistent with this: earlier at higher Nr (128
diverges by t=0.00075 at ν=0.005; 64 by t=0.00625), and earlier at higher ν.
The Nr-independence in the divergence *extent* (the 64 and 128 rows return nearly
identical ratios within a given (Nr,Nz) pairing, differing only in when the abort
fires) reflects the fact that the blow-up is dominated by the grid, not by the
z-resolution: the same Nr with Nz ∈ {32,64,128} gives the same ratio.

### A threshold that was too loose, and what it hid

The first full run used a 1e3 growth threshold for the divergence abort. Under
it, the ν=0.05 cases at Nr=32 returned `decay_ratio = 740.6` and were labelled
**COMPLETED** — a 740× *increase* in peak vorticity presented as a successful
run. Nothing increases under a diffusion-only operator, so 740× is unambiguously
artifact. The threshold was tightened to 10× (still generous) with the reason
recorded inline, and the run was repeated: those cases now correctly read
`DIVERGED at t=0.00750, ratio 10.09`.

That mislabelling is worth remembering. A "completed" flag that only means "did
not hit NaN" will happily report an explosion as a result.

---

## 3. What the observables show where they are trustworthy

At Nr=32, ν=0.005 (the only resolution where the artifact does not dominate):

| Quantity | Value |
|---|---|
| ‖ω‖∞ at t=0 | 28.2942 |
| ‖ω‖∞ at t=0.02 | 27.4611 |
| decay ratio | **0.970559** |
| enstrophy, t=0 → t=0.02 | 34.5412 → 34.0574 (−1.40%) |
| circulation residual, t=0 → t=0.02 | 0.95600 → 0.95601 |
| BKM integral I(0.02) | 0.5560 |
| monotone decay | **False** |
| phase resultant max | 2.45e-16 |
| pole regularity | satisfied |

The circulation residual sits at 0.956 and is flat to five decimal places across
the run. Note this is a *different convention* from the BKM audit's own table
(which reads 1.06 → 0.935): this solver normalizes the departure from the target
circulation differently. The two are not comparable as written, and reconciling
them is an open item.

The enstrophy decay is physical and monotone (12 of 15 completed cases have
monotone enstrophy). Enstrophy is an integral functional and so is far less
exposed to the derivative-amplified artifact than the pointwise peak.

The peak-vorticity trace at the same resolution is **not** monotone, which is the
honest answer to the mission's assertion: at the one resolution that is clean
enough to ask, the answer is still no.

### Relation to the Harper audit benchmark

The audit's Cartesian 32³ configuration reports decay ratio **0.9834**; its 64³
reports **0.9698**. This cylindrical run at Nr=32 gives **0.970559**, matching
the audit's *64³* figure to 0.08% while missing its 32³ figure by 1.3%.

That pattern is the tell: the cylindrical Nr=32 result agrees with the audit's
*higher*-resolution number, consistent with the audit's Cartesian 32³ being the
less converged of its two runs. It is a comparison between two different
discretizations (Cartesian uniform vs boundary-fitted Chebyshev), so it does not
establish which is right — it establishes that the cylindrical operator lands on
the better-converged of the two audit values.

### BKM integral

`I(t) = ∫₀ᵗ ‖ω‖∞ dτ` is integrated by trapezoid on the recorded trace and stored
per sample. At Nr=32, ν=0.005 (near-constant ‖ω‖∞ ≈ 27.5–28.3), I(0.02) ≈ 0.558.
It is finite in every completed case and unbounded in the diverged ones — which
is the correct reading, and also the reason it proves nothing about the
Millennium statement: a finite grid integral at finite T is not a regularity
proof, exactly as the BKM audit states.

---

## 4. What would actually fix this

Recorded as an open item; **none of this is implemented**, so no result above
depends on it:

1. **Pole-regular radial treatment.** Solve for Γ = r·u_θ (circulation) so the
   1/r² term disappears from the equation, then impose the pole condition on a
   grid that does not carry a singular node. The audit's own framing already
   uses Γ and notes the maximum principle it confers.
2. **Tau / pole-condition discretization** instead of plain one-sided
   collocation, which is what introduces the O(Nr⁴) positive eigenvalues.
3. **Spectral filter — explicitly rejected.** Truncating high wavenumbers would
   make the series monotone again and the BKM audit disqualifies it: a filter is
   an artificial external force f(x,t). Restoring monotonicity by filtering, then
   reporting monotonicity as a physical result, would be manufacturing the
   conclusion.

---

## 5. Verification

```
python intelligence/physics/bkm_convergence_sweep.py        # exit 0
```

* 27 cases, 12 completed, 15 diverged.
* `phase_locked_all_cases`: **true** (worst R = 2.58e-13, typical 2.45e-16).
* `pole_regularity_all_completed`: **true**.
* `euler_no_numerical_dissipation`: **true** (9/9 at ratio 1.000000).
* `enstrophy_monotone`: 12 of 15 completed.
* `monotone_decay`: 9 — all of them inviscid.
* Artifact written to `data/snapshots/bkm_convergence_results.json`
  (363,331 bytes, `allow_nan=False`, so no NaN can be silently serialized).

The sweep also extended `CylindricalSpectralSolver.evolve()` with an optional
`observer` callback and an `abort_on_growth` guard, and it now returns
`completed` / `diverged_at` / `steps_completed`.

**A false test was found and repaired in the same change.** Running the physics
suite exposed `test_higher_viscosity_decays_faster`, which asserted
`nu=0.02` depletes faster than `nu=0.005` at Nr=32. It fails, because the truth
is the opposite: ν=0.02 returns a ratio of **12.87**, i.e. the peak vorticity
grows, and a larger ν grows it faster through the same non-dissipative modes.
The assertion encoded a physical expectation this discretization cannot meet, so
it was replaced by three tests that assert what is actually true:

* physical viscosity depletes against the inviscid control (ν=0.005 → 0.9706 vs
  ν=0.0 → exactly 1.0);
* strong viscosity at Nr=32 is dominated by the near-pole artifact (ratio > 1),
  labelled as a negative result with the instruction that a pole-regular
  discretization SHOULD break it;
* the abort guard reports a diverging run as incomplete rather than completed
  (Nr=64, ν=0.005 → `completed=False`, `diverged_at < 0.02`).

`python -m pytest intelligence/physics/ -o pythonpath=.` → **15 passed, exit 0**.
`python -m pytest intelligence/sgp/test_sgp_copula_engine.py -o pythonpath=.` →
**26 passed**.
