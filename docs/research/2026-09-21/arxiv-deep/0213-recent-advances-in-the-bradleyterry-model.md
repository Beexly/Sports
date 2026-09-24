# [0213] Recent advances in the Bradley--Terry Model: theory, algorithms, and applications (arXiv:2601.14727v3)

**Citation:** Shuxing Fang, Ruijian Han, Yuanhang Luo, Yiming Xu (2026). *Recent advances in the Bradley--Terry Model: theory, algorithms, and applications*. arXiv:2601.14727v3. URL: https://arxiv.org/abs/2601.14727
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5814 lines incl. references).
**Verdict:** ADAPT — a theory survey (no new experiments), but it consolidates the implementable BT toolkit GSE needs: fast solvers (Newman FPI, RankCentrality/LSR), the covariate-assisted PlusDC formulation for home-field/dynamic effects, and mixture-model identifiability guidance; use it as the reference for a BT team-rating module rather than a source of new results.

## 1. Research question
A survey, not an experiment: what is the state of recent statistical and computational progress on the Bradley–Terry (BT) model and its close variants (general pairwise comparison models, Plackett–Luce, mixture models, covariate-assisted extensions), with emphasis on the large-n regime where both the number of objects and the volume of comparisons tend to infinity — the regime relevant to modern sports analytics and LLM preference alignment? Topics: asymptotic theory (estimation, inference), algorithms, and applications (§§1–7).

## 2. Dataset / schema
No new dataset — it is a literature survey. §6 catalogs representative ranking datasets across three domains, including a sports table (quoted exactly): ATP tennis matches (130K comparisons, 1.8K objects); club football across 42 leagues (230.6K, 1.2K); NBA matches (72.6K, 30); **NFL matches (5.3K, 32)**; Hong Kong horse racing (6.3K, 2.8K, edge size 10–14); Pokémon battles (50K, 800); StarCraft II pro matches (374.8K, 10.8K); top-player chess (65K, 8.6K). The paper's key structural observation: sports datasets split into a dense regime (|E| = O(n²), e.g., NFL/NBA round-robin pools) and a sparse regime (|E| = O(n log n), e.g., tennis/chess/esports). NFL sits in the dense regime. Social-science and ML (RLHF) datasets are also cataloged; ML comparisons are conditioned on prompts, decomposing the graph into disjoint subgraphs — "function learning over disconnected local comparisons."

## 3. Method / model
Survey of the BT family (§2):
- **BT model:** P(Y_ij = i≻j) = γ_i/(γ_i+γ_j) (BT-S), or with u_i = log γ_i: P = σ(u_i − u_j) (BT-U). Identifiable only up to additive constant; constraints: Σ u_i = 0 (recommended for its variance-minimization property) or reference u_i = 0. Interpretable as logistic regression with x_ij = e_i − e_j.
- **General pairwise comparisons** (§2.2): outcome Y_ij ∈ symmetric set A ⊆ ℝ (binary {−1,1}, ties {−1,0,1}, cardinal ℝ); density f(Y_ij; u_i − u_j) with f valid (symmetry, monotonicity, boundedness). Covers BT, Thurstone–Mosteller, Rao–Kupper and Davidson (ties), ordinal and paired-cardinal models. Key property: strong stochastic transitivity (SST); challenged by some authors (weak stochastic transitivity alternative).
- **Plackett–Luce** (§2.3): for edge e of size k, P(Y_e = i_π(1)≻⋯≻i_π(k)) = ∏_{j=1}^{k−1} exp(u_{i_π(j)})/Σ_{ℓ=j}^k exp(u_{i_π(ℓ)}). Luce's choice axiom (IIA); latent-variable form X_i = u_i + ε_i, ε_i i.i.d. Gumbel(0,1), convenient for Bayesian inference.
- **BT mixtures** (§2.4): P(Y_ij = i≻j) = Σ_{h=1}^H ω_h σ(u_i^{(h)} − u_j^{(h)}).
- **Covariate-assisted (PlusDC)** (§2.4): P(Y_ij = i≻j) = σ(u_i − u_j + (x_{i,j},i − x_{i,j},j})^T v). **The BT model with home-field advantage in sports analytics is a special instance of PlusDC.** RLHF reward-model preference learning is a special case with u ≡ 0: P = σ(r(x_i) − r(x_j)). Time-varying utilities u_i(t) for temporal effects.
Estimation (§4.2): MLE (BT-MLE) with Σu=0; existence iff comparison graph + outcomes are **strongly connected** (Ford 1957): every partition I ∪ I^c has some i ∈ I defeating some j ∈ I^c; else û_i → ∞. Ridge regularization as fallback. Rank-breaking for partial orders (quasi-MLE). Spectral methods: RankCentrality (RC) — stationary distribution of an ergodic Markov chain with transitions proportional to defeat probabilities; LSR/I-LSR (MLE-via-global-balance of a continuous-time Markov chain); Accelerated Spectral Ranking (ASR). Bayesian: BT-Bayes posterior ∝ g(u) Π σ(Y_ij; u_i − u_j); priors surveyed (Gaussian MAP = ℓ₂-regularized MLE; beta-separable MAP = MLE on fictitious-augmented data; conjugate-on-γ, Dirichlet); EP approximation, Gibbs (data augmentation), HMC. Mixture EM: E-step responsibilities τ_eh; M-step via MM weighted FPI or EM-LSR with spectral initialization.

