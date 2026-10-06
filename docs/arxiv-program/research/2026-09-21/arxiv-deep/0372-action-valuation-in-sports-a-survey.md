# [0372] Action Valuation in Sports: A Survey (arXiv:2504.06163v1)

**Citation:** Artur Xarles, Sergio Escalera, Thomas B. Moeslund, Albert Clapés (2025). *Action Valuation in Sports: A Survey*. arXiv:2504.06163v1. URL: https://arxiv.org/abs/2504.06163
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2327 lines).
**Verdict:** ADAPT — this is the best cross-sport taxonomy of action valuation I've seen; it directly names GSE's gaps (off-ball action valuation, player-aware valuation, credit-assignment horizon choice, evaluation without ground truth) — port the taxonomy's diagnostic questions to audit GSE's EPA pipeline rather than adopting any single method.

## 1. Research question
What are the essential characteristics of effective Action Valuation (AV) methods — scoring individual actions by their contribution to desirable outcomes — across sports? The survey builds a nine-dimension taxonomy (T1 Data; T2.1 AV Framework; T2.2 Architectural Modeling; T2.3 Targeted Outcomes; T2.4 Credit Assignment Horizon; T2.5 Action Types; T2.6 Player-Aware Valuation; T3 Evaluation; T4 Applications), catalogs 25+ methods and 16 datasets, and identifies gaps (public-data scarcity, no standardized evaluation, off-ball action valuation, player-aware valuation).

## 2. Dataset / schema
Table 1 catalogs 16 AV datasets: StatsBomb (3,433 football games, ED), StatsBomb 360 (394 games, OTD+ED, only ball possessor identified), Belgian Pro League (430, private), Meiji J1 League (55, private), STATS LLC (633, private), Hudl/Spearman (58, private), Chinese Super League (237, private), German Bundesliga (54, private), NHL PBP (9,220, public), SportLogiq (446, private), NBA optical tracking (784, private), World Tour badminton (21, public, DL-extracted tracking), German handball league (15, private), **NFL PBP (Yurko et al. 2019; public; ~256 games — the nflWAR/nflfastR-era play-by-play data)**, table tennis PBP (152), StatsPerform rugby (1,416). Key finding: almost all public datasets are event-data only (no tracking), limiting public research to on-ball actions; only badminton [D12] and StatsBomb 360 [D2] include OTD publicly.

## 3. Method / model
No new method (survey). It taxonomizes 25+ AV methods into three frameworks:
- **Expectation-Based (EB):** V(S_t) = E[N_{O{t,t+Δt}} | S_t] — supervised learning of expected future outcomes; e.g., VAEP (Decroos 2019, CatBoost, goals in next 10 actions), xT (Singh), EPV (Fernández 2021, CNN+DNN on 15-s windows), Yurko et al. 2019 (multinomial logit, NFL points/win over scoring possession).
- **MDP:** known dynamics from empirical frequencies, values via Bellman DP (Singh; Routley 2015; Schulte 2017; Van Roy 2021 — Bayesian transitions; Cervone 2016 as stochastic process).
- **RL:** unknown dynamics learned via TD/SARSA (Liu & Schulte 2018; Liu 2020; Ding 2022; Nakahara 2023), λ-return (Dick 2021), distributional TD (Liu 2022), actor-critic (Yanai 2022), policy gradient (Rahimian 2024), IRL (Luo 2020).
Architectures: LSTMs/GRUs dominate RL; CNN→temporal for spatial-first; GRNN (Dick 2021) for simultaneous space-time; GNN on dynamic pass networks (Gonçalves 2024). Off-ball valuation approaches: Wu & Swartz 2023 (actual vs expected defender velocity), Dick 2021 (state value of performed vs predicted trajectory), Nakahara 2023 (independent multi-agent RL distributing rewards across simultaneous actions).

## 4. Equations & assumptions
- AV decomposition: V(A_t) = V(A_t | S_t); via State Valuation: V(A_t) = V(S_{t+1}) − V(S_t).
- EB framework: V(S_t) = E[N_{O{t,t+Δt}} | S_t]; binary-outcome simplification: V(S_t) = P(O{t,t+Δt} | S_t).
- MDP values: V(S_t) = E_π[Σ_{τ=0}^∞ γ^τ R(S_{t+τ}, A^π_{t+τ}) | S_t]; V(A_t|S_t) = E_π[Σ_{τ=0}^∞ γ^τ R(S_{t+τ}, A^π_{t+τ}) | S_t, A_t].
- Player score: S_{P_i} = Σ_{a ∈ A_{P_i}} V(a).
- Stated assumptions: actions between states can be collapsed to the on-ball action (A_{S_t} = {a_1}) in most methods — a simplification the survey explicitly criticizes for ignoring simultaneous off-ball actions; EB methods assume a fixed future window; MDP methods assume dynamics estimable from observed frequencies (state-space discretization).

## 5. Features / target
Survey-level: features are game states S_t (positions, ball, score, clock); targets are desirable outcomes — wins, goals/points, shots, ball recovery, dangerous-zone entry, possession retention; horizons range from the next action to the full game; credit-assignment horizon via window length (EB) or γ + episode length (MDP/RL, episodes usually = possessions or scoring possessions).

