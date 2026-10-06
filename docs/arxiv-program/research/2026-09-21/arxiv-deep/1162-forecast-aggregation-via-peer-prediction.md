# 1162 Forecast Aggregation via Peer Prediction (arXiv:1910.03779)

**Citation:** Juntao Wang, Yang Liu, Yiling Chen (2022). *Forecast Aggregation via Peer Prediction*. arXiv:1910.03779v8. URL: https://arxiv.org/abs/1910.03779
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v8, 22 pp incl. appendices, via arxiv.org/pdf).
**Verdict:** ADAPT

Adapt the peer-prediction-style expert ranking on GSE's model pool to weight/trim ensemble members without needing resolved outcomes; do NOT use the paper's exact peer-prediction mechanisms or its top-k truncation blindly.

## 1. Research question
How to aggregate probabilistic forecasts across many tasks when forecaster quality varies and NO historical ground truth is available to evaluate forecasters (the cold-start setting)? The paper asks whether peer prediction mechanisms — originally designed to incentivize truthful reporting without ground truth — can serve as peer assessment scores (PAS) that rank forecasters by true skill, and whether ranking-and-selecting top forecasters by PAS improves aggregation.

## 2. Dataset / schema
14 real-world human forecast datasets, all used with binary events:
- G1–G4: Good Judgment Project (GJP) geopolitical/economic questions, 2011–2014. G1: 94 questions / 1409 agents; G2: 111 / 948; G3: 122 / 1033; G4: 94 / 3086.
- H1–H3: IARPA Hybrid Forecasting Competition (2018), geopolitics→environment. H1: 72 / 484; H2: 80 / 551; H3: 86 / 87.
- M1a–M4b: 7 MIT static datasets (Prelec et al. 2017) — trivia (state capitals, art prices, skin-lesion diagnosis). 20–51 agents, 50–90 questions; deliberately built so majority is often wrong (low performer accuracy).
Filtered to participants with ≥15 predictions and questions with ≥10 answers. Also 6 multi-outcome event datasets (G2–G4, H1–H3, 8–86 questions). GJP data public: https://doi.org/10.7910/DVN/BPCDH5. HFC/MIT access not stated as public links in paper (MIT available via Prelec et al. 2017). Schema: per-question probabilistic predictions p_{i,j} ∈ [0,1] per forecaster, ground truth Y_i ∈ {0,1} revealed after aggregation for scoring.

## 3. Method / model
Three-step framework (Algorithm 1):
1. Compute a peer assessment score (PAS) s_j for each agent from all predictions (no ground truth).
2. Rank agents by PAS; for each event, select predictions of the top max(10%·|N|, 10) agents who answered that event (rank & selection; softmax-weighting tested, similar results).
3. Apply a base aggregator — Mean or Logit (extremized mean) — on the selected subset.
Five PAS mechanisms tested: DMI (determinant mutual information, Kong 2020), CA (correlated agreement, Shnayder et al. 2016), PTS (peer truth serum, Radanovic et al. 2016), SSR (surrogate scoring rules, Liu et al. 2020b), PSR (proxy scoring rules, Witkowski et al. 2017). For PSR the proxy ground truth was the VI aggregator output; for SSR the SPSR being estimated = the evaluation metric itself. Resulting 10 PAS-aided aggregators (5 PAS × Mean/Logit).

