# Week 8 360° Full-Board Master Call Sheet — Post-Grok 4.7 Sweep & TDD Calibration Upgrade

**Generated:** `2026-10-30` | **Engine:** `GSE v5.3.0 Pathwise 360° (10,000 worlds × 175 snaps = 22.75M snaps)` | **Seal Hash:** `a293ee26ed6f1350...`

**Transport & Conservation Certificates:** Max Pathwise Conservation Residual = `0.00e+00` (`<= 1e-6`) | Max Sinkhorn Dual Residual = `9.92e-12` (`<= 1e-6`) | Evaluated Candidates = `580` | Priced Gate Survivors (`PUBLISH`) = `135` | Unpriced Derivative Projections (`ABSTAIN`) = `93`

---

## 1. All 13 Sunday/Monday Matchups — Pathwise Medians vs Live DraftKings Lines

| Matchup | DK Spread (H) | Sim Spread (H) | DK Total | Sim Total | Sim 1Q Tot | Sim 1H Tot | Pace (s) | QB 2×2 Matrix Shift | Early-Down Edge |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| **BAL @ BUF** | `-3.0` | `-2.70` | `54.5` | `60.29` | `11.5` | `29.4` | `26.28s` | Jackson +0.020 / Allen +0.012 | BUF |
| **TEN @ CIN** | `-11.5` | `-18.30` | `46.5` | `48.82` | `9.3` | `24.1` | `26.87s` | Ward -0.004 / Burrow -0.008 | CIN |
| **ARI @ DAL** | `-7.0` | `-5.92` | `54.5` | `59.73` | `11.3` | `29.2` | `25.90s` | Brissett +0.007 / Prescott +0.015 | DAL |
| **MIN @ DET** | `-3.0` | `-1.80` | `46.5` | `42.24` | `7.9` | `20.4` | `26.67s` | Murray +0.003 / Goff +0.151 | DET |
| **LV @ NYJ** | `-1.5` | `-4.33` | `45.5` | `43.29` | `8.2` | `21.3` | `27.27s` | Cousins -0.009 / Smith -0.012 | NYJ |
| **CLE @ PIT** | `-3.5` | `-6.50` | `39.5` | `39.04` | `7.3` | `18.9` | `26.87s` | Watson -0.002 / Rodgers +0.035 | PIT |
| **ATL @ TB** | `-2.5` | `-2.69` | `44.5` | `41.49` | `7.7` | `19.9` | `26.28s` | Penix +0.013 / Mayfield +0.016 | ATL |
| **IND @ JAX** | `-10.0` | `-13.71` | `46.5` | `48.43` | `9.2` | `23.5` | `25.90s` | Jones -0.017 / Lawrence -0.001 | JAX |
| **LAC @ LA** | `-6.5` | `-12.41` | `45.5` | `42.42` | `7.7` | `20.2` | `28.12s` | Herbert -0.013 / Stafford -0.002 | LA |
| **KC @ DEN** | `+1.5` | `+5.40` | `40.5` | `44.33` | `8.5` | `21.6` | `27.27s` | Mahomes +0.025 / Nix +0.005 | KC |
| **NE @ MIA** | `+7.0` | `+8.39` | `43.5` | `44.58` | `8.6` | `21.9` | `27.27s` | Maye +0.006 / Willis -0.013 | NE |
| **PHI @ WAS** | `-6.0` | `-6.04` | `40.5` | `43.10` | `8.2` | `21.2` | `26.09s` | McKee +0.000 / Daniels +0.001 | WAS |
| **CHI @ SEA** | `-3.0` | `-0.90` | `46.5` | `42.91` | `8.0` | `20.7` | `25.71s` | Williams -0.026 / Darnold +0.012 | CHI |

---