## 4. Equations & assumptions
Core equations, quoted faithfully:
- (BT-S): P(Y_ij = i≻j) = γ_i/(γ_i+γ_j), γ_i > 0.
- (BT-U): P(Y_ij = i≻j) = exp(u_i)/(exp(u_i)+exp(u_j)) = σ(u_i − u_j), σ(x) = (1+exp(−x))^{−1}.
- (PL): P(Y_e = i_π(1)≻⋯≻i_π(k)) = ∏_{j=1}^{k−1} exp(u_{i_π(j)}) / Σ_{ℓ=j}^{k} exp(u_{i_π(ℓ)}).
- (BTMixture): P(Y_ij = i≻j) = Σ_{h∈[H]} ω_h σ(u_i^{(h)} − u_j^{(h)}), ω_h > 0, Σ_h ω_h = 1.
- (PlusDC): P(Y_ij = i≻j) = σ(u_i − u_j + (x_{i,j},i − x_{i,j},j})^T v).
- RLHF: P(Y_ij = i≻j) = σ(r(x_i) − r(x_j)), u ≡ 0.
- (BT-MLE): û = argmax_{u∈ℝⁿ, 1^Tu=0} Σ_{{i,j}∈E} log σ(Y_ij; u_i − u_j).
- (BT-Bayes): p(u | {Y_e}) ∝ g(u) × Π_{{i,j}∈E} σ(Y_ij; u_i − u_j).
- First-order optimality: (1) Σ_j w_ij − Σ_j n_ij γ̂_i/(γ̂_i+γ̂_j) = 0; (2) Σ_j w_ij γ̂_j/(γ̂_i+γ̂_j) − Σ_j w_ji γ̂_i/(γ̂_i+γ̂_j) = 0, where w_ij = # times i defeats j, n_ij = w_ij + w_ji.
- (Zermelo): γ_i ← Σ_j w_ij / Σ_j n_ij/(γ_i+γ_j), then normalize Π_i γ_i = 1. Slow convergence (observed); MM convergence analysis; Sinkhorn link.
- (Newman): γ_i ← [Σ_j w_ij γ_j/(γ_i+γ_j)] / [Σ_j w_ji/(γ_i+γ_j)] — "observed to converge much faster than (Zermelo) in a number of scenarios."
- (EM-MAP): γ_i ← (a−1+Σ_j w_ij) / (b + Σ_j n_ij/(γ_i+γ_j)) (Zermelo = a=1, b=0).
- (3): γ̂^T Q(γ̂) = 0, Q_ij(γ) = w_ji/(γ_i+γ_j) (i≠j) — the Markov-chain view; variable freezing → I-LSR; first iteration = LSR = RankCentrality.
- (4): mixture M-step {γ^{(h)}} ← argmax Σ_h Σ_e τ_eh log P(Y_e | γ^{(h)}), with MM weighted-FPI closed form.
- SST: min{p_ij, p_jk} ≥ 1/2 ⟹ p_ik ≥ max{p_ij, p_jk}.
**Assumptions:** comparison outcomes independent conditional on the comparison graph; graph connected (necessary for a global ranking); ER/homogeneous sampling for the sharpest asymptotics (authors note ER "often fails to capture key characteristics of real-life networks"); latent utilities static (except dynamic-covariate extensions); SST for valid-f models.

