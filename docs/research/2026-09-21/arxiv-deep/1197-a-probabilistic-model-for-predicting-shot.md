# [1197] A Probabilistic Model for Predicting Shot Success in Football (arXiv:2101.02104v1)

**Citation:** Edward Wheatcroft, Ewelina Sienkiewicz (2021). *A Probabilistic Model for Predicting Shot Success in Football*. arXiv:2101.02104v1. URL: https://arxiv.org/abs/2101.02104v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 1142-line extraction; all sections read, appendices included).
**Verdict:** ADAPT

A parametric team-rating model for pre-match shot-conversion probability with time-decayed MLE, honest calibration diagnostics (reliability diagrams, Platt scaling, climatology blending), and proper-scoring-rule evaluation against betting markets — directly adaptable as a calibration and rating-decay methodology for GSE's NFL forecasting stack.

## 1. Research question
Can a simple parametric model of each team's probability of scoring *given that it takes a shot* — estimated pre-match from team attacking/defensive ratings with time-decayed maximum likelihood — produce skillful probabilistic forecasts, and does combining it with shot-volume predictions improve match-outcome and over/under-2.5-goals forecasts (and betting returns) beyond a climatological (league-average) shot-success baseline?

## 2. Dataset / schema
- **football-data.co.uk** repository (public): **162,435 matches** across **22 European leagues** since 2000/01 (through 2018/19); **77,124** with shots/corners data; **62,218** after excluding a 6-match-per-team-season burn-in.
- Per match: shots, shots on target, corners, goals; plus bookmaker odds (match outcome, over/under 2.5, Asian handicap) from multiple bookmakers via BetBrain (max odds used for profit calculations).
- League table as extracted (e.g., EPL 9,120 matches / 7,220 with data / 5,759 post-burn-in; Championship 13,248/10,484/8,641).
- Replicable: data source is public and the schema is standard.

## 3. Method / model
- **Shot-success model (parametric rating system)**: for home team i vs away team j, p(G_h) = 1/(1+e^(−m_h)) with m_h = c + h + ½(a_i + d_j); away p(G_a) = 1/(1+e^(−m_a)) with m_a = c − h + ½(a_j + d_i). Parameters: per-team attacking a_i and defensive d_i ratings (Σa = Σd = 0 constraints), constant c, home advantage h — **2T+2 parameters** optimized simultaneously by MLE (Matlab fmincon, interior-point, zero initialization) with **half-life time weighting** w = (1/2)^(x/H), x = days since match.
- **Calibration fixes for overfitting**: Platt scaling (p̃ = 1/(1+exp(A+bp))) and **blending** (p̃ = αp + (1−α)p_c, α fit by minimizing mean ignorance); blending wins.
- **Combination with shot volume**: GAP ratings (Appendix A; home/away attacking/defensive ratings updated by λ-weighted residuals, Nelder-Mead via fminsearch) predict shots Ŝ_h, Ŝ_a; expected goals E_h = Ŝ_h·P(G_h), E_a = Ŝ_a·P(G_a). Ordered logistic regression on V = E_h − E_a → match-outcome probabilities; logistic regression on V = E_h + E_a → P(over 2.5).
- Skill measured **relative to a climatological baseline** (historical league-average shot success p_c) so the value added by team-specific ratings is isolated; odds-implied probabilities optionally added as extra regressors.

