# [2052] FactorEngine: A Program-level Knowledge-Infused Factor Mining Framework for Quantitative Investment (arXiv:2603.16365)

**Citation:** Qinhong Lin, Ruitao Feng, Yinglun Feng, Zhenxin Huang, Yukun Chen, Zhongliang Yang (2026). *FactorEngine: A Program-level Knowledge-Infused Factor Mining Framework for Quantitative Investment*. arXiv:2603.16365v3. URL: https://arxiv.org/abs/2603.16365
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~10,700 words).
**Verdict:** ADAPT

*Why:* casting factors as Turing-complete *programs* (not bounded symbolic expressions) with macro/micro co-evolution is the most expressive mining architecture in this lane; the knowledge-infused bootstrapping from pre-period reports, with explicit leakage control, maps directly to GSE's sports-report/text corpus.

## 1. Research question
Symbolic factor mining is bounded by hand-designed operator sets; neural forecasters are uninterpretable and regime-fragile. Can a program-level framework — factors as Turing-complete code, three separations (logic revision vs. parameter optimization; LLM directional search vs. Bayesian hyperparameter search; LLM usage vs. local computation), plus knowledge-infused bootstrapping from unstructured financial reports — deliver more expressive, stable, auditable factors tractably?

## 2. Dataset / schema
Qlib full-market data, CSI300/CSI500 evaluation. Train 2008-01–2014-12, validation 2015–2016, test 2017-01–2024-12. OHLCV only. Backtest: mined factors merged with Alpha-158 into LGBM; top-50 assets held 5 days. **Leakage control:** knowledge-infused bootstrapping uses only financial research reports published before 2017 (no overlap with test period). Budgets: 200 and 400 iterations, one factor per iteration; 2 islands, migration every 7 iterations; init with 5/10 alphas or reports; α=β=γ=1 in Eq. 2, 4. Backbone: Gemini-2.5-Pro for all agent baselines (fair comparison); ablations also on Gemini-2.5-Flash-Lite and GPT-4o.

## 3. Method / model
Three separations:
1. **Logic revision vs. parameter optimization** — LLM agents do macro mutations (revise program logic); Bayesian optimization does micro parameter tuning (fast local validation).
2. **LLM-guided directional search vs. Bayesian hyperparameter search** — the LLM steers direction, Bayes tunes knobs.
3. **LLM usage vs. local computation** — expensive LLM calls reserved for logic; everything else local.
Plus: **knowledge-infused bootstrapping** — multi-agent extraction→verification→code-generation pipeline turns unstructured financial reports into executable factor programs seeding the pool; **experience knowledge base** — trajectory-aware refinement including learning from failures (chains of experience guide macro mutations). Integration stage: elite factors selected, LGBM trained, portfolio-level feedback returned.

## 4. Equations & assumptions
- Fitness weights α=β=γ=1 (Eq. 2, 4) — unweighted combination, admittedly arbitrary.
- Assumptions: reports' ideas are extractable into code faithfully; experience trajectories generalize; Bayesian micro-search on default priors is adequate; Gemini-2.5-Pro's pre-training knowledge (post-test-period) doesn't leak through agent reasoning — acknowledged, shared by all agent baselines.

## 5. Features / target
Inputs: OHLCV. Programs can use arbitrary control flow (Turing-complete). Target: forward return (via LGBM + top-50/5-day portfolio).

## 6. Validation design
Baselines: GPLearn, LGBM, LSTM, Transformer, TRA, AlphaAgent, RD-Agent-Quant, Alpha-158. Two variants: FE-alpha (seeded with manual factors) and FE-report (seeded from pre-2017 reports). Metrics: IC/ICIR/RankIC/RankICIR (predictive), AR/IR/MDD/SR (portfolio, excess over benchmark). Ablations: Bayesian micro-search vs. none; backbone LLM swap (Flash-Lite, GPT-4o).