## 2. Tier-1 Main Game Lines (`Spread`, `Total`, `Moneyline` — Live DraftKings Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **LA ML (-270)** | `76.82` | `81.1%` | **`76.8%`** | `70.0%` | **`+6.8%`** | Pathwise win prob 81.1% (Stage D 76.8%) vs de-vigged market 70.0% |
| **2** | `LV@NYJ` | **NYJ ML (-122)** | `61.17` | `61.8%` | **`61.2%`** | `52.6%` | **`+8.6%`** | Pathwise win prob 61.8% (Stage D 61.2%) vs de-vigged market 52.6% |
| **3** | `MIN@DET` | **MIN@DET UNDER 46.5** | `42.24` | `63.2%` | **`60.8%`** | `52.2%` | **`+8.6%`** | Pathwise median total 42.24 vs DK 46.5 (pace 26.67s) |
| **4** | `LAC@LA` | **LA -6.5** | `-12.41` | `64.5%` | **`60.3%`** | `51.7%` | **`+8.6%`** | Pathwise median LA -12.41 vs DK -6.5 (Herbert -0.013 / Stafford -0.002) |
| **5** | `KC@DEN` | **KC ML (-118)** | `60.34` | `65.6%` | **`60.3%`** | `51.7%` | **`+8.6%`** | Pathwise win prob 65.6% (Stage D 60.3%) vs de-vigged market 51.7% |
| **6** | `ARI@DAL` | **ARI@DAL OVER 54.5** | `59.73` | `67.0%` | **`59.1%`** | `50.4%` | **`+8.6%`** | Pathwise median total 59.73 vs DK 54.5 (pace 25.90s) |
| **7** | `ATL@TB` | **ATL@TB UNDER 44.5** | `41.49` | `59.9%` | **`59.1%`** | `50.4%` | **`+8.6%`** | Pathwise median total 41.49 vs DK 44.5 (pace 26.28s) |
| **8** | `KC@DEN` | **KC@DEN OVER 40.5** | `44.33` | `62.3%` | **`59.1%`** | `50.4%` | **`+8.6%`** | Pathwise median total 44.33 vs DK 40.5 (pace 27.27s) |
| **9** | `BAL@BUF` | **BAL@BUF OVER 54.5** | `60.29` | `66.5%` | **`58.7%`** | `50.0%` | **`+8.7%`** | Pathwise median total 60.29 vs DK 54.5 (pace 26.28s) |
| **10** | `PHI@WAS` | **PHI@WAS OVER 40.5** | `43.10` | `60.1%` | **`58.7%`** | `50.0%` | **`+8.7%`** | Pathwise median total 43.10 vs DK 40.5 (pace 26.09s) |

---

## 3. Priced Quarters, Halves & Team Totals (`1H/2Q/4Q/2H Winner` & `Team Totals` — Live Scores24 Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **LA 1H Winner (-200)** | `5.83` | `77.2%` | **`71.4%`** | `63.8%` | **`+7.6%`** | Scores24 LAC lost 1H in 8/9 — Pathwise win prob 77.2% (Stage D 71.4%) vs de-vig 63.8% |
| **2** | `NE@MIA` | **NE 1H Winner (-189)** | `3.86` | `70.4%` | **`70.4%`** | `62.6%` | **`+7.8%`** | Scores24 MIA lost 1H in 9/10 — Pathwise win prob 70.4% (Stage D 70.4%) vs de-vig 62.6% |
| **3** | `IND@JAX` | **JAX 1H Winner (-294)** | `6.25` | `78.7%` | **`78.0%`** | `71.4%` | **`+6.6%`** | Scores24 JAX 1H 5/5 home vs IND — Pathwise win prob 78.7% (Stage D 78.0%) vs de-vig 71.4% |
| **4** | `CLE@PIT` | **PIT 1H Winner (-149)** | `3.19` | `66.4%` | **`65.5%`** | `57.3%` | **`+8.3%`** | Scores24 PIT 1H 5/5 home vs CLE — Pathwise win prob 66.4% (Stage D 65.5%) vs de-vig 57.3% |
| **5** | `IND@JAX` | **JAX 2Q Winner (-149)** | `3.86` | `76.5%` | **`65.5%`** | `57.3%` | **`+8.3%`** | Scores24 JAX 2Q 10/10 home vs IND — Pathwise win prob 76.5% (Stage D 65.5%) vs de-vig 57.3% |
| **6** | `CLE@PIT` | **PIT 2H Winner (-127)** | `3.52` | `67.0%` | **`62.1%`** | `53.5%` | **`+8.5%`** | Scores24 PIT 2H 9/9 home vs CLE — Pathwise win prob 67.0% (Stage D 62.1%) vs de-vig 53.5% |
| **7** | `LAC@LA` | **LA 2Q Winner (-118)** | `3.81` | `74.2%` | **`60.4%`** | `51.8%` | **`+8.6%`** | Scores24 LAC lost 2Q in 7/8 — Pathwise win prob 74.2% (Stage D 60.4%) vs de-vig 51.8% |
| **8** | `ARI@DAL` | **ARI Team Total OVER 23.5 (-110)** | `27.25` | `64.9%` | **`58.8%`** | `50.1%` | **`+8.7%`** | Scores24 ARI TT >23.5 in 5/5 at DAL — Pathwise win prob 64.9% (Stage D 58.8%) vs de-vig 50.1% |
| **9** | `BAL@BUF` | **BUF 2Q Winner (-103)** | `0.99` | `58.0%` | **`57.2%`** | `48.6%` | **`+8.7%`** | Scores24 BUF 2Q 7/8 streak — Pathwise win prob 58.0% (Stage D 57.2%) vs de-vig 48.6% |
| **10** | `NE@MIA` | **NE 2Q Winner (-118)** | `2.46` | `68.6%` | **`68.6%`** | `61.8%` | **`+6.8%`** | Scores24 MIA lost 2Q in 8/9 — Pathwise win prob 68.6% (Stage D 68.6%) vs de-vig 61.8% |

