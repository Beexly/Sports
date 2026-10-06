# [0094] Football is becoming more predictable; Network analysis of 88 thousands matches in 11 major leagues (arXiv:1908.08991)

**Citation:** Victor Martins Maimone and Taha Yasseri (2019/2022). *Football is becoming more predictable; Network analysis of 88 thousands matches in 11 major leagues*. arXiv:1908.08991v2 (physics.soc-ph; published Royal Society Open Science). URL: https://arxiv.org/abs/1908.08991
**Ledger completed:** 2026-09-21. **Read:** full text (PDF extract, 815 lines; ar5iv HTML did not render).
**Verdict:** ADAPT — adopt the eigenvector-centrality strength rating as an NFL benchmark feature and the predictability/Gini monitoring frame; reject the paper's bare-bones logistic model as an engine candidate.

## 1. Research question
Has football become more predictable over time? Using a minimalist, time-consistent prediction model as a proxy for predictability, the authors test whether 26 years of 11 major European leagues show rising predictability — and whether it tracks rising team inequality (Gini) and declining home-field advantage. (Abstract; Sec. 1–2)

## 2. Dataset / schema
- **87,816 matches**, 236,323 goals (2.7/match), 11 countries' top divisions (Belgium 6,620; England 10,044; France 9,510; Germany 7,956; Greece 6,470; Italy 9,066; Netherlands 7,956; Portugal 7,122; Scotland 5,412; Spain 10,044; Turkey 7,616), seasons 1993/94–2018/19 (some leagues from 1994/95, 1995/96).
- Source: football-data.co.uk. Each datapoint: date/season, league, home team, away team, final score, **Bet365 payoffs** (home/draw/away).
- **Access:** public — Supplementary file 2 `dataset.zip` + https://doi.org/10.5061/dryad.8931zcrrs (stated; not verified live in this task).

