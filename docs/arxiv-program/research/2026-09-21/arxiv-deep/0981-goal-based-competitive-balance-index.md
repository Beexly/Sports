# Deep-Read Ledger 0981 — A Mathematical Take on the Competitive Balance of a Football League

## Citation / full-text source

- arXiv:2102.09288 — full text: https://arxiv.org/pdf/2102.09288
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **Citation:** Deb, S. (2021). "A mathematical take on the competitive balance of a football league." arXiv:2102.09288v1 [stat.AP], 18 Feb 2021.
- **Full-text source:** https://arxiv.org/html/2102.09288v1 (HTML, read in full incl. appendix proofs; ~51.5k chars)

## Research question
Can competitive balance be measured from actual scorelines (not just W/D/L outcomes), with a formal statistical test of whether a league deviates from perfect balance — and does such an index explain league revenues better than the standard concentration indices?

## Dataset / schema
- 5 European leagues (Bundesliga, EPL, La Liga, Ligue 1, Serie A) × 10 seasons (2009–10 to 2018–19); match scorelines from datahub.io.
- League revenues in billion € from Deloitte 2020. ~19–29% of matches drawn per league-season.

## Method
1. Formalize "perfectly balanced league" (Def. 3): any permutation of the n teams is equally likely to be the final standing.
2. Under independent-Poisson goal scoring, prove the ideal-balance conditions (Theorems 1–2).
3. Define the Goal-Based Index (GBI) and prove its χ² test (Theorem 3).
4. Simulation study (n=5 leagues, 10,000 replications): multinomial goodness-of-fit on final-standing permutations; type-I error and power of the GBI test.
5. Panel regression (FE and RE, R `plm` package, Hausman test) of revenue on balance index + linear trend.

## Equations / math / assumptions
- Assumption 1: goals X_ijk ~ independent Poisson(λ_ijk).
- **Theorem 1:** if all λ_ijk = λ, ∃ **λ_0 ≈ 0.88** with P(draw) = 1/3. Proof: P(Y1=Y2|λ) = e^{−2λ}·I_0(2λ) (modified Bessel I_0); continuity argument between λ→0 (draw certain) and λ→∞ (draw → 0).
- **Theorem 2:** with 3/1/0 points and iid Poisson(λ) for any λ>0, league is perfectly balanced. Goal difference Y_ij = X_ij1 − X_ji0 ~ **Skellam(λ,λ)** with pmf **P(Y_ij=k) = e^{−2λ}·I_{|k|}(2λ)**; pairwise symmetry P(S1>S2)=P(S1<S2) extends through tiebreakers (GD, GS, head-to-head).
- **Definition 4 (GBI):** **GBI = [1/((2N−1)·λ̂)] · Σ_{i≠j} Σ_{k∈{0,1}} (X_ijk − λ̂)²**, where N = n(n−1) matches, **λ̂ = (1/2N)·Σ_{i≠j}Σ_k X_ijk** (mean goals per team-match).
- **Theorem 3:** under perfect balance, **(2N−1)·GBI ~ χ²_{2N−1}** asymptotically (Taylor expansion of the Poisson likelihood-ratio statistic: −2logΛ = 2Σ X_ijk log(X_ijk/λ̂) ≈ (2N−1)·GBI). Reject balance if statistic > χ²_{2N−1;α}.
- Benchmarks: **C6 = (n/6)·Σ_{j=1}^6 P_(j)** (top-6 point share), **HICB = n·Σ_i P_i²** (Herfindahl on point shares).
- Revenue panel: **R_lt = α_l + βt + γ·CB_lt + ε_lt**.

## Features / target
- Features: GBI / C6 / HICB per league-season; linear trend; league fixed/random effects.
- Target: Deloitte total league revenue (billion €).

