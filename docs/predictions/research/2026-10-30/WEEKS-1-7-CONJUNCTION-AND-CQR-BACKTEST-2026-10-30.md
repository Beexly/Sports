# WAVE-2 DESIGN 2 (`n=2,462` CQR) & 2026 WEEKS 1–7 HELD-OUT CONJUNCTION REPLAY

**Generated:** `2026-10-30` | **Branch:** `engine/cv-bootstrap-2026-10-30`

---

## 1. Vintage 2026-10-30 Data Refresh Completion (`READINESS (1).md` §2)

- **Offensive Tendencies (`off_tendencies_v2026_10_30.csv`):** `160` team-season rows (`32` 2026 teams through Week 8; pinned 2026-10-02 seed CSV untouched per `REGEN-NOTE.md`).
- **Defensive Tendencies (`def_tendencies_v2026_10_30.csv`):** `160` team-season rows.
- **2026 Harness Game Slice (`games_harness_rows_2026_v2026_10_30.jsonl`):** `108` played 2026 games (Weeks 1–8) extracted from `play_by_play_2026.parquet`.

---

## 2. Wave-2 Design 2 First Experiment: Nominal-90% CQR Backtest on `2,462` Locked Games (`WAVE2-ANNEX.md` §3.2)

- **Locked Games Evaluated:** `2462` (`data/nflverse/games_harness_rows.jsonl`)
- **Romano CQR (`1905.03222`) Empirical Coverage:** **`90.45%`** (Target: `90.0%`)
- **Barber Weighted Conformal (`2202.13415`) Coverage (Quoted Separately per `R1`):** **`91.71%`**
- **Uncalibrated Baseline Coverage:** `66.29%` (**`+24.17pp`** gain from CQR)
- **Width Growth vs. Uncalibrated:** `+78.61%` (Kill threshold: `>25.0%` for `<2.0pp` gain)
- **Minimum Major Subgroup Coverage:** **`89.19%`** (Kill threshold: `<82.0%`)
- **Design 2 Verdict:** **`PASS — DEPLOYED`**

| Subgroup | Games (`n`) | Romano CQR Coverage | Barber Weighted (`R1` Separate) | Uncalibrated Baseline |
| :--- | :--- | :--- | :--- | :--- |
| `home_favorites` | `968` | **`92.36%`** | `93.29%` | `68.49%` |
| `road_favorites` | `1490` | **`89.19%`** | `90.67%` | `64.90%` |
| `divisional_games` | `904` | **`90.15%`** | `91.59%` | `64.60%` |
| `non_divisional_games` | `1558` | **`90.63%`** | `91.78%` | `67.27%` |
| `high_total_ge47` | `863` | **`90.38%`** | `91.66%` | `68.13%` |
| `low_total_le41` | `456` | **`91.67%`** | `93.64%` | `67.11%` |

---

## 3. 2026 Weeks 1–7 Out-of-Sample Walk-Forward Conjunction Gate Replay (`n=107` Games)

- **Total 2026 Weeks 1–7 Games Evaluated:** `107`
- **Sniper-Cleared Plays:** `50` (`57` abstained — `53.3%` pass discipline)
- **Out-of-Sample Record:** **`30-17-3` (`63.83%`)**
- **Net Units & ROI:** **`+10.27u` (`+20.55%` ROI)**

