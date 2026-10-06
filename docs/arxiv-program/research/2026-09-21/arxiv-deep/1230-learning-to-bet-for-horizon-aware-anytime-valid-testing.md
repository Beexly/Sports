# Deep-Research Ledger 1230 — arXiv:2603.19551v2 (stat.ME, 2 Jun 2026)

**Title:** Learning to Bet for Horizon-Aware Anytime-Valid Testing
**Authors:** Ege Onur Taga, Samet Oymak, Shubhanshu Shekhar
**Version read:** v2 (2 Jun 2026). Full read verified on 2026-09-21: abstract, Sections 1–5 (betting-based testing, finite-horizon Bellman DP, three-regime theory, DQN policy, experiments, conclusion) and all appendices A–F in full (quantized-KL Lemma A.3, Theorem 3.1 proof B.1, Propositions 3.4/3.6 Sanov proofs B.2–B.3, ε-schedule hedging C, implementations D, DQN training E, additional results F). Text source: `2603.19551.pdf` → `pdftotext -layout` (16,431 words).

## 1. Question asked

For testing H₀: E[X] = m on bounded [0,1] observations with a **hard deadline N**, how should the betting fractions λ_t(m) of an anytime-valid test martingale be chosen to maximize the probability of rejecting a false null *by the deadline* — and can a learned policy beat Kelly and existing betting-based tests?

## 2. Dataset / schema

- **Synthetic:** Beta and 50/50 Beta-mixture worlds, Xi ∈ [0,1]; experiments at N = 100, α = 0.05, 5,000 trials per curve. DQN training: 550,000 synthetic episodes (Table 1), N log-uniform in [100,350], m uniform in [0.01,0.99], difficulty-calibrated |μ−m| ≈ √(2σ²_proxy·c·log(1/α)/N), c ∼ Unif[0.70,1.30], conc ∈ [0.1,11.0].
- **Real data (App. F.3, 6 settings, 5,000 trials each):** DNA methylation beta values (NCBI GEO GSE33896: GSM838506 adipose stem cells, GSM838510 induced osteocytes, GSM838517 rhabdomyosarcoma line); daily relative humidity (NOAA USCRN: Yuma AZ desert, Millbrook NY temperate, Boulder CO mountain), scaled to [0,1].

## 3. Method

1. **Betting e-process:** W_n(m) = W_{n−1}(m)(1 + λ_n(m)(X_n − m)), W₀ = 1; reject H₀,m at τ_m = inf{t ≤ N : W_t(m) ≥ 1/α}. Under H₀ each W_t(m) is a nonnegative test martingale → anytime validity via Ville's inequality.
2. **Finite-horizon Bellman DP:** state (t, log W_t); optimal policy is threshold-based in the "schedule" (how far wealth is from log(1/α) with T = N−t steps left).
3. **Three regimes (theory, §3):** ahead of schedule → bet ≈ half-Kelly (conservative); on schedule → Kelly λ^Kelly_m; behind schedule → aggressive/all-in λ_end. Theorem 3.1 (Hoeffding + Ville bounds) formalizes when deviating from Kelly is suboptimal; Props. 3.4/3.6 (Sanov large-deviation bounds) give sufficient conditions for aggressive (resp. defensive) bets to beat Kelly by an exponential factor.
4. **DQN policy (§4.3, App. E):** 3 discrete actions {λ̂_t(m)/2, λ̂_t(m), λ_end,t(m)} with empirical-Kelly estimate λ̂_t(m) = clip(S_{t−1}/V_{t−1}, Λ_m), endpoint bet directional by sign(μ̂_{t−1}−m), Λ_m = [−(1−ε)/(1−m), (1−ε)/m], ε = 10⁻³; 22-dim predictable feature vector φ_t (mean gap, distance-to-threshold, remaining-time fraction, variance/SNR proxies, Kelly/endpoint bets, Taylor growth-advantage proxies, skewness/kurtosis, Beta concentration proxy); sparse terminal reward 1{τ ≤ N}; MLP 22→256→128→3 ReLU, Double DQN, Huber loss, AdamW lr 3×10⁻⁴, replay 3.2×10⁶, batch 512, 550k episodes, ~3h on one L40s GPU.
5. **Baselines:** empirical Kelly, linear-ε mixed-strike, STaR-Bets (two-sided version via sign(μ̂_{t−1}−m)), STaR-Hoeffding, hedge over K = 6 ε-schedules (App. C: η ∈ {0.25,0.50,0.75}, q ∈ {1,2}, hedged wealth within log 6 of best schedule).

## 4. Equations / assumptions

- Wealth update: W_{t+1} = W_t(1 + λ_{t+1}(m)(X_{t+1} − m)); Y_t = log W_t.
- Safe range Λ_m = [−(1−ε)/(1−m), (1−ε)/m] guarantees 1 + λ_t(X_t − m) ≥ ε > 0.
- Stopping: τ_m = inf{t ∈ {1,…,N} : log W_t(m) ≥ log(1/α)}; Ville: P_{H₀}(sup_{t≤N} W_t(m) ≥ 1/α) ≤ α.
- Hedged mixture: W_t(m) = (1/K)Σ_k W_t^{(k)}(m), log W_t(m) ≥ max_k log W_t^{(k)}(m) − log K.
- **Assumptions:** Xi ∈ [0,1] i.i.d. (temporal dependence explicitly out of scope); finite alphabet for the Sanov arguments; training distribution is synthetic Beta-family.