## Validation
- Simulations: multinomial goodness-of-fit p-values fail to reject equal-permutation null across λ (Theorems verified); GBI test type-I error ≈ 5% at all λ; **power > 99% even when only 1 of 20 teams** has a different scoring parameter.
- Hausman tests: p = 0.48 (C6), 0.65 (HICB), 0.73 (GBI) → random effects preferred.
- Theoretical draw probabilities d_λ̂ (0.24–0.28) track observed draw shares (0.19–0.34); flagged anomalies: EPL 2013-14/2018-19, La Liga 2010-11, Ligue 1 2010-11, Serie A 2014-15 (|d_λ̂ − D̂| ≥ 0.05).

## Exact results with baselines
- Table 3 panel regression: **GBI coefficient −1.52* (SE 0.72) FE / −1.47* (0.72) RE** — the only significant balance coefficient. C6: −0.87 (1.22) / −0.69 (1.23), ns. HICB: −1.57 (2.88) / −1.27 (2.90), ns. Trend 0.20–0.21*** all models. Adjusted R²: **0.70–0.71 (GBI)** vs 0.67–0.68 (C6/HICB).
- Index correlations: GBI–C6 = 0.52, GBI–HICB = 0.46, C6–HICB = 0.90 — GBI captures different information.
- Balance findings: Bundesliga/EPL/La Liga never perfectly balanced (except Bundesliga 2017/18, EPL 2010/11, La Liga 2018/19); **Ligue 1 imbalanced every season after 2013/14** (PSG/Monaco investment; 6 different winners in 6 prior seasons); Serie A most balanced (significant deviation only 4/10 seasons).

## Code / data availability
- R + RStudio 1.2.5033, R 3.6.2, `plm` package (Millo 2017); data sources named (datahub.io, Deloitte) but no repo.

## Leakage
- Indices computed from full-season data for descriptive claims; revenue regression is associational, contemporaneous — fine for its purpose.

## Limitations
- Independence assumption across matches/teams is strong (ignores form, injuries, home advantage — ironically assumes away the very effect of ledger 0978).
- Revenue regression is associational; only 5 leagues × 10 seasons = 50 observations for a panel with league effects; no causal claim sustainable.
- λ_0 = 0.88 ideal has no empirical counterpart (real λ̂ ≈ 1.17–1.59); Theorem 1's "equal 1/3 outcomes" is a mathematical curiosity rather than a practical benchmark.

## GSE overlap vs existing-research-map
- Map: Poisson/Skellam/Dixon-Coles listed as covered methods; competitive balance appears only via market-implied tiers. **No coverage of a score-dispersion-based league balance index or a formal χ² parity test.** Complements ledger 0980 (which found conventional indices useless for attendance; this one finds them useless for revenue too, with GBI winning instead).

## Implementation spec (GSE adaptation)
- Adapt GBI to the NFL as a **league-parity / competitiveness feature**: compute per-season (or rolling 4-week) overdispersion of team scoring vs Poisson baseline: GBI_NFL = Σ (team_points − λ̂)² / ((2N−1)λ̂). Use as a regime feature in totals models (high parity → tighter spreads/totals; low parity → blowout risk) and as a season-narrative input for content.
- The χ² test gives a principled "is the league unusually top-heavy this season?" detector — a content + modeling signal (e.g., 2026 season parity check for the weekly packet).

## Reproducible test
- nflverse 2000–2025: compute rolling 8-week GBI-style overdispersion of team points scored; correlate with subsequent-8-week ATS favourite cover rate and mean absolute spread. Predict: low-GBI (parity) windows → favourites underperform ATS.

## Numeric gate
- **Power > 99% with only 1/20 teams deviating, at 5% type-I error** — the test genuinely detects imbalance; and **GBI −1.47* (0.72) vs HICB −1.27 (2.90)** — the score-based index is the only one that significantly explains revenue.

## Improvement experiment
- Extend GBI to gameweek-level (rolling window) balance and test whether it predicts next-week upset rate / TV ratings — the author's own proposed follow-up. Compare against a bivariate-Poisson (Dixon-Coles style) baseline to quantify what the independence violation costs.

## Verdict
**ADAPT** — the GBI (score-dispersion χ² test of league balance) is a novel, theoretically grounded index; adapt as an NFL parity-regime feature and imbalance detector. The Poisson-overdispersion construction is the reusable idea.
