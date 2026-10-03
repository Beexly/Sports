# [0530] Finding the Signal in the Spam: Jointly Learning Rewards and Worker Reliability from Pairwise Comparisons (arXiv:2608.10045v1)

**Citation:** Kaustubh Shivshankar Shejole, Tanish Agarwal, Arpit Agarwal, Avishek Ghosh (2026). *Finding the Signal in the Spam: Jointly Learning Rewards and Worker Reliability from Pairwise Comparisons*. arXiv:2608.10045v1. URL: https://arxiv.org/abs/2608.10045v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 106961 chars; main text, equations, experiments read; appendices A–J skimmed for ablations/implementation).
**Verdict:** ADAPT — joint reward+reliability estimation is directly portable to fusing heterogeneous prediction sources into one BT team-rating layer, with the adversarial/spammer handling stripped down to analyst-source reliability weights.

## 1. Research question
Can worker (annotator) reliability be learned jointly with item rewards from pairwise comparisons, without a gold-standard dataset? The paper adopts the Boltzmann-rational extension of Bradley–Terry–Luce, derives an EM algorithm using Pólya-Gamma augmentation to turn the logistic likelihood conditionally Gaussian, proves convergence via a rank-1 matrix-sensing reduction (RIP), and tests robustness to spammers and adversarial workers.

## 2. Dataset / schema
- Synthetic: N comparisons sampled from the Boltzmann-rational model; sweeps over N (2k–100k with K=100, M=500), M (500–8k with K=200, N=25k), K (50–2500 with M=20k, N=1k), β sampled uniform in [−1,1]; 10 random seeds.
- FaceAge (IMDB-WIKI-SbS, crowdsourced "which face is older"): K=9,150 items, M=4,091 workers, N=250,249 comparisons; ground truth = chronological age. Spammers pre-removed via gold instances.
- Reading Difficulty (Passage, Chen et al. 2013, Toloka/CrowdFlower): K=472, M=624, N=11,763; ground truth = standardized reading levels.
- Spammer-injection study on FaceAge: four archetypes — random choosers, position-biased (always-left/right), malicious adversaries (inverted responses), combined equal mix; injected at 0.1M, 0.2M, 0.4M, 0.6M, 0.8M (up to 44.4% of annotators), same expected comparison count per spammer, averaged over 10 seeds × 10 initializations.
- Access: code+data public at https://github.com/KaustubhShejole/BoRa_EM; FaceAge is a public benchmark.

## 3. Method / model
Model (Boltzmann-rational): each item j has latent reward rⱼ, each worker s has competency βₛ ∈ [−1,1]; P(w≻l | s) = σ(βₛ(r_w − r_l)); β=1 ideal annotator, β=0 random spammer, β=−1 adversarial.
Identifiability: likelihood invariant under additive shift r→r+c and joint scaling r→cr, β→β/c; enforced by centering rewards after each EM iteration and normalizing to unit root-mean-square with compensatory rescaling of β, plus mild ℓ2 regularization on rewards and Gaussian prior on competencies.
Algorithm BoRaEM (Algorithm 1): Pólya-Gamma augmentation introduces latent ωᵢ ~ PG(1,0) per comparison, turning the logistic likelihood conditionally Gaussian.
E-step: compute ηᵢ⁽ᵗ⁾ = βₛᵢ⁽ᵗ⁾(r_wᵢ⁽ᵗ⁾ − r_lᵢ⁽ᵗ⁾); E[ωᵢ|ηᵢ⁽ᵗ⁾] = κᵢ⁽ᵗ⁾ = (1/(2ηᵢ⁽ᵗ⁾))·tanh(ηᵢ⁽ᵗ⁾/2) (1/4 if η=0).
M-step (alternating maximization): βₛ = (Σᵢ∈Iₛ dᵢ)/(2 Σᵢ∈Iₛ κᵢ⁽ᵗ⁾ dᵢ²) closed form; rewards via linear system Hr = b with Σr=0, where Hⱼⱼ = Σ over wins/losses of βₛᵢ²κᵢ, Hⱼₗ (j≠l) = −Σ βₛᵢ²κᵢ over comparisons between j and l, bⱼ = ½Σ β over wins − ½Σ β over losses; solved via conjugate gradient.
Implementation: PyTorch, full GPU, deterministic seeding; item rewards init 0; worker competencies init to constant 0.8 (neutral reliability); competencies clipped to [−1,1].
Theory: M-step recast as min ‖A(βrᵀ) − u‖₂² (rank-1 matrix sensing); A satisfies RIP (Lemma 1) when N ≥ C·MK/δ²·ln(2/η); every local minimum is near-global minimum (Theorem 1, via Park et al. 2017 Burer-Monteiro results); each EM iteration monotonically increases likelihood; convergence to stationary point.

