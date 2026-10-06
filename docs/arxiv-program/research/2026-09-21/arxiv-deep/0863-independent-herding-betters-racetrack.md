# [0863] Component Ratios of Independent and Herding Betters in a Racetrack Betting Market (arXiv:1006.4884)

**Citation:** Mori, S. & Hisakado, M. (2010). *Component Ratios of Independent and Herding Betters in a Racetrack Betting Market*. arXiv:1006.4884 [physics.soc-ph]. URL: https://arxiv.org/abs/1006.4884
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/1006.4884.txt (26,624 bytes, complete incl. references). Cross-checked against https://arxiv.org/abs/1006.4884.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — headline measurement: only ~1 in 4 bettors carries information; the independent:herding ratio is **1:3**, estimated from the convergence exponent β = 0.488 via r_i = β/2. The estimation technique (fit t^{−β} convergence of implied probabilities to close, invert to an informed-money fraction) is directly portable to NFL line data. Companion to ledger 0862 (0911.3249).

## Citation / full-text source
S. Mori & M. Hisakado, Kitasato University, June 2010. MEXT Grant-in-Aid 21654054. Extends the authors' voting-model work (arXiv:0907.4818) and the scale-invariance study (arXiv:0911.3249, ledger 0862).

## Research question
Are bettors rational? Decompose the betting crowd into independent voters (who bring private information about winning probabilities) vs herding voters (who vote by popularity), and measure their component ratio from the dynamics of the win bet time series.