## 4. Equations & assumptions
- Aggregation: F^Mean(p_i) = Σ_{j∈N_i} w_j p_{i,j}; F^Logit(p_i) = sigmoid(|N_i|/α · Σ w_j logit(p_{i,j})), α = 2 (Satopää et al. 2014a).
- Brier: S^Brier(q̂_i, Y_i) = 2(q̂_i − Y_i)² (GJP convention, range [0,2]). Log score: S^log = −Y_i log q̂_i − (1−Y_i) log(1−q̂_i); predictions 0/1 clipped to 0.01/0.99; score range stated as 0.1–4.61. Lower = better.
- SSR de-bias formula: R^{SSR}_{i,j}(p_{i,j}, Z) = [(1−e_{1−Z})S(p_{i,j},z) − e_Z S(p_{i,j},1−Z)] / (1−e_0−e_1), where Z ~ Bern(mean of peers' forecasts), e_0 = P(Z=1|Y=0), e_1 = P(Z=0|Y=1). Then E_{Z|Y_i}[R^{SSR}] = S(p_{i,j}, Y_i) (unbiased for the true proper score).
- PSR: R^{PSR}_{i,j} = S(p_{i,j}, Ŷ_i), Ŷ_i an extremized-mean proxy of ground truth.
- CA: R^{CA}_j = Σ_{u,v∈{0,1}} |d̂^{j,k}_{u,v} − d̂^j_u · d̂^k_v| where d̂^{j,k} is the empirical joint voting distribution of agents j,k (with votes sampled Bern(p_{i,j})). Asymptotically equals determinant mutual information DM(p_j, p_k).
- DMI: R^{DMI}_j = η det(D̂0)·det(D̂00) on two disjoint task subsets.
- PTS: R^{PTS}_j = d̂^{j,k}_{0,0}/p̄_{−j,0} + d̂^{j,k}_{1,1}/p̄_{−j,1} (matching probability downweighted by popularity).
- Propositions (asymptotic, |M|,|N|→∞): SSR ranks agents by true mean SPSR; DMI by squared determinant mutual information vs ground truth; CA by determinant mutual information vs ground truth; PTS by inverse expected weighted 0-1 loss (when majority-vote TPR and TNR both > 0.5).
- Assumptions: A1 — events independent and a priori similar (same signal/ground-truth joint distribution across events); A2 — agents' private signals independent conditioned on ground truth; agents report truthfully; agents' forecasts positively correlated with ground truth (better than random).

## 5. Features / target
Inputs: raw probabilistic forecasts p_{i,j} per agent per question (binary votes or confidence scores converted to probabilities). No other features. Target: aggregated probability q̂_i per event, scored against the later-revealed binary ground truth.

## 6. Validation design
No train/test split — the evaluation is retrospective over 14 fully-resolved datasets (aggregation done with ground truth hidden, scored after reveal). Baselines: Mean, Logit (single-task), VI variational-inference crowdsourcing aggregator (Liu et al. 2012), MP minimal pivoting (surprising popularity, uses extra "predict others' predictions" data, MIT datasets only). Metrics: mean Brier score and mean log score per dataset. Pairwise significance: two-sided paired t-tests per dataset, p<0.05 (Tables 5, 7). Cross-dataset mean±std comparison with p<0.05 claims (Table 11). Selection hyperparameter fixed at max(10%·|N|, 10), shared across all aggregators/datasets — no per-dataset tuning reported. Small-data robustness: 30 repeated subsamples of 20 events × 30/50 participants (Appendix A).

## 7. Numerical results / baselines
- Binary events, 14 datasets (Table 4, Brier [0,2]): 9 of 10 PAS-aided aggregators beat the best benchmark on ≥5 datasets; each Mean-based PAS-aided aggregator beats the second-best benchmark on ≥12 of 14 datasets; no PAS-aided aggregator is worse than the worst benchmark on any dataset (single exception: PSR-aided Logit on M1a).
- Paired t-tests (Table 5): each PAS-aided aggregator statistically beats each benchmark on ≥4 more datasets than it loses to (max 9 more). Only exception: dataset H2, where plain Mean/Logit were not beaten (gap within 0.02).
- Cross-dataset averages (Table 11, exact): Mean-based DMI-aided: mean Brier 0.221 (std 0.150); vs Mean benchmark 0.290 (0.130), Logit benchmark 0.317 (0.224), VI 0.315 (0.267). Log score: DMI-aided Mean 0.354 (0.214) vs Mean 0.453 (0.154), Logit 0.578 (0.446), VI 0.701 (0.573). All five Mean-based PAS-aided aggregators significantly better than all benchmarks at p<0.05 on both metrics (exceptions: PSR vs MP on Brier; SSR/PSR vs MP on log score — MP only applies to 7 MIT datasets).
- Mean-based beats Logit-based PAS-aided (not statistically significant); authors' conjecture: once experts are selected, Logit's extremization adds variance, not accuracy.
- No statistically significant difference among the five PAS under the same base aggregator (no PAS-aided aggregator beats another on more than 3 datasets).
- Selection-curve finding (Fig. 3, dataset G2): PAS-aided aggregator performance peaks at top 5–20% selection and "perfectly recovers" the in-hindsight performance of an oracle Brier-score-aided aggregator on G2.
- Small datasets (20 events, 50 participants): Mean-based PAS-aided still beats all benchmarks consistently (Appendix Table 8a).
- Multi-outcome events (Table 6/7): applying binary-event PAS to multi-outcome aggregation gives consistent significant wins; on no dataset does a benchmark significantly beat a PAS-aided aggregator (exception: Logit vs CA-aided Mean on H2).
- Improvement minimal on HFC datasets — where each forecaster made <40 predictions, so PAS estimates are noisy.

## 8. Code / data availability
No code link stated in paper. Data: GJP public at https://doi.org/10.7910/DVN/BPCDH5; HFC/MIT via cited references (IARPA 2019; Prelec et al. 2017).

## 9. Leakage & limitations
- Each forecaster must make a "sufficient number" of predictions (≥15 enforced, <40 found insufficient) — fails for cold GSE sub-models with few games.
- A1 (events a priori similar) is violated in NFL: games differ in matchup type, week, weather; a single PAS ranking conflates skill across heterogeneous event classes. Conditional-independence (A2) is violated when GSE's model pool shares data/features (e.g., all trained on nflverse).
- The top-k truncation discards diversity; in forecast-combination literature, dropping models hurts robustness. The paper's own small-data appendix shows rank-selection is hyperparameter-sensitive (top 5–20% peak).
- Truthful-reporting assumption: GSE models don't "strategize," so this is benign here.
- Retrospective evaluation: no true out-of-sample protocol; significance via paired t-tests on the same datasets the qualitative tuning was done on.
- Logit-based PAS-aided sometimes worse than benchmarks on hard datasets (e.g., M1a: PSR-aided Logit 0.715 Brier vs Mean 0.452).
- VI comparison caveat: VI outputs extreme (0/1-ish) predictions so its scores are extreme (great when right, catastrophic when wrong) — inflating its variance.

## 10. GSE overlap
Extension, not duplicate. GSE's ensemble theory lane is CEPT (existing-research-map: Garrett's own "Baxley Causal E-Process Theory" ensemble framework, publication files). The 2026-09-18 ML research brief lists "ensembling" as a commissioned topic but results are not yet in the repo. GSE currently generates daily picks from model v5.2.7; no peer-assessment / model-skill-ranking layer exists to weight or prune ensemble members without waiting for game outcomes.

