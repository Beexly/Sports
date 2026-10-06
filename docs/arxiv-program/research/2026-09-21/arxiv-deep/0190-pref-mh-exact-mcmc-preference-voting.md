# [0190] When Metropolis and Hastings Meet Bradley and Terry: Exact MCMC From Preference Voting (arXiv:2609.00905v1)

**Citation:** Ariel Sairien, Tomer Michaeli, Nir Sochen, Yossi Gandelsman, Assaf Shocher (2026). *When Metropolis and Hastings Meet Bradley and Terry: Exact MCMC From Preference Voting*. arXiv:2609.00905v1. URL: https://arxiv.org/abs/2609.00905v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2817 lines).
**Verdict:** ADAPT — port the N-vote preference-acceptance rule as a sampler for GSE's scenario/ensemble generation (lineup slates, betting-card candidates), replacing the paper's LLM/human judges with a Bradley–Terry-consistent scoring function so the exactness guarantees actually apply; reject any deployment on raw LLM pairwise votes without the BT-consistency check.

## 1. Research question
How can we sample from a target distribution of the form π(x) ∝ p₀(x)e^{s(x)} when the score function s(x) cannot be evaluated directly, but we can query a **stochastic judge** for pairwise preferences x ≺ x′ whose votes follow the Bradley–Terry (BT) model? Applications: image generation with aesthetic preferences, molecule design, and any domain where only preference feedback exists. The core theoretical contribution: (1) with a fixed sampling budget, **no exact oracle-based BT-MH implementation exists** (Theorem 1); (2) with a **random, unbounded-but-finite budget** (expected-N voting), an exact accept/reject rule does exist (Theorem 2) and is **Peskun–Tierney optimal** among exact rules using the same proposal and N judge queries (Theorem 3).

## 2. Dataset / schema
- **2D toy problems:** banana-shaped and ring-shaped target densities for convergence diagnostics (R̂, ESS).
- **Image generation:** prompts from MS COCO; base sampler is a diffusion model; judge is an LLM-based aesthetic comparator (pairwise).
- **Molecule generation:** ZINC database molecules; base sampler trained on ZINC; properties evaluated: QED, SA (synthetic accessibility), diversity, and **MolSkill** (a learned skill predictor; lower = better).
- All experiments are method demonstrations; no single canonical "dataset" in the classical sense. Code is provided (see §8).

## 3. Method / model
- **BT-MH oracle:** ideal acceptance α*(x,x′) = min{1, r₀(x,x′)·p/(1−p)}, where r₀(x,x′) = p₀(x′)q(x|x′)/[p₀(x)q(x′|x)] and p = pJ(x≺x′) = σ(s(x′)−s(x)) is the BT pairwise probability.
- **Pointwise-MH (baseline):** judge scored on a fixed scale (e.g., 1–5); acceptance min{1, r₀(x,x′)·e^{ŝ(x′)−ŝ(x)}} — biased because absolute scores miscalibrate.
- **N-vote Pref-MH (proposed):** query the judge N times per proposal; observe K votes for x′; acceptance **α_N(x,x′;K) = min{1, r₀(x,x′)·K/(N−K+1)}**. K/(N−K+1) is the unbiased-in-ratio estimator of the ideal odds p/(1−p).
- **Multi-judge:** acceptance multiplies the K_i/(N−K_i+1) terms across independent judges (Corollary for product of odds).
- **MCMC loop:** propose x′ ~ q(·|x), run the N-vote rule, accept/reject; chain targets π exactly under BT judges.
- **Theory:** Theorem 1 (impossibility with fixed budget — any exact rule needs unbounded K support); Theorem 2 (exact detailed balance/stationarity for every integer N ≥ 1 under BT); Theorem 3 (Peskun–Tierney optimal among exact rules with the same proposal and N queries); Corollary 1 (convergence under standard MH regularity).

## 4. Equations & assumptions
Quoted faithfully:
- Target: π(x) ∝ p₀(x)e^{s(x)}.
- BT pairwise probability: p_J(x≺x′) = σ(s(x′)−s(x)) (logistic).
- Ideal odds: p/(1−p); Pointwise baseline: α = min{1, r₀(x,x′)·e^{ŝ(x′)−ŝ(x)}}.
- N-vote rule: **α_N(x,x′;K) = min{1, r₀(x,x′)·K/(N−K+1)}**.
- Multi-judge: α = min{1, r₀(x,x′)·∏_i K_i/(N−K_i+1)}.
- Optimality: Peskun–Tierney dominance among exact acceptance rules using the same q and N.
Stated assumptions: judge votes follow the **Bradley–Terry model** (transitive latent scores, independent votes conditional on the pair); the judge is stochastic but stationary; N is the expected (not fixed) number of queries — the rule is exact for every integer N ≥ 1. I do not invent proofs; the ledger records the theorem statements as stated.

## 5. Features / target
Inputs: a base sampler p₀ (diffusion model / molecule generator), a proposal distribution q, and a stochastic pairwise judge. No feature engineering in the classical sense. Target: samples from π(x) ∝ p₀(x)e^{s(x)} — the base distribution tilted by the latent preference score s(x), which is never observed directly.

