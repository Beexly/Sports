# [1156] Cross-Domain Uncertainty Quantification for Selective Prediction: A Comprehensive Bound Ablation with Transfer-Informed Betting (arXiv:2603.08907)

**Citation:** Abhinaba Basu (2026). *Cross-Domain Uncertainty Quantification for Selective Prediction: A Comprehensive Bound Ablation with Transfer-Informed Betting*. arXiv:2603.08907v1 [cs.LG]. URL: https://arxiv.org/abs/2603.08907
**Ledger completed:** 2026-09-21. **Read:** full text (22 pages).
**Verdict:** ADAPT
The bound-tightness complement to 1330's availability framing: a nine-family ablation with a concrete deployment recipe, plus Transfer-Informed Betting (warm-start the betting bound with a data-rich sibling market's risk profile) for certifying *thin* markets where Hoeffding-family bounds are infeasible. Directly implementable in GSE's certification layer.

## 1. Research question
For selective prediction with finite-sample risk control (RCPS), how much does the choice of concentration inequality × multiple-testing correction matter in practice, and can cross-domain transfer rescue the small-calibration-set regime where all classical bounds are infeasible? Application vehicle: agentic caching (serve cached response vs defer to LLM), but the bounds are domain-general.

## 2. Dataset / schema
Four intent-classification benchmarks: MASSIVE (1,102 test, 8 classes; n_cal=549), NyayaBench v2 (280 test, 20 classes; n_cal=134), CLINC-150 (22,500, simulated SetFit-matched confidence scores; n_cal=11,250), Banking77 (13,083, simulated; n_cal=6,468). Classifier: SetFit + all-MiniLM-L6-v2 (22M params), 8 examples/class. Protocol: 50/50 calibration/test split, K=100 thresholds in [0,0.99], α ∈ {0.01,…,0.20} × δ ∈ {0.05,0.10,0.20} = 18 configs; transfer methods use MASSIVE as source for NyayaBench v2 target.

## 3. Method / model
**Nine bound families** for the RCPS threshold τ* = min{τ_k : R̂(τ_k) + C_k(n,δ) ≤ α}: (1) Hoeffding+union, (2) Empirical Bernstein+union, (3) LTT+Hoeffding, (4) LTT+Empirical Bernstein, (5) Clopper-Pearson+LTT, (6) WSR betting+LTT, (7) Wasserstein DRO, (8) CVaR, (9) PAC-Bayes-λ. **Transfer-Informed Betting (TIB):** warm-start the WSR wealth process by blending running mean/variance estimates with the source domain's risk profile, μ̂^TIB_t = w_t·R̂_source + (1−w_t)·μ̂_t, w_t = n_eff/(n_eff+t) (n_eff=50 default). Cross-domain PAC-Bayes transfer: source risk profile as Bernoulli prior. Theorem 1: TIB wealth stays a supermartingale (valid for all source–target divergences), dominates WSR when domains match, degrades gracefully O(n_eff/(n_eff+n)); Proposition 2: source-informed init is optimal among data-independent warm-starts. Machine-checked in Lean 4 (18 lemmas, 0 sorry).

## 4. Equations & assumptions
- Unsafe risk (eq. 1): R(τ) = Pr[f(x)≠y ∧ conf(x)≥τ]; coverage Cov(τ) = Pr[conf(x)≥τ].
- RCPS rule (eq. 3): τ* = min{τ_k : R̂(τ_k) + C_k(n,δ) ≤ α}, thresholds tested decreasing (most conservative first).
- Hoeffding+union (eq. 4): C_H = √(ln(K/δ)/(2n)); LTT (eq. 6): C_LTT = √(ln(1/δ)/(2n)) — ln K eliminated.
- Empirical Bernstein (eq. 5): C_EB = √(2V̂ln(3K/δ)/n) + 3ln(3K/δ)/n.
- Clopper-Pearson (eq. 10): UCB_CP(S,n,δ) = F_Beta(S+1,n−S)^{−1}(1−δ), exact (not conservative).
- WSR wealth (eq. 12): K_t(m) = Π_{i=1}^t (1+λ_i(X_i−m)); GROW λ_t (eq. 13); UCB_WSR = sup{m: K_n(m)<1/δ} (eq. 14).
- DRO (eq. 8): sup_{Q:W1≤ε} E_Q[L] ≤ min(R̂+ε,1); CVaR (eq. 9).
- PAC-Bayes-λ (eq. 16): R(τ) ≤ (1−e^{−λR̂})/(1−e^{−λ}) + √[KL(R̂_tgt∥R̂_src)+ln(2√n/δ)]/(λn).
- TIB blending (eqs. 18–19); convergence (eq. 21): |UCB_TIB−UCB_WSR| = O(n_eff/(n_eff+n)).
- **Assumptions:** i.i.d. calibration data (except DRO); risk monotone decreasing in τ (LTT validity); binary losses for CP exactness; W1(P_src,P_tgt) ≤ ε for transfer statements.

## 5. Features / target
Features: classifier confidence conf(x) (max softmax). Target: unsafe-hit indicator L_i = 1[f(x_i)≠y_i ∧ conf(x_i)≥τ].

## 6. Validation design
Ablation over bound family × (α,δ) on all four benchmarks; progressive-trust simulation (coverage vs n_cal over 20 subsamples); calibration analysis (ECE, temperature scaling); per-intent subgroup RCPS; head-to-head vs split-conformal prediction. Zero-violation check on held-out test sets.

