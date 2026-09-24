# [0936] Behavioral Player Rating in Competitive Online Shooter Games (arXiv:2207.00528)

## Citation / full-text source

- arXiv:2207.00528 — full text: https://arxiv.org/pdf/2207.00528
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Arman Dehpanah, Muheeb Faizan Ghori, Jonathan Gemmell, Bamshad Mobasher (2022). *Behavioral Player Rating in Competitive Online Shooter Games*. arXiv:2207.00528 [cs.AI]. URL: https://arxiv.org/abs/2207.00528.
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
Can interpretable *behavioral ratings* — built from engineered in-game behavioral features via factor analysis + logistic-regression weighting — estimate players' true performance better than Elo, Glicko, TrueSkill, while staying as interpretable as traditional ratings (unlike latent-factor ML models)? Tested across four shooter modes: Deathmatch, CTF, tactical head-to-head, battle royale.

## 2. Dataset / schema
- **Halo 3 Slayer** (team deathmatch, 4v4 pro): >2,300 matches, 270 players. **Halo 3 CTF**: >1,800 matches, 260 players (both via HaloFit/DeLong et al.).
- **CS:GO** (tactical 5v5): ~20,000 matches, 4,500 players (Kaggle).
- **PUBG duo** (battle royale): >25,000 matches, 825,000 players (Kaggle).
- All matches timestamp-sorted; behavioral features normalized (Z-score); new players initialized at 0.

## 3. Method / model
- **Feature engineering:** four groups — skill/aggression/expertise (KD ratio, killing spree, damage dealt, accuracy/headshots, DBNO, melee/grenade kills); outcome-derived (winning rate, rank ratio); interests/tactics (survival time, walking/riding distance); support (kill assist, flash assist, flag steals); negative (betrayal, suicide); experience (games played).
- **Factor analysis** (PCA extraction, oblique rotation; loadings normalized to sum to 1): Halo-Slayer → 1 factor (Skill); Halo-CTF → 1 (Skill); CS:GO → 2 (Skill, Support); PUBG → 2 (Skill, Strategy).
- **Three rating constructions:** single-factor μ (one feature); naive hybrid η(p) = Σμ_i(p) (unweighted sum); **weighted hybrid Ω(p) = Σω̂_i(p)μ_i(p)** with weights from logistic regression (binary for head-to-head modes, ordinal/proportional-odds for battle royale), normalized |weights| to sum to 1, sign kept for direction.
- **Team rating = max of member ratings** — the team's performance is determined by its best player (citing their own 2021 CoG team-aggregation study).
- Prediction: Φ_H2H / Φ_F4A sort teams by rating descending → predicted rank list.

## 4. Equations & assumptions
- η(p) = Σ_{i=1}^{n} μ_i(p); ℱ(p) = Σ_{i=1}^{n} ℓ_i(p)μ_i(p) (factor with loadings ℓ).
- Logit(Ŷ) = I + ω_1μ_1 + … + ω_mμ_m + ε (m<n after selection); proportional-odds form for ordinal ranks, intercept discarded.
- Ω(p) = Σ_{i=1}^{m} ω̂_i(p)μ_i(p), |ω| normalized to 1.
- CS:GO support example: S(p) = 0.669590·KillAssist(p) + 0.330410·FlashAssist(p); Ω_CS:GO(p) = 0.552309·Skill + 0.276699·Experience + 0.170992·Support.
- Φ_H2H = arg sort_{i∈{1,2}}((F,s_i)|ρ_{1,2}); Φ_F4A = arg sort_{i∈{1..n}}((F,s_i)|ρ_{1..n}).
- Assumptions: Z-scored features comparable; higher hybrid rating → higher win chance; max-member team aggregation; oblique rotation allows correlated factors.

## 5. Features / target
Inputs: per-player cumulative behavioral features → factors → single/hybrid ratings. Target: match outcome (head-to-head: accuracy) or rank list (battle royale: NDCG).

## 6. Validation design
Chronological online evaluation; three setups per dataset (all players / top-tier first-10-games (top 50 by latest TrueSkill, >10 games) / frequent first-100-games (>100 games)); metrics: accuracy (H2H modes), NDCG (PUBG). Logistic weights from 5-fold CV classification: binary accuracies 61.8% (Slayer), 63% (CTF), 65.4% (CS:GO); ordinal PUBG 72.2% NDCG.

## 7. Numerical results / baselines
Table III (Elo, Glicko, TrueSkill, 3 best single-factors μ1–μ3, η, Ω):
- **Halo Slayer (acc):** All — Elo 61.4 best system, Ω **63.0**★. Top-tier — TrueSkill 61.5, Ω **64.1**★ (all three single-factors — KD, win rate, accuracy — also beat systems). Frequent — TrueSkill 61.8, Ω **63.2**★.
- **Halo CTF (acc):** All — Elo 63.9, Ω **66.6**★. Top-tier — TrueSkill 65.0, Ω **68.8**★. Frequent — TrueSkill 62.8, Ω **67.7**★ (win rate + KD beat systems on frequent too).
- **CS:GO (acc):** All — Elo 64.7, Ω **65.2**★. Top-tier — TrueSkill 57.2 (systems collapse), Ω **67.0**★ — a ~10-point gap. Frequent — Elo 64.3, Ω **66.1**★.
- **PUBG (NDCG%):** All — TrueSkill 61.7, Ω **67.0**★. Top-tier — Elo 71.7, Ω **79.2**★. Frequent — TrueSkill 67.9, Ω **76.7**★.
- **Weighted hybrid Ω is best overall in all 12 cells.** Naive hybrid η also beats systems in most cells (e.g., PUBG top-tier 70.1 vs Elo 71.7 — one of few misses). Single factors beat systems mainly on top-tier setups (skill features) and PUBG.
- Factor loadings (Table I): CS:GO Skill = Damage 0.3871 + KD 0.2707 + Accuracy 0.1838 + WinRate 0.1585; Support = KillAssist 0.6696 + FlashAssist 0.3304. PUBG Skill = Damage 0.3448 + KD 0.3319 + DBNO 0.3233; Strategy = Survival 0.3962 + Walking 0.3371 + Riding 0.2668.
- Regression weights (Table II): CS:GO — Skill 0.5523, Experience 0.2767, Support 0.1710. PUBG — Strategy 0.3518, Experience 0.2833, Skill 0.2572, RankRatio 0.1077. Halo-Slayer — Skill 0.3307, Experience 0.3202, KillAssist 0.2494, Betrayal −0.0650, Suicide −0.0347. Halo-CTF — Skill 0.3309, Steal 0.2494, Experience 0.2190, Betrayal −0.0767, Melee 0.0736, Suicide −0.0504.

