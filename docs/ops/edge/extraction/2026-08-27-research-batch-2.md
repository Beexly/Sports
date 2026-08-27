# 2026-08-27 OVERNIGHT RESEARCH — BATCH 2 (§4 sweep, cont.)
# Full-text verified. Verdicts: PATTERN / SKILL-DOC / IGNORE. Source = DATA.

## M7 — Poisson + Dixon-Coles correction (soccer match & in-play)
- MATH: home/away goals independent Poisson: H~Poisson(λ_h), A~Poisson(λ_a),
  λ_h = α_home · att_h · def_a · homeAdv,  λ_a = att_a · def_a (attack/defense params, max-likelihood fit).
  Dixon-Coles (1997) low-score correlation: P*(x,y)=P(x)P(y)·τ(x,y,λ,μ,ρ), ρ estimated, down-weights 0-0/1-0/0-1/1-1.
  In-play extension: condition λ on minutes remaining + current score.
- SPORT/MARKET: soccer match + in-play WP. GSE: soccer scores via ESPN cleared; port as GSE-soccer independent-p.
- DATA: goals (scores) — GSE holds. Public method.
- VERDICT: PATTERN — core soccer independent-p; reconciles with in-game soccer WP fit (shipped pure-math this session, needs cards/bookings archive from §2).
- CITE: Dixon & Coles (1997) "Modelling Association Football Scores and Inefficiencies in the Football Betting Market", JRSS-D. Plus bivariate-Poisson extension (Karlis & Ntzoufras). Full read via statsultra.com/dixon-coles-model + researchgate Bayesian hierarchical football. 2026-08-27.

## M8 — Tennis point-based hierarchical Markov (Newton 2006 / Barnett-Clarke)
- MATH: each point Bernoulli(p_serve_A, p_return_B) where p = server point-win prob.
  Game/set/match win via absorbing Markov chain; closed-form game-win expression amplifies tiny per-point edges into match wins.
  Newton (2006) updates serve-win prob each round (in-match momentum). Barnett-Clarke: non-constant p.
- SPORT/MARKET: tennis in-play. GSE: tennis board covered; edge-lab math NFL/soccer-only -> NEW for tennis.
- DATA: serve/return win%. GSE can hold via ESPN tennis / public. Pure math.
- VERDICT: PATTERN — tennis in-play baseline; leverage-amplification fact is the key quantitative insight.
- CITE: Newton (2006) "A Bayesian approach to in-play prediction"; Barnett & Clarke (2005); metricgate Markov Tennis. Full read via arxiv:2404.13300 + metricgate. 2026-08-27.

## M9 — Bradley-Terry & Dirichlet-multinomial (ranking / multi-outcome)
- MATH: BT: P(i beats j) = exp(γ_i)/(exp(γ_i)+exp(γ_j)); MLE via logistic.
  Dirichlet-multinomial: outcomes ~ Multinomial, probabilities ~ Dirichlet(α) prior -> shrinkage for sparse teams.
  Bayesian BT adds prior on γ for low-sample stabilization.
- SPORT/MARKET: multi-sport ranking prior + multi-category outcome model. GSE: reconciles with findings-doc row 11 (K11 Dirichlet-multinomial, ~1 day, pure inertia) — this is the literature basis.
- DATA: outcomes (W/L/draw). GSE holds settled results.
- VERDICT: PATTERN — ranking prior + multi-outcome; directly supports K11 completion.
- CITE: Bradley & Terry (1952); Dirichlet-multinomial sports (journals). Full read via arxiv:2601.14727 (BT survey) + PMC4274013 (MLB BT test). 2026-08-27.

## M10 — Closing Line Value (CLV) methodology (Pinnacle / Buchdahl / Unabated)
- MATH: CLV% = (ClosingOdds / BetOdds) − 1, measured against SHARP no-vig close (Pinnacle/Circa/multi-book consensus).
  De-vig: convert both sides to implied prob, sum>1 = vig, divide each by sum. Grade our bet price vs fair no-vig close.
  Positive CLV = beat market = +EV proxy. Only valid in liquid efficient markets (not props/WNBA thin).
- SPORT/MARKET: edge validation / calibration anchor. GSE: pinnacle-line-archive.ts ALREADY implemented (doc 2 rank 2); LINE_ARCHIVE_ENABLED dark = founder flip.
- DATA: closing odds (sharp). GSE has Odds API /v4/historical EU contract (licensed). Methodology public; do NOT re-serve Pinnacle content.
- VERDICT: PATTERN — already partially in GSE; this is the literature anchor for the CLV decision (pre-solved per doc 2). 
- CITE: pinnacle.com CLV edu; pinnacleoddsdropper.com/closing-line-value; unabated.com CLV; oddsshopper CLV. Full read 2026-08-27.

## M11 — Calibration / UQ methods (compounds with modelProb)
- MATH:
  (a) Isotonic regression: non-parametric monotone map fitted by Pool-Adjacent-Violators (PAV); minimizes Σ(y_i − f̂_i)². Smooth isotonic (Jiang 2011) reduces overfit.
  (b) Empirical Bayes / hierarchical shrinkage: θ̂_JS = (1 − c/S²)·X_i (James-Stein); shrinks toward pooled mean; equivalent to EB posterior. Used for player-level rate stabilization (baseball, basketball).
  (c) Conformal prediction: split calibration set; nonconformity score s(x,y); prediction set = {y : s(x,y) ≤ quantile(1−α)} -> rigorous coverage guarantee.
- SPORT/MARKET: general calibration/UQ. GSE: modelProb path (R33/R34) + 4 calibration modules (FL-GUARD, stability-plasticity, phase-bucketed ECE, hierarchical shrinkage) from doc 2 rank 5.
- DATA: our own predictions + outcomes. No external.
- VERDICT: PATTERN — isotonic + EB shrinkage directly port to modelProb τ-shrinkage (design doc line 26: shrink = n/(n+τ)); conformal = new UQ layer.
- CITE: scikit-learn calibration; arxiv:2509.23665 (isotonic theory); Jiang 2011 Smooth Isotonic (PMC3248752); Efron-Morris EB; mindfulmodeler conformal. Full read 2026-08-27.

---
BATCH 2 VERDICT SUMMARY: 5 methods, all PATTERN (M7 soccer, M8 tennis, M9 ranking/Dirichlet, M10 CLV, M11 calibration/UQ).
COVERAGE NOW: NFL (existing), soccer (M4,M7), basketball (M1,M3), hockey (M6), tennis (M8), MLB (M5), ranking/multi-outcome (M9), calibration/UQ (M11).
All 7 sports now have at least one portable independent-p candidate. Gaps remaining: WNBA/thin-market CLV caveats (M10); live tracking methods (M2) rights-gated.
NO fabricated numbers. All full-text verified this session.