---

## 4. Top Skill & QB Player Props (`Layer-1 GP Empirical-Bayes` + `Stage D <= 0.35`, Live DraftKings Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `TEN@CIN` | **Cam Ward (TEN) Passing Yards UNDER 197.5** | `177.38` | `65.9%` | **`66.3%`** | `50.0%` | **`+16.4%`** | TEN QB (GP=7, 2026Avg=168.4, QB2x2=-0.004): Layer-1 mean 178.1 (median 177.4) vs DK 197.5 |
| **2** | `IND@JAX` | **Trevor Lawrence (JAX) Passing TDs OVER 1.5** | `1.97` | `65.0%` | **`65.2%`** | `50.0%` | **`+15.2%`** | JAX QB (GP=6, 2026Avg=2.33, QB2x2=-0.001): Layer-1 mean 1.9 (median 2.0) vs DK 1.5 |
| **3** | `NE@MIA` | **Drake Maye (NE) Passing Yards OVER 233.5** | `252.26` | `63.3%` | **`64.1%`** | `50.0%` | **`+14.1%`** | NE QB (GP=7, 2026Avg=254.9, QB2x2=+0.006): Layer-1 mean 252.5 (median 252.3) vs DK 233.5 |
| **4** | `BAL@BUF` | **Ty Johnson (BUF) Receiving Yards OVER 15.5** | `22.28` | `65.1%` | **`63.6%`** | `50.0%` | **`+13.6%`** | BUF RB (GP=4, 2026Avg=38.8, WOPR=0.19, C281=3.08): Layer-1 mean 22.5 (median 22.3) vs DK 15.5 |
| **5** | `KC@DEN` | **Patrick Mahomes (KC) Passing Yards OVER 225.5** | `243.13` | `62.7%` | **`63.6%`** | `50.0%` | **`+13.6%`** | KC QB (GP=6, 2026Avg=245.7, QB2x2=+0.025): Layer-1 mean 243.1 (median 243.1) vs DK 225.5 |
| **6** | `MIN@DET` | **Kyler Murray (MIN) Passing TDs UNDER 1.5** | `1.03` | `63.5%` | **`63.5%`** | `50.0%` | **`+13.5%`** | MIN QB (GP=5, 2026Avg=0.60, QB2x2=+0.003): Layer-1 mean 1.2 (median 1.0) vs DK 1.5 |
| **7** | `MIN@DET` | **Kyler Murray (MIN) Passing Yards UNDER 225.5** | `206.71` | `63.2%` | **`63.2%`** | `50.0%` | **`+13.2%`** | MIN QB (GP=5, 2026Avg=162.4, QB2x2=+0.003): Layer-1 mean 207.2 (median 206.7) vs DK 225.5 |
| **8** | `TEN@CIN` | **Tee Higgins (CIN) Receiving Yards OVER 67.5** | `80.88` | `63.2%` | **`63.1%`** | `50.0%` | **`+13.1%`** | CIN WR (GP=6, 2026Avg=95.2, WOPR=0.66, C281=2.72): Layer-1 mean 80.7 (median 80.9) vs DK 67.5 |
| **9** | `CLE@PIT` | **Jaylen Warren (PIT) Rush + Rec Yards OVER 93.5** | `109.14` | `64.1%` | **`63.0%`** | `50.0%` | **`+13.1%`** | PIT RB (GP=7, 2026Avg=122.1): Layer-1 mean 109.1 (median 109.1) vs DK 93.5 |
| **10** | `LAC@LA` | **Justin Herbert (LAC) Passing Yards UNDER 206.5** | `190.38` | `61.7%` | **`62.9%`** | `50.0%` | **`+12.9%`** | LAC QB (GP=6, 2026Avg=190.2, QB2x2=-0.013): Layer-1 mean 191.7 (median 190.4) vs DK 206.5 |
| **11** | `LAC@LA` | **Justin Herbert (LAC) Passing TDs UNDER 1.5** | `1.00` | `61.8%` | **`62.7%`** | `50.0%` | **`+12.7%`** | LAC QB (GP=6, 2026Avg=0.83, QB2x2=-0.013): Layer-1 mean 1.2 (median 1.0) vs DK 1.5 |
| **12** | `LV@NYJ` | **Michael Mayer (LV) Receptions OVER 2.5** | `3.21` | `64.0%` | **`62.7%`** | `50.0%` | **`+12.7%`** | LV TE (GP=7, 2026Avg=4.4, WOPR=0.27): Layer-1 mean 3.3 (median 3.2) vs DK 2.5 |
| **13** | `CLE@PIT` | **Jaylen Warren (PIT) Receiving Yards OVER 23.5** | `29.28` | `63.3%` | **`62.5%`** | `50.0%` | **`+12.5%`** | PIT RB (GP=7, 2026Avg=42.0, WOPR=0.21, C281=2.06): Layer-1 mean 29.6 (median 29.3) vs DK 23.5 |
| **14** | `BAL@BUF` | **Keon Coleman (BUF) Receiving Yards OVER 32.5** | `38.81` | `63.5%` | **`62.3%`** | `50.0%` | **`+12.3%`** | BUF WR (GP=6, 2026Avg=47.2, WOPR=0.40, C281=2.81): Layer-1 mean 39.0 (median 38.8) vs DK 32.5 |
| **15** | `KC@DEN` | **Kenneth Walker III (KC) Rushing Yards OVER 88.5** | `102.02` | `62.3%` | **`62.3%`** | `50.0%` | **`+12.3%`** | KC RB (GP=6, 2026Avg=116.8, C285=+0.000): Layer-1 mean 102.9 (median 102.0) vs DK 88.5 |
| **16** | `LV@NYJ` | **Ashton Jeanty (LV) Receiving Yards OVER 27.5** | `33.30` | `62.9%` | **`61.8%`** | `50.0%` | **`+11.8%`** | LV RB (GP=7, 2026Avg=44.6, WOPR=0.29, C281=1.69): Layer-1 mean 33.4 (median 33.3) vs DK 27.5 |
| **17** | `ARI@DAL` | **CeeDee Lamb (DAL) Receptions OVER 6.5** | `7.33` | `59.7%` | **`61.1%`** | `50.0%` | **`+11.1%`** | DAL WR (GP=7, 2026Avg=7.6, WOPR=0.75): Layer-1 mean 7.2 (median 7.3) vs DK 6.5 |
| **18** | `CHI@SEA` | **Jaxon Smith-Njigba (SEA) Receiving Yards OVER 98.5** | `109.00` | `57.6%` | **`60.2%`** | `50.0%` | **`+10.2%`** | SEA WR (GP=7, 2026Avg=123.9, WOPR=0.93, C281=2.65): Layer-1 mean 109.4 (median 109.0) vs DK 98.5 |

