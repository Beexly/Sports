# [0937] Club coefficients in the UEFA Champions League: Time for shift to an Elo-based formula (arXiv:2304.09078)

## Citation / full-text source

- arXiv:2304.09078 — full text: https://arxiv.org/pdf/2304.09078
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** László Csató (2023, v6 updated 2026-08-09). *Club coefficients in the UEFA Champions League: Time for shift to an Elo-based formula*. arXiv:2304.09078 [stat.AP]. URL: https://arxiv.org/abs/2304.09078.
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
Does the official UEFA club coefficient (5-year European-competition results only) predict Champions League performance worse than a Football Club Elo rating (clubelo.com) that also incorporates domestic league matches? Tested on group matches, knockout qualification, and group ranking over 19 UCL seasons (2003/04–2021/22).

## 2. Dataset / schema
- **19 Champions League seasons, 2003/04–2021/22** (constant format era): 8 groups × 12 games = 96 group games/season; 14 two-legged knockout ties/season.
- **UEFA club coefficient:** sum of points from previous 5 seasons of European competitions (or association coefficient, whichever higher); fixed at season start; collected from Bert Kassies' site.
- **Football Club Elo Ratings** (clubelo.com): k=400, K=20, includes home advantage and margin of victory; ratings fixed at June 30 each year for fair comparison (UEFA coefficient doesn't move within a season).
- Three samples: group matches excluding draws (**1,402** obs; 863 home wins = **61.6%**); knockout qualification excluding finals and six single-leg 2019/20 ties (**260** obs; 159 = **61.2%** won by second-leg host); group ranking pairwise comparisons (**912** obs; 686 = **75.2%** where higher-coefficient team ranked higher).

## 3. Method / model
- Head-to-head logistic regressions: dependent = success indicator; explanatory = rating difference (home−away / first-leg-host−second-leg-host / pairwise). Three models per task: (1) UEFA only, (2) Elo only, (3) both.
- Fit metrics: Cox & Snell R², Nagelkerke R², McFadden R², classification rate (cut 0.5), area under ROC.
- Robustness: alternative dependent-variable framing (Table 7), multinomial logit including draws (Table 8), period splits 2003/04–2011/12 vs 2012/13–2021/22 (Tables 9–11).

## 4. Equations & assumptions
- W = 1/(1+10^{Δ/s}) ...(1); E_1 = E_0 + K(R−W), R ∈ {1, 0.5, 0}.
- R²_{C&S} = 1 − (L_0/L_M)^{2/n}; Nagelkerke = R²_{C&S} / (1 − [p^p(1−p)^{1−p}]²); R²_{McF} = 1 − ln(L_M)/ln(L_0).
- Assumptions: June-30 Elo freeze is a fair comparator; draws excludable without distortion (checked via multinomial); 2020/21 COVID season potentially biased (excluded from some splits); Elo difference scale (~3–4× coefficient scale) needs no standardization for model comparison.

## 5. Features / target
Input: pre-season rating difference (UEFA coefficient Δ or Elo Δ). Targets: home win (no draws), knockout qualification, higher group rank.

## 6. Validation design
Full-sample logits (19 seasons) + sensitivity: alternative DV framing, multinomial with draws (n=1,824), two 9-season subperiods. No out-of-sample forecasting — all fits are in-sample explanatory power (author's stated scope: "explanatory power").

## 7. Numerical results / baselines
- **Rough accuracy** (higher rating predicts success), Table 3: group matches — UEFA 70.68%, **Elo 73.32%**; knockout — UEFA 61.92%, **Elo 65.00%**; group ranking — UEFA 75.22%, **Elo 78.51%**. Elo wins all three.
- **Group matches logit** (Table 4): UEFA-only — coef 0.019***, C&S 0.222, Nagelkerke 0.301, classif 73.0%, AUC 0.784. Elo-only — 0.007***, C&S **0.270**, Nagelkerke **0.367**, classif **75.4%**, AUC **0.814**. Both: UEFA 0.003 (ns), Elo 0.006*** — **coefficient adds nothing once Elo is in**.
- **Knockout** (Table 5): UEFA-only AUC 0.617; Elo-only AUC **0.690**, classif 65.4%; both: UEFA −0.007 (ns). Constant −0.362**→−0.218 (second-leg hosting advantage).
- **Group ranking** (Table 6): Elo-only AUC **0.776** vs UEFA 0.704; both: UEFA **0.012***, Elo 0.008***, AUC 0.784 — **here the coefficient adds significant value**: at fixed Elo, higher UEFA coefficient → higher group finish ("European experience" not captured by domestic-weighted Elo).
- **Robustness:** multinomial with draws (Table 8): Elo AUCs 0.761/0.578/0.761 (home/draw/away) — draws hardest to forecast; Elo still dominates. Period splits (Tables 9–11): UCL more predictable since 2012 (competitive balance declining, consistent with Triguero-Ruiz & Avila-Cano 2023); Elo dominance holds in both halves.
- Descriptives: group-stage Elo mean 1772.5 (sd 136.6), range 1297.1–2089.3; England league avg 1778 (Man City 2013) vs Hungary 1303 (Ferencváros 1581) on 2021-06-30. Biggest Elo shock in sample: Sheriff Tiraspol beating Real Madrid, 2021/22.

## 8. Code / data availability
Ratings from clubelo.com and kassiesa.net (public). No code stated.

## 9. Leakage
None — pre-season frozen ratings predict in-season outcomes. In-sample logits (not out-of-sample), so "predictive accuracy" here is explanatory fit; the direction is honest but magnitudes would shrink out-of-sample.

## Limitations
- In-sample explanatory power only; no true forecasting validation.
- Elo frozen at June 30 discards within-season information (deliberate, for fairness, but understates a live Elo).
- Draws excluded from main models (checked, but the main numbers are win-only).
- COVID seasons handled ad hoc.
- No K-factor or HFA tuning — clubelo defaults taken as-is.

## 10. GSE overlap vs existing-research-map
- Repo has Elo variants (nfelo, 538-style) and 0932's Elo-MMR — but **no repo work tests whether ratings built on all games beat ratings built on subsets**, and no "experience" factor exists.
- Connects to 0932 (Elo-MMR robustness): this paper argues the *information set* matters as much as the *algorithm*.
- The "Swiss-system scheduling needs accurate strength estimates" discussion (Section 5.1) parallels NFL schedule-strength debates in the repo.

## 11. Implementation spec (GSE adaptation)
- **All-games Elo:** extend the GSE NFL Elo to ingest preseason games with reduced K (K_pre = K/4) and weight playoff games K×1.5 — test whether the expanded information set beats regular-season-only Elo on 2015–2025, mirroring the paper's domestic-leagues finding. Ratings stay live weekly (never frozen).
- **"Big-stage experience" factor:** count of playoff games played by the roster-weighted core (QB + top-8 snap leaders) over trailing 3 seasons; add as a logistic feature alongside Elo. The paper's Table 6 says this adds value *on top of* Elo for tournament advancement — test on NFL playoff games 2010–2024.
- **Draw analog:** ties are rare in NFL; instead run the multinomial analog for margin buckets (win by >7 / close / loss) to check whether Elo predicts blowouts vs close games differently.
- Effort: 4 days.

## 12. Reproducible test
Dataset: nflverse 2015–2025. Build three preseason-frozen ratings (regular-season-only Elo; all-games Elo with preseason K/4; all-games + playoff-experience feature). Predict each season's games via logistic regression on rating difference. Baseline: regular-season-only Elo log-loss 2020–2025. Success: all-games Elo improves log-loss by ≥0.004 AND the experience feature is significant (p<0.05) in the playoff-only subsample — reproducing both of the paper's claims.

## 13. Numeric gate
ADAPT confirmed if all-games Elo (preseason included, down-weighted) beats regular-season-only Elo on 2020–2025 walk-forward log-loss by ≥0.004, or if the playoff-experience feature is significant in postseason games. Reject if neither — the information-set expansion doesn't transfer to the NFL's short season.

## 14. Improvement experiment
**Optimal K-weighting by game type:** the paper takes clubelo's K=20 as given and suggests weighting European games higher as future work — run that experiment on NFL data: grid-search K multipliers for preseason (0–0.5), regular season (1), playoffs (1–3), and Thursday/short-rest games, optimizing walk-forward log-loss 2015–2025. Hypothesis: playoff K ≈ 2 and preseason K ≈ 0.2 is optimal, and the tuned-K Elo beats the paper's fixed-K analog by ≥0.003. Second: test whether *within-season* live Elo (the paper deliberately froze ratings) beats frozen ratings by a larger margin than the paper's Elo-vs-coefficient gap — quantifying what the paper left on the table.

## 15. Verdict

**ADAPT** — a clean empirical demonstration that an Elo rating built on *all* games (domestic leagues included) robustly beats an official coefficient built on a *subset* of competitions, across three different prediction tasks and 19 seasons. The transferable GSE lesson: never rate teams on a subset of available games — incorporate everything (preseason with down-weighted K, all competitions), weight updates by opponent strength, and keep ratings live rather than freezing them at season start. Bonus finding: the official coefficient *did* add significant value on top of Elo for group ranking — a "big-stage experience" factor worth adapting. Not ADOPT: football-specific; the methodological prescription is what transfers.
