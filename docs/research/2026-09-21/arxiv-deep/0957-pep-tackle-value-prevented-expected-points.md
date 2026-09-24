# [0957] PEP: Tackle Value as Prevented Expected Points (arXiv:2407.08508)

## Citation / full-text source

- arXiv:2407.08508 — full text: https://arxiv.org/pdf/2407.08508
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Robert Bajons, Jan-Ole Koslik, Rouven Michels, Marius Ötting (2024). *PEP: a tackle value measuring the prevention of expected points*. arXiv:2407.08508. URL: https://arxiv.org/abs/2407.08508
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADAPT — counterfactual tackle-removal (remove tackler from tracking frame → random-forest conditional density of end-of-play yard line → per-tree EP mapping → GAMLSS mixed-effects player intercepts) is a rigorous defensive-evaluation pipeline directly portable to GSE's IDP/tackles-prop lane.

## 1. Research question
How can we assign a value to every individual tackle in American football that accounts for context and importance — i.e., the expected points the tackle prevented relative to the hypothetical scenario in which the tackler had missed?

## 2. Dataset / schema
- Tracking data from the **NFL Big Data Bowl 2024** (tackles competition): high-resolution player positions and velocities. Inspired by/built on that competition's data release.
- EP model trained on **play-by-play data from the 2011–2021 NFL seasons**, evaluated on 2022.
- Sample size: total tackle count not stated in text; the run-play-only robustness subset contains **5,889 tackles** (Appendix A.3). Player analysis restricted to tacklers with **>10 tackles** in the observed period (half a season of data).
- Access: Big Data Bowl data is public via Kaggle; nflverse play-by-play public.

