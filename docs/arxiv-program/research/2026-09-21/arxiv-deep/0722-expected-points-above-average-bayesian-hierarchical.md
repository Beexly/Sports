# [0722] Expected Points Above Average: A Novel NBA Player Metric Based on Bayesian Hierarchical Modeling (arXiv:2405.10453v2)

**Citation:** Benjamin Williams, Erin M. Schliep, Bailey K. Fosdick, Ryan Elmore (2024). *Expected Points Above Average: A Novel NBA Player Metric Based on Bayesian Hierarchical Modeling*. arXiv:2405.10453v2. URL: https://arxiv.org/abs/2405.10453v2
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/2405.10453.txt (212 lines, full: abstract, §1, §2 data, §3 model, §4 results, §5 Shiny app/code, §6 conclusions, references).
**Verdict:** ADAPT — Bayesian hierarchical clustering with full-posterior "above average" player evaluation; the EPAA construction (player performance vs hierarchical average, same shot volume) adapts directly to GSE's player-prop tiers and uncertainty-aware prop gating.

## 1. Research question
Can we build an interpretable, fully probabilistic NBA player-evaluation metric — expected points above average (EPAA) — from a Bayesian hierarchical clustering of shot-taking and shot-making profiles, that captures offensive value not measured by PER/BPM and works within and across seasons?

## 2. Dataset / schema
2.6M field-goal and free-throw attempts, NBA 2008–09 through 2020–21 (13 seasons), via nbastatR (NBA API). Seven NBA-defined offensive regions (ATB, LC3, RC3, ITP, MID, RA, FT — 3pt/2pt/1pt point values). Per team/season and player/season: shot counts and makes per region. Player analysis on top 100 shot takers per season. Public data.

## 3. Method / model
Bayesian hierarchical mixture: shot counts (N_i^1..N_i^K) | w_i ~ Multinomial(N_i, p_{w_i}); makes M_i^k | z_i ~ Binomial(N_i^k, q_{z_i}^k); Dirichlet(α) priors on selection profiles, Beta(1,1) on accuracy profiles; L=J=10 latent clusters (100 combinations), α=β=γ=5; k-means initialization; Gibbs sampling (10k iterations, 3k burn-in, 7k posterior samples). **Expected points (EP):** posterior predictive points with fixed shot volume Ñ=8000 (2020–21 avg), isolating shooting characteristics from volume. **EPAA:** for player i, posterior predictive expected points with Ñ_i shots using player-level cluster posterior minus expected points of an "average" team with the same shots = difference-of-means distribution (full uncertainty, not a point estimate).

## 4. Equations & assumptions
- (1) (N_i^1,...,N_i^K) | w_i ~ Multinomial(N_i, (p_{w_i}^1,...,p_{w_i}^K)).
- (2) M_i^k | z_i ~ Binomial(N_i^k, q_{z_i}^k).
- (3) (p_w^1,...,p_w^K) ~ Dirichlet(α,...,α); q_z^k ~ Beta(1,1).
- (4)–(5) cluster memberships w_i, z_i ~ Multinomial(1,·); membership probs ~ Dirichlet(β), Dirichlet(γ).
- EP via posterior predictive: f(M̃ | Ñ, N, M) = ∫ Σ f(M̃|Ñ,ω) f(Ñ|Ñ,ω) f(ω|N,M) dω; EPAA = E[points(player i, Ñ_i)] − E[points(average team, Ñ_i)].
- Assumptions: fixed volume comparison; discretized regions (not continuous (x,y)); cluster counts fixed a priori; 2020–21 season team compositions as baseline "average."

## 5. Features / target
Inputs: shot counts/makes per region. Targets: EP (team), EPAA (player).

## 6. Validation design
Descriptive/benchmark comparison: EPAA vs PER and Box Plus/Minus on 2020–21 top-100 shot takers; cross-season EPAA rankings for 10 top 2010s players; sensitivity analysis on L/J/hyperparameters (results robust); convergence via trace plots + ESS.

