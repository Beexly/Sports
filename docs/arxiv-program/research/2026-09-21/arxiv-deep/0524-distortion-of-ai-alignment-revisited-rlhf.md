# [0524] Distortion of AI Alignment Revisited: RLHF is a Decent Utilitarian Aligner (arXiv:2609.12651v1)

**Citation:** Oko, K., Ulichney, A., Haghtalab, N., and Bao, H. (2026). *Distortion of AI Alignment Revisited: RLHF is a Decent Utilitarian Aligner*. arXiv:2609.12651v1. URL: https://arxiv.org/abs/2609.12651v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~440,888 chars; main text, theorems, experiments, and appendices read in full).
**Verdict:** REJECT — a theoretical RLHF-alignment paper (distortion bounds for LLM preference training under distribution mismatch); it contains no sports-relevant method, data, or transfer path.

## 1. Research question
Is RLHF a decent "utilitarian aligner" for heterogeneous users? Gölz et al. (2025) showed RLHF's distortion — the multiplicative gap between the RLHF policy's average user utility and the optimal average utility — can scale exponentially (e^Ω(β)) in the Bradley-Terry temperature β. This paper refines that theory with reward clipping and tight upper/lower bounds, showing the exponential blowup is not fundamental to RLHF but a consequence of distribution mismatch between the preference-data-generating distribution µ and the KL reference policy π_ref.

## 2. Dataset / schema
- Theory paper; the only empirical inputs: (a) two open-weight reward models — Skywork-Reward-V2-Llama-3.1-8B (MLE loss) and UltraRM-13B (MLE + regularization |m|≤1) — evaluated on 5,000 preference instances sampled from their training datasets (Skywork-Reward-Preference-80K-v0.1, UltraFeedback) from RewardBench; per-instance pairwise reward differences Δr = |r(x|z) − r(y|z)| plotted as empirical CDFs. (b) A small synthetic 4-alternative experiment (β=10, B=11.5) optimized by mirror descent (step η=10^−3). (c) Appendix D.3 estimates B as per-completion log-likelihood ratio. No sports or prediction data.

