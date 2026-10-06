# [1558] AdaWeather: Adaptively Mixing Probabilistic Weather Forecasts with Logarithmic Regret (arXiv:2606.02663)

**Citation:** Dhanuka, S. et al. (2026). *AdaWeather: Adaptively Mixing Probabilistic Weather Forecasts with Logarithmic Regret*. arXiv:2606.02663v1 [cs.LG]. URL: https://arxiv.org/abs/2606.02663
**Ledger completed:** 2026-09-21. **Read:** full text end-to-end (PDF, 36 pages: main text + all appendices A–O, including Broader Impact, Data (Table 2: FCN3/FGN/GenCast/IFS-ENS/GEM + ERA5), Experiments protocol (train 2019–2022 / val 2023 / test 2024–2025, India 129×121 grid, 5 experts + U-Net pseudo-expert, fair CRPS kernel estimator Eq. 11 with M(M−1) normalization, per-init best-expert oracle AND best-in-hindsight static-convex-combination (SLSQP) regret diagnostics), Empirical CRPS estimator (D), U-Net architecture/training (E: FiLM conditioning, DoubleConv 32/64/128/256, per-pixel softmax weights with availability mask, AdamW 3e-4, 30 epochs, ~5h on 1×H100, S=50 fair-CRPS loss), per-pixel/per-city/tail evaluations (F–I: Table 3 city CRPS — VT-MOS+U-Net best in all 10 cities; Table 4 tail events — hybrid best overall 0.526 and in cold 0.717 / normal 0.503 / hot 0.516 buckets), VT-MOS Monte-Carlo sensitivity (J: M=1000 → per-step RMSE 0.0133 vs 32000-sample reference; bound assumes M→∞), station-level + other-regions maps (K–L), PWEA background + Vovk AA (M), full proofs of mixability (N) and the regret bound (O: Reg ≤ (b−a)(N−1)/2·ln T + C; factor-2 gap vs [35]'s 1/4·ln T from the boundary term (A−Bp∗), with minimax-optimal 1/4 recovered for the naive two-expert case).
**Verdict:** ADAPT — the offline→online two-stage design is directly portable: train a supervised combiner on GSE's history (learns structural error patterns), then feed it as one expert into an online no-regret mixture over all sub-models. The best-mixture regret bound is stronger than the usual best-expert guarantees in [1555] and related lanes.

## 1. Research question
No weather model dominates spatio-temporally, so combination is the natural response — but offline combiners are frozen at deployment (no drift guarantees) while online expert-aggregation only competes against the *best single expert* and ignores learned structure. Can a hybrid (offline-learned U-Net combiner fed as an extra expert into a novel online aggregator) beat all baselines *and* carry a logarithmic regret bound against the strictly stronger comparator — the best *static mixture* of experts in hindsight, not just the best single expert?

## 2. Dataset / schema
- **Forecasts:** N=5 heterogeneous ensemble forecast systems for 2m temperature over India at 0.25° (FourCastNet v3/FGN-style models, GenCast, IFS-ENS, plus named "FEM"), 12h–72h leads in 12h steps.
- **Ground truth:** ERA5 reanalysis 2019–2026. Train 2019–2022, validate 2023, test 2024–2025. 2019 cutoff deliberately chosen to avoid "testing on training data" (GenCast trained ≤2018, FGN ≤2022) — a stated anti-leakage design choice.
- **Evaluation:** per-lead CRPS (patch 5×5 around Indian cities + full-India spatial mean); cumulative-regret curves vs. best-in-hindsight (BIH) static convex combination (per-lead SLSQP simplex optimization of fair-CRPS — the oracle no online method can beat in expectation).

## 3. Method / model
- **Offline stage:** spatio-temporal U-Net trained by CRPS ERM (Eq. 2) on forecast→ERA5 pairs 2019–2022; produces a probabilistic mixture forecast on the India grid. Its output becomes expert N+1 ("side-information" in the online stage).
- **Online stage — VT-MOS (Vyugin–Trunov Mixture of Simplex):** adapts the Vyugin–Trunov aggregator from best-expert to best-mixture comparator. Maintains a *measure µ_t over the whole simplex Θ* (not just weights on experts); at round t outputs CDF F̂_t satisfying the MOE-mixability inequality (Eq. 4), then updates dµ_{t+1}/dµ_t(p) = exp(−η·CRPS(F_t^{(p)}, y_t)) (Eq. 5). Closed form (Eq. 6) via Theorem 2's explicit CDF (Eq. 8); Monte-Carlo implementation: sample mixture vectors v_{·j} ∼ Dirichlet via Exp(1) draws (Algorithm 1), variance-reduced by sharing samples across numerator/denominator.
- **Baselines:** Vovk's Aggregating Algorithm (O(ln N) vs best expert only), Equal Weight, MoWE (retrained with CRPS), individual experts.

## 4. Equations & assumptions
- CRPS (Eq. 1); closed form for M-member empirical CDFs; unbiased M(M−1) plug-in estimator (App. D).
- MOE-mixability Def. 1 (Eq. 4) with η=2/(b−a); Theorem 2 explicit F̂ (Eq. 8); regret identity (Eq. 9); Theorem 3: **Reg_T ≤ ((b−a)(N−1)/2)·ln T + C** vs. best static mixture — logarithmic in T, linear in (N−1) and support length.
- Lemma 4: quadratic structure L(p) = A^⊤p − ½p^⊤Bp; Lemma 5: worst-case fluctuation bounds (could tighten under structure, §O).
- **Assumptions:** bounded outcomes y ∈ [a,b] (realistic for temperature, essential for bounds); CRPS (b−a)/2-mixable [59]; analysis assumes exact simplex integration (M→∞); N=5 small.

## 5. Features / target
- **Inputs:** per-expert M-member ensemble CDFs F_{n,t,τ} over the spatial grid; the U-Net side-information forecast.
- **Target:** ERA5 2m-temperature field at lead τ; loss = CRPS averaged over grid points.
- Analogue for GSE: per-sub-model predictive distributions over game outcomes; target = actual margin/total.

## 6. Validation design
- Strictly chronological: train 2019–2022 / val 2023 / test 2024–2025; leakage cutoff chosen per base-model training windows.
- **Oracle benchmark:** per-lead best-in-hindsight static mixture (SLSQP) — regret curves measured as the gap to this oracle (Fig. 2c/d), plus raw CRPS tables (Table 1), ablations (hold-one-model-out, Fig. 3), expert-weight dynamics, spatial improvement maps vs. Equal Weight.

## 7. Numerical results / baselines
- **Table 1, overall CRPS (K, lower better):** VT-MOS+U-Net **0.503** < VT-MOS+MoWE 0.515 = VT-MOS 0.515 < Vovk-AA 0.537 < U-Net offline 0.541 < MoWE 0.557 < Equal Weight 0.699 < best individual expert FCN3 0.583 (worst individual IFS-ENS 1.193).
- Gains vs. equal weight ≈ 28%; vs. best individual expert ≈ 14%; the online stage adds ≈7% over the offline U-Net alone (0.541→0.503); the offline stage adds ≈2.3% over VT-MOS alone (0.515→0.503).
- Regret curves (Fig. 2c/d): grow slowly/logarithmically, consistent with Theorem 3; VT-MOS+U-Net has the least cumulative regret vs. BIH throughout.
- **Ablations:** FCN3 and FGN are the biggest contributors — holding either out degrades the mixture most.
- Authors' stated limitations: small training period, limited model count (compute), intractable simplex integrals (Monte Carlo approximation), simplex-optimization intractability for the BIH oracle on larger problems.
- **Appendix tables (read 2026-09-21):** Table 3 (per-city, 5×5 windows, leads averaged) — VT-MOS+U-Net best in all 10 cities (e.g., Delhi 0.588 vs U-Net 0.644 vs Vovk AA 1.055; Mumbai 0.357 vs U-Net 0.359 vs Vovk AA 0.746). Table 4 (tail events, truth-percentile buckets) — VT-MOS+U-Net best overall 0.526 and in every bucket: cold (y<q0.1) 0.717, normal 0.503, hot (y>q0.9) 0.516 vs VT-MOS 0.537/0.738/0.513/0.534 and U-Net 0.574/0.784/0.550/0.555. Table 5 (MC sensitivity) — per-step RMSE vs 32,000-sample reference: 0.0233 (M=100) → 0.0133 (M=1000) → 0.0108 (M=4000); production M=1000 chosen.
- Hybrid-stability dynamics (App. H, Figs. 7–8): the hybrid collapses onto the U-Net when the U-Net pseudo-expert's trust band is high (inherits its variance); when the band shrinks, the online aggregator over raw experts takes over and damps variance further.
- Evaluation protocol (App. C.2, read 2026-09-21): strict chronological split (2019–2022 train, 2023 validation, 2024–2025 test — post-dates every expert's training cutoff); fair/unbiased kernel CRPS (M(M−1) denominator, Eq. 11) as the single reporting metric for every method; BIH static-convex-combination oracle solved per lead via SLSQP on the quadratic CRPS structure (Lemma 4, Eq. 15); BIH patch deliberately chosen as the 10×8 north-India region where the hybrid beats the U-Net by the largest margin (hardest test for the bound).

## 8. Code / data availability
No public code repository or release link stated. Data: ERA5 (public), weather-model forecasts (as described in App. B). Algorithm 1 is fully specified for reimplementation.

## 9. Leakage & limitations
- **Theoretical guarantee is against a static hindsight mixture** — strong, but the M→∞ analysis ignores Monte-Carlo error in Algorithm 1; no finite-sample bound stated.
- **N=5, single variable (temperature), single region (India)** — evidence is narrow; N−1 scaling in the bound says more experts cost logarithmically, but empirically unverified beyond 5.
- **Train window 2019–2022 is short** for the U-Net; authors flag this.
- **CRPS on bounded support** — the theory needs [a,b]; unbounded outcomes (point totals) need truncation or a different η.
- **No comparison to simple CRPS-weighted online schemes** beyond Vovk-AA (e.g., no exponentially-weighted CRPS mixture) — the VT-MOS vs. VT-MOS gap is what carries the empirical claim.
- The U-Net "side-information" expert could dominate the online mixture early (cold-start for genuinely new models) — analogous to the prior-imputation issue in [1557]; the online stage re-weights, but adaptation speed after regime shifts is untested.
- Weather is continuous-field; NFL is 17 discrete weekly events — the online stage's statistical power per season is far lower, so GSE's offline stage must carry more weight (or pool across seasons with regime handling).

## 10. GSE overlap
Existing-research map: no offline-online two-stage combiner exists in the corpus. [1555] gives best-expert regret bounds; [1557] tunes λ offline by rolling validation but has no online adaptation; [1556] corrects downstream of any combiner. AdaWeather is the missing architecture: a learned combiner that *keeps learning* with guarantees. The BIH-oracle regret evaluation (gap to the best static mixture computable in hindsight) is an evaluation discipline GSE should adopt for *every* weighting scheme — it quantifies exactly how much adaptivity is leaving on the table.

## 11. GSE implementation spec
- **Data sources:** GSE sub-model probabilistic forecasts (predictive distributions over spread/total or win probability), 2020–2025 weekly, actuals from nflverse.
- **Build (v1, cheap):** offline stage = gradient-boosted or small-MLP combiner trained on 2020–2023 sub-model forecasts → outcomes (CRPS/log-loss ERM), learning per-sub-model trust conditional on context (week, home/away, market type); online stage = exponentially-weighted CRPS mixture over sub-models + offline combiner, updated weekly (Vovk-style; VT-MOS's simplex measure is the v2 upgrade). Truncate outcome support to observed [min, max] for the η calibration.
- **Effort:** 1 week v1; VT-MOS Monte-Carlo layer v2 adds 3–5 days.

## 12. Reproducible test
2024 season holdout, per market (spread, total): compare (a) best sub-model, (b) equal weight, (c) offline combiner only, (d) online mixture only (no offline expert), (e) full hybrid. Metrics: CRPS of the predictive distribution, plus cumulative regret vs. the season's BIH static mixture (SLSQP on the simplex) — the paper's exact evaluation discipline. Strictly causal weekly updates.

## 13. Acceptance / rejection gate
ADOPT if the hybrid beats both the offline-only and online-only ablations on CRPS (≥2% each) **and** its cumulative regret vs. the season BIH stays within the logarithmic envelope (no linear-regret regime — i.e., it actually adapts rather than drifting). REJECT if the online stage adds nothing over the frozen offline combiner (then GSE just needs the offline combiner and the online machinery is theater), or if regret vs. BIH grows linearly (adaptation failing).

## 14. Improvement experiment
**Regime-aware η and expert set.** The paper uses fixed η=2/(b−a) and a fixed expert set. In the NFL, predictive relationships break at known regime boundaries (mid-season coordinator changes, QB injuries, weather turns). Run VT-MOS with a *discounted* cumulative-loss update (S_j ← γ·S_j + CRPS, γ<1) so the mixture forgets stale regimes, and allow expert *entry*: when a new sub-model debuts mid-season, initialize its loss account at the cross-sectional median (mirroring [1557]'s prior imputation). Hypothesis: discounted VT-MOS beats the paper's undiscounted version on seasons with mid-season regime breaks (e.g., 2022, 2024), because undiscounted cumulative loss over-anchors to early-season mixtures — the same failure mode the paper's offline stage suffers from, now fixed inside the online stage.
