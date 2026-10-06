# [1183] Football Fever: Goal Distributions and Non-Gaussian Statistics (arXiv:physics/0606016v1)

**Citation:** Bittner, E., Nußbaumer, A., Janke, W., & Weigel, M. (2006). *Football Fever: Goal Distributions and Non-Gaussian Statistics*. arXiv:physics/0606016v1 [physics.soc-ph]. URL: https://arxiv.org/abs/physics/0606016
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, all 24 pages read; note: the assigned ID was initially misread as cond-mat/0606016 — verified via the arXiv abstract page that cond-mat/0606016 is an unrelated quantum-wires paper, and the correct football paper is physics/0606016v1, which was then read in full).
**Verdict:** ADAPT — a classic overdispersion benchmark for score modeling: the additive-feedback → negative-binomial derivation (r = p₀/κ, p = 1−e^{−κt}) and the head-to-head of Poisson vs. NBD vs. GEV vs. self-affirmation models give GSE a principled menu for total/score-distribution tails, with the authors' own warning that apparent "momentum" may be spurious team-strength heterogeneity.

## 1. Research question
Which statistical law best describes the distribution of goals scored per team per match across football leagues — Poisson, negative binomial, generalized extreme value, or a microscopic "self-affirmation" (feedback) model — and does goal scoring show genuine correlations (momentum/contagion) or just overdispersed marginals? (Abstract; Sec. 1)

## 2. Dataset / schema
Extensive historical league data: ~12,800 Bundesliga matches (seasons 1963/64–2004/05); ~7,700 East German Oberliga matches; ~1,050 Frauen-Bundesliga matches; ~3,400 FIFA World Cup qualifier matches; plus many other European leagues for the cross-league comparison. Schema: per match, goals scored by home and away team. Historical archives (comparable to RSSSF-style sources); exact provenance per league is described in the paper's data section. (Secs. 2–3)

## 3. Method / model
Four model families fit to per-team goal counts: (1) Poisson; (2) negative binomial (NBD); (3) generalized extreme value (GEV); (4) microscopic self-affirmation models with additive feedback p(n) = p(n−1) + κ or multiplicative feedback p(n) = κ·p(n−1), where p(n) is the scoring probability after n goals already scored, evolved via the recurrence P_N(n) = [1−p(n)]·P_{N−1}(n) + p(n−1)·P_{N−1}(n−1). Key analytic result: the additive model's continuum limit is exactly the NBD with r = p₀/κ, p = 1−e^{−κt}. Model comparison via fits to the empirical goal distributions per league; correlation analysis of home/away goal counts within matches. (Secs. 3–5)

## 4. Equations & assumptions
- Additive feedback: p(n) = p(n−1) + κ. Multiplicative feedback: p(n) = κ·p(n−1).
- Recurrence: P_N(n) = [1−p(n)]·P_{N−1}(n) + p(n−1)·P_{N−1}(n−1).
- Continuum limit (additive): negative binomial with r = p₀/κ, p = 1 − e^{−κt}.
- Reported within-match home/away goal correlations: R = −0.015 ± 0.011 (Oberliga), R = −0.031 ± 0.009 (Bundesliga) — i.e., weak negative, barely significant.
- Assumptions stated: stationary scoring rates within the modeled period; team-strength differences NOT modeled — the authors explicitly warn that apparent self-affirmation/contagion may be spurious, an artifact of mixing heterogeneous team strengths rather than genuine in-match momentum.

## 5. Features / target
Inputs: league identity / historical goal counts (no covariates — pure distributional modeling). Target: number of goals scored by a team in a match (nonnegative integer). Horizon: single match.

## 6. Validation design
Goodness-of-fit comparison across leagues: each model family fit per league, compared on how well it reproduces the empirical goal-count histogram, especially the heavy tail. No train/test split in the modern sense — it is a descriptive model-selection exercise over the full historical samples. The cross-league replication (many leagues, same ranking of models) is the robustness argument. (Secs. 4–5)