## 7. Numerical results / baselines
Table 1, 400-iteration, **CSI300** — FE-report-2 best in all 8 columns: IC 0.0474 (Alpha158 0.0299, AlphaAgent-2 0.0314), ICIR 0.3185, RankIC 0.0475, RankICIR 0.3146, **AR 18.99%** (Alpha158 8.40%, RD-Agent-2 9.17%), |MDD| 12.61%, **IR 1.6001**, **SR 1.0093**.
**CSI500** — FE-report-2: IC 0.0536, ICIR 0.4140, AR 8.36%, IR 0.6719, SR 0.2945 (best or near-best).
Key internal comparisons: FE-report > FE-alpha at both budgets (report knowledge beats hand seeds); FE beats AlphaAgent and RD-Agent (the 2043/2051-class baselines) on every metric.
Ablation: Bayesian micro-search → best program score 0.38 vs 0.25 without, steeper improvement trajectory (less noisy fitness signal → promising logic promoted earlier).

## 8. Code / data availability
None stated (no repo URL in text). Qlib public; reports source unspecified.

## 9. Leakage & limitations
- Pre-2017-report rule is good hygiene, but Gemini-2.5-Pro was trained on post-2017 data — the agents' "reasoning" may smuggle future knowledge (authors acknowledge).
- Only 200/400 iterations, one factor per iteration — small by industry standards.
- α=β=γ=1 unweighted; no sensitivity analysis.
- 5-day top-50 rotation costs not detailed for FE runs (earlier papers' cost schedules presumably apply).
- Turing-complete programs risk overfitting more than symbolic forms; the paper leans on validation splits but shows no complexity-vs-performance curve.

## 10. GSE overlap
New capability; the report-to-program bootstrapping is unique in this lane. GSE's analogue: its corpus of sports analytics writing (its own research docs, public NGS material, market-structure notes) as the "report" pool. No overlap in the research map.

## 11. GSE implementation spec
1. Build the report-mining pipeline: multi-agent extraction (idea → pseudocode → executable Python signal) over GSE's own research corpus + licensed sports-analytics text, restricted to pre-season-cutoff publication dates (the 2017 rule analogue: nothing published after the validation window starts).
2. Macro/micro loop: LLM proposes signal-program logic revisions; Bayesian optimization tunes windows/thresholds locally with fast walk-forward validation.
3. Experience KB: store every mined signal's trajectory (hypothesis, code, validation curve, failure mode); feed failure summaries back as few-shot context for the next macro proposal.
4. Programs must be point-in-time safe (auditable code > opaque expressions).
5. Effort: ~3–4 weeks; the extraction pipeline is the new build, the evolution loop reuses 2045/2046.

## 12. Reproducible test
nflverse 2009–2025. Bootstrap from pre-2020 sports-analytics articles/reports only; mine 2009–2019, validate 2020–2021, test 2022–2025. Compare FE-style (report-seeded, program-level, macro/micro) vs. Alpha-158-style hand-signal baseline vs. pure GP. Metrics: test RankIC/IR, per-season stability, program complexity.

## 13. Acceptance / rejection gate
ADAPT→build if report-seeded program mining beats hand-seeded mining on test IR by ≥ 25% with no worse drawdown, AND at least 30% of surviving programs trace their core idea to an extracted report passage (knowledge infusion is real, not decorative). REJECT if FE-report ≈ FE-alpha — then the pipeline is just expensive GP.

## 14. Improvement experiment
Beyond the paper: **adversarial report dating** — the paper's pre-2017 cutoff is static; instead, run the extraction pipeline twice, once on pre-cutoff reports and once on post-cutoff reports, and *require* the mined programs to differ in their core logic (a placebo test for leakage: if post-cutoff reports produce suspiciously better programs, the LLM is recalling the future, not reading the report). Second: **failure-trajectory clustering** — cluster the experience KB's failed programs by failure mode (regime break, overfit, crowding) and train a lightweight classifier to kill doomed macro proposals before spending validation budget.
