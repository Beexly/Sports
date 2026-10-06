# [1854] SMARTFEAT: Efficient Feature Construction through Feature-Level Foundation Model Interactions (arXiv:2309.07856)

**Citation:** Yin Lin, Bolin Ding, H. V. Jagadish, Jingren Zhou (2024). *SMARTFEAT: Efficient Feature Construction through Feature-Level Foundation Model Interactions*. arXiv:2309.07856v3. URL: https://arxiv.org/abs/2309.07856
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, lines 0–1237, incl. Table 7 tail, final remarks (§5), full references).
**Verdict:** ADAPT

Rationale: the feature-level (not row-level) FM interaction design and the operator-selector/function-generator split are a cost-efficient architecture worth porting, and the Tennis sports result is encouraging — but the paper is tabular-classification-only with no temporal-leakage discipline, and the external-source extractor needs a timestamp guard before GSE use.

## 1. Research question
How can foundation models do automated feature engineering efficiently — interacting at the *feature level* (dataset description → operator → code) rather than the row level (serialize every row, predict masked tokens) — so that API cost scales with features, not rows, while an operator-guided search space keeps coverage comprehensive?

## 2. Dataset / schema
8 Kaggle binary-classification datasets: Diabetes (769×9), Heart (3,657, 7 cat/7 num), Bank (41,189, 8/10), Adult (30,163, 8/6), Housing (20,641, 1/8), Lawschool (4,591, 5/7), West Nile Virus (10,507, 3/8), Tennis (944, 0/12 — sports). Six downstream models (LR, GaussianNB, RF, Extra Trees, DNN with 2×100 ReLU layers, all defaults). Metric: AUC. Protocol: 75/25 train/test, 10-fold CV; 60-minute timeout per experiment. All datasets public (Kaggle).

## 3. Method / model
Two-stage loop at the feature level. (1) Operator selector (GPT-4): reads the dataset description, prediction class, and downstream model, picks a subset of operators — avoiding exhaustive enumeration — outputting the new feature's name, relevant columns, and description. Four operator types: unary (normalization, bucketization, get_dummies, date splitting), binary (+, −, ×, ÷), high-order (groupby aggregations: mean/max/etc. over categorical columns), and extractor (complex multi-input transforms, weighted indices, external-source lookups like city population density). Two prompting strategies: proposal (enumerate all candidates with confidence levels certain/high/medium/low, keep certain/high — best for small search spaces like unary ops) and sampling (i.i.d. chain-of-thought draws under a budget of 10 — best for rich spaces like groupby). Operator order in the pipeline: unary via proposal on each original feature → binary + high-order via sampling on original+unary features → extractors via sampling. (2) Function generator (GPT-3.5-turbo): turns the selector output into an executable transformation (dataframe builtins or lambdas); three scenarios — derive executable function (normal case; FM helps choose bucket boundaries, library imports), no explicit function → row-level masked-token completion (expensive; user decides if worth it), neither → suggest external data sources/APIs (open-world knowledge, e.g., population density). New features are appended to the dataset description (data agenda) so later iterations compose on them. Added: a drop heuristic (if an original feature undergoes a unary transform and is used by no other operator, remove it) and basic verification (drop highly-null, single-valued, or high-cardinality-dummy features). Differentiators: vs. CAAFE — operator-based search space instead of free-form chain-of-thought code generation; vs. row-level FM methods — feature-level interaction keeps API calls O(features) instead of O(rows).

## 4. Equations & assumptions
- Proposal strategy: candidates ∼ propose(· | descr, y, model); FM lists all plausible operators with confidence (certain/high/medium/low); keep certain/high.
- Sampling strategy: one candidate at a time, i.i.d. ∼ p(descr, y, model) via chain-of-thought; continues until a sampling budget (10) or an error threshold (invalid/repeated features) is hit.
- No equations stated beyond the sampling/proposal formulations. Stated assumptions: the dataset description carries enough semantics for the selector to choose valid operators (tested explicitly — see the feature-description ablation in section 7); the FM's open-world knowledge is trustworthy for external-source suggestions (the authors themselves flag error risk in §5); proposal is efficient for small spaces, sampling for rich spaces (groupby column selection grows exponentially).