## 7. Numerical results / baselines
- **LTT is the single largest improvement:** MASSIVE α=0.10: LTT+Hoeffding **94.0%** coverage vs Hoeffding+union **73.8%** (27% relative); correction 0.079→0.046; τ*=0.21 vs 0.31.
- **WSR+LTT tightest non-transfer:** MASSIVE 96.0% at α=0.10; NyayaBench v2 **18.5%** vs LTT+Hoeffding 3.4% (**5.4×**); at α=0.20, 41.1% vs 14.4%.
- **TIB (transfer):** NyayaBench α=0.10: 18.5% (5.4× over LTT+Hoeffding 3.4%); α=0.05: 6.9% vs WSR 5.5%. PAC-Bayes transfer only method feasible at α=0.01 (3.4%).
- **Progressive trust:** LTT feasible at n=150 (62.1%±8.6%); Hoeffding+union infeasible until n=400 (58.2%±4.3%) — 250-example gap. NyayaBench: only transfer methods feasible at any n≤134.
- **Rule of thumb:** n≈120 verified examples per domain for LTT; ≈350 for Hoeffding.
- **Calibration:** ECE 0.515→0.040 (MASSIVE, T=10.0); 0.423→0.077 (NyayaBench, T=2.97). RCPS applied to raw scores (valid regardless); calibration widens the usable τ range.
- **Conformal vs selective:** α=0.10 MASSIVE — conformal 90.4% coverage but avg set size **1.67** classes; selective 94.0% coverage, single prediction, 6.3% risk. On 20-class NyayaBench at α=0.20, conformal sets avg 4.77 classes.
- **Validity:** zero guarantee violations across 9 methods × 18 configs × 2 primary benchmarks; marginal <1% violations in 7/162 + 2/162 simulated configs.
- **Subgroup:** only check_calendar (n_cal=167) per-intent feasible (60.7% coverage); rest need ~120+/class.

## 8. Code / data availability
Lean 4 proof script in supplementary (code/TIBProof.lean). Datasets public (MASSIVE, NyayaBench v2, CLINC-150, Banking77).

## 9. Leakage & limitations
- CLINC-150/Banking77 use **simulated** confidence scores — the two large-scale validations are synthetic.
- TIB/PAC-Bayes transfer assumes source and target risk profiles are related; graceful degradation is proven but the small-n NyayaBench result (n=15) had 1 violation in 20 trials.
- Marginal risk averages over the query distribution — per-market subgroup guarantees need ~120+ graded picks per market (their §6.5), same conclusion as 1330's granularity analysis.
- DRO/CVaR strictly more conservative by design; not general improvements.
- Single author, intent-classification vehicle — the sports transfer is ours to validate.

## 10. GSE overlap
Complements 1330 (availability: *can* we certify?) with tightness (which bound certifies *most*?). 1330's framework says GSE needs per-market certificates; this paper says which bound to use: WSR+LTT or LTT+Empirical Bernstein at n≳500, TIB/PAC-Bayes below n≈200. The TIB mechanism is new to the corpus — no existing work warm-starts certification bounds with a sibling domain. The conformal-vs-selective comparison (§6.6) settles a framework choice for GSE: single-pick posting needs RCPS point-prediction risk, not conformal sets.

## 11. GSE implementation spec
1. **Bound-selection recipe in the certification layer (extends 1330):** per (sport×market) unit, choose bound by n_cal: n≳500 → WSR Betting+LTT (eqs. 12–15); 120≲n≲500 → LTT+Empirical Bernstein (eq. 7); n≲120 → TIB warm-started with the closest data-rich sibling market (e.g., NFL spread → NCAAF spread; NBA total → NCAAB total), n_eff=50, weight w_t=n_eff/(n_eff+t).
2. **Progressive-trust market graduation:** new market starts uncertified (defer = don't advertise track record); at n≈150 graded picks compute first LTT certificate; tighten τ* as n grows. This operationalizes 1330's availability planning with the paper's trust levels.
3. **Calibration prerequisite:** temperature-scale engine confidence scores (target ECE<0.08 as in their NyayaBench result) before threshold selection — widens usable τ range even though RCPS is valid on raw scores.
4. **Effort:** ~3 days (WSR+LTT bound library + per-market certificate computation); +2 days for TIB transfer plumbing.

## 12. Reproducible test
Dataset: GSE `picks` table by (sport×market). For each unit with n≥120: compute τ* via LTT+Hoeffding, LTT+EB, WSR+LTT at α=0.10, δ=0.10; compare guaranteed coverage (fraction of historical picks that would have been posted) and forward realized risk. For thin units (n<120): TIB with sibling-market prior vs no certificate. Success = zero forward violations and TIB enabling ≥1 thin market that Hoeffding-family leaves infeasible.

## 13. Acceptance / rejection gate
ADAPT the bound recipe iff WSR+LTT or LTT+EB certifies ≥10% more historical picks than Hoeffding+union at α=0.10 with zero forward violations. ADAPT TIB iff it makes ≥1 thin market certifiable (n<120) that is infeasible under all non-transfer bounds, with the forward risk staying ≤α. REJECT Wasserstein DRO and CVaR for the standard certification path (strictly more conservative; reserve DRO only for known-regime-change windows).

## 14. Improvement experiment
Replace the single-source TIB prior with a **multi-source blend**: μ̂_0 = Σ_k w_k·R̂_source_k over sibling markets weighted by inverse W1 distance between risk profiles — the paper's future work explicitly suggests multi-source transfer. Test whether multi-source TIB tightens the bound vs best-single-source on GSE's thinnest markets. Second: extend TIB to the **online** setting (their stated future work) — update the wealth process as each week's picks grade, giving anytime-valid certificates without fixed calibration windows; compare anytime vs fixed-window certified coverage.
