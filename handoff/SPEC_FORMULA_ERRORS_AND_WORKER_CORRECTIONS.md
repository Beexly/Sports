# Two Spec Errors, Two Worker Corrections — and Both Corrections Beat My Brief

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21

This is recorded because the *briefs I wrote for the workers were wrong in two places*, and
the workers corrected them against the primary source. That is the interesting part: a
delegate that only follows its brief produces a module that implements the brief. The
corrections came from reading the spec.

---

## 1. The spec's Murphy Brier formula is algebraically wrong, and the worker implemented the correct partition

**The spec says** (pt2.txt:645, and the same formula at frontier.txt:735):

> Murphy (1973) Brier Decomposition: Updates `BS=REL-RES+UNC = (1/N)Σ(p_k-y_k)² - (1/N)Σ(y_k-ȳ)² + ȳ(1-ȳ)`

**That does not reproduce the Brier score.** Measured on 4,000 deterministic binary
outcomes with 11 forecast groups:

| form | value |
|---|---|
| the spec's literal formula | **0.415369** |
| the actual Brier score `(1/N)Σ(p-y)²` | **0.165485** |

The spec's own `RES` term — `(1/N)Σ(y_k-ȳ)²` — is the *outcome* variance, and subtracting it
from the Brier score and adding back `ȳ(1-ȳ)` yields something that is not a Brier score
and is not a decomposition of one. The spec's stated identity `BS = REL - RES + UNC`
cannot hold with those definitions.

**Murphy (1973)'s actual partition** — which the spec cites by name — is over the *K
forecast groups*, not over the individual observations:

```
REL = (1/N) Σ_k N_k (p̄_k - ȳ_k)²     reliability: how far each forecast group sits from the base rate
RES = (1/N) Σ_k N_k (ȳ_k - ȳ)²         resolution:  how much the outcomes vary within a group
UNC = ȳ(1 - ȳ)                        uncertainty: the base rate's own variance
BS  = (1/N) Σ_k N_k (p̄_k - y_k)²       the Brier score
```

**Verified on the same data:** `BS = REL - RES + UNC` holds to a residual of **1.03e-15**,
all three components are non-negative, and `BS ≤ REL + UNC`. The module reports
`identityResidual: 0`.

