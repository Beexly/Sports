# [0011] When Greedy Sampling Explores: KL-Regularized Contextual Bandits without Eluder-Dimension Dependence (arXiv:2609.13564)

**Citation:** Zichen Wang, Haoyang Hong, Huazheng Wang (2026). *When Greedy Sampling Explores: KL-Regularized Contextual Bandits without Eluder-Dimension Dependence*. arXiv:2609.13564. URL: https://arxiv.org/abs/2609.13564
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2577 lines — main body §1–7 and appendices A–E, including the proof derivations, read in full).
**Verdict:** ADAPT — the first bandit-selection theory in the sweep and a direct hit on GSE's open "RL/bandits for pick selection" gap; greedy Gibbs sampling over a reward estimate is implementable, but the paper's validation is purely synthetic, so it needs an NFL-data test before any adoption.

## 1. Research question
Can greedy sampling achieve strong regret guarantees in KL-regularized contextual bandits without explicit dependence on the eluder dimension? The paper answers yes under reward feedback (RF) and under preference feedback (PF) with both the general preference (GP) and Bradley–Terry (BT) models, and characterizes the trade-off between greedy sampling and UCB-style exploration as a function of the KL regularization strength: greedy is preferable under strong regularization (small η), explicit optimism under weak regularization (large η).

## 2. Dataset / schema
No real dataset. This is a theory paper; the only empirical component is a synthetic contextual bandit: |X| = 3 contexts, |A| = 3 actions, |R| = 5 reward functions, horizon T = 5000 rounds, results averaged over 10 independent random seeds, regularization parameter swept over η ∈ {0.5, 1, 3, 10, 30, 100, 300, 500, 1000, 2000}. No public data, no schema — not replicable as a data artifact, only as a simulation.

## 3. Method / model
**RF-GS (Algorithm 1, §4):** each round t, observe context x_t; compute the least-squares estimator R̂_t ∈ argmin_{R∈R} Σ_{i=1}^{t−1} (R(x_i,a_i) − r_i)² over the finite reward class R; construct the Gibbs policy π_t(a|x) ∝ π_ref(a|x)·exp(η·R̂_t(x,a)); sample a_t ~ π_t(·|x_t); observe r_t. "Greedy sampling" = the policy is built solely from the current reward estimate with no explicit uncertainty/exploration bonus.
**ORLHF-GS (Algorithm 2, §5, from Wu et al. 2025):** extends greedy sampling to preference feedback. Per round: observe x_t; under GP, compute the MLE P̂_t = argmax_{P∈P} Σ_{i<t} [y_i log P(x_i,a_i^1,a_i^2) + (1−y_i) log P(x_i,a_i^2,a_i^1)] and set π̂_t^1 to the Nash-equilibrium policy of P̂_t (Lemma 2: equilibrium policies coincide at the unique symmetric NE); under BT, MLE over R with the logistic likelihood σ(R(x_i,a_i^1) − R(x_i,a_i^2)) and build the Gibbs policy π̂_t^1(a|x) ∝ π_ref(a|x)·exp(η·R̂_t(x,a)); then sample a_t^1 ~ π̂_t^1, a_t^2 ~ π_ref, observe binary preference y_t.
**UCB counterparts:** K-UCB (Zhao et al. 2025b) for RF — augments the LS estimate with bonus b_t(x,a) = min{1, U_RF(λ,x,a,R;D_{t−1}^RF)·√(16 log(2N_R T/δ))} and selects the Gibbs policy of R̂_t + b_t; plus Corollary 4's √T η-independent K-UCB bound. GP-UCB (Appendix D.1.4) keeps the greedy π̂_t^1 but selects the second action by a2t ∈ argmax_{a²∈A} min{1, U_GP²(λ,x_t,a_t^1,a²,P;D_{t−1}^GP)} (uncertainty only for data collection, preserving P̂'s reciprocal structure). BT-UCB (Appendix D.2.3) analogously with U_BT.

