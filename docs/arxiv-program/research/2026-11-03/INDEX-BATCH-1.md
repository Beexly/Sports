# Research Library — Batch 1 Index

Built 2026-11-03 (CT). **26 verified full texts**, 82 MB total, all in `pdfs/`.

**Verification method:** every file was downloaded from a legitimate source (arXiv, author-posted PDF on a university/lab page, publisher open-access via PMC/LSHTM repository, CRAN, author's own site), then checked three ways: `file` reports real PDF bytes, `pdfinfo` returns a page count, and the first-page text was read to confirm the document is the paper named. Three items failed these checks during the build and were **rejected, not shelved**: an object-tracking paper pulled by an arXiv ID collision, an astrophysics paper pulled by a bad fallback URL, and an HTML error page masquerading as a PDF. Nothing in this folder is an abstract, a summary, or a landing page.

---

## 1. Conformal prediction

**Angelopoulos, A. N., & Bates, S. (2023).** "A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification." *Foundations and Trends in Machine Learning*, 16(4), 494–591.
- Source: https://arxiv.org/abs/2107.07511 · File: `AngelopoulosBates-2023-GentleIntroductionConformal.pdf` · 5.11 MB · 51 pp.
- Plugs into: **conformal-ot kernel** — the reference text for the whole conformal layer; also the calibration program's onboarding read.

**Barber, R. F., Candès, E. J., Ramdas, A., & Tibshirani, R. J. (2023).** "Conformal Prediction Beyond Exchangeability." *The Annals of Statistics*, 51(2), 816–845.
- Source: https://arxiv.org/abs/2202.13415 · File: `Barber-2023-ConformalBeyondExchangeability.pdf` · 3.98 MB · 63 pp.
- Plugs into: **conformal-ot kernel** — the weighted-conformal paper (Barber et al. weighted conformal) behind the kernel's non-exchangeable weighting; GSE engine, where games are not exchangeable.

**Romano, Y., Patterson, E., & Candès, E. J. (2019).** "Conformalized Quantile Regression." *Advances in Neural Information Processing Systems 32 (NeurIPS 2019)*.
- Source: https://arxiv.org/abs/1905.03222 · File: `Romano-2019-ConformalizedQuantileRegression.pdf` · 1.36 MB · 19 pp.
- Plugs into: **conformal-ot kernel / calibration program** — CQR is the adopted interval method (Romano CQR stack); applies to player-prop and margin intervals in the GSE engine.

**Shafer, G., & Vovk, V. (2008).** "A Tutorial on Conformal Prediction." *Journal of Machine Learning Research*, 9, 371–421.
- Source: https://arxiv.org/abs/0706.3188 · File: `ShaferVovk-2008-TutorialConformalPrediction.pdf` · 0.61 MB · 58 pp.
- Plugs into: **calibration program** — the Vovk-school foundation (this is the legal full-text substitute for the paywalled *Algorithmic Learning in a Random World*; see gap list).

**Tibshirani, R. J., Barber, R. F., Candès, E. J., & Ramdas, A. (2019).** "Conformal Prediction Under Covariate Shift." *Advances in Neural Information Processing Systems 32 (NeurIPS 2019)*.
- Source: https://arxiv.org/abs/1904.06019 · File: `Tibshirani-2019-ConformalCovariateShift.pdf` · 0.40 MB · 17 pp.
- Plugs into: **GSE engine** — weighted conformal under shift; the formal basis for re-weighting when the current slate's distribution drifts from the training window.

**Lei, J., G'Sell, M., Rinaldo, A., Tibshirani, R. J., & Wasserman, L. (2018).** "Distribution-Free Predictive Inference for Regression." *Journal of the American Statistical Association*, 113(523), 1094–1111.
- Source: https://arxiv.org/abs/1604.04173 · File: `Lei-2018-DistributionFreePredictiveInference.pdf` · 1.28 MB · 50 pp.
- Plugs into: **conformal-ot kernel** — split-conformal foundations (locally weighted / conformal predictive distributions) under the kernel's interval machinery.

## 2. Optimal transport & Sinkhorn

**Peyré, G., & Cuturi, M. (2019).** *Computational Optimal Transport*. *Foundations and Trends in Machine Learning*, 11(5–6), 355–607. (arXiv manuscript v4, 2020 — the complete book.)
- Source: https://arxiv.org/abs/1803.00567 · File: `PeyreCuturi-2019-ComputationalOptimalTransport.pdf` · 40.46 MB · 209 pp.
- Plugs into: **conformal-ot kernel** — the full book behind the kernel's Sinkhorn-Knopp entropic OT module; the reference for every OT design decision.

**Cuturi, M. (2013).** "Sinkhorn Distances: Lightspeed Computation of Optimal Transport." *Advances in Neural Information Processing Systems 26 (NeurIPS 2013)*, 2292–2300.
- Source: https://arxiv.org/abs/1306.0895 · File: `Cuturi-2013-SinkhornDistances.pdf` · 0.96 MB · 13 pp.
- Plugs into: **conformal-ot kernel** — the original entropic-regularization paper the Sinkhorn module implements.

**Genevay, A., Peyré, G., & Cuturi, M. (2018).** "Learning Generative Models with Sinkhorn Divergences." *Proceedings of AISTATS 2018*, PMLR 84, 2130–2139.
- Source: https://arxiv.org/abs/1706.00292 · File: `Genevay-2018-LearningGenerativeModelsSinkhorn.pdf` · 2.82 MB · 12 pp.
- Plugs into: **conformal-ot kernel / GSE engine** — Sinkhorn divergences (debiased) for distribution-matching between predicted and market-implied distributions.

## 3. Copulas & dependence

**Patton, A. J. (2012).** "A Review of Copula Models for Economic Time Series." *Journal of Multivariate Analysis*, 110, 4–18.
- Source: author PDF, Duke University — https://econ.duke.edu/~ap172/Patton_JMVA_survey_2012.pdf · File: `Patton-2012-ReviewCopulaModelsEconomicTimeSeries.pdf` · 0.58 MB · 15 pp.
- Plugs into: **conformal-ot kernel** — the survey reference for the kernel's conformal copula bounds and for SGP dependence modeling in the GSE engine.

**Embrechts, P., McNeil, A. J., & Straumann, D. (2002).** "Correlation and Dependence in Risk Management: Properties and Pitfalls." In M. Dempster (Ed.), *Risk Management: Value at Risk and Beyond*, Cambridge University Press, 176–223. (RiskLab, ETH Zürich, working-paper version.)
- Source: author PDF, ETH Zürich — https://people.math.ethz.ch/~embrecht/ftp/pitfalls.pdf · File: `Embrechts-1999-CorrelationDependenceRiskPitfalls.pdf` · 0.58 MB · 37 pp.
- Plugs into: **GSE engine / calibration program** — the canonical warning text on correlation-vs-dependence; governs how leg-dependence is (and is not) summarized in parlay pricing.

## 4. Proper scoring rules & calibration

**Gneiting, T., & Raftery, A. E. (2007).** "Strictly Proper Scoring Rules, Prediction, and Estimation." *Journal of the American Statistical Association*, 102(477), 359–378.
- Source: author PDF, University of Washington — https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf · File: `GneitingRaftery-2007-StrictlyProperScoringRules.pdf` · 0.53 MB · 20 pp.
- Plugs into: **calibration program** — the foundational scoring-rule paper; contains the Murphy decomposition of the Brier score used in GSE forecast grading.

**Gneiting, T., Balabdaoui, F., & Raftery, A. E. (2007).** "Probabilistic Forecasts, Calibration and Sharpness." *Journal of the Royal Statistical Society, Series B*, 69(2), 243–268.
- Source: author PDF, University of Washington — https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jrssb.pdf · File: `Gneiting-2007-ProbabilisticForecastsCalibrationSharpness.pdf` · 0.85 MB · 26 pp.
- Plugs into: **calibration program** — the calibration-vs-sharpness paradigm and reliability-diagram methodology behind the engine's published calibration checks.

**Guo, C., Pleiss, G., Sun, Y., & Weinberger, K. Q. (2017).** "On Calibration of Modern Neural Networks." *Proceedings of ICML 2017*, PMLR 70, 1321–1330.
- Source: https://arxiv.org/abs/1706.04599 · File: `Guo-2017-OnCalibrationModernNeuralNetworks.pdf` · 1.29 MB · 14 pp.
- Plugs into: **GSE engine / calibration program** — temperature scaling and ECE measurement for any neural components feeding the forecasting stack.

## 5. Probabilistic & judgmental forecasting

**Mellers, B., Stone, E., Murray, T., Minster, A., Rohrbaugh, N., Bishop, M., Chen, E., Baker, J., Hou, Y., Horowitz, M., Ungar, L., & Tetlock, P. (2015).** "Identifying and Cultivating Superforecasters as a Method of Improving Probabilistic Predictions." *Perspectives on Psychological Science*, 10(3), 267–281.
- Source: author PDF — http://michaelmbishop.github.io/superforecasters.pdf · File: `Mellers-2015-IdentifyingCultivatingSuperforecasters.pdf` · 0.85 MB · 15 pp.
- Plugs into: **calibration program** — the peer-reviewed core of the superforecasting research (the Tetlock & Gardner trade book is paywalled; see gap list): training, teaming, tracking, and extremized aggregation for GSE's human-in-the-loop forecasts.

**Nikolopoulos, K., et al. (2021).** "Superforecasting Reality Check: Evidence from a Small Pool of Experts and Expedited Identification." *European Journal of Operational Research*, 289(1), 107–117.
- Source: publisher open access via PubMed Central (PMC7333631) — https://europepmc.org/articles/PMC7333631 · File: `Nikolopoulos-2021-SuperforecastingRealityCheck.pdf` · 1.16 MB · 12 pp.
- Plugs into: **calibration program** — the skeptical replication: where superforecaster identification holds up under small pools and time pressure, and where it doesn't.

## 6. Kelly criterion & bankroll

**Kelly, J. L., Jr. (1956).** "A New Interpretation of Information Rate." *Bell System Technical Journal*, 35(4), 917–926.
- Source: AT&T-authorized reproduction hosted at Princeton University — https://www.princeton.edu/~wbialek/rome/refs/kelly_56.pdf · File: `Kelly-1956-NewInterpretationInformationRate.pdf` · 0.10 MB · 10 pp.
- Plugs into: **GSE engine** — the original Kelly paper; the sizing layer's primary source (Thorp's treatment is paywalled — see gap list).