---

## 5. Unpriced `1st Quarter Total` Projections & Book Trigger Odds (`ABSTAIN` — `@locktalkbets` 1Q Stop & `19.26%` 2026 Q1 Simplex)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **LAC@LA 1Q Total UNDER 9.5** | `7.72` | **`66.9%`** | `-202` | **`-170`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 7.7 vs ref 9.5 |
| **2** | `MIN@DET` | **MIN@DET 1Q Total UNDER 9.5** | `7.93` | **`65.4%`** | `-189` | **`-159`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 7.9 vs ref 9.5 |
| **3** | `CHI@SEA` | **CHI@SEA 1Q Total UNDER 9.5** | `7.97` | **`63.4%`** | `-173` | **`-146`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.0 vs ref 9.5 |
| **4** | `LV@NYJ` | **LV@NYJ 1Q Total UNDER 9.5** | `8.22` | **`61.8%`** | `-162` | **`-137`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.2 vs ref 9.5 |
| **5** | `BAL@BUF` | **BAL@BUF 1Q Total OVER 10.5** | `11.52` | **`61.5%`** | `-160` | **`-135`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 11.5 vs ref 10.5 |
| **6** | `ARI@DAL` | **ARI@DAL 1Q Total OVER 10.5** | `11.34` | **`60.0%`** | `-150` | **`-127`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 11.3 vs ref 10.5 |
| **7** | `ATL@TB` | **ATL@TB 1Q Total UNDER 8.5** | `7.72` | **`56.8%`** | `-131` | **`-112`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 7.7 vs ref 8.5 |
| **8** | `IND@JAX` | **IND@JAX 1Q Total UNDER 9.5** | `9.22` | **`52.5%`** | `-111` | **`-100`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 9.2 vs ref 9.5 |

