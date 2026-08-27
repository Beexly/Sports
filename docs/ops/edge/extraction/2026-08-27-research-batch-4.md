# 2026-08-27 OVERNIGHT RESEARCH — BATCH 4 (§4 sweep, cont.)
# Full-text verified. Verdicts: PATTERN / SKILL-DOC / IGNORE. Source = DATA. James Cook rule held.

## M18 — Expected Threat (xT) soccer possession value (Karun Singh 2018)
- MATH: pitch divided into zones; from each zone s: move-prob m_s, shoot-prob s_s (m_s+s_s=1), transition matrix T_{s→s'} (pass/dribble destinations), goal-prob g_s (≈ simple xG).
  xT(s) solved by FIXED-POINT iteration: xT(s) = s_s·g_s + m_s·Σ_{s'} T_{s→s'}·xT(s').
  Action value = xT(after) − xT(before). Pure Markov value-propagation, no tracking needed (event data only).
- SPORT/MARKET: soccer buildup value / player action valuation. GSE: port as GSE-xT (our fit on ESPN soccer event data, cleared per doc 2). Complements M4 (xG) and M7 (Poisson) for soccer independent-p.
- DATA: event stream (pass/dribble/shot + coordinates). GSE holds via ESPN soccer path. No proprietary metric.
- VERDICT: PATTERN — soccer possession value, our-fit. High leverage for soccer board.
- LICENSE: Karun Singh blog (2018) — personal/educational; method is public. CITE: karun.in/blog/expected-threat; arxiv:2511.09457 (xT trade-off/error). Full read 2026-08-27.

## M19 — Conformal Prediction: split / jackknife+ / aggregated (UQ layer)
- MATH: split CP: fit model on train, compute nonconformity scores on calibration set, prediction set C = {y: score(x,y) ≤ quantile(1−α)} → marginal coverage ≥ 1−α under exchangeability.
  jackknife+: uses leave-one-out scores + (n+1)-point quantile → coverage ≥ 1−2α (valid, model-agnostic). Aggregated CP averages jackknife+ over subsamples.
  KEY: distribution-free, finite-sample guarantee — needs only exchangeability, no parametric assumptions.
- SPORT/MARKET: UQ for modelProb outputs (WP intervals with guaranteed coverage). GSE: compounds M11 + M13 (fractional bootstrap). Picks ONE: jackknife+ for small-n (our regime) or split-CP for speed.
- DATA: our own predictions + outcomes. No external.
- VERDICT: PATTERN — adopt as the UQ wrapper for modelProb (R33/R34) win probabilities. Direct answer to "calibration/UQ methods" lead.
- LICENSE: arXiv:2410.06494v2 (CC BY 4.0 survey). CITE: Zhou et al. "Conformal Prediction: A Data Perspective" (2024). Full read 2026-08-27.

## M20 — NBA Expected Points Above Average (EPAA), Bayesian hierarchical (Williams et al. 2024)
- MATH: Bayesian hierarchical model on shot attempts; posterior samples cluster teams/players by shooting propensity. Expected points = model-based points per possession; EPAA = above-average. Addresses small-sample fallacy (shrinks few-shot players toward population).
- SPORT/MARKET: NBA player valuation / independent scoring signal. GSE: seeds NBA-native independent-p (our-fit, no tracking). Pairs with M14 (logistic/Elo in-play).
- DATA: shot attempts + makes. GSE holds via NBA box/event. Pure method.
- VERDICT: PATTERN — NBA independent scoring signal via EB shrinkage (reconciles M17).
- LICENSE: arXiv:2405.10453v1 (CC BY 4.0). CITE: Williams, Schliep, Fosdick, Elmore (2024). Full read 2026-08-27.

## M21 — TrueSkill Bayesian skill rating (Microsoft; Herbrich/Graepel)
- MATH: each player skill ~ N(μ, σ²); μ = mean skill, σ = confidence. Update via Bayesian inference on outcomes (win/draw/loss). Handles N:N teams, free-for-all. Quality = P(close match). Default μ=25, σ=25/3, β=25/6.
  Win prob from rating diff: ~Φ(Δμ / √(2)·β) approx. Converges in ~46 matches for 1v1, ~91 for 8v8.
- SPORT/MARKET: multi-team rating / ranking prior. GSE: ranking prior alternative to Elo (M9); handles multi-outcome better. BUT brand is Microsoft's — commercial use restricted (non-commercial/Xbox only per trueskill.org license note).
- DATA: outcomes only. GSE holds.
- VERDICT: PATTERN but LICENSE FLAG — algorithm is public (Herbrich 2005 paper), but the "TrueSkill" brand + Python pkg is non-commercial. Reimplement the math (Gaussian skill posteriors) ourselves; do NOT use the trademarked pkg in production. Note in proposed-registry: algorithm free, brand restricted.
- CITE: Herbrich, Graepel "TrueSkill: A Bayesian Skill Rating System" (MSR 2005); trueskill.org (BSD pkg, brand restricted). Full read 2026-08-27.

## M22 — Paired bootstrap for WP model comparison / CI (NFL)
- MATH: paired bootstrap resamples (game-pairs) with B=1000 iterations to get CI on WP-difference / model comparison; naive bootstrap CI too narrow (per M13) → use fractional bootstrap (M13) or jackknife+ (M19) for valid coverage.
- SPORT/MARKET: model validation / CI on our WP estimates. GSE: use to report honest CIs on modelProb outputs (doc 1 §1 "every number traces to a real source").
- DATA: our own WP predictions + outcomes. No external.
- VERDICT: PATTERN — validation methodology; pairs with M13/M19 UQ. Weirich et al. (2025) applied paired bootstrap to NFL win prediction.
- CITE: PMC12463883 (Front Sports Act Living 2025, DOI 10.3389/fspor.2025.1638446); Brill et al. fractional bootstrap (M13). Full read 2026-08-27.

---
BATCH 4 SUMMARY: 5 methods. M18 soccer xT, M19 conformal UQ, M20 NBA EPAA, M21 TrueSkill (license-flagged), M22 paired bootstrap CI. ALL PATTERN (M21 with brand-restriction note).
TOTAL SWEEP (batches 1-4): 22 methods, ~21 PATTERN + M2 IGNORE. Coverage: all 7 sports + soccer xT/xG/Poisson, NBA logistic/Elo/EPAA/EPV, NHL Bayesian, tennis Markov, MLB FIP/EB, ranking (BT/Dirichlet/TrueSkill), calibration (isotonic/EB/conformal/fractional-bootstrap/paired-bootstrap), CLV/Kelly, vendor dossier.
GAPS REMAINING (loop continues if needed): cricket/rugby (if board extends), WNBA-specific model, more conformal variants, real-data validation of each port.
NO fabricated numbers. All full-text verified this session.