## 11. GSE implementation spec
Adapt the PAS concept to GSE's model pool:
1. Pool: every prediction source per game-week — GSE engine variants, component models, external analyst picks (e.g., @GalaxySportsHQ posted cards), market-implied (Pinnacle) probabilities. Each game = one "event," each model = one "agent," probability of home cover / over / ML win = the forecast.
2. Compute CA-style correlation scores: for each model pair, joint voting distribution d̂^{j,k} over games in the current + prior weeks; reward R_j = Σ|d̂_{u,v} − d̂_u d̂_v| vs each peer, averaged. This is implementable in pandas/numpy — no new deps. Prefer CA over SSR/PSR (no unbiased-proxy needed) and over DMI (no task splitting).
3. Weight scheme: replace the paper's hard top-k with soft softmax weights w_j ∝ exp(β·s_j), β tuned on past weeks (e.g., β ∈ {0, 1, 5}); avoids the paper's fragility when |models| is small (~5–10 GSE models vs hundreds of humans).
4. Base aggregators: weighted mean of probabilities; extremized (Logit, α=2) variant for comparison.
5. Data: nflverse play-by-play (existing), odds APIs (Odds API under baxley.garrett@gmail.com), GSE picks table (Neon Postgres, model v5.2.7). Estimated effort: 1 day to build + backtest harness.

## 12. Reproducible test
Dataset: all 2024 + 2025 NFL regular-season games with final scores and GSE component-model probabilities archived in the picks table (or regenerated from the 2026-09-18 reference tables). Metric: mean Brier score and mean log-loss per game-week; headline metric = full-season mean Brier vs full-pool unweighted mean. Baseline: unweighted mean of the model pool + the VI-style latent-skill benchmark (skip — use equal-weight mean and extremized mean). Time window: 2024 full season train-selection of β, 2025 season test. Must be time-ordered: PAS computed only on weeks < target week.

## 13. Acceptance / rejection gate
ADOPT the CA-weighted ensemble if full-season 2025 mean Brier is ≥3% lower than unweighted-mean Brier AND the win-rate on the GSE posted-pick set does not decline; also require that per-week PAS rankings show rank correlation ≥0.3 with next-week realized Brier (skill persistence check). REJECT if Brier improvement <1% or the skill-persistence check fails (ranks don't predict skill → mechanism is noise on NFL data).

## 14. Improvement experiment
Beyond the paper: replace the hard top-k (max(10%·|N|, 10)) with a diversity-aware selection — cluster models by prediction similarity (their d̂^{j,k} off-diagonal mass), then take the top-PAS model from each cluster. Hypothesis: the paper's pure skill ranking double-counts correlated experts; diversity-aware selection keeps the PAS skill signal while restoring the hedge that makes ensembles robust. Compare Brier and, importantly, log-loss tail (worst-decile weeks) vs paper's scheme.