---

## 6. Kicking Suite Projections & Book Trigger Odds (`ABSTAIN` — `Field Goals Made O/U 1.5` Pathwise Stall Kernel)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `MIN@DET` | **Will Reichard (MIN) Field Goals Made OVER 1.5** | `2.35` | **`68.1%`** | `-213` | **`-178`** | Blended FGM lambda=2.35 (2026 Avg=3.00, Sim4thFG=1.74, RZ TD%=19.5%) |
| **2** | `ATL@TB` | **Chase McLaughlin (TB) Field Goals Made OVER 1.5** | `2.34` | **`67.8%`** | `-210` | **`-176`** | Blended FGM lambda=2.34 (2026 Avg=2.29, Sim4thFG=1.83, RZ TD%=15.8%) |
| **3** | `CLE@PIT` | **Chris Boswell (PIT) Field Goals Made OVER 1.5** | `2.31` | **`67.2%`** | `-205` | **`-171`** | Blended FGM lambda=2.31 (2026 Avg=2.29, Sim4thFG=1.78, RZ TD%=14.8%) |
| **4** | `IND@JAX` | **Spencer Shrader (IND) Field Goals Made OVER 1.5** | `2.30` | **`66.9%`** | `-202` | **`-170`** | Blended FGM lambda=2.30 (2026 Avg=2.71, Sim4thFG=1.33, RZ TD%=18.5%) |
| **5** | `LV@NYJ` | **Matt Gay (LV) Field Goals Made OVER 1.5** | `2.22` | **`65.0%`** | `-186` | **`-157`** | Blended FGM lambda=2.22 (2026 Avg=2.43, Sim4thFG=1.45, RZ TD%=15.9%) |
| **6** | `ARI@DAL` | **Chad Ryland (ARI) Field Goals Made OVER 1.5** | `2.17` | **`63.8%`** | `-176` | **`-149`** | Blended FGM lambda=2.17 (2026 Avg=2.43, Sim4thFG=1.35, RZ TD%=12.6%) |

---

