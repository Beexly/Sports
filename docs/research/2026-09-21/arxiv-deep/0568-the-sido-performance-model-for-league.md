# [0568] The SIDO Performance Model for League of Legends (arXiv:2403.04873)

**Citation:** Zhang, A. X., & Naidu, P. (2024). *The SIDO Performance Model for League of Legends*. arXiv:2403.04873. URL: https://arxiv.org/abs/2403.04873
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5126 lines; sections 1–8, appendices 11.1–11.3 described).
**Verdict:** ADAPT — SIDO is a hierarchical-Bayesian player-attribution framework (own effect + ally effect + enemy effect on resource statistics) with a rigorous discrimination/independence/stability metric-quality discipline (Franks et al. 2016). Port both to NFL player evaluation: decompose skill-position production into own/teammate/opponent effects, and adopt the three meta-metrics as GSE's metric-QC standard. The game is LoL, but the attribution algebra is sport-agnostic.

## 1. Research question
How do you measure individual player skill in a complex team-invasion sport where box-score stats ignore teamplay and game state? The authors build SIDO (a hierarchical Bayesian model) for League of Legends using gold and damage dealt as skill measures, separating a player's impact on their own, their allies', and their enemies' statistics across game phases (0–7, 7–15, 15–25 min), and validate it against industry-average stats and a Plus-Minus model.

## 2. Dataset / schema
Solo-queue games from the Riot API, top-1000 accounts (Grandmaster/Challenger) on NA/KR/EUW servers, patches 13.14–13.18 (July 18–Sep 27, 2023). Filters: ≥50 games in a role per account, champions played by ≥30 accounts (filters chosen by simulation maximizing correlation of estimated vs true player effects), disconnects removed (<500 damage by 7 min). Pro labels: players on top-level pro teams in NA/EU/KR/CN. Role-stratified (top/jungle/mid/bot/support).

## 3. Method / model
Three hierarchical Bayesian mixed-effects regressions per role × phase × region:
- Player model (gold): gold_pg = β_0 + b_c + b_p + ε_pg — Eq. (1); b_p (player random effect) is the skill metric. Damage model: dmg_pg = β_0 + β_dmgt x_pg + b_c + b_p + ε_pg — Eq. (2), with damage-taken x_pg controlling aggression.
- Ally models: residualize each ally's gold/damage via re-fit player models (AXE approximation for the re-fit), sum residuals Δ = Σ_a(Y_ag − E[Y_ag]), then Δ = β_0 + b_c + b_p + ε_g — Eq. (3); b_p = player's impact on all four allies collectively.
- Enemy models: same on enemies, metric = −b_p (reducing enemy output is positive skill).
- Priors: β_0∼N(0,1); b_c∼t_3(0,φ), b_p∼t_3(0,τ); φ,τ∼HalfC(0.5); σ∼HalfC(0.3) (t_3 for outlier-robust random effects, half-Cauchy for scales).
- Champion proficiency heuristic: δ_pc = (1/n_pc)Σ_{g∈G_pc}(Y_pg − β̂_0 + b̂_c) — Eq. (4), centered/scaled across players.

## 4. Equations & assumptions
Eqs. (1)–(4) as above, copied faithfully. Assumptions: gold/damage are the primary skill currencies (Fig. 1 directed-graph argument: most API stats connect to gold); semi-random solo-queue matchmaking mitigates (but does not eliminate) confounding, hence the conservative "attribute overlap to the ally, not the player" residualization; champion random effect absorbs scaling differences; t_3 priors allow outlier players/champions; posterior means of variance hyperparameters similar between original and AXE-approximated re-fit.

## 5. Features / target
Target: per-game gold and damage dealt. Features: none beyond grouping structure (player, champion, role, phase, region) plus damage-taken covariate. Output: posterior player effects b_p (own), ally b_p, enemy −b_p; champion proficiency δ_pc.