**The worker implemented Murphy's partition, not the spec's formula, and documented the
deviation in the module header** — noting that the binding constraint ("the identity holds
exactly") and the spec's own §5.3 text agree on the Murphy partition, so the formula as
transcribed is the error. A separate `murphyCalibrationPartition` returns the K-bin view.

**Why this is the right call.** The spec names two things: the *identity* (which is the
point of a decomposition) and the *formula* (which is wrong). The identity is testable and
the formula is not self-consistent. Implementing the formula would have produced a module
whose `bs` is not the Brier score — and the Brier score is what the rest of the settlement
loop consumes.

**The G7 rule is unaffected:** `ECE30 - ECE250 > 0.02` halts firing on that market family.

## 2. The spec's Participation Ratio is the eigenvector ratio, and the spectral ratio cannot gate

**My brief asked for** the spectral ratio `(Σλ)²/Σλ²` and told the worker to gate on
`PR > 1/3`.

**The spec says** (frontier.txt:665):

> Participation Ratio `PR(u₁)/M = 1/(M Σ_{m=1}^{M} u_{1,m}⁴) > 1/3` confirms a coherent
> multi-market factor rather than a localized outlier

**My brief was wrong, and provably so.** By Cauchy-Schwarz, the spectral ratio
`(Σλ)²/Σλ²` is **≥ 1 for any non-negative spectrum** — measured 2.1038 on the spike case.
It can therefore **never be below 1/3**, so gating on it would refuse *nothing*. A gate
that cannot fail is not a gate.

The spec's eigenvector ratio `1/(M·Σu_m⁴)` is bounded in `(0, 1]`, is ≈1 for a coherent
multi-market factor and small for a localized outlier, and is the only form that can
distinguish the two cases the spec names.

**The worker implemented the spec's form as the gate** and also returns the spectral one
under a different name (`spectralParticipationRatio`), with the reasoning in the module
header.

**Measured, T=200, M=20, α=0.05** (constants: `λ₊ = 1.732455532033676`,
`σ_TW = 0.061909134656697354`, `s_α = 1.2075818914181795`,
`threshold = 1.8072158819584734`, `√(M/T) = 0.31622776601683794`):

| case | λ₁ | PR | detected? |
|---|---|---|---|
| rank-1 spike, θ₁=1.8 | 4.1934 | 0.9200 | **yes** (margin 2.386 over threshold) |
| pure isotropic noise | 1.5385 | 0.5828 | no |
| noise just above the MP edge | 1.7337 | — | **no** (λ₁ > λ₊ but < threshold) |
| localized outlier, 3 of 20 markets | 10.8575 | **0.1503** | **refused** (PR < 1/3) |

The last row is the one that matters: a very large λ₁ that is nonetheless a *localized*
outlier is refused. A detector that only compared λ₁ to a threshold would have fired on it.

**The MP edge is exact**: M=T→4, M=1,T=1→4, M=4,T=100→1.44.

## 3. The sweep pins the transposed aspect ratio

`λ₊ = (1+√(M/T))²`. The classic error is `(1+√(T/M))²`, and the sweep mutates exactly
that:

```
OK   [P1] the Marchenko-Pastur edge uses the TRANSPOSED aspect ratio (T/M instead of M/T): "is exact for known aspect ratios" -> did not pass, as required
OK   [P1] the detection threshold ignores the Tracy-Widom term -> did not pass, as required
OK   [P2] the Participation Ratio requirement is dropped -> did not pass, as required
OK   [P2] the detector fires on pure noise -> did not pass, as required
OK   [P2] the threshold is loosened until the null trips it -> did not pass, as required
OK baseline: all 17 tests pass
```

**5/5 detected, exit 0.** The "does not cry wolf on pure isotropic noise" case is the half
that is usually missing.

## 4. A third correction, in T15: the artifact's own verdict outranks its numbers

The T15 worker found something I had not asked for. The spec-named `walk_forward.json`
contains frozen-manifest models that **do** clear the numeric triple:

| family | CRPS | delta vs Gaussian 13.45 | `le_abs_bar_7.099` |
|---|---|---|---|
| `student_t` | 7.0115 | 0.0156 | true |
| `normal_mixture_2` | 7.0079 | 0.0192 | true |

...and the file's top level still says **`passed: false`** and
**`models.gate_cleared: false`**.

**So a gate that evaluated only the three numbers would have OPENED on a file that declares
itself not cleared.** The worker therefore gates on the conjunction AND on the artifact's
own verdict.

That is the same lesson as the PR and the Murphy partition, at a third level: the numbers
are the mechanism, the artifact's own verdict is the truth. `walk_forward.json`'s own
`pooled` block (`delta_conditional_vs_gaussian: -0.034`) is not itself a qualifying
candidate — the spec's `rule.passed_if` is per-model.

## 5. What this says about the briefs I write

Two of my briefs asserted a formula and a threshold, and in both cases the worker read the
primary source, found the brief was wrong, and implemented the spec's version — saying so
in the file and reporting the deviation.

**The lesson for the audit itself:** a brief that asserts a formula is a liability. The
formulas in the spec are transcribed, and transcription is where algebra dies. The workers
that read the source and disagree with their brief are the ones worth having; the ones that
follow the brief faithfully would have shipped a module that computes a number the spec
never asked for.

**This is also why the primary-source rule in the audit skill matters.** Three separate
times now — the canonical AST (a script's private function), the canonical AST strings
themselves (a script, not the library), the 7.099 bar (three documents, enforced nowhere) —
the thing that looked authoritative was not where it was said to be.
