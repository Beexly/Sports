# [1193] Self-affirmation model for football goal distributions (arXiv:0705.2724v1)

**Citation:** Elmar Bittner, Andreas Nussbaumer, Wolfhard Janke, Martin Weigel (2007). *Self-affirmation model for football goal distributions*. arXiv:0705.2724v1. URL: https://arxiv.org/abs/0705.2724v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 371-line extraction; all sections read).
**Verdict:** REJECT

A theoretical physics model of soccer goal-count distributions ("self-affirmation" feedback in a Bernoulli scoring process) that fits historical Bundesliga distributions well but performs no forecasting, no out-of-sample validation, no calibration, and no betting test; it offers GSE no predictive or methodological transfer. To be replaced by a new full-paper read (ledger 1352, not yet selected/read at the time of this ledger).

## 1. Research question
Can the deviation of football goal-count distributions from independent Bernoulli/Poisson statistics — especially the heavy tails — be explained from first principles by adding a simple "self-affirmation" feedback component (scoring a goal changes the probability of scoring the next) to the Bernoulli process, and do the resulting phenomenological distributions subsume the negative-binomial and generalized-extreme-value fits used previously?

## 2. Dataset / schema
- Bundesliga: **~12,800 matches**, 1963/64–2004/05.
- Oberliga (East Germany): **~7,700 matches**, 1949/50–1990/91.
- Frauen-Bundesliga: **~1,050 matches**, 1997/98–2004/05.
- FIFA World Cup qualification: **~3,400 matches**, 1930–2002 (neutral-site knockout matches excluded).
- Schema: home/away goal counts per match only. Sources described as football statistics archives (no URL in the extracted text); effectively unreplicable as stated.

## 3. Method / model
The number of goals is modeled as a modified Bernoulli process over N time steps with a per-step scoring probability p(n) depending on goals already scored:
- **Model A (additive):** p(n) = p(n−1) + κ, i.e. p(n) = p0 + κn.
- **Model B (multiplicative):** p(n) = κ·p(n−1), i.e. p(n) = p0·κ^n.
- **Model C:** coupled home/away multiplicative feedback (both teams' scoring probabilities interact).
Goal-count probabilities follow the recurrence P_N(n) = [1 − p(n)]·P_{N−1}(n) + p(n−1)·P_{N−1}(n−1). The paper shows Model A tends to the negative binomial as N→∞ holding p0·N and κ·N fixed, with r = p0/κ and p = 1 − e^(−κN) — i.e., the NBD is a limiting case of the self-affirmation framework. Parameters fitted to each league's empirical home/away distributions; goodness of fit assessed by χ² per degree of freedom.

## 4. Equations & assumptions
- Recurrence: P_N(n) = [1−p(n)] P_{N−1}(n) + p(n−1) P_{N−1}(n−1).
- Model A: p(n) = p0 + κn. Model B: p(n) = p0 κ^n. Model C: coupled home/away feedback (form as extracted).
- NBD limit of Model A: r = p0/κ, p = 1 − e^(−κN) for N→∞ with p0·N, κ·N fixed.
- Assumptions: scoring probability depends only on goals already scored (not on time, score state, or team strength); matches within a league/era are exchangeable draws from one distribution; no team-level heterogeneity modeled.

## 5. Features / target
No features. Target: the empirical home-goal and away-goal count distributions per league.

## 6. Validation design
No train/test split, no out-of-sample forecasting, no time-ordered validation. "Validation" is in-sample χ²/dof goodness of fit of Models A/B/C against Poisson, NBD, and GEV fits on the same data used for fitting.

## 7. Numerical results / baselines
- **Model B generally the best fit** (χ²/dof, home/away): Oberliga **0.75 / 3.35**; Bundesliga **1.25 / 1.96**; Frauen-Bundesliga **3.24 / 0.95**; World Cup qualification **0.92 / 0.80**.
- Model A reproduces the NBD in the stated limit, unifying the phenomenological fits as special cases of the feedback framework.
- Notable descriptive findings: men's vs women's leagues and Cold-War-era East vs West German leagues show "remarkable differences" in fitted feedback parameters — reported qualitatively, with no predictive use.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **Zero predictive content**: all fits are in-sample on the same historical distributions; the paper never forecasts a match, a goal count, or a market price.
- **No calibration, no betting test, no proper scoring rule** — the χ² fits cannot be converted into a usable probability forecast for GSE without substantial additional work the paper does not do.
- Soccer-only, era-pooled (1963–2005 Bundesliga treated as one distribution despite massive structural change), no team-strength heterogeneity; the feedback parameter is a league-level constant, not a team trait, so it cannot rate or rank teams.
- The "universality" claim rests on fitting, not on out-of-sample generalization.

## 10. GSE overlap
The map already covers Poisson/NBD/Dixon-Coles score modeling and the in-sample soccer goal-distribution literature is adjacent to ledger 1192's territory (Greenhough et al.). GSE needs calibrated, backtested probability forecasts for NFL markets; a league-level descriptive feedback model for Bundesliga goal counts adds no estimation technique, no feature, and no validation protocol GSE lacks.

## 11. GSE implementation spec
Not applicable — rejection is at the problem level. The only transferable fragment (a multiplicative-feedback count process) would require rebuilding as a team-level, time-ordered, market-tested model — i.e., a different paper.

## 12. Reproducible test
Not applicable. A sanity reproduction would re-fit Models A/B/C to any large soccer results database and recover χ²/dof values in the paper's range — reproducing a descriptive fit, not a forecast.

## 13. Acceptance / rejection gate
Reject: no out-of-sample forecast, no calibration, no market evaluation; the model cannot rate teams or price anything. No numeric gate is satisfiable because no prediction is produced.

## 14. Improvement experiment
None proposed — the gap is the absence of prediction. A useful version would make the feedback parameter team- and state-dependent, fit it time-ordered, and test whether it beats a Dixon-Coles baseline on out-of-sample log-loss and CLV; the authors do not attempt this.

**Verdict:** REJECT
