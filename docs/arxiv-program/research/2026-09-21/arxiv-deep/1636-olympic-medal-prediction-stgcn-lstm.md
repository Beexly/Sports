# [1636] STGCN-LSTM for Olympic Medal Prediction: Dynamic Power Modeling and Causal Policy Optimization (arXiv:2501.17711)

**Citation:** Yiquan Wang, Jiaying Wang, Tin-Yeh Huang, Jingyi Yang, Zihao Xu (Xinjiang Univ. / Shenzhen X-Institute / Sichuan Univ. / HK PolyU / Hunan Inst. of Eng. / Univ. of Nottingham-Ningbo, 2026). *STGCN-LSTM for Olympic Medal Prediction: Dynamic Power Modeling and Causal Policy Optimization*. arXiv:2501.17711v1 [cs.LG], submitted Jan 2026. URL: https://arxiv.org/abs/2501.17711
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv HTML via cached text file).
**Verdict:** REJECT

the paper is a buzzword-stacked modeling collage with no portable, reproducible method: no code, no data tables, no repository, factual hallucinations (Lang Ping coaching table tennis), wrong half-life math twice, copy-paste table errors ("2028 Paris Olympics"), duplicated equations, internally inconsistent effect estimates, and causal claims reported to false precision without any described data-generating process. Nothing in it can be adapted with engineering integrity.

## 1. Research question
Forecast 2028 Los Angeles Olympic medal distributions with an STGCN-LSTM hybrid, separate structural from random zeros with a Zero-Inflated Compound Poisson model, and quantify coach-mobility and hosting effects with triple-difference (DDD) causal analysis — then optimize national sports-resource allocation.

## 2. Dataset / schema
Claimed: "1,413 observations from 1896 to 2024" across 189 sovereign nations + 47 historical regimes; COMAP historical medal data, World Population Review GDP; coaching-mobility scores, athlete counts, event networks. No dataset released, no schema table, no repository, no code link. Coach-mobility data source is never described — the variable driving the central "causal" claims has no provenance.

## 3. Method / model
Kitchen-sink stack: entity-mapping fuzzy matcher (Levenshtein/Jaro/partial), dynamic national-power weight matrix, PageRank event-influence index, GATConv spatio-temporal graph layers → bidirectional LSTM with attention/highway fusion → DeepEnsemble with HistGradientBoosting, XGBRegressor, TemporalTransformer; ZICP (EM + elastic net) for zero-inflated counts; BOCPD for change points; DDD triple-difference for coach effects; DML/IPW/matching for hosting effects; Markowitz mean-variance for resource allocation. Every named method is described at paragraph level; none is specified to reproducible depth (no layer sizes, no training protocol, no hyperparameters beyond dropout 0.3-style asides).

## 4. Equations & assumptions
Equations (1)–(30) are mostly decorative composites. Two are mathematically wrong as stated: λ=0.05 is claimed a "20-year half-life" (e^(−0.05×20)=0.37, not 0.5; true half-life ≈13.9 years); η=0.33 is claimed "half-life ∼3 Olympic cycles" (e^(−0.33×3)=0.37; true half-life ≈2.1 cycles). Equations (13) and (14) are the identical formula under two duplicated subsection titles ("Weighting Mechanism of Events" twice). The moderation model "Treatment Effect = 8.2 + 0.15×GDP + 1.2×Coach_Level + 0.8×Hist_Medals" never defines units — 0.15×GDP for any real GDP scale produces absurd values.

## 5. Features / target
Features: log-medals, log-GDP, sqrt-population, time-decayed national-power weights, coaching scores, athlete counts/growth/rates, event PageRank weights, host indicators. Target: medal counts (gold/silver/bronze/total) by country.

## 6. Validation design
"Triple validation framework": SMAPE backtracking across eras (Cold War 21.4%, globalization 17.8%, COVID 23.1%), policy-shock simulations (GDP ±5/15/30%), and causal counterfactuals. No holdout design described, no baseline comparisons (no naive persistence, no gravity model), no prediction intervals validated against actuals. The 2028 predictions are unfalsifiable at publication.

## 7. Numerical results / baselines
USA 43 gold [39,47], China 38 [35,41] for 2028; "~30 countries will win medals for the first time" with probabilities to 3 decimals (ANG 0.762, BOT 0.726, ...); hosting total effect 24.5±2.7 medals; DML/IPW/matching estimates 14.8/15.1/15.5 — suspiciously tight agreement. But §6.2 then claims a "2.3-medal average host country effect," internally inconsistent with §5.3's 24.5. Tables 2 and 3 are both mislabeled "2028 Paris Olympics" (Paris was 2024; LA is 2028), and Table 2 shows fractional gold declines (−1.60) for countries that win essentially zero medals — nonsensical outputs presented without comment.

## 8. Code / data availability
None. No repository, no data release, no supplementary code. The "build_spatio_temporal_graph function in the code" is referenced but the code is not shared.

## 9. Leakage & limitations
Fatal integrity problems, not just limitations: (a) **Lang Ping hallucination** — the paper's flagship causal example claims Chinese table tennis gained "3.5σ" and "4.2→7.1 medals per year after Lang Ping's tenure (2005–2016)"; Lang Ping is a volleyball coach who never coached table tennis. (b) Intro claims presented as fact — UK Sport's Bayesian network cutting cost-per-medal £5.5M→£4.1M, AIS LSTMs "+18% medal rates," French committee Monte Carlo "+22%," "XGBoost+ARIMA limits host-nation errors to ±3 medals" — are cited to unrelated references (an LSTM review, an LSTM search-space paper). (c) Named coaches ("Russian shooting coach Alexander Petrov") and precise investment prescriptions ("China 12→16 swimming medals in 3 years by hiring Denis Cotterell") are fan-fiction precision. (d) The paper reads as LLM-generated: decorative equations, duplicated subsections, mislabeled tables, false-precision decimals, and claims that contradict each other across sections.

## 10. GSE overlap
None portable. The causal-inference vocabulary (DDD, DML, IPW, event studies, placebo tests) is standard and available in real econometrics references; this paper's application of it is not trustworthy enough to serve as a template. Nothing in the modeling stack is specified reproducibly.

## 11. GSE implementation spec
Not applicable — rejected.

## 12. Reproducible test
Not applicable — rejected. No testable artifact exists.

## 13. Acceptance / rejection gate
Rejected on integrity grounds: factual hallucinations about real people, wrong mathematics presented as calibrated parameters, internally inconsistent headline numbers, copy-paste errors, zero code/data, and causal estimates to false precision from an undescribed data-generating process. Adopting or adapting any component would launder these defects into GSE's research record.

## 14. Improvement experiment
Not applicable — rejected. A fresh replacement paper is required for this slot.
