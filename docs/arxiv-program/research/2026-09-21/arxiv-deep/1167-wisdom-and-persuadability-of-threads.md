# 1167 The Wisdom and Persuadability of Threads (arXiv:2008.05203)

**Citation:** Robin Engelhardt, Vincent F. Hendricks, Jacob Stærk-Østergaard (2020). *The Wisdom and Persuadability of Threads*. arXiv:2008.05203. URL: https://arxiv.org/abs/2008.05203
**Ledger completed:** 2026-09-21. **Read:** full text — version note: v2 is WITHDRAWN on arXiv; v1 (12 Aug 2020) was read in full to EOF (PDF, 6 pages main text + Supplementary Information, via arxiv.org/pdf).
**Verdict:** ADAPT

Adapt the paper's two-level lesson for GSE's market-integration lane: (1) pristine sequential information helps on hard tasks while filtered/extreme-only information creates folly — design rule: ingest the full evolution of betting lines, never just curated "steam" or extreme-move signals; (2) the GMM persuadability score, repurposed as a model–market dependence coefficient, to downweight GSE component models that merely herd the market.

## 1. Research question
Does social information in online estimation threads improve or degrade collective accuracy? An experimental design crossing task difficulty with amount and type (pristine vs filtered/extreme) of social information, plus a per-participant persuadability score estimated from a Gaussian Mixture Model.

## 2. Dataset / schema
Dot-guessing experiment on Amazon Mechanical Turk: participants estimate the number of dots d ∈ {55, 148, 403, 1097} in an image while seeing v ∈ {1, 3, 9} previous estimates. Total: 11,748 estimates from 6,196 unique participants. Historical (pristine) threads: 5,990 estimates in 12 threads (4 d × 3 v, participants see the v preceding estimates). Manipulated (filtered) threads: 3,934 estimates in 12 threads (participants see the v highest estimates made so far). Control: 1,824 estimates in 4 threads (v = 0). Estimates bounded to [10, 1,000,000]. Incentives: $0.10 participation fee + $1 bonus if the estimate is within 10% of truth. Schema: per estimate — hashed participant id, thread/session, d, v, v visible estimates, the participant's guess. Data: anonymized `dots.xlsx` (parameters: task, d, v, session, hashed turker, decision order, hist, guess). Quality: participants ≥100 HITs and ≥98% acceptance; 32 duplicate participants removed; attrition reduced to 6.5% after waiting-room fix; average wage ~$12/hour. No participant saw the same image twice.

## 3. Method / model
- Aggregate statistic: thread median M(d,v) (Galton; robust to the right-skewed, heavy-tailed free-response distributions). Thread accuracy: y_dv = log(M(d,v)/d), fit with a linear normal model μ_dv = α_v + β_v log d, v as categorical factor; historical and manipulated threads modeled separately (different error variances).
- Individual GMM: Yi = log(ei/d); Si = weighted geometric-mean aggregation of the visible estimates, log-transformed: Si = log((Π_j z_ij^{w_j})/d) = Σ_j w_j log(z_ij/d), with Σw_j=1. Weights w_j from density estimates on the v=0 control threads (extreme estimates get weight ≈0 — automatic filtering).
- Yi | (Xi=j) ~ N(μj, σj²); μj = αj + βj Si (eq. 2); personal parameters β_iw = Σ_j δ_ij β_j (eq. 3), α_iw similarly; δ_ij = P(Xi=j) the posterior state weights. Persuadability score: β_iw — high (>0.6) = follower, ≈0 = skeptic ("sleeping dogs"/"lost causes"), ≈0.4 = compromiser.
- k ∈ {2,3,4,5} states selected by BIC = 3k ln(n) − 2 ln(L) (AIC = 6k − 2 ln(L) favored k=5 everywhere — overfitting; BIC used). Fit with R package depmixS4 (EM). Goodness of fit via standardized residuals ε̂_i = (yi − α̂_iw − β̂_iw xi)/σ̂_iw² vs N(0,1) after removing the 5% most extreme observations.

## 4. Equations & assumptions
- y_dv = log(M_dv/d); μ_dv = α_v + β_v log d.
- Yi | (Xi=j) ~ N(μj, σj²); P(Yi) = Σ_j P(Xi=j)P(Yi|Xi=j) (eq. 1).
- μj = αj + βj Si (eq. 2); β_iw = Σ_j δ_ij βj (eq. 3).
- ε̂_i = (yi − μ̂_iw)/(σ̂_iw²) vs N(0,1) (eq. 4).
- Assumptions: d (dot count) is a valid task-difficulty proxy; seeing v estimates is a valid social-information dose; MTurk samples generalize to online-thread behavior; the weighted-geometric-mean aggregation is a fair proxy for what participants "see".

## 5. Features / target
Inputs: per-participant visible social information (weighted geometric mean of the v shown estimates, log-ratio) and task difficulty d. Targets: thread median log-ratio (collective accuracy); per-participant persuadability β_iw and its distribution.

## 6. Validation design
Randomized experiment: participants randomly assigned to 28 threads (2 thread-types × 3 v × 4 d + 4 controls); one image per participant (no carryover). Historical vs manipulated is the "pristine vs filtered" treatment; v and d are dose/difficulty factors. Control groups (v=0) identical across both thread types. Goodness of fit via QQ plots of residuals (conservative wide confidence bands noted).

