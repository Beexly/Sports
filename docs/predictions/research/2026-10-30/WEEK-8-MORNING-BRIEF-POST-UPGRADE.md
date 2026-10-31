# Week 8 360° Full-Board Master Call Sheet — Post-Grok 4.7 Sweep & TDD Calibration Upgrade

**Generated:** `2026-10-30` | **Engine:** `GSE v5.3.0 Pathwise 360° (10,000 worlds × 175 snaps = 22.75M snaps)` | **Seal Hash:** `a293ee26ed6f1350...`

**Transport & Conservation Certificates:** Max Pathwise Conservation Residual = `0.00e+00` (`<= 1e-6`) | Max Sinkhorn Dual Residual = `9.92e-12` (`<= 1e-6`) | Evaluated Candidates = `573` | Priced Gate Survivors (`PUBLISH`) = `295` | Unpriced Derivative Projections (`ABSTAIN`) = `120`

---

## 1. All 13 Sunday/Monday Matchups — Pathwise Medians vs Live DraftKings Lines

| Matchup | DK Spread (H) | Sim Spread (H) | DK Total | Sim Total | Sim 1Q Tot | Sim 1H Tot | Pace (s) | QB 2×2 Matrix Shift | Early-Down Edge |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| **BAL @ BUF** | `-3.0` | `-2.31` | `54.5` | `53.79` | `10.3` | `26.2` | `26.28s` | Jackson +0.020 / Allen +0.012 | BUF |
| **TEN @ CIN** | `-11.5` | `-14.23` | `46.5` | `50.29` | `9.5` | `24.5` | `26.87s` | Ward -0.004 / Burrow -0.008 | CIN |
| **ARI @ DAL** | `-7.0` | `-2.42` | `54.5` | `53.73` | `10.2` | `26.3` | `25.90s` | Brissett +0.007 / Prescott +0.015 | DAL |
| **MIN @ DET** | `-3.0` | `+0.11` | `46.5` | `39.54` | `7.4` | `19.1` | `26.67s` | Murray +0.003 / Goff +0.151 | DET |
| **LV @ NYJ** | `-1.5` | `-9.48` | `45.5` | `42.54` | `8.1` | `20.9` | `27.27s` | Cousins -0.009 / Smith -0.012 | NYJ |
| **CLE @ PIT** | `-3.5` | `-11.13` | `39.5` | `41.70` | `7.9` | `20.3` | `26.87s` | Watson -0.002 / Rodgers +0.035 | PIT |
| **ATL @ TB** | `-2.5` | `-3.03` | `44.5` | `39.31` | `7.3` | `19.0` | `26.28s` | Penix +0.013 / Mayfield +0.016 | ATL |
| **IND @ JAX** | `-10.0` | `-12.80` | `46.5` | `49.36` | `9.4` | `24.0` | `25.90s` | Jones -0.017 / Lawrence -0.001 | JAX |
| **LAC @ LA** | `-6.5` | `-14.38` | `45.5` | `40.48` | `7.4` | `19.3` | `28.12s` | Herbert -0.013 / Stafford -0.002 | LA |
| **KC @ DEN** | `+1.5` | `+8.77` | `40.5` | `48.84` | `9.4` | `23.8` | `27.27s` | Mahomes +0.025 / Nix +0.005 | KC |
| **NE @ MIA** | `+7.0` | `+8.85` | `43.5` | `46.51` | `9.0` | `22.8` | `27.27s` | Maye +0.006 / Willis -0.013 | NE |
| **PHI @ WAS** | `-6.0` | `-5.65` | `40.5` | `48.13` | `9.0` | `23.2` | `26.09s` | McKee +0.000 / Daniels +0.001 | WAS |
| **CHI @ SEA** | `-3.0` | `+4.71` | `46.5` | `40.62` | `7.5` | `19.5` | `25.71s` | Williams -0.026 / Darnold +0.012 | CHI |

---