## Dataset / schema
- **JRA 2008 win bets:** 2,471 races (final public win pool 10⁵ ≤ V_r ≤ 3×10⁵, average 1.89×10⁵); 7–18 horses/race; **N = 35,719** horses (102 cancelled ignored); **N₁ = 2,472** winners (one tie); **K ≃ 2.0×10⁵** announcements (13–217 per race, ~80 average).
- Win bet fraction: x_{i,k}^r = 0.788/(O_{i,k}^r − 0.1) (eq. 1), renormalized. Time t = pool averaged over races (eqs. 2–5), range 70 ≤ t ≤ t_f = 1.89×10⁵. **Caution (authors'):** t ≥ 10⁵ does not reflect true time evolution (voting ended in small-pool races) — reference only.
- Timing: first announcement ~10 h before start (t ≈ 71); 30 min before: ~4×10⁴ votes; **almost half of votes in the last 9 min**.
- Accuracy ratio AR ≡ 2·(Prob(α_w < α_l) − 1/2) = 2·(AUC_ROC − 1/2) (eqs. 8–9); final **AR_f = 0.6826**.

## Method
1. Rank all horses by x_α(t); compute squared convergence [(x_α(t) − x_{α,f})²] (eq. 10) and AR_f − AR(t) vs t on double-log plots; fit power laws a·t^{−β}, AR_f − a·t^{−γ}.
2. Two-type voting model: independent voters (vote the target horse with probability w = true winning probability) at rate r_i; herding voters (vote ∝ current popularity X_t^w) at rate r_h; r_i + r_h = 1. Master equation P_t^w(n+s) = r_i·w + r_h·(n+s)/(Z+t) (eq. 11), Z = N^r·s (eq. 12), evolution eq. 13; large-t limit P_t^w = r_i·w + r_h·x_t^w (eq. 14).
3. Map from a fundamental/herding model: P_t^w = r_f·(w + λ(w − x_t^w)) + r_h′·x_t^w (eq. 15) → **r_i = (1+λ)·r_f, r_h = r_h′ − λ·r_f** (eq. 16). Value-bettors who bet ∝ (w − x) aggregate to look exactly like "independent" voters — this rescues the model from the unrealistic literal assumption that independents know w.
4. Fit w to a gamma distribution p_{a,c}(w) (eq. 17) with shape **a = 0.47** (least-squares fit to the final-odds distribution, mean 1/N^r); model reproduces AR_f = 0.682.

## Equations / math / assumptions
- Convergence regimes (independent of w; survives averaging over the gamma prior):
  - (x_t^w − w)² ~ t^{−1} if r_i > 1/2 (normal diffusion) (eq. 18)
  - (x_t^w − w)² ~ **t^{−2r_i}** if r_i < 1/2 (super-diffusion) (eq. 19)
  - (x_t^w − w)² ~ log(t)/t if r_i = 1/2 (eq. 20)
- Measured β = 0.488 ⇒ **r_i = β/2 = 0.244** ⇒ independent:herding ≈ **1:3**.
- Initial seed s (X_0^w = s): controls vote correlation; s small → concentrated early votes, larger variance. AR convergence exponent depends on s; **s = 3** matches the data AR curve (Fig. 6); early concentrated votes at k=1 carry almost no information (AR ≈ 0 at t ≃ 70).

## Features / target
Descriptive market-dynamics study; the "target" is the decomposition of the crowd and the explanation of the two power laws.

## Validation
- Double-log fits over 2,471 races: β = 0.488 ± 0.007 (holds t ≤ t_c ≃ 3×10⁴; convergence becomes rapid after t_c); γ = 0.589 ± 0.005 (holds wider range, up to ~10⁵, including after t_c).
- Model with r_i = 0.244, s = 3 reproduces both power laws simultaneously (Figs. 5–6); the data's larger early variance is captured by the small-seed effect.
- Falsification logic: the post-t_c speedup of x(t) *cannot* be explained by more independent voters (that would also speed AR convergence, contradicting the AR power law's persistence) — so the information-providing ratio is stable while something else changes late.

## Exact results with baselines
- [(x_α(t) − x_{α,f})²] ~ t^{−0.488} (vs t^{−1} normal diffusion); AR_f − AR(t) ~ t^{−0.589}.
- Component ratio independent:herding = **1:3** (r_i = 0.244).
- Baselines are the theoretical regimes (eqs. 18–20): normal diffusion t^{−1} rejected in favor of super-diffusion t^{−0.488}.

## Code / data availability
No code or data link; JRA data proprietary; all formulas fully specified.

## Leakage
N/A — descriptive.

## Limitations
- Parimutuel JRA market; fixed-odds NFL books differ mechanically (bookmaker vs crowd-set prices).
- The literal "independent voters know w" assumption is unrealistic; the paper's defense is the fundamental-voter mapping (eq. 16), which is a reinterpretation rather than evidence.
- Post-t_c behavior unexplained; the AR power law has no mathematical derivation (numerical only).
- w's gamma prior with a = 0.47 fitted to final odds; single year of data.

## GSE overlap vs existing-research-map
- **Gap #3 (market microstructure)**: this is the quantitative core of that gap — a measured informed-vs-noise money split (25% informed) in a real betting market. Nothing in the corpus decomposes market money this way.
- Pairs with ledger 0862: that ledger's AR/EAR diagnostic tells *when* the market is efficient; this ledger tells *who* makes it so (a 1:3 minority of information carriers).
- The fundamental→independent mapping (eq. 16) matters for GSE: sharp money that bets value ∝ (w − x) is observationally equivalent to "independent" voters, so the model applies to NFL steam/line-move data without requiring literal mind-reading.

## Implementation spec (GSE adaptation)
1. **NFL herding-fraction estimator:** for each game, track the de-vigged implied probability from open to close at N time buckets; fit [(x(t) − x_close)²] ∝ t^{−β} across games; invert r_i = β/2 (when β < 1). A β near 1 means the market is mostly independent/informed; β near 0.5 (as in JRA) means ~75% herding — a regime where fading late steam / trusting own model over late line moves is justified.
2. **Steam decomposition:** split line moves into "independent-like" (moves that persist into close and correlate with outcome residuals — information) vs "herding-like" (moves that mean-revert — popularity-following). Use the 1:3 ratio as a Bayesian prior on the information content of any given line move.
3. **Ranking-ability tracking:** replicate the AR(t) power-law fit (γ = 0.589) on market-implied rankings vs outcomes over the betting window to measure how fast the NFL market's discrimination improves — informs the optimal time to snapshot market-implied ratings for the GSE ensemble.

## Reproducible test
1. Rebuild the t^{−β} convergence fit on NFL spread/total implied-probability time series (The Odds API historical or public line archives).
2. Gate: recover a stable β < 1 across ≥2 seasons (evidence of herding); then test whether games/seasons with lower implied r_i (more herding) show larger gaps between GSE model probabilities and closing lines that resolve in GSE's favor (positive CLV and realized edge). If β ≈ 1 consistently, the transfer fails — the NFL market is already independent-dominated.

## Numeric gate
**β = 0.488 ± 0.007 → r_i = 0.244 (1:3); γ = 0.589 ± 0.005; AR_f = 0.6826; t_c ≃ 3×10⁴.** For GSE: gate is β̂ < 1 with r̂_i = β̂/2 stable across seasons; the JRA 1:3 value is a prior, not a target — NFL fixed-odds markets may show a higher informed fraction.

## Improvement experiment
Condition the β fit on *handle-time* (fraction of total handle arrived) rather than clock/vote time, and separately for games with vs without major injury news: if news-driven games show β closer to 1 (informed) while quiet games stay near 0.5 (herding), the estimator doubles as a news-impact detector — directly useful for GSE's injury/news adjustment of market-implied probabilities.

## Verdict
**ADAPT.** The β → r_i = β/2 estimation technique and the 1:3 informed:herding prior give GSE a principled way to decompose NFL line movement into information vs crowd-following — the quantitative heart of the market-microstructure gap (#3). Read together with ledger 0862's efficiency-phase diagnostic.