## 4. Equations & assumptions
KL-regularized value (§3.2, Eq. 1): J_RF(π) := E_{x~d} E_{a~π} [R*(x,a) − η^{−1} KL(π,π_ref|x)] = E_{x~d} E_{a~π}[R*(x,a) − η^{−1} log(π(a|x)/π_ref(a|x))].
Regret (Eq. 2): Reg_RF(T) := Σ_{t=1}^{T} (J_RF(π*) − J_RF(π_t)).
Gibbs policy (Lemma 1, Eq. 3): π_R(a|x) = π_ref(a|x)·exp(ηR(x,a)) / Z_R(x), Z_R(x) := Σ_{a'} π_ref(a'|x)·exp(ηR(x,a')).
Greedy policy (Eq. 4): π_t(a|x) ∝ π_ref(a|x)·exp(η·R̂_t(x,a)).
Regret decomposition (Lemma 4, Eq. 5): Reg_RF(T) ≤ η·Σ_{t=1}^{T} S_t, where S_t := E_{x~d, a~π'_t}[(R̂_t(x,a) − R*(x,a))²] and π'_t is the Gibbs policy of R'_t = γ_t R̂_t + (1−γ_t)R* for some γ_t ∈ [0,1] (the decomposition is proved via a mean-value argument on JR(x) := log Z_R(x) − η Σ_{a'} π_R(a'|x)Δ_R(x,a'), reducing the gap to ηγ E_{x~d,a~π'_t}[Δ_R²] with Δ_R := R̂−R*).
Uniform prediction error (Lemma 3, Eq. 6): Σ_{i=1}^{t−1} E_{x~d,a~π_i}[(R*(x,a) − R̂_t(x,a))²] ≤ 72 log(2N_R T³/δ), t ≥ 2, w.p. ≥ 1−δ.
Likelihood-ratio bound: π'_t(a|x)/π_i(a|x) ≤ e^{2η} ∀(x,a) (Gibbs policies from [0,1]-valued rewards); hence S_t ≤ (72e^{2η}/(t−1))·log(2N_R T³/δ) for t ≥ 2 (Eq. 7); harmonic sum gives the log T dependence (Eq. 8).
**Theorem 1:** under Assumption 1, δ ∈ (0,1), T ≥ 2, w.p. ≥ 1−δ: Reg_RF(T) = O(η e^{2η} log T log(N_R T/δ)).
**Corollary 1** (dimension-dependent RF-GS): for λ ≤ 8 log(2N_R T/δ), w.p. ≥ 1−δ: Reg_RF(T) = O(η e^{2η} (d_RF(λ,R,T) + log(1/δ)) log(N_R T/δ)).
**Corollary 4** (√T K-UCB bound): for λ ≤ 8 log(2N_R T/δ), w.p. ≥ 1−δ: Reg_RF(T) = O(√(T(d_RF(λ,R,T) + log(1/δ))) log(N_R T/δ)).
GP objective (§3.3.1): J_GP(π¹,π²) := E_{x~d}[P*(x,π¹,π²) − η^{−1}KL(π¹,π_ref|x) + η^{−1}KL(π²,π_ref|x)]; regret Reg_GP(T) := Σ_t (J*_GP − min_{π²} J_GP(π̂_t^1,π²)).
Instantaneous GP bound (Lemma 5): J*_GP − J_GP(π̂_t^1, π̃_t^2) ≤ 2η e^{η} E_{x~d, a¹~π̂_t^1, a²~π_ref}[(P*(x,a¹,a²) − P̂_t(x,a¹,a²))²], where π̃_t^2 := argmin_{π²} J_GP(π̂_t^1,π²); proved via the exact identity G_t = η^{−1} E_{x~d} KL(π̂_t^1, π̃_t^2 |x) plus weighted Cauchy–Schwarz (Bregman-integral lower bound KL ≥ (e^{−η}/2) Σ_a (π̂¹−π̃²)²/π_ref).
**Theorem 2:** under Assumption 2, w.p. ≥ 1−δ: Reg_GP(T) = O(η e^{3η} log T log(N_P T/δ)) (eluder-free); plus dimension-dependent O(η e^{η} (d_GP(λ,P,T) + log(1/δ)) log(N_P T/δ)) for λ ≤ log(2N_P T/δ) — sharpening Wu et al. 2025 by removing their η³e^{9η} term.
**Corollary 2** (GP-UCB): w.p. ≥ 1−δ: Reg_GP(T) = Õ(min{η d_GP(λ,P,T), √(d_GP(λ,P,T) T)}).
BT model (§3.3.2): P*(x,a¹,a²) = σ(R*(x,a¹) − R*(x,a²)), σ(z) = (1+e^{−z})^{−1}; J_BT := J_RF; Reg_BT(T) := Σ_t (J_BT(π*) − J_BT(π̂_t^1)).
**Theorem 3:** under Assumption 1, w.p. ≥ 1−δ: Reg_BT(T) = O(η e^{2η} log T log(N_R T/δ)) — matches the RF rate despite indirect binary feedback (key: inverse Lipschitz |u−v| ≤ 2e|σ(u)−σ(v)| for u,v ∈ [−1,1], Lemma 8).
**Corollary 3** (BT-UCB): w.p. ≥ 1−δ: Reg_BT(T) = Õ(min{η d_BT(λ,R,T), √(d_BT(λ,R,T) T)}).
Trade-off (§4/§5): RF-GS bound beats K-UCB when e^{2η} log T ≲ d_RF(λ,R,T); K-UCB's available guarantee Õ(min{η d_RF, √(d_RF T)}); analogously e^{3η} log T ≲ d_GP(λ,P,T) for GP; for large η the UCB bound saturates at the η-independent √T rate.
Gibbs properties (Appendix B): e^{−η} ≤ π_R(a|x)/π_ref(a|x) ≤ e^{η}; e^{−2η} ≤ π_{R1}(a|x)/π_{R2}(a|x) ≤ e^{2η}; 1 ≤ Z_R(x) ≤ e^{η}.
**Assumptions stated:** Assumption 1 (reward realizability: R* ∈ R); Assumption 2 (GP realizability: P* ∈ P); π_ref has full support over A; rewards r_t ∈ [0,1] with E[r_t|x_t,a_t] = R*(x_t,a_t); contexts x_t drawn i.i.d. from unknown d; finite classes R, P (infinite classes via covering numbers, cited not derived); GP reciprocity P(x,a¹,a²)+P(x,a²,a¹) = 1; smaller η = stronger regularization.

## 5. Features / target
Not applicable as a prediction paper (theory). The "features" are contexts x_t ∈ X and the "target" is the cumulative KL-regularized regret Reg(T). No input feature list, no label definition, no prediction horizon stated.

## 6. Validation design
Online regret comparison on the synthetic bandit (§6): RF-GS vs K-UCB (Zhao et al. 2025b), T = 5000 rounds, 10 independent seeds, η ∈ {0.5, 1, 3, 10, 30, 100, 300, 500, 1000, 2000}. Metric: empirical cumulative KL-regularized regret. No train/validation/test split (online protocol), no real-data backtest, no additional baselines (no Thompson sampling, no ε-greedy).

## 7. Numerical results / baselines
No numeric values are reported in the text — results are conveyed only via Figure 1 (mean cumulative KL-regularized regret of RF-GS vs K-UCB across η). Paper's qualitative claims (§6 Results): for small and moderate η, RF-GS achieves "substantially lower regret" than K-UCB; as η increases, the Gibbs policy concentrates, RF-GS under-explores, and K-UCB "eventually outperforms" RF-GS. The authors state the empirical results "closely match" the theoretical trade-off. [My interpretation: the crossover point on the η axis is visible only in the figure; no exact crossover value or regret magnitudes are stated in the text.]

## 8. Code / data availability
None stated. No code link, no dataset (synthetic only).

## 9. Leakage & limitations
Synthetic validation only — no evidence the bounds or the η trade-off hold on any real decision problem, let alone sports betting. Finite function class + exact realizability are strong and unverifiable in practice. The bounds carry e^{2η} (RF/BT) and e^{3η} (GP) factors that explode for large η, making the "logarithmic" guarantee vacuous outside the strongly-regularized regime — the paper's own trade-off analysis concedes UCB dominates there. The crossover condition (e^{2η} log T ≲ d_RF) depends on the eluder dimension, which is unobservable in practice, so the "which algorithm" decision rule is not operational. No comparison against Thompson sampling or simple ε-greedy. π_ref with full support is required; a degenerate reference policy breaks the analysis. External validity to NFL pick selection is entirely untested. The regret bounds use crude worst-case constants (e.g., 72 log(2N_R T³/δ)); finite-sample regret at realistic N_R would be dominated by log terms the O-notation hides.

## 10. GSE overlap
New capability, no duplication. Per the existing-research map §4 gap list item 4: "RL / bandits for pick selection — ML brief lists contextual bandits, but no papers read. Selection-under-budget, learning-to-abstain with coverage-risk curves." Nothing in the 64 deduped papers or the repo corpus covers contextual bandits for selection. CEPT (Garrett's ensemble theory) is about ensembling, not sequential selection — adjacent, not overlapping. The BT-model preference-feedback results are adjacent to the RLHF/DPO literature but GSE has no preference-learning lane.

## 11. GSE implementation spec
Build a contextual-bandit pick-selection layer: arms = candidate edges (spread/moneyline/total/prop candidates the engine already prices); context = slate features (matchup metrics, de-vigged market price, model edge, CLV history); reward = realized CLV (or ROI) per pick; reference policy π_ref = current engine selection policy (or uniform over candidates); reward estimator = gradient-boosted regressor retrained on expanding history; policy = Gibbs π(a|x) ∝ π_ref(a|x)·exp(η·R̂(x,a)) with η tuned on replay; add an explicit abstain arm to implement learning-to-abstain. Serve as a nightly batch that outputs the slate's pick set. Estimated effort: medium (2–4 days for offline replay harness + estimator, plus ongoing η tuning).

## 12. Reproducible test
Offline replay on GSE's historical engine picks (2024–2025 seasons, ≥500 pick decisions): contexts from nflverse + archived odds, reward = CLV per pick. Compare cumulative CLV of greedy-Gibbs selection vs the engine's current selection rule vs ε-greedy, all on the same candidate sets. Metric: cumulative CLV (and realized ROI) over the replay window.

## 13. Acceptance / rejection gate
ADOPT the greedy-Gibbs selection layer only if it beats the ε-greedy baseline by ≥2% cumulative CLV on the full 2024–2025 replay with ≥500 decisions; otherwise REJECT. Pre-registered before running.

## 14. Improvement experiment
Go beyond the paper: (1) anneal η over time (strong regularization early when the reward estimate is noisy, weaker as confidence grows) rather than fixed η — the paper's trade-off analysis suggests the optimal regime shifts with estimation error; (2) add a Thompson-sampling variant over the same reward class as a second baseline; (3) formalize the abstain arm with a coverage-risk curve (from the gap list's learning-to-abstain) and test whether selective abstention beats always-picking on realized ROI.
