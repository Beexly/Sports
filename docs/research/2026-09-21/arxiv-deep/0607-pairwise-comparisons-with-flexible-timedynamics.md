# [0607] Pairwise Comparisons with Flexible Time-Dynamics (arXiv:1903.07746v2)

**Citation:** Maystre, L., Kristof, V., Grossglauser, M. (2019). *Pairwise Comparisons with Flexible Time-Dynamics*. KDD '19. arXiv:1903.07746v2. URL: https://arxiv.org/abs/1903.07746v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5003 lines — model, kernels, inference, all experiments §§4.1–4.3, related work).
**Verdict:** ADAPT — this is the strongest methodological paper in the wave for GSE: replace/augment the Elo rater (0603) with GP time-varying team strengths using composite kernels (piecewise-constant for season breaks + Matérn for within-season form), home advantage as a feature, and Gaussian likelihood on point differential. It strictly generalizes Elo/TrueSkill and unifies with 0604's career-trajectory idea.

## 1. Research question
Pairwise-comparison models (Bradley–Terry, Elo, TrueSkill) assume static skills or Brownian-motion dynamics — but real skills show trends, mean reversion, multi-timescale variation, and discontinuities (season breaks). Can we model team/player scores as continuous-time Gaussian processes with composable covariance functions, keep inference linear-time and scalable to millions of observations, and beat Elo/TrueSkill predictively? Applied to tennis, NBA, football, chess (7M games), and StarCraft.

## 2. Dataset / schema
- Six datasets (Table 2): ATP tennis 20,046 players / 618,934 matches (1991–2017); NBA 102 teams / 67,642 games (1946–2018); world football 235 teams / 19,158 (1908–2018, ties); ChessBase small 19,788 / 306,764 (1950–1980); ChessBase full 343,668 / 7,169,202 (1475–2017); StarCraft WoL 4,381 / 61,657; HotS 2,287 / 28,582 (no timestamps; known intransitivities).
- Protocol: chronological 70/30 train/test; hyperparameters by log-marginal-likelihood (Bayesian) or LOO log-loss; prediction uses all data up to the day before t* (true prequential setting).

## 3. Method / model
- **Score processes:** s_m(t) ~ GP[0, k_m(t,t′)] (eq. 1); competitor score s_i = x_iᵀ s(t*) — sparse linear feature combination (one-hot by default; can encode home advantage, player lineups per Maystre et al. 2016, or any match context).
- **Observation:** (x_i, x_j, t*, y) with flexible likelihoods: ordinal probit/logit (win/loss/tie), Gaussian on point difference, Poisson-exp on points scored (Maher 1982).
- **Kernel library:** constant (offset), piecewise-constant (discontinuities across seasons), Wiener (Brownian — subsumes Elo/TrueSkill dynamics), Matérn(ν) (ν=1/2 = mean-reverting Brownian), linear (trends); composed by addition/multiplication (Duvenaud 2014).
- **Inference (Algorithm 1):** variational (EP or reverse-KL) with mean-field factorization; linear-time iterations, <100 to converge (Δ log-marginal-likelihood < 10⁻³), embarrassingly parallel; reference implementation https://github.com/lucasmaystre/kickscore; Go port (gokick): 7M chess observations at ~5 s/iteration on 16 threads (2× Xeon E5-2680 v3).
- **Key validations:** mean-field vs. exact Gaussian inference identical to 4 decimals (0.634 log-loss / 0.664 acc on NBA 2000–2005); EP vs. reverse-KL identical to 3 decimals (recommend reverse-KL for stability with non-closed-form likelihoods).
- **Intransitivity:** pairwise interaction features s_ij added to s_i − s_j beat the purpose-built Blade-Chest model on StarCraft.

