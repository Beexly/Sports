# Scores24.live NFL Week 8 Empirical Trends, Quarter/Half Splits & Predictions Dossier

**Source:** `https://scores24.live/en/american-football/l-usa-nfl` (`/en/trends/american-football` & `/en/american-football/l-usa-nfl/predictions`)  
**Ingested Artifact:** `data/engine/scores24_nfl_week8_2026_10_30.json` (`60,041` bytes, `291` trend statements, `115` priced market trends, `6` full match predictions)  
**Date:** `2026-10-30`

---

## 1. Executive Summary

We harvested the live NFL fixtures, standings, 291 empirical trend blocks (`115` priced two-way market trends across `Match Result`, `1st Half`, `2nd Half`, `2nd Quarter`, `4th Quarter`, `Over/Under`, `Team Totals`, and `Handicap`), and editorial match predictions from `scores24.live`.

Every trend below is cross-referenced against our **10,000-world × 175-snap Pathwise 360° Simulator** (`scripts/ops/gse_coach_mind_simulator.py`) and **Consolidated Sweep Kernels** (`engine/kernels/consolidated_sweep_kernels.py`).

---

## 2. High-Signal Quarter & Half Empirical Streaks (`Scores24.live`)

| Matchup | Quarter / Half / Team Total Streak | Hit Rate | Scores24 Priced Market | GSE Pathwise 360° Alignment |
|---|---|---:|---|---|
| **IND @ JAX** | Jaguars won **2nd Quarter** in last 10 home games vs IND | `10/10 (100%)` | `2Q JAX to Win (-149)` | **STRONG CONCORDANCE** (`JAX -11.11` sim spread) |
| **IND @ JAX** | Colts lost **1st Half** in last 5 away games at JAX | `5/5 (100%)` | `1H JAX to Win (-294)` | **STRONG CONCORDANCE** (`JAX` early-down edge) |
| **IND @ JAX** | Jaguars covered **-2.5 Handicap** in last 11 home games vs IND | `11/11 (100%)` | `JAX -2.5 (-400)` / Editor: `JAX -7.5 (-139)` | **STRONG CONCORDANCE** (`JAX -11.11`) |
| **CLE @ PIT** | Steelers won **19 of last 20** home games vs CLE (`-2.5` in 19/20) | `19/20 (95.0%)` | `PIT ML (-192)` / `PIT -2.5 (-154)` | **STRONG CONCORDANCE** (`PIT -7.31`, `PIT ML 69.0%`) |
| **CLE @ PIT** | Browns lost **1st Half** in last 5 away games at PIT; PIT won **2Q** in 8/9 | `5/5 (100%)` / `8/9 (88.9%)` | `1H PIT to Win (-149)` / `2Q PIT (+103)` | **STRONG CONCORDANCE** (`CLE@PIT 1Q OVER 7.5`, `PIT 1H`) |
| **CLE @ PIT** | Steelers scored **Over 20.5 points** in 12 of last 13 home games vs CLE | `12/13 (92.3%)` | `PIT TT Over 20.5 (-125)` | **STRONG CONCORDANCE** (`PIT` sim median `25.5` pts) |
| **LAC @ LA** | Chargers lost **last 9 NFL games**, lost **1H in 8/9**, lost **2Q & 4Q in 7/8** | `8/9 (88.9%)` | `LA ML (-294)` / `1H LA (-200)` / `2Q LA (-118)` | **STRONG CONCORDANCE** (`LA -10.81`, `LA ML 76.8%`, `LA 1H -3.5`) |
| **NE @ MIA** | Dolphins lost **1st Half in 9 of last 10** games (last 4 home); lost **2Q in 8/9** | `9/10 (90.0%)` / `8/9 (88.9%)` | `1H NE to Win (-189)` / `2Q NE (-118)` | **CONCORDANT** (`NE` road favorite `-4.87` sim median) |
| **MIN @ DET** | Lions scored **Over 24.5 points** in 6 of last 7 home games vs MIN; **Over 49.5** in 6/7 | `6/7 (85.7%)` | `DET TT Over 24.5 (-120)` / `Over 49.5 (+127)` | **STRONG CONCORDANCE** (`DET -8.37`, Sim Total `51.74`) |
| **BAL @ BUF** | Ravens won **1st Half in 8 of last 9** games and **4th Quarter in 8 of last 9** away | `8/9 (88.9%)` | `1H BAL (+139)` / `4Q BAL (+132)` | **CONCORDANT WITH TIGHT SPREAD** (`Sim BUF -3.20` vs `DK -3.0`, `Sim Total 60.70`) |

---

## 3. Scores24 Editorial Predictions (`Rasim Akhmedov`, Verified Record `41-31`)

1. **`BAL @ BUF`:** `Buffalo Bills -3.5` (cites Bills `32.8 PPG` #1 NFL offense + post-bye rest advantage vs Ravens 2-game skid).
2. **`TEN @ CIN`:** `Cincinnati Bengals -9.5` (cites Bengals `27.2 PPG` and `35-13` win over BAL vs Titans `15.4 PPG` and `1-6` record).
3. **`ARI @ DAL`:** `Total Points OVER 51.5` (cites Cowboys `27.0 PPG` offense + Cardinals allowing `29.7 PPG` and `13/15` DAL Over `44.5` trend).
4. **`MIN @ DET`:** `Minnesota Vikings +3.5` (notes Vikings `6-0` record and `12.3 PPG` allowed vs Lions `30.7 PPG` offense; our pathwise engine favors `DET -3.0` and `OVER 46.5` due to Goff `+0.151` 2×2 matrix shift).
5. **`IND @ JAX`:** `Jacksonville Jaguars -7.5 (-139)` (cites Jaguars post-bye rest, `11/11` home `-2.5` streak vs IND, and `10/10` 2Q home streak vs IND).
6. **`LV @ NYJ`:** `New York Jets Moneyline` (cites Raiders 4-game losing streak and `183-197` defensive vulnerability vs Jets home defense).