## 5. Features / target
Not applicable as an experiment — this is a survey. The surveyed models' generic features: pairwise comparison outcomes (win/loss; ties in Rao–Kupper/Davidson; partial/total orders in PL); covariates split into **static** (x_{e,i} = x_i, e.g., player physical attributes) and **dynamic** (varies by edge, e.g., home-field advantage, positional bias) — dynamic covariates "play a vital role in model identifiability and data fitting." Targets: latent utility/strength vectors u/γ; ranking positions (with rank-based inference via Gaussian multiplier bootstrap).

## 6. Validation design
Survey of theory, not experiments. Key surveyed results (Table 1 in the paper, quoted): uniform (ℓ∞) consistency of the MLE under ER sampling at the optimal sparsity p_n ≳ (log n)/n (leave-one-out/cavity method); regularized MLE and RankCentrality also uniformly consistent at that rate; graph-based chaining for heterogeneous graphs (Cheeger constant, SBMs); PGD analysis; asymptotic normality via leave-two-out at p_n ≳ poly(log n)/n (Gao et al. 2023); truncated-error analysis for PL on deterministic heterogeneous graphs (Fisher information as weighted graph Laplacian); asymptotic normality of weighted spectral estimators. Inference: CIs/hypothesis tests via Slutsky; rank-position inference via Gaussian multiplier bootstrap. No experiments, no baselines, no numerical tables of the survey's own — §6's dataset table is descriptive.

## 7. Numerical results / baselines
No experiments conducted (survey). The quantitative claims are theorems surveyed, stated qualitatively above. The paper's §6 gives dataset scale numbers (see §2), and §4.3–4.4 give convergence-rate thresholds: uniform consistency at p_n ≳ (log n)/n (optimal up to the ER connectivity threshold); extension from (log n)³/n (earlier, suboptimal) to (log n)/n. Mixture identifiability: PL mixture non-identifiable if H ≥ (n+1)/2 when each edge contains all n objects; generically identifiable if 1 ≤ H ≤ ⌊(n−2)/2⌋! and n ≥ 6; BT mixture with H=2 generically identifiable on a complete graph if n ≥ 5. Distinguish the survey's synthesis from primary results: every number above is the survey reporting prior work, not new findings.

## 8. Code / data availability
None stated for the survey itself. The paper points to public datasets used in the literature: ATP matches (github.com/JeffSackmann/tennis_atp), club football (Kaggle), chess (Kaggle), plus LLM-preference datasets (AlpacaEval, Chatbot Arena). No code repository for the survey.