## 3. Method / model
- Framework: utilitarian distortion from social choice theory. AI alignment setting: Dist(π) = max_{π':KL(π'∥π_ref)≤τ} E_{u∼D,x∼π'}[u(x)] / E_{u∼D,x∼π}[u(x)] (KL budget τ). Social-choice setting (τ→∞): numerator = max_{x} E_{u∼D}[u(x)]. RLHF = (i) MLE reward fit under BT on preference data from µ, (ii) KL-constrained policy optimization with reward clipping (3). Proof technique: "effective utility" û that extracts the utility signal preserved in pairwise comparisons (signal degradation + underweighting of large utilities), then "reward sandwich" bounding learned rewards between effective and true utilities. Synthetic experiment: 4 alternatives with engineered (π_ref, µ, utility) mismatch; track distortion vs. average reward over mirror-descent steps under µ=π_ref vs. µ≠π_ref.

## 4. Equations & assumptions
- BT model: P(i prefers x over y) = σ(β(u(x) − u(y))), σ(t) = 1/(1 + e^−t) (Eq. 1, §2).
- Distortion (alignment): Dist(π) = max_{π':KL(π'∥π_ref)≤τ} E_{u∼D,x∼π'}[u(x)] / E_{u∼D,x∼π}[u(x)] (Eq. in §2); social choice: Dist(π) with numerator max_{x∈A} E_{u∼D}[u(x)].
- Assumption 2.1 (distribution mismatch): max_{x∈A} log(π_ref(x)/µ(x)) = B < ∞ (one-sided bound suffices for upper bounds).
- Theorem 3.1 (social choice / Borda): Dist(π_Borda) ≤ C1β + 4 (absolute constant C1; improves prior O(β²)).
- Theorem 4.1 (RLHF with clipping): Dist(π_RLHF) ≤ C2·min{e^B·τ, B, Bτ^−1 + 1}·β + 4. When µ = π_ref (B = 0): distortion O(β) up to constant — optimal, matching the algorithm-independent Ω(β) lower bound.
- Lower bounds: Ω̃(Bβ) distortion construction under mismatch (mass concentrated on π_ref(1) = 1 − (Bβ/τ) − (1+β)e^−B etc.; KL allows Θ̃(B^−1) mass shift); algorithm-independent Ω(β) lower bound for all τ when B = 0 (Theorem 5.2).
- Effective utility: û(x) = 0 if P_{y∼µ}[u(y)−u(x) > cβ^−1] ≥ 1/2; = cβ^−1 if u(x) > cβ^−1; = u(x) otherwise, 0 < c ≤ 3/16 (Eq. 5).
- Reward clipping: r_min defined via a fixed-point equation on E_{y∼µ}[σ(r_min − r̄(y))] (Eq. 7; numeric constants garbled in text extract — not quoted), r_max = r_min + 2c.
- Stated assumptions: BT-generated preferences with temperature β; utilities in [0,1]; large-n regime so empirical MLE loss converges to population loss; uniformly bounded log density ratio; no assumption on user heterogeneity beyond the population D.

## 5. Features / target
- No features/targets in the ML sense: the analysis bounds the distortion ratio of the RLHF policy relative to the KL-constrained utilitarian optimum. Empirical "features": pairwise reward differences Δr from reward models on RewardBench instances (used only to argue practical models operate in the BT nonlinear regime).

## 6. Validation design
- Theoretical validation: tight upper/lower bounds (matching up to constants/log factors across KL regimes), plus a synthetic experiment comparing distortion trajectories under µ=π_ref vs. µ≠π_ref, and a descriptive measurement of reward scales on 5,000 RewardBench instances for two public reward models. No train/test split; no baseline methods compared (Gölz et al. bounds are the analytic baseline).

## 7. Numerical results / baselines
- Reward-scale measurement: max Δr = 108.8 for Skywork-Reward-V2-Llama-3.1-8B, 25.4 for UltraRM-13B (5000 instances each) — interpreted as evidence that practical reward models operate in the BT nonlinear regime (paper's claim; the numbers "do not exactly correspond to the effective value of β due to optimization errors").
- Synthetic experiment (β=10, B=11.5): when preference data are generated on-policy (µ=π_ref), distortion converges to 1; under mismatch (µ≠π_ref), distortion grows as mirror descent proceeds while average reward declines (Figure 3).
- Analytic results: Dist(π_Borda) ≤ C1β + 4 (vs. prior O(β²)); Dist(π_RLHF) ≤ C2·min{e^Bτ, B, Bτ^−1+1}·β + 4; optimal O(β) at B=0; exponential e^Ω(β) lower bound from prior work ruled out unless mismatch is extreme.

## 8. Code / data availability
None stated (no code repository; reward models and datasets cited as public: Skywork-Reward-V2-Llama-3.1-8B, UltraRM-13B, RewardBench).

## 9. Leakage & limitations
- The empirical component is descriptive, not a test of the theory: the Δr measurement only establishes that public reward models have wide reward scales; it does not measure distortion itself, which is unobservable without true user utilities.
- Synthetic experiment is a 4-alternative toy; the mirror-descent trajectories are illustrative of the mechanism, not evidence of real-world magnitude.
- Assumption 2.1's one-sided sup bound B is sensitive to tiny-probability alternatives (acknowledged as a drawback in the paper); B estimation via per-completion log-likelihoods is noted to be unstable (Appendix discussion).
- The "distortion" framing assumes a utilitarian aggregation of cardinal utilities behind ordinal preferences — a strong normative assumption, not tested.
- External validity to NFL: none. The domain is LLM post-training; nothing in the paper concerns games, scores, or prediction. The Bradley-Terry link function appears in sports rating models, but the paper's results are about *reward-model distortion under preference-data distribution mismatch*, which has no actionable sports analogue (GSE does not train BT models on off-policy preference data).

## 10. GSE overlap
- No duplicate, but no value — wrong domain with no transfer path. Existing research map: Bradley-Terry is inventoried as a rating family and RL/bandits appear in the 15-area ML brief, but GSE has no RLHF-style pipeline (no preference-trained reward model, no KL-regularized policy optimization) to which distortion bounds could apply. The one near-miss — BT temperature β nonlinearity — is a conceptual parallel to rating-model calibration, but the paper's bounds are about utility aggregation across heterogeneous users, not score prediction. Rated REJECT, not ADAPT, because adapting would mean inventing an application the paper does not support.

## 11. GSE implementation spec
- Not recommended (REJECT). If a GSE analogue were ever needed (it is not): the paper's practical takeaway — "collect preference/training data on-policy (µ ≈ π_ref) or fine-tune the reference toward the data distribution before fitting" — maps to the already-standard practice of training calibration/rating models on the same game distribution they will be applied to, which GSE's backtesting already enforces. No new build.

## 12. Reproducible test
- Not applicable (theory paper, REJECT). The checkable predictions are analytic (the bounds), verifiable by reading the proofs in Appendix A, not by a data experiment. The synthetic experiment (§6.2) is fully specified (β=10, B=11.5, mirror descent η=10^−3, 4 alternatives per Appendix D.2) but reproducing it tests nothing about sports.

## 13. Acceptance / rejection gate
- REJECT stands: no sports-relevant claim exists to gate. For completeness: would only reconsider if a future version applied distortion theory to pairwise-preference rating data over *teams* (e.g., market-implied team comparisons), at which point the gate would be a backtested rating-accuracy comparison — not present in this version.

## 14. Improvement experiment
- None sports-applicable. Within the paper's own domain, the authors' stated open directions are: preconditioning off-policy preference data (filtering/reweighting to bring µ toward π_ref) and deciding when RLHF suffices versus heterogeneity-robust methods like NLHF — both LLM-alignment questions, not GSE questions.
