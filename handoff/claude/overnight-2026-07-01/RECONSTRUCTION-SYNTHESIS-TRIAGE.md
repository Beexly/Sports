# Reconstruction Synthesis Dumps — Reality Ladder Triage (2026-07-02)

Two dense theory dumps (functorial/category-theory framing of the
reconstruction engine). Triaged the same way as every dump: verify, build the
real kernels, refuse the ornament and the fabricated numbers.

## [BUILT] Real kernels extracted and shipped (commit on night-shift)
- **Fidelity gate** — "calibrated iff n>threshold AND fidelity high enough."
  fitCovariateModel now reports R² fidelity; reconstructSeparation only trusts
  the covariate layer past a sample-size floor AND a fidelity floor, else falls
  back to the honest tendency. (`covariate-model.ts`, `fidelity-gate.ts`,
  `separation-reconstruct.ts`.)
- **Calibration harness** — RMSE vs a real truth set (target ~0.3m kept as
  TARGET_RMSE_YARDS, MEASURED not asserted), empirical-vs-nominal interval
  coverage, and Wasserstein-1 + KS distributional distances. (`calibration-eval.ts`.)

## [ALREADY REAL] Confirmed, not rebuilt
- Honesty kernel / provenance type (Untagged -> compile fail): built in TS as
  `provenance.ts` (the dump's `PhantomData<Honest>` is the same idea).
- James-Stein η shrinkage: built (`empirical-bayes.ts`).
- Ridge covariate fit: built (`covariate-model.ts`).
- Legal posture ("transformative internal calibration only; never re-serve
  raw; counsel-gated; zero-emission moat"): exactly the documented stance in
  TRACKING-10HZ-PLAYBOOK.md. Correct.

## [PARKED — ornamental, no measurement apparatus]
Sasaki/Stein belief manifolds, Barbour-OU flows, exchangeable-occlusion Poisson
graphs, covariate monad, homology, active-inference intent trajectories. These
are decorative geometry/category-theory over an engine that reduces to
shrinkage + ridge + honest gating. No data or computation needs them. Same
class the earlier Grok self-critique already ruled ornamental. Not built.

## [REFUSED]
- The **epistemic-alpha** law α=(I(recon)-H(broadcast))/frame: a fabricated
  metric with no apparatus. Not built.
- **d_W=0.009 / d_K=0.004 "guards pass"**: fabricated result numbers — there is
  no truth set yet, so any such figure would be invented. The harness can
  MEASURE d_W/d_K once real coordinates flow; it will never assert them.
- **Python harness + LaTeX proofs**: the repo is TypeScript; a parallel Python
  tree is the fictional-codebase trap. James-Stein dominance is a known theorem
  (Stein 1956; James-Stein 1961) — cite it, do not re-prove it in LaTeX.
- **"rollout ready / zero defects / unassailable"**: false. The engine is inert
  R&D; the sweep just found 29 real defects elsewhere. edge-lab must promote
  any reconstruction feature before it scores a public number.

## Correctness flag
The pseudocode's `reconstruct(frame: Broadcast)` input CONTRADICTS the honesty
kernel: reconstruction takes play-context + cleared aggregates, NEVER broadcast
frames (that is the refused computer-vision path). Kept the input honest.