## 2. Tier-1 Main Game Lines (`Spread`, `Total`, `Moneyline` — Live DraftKings Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `CHI@SEA` | **CHI ML (+142)** | `63.56` | `64.2%` | **`63.6%`** | `39.6%` | **`+23.9%`** | Pure internal win prob 64.2% (Stage D 63.6%) vs de-vigged market 39.6% |
| **2** | `KC@DEN` | **KC ML (-118)** | `73.82` | `73.5%` | **`73.8%`** | `51.7%` | **`+22.1%`** | Pure internal win prob 73.5% (Stage D 73.8%) vs de-vigged market 51.7% |
| **3** | `LV@NYJ` | **NYJ ML (-122)** | `72.28` | `72.3%` | **`72.3%`** | `52.6%` | **`+19.7%`** | Pure internal win prob 72.3% (Stage D 72.3%) vs de-vigged market 52.6% |
| **4** | `CLE@PIT` | **PIT ML (-192)** | `80.10` | `79.8%` | **`80.1%`** | `63.1%` | **`+17.0%`** | Pure internal win prob 79.8% (Stage D 80.1%) vs de-vigged market 63.1% |
| **5** | `LAC@LA` | **LA ML (-270)** | `83.87` | `83.5%` | **`83.9%`** | `70.0%` | **`+13.9%`** | Pure internal win prob 83.5% (Stage D 83.9%) vs de-vigged market 70.0% |
| **6** | `KC@DEN` | **KC -1.5** | `-8.77` | `71.7%` | **`62.3%`** | `48.9%` | **`+13.4%`** | Pure internal median KC -8.77 vs DK -1.5 (Mahomes +0.025 / Nix +0.005) |
| **7** | `CLE@PIT` | **PIT -3.5** | `-11.13` | `73.3%` | **`63.2%`** | `50.0%` | **`+13.2%`** | Pure internal median PIT -11.13 vs DK -3.5 (Watson -0.002 / Rodgers +0.035) |
| **8** | `LV@NYJ` | **NYJ -1.5** | `-9.48` | `70.6%` | **`61.3%`** | `50.0%` | **`+11.3%`** | Pure internal median NYJ -9.48 vs DK -1.5 (Cousins -0.009 / Smith -0.012) |
| **9** | `LAC@LA` | **LA -6.5** | `-14.38` | `69.2%` | **`61.2%`** | `51.7%` | **`+9.5%`** | Pure internal median LA -14.38 vs DK -6.5 (Herbert -0.013 / Stafford -0.002) |
| **10** | `ARI@DAL` | **ARI +7.0** | `2.42` | `63.1%` | **`57.1%`** | `51.1%` | **`+6.0%`** | Pure internal median ARI +2.42 vs DK +7.0 (Brissett +0.007 / Prescott +0.015) |

---

## 3. Priced Quarters, Halves & Team Totals (`1H/2Q/4Q/2H Winner` & `Team Totals` — Live Scores24 Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **LAC Team Total UNDER 18.5 (-114)** | `12.68` | `80.5%` | **`68.3%`** | `50.0%` | **`+18.3%`** | Scores24 LAC TT <18.5 in 8/9 — Two-way de-vigged book quote (-114/-114); internal win prob 80.5% (Stage D 68.3%) vs de-vig 50.0% |

---

## 4. Top Skill & QB Player Props (`Layer-1 GP Empirical-Bayes` + `Stage D <= 0.35`, Live DraftKings Odds)

| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | `BAL@BUF` | **Devontez Walker (BAL) Receiving Yards OVER 0.5** | `30.36` | `95.0%` | **`94.7%`** | `50.0%` | **`+44.7%`** | BAL WR (GP=5, 2026Avg=15.0, Realloc=1.00x, WOPR=0.22, Open=1.00x, Funnel=BALANCED_S): Pure internal mean 30.3 (median 30.4) vs DK 0.5 |
| **2** | `MIN@DET` | **Sione Vaki (DET) Rushing Yards OVER 4.5** | `27.35` | `92.0%` | **`91.9%`** | `50.0%` | **`+41.9%`** | DET RB (GP=6, 2026Avg=9.3, Realloc=1.05x, C285=-0.021): Pure internal mean 27.7 (median 27.4) vs DK 4.5 |
| **3** | `BAL@BUF` | **Ray Davis (BUF) Rushing Yards OVER 4.5** | `25.55` | `90.1%` | **`90.2%`** | `50.0%` | **`+40.2%`** | BUF RB (GP=5, 2026Avg=2.4, Realloc=1.00x, C285=+0.007): Pure internal mean 25.8 (median 25.6) vs DK 4.5 |
| **4** | `PHI@WAS` | **Dyami Brown (WAS) Receiving Yards OVER 12.5** | `32.25` | `85.5%` | **`85.3%`** | `50.0%` | **`+35.3%`** | WAS WR (GP=6, 2026Avg=15.7, Realloc=1.34x, WOPR=0.27, Open=1.00x, Funnel=WR_PERIMET): Pure internal mean 32.3 (median 32.2) vs DK 12.5 |
| **5** | `NE@MIA` | **Jaylen Wright (MIA) Rushing Attempts OVER 4.5** | `8.10` | `84.4%` | **`84.4%`** | `50.0%` | **`+34.4%`** | MIA RB (GP=5, 2026Avg=4.0, Realloc=1.38x): Pure internal mean 8.3 (median 8.1) vs DK 4.5 |
| **6** | `TEN@CIN` | **Dohnte Meyers (CIN) Receiving Yards OVER 13.5** | `35.53` | `85.8%` | **`84.2%`** | `50.0%` | **`+34.2%`** | CIN WR (GP=6, 2026Avg=23.5, Realloc=1.09x, WOPR=0.17, Open=0.97x, Funnel=BALANCED_S): Pure internal mean 35.6 (median 35.5) vs DK 13.5 |
| **7** | `TEN@CIN` | **Drew Sample (CIN) Receiving Yards OVER 7.5** | `26.58` | `85.6%` | **`84.1%`** | `50.0%` | **`+34.1%`** | CIN TE (GP=4, 2026Avg=12.0, Realloc=1.38x, WOPR=0.13, Open=1.00x, Funnel=BALANCED_S): Pure internal mean 26.6 (median 26.6) vs DK 7.5 |
| **8** | `MIN@DET` | **Isaac TeSlaa (DET) Receiving Yards OVER 17.5** | `37.65` | `82.3%` | **`83.3%`** | `50.0%` | **`+33.3%`** | DET WR (GP=6, 2026Avg=32.8, Realloc=1.10x, WOPR=0.24, Open=1.03x, Funnel=BALANCED_S): Pure internal mean 37.9 (median 37.6) vs DK 17.5 |
| **9** | `NE@MIA` | **Efton Chism III (NE) Receiving Yards OVER 15.5** | `35.89` | `83.7%` | **`82.5%`** | `50.0%` | **`+32.6%`** | NE WR (GP=6, 2026Avg=19.0, Realloc=1.38x, WOPR=0.21, Open=1.00x, Funnel=TE_MIDDLE_): Pure internal mean 36.0 (median 35.9) vs DK 15.5 |
| **10** | `KC@DEN` | **J.K. Dobbins (DEN) Rushing Yards OVER 21.5** | `40.83` | `82.2%` | **`82.3%`** | `50.0%` | **`+32.3%`** | DEN RB (GP=7, 2026Avg=28.7, Realloc=1.36x, C285=+0.005): Pure internal mean 41.4 (median 40.8) vs DK 21.5 |
| **11** | `LV@NYJ` | **Michael Mayer (LV) Receptions OVER 2.5** | `4.40` | `81.9%` | **`82.1%`** | `50.0%` | **`+32.1%`** | LV TE (GP=7, 2026Avg=4.4, Realloc=1.11x, WOPR=0.30, Open=1.05x, Funnel=BALANCED_S): Pure internal mean 4.5 (median 4.4) vs DK 2.5 |
| **12** | `PHI@WAS` | **Treylon Burks (WAS) Receiving Yards OVER 21.5** | `44.82` | `81.6%` | **`81.7%`** | `50.0%` | **`+31.7%`** | WAS WR (GP=5, 2026Avg=30.4, Realloc=1.34x, WOPR=0.36, Open=1.00x, Funnel=WR_PERIMET): Pure internal mean 44.9 (median 44.8) vs DK 21.5 |
| **13** | `CHI@SEA` | **Kalif Raymond (CHI) Receiving Yards OVER 21.5** | `39.24` | `78.4%` | **`78.1%`** | `50.0%` | **`+28.1%`** | CHI WR (GP=7, 2026Avg=34.9, Realloc=1.00x, WOPR=0.29, Open=1.07x, Funnel=RB_CHECKDO): Pure internal mean 39.5 (median 39.2) vs DK 21.5 |
| **14** | `ARI@DAL` | **Tyler Goodson (DAL) Rushing Yards OVER 21.5** | `35.13` | `77.7%` | **`77.8%`** | `50.0%` | **`+27.8%`** | DAL RB (GP=4, 2026Avg=18.0, Realloc=1.05x, C285=+0.008): Pure internal mean 35.6 (median 35.1) vs DK 21.5 |
| **15** | `ATL@TB` | **Jahan Dotson (ATL) Receiving Yards OVER 21.5** | `38.07` | `77.6%` | **`77.6%`** | `50.0%` | **`+27.6%`** | ATL WR (GP=7, 2026Avg=34.6, Realloc=1.09x, WOPR=0.48, Open=1.05x, Funnel=BALANCED_S): Pure internal mean 38.4 (median 38.1) vs DK 21.5 |
| **16** | `ATL@TB` | **Chris Godwin Jr. (TB) Receptions OVER 3.5** | `5.12` | `75.4%` | **`77.2%`** | `50.0%` | **`+27.2%`** | TB WR (GP=7, 2026Avg=3.9, Realloc=1.38x, WOPR=0.44, Open=1.07x, Funnel=BALANCED_S): Pure internal mean 5.1 (median 5.1) vs DK 3.5 |
| **17** | `ARI@DAL` | **Jake Ferguson (DAL) Receiving Yards OVER 14.5** | `27.41` | `76.2%` | **`76.8%`** | `50.0%` | **`+26.8%`** | DAL TE (GP=7, 2026Avg=16.4, Realloc=1.30x, WOPR=0.22, Open=0.99x, Funnel=BALANCED_S): Pure internal mean 27.3 (median 27.4) vs DK 14.5 |
| **18** | `CLE@PIT` | **Quinshon Judkins (CLE) Receptions OVER 1.5** | `3.05` | `76.9%` | **`76.5%`** | `50.0%` | **`+26.5%`** | CLE RB (GP=6, 2026Avg=3.2, Realloc=1.06x, WOPR=0.17, Open=1.04x, Funnel=RB_CHECKDO): Pure internal mean 3.1 (median 3.0) vs DK 1.5 |

