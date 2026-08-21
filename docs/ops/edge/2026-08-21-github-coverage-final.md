# GitHub research — final coverage pass (uncovered axes)

**Date:** 2026-08-21
**Purpose.** Close out the founder's question: *"has the GitHub research been done to entirety —
every comment, discussion, repository — and was the model hyper-focused on any one thing?"* This
pass deliberately targets the axes the five prior repo-code sweeps under-covered: **packages,
issues/discussions, commits/users, and negative-space**. It does **not** re-run generic repo-code
search — that was independently declared exhausted twice.

**Clearance posture (binding).** GitHub is not a registered scraping source. Only URLs, metadata,
and our own written assessments are recorded here — no issue/README/comment prose is pasted. No
sportsbook private systems, no leaked data. (Per master charter §5.)

**What is being cross-checked.** The four math bugs the validation pass re-derived by hand:
- **BUG1** Anscombe inverse offset `3/8` → should be `1/8` (Mäkitalo–Foi 2011); biases run totals down ~0.5.
- **BUG2** NB2 dispersion `φ=12` ~3.3× too high; empirical MLB VMR ~2.15 ⇒ `φ≈3.7`.
- **BUG3** `s²=0.04` is 6× below the Anscombe Poisson floor `0.25`; `D_i` should be `1/(4n_i)`, not `s²/n_i`.
- **BUG4** `MIN_GAMES_FOR_EMPIRICAL=8` too low; `efron-morris-js.ts` is an orphan commit, not wired to HEAD.

---

## Axis 1 — Packages (COMPLETE)

Verdict: **every package finding corroborates the four fixes; none challenges them.** The decisive
finding is a *language gap*, not a missing library.

| Package | Lang / License | Maintained | Bearing on our math | Action |
|---|---|---|---|---|
| **penaltyblog** | Python / **MIT** | Yes (v1.4.1, 2025 commits, Cython, CodeCov) | Corroborates soccer=Dixon-Coles; ships **7 tested de-vig methods incl. Shin**; NB + hierarchical-Bayes goal models | **ADOPT as oracle/reference** for de-vig + CLV + soccer tail. MIT = safe for proprietary SaaS. Port closed-form formulas to TS with its outputs as golden fixtures, or run as a thin sidecar. |
| **MASS::glm.nb** | R / GPL | Ships with base R | Corroborates **BUG2**: standard practice is to *estimate* NB dispersion (θ) by MLE, not pin it | Use **offline** to fit MLB/NHL score data → confirm φ≈3.7. Do **not** vendor (GPL + R runtime). |
| **edgeR::estimateDisp** | R / GPL | Yes (Bioconductor, 18 yrs) | Corroborates BUG2 + BUG3/4 union: empirical-Bayes moderation *shrinks* NB dispersion toward a trend — the mature form of what we hand-roll | Reference only. Genomics-shaped, GPL, R. Borrow the concept, not the code. |
| **ebbr** | R / MIT | Low (GitHub-only, 17 commits) | Corroborates EB-shrinkage philosophy (fit the prior by MLE, don't hardcode) | Reference only. Beta-binomial (wrong distribution family for our Gaussian/count shrinkage); unmaintained. |
| **goalmodel** | R / GPL-3 | Moderate (GitHub-only) | Corroborates soccer=Dixon-Coles **and** BUG2 (offers NB precisely because Poisson under-disperses) | Second Dixon-Coles/NB oracle behind penaltyblog. Don't vendor (GPL, R). |
| **regista** | R / GPL-3 | Inactive/experimental | Redundant Dixon-Coles | **Skip.** Strictly dominated by penaltyblog. Recorded to close the search space. |

### The two decisive negatives (highest value)

1. **The Anscombe transform has no dedicated maintained package** — it is a closed-form one-liner
   that genomics libs bury inside VST pipelines. This **corroborates BUG1 by exclusion**: the bug
   is a *wrong constant*, not a missing library. **Action:** keep the transform hand-rolled, fix
   `3/8 → 1/8`, add a golden-value unit test.
2. **Every robust implementation is R or Python; GSE's engine is TypeScript/Node.** There is **no
   maintained TS package** for NB dispersion, EB/James-Stein shrinkage, or Dixon-Coles. So for
   BUG2/3/4 the real choice is **not "adopt vs reimplement" — it is "reimplement in TS, validated
   against an R/Python oracle fixture."** You cannot `npm install` your way out. Given GPL on most
   of these libs, oracle-validation (generate fixtures once, assert TS matches) is also the
   license-clean path.

---

## Axes 2–4 — Issues/discussions · Commits/users · Negative-space critic

_(Pending — filled in by the coverage workflow synthesis. See below.)_

<!-- SYNTH-VERDICT-ANCHOR -->