## 7. Rating systems

**Dixon, M. J., & Coles, S. G. (1997)** — *not in hand; see gap list.* In-hand coverage of the ratings topic:

**Glickman, M. E. (1999).** "The Glicko System." Boston University (author's technical document).
- Source: author's site — http://www.glicko.net/glicko/glicko.pdf · File: `Glickman-1999-GlickoRatingSystem.pdf` · 0.13 MB · 6 pp.
- Plugs into: **GSE engine** — rating-with-uncertainty (RD) machinery; the Bayesian answer to Elo for team/player ratings with stale or sparse schedules.

**Glickman, M. E. (2022).** "Example of the Glicko-2 System." Boston University (author's worked specification, rev. March 22, 2022).
- Source: author's site — http://www.glicko.net/glicko/glicko2.pdf · File: `Glickman-2022-Glicko2WorkedExample.pdf` · 0.12 MB · 6 pp.
- Plugs into: **GSE engine** — the step-by-step Glicko-2 algorithm (volatility included), implementable directly from this document.

## 8. Walk-forward validation & backtest overfitting

**Bailey, D. H., & López de Prado, M. (2014).** "The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality." *Journal of Portfolio Management*, 40(5), 94–107.
- Source: author PDF — https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf · File: `BaileyLopezdePrado-2014-DeflatedSharpeRatio.pdf` · 1.00 MB · 22 pp.
- Plugs into: **calibration program / GSE engine** — the multiple-testing correction applied before any engine edge is called real.

**Bailey, D. H., Borwein, J. M., López de Prado, M., & Zhu, Q. J. (2017).** "The Probability of Backtest Overfitting." *Journal of Computational Finance*, 20(4), 39–69.
- Source: author PDF — https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf · File: `Bailey-2017-ProbabilityOfBacktestOverfitting.pdf` · 1.09 MB · 34 pp.
- Plugs into: **calibration program** — PBO via combinatorially symmetric cross-validation; the formal gate for the engine's walk-forward registry.

## 9. RL for agents

**Luo, X., Zhang, Y., He, Z., Wang, Z., Zhao, S., Li, D., Qiu, L. K., & Yang, Y. (2025).** "Agent Lightning: Train ANY AI Agents with Reinforcement Learning." Microsoft Research.
- Source: https://arxiv.org/abs/2508.03680 · File: `Luo-2025-AgentLightning.pdf` · 1.97 MB · 20 pp.
- Plugs into: **fleet agents** — the paper behind today's sweep find (microsoft/agent-lightning, MIT): RL training decoupled from agent execution, i.e., train the existing fleet without rewriting it.

**Wang, L., Ma, C., Feng, X., et al. (2025).** "A Survey on Large Language Model Based Autonomous Agents." *Frontiers of Computer Science*, 19(6). (arXiv version v7, 2025.)
- Source: https://arxiv.org/abs/2308.11432 · File: `Wang-2024-SurveyLLMAutonomousAgents.pdf` · 5.52 MB · 42 pp.
- Plugs into: **fleet agents** — the architecture/profile/memory/planning map for the agent fleet's design reviews.

**Xi, Z., Chen, W., Guo, X., et al. (2023).** "The Rise and Potential of Large Language Model Based Agents: A Survey."
- Source: https://arxiv.org/abs/2309.07864 · File: `Xi-2023-RisePotentialLLMbasedAgents.pdf` · 6.52 MB · 86 pp.
- Plugs into: **fleet agents** — the second core survey: agent societies, evaluation benchmarks, and open problems for multi-agent operations.

## 10. Survival / hazard & distributed lag

**Gasparrini, A. (2014).** "Modeling Exposure-Lag-Response Associations with Distributed Lag Non-Linear Models." *Statistics in Medicine*, 33(5), 881–899. (Open access, CC-BY.)
- Source: LSHTM institutional repository / PMC4098103 — https://researchonline.lshtm.ac.uk/id/eprint/1217025/1/sim0033-0881.PMC4098103.pdf · File: `Gasparrini-2014-DistributedLagNonLinearModels.pdf` · 1.42 MB · 19 pp.
- Plugs into: **conformal-ot kernel / GSE engine** — the DLNM cross-basis framework behind the kernel's distributed-lag kinematic fatigue curves: how past workload decays into current hazard.

**Therneau, T. (2026 rev.).** "A Package for Survival Analysis in R." (The `survival` package vignette — the standard applied survival-analysis reference, living document, current revision September 9, 2026.)
- Source: CRAN — https://cran.r-project.org/web/packages/survival/vignettes/survival.pdf · File: `Therneau-2024-SurvivalAnalysisInR-Vignette.pdf` · 0.68 MB · 100 pp.
- Plugs into: **GSE engine** — Cox models, counting-process data, and time-varying covariates as actually implemented; the working manual for hazard modeling of player workload/injury risk (Cox 1972 itself is paywalled — see gap list).

---

## Gap list — not obtained in full, legally, this batch

1. **Vovk, Gammerman & Shafer (2005), *Algorithmic Learning in a Random World* (Springer)** — paywalled book, no author-posted full text. *Substituted by:* Shafer & Vovk (2008) JMLR tutorial + Angelopoulos & Bates (2023), both in hand. *Closes with:* library or institutional SpringerLink access.
2. **Hyndman & Athanasopoulos (2021), *Forecasting: Principles and Practice*, 3rd ed.** — the full book is free, but the official edition is **HTML-only** at https://otexts.com/fpp3/ ; no official PDF exists, so there was no PDF to verify. *Closes with:* reading online, or a batch-2 print-to-PDF rendering of the HTML edition (a rendering, not the publisher's PDF).
3. **Tetlock & Gardner (2015), *Superforecasting* (Crown)** — paywalled trade book. *Substituted by:* the underlying peer-reviewed research — Mellers et al. (2015) and Nikolopoulos et al. (2021), both in hand. *Closes with:* purchase or library copy.
4. **Thorp, E. O. (2006), "The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market," in *Handbook of Asset and Liability Management*, Vol. 1 (Elsevier)** — paywalled chapter; the copy on Thorp's own site did not resolve to a PDF this batch. *In hand instead:* Kelly (1956) itself. *Closes with:* retrying the author-site file or a library copy.
5. **Dixon, M. J., & Coles, S. G. (1997), "Modelling Association Football Scores and Inefficiencies in the Football Betting Market," *JRSS-C*, 46(2), 265–280** — journal paywalled; the university course mirror that hosts it (Univ. of Copenhagen) dropped every connection this batch, and the only other copies surfaced sit on gray hosts that the source rules exclude. *Closes with:* a retry of the Copenhagen mirror or the Lancaster repository.
6. **Bradley & Terry (1952), *Biometrika* 39, 324–345** — paywalled original. The two standard free full texts — Hunter (2004), "MM Algorithms for Generalized Bradley-Terry Models," *Annals of Statistics* 32(1), author PDF at Penn State, and Turner & Firth (2012), "Bradley-Terry Models in R," *Journal of Statistical Software* 48(9), open access — are both legitimately free, but both servers (sites.stat.psu.edu, jstatsoft.org) dropped every connection during this batch. *Closes with:* a plain retry; both are one download away.
7. **Cox, D. R. (1972), "Regression Models and Life-Tables," *JRSS-B* 34(2), 187–220; Kaplan & Meier (1958), *JASA* 53, 457–481** — paywalled originals. *Substituted by:* Therneau's 100-page survival vignette (in hand) for applied Cox/hazard work. *Closes with:* library/JSTOR access.
8. **Murphy, A. H. (1973), "A New Vector Partition of the Probability Score," *J. Applied Meteorology* 12, 595–600; Dawid, A. P. (1984), "Statistical Theory: The Prequential Approach," *JRSS-A* 147, 278–292** — paywalled originals. The Murphy decomposition is fully presented inside Gneiting & Raftery (2007), in hand. A further attempt (Dimitriadis, Gneiting & Jordan on stable reliability diagrams) was **rejected during verification** — an arXiv ID collision delivered an unrelated object-tracking paper. *Closes with:* retrying with a verified identifier, plus library access for Murphy/Dawid.
9. **Bergmeir, C., Hyndman, R. J., & Koo, B. (2018), "A Note on the Validity of Cross-Validation for Evaluating Autoregressive Time Series Prediction," *Computational Statistics & Data Analysis* 120, 70–83** — the dedicated walk-forward/time-series-CV paper; the author-site PDF came down corrupt (an HTML error page, caught on verification and discarded). Batch 1 covers overfitting via Bailey ×2, but this specific CV-validity paper is a real gap. *Closes with:* retry via Monash working-paper series.
10. **James, G., Witten, D., Hastie, T., Tibshirani, R., & Taylor, J. (2023), *An Introduction to Statistical Learning* (Springer; Python ed.)** — the authors give the full PDF free at statlearning.com, but the download sits behind image links whose direct file URL did not resolve this batch. *Closes with:* one browser click-through to capture the file URL.
11. **Morton, R. H., Fitz-Clarke, J. R., & Banister, E. W. (1990), "Modeling Human Performance in Running," *Journal of Applied Physiology* 69, 1171–1177** — the Banister impulse-response (fitness-fatigue) model; paywalled. The fatigue-curve material is partially covered in hand by Gasparrini (2014) on lag structures and Therneau on hazards. *Closes with:* library copy.
12. **Nelsen, R. B. (2006), *An Introduction to Copulas* (Springer); Joe, H. (1997), *Multivariate Models and Dependence Concepts* (Chapman & Hall)** — paywalled books. *Substituted by:* Patton (2012) survey + Embrechts et al. (2002), both in hand. *Closes with:* library copies.

**Net:** every one of the 10 topics has verified full text in hand. The gaps are specific named originals (mostly pre-digital journal articles and trade books) whose material is covered by in-hand substitutes, plus four items (Bradley-Terry ×2, Bergmeir CV, ISL) that are legitimately free and failed only on server/resolution issues — all four are batch-2 quick closes.
