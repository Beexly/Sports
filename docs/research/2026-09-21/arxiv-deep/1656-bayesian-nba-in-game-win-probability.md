# 1656 Bayesian estimation of in-game home team win probability for NBA games (arXiv:2207.05114)

**Citation:** (authors as listed on arXiv). *Bayesian estimation of in-game home team win probability for NBA games*. arXiv:2207.05114 (2022). URL: https://arxiv.org/abs/2207.05114
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; abstract through references, including the blending-coefficient optimization, Brier-score tables, and appendix on the expert prior). Not an abstract-only read.
**Verdict:** ADAPT — the expert-informed dynamic beta prior plus optimized pregame/in-game blending is directly transferable to GSE's NFL live win-probability engine, but the validation leakage (blend tuned on test seasons) and discontinuous binning must be fixed in the port.

## 1. Research question

Can a Bayesian in-game win-probability estimator — a dynamic beta prior built from a poll of NBA experts, updated with binned play-by-play outcomes, then blended with a pregame probability — compete with ESPN's proprietary in-game model on second-by-second NBA win probability?

## 2. Method/model

For each elapsed second t = 0..2879 and score lead ℓ, estimate P(home win | t, ℓ). Empirical cell counts (n wins of N games) in a time×score window are combined with a dynamic beta prior (α, β elicited from 14 NBA experts including front-office associates) via posterior mean (n+α)/(N+α+β). Windowing: standard [t−3,t+3]×[ℓ−2,ℓ+2]; 3–1 minutes remaining: score width [ℓ−1,ℓ+1]; final minute: no score binning. The raw in-game estimate is then blended with a pregame win probability via a logistic-style blend whose coefficients are optimized to minimize Brier score: B3 = −1.10633 − 0.02313·I0(ℓ) + 0.00027·t + 0.06618·|ℓ| − 0.00139·ℓ².

## 3. Mathematics/equations/assumptions

- Likelihood: Binomial(N_cell, p); prior Beta(α(t,ℓ), β(t,ℓ)) from expert poll (experts give win probabilities at anchor (t,ℓ) points; interpolated).
- Posterior mean: p̂ = (n + α)/(N + α + β).
- Pregame/in-game blend: logit(p_blend) = B-coefficient function above applied to combine p_pregame and p_ingame (B3 specification includes intercept, scoreless-indicator I0(ℓ), elapsed time t, |ℓ|, ℓ²).
- Assumptions: exchangeability of games within a (t,ℓ) window; expert prior correctly centered; pregame probability (TeamRankings/Elo) is well-calibrated; binning discontinuities are negligible; no possession/clock-stoppage structure modeled.

## 4. Dataset/schema

- ESPN NBA play-by-play, seasons 2012/13 through pre-COVID 2019/20; postseason and bubble games excluded.
- Training: 7,376 games explicitly reported.
- Test: full 2018/19 and 2019/20 seasons, each Q = 6,590,576 second-level observations.
- Expert prior: poll of 14 NBA experts (front-office associates among them).

## 5. Features and target

- Features: elapsed game second t, home score lead ℓ, pregame win probability (TeamRankings or Elo).
- Target: binary home-team win (second-level Brier evaluation).

## 6. Validation design

- Train on 2012/13–2017/18; test on 2018/19 and 2019/20 at the second level (6.59M observations each).
- Metrics: Brier score vs the authors' dynamic-Bayes variants and ESPN's in-game model.
- **Leakage flaw:** the blend coefficients (B3) were optimized on the same test seasons used for evaluation — not nested/held-out.

## 7. Exact results and baselines with numbers

- Blend-model Brier: linear-time 0.1622; linear time+score 0.1613; quadratic (B3) 0.1598.
- Season/total Brier: dynamic Bayes 0.1663 / 0.1736 / 0.1697; adjusted dynamic Bayes (blended) 0.1568 / 0.1635 / 0.1598; ESPN 0.1550 / 0.1621 / 0.1582 — blended model within ~0.0016 of ESPN overall.
- Pregame source comparison (in-game Brier): TeamRankings pregame 0.2167 → in-game 0.1598; Elo pregame 0.2179 → in-game 0.1605.
- Expert prior anchors the early-game estimates where data are sparse; the blend's ℓ² term captures garbage-time nonlinearity.

## 8. Code/data availability

No code repository stated; ESPN play-by-play is proprietary (partially reconstructable from public feeds). Expert poll data not published.

## 9. Leakage and limitations

- **Validation leakage:** blend coefficients optimized on the test seasons — reported Brier gains are optimistic; true out-of-sample performance unknown.
- Expert prior is subjective and NBA-specific; 14 experts is a small panel.
- Binning is discontinuous at window edges (especially the final-minute regime switch).
- ESPN model is a black box — comparison is to an unknown benchmark.
- Only time + score + pregame strength; no pace, fouls, possession, or player-availability features.

## 10. GSE overlap

GSE already has in-game WP and calibration/Brier infrastructure, plus pregame ratings (Elo-family). This paper's contribution is the *mechanism*: expert-informed dynamic beta prior for sparse early-game cells + an optimized parametric pregame/in-game blend. Frame as an upgrade to GSE's existing live-WP blending, not a new model family. The B3 functional form is a concrete starting spec for NFL.

## 11. Implementation specification

- Build `gse.live.WPBlender`: per (seconds elapsed, score differential, down/distance bucket) cells, empirical WP with a dynamic beta prior whose α,β come from GSE's pregame model mapped through a prior-strength schedule (high early, decaying); posterior mean (n+α)/(N+α+β).
- Blend: logistic blend of pregame WP and cell WP with features {t, |ℓ|, ℓ², I(ℓ=0), possession} — coefficients fit by minimizing Brier on a *validation* slice strictly before the test slice (nested temporal split).
- Serve at 1-second (or per-play) cadence; output both blended WP and cell-sample-size diagnostics.

## 12. Reproducible test

- nflverse 2009–2024 play-by-play: build (t, ℓ) cells per the paper's windowing adapted to NFL (quarter/time remaining × score differential); prior from GSE/Elo pregame WP.
- Fit blend on 2009–2019, validate on 2020–2021, test on 2022–2024 (strictly nested — the paper's leakage fixed).
- Metrics: Brier score and calibration curves on test; compare vs GSE's current live WP and vs a no-blend baseline.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** on the strictly held-out 2022–2024 test, the blended estimator beats GSE's current live-WP Brier by ≥ 0.002 AND beats the no-blend cell estimator by ≥ 0.003, with calibration slope in [0.95, 1.05]. Miss → REJECT the blend (keep the beta-prior cell estimator only if it alone beats baseline).
- **Improvement experiment:** (i) continuous kernel smoothing over (t,ℓ) instead of hard bins — expect −0.001 Brier; (ii) add down/distance/timeout/possession features to the blend — expect −0.002; (iii) team-specific prior strength (hierarchical) — expect better early-game calibration for mismatches.

**Verdict:** ADAPT — the expert-prior + optimized-blend architecture is the right live-WP upgrade for GSE, but only with nested temporal validation and continuous smoothing replacing the paper's leaky, binned setup.
