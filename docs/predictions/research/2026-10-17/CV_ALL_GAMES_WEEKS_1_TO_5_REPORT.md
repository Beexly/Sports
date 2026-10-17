# Full Census & Processing Report: NFL Weeks 1–5, 2026 (All 79 Games)

> **RETRACTION NOTICE (2026-10-17):** The computer vision derived metrics (pocket depth, STRAIN, SOE) in this report are RETRACTED. They were derived from synthetic simulation shifted by EPA rather than measured broadcast tracking. PBP counts and scores are official; optical tracking metrics are marked measured=false. Production vision weight remains 0.0.

**Timestamp:** 2026-10-17T10:15:00-05:00  
**Ledger Entry:** `L-092: All 79 games census Weeks 1-5 2026 — RETRACTED`  
**Total Regular Season Games:** 79 games  
**JSON Dataset:** [`docs/predictions/research/2026-10-17/CV_ALL_GAMES_WEEKS_1_TO_5_CENSUS.json`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-10-17/CV_ALL_GAMES_WEEKS_1_TO_5_CENSUS.json)  

---

## 1. Executive Summary & Aggregate Census

- **Total Games Evaluated:** 79 games (100% census across Weeks 1–5, zero omitted)
- **Total Official Plays (PBP):** 13,842 plays (5,617 pass, 4,225 rush)
- **Total Sacks / Interceptions:** 357 sacks, 109 interceptions
- **Total Computer Vision Tracklets Analyzed:** 17,312 player tracklets
- **Total CV High-Fidelity Tracked Plays:** 787 plays
- **Mean Jacobian Kalman RMSE:** `0.0961 m` (DLT Hartley reprojection <0.12 m)
- **Mean Pocket Depth:** `Unmeasured (optical tracking columns absent)`
- **Mean STRAIN Pressure Surface:** `Unmeasured (optical tracking columns absent)`
- **Mean Separation Over Expected (SOE):** `Unmeasured (optical tracking columns absent)`

### Week-by-Week Breakdown

| Week | Games | Total Plays | Tracklets Analyzed | Optical Derived Metrics | Split Role |
|:---|:---:|:---:|:---:|:---:|:---|
| Week 1 | 16 | 2,756 | 3,761 | measured=false (unmeasured) | Weeks 1–4 Training (In-Sample) |
| Week 2 | 16 | 2,733 | 3,036 | measured=false (unmeasured) | Weeks 1–4 Training (In-Sample) |
| Week 3 | 16 | 2,822 | 3,365 | measured=false (unmeasured) | Weeks 1–4 Training (In-Sample) |
| Week 4 | 16 | 2,844 | 3,762 | measured=false (unmeasured) | Weeks 1–4 Training (In-Sample) |
| Week 5 | 15 | 2,687 | 3,388 | measured=false (unmeasured) | Week 5 Holdout (Evaluation) |

---

## 2.1 Week 1 Game-by-Game Dossier (16 Games)

| # | Matchup | Date | Final Score | Winner | Plays (P/R) | Pocket Depth | STRAIN | SOE | Act EPA | CV Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | **NE @ SEA** | 2026-09-09 | 10 - 13 | **SEA** | 166 (62/53) | N/A | N/A | N/A | -0.004 | measured=false |
| 2 | **SF @ LA** | 2026-09-10 | 27 - 7 | **SF** | 157 (62/59) | N/A | N/A | N/A | -0.100 | measured=false |
| 3 | **ARI @ LAC** | 2026-09-13 | 26 - 14 | **ARI** | 173 (68/55) | N/A | N/A | N/A | +0.050 | measured=false |
| 4 | **ATL @ PIT** | 2026-09-13 | 13 - 20 | **PIT** | 175 (69/52) | N/A | N/A | N/A | -0.430 | measured=false |
| 5 | **BAL @ IND** | 2026-09-13 | 41 - 23 | **BAL** | 167 (60/57) | N/A | N/A | N/A | -0.082 | measured=false |
| 6 | **BUF @ HOU** | 2026-09-13 | 36 - 31 | **BUF** | 180 (73/53) | N/A | N/A | N/A | +0.220 | measured=false |
| 7 | **CHI @ CAR** | 2026-09-13 | 59 - 37 | **CHI** | 196 (71/61) | N/A | N/A | N/A | +0.338 | measured=false |
| 8 | **CLE @ JAX** | 2026-09-13 | 10 - 34 | **JAX** | 148 (51/54) | N/A | N/A | N/A | +0.180 | measured=false |
| 9 | **DAL @ NYG** | 2026-09-13 | 20 - 28 | **NYG** | 165 (65/55) | N/A | N/A | N/A | +0.497 | measured=false |
| 10 | **GB @ MIN** | 2026-09-13 | 22 - 39 | **MIN** | 180 (74/55) | N/A | N/A | N/A | -0.029 | measured=false |
| 11 | **MIA @ LV** | 2026-09-13 | 13 - 27 | **LV** | 169 (62/55) | N/A | N/A | N/A | -0.142 | measured=false |
| 12 | **NO @ DET** | 2026-09-13 | 30 - 31 | **DET** | 218 (102/58) | N/A | N/A | N/A | -0.003 | measured=false |
| 13 | **NYJ @ TEN** | 2026-09-13 | 23 - 10 | **NYJ** | 162 (59/53) | N/A | N/A | N/A | +0.041 | measured=false |
| 14 | **TB @ CIN** | 2026-09-13 | 27 - 33 | **CIN** | 169 (68/47) | N/A | N/A | N/A | -0.155 | measured=false |
| 15 | **WAS @ PHI** | 2026-09-13 | 22 - 24 | **PHI** | 171 (64/57) | N/A | N/A | N/A | +0.081 | measured=false |
| 16 | **DEN @ KC** | 2026-09-14 | 10 - 31 | **KC** | 160 (61/53) | N/A | N/A | N/A | -0.274 | measured=false |

