# [0606] Ranking and synchronization from pairwise measurements via SVD (arXiv:1906.02746v3)

**Citation:** d'Aspremont, A., Cucuringu, M., Tyagi, H. (2019). *Ranking and synchronization from pairwise measurements via SVD*. arXiv:1906.02746v3. URL: https://arxiv.org/abs/1906.02746v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 25,452 lines — algorithm, measurement model, theoretical guarantees, all synthetic + real-data experiments; proof appendices skimmed).
**Verdict:** ADAPT (narrow) — implement SVD-NRS as a cheap spectral power-rating baseline from margin-of-victory matrices, a diagnostic complement to Elo (0603), not a replacement for anything.

## 1. Research question
Given a sparse, noisy set of pairwise measurements of the form r_i − r_j on a measurement graph G (team strength differences from game outcomes), can a simple SVD-based spectral pipeline recover the underlying scores r (up to global shift) and the induced ranking — with provable robustness to sparsity, noise, and outliers? The paper proposes SVD-RS and a degree-normalized SVD-NRS, with ℓ₂/ℓ_∞ recovery theory and max-displacement rank guarantees, benchmarked against seven state-of-the-art methods from the literature (nine algorithms total including SVD-RS and SVD-NRS) on synthetic and 42 real-world instances.

## 2. Dataset / schema
- **Synthetic:** Erdős–Rényi measurement graphs, r_i = i ground truth, random model H_ij = r_i − r_j w.p. ηp (else 0) + noise/outliers.
- **Real (5 datasets, 42 instances):** NCAA college basketball 1985–2014 (30 seasons; H = summed point differentials per team pair, skew-symmetric); monk-parakeet dominance networks (2 groups × quarters 3–4); faculty hiring networks (CS n=206, Business n=113, History n=145; H = A − Aᵀ net PhD flow); Halo 2 beta (n=606 players, 6,227 games → filtered n=535, 6,109 edges, avg degree ~23; H = net wins); English Premier League 2009–2013 (4 seasons; H = net goal difference over home/away pair).
- Metrics: number of upsets (eq. 7.1) and weighted upsets Σ|R_ij − R̂_ij| (eq. 7.2), before/after low-rank matrix-completion preprocessing; plus a novel cross-method ranking-correlation analysis.

## 3. Method / model
- **Measurement matrix:** H ∈ ℝ^{n×n} skew-symmetric, H_ij = R_ij on edges, 0 elsewhere. Noiseless + complete graph ⇒ H = reᵀ − erᵀ, rank 2, with known singular vectors spanning {e/√n, centered r}.
- **SVD-RS (Algorithm 1):** top two left singular vectors û₁, û₂ of H → project u₁ = e/√n onto span{û₁,û₂} → score direction ũ₂ = orthogonal complement → ranking from ũ₂ (sign fixed by minimizing upsets) → scale τ recovered from H → r̂ = τũ₂ − mean(τũ₂).
- **SVD-NRS (Algorithm 2):** same on H_ss = D̄^{−1/2} H D̄^{−1/2}, D̄_ii = Σ_j |H_ij| — degree normalization for skewed degree distributions (standard spectral-clustering trick).
- **Theory:** ℓ₂ and ℓ_∞ score recovery for SVD-RS (Theorem 4): for r_i = i, Ω(n log n) measurements suffice for ℓ₂, Ω(n^{4/3}(log n)^{2/3}) for ℓ_∞; ℓ_∞ ⇒ rank recovery with max-displacement bounds (Theorem 3); ℓ₂ guarantees for SVD-NRS. Tools: matrix perturbation + random matrix theory. Explicitly *not* proven: very sparse regime p ~ 1/n, multiplicative noise, or the matrix-completion preprocessing step.

