# Week 8 360° Full-Board Master Call Sheet — Post-Grok 4.7 Sweep & TDD Calibration Upgrade

**Generated:** `2026-10-30` | **Engine:** `GSE v5.3.0 Pathwise 360° (10,000 worlds × 175 snaps = 22.75M snaps)` | **Seal Hash:** `a293ee26ed6f1350...`

**Transport & Conservation Certificates:** Max Pathwise Conservation Residual = `0.00e+00` (`<= 1e-6`) | Max Sinkhorn Dual Residual = `9.92e-12` (`<= 1e-6`) | Evaluated Candidates = `581` | Priced Gate Survivors (`PUBLISH`) = `147` | Unpriced Derivative Projections (`ABSTAIN`) = `94`

---

## 1. All 13 Sunday/Monday Matchups — Pathwise Medians vs Live DraftKings Lines

| Matchup | DK Spread (H) | Sim Spread (H) | DK Total | Sim Total | Sim 1Q Tot | Sim 1H Tot | Pace (s) | QB 2×2 Matrix Shift | Early-Down Edge |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| **BAL @ BUF** | `-3.0` | `-3.35` | `54.5` | `60.49` | `11.6` | `29.5` | `26.28s` | Jackson +0.020 / Allen +0.012 | BUF |
| **TEN @ CIN** | `-11.5` | `-15.27` | `46.5` | `48.14` | `9.0` | `23.0` | `26.87s` | Ward -0.004 / Burrow -0.008 | CIN |
| **ARI @ DAL** | `-7.0` | `-5.65` | `54.5` | `52.66` | `10.1` | `25.6` | `26.09s` | Brissett +0.007 / Prescott +0.015 | DAL |
| **MIN @ DET** | `-3.0` | `-8.03` | `46.5` | `50.76` | `9.6` | `24.5` | `26.67s` | Murray +0.003 / Goff +0.151 | DET |
| **LV @ NYJ** | `-1.5` | `-0.45` | `45.5` | `43.01` | `8.2` | `21.0` | `27.27s` | Cousins -0.009 / Smith -0.012 | NYJ |
| **CLE @ PIT** | `-3.5` | `-6.31` | `39.5` | `42.88` | `8.1` | `20.9` | `26.67s` | Watson -0.002 / Rodgers +0.035 | PIT |
| **ATL @ TB** | `-2.5` | `-2.46` | `44.5` | `45.63` | `8.5` | `21.8` | `26.09s` | Penix +0.013 / Mayfield +0.016 | ATL |
| **IND @ JAX** | `-10.0` | `-10.01` | `46.5` | `47.00` | `8.7` | `22.5` | `25.90s` | Jones -0.017 / Lawrence -0.001 | JAX |
| **LAC @ LA** | `-6.5` | `-11.46` | `45.5` | `44.97` | `8.3` | `21.6` | `27.91s` | Herbert -0.013 / Stafford -0.002 | LA |
| **KC @ DEN** | `+1.5` | `+6.31` | `40.5` | `46.15` | `8.7` | `22.3` | `27.27s` | Mahomes +0.025 / Nix +0.005 | KC |
| **NE @ MIA** | `+7.0` | `+5.91` | `43.5` | `41.96` | `7.8` | `20.1` | `27.27s` | Maye +0.006 / Willis -0.013 | NE |
| **PHI @ WAS** | `-6.0` | `-7.23` | `40.5` | `44.93` | `8.7` | `22.3` | `26.09s` | McKee +0.000 / Daniels +0.001 | WAS |
| **CHI @ SEA** | `-3.0` | `-3.06` | `46.5` | `48.34` | `9.2` | `23.5` | `25.53s` | Williams -0.026 / Darnold +0.012 | CHI |

---

