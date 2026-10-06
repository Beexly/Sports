# [0535] Risk-Aware Preference Learning for Stochastic Outcomes (arXiv:2607.15483v1)

**Citation:** Yi-Shiuan Tung, Yuni Wu, Wei Jiang, Alessandro Roncone, Bradley Hayes (2026). *Risk-Aware Preference Learning for Stochastic Outcomes*. arXiv:2607.15483v1. URL: https://arxiv.org/abs/2607.15483v1
**Ledger completed:** 2026-09-21. **Read:** full text (13,798-char full-text extract; entire paper: abstract, §I–§V, references).
**Verdict:** ADAPT — preliminary robot-navigation paper with synthetic users and no human validation, so nothing to adopt directly; but its core machinery (Cumulative Prospect Theory value + probability-weighting inside a Bradley–Terry likelihood) is the textbook formalization of the favorite–longshot bias and gives GSE a parametric model of how betting markets distort true probabilities. Fit CPT weighting functions to market-implied probabilities to quantify and exploit longshot/favorite mispricing zones.

## 1. Research question
When humans express preferences over stochastic outcomes, do they use expected utility (linear probability aggregation) or a risk-sensitive model (Cumulative Prospect Theory)? In a social-robot-navigation setting with rare catastrophic outcomes (collisions), does a CPT-based preference learner recover reward functions with lower regret than a standard EU-based Bradley–Terry learner when the preference-generating user is risk-sensitive?

## 2. Dataset / schema
2D simulated social-navigation environment; robot meta-actions: forward, slow_down, stop, turn_left, turn_right, forward_left, forward_right (each parameterized by v, ω). Pedestrian behavior: Helbing–Molnár social force model (pysocialforce), scenes = corridors, intersections, doorways, open spaces (head-on encounters, group blocking). Per scene×action: K=50 stochastic rollouts; each rollout yields feature vector f ∈ ℝ⁵ (minimum pedestrian clearance, pedestrian deviation, robot progress, path smoothness, collision count). Ground-truth θ⋆ = [0.10, −0.20, 0.30, 0.05, −0.25]. Synthetic users: EU teacher vs CPT teachers with two risk profiles (Table I): T&K (α=0.88, η=0.88, λ=2.25, γ=0.61, δ=0.69) and Strong (α=0.80, η=0.80, λ=3.00, γ=0.50, δ=0.50). No human-subject data — validation is explicitly future work.

## 3. Method / model
Pairwise preference learning in the Bradley–Terry framework, comparing two learner-side value models fit by minimizing the BT negative log-likelihood: (a) EU learner: V(A) = θᵀφ assumes linear expectation over outcome utilities; (b) CPT learner: jointly estimates reward weights θ AND CPT parameters (α, η, λ, γ, δ). Synthetic teachers generate pairwise comparisons using either model, so the experiment tests matched vs mismatched teacher/learner.

## 4. Equations & assumptions
- Bradley–Terry preference model (Eq. 1): P(A≻B) = σ(β(V(A) − V(B))), β>0 inverse temperature.
- EU value: V_EU(A) = Σ_i p_i θᵀφ(o_i).
- CPT value function (Eq. 2): v(x) = x^α for x≥0; v(x) = −λ(−x)^η for x<0, with λ>1 (loss aversion).
- Probability weighting: w(p) = exp(−(−ln p)^γ), which overweights rare events when γ<1 (Prelec 1998); decision weights π_i from a rank-dependent transformation over cumulative probabilities (Tversky & Kahneman 1992).
- CPT value: V_CPT(A) = Σ_i π_i v(θᵀφ(o_i) − r), r = reference point separating gains/losses.
- Assumptions: (a) each robot action induces a known discrete distribution {(o_i, p_i)} (empirically from K=50 rollouts); (b) teacher preferences follow either EU or CPT exactly; (c) reference point r fixed; (d) the same φ/θ linear-reward structure on both sides — only the aggregation (linear vs rank-dependent weighted) differs.

## 5. Features / target
Target: action regret on held-out scenes — value(true user model, action chosen by learned model) minus value(action chosen by true user model). Training data: N pairwise preference comparisons from synthetic teachers. Learner outputs: reward weights θ (EU) or (θ, CPT params) (CPT).

## 6. Validation design
5 seeds; learning curves of held-out action regret vs training-set size N for EU vs CPT learners under EU teacher, T&K CPT teacher, and Strong CPT teacher. Both learners trained by BT negative log-likelihood on the same comparison data. No real humans, no real-world deployment — explicitly "preliminary experiments."

