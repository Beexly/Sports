# [1184] Meta-Analytics: Tools for Understanding the Statistical Properties of Sports Metrics (arXiv:1609.09830v1)

**Citation:** Franks, A. M., D'Amour, A., Cervone, D., & Bornn, L. (2016). *Meta-Analytics: Tools for Understanding the Statistical Properties of Sports Metrics*. arXiv:1609.09830v1 [stat.AP]. URL: https://arxiv.org/abs/1609.09830
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; all sections read including the meta-metric definitions, inference procedures, NBA/NHL analyses, and the shrinkage/PCA metric-construction sections; appendix is a metric glossary plus supplementary figures).
**Verdict:** ADAPT — the discrimination/stability/independence meta-metric framework is the audit toolkit GSE's 26-metric catalog has been missing: run every engine input metric through D/S/I scoring to kill redundant, unstable, or chance-dominated features before they enter the models, starting with the paper's own playbook (bootstrap sampling variance, Gaussian-copula independence, EB shrinkage for noisy rates).

## 1. Research question
How can we quantitatively compare *sports metrics themselves* — which ones reliably differentiate players (discrimination), measure something stable over time (stability), and provide genuinely new information vs. duplicating other metrics (independence) — and can these "meta-metrics" guide the construction of better metrics? (Abstract; Sec. 1)

## 2. Dataset / schema
70 NBA metrics for all players/seasons from 2000 onward (basketball-reference.com) and 40 NHL metrics from 2000 onward (hockey-reference.com). Schema: player-season-metric 3D array X_{spm}; metrics normalized by minutes/possessions where appropriate. Public sources. (Sec. 4)

## 3. Method / model
Three meta-metrics, all R²-style variance ratios: (1) Discrimination D_{sm} = 1 − E_{sm}[V_{spm}[X]] / V_{sm}[X] — fraction of between-player variance not due to sampling noise; (2) Stability S_m = 1 − E_m[V_{pm}[X] − V_{spm}[X]] / (V_m[X] − E_m[V_{spm}[X]]) — fraction of non-sampling variance attributable to persistent player differences rather than season-to-season change; (3) Independence I_{mM} = Var[Z_{spm} | {Z_{spq}: q∈M}] / Var[Z_{spm}] via a Gaussian-copula latent correlation matrix C (rank-likelihood estimation, Hoff 2007; R package sbgcop), plus PCA on C for redundancy analysis and greedy "independence curves." Sampling variances V_{spm}[X] estimated by bootstrap resampling of games within seasons. Two construction demos: empirical-Bayes shrinkage of 3P% (hierarchical Beta-binomial, gbp package) improving both D and S; PCA-based orthogonal composite metrics. (Secs. 2–3, 5)

## 4. Equations & assumptions
- Mixed-effects motivation: X_{spm} = μ_m + Z_{sm} + Z_{pm} + Z_{spm} + ε_{spm}, with variance components σ²_{SM}, σ²_{PM}, σ²_{SPM}, τ²_M (sampling).
- Discrimination: D_{sm} = 1 − E_{sm}[V_{spm}[X]] / V_{sm}[X]; combined D_m = E_m[D_{sm}].
- Stability: S_m = 1 − E_m[V_{pm}[X] − V_{spm}[X]] / (V_m[X] − E_m[V_{spm}[X]]), with 0 ≤ S_m ≤ 1 (proved in appendix).
- Independence: I_{mM} = C_{m,m} − C_{m,M} C_{M,M}^{−1} C_{M,m} (eq. 8); PCA fraction F_k = (Σ_1^k λ_i)/(Σ_1^M λ_i).
- Assumptions stated: bootstrap captures sampling variation (resampling games within a season); Gaussian copula adequately represents cross-metric dependence; meta-metrics measure *internal reliability only* — the authors stress a fourth "relevance" meta-metric (predictive/causal link to winning) is needed and not provided. Metrics should be compared within type (rate vs. totals).

## 5. Features / target
Inputs: player-season metric values (the metrics *are* the data). Target of the meta-analysis: the reliability scores D/S/I per metric. No prediction horizon — it is a measurement-validity framework.

## 6. Validation design
Demonstration, not validation in the ML sense: meta-metrics computed on the full NBA/NHL samples; the EB-shrinkage demo shows D/S improvement for 3P% on the same data (in-sample demonstration); PCA composites illustrated with player rankings (LeBron James ranking highly on all three independent NBA components as a sanity check). No held-out test of the meta-metrics themselves. (Secs. 4–5)