## 7. Defense / IDP Suite Projections & Book Trigger Odds (`ABSTAIN` — `C-300 @rynoonan` Tackle Funnel & Edge Sacks)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `KC@DEN` | **Alex Singleton (DEN LB) Total Tackles+Ast UNDER 12.5** | `9.81` | **`80.9%`** | `-424` | **`-333`** | C-300 @rynoonan tackle funnel: 53.0 opp plays -> E[Tackles]=9.81 vs ref 12.5 |
| **2** | `LAC@LA` | **Nate Landman (LA LB) Total Tackles+Ast UNDER 8.5** | `6.36` | **`80.8%`** | `-421` | **`-331`** | C-300 @rynoonan tackle funnel: 40.2 opp plays -> E[Tackles]=6.36 vs ref 8.5 |
| **3** | `TEN@CIN` | **Demetrius Knight Jr. (CIN LB) Total Tackles+Ast UNDER 8.5** | `6.81` | **`75.3%`** | `-305` | **`-249`** | C-300 @rynoonan tackle funnel: 43.9 opp plays -> E[Tackles]=6.81 vs ref 8.5 |
| **4** | `CLE@PIT` | **Payton Wilson (PIT LB) Total Tackles+Ast UNDER 8.5** | `7.06` | **`72.1%`** | `-259` | **`-214`** | C-300 @rynoonan tackle funnel: 45.0 opp plays -> E[Tackles]=7.06 vs ref 8.5 |
| **5** | `IND@JAX` | **Akeem Davis-Gaither (IND LB) Total Tackles+Ast OVER 8.5** | `10.36` | **`70.6%`** | `-240` | **`-199`** | C-300 @rynoonan tackle funnel: 66.0 opp plays -> E[Tackles]=10.36 vs ref 8.5 |
| **6** | `LV@NYJ` | **Jamien Sherwood (NYJ LB) Total Tackles+Ast UNDER 7.5** | `6.48` | **`67.6%`** | `-209` | **`-175`** | C-300 @rynoonan tackle funnel: 45.9 opp plays -> E[Tackles]=6.48 vs ref 7.5 |
| **7** | `BAL@BUF` | **Roquan Smith (BAL LB) Total Tackles+Ast OVER 7.5** | `8.86` | **`65.9%`** | `-193` | **`-162`** | C-300 @rynoonan tackle funnel: 58.8 opp plays -> E[Tackles]=8.86 vs ref 7.5 |
| **8** | `MIN@DET` | **Jack Campbell (DET LB) Total Tackles+Ast UNDER 9.5** | `8.52` | **`65.0%`** | `-186` | **`-157`** | C-300 @rynoonan tackle funnel: 49.9 opp plays -> E[Tackles]=8.52 vs ref 9.5 |

---

## 8. Goal-Line / Anytime TD Vulture Projections & Book Trigger Odds (`ABSTAIN` — `@locktalkbets` Inside-the-5 Split)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `IND@JAX` | **Bhayshul Tuten (JAX) Anytime TD** | `0.88` | **`89.4%`** | `-842` | **`-584`** | Low QB vulture (11.8%) -> RB1 goal-line share=88.1%, P(1+ TD)=89.4% |
| **2** | `ARI@DAL` | **Javonte Williams (DAL) Anytime TD** | `0.93` | **`83.8%`** | `-515` | **`-394`** | Low QB vulture (6.9%) -> RB1 goal-line share=93.1%, P(1+ TD)=83.8% |
| **3** | `KC@DEN` | **Kenneth Walker III (KC) Anytime TD** | `0.90` | **`79.8%`** | `-396` | **`-314`** | Low QB vulture (9.6%) -> RB1 goal-line share=90.4%, P(1+ TD)=79.8% |
| **4** | `LAC@LA` | **Kyren Williams (LA) Anytime TD** | `0.90` | **`76.6%`** | `-328` | **`-265`** | Low QB vulture (9.6%) -> RB1 goal-line share=90.4%, P(1+ TD)=76.6% |
| **5** | `PHI@WAS` | **Jacory Croskey-Merritt (WAS) Anytime TD** | `0.86` | **`72.0%`** | `-257` | **`-212`** | Low QB vulture (14.4%) -> RB1 goal-line share=85.6%, P(1+ TD)=72.0% |
| **6** | `LV@NYJ` | **Braelon Allen (NYJ) Anytime TD** | `0.89` | **`69.4%`** | `-227` | **`-189`** | Low QB vulture (11.2%) -> RB1 goal-line share=88.8%, P(1+ TD)=69.4% |

