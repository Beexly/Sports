# 1659 A Bayesian Mean-Value Approach with a Self-Consistently Determined Prior Distribution for the Ranking of College Football Teams (physics/0607064)

**Citation:** James R. Ashburn, Paul M. Colvert (Atomic Football). *A Bayesian Mean-Value Approach with a Self-Consistently Determined Prior Distribution for the Ranking of College Football Teams*. physics/0607064 (2006). URL: https://arxiv.org/abs/physics/0607064
**Ledger completed:** 2026-09-21. **Read:** full text (PDF converted to plain text, ~33 pages / 1,633 lines; Sections 1–10 including the June 2007 addendum read in full). Not an abstract-only read.
**Verdict:** ADAPT — the self-consistent (empirical-Bayes) prior for undefeated/winless teams and the outcome-correlation validation metric are worth porting to GSE's Bayesian rating stack, but the win/loss-only scope and 2006-era computation must be modernized.

## 1. Research question

How can college football teams be ranked from win/loss data alone in a fully self-contained Bayesian model — specifically, how should the prior distribution (needed to keep undefeated/winless teams' ratings finite) be determined *from the data itself* rather than hand-tuned, and can the prior's validity be checked against independent game-data metrics?

## 2. Method/model

Bayesian mean-value (posterior-mean, not MAP) rating model. Each team has a mean performance r_i; game-to-game effective performance is Normal with variance 1/2 per team, so relative performance variance σ_v² = 1. Win probability function is the normal CDF Φ(r_i − r_j). Ratings are posterior means computed by numerical integration of moment equations, with opponent rating uncertainty folded in. The prior is Normal centered on each team's *mean scheduled opponent's rating*, with variance σ_p² derived self-consistently from two estimated quantities: mean schedule variance (MSV, spread of opponents within a schedule) and mean team variance (MTV, spread of teams about their mean opponent). Iterative estimation: ratings → MSV/MTV → prior → ratings until convergence. Home field advantage h added as a shift in the rating difference, solved by Newton iteration on the win-count equation.

## 3. Mathematics/equations/assumptions

- WPF: P(i beats j) = P(r_i − r_j, σ_v), σ_v = 1 (from 1/2+1/2 per-team performance variance).
- Intermediate moments: m_i(n) = ∫ r^n Φ_p(r,σ_p) Π_j Φ_ij(r) dr, n=0,1,2; rating r̃_i = m_i(1)/m_i(0); uncertainty σ_i² = m_i(2)/m_i(0) − (m_i(1)/m_i(0))².
- Prior: Φ_p(r,σ_p) = Normal(r_ik̄, σ_p) centered on mean scheduled opponent; σ_p² = σ² − σ'²/N_i (eq. 36), from MSV (σ'², eq. 32) and MTV (σ², eq. 33) with (N_i−1) weighting and rating-uncertainty corrections.
- Outcome correlation coefficient: ρ_i = [½W_i(W_i−1) + ½L_i(L_i−1) − W_iL_i] / [½(W_i+L_i)(W_i+L_i−1)] (eq. 19); season ρ is the (W+L−1)-weighted average (eq. 20).
- Home field: Δ_ij(r) = r − r̃_j + h_ij, h_ij ∈ {+h, −h, 0}; h solved from N_h = Σ P(r̃_home − r̃_away + h, ...) (eq. 42) by Newton iteration.
- Published ranking metric: r̃̃_i = average over all j≠i of P(r̃_i − r̃_j, σ_i²+σ_j²+σ_v²) — a "winning percentage" in [0,1], independent of the σ_v scale choice.
- Assumptions: normal performance deviations, independence across games, no within-season dynamics, schedules fixed; mean-value (not ML) estimation.

## 4. Dataset/schema

- All Division I-A, I-AA, II, III, NAIA college football games, seasons 2001–2005 (~700 teams, ~3,600 games/season in 2005; 2005 data through 11/19/05).
- Per game: teams, winner/loser, site (home/away/neutral). Win/loss only — no margins (BCS restriction from 2002).
- Comparison benchmark: BCS computer top-10 rankings (final official, pre-bowl), 2001–2005.

## 5. Features and target

- Features: game outcomes (win/loss), home/away/neutral site.
- Target: team ratings (posterior means) and ranking; auxiliary targets: outcome correlation ρ, upset frequency U, split frequency in triplets.

## 6. Validation design

- Self-consistency validation: estimate outcome correlation ρ from the fitted MSV/MTV via triple integral (eq. 37) and compare to ρ computed directly from game data (Table 2).
- Sanity bounds on upset frequency: lower bound from end-of-season ranking violations (16–19%), upper bound from composite-system prediction accuracy (Fair & Oster 2002: 72% → ≤28%).
- June 2007 addendum: triplet "split" frequency — Frequency of Splits = 0.25/(1+MSV+MTV) (eq. 44) vs actual triplet data (~6,000 triplets/season).
- Sanity comparison to BCS computer rankings (top-10 tables) and to Massey's computer-average via sum of squared ranking differences.

