# [1546] Predicting Cricket Outcomes using Bayesian Priors (arXiv:2203.10706) — replaces [1539]

**Citation:** Mohammed Quazi, Joshua Clifford, Pavan Datta (2022). *Predicting Cricket Outcomes using Bayesian Priors*. arXiv:2203.10706. URL: https://arxiv.org/abs/2203.10706
**Ledger completed:** 2026-09-21. **Read:** full text (pdftotext of PDF).
**Replaces:** [1539] (2407.07116, REJECT).
**Verdict:** ADAPT — opponent-specific player performance distributions (gamma, fit from matchup history) aggregated by Monte Carlo simulation into team win probabilities is a portable template for GSE's player-level fantasy-point distributions and DFS lineup simulation; the "Bayesian" label is loose (empirical, not posterior inference — flagged below), but the generative-simulation machinery and the genuine out-of-sample validation are real.

## 1. Research question
Can stratified random sampling for team selection plus player-level score distributions (gamma, parameterized from opponent-specific history) produce calibrated win probabilities for cricket tournaments? Case study: ICC ODI World Cup 2023; validation: IPL 2020 season predicted from 2008–2019 data.

## 2. Dataset / schema
Web-scraped espncricinfo: 11,000+ individual ODI innings covering every game among ICC full members, January 1999–June 2020; 195 international players in the CWC case study. IPL: 130+ player profiles across 8 teams, every IPL game 2008–2019 (cricimetric.com). Per player per opponent: batting average and highest score. Debutants covered via domestic/first-class/reserve/U19 performances. Access: data repo https://github.com/mquazi/cricket_2020.

## 3. Method / model
(1) Stratified random sampling: playing XI drawn by strata (CWC: fast bowler, spinner, all-rounder-fast, all-rounder-spinner, batsman, wicket-keeper; IPL adds an overseas-player stratum capped at 4). (2) Per selected player, runs vs a specific opponent ~ Gamma(α, β) (scale parametrization), with α = average/β (2) and β chosen from 50,000 candidates in [0.01, 5000] so that P(X > highest score) ≤ 0.05 (3) — i.e., moment matching plus a tail constraint, framed by the authors as Bayesian-flavored empirical parameter estimation. (3) Team score = sum of sampled player scores; 10,000 Monte Carlo replications per matchup; win probability = fraction of replications won. Coin toss ignored (predictions independent of bat-first/bat-second).

## 4. Equations & assumptions
- f(x|α,β) = x^{α−1} e^{−x/β} / Γ(α) (1) [paper prints this form; E(X) = αβ, Var(X) = αβ² confirms scale parametrization].
- α = Average score / β (2); P(X > Highest score) ≤ 0.05 (3).
- SRS: P(S) = 1/C(10,4) for subset selection; stratified SRS applied per stratum.
- Example: Kane Williamson vs England — average 54.61, highest 118 → α = 86.68, β = 0.63.
Assumptions: players' scores independent given opponent (no partnership/batting-order effects); gamma adequate for runs; 5% tail rule universal; coin toss irrelevant; playing conditions handled only by shifting stratum inclusion probabilities (spinners up-weighted in India); no bowling-side modeling (runs conceded not simulated — only batting).

## 5. Features / target
Inputs: player role, opponent-specific average and highest score, venue conditions (via strata weights). Target: team total and hence match win probability; tournament standings/title probabilities. Horizon: pre-tournament (CWC 2023) and pre-season (IPL 2020).

## 6. Validation design
Genuine out-of-sample: IPL 2020 predicted entirely from 2008–2019 data — predicted vs actual final standings (Figure 4), predicted head-to-head win matrix (Table 3), title probabilities. CWC 2023 predictions prospective (tournament in the future at write time). Benchmarks: none formal; qualitative comparison of predicted head-to-head matrix vs historical head-to-head record (Tables 1 vs 2, Figure 2 with 95% CIs).