## 2.2 Week 2 Game-by-Game Dossier (16 Games)

| # | Matchup | Date | Final Score | Winner | Plays (P/R) | Pocket Depth | STRAIN | SOE | Act EPA | CV Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | **DET @ BUF** | 2026-09-17 | 31 - 41 | **BUF** | 184 (75/56) | N/A | N/A | N/A | +0.448 | measured=false |
| 2 | **CAR @ ATL** | 2026-09-20 | 34 - 3 | **CAR** | 171 (73/54) | N/A | N/A | N/A | -0.192 | measured=false |
| 3 | **CIN @ HOU** | 2026-09-20 | 20 - 6 | **CIN** | 193 (96/41) | N/A | N/A | N/A | -0.106 | measured=false |
| 4 | **CLE @ TB** | 2026-09-20 | 23 - 19 | **CLE** | 172 (69/48) | N/A | N/A | N/A | -0.046 | measured=false |
| 5 | **GB @ NYJ** | 2026-09-20 | 20 - 17 | **GB** | 184 (77/45) | N/A | N/A | N/A | +0.015 | measured=false |
| 6 | **IND @ KC** | 2026-09-20 | 30 - 33 | **KC** | 202 (80/61) | N/A | N/A | N/A | +0.241 | measured=false |
| 7 | **JAX @ DEN** | 2026-09-20 | 13 - 20 | **DEN** | 159 (62/52) | N/A | N/A | N/A | +0.070 | measured=false |
| 8 | **LV @ LAC** | 2026-09-20 | 26 - 14 | **LV** | 177 (61/61) | N/A | N/A | N/A | +0.089 | measured=false |
| 9 | **MIA @ SF** | 2026-09-20 | 13 - 35 | **SF** | 151 (49/56) | N/A | N/A | N/A | +0.567 | measured=false |
| 10 | **MIN @ CHI** | 2026-09-20 | 9 - 3 | **MIN** | 164 (62/59) | N/A | N/A | N/A | -0.054 | measured=false |
| 11 | **NO @ BAL** | 2026-09-20 | 24 - 17 | **NO** | 163 (71/50) | N/A | N/A | N/A | +0.201 | measured=false |
| 12 | **PHI @ TEN** | 2026-09-20 | 24 - 20 | **PHI** | 170 (62/61) | N/A | N/A | N/A | +0.140 | measured=false |
| 13 | **PIT @ NE** | 2026-09-20 | 3 - 20 | **NE** | 165 (69/51) | N/A | N/A | N/A | -0.393 | measured=false |
| 14 | **SEA @ ARI** | 2026-09-20 | 31 - 7 | **SEA** | 157 (57/57) | N/A | N/A | N/A | +0.140 | measured=false |
| 15 | **WAS @ DAL** | 2026-09-20 | 20 - 37 | **DAL** | 166 (68/53) | N/A | N/A | N/A | +0.240 | measured=false |
| 16 | **NYG @ LA** | 2026-09-21 | 6 - 28 | **LA** | 155 (66/49) | N/A | N/A | N/A | +0.016 | measured=false |

## 2.3 Week 3 Game-by-Game Dossier (16 Games)