## 4. Equations & assumptions
GP prior (1), feature-mapped scores, likelihoods as in §3. Assumes: observations conditionally independent given score processes; kernel family chosen per sport by marginal likelihood; mean-field factorization across features. Elo recovered as SG on the same likelihood with Wiener dynamics (§5, cf. 0603's eq. 25).

## 5. Features / target
Inputs: (team i, team j, timestamp, outcome [+ points/goals]). Features: competitor identity (one-hot), optional context features (home, lineup, White). Target: outcome probabilities p(y | x, t*) via posterior over score processes; secondary: plotted score trajectories s_m(t) for interpretation.

## 6. Validation design
Prequential log-loss + accuracy on chronological holdouts vs. Random / Constant / Elo / TrueSkill (Table 3); likelihood ablation (Table 4); home-advantage feature ablation (Table 5); Blade-Chest comparison on StarCraft (Fig. 5); inference ablations (§4.3).

## 7. Numerical results / baselines
- **Ours wins or ties everywhere (Table 3):** ATP tennis 0.552/0.714 (Affine+Wiener) vs. Elo 0.563/0.705, TrueSkill 0.563/0.705; NBA 0.630/0.645 (Constant+Matérn 1/2) vs. Elo 0.634/0.644; world football 0.926/0.558 vs. Elo 0.950/0.551, TrueSkill 0.937/0.554; chess 1.026/0.474 (Constant+Wiener) vs. Elo 1.035/0.447. **Different sports need different kernels** — learned, not assumed.
- **Timescales learned:** dynamic component 1.75 years (basketball — volatile) vs. 7.47 years (tennis — stable); score plots recover known history (Celtics '60s, Bulls '95–96).
- **Likelihoods (Table 4):** Gaussian on point diff best for NBA (0.627 vs 0.630); Poisson-exp best for football (0.922 vs 0.926) — use the score, not just the outcome.
- **Home advantage as feature (Table 5):** football 0.926→0.900 log-loss, 0.558→0.579 acc; chess White 1.026→1.019.
- **Scale:** linear-time, millions of observations feasible — no scaling excuse for NFL's ~5k games/season.

## 8. Code / data availability
Code: kickscore (Python, reference) and gokick (Go, multithreaded) — both public on GitHub. Data: public (Sackmann tennis, basketball/football sources listed) except ChessBase (commercial).

## 9. Leakage & limitations
- **Gains over Elo are modest** (0.004–0.024 log-loss) — the win is flexibility + uncertainty + interpretability, not a predictive revolution; don't oversell.
- **Kernel selection by marginal likelihood** on 70% train is honest here, but NFL's 32-team/17-game seasons give far less data per team than NBA/tennis — kernel hyperparameters (especially Matérn timescale) may be weakly identified; pool hierarchically or fix from multi-season fits.
- **Piecewise-constant season-break kernel** assumes clean breaks; NFL has preseason roster churn bleeding across the break — the discontinuity model is an approximation.
- **Mean-field factorization** validated only on one NBA subset; interaction-heavy feature setups (lineups) untested for factorization quality.
- **No player-level dynamics** in the experiments — team-only; the lineup-feature idea is cited, not demonstrated.

## 10. GSE overlap
**Major extension; subsumes 0603.** The existing-research map shows GSE has Elo-style ratings and market-implied tiers, but no GP-based time-varying strength model — and 0603's canonical Elo is literally the special case (Wiener kernel + SG inference, §5). The transferable core, all directly NFL-applicable: (a) **composite kernels**: piecewise-constant (season breaks) + Matérn-1/2 (within-season form, mean-reverting) + constant (baseline strength); (b) **home advantage as a learned feature**, not a fixed 2.5 points; (c) **Gaussian likelihood on point differential** (Table 4 says use the score); (d) **lineup/injury features** in x_i — the paper explicitly blesses encoding player availability, which is GSE's injury-edge lane; (e) full posterior → honest uncertainty on team strength for content. This also unifies with 0604 (GP over career time) — same math, team level. Lane: team ratings → spread/ML engine prior.

## 11. GSE implementation spec
- **GSE-GP team strength:** 32 NFL teams + 1 home-advantage feature; kernel = piecewise-constant (season boundaries) + Matérn ν=1/2 (timescale learned, init ~6 weeks) + constant; Gaussian likelihood on demeaned point differential (or ordered probit on win/loss as robustness check — Table 4 says try both). Fit on 2015–2026 nflverse with the kickscore reference implementation (or a Stan/PyMC port); hyperparameters by log-marginal-likelihood on rolling windows.
- **Lineup extension (phase 2):** add injury-driven features (starting QB out = feature vector shift) per the paper's x_i mechanism — this is the differentiator vs. plain Elo.
- **Output:** posterior mean team strengths + credible intervals as the engine's team-strength prior; weekly trajectory plots for content ("GSE form curves").
- Effort: ~1 week (phase 1, reusing kickscore); phase 2 ~1–2 weeks.

## 12. Reproducible test
Dataset: nflverse 2018–2025. Protocol: prequential — each week, fit on all prior games, predict week's spreads/ML; metrics: log-loss and ATS accuracy vs. (a) canonical Elo (0603), (b) SVD-NRS (0606), (c) market. Success: GP matches or beats Elo on log-loss over 2023–2025 AND produces better-calibrated underdog probabilities (the posterior-uncertainty advantage). Ablation: kernel components (drop piecewise-constant, drop Matérn) to confirm each earns its keep via marginal likelihood.

## 13. Acceptance / rejection gate
ADAPT as the engine's team-strength module if, on 2023–2025 prequential evaluation, GP log-loss ≤ Elo log-loss with statistical significance (paired t-test on weekly log-loss, p < 0.05) OR calibration is strictly better at equal log-loss (the uncertainty story). If it can't beat the 1-day Elo implementation, REJECT the full GP but keep the two portable tricks: home-advantage-as-learned-feature and Gaussian-on-margin likelihood inside the existing pipeline.

## 14. Improvement experiment
The paper's untested promise — **lineup features**: encode each team's game-day offensive personnel (QB/RB/WR1/TE availability as sparse features, cf. Maystre et al. 2016) into x_i so the GP learns player-level contributions to team strength jointly with team form. Compare prequential log-loss vs. team-only GP on 2022–2025, focusing on weeks with surprise inactives. Hypothesis: the lineup-augmented model captures post-injury regime changes immediately (no Elo-style lag), beating team-only GP specifically in high-churn weeks — and the learned player-feature weights double as trade/injury impact estimates for content ("losing X costs 1.7 points of team strength, with a credible interval").