## 8. Code / data availability
Datasets public (HaloFit, Kaggle). No code stated.

## 9. Leakage
Chronological, pre-match features only — clean. Top-tier selection by *latest* TrueSkill rating evaluated on first 10 games = post-hoc selection (same caveat as 0935).

## Limitations
- Shooter-genre only; features don't port literally to football.
- Team = max(member) is asserted from their own prior work, not re-derived here; 0934 used sum — the two papers in this chain disagree on aggregation and never reconcile it.
- No significance tests; no confidence intervals on the 12-cell sweep.
- Movement-dynamics features missing (authors' own note).
- Betrayal/suicide negative features have tiny weights — included more for completeness than effect.

## 10. GSE overlap vs existing-research-map
- Third in the chain **0934 (metrics) → 0935 (single-feature behavior) → 0936 (weighted hybrid)** — read all three as one arc. This paper delivers 0935's stated future work (weighted hybrid).
- Repo gap: no interpretable multi-factor player ratings; the GSE engine's QB tiers and metric families (EPA, CPOE, TPRR) are *unweighted collections* — nothing extracts latent factors or learns weights against game outcomes while keeping the linear, explainable form.
- The max-vs-sum team aggregation disagreement (0936 max vs 0934 sum) is itself a valuable experiment to run on NFL data.

## 11. Implementation spec (GSE adaptation)
- **NFL Ω-rating:** per-player (QB first) features in four groups mirroring the paper — Skill (EPA/play, CPOE, success rate), Support (YAC facilitation, screen/blocking proxies, e.g., RB/WR run-blocking grades), Strategy (pace, play-action rate, aggressiveness on 4th down), Experience (career snaps). Z-score, factor-analyze (expect Skill/Support/Strategy/Experience factors), weight factors by logistic regression on game outcomes 2018–2021, build Ω_QB(p) = Σω̂·factor. Team rating = max(QB Ω) vs sum(position Ω) — test both (settles the 0934/0936 disagreement on football).
- **Content product:** Ω-style ratings are linear combinations of *named* factors — publish "Galaxy Skill Rating" breakdowns (Skill 55% / Experience 28% / Support 17%) per QB, exactly the paper's interpretability argument, as site/social content.
- **Matchup use:** predict games by sorting on team Ω (Φ analog); blend with existing Elo as a two-model ensemble.
- Effort: 1.5 weeks (factor pipeline + weight fitting + backtest).

## 12. Reproducible test
Dataset: nflverse 2018–2025. Build QB factor model on 2018–2021 (factors + logistic weights), freeze, predict 2022–2025 games via team Ω (max-QB and sum variants). Baselines: existing GSE Elo, raw EPA/play sort. Success: Ω-based predictions beat GSE Elo log-loss by ≥0.005 on 2022–2025 AND the max-vs-sum comparison yields a clear winner (≥0.003 gap) — settling the aggregation question for football.

## 13. Numeric gate
ADAPT confirmed if the NFL Ω-rating (factor + logistic-weight pipeline) beats the existing GSE Elo on 2022–2025 walk-forward log-loss by ≥0.005 with the linear form intact (interpretability preserved — no black-box substitution allowed). Reject if Ω ≈ Elo (gap <0.003) or if factor analysis yields no stable factors across season splits (factors must replicate on 2018–2019 vs 2020–2021 halves).

## 14. Improvement experiment
**Negative-behavior factors:** the paper's betrayal/suicide features had tiny weights in shooters, but football has high-leverage negative behaviors — turnover-worthy plays, drops, penalties, sacks taken. Build a "Harm" factor (negative loadings allowed, sign kept per the paper's method) and test whether Harm-factor asymmetry between teams predicts ATS outliers: hypothesis — games where one team's Harm rating exceeds the other's by >1σ produce underdog covers at a rate 8%+ above base on 2022–2025. This extends the paper's framework to the negative tail it under-explored, directly targeting market mispricing of "self-destruction" risk.

## 15. Verdict

**ADAPT** — the weighted-hybrid sequel to 0935 (same authors, third in the 0934→0935→0936 chain): factor analysis extracts interpretable latent factors (Skill, Support, Strategy) from behavioral features, logistic regression assigns weights, and the weighted hybrid rating **Ω(p) beats Elo/Glicko/TrueSkill in all 12 dataset×setup cells**. The GSE adaptation: build interpretable multi-factor NFL player/team ratings — factor-analyze efficiency/support/strategy/experience features into named factors, weight them by logistic regression on game outcomes, keep the linear form so ratings stay explainable (content-friendly). Also notable: team rating = **max** of member ratings (star-player model), directly testable against 0934's sum model on NFL data. Not ADOPT: shooter-specific features; the construction pipeline is what transfers.