## 3. Method / model
- **Training window:** for each match, use past N matches; normalize by season length T: `n = N/T`; all headline results use **n = 0.5**. Predictable matches per season: (1−n)T.
- **Dyadic model:** each team's score = fraction of points earned in window n vs maximum possible; strength difference x = home − away.
- **Network model (the paper's contribution):** directed network over matches in the window, edges point **loser → winner**, weighted by points the winner earned; compute **eigenvector centrality** per team; x = home centrality − away centrality. (Cited: Newman 2018; Bonacich 1987.)
- **Probability map:** logistic regression on score difference, Eq. (4.1): `y = F(x|μ, s) = 1 / (1 + exp(−(x−μ)/s))`, μ and s "obtained by ordinary least squares methods"; y=1 home win, y=0 away win. Home-field advantage quantified by μ (the sigmoid's shift; x<0 still favoring home at Prob ≥ 0.50).
- **Ties excluded** — "To include the ties an additional parameter would be needed"; Fig. S6: tie share constant or slightly diminishing for all but two countries.
- **Market benchmark:** Bet365-implied, Eq. (4.2): `Prob(HomeWin) = (1/h)/(1/h + 1/a)`, `Prob(AwayWin) = (1/a)/(1/h + 1/a)`.
- **Elo comparison:** start 1500, Eq. (4.3): `E_i = 1 / (1 + 10^((R_j − R_i)/400))`; Eq. (4.4): `R'_i = R_i + K(S_i − E_i)`, K=32; rating difference fit to same logistic.

## 4. Equations & assumptions
- Window normalization: `n = N/T`.
- Eq. (4.1): `y = F(x|μ, s) = 1/(1 + exp(−(x−μ)/s))`.
- Eq. (4.2): market probabilities from inverse payoffs (above).
- Eq. (4.3)–(4.4): Elo expected score and update (above).
- Brier score, Eq. (4.6): `P = 1/((1−n)T) · Σ_{j=1}^{2} Σ_{i=1}^{(1−n)T} (f_{ij} − E_{ij})²`.
- AUC: P(classifier ranks random positive above random negative); prediction rule Prob(HomeWin) ≥ π, π swept.
- Assumptions: ties ignorable for the trend analysis; the simple model is a valid *proxy* for league predictability (authors explicitly disclaim it as a competitive model); μ captures home advantage; Gini of final points distribution captures inequality.

## 5. Features / target
- **Inputs:** match results (W/L, points) within rolling window; Bet365 odds (benchmark); Elo ratings (comparison).
- **Target:** binary — home win (1) vs away win (0); ties dropped.

## 6. Validation design
- **Time-ordered by construction:** every prediction uses only the preceding N matches (n=0.5 of season). League-season AUC/Brier computed on the (1−n)T holdout matches; trends tracked over 26 seasons with lowess smoothing.
- **Baselines:** Dyadic model, Bet365 market, Elo (K=32).
- **Trend tests:** first 10 years vs last 10 years — Student t-test + KS test on AUC, Gini, ELO-AUC (Table 1).
- Supplementary: Brier/AUC distributions vs market (Tables S1, S2), sensitivity over n ∈ {0.10, 0.30, 0.70} (Figs. S8–S10).

## 7. Numerical results / baselines
- **Predictability rising:** positive AUC trend in England, France, Germany, Netherlands, Portugal, Scotland, Spain; first-10-vs-last-10 t-test significant for **England (AUC p=0.0330), Germany (0.0326), Portugal (0.0044), Spain (0.0097)**; Gini t-test significant for England (0.0009), Germany (0.0367), Portugal (0.0000), Spain (0.0001). "All leagues, notwithstanding, tend to converge towards 0.75 AUC."
- **Inequality:** Gini–AUC correlation by league (Table 2): Spain 0.874, England 0.823, Germany 0.805, Scotland 0.723, Portugal 0.694, Turkey 0.686, Netherlands 0.676, Italy 0.622, France 0.563, Greece 0.561, Belgium 0.413.
- **Home advantage declining** in all leagues (Fig. 2: model's μ over time for EPL + direct home-points-share from history; linear fits).
- **Model comparison:** network model scores higher AUC than Elo (K=32) in **~61% of cases (170 of 280)** league-seasons; predictability trends hold under Elo too.
- **vs market:** network model "underperforms the market on average," but Brier/AUC differences are "statistically indistinguishable at the 2% significance level for the majority of year-leagues" (Tables S1/S2).

## 8. Code / data availability
Data: Dryad https://doi.org/10.5061/dryad.8931zcrrs + Supplementary dataset.zip. Code: not stated.

## 9. Leakage & limitations
- **Ties dropped** — the model cannot be deployed as-is for 3-way soccer or any tie-capable sport; also the tie share itself shifted slightly in some leagues (Table S3: Spain/Greece/Italy/Turkey significant t-test on tie share — could bias the trend).
- First-10-vs-last-10 comparisons use ~10 AUC points per side; low power — only the biggest leagues reach significance.
- AUC "converging to 0.75" is partly a ceiling of the *model class*, not of football itself (authors note the market is better); conflating "model AUC rising" with "sport more predictable" assumes the proxy is unbiased over time — but tactics, squad rotation, and cup congestion all changed.
- Causality explicitly disclaimed: "We do not include any direct analysis on the effects of monetization on football's predictability."
- **External validity to NFL:** the *method* (network centrality + Gini + HFA tracking) ports directly; the *findings* are European soccer. NFL has a hard salary cap, draft parity mechanisms, and no relegation — the gentrification mechanism doesn't transfer 1:1. Note the authors' own suggested control: test on salary-capped leagues like the NBA.

## 10. GSE overlap
Adjacent but not duplicate. The repo inventory lists Elo, Massey, Colley, Glicko, Bradley-Terry as covered rating systems — **eigenvector/PageRank-style centrality strength ratings are NOT in the inventory** (only "PageRank approach" appears as a citation in the paper itself, not in GSE's implemented metrics). Rest/bye and travel effects are covered, but a **long-run home-advantage trend monitor** is not documented. The predictability-over-time frame (league Gini vs model AUC) is new to the repo.

## 11. GSE implementation spec
1. **Network-centrality strength rating on nflverse:** build directed loser→winner graph per season window (edges weighted by margin-derived points or EPA), eigenvector centrality → new team-strength feature; benchmark vs Elo/nfelo on 2002–2025: log-loss and AUC on spread-cover, season by season.
2. **Predictability/Gini monitor:** per season, compute points-Gini (or win-share Gini) vs engine model AUC; reproduce Fig. 1 for the NFL 2002–2025. Tests whether the NFL has followed the soccer gentrification path or stayed parity-locked (salary cap as the natural experiment the authors propose).
3. **Home-advantage trend:** refit the Eq. (4.1) μ on rolling windows of NFL seasons — the repo has a "rest/bye edge vanished post-2011" result (2408.10867); a declining-HFA result would extend that lane.
4. **Effort:** ~1–2 weeks; all inputs (nflverse play-by-play, closing lines) already in GSE's stack.

## 12. Reproducible test
Dataset: nflverse 2002–2025 (regular season). Baseline: Elo (K=32 equivalent, nfelo-style) vs eigenvector-centrality ratings, both mapped to win probability via Eq. (4.1)-style logistic on rating difference, time-ordered rolling window n=0.5 season. Metric: season-level AUC and log-loss; success = centrality beats Elo AUC in ≥55% of seasons (the paper's bar: 61% on 280 league-seasons). Secondary: NFL points-Gini vs engine-AUC correlation — report, don't gate.

## 13. Acceptance / rejection gate
**Adopt** the centrality rating as a permanent benchmark feature if it beats the repo's Elo baseline on AUC in ≥55% of seasons 2002–2025 with lower or equal log-loss; **reject** as redundant if it underperforms Elo in >50% of seasons. The NFL predictability-trend analysis is a research output regardless (publish internally; no gate).

## 14. Improvement experiment
The paper's network is unweighted in time — every match in the window counts equally. Run a **time-decayed eigenvector centrality** (edge weight = points × exp(−λ·age)) and tune λ by season-ahead log-loss. This tests whether recency-weighting beats the paper's flat window for NFL (where late-season form and injuries make old games stale) — if λ→0 wins, the flat window was already optimal.
