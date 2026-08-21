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

## Axes 2–5 — Issues/discussions · Commits · Users · Negative-space (COMPLETE)

Two independent workflows covered these axes (one adversarial, one code-content-first). **They
converge:** after an explicitly adversarial pass, **zero credible contradiction** to any of the four
fixes survived; **zero commits anywhere revert in the direction of our fixes.** Three of the four came
out *stronger*; one sport was reclassified.

### THE HEADLINE — one material correction: NHL should NOT use NB2

The single finding that *changes the build* (code-content axis, `sports-quant-platform/tests/test_overdispersion.py`,
an asserting test file):

- **Empirical NHL goal dispersion ≈ 1.01 (Poisson-exact) over 52,540 team-matches** — commented
  *"Poisson exacto, no debe llevar k."* Independently echoed by three other tested repos (JonnyParlay
  puts NHL points in a `POISSON_STATS` set; Omega returns `'poisson'` for goal rate; NewJerzzy flags
  NHL lowest-variance).
- Our fix #4 bundled **MLB + NHL** together as "NB2." **That bundle is wrong.** MLB genuinely
  overdisperses (**same file: MLB dispersion 2.21, k≈3.8 — which *corroborates* φ≈3.7**); NHL does not.
  Forcing NB2 onto NHL goals inflates tail variance with no empirical basis → systematically mis-prices
  NHL totals/tail props.
- **Action:** split the per-sport switch — **NB2 for MLB, Poisson for NHL.** Cleanest form: **estimate
  dispersion per-sport from settled data**, which makes NHL fall to ~Poisson automatically. Validate
  GSE's own historical NHL variance-to-mean before shipping.

This is also the answer to *"was the research hyper-focused?"* — **yes, on MLB**, and the very act of
widening to the code-content/commit axes is what caught the wrong assumption (NHL≡MLB) the MLB-centric
depth had papered over. The hyper-focus was real; this pass is its correction.

### The four fixes stand — now consensus, not a bespoke bet

| Fix | Verdict | Independent corroboration |
|---|---|---|
| **#1 Anscombe inverse 3/8→1/8** | **Confirmed** (with a documentation nuance) | Two tested codebases (`pymultiscale`, CaImAn `gat.py`) literally encode *forward 3/8, unbiased-inverse 1/8*; pymultiscale has the naive `−3/8` **commented out and replaced**. Whole Makitalo–Foi population (IMC_Denoise, CRIkit2, phasorpy) agrees. JOSS #257/Warton 2018: bias bites hardest exactly in the low-count regime where runs (~4)/goals (~2.5) live → high-impact, not cosmetic. **Nuance:** field best practice is the *exact* Makitalo–Foi **LUT**; `1/8` is the asymptotic closed form — correct-and-sufficient at run-scale means, document as asymptotic, adopt the LUT only if low-count buckets (team-innings, low totals) ever feed the transform. |
| **#2 NB2 φ=12→≈3.7** | **Confirmed — most-corroborated, with root cause** | statsmodels #9031 (+tf/probability #372, scipy #13292): NB dispersion is parameterized 3 incompatible ways (α vs θ=1/α vs φ) + NB1-vs-NB2 confusion → **a φ 3.3× too high is the classic parameterization-mismatch symptom = the most likely provenance of the bug.** Arithmetic: φ=4.3/1.15≈3.74. Sabermetrics method-of-moments fits on real MLB runs cluster r≈3.9–4.85 (φ=12 far outside; 3.7 at the low-scoring edge). Committed test asserts MLB k≈3.8. goalmodel's `upsilon.ml` commit moved from *fixed*→*data-estimated* dispersion; penaltyblog v1.6.1 had to **harden NB loss convergence** (wrong-φ is a documented silent failure mode). **Tuning note:** 3.7 = low-scoring edge; ~4.0–4.1 may fit modern league-average — sensitivity check, not a blocker. |
| **#3 D_i = 1/(4n), retire s²=0.04** | **Confirmed** | `steins-estimator` (canonical Efron–Morris 45-at-bat set) uses the *theoretical* stabilized variance ~1/(4n) precisely because empirical per-unit variances are unreliable at small n. `ebbr` confirms the prior should be **fit from data**, not hardcoded. |
| **#4 raise MIN_GAMES; wire efron-morris to HEAD** | **Confirmed** (softest — a threshold judgment) | RNA-seq dispersion literature: per-unit estimates at 3–6 replicates are unreliable → empirical-Bayes moderation. Small-n (45 at-bats) is exactly the regime shrinkage is designed for, so MIN_GAMES=8 is too low to trust empirical variances. |

