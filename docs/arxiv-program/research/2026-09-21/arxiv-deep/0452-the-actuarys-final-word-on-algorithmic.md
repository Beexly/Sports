# [0452] The Actuary's Final Word on Algorithmic Decision Making (arXiv:2509.04546v1)

**Citation:** Recht, B. (2026). *The Actuary's Final Word on Algorithmic Decision Making*. arXiv:2509.04546v1. URL: https://arxiv.org/abs/2509.04546v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 718 lines).
**Verdict:** ADAPT — adopt the paper's decision-theoretic doctrine for GSE: evaluate the engine strictly by proper scoring rules (Brier) on fixed machine-readable features, never by pundit override; and operationalize its "staleness" warning as a monitored, scheduled-retraining requirement.

## 1. Research question
Why does statistical (actuarial/algorithmic) prediction consistently beat expert clinical judgment — Meehl's 1954 "Clinical versus Statistical Prediction" finding, confirmed by a century of evidence — and under what precise conditions does this hold? Recht gives a contemporary decision-theoretic justification: Meehl's problems have (a) a small set of possible outcomes, (b) machine-readable data given equally to rule and clinician, and (c) evaluation by average score. Under (c), the optimal predictor is statistical *almost by definition* — "metrical determinism": the metric fixes the optimal action. The paper also delineates the costs: expertise erosion, decision fatigue, complacency, and statistical staleness.

## 2. Dataset / schema
No new dataset. Evidence reviewed from literature:
- Burgess (1928): 1,000 Illinois parole cases; 21 binary predictive factors (age, offense type, repeat offender, employment); psychiatrists' ternary judgments (likely/unlikely/uncertain to violate).
- Grove et al. (2000) meta-analysis: 136 clinical-vs-mechanical predictions.
- Ægisdóttir et al. (2006) meta-analysis: 48 predictions (56 years of accumulated research).
No sports data; outcomes are binary (recidivate/parole success, law-school success, suicide, treatment response).

