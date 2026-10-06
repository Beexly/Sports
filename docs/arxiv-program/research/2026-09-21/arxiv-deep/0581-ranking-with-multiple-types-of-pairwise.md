# [0581] Ranking with multiple types of pairwise comparisons (arXiv:2206.13580v2)

**Citation:** Newman, M. E. J. (2022). *Ranking with multiple types of pairwise comparisons*. arXiv:2206.13580v2. URL: https://arxiv.org/abs/2206.13580v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2647 lines).
**Verdict:** ADAPT — port the EM + Bradley-Terry valence model to NFL team strength estimation where different "interaction types" (e.g., rushing success, passing success, turnover margin, special-teams plays) are automatically weighted by their inferred informativeness about team strength, rather than hand-weighted; keep the logistic-prior MAP regularisation.

## 1. Research question
How do you rank individuals/teams from pairwise comparisons when there are *multiple types* of comparison (e.g., different dominance behaviours in animals, different play types in football) and you do **not** know a priori what each type conveys — whether it signals dominance, subordination, or nothing? The paper derives an EM algorithm for a modified Bradley-Terry model that jointly infers the single ranking *and* each interaction type's "valence" (informativeness + direction) from the data.

## 2. Dataset / schema
Four demonstrations: (1) synthetic — N=100 individuals, M=1000/5000 interactions on random graphs, T=5/10 types, 1000 replicates per setting, valences q_t drawn uniform on [0.5,1], [0.25,1], [0,1]; (2) vervet monkeys — 66 monkeys, 11,664 agonistic encounters, 8 interaction types (charge, chase, displace, facial, lunge, physical, supplant, vocal), Jan 2015–Dec 2017, Samara Private Game Reserve; (3) 7th-grade classroom — 29 students, 3 directed relation types (get on with / best friends / work with), Vickers & Chan 1981; (4) **2015 NFL season — 32 teams, 36,030 play-level interactions across 5 play types** (run, pass, sack, punt, field goal), data from Yurko et al. (nflWAR, nflverse precursor); kickoffs/conversions removed; **no play-success information used — only which play type each team chose to run**. All datasets previously published/public. Code: supplementary materials at https://doi.org/10.1098/rspa.2022.0517.

## 3. Method / model
Modified Bradley-Terry with a latent **stance** variable σ_r ∈ {0,1} per interaction (1 = winner/instigator was the dominant party) and a per-type **valence probability** q_t = P(dominant individual wins/instigates an interaction of type t). Dominance probability follows Bradley-Terry: p_uv = λ_u/(λ_u+λ_v), λ_u = e^{s_u}, mean score normalised to 0. EM algorithm: E-step computes posterior stance probabilities π_r = λ_{u_r}q_{t_r}/(λ_{u_r}q_{t_r}+λ_{v_r}(1−q_{t_r})); M-step updates q_t = Σ_r δ_{t_r t}π_r/Σ_r δ_{t_r t} and iterates λ_i = Σ_r[π_rδ_{u_r i}+(1−π_r)δ_{v_r i}]/Σ_u A_{iu}/(λ_i+λ_u) (Zermelo-style iteration), renormalised by geometric mean. MAP variant adds a logistic prior on scores s (derived from a uniform prior on p_0 = λ/(λ+1), i.e. maximum-entropy on dominance-vs-average probability), changing the λ update to λ_i = (1+Σ_r[…])/(2/(λ_i+1)+Σ_u A_{iu}/(λ_i+λ_u)) and removing the normalisation step. Handles the sign-flip invariance (λ→1/λ, q→1−q) by post-hoc inversion.

