# [1612] The Signal Credibility Index for Prediction Markets: A Microstructure-Grounded Diagnostic with Weighted and Time-Varying Extensions (arXiv:2604.27041)

**Citation:** Maksym Nechepurenko (2026). *The Signal Credibility Index for Prediction Markets: A Microstructure-Grounded Diagnostic with Weighted and Time-Varying Extensions*. arXiv:2604.27041. URL: https://arxiv.org/abs/2604.27041
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 6,550 words).
**Verdict:** ADAPT — the SCI gives GSE a ready-made, interpretable classifier for line moves (persistence × consensus × breadth) with exact equations, Monte Carlo calibration, and an implementation algorithm; adapt it by re-weighting toward information content rather than coordination credibility and recalibrating τ on NFL book data, since the paper's validation is simulation-only and its headline failure mode (whale Type II error) is precisely the sharp-money case GSE cares about most.

## 1. Research question
Prediction-market price jumps are read as informationally equivalent regardless of mechanism, yet the same-sized jump can reflect (i) durable Bayesian updating, (ii) transient liquidity pressure, (iii) genuine disagreement, or (iv) concentrated repositioning — with radically different implications for whether downstream actors should treat the price as a coordination anchor. The paper formalizes the Signal Credibility Index (SCI) as a microstructure-grounded diagnostic separating these regimes, revising the persistence component (VR → PR), adding logit pricing and flow-based concentration, and validating via Monte Carlo including adversarial manipulation regimes.

## 2. Dataset / schema
No empirical dataset: validation is Monte Carlo. Each simulated path = 4 hours of 5-minute bins (48 bins), starting p_0^+ = 0.72 (0.62 baseline + 0.10 shock, calibrated to the three June–July 2024 election shocks in Tsang & Yang 2026a). Volumes: gamma RVs with regime-specific shape/scale; trader pools uniform over regime intervals; signed flows from Dirichlet weights with regime-specific concentration α. Prices reconstructed from logit returns via inverse logit, clipped to (0.01, 0.99). Seed 20260429. Eight DGPs total: informed, liquidity, disagreement (N=2,000 each in Exp 1); whale_informed, noisy_broad, manip_then_info, persistent_two_sided, coord_manip_broad (N=2,000 each in Exp 2); Exp 3 uses N=1,500 per DGP. The "2024 election shocks" application (Table 5) is simulation-derived, explicitly not on-chain data — the trader-level signed-flow series was unavailable at submission.

## 3. Method / model
SCI_s = PR_s × (1 − TS_s) × (1 − HHI_s^flow) on logit prices, with weighted Cobb-Douglas SCI_s^(α) = PR^α1 (1−TS)^α2 (1−HHI^flow)^α3 (Σα_i = 3) and time-varying SCI(t;w) on rolling windows (w = 60 min recommended default; 90–240 min for ex-post). Implementation algorithm: 5-min binned price series, aggressive volume by side (Lee–Ready 1991 tick rule where order books unobservable), trader-level signed flow from on-chain ledger; no-trade window → SCI = 0; multi-wallet clustering protocol before HHI (common funder, temporal co-movement >50% shared bins over 30-day pre-shock window, custodial filter, Louvain/Leiden community detection); report HHI with and without clustering. Operational classifier Ŷ_s(τ) = 1{SCI_s > τ} with Youden-optimal τ* = 0.27 on the simulation universe.

## 4. Equations & assumptions
- ℓ_t = log[p_t/(1−p_t)]; r_t = ℓ_{t+1} − ℓ_t (Eq. 1).
- PR(t,w) = |ℓ_t − ℓ_{t−w}| / Σ_{τ=t−w+1}^{t} |ℓ_τ − ℓ_{τ−1}| ∈ [0,1] (Eq. 3); =1 iff monotone, →0 on perfect reversal.
- TS_s = 1 − |B_s − S_s|/(B_s + S_s) (Eq. 4); 0 = one-sided consensus, 1 = balanced disagreement.
- HHI_s^flow = Σ_j (|Δv_{j,s}| / Σ_j' |Δv_{j',s}|)^2 on trader net position changes over the post-shock window (Eq. 5).
- SCI_s = PR_s (1−TS_s) (1−HHI_s^flow) ∈ [0,1] (Eq. 6).
- Weighted: SCI_s^(α) = PR^α1 (1−TS)^α2 (1−HHI^flow)^α3; ∂log SCI/∂log x_i = α_i; domain anchors: balanced (1,1,1); persistence-weighted (1.5,1,0.5) for HFT finance; breadth-weighted (0.5,1,1.5) for political markets (Eq. 7).
- Time-varying: SCI(t;w) = PR(t,w) (1−TS(t,w)) (1−HHI^flow(t,w)) (Eq. 8); alarm rule 1[SCI(t;w) > τ] tracking onset, duration, decay; sustained alarms >60 min = genuinely persistent signals.
- Assumptions: logit returns = log-likelihood-ratio updates for binary contracts; aggressive-volume signing classifies intent; trader flows reconstructable from ledgers; coordination credibility (durable, broad, consensual) is the target — explicitly NOT pure information content.