## 2. Tier-1 Main Game Lines (`Spread`, `Total`, `Moneyline` — Live DraftKings Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **LA ML (-270)** | `76.82` | `77.6%` | **`76.8%`** | `70.0%` | **`+6.8%`** | Pathwise win prob 77.6% (Stage D 76.8%) vs de-vigged market 70.0% |
| **2** | `MIN@DET` | **DET ML (-170)** | `68.38` | `71.6%` | **`68.4%`** | `60.4%` | **`+8.0%`** | Pathwise win prob 71.6% (Stage D 68.4%) vs de-vigged market 60.4% |
| **3** | `MIN@DET` | **DET -3.0** | `-8.03` | `63.4%` | **`60.8%`** | `52.2%` | **`+8.6%`** | Pathwise median DET -8.03 vs DK -3.0 (Murray +0.003 / Goff +0.151) |
| **4** | `LAC@LA` | **LA -6.5** | `-11.46` | `62.4%` | **`60.3%`** | `51.7%` | **`+8.6%`** | Pathwise median LA -11.46 vs DK -6.5 (Herbert -0.013 / Stafford -0.002) |
| **5** | `KC@DEN` | **KC ML (-118)** | `60.34` | `68.0%` | **`60.3%`** | `51.7%` | **`+8.6%`** | Pathwise win prob 68.0% (Stage D 60.3%) vs de-vigged market 51.7% |
| **6** | `KC@DEN` | **KC@DEN OVER 40.5** | `46.15` | `66.2%` | **`59.1%`** | `50.4%` | **`+8.6%`** | Pathwise median total 46.15 vs DK 40.5 (pace 27.27s) |
| **7** | `BAL@BUF` | **BAL@BUF OVER 54.5** | `60.49` | `67.0%` | **`58.7%`** | `50.0%` | **`+8.7%`** | Pathwise median total 60.49 vs DK 54.5 (pace 26.28s) |
| **8** | `PHI@WAS` | **PHI@WAS OVER 40.5** | `44.93` | `67.1%` | **`58.7%`** | `50.0%` | **`+8.7%`** | Pathwise median total 44.93 vs DK 40.5 (pace 26.09s) |
| **9** | `TEN@CIN` | **CIN -11.5** | `-15.27` | `61.6%` | **`58.2%`** | `49.6%` | **`+8.7%`** | Pathwise median CIN -15.27 vs DK -11.5 (Ward -0.004 / Burrow -0.008) |
| **10** | `CLE@PIT` | **CLE@PIT OVER 39.5** | `42.88` | `59.0%` | **`57.6%`** | `48.9%` | **`+8.7%`** | Pathwise median total 42.88 vs DK 39.5 (pace 26.67s) |

---

## 3. Priced Quarters, Halves & Team Totals (`1H/2Q/4Q/2H Winner` & `Team Totals` — Live Scores24 Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **LA 1H Winner (-200)** | `5.18` | `75.4%` | **`71.4%`** | `63.8%` | **`+7.6%`** | Scores24 LAC lost 1H in 8/9 — Pathwise win prob 75.4% (Stage D 71.4%) vs de-vig 63.8% |
| **2** | `CLE@PIT` | **PIT 1H Winner (-149)** | `3.34` | `67.2%` | **`65.5%`** | `57.3%` | **`+8.3%`** | Scores24 PIT 1H 5/5 home vs CLE — Pathwise win prob 67.2% (Stage D 65.5%) vs de-vig 57.3% |
| **3** | `IND@JAX` | **JAX 2Q Winner (-149)** | `2.84` | `70.7%` | **`65.5%`** | `57.3%` | **`+8.3%`** | Scores24 JAX 2Q 10/10 home vs IND — Pathwise win prob 70.7% (Stage D 65.5%) vs de-vig 57.3% |
| **4** | `CLE@PIT` | **PIT 2H Winner (-127)** | `3.65` | `67.8%` | **`62.1%`** | `53.5%` | **`+8.5%`** | Scores24 PIT 2H 9/9 home vs CLE — Pathwise win prob 67.8% (Stage D 62.1%) vs de-vig 53.5% |
| **5** | `MIN@DET` | **DET Team Total OVER 24.5 (-120)** | `29.95` | `71.2%` | **`60.8%`** | `52.2%` | **`+8.6%`** | Scores24 DET TT >24.5 in 6/7 vs MIN — Pathwise win prob 71.2% (Stage D 60.8%) vs de-vig 52.2% |
| **6** | `LAC@LA` | **LA 2Q Winner (-118)** | `3.17` | `71.9%` | **`60.4%`** | `51.8%` | **`+8.6%`** | Scores24 LAC lost 2Q in 7/8 — Pathwise win prob 71.9% (Stage D 60.4%) vs de-vig 51.8% |
| **7** | `BAL@BUF` | **BUF 2Q Winner (-103)** | `0.89` | `57.3%` | **`57.2%`** | `48.6%` | **`+8.7%`** | Scores24 BUF 2Q 7/8 streak — Pathwise win prob 57.3% (Stage D 57.2%) vs de-vig 48.6% |
| **8** | `ARI@DAL` | **DAL Team Total UNDER 33.5 (-169)** | `29.54` | `65.8%` | **`65.8%`** | `60.1%` | **`+5.7%`** | Scores24 DAL TT <33.5 in 14/15 vs ARI — Pathwise win prob 65.8% (Stage D 65.8%) vs de-vig 60.1% |