## 3. Method / model
1. **Conditional density of end-of-play yard line (EOPY):** random forest regression (N = **1000 trees**, R `ranger` **default hyperparameters** — no tuning, justified by RF's out-of-box performance and the unclear loss for density hyperparameter selection). Key trick: instead of averaging tree predictions, treat the N individual tree predictions as samples from the conditional density — fully non-parametric density estimation capturing **multi-modality and heteroscedasticity** (e.g., bimodal when a defender is close: tackle = short gain vs miss = big gain/TD). Nine models trained: 8 weeks train / 1 week held-out, giving out-of-sample densities for every tackle.
2. **EP model:** maps EOPY → expected points. Seven scoring outcomes (TD +7, FG +3, safety +2, opp. safety −2, opp. FG −3, opp. TD −7, no score 0); EP = Σ_y y·P(Y=y|X). Estimated with **XGBoost** multi-class on play-by-play 2011–2021 (following Carl & Baldwin / nflfastR practice, leave-one-season-out CV, score-differential weighting). Only features extractable from a predicted EOPY allowed: adjusted LOS, yards to go, score differential, down, quarter, home indicator, timeouts remaining per team (no temporal features since time-to-EOPY isn't predicted).
3. **PEP:** for each real tackle, compute the hypothetical EOPY density with the tackler **removed** from the tracking frame; map each tree prediction through EP and Monte-Carlo average; subtract the EP of the observed (real) EOPY.
4. **Player strength:** GAMLSS mixed-effects model on PEP values. PEP has heavier-than-normal tails → fit Normal, TF (3-param t), and SST (4-param skew-t); **wormplots (de-trended Q-Q) select SST**. Random intercepts for tackler, ball carrier, and offensive team (shrinking low-tackle players toward the group mean μ_t); fixed effects for positional variation, short-yardage (<2 yds), 4th down, 4th quarter, turnover indicators, pass result, ball-carrier position. Uncertainty via **1000 bootstrap samples resampling full drives** (not plays) à la Nguyen et al. 2023.

## 4. Equations & assumptions
- EP: E[Y|X] = Σ_y y·P(Y=y|X), y ∈ {−7, −3, −2, 0, 2, 3, 7}.
- Expected EP under RF density (eq. 1): E(g(Y)|x) = ∫ g(y) f̂(y|x) dy; Monte Carlo version (eq. 2): (1/N) Σᵢ₌₁ᴺ g(ŷᵢ), treating tree predictions ŷ₁…ŷ_N as density samples.
- PEP (eq. 3): **PEP = E[g(Y)|x_removed] − g(y₀)**, y₀ = observed EOPY. Alternative (eq. 4): PEP_alt = E[g(Y)|x_removed] − E[g(Y)|x₀] — a conditional treatment effect (Imbens 2004); PEP (not alt) used for player evaluation since over/underperformance vs the model is the signal.
- GAMLSS (eqs. 5–6): PEPᵢ ∼ SST(μᵢ, σ, ν, τ); μᵢ = xᵢβ + T_it + B_ib + O_io; T_t ∼ N(μ_t, σ_t²) (tacklers), B_b ∼ N(μ_b, σ_b²) (ball carriers), O_o ∼ N(μ_o, σ_o²) (offensive teams).
- Assumptions: (a) removing the tackler from the frame is a valid counterfactual for a missed tackle (ignores that other defenders would react differently); (b) tree predictions are valid conditional-density samples; (c) EP depends only on the listed game-state features; (d) PEP values conditionally independent given random effects; (e) half-season sample suffices for player intercepts.

## 5. Features / target
- RF inputs: player positions, speeds/velocities, and "other factors" (exact feature list not stated in paper — flagged as a gap).
- EP model inputs: yard line (adjusted LOS), yards to go, score differential, down, quarter, home indicator, timeouts remaining for each team.
- Mixed-model inputs: PEP per tackle; fixed effects listed above; random intercepts for tackler / ball carrier / offensive team.
- Target: PEP per tackle (expected points prevented); derived target = tackler random intercept (tackling ability).

## 6. Validation design
- RF: 9-fold leave-one-week-out; out-of-sample RMSE **5.74**, MAE **3.13** — "similar to existing approaches (Yurko et al. 2020)".
- EP model: trained 2011–2021, evaluated on 2022: MAE **3.6391** vs Carl & Baldwin's **3.6395** — on par.
- GAMLSS family selection by wormplots (SST wins over TF and Normal).
- No baseline comparison for the player rankings (no alternative tackling metric compared); face-validity check against the 2022 tackles leaderboard.

## 7. Numerical results / baselines
- Example play (Figure 4): true EOPY = 12-yard line → EP 5.41; hypothetical (tackler removed) density mass in end zone → mean EP 6.2; **PEP = 0.79**.
- Cumulative PEP (Appendix A.1, top 20): ILB/LB and safeties dominate; e.g., entries shown: (CB) 21.685 on 28 tackles, Bobby Okereke (ILB) 20.369 on 63, Ryan Neal (SS) 20.300 on 25, Adrian Amos (FS) 20.179 on 31, Tremaine Edmunds (ILB) 19.035 on 47, Cody Barton (MLB) 18.653 on 45, Derwin James (FS) 18.625 on 55, Devin Lloyd (ILB) 18.503 on 54, Rashaan Evans (ILB) 18.168 on 47, D.J. Reed (CB) 18.043 on 36, Chuck Clark (SS) 17.430 on 43, Budda Baker (SS) 17.398 on 49, C.J. Mosley (ILB) 17.390 on 56.
- Position-group finding: ILB/SS have highest cumulative PEP (tackle most); DE/NT/DT are low cumulative-PEP (misses remediated by others); on **average** PEP, defensive backs (CB/SS/FS) overtake ILBs (last line before TD).
- Mixed-model top-10 ILB (Figure 8, bootstrap medians): includes the top-3 2022 tackles leaders — Nick Bolton, Foyesade Oluokun, Jordyn Brooks — with narrower bootstrap distributions (less variance). Top DTs: Dexter Lawrence, Aaron Donald narrow; Osa Odighizuwa, Broderick Washington surprisingly in top 10 (wide distributions — flagged as uncertain).
- Position-free top-20 ranking: top 10 mostly **cornerbacks** — authors explicitly flag the interpretive caveat (CBs may generate PEP by allowing catches then tackling).
- Run-play-only refit (5,889 tackles): a cornerback pops to #1; fewer CBs overall in the top ranks.

## 8. Code / data availability
None stated (no repo URL in text). Data: NFL Big Data Bowl 2024 (public, Kaggle); play-by-play via nflfastR/nflverse (public).

## 9. Leakage
- No label leakage: targets are model-generated counterfactual EOPY/EP values, evaluated on held-out plays (temporal split), not observed outcomes.

## Limitations
- Authors' own caveats: (a) **missed tackles are not punished** — only real tackles scored (Appendix A.4 sketches the extension); (b) **pass-play bias**: CBs can inflate PEP by allowing a catch then tackling — the metric rewards the last line of defense, not coverage quality; (c) run vs pass plays conflated in the main model.
- Counterfactual validity: removing the tackler from the frame ≠ a real missed tackle (other defenders' reactions change); no sensitivity analysis.
- RF feature list unstated; ranger defaults untuned (justified but still a choice).
- Half-season sample; bootstrap distributions for low-tackle players are wide (shrinkage helps but uncertainty remains).
- No comparison to existing tackling metrics (stops, PFF grades) — no demonstrated incremental value.
- EP model MAE 3.6391 vs 3.6395 is a 0.0004 difference — "on par" is really "identical"; fine, but not an improvement.

## 10. GSE overlap
Existing-research-map: STRAIN (2305.10262, pass-rush metric from tracking) was read; NGS taxonomy inventoried; no tackle-valuation work exists in repo. gse-lab has rush/pressure splits and unit matchups but no per-tackle value. **New capability**, directly in the props_dfs/IDP lane (tackle props, defensive player evaluation). Same author group (Michels/Bajons) as paper 2602.10784 (coverage-scheme prediction, also in this batch).

## 11. GSE implementation spec
- Data: Big Data Bowl tracking (public) + nflverse play-by-play; EP via existing nflverse EP or the paper's XGBoost recipe.
- Steps: (a) RF (ranger/sklearn, 1000 trees, defaults) predicting EOPY from tracking frame at tackle moment; (b) per-tree EP mapping with nflverse EP model on the predicted yard line + game state; (c) PEP = E[g(Y)|x_removed] − g(y₀) per tackle; (d) GAMLSS (R gamlss, SST family) with random intercepts tackler/ball-carrier/offense + fixed effects (down, distance, quarter, score diff, run/pass); (e) 1000 drive-block bootstraps; publish tackler intercepts as "PEP ability".
- Use: IDP fantasy rankings, tackle-prop edges (players with high PEP/tackle but low market tackle lines), opponent scouting.
- Effort: ~1 week for the pipeline; the mixed model is the fiddly part.

## 12. Reproducible test
Dataset: Big Data Bowl 2024 tackling data + nflverse 2024 play-by-play. Baseline: raw tackle counts and PFF tackling grades for ranking defenders. Test: compute PEP and tackler random intercepts; (a) check face validity — top-10 ILB by intercept should include ≥2 of the season's top-5 tackle leaders; (b) predictive — regress next-half-season tackles+assists on PEP intercept vs on raw tackle rate, compare out-of-sample R².

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if: (a) RF out-of-sample EOPY predictions achieve MAE ≤ 3.5 yards on held-out weeks (paper: 3.13), and (b) the tackler random intercept predicts second-half tackles per snap with out-of-sample R² ≥ 0.05 above the raw-tackle-rate baseline. Otherwise keep only the counterfactual-removal idea and drop the GAMLSS.

## 14. Improvement experiment
Close the authors' own gap: score **missed tackles** by inverting the counterfactual (E[g(Y)|x₀] − E[g(Y)|x_made]) using charted missed-tackle events (PFF/Big Data Bowl), then build a net tackling metric (PEP_made − PEP_missed) and test whether it predicts future missed-tackle rate better than PFF grades; also split the mixed model by run/pass to remove the CB catch-and-tackle bias.

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).