---

## 9. Scores24.live Empirical Quarter/Half/Total/Handicap Trend Concordance Matrix

Cross-verified dynamically against live simulation outputs and `data/engine/scores24_nfl_week8_2026_10_30.json` (`115` priced empirical trends & `6` match predictions from `https://scores24.live/en/american-football/l-usa-nfl`):

| Matchup | Scores24 Empirical Trend / Streak (`n >= 5`) | Scores24 Price / Pick | GSE 360° Pathwise Simulation Concordance |
|---|---|---|---|
| `BAL@BUF` | Bills won 8 of last 9 games; Bills +3.5 in 21 straight home games; Ravens won 4Q in 8 of last 9 away games | `BUF -3.5 (Editor Pick) / BAL 4Q +132` | Sim Median `BUF -2.70`, Total `60.29` (`1Q 11.5`, `1H 29.4`) |
| `TEN@CIN` | Bengals averaging 27.2 PPG vs Titans 15.4 PPG (1-6 record); Bengals 35-13 rout of BAL | `CIN -9.5 (Editor Pick)` | Sim Median `CIN -18.30`, Total `48.82` (`1Q 9.3`, `1H 24.1`) |
| `ARI@DAL` | Over 44.5 in 13 of last 15 DAL games; ARI allowing 29.7 PPG; ARI Over 23.5 TT in 5 straight at DAL | `OVER 51.5 (Editor Pick)` | Sim Median `DAL -5.92`, Total `59.73` (`1Q 11.3`, `1H 29.2`) |
| `MIN@DET` | Lions Over 24.5 TT in 6 of last 7 vs MIN; Over 49.5 in 6 of last 7 MIN@DET; MIN won 4Q in 6 straight | `DET TT Over 24.5 (-120) / Over 49.5 (+127)` | Sim Median `DET -1.80`, Total `42.24` (`1Q 7.9`, `1H 20.4`) |
| `LV@NYJ` | Under 53.5 in 10 straight NYJ home games; NYJ TT Under 23.5 in 13 of last 15; Raiders 4-game skid | `NYJ ML (Editor Pick)` | Sim Median `NYJ -4.33`, Total `43.29` (`1Q 8.2`, `1H 21.3`) |
| `CLE@PIT` | Steelers 19-1 in last 20 home games vs CLE (-2.5 in 19/20); PIT won 1H in 5 straight & 2Q in 8/9 vs CLE | `PIT ML (-192) / PIT 1H (-149) / PIT TT > 20.5` | Sim Median `PIT -6.50`, Total `39.04` (`1Q 7.3`, `1H 18.9`) |
| `ATL@TB` | Buccaneers +6.5 in 19 of last 21 home games; Over 42.5 in 5 straight TB vs ATL; ATL won 2Q in 6/7 away | `Over 42.5 (-141)` | Sim Median `TB -2.69`, Total `41.49` (`1Q 7.7`, `1H 19.9`) |
| `IND@JAX` | Jaguars won 2Q in 10 straight home games vs IND; won 1H in 5 straight; won -2.5 in 11 straight home vs IND | `JAX -7.5 (Editor Pick) / JAX 1H (-294)` | Sim Median `JAX -13.71`, Total `48.43` (`1Q 9.2`, `1H 23.5`) |
| `LAC@LA` | Chargers lost 9 straight NFL games, lost 1H in 8/9, lost 2Q & 4Q in 7/8; Rams Over 26.5 TT in 6/7 home | `LA ML (-294) / LA 1H (-200)` | Sim Median `LA -12.41`, Total `42.42` (`1Q 7.7`, `1H 20.2`) |
| `KC@DEN` | Under 46.5 in 10 of last 11 DEN games; DEN 17-2 in last 19 home games | `DEN +3.5 (-179) / Under 46.5 (-227)` | Sim Median `DEN +5.40`, Total `44.33` (`1Q 8.5`, `1H 21.6`) |
| `NE@MIA` | Dolphins lost 9 of last 10 games, lost 1H in 9/10 (NE 1H -189), lost 2Q in 8/9 (NE 2Q -118) | `NE ML (-323) / NE 1H (-189)` | Sim Median `MIA +8.39`, Total `44.58` (`1Q 8.6`, `1H 21.9`) |
| `PHI@WAS` | Commanders -6.0 home favorite; Eagles 2-5 skid vs Daniels high-tempo offense | `WAS -6.0` | Sim Median `WAS -6.04`, Total `43.10` (`1Q 8.2`, `1H 21.2`) |
| `CHI@SEA` | Bears 5-2 vs Seahawks 4-3; fast neutral pace (25.53s) | `SEA -3.0 / Total 46.5` | Sim Median `SEA -0.90`, Total `42.91` (`1Q 8.0`, `1H 20.7`) |