---

## 4. Top Skill & QB Player Props (`Layer-1 GP Empirical-Bayes` + `Stage D <= 0.35`, Live DraftKings Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `MIN@DET` | **Jared Goff (DET) Passing Yards OVER 262.5** | `286.80` | `65.4%` | **`69.3%`** | `50.0%` | **`+19.3%`** | DET QB (GP=6, 2026Avg=298.0, QB2x2=+0.151): Layer-1 mean 287.4 (median 286.8) vs DK 262.5 |
| **2** | `MIN@DET` | **Jared Goff (DET) Passing TDs OVER 1.5** | `1.86` | `65.0%` | **`68.5%`** | `50.0%` | **`+18.5%`** | DET QB (GP=6, 2026Avg=2.33, QB2x2=+0.151): Layer-1 mean 1.9 (median 1.9) vs DK 1.5 |
| **3** | `KC@DEN` | **J.K. Dobbins (DEN) Rushing Attempts OVER 7.5** | `8.91` | `66.6%` | **`66.5%`** | `50.0%` | **`+16.5%`** | DEN RB (GP=7, 2026Avg=12.4): Layer-1 mean 8.9 (median 8.9) vs DK 7.5 |
| **4** | `TEN@CIN` | **Cam Ward (TEN) Passing Yards UNDER 197.5** | `177.36` | `65.9%` | **`66.4%`** | `50.0%` | **`+16.4%`** | TEN QB (GP=7, 2026Avg=168.4, QB2x2=-0.004): Layer-1 mean 178.1 (median 177.4) vs DK 197.5 |
| **5** | `CLE@PIT` | **Jaylen Warren (PIT) Receiving Yards OVER 23.5** | `31.28` | `66.9%` | **`66.2%`** | `50.0%` | **`+16.2%`** | PIT RB (GP=7, 2026Avg=42.0, WOPR=0.21, C281=2.06): Layer-1 mean 31.4 (median 31.3) vs DK 23.5 |
| **6** | `KC@DEN` | **J.K. Dobbins (DEN) Rushing Yards OVER 21.5** | `27.89` | `66.2%` | **`66.0%`** | `50.0%` | **`+16.0%`** | DEN RB (GP=7, 2026Avg=41.9, C285=-0.010): Layer-1 mean 28.4 (median 27.9) vs DK 21.5 |
| **7** | `IND@JAX` | **Trevor Lawrence (JAX) Passing TDs OVER 1.5** | `1.88` | `65.0%` | **`65.5%`** | `50.0%` | **`+15.5%`** | JAX QB (GP=6, 2026Avg=2.33, QB2x2=-0.001): Layer-1 mean 1.9 (median 1.9) vs DK 1.5 |
| **8** | `LAC@LA` | **Matthew Stafford (LA) Passing Yards OVER 249.5** | `272.77` | `65.6%` | **`65.1%`** | `50.0%` | **`+15.1%`** | LA QB (GP=7, 2026Avg=284.1, QB2x2=-0.002): Layer-1 mean 273.5 (median 272.8) vs DK 249.5 |
| **9** | `LV@NYJ` | **Ashton Jeanty (LV) Receiving Yards OVER 27.5** | `34.82` | `66.1%` | **`65.1%`** | `50.0%` | **`+15.1%`** | LV RB (GP=7, 2026Avg=44.6, WOPR=0.29, C281=1.69): Layer-1 mean 35.0 (median 34.8) vs DK 27.5 |
| **10** | `LV@NYJ` | **Michael Mayer (LV) Receiving Yards OVER 25.5** | `32.77` | `66.0%` | **`64.5%`** | `50.0%` | **`+14.5%`** | LV TE (GP=7, 2026Avg=42.6, WOPR=0.27, C281=1.92): Layer-1 mean 32.9 (median 32.8) vs DK 25.5 |
| **11** | `BAL@BUF` | **Ty Johnson (BUF) Receiving Yards OVER 15.5** | `22.57` | `65.5%` | **`64.1%`** | `50.0%` | **`+14.1%`** | BUF RB (GP=4, 2026Avg=38.8, WOPR=0.19, C281=3.08): Layer-1 mean 22.7 (median 22.6) vs DK 15.5 |
| **12** | `TEN@CIN` | **Tee Higgins (CIN) Receiving Yards OVER 67.5** | `80.67` | `63.2%` | **`63.1%`** | `50.0%` | **`+13.1%`** | CIN WR (GP=6, 2026Avg=95.2, WOPR=0.66, C281=2.72): Layer-1 mean 80.7 (median 80.7) vs DK 67.5 |
| **13** | `BAL@BUF` | **Keon Coleman (BUF) Receiving Yards OVER 32.5** | `39.26` | `64.2%` | **`63.1%`** | `50.0%` | **`+13.1%`** | BUF WR (GP=6, 2026Avg=47.2, WOPR=0.40, C281=2.81): Layer-1 mean 39.4 (median 39.3) vs DK 32.5 |
| **14** | `LAC@LA` | **Justin Herbert (LAC) Passing Yards UNDER 206.5** | `191.01` | `61.7%` | **`62.9%`** | `50.0%` | **`+12.9%`** | LAC QB (GP=6, 2026Avg=190.2, QB2x2=-0.013): Layer-1 mean 191.7 (median 191.0) vs DK 206.5 |
| **15** | `CLE@PIT` | **Jaylen Warren (PIT) Rush + Rec Yards OVER 93.5** | `108.94` | `64.1%` | **`62.7%`** | `50.0%` | **`+12.7%`** | PIT RB (GP=7, 2026Avg=122.1): Layer-1 mean 109.1 (median 108.9) vs DK 93.5 |
| **16** | `CHI@SEA` | **Jaxon Smith-Njigba (SEA) Receiving Yards OVER 98.5** | `113.07` | `60.0%` | **`62.6%`** | `50.0%` | **`+12.6%`** | SEA WR (GP=7, 2026Avg=123.9, WOPR=0.93, C281=2.65): Layer-1 mean 113.0 (median 113.1) vs DK 98.5 |
| **17** | `CHI@SEA` | **Luther Burden III (CHI) Receiving Yards OVER 51.5** | `61.08` | `62.8%` | **`62.0%`** | `50.0%` | **`+12.0%`** | CHI WR (GP=7, 2026Avg=70.1, WOPR=0.50, C281=2.49): Layer-1 mean 61.2 (median 61.1) vs DK 51.5 |
| **18** | `ARI@DAL` | **CeeDee Lamb (DAL) Receptions OVER 6.5** | `7.18` | `59.7%` | **`61.1%`** | `50.0%` | **`+11.1%`** | DAL WR (GP=7, 2026Avg=7.6, WOPR=0.75): Layer-1 mean 7.2 (median 7.2) vs DK 6.5 |