## 6. Validation design
Convergence diagnostics on the 2D toys: R̂ and effective sample size vs. chain length for N = 1, 2, 4, 8 and for the oracle. Application experiments: image generation (aesthetic preference success rate, aesthetic score) and molecule design (QED, SA, diversity, MolSkill) comparing base sampler vs. Pointwise-MH vs. Pref-MH. No train/test split in the classical sense — the "data" are sampler outputs; the theoretical claims are proved, not cross-validated.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- **Image generation (§7):** Pref-MH achieves **63.6%** preference success vs. **7.4%** for Pointwise-MH vs. **4.5%** base sampler; aesthetic scores 6.395 (Pref-MH) / 6.289 (Pointwise) / 6.287 (base). The paper's interpretation: absolute-score judges miscalibrate, so Pointwise-MH barely beats base; the 63.6% vs 7.4% gap reflects the pairwise vote rule capturing the preference signal.
- **Molecule design (Table 1):** Pref-MH — QED **0.698±0.002**, SA **0.781±0.001**, diversity **0.899±0.001**, MolSkill mean **−1.432±0.398**, median **−1.116±0.396**; base sampler and Pointwise-MH are worse on the preference-tilted objective (exact baseline numbers preserved in the paper's Table 1; lower MolSkill = better).
- **Toy diagnostics:** R̂ → 1 and ESS grows with chain length for all N ≥ 1; larger N gives higher ESS per step at higher query cost (the paper's cost/quality trade-off).
My distinction: these are method-demonstration numbers on the authors' chosen judges; the transferable asset is the theorem + rule, not the 63.6% figure.

## 8. Code / data availability
Code: **https://github.com/Ariels34/Pref-MH**. Data: MS COCO prompts, ZINC molecules (public). The paper's judge implementations are in the repo.

## 9. Leakage & limitations
Adversarial view: (1) **Exactness is conditional on BT judges.** Theorem 2 holds under the Bradley–Terry model; real LLM/human judges routinely violate transitivity, independence, and stationarity (position bias, prompt-order effects, drift). Under a non-BT judge the chain targets an undefined distribution — the "exact" guarantee evaporates silently. (2) The paper's empirical judges (LLM aesthetic comparators) are the weakest link: no BT-consistency diagnostic is reported for them. (3) Cost: N votes per proposal × chain length — expensive with LLM judges; the paper does not report total judge-query budgets for the image/molecule runs. (4) Peskun–Tierney optimality is among exact rules with the same q and N — it says nothing about choosing q or N, which dominate practical mixing. (5) Pointwise-MH is arguably a weak baseline (fixed-scale absolute scoring is known to miscalibrate); the 63.6% vs 7.4% gap flatters the comparison. (6) For GSE: lineups/betting cards have no natural pairwise judge — one must be constructed, and its BT consistency verified, before any guarantee applies.

## 10. GSE overlap
Checked `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No MCMC, preference-learning, or ensemble-sampling work in the corpus. Adjacent: DFS optimizer work (ledgers 0010, Week 1/2 optimizer pools) and the calibration lane — but nothing that samples scenario ensembles from preference feedback. Overlap verdict: **new capability** — an exact sampler for preference-tilted distributions, applicable to diversifying DFS lineup slates or ranking candidate betting cards by a learned preference model. Not a duplicate of anything.

## 11. GSE implementation spec
Concrete build plan:
- **Target:** π(x) ∝ p₀(x)e^{s(x)} where x = a DFS lineup (or betting card), p₀ = GSE's existing lineup generator distribution, s(x) = a BT-consistent preference score — e.g., a learned slate-quality model or a contest-selection utility (expected payout under field behavior).
- **Judge construction (critical):** do NOT use raw LLM votes. Build the judge as pairwise comparisons from a **calibrated scoring function** (e.g., compare ŝ(x) vs ŝ(x′) with logistic noise), which is BT-consistent by construction; or empirically test an LLM judge for BT consistency (transitivity + independence diagnostics) before trusting exactness.
- **Sampler:** N-vote rule α_N(x,x′;K) = min{1, r₀(x,x′)·K/(N−K+1)} with N = 4–8; proposal q = local lineup mutations (swap 1–2 players).
- **Monitoring:** R̂ and ESS diagnostics per the paper's toy protocol; acceptance-rate tuning via q.
- **Serving:** offline batch generation of diversified slates; not real-time.
- **Estimated effort:** ~4 engineer-weeks (judge calibration is the hard part).

## 12. Reproducible test
- **Dataset:** 2025 NFL DFS slates; p₀ = GSE's current optimizer output distribution; s(x) = realized contest score (backtest) as the latent preference.
- **Metric:** slate diversity (unique lineups / pairwise overlap) and realized mean/max score vs. two baselines: (a) i.i.d. draws from p₀, (b) Pointwise-MH with absolute-score judge.
- **Window:** 2025 season, walk-forward by week.
- Runnable: yes — all components exist in GSE's DFS stack.

## 13. Acceptance / rejection gate
**ADAPT (adopt as GSE's slate sampler) if:** Pref-MH slates achieve **≥ 15% higher realized mean score at equal-or-better diversity** than i.i.d. p₀ draws on walk-forward 2025 weeks, **and** the judge passes BT-consistency diagnostics (transitivity ≥ 95%, vote independence); **reject otherwise** — if the judge is not BT-consistent, the exactness guarantee does not apply and a simpler temperature-scaled sampler is preferable. Gate evaluated before any production slate generation.

## 14. Improvement experiment
Go beyond the paper on its weakest empirical point: build a **BT-consistency diagnostic suite** for judges (transitivity violation rate, position-bias test, stationarity/drift test over repeated queries) and a **repair layer** — e.g., fitting a latent BT score model to the judge's votes and sampling from the fitted model rather than raw votes, which restores exactness with respect to the fitted BT model. Test whether the repaired judge preserves the paper's ESS/acceptance behavior while a raw LLM judge does not. This turns the paper's silent assumption into a measured, enforced precondition — the experiment the authors should have run.