## 5. Features / target
Target: binary classification label per dataset. Generated features by operator type (unary/binary/high-order/extractor), with Tennis ablation showing binary and extractor operators contribute most of the gain. Feature importance on Tennis (Table 6): SMARTFEAT generated 25 features, IG@10 90%, RFE@10 80%, FI@10 80% — 80–90% of generated features land in the top-10 by information gain, RFE, and tree importance (vs. CAAFE 5 features all important; Featuretools 89 generated/35 selected, 90%; AutoFeat 1,978 generated/5 selected, 10%). Feature-description ablation (Tennis, names only, no descriptions): AUC dropped to 77.86 (−1.4%) for the average and 79.39 (+2.2%) for the median — informative descriptions matter most when feature names are uninformative (Tennis names are abbreviations like "FSW.1" = First Serve Percentage player 1). For GSE: feature-name dictionaries should be written in plain English before handing them to the FM.

## 6. Validation design
75/25 train/test with 10-fold CV, 6 downstream models at default settings, metric AUC, 60-minute timeout per experiment. Baselines: Featuretools/DSM, AutoFeat, CAAFE (GPT-4, 10 iterations). Per-model AUCs tabulated (Table 7, Tennis): LR 88.17/88.27/88.51/88.22/88.53/88.06 — essentially flat (LR gains nothing from FE); NB 66.85/65.16/79.68/66.49/90.00/84.05; RF 80.41/81.17/87.38/80.15/89.88/89.56; ET 79.14/75.14/88.02/77.56/90.04/88.86; DNN 84.50/87.31/87.57/86.08/86.92/86.46; average 79.81/79.41/86.31/79.70/89.07/87.39. Interpretation offered by the authors: extractor features are mainly index-like attributes computed from attribute combinations; DNN benefits from almost all feature types — attributed to Tennis being small (simple models with well-constructed features win); on West Nile Virus the most beneficial features are the high-order-operator ones.

## 7. Numerical results / baselines
- Average AUC (Table 4): SMARTFEAT wins 5/8 datasets. Adult 76.81 → 87.00 (+13.3%); Tennis 77.93 → 87.39 (+9.5%); Heart 67.38 → 72.15 (+7.0%); Housing 86.72 → 92.19 (+6.3%); Diabetes 82.20 → 86.76 (+4.3%); West Nile Virus 78.96 → 82.12 (+4.0%). Bank ≈ unchanged; Lawschool −0.4% (well-constructed original features — honest null result).
- Median AUC (Table 5) shows the same pattern; Tennis median 80.41 → 88.06 (+9.5%).
- CAAFE beats SMARTFEAT on Tennis (avg +13.6% vs. +9.5%) — numerical-combination tasks favor CAAFE's free-form code gen; SMARTFEAT wins where diverse operator types matter (West Nile Virus).
- Featuretools and AutoFeat frequently *hurt* AUC (e.g., AutoFeat −10.5% on Housing, −15.6% median on Tennis) — context-agnostic enumeration is actively harmful.
- Efficiency: SMARTFEAT and Featuretools finish under 10 min on all datasets; AutoFeat exceeds the 60-min timeout; CAAFE times out on the DNN for the three large datasets (its per-iteration validation step is expensive).

## 8. Code / data availability
Public GitHub repo (github.com/niceIrene/SMARTFEAT) with prompt details and datasets, per the paper. Datasets are Kaggle-public.

## 9. Leakage & limitations
- Honest nulls: Bank and Lawschool show no improvement — when original features are well-constructed, FE adds nothing. Same lesson as CRAFTER's saturated cells.
- The extractor's external-source path (e.g., city population density) has no cost/accuracy accounting and can leak post-outcome information if the external source postdates the prediction point — GSE must time-stamp external lookups.
- The drop heuristic (remove unary-transformed unused originals) is crude; using FMs for feature *removal* is left as future work.
- No temporal discipline: tabular classification only, no leakage/lookahead constraints — same adaptation requirement as the other tabular papers in this wave.
- CAAFE's Diabetes failure (divide-by-zero NaN crashing models) is a cautionary tale the paper surfaces: generated code needs sandboxed validation, which SMARTFEAT only partially provides.
- GPT-4 for the operator selector on every dataset is a real cost line; the paper doesn't report API spend.
- Final remarks (§5): FMs can leverage context and open-world knowledge for feature generation, but feeding them full-table linearizations is infeasible on efficiency/cost grounds — hence the operator-guided feature-level interaction design. FMs remain susceptible to unpredictable errors (limited data context, generative nature); SMARTFEAT mitigates this with feature selection rather than trusting FM output. Experiments demonstrate the advantages; further work needed on error handling.