## 4. Equations & assumptions
- p(G_h) = 1/(1+exp(−m_h)), m_h = c + h + ½(a_i + d_j); p(G_a) = 1/(1+exp(−m_a)), m_a = c − h + ½(a_j + d_i).
- w_time,m(x_m) = (1/2)^(x_m/H); likelihood L = Π_m φ(p_m, O_m)^{w_time,m}, φ(a,1) = a, φ(a,0) = 1−a.
- Climatology: p_c = ΣG_m / ΣS_m.
- Platt: p̃ = 1/(1+exp(A+bp)); blending: p̃ = αp + (1−α)p_c.
- E_h = Ŝ_h P(G_h), E_a = Ŝ_a P(G_a); climatology versions C_h = Ŝ_h p_c, C_a = Ŝ_a p_c.
- GAP update (home team i): H^a_{i,k+1} = max(H^a_{i,k} + λφ_1(S_{i,k} − (H^a_{i,k}+A^d_{j,k})/2), 0), and symmetric away/home/attack/defense updates; objective f = (1/N)Σ(|S_h − Ŝ_h| + |S_a − Ŝ_a|).
- Scoring rules: Brier = Σ(p_i − o_i)²; RPS = Σ_{i=1}^{r−1}(Σ_{j=1}^{i}(p_j − o_j))²; Ignorance = −log_2(p_y) — all proper.
- Kelly stake proportion — **published-paper typo verified 2026-09-21 against the arXiv LaTeX source (ar5iv HTML rendering of equation 23)**: the paper prints f_i = max((o_i + p̂_i − 1)/(o_i − 1), 0), but the Kelly criterion for decimal odds is f_i = max((o_i·p̂_i − 1)/(o_i − 1), 0) — the "+" in the numerator must be a multiplication. Implemented verbatim, the printed formula bets on negative-edge outcomes (e.g., o = 2, p̂ = 0.4 gives f = 1.4 instead of 0) and overbets positive edges (o = 2, p̂ = 0.6 gives f = 1.6 instead of 0.2). The paper's betting results presumably used the correct Kelly in code; anyone reimplementing must use (o_i·p̂_i − 1)/(o_i − 1). Stakes normalized so mean stake = 1 for comparability with level stakes.
- Assumptions: shot outcomes conditionally independent given ratings; ratings static within the half-life-weighted window; climatology is the right no-skill benchmark; ordered-logit ordering (home win > draw > away win) is appropriate.

## 5. Features / target
- Shot-success model: team identities (via learned a_i, d_i) + home/away indicator → P(score | shot).
- Match-outcome model: V = E_h − E_a (+ optionally odds-implied home-win prob) → P(home/draw/away).
- Over/under model: V = E_h + E_a (+ optionally odds-implied over prob) → P(total > 2.5).
- Horizons: pre-match forecasts only; regression parameters refit on all matches up to the day before each forecast match.