---

## 10. Official New Engine Verified Record & Calibration Receipts

- **Official New Engine Verified Record (`AGENTS.md` Standing Doctrine):** **`16-5` (`76.2%`) · `+10.45 Units`** entering Oct 29, 2026 (`data/engine/new_engine_official_ledger_2026.json` and `docs/predictions/research/2026-10-29/NEW-ENGINE-OFFICIAL-LEDGER-16-5.md`).
- **Weeks 1–7 Held-Out Replay (`106` games, `step5_replay.py`):** Pathwise conservation residual `0.00e+00`, Sinkhorn dual residual `9.92e-12`, ML Gate (`edge >= 0.02, model_p >= 0.58`) **60.00% (`21-14`, `+1.26%` mean CLV)**; High-Confidence Gate (`model_p >= 0.64`) **66.67% (`12-6`)**.
- **Adversarial TDD Fixes & Oct 30 Readiness Kernels Verified (`18/18 PASSED` in `tests/test_consolidated_sweep_kernels.py`):** (1) `@locktalkbets` pocket-passer goal-line vulture ceiling removed; (2) `TEAM_TO_QB_2026` synced to all 32 verified Week 8 starters; (3) `home_qtr_cal` / `away_qtr_cal` anchored to the 2026 empirical regulation scoring simplex (`[0.1926, 0.2960, 0.2103, 0.3011]`) with post-calibration `first_half_margin_shift` and 4-quarter zero-sum HFA conservation; (4) `build_player_profiles` resolves mid-season trades by `player_id` and latest Week 8 injury status (`Lamar Jackson`, `Emeka Egbuka`, `Tyler Warren` active; `Saquon Barkley` `PHI` RB1) with strict `DE/OLB/DL/EDGE` and `LB/ILB/MLB` filters; (5) `project_player_prop_prob` enforces Layer-1 GP empirical-Bayes shrinkage and Stage D `|Δ log-odds| <= 0.35` before comparing against `market_p` last; (6) `consume_oct30_signal_pack` actively consumes all 7 verified tables in `docs/research/2026-10-30/signal-pack/outputs/` (closing `READINESS.md` §5.9); (7) `compute_tau_hat_4th_down_coach_tax` consumes the point-in-time walk-forward `tau_hat.csv` (`+11.1585pp` walk-forward / `+6.7703pp` prior-only control, `n=3,988`) in live simulation state (closing `READINESS.md` §5.8 Solution 2); (8) `compute_b4_hierarchical_fg_make_prob` & `compute_eq_physics_001_ball_flight_modifier` model altitude/wind/spin ball-flight physics (`23,247` kicks); (9) `compute_b6_b9_ol_qb_pressure_sack_survival` separates OL pressure prior from QB sack survival + PFR throwaway escape; (10) `compute_adaptive_conformal_interval_aci` & `compute_nguyen_yurko_snap_timing_variance` attach distribution-free conformal intervals and multilevel snap-timing variance.