| # | Matchup | Date | Final Score | Winner | Plays (P/R) | Pocket Depth | STRAIN | SOE | Act EPA | CV Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | **ATL @ GB** | 2026-09-24 | 35 - 14 | **ATL** | 173 (80/50) | N/A | N/A | N/A | +0.164 | measured=false |
| 2 | **ARI @ SF** | 2026-09-27 | 30 - 36 | **SF** | 191 (81/50) | N/A | N/A | N/A | +0.407 | measured=false |
| 3 | **BAL @ DAL** | 2026-09-27 | 34 - 31 | **BAL** | 186 (62/68) | N/A | N/A | N/A | +0.328 | measured=false |
| 4 | **CAR @ CLE** | 2026-09-27 | 18 - 21 | **CLE** | 193 (85/54) | N/A | N/A | N/A | -0.044 | measured=false |
| 5 | **CIN @ PIT** | 2026-09-27 | 27 - 30 | **PIT** | 166 (74/41) | N/A | N/A | N/A | +0.313 | measured=false |
| 6 | **HOU @ IND** | 2026-09-27 | 17 - 19 | **IND** | 166 (70/52) | N/A | N/A | N/A | -0.142 | measured=false |
| 7 | **KC @ MIA** | 2026-09-27 | 24 - 10 | **KC** | 158 (60/56) | N/A | N/A | N/A | +0.148 | measured=false |
| 8 | **LAC @ BUF** | 2026-09-27 | 16 - 24 | **BUF** | 175 (66/61) | N/A | N/A | N/A | -0.178 | measured=false |
| 9 | **LA @ DEN** | 2026-09-27 | 26 - 30 | **DEN** | 202 (96/48) | N/A | N/A | N/A | -0.018 | measured=false |
| 10 | **LV @ NO** | 2026-09-27 | 35 - 27 | **LV** | 188 (82/55) | N/A | N/A | N/A | +0.023 | measured=false |
| 11 | **MIN @ TB** | 2026-09-27 | 23 - 16 | **MIN** | 179 (75/44) | N/A | N/A | N/A | -0.312 | measured=false |
| 12 | **NE @ JAX** | 2026-09-27 | 6 - 35 | **JAX** | 168 (64/56) | N/A | N/A | N/A | -0.099 | measured=false |
| 13 | **NYJ @ DET** | 2026-09-27 | 24 - 31 | **DET** | 167 (78/49) | N/A | N/A | N/A | +0.295 | measured=false |
| 14 | **SEA @ WAS** | 2026-09-27 | 31 - 33 | **WAS** | 190 (79/50) | N/A | N/A | N/A | +0.112 | measured=false |
| 15 | **TEN @ NYG** | 2026-09-27 | 7 - 12 | **NYG** | 165 (61/54) | N/A | N/A | N/A | -0.207 | measured=false |
| 16 | **PHI @ CHI** | 2026-09-28 | 7 - 27 | **CHI** | 155 (62/54) | N/A | N/A | N/A | -0.207 | measured=false |

## 2.4 Week 4 Game-by-Game Dossier (16 Games)

| # | Matchup | Date | Final Score | Winner | Plays (P/R) | Pocket Depth | STRAIN | SOE | Act EPA | CV Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | **PIT @ CLE** | 2026-10-01 | 24 - 27 | **CLE** | 186 (81/47) | N/A | N/A | N/A | +0.143 | measured=false |
| 2 | **ARI @ NYG** | 2026-10-04 | 24 - 36 | **NYG** | 177 (71/55) | N/A | N/A | N/A | -0.201 | measured=false |
| 3 | **DAL @ HOU** | 2026-10-04 | 34 - 30 | **DAL** | 184 (81/44) | N/A | N/A | N/A | +0.309 | measured=false |
| 4 | **DEN @ SF** | 2026-10-04 | 14 - 24 | **SF** | 176 (72/58) | N/A | N/A | N/A | +0.184 | measured=false |
| 5 | **DET @ CAR** | 2026-10-04 | 26 - 32 | **CAR** | 198 (97/43) | N/A | N/A | N/A | +0.339 | measured=false |
| 6 | **GB @ TB** | 2026-10-04 | 17 - 14 | **GB** | 159 (60/56) | N/A | N/A | N/A | +0.043 | measured=false |
| 7 | **IND @ WAS** | 2026-10-04 | 30 - 13 | **IND** | 171 (75/52) | N/A | N/A | N/A | -0.304 | measured=false |
| 8 | **JAX @ CIN** | 2026-10-04 | 22 - 17 | **JAX** | 177 (84/42) | N/A | N/A | N/A | +0.199 | measured=false |
| 9 | **KC @ LV** | 2026-10-04 | 30 - 27 | **KC** | 191 (86/52) | N/A | N/A | N/A | +0.134 | measured=false |
| 10 | **LAC @ SEA** | 2026-10-04 | 23 - 30 | **SEA** | 187 (61/65) | N/A | N/A | N/A | -0.226 | measured=false |
| 11 | **LA @ PHI** | 2026-10-04 | 24 - 20 | **LA** | 187 (83/52) | N/A | N/A | N/A | -0.085 | measured=false |
| 12 | **MIA @ MIN** | 2026-10-04 | 10 - 15 | **MIN** | 161 (60/49) | N/A | N/A | N/A | -0.218 | measured=false |
| 13 | **NE @ BUF** | 2026-10-04 | 29 - 26 | **NE** | 172 (74/55) | N/A | N/A | N/A | +0.186 | measured=false |
| 14 | **NYJ @ CHI** | 2026-10-04 | 12 - 23 | **CHI** | 167 (53/68) | N/A | N/A | N/A | +0.058 | measured=false |
| 15 | **TEN @ BAL** | 2026-10-04 | 18 - 24 | **BAL** | 175 (64/56) | N/A | N/A | N/A | +0.143 | measured=false |
| 16 | **ATL @ NO** | 2026-10-05 | 45 - 24 | **ATL** | 176 (71/54) | N/A | N/A | N/A | +0.159 | measured=false |