---

## 5. Unpriced `1st Quarter Total` Projections & Book Trigger Odds (`ABSTAIN` — `@locktalkbets` 1Q Stop & `19.26%` 2026 Q1 Simplex)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `LV@NYJ` | **LV@NYJ 1Q Total UNDER 9.5** | `8.18` | **`62.4%`** | `-166` | **`-141`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.2 vs ref 9.5 |
| **2** | `BAL@BUF` | **BAL@BUF 1Q Total OVER 10.5** | `11.58` | **`62.0%`** | `-163` | **`-138`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 11.6 vs ref 10.5 |
| **3** | `LAC@LA` | **LAC@LA 1Q Total UNDER 9.5** | `8.29` | **`61.0%`** | `-156` | **`-133`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.3 vs ref 9.5 |
| **4** | `CLE@PIT` | **CLE@PIT 1Q Total OVER 7.5** | `8.10` | **`57.9%`** | `-137` | **`-117`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.1 vs ref 7.5 |
| **5** | `IND@JAX` | **IND@JAX 1Q Total UNDER 9.5** | `8.74` | **`57.0%`** | `-133` | **`-113`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.7 vs ref 9.5 |
| **6** | `NE@MIA` | **NE@MIA 1Q Total UNDER 8.5** | `7.75` | **`56.9%`** | `-132` | **`-112`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 7.8 vs ref 8.5 |
| **7** | `TEN@CIN` | **TEN@CIN 1Q Total UNDER 9.5** | `8.97` | **`54.5%`** | `-120` | **`-102`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 9.0 vs ref 9.5 |
| **8** | `KC@DEN` | **KC@DEN 1Q Total OVER 8.5** | `8.69` | **`53.1%`** | `-113` | **`-100`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.7 vs ref 8.5 |

