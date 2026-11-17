# MULTI-SPORT DAILY SLATE CARD (2026-11-16)

## Governance & Safety Contract
* Leagues Covered: NBA, NHL, NCAAB, SOCCER (EPL/UCL)
* Methodology: BC-ACI (arXiv:2412.19318) + CopulaCPTS + 10,000-World Vectorized Sim
* Data Source: mixed_espn_and_offline
* real_money_stake_cleared: False
* live_stake_fraction: 0.0
* Confidence Scale: XX/100 (Empirical simulation score; never percent confidence)

---

## Ranked Multi-Sport Plays (Sorted by XX/100 Confidence)

| Rank | League | Matchup | Market | Selection | Model Prob | Fair Odds | Confidence | BC-ACI Total Band | Decision | Stake |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | NCAAB | LBSU @ UCLA | Moneyline | UCLA ML | 0.9983 | -58724 | 74/100 | 144.91 [130.91, 158.91] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 2 | NBA | ORL @ BOS | Moneyline | BOS ML | 0.6103 | -157 | 61/100 | 227.19 [213.19, 241.19] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 3 | NBA | MEM @ WSH | Moneyline | WSH ML | 0.6091 | -156 | 61/100 | 226.90 [212.90, 240.90] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 4 | NBA | PHI @ BKN | Moneyline | BKN ML | 0.6033 | -152 | 60/100 | 227.38 [213.38, 241.38] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 5 | SOCCER | MCI @ LIV | Total | OVER 2.5 | 0.6023 | -151 | 60/100 | 3.14 [1.94, 4.34] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 6 | NBA | CHI @ CLE | Moneyline | CLE ML | 0.5969 | -148 | 60/100 | 227.22 [213.22, 241.22] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 7 | NHL | VAN @ UTA | Total | UNDER 6.5 | 0.5613 | -128 | 56/100 | 6.16 [4.36, 7.96] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 8 | NHL | MTL @ NYR | Moneyline | NYR ML | 0.5538 | -124 | 55/100 | 6.16 [4.36, 7.96] | MODEL_LEAN_PAPER_ONLY | 0.0u |
| 9 | SOCCER | CHE @ ARS | Total | OVER 2.5 | 0.5509 | -123 | 55/100 | 2.91 [1.71, 4.11] | MODEL_LEAN_PAPER_ONLY | 0.0u |

---

## Simulation & CopulaCPTS SGP Previews

### [NCAAB] LBSU @ UCLA (espn_live)
* 10,000-World Means: Away 57.75 + Home 87.16 = Total 144.91
* Outcome Probs: Home 0.9983 | Away 0.0017 | Draw 0.0000
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.5024, indep_prob=0.4893, correlation_lift=1.027x, fair_odds=-101

### [NBA] ORL @ BOS (espn_live)
* 10,000-World Means: Away 111.78 + Home 115.41 = Total 227.19
* Outcome Probs: Home 0.6103 | Away 0.3897 | Draw 0.0000
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.3486, indep_prob=0.3050, correlation_lift=1.143x, fair_odds=+187

### [NBA] MEM @ WSH (espn_live)
* 10,000-World Means: Away 111.63 + Home 115.27 = Total 226.90
* Outcome Probs: Home 0.6091 | Away 0.3909 | Draw 0.0000
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.3383, indep_prob=0.3001, correlation_lift=1.127x, fair_odds=+196

### [NBA] PHI @ BKN (espn_live)
* 10,000-World Means: Away 112.01 + Home 115.37 = Total 227.38
* Outcome Probs: Home 0.6033 | Away 0.3967 | Draw 0.0000
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.3462, indep_prob=0.2986, correlation_lift=1.160x, fair_odds=+189

### [SOCCER] MCI @ LIV (offline_fallback)
* 10,000-World Means: Away 1.43 + Home 1.71 = Total 3.14
* Outcome Probs: Home 0.4352 | Away 0.3075 | Draw 0.2573
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.3230, indep_prob=0.2621, correlation_lift=1.232x, fair_odds=+210

### [NBA] CHI @ CLE (espn_live)
* 10,000-World Means: Away 111.91 + Home 115.31 = Total 227.22
* Outcome Probs: Home 0.5969 | Away 0.4031 | Draw 0.0000
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.3371, indep_prob=0.2928, correlation_lift=1.151x, fair_odds=+197

### [NHL] VAN @ UTA (espn_live)
* 10,000-World Means: Away 2.94 + Home 3.23 = Total 6.16
* Outcome Probs: Home 0.5531 | Away 0.4469 | Draw 0.0000
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.3462, indep_prob=0.3105, correlation_lift=1.115x, fair_odds=+189

### [NHL] MTL @ NYR (espn_live)
* 10,000-World Means: Away 2.92 + Home 3.24 = Total 6.16
* Outcome Probs: Home 0.5538 | Away 0.4462 | Draw 0.0000
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.2990, indep_prob=0.2456, correlation_lift=1.218x, fair_odds=+234

### [SOCCER] CHE @ ARS (offline_fallback)
* 10,000-World Means: Away 1.13 + Home 1.78 = Total 2.91
* Outcome Probs: Home 0.5169 | Away 0.2262 | Draw 0.2569
* CopulaCPTS 2-Leg Preview: joint_sim_prob=0.3392, indep_prob=0.2848, correlation_lift=1.191x, fair_odds=+195