| Week | Matchup | Selection | Model Prob | De-Vig Edge | Overlay (pts) | Final Score | Outcome | Units |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| W2 | `CAR @ ATL` | **CAR -2.5** | `60.1%` | `+10.1%` | `-2.00` | `CAR 34 - ATL 3` | **WIN** | `+0.91u` |
| W2 | `CIN @ HOU` | **HOU -3.0** | `77.4%` | `+27.4%` | `+6.04` | `CIN 20 - HOU 6` | **LOSS** | `-1.00u` |
| W2 | `CLE @ TB` | **CLE +8.5** | `73.1%` | `+23.1%` | `-4.89` | `CLE 23 - TB 19` | **WIN** | `+0.91u` |
| W2 | `DET @ BUF` | **DET +5.5** | `68.1%` | `+18.1%` | `-3.72` | `DET 31 - BUF 41` | **LOSS** | `-1.00u` |
| W2 | `GB @ NYJ` | **GB -3.5** | `79.0%` | `+29.0%` | `-6.50` | `GB 20 - NYJ 17` | **LOSS** | `-1.00u` |
| W2 | `IND @ KC` | **IND +6.0** | `79.0%` | `+29.0%` | `-6.50` | `IND 30 - KC 33` | **WIN** | `+0.91u` |
| W2 | `JAX @ DEN` | **DEN -2.5** | `79.0%` | `+29.0%` | `+6.50` | `JAX 13 - DEN 20` | **WIN** | `+0.91u` |
| W2 | `LV @ LAC` | **LAC -6.5** | `79.0%` | `+29.0%` | `+6.50` | `LV 26 - LAC 14` | **LOSS** | `-1.00u` |
| W2 | `MIA @ SF` | **MIA +12.5** | `79.0%` | `+29.0%` | `-6.50` | `MIA 13 - SF 35` | **LOSS** | `-1.00u` |
| W2 | `NO @ BAL` | **NO +8.5** | `79.0%` | `+29.0%` | `-6.50` | `NO 24 - BAL 17` | **WIN** | `+0.91u` |
| W2 | `NYG @ LA` | **LA -6.5** | `76.6%` | `+26.6%` | `+5.82` | `NYG 6 - LA 28` | **WIN** | `+0.91u` |
| W2 | `PHI @ TEN` | **TEN +7.0** | `74.2%` | `+24.2%` | `+5.19` | `PHI 24 - TEN 20` | **WIN** | `+0.91u` |
| W2 | `PIT @ NE` | **NE -4.5** | `71.8%` | `+21.8%` | `+4.59` | `PIT 3 - NE 20` | **WIN** | `+0.91u` |
| W2 | `SEA @ ARI` | **SEA -3.5** | `59.5%` | `+9.4%` | `-1.87` | `SEA 31 - ARI 7` | **WIN** | `+0.91u` |
| W3 | `ARI @ SF` | **ARI +7.5** | `76.3%` | `+26.3%` | `-5.73` | `ARI 30 - SF 36` | **WIN** | `+0.91u` |
| W3 | `ATL @ GB` | **ATL +4.5** | `64.1%` | `+14.1%` | `-2.84` | `ATL 35 - GB 14` | **WIN** | `+0.91u` |
| W3 | `CAR @ CLE` | **CLE +2.5** | `73.5%` | `+23.5%` | `+4.99` | `CAR 18 - CLE 21` | **WIN** | `+0.91u` |
| W3 | `CIN @ PIT` | **PIT +3.5** | `70.5%` | `+20.5%` | `+4.28` | `CIN 27 - PIT 30` | **WIN** | `+0.91u` |
| W3 | `KC @ MIA` | **MIA +10.0** | `79.0%` | `+28.9%` | `+6.48` | `KC 24 - MIA 10` | **LOSS** | `-1.00u` |
| W3 | `LAC @ BUF` | **LAC +7.0** | `79.0%` | `+29.0%` | `-6.50` | `LAC 16 - BUF 24` | **LOSS** | `-1.00u` |
| W3 | `LA @ DEN` | **DEN -1.5** | `65.7%` | `+15.7%` | `+3.19` | `LA 26 - DEN 30` | **WIN** | `+0.91u` |
| W3 | `MIN @ TB` | **TB +1.5** | `70.3%` | `+20.3%` | `+4.22` | `MIN 23 - TB 16` | **LOSS** | `-1.00u` |
| W3 | `NYJ @ DET` | **DET -7.0** | `64.8%` | `+14.8%` | `+2.99` | `NYJ 24 - DET 31` | **PUSH** | `+0.00u` |
| W3 | `SEA @ WAS` | **WAS +8.5** | `78.3%` | `+28.3%` | `+6.29` | `SEA 31 - WAS 33` | **WIN** | `+0.91u` |
| W4 | `ATL @ NO` | **ATL +1.5** | `60.5%` | `+10.5%` | `-2.09` | `ATL 45 - NO 24` | **WIN** | `+0.91u` |
| W4 | `DAL @ HOU` | **HOU -3.0** | `61.8%` | `+11.8%` | `+2.36` | `DAL 34 - HOU 30` | **LOSS** | `-1.00u` |
| W4 | `DEN @ SF` | **DEN +3.0** | `79.0%` | `+29.0%` | `-6.50` | `DEN 14 - SF 24` | **LOSS** | `-1.00u` |
| W4 | `IND @ WAS` | **IND -4.5** | `62.8%` | `+12.8%` | `-2.57` | `IND 30 - WAS 13` | **WIN** | `+0.91u` |
| W4 | `JAX @ CIN` | **CIN -2.5** | `60.2%` | `+10.2%` | `+2.03` | `JAX 22 - CIN 17` | **LOSS** | `-1.00u` |
| W4 | `LAC @ SEA` | **LAC +7.0** | `73.5%` | `+23.4%` | `-4.99` | `LAC 23 - SEA 30` | **PUSH** | `+0.00u` |
| W4 | `MIA @ MIN` | **MIA +10.0** | `70.5%` | `+20.5%` | `-4.27` | `MIA 10 - MIN 15` | **WIN** | `+0.91u` |
| W4 | `NE @ BUF` | **NE +7.0** | `65.4%` | `+15.4%` | `-3.13` | `NE 29 - BUF 26` | **WIN** | `+0.91u` |
| W4 | `TEN @ BAL` | **TEN +11.5** | `65.2%` | `+15.2%` | `-3.09` | `TEN 18 - BAL 24` | **WIN** | `+0.91u` |
| W5 | `BAL @ ATL` | **ATL -3.5** | `64.0%` | `+14.0%` | `+2.83` | `BAL 30 - ATL 23` | **LOSS** | `-1.00u` |
| W5 | `CHI @ GB` | **GB +1.5** | `65.3%` | `+15.3%` | `+3.11` | `CHI 7 - GB 31` | **WIN** | `+0.91u` |
| W5 | `CIN @ MIA` | **MIA +7.0** | `64.7%` | `+14.7%` | `+2.97` | `CIN 31 - MIA 24` | **PUSH** | `+0.00u` |
| W5 | `LV @ NE` | **NE -3.5** | `62.7%` | `+12.7%` | `+2.54` | `LV 17 - NE 45` | **WIN** | `+0.91u` |
| W5 | `MIN @ NO` | **NO +2.5** | `63.8%` | `+13.8%` | `+2.78` | `MIN 23 - NO 13` | **LOSS** | `-1.00u` |
| W5 | `PHI @ JAX` | **PHI +7.5** | `73.8%` | `+23.8%` | `-5.08` | `PHI 17 - JAX 19` | **WIN** | `+0.91u` |
| W5 | `SF @ SEA` | **SEA -3.0** | `60.2%` | `+10.2%` | `+2.04` | `SF 32 - SEA 29` | **LOSS** | `-1.00u` |
| W6 | `ARI @ LA` | **ARI +12.5** | `68.5%` | `+18.6%` | `-3.82` | `ARI 18 - LA 16` | **WIN** | `+0.91u` |
| W6 | `CAR @ PHI` | **PHI +3.0** | `64.8%` | `+14.8%` | `+3.00` | `CAR 25 - PHI 14` | **LOSS** | `-1.00u` |
| W6 | `HOU @ JAX` | **HOU +2.5** | `66.8%` | `+16.8%` | `-3.42` | `HOU 34 - JAX 31` | **WIN** | `+0.91u` |
| W6 | `LAC @ KC` | **LAC +7.5** | `70.7%` | `+20.7%` | `-4.32` | `LAC 6 - KC 22` | **LOSS** | `-1.00u` |
| W6 | `WAS @ SF` | **WAS +7.5** | `67.8%` | `+17.8%` | `-3.64` | `WAS 17 - SF 23` | **WIN** | `+0.91u` |
| W7 | `CLE @ TEN` | **TEN +1.5** | `61.3%` | `+11.3%` | `+2.26` | `CLE 27 - TEN 24` | **LOSS** | `-1.00u` |
| W7 | `IND @ MIN` | **IND +6.5** | `65.8%` | `+15.8%` | `-3.21` | `IND 10 - MIN 16` | **WIN** | `+0.91u` |
| W7 | `KC @ SEA` | **SEA -3.0** | `62.5%` | `+12.5%` | `+2.51` | `KC 3 - SEA 20` | **WIN** | `+0.91u` |
| W7 | `MIA @ NYJ` | **MIA +3.5** | `62.4%` | `+12.4%` | `-2.48` | `MIA 28 - NYJ 25` | **WIN** | `+0.91u` |
| W7 | `SF @ ATL` | **ATL +2.5** | `69.0%` | `+19.0%` | `+3.92` | `SF 20 - ATL 29` | **WIN** | `+0.91u` |
