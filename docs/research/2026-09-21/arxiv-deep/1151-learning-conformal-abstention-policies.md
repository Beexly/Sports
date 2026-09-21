# [1151] Learning Conformal Abstention Policies for Adaptive Risk Management in Large Language and Vision-Language Models (arXiv:2502.06884)

**Citation:** Sina Tayebati, Divake Kumar, Nastaran Darabi, Dinithi Jayasuriya, Ranganath Krishnan, Amit Ranjan Trivedi (2025). *Learning Conformal Abstention Policies for Adaptive Risk Management in Large Language and Vision-Language Models*. arXiv:2502.06884v1 [cs.LG]. URL: https://arxiv.org/abs/2502.06884
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 21 pages, arXiv v1).
**Verdict:** ADAPT
The two-threshold conformal structure (predict / set-valued hedge / abstain) maps directly onto GSE's post-a-pick vs lean vs no-play decision; drop the RL threshold-tuning gimmick and tune (α, β) on validation instead.

## 1. Research question
Static conformal-prediction thresholds fail to balance accuracy, coverage, and informativeness across tasks and shifting data. Can reinforcement learning dynamically optimize conformal abstention thresholds, choosing per-query between a single prediction, a prediction *set*, and full abstention — with statistical coverage guarantees — for LLM/VLM outputs in safety-critical settings?

## 2. Dataset / schema
Ten multiple-choice QA benchmarks (all reformatted to 4- or 6-option MCQA; "I don't know" and "None of the above" appended as universal uncertainty options):

**VLM (4 options each):** MMBench dev (4,000 visual Qs); OODCV-VQA "Digits" subset (out-of-distribution counting); ScienceQA (3,952 image-based science Qs); SEEDBench (14,233 visual-understanding Qs); AI2D (15,000 diagram Qs).
**LLM (6 options each):** MMLU (10,000 sampled, 2,500 × 4 subject groups); CosmosQA (10,000); HellaSwag (10,000); HaluDial (10,000, from HaluEval); HaluSum (10,000, from HaluEval).
Models: LLaVA-v1.6 (34B/13B/7B), Yi-34B, Qwen-7B/14B in main text; MoE-LLaVA-Phi2-2.7B, Monkey-Chat 7B, InternLM-XComposer2-VL 7B, Yi-VL 6B, CogAgent-VQA 7B, MobileVLMv2, Llama-2 7B/13B in appendices. No sports data; all public benchmarks.

## 3. Method / model
**Conformalized Abstention Policy (CAP).** Nonconformity score s(x,y) = 1 − p_y(x) (softmax). Two thresholds from calibration quantiles:
- q̂_predict = quantile({s_1..s_n}, ⌈(n+1)(1−α)⌉/n)
- q̂_abstain = quantile({s_1..s_n}, ⌈(n+1)(1−β)⌉/n)

Three regimes for test score s(x) = 1 − max_i p_i(x): (1) s(x) < q̂_predict → single best prediction; (2) q̂_predict ≤ s(x) < q̂_abstain → prediction *set*; (3) s(x) ≥ q̂_abstain → abstain. Extended to a stochastic policy via sigmoids: p_single = σ(−c(s−q̂_predict)), p_abstain = σ(c(s−q̂_abstain)), p_set = 1 − p_single − p_abstain.

**RL tuning:** (α, β) treated as actions sampled from a multivariate Gaussian policy π_θ; REINFORCE updates θ to maximize expected reward R = −C(α,β), where C(α,β) = (1−acc) + λ_1·avgSet + λ_2·abstention − λ_3·coverage − λ_4·div (div = entropy over {single, set, abstain} outcomes). Each episode: sample (α,β), compute thresholds on D_cal, evaluate on test, update policy. Algorithm 1 (Appendix B). Baselines: LAC [Sadinle et al. 2019] and APS [Romano et al. 2020] conformal scores.

## 4. Equations & assumptions
Coverage: P(Y_t ∈ C(X_t)) ≥ 1 − α; q̂ = quantile_{⌈(n+1)(1−α)⌉/n}{s_1..s_n}; C(X_t) = {Y′ : s(X_t,Y′) ≤ q̂}. Two-threshold extension above. Cost: C(α,β) = (1−acc) + λ_1 avgSet + λ_2 abstention − λ_3 coverage − λ_4 div; ∇_θ J(θ) = E[∇_θ log π_θ(α,β)·R(α,β)]. ECE = Σ_b (|B_b|/N)|acc(B_b) − conf(B_b)|.

