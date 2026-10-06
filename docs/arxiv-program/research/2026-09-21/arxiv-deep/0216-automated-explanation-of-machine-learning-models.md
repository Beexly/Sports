# [0216] Automated Explanation of Machine Learning Models of Footballing Actions in Words (arXiv:2504.00767v1)

**Citation:** Pegah Rahimian, Jernej Flisar, David Sumpter (2025). *Automated explanation of machine learning models of footballing actions in words*. arXiv:2504.00767v1. URL: https://arxiv.org/abs/2504.00767
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 860 lines).
**Verdict:** ADAPT — the **wordalisation** pipeline (interpretable additive model → mean-centered feature contributions → synthesized factual text → LLM few-shot rewriting) is directly portable to GSE's public pick-explanation lane: turn engine-pick feature contributions into engaging, faithful pick narratives for X posts, feed articles, and newsletters. The paper's engagement-vs-accuracy tradeoff result (full wordalisation = highest engagement + second-highest accuracy) is the design lesson to carry over.

## 1. Research question
How do we bridge the gap between ML model outputs and how coaches/practitioners talk about football? Approach: build "wordalisations" — LLM-generated narratives that convert a model's numerical feature contributions into plain-language, entertaining descriptions of shots in football. Example model: logistic-regression expected goals (xG). Contributions: a 4-step prompt-engineering protocol, an engagement-vs-accuracy automated evaluation, an interactive Streamlit app (shotsgpt.streamlit.app), a model card, and code at github.com/Peggy4444/shotsGPT.

## 2. Dataset / schema
Hudl-StatsBomb events dataset (110 columns per event) + StatsBomb360 (7 columns, visible player positions), accessed via statsbombpy. Competitions: EURO Men 2024 & 2022, NWSL 2018, FIFA 2022, FAWSL 2017, AFCON 2023. Pitch fixed at 105×68 m. Separate xG models fit per competition (6 competitions). Feature engineering (11 retained features): squared distance to center; euclidean distance to goal; nearby opponents in 3 m; opponents in triangle (shot location + goalposts); goalkeeper distance to goal; distance to nearest opponent; angle to goalkeeper; shot with left foot (binary); shot after throw-in; shot after corner; shot after free-kick (binaries). Dropped during selection: angle to goal (Pearson R=0.88 with angle to goalkeeper), distance to goalkeeper (R=0.81 with distance to goal), angle to nearest opponent (p>0.05). Kept despite p>0.05: shot-after-throw-in, nearby opponents (interpretable context).

## 3. Method / model
Three-stage pipeline (Fig. 1):
1. **Interpretable model:** logistic regression xG, fit per competition. Linear in log-odds → contributions are exact, no approximation.
2. **Synthesis ("tell it what data to use"):** convert xG value and per-feature contributions to words. xG → percentile categories: "slim chance" (<25th pct, xG < 0.028), "low chance" (<50th, <0.056), "decent chance" (<75th, <0.096), "high-quality chance" (<90th, <0.3), "excellent chance" (>90th, >0.3). Continuous features → percentile bins ("close-range", "tight angle"); binary features → template sentences. Contributions ranked by magnitude; only |contribution| > 0.1 log-odds included (threshold "somewhat arbitrary" — ±0.1 → small log-odds shifts).
3. **Wordalisation (4-step prompt protocol):** (i) "Tell it who it is" — system prompt sets the shot-commentator role; (ii) "Tell it what it knows" — 43 football Q/A pairs (github.com/soccermatics/twelve-gpt-educational); (iii) "Tell it what data to use" — synthesized text; (iv) "Tell it how to answer" — 3 human-written few-shot examples constraining length and sentence structure. Example: Florian Wirtz, Germany vs Scotland EURO 2024, 85th-min shot, xG 0.14 → "What a strike from Wirtz! Turning a high quality (0.15 xG) chance into a stunning goal…"
**Evaluation:** automated, LLM-judged. Engagement: "Rank this text 0–5 for how interesting and engaging it is" (averaged over shots, 10 runs). Accuracy: LLM asked "was [Feature] a positive, negative, or not contributing factor?" vs ground truth (|contribution|>0.1 rule). 5 cases: (1) quality+features only; (2) +contributions; (3) wordalisation minus knowledge/answer steps; (4) full wordalisation; (5) raw numbers baseline. Extension demo (§3.5): expected-threat (xT) action-based logistic model over 3 seasons of top-5-league pass/carry data → player passing wordalisations (Fig. 8).