---

## 6. Kicking Suite Projections & Book Trigger Odds (`ABSTAIN` — `Field Goals Made O/U 1.5` Pathwise Stall Kernel)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **Harrison Mevis (LA) Field Goals Made UNDER 1.5** | `1.12` | **`69.0%`** | `-223` | **`-186`** | Blended FGM lambda=1.12 (2026 Avg=1.00, Sim4thFG=1.45, RZ TD%=52.0%) |
| **2** | `MIN@DET` | **Will Reichard (MIN) Field Goals Made OVER 1.5** | `2.35` | **`68.1%`** | `-213` | **`-178`** | Blended FGM lambda=2.35 (2026 Avg=3.00, Sim4thFG=1.39, RZ TD%=19.5%) |
| **3** | `IND@JAX` | **Spencer Shrader (IND) Field Goals Made OVER 1.5** | `2.34` | **`67.9%`** | `-212` | **`-177`** | Blended FGM lambda=2.34 (2026 Avg=2.71, Sim4thFG=1.41, RZ TD%=18.5%) |
| **4** | `ARI@DAL` | **Chad Ryland (ARI) Field Goals Made OVER 1.5** | `2.30` | **`66.9%`** | `-202` | **`-170`** | Blended FGM lambda=2.30 (2026 Avg=2.43, Sim4thFG=1.61, RZ TD%=12.6%) |
| **5** | `LV@NYJ` | **Matt Gay (LV) Field Goals Made OVER 1.5** | `2.28` | **`66.4%`** | `-197` | **`-166`** | Blended FGM lambda=2.28 (2026 Avg=2.43, Sim4thFG=1.57, RZ TD%=15.9%) |
| **6** | `ATL@TB` | **Chase McLaughlin (TB) Field Goals Made OVER 1.5** | `2.24` | **`65.4%`** | `-189` | **`-159`** | Blended FGM lambda=2.24 (2026 Avg=2.29, Sim4thFG=1.63, RZ TD%=15.8%) |

---

