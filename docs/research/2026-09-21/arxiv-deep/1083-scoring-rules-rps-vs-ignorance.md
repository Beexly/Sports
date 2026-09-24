# 1083 — Evaluating probabilistic forecasts of football matches: The case against the Ranked Probability Score

## Citation / full-text source

- arXiv:1908.08980v1 — full text: https://arxiv.org/pdf/1908.08980
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 1908.08980v1
- **Full-text URL**: https://arxiv.org/pdf/1908.08980v1 (read in full; cached text 58,223 bytes, read cover to cover: rebuttal, both experiments, discussion, appendices, references)
- **Authors**: Edward Wheatcroft (LSE)
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: none (assigned paper, not rejected)
- **Reason for ADAPT**: GSE's model-selection protocol — which engine variant ships — is currently under-specified on *which score* decides. This paper gives a decisive, sports-specific answer backed by two experiments: the ignorance (log) score identifies the true data-generating forecasting system faster and more reliably than both the Brier score and the Ranked Probability Score (RPS), and it is the only proper *local* score — probability on non-occurring outcomes is unknowable noise, so rewarding it (as RPS/Brier do) wastes information. The mean relative ignorance between two systems has a direct interpretation GSE can publish: 2^{Δ} = mean multiplicative increase in probability placed on the outcome. Adopting ignorance as the engine-comparison metric is a one-line change with paper-grade justification and kills the "distance-sensitive scoring" temptation for NFL moneyline/spread-outcome forecasts.
- **Read depth**: FULL READ: scoring-rule definitions (Brier eq. 1, RPS eq. 2, ignorance eq. 3) and properties (propriety, locality, sensitivity to distance, equitable/regular/feasible), rebuttal of Constantinou & Fenton 2012 (five hypothetical matches, underlying-distribution argument, lay-bet and "indicativeness" counterarguments), aims of scoring rules (comparison, significance, information-bits interpretation), perfect vs imperfect model scenarios, Experiment 1 (repeated outcomes, n-sweep, non-monotonicity explanation for match 1), Experiment 2 (39,343 bookmaker-odds matches, δ-imperfection levels, pairwise 95% resampling intervals), discussion, Appendix A (football-data.co.uk, 5 English leagues, 32,820 matches), Appendix B (margin-normalized odds→probabilities), references.
- **Wave**: wave2-reader-20
- **GSE overlap**: The corpus has calibration methods (ENIR 1074, GP-PIT 1082, temperature scaling) but no ledger on *how to compare forecasting systems* — no scoring-rule-selection entry in the existing-research map. **New capability**: the model-selection metric itself.

## Research question

Is the Ranked Probability Score really the right scoring rule for football outcome forecasts, or does the ignorance (log) score identify the better model more reliably?

## Summary

The paper disputes the consensus (Constantinou & Fenton 2012) that the Ranked Probability Score is the right metric for football forecasts because it is "sensitive to distance" (home win "closer" to draw than away win). Core argument: without knowing the underlying outcome distribution, one-off-outcome reasoning about which forecast "should" win is moot; the right question is which score most efficiently identifies the better *forecasting system* over many events. Two experiments: (1) five hypothetical forecast pairs, outcomes drawn from α/β with p=0.5, perfect vs imperfect systems — ignorance identifies the perfect system fastest for almost all n; RPS uses extra data worst (match 4: RPS barely improves with n); (2) realistic: 39,343 bookmaker-odds matches (football-data.co.uk, 5 English leagues), perfect forecast = a drawn odds-implied distribution, imperfect = a nearby distribution at imperfection δ (eq. 4, mean |Δp|). Result: clear hierarchy ignorance > Brier > RPS at low imperfection (δ=0.01, 0.025; 95% resampling intervals exclude zero for large n); ignorance still significantly better at δ=0.05, 0.1. Recommendation: use the ignorance score — the only proper local score (Bernardo 1979; Bröcker & Smith 2007) — with its bits interpretation: mean relative ignorance Δ in bits ⟺ 2^Δ = mean increase in probability density placed on the outcome.

## Method, math, and equations

- Brier = Σ_i(p_i − o_i)² (eq. 1); RPS = Σ_{i=1}^{r−1}Σ_{j=1}^i(p_j − o_j)² (eq. 2); IGN = −log₂(p(Y)) (eq. 3).
- Properties: propriety (all three proper); locality (only ignorance local); sensitivity to distance (only RPS); equitable, regular, feasible.
- Experiment 1: perfect system always issues the true draw's distribution, imperfect the alternative; selection = lower mean score over n forecasts; P(select perfect) vs n.
- Experiment 2: imperfection δ: ε = (1/3)(|p̃_h−p_h|+|p̃_d−p_d|+|p̃_a−p_a|) (eq. 4); imperfect forecast drawn from {ε<δ}; pairwise differences with 95% resampling intervals of the mean.
- Odds→probabilities (App. B, eq. 5): p_h = (1/O_h)/Σ(1/O_i) — margin removed by renormalization; max odds across bookmakers used.