## 4. Equations & assumptions
- Bradley-Terry dominance: p_uv = e^{s_u}/(e^{s_u}+e^{s_v}) = λ_u/(λ_u+λ_v); p_0 = λ/(λ+1), λ = p_0/(1−p_0) (odds of dominating the average individual).
- Stance likelihood: P(σ_r|λ_u,λ_v) = λ_u^{σ_r}λ_v^{1−σ_r}/(λ_u+λ_v).
- Observation model: P(x_r|σ_r,q_t) = q_t^{σ_r}(1−q_t)^{1−σ_r}.
- Marginal likelihood: P(x|λ,q) = ∏_r (λ_{u_r}q_{t_r}+λ_{v_r}(1−q_{t_r}))/(λ_{u_r}+λ_{v_r}).
- E-step: π_r = λ_{u_r}q_{t_r}/(λ_{u_r}q_{t_r}+λ_{v_r}(1−q_{t_r})).
- M-step: q_t = Σ_r δ_{t_r t}π_r/Σ_r δ_{t_r t}; λ_i = Σ_r[π_rδ_{u_r i}+(1−π_r)δ_{v_r i}]/Σ_u A_{iu}/(λ_i+λ_u), A_{ij} = total interactions between i and j.
- MAP λ update: λ_i = (1+Σ_r[π_rδ_{u_r i}+(1−π_r)δ_{v_r i}])/(2/(λ_i+1)+Σ_u A_{iu}/(λ_i+λ_u)); logistic prior P(s) = 1/((e^s+1)(e^{−s}+1)).
- Assumptions stated: interactions independent; no ties/draws (extendable); stance independent per interaction; single one-dimensional ranking exists axiomatically; uniform prior on q.

## 5. Features / target
Input features: for each interaction r — winner/instigator u_r, loser/recipient v_r, type t_r. No covariates. Target: (a) the ranking (strengths λ_u / scores s_u); (b) the valence probabilities q_t per interaction type. "Prediction horizon" N/A — unsupervised ranking.

## 6. Validation design
Synthetic recovery study (ground-truth known): Spearman R² between inferred and true ranks over 1000 replicates × (M, T, q-range) settings, vs a traditional unimodal Bradley-Terry baseline. Real-data validation is face-validity: vervet hierarchy shifts up to 17 places vs unimodal ranking; classroom network edges run "uphill" in inferred hierarchy; NFL rank scores vs actual win fraction. No time-ordered backtest, no held-out likelihood comparison.

## 7. Numerical results / baselines
- Synthetic (Spearman R², this-paper/traditional): M=5000,T=5: 0.88/0.83 (q∈[0.5,1]), 0.83/0.53 (q∈[0.25,1]), 0.88/0.42 (q∈[0,1]); M=1000,T=5: 0.53/0.50, 0.43/0.24, 0.54/0.17. Multimodal wins modestly when all types are dominant, hugely when some types signal subordination. Standard errors <±1 in final digit.
- Vervet monkeys: all 8 behaviours dominant on balance (q_t>0.5); "chase" weakest (q=0.728); "displace"/"supplant" most indicative of dominance; rankings shift up to 17 places vs unimodal.
- Students: "best friends" and "work with" get q_t=1 (maximally hierarchical); "get on with" weakly hierarchical.
- **2015 NFL (36,030 plays, 32 teams): inferred rank scores vs win fraction R²=0.453, p<0.0001 — using no success information, only play-type choices.** Valences: rushing plays and field goals signal dominance (q_t>0.5); **passing plays, sacks, and punts signal subordination** (q_t<0.5) — bottom-10 teams averaged 620 pass plays vs 504 for top-10. Runtime: 11 seconds on a circa-2022 laptop.
- All numbers are the paper's claims; my interpretation: the NFL result is provocative but descriptive (in-sample, single season).

## 8. Code / data availability
Code + example data in the paper's supplementary materials at https://doi.org/10.1098/rspa.2022.0517. Real datasets previously published and public (NFL data via Yurko et al./nflverse lineage). Effectively reproducible.

## 9. Leakage & limitations
- No predictive validation anywhere: synthetic study measures rank *recovery*, real studies are in-sample description. The NFL R²=0.453 is in-sample correlation, not a backtest — it cannot be cited as predictive accuracy.
- Independence assumption across 36,030 plays is false (drives/possessions are correlated); standard errors and the p<0.0001 overstate certainty.
- Play-type "valence" conflates strategy with strength: bad teams pass more because they're trailing (game script), not necessarily because passing *reveals* weakness — the model has no score/clock controls, so q_t absorbs game-state confounding. Adversarial read: the headline "passing signals subordination" is mostly a game-script artefact.
- Single-season NFL demo (2015 only); no stability analysis of q_t across seasons.
- Sign-flip invariance requires manual correction; uniform prior on q_t is arbitrary.
- NFL transfer limitation: the paper deliberately discards outcome information; for GSE the outcomes (EPA, success) are the signal — the transferable part is the *automatic type-weighting machinery*, not the outcome-free ranking.