## 4. Equations & assumptions
- Core model (Eq. 2/3): P(w≻l; s) = σ(βₛ(r_w − r_l)) = exp(βₛr_w)/(exp(βₛr_w)+exp(βₛr_l)); classical BTL is P(w≻l) = σ(r_w − r_l) (β≡1).
- Complete-data likelihood (Eq. 4): L(θ;D) = ∏ σ(βₛᵢ(r_wᵢ − r_lᵢ)).
- Pólya-Gamma identity (Eq. 5): (e^ψ)^a/(1+e^ψ)^b = e^{κψ}/2^b ∫ exp(−ωψ²/2) p(ω|b,0) dω, κ = a − b/2.
- Augmentation (Eq. 6): σ(ηᵢ) = ½ e^{ηᵢ/2} ∫ exp(−ωᵢηᵢ²/2) p(ωᵢ) dωᵢ, ηᵢ = βₛᵢ(r_wᵢ − r_lᵢ), ωᵢ ~ PG(1,0).
- Augmented log-likelihood (Eq. 8): ℓ(θ) = Σ [½ βₛᵢ(r_wᵢ − r_lᵢ) − ½ ωᵢ βₛᵢ² (r_wᵢ − r_lᵢ)²].
- Q-function (Eq. 11): same with κᵢ⁽ᵗ⁾ replacing ωᵢ; E-step formula (Eq. 10) κᵢ⁽ᵗ⁾ = tanh(ηᵢ⁽ᵗ⁾/2)/(2ηᵢ⁽ᵗ⁾), κ=1/4 at η=0.
- M-step β update (Eq. 12): βₛ = (Σᵢ∈Iₛ dᵢ)/(2 Σᵢ∈Iₛ κᵢ⁽ᵗ⁾ dᵢ²), dᵢ = r_wᵢ − r_lᵢ.
- Reward system: Hⱼⱼ = Σᵢ∈Wⱼ βₛᵢ²κᵢ⁽ᵗ⁾ + Σᵢ∈Lⱼ βₛᵢ²κᵢ⁽ᵗ⁾; Hⱼₗ = −Σᵢ∈Dⱼₗ βₛᵢ²κᵢ⁽ᵗ⁾; bⱼ = ½Σᵢ∈Wⱼ βₛᵢ − ½Σᵢ∈Lⱼ βₛᵢ; Hr = b, Σrⱼ = 0.
- Matrix sensing (Eq. in §5): min_{β,r} ‖A(βrᵀ) − u‖₂², A(X) = (⟨A₁,X⟩,…,⟨A_N,X⟩)ᵀ, Aᵢ = 2cᵢα eₛᵢ(e_wᵢ − e_lᵢ)ᵀ, α = √(MK/2N), cᵢ² = κᵢ⁽ᵗ⁾, uᵢ = α/cᵢ.
- RIP (Definition): (1−δᵣ)‖X‖_F² ≤ ‖A(X)‖₂² ≤ (1+δᵣ)‖X‖_F² for all rank-r X. Lemma 1: RIP holds with prob ≥ 1−η when N ≥ C·(MK/δ²)·ln(2/η), for X1 = 0.
- Crowd-BT (related, Eq.): Pr(i≻j|s) = βₛσ(rᵢ−rⱼ) + (1−βₛ)σ(rⱼ−rᵢ).
- HBTL related (Jin et al. 2020, Eq. 1): P(w≻l;s) = Φ(βₛ(r_w − r_l)/√2).
Assumptions: worker index and item indices independent and uniform (B~Unif{1..M}, W,L~Unif{1..K}); β∈[−1,1], r∈[−R,R] for constant R>0; rewards centered (X1=0); comparisons drawn from the Boltzmann-rational model itself (synthetic); comparisons between distinct items.