---

## 5. Unpriced `1st Quarter Total` Projections & Book Trigger Odds (`ABSTAIN` — `@locktalkbets` 1Q Stop & `19.26%` 2026 Q1 Simplex)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `LAC@LA` | **LAC@LA 1Q Total UNDER 9.5** | `7.40` | **`70.4%`** | `-237` | **`-197`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 7.4 vs ref 9.5 |
| **2** | `MIN@DET` | **MIN@DET 1Q Total UNDER 9.5** | `7.36` | **`69.8%`** | `-231` | **`-192`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 7.4 vs ref 9.5 |
| **3** | `LAC@LA` | **LA 1H Winner (-200)** | `6.77` | **`69.0%`** | `-222` | **`-186`** | Scores24 LAC lost 1H in 8/9 — Single-side trend quote (-200, no opp_odds) logged as ABSTAIN/PASS per strict two-way de-vig gate |
| **4** | `CHI@SEA` | **CHI@SEA 1Q Total UNDER 9.5** | `7.55` | **`68.0%`** | `-213` | **`-178`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 7.5 vs ref 9.5 |
| **5** | `IND@JAX` | **JAX 1H Winner (-294)** | `5.80` | **`66.2%`** | `-196` | **`-164`** | Scores24 JAX 1H 5/5 home vs IND — Single-side trend quote (-294, no opp_odds) logged as ABSTAIN/PASS per strict two-way de-vig gate |
| **6** | `CLE@PIT` | **PIT 1H Winner (-149)** | `5.44` | **`66.0%`** | `-194` | **`-163`** | Scores24 PIT 1H 5/5 home vs CLE — Single-side trend quote (-149, no opp_odds) logged as ABSTAIN/PASS per strict two-way de-vig gate |
| **7** | `CLE@PIT` | **PIT 2H Winner (-127)** | `5.90` | **`65.9%`** | `-193` | **`-162`** | Scores24 PIT 2H 9/9 home vs CLE — Single-side trend quote (-127, no opp_odds) logged as ABSTAIN/PASS per strict two-way de-vig gate |
| **8** | `IND@JAX` | **JAX 2Q Winner (-149)** | `3.58` | **`64.8%`** | `-184` | **`-155`** | Scores24 JAX 2Q 10/10 home vs IND — Single-side trend quote (-149, no opp_odds) logged as ABSTAIN/PASS per strict two-way de-vig gate |
| **9** | `LV@NYJ` | **LV@NYJ 1Q Total UNDER 9.5** | `8.07` | **`63.2%`** | `-172` | **`-145`** | @locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median 8.1 vs ref 9.5 |
| **10** | `ARI@DAL` | **DAL Team Total UNDER 33.5 (-169)** | `28.13` | **`63.1%`** | `-171` | **`-144`** | Scores24 DAL TT <33.5 in 14/15 vs ARI — Single-side trend quote (-169, no opp_odds) logged as ABSTAIN/PASS per strict two-way de-vig gate |