## 3. Method / model
Expository/theoretical — no model trained. Core argument (Wald 1945 decision theory; Kay 1998 detection theory; Duda & Hart 1973 ERM):
1. Stratify individuals by identical feature vector x; let q_x = fraction with y_i=1 given x_i=x, n_x = count.
2. Average score decomposes: S_avg = Σ_{x∈X} (n_x/N){q_x S(p(x),1) + (1−q_x)S(p(x),0)}.
3. Retrospective-optimal prediction: p*(x) ∈ argmin_p q_x S(p,1) + (1−q_x)S(p,0) — a deterministic statistical function of data-conditional rates.
4. For Brier score (proper scoring rule), p*(x)=q_x; true for any strictly proper rule (Gneiting & Raftery 2007).
Conclusion: if prediction is possible at all (past ≈ future) and evaluation is by averages, the best predictor maximizes success rate within a rule class — statistics wins "when we evaluate predictions and decisions using statistics." The "broken leg" objection (Meehl's Professor Glotz example — actuarial table says 90% movie attendance Fridays, but a broken leg changes it): the clinician's exceptional-case detection must itself be checked actuarially; if the clinician's override hit-rate trails the table, ignore the override.
Caveats section: staleness (Vela et al. 2022 temporal degradation; Munger 2023 temporal validity; Koren 2009; García et al. 2014 — medical rules static for decades, ineffective within years); human costs — expertise erosion, decision fatigue, complacency (Klein 2011); narrowing of discretion (Farrell & Fourcade 2023).

## 4. Equations & assumptions
- S_avg = (1/N)Σ_{i∈I} S(p_i,y_i) = Σ_{x∈X}(n_x/N){(1/n_x)Σ_{i:x_i=x} S(p(x),y_i)} = Σ_{x∈X}(n_x/N){q_x S(p(x),1)+(1−q_x)S(p(x),0)}.
- Optimal: p*(x) ∈ argmin_p q_x S(p,1) + (1−q_x)S(p,0).
- Brier: S(p,y)=(p−y)² ⟹ p*(x)=q_x.
Assumptions (Meehl's scope conditions, made explicit): small outcome set; same machine-readable data for rule and human; evaluation on average score; stationarity ("we assert that we believe the future will be like the past"). The paper stresses the game is "rigged" — the conclusions hold only inside this box; open-ended problems need clinical expertise.

## 5. Features / target
Illustrative only: parole factors (21 binary); law-school admission (LSAT, grades, letters); no ML feature list. Target: binary outcomes.

## 6. Validation design
Literature review/meta-analysis summary — no experiment run by the author. Grove et al. (2000): 136 predictions; Ægisdóttir et al. (2006): 48 predictions. No splits, baselines, or metrics beyond the quoted accuracy differentials.

## 7. Numerical results / baselines
- Burgess (1928): of 68 men with ≥16 positive factors, only 1 recidivated; of 25 with <5 factors, 19 recidivated. Burgess rule (≥10 positive factors): 86% correct on unlikely-to-violate, 51% on likely-to-violate — vs. psychiatrist 1: 85%/30%; psychiatrist 2: 80%/51%. Rule predicted all parolees; psychiatrists left "uncertain" cases unpredicted.
- Grove et al. (2000), 136 predictions: 46% mechanical ≥0.05 accuracy better than clinical; 48% within ~0.05; <6% clinical substantially better; skew: when mechanical was better it was "more frequently far better."
- Ægisdóttir et al. (2006), 48 predictions: 52% favored statistical, 38% comparable, 10% favored clinical.
- Meehl (1986): "no controversy in social science that shows such a large body of qualitatively diverse studies coming out so uniformly in the same direction."

## 8. Code / data availability
None stated. (Historical studies; no code.)

## 9. Leakage & limitations
- The central result is close to tautological by the author's own admission ("metrical determinism") — it justifies evaluating by proper scores, but doesn't tell you how to build a good q_x estimator; all the hard work (features, staleness, missing data) is in the caveats.
- Staleness is flagged but not solved: NFL populations change fast (the paper cites medical rules decaying within years; NFL regimes shift within weeks).
- The "broken leg" rebuttal is too quick for sports: legitimate overrides (late injury news the model hasn't ingested) exist; the paper's answer (check overrides actuarially) is correct but requires the override-logging infrastructure most operations lack.
- Scope conditions exclude open-ended judgment — but GSE's product decisions (which games to post, how to size) are partly open-ended.
- No new empirical evidence; purely a synthesis/argument paper.

## 10. GSE overlap
**Extension — philosophical backbone for GSE's existing doctrine.** Per the existing-research map: GSE already evaluates by proper-adjacent metrics (Brier-adjacent calibration, CLV as training label, beat-the-close) and its copy doctrine is "let the numbers speak." This paper supplies the decision-theoretic *why*: under average-score evaluation, the engine's q_x *is* the optimal prediction, and pundit/override deviations must be logged and scored actuarially rather than trusted. New actionable content vs. the corpus: (a) the explicit proper-scoring-rule evaluation mandate (map shows calibration metrics but no Brier-score doctrine paper), (b) the staleness-monitoring requirement with citations (Vela 2022, Munger 2023), (c) the override-logging protocol ("study the success frequency of the clinician's guesses"). Complements paper 0451 (adaptation machinery) and 0450 (honest uncertainty). Not a duplicate of anything in the map.

## 11. GSE implementation spec
1. **Proper-score evaluation doctrine**: make Brier score (win prob) and log-loss the primary engine metrics on every evaluation slice, alongside existing calibration diagnostics; document that the engine's probability output is defined as the Brier-optimal q_x for its feature set.
2. **Override log**: any human override of an engine pick (Garrett or analyst) gets logged with the engine's original probability, the override, and the outcome; quarterly, score override hit-rate vs. engine hit-rate actuarially (Burgess-style); publish the comparison internally. If overrides trail, they get removed from the workflow.
3. **Staleness monitor**: track rolling 4-week Brier/log-loss vs. a frozen-reference baseline; alert when degradation exceeds a threshold (e.g., +0.01 Brier over 4 weeks); tie to the retraining cadence from 0451's meta layer.
4. **Scope guard**: keep the engine's remit inside Meehl's box (binary/ternary outcomes, fixed features); route open-ended decisions (game selection for posting, sizing policy) through explicit separate review, not the pick model.
Effort: ~2–3 days (metrics + override log + staleness dashboard); uses existing nflverse/odds data.

## 12. Reproducible test
Dataset: GSE engine pick history (2024–2025 seasons) with logged probabilities, plus any recorded human overrides. Metric: Brier score and log-loss, engine vs. override subset, on the same games. Baseline: engine's own Brier on those games. Test: (a) compute Brier for engine picks vs. human-overridden picks — expect engine ≤ override Brier (paper's prediction); (b) staleness check: split season into first/second halves, compare Brier; expect second-half degradation if no retraining (paper's staleness warning). Window: 2024–2025 full seasons.

## 13. Acceptance / rejection gate
Adopt the doctrine (§11) if either: (a) the override audit shows human overrides do not beat the engine on Brier over ≥100 overridden games (if they do beat it, adopt the override features into the model instead and keep overrides), or (b) the staleness check shows ≥0.005 Brier degradation second-half vs. first-half without retraining — confirming the maintenance requirement is real. Reject only if overrides consistently beat the engine (then the engine's feature set is the problem, not the doctrine) — in that case, fix features first.

## 14. Improvement experiment
Go beyond the paper: test the "broken leg" protocol as a *feature*, not an override — build an injury/news-ingestion latency metric (minutes from news break to model update) and measure how much of the override-vs-engine gap it explains. The paper says to check overrides actuarially; the experiment asks whether late-breaking information, once properly ingested as features, eliminates the apparent value of overrides entirely — turning Meehl's exception into just another x in the stratification.