## 6. Validation design
- Pro-vs-non-pro separation: compare posterior b_p for known pro accounts vs non-pro accounts per role × phase × region; one-sided t-tests with Benjamini–Hochberg FDR.
- Meta-metrics (Franks et al. 2016): discrimination (fraction of between-player variance not due to sampling noise), independence (fraction of variance uncorrelated with other metrics, via Gaussian copula), stability (concordance index of pairwise orderings between patch windows 13.14–18 vs 13.6–13.9, ~20% account overlap).
- Out-of-sample prediction: fit on 13.14–13.18, predict player scores on patches 13.10/13.11, RMSE vs basic-average model.
- Qualitative checks: champion proficiency (Kaisa, Ruler, Xayah), jungler teamplay analysis.

## 7. Numerical results / baselines
- Appendix 11.3 meta-metric tables (read fully): Table 5 (gold discrimination) — e.g., Top EUW 0–7 min: player SIDO 0.77/BA 0.87, ally SIDO 0.30/Plus-Minus 0.00, enemy SIDO 0.46/Plus-Minus 0.01; Table 6 (damage discrimination) analogous (Top EUW 0–7: 0.83/0.93, 0.39/0.00, 0.52/0.00); Table 7 (independence, all models): Plus-Minus ~0.98–1.00, BA ~0.06–0.09 (support ~0.18–0.22), SIDO ~0.48–0.68; Table 8 (independence, SIDO only) 0.49–0.77; Tables 9–10 (stability concordance): gold player SIDO 0.53–0.75 (BA 0.62–0.82), ally/enemy SIDO 0.47–0.65; damage player SIDO 0.60–0.76, ally/enemy 0.50–0.65.
- Pro-account linking (Table 2): pro = top-level LCS/LEC/LCK/LPL player; accounts found in data: EUW — Top 18/15 accounts/players, Jungle 22/21, Mid 16/15, Bot 25/22, Support 12/10; KR — 13/13, 19/19, 18/18, 17/17, 16/15; NA — 10/10, 4/4, 5/5, 9/8, 12/9; not exhaustive, secret alternate accounts unlinked.
- Discussion §8: authors explicitly warn "low discrimination scores suggest taking any numerical result with a note of caution"; ally/enemy effect sizes lower than player effects, possibly a solo-queue artifact (no team communication). Future work §9: (1) Expansion — vision metrics, broader playerbase; (2) Validation — partnerships with pro teams, practice-game data; (3) Application — experiments on sleep and communication effects on learning/performance.
- Appendix 11.2 skill subcategory examples: Mechanics (reaction time, aim, spatial awareness, teamfighting, champion depth); Technical (team compositions, lane allocations); Strategy (strategic playbook); Tactics (adaptability, opponent analysis, tactical execution, synergy with technical/strategy).


- SIDO separates pros from non-pros across ALL roles (large positive differences, most FDR-significant in 0–7 and 7–15 min); basic-average (BA) model shows smaller, less consistent differences and fails for jungle/support; Plus-Minus (Clark, Macdonald & Kloo 2020) shows small inconsistent differences, often scoring pros below average — insufficient evidence it differentiates at all. 15–25 min differences weaker (p-value density near uniform).
- Gold differential predicts winners: 69% (0–7 min), 79% (7–15), 83% (15–25); damage: 63%, 73%, 72%.
- Prediction: SIDO player model has lower RMSE than BA on held-out patches 13.10/13.11 despite lower discrimination — shrinkage trades discrimination for accuracy.
- Discrimination: SIDO player < BA (expected: champion-separation + shrinkage); ally/enemy low overall → authors recommend 5-category bucketing (high/low positive, neutral, low/high negative) instead of continuous scores; SIDO ally/enemy > Plus-Minus in discrimination. Champion-effect discrimination medians 0.73 (ally) / 0.76 (enemy).
- Independence: Plus-Minus highest, BA lowest, SIDO 0.5–0.7.
- Stability: SIDO player models high concordance across patch windows; champion effect concordance >0.8 in EUW/NA; ally/enemy lower (modestly helped by categorization). Plus-Minus not re-fit (22–96 h per model).
- Role insights: support pros differentiate via enemy damage prevented; jungle pros' biggest edge is enemy gold prevented in 7–15 min (LCK 0.17, LEC 0.12, Table 4); bot-lane pro edge ~2:1 technical-vs-teamplay, jungle ~1:2, others ~1:1. LCK bot pros' Kaisa proficiency: +1.075 gold, +1.1975 damage vs non-pro 0.