## 7. Numerical results / baselines
Paper's headline findings (my summary of Sec. 4): NBA — raw 3P% is the least discriminative and least stable metric studied; over 50% of between-player 3P% variation in a season is chance; rebounds/blocks/assists are highly discriminative and stable (position indicators); rate stats are more stable but less discriminative than totals; BPM beats WS/48/ORtg/DRtg on reliability among rate metrics; VORP beats total WS. Independence: steals I ≈ 0.40 (60% explained by the other 69 metrics — most unique of those studied); NBA PCA: F_15 ≈ 0.75 (15 of 65 components explain 75%); omnibus {WS,VORP,PER,BPM,PTS}: F_1 = 0.75 (one latent factor); defensive {DBPM,STL,BLK,DWS,DRtg}: F_1 = 0.51. NHL — takeaways I = 0.73 (only 27% explained by other 39 metrics); Corsi metrics more reliable than Fenwick; plus-minus non-discriminative; F_15 = 0.90. EB shrinkage of 3P% visibly improves its D and S (Fig. 2, Fig. 6). Distinguish: these are descriptive reliability estimates on basketball/hockey reference data, not GSE-applicable constants.

## 8. Code / data availability
Methods use public R packages (sbgcop, gbp); no paper code link stated. Data from basketball-reference.com / hockey-reference.com (public).

## 9. Leakage & limitations
(1) The authors' own central caveat: meta-metrics measure internal reliability, not *relevance* — a perfectly stable, discriminative, independent metric can be useless for winning (their zip-code example); GSE must pair D/S/I with predictive-validity tests; (2) bootstrap sampling variance assumes games are exchangeable within a season — questionable with injuries/trades; (3) NBA/NHL only — no football; per-play football metrics have very different sampling structure; (4) the EB and PCA demos are in-sample illustrations, not validated improvements; (5) metric-type confounding (rate vs. totals) means naive D/S rankings mislead — the paper warns about this explicitly.

## 10. GSE overlap
Directly serves the engine-benchmark lane. The existing-research-map shows GSE maintains a 26-metric catalog (+sweeps) with "provider traps documented" and computed metric families in gse-lab — but *no reliability audit*: nothing in the corpus scores metrics by discrimination/stability/independence. The 58-paper dossiers contain no meta-metric paper. This is the missing QA layer for the metric inventory: run D/S/I on every gse-lab metric family (EPA splits, luck-layer metrics, QB aggressiveness, etc.) across seasons, then prune or shrink the unreliable ones before they enter the engine. The paper's EB-shrinkage demo also directly informs how GSE should treat noisy rate metrics (e.g., shrink small-sample splits). New capability, high fit.

## 11. GSE implementation spec
1. Build the meta-metric pipeline: for each gse-lab metric family (29 CSVs, 15 families per the map), compute D (bootstrap over games within season for sampling variance), S (across 2015–2025 seasons), and I (Gaussian-copula PCA across the metric set). 2. Publish a "metric reliability report" ranking all engine inputs; flag metrics with D < 0.5 (chance-dominated) or I < 0.2 (redundant) for shrinkage/removal review. 3. Apply EB shrinkage to flagged noisy rate metrics before model ingestion. 4. Re-run annually as new seasons complete. Effort: ~1 week (pipeline + report; bootstrap is the main compute cost).

## 12. Reproducible test
Dataset: gse-lab computed metrics (nflverse-derived, 2015–2025 seasons) — team and player metric families. Metric: D/S/I per metric per the paper's estimators. Baseline: the current engine's implicit equal-trust treatment of all input metrics. Gate: the audit must surface at least three metrics with D < 0.5 or I < 0.2 that, when shrunk/removed, improve walk-forward engine log-loss on 2025 — i.e., the framework must earn its keep predictively, per the authors' relevance caveat.

## 13. Acceptance / rejection gate
ADOPT the meta-metric audit as a standing annual QA step if (a) it identifies ≥3 chance-dominated or redundant metrics in the current engine input set, AND (b) acting on the findings (shrinkage/removal) improves 2025 walk-forward log-loss by ≥0.002 vs. the un-audited input set; REJECT as a one-off (keep the paper as reference only) if the audit finds the current input set already clean or the intervention doesn't move log-loss. Never use D/S/I alone to drop a metric that has proven predictive value — relevance overrides reliability.

## 14. Improvement experiment
Go beyond the paper: add the authors' missing fourth meta-metric, *relevance* — estimate each metric's marginal predictive contribution (e.g., Shapley value or leave-one-metric-out log-loss delta in the engine) and build the 4D D/S/I/R dashboard. Then test the paper's implicit hypothesis: do high-D, high-S, high-I, high-R metrics combine into better forecasts than the current input set? This turns their descriptive framework into a closed-loop feature-selection system, which the paper proposes but never builds.