**Assumptions:** i.i.d. calibration/test (Appendix A gives the standard exchangeability proof; the two-threshold extension's guarantee is only argued by analogy, not proved); λ_1..λ_4 fixed (values not reported in the main text I read); reward design determines the learned policy — mis-tuned λs bias abstention; conformal validity formally holds only for the 1−α predict-threshold, the RL layer can distort it (acknowledged in §IV-B Discussion).

## 5. Features / target
Input: MCQA prompt (image + question + 4–6 lettered options). Features: LLM/VLM softmax over option letters. Target: correct option letter. Tasks: (a) hallucination detection — binary correct/incorrect ranking via confidence (AUROC); (b) uncertainty-guided selective generation — abstain on uncertain (AUARC); plus coverage, set size, ECE, accuracy.

## 6. Validation design
Calibration set → thresholds; test set → metrics. No temporal component. Baselines LAC and APS evaluated on identical models/datasets with the same metric definitions (accuracy fractional for set predictions: 1/|C(X_t)| if correct label in set). 90% coverage target (α=0.1). Appendix C extends to more models/datasets.

## 7. Numerical results / baselines
Quoted exactly from tables (best values bold in paper = CAP):

- **Table I — Hallucination AUROC / Selective-gen AUARC (averages):** LLaVA-v1.6-34B: CAP 0.8000 / 0.9735 vs LAC 0.7388 / 0.9111 vs APS 0.7070 / 0.9287. Yi-34B: CAP 0.8004 / 0.9700 vs LAC 0.7087 / 0.8459 vs APS 0.6819 / 0.8622. Qwen-14B: CAP 0.6964 / 0.9162 vs LAC 0.5965 / 0.8275 vs APS 0.6125 / 0.8541. Paper claims peak AUROC gain 22.19%, AUARC gain 21.17%, accuracy +up to 3.2%.
- **Table II — Coverage (%):** CAP 91.94–93.92 across models (all ≥ 90% target); LAC 89.61–91.49 (dips below 90, e.g., LLaVA-7B 89.61); APS 94.54–98.14 (over-covers via large sets).
- **Table III — Accuracy / avg set size:** LLaVA-34B: CAP 86.64% / 1.8574 vs APS 84.89% / 2.4691 vs LAC 84.14% / 1.3804. Yi-34B: CAP 88.77% / 1.8186 vs APS 87.76% / 2.4701 vs LAC 86.98% / 1.2762.
- **Table IV — ECE:** LLaVA-34B avg: CAP 0.0285 vs LAC 0.1109 vs APS 0.1666. Qwen-7B: CAP 0.0748 vs 0.3047 / 0.3381. Yi-34B: CAP 0.0784 vs 0.1575 / 0.2109. Paper claims 70–85% ECE reduction (vs APS 82.9% avg, vs LAC 74.8% avg).
- My reading: CAP dominates LAC on coverage-validity and APS on informativeness; but the accuracy gains are small (1–3 pts) and the RL machinery is doing work that a validation grid-search over (α, β) could plausibly replicate.

## 8. Code / data availability
Code: https://github.com/sinatayebati/vlm-uncertainty. Datasets: all public (MMBench, OODCV-VQA, ScienceQA, SEEDBench, AI2D, MMLU, CosmosQA, HellaSwag, HaluEval).

## 9. Leakage & limitations
- **RL vs grid search:** no ablation of REINFORCE against a simple validation grid search over (α, β) — the RL layer may add complexity without a demonstrated margin.
- **Guarantee distortion:** the paper itself admits learned policies "may overfit, bias abstention strategies, or distort CP's theoretical guarantees"; the Appendix A proof covers only the single-threshold case.
- **Reward hyperparameters λ_1..λ_4** not reported — the learned policy is not reproducible from the paper alone.
- **MCQA-only:** everything is multiple-choice; no test on free-form generation where abstention semantics differ.
- **No distribution-shift test** despite "adaptive risk management" framing; calibration-set representativeness is assumed.
- **External validity to NFL:** zero sports content; the conformal machinery is domain-agnostic and portable, the LLM/VLM specifics are not.

## 10. GSE overlap
Existing-research map names learning-to-abstain with coverage-risk curves as an explicit gap (item 4) and lists CQR / temperature scaling / grouping loss in the calibration stack. This paper is an **extension**: it adds a *three-way* decision (post / hedge-with-range / abstain) to the two-way abstain machinery of paper 1150. The three-way structure is new capability for GSE's public-pick policy: confident → post pick; medium → post as "lean" with an interval; low → no post. Duplicate of nothing currently in the repo.

## 11. GSE implementation spec
1. **Skip the RL.** Fix nonconformity s(x) = 1 − p_win(x) from GSE's calibrated win probabilities (temperature-scaled per existing stack).
2. **Two thresholds on validation:** q̂_predict at the (1−α) quantile, q̂_abstain at (1−β), grid-search (α, β) over {0.05, 0.1, 0.15}² on the chronological validation block, maximizing selective ROI subject to realized coverage ≥ 90%.
3. **Three-way publish policy:** s < q̂_predict → post pick publicly; q̂_predict ≤ s < q̂_abstain → post as "lean" with conformal interval (from existing CQR work); s ≥ q̂_abstain → no post (abstention). This operationalizes Garrett's "play singles like a responsible adult" stance with a statistical rule.
4. **Monitoring:** track realized coverage weekly; if it drifts below 88%, re-fit thresholds.
5. **Effort:** ~1–2 days (threshold machinery only; CQR intervals already exist in repo).

## 12. Reproducible test
Dataset: GSE `picks` table, chronological 70/15/15. Nonconformity = 1 − calibrated p. Baselines: (a) single-threshold conformal abstention (1150-style), (b) fixed 65% confidence post rule. Metric: selective ROI on posted picks + coverage ≥ 90% + abstention rate; test window = final 15% chronological block. Win iff three-way beats both baselines on selective ROI with coverage held.

## 13. Acceptance / rejection gate
ADAPT iff the three-way policy's selective ROI exceeds the single-threshold conformal baseline by ≥ 2 ROI points on the test block while realized coverage stays ≥ 90% and the abstention rate stays ≤ 25% (a policy that never posts is useless); REJECT the RL-tuning component unconditionally (no evidence it beats grid search; keep only the two-threshold structure).

## 14. Improvement experiment
Make β **market-conditional**: learn (α, β) per market (spread/total/moneyline) rather than globally — moneyline underdogs and totals have different uncertainty geometry, and a single β likely over-abstains on the market where GSE's edge is thinnest. Compare market-conditional thresholds vs global on selective ROI; hypothesis: moneyline-specific β recovers 5–10% more posted picks at equal accuracy.