## 6. Validation design
Survey of evaluation practices (§5): four criteria — FIT (held-out loss, not comparable across methods), CAL (predicted values vs observed outcome distributions — includes Yurko 2019), RNK (subjective player/team rankings, awards/expert lists), COR (correlation of aggregated scores with standard metrics, in-sample or forward). The survey's verdict: no standardized framework; proposes predictive power of player/team scores for *future game outcomes* as the objective direction (also cites Overmeer et al. 2025 expert-pairwise benchmark as subjective).

## 7. Numerical results / baselines
Survey — no original experiments, so no results of its own. Key quoted facts (not the paper's results): football averages ~3 goals/game, hockey ~6 — the reward-sparsity motivation; EB windows typically 3–15 s or up to 10 actions; RL episodes use γ up to 0.99 (Rahimian 2024, phase-based outcomes). All numbers are characterizations of the surveyed literature, not experimental claims — my interpretation: treat them as literature metadata.

## 8. Code / data availability
None stated (survey; no repository). Dataset table points to public sources (StatsBomb open data, NHL PBP, NFL PBP via nflverse lineage) but gives no URLs.

## 9. Leakage & limitations
- As a survey: no primary results, no reproducibility surface, no leakage analysis of its own; its evaluation critique (FIT/CAL/RNK/COR) is qualitative.
- Taxonomy dimensions are somewhat overlapping (e.g., "Targeted Outcomes" vs "Credit Assignment Horizon" both encode horizon choice) — my observation, not the paper's.
- NFL coverage is exactly one row (Yurko 2019, D14) — American football AV is thin in the surveyed literature; the survey's conclusions lean football (soccer)/hockey/basketball.
- The proposed "predict future game outcomes" evaluation direction is sensible but untested in the survey itself.
- Off-ball valuation claims rest on a handful of papers (Wu & Swartz 2023, Dick 2021, Nakahara 2023) — the gap is real but the solutions are nascent.

## 10. GSE overlap
Extension, not duplicate. GSE's foundation is expectation-based action valuation: EPA/play from nflverse (gse-lab, 2026-09-17), nflWAR (Yurko — read in depth, dedup list), CPOE as Bernoulli residual, 4th-down WP models, turnover-luck splits. This survey *is the cross-sport literature review GSE never did*: it validates GSE's EB framing (V(A_t) = V(S_{t+1}) − V(S_t) is exactly EPA/WPA), and names four specific GSE gaps: (1) off-ball action valuation — GSE values only the ball-carrier action; NGS data could support a Dick-2021-style performed-vs-predicted-trajectory value for route-running/blocking; (2) player-aware valuation — only Sicilia 2019 uses player embeddings; GSE's EPA is average-player based; (3) credit-assignment horizon — GSE uses drive-level EP implicitly, never the EB-window vs γ choice as a design variable; (4) evaluation — GSE uses FIT/CAL/COR implicitly but has no forward-game-outcome predictive benchmark of its EPA-based player scores. Relevant existing docs: `2026-09-18-ml-research-brief.md` (15 areas — the off-ball/multi-agent direction fits area "multimodal fusion"/"causal inference"), NGS taxonomy (2026-09-21, 27 families — the tracking data that makes off-ball valuation possible).

## 11. GSE implementation spec
A methods-audit project, not a model build: (1) map GSE's current EPA/WPA/CPOE stack onto the survey's nine dimensions in a one-page worksheet (framework=EB, horizon=drive-level implied γ, action types=on-ball only, player-aware=no); (2) prioritize the four gap experiments by cost: (a) credit-horizon sweep — recompute EPA-style values with 1-play, drive, and game horizons and compare forward predictive power (cheap, nflverse only); (b) player-embedding CPOE — add QB random effects to the completion model (medium); (c) off-ball route value via NGS tracking — Dick-2021 performed-vs-predicted-trajectory value for receivers (expensive, needs NGS/tracking); (d) forward-outcome evaluation protocol for player scores — backtest whether EPA-aggregated player ratings predict next-game outcomes better than box-score baselines (medium). Estimated effort: audit + (a) ~1 week; (b)+(d) ~1 month; (c) 2–3 months.

## 12. Reproducible test
Test (a) — credit-horizon sweep: using nflverse 2020–2025 play-by-play, compute team EPA/play aggregates under three horizons (play-level only, drive-level, game-level outcome regression), then predict 2024–2025 game outcomes out-of-sample. Metric: log-loss / AUC of game-outcome prediction. Baseline: current GSE drive-level EPA/play aggregate. This is runnable with existing gse-lab data.

## 13. Acceptance / rejection gate
ADOPT the survey's recommendations into GSE's methods docs only if test (a) shows any alternative horizon beats the drive-level baseline by ≥0.005 AUC on the 2024–2025 out-of-sample window; otherwise record the taxonomy as a reference and REJECT immediate pipeline changes. Separately, adopt the §5 evaluation recommendation (forward-outcome prediction of player scores) as a standing eval protocol regardless — it's methodology, not a claim.

## 14. Improvement experiment
The survey stops at cataloging off-ball valuation. Go one step further for the NFL: build an *expected route value* (ERV) model from NGS tracking — for each receiver, predict the completion-probability surface over the field given the play state, value the actual route run as ∫(ERV at actual position − ERV at league-average route) over the play, and sum to a per-player off-ball contribution. This is the football instantiation of the survey's multi-agent credit-assignment problem, and no surveyed paper does it for American football. Test whether ERV-sum correlates with future receiving production beyond target-share baselines.