## Datasets

- Experiment 1: synthetic (five Constantinou–Fenton forecast pairs, Table 1).
- Experiment 2: 39,343 matches from football-data.co.uk, top five English leagues 2005/06 onward (EPL 6,460; Championship/League One/League Two 6,624 each; National League 6,488). Public, free. No code stated.

## GSE application and implementation spec

1. Replace/augment GSE's engine-variant selection metric with mean ignorance (log₂) on held-out games: for any two engine versions A/B, report Δ = mean(IGN_B − IGN_A) in bits and 2^Δ as the mean probability-on-outcome multiplier — publishable, gambler-legible.
2. Re-run historical variant comparisons (e.g., v5.x changes) under ignorance vs Brier vs any RPS-like "closeness" metric to verify the paper's hierarchy on NFL data.
3. Use the bits framing in public model cards: "Engine v5.2.7 places 1.4× the probability on actual outcomes vs v5.1" (illustrative).
4. Effort: ~2 days (scoring code is trivial; the work is re-scoring archived variants).

## Leakage

- "Perfect model scenario" is a theoretical construct — real engine variants are all imperfect, and the paper explicitly leaves "which imperfect forecasts should be preferred" as future work; the hierarchy is proven for near-perfect discrimination, not for the messy middle.
- Experiment 2's "perfect" forecast is an odds-implied distribution, which itself contains bookmaker margin removal artifacts and is not the true DGM — the hierarchy is demonstrated relative to a proxy.
- RPS's distance-sensitivity might still matter for *decision* contexts the paper doesn't test (e.g., derivative bets); the paper only tests system identification.

## Limitations

- Football (soccer) 3-outcome setting; NFL spread/ML/total markets have different structure — transfer of the hierarchy to continuous-outcome NFL forecasts is plausible (ignorance is standard there too) but not demonstrated.
- No treatment of calibration vs sharpness decomposition; ignorance conflates both.
- Ignorance is unbounded for p(Y)→0 — the paper embraces this (match 1 monotonicity) but GSE must handle zero-probability edge cases in production scoring.
- Single bookmaker-odds source for experiment 2; max-odds selection introduces favorite-longshot and selection biases the paper doesn't discuss.

## GSE overlap

No scoring-rule-for-model-selection ledger exists in the corpus; calibration ledgers (1074, 1082) recalibrate models rather than choose between them. The existing-research map has no forecast-evaluation-metric entry. **New capability**: the decision metric for engine versioning.

## Implementation difficulty

Low. Ignorance scoring is one line; the resampling-interval comparison is standard. The substantive work is archival (re-scoring past variants).

## Reproducible test

Replicate Experiment 2 on GSE data: take 2023–2024 NFL games, engine variants A (incumbent) and B (challenger) with archived probabilistic forecasts (ML probabilities or spread-cover probabilities); compute mean ignorance, Brier, and an RPS-analogue per variant; pairwise 95% resampling intervals on score differences; check which metric most decisively favors the variant with better held-out log-likelihood. Baseline: the metric GSE currently uses for variant selection (document whatever it is; if none, Brier).

## Numeric gate

**0.05 bits** — adopt the ignorance score as GSE's primary engine-variant selection metric, and ship a challenger variant over the incumbent, only if the challenger achieves mean relative ignorance ≥ **0.05 bits** (2^0.05 ≈ 1.035× mean probability placed on the outcome) on held-out games with the 95% resampling interval of the pairwise difference excluding zero. Below 0.05 bits the difference is within the paper's "no significant difference" regime and the incumbent stays.

## Improvement experiment

The paper leaves the imperfect-model scenario open: run the missing experiment on GSE data — among *imperfect* engine variants, characterize which types of forecast errors each score rewards (e.g., does Brier favor hedged/flat forecasts while ignorance favors sharp ones on NFL data?). If ignorance systematically favors a pathology (e.g., overconfident tails), design a hybrid: ignorance for selection with a calibration gate (ECE cap) as a veto — proper scoring plus calibration safety.

## Verdict

**ADAPT** — Two experiments (hypothetical pairs; 39,343 bookmaker-odds matches) show the ignorance score identifies the true forecasting system faster and more reliably than Brier and RPS, with a unique bits interpretation (2^Δ = mean probability-on-outcome multiplier) that GSE can publish. Make mean ignorance the engine-variant selection metric; gate variant promotion on ≥0.05 bits with 95% significance.
