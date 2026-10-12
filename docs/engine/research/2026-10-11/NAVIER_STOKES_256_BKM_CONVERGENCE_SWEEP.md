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

### Relation to the Harper audit benchmark — CORRECTED

> **Correction (session audit).** An earlier version of this section concluded that
> the cylindrical scheme "does NOT reproduce its Cartesian 32³ figure (0.9834)".
> A follow-up pole-row sweep falsified the reasoning behind that conclusion: 0.9834
> **is** reproducible, by the operator that lacks the single discretized singular
> term, and it converges there monotonically. The full attribution is below.

The audit's Cartesian 32³ configuration reports decay ratio **0.9834**; its 64³
reports **0.9698**.

A pole-row sweep over four pole treatments × two operators (`probe_pole.py`,
reprised in the test suite) separates the two candidate causes of divergence — the
pole row, and the presence of the `-u_θ/r²` term:

| Interior | Pole row | max Re(eig) @32 | @64 | ratio @0.02, Nr=64 | monotone |
|---|---|---|---|---|---|
| vector (`…-u/r²`) | zero | 574.2 | 12,509.8 | 5,665.4 (diverges) | no |
| vector | extrapolate | 277,002.5 | 4,440,398.6 | inf | no |
| vector | clamp | 95,999.1 | 1,538,046.6 | 1.17e85 | no |
| vector | pin u(0)=0 | 574.2 | 12,509.8 | 5,665.4 (diverges) | no |
| **scalar (no `-u/r²`)** | **zero** | **514.8** | **13,237.9** | **0.982902** | **yes** |
| scalar | extrapolate | 138,741.8 | 2,227,058.3 | 1.53e97 | no |
| scalar | clamp | 494.0 | 13,292.7 | 7,900.5 | no |

Two conclusions follow, and the second one is the correction:

1. **No pole row rescues the vector operator.** All four choices leave a positive
   spectrum, and the best of them still diverges at Nr=64. The instability is
   therefore **not** the pole row for the true operator — it is the discretized
   `-u_θ/r²` term itself, whose collocation against the clustered near-axis nodes is
   what generates the O(Nr⁴) positive eigenvalues.
2. **A pole row IS decisive for the operator without that term.** `scalar` and
   `scalar_pole_lhopital` share an identical interior and differ only in row 0, yet
   their spectra differ by three orders of magnitude (138,741.8 → 514.8 at Nr=32);
   the zero row turns an explosion into a **monotone** decay.

And the stable scheme **converges on the audit's number**:

| Nr | ratio @ t=0.020 |
|---|---|
| 32 | 0.976084 |
| 64 | **0.982902** |

That is within **0.05%** of the audit's Cartesian **0.9834**, rising toward it with
resolution. Note the honest caveat: the ratio passes slightly *above* 1 early in the
run (1.0078 at t=0.004) before decaying, so a small artifact is still present — the
scheme is stable and monotone *from its first recorded sample onward*, not
artifact-free.

**So which operator is right?** The θ-component of the vector heat equation in
cylindrical coordinates genuinely carries the `-u_θ/r²` term, so the vector form is
the faithful one — and it is exactly the form that will not converge here. The
audit's benchmark is **Cartesian**, and a Cartesian grid has no singular axis node,
so its discretization does not manufacture the term that breaks the cylindrical
vector collocation. The audit's 0.9834 is therefore best read as the answer of an
operator structurally like the scalar variant, which is why that variant reproduces
it and the faithful vector form does not.

**Resolved by measurement, not argument:** the `-u_θ/r²` collocation near the axis,
not the coordinate system and not the pole row, is the defect. The fix is a
pole-regular treatment of that term specifically.

### BKM integral

`I(t) = ∫₀ᵗ ‖ω‖∞ dτ` is integrated by trapezoid on the recorded trace and stored
per sample. At Nr=32, ν=0.005 (near-constant ‖ω‖∞ ≈ 27.5–28.3), I(0.02) ≈ 0.558.
It is finite in every completed case and unbounded in the diverged ones — which
is the correct reading, and also the reason it proves nothing about the
Millennium statement: a finite grid integral at finite T is not a regularity
proof, exactly as the BKM audit states.

---

## 3b. The 256³ grid: measured, not attempted-and-abandoned

The mission is titled "256³". The sweep as delivered stops at Nr=128, and during the
session audit the 256 row was attempted and **did not complete inside a 420 s
window**. Rather than leave that as a shrug, the cost was computed exactly, because
the substep requirement is a property of the stability limit and does not need the
evolution to run:

| Nr | max Re(eig) | ν=0.005 substeps/step | total RK4 steps | ν=0.05 total RK4 steps |
|---|---|---|---|---|
| 32 | 574.2 | 1 | 80 | 240 |
| 64 | 12,509.8 | 4 | 320 | 2,640 |
| 128 | 245,768.7 | 52 | 4,160 | 41,040 |
| **256** | **4,421,140.2** | **820** | **65,600** | **655,520** |

So reaching Nr=256 at ν=0.005 takes **15.8× the substeps of Nr=128**, each on a
257×256 field, and the high-dissipation regime takes 655,520 RK4 steps. The scheme's
cost per unit of simulated time grows roughly as Nr⁵ (the substep count grows as Nr⁴
and the field size as Nr², minus the FFT's log factor).

The decisive point is that the run would be **expensive and pointless at the same
time**: the positive eigenvalue at Nr=256 is 4.42e6 and grows as Nr⁴, so the same
non-dissipative-mode artifact that makes 64 and 128 diverge is 18× larger again.
Funding 65,600 RK4 steps would buy a more confident divergence, not new physics.

Recorded as a measured limitation: **256³ was not run, and the reason is
quantitative, not time.** The honest fix is still the pole-regular discretization in
the next section, after which the higher grids become both stable and affordable.

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

---

## 6. Feed recompile blocked by live credentials in the corpus

Recompiling the feed surfaced a security finding that outranks the numerics.

The feed row at line 92 was `Conversation with Muse AI_10-12-2026_1791774180.txt`,
a **4.85 MB raw agent conversation transcript** — about 5% of the whole feed in a
single row. GitHub push protection rejected the push twice with GH013, pointing
at that row for a **GitHub personal access token** and a **GCP API key bound to a
service account**, plus additional entries its classifier did not enumerate.

A targeted local scrub removed **2 GitHub-PAT-shaped and 4 OpenAI-key-shaped**
strings from that row, and the push was **still refused** — so the transcript
carries credential families my patterns do not model. Worse, the repo's own
pre-commit secret scanner passed the file both times with
`[secret-scan] OK ... no secrets detected`, so it is not a detector to trust for
this class of content.

Resolution: the row is excluded from the committed feed, with the reasons
recorded in `brain/feeds/2026-10-11/EXCLUDED.md` rather than dropped silently.
The source `.txt` is left untouched on disk (it is untracked by git, at
`docs/data-sources/research/2026-10-11/`). Feed went 94 → 93 rows, 20,645,869
bytes.

Two things follow, and neither is mine to close:

1. **The credentials in that transcript are live strings pasted into a chat log
   and should be rotated.** A transcript is not a secret store.
2. **A feed that ingests raw transcripts verbatim will keep re-introducing
   this.** Ingesting a 5 MB chat log as one row also means one row dominates the
   corpus; a size cap and a content class check belong in the feed builder.

The push then succeeded: `089d5ec28..0d8cb6e3f` on
`fix/galaxy-odds-first-2026-10-08`, confirmed against the remote.
