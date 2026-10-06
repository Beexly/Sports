# [0939] PandaSkill — Player Performance and Skill Rating in Esports: Application to League of Legends (arXiv:2501.10049)

## Citation / full-text source

- arXiv:2501.10049 — full text: https://arxiv.org/pdf/2501.10049
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Maxime De Bois, Flora Parmentier, Raphaël Puget, Matthew Tanti, Jordan Peltier (PandaScore) (2025). *PandaSkill — Player Performance and Skill Rating in Esports: Application to League of Legends*. arXiv:2501.10049 [cs.AI]. URL: https://arxiv.org/abs/2501.10049. Code + data + web app open-sourced (PandaSkill GitHub repo).
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
How to fairly rate individual players' skill in a 5v5 esport with role asymmetry, few games per player, and isolated regional pools — separating *performance in a game* (PScore) from *skill in general* (rating), such that ratings predict future outcomes and agree with human experts?

## 2. Dataset / schema
- **Professional League of Legends, 2019-09-15 to 2024-09-15 (5 years), all regions: 37,388 games, 4,927 players** via Leaguepedia API. Inter-region games scarce: Worlds 592 + MSI 312 vs LCK 2,438, LPL 3,643 — the isolated-pools problem is real.
- 16 engineered features (Table III): KLA = (kills+assists)/(deaths+1) (preferred over KDA for stability), gold/XP/CS per minute, wards/min, damage dealt/taken normalized by total kills and gold, largest multi-kill, killing spree ratio, **worthless death ratio** (death with no kill/objective involvement within 1 min), **free kill ratio**, objective contest win/lose rates. Game-length and total-kills normalizations; team-share stats deliberately excluded.

## 3. Method / model
- **PScore:** per-role XGBoost (2,000 rounds, lr 0.01, monotonicity constraints — only worthless-death and contest-loserate forced negative), standardized inputs, 5-fold CV. Predicted win probability → percentile transform (learned on train) → 0–100 score. Model-agnostic by design (any probabilistic model works).
- **Skill rating:** OpenSkill Bayesian (S_i ~ N(μ_i, σ_i²), init μ=25, σ=25/3), single-value θ_i = μ_i − 3σ_i.
- **FFA setting:** after each game, players ranked by PScore (not team outcome); OpenSkill updated in free-for-all mode — Ω_FFA(μ^t, σ^t, PScore).
- **Dual ratings:** μ_i = μ_i^ctx + μ_i^meta; σ_i² = σ_ctx² + σ_meta². Intra-region games update ctx only; inter-region games update meta only, using contextual lower bounds θ^ctx as offsets (TrueSkill2-style), then de-offset and average per context (eq. 8–9). Context change (player switches region) → σ^ctx reset to 25/3.
- Comparison: P(S_i>S_j) = Φ((μ_i−μ_j)/√(σ_i²+σ_j²)).

## 4. Equations & assumptions
- S_i ~ N(μ_i, σ_i²) ...(1); (μ^{t+1},σ^{t+1}) = Ω(μ^t,σ^t, outcome) ...(2); FFA: Ω_FFA(μ^t,σ^t, PScore) ...(3).
- μ_i = μ_i^ctx + μ_i^meta ...(4); σ_i² = σ_i^{ctx 2} + σ_i^{meta 2} ...(5); ctx update (6); meta update with offset θ^{ctx,t} (7); averaging (8)(9).
- P(S_i>S_j) = Φ((μ_i−μ_j)/√(σ_i²+σ_j²)) ...(10).
- Assumptions: game outcome is a valid proxy for performance (PlayeRank/PI precedent); percentile transform makes roles comparable; meta rating is additive and shared within a context.

## 5. Features / target
Inputs: 16 per-player end-game features → PScore → rating updates. Targets: PScore model → game outcome; rating eval → pre-match outcome forecasting + expert pairwise concordance.