## 5. Features / target

Features = the 22 predictable statistics φ_t (no dependence on X_t). Target = the discrete action maximizing P(τ ≤ N) — equivalently the finite-horizon value function over (t, log W_t).

## 6. Validation

- **Example 3.5 (theory):** Bernoulli p = 0.6, m = 0.5, α = 0.05, T = 20: aggressive λ = 1.5 gives P(reject) ≈ 0.13 vs Kelly ≈ 8.6×10⁻⁴ — two orders of magnitude from betting harder when behind.
- **Figure 4 (deadline CI widths, smaller = better):** μ = .25: DQN .066 vs hedge .079; μ = .40: DQN .134 vs STaR-Bets .141; μ = .65: DQN .075 vs hedge .085.
- **Real data (6 settings):** DQN best in 5/6, close in the sixth; Type-I error stays below α = 0.05 everywhere (Fig. 18), with DQN using the error budget more fully.
- **Ablations:** reward shaping (DQN-EB, DQN-U, Fig. 6); logit-normal and Bernoulli OOD generalization (Figs. 7–8); 9-action space gives no overall improvement over 3 actions (Fig. 15); longer deadlines N ∈ {250,300,350} (Fig. 16); α = 0.01 (Fig. 17); qualitative: DQN is conservative early, aggressive late (Figs. 20–22).

## 7. Exact results

- DQN trained **once** (550k episodes, ~3h L40s) generalizes across horizons, nulls, and distribution families without retraining.
- Figure 4 widths as above; Example 3.5 numbers as above.
- 9-action vs 3-action: "similar performance but does not lead to an overall improvement" — 9-action better early, slightly worse at deadline.
- F.9: "DQN policy is usually more conservative early on, with more aggressive actions in later stages."

## 8. Code / data availability

**Code:** https://github.com/egetaga/learning-to-bet (stated p. 3). Real-data sources named (NCBI GEO GSE33896; NOAA USCRN stations). Training is fully specified (Table 1) and reproducible.

## 9. Leakage / limitations

- i.i.d. [0,1] observations assumed; sports outcomes are neither i.i.d. nor bounded in the same way (resampling used for the humidity data "isolates transfer to the real marginal distribution rather than robustness to temporal dependence, which is outside the current scope").
- Sparse-reward RL; the 9-action ablation suggests optimization difficulty already binds at this scale.
- Two-sided STaR baseline is the authors' own adaptation (sign of mean estimate), not the original one-sided procedure.
- The three-regime theory (Props. 3.4/3.6) needs finite alphabets and Sanov machinery — sufficient conditions, not a complete characterization.
- Type-I error plots show DQN "uses the allowable Type-I error budget more effectively" — i.e., it runs hotter under the null than competitors, which is fine at α = 0.05 but worth noting.

## 10. GSE overlap

Directly relevant to validating GSE's own edges and to the sequential-testing theme in this wave:

- **Paper 9 (1227/2505.22422, STaR-Bets)** is a baseline *in this paper* — the two ledgers should be read together: STaR-Bets gives fixed-horizon-valid betting CIs; this paper gives the deadline-optimal betting *policy*.
- Pick-selection/abstention lane: the three-regime policy is a principled "when to press" rule — conservative early season, aggressive when behind on proving edge.
- Calibration lane (`apps/web/__tests__/calibration-map-kelly.test.ts`): the e-process framework offers an anytime-valid alternative to fixed-sample calibration tests.

## 11. Implementation spec (GSE)

**Anytime-valid edge detector for GSE model variants.** For each model version (e.g., v5.2.7 vs challenger):
1. Define per-pick score X_i ∈ [0,1] (e.g., scaled realized CLV or profit indicator), null m = breakeven.
2. Run the betting e-process with deadline N = season length (e.g., 272 NFL games or remaining slate count), α = 0.05, using the paper's 3-action DQN policy (retrain on sports-like outcome distributions, or start from their released code).
3. Decision rule: reject "no edge" the first time W_t ≥ 20; if never crossed by N, the variant hasn't proven edge — don't promote it.
4. Operationalize the three regimes for bankroll: half-Kelly stake on a new variant early season; full Kelly once on schedule; allow aggressive (up to 1.5× Kelly) only when behind schedule *and* the e-process is close to the threshold — never as a default.

## 12. Reproducible test

Clone https://github.com/egetaga/learning-to-bet; rerun the Bernoulli setting (μ_X = 0.6, m = 0.5, α = 0.05, N = 100, 5,000 trials); verify DQN's rejection curve dominates empirical Kelly and STaR-Bets at the deadline.

## 13. Numeric gate

At N = 100, α = 0.05 on the paper's Beta-mixture setting (m = 0.45, μ_X = 0.40): DQN's deadline rejection probability must exceed empirical Kelly's by ≥ 5 percentage points and match-or-beat the hedge baseline — the qualitative gap shown in Figure 3/4.

## 14. Improvement experiment

Retrain the DQN with GSE pick outcomes (Neon `picks`, realized returns scaled to [0,1]) as the training world instead of Beta families; compare deadline rejection power and Type-I error against the released Beta-trained policy on a held-out season. Hypothesis: a sports-fitted policy presses harder in the regimes that actually occur (heavy underdog slates), improving power without breaking the α guarantee (validity is policy-independent via Ville).

**Verdict:** ADAPT
