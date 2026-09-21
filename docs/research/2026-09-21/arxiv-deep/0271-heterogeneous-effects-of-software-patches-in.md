# [0271] Heterogeneous Effects of Software Patches in a Multiplayer Online Battle Arena Game (arXiv:2110.14632)

**Citation:** Yuzi He, Christopher Tran, Julie Jiang, Keith Burghardt, Emilio Ferrara, Elena Zheleva, Kristina Lerman (2021). *Heterogeneous Effects of Software Patches in a Multiplayer Online Battle Arena Game*. arXiv:2110.14632. URL: https://arxiv.org/abs/2110.14632
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1202 lines).
**Verdict:** ADAPT — the causal-tree HTE machinery (Tran & Zheleva 2019) transfers directly to NFL rule-change "patches" (e.g., the 2024 dynamic kickoff rule), but the champion-composition layer has no NFL analog and the as-if-random treatment assumption needs a controlled pre/post design instead of the paper's loose before/after match split.

## 1. Research question
Do software patches (game-balance interventions) affect players and teams uniformly, or heterogeneously — and can causal inference, specifically heterogeneous treatment effect (HTE) estimation, quantify who benefits, who is hurt, and through which mechanisms (champion composition, player skill, rest between games)? Test bed: 62 League of Legends patches across 1.2M players, with outcomes at team level (win/loss) and player level (kills per match).

## 2. Dataset / schema
- **LoL match data, mid-2014 to end of 2016** (Sapienza et al. 2017, Harvard Dataverse DOI 10.7910/DVN/B0GRWX): **1.2 million unique players, 437 thousand matches**, 5v5 ranked queue.
- Match-level features: match duration, start time, map ID, queue type, **patch ID (62 patches, versions 4.6–6.22)**, season ID, outcome.
- User-level per match: champion, role, lane, kills/deaths/assists, gold earned/spent, champLevel; **timeSinceLastMatch** (time since previous match); session statistics (session = matches without a ≥15-min break); historical aggregates **mean*/cum*AtStart** for kills, deaths, assists, KDA, gold earned/spent (computed up to but excluding current match); **highestAchievedSeasonTier** (previous season).
- Champion taxonomy: 7 types (controllers, fighters, mages, marksmen, slayers, tanks, unique); 130+ champions; analysis restricted to top-25 most popular (Thresh ~3% pick rate, Lucian, Vayne).
- Access: public dataset via the Dataverse DOI above; code: not stated.

## 3. Method / model
**Causal trees for HTE** using the Tran & Zheleva (2019) variant, which adds a validation set for generalizing causal effects to unseen data. Unit = a LoL match; treatment = the patch version it was played on (matches before the patch = control, after = treated; players treated as "as-if randomly" assigned). Trees greedily partition the feature space to **reduce the expected variance of the estimated HTE** (not CART loss), stopping at a predefined minimum leaf size or when no significant split remains. Node estimate = treated-minus-control mean difference with an independent t-test p-value per node. Two analysis layers: (1) team-level win rate with champion-presence features (causal trees per patch on composition features); (2) player-level kills with per-champion causal trees over consecutive patch pairs — **1,550 causal trees** (25 champions × 62 patches), minimum leaf size 5% of samples, max depth 10. Feature importance: weight each tree split feature by the split's sample size, summed across all trees/versions. "Effect gap" analysis: for each split on a feature, compute the left-vs-right child HTE difference and test its significance across trees.

## 4. Equations & assumptions
- (1) CATE definition: **τ(x_i) = E[Y_i(w_{t+1}) − Y_i(w_t) | X_i = x_i]**, where W_i is the patch (treatment), w_t and w_{t+1} consecutive versions, Y_i(w) the potential outcome, X_i the match characteristics.
- Stated assumptions (Rubin potential-outcomes framework): (a) treatment assignment is "as-if random" — matches before vs. immediately after a patch are comparable (the authors flag this as the central vulnerability: prior work (Wang et al. 2020) shows players change champion picks after patches, i.e., selection bias; unobserved confounders cannot be ruled out); (b) SUTVA implicit (no interference between matches); (c) t-tests per node assume approximate normality of leaf means; (d) validation-split generalization in the Tran–Zheleva variant assumes the train/validation split preserves the causal structure.
- No equations beyond the CATE definition are stated (splitting criterion described verbally).