---

## 6. Kicking Suite Projections & Book Trigger Odds (`ABSTAIN` — `Field Goals Made O/U 1.5` Pathwise Stall Kernel)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `MIN@DET` | **Will Reichard (MIN) Field Goals Made OVER 1.5** | `2.35` | **`68.1%`** | `-213` | **`-178`** | Blended FGM lambda=2.35 (2026 Avg=3.00, Sim4thFG=1.74, RZ TD%=19.5%) |
| **2** | `ATL@TB` | **Chase McLaughlin (TB) Field Goals Made OVER 1.5** | `2.33` | **`67.7%`** | `-209` | **`-175`** | Blended FGM lambda=2.33 (2026 Avg=2.29, Sim4thFG=1.82, RZ TD%=15.8%) |
| **3** | `CLE@PIT` | **Chris Boswell (PIT) Field Goals Made OVER 1.5** | `2.31` | **`67.2%`** | `-205` | **`-171`** | Blended FGM lambda=2.31 (2026 Avg=2.29, Sim4thFG=1.78, RZ TD%=14.8%) |
| **4** | `IND@JAX` | **Spencer Shrader (IND) Field Goals Made OVER 1.5** | `2.30` | **`66.9%`** | `-202` | **`-170`** | Blended FGM lambda=2.30 (2026 Avg=2.71, Sim4thFG=1.33, RZ TD%=18.5%) |
| **5** | `LV@NYJ` | **Matt Gay (LV) Field Goals Made OVER 1.5** | `2.22` | **`65.0%`** | `-186` | **`-157`** | Blended FGM lambda=2.22 (2026 Avg=2.43, Sim4thFG=1.45, RZ TD%=15.9%) |
| **6** | `ARI@DAL` | **Chad Ryland (ARI) Field Goals Made OVER 1.5** | `2.17` | **`63.8%`** | `-176` | **`-149`** | Blended FGM lambda=2.17 (2026 Avg=2.43, Sim4thFG=1.35, RZ TD%=12.6%) |

---

## 7. Defense / IDP Suite Projections & Book Trigger Odds (`ABSTAIN` — `C-300 @rynoonan` Tackle Funnel & Edge Sacks)

> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.

| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |
|---:|---|---|---:|---:|---:|---:|---|
| **1** | `KC@DEN` | **Alex Singleton (DEN LB) Total Tackles+Ast UNDER 12.5** | `9.79` | **`81.1%`** | `-429` | **`-336`** | C-300 @rynoonan tackle funnel: 52.9 opp plays -> E[Tackles]=9.79 vs ref 12.5 |
| **2** | `LAC@LA` | **Nate Landman (LA LB) Total Tackles+Ast UNDER 8.5** | `6.36` | **`80.8%`** | `-421` | **`-331`** | C-300 @rynoonan tackle funnel: 40.2 opp plays -> E[Tackles]=6.36 vs ref 8.5 |
| **3** | `TEN@CIN` | **Demetrius Knight Jr. (CIN LB) Total Tackles+Ast UNDER 8.5** | `6.82` | **`75.2%`** | `-303` | **`-247`** | C-300 @rynoonan tackle funnel: 44.0 opp plays -> E[Tackles]=6.82 vs ref 8.5 |
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
| **3** | `KC@DEN` | **Kenneth Walker III (KC) Anytime TD** | `0.90` | **`80.2%`** | `-406` | **`-321`** | Low QB vulture (9.6%) -> RB1 goal-line share=90.4%, P(1+ TD)=80.2% |
| **4** | `LAC@LA` | **Kyren Williams (LA) Anytime TD** | `0.90` | **`76.6%`** | `-328` | **`-265`** | Low QB vulture (9.6%) -> RB1 goal-line share=90.4%, P(1+ TD)=76.6% |
| **5** | `PHI@WAS` | **Rachaad White (WAS) Anytime TD** | `0.86` | **`71.9%`** | `-256` | **`-212`** | Low QB vulture (14.4%) -> RB1 goal-line share=85.6%, P(1+ TD)=71.9% |
| **6** | `LV@NYJ` | **Braelon Allen (NYJ) Anytime TD** | `0.89` | **`69.4%`** | `-227` | **`-189`** | Low QB vulture (11.2%) -> RB1 goal-line share=88.8%, P(1+ TD)=69.4% |