## 8. Code / data availability
Data via Riot API (developer.riotgames.com). No code repository listed in the read sections; appendix gives full discrimination/independence/stability tables and a term glossary.

## 9. Leakage & limitations
Adversarial notes: (a) ally/enemy models have low discrimination and stability — the paper's own meta-metrics say these numbers shouldn't be used as continuous scores; (b) "non-pro" accounts likely include unlinked pros, contaminating the validation contrast; (c) solo queue ≠ competitive play — the authors admit pros may play less cooperatively in solo queue, so ally-effect estimates may not transfer to pro play; (d) all validation is indirect (pro separation) — there is no ground truth for skill; (e) Plus-Minus comparison is arguably unfair (fitted on full player pool including low-game accounts, no role/champion controls); (f) LoL patches every few weeks — model must be re-fit per patch window, a maintenance burden any adopter inherits.

## 10. GSE overlap
Extension. The corpus has plus-minus/adjusted-plus-minus concepts inventoried (MacDonald-style APM is in the 26-metric catalog per the map) but no hierarchical-Bayesian own/ally/enemy attribution separating a player's effect on teammates vs opponents, and no discrimination/independence/stability meta-metric discipline applied to GSE's own metrics. The three-model structure and the Franks et al. meta-metrics are both new capabilities.

## 11. GSE implementation spec
1. Own/ally/enemy attribution for NFL skill positions on nflverse play-by-play: own model — e.g., WR yards/route = β_0 + b_scheme + b_player + ε (scheme/team random effect analogous to champion); ally model — residualize teammates' production (other WRs' yards, RB efficiency) and model the sum of residuals on the player; enemy model — e.g., pass-rusher's effect on opposing QB EPA (metric = −b_p). Start with QBs (effect on teammates' EPA) and edge rushers (effect on opponent dropback EPA). 2. Adopt the Franks et al. meta-metrics as GSE's metric-QC gate: every new advanced metric must report discrimination (signal vs sampling noise), independence (new information vs existing metrics, Gaussian copula), stability (concordance across season halves). 3. Follow the paper's honesty rule: low-discrimination components (the analogue of ally/enemy) get bucketed into categories, not published as continuous rankings. Effort: ~3 weeks for the QB prototype + meta-metric harness.

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2025. Protocol: fit own/ally/enemy models for QBs with ≥200 dropbacks; validate by pro separation analogue — compare b_p for QBs with top-10 PFF grades / All-Pro selections vs replacement-level QBs (t-tests, FDR). Meta-metrics: discrimination of own-QB effect vs EPA/dropback and QBR; independence via Gaussian copula; stability via concordance between first-half and second-half season fits. Baseline: raw EPA/dropback and PFF grades.

## 13. Acceptance / rejection gate
Adopt the attribution framework if the own-effect model beats raw EPA/dropback on out-of-sample prediction RMSE (train 2020–2023, predict 2024–2025 player efficiency) AND achieves discrimination ≥0.5 with stability concordance ≥0.6 — then the shrinkage is earning its keep as in the paper. Reject ally/enemy continuous scores if their discrimination <0.3 (the paper's own finding): bucket them into the 5 categories instead of publishing numbers.

## 14. Improvement experiment
The paper's ally model aggregates all four allies into one Δ, losing per-teammate structure. For the NFL this is wasteful: fit per-teammate-pair effects (e.g., QB→specific WR chemistry as a random interaction) rather than one pooled ally effect, using the same hierarchical machinery. Test whether QB–WR pair effects predict next-season performance of reunited pairs (2020–2024 pairs, predict 2025) better than pooled ally scores — if pair chemistry is real and stable, GSE gets a "stack" signal for DFS/betting (QB–WR correlation plays) grounded in the SIDO framework.