## 7. Defense / IDP Suite Projections & Book Trigger Odds (`ABSTAIN` — `C-300 @rynoonan` Tackle Funnel & Edge Sacks)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `KC@DEN` | **Alex Singleton (DEN LB) Total Tackles+Ast UNDER 12.5** | `10.24` | **`76.8%`** | `-331` | **`-268`** | C-300 @rynoonan tackle funnel: 55.4 opp plays -> E[Tackles]=10.24 vs ref 12.5 |
| **2** | `TEN@CIN` | **Demetrius Knight Jr. (CIN LB) Total Tackles+Ast UNDER 8.5** | `6.89` | **`74.4%`** | `-290` | **`-237`** | C-300 @rynoonan tackle funnel: 44.4 opp plays -> E[Tackles]=6.89 vs ref 8.5 |
| **3** | `MIN@DET` | **Blake Cashman (MIN LB) Total Tackles+Ast OVER 8.5** | `10.46` | **`71.6%`** | `-252` | **`-209`** | C-300 @rynoonan tackle funnel: 63.2 opp plays -> E[Tackles]=10.46 vs ref 8.5 |
| **4** | `LAC@LA` | **Nate Landman (LA LB) Total Tackles+Ast UNDER 8.5** | `7.21` | **`70.1%`** | `-234` | **`-195`** | C-300 @rynoonan tackle funnel: 45.5 opp plays -> E[Tackles]=7.21 vs ref 8.5 |
| **5** | `NE@MIA` | **Jacob Rodriguez (MIA LB) Total Tackles+Ast UNDER 10.5** | `9.27` | **`67.4%`** | `-207` | **`-173`** | C-300 @rynoonan tackle funnel: 51.3 opp plays -> E[Tackles]=9.27 vs ref 10.5 |
| **6** | `CLE@PIT` | **Carson Schwesinger (CLE LB) Total Tackles+Ast OVER 8.5** | `10.03` | **`67.1%`** | `-204` | **`-171`** | C-300 @rynoonan tackle funnel: 60.8 opp plays -> E[Tackles]=10.03 vs ref 8.5 |
| **7** | `BAL@BUF` | **Roquan Smith (BAL LB) Total Tackles+Ast OVER 7.5** | `8.91` | **`66.5%`** | `-199` | **`-167`** | C-300 @rynoonan tackle funnel: 59.2 opp plays -> E[Tackles]=8.91 vs ref 7.5 |
| **8** | `ATL@TB` | **Za'Darius Smith (ATL DE) Over 0.25 Sacks (0.5+ Clears)** | `1.03` | **`64.2%`** | `-179` | **`-151`** | Pathwise team sacks 2.96 x 35% share -> lambda=1.03 sacks |

---

## 8. Goal-Line / Anytime TD Vulture Projections & Book Trigger Odds (`ABSTAIN` — `@locktalkbets` Inside-the-5 Split)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `MIN@DET` | **Jahmyr Gibbs (DET) Anytime TD** | `0.83` | **`92.9%`** | `-1306` | **`-800`** | Low QB vulture (16.7%) -> RB1 goal-line share=83.3%, P(1+ TD)=92.9% |
| **2** | `KC@DEN` | **Kenneth Walker III (KC) Anytime TD** | `0.90` | **`89.6%`** | `-865` | **`-596`** | Low QB vulture (9.6%) -> RB1 goal-line share=90.4%, P(1+ TD)=89.6% |
| **3** | `LAC@LA` | **Kyren Williams (LA) Anytime TD** | `0.90` | **`81.6%`** | `-444` | **`-347`** | Low QB vulture (9.6%) -> RB1 goal-line share=90.4%, P(1+ TD)=81.6% |
| **4** | `PHI@WAS` | **Jacory Croskey-Merritt (WAS) Anytime TD** | `0.86` | **`80.3%`** | `-407` | **`-321`** | Low QB vulture (14.4%) -> RB1 goal-line share=85.6%, P(1+ TD)=80.3% |
| **5** | `IND@JAX` | **Bhayshul Tuten (JAX) Anytime TD** | `0.88` | **`78.3%`** | `-362` | **`-290`** | Low QB vulture (11.8%) -> RB1 goal-line share=88.1%, P(1+ TD)=78.3% |
| **6** | `ARI@DAL` | **Javonte Williams (DAL) Anytime TD** | `0.93` | **`71.6%`** | `-252` | **`-208`** | Low QB vulture (6.9%) -> RB1 goal-line share=93.1%, P(1+ TD)=71.6% |