---

## 9. Scores24.live Empirical Quarter/Half/Total/Handicap Trend Concordance Matrix

Cross-verified dynamically against live simulation outputs and `data/engine/scores24_nfl_week8_2026_10_30.json` (`115` priced empirical trends & `6` match predictions from `https://scores24.live/en/american-football/l-usa-nfl`):

| Matchup | Scores24 Empirical Trend / Streak (`n >= 5`) | Scores24 Price / Pick | GSE 360° Pathwise Simulation Concordance |
|---|---|---|---|
| `BAL@BUF` | Bills won 8 of last 9 games; Bills +3.5 in 21 straight home games; Ravens won 4Q in 8 of last 9 away games | `BUF -3.5 (Editor Pick) / BAL 4Q +132` | Sim Median `BUF -2.31`, Total `53.79` (`1Q 10.3`, `1H 26.2`) |
| `TEN@CIN` | Bengals averaging 27.2 PPG vs Titans 15.4 PPG (1-6 record); Bengals 35-13 rout of BAL | `CIN -9.5 (Editor Pick)` | Sim Median `CIN -14.23`, Total `50.29` (`1Q 9.5`, `1H 24.5`) |
| `ARI@DAL` | Over 44.5 in 13 of last 15 DAL games; ARI allowing 29.7 PPG; ARI Over 23.5 TT in 5 straight at DAL | `OVER 51.5 (Editor Pick)` | Sim Median `DAL -2.42`, Total `53.73` (`1Q 10.2`, `1H 26.3`) |
| `MIN@DET` | Lions Over 24.5 TT in 6 of last 7 vs MIN; Over 49.5 in 6 of last 7 MIN@DET; MIN won 4Q in 6 straight | `DET TT Over 24.5 (-120) / Over 49.5 (+127)` | Sim Median `DET +0.11`, Total `39.54` (`1Q 7.4`, `1H 19.1`) |
| `LV@NYJ` | Under 53.5 in 10 straight NYJ home games; NYJ TT Under 23.5 in 13 of last 15; Raiders 4-game skid | `NYJ ML (Editor Pick)` | Sim Median `NYJ -9.48`, Total `42.54` (`1Q 8.1`, `1H 20.9`) |
| `CLE@PIT` | Steelers 19-1 in last 20 home games vs CLE (-2.5 in 19/20); PIT won 1H in 5 straight & 2Q in 8/9 vs CLE | `PIT ML (-192) / PIT 1H (-149) / PIT TT > 20.5` | Sim Median `PIT -11.13`, Total `41.70` (`1Q 7.9`, `1H 20.3`) |
| `ATL@TB` | Buccaneers +6.5 in 19 of last 21 home games; Over 42.5 in 5 straight TB vs ATL; ATL won 2Q in 6/7 away | `Over 42.5 (-141)` | Sim Median `TB -3.03`, Total `39.31` (`1Q 7.3`, `1H 19.0`) |
| `IND@JAX` | Jaguars won 2Q in 10 straight home games vs IND; won 1H in 5 straight; won -2.5 in 11 straight home vs IND | `JAX -7.5 (Editor Pick) / JAX 1H (-294)` | Sim Median `JAX -12.80`, Total `49.36` (`1Q 9.4`, `1H 24.0`) |
| `LAC@LA` | Chargers lost 9 straight NFL games, lost 1H in 8/9, lost 2Q & 4Q in 7/8; Rams Over 26.5 TT in 6/7 home | `LA ML (-294) / LA 1H (-200)` | Sim Median `LA -14.38`, Total `40.48` (`1Q 7.4`, `1H 19.3`) |
| `KC@DEN` | Under 46.5 in 10 of last 11 DEN games; DEN 17-2 in last 19 home games | `DEN +3.5 (-179) / Under 46.5 (-227)` | Sim Median `DEN +8.77`, Total `48.84` (`1Q 9.4`, `1H 23.8`) |
| `NE@MIA` | Dolphins lost 9 of last 10 games, lost 1H in 9/10 (NE 1H -189), lost 2Q in 8/9 (NE 2Q -118) | `NE ML (-323) / NE 1H (-189)` | Sim Median `MIA +8.85`, Total `46.51` (`1Q 9.0`, `1H 22.8`) |
| `PHI@WAS` | Commanders -6.0 home favorite; Eagles 2-5 skid vs Daniels high-tempo offense | `WAS -6.0` | Sim Median `WAS -5.65`, Total `48.13` (`1Q 9.0`, `1H 23.2`) |
| `CHI@SEA` | Bears 5-2 vs Seahawks 4-3; fast neutral pace (25.53s) | `SEA -3.0 / Total 46.5` | Sim Median `SEA +4.71`, Total `40.62` (`1Q 7.5`, `1H 19.5`) |