## 5. Features / target
Inputs: 5-min price series, signed aggressive volume by side, trader-level signed flow. Target: regime classification — informed updating (label 1), liquidity pressure / disagreement / adversarial regimes (label 0). Weighted-form targets: domain anchors prescribe the α prior; empirical optimization on labeled data when available. No real-world labeled coordination-response dataset exists (authors' stated top priority for follow-up).

## 6. Validation design
Four Monte Carlo experiments: (1) three-DGP baseline classification, AUC + bootstrap 95% CI; (2) five adversarial OOD DGPs not used for threshold calibration (whale_informed, noisy_broad, manip_then_info, persistent_two_sided, coord_manip_broad — 80–130 wallets, same direction, designed to defeat HHI); (3) head-to-head vs. five baselines (5-fold CV logistic regression on (PR, 1−TS, 1−HHI^flow), additive form, single components); (4) parameter sweep over AR(1) reversal and Dirichlet concentration + window-length sensitivity. The paper is explicit this is internal validity among *designed* regimes, not external validation of coordination credibility or downstream behavior.

## 7. Numerical results / baselines
- **Exp 1 (3-DGP):** AUC = 0.984, 95% CI [0.981, 0.986]; τ* = 0.27, TPR = 0.92, FPR = 0.05. Component means — informed: PR 0.50, TS 0.11, HHI 0.04, SCI 0.451 (sd 0.125); liquidity: 0.22, 0.17, 0.10, 0.163 (0.076); disagreement: 0.14, 0.97, 0.02, 0.005 (0.006).
- **Exp 2 (OOD stress):** whale_informed (label 1): mean SCI 0.231, P(SCI>τ*) = 0.376 → **Type II error**; coord_manip_broad (label 0): mean SCI 0.399, P(SCI>τ*) = 0.827 → **Type I error**; manip_then_info: 0.368/0.830 correct; noisy_broad: 0.008/0.000 correct; persistent_two_sided: 0.015/0.000 correct. Combined OOD AUC = 0.763 [0.753, 0.773].
- **Exp 3 (classifiers, 8-DGP):** logistic regression AUC 0.908 [0.904, 0.913] > SCI 0.847 [0.840, 0.853] > additive 0.812 > PR-only 0.809 > 1−TS-only 0.742 > 1−HHI-only 0.516. Fitted LR coefficients: β_PR = +6.29, β_{1−TS} = +3.99, β_{1−HHI} = −4.84 — concentration is *positively* associated with informed updating on the combined set, opposite the SCI's weighting; authors' reading: this clarifies that SCI targets coordination credibility, LR targets information content.
- **Exp 4 (window):** AUC = 0.91 (w=60), 0.95 (120), 0.98 (180), 0.99 (240); τ* stable 0.25–0.27. SCI keeps AUC ≥ 0.95 across most of parameter space; degrades to ≈0.80 when the liquidity DGP's AR(1) reversal → 0 (indistinguishable from informed drift).
- **Illustrative election shocks (simulated, not empirical):** debate SCI 0.165 (PR 0.22, TS 0.17, HHI 0.10) → liquidity pressure; assassination attempt 0.448 (0.51, 0.11, 0.01) → informed updating; Biden dropout 0.005 (0.15, 0.97, 0.02) → disagreement.

## 8. Code / data availability
Replication code: https://github.com/ForesightFlow/signal-credibility-index. No empirical dataset (simulation DGPs in Appendix A; seed 20260429). For Polymarket: price, aggressive volume, trader flows reconstructable from Polygon chain data (Tsang & Yang 2026b documents contracts/decoding).

## 9. Leakage & limitations
- Simulation-only validation; the "illustrative application" is simulation-derived, not on-chain — the paper says so explicitly, and GSE must not cite the election-shock SCI values as empirical facts.
- The coordination-vs-information tension is the core limitation: the Type II error (whale informed) is a feature *only* under the coordination-credibility target; for GSE's information-content target (is this steam real?), the SCI as specified penalizes exactly the sharp-concentrated moves GSE wants to follow. The paper itself suggests a positive-HHI weighting for information-content domains.
- Type I error (coord_manip_broad) is unambiguous: wallet-splitting defeats flow-HHI without forensic clustering, and a sophisticated operator can defeat each clustering step. GSE's cross-book breadth measure is partially protected (a manipulator must move many books), but within one book the same gaming applies.
- TS cannot separate aggressive disagreement from passive market-making without order-book data (authors' caveat); on sportsbook data GSE has no trader-level flow at all — HHI must be rebuilt as cross-book breadth.
- PR is path-shape-invariant (single jump + flat tail ≡ gradual repricing); sequential shocks unhandled; τ* = 0.27 is simulation-calibrated, explicitly not universal.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` (lines 47, 143), GSE tracks line movement/steam and beat-the-close but has no formal steam-move *classification* diagnostic; market-microstructure in sports betting is an explicit open gap ("order flow, steam-move predictability, limit-order-book analogues… thin"). This is an **extension**: the first decomposable move-classifier in the corpus. It dovetails with ledgers 1608 (arb/inefficiency episodes), 1609 (dislocation detector), and 1611 (updating gaps → drift) as the "was this move real?" scoring layer.

## 11. GSE implementation spec
1. **Port SCI to line moves:** shock = a ≥1.5-point spread move or ≥4-cent moneyline move on a game. Compute over the post-move window (60-min rolling default; 90–240 for ex-post labeling): PR on logit-transformed implied probabilities; TS from cross-book direction (books moving the same way = one-sided); HHI_flow replaced by cross-book breadth HHI — share of total line movement attributable to each book (a move led by Pinnacle/Circa alone = concentrated; 8+ books moving = broad).
2. **Re-weight for information content:** start from the domain anchor the paper suggests for finance and flip the HHI sign intuition — GSE cares whether the move is informed, not whether it's a public coordination signal. Fit LR-style weights on labeled NFL steam data: (PR, 1−TS, HHI) with free signs, as in Exp 3; expect β_HHI ≥ 0 (concentrated = sharp).
3. **Two SCI flavors:** SCI_info (information content, GSE's trading signal) and SCI_coord (coordination credibility, for GSE's content lane: which moves are safe to cite publicly as "the market moved" without amplifying a whale artifact).
4. **Alarm rule in production:** track SCI(t;60min) per game; sustained alarms >60 min above recalibrated τ trigger the steam-follow workflow; alarm duration/decay time logged as features for the 1608/1609 ensemble.
5. **Effort:** ~3–4 days: adapt the paper's replication code to odds data, build the cross-book breadth measure, label one NFL season of steam moves (cover outcome as proxy label), fit weights.

## 12. Reproducible test
Dataset: 2024–2025 NFL, multi-book line history (The Odds API captures), all ≥1.5-point spread moves. Metric: classify each move with SCI_info and test whether high-SCI_info moves predict the move side covering ATS (information content) vs. high-SCI_coord moves predict media citation (coordination). Baseline to beat: the paper's Exp-1 ordering (PR carries most signal; AUC ≈ 0.85 on the combined set) — GSE's fitted NFL weights should achieve AUC ≥ 0.70 on move-side cover prediction, and the two flavors should diverge as the paper predicts (SCI_info up on concentrated sharp moves where SCI_coord is down).

## 13. Acceptance / rejection gate
**Adapt** the SCI framework (both flavors) into GSE's steam pipeline if: (i) fitted NFL weights on ≥300 labeled moves achieve AUC ≥ 0.70 for move-side cover prediction; and (ii) the information-content and coordination-credibility flavors rank moves differently (Spearman < 0.6), confirming the paper's two-target distinction is operational in NFL data. **Reject** the concentration-penalizing baseline form if β_HHI fits ≥ 0 (as the paper's LR did) — in that case deploy only the re-weighted information-content variant and drop the coordination form except for content-lane use.

## 14. Improvement experiment
The paper's PR is blind to path shape (one jump + flat tail ≡ gradual repricing). GSE's improvement: add a fourth component, *temporal dispersion* — the fraction of total movement occurring in the first k bins (or the max single-bin share). Hypothesis: sharp steam arrives as one coordinated jump (high early-share) while public-news drift reprices gradually (low early-share), and this separates 1609-style informed dislocations from 1611-style gradual drift mechanically. Test whether adding early-share as a fourth multiplicative (or LR) component beats the 3-component SCI on NFL steam AUC; if the gain exceeds +0.03 AUC, it becomes a permanent fourth component of GSE's move classifier.