## 6. Validation design
- **62,218** match-outcome forecasts and **53,447** over/under-2.5 forecasts, each built from parameters fit on all prior matches (expanding window, day-before cutoff), with a 6-match burn-in per team-season excluded from scoring.
- Baselines: climatological shot-success version of the same pipeline (isolates the rating model's value); odds-implied probabilities as an augmentation test.
- Metrics: mean Ignorance, Brier, and RPS **relative to the climatology baseline** (negative = skillful); plus betting profit under level-stakes value betting (bet if p̂ > 1/odds) and normalized Kelly, using maximum BetBrain odds.
- Reliability diagrams with 95% consistency bars (Bröcker & Smith 2007a) used to diagnose miscalibration.

## 7. Numerical results / baselines
- Raw shot-success forecasts: **overdispersed** (reliability diagrams show high forecasts too high, low too low) and **fail to beat climatology** on Ignorance/Brier at every half-life — diagnosed as overfitting from 2T+2 simultaneous parameters.
- After calibration: both Platt scaling and blending produce **negative relative Ignorance/Brier (skillful)**; blending consistently better; optimal half-life **H = 60 days** for shot-success skill.
- Match outcome (no odds regressor): shot-success model adds skill at all H (negative relative Ignorance/RPS); optimal H = **30 days**; but **betting profit slightly decreases** under both level stakes and Kelly — skill ≠ profit.
- Match outcome (with odds-implied regressor): relative skill **positive (counterproductive)** and profit falls — authors' interpretation: shot-success information is already efficiently in the match-odds (double counting).
- Over/under 2.5 (no odds): skill improves at all H; **major profit improvement** under both strategies but still **slightly negative overall**; optimal H = **90 days**.
- Over/under 2.5 (with odds-implied): skill improves (negative relative scores) and profit rises for most H; optimal H = **300 days** — longer memory helps totals.
- Market-efficiency implication: the over/under 2.5 market does not fully account for team shot-conversion ability; the match-outcome market appears to.

## 8. Code / data availability
Matlab (fmincon/fminsearch) used; **no code link stated**. Data public via football-data.co.uk.

## 9. Leakage & limitations
- Expanding-window refit with day-before cutoff is clean; no lookahead in the forecast design. But the half-life H is selected on the same evaluation set (Figures 1, 3, 5–8 sweep H and report the optimum) — mild selection bias in the reported "optimal" values.
- 2T+2-parameter MLE overfits without the calibration fixes — the paper is honest about this, but any reimplementation must include the blending/Platt step or it will fail.
- Profit results use maximum available odds (best-case execution, no limits/slippage); still negative for O/U 2.5 — the "major improvement" does not reach profitability.
- Soccer-only; shot-count data quality varies by league (some leagues have sparse early coverage); GAP rating parameters (λ, φ_1, φ_2) fit by least squares on the same data.
- The odds-augmentation asymmetry (helps totals, hurts match outcome) is given a plausible but speculative double-counting story — not proven.

## 10. GSE overlap
High complementarity, low duplication. The map shows GSE's calibration stack covers Platt scaling, temperature scaling, isotonic, reliability diagrams/LRD, and CQR — but the **specific combination here is new to the corpus**: (a) a parametric pre-match conversion-efficiency rating (attacking/defensive shot-success parameters) with **half-life-weighted MLE**, (b) **climatology blending** as the named overfitting fix with α fit on mean ignorance, (c) **reliability-diagram-driven diagnosis with consistency bars** as the gate before trusting a rating model, and (d) the **skill-vs-profit dissociation analysis** (improved proper scores with flat/negative betting returns, and the odds-augmentation double-counting result). No existing ledger builds a conversion-efficiency rating or tests odds-augmentation asymmetry. Adjacent: Wheatcroft's GAP/over-under work is cited, not duplicated.

## 11. GSE implementation spec
- **Adapt the rating-decay + blending pattern to GSE's NFL probability pipeline**: (1) implement half-life-weighted MLE for any team-level efficiency parameter GSE rates (e.g., red-zone TD conversion, third-down conversion, explosive-play rate allowed) with H swept 30–300 days-equivalent (games, not days, for NFL: H in games); (2) add climatology blending p̃ = αp + (1−α)p_c as a standard shrinkage step for high-parameter-count rating models, α fit by minimizing mean ignorance on a calibration fold; (3) gate every new rating model on reliability diagrams with consistency bars before it touches the ensemble — overdispersed models get blended or dropped; (4) replicate the odds-augmentation test: add each new signal as a regressor alongside odds-implied probabilities and require it to improve *relative* Ignorance/RPS, not just standalone skill — signals that only help without odds are double-counted by the market.
- Data: nflverse play-by-play (conversion events), odds APIs (already in GSE stack). Effort: ~1–2 weeks for the rating+calibration harness; the GAP-style updater is optional (GSE has its own rating machinery).

## 12. Reproducible test
- Dataset: nflverse 2018–2025 regular-season play-by-play; derive per-team per-game third-down conversion probability forecasts from a parametric (attacking/defensive) rating with half-life weighting.
- Metric: mean Ignorance and Brier **relative to a climatological baseline** (league-average conversion rate), plus reliability diagrams with consistency bars.
- Baselines to beat: (a) climatology (must beat: negative relative scores); (b) GSE's current conversion model if one exists; (c) the same pipeline with odds-implied probabilities added — the signal must not degrade relative skill (the paper's double-counting check).
- Window: expanding-window, week-before cutoff, first 4 weeks of each season as burn-in. Runnable in a day on nflverse.

## 13. Acceptance / rejection gate
**Adopt** the half-life-weighted rating + climatology-blending + reliability-gate pattern into GSE's calibration stack if, on the reproducible test above, the blended rating model achieves negative relative Ignorance *and* Brier vs climatology with reliability-diagram points inside the 95% consistency bars, and does not degrade relative skill when odds-implied probabilities are added as regressors. **Reject** (keep current stack) if blending cannot fix overdispersion or the odds-augmentation test shows double counting with no standalone-skill gain.

## 14. Improvement experiment
Go beyond the paper in two ways the authors flag but don't try: (1) **player-level conversion ratings** — the paper notes expected-goals models use shot location but ignore team ability, while their model uses team ability but ignores shot nature; build the joint model (location features × team/player ability with half-life decay) and test whether the interaction term adds relative skill; for GSE, the analog is situation+personnel-conditioned conversion ratings (e.g., QB-specific third-down ratings blended with team ratings). (2) **Adaptive half-life**: the paper's optimal H varies wildly by target (30d match outcome, 90d totals-no-odds, 300d totals-with-odds) — fit H per market/target by cross-validated ignorance instead of fixing one value, which the paper's sweep suggests but never implements.

**Verdict:** ADAPT