---

## 10. Official New Engine Verified Record & Calibration Receipts

- **Official New Engine Verified Record (`AGENTS.md` Standing Doctrine):** **`16-5` (`76.2%`) · `+10.45 Units`** entering Oct 29, 2026 (`data/engine/new_engine_official_ledger_2026.json` and `docs/predictions/research/2026-10-29/NEW-ENGINE-OFFICIAL-LEDGER-16-5.md`).
- **Weeks 1–7 Held-Out Replay (`106` games, `step5_replay.py`):** Pathwise conservation residual `0.00e+00`, Sinkhorn dual residual `9.92e-12`, ML Gate (`edge >= 0.02, model_p >= 0.58`) **60.00% (`21-14`, `+1.26%` mean CLV)**; High-Confidence Gate (`model_p >= 0.64`) **66.67% (`12-6`)**.
- **Adversarial TDD Fixes & Oct 30 Readiness Kernels Verified (`18/18 PASSED` in `tests/test_consolidated_sweep_kernels.py`):** (1) `@locktalkbets` pocket-passer goal-line vulture ceiling removed; (2) `TEAM_TO_QB_2026` synced to all 32 verified Week 8 starters; (3) `home_qtr_cal` / `away_qtr_cal` anchored to the 2026 empirical regulation scoring simplex (`[0.1926, 0.2960, 0.2103, 0.3011]`) with post-calibration `first_half_margin_shift` and 4-quarter zero-sum HFA conservation; (4) `build_player_profiles` resolves mid-season trades by `player_id` and latest Week 8 injury status (`Lamar Jackson`, `Emeka Egbuka`, `Tyler Warren` active; `Saquon Barkley` `PHI` RB1) with strict `DE/OLB/DL/EDGE` and `LB/ILB/MLB` filters; (5) `project_player_prop_prob` enforces Layer-1 GP empirical-Bayes shrinkage and Stage D `|Δ log-odds| <= 0.35` before comparing against `market_p` last; (6) `consume_oct30_signal_pack` actively consumes all 7 verified tables in `docs/research/2026-10-30/signal-pack/outputs/` (closing `READINESS.md` §5.9); (7) `compute_tau_hat_4th_down_coach_tax` consumes the point-in-time walk-forward `tau_hat.csv` (`+11.1585pp` walk-forward / `+6.7703pp` prior-only control, `n=3,988`) in live simulation state (closing `READINESS.md` §5.8 Solution 2); (8) `compute_b4_hierarchical_fg_make_prob` & `compute_eq_physics_001_ball_flight_modifier` model altitude/wind/spin ball-flight physics (`23,247` kicks); (9) `compute_b6_b9_ol_qb_pressure_sack_survival` separates OL pressure prior from QB sack survival + PFR throwaway escape; (10) `compute_adaptive_conformal_interval_aci` & `compute_nguyen_yurko_snap_timing_variance` attach distribution-free conformal intervals and multilevel snap-timing variance.