## 9. Leakage & limitations
- As a survey it contributes no new empirical evidence; its sports claims (e.g., NFL in the dense regime) rest on cited work, and GSE should verify any specific theorem against the primary source before building on it.
- The sharpest theory assumes Erdős–Rényi comparison graphs; real NFL schedules are structured (divisions, conferences), not random — the heterogeneous-graph results (chaining, Cheeger) are the relevant but weaker branch.
- Independence of outcomes conditional on the graph is a modeling convenience; real game outcomes have coupled structure (injuries, rest, weather) the survey defers.
- SST is baked into the valid-f framework but "may not hold in certain real-world applications" (the paper's own caveat) — NFL rock-paper-scissors matchups are exactly where SST strains.
- Mixture models are theoretically fragile (non-identifiability constructions) and their algorithms "mostly empirical due to the nonconcave objective."

## 10. GSE overlap
Bradley–Terry is already in the repo's inventoried metrics (existing-research map §1: "Bradley-Terry, Plackett-Luce" listed among 26-metric catalog; repo has `0004-bradley-terry-elo-unification.md`, a different paper's ledger). Elo/nfelo, Massey/Sagarin/Colley, TrueSkill, Glicko are also inventoried. So the *concept* of BT is covered — this survey is an **extension**, not a duplicate: no existing repo work covers the covariate-assisted PlusDC formulation (home-field + rest + weather as dynamic covariates inside a BT team-rating), the fast solvers (Newman FPI, LSR/I-LSR, RankCentrality), or the mixture-BT identifiability guidance. The survey is the natural reference document for building a BT-based team-rating lane that sits alongside GSE's EPA and market-implied ratings.

## 11. GSE implementation spec
Use the survey as the implementation reference for a BT team-rating module:
1. **PlusDC team rating:** P(home team i beats j) = σ(u_i − u_j + x_{ij}^T v), where u = 32 team utilities (sum-to-zero), dynamic covariates x_{ij}: home indicator, rest differential, travel/altitude, QB-out indicator. Fit by (BT-MLE) with ridge regularization (guarantees existence even when strong connectivity fails early in the season); initialize with the Newman FPI (fast) and refine with L-BFGS. Time-varying option: u_i(t) via the dynamic-BT references (§2.4).
2. **Spectral warm-start / scale:** RankCentrality on the game graph for a cheap, always-defined rating (useful early-season when MLE is unstable); LSR as a one-step MLE approximation.
3. **Validation of theory at GSE scale:** n=32, |E|≈272/season — deep in the dense regime; the survey's sparsity thresholds are non-binding, so the module needs only a few seasons of data. Fit on 2015–2024 nflverse; evaluate out-of-sample log-loss vs. GSE engine spread-implied and market-implied ratings.
4. **Mixture caution:** if experimenting with mixture-BT (e.g., home/away or dome/outdoor latent components), respect the identifiability limits (H=2, n=32 ≫ 5 is fine on a dense graph, but expect label-switching; use EM-LSR with spectral initialization).
5. Effort: ~2–3 days. Data: nflverse (in hand). Serving: weekly batch refit; no live inference.

## 12. Reproducible test
nflverse 2015–2024 regular seasons: implement PlusDC-BT (team utilities + home/rest/travel covariates, ridge-regularized MLE, Newman-FPI initialization) and predict each game of 2022–2024 (rolling refit through week t−1). Metric: mean log-loss and Brier score on moneyline outcomes. Baselines: (a) plain BT without covariates, (b) Elo (nfelo-style), (c) closing-moneyline-implied probabilities. Success = PlusDC-BT beats plain BT and Elo on log-loss; the bar vs. the market is diagnostic only (market includes injury news GSE's covariates lack).

## 13. Acceptance / rejection gate
**Adopt** the PlusDC-BT module as a GSE team-rating input if, on the 2022–2024 rolling test, it beats both plain BT and Elo on mean log-loss by ≥ 0.003 **and** the fitted covariate effects have the right sign and plausible magnitude (home edge > 0, rest differential ≥ 0). **Adopt** RankCentrality as the early-season (weeks 1–4) fallback rating if it beats plain BT on log-loss over weeks 1–4 specifically. If PlusDC-BT does not beat Elo, **reject** the module and keep the survey as a reference document only.

## 14. Improvement experiment
Go beyond the survey's static/dynamic split with **player-aware utilities**: decompose u_i into team base + quarterback contribution (u_i = τ_team + q_QB(i)), so QB changes (injury, trade) move the rating without refitting — a covariate-assisted BT where the QB enters as a dynamic player covariate rather than a static team trait. Test whether the QB-decomposed model beats team-only PlusDC on log-loss in weeks following a starting-QB change (the exact failure mode of static team ratings).