## 4. Equations & assumptions
H construction, rank-2 factorization, Algorithms 1–2, upset metrics (7.1–7.2) as in §3; random sampling model (§3.3). Assumes: connected measurement graph (else components unidentifiable — NFL's 32-team graph is connected); recovery only up to global shift; additive noise model; no home-field term (a gap for sports ports).

## 5. Features / target
Inputs: pairwise measurements R_ij (point differentials, net wins, goal differences) + graph edges. Features: none learned — the method is pure spectral. Target: score vector r̂ (strengths) and induced ranking π̂.

## 6. Validation design
9 algorithms × 42 instances; upset counts and weighted upsets with/without matrix-completion preprocessing; per-season/per-instance barplots + cross-method Kendall-correlation heatmaps (novel: shows SYNC≈BTL at 86% correlation, PGR vs SVD-N only 70% — different methods find genuinely different latent rankings).

## 7. Numerical results / baselines
- **NCAA basketball (30 seasons):** SVD-N/SVD ranked 6th/8th of 9 on upsets (6th/7th after matrix completion); 5th/6th on weighted upsets (4th/5th after MC) — "visibly outperforming the rest… comparable to the top three." SYNC best on raw upsets. Cross-method correlation analysis is itself a contribution.
- **Premier League (4 seasons):** SVD-N beats SVD in 12/16 setups; top-half throughout; SVD-N first in 3 instances.
- **Faculty hiring:** SVD-N top-half; best on weighted upsets + MC for Business and History, 2nd for CS.
- **Halo 2:** both methods 5th–7th of 9; SVD-N wins 3/4 metric/preprocessing combos.
- **Animal dominance:** mid-pack; SVD-N > SVD.
- **Honest summary:** competitive but rarely best — a strong cheap baseline, not a champion. Conclusion explicitly lists open problems (very sparse graphs, realistic noise, MC-preprocessing theory).

## 8. Code / data availability
Not stated (no repo). Algorithm is ~15 lines of NumPy (SVD + projection + sign fix) — trivially reimplementable. Datasets are standard/public.

## 9. Leakage & limitations
- **Mid-pack real-data performance:** on sports data it beats BTL-family methods on weighted upsets but loses on raw upsets to SYNC; never dominates — calibrate expectations.
- **No home-field term:** NFL has large HFA; the raw method applied to point differentials will absorb HFA into team strengths (fix: demean home/away margins first, or use the η-shift trick from 0603).
- **Theory doesn't cover the NFL regime tightly:** 32 teams × ~17 games is sparse but structured (not Erdős–Rényi); the Ω(n log n) bounds are asymptotic comfort, not a finite-sample certificate.
- **Skew-symmetric input required:** ties/OT nuances need a preprocessing choice (net points still fine).
- **Sign ambiguity** resolved heuristically (minimize upsets) — fine in practice, inelegant in theory.

## 10. GSE overlap
**Extension / diagnostic.** The existing-research map shows GSE has Elo-style and market-implied team ratings but no documented spectral/MOV-based power rater — and 0603 (κ-Elo) gives the online probabilistic rater while this gives the complementary batch spectral view. The transferable core: **a 15-line, theoretically-grounded power rating from the margin-of-victory matrix that is provably robust in sparse-data regimes** — exactly the early-season NFL situation (few games, disconnected-ish schedule graph). Also the paper's cross-method correlation analysis is a template for a GSE "rater agreement" diagnostic. Lane: team ratings + content (power rankings with a published method).

## 11. GSE implementation spec
- **SVD-NRS power rating:** build H from demeaned home/away point differentials each week (nflverse 2020–2026): H_ij = (away-adjusted margin), summed over matchups, skew-symmetric. Degree-normalize (NFL degrees are near-uniform, so SVD-RS ≈ SVD-NRS — implement both, expect agreement). Extract scores r̂, zero-mean; publish as "GSE spectral power ratings" alongside Elo.
- **Use:** (1) early-season prior when Elo hasn't converged (the sparse-regime theory is the justification); (2) rater-agreement diagnostic: Kendall correlation between SVD-NRS, Elo (0603), and market-implied ratings — divergences flag games for analyst review; (3) content: weekly power rankings with the method published (transparency = trust).
- Effort: ~0.5 day (NumPy prototype) + 1 day for the agreement-diagnostic dashboard.

## 12. Reproducible test
Dataset: nflverse 2020–2025. Each week, compute SVD-NRS ratings from season-to-date demeaned margins; predict rest-of-season game winners (sign of r̂_i − r̂_j + HFA) and ATS vs. closing lines. Metric: accuracy and log-loss vs. (a) Elo (0603), (b) preseason priors alone. Success: SVD-NRS within 1% accuracy of Elo over the full season AND beats Elo in weeks 1–4 (the sparse regime where theory predicts its advantage). Secondary: rater-agreement — report Kendall τ between the three raters weekly.

## 13. Acceptance / rejection gate
ADAPT as a permanent ensemble/diagnostic member if it matches Elo within 1% season accuracy and wins or ties weeks 1–4 (sparse-regime value confirmed). If it trails Elo by >1.5% with no early-season edge, REJECT as redundant — keep only the cross-method correlation diagnostic idea (cheap, method-agnostic). Never let it override the engine's probability outputs; it's a rater, not a forecaster.

## 14. Improvement experiment
Add the missing home-field term the paper lacks: model H_ij = (r_i − r_j) + η·home_ij and estimate η jointly by alternating between η least-squares and the SVD step (or simply pre-regress margins on a home indicator before forming H — test both). Compare upset counts and week-ahead accuracy vs. vanilla SVD-NRS on 2020–2025. Hypothesis: HFA-aware H construction cuts early-season upsets materially (NFL HFA ≈ 2–3 points is large relative to team-strength spread) — and the pre-regression variant should match the joint variant at 1/10th the complexity, which would also be a publishable note back to the paper's future-work list.
