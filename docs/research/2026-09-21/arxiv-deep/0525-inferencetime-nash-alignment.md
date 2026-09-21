# [0525] Inference-Time Nash Alignment (arXiv:2609.08082v2)

**Citation:** Hosseini, H., Mandal, D., and Zhang, D. (2026). *Inference-Time Nash Alignment*. arXiv:2609.08082v2. URL: https://arxiv.org/abs/2609.08082v2
**Ledger completed:** 2026-09-21. **Read:** full text (1,248 lines; abstract through conclusion, proofs, and appendices read in full).
**Verdict:** REJECT — pure LLM inference-time alignment theory; no sports-relevant claim, data, or transfer path.

## 1. Research question
Can we align LLM outputs at inference time (black-box, no parameter updates) under *general* preferences — where preferences need not reduce to a scalar Bradley-Terry reward — by computing a Nash equilibrium of a two-player zero-sum game between policies?

## 2. Dataset / schema
- Experiments: 3 LLM preference datasets — TLDR (summarization), HelpSteer2 (helpfulness), UltraFeedback (instruction following); 100 evaluation prompts each. Base SFT models: LLaMA3-SFT (8B), Mistral-Instruct (7B), Gemma-SFT (2B). Preference oracles: LLaMA3-PM (8B), PairRM (0.4B). Comparison model: LLaMA3-DPO (8B). LLM judge: DeepSeek-V4-Flash (double-query, order swapped; win/loss only if both orderings agree, else draw). Metric: EWR = win + draw/2. No sports data.

## 3. Method / model
- BoN (Best-of-Nash): draw N responses from π_ref, query imperfect preference oracle P̂ on all pairs, build empirical preference matrix, solve max-π min LP to output the Nash equilibrium distribution over the N samples (LP via interior-point, O(N^3.5 log(1/ε))).
- NMD (Nash Mirror Descent): self-play mirror descent — two coupled policies π_t, π_t′ on the N samples; each step maximizes estimated win-rate vs. current opponent with KL regularization β; average the iterates. Closed-form updates: π′_{t+1}(y_i) ∝ π′_t(y_i)·exp(r̂_t(y_i)/β).

## 4. Equations & assumptions
- Zero-sum game: P∗(π ≻ π′|x) = E_{y∼π,y′∼π′}[P∗(y ≻ y′|x)]; Nash equilibrium π1∗,π2∗ = argmax argmin P∗(π1 ≻ π2|x).
- Duality gap: DualGap(π) = max_{π1} P∗(π1 ≻ π|x) − min_{π2} P∗(π ≻ π2|x).
- Oracle error: ε²(x) = E_{y,y′∼π_ref(·|x)}[(P̂(y ≻ y′|x) − P∗(y ≻ y′|x))²].
- Coverage: C^π(x) = E_{y∼π(·|x)}[π(y|x)/π_ref(y|x)]; universal coverage C_uni(x) = max_π C^π(x); relation χ²(π(·|x),π_ref(·|x)) = C^π(x) − 1.
- Theorem 1 (BoN): DualGap(π̂) ≤ 3ε(x)C_uni(x) when N ≥ 4 log(2/ε²(x))·C_uni(x).
- Theorem 2 (NMD): DualGap(π̂) ≤ 5ε(x)C_uni(x) with β=2, T = ⌈log N + 1/2 / (2ε(x)C_uni(x))⌉ under same N condition.
- Theorem 3 (lower bound): any algorithm incurs DualGap ≥ ε0·C_uni(x)/(2√2) on a constructed K-response instance — matching the upper bounds up to constants.
- Stated assumptions: skew-symmetric preference oracle; imperfect oracle P̂ as proxy; rejection-sampling bridge (Block & Polyanskiy; Huang et al. 2025) for support mismatch; exact LP solution in Theorem 1 (Remark 1 extends to ε_LP-approximation).

## 5. Features / target
- No features: target is the per-prompt duality gap vs. the Nash equilibrium policy. Headline metric: expected win-rate (EWR = win + draw/2) judged by an LLM against dataset reference answers.

## 6. Validation design
- Theory: tight upper/lower bounds on duality gap. Empirics: BoN/NMD vs. SFT base and DPO fine-tuned model on 3 datasets; ablations over N, β, base model, and preference oracle (Table 1, Figures 1–3). Judge: DeepSeek-V4-Flash with position-bias control.

## 7. Numerical results / baselines
- EWR (N=64, LLaMA3-SFT base, LLaMA3-PM oracle, β=1): TLDR 62.9% (base) → 73.5% (BoN), 73.1% (NMD); HelpSteer2 44.1% → 68.8%, 67.8%; UltraFeedback 23.9% → 48.8%, 46.7%. BoN matches LLaMA3-DPO's EWR (74.5%) on TLDR without parameter updates.
- BoN EWR scales with N: 62.9% (N=1) → 73.5% (N=64); NMD's EWR is flat across β ∈ [0.125, 4] (no hyperparameter tuning needed).
- Preference-oracle size (8B vs. 0.4B) yields similar EWRs; base model matters (Mistral-Instruct > LLaMA3-SFT > Gemma-SFT).
- Post-query runtime: BoN grows rapidly with N; NMD stays nearly flat.

## 8. Code / data availability
None stated; uses public models and datasets.

## 9. Leakage & limitations
- Theoretical guarantees hinge on oracle quality ε(x) — inherits preference-model bias on out-of-distribution prompts.
- Inference-time alignment can only reweight responses reachable under π_ref; if π_ref assigns negligible mass to good responses, fine-tuning is necessary.
- Per-prompt analysis ignores shared structure across prompts.
- LLM-as-judge evaluation is a scalable proxy for human preference, not a direct measurement.
- External validity to NFL: zero. The setting (black-box LLM alignment via preference oracles) has no sports analogue; "Best-of-N" candidate-selection is a generation-time trick, not a prediction or calibration method, and the Nash-equilibrium distribution over sampled responses has no mapping to team ratings or pick generation.

## 10. GSE overlap
- None. Existing research map: no inference-time LLM alignment work; RL/bandit entries concern optimizer/search methods, not preference-oracle game theory. The paper is outside both the sports lane and the GSE ML lane. Rated REJECT, not ADAPT — there is no candidate-selection-over-sampled-responses step in the GSE engine to Nash-equilibrate.

## 11. GSE implementation spec
- Not recommended (REJECT). No build.

## 12. Reproducible test
- Not applicable. The testable predictions are LLM-domain claims (duality-gap bounds, EWR vs. DPO on TLDR/HelpSteer2/UltraFeedback) that do not transfer to NFL data.

## 13. Acceptance / rejection gate
- REJECT stands. Would only reconsider if a future version targeted pairwise model-comparison (e.g., head-to-head model betting markets), which this version does not.

## 14. Improvement experiment
- None sports-applicable. The paper's own limitations point toward cross-prompt structure sharing and better preference-oracle calibration — LLM-alignment questions.