## 10. GSE overlap
Extension, not duplicate. Existing-research-map: Bradley-Terry, Massey, Colley, Elo, Glicko, TrueSkill are all inventoried as *unimodal* ranking methods; the 2026-09-18 ML brief lists "learning-to-rank" as a topic. **No multimodal/valenced ranking method exists in Garrett's corpus** — nothing that jointly learns a single team-strength scale *and* how informative each facet of play is about that scale. The natural GSE analogue: interaction types = facets like rushing success, passing success, turnover margin, special teams, penalties — each with an inferred valence for "true team strength." Complements (doesn't duplicate) the EPA-based team metrics in gse-lab.

## 11. GSE implementation spec
1. Data: nflverse play-by-play 2009–2025. Define T interaction types as *team-facet matchup outcomes* rather than raw play types (to avoid the game-script confound): e.g., per-drive facets — rushing EPA>0, dropback EPA>0, turnover committed/forced, special-teams EPA>0, penalty yards — each recorded as a directed "interaction" between the two teams with winner = team that won the facet on that drive.
2. Add game-state controls the paper lacks: stratify or residualise facet outcomes on score differential + clock before feeding the EM (or include them as offsets) so q_t measures strength-information, not game script.
3. Fit the MAP-EM (logistic prior) per season and rolling 8-week windows; 32 teams × ~5–8 types converges in seconds (paper: 11s for 36k interactions).
4. Outputs: team strengths s_u (a new power rating) + valence vector q_t (which facets the data says are most informative about true strength — itself a publishable finding, e.g., "turnover margin q=0.9 vs rushing success q=0.6").
5. Blend s_u into the GSE engine as an additional team-strength prior alongside EPA-based ratings.
6. Effort: ~1 week for one engineer (the algorithm is ~50 lines; the work is facet definition + game-state de-confounding + validation).

## 12. Reproducible test
Dataset: nflverse 2016–2024 regular seasons. Facets (fixed before fitting): per-drive rushing-success winner, dropback-success winner, turnover winner, special-teams winner, penalty-yardage winner (5 types), each de-confounded by pre-drive score differential via logistic residualisation. Fit MAP-EM on weeks 1–17 of season Y (2016–2023), produce strengths s_u; predict week-18 + playoff game winners (and ATS vs closing line) for season Y. Metric: log-loss and ATS hit rate vs two baselines: (a) unimodal Bradley-Terry on game W/L; (b) net EPA ranking. Time window: rolling — train on each season 2016–2023, test on that season's week 18 + playoffs.

## 13. Acceptance / rejection gate
ADOPT the multimodal strength as an engine input if, across the 2016–2023 test windows: (a) log-loss on game winners is ≥2% better than the unimodal Bradley-Terry baseline, OR (b) ATS hit rate beats the EPA-ranking baseline by ≥1.5 points with the same sign in ≥6 of 8 seasons. REJECT if neither holds (the valence machinery adds nothing once outcomes and game state are properly used), or if q_t estimates are unstable across seasons (sign flips on >2 of 5 facets year-to-year).

## 14. Improvement experiment
Beyond the paper: make valence **time-varying and matchup-dependent** — q_t as a function of opponent strength (hierarchical: q_{t,week} ~ N(q_t, τ²)) and add a second latent dimension (offense/defense split, i.e., separate λ^O_u, λ^D_u with facet-specific loadings). Test on the §12 protocol whether a time-varying-valence, offense/defense-split EM beats the static single-scale version — the paper's single static scale is its most restrictive assumption for a league with injuries, scheme changes, and unit-level heterogeneity.