## 4. Equations & assumptions
Equations quoted faithfully:
- (1) log-odds(**x**) = β₀ + Σ_{j=1}^{M} β_j x_j.
- (2) Contribution of x_j = β_j · x̃_j, where x̃_j = x_j − μ_j (mean-centered across the dataset's shots).
- (3) P(y=1|**x**) = 1 / (1 + e^{−log-odds(**x**)}) — the xG.
- SHAP explanation model: g(**z**′) = φ₀ + Σ_{i=1}^{M} φ_i z′_i; for the logistic model, Eq. (1) *is* a ready-made g(**z**′) because it is linear in the features — the paper's key structural insight, contrasted with xGBoost/SHAP pipelines (Anzer & Bauer 2021) where wordalisation of SHAP values is "an interesting and open research challenge."
**Assumptions:** mean-centered contribution = "what was unusual about this shot relative to the dataset"; ±0.1 log-odds significance threshold; LLM-as-judge for both engagement and accuracy; percentile categories from competition-specific xG distributions.

## 5. Features / target
Inputs: the 11 engineered shot features above (position, goalkeeper, opponent-pressure, play-pattern, body-part). Target: P(goal | shot) = xG. All features chosen to be interpretable ("shooter sight on goal" as a coaching concept). xT extension: pass/carry features → P(pass eventually leads to a goal chain).

## 6. Validation design
No predictive benchmarking (xG model quality is deliberately secondary — "our aim is not to build the 'best' expected goals model"). Validation is of the *explanations*: the 5-case engagement/accuracy protocol above, 10 runs with std shown (Fig. 7). Qualitative: contribution plots for Germany–Scotland EURO 2024 shots (56th min, xG 0.03, 4 opponents in triangle → strongly negative; 85th min, xG 0.14, 1 opponent in triangle → positive), and NWSL 2018 shots (distance-to-nearest-opponent outweighing dominant distance features). No human evaluation by coaches — explicitly flagged as next work (§4).

## 7. Numerical results / baselines
- **Tradeoff result (Fig. 7):** Case 2 (descriptive quality + features + contributions) = **highest accuracy** (for the two strongest features, euclidean distance to goal and vertical distance to center) but low engagement. Case 4 (full wordalisation) = **highest engagement** and second-highest accuracy — the authors' recommended operating point. Case 3 (ablating knowledge/answer steps) is worse than Case 4, confirming the prompt-protocol steps matter. Case 5 (raw numbers) is the low-engagement baseline.
- Contribution-plot finding: euclidean distance to goal and vertical distance to center are the dominant features overall, but context-dependent reversals occur (e.g., distance to nearest opponent dominating both in the NWSL examples).
- Worked examples with exact numbers: Germany vs Scotland, 56th-min shot xG = 0.03 (4 opponents in triangle); 85th-min Wirtz shot xG = 0.14 → "high-quality chance" (percentile category), described as "very close to the center of the pitch… multiple opponents blocking the path… goalkeeper very close to the goal."

## 8. Code / data availability
Code: github.com/Peggy4444/shotsGPT (description class at classes/description.py, model card at model cards/model-card-shot-xG-analysis.md). App: shotsgpt.streamlit.app (select competition → model summary → per-shot contribution plots → synthesized text → full LLM message sequence). Q/A knowledge base: github.com/soccermatics/twelve-gpt-educational. Data: StatsBomb open data (free). Fully reproducible.

## 9. Leakage & limitations
- No human evaluation by coaches — engagement/accuracy are LLM-judged; a "coach finds this useful?" study is explicitly future work. GSE must do its own human check (Garrett's voice standard).
- Accuracy evaluation covers only the two strongest features, not the full contribution set.
- The ±0.1 log-odds threshold is arbitrary; percentile categories are competition-specific and would shift across contexts.
- Authors are candid that for non-linear models (xGBoost), wordalisation via SHAP is unsolved — the clean recipe only works for additive/linear models. GSE's engine (v5.2.7) must be decomposable to feature contributions (SHAP values or linear surrogates) for the same trick.
- LLM hallucination risk: the few-shot "entertaining" rewrite can embellish beyond the synthesized facts (their own tradeoff shows engagement costs accuracy); needs a fidelity gate.

## 10. GSE overlap
Direct conceptual overlap with GSE's public-content operation: @GalaxySportsHQ posts public picks daily and explains them; the feed/newsletter explain engine outputs. No existing repo work covers *automated natural-language explanation* of model outputs (the repo has SHAP-adjacent calibration material but no wordalisation lane). The xG/shots domain doesn't transfer, but the **method does**: GSE's engine produces per-pick predictions from features (matchup, market, injuries) — exactly the setup wordalisation needs. This is the paper in Wave 1 Worker 2's batch with the clearest content-lane application.

## 11. GSE implementation spec
Build a **pick wordalisation** pipeline for GSE's public content:
1. **Contribution layer:** for each engine pick (SPREAD/MONEYLINE/TOTAL), extract per-feature contributions. If the engine model is linear/additive, use exact β_j·x̃_j as in Eq. (2); otherwise compute SHAP values (φ_i) as the contribution source — same protocol, with the paper's caveat noted.
2. **Synthesis layer:** map the engine's edge/probability to percentile categories calibrated on the engine's own history ("slim edge" / "solid edge" / "premium edge"), and map key features (rest differential, market move, matchup rating) to percentile-binned phrases ("well-rested", "sharp market move toward us"). Rank contributions; keep |contribution| > τ (calibrate τ on GSE data).
3. **Wordalisation layer:** 4-step protocol — (i) system prompt = "GSE analyst, dry humor, no cheap shots, per ops/x-copy-rules.md"; (ii) "tell it what it knows" = NFL/GSE domain Q/A bank (build ~40 pairs: vig, closing line value, key numbers, etc.); (iii) synthesized pick text; (iv) "tell it how to answer" = 3 few-shot examples in Garrett's approved voice (human-written, ≥9.2 floor). Reuse the X voice infrastructure (qi-check gate) as the fidelity bar.
4. Effort: ~3–5 days. Data: engine picks DB (in hand) + contribution values. Cost: one LLM call per pick.

## 12. Reproducible test
Sample 50 recent engine picks. For each, generate the full wordalisation and a Case-2-style descriptive-only version. **Accuracy:** an independent LLM judge (or script) checks each generated sentence's claimed factor directions against the true contribution signs — require ≥ 90% sentence-level fidelity. **Engagement:** Garrett rates 20 blinded pairs (wordalised vs descriptive) on the 0–5 scale; wordalised must win by ≥ 0.5 points on average while holding fidelity. Baseline: raw feature dump.

## 13. Acceptance / rejection gate
**Adopt** as a draft-generation step (human/voice-gate approval before posting, per standing rules) if: (a) sentence-level fidelity ≥ 90% on the 50-pick test, and (b) Garrett's blinded engagement rating favors wordalised by ≥ 0.5 points, and (c) contribution extraction runs automatically on the daily engine output. **Reject** (keep as reference) if fidelity < 85% — an entertaining-but-wrong explainer is worse than a dry-but-right one for a "show your work" brand.

## 14. Improvement experiment
Go beyond the paper in two ways: (a) replace their LLM-as-judge accuracy metric with **deterministic fidelity checking** — a script that parses claimed factor directions from the generated text and compares against true contribution signs (no LLM judge needed, exact and cheap); (b) test the paper's open question directly — wordalise the engine's actual model via SHAP values instead of requiring a linear model, and measure whether the engagement/accuracy tradeoff curve (their Fig. 7) holds for a non-additive model, which the authors left as unsolved.