## 5. Features / target
No features — pure comparison data: (wᵢ, lᵢ, sᵢ) triples = winning item, losing item, worker id. Targets: latent item rewards rⱼ (ranking) and worker competencies βₛ ∈ [−1,1]. Evaluation metrics are rank-oriented: Kendall's Tau, Accuracy (probability of correctly ordering item pairs), Weighted Accuracy (penalizes larger ranking errors).

## 6. Validation design
Synthetic: 10 random seeds; vary one of N, M, K at a time; baselines: plain BT, RankCentrality (RC), FactorBT, BARP, CrowdBT, HTCV, HBTL.
Real: FaceAge and Passage with ground-truth rankings; metrics Kendall's τ, accuracy %, weighted accuracy %; runtime reported per method (same hardware). Spammer injection study on FaceAge (4 archetypes × 5 proportions). Ablations: initialization of β over grid (BoRaEM/HBTL: −1..1 step 0.1; CrowdBT: 0..1; FactorBT logits) — BoRaEM/HBTL performance symmetric around β=0 (sign ambiguity; init sign convention matters only up to a global flip); initialization to 0.8 used in all main runs. No time-ordered splits — data is static crowdsourced comparisons; appropriate for the task, but no temporal leakage concern applies since the domain is not forecasting.

## 7. Numerical results / baselines
FaceAge (Table 2): BoRaEM Accuracy 79.21%, Weighted Acc 87.36%, τ = 0.5795, runtime 6.55 ± 0.43 s — best overall, narrowly ahead of HBTL (79.20 / 87.35 / 0.5793, 83.10 s), CrowdBT (79.17 / 87.31 / 0.5787, 138.16 s), HTCV (79.17/87.33/0.5786, 41.31 s), FactorBT (79.16/87.30/0.5785, 169.41 s), BARP (79.08/87.26/0.5769), plain BT (79.01/87.20/0.5754, 0.89 s), RC (78.04/86.44/0.5582, 0.07 s). Gaps between competence-modeling methods are ~0.04% accuracy — small absolute gains but consistent, and BoRaEM is 10–25× faster than competitors (6.55 s vs 41–169 s).
Passage (Table 2): CrowdBT best (70.02 / 75.96 / τ=0.3779); HBTL (69.53/75.46/0.3688); BoRaEM (69.59 / 75.56 / τ=0.3698, 8.28 s) — second/third; all methods low (τ 0.29–0.38) due to small N=11,763 and subjectivity. Paper claims these gaps show joint competence modeling helps when data suffice.
Spammer study (Figure 2): as injected spammer proportion rises 0% → 44.4%, BoRaEM/HBTL/HTCV remain best, followed by CrowdBT and FactorBT; BARP, BT, RC degrade substantially. Robustness holds across all four archetypes (random, position-biased, adversarial, combined).
Synthetic (Figure 1): (a) varying N: competence-modeling methods (BoRaEM, HBTL, CrowdBT) stay high at all N; non-competence methods stay low; BoRaEM more robust than CrowdBT at sparse N < 4000. (b) varying M: all methods decay as per-worker observations thin; CrowdBT's decay much larger than BoRaEM's; BoRaEM stable. (c) varying K: decay after K=1000; HBTL and BoRaEM degrade slower than CrowdBT.
Initialization ablation (Appendix I): BoRaEM/HBTL symmetric around init β=0 (global sign flip); stable across the grid; FactorBT init logits 0.7 → competencies σ(0.7)≈0.668.

## 8. Code / data availability
Code and data: https://github.com/KaustubhShejole/BoRa_EM (stated public). PyTorch implementation with GPU support. FaceAge benchmark public (IMDB-WIKI-SbS). Passage data from Chen et al. 2013 / Toloka.

## 9. Leakage & limitations
Adversarial reading: synthetic experiments draw data exactly from the fitted model family (β uniform in [−1,1]) — best-case misspecification zero, so the synthetic robustness is an upper bound. Real-data gains over plain BT are tiny on FaceAge (+0.20% accuracy, τ +0.0041); FaceAge had spammers pre-removed by gold instances, so the "real-world" test is the cleaned version — spammer-robustness is demonstrated only with *synthetic* injected spammers whose behavior follows paper-assumed archetypes. All 10 seeds for data sampling reported; statistical significance of the 0.04% gaps is untested. Domain gap: the β∈[−1,1] adversarial regime assumes some comparisons are deliberately inverted — in GSE's multi-source rating fusion, analysts are not adversarial, so the β∈[0,1] regime (Appendix F) is the operative one, where the paper itself notes non-competence methods "perform comparatively better." RIP convergence guarantee requires N ≥ C·MK/δ²·ln(2/η) and uniform random sampling of worker/item indices — NFL reality is far from uniform (analysts cover different conferences; some pairs never compared). The identifiability fix (unit-RMS + centering each iteration) pins the scale arbitrarily, so β is interpretable only relatively. For GSE: the method optimizes rank order, not calibrated probabilities — GSE's product needs calibrated win probabilities, and BT-derived scores need a separate calibration step the paper doesn't address.