## 7. Numerical results / baselines
Paper's findings (my summary): Poisson systematically underfits the heavy tails of goal distributions; NBD fits well in most domestic leagues; the multiplicative-feedback model handles the heavier-tailed World Cup qualifying data best; GEV is competitive in some leagues. Within-match home/away correlations are ~−0.02 to −0.03 (weak negative). Sample sizes: ~12,800 Bundesliga, ~7,700 Oberliga, ~1,050 women's Bundesliga, ~3,400 WC qualifiers. Distinguish: these are fit-quality statements on soccer goal data, not predictive-accuracy claims; no out-of-sample forecasting experiment is run.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
(1) No covariates at all — team strength, home advantage beyond the marginal, era effects are all folded into the fitted parameters, so the models are descriptive, not predictive, as presented; (2) the authors' own spuriousness warning: without team-strength controls, the "self-affirmation" finding may just be heterogeneity — GSE must not cite this as evidence of momentum; (3) soccer goals, not football points — scoring process differs (NFL scores in 3s and 7s); the transfer is at the level of *distributional family choice*, not parameters; (4) 2006 paper — modern xG-style modeling has superseded parts of it, though the NBD derivation remains valid.

## 10. GSE overlap
Partial overlap, net new. The existing-research-map's master list already includes Poisson, Skellam, and Dixon-Coles as known score-modeling tools, and soccer Poisson-vs-ML (2408.08331) was read — so the *Poisson baseline* is covered. What is new: (a) the microscopic feedback derivation giving NBD parameters a mechanistic reading (r = p₀/κ); (b) the explicit multi-family shootout (NBD vs. GEV vs. multiplicative feedback) with the finding that heavier-tailed competitions need the multiplicative model — directly relevant to GSE's totals work where tail behavior prices extreme outcomes; (c) the spuriousness warning as a methodological discipline for any GSE "momentum" analysis. The repo has no NBD/GEV score-tail comparison. Treat as a historical benchmark, not a blueprint.

## 11. GSE implementation spec
1. Replicate the paper's shootout on NFL data: fit Poisson, NBD, and a feedback-mixture to team points-per-game distributions (nflverse play-by-play aggregated, 2015–2025), scored by out-of-sample log-likelihood on rolling seasons. 2. Extend with team-strength controls (the paper's missing piece): hierarchical NBD with team attack/defense random effects — the Dixon-Coles-style correction the authors didn't do. 3. Use the winning family as the score-distribution engine for totals pricing tails (over/under extreme lines). Effort: ~1 week (distribution fitting + hierarchical extension + tail-pricing harness).

## 12. Reproducible test
Dataset: nflverse team points per game, 2015–2024 (fit) → 2025 (test). Metric: out-of-sample log-likelihood per game; secondary: calibration of P(total > line) at extreme lines (±2σ). Baselines: Poisson, Gaussian (current implicit assumption in many totals models). Gate: adopt the winning family if it beats Poisson by ≥0.01 nats/game on 2025 with a paired test p<0.05.

## 13. Acceptance / rejection gate
ADOPT the shootout winner as GSE's score-distribution family if it beats both Poisson and Gaussian baselines by ≥0.01 nats/game out-of-sample on 2025 (paired p<0.05) AND improves extreme-line calibration (ECE in the tail decile cut by ≥20%); REJECT (stay with current distributional assumption) otherwise. Spuriousness rule: no GSE content may cite this paper as evidence of in-game momentum — the authors' heterogeneity warning is binding.

## 14. Improvement experiment
Go beyond the paper: fit the *multiplicative* feedback model (the paper's best heavy-tail performer) with team-strength random effects to NFL data and test whether feedback intensity κ varies by game script (e.g., trailing teams' scoring feedback vs. leading teams') — i.e., a script-dependent κ. The paper treats κ as a league constant and never tests state-dependence; if κ is script-dependent, GSE gets a principled garbage-time/score-effect adjustment for totals that the paper's framework suggests but never builds.