## 7. Numerical results / baselines
Paper's reported numbers (quoted): IPL 2020 — first three table positions predicted with 100% accuracy, 4 of top 5 correct; title: Mumbai Indians 73%, Delhi Capitals 27% (actual final: Mumbai beat Delhi); SRH + CSK combined <1% title chance. CWC 2023 — India highest semifinal probability, 24% title; Pakistan 47% title conditional on reaching semifinals; South Africa 21%; Australia 8%. Head-to-head examples: India 89.1% vs England (actual 59.7% since 1999); Sri Lanka's simulated chances vs India/NZ/Pakistan/SA "extremely low" despite decent historical records. No Brier/log-loss reported.

## 8. Code / data availability
Data repo: https://github.com/mquazi/cricket_2020. No modeling code stated.

## 9. Leakage & limitations
Adversarial notes: (1) "Bayesian" is in the title but there is no posterior inference — parameters come from moment/tail matching; the Bayesian claim (citing Christensen et al. 2011) is philosophical, not computational. (2) Only batting is modeled; bowling/fielding enter nowhere — team score is a sum of batting draws. (3) Independence across players ignores partnerships and batting order. (4) The 5% tail rule and β grid are arbitrary. (5) Validation is one season (n=1 tournament); CWC 2023 predictions were never scored in the paper. (6) No proper scoring rules, no baseline comparison (e.g., vs Elo or betting odds).

## 10. GSE overlap
Existing map: Monte Carlo game simulation exists in the corpus (various lanes), but opponent-specific player-level distributional modeling (a gamma per player-per-matchup) aggregated to team outcomes is not inventoried. GSE's DFS/fantasy lane needs exactly this: player fantasy-point distributions conditional on matchup, simulated into lineup outcomes.

## 11. GSE implementation spec
1. Adapt to NFL DFS/projections: per-player fantasy-point distribution (gamma or truncated normal) with parameters fit from opponent-specific history (e.g., WR yards vs coverage-shell-specific CB matchup history) — the paper's one-on-one insight (Chahal vs Maxwell) maps to WR-vs-CB matchup tables.
2. Stratified sampling → lineup construction under salary-cap/positional constraints (strata = QB/RB/WR/TE/DST slots).
3. 10,000+ Monte Carlo replications per slate → distribution of lineup scores, win probability vs field; use for GPP ownership-adjusted lineup optimization.
4. Upgrade the paper: make it genuinely Bayesian — hierarchical priors over player parameters with partial pooling across opponents (the paper's point estimate per matchup is noisy for small samples), fit in Stan/PyMC.
5. Effort: ~1 week for the simulation core on nflverse + NGS matchup data; 2 weeks for the hierarchical upgrade.

## 12. Reproducible test
Dataset: nflverse 2020–2025 weekly fantasy points. Metric: out-of-sample log-likelihood of player weekly fantasy distributions (gamma vs lognormal vs normal) on 2025; calibration of simulated team-total distributions vs actuals. Gate: matchup-specific hierarchical gamma must beat a pooled (non-matchup) gamma on held-out log-likelihood before use in DFS sims.

## 13. Acceptance / rejection gate
ADOPT the opponent-specific player-distribution + Monte Carlo aggregation pattern if the hierarchical gamma beats pooled baselines on 2025 held-out log-likelihood by ≥3%; REJECT the paper's literal estimation procedure (moment + 5% tail rule, no pooling, no bowling side) — replace with hierarchical Bayesian estimation; REJECT any claim that this is Bayesian inference as written.

## 14. Improvement experiment
Beyond the paper: hierarchical Bayesian gamma (player × opponent random effects with partial pooling, genuinely fit by MCMC — fixing the paper's "Bayesian in name only" gap); add the missing bowling/defense side (opponent defensive strength as a covariate on the gamma mean); model batting-order/sequence dependence (or target-share dependence for NFL); and score CWC-2023-style prospective predictions with proper scoring rules (Brier, log-loss) against an Elo baseline.