## 6. Validation design
- PScore: 5-fold CV accuracy, ECE calibration, SHAP interpretability, Wasserstein role-fairness.
- Ratings: rolling 1-month-ahead logistic regression (train 1 year → test next month) on intra vs inter-region games; expert surveys (5 surveys × 300 pairs, PandaScore odds traders; majority + unanimity concordance).
- Ablations: OpenSkill / FFA_OpenSkill / Meta_OpenSkill / Meta_FFA_OpenSkill / Meta_FFA_TrueSkill × (PScore, PI, PlayeRank) + EWMA(0.05) baselines.

## 7. Numerical results / baselines
- **PScore quality:** accuracy **90.74%** (SD 0.60) vs PlayeRank SVC 91.00%, PI RF 91.30% (unconstrained XGB 91.79% — monotonicity costs ~1% for interpretability); **ECE 0.93%** (SD 0.03) vs PlayeRank 1.28%, PI 2.28%. KLA top SHAP feature in all roles; free-kill ratio, XP/min, gold/min, worthless-death ratio also key. Role fairness (Wasserstein): PScore 0.09–0.44 vs PI 0.35–0.66 vs PlayeRank 2.44.
- **Outcome forecasting** (Table IV, accuracy all/intra/inter): PScore+EWMA 63.06/63.33/**52.34**; PScore+OpenSkill 65.56/65.51/67.39; PScore+Meta_OpenSkill 65.12/65.01/**69.23**; PScore+FFA_OpenSkill 64.79/64.86/61.71 (ECE 0.77 — best calibrated); **PScore+Meta_FFA_OpenSkill 64.98/64.86/70.07**, ECE 1.01/0.97/3.27; Meta_FFA_TrueSkill 65.15/65.05/68.90 but ECE 2.85 (worse calibration). Transfers to PI (70.23 inter) and PlayeRank (69.23 inter).
- **Key effects:** Meta rating fixes inter-region forecasting (52.34 → 70.07); inter > intra with Meta (regions far apart in skill); FFA slightly *hurts* team-outcome forecasting (61.71 vs 67.39 inter) — expected, since only team rating matters there — but FFA **significantly improves expert concordance**.
- **Expert concordance:** PScore+Meta_FFA_OpenSkill — majority **80.63%** (SD 6.52, 2nd to PI's 80.70%), unanimity **88.98%** (SD 5.99, best). Korea concordance very high (wide within-region skill spread).
- **Worked example:** HLE vs T1, LCK Summer 2024 lower-bracket final game 2 (T1 won): Viper PScore 82.52 → rating 92.68 (+0.50); Faker 81.02 → 84.43 (+0.45); HLE losers Peanut/Zeka *gained* rating; T1's Oner/Zeus *lost* rating despite winning. Top-50: #1 Chovy 102.81; Korea/China dominate; only G2 (West) in top 50.

## 8. Code / data availability
Full open source: PandaSkill GitHub repo (code + data) plus a web app visualizing PScores and ratings. Leaguepedia API data public.

## 9. Leakage
PScore trained on end-game stats to predict that game's outcome — intentionally "leaky" by design (it's a *descriptive* grade, not a forecast); the forecasting test uses only pre-match ratings, which is clean. Rolling-window eval handles meta shifts. Expert survey has selection noise (traders' familiarity varies by region).

## Limitations
- PScore features are end-of-game aggregates — a descriptive grade, not a live predictor; real-time use would need in-game feature reconstruction.
- PScore accuracy (90.74%) is only marginally better than simpler baselines (PlayeRank 91.00%, PI 91.30%); its advantage is calibration and role-fairness, not raw accuracy.
- FFA updates *hurt* team-outcome forecasting (61.71% vs 67.39% inter-region for plain OpenSkill) — the performance-based update trades forecasting accuracy for rating fairness/expert agreement.
- The dual-rating system depends on inter-region games to calibrate the meta rating; pools with almost no cross-context games (like isolated leagues) gain little.
- LoL role structure (5 fixed roles) doesn't transfer cleanly to football's fluid positional responsibilities and 11-man interactions.
- Expert concordance survey: PandaScore's own odds traders evaluating their employer's model — potential bias, though the regional-survey design mitigates it.

## 10. GSE overlap vs existing-research-map
- Repo has no calibrated single-game player performance score and no FFA-style performance-based rating updates; player evaluation is stat-aggregation (PFF-style grades are external). 0936's Ω-rating is the closest cousin (interpretable linear player ratings) — PandaSkill adds the PScore→FFA→OpenSkill pipeline and the dual-rating solution.
- Connects to 0938 (per-player TrueSkill +1%): PandaSkill is the production implementation of that idea with performance-based updates.
- Connects to 0935/0936 behavioral features: PScore features (worthless deaths, free kills, objective contests) are the esports analogs of "Harm"/negative-behavior factors proposed in 0936's improvement experiment.

## 11. Implementation spec (GSE adaptation)
- **NFL PScore:** per-position XGBoost predicting win probability from player game stats (QB: EPA/play, CPOE, success rate, sack rate, turnover-worthy plays; skill positions: yards/route, TPRR, drops; defense: pressure rate, stops), monotonicity constraints, percentile → 0–100 weekly grade. Calibrate (target ECE <2%). Publish as weekly content ("Galaxy Grades") — the interpretability (SHAP) requirement doubles as content.
- **FFA rating updates:** maintain per-player OpenSkill ratings updated weekly by within-game PScore ranking among same-position players, decoupled from team W/L — a QB can gain rating in a loss (exactly the paper's HLE finding). Aggregate to team strength for game prediction.
- **Dual ratings for NFL:** contextual = within-division/conference; meta = conference strength. Less critical in the NFL's balanced schedule, but the meta-rating machinery ports to **college→pro transitions** (rookie ratings = college ctx + conference meta) and cross-era comparisons.
- Effort: 2 weeks (PScore models + calibration) + 1 week (OpenSkill FFA pipeline).

## 12. Reproducible test
Dataset: nflverse 2018–2025. Build QB PScore (XGBoost, monotonicity, percentile) on 2018–2021; FFA-OpenSkill QB ratings; forecast 2022–2025 games via logistic regression on QB-rating difference. Baselines: existing GSE QB tiers/Elo, EWMA of EPA/play. Success: PScore+FFA ratings beat EWMA baseline accuracy by ≥2% (paper: 64.98 vs 63.06) AND expert-concordance-style check — top-10 QB rating ranking achieves Spearman ≥0.7 vs end-of-season PFF grades (the paper's expert survey analog).

## 13. Numeric gate
ADAPT confirmed if NFL QB PScore + FFA-OpenSkill ratings beat an EWMA-of-EPA/play baseline on 2022–2025 game-forecast accuracy by ≥2 percentage points, or if the rating ranking hits Spearman ≥0.7 vs PFF season grades. Reject if neither — performance-decoupled ratings don't transfer to football's 11-man game.

## 14. Improvement experiment
**Worthless-play features for football:** adapt the paper's worthless-death/free-kill idea — define "worthless plays" (turnover-worthy throws that weren't intercepted due to drops, sacks taken on 3rd-and-long, drops on 3rd down) and "free production" (yards from busted coverages / garbage time) from nflverse tracking/charting; add to the QB PScore and test whether the Harm-aware PScore improves game forecasting over the base PScore by ≥1%. This ports the paper's most novel features (not just its pipeline) and directly extends 0936's proposed Harm factor with a concrete construction.

## 15. Verdict

**ADAPT** — a production-grade two-step framework with three transferable ideas: (1) **PScore**: per-role XGBoost predicting win probability from end-game stats → percentile → 0–100 performance score, with monotonicity constraints and ECE 0.93% calibration — a model-based, calibrated single-game player grade (a principled PFF-grade alternative); (2) **free-for-all OpenSkill updates**: rate players by within-game performance ranking, not team outcome — losing-team players can *gain* rating (shown live: HLE players gained rating in a loss to T1); (3) **dual contextual+meta ratings**: μ = μ_ctx + μ_meta solves isolated rating pools (inter-region accuracy 52.3% → 70.1%). Adapt PScore to NFL per-position weekly grades and FFA-style player rating updates decoupled from team W/L. Not ADOPT: LoL-specific features; the pipeline is what transfers.