---

## 9. Scores24.live Empirical Quarter/Half/Total/Handicap Trend Concordance Matrix

Cross-verified dynamically against live simulation outputs and `data/engine/scores24_nfl_week8_2026_10_30.json` (`115` priced empirical trends & `6` match predictions from `https://scores24.live/en/american-football/l-usa-nfl`):

| Matchup | Scores24 Empirical Trend / Streak (`n >= 5`) | Scores24 Price / Pick | GSE 360° Pathwise Simulation Concordance |
|---|---|---|---|
| `BAL@BUF` | Bills won 8 of last 9 games; Bills +3.5 in 21 straight home games; Ravens won 4Q in 8 of last 9 away games | `BUF -3.5 (Editor Pick) / BAL 4Q +132` | Sim Median `BUF -3.35`, Total `60.49` (`1Q 11.6`, `1H 29.5`) |
| `TEN@CIN` | Bengals averaging 27.2 PPG vs Titans 15.4 PPG (1-6 record); Bengals 35-13 rout of BAL | `CIN -9.5 (Editor Pick)` | Sim Median `CIN -15.27`, Total `48.14` (`1Q 9.0`, `1H 23.0`) |
| `ARI@DAL` | Over 44.5 in 13 of last 15 DAL games; ARI allowing 29.7 PPG; ARI Over 23.5 TT in 5 straight at DAL | `OVER 51.5 (Editor Pick)` | Sim Median `DAL -5.65`, Total `52.66` (`1Q 10.1`, `1H 25.6`) |
| `MIN@DET` | Lions Over 24.5 TT in 6 of last 7 vs MIN; Over 49.5 in 6 of last 7 MIN@DET; MIN won 4Q in 6 straight | `DET TT Over 24.5 (-120) / Over 49.5 (+127)` | Sim Median `DET -8.03`, Total `50.76` (`1Q 9.6`, `1H 24.5`) |
| `LV@NYJ` | Under 53.5 in 10 straight NYJ home games; NYJ TT Under 23.5 in 13 of last 15; Raiders 4-game skid | `NYJ ML (Editor Pick)` | Sim Median `NYJ -0.45`, Total `43.01` (`1Q 8.2`, `1H 21.0`) |
| `CLE@PIT` | Steelers 19-1 in last 20 home games vs CLE (-2.5 in 19/20); PIT won 1H in 5 straight & 2Q in 8/9 vs CLE | `PIT ML (-192) / PIT 1H (-149) / PIT TT > 20.5` | Sim Median `PIT -6.31`, Total `42.88` (`1Q 8.1`, `1H 20.9`) |
| `ATL@TB` | Buccaneers +6.5 in 19 of last 21 home games; Over 42.5 in 5 straight TB vs ATL; ATL won 2Q in 6/7 away | `Over 42.5 (-141)` | Sim Median `TB -2.46`, Total `45.63` (`1Q 8.5`, `1H 21.8`) |
| `IND@JAX` | Jaguars won 2Q in 10 straight home games vs IND; won 1H in 5 straight; won -2.5 in 11 straight home vs IND | `JAX -7.5 (Editor Pick) / JAX 1H (-294)` | Sim Median `JAX -10.01`, Total `47.00` (`1Q 8.7`, `1H 22.5`) |
| `LAC@LA` | Chargers lost 9 straight NFL games, lost 1H in 8/9, lost 2Q & 4Q in 7/8; Rams Over 26.5 TT in 6/7 home | `LA ML (-294) / LA 1H (-200)` | Sim Median `LA -11.46`, Total `44.97` (`1Q 8.3`, `1H 21.6`) |
| `KC@DEN` | Under 46.5 in 10 of last 11 DEN games; DEN 17-2 in last 19 home games | `DEN +3.5 (-179) / Under 46.5 (-227)` | Sim Median `DEN +6.31`, Total `46.15` (`1Q 8.7`, `1H 22.3`) |
| `NE@MIA` | Dolphins lost 9 of last 10 games, lost 1H in 9/10 (NE 1H -189), lost 2Q in 8/9 (NE 2Q -118) | `NE ML (-323) / NE 1H (-189)` | Sim Median `MIA +5.91`, Total `41.96` (`1Q 7.8`, `1H 20.1`) |
| `PHI@WAS` | Commanders -6.0 home favorite; Eagles 2-5 skid vs Daniels high-tempo offense | `WAS -6.0` | Sim Median `WAS -7.23`, Total `44.93` (`1Q 8.7`, `1H 22.3`) |
| `CHI@SEA` | Bears 5-2 vs Seahawks 4-3; fast neutral pace (25.53s) | `SEA -3.0 / Total 46.5` | Sim Median `SEA -3.06`, Total `48.34` (`1Q 9.2`, `1H 23.5`) |

