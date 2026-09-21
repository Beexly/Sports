# [1450] Tractable Ridge Regression for Paired Comparisons (arXiv:2406.09597)

**Citation:** Cristiano Varin, David Firth (2024). *Tractable Ridge Regression for Paired Comparisons*. arXiv:2406.09597 [stat.ME]. URL: https://arxiv.org/abs/2406.09597
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 12 pages; methods, simulation study, Premier League application, conclusions, references — read via pdftotext).
**Verdict:** ADAPT — (a) adopt ridge-penalized paired-comparison likelihood ℓ_λ(μ) = ℓ(μ) − (λ/2)Σμ_i² as GSE's early-season rating estimator: it keeps all-win/all-loss teams at finite, shrunken ratings instead of ±∞ MLE blowups; (b) adopt the pairwise empirical Bayes (PEB) penalty selector — λ estimated from correlated comparison pairs sharing an item, no high-dimensional marginal integration, no repeated cross-validation refits — as GSE's no-refit tuning method for sparse-data regimes; (c) use the closed-form λ̂ = [1 − 2sin(πτ̂/2)]/sin(πτ̂/2) with small-sample-adjusted Kendall τ̂ = (c−d)/(c+d+2p) as a fast prior-strength initializer; (d) add their naive-baseline gate: any rating model that cannot beat naive outcome frequencies in sparse data is misfiring — MLE failed this gate in the paper's simulations.

## Research question
How can the ridge penalty λ in penalized paired-comparison likelihood be selected tractably — without expensive high-dimensional marginal-likelihood integration or repeated cross-validation refits — while keeping the predictive gains of shrinkage in sparse-data settings?

## Method
Ridge-penalized likelihood for paired-comparison strengths μ: ℓ_λ(μ) = ℓ(μ) − (λ/2)Σμ_i², corresponding to the working prior μ ~ N(0, λ⁻¹I). The innovation is **pairwise empirical Bayes (PEB)**: estimate λ from pairs of comparisons that share a common item (correlated pairs), which identifies the penalty from low-dimensional marginal structure instead of integrating over the full high-dimensional μ. Handles order/home effects and ties via a Thurstone–Mosteller cumulative-probit model with order-effect parameter δ and tie parameter γ. For binary outcomes the paper derives the closed form λ̂ = [1 − 2sin(πτ̂/2)]/sin(πτ̂/2) from a Kendall-style concordance τ̂ = (c−d)/(c+d) between paired comparisons, with small-sample adjustment τ̂ = (c−d)/(c+d+2p). Compared against MLE, Firth bias-reduced MLE (BRMLE), and leave-one-round-out cross-validated ridge.

## Equations
- Penalized likelihood: ℓ_λ(μ) = ℓ(μ) − (λ/2)Σᵢμᵢ²
- Working prior: μ ~ N(0, λ⁻¹I)
- Binary-outcome concordance: τ̂ = (c−d)/(c+d); small-sample: τ̂ = (c−d)/(c+d+2p)
- Penalty selector: λ̂ = [1 − 2sin(πτ̂/2)]/sin(πτ̂/2)
- Order/tie extension: Thurstone–Mosteller cumulative probit with order effect δ and tie parameter γ

## Datasets
- **Simulations:** 120 scenarios — p ∈ {20, 40, 60} items, λ ∈ {2⁻¹, 2⁰, …, 2⁶}, training fractions {20%, 30%, 40%, 50%, 80%}, 1,000 replications each, order effect δ = 0.2 (≈58% first-item wins). Robustness checks under heavy-tailed true strengths (t₈, t₃).
- **Application:** 28 English Premier League seasons, 1995–2023, 10,640 matches, 20 teams × 38 match-weeks. Train on first 10/15/20/25/30 weeks, predict the remaining matches. Naive baseline: outcome frequencies (46% home win, 25% draw, 29% away win), naive log score 1.06.

## Exact results / baselines
- PEB was uniformly best among displayed methods in simulations and **visually indistinguishable from leave-one-round-out CV ridge** — at zero refit cost.
- MLE could predict **worse than the naive baseline** in sparse/early data; Firth bias reduction improved on MLE but under-shrank relative to the predictive optimum.
- Robust to misspecification: negligible penalty-choice difference under t₈-distributed true strengths; small differences even under t₃.
- Premier League: BRMLE beat MLE in all 28 seasons and all training sizes; PEB usually beat BRMLE, with the largest gains after only 10–15 weeks of training data.
- Code and data: https://github.com/crisvarin/peb

## Leakage assessment
Clean. Simulations are fully synthetic with known truth; the application uses a strict temporal split (early weeks train, later weeks predict) across 28 independent seasons. The authors explicitly scope the method to static within-season strengths and distinguish it from sequential dynamic prediction — no leakage, but also no within-season adaptation, which GSE must add.

## GSE overlap / corpus position
- Direct companion to [1449] (least squares paired comparisons, 2401.07018): [1449] gives the unpenalized theory (Var(μ̂) = σ²N⁺, connectivity diagnostics); [1450] gives the penalized, sparse-data solution. GSE's early-season ratings should be PEB-ridge, transitioning toward [1449]'s LS as data accumulates.
- Complements [1448] (G-Elo): G-Elo is online with heuristic-free updates but fixed K̃; PEB-ridge gives a principled batch alternative with data-driven shrinkage — run both in the rating bake-off.
- The λ-from-concordance formula is a drop-in prior-strength initializer for any of GSE's rating lanes.

## Implementation plan (GSE)
1. Implement ridge-penalized Bradley-Terry/Thurstone–Mosteller for NFL team strengths with PEB penalty selection; weekly refit is cheap (no CV).
2. Early-season protocol (weeks 1–6): initialize all team strengths with PEB-ridge (finite estimates for 3–0 / 0–3 teams, no ±∞ blowups), blend toward the full-season estimator as games accumulate.
3. Add the naive-baseline gate to GSE's model CI: any rating configuration whose sparse-data log-loss exceeds naive outcome frequencies is rejected automatically.
4. Extend the order-effect δ to a home-field parameter estimated jointly with λ.

## Reproducible test
Replicate the paper's Premier League protocol on NFL 2019–2023: train PEB-ridge on weeks 1–W (W ∈ {4, 6, 8, 10}), predict remaining weeks; compare log-loss vs GSE's current early-season rating and vs unpenalized MLE; confirm PEB ≥ CV-ridge parity on a subsample.

## Numeric gate
On the NFL 2019–2023 early-season protocol (train weeks 1–6, predict weeks 7–17), PEB-ridge log-loss must be ≤ GSE current early-season rating log-loss − 0.01, and must beat the naive frequency baseline by ≥ 0.05 in every season. If the λ̂ closed form underperforms full PEB on NFL data, use full PEB; if PEB ties CV-ridge within noise, adopt PEB for the compute savings.

## Improvement experiment
The paper's static-strength limitation is the opening: build a **dynamic PEB** where λ_t evolves via a random walk (or is re-estimated on a rolling window) so shrinkage adapts to within-season regime changes (injuries, QB changes). Test on the 2022–2023 NFL seasons with known mid-season QB injuries: dynamic-PEB log-loss vs static-PEB on post-injury weeks. Secondary: extend the concordance-based λ̂ to the spread domain by correlating paired ATS outcomes instead of paired SU outcomes.