## 5. Features / target
- Team-level trees: binary champion-presence indicators (top champions), champion-type counts (number of fighters/marksmen/mages/controllers on team). Target: **team win/loss (win rate)**.
- Player-level trees: timeSinceLastMatch, mean*/cum*AtStart performance proxies (kills, deaths, KDA, wins, assists, gold, champLevel), meanMatchDurationAtStart, session features. Target: **kills per match**.
- Prediction horizon: retrospective (pre/post patch comparison).

## 6. Validation design
- No train/test split in the predictive sense; validation = the Tran–Zheleva causal-tree validation set (randomly selected; authors note trees "will be slightly different" per split but structures were similar with "no contradictory results").
- Node-level inference: independent t-tests per leaf (5% level). Feature-level: weighted split-count importance + effect-gap significance testing (Figure 7, 95% CIs).
- Baselines: naive per-champion win-rate changes are shown to differ from the causal-tree estimates (e.g., Nami +4.2%, p=0.10 unconditionally vs. +23% conditional on Lucian-present/Rengar-absent) — the tree is the method, and the naive comparison is the straw baseline. No external benchmark.

## 7. Numerical results / baselines
- Average patch effects on kills (Figure 4): **patch 4.20 (pre-season) increases mean kills by 0.5 per match**; following patches show slightly negative compensating effects; **patch 6.9 (mid-season mage update) increases mean kills by over 0.4**; remaining 60 patches have far smaller effects.
- Patch 4.12 (Lucian buff): Lucian on team → **win rate +5%**; Lucian + Rengar on team → **−12.6%** (p=0.11, not significant; Rengar got a nerfing bug fix); Lucian + Nami (no Rengar) → **+18%** (significant); team with Kassadin → more likely to lose (Kassadin nerfed: individual win rate −4.5%, p=0.23, but −10% after conditioning on team composition).
- Patch 6.4 (Jhin buff, Fiora/Lucian/Viktor small nerfs): Jhin + Fiora on team → **win rate +23%** (significant, despite Fiora's nerf).
- Patch 4.20: root split on Jinx (unchanged champion); ≥1 fighter with Jinx → **+6.4%**; no Jinx + >2 marksmen → **−15.4%**.
- Patch 6.9: Lucian + Riven, no Brand/Wukong → **+17%** win rate.
- Lucian–Vayne win rates negatively correlated: **r = −0.46, p = 0.0002** (same lane/role matchup dynamics).
- Player level: rest matters most — players with timeSinceLastMatch = 0 (no break) perform worst; short breaks (<3 min, 26th percentile) outperform all groups including multi-day breaks (Figure 3). Top-10 important features in order: **timeSinceLastMatch, meanKdaAtStart, meanMatchDurationAtStart, meanDeathsAtStart, meanKillsAtStart, meanWinsAtStart, meanAssistsAtStart, meanGoldspentAtStart, meanGoldearnedAtStart, meanChamplevelAtStart**. Only **timeSinceLastMatch** has a significant positive effect gap at 5% — longer breaks consistently improve post-patch performance. High-skill players (high meanKillsAtStart, excluding the zero bin) **benefit more from patches than weak players** — "patches caused a widening in the gap between the high and low-performance players, which is contrary to the spirit of patching aimed at game balancing" (Figure 6 right; skill effect-gap p-values slightly above 0.05, i.e., weak significance).

## 8. Code / data availability
Data: public — Sapienza et al. 2017, https://doi.org/10.7910/DVN/B0GRWX. **Code: none stated** (causal-tree algorithm is Tran & Zheleva 2019, AAAI; no paper-specific repo).

## 9. Leakage & limitations
- The as-if-random assumption is explicitly shaky: players **self-select champions and queue behavior around patches** (Wang et al. 2020 shows pick-rate shifts toward buffed champions), so treated (post-patch) and control (pre-patch) populations differ in composition — a selection bias the trees cannot fully absorb since champion choice is both a feature and a post-treatment behavior.
- Multiple testing: 1,550 trees with per-node t-tests; no family-wise or FDR correction reported — some "significant" leaves are likely noise (authors acknowledge tree instability across random validation splits).
- Patch effects are confounded with time trends (meta evolution, player learning, seasonality); the before/after contrast has no concurrent control group — any drift over the patch window is attributed to the patch.
- Unobserved confounders (team communication, smurfing, queue dodging) acknowledged but unaddressed.
- NFL transfer: LoL patches are frequent, large, and compositional; NFL rule changes are rare and league-wide with no clean champion analog — the composition layer does not port; only the player/team HTE layer does.

## 10. GSE overlap
- **New capability.** The existing-research-map has no HTE/causal-tree estimation anywhere in the corpus (causal inference is a commissioned ML-brief topic with results pending; the map's causal entries are CEPT, FineCausal, and the home-field paper in this same wave). No causal forests, causal trees, or meta-learners appear in the "already covered" method lists.
- The finding that interventions widen skill gaps is adjacent to GSE's luck-layer work (turnover luck splits) but no GSE doc estimates heterogeneous intervention effects. This is the first tree-based HTE method in the sweep.

## 11. GSE implementation spec
- **Data:** nflverse pbp 2022–2025. Intervention = the **2024 dynamic kickoff rule** (league-wide "patch"): treated = 2024–2025 seasons, control = 2022–2023 seasons. Unit = team-game (special-teams + drive-start outcomes) or player-game for returners.
- **Features (NFL analogs of the paper's feature set):** pre-intervention team special-teams EPA/play, returner 40-time/roster speed proxies, touchback rate, starting field position averages, coach tenure, dome/outdoor — mirroring the paper's skill proxies (meanEPAAtStart, cumEPAAtStart per team up to but excluding current game).
- **Model:** Tran–Zheleva causal trees (implement from the AAAI 2019 paper or use grf/causalml as the forest extension), splitting to minimize HTE variance; target = team-game kickoff-related EPA (or starting field position). Minimum leaf 5% of samples, max depth 10, as in the paper; per-node t-tests + the paper's effect-gap analysis for feature importance.
- **Design fix for the paper's weakness:** control for time trends by pairing each 2024 team-game with the same team's 2023 matchup-window games and adding season + team fixed effects before tree fitting (difference-in-differences pre-processing), rather than the paper's raw before/after contrast.
- **Serving:** offline research artifact — HTE tables by team archetype feeding the 2025 special-teams priors in the engine; refreshed when the next rule change lands.
- **Effort estimate:** 2–3 days (causal-tree implementation or causalml adaptation + nflverse pipeline); the hard part is the DiD pre-processing, not the trees.

## 12. Reproducible test
- **Dataset:** nflverse pbp, 2022–2023 (control) vs. 2024–2025 (treated), team-game level. Outcome: kickoff-drive EPA per game (EPA on drives starting within 2 plays of a kickoff) — the NFL analog of "kills".
- **Metric:** CATE by team archetype leaf; test = whether the causal tree finds at least one leaf with |τ̂| significant at 5% (t-test) AND the weighted feature-importance ranks pre-intervention special-teams EPA in the top 3 (mirroring the paper's skill-proxy finding).
- **Baseline:** naive before/after mean difference in kickoff EPA (no heterogeneity); the tree must reveal subgroup structure the naive mean hides — pass criterion: max leaf |τ̂| ≥ 2× the naive ATE.
- **Window:** fit on 2022–2024, confirm leaf structure persists on 2025 holdout games.

## 13. Acceptance / rejection gate
- **Adopt** the causal-tree HTE module if on the 2022–2024 fit: (a) at least two leaves significant at 5% with |τ̂| ≥ 0.5 EPA/game, (b) max-leaf |τ̂| ≥ 2× the naive pre/post ATE, and (c) the top-ranked split features are stable (same top-3) on the 2025 holdout.
- **Reject** if no leaf clears 5% significance, or if the tree structure flips between the fit and holdout windows (instability — the paper's own acknowledged weakness), or if a plain DiD with team fixed effects explains the same variance — then the tree adds interpretability but no signal, and GSE stays with linear DiD.

## 14. Improvement experiment
Replace single trees with a **causal forest (Athey et al. 2019 GRF)** on the same DiD-pre-processed data, and compare leaf-CATE stability via the paper's effect-gap bootstrap: resample team-games, refit, and keep only subgroups selected in ≥70% of bootstraps. This directly attacks the paper's admitted instability (trees "slightly different" per validation split, no multiple-testing correction over 1,550 trees) while preserving the interpretable subgroup output GSE needs for matchup content — the forest gives honest CIs per subgroup via the GRF infinitesimal jackknife, which the paper's per-node t-tests lack.