## 7. Numerical results / baselines
- EU teacher → EU learner wins (expected; extra CPT parameters reduce sample efficiency).
- T&K CPT teacher → CPT learner substantially beats EU learner; regret decreases steadily with N while EU learner stays at a higher plateau.
- Strong CPT teacher → same pattern, more pronounced.
- Core finding: when users are risk-sensitive, an EU learner "explains" risk-sensitive choices by distorting the recovered reward — conflating what users value with how they weight uncertainty; the CPT learner separates the two. No numeric regret values quoted in the text extract (curves in Figure 2); exact regrets not recoverable from the extract — figures carry the quantitative claims.
- No baselines beyond the EU/CPT comparison; no significance tests reported.

## 8. Code / data availability
None stated in the extract. No repository link in the paper text.

## 9. Leakage & limitations
Author-stated: preliminary; synthetic users only, no human validation; small simulation domain. Unstated but material: the empirical rollout distribution is treated as the true outcome distribution (no distribution-estimation error); CPT parameters are jointly estimated with θ — identifiability between (θ, CPT params) is not analyzed; regret is computed under the teacher's own value function (circularity: a mismatched learner is judged by a metric that assumes the teacher model is truth); only 5 seeds, no significance testing; no comparison against non-BT baselines. Transfer limits: robot-navigation domain, five hand-crafted features, toy action set — nothing transfers directly to sports.

## 10. GSE overlap
New capability + methodological extension. The existing-research map inventories Bradley–Terry as a rating/prediction tool; nothing in the map covers Cumulative Prospect Theory, probability-weighting functions, loss aversion, or risk-sensitive preference/behavior modeling. The classic favorite–longshot bias in betting markets IS the textbook CPT prediction (overweighting of small probabilities → longshots overbet), and behavioral-economics-of-betting is a corpus-relevant theme (market-efficiency work exists in the broader literature), but the map records no CPT formalization of market distortion in Garrett's corpus. This is the one arXiv paper in this wave whose machinery (BT + CPT) directly names the mechanism behind a known betting-market anomaly.

## 11. GSE implementation spec
**Market probability-distortion model (favorite–longshot bias formalized).** Treat the betting market's implied probabilities as "preferences expressed by a risk-sensitive user" and GSE's calibrated model probabilities as the EU ground truth. Fit the CPT probability-weighting function w(p) = exp(−(−ln p)^γ) (Prelec) to the mapping from GSE model probabilities → market-implied probabilities across historical NFL moneyline/point-spread markets, estimating γ (probability distortion) per market segment (public-heavy games vs sharp games, primetime vs non-primetime). The fitted γ quantifies longshot overweighting: γ<1 ⇒ market overprices small-probability outcomes. Output: a distortion curve + per-game "CPT adjustment" that re-weights GSE's edge calculation — i.e., convert model probability p to market-expected implied q = w(p) before comparing to the posted line, so the EV estimate accounts for the market's systematic distortion rather than treating deviations from GSE probability as pure edge. Estimated effort: 2–3 engineer-days (market line history + GSE probability archive already in the Sports repo). Risk: low — purely analytical overlay on existing EV logic.

## 12. Reproducible test
Dataset: historical NFL moneyline market (closing lines, 2020–2025 seasons) with GSE engine's calibrated win probabilities for the same games. Baseline: naive edge = |GSE p − market-implied p|, bets placed where naive edge > threshold. Candidate: fit w(p; γ) on seasons 2020–2023 (nonlinear least squares: market implied ≈ w(GSE p)), then compute CPT-adjusted edge = |w(GSE p) − market-implied p| on 2024–2025. Metric: ROI per unit staked on threshold-triggered bets, baseline vs CPT-adjusted. Success = CPT-adjusted betting achieves ROI ≥ baseline ROI + 2 percentage points on the 2024–2025 holdout AND estimated γ is significantly <1 (95% CI excludes 1), confirming the market's longshot distortion is real in this data.

## 13. Acceptance / rejection gate
ADAPT into the EV pipeline if: (a) fitted γ < 1 with 95% CI excluding 1 on the training window (market distortion confirmed, not assumed); AND (b) the CPT-adjusted edge selector beats the naive edge selector by ≥2pp ROI on the 2024–2025 holdout. REJECT if γ ≈ 1 (no distortion detectable — market already corrects) or if the CPT adjustment adds no ROI — the paper's result is synthetic and its reward-recovery claims may not survive contact with real market data; the distortion must be measured, never assumed.

## 14. Improvement experiment
Go beyond the paper: TWO-SIDED CPT — the paper models one risk-sensitive user; betting markets have two populations (public = strong CPT distortion, sharps = near-EU). Fit a mixture model: market-implied p = π·w_public(GSE p; γ_pub) + (1−π)·w_sharp(GSE p; γ_sharp≈1), with mixing weight π estimated from betting-percentage vs handle-percentage splits (public money counts vs sharp dollars). Then derive the "de-biased market probability" (the sharp component) as an independent signal to blend with GSE's model — a CPT-derived consensus rating. The paper never considers heterogeneous risk profiles on the teacher side; the public/sharp mixture is the natural sports-betting extension, and the estimated π per game becomes a sharp-action feature for the engine.