---

## 10. Official New Engine Verified Record & Calibration Receipts

- **Official New Engine Verified Record (`AGENTS.md` Standing Doctrine):** **`16-5` (`76.2%`) · `+10.45 Units`** entering Oct 29, 2026 (`data/engine/new_engine_official_ledger_2026.json` and `docs/predictions/research/2026-10-29/NEW-ENGINE-OFFICIAL-LEDGER-16-5.md`).
- **Weeks 1–7 Held-Out Replay (`106` games, `step5_replay.py`):** Pathwise conservation residual `0.00e+00`, Sinkhorn dual residual `9.92e-12`, ML Gate (`edge >= 0.02, model_p >= 0.58`) **60.00% (`21-14`, `+1.26%` mean CLV)**; High-Confidence Gate (`model_p >= 0.64`) **66.67% (`12-6`)**.
- **Adversarial TDD Fixes & Oct 30 Readiness Kernels Verified (`18/18 PASSED` in `tests/test_consolidated_sweep_kernels.py`):** (1) `@locktalkbets` pocket-passer goal-line vulture ceiling removed; (2) `TEAM_TO_QB_2026` synced to all 32 verified Week 8 starters; (3) `home_qtr_cal` / `away_qtr_cal` anchored to the 2026 empirical regulation scoring simplex (`[0.1926, 0.2960, 0.2103, 0.3011]`) with post-calibration `first_half_margin_shift` and 4-quarter zero-sum HFA conservation; (4) `build_player_profiles` resolves mid-season trades by `player_id` and latest Week 8 injury status (`Lamar Jackson`, `Emeka Egbuka`, `Tyler Warren` active; `Saquon Barkley` `PHI` RB1) with strict `DE/OLB/DL/EDGE` and `LB/ILB/MLB` filters; (5) `project_player_prop_prob` enforces Layer-1 GP empirical-Bayes shrinkage and Stage D `|Δ log-odds| <= 0.35` before comparing against `market_p` last; (6) `consume_oct30_signal_pack` actively consumes all 7 verified tables in `docs/research/2026-10-30/signal-pack/outputs/` (closing `READINESS.md` §5.9); (7) `compute_tau_hat_4th_down_coach_tax` consumes the point-in-time walk-forward `tau_hat.csv` (`+11.1585pp` walk-forward / `+6.7703pp` prior-only control, `n=3,988`) in live simulation state (closing `READINESS.md` §5.8 Solution 2); (8) `compute_b4_hierarchical_fg_make_prob` & `compute_eq_physics_001_ball_flight_modifier` model altitude/wind/spin ball-flight physics (`23,247` kicks); (9) `compute_b6_b9_ol_qb_pressure_sack_survival` separates OL pressure prior from QB sack survival + PFR throwaway escape; (10) `compute_adaptive_conformal_interval_aci` & `compute_nguyen_yurko_snap_timing_variance` attach distribution-free conformal intervals and multilevel snap-timing variance.