## 7. Numerical results / baselines
(quoted exactly)
- 2020–21 expected points (Ñ=8000): top team Brooklyn Nets ≈120 points/game; top four: Nets, Utah Jazz, LA Clippers, Denver Nuggets; bottom four: Timberwolves, Thunder, Cavaliers, Magic.
- EPAA 2020–21: highest posterior means for high-volume accurate 3pt guards (Bradley Beal, Stephen Curry, Kyrie Irving, Damian Lillard); Nikola Jokić ranked 2nd; five "All-NBA snubs" identified (maroon in Fig. 5).
- **No meaningful correlation between EPAA and the proportion of team shots taken** (Joe Harris, Kendrick Nunn: high EPAA, low volume — diagnostic for undervalued players).
- Pearson correlations: EPAA–PER 0.246, EPAA–BPM 0.238, **PER–BPM 0.915** → EPAA captures unique aspects of offensive efficiency.
- Decade view: Curry/Durant dominant through 2010s; Westbrook peak-and-decline; Wade gradual decline; Nowitzki top-12/top-5 late career.
- MCMC: 10k iterations, 3k burn-in; no convergence issues.

## 8. Code / data availability
GitHub: https://github.com/rtelmore/EPAA; Shiny app: https://ryan-elmore.shinyapps.io/NBA-EPAA/; posterior draws downloadable. Data: public NBA API via nbastatR.

## 9. Leakage & limitations
- Paper's own: discretized regions lose continuous spatial nuance; inference focused on metrics, not clusters; EP comparison fixed-volume (doesn't mimic actual season totals); suggests NFL/EPL/NHL extensions as future work (not done).
- Player analysis restricted to top-100 shot takers (selection bias; low-volume players excluded, e.g., Gobert).
- The "average team" baseline is era-specific; cross-era EPAA comparisons need re-basing.

## 10. GSE overlap
New Bayesian-hierarchical instrument for GSE's **props lane**. GSE's scope covers any sport; NBA props are in play, and the map's gap list (#11) flags non-NFL sports depth as thin. The EPAA construction transfers directly: for any player prop (points, rebounds, assists), fit a Bayesian hierarchical model with per-player latent profiles, compute expected performance vs a hierarchical "average player" at the same usage volume, and use the full posterior (not a point estimate) for edge-vs-line and uncertainty gating. The 0.246/0.238 correlations with PER/BPM are the disciplining result: above-average frameworks see value the box-score composites miss. Dedup anchors: NFL's expected-points foundation is Yurko nflWAR (1802.00998, read in depth); Brill et al.'s EP critique (2409.04889) is the caution to apply — selection bias and drive-level dependence in EP models must be checked before trusting EPAA edges. Complements 0721 (injury/wellness hierarchical model) — different hierarchical layer (performance vs availability).

## 11. GSE implementation spec
1. For NBA props: replicate EPAA pipeline — cluster players by shot-region selection and accuracy profiles (hierarchical Multinomial/Binomial as specified), compute expected points at fixed usage Ñ, define player EPAA vs league-average posterior.
2. Convert to betting: EPAA posterior → expected points distribution for tonight's game (usage-adjusted); edge = E[points] − prop line; post only if edge > 0 and 95% credible interval excludes the line (ties to 0714/0716 abstention gates).
3. Extend to other prop types: rebound/assist region profiles (analogous regions = court zones).
Effort: 1 week to replicate (code public), then league-specific extension.

## 12. Reproducible test
Dataset: 2024–25 NBA season shot data (NBA API) + historical prop lines. Replicate EPAA for top-100 shot takers; backtest: bet player props where EPAA-implied mean beats the line by ≥2 points with 95% CI excluding the line; compute ROI vs random-prop baseline and vs a PER-based heuristic. Pass if positive ROI with statistical separation from the baselines.

## 13. Acceptance / rejection gate
ADOPT if the replicated EPAA pipeline shows positive backtest ROI on 2024–25 NBA props and EPAA-vs-line edge predicts covers better than the engine's current player model. REJECT if EPAA adds nothing over raw usage-adjusted averages — the paper's uniqueness claim (vs PER/BPM) must survive in a betting context.

## 14. Improvement experiment
Fix the paper's top-100 restriction: fit the hierarchical model on ALL rotation players with partial pooling — small-sample players (the paper's excluded set) are exactly where Bayesian shrinkage adds most value and where prop lines are softest. Second: make the "average" baseline time-varying (rolling 4-week average team) so EPAA tracks in-season regime change instead of a season-fixed baseline.