## 7. Numerical results / baselines
- Historical (pristine) threads: collective performance declines with d but improves with v. For v=9, the thread median is statistically indistinguishable from the true value at all four difficulties (exact: "'wise' in the sense of being statistically indistinguishable from the true value for all d"). Note: confidence intervals overlap in places — effects are only discernible for hard tasks with abundant social information.
- Manipulated (filtered) threads: large positive bias for v=3 and v=9, increasing with d; for v=1 a small negative trend (manipulation ineffective). Conclusion: filtered social information is highly detrimental when the task is demanding.
- Persuadability: β_iw increases with difficulty d and with social-information amount v. At low d and v=1, participants are not significantly influenced in either thread type.
- Manipulated high-d/high-v threads: population splits into a highly persuadable minority and a skeptic/compromiser majority (the "increasing gap between highly persuadable participants and skeptics"); historical high-d/high-v threads: large majority medium-to-strongly influenced (β_iw ≈ 0.5).
- Bandwagon effect: following probability increases with the number of people already following.
- Design counts: 11,748 estimates; 6,196 unique participants; 5,990 historical, 3,934 manipulated, 1,824 control; 3,157 participants saw one image, 1,259 two, 1,047 three, 733 all four.
- SI (read to EOF): Fig. 7 (QQ-plots for the 29 unique MTurk threads — GMM fits fairly well, very-short series discarded); Fig. 8 (per-thread β_w distributions, red=skeptics, blue=persuadables, green=compromisers on a fixed color scale); Fig. 9 (individual guesses vs observation number, social information as dashed lines, colored by β_w); Fig. 10 (actual estimates vs given social information, colored by β_w); thread-level Table I (method, d, v, thread id, N, median, mean, SD, CV, skew, kurt, bonus %, totaling 11,748 estimates — e.g. history 55-dot threads: bonus 57–67% within 10% of truth vs max 55-dot: 44–54%). The SI figures confirm the main-text results (pristine/history wisdom vs manipulated/max folly, the persuadable/skeptic population split); no result changes relative to the main text.

## 8. Code / data availability
Experiment coded in oTree 2.1. Analysis: R depmixS4 (EM algorithm). Data: anonymized `dots.xlsx` (linked in SI). No full analysis code stated.

## 9. Leakage & limitations
- MTurk lab experiment on a perceptual task; transfer to sports markets and ML model pools is analogical, not direct.
- The persuadability score confounds agreement-by-coincidence with influence (authors note: a participant whose private estimate matches the social information can be mislabeled persuadable); identification is approximate, mitigated by stability of β_iw distributions across threads.
- Only the weighted geometric mean of visible estimates is modeled as Si; participants likely process the v estimates more diversely (high uncertainty in β_iw at v=9).
- Estimates were bounded to [10, 1,000,000], which truncates the tails.
- v1 vs withdrawn v2: changes between versions are unknown; ledger is based on the v1 full text actually available.

## 10. GSE overlap
Extends the wisdom-of-crowds thread (1162–1166) with the one concept no other paper supplies: the pristine-vs-filtered information distinction and a per-agent influence (persuadability) measurement. GSE blends a model ensemble with betting-market information — the market is exactly "sequential social information" about each game. GSE currently has no screen for whether its component models herd the market, and no rule distinguishing full line-evolution feeds from curated steam signals.

## 11. GSE implementation spec
Two adaptations:
1. Full-information market feed rule (immediate, zero-code): ingest the complete line evolution (openers + every move, full consensus-history from The Odds API) as GSE's market feature; never build features on curated "top steam picks" or extreme-only line-move lists — that is the paper's manipulated-thread regime, shown to turn wisdom into folly.
2. Model–market persuadability screen (~1 day): for each component model and each game, regress the model's log-odds forecast on the contemporaneous market log-odds; the slope is the model's market-β_iw ("persuadability"). Models with market-β near 1 and small residual information add no independent signal — downweight them in aggregation proportionally to their orthogonal (market-residual) predictive information, i.e., weight by the Brier improvement over the market rather than raw Brier. Flag weeks where the pool's average market-β drifts upward (the pool is herding).

## 12. Reproducible test
Dataset: 2024–2025 NFL seasons; component-model probabilities and timestamped market odds per game. (a) Compute per-model market-β (slope of model log-odds on market log-odds) per market; report the distribution. (b) Build the persuadability-weighted ensemble: weight each model by max(0, Brier_market − Brier_model) on trailing data; compare full-season Brier against the equal-weight ensemble and against the raw-Brier-weighted ensemble. Expectation (from the paper's logic): the orthogonal-information weighting wins on hard-to-price games (large spread uncertainty), where pristine market information adds value, and loses nothing elsewhere. Time-ordered: weights from trailing weeks only.

## 13. Acceptance / rejection gate
ADOPT the orthogonal-information weighting if, on 2025 data, it beats the equal-weight ensemble on full-season Brier and beats it by a larger margin on the hard-game subset (top-tercile closing-line uncertainty). REJECT the "weight by raw Brier" scheme if ≥1 component model has market-β>0.9 and the orthogonal weighting removes it without Brier loss — raw-Brier weighting overcredits herders.

## 14. Improvement experiment
Beyond the paper: the paper's GMM identifies persuadables among humans; extend to a two-sided market-persuadability test on bettor behavior if GSE ever ingests public pick-distribution data (e.g., ticket counts vs handle). Fit a mixture on bettor pick shifts after line moves: one component follows line moves (persuadables), one doesn't (skeptics). If the persuadable fraction spikes before specific games, treat the resulting line as the paper's manipulated-thread regime (filtered/extreme information — e.g., steam-driven moves) and reduce the market's weight in the final price for that game; if the line evolved through broad balanced action (pristine regime), keep full market weight. This turns the paper's descriptive split into a per-game market-reliability switch the paper doesn't attempt.