## 2.5 Week 5 Game-by-Game Dossier (15 Games)

| # | Matchup | Date | Final Score | Winner | Plays (P/R) | Pocket Depth | STRAIN | SOE | Act EPA | CV Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | **TB @ DAL** | 2026-10-08 | 24 - 16 | **TB** | 172 (69/52) | N/A | N/A | N/A | +0.037 | measured=false |
| 2 | **BAL @ ATL** | 2026-10-11 | 30 - 23 | **BAL** | 194 (75/62) | N/A | N/A | N/A | +0.022 | measured=false |
| 3 | **CHI @ GB** | 2026-10-11 | 7 - 31 | **GB** | 170 (78/50) | N/A | N/A | N/A | -0.069 | measured=false |
| 4 | **CIN @ MIA** | 2026-10-11 | 31 - 24 | **CIN** | 172 (63/65) | N/A | N/A | N/A | -0.043 | measured=false |
| 5 | **CLE @ NYJ** | 2026-10-11 | 12 - 17 | **NYJ** | 184 (75/56) | N/A | N/A | N/A | -0.352 | measured=false |
| 6 | **DEN @ LAC** | 2026-10-11 | 23 - 17 | **DEN** | 177 (57/63) | N/A | N/A | N/A | -0.397 | measured=false |
| 7 | **DET @ ARI** | 2026-10-11 | 45 - 21 | **DET** | 182 (86/50) | N/A | N/A | N/A | +0.252 | measured=false |
| 8 | **HOU @ TEN** | 2026-10-11 | 26 - 3 | **HOU** | 164 (76/45) | N/A | N/A | N/A | -0.084 | measured=false |
| 9 | **IND @ PIT** | 2026-10-11 | 22 - 34 | **PIT** | 176 (77/46) | N/A | N/A | N/A | +0.053 | measured=false |
| 10 | **LV @ NE** | 2026-10-11 | 17 - 45 | **NE** | 175 (74/49) | N/A | N/A | N/A | +0.467 | measured=false |
| 11 | **MIN @ NO** | 2026-10-11 | 23 - 13 | **MIN** | 155 (58/53) | N/A | N/A | N/A | -0.222 | measured=false |
| 12 | **NYG @ WAS** | 2026-10-11 | 27 - 27 | **TIE** | 210 (87/58) | N/A | N/A | N/A | +0.094 | measured=false |
| 13 | **PHI @ JAX** | 2026-10-11 | 17 - 19 | **JAX** | 188 (82/45) | N/A | N/A | N/A | +0.116 | measured=false |
| 14 | **SF @ SEA** | 2026-10-11 | 32 - 29 | **SF** | 169 (67/50) | N/A | N/A | N/A | -0.210 | measured=false |
| 15 | **BUF @ LA** | 2026-10-12 | 37 - 34 | **BUF** | 199 (77/60) | N/A | N/A | N/A | +0.349 | measured=false |

---

## 3. Calibration Accuracy and Holdout Verification

1. **Retraction Summary:**
   - Prior calibration claims of $R^2 = 0.442$ and RMSE $0.118$ were circular fits on synthetic covariates shifted by target EPA.
   - Real `tracklet_outcome_enrichment_2026.parquet` contains tracking quality (RMSE, CI coverage, speed, blitz/route flags), but does NOT contain optical pocket depth, STRAIN surface, or receiver SOE.
   - All derived optical metrics are formally retracted and marked `measured = false`.

2. **Production Safety Assurance:**
   - Vision factor default weight in production remains locked at **`weight = 0.0`** (`VISION_DEFAULT_WEIGHT = 0.0` in `packages/prediction-engine/src/vision-factors.ts`).
   - Zero drift on live lines, spreads, and totals.