### Adopt vs build — the whole field is R/Python; GSE is TypeScript

There is **no maintained TS package** for NB dispersion, EB/James-Stein shrinkage, or Dixon-Coles. So
for almost everything, *"adopt vs build" = "reimplement in TS, validated against an R/Python oracle."*
You cannot `npm install` your way out. Exactly **one** genuine adoption candidate:

- **ADOPT — penaltyblog (Python, MIT — verify LICENSE file):** its `implied` module ships **7 tested
  de-vig methods** (Shin, multiplicative, power, …) returning fair probs + stripped margin. GSE has
  **no maintained library for the Elite CLV/de-vig ledger** today. Adopt as a thin Python sidecar, or
  port its ~10-line closed-form formulas to TS with its outputs as **golden fixtures**. Also the soccer
  Dixon-Coles oracle.
- **ORACLE ONLY (offline, don't vendor):** `glm.nb` (R/MASS, GPL) to fit MLB/NHL dispersion and confirm
  φ empirically; `goalmodel` (R, GPL-3) Dixon-Coles + `upsilon.ml` estimator pattern.
- **PORT PATTERN:** `jpf5046/basic_betting_model/scoring_dist.py` — pure-Python `lgamma`-based NB PMF,
  *"no numpy/scipy, deterministic"* — the exact shape for GSE's dependency-free TS count-tail primitive.
  (`SlipEdge` learns dispersion from residuals — an alternative that lets NHL fall to ~Poisson automatically.)
- **REFERENCE ONLY / SKIP:** ebbr (wrong family), edgeR (genomics/GPL), regista (dominated by penaltyblog).
  TS repos (`techmari/dixon-coles-optimizer.ts`, Zeo `james-stein.ts`) have **no LICENSE = all-rights-reserved**
  → design references, do not copy.
- **⚠ COMPLIANCE FLAG:** `baseballr` PR #410/#411 added a **stealth-chromote Akamai 403 bypass** for
  stats.ncaa.org. **Do NOT adopt or replicate** — it is anti-bot evasion, violating CLAUDE.md Legal
  Scraping Posture. Judge stats.ncaa.org by its own controls (→ `blocked_technical_controls`/`permission_required`),
  route any NCAA need through the Clearance Engine.
- **One open gap with no adopt candidate:** the **NFL non-normal-margin / key-numbers 3–7 tail step** —
  nflverse is data/EPA/sim infra only (nflseedR's default game model is Gaussian-margin). NFL tail must
  remain **first-party**.

### Is GitHub research DONE? — YES, by a concrete definition

**DONE = every GitHub search modality run to yield-exhaustion.** Eight modalities: repo/topic · issues ·
discussions · packages · commits · users · negative-space · **in-file code-content search by exact
method name.** Modalities 1–7 were covered across the prior sweeps. Modality 8 (code-content) was **the
one genuinely-unexhausted axis** — prior "repo search is exhausted" was *modality-limited* (repo-name
search structurally cannot match statistics buried in file bodies under generic repo names). This pass
**ran it** (`search_code` per exact method name per sport) and it surfaced ~10 relevant repos none of
the prior sweeps reported — **including the decisive NHL-dispersion test file.** No 8th modality remains.

**Only honest remaining gaps are OFF-GitHub and structurally unreachable by any GitHub tool:**
(1) Kaggle notebooks/datasets (MLB/NHL run-distribution NB fits); (2) academic replication artifacts on
university pages (Foi's `tuni.fi` MATLAB for the *exact* Anscombe inverse); (3) non-English / GitLab /
Codeberg football open-data communities. **Optional** belt-and-suspenders: one targeted Kaggle search +
pull Foi's `tuni.fi` reference. Not required to build. **Do not loop back into GitHub.**

<!-- SYNTH-VERDICT-ANCHOR -->

## Public-API / data-sourcing sweep (`w0x0c0j6b`)

_(Pending — the "stop fighting The Odds API" sweep + GitHub-leverage audit fill this in.)_