## 10. GSE overlap
Extension, not duplicate. Garrett's corpus: Bradley–Terry, Plackett-Luce, Elo/Glicko/TrueSkill, Massey/Sagarin/Colley are inventoried (26-metric catalog, benchmark dossiers); the reverse-engineering mission (2026-09-18) aggregates heterogeneous analyst sources. But no existing work JOINTLY estimates source reliability with the ratings themselves — GSE's ratings are either single-source or fused with fixed/ad-hoc weights. New capability: learned, per-source reliability weights inside the rating estimator, with closed-form EM updates and a principled near-global convergence guarantee. Tangential overlaps: the 15-area ML brief lists "learning-to-rank" and "market-relative learning" as commissioned topics (results pending), so this paper is consistent with but not duplicative of those.

## 11. GSE implementation spec
Port the Boltzmann-rational joint estimator to GSE's multi-source team-rating fusion. Setup: K = 32 NFL teams (or 134 FBS for CFB); "items" = teams; pairwise data = head-to-head games AND analyst pairwise comparisons; "workers" = sources (FPI, Sagarin, betting market implied, PFF, individual analyst models, fan polls) — each source s gets reliability βₛ. For sources that only give win probabilities: convert de-vigged probabilities pₛ(j beats l) into comparison outcomes via sampling or via expected-comparison likelihood; or use sources' implied ratings directly as reward priors with weak β priors. Training: BoRaEM EM on rolling 3-season window of games + source rankings; βₛ ∈ [0,1] variant (non-adversarial regime, per Appendix F) with init β=0.8 for all sources; center + unit-RMS rewards each iteration; conjugate-gradient reward solve. Then calibrate: map learned rewards to win probabilities via logistic fit on holdout games (the paper's β-scaled rewards need a temperature), producing calibrated probabilities. Serving: re-run weekly (fast — 6.55 s on 250k comparisons on FaceAge; NFL scale is trivial). Estimated effort: 3–5 engineer-days (data plumbing for source→comparison conversion + EM loop + calibration layer), low risk.

## 12. Reproducible test
Dataset: 2020–2024 NFL regular-season games (nflverse) as comparison ground truth + 3 heterogeneous sources converted to pairwise comparisons (market-implied via de-vigged closing moneylines, a public power rating e.g. Sagarin, and Elo-style carryover). Method: (a) baseline — plain BT on games only, calibrated via logistic; (b) candidate — BoRaEM with β∈[0,1] on games + source comparisons, calibrated same way. Metric: Brier score and log loss of calibrated win probabilities on held-out 2025 season weeks 1–18 (time-ordered split; train through 2024, test 2025). Report also Kendall's τ of the learned ratings vs final 2025 season SRS standings.

## 13. Acceptance / rejection gate
ADOPT the reliability-fusion layer if BoRaEM beats plain BT by ≥0.002 Brier (or ≥0.02 log-loss nat improvement) on the held-out 2025 season AND learned βₛ values are stable across two independent train windows (rank correlation ≥0.8), without degrading calibration (ECE change within ±0.005). REJECT if no Brier improvement — the added complexity then buys nothing over fixed-weight fusion.

## 14. Improvement experiment
Extend beyond the paper: heterogeneous βₛ that vary by context — e.g., source reliability estimated separately for spread-relevant vs total-relevant predictions, or time-decaying β per source (recent weeks weighted more) via an online/sequential EM update. Test whether source reliability is regime-dependent (e.g., market-implied ratings dominate favorites; analytics models dominate totals) — the paper's single global βₛ cannot capture this, and a mixture-of-regimes extension could give GSE a meaningfully better fusion layer than either the paper or fixed weights.