## 10. GSE overlap
The feature-level vs. row-level efficiency argument is the production-relevant one: GSE's game panels are wide (hundreds of columns) but the FM interaction should scale with features, not rows. SMARTFEAT's two-stage split (selector picks *what*, generator writes *how*) maps cleanly onto a cost-controlled LLM feature pipeline. The proposal-vs-sampling strategy choice is a practical knob: proposal for small, well-understood operator sets (unary transforms on a fixed column list); sampling with a budget for open-ended groupby/market-interaction search. The Tennis result (+9.5% AUC on a sports dataset) is the closest thing in this wave to a sports-domain validation of FM feature engineering. The extractor operator is the analog of ELATE's open-world knowledge: external data (weather APIs, injury reports) suggested by the FM and joined as features — with the leakage caveat above. This is a new capability (cost-controlled two-stage LLM feature pipeline), not a duplicate of existing GSE work.

## 11. GSE implementation spec
Sports bridge: NFL game panel — operator selector reads the column descriptions (box-score stats, market lines, weather, rest) and the prediction class (cover/no-cover); proposes unary (bucketize temperature, normalize yardage), binary (yards per play differentials), high-order (groupby team/season aggregations of EPA), and extractor (weather-API wind chill, injury-report counts) features; function generator emits pandas code; groupby features are exactly the rolling team-strength features GSE needs. The Tennis ablation (binary + extractor matter most) suggests prioritizing interaction and external-data features over unary transforms for sports.

Concrete build plan:
1. Dataset description builder: column names, dtypes, domain notes, prediction class, downstream model — stored as the versioned "data agenda" (write column descriptions in plain English, per the description-ablation finding).
2. Operator selector (flagship LLM, zero-shot): prompt templates per operator type; proposal strategy for unary, sampling (budget 10) for binary/high-order/extractor; output = (feature name, relevant columns, description, confidence).
3. Function generator (cheaper LLM): emit executable pandas/lambda code; AST-validate; sandbox-execute; fall back to (a) user-approved row-level completion or (b) external-source suggestion with a timestamp-leakage check.
4. Verification: drop highly-null/single-valued/high-cardinality-dummy features; apply the drop heuristic for unused unary-transformed originals.
5. Leakage contract: groupby aggregations restricted to past rows (walk-forward); external sources must predate the prediction point.
6. Iterate: append successful features to the data agenda so later rounds compose on them.

## 12. Reproducible test
Task: NFL game-outcome classification (cover vs. not) on 2019–2023 train / 2024 validation / 2025 test; downstream models LR, RF, XGB. Baselines: raw features, Featuretools (add_numeric/multiply_numeric/agg), AutoFeat (time-capped), CAAFE (10 iterations). Metrics: AUC (paper's metric) plus held-out log-loss; feature-count and wall-clock efficiency logged per method.

## 13. Acceptance / rejection gate
ADAPT if: ≥0.003 held-out NFL log-loss improvement on 2025 games versus the raw-features baseline, AUC improvement on the sports panel, ≤30 generated features (efficiency discipline from Table 6), all groupby/external features AST- and timestamp-verified causal, total pipeline runtime under 60 minutes. REJECT (do not port) if any of: no gate improvement, feature count exceeds the efficiency budget without proportional gain, external-source timestamps fail the pre-prediction check, or CAAFE beats it on the sports panel (free-form code wins on numerical combinations).

## 14. Improvement experiment
The paper's proposal-vs-sampling strategy knob rests on an untested assumption: that the FM's stated confidence (certain/high/medium/low) actually predicts feature value. Run a confidence-calibration study on GSE's NFL panel: collect every operator proposal with its stated confidence, generate the features, and plot the FM's confidence against realized validation log-loss lift — a reliability curve. If calibrated, confidence thresholds can gate API spend (only generate "certain/high" proposals, or route "medium/low" to the cheaper generator model). If uncalibrated, the strategy knob is arbitrary and GSE should replace self-reported confidence with a cheap surrogate scorer (e.g., ELATE's Granger+MI evaluator). Either outcome upgrades the pipeline: it converts an arbitrary heuristic into a measured cost-control dial.