## 7. Exact results and baselines with numbers

- Outcome correlation: actual ρ 2001–2005: 0.164, 0.158, 0.164, 0.151, 0.157 (precision σ_ρ ≈ 0.010–0.011); model-estimated: 0.161, 0.158, 0.164, 0.153, 0.151 — differences −0.003, 0.000, 0.000, +0.002, −0.006 ("quite accurate and relatively unbiased").
- √MSV ranged 0.93–1.02, √MTV 0.76–0.85 (2001–2005); MTV slightly smaller than MSV as expected under conference play.
- Estimated upset frequency U: 21.2%, 21.3%, 20.7%, 21.6%, 22.2% — inside the 16–19% / 28% bounds.
- Home field advantage h: mean 0.244, SD 0.016 across 2001–2005.
- Triplet splits (addendum): estimated 9.24/9.26/8.78/9.51/9.84% vs actual 9.09/8.93/8.94/9.54/9.44% — differences 0.15/0.33/−0.16/−0.03/0.40%, within the ~0.39% one-sigma precision.
- BCS comparison: top-10 matches "very good and steadily improving"; sum-of-squared ranking differences vs computer average: 38.4 (model, no HFA) vs median 66.1 among the six BCS computers — best by a comfortable margin; with HFA 62.9 vs 62.6 (second by a hair).

## 8. Code/data availability

No code or data published. Rankings were published at atomicfootball.com (now defunct). Method fully specified mathematically — reimplementable.

## 9. Leakage and limitations

- Win/loss only — discards margin information (forced by BCS rules, not a modeling choice).
- No within-season dynamics; schedules treated as fixed; disconnected subgroups (e.g., NESCAC) must be excluded for convergence.
- Upset-frequency "validation" is a sanity bound, not a tight identification — the second metric needed to fully pin down MSV/MTV scale was never found (authors concede this).
- Home-field treatment admitted as "tentative"; prior not adjusted for HFA; HFA correlated with team strength in scheduling.
- 2006-era: no MCMC, no modern empirical-Bayes framing (authors note they "rediscovered" empirical Bayes).

## 10. GSE overlap

GSE's existing rating references (Elo, Glicko, TrueSkill, Bradley–Terry) all need priors/shrinkage for sparse-data teams. This paper's self-consistent prior — estimated from the data's own schedule structure rather than hand-tuned — is the missing piece for GSE's Bayesian ratings: it formalizes how much to shrink expansion teams, teams with few games, or early-season ratings. The outcome-correlation ρ is also a portable diagnostic for schedule parity. Frame as the prior-calibration module for GSE's rating stack.

## 11. Implementation specification

- Build `gse.ratings.SelfConsistentPrior`: for GSE's Bayesian rating model (any WPF), compute per-season MSV/MTV from current rating estimates with (N−1) weighting and uncertainty corrections (eqs. 32–33); set each team's prior variance σ_p,i² = σ² − σ'²/N_i (eq. 36), centered on mean scheduled opponent rating; iterate to convergence with mean-zero normalization each cycle.
- Diagnostics: report season ρ (eq. 20) and model-implied ρ (eq. 37); flag seasons where |Δρ| > 0.02 as prior-misspecification warnings.
- Apply to: NFL (short schedules — prior matters), college football side models, and any sparse-competition rating (e.g., preseason priors).

## 12. Reproducible test

- NFL 2000–2024 game results: implement the paper's full pipeline (ratings + MSV/MTV + self-consistent prior + HFA via Newton iteration).
- Test A: replicate Table 2 — model-implied ρ vs actual ρ per season; require |Δρ| ≤ 0.01 in ≥80% of seasons.
- Test B: predictive — preseason ratings with self-consistent prior vs fixed-variance prior, log-loss on first 4 weeks each season 2015–2024; expect ≥0.005 log-loss improvement.
- Test C: upset-frequency sanity — model-implied U within [observed ranking-violation rate, 1 − best-model accuracy].

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** |Δρ| ≤ 0.01 in ≥80% of NFL seasons 2000–2024 AND self-consistent prior beats fixed-variance prior by ≥ 0.005 log-loss on weeks 1–4 (2015–2024). Fail → REJECT (keep fixed priors).
- **Improvement experiment:** (i) margin-aware extension (ordered-logit WPF) — expect the prior to matter less but calibration to improve; (ii) within-season dynamic ratings with the self-consistent prior as the week-0 anchor — expect faster early-season convergence; (iii) triplet-split diagnostic (eq. 44) on NFL schedules — expect estimated vs actual within 0.5%.

**Verdict:** ADAPT — the self-consistent empirical-Bayes prior and the outcome-correlation diagnostic are genuinely portable upgrades for GSE's rating priors, but the win/loss-only likelihood must be modernized and the scale-identification gap the authors concede must be monitored via the ρ diagnostic.
