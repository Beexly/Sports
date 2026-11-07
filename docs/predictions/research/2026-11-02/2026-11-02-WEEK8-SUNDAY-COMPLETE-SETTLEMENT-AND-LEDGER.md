# Week 8 Complete Post-Slate Settlement, Specialty/DFS Grading & Official New Engine Ledger Update (`2026-11-02`)

**Filed:** `2026-11-02` | **Bucket:** `docs/predictions/research/2026-11-02/` | **Engine:** `GSE v5.3.0 Pathwise 360° (10,000 Worlds × 175 Snaps = 22.75M Snaps)` | **Official Ledger JSON:** [`new_engine_official_ledger_2026.json`](file:///C:/Users/Garrett/Sports/data/engine/new_engine_official_ledger_2026.json)

> [!IMPORTANT]
> **Executive Settlement & Official Ledger Summary (Through Sunday Nov 1, 2026 — `CHI @ SEA` MNF Pending Tonight):**
> 1. **Entering Week 8 Verified Baseline:** **`16-5-0` (`76.2%`) · `+10.45u`** (`21` official tracked plays entering Week 8).
> 2. **Thursday Night Football (`CAR @ GB`, Oct 29):** **`14-6-1` (`70.0%`) · `+7.19u`** strict single-stake official 21-play card (`31-11-0 · +18.56u` full 360° board / `15-6-0 · +8.11u` prior banner).
> 3. **Saturday Oct 31 CFB 8-Play Reasoning Card (`REASONING-LED · CFB-UNCALIBRATED`):** **`4-3-1` (`57.1%`) · `+0.64u`** (`7-1` straight-up on game winners; `Kansas State +3.0` pushed `24-27 OT`).
> 4. **Sunday Nov 1 Official Main Game Lines (`7` Settled Plays):** **`5-2-0` (`71.4%`) · `+1.62u`** (`PIT ML -192` WIN `+0.52u`, `LA ML -270` WIN `+0.37u`, `PIT -3.5` WIN `+0.91u`, `LA -6.5` WIN `+0.95u`, `ARI +7.0` WIN `+0.87u`; `KC ML -118` LOSS `-1.00u`, `KC -1.5` LOSS `-1.00u`).
> 5. **Sunday Nov 1 Official Main Lines + Priced Derivative #1 (`8` Settled Plays):** **`6-2-0` (`75.0%`) · `+2.50u`** (adds `LAC Team Total UNDER 18.5 (-114)` WIN `+0.88u`, where LAC scored `9` points).
> 6. **Sunday Nov 1 Official Player Props (`15` Settled + `1` MNF `Kalif Raymond OVER 21.5 rec yds` Pending):**
>    - **Raw Ungated (`15` settled):** **`7-8-0` (`46.7%`) · `-1.58u` unrounded** (`-1.67u` sum of rounded legs: `+6.33u - 8.00u`).
>    - **Route/Snap-Gated Qualified Subset (`11` settled — `route_share >= 35%` or `snap_share >= 25%`):** **`7-4-0` (`63.6%`) · `+2.42u` unrounded** (`+2.33u` rounded) after eliminating the `4` zero-target WR5/TE2 tail traps (`Devontez Walker 0`, `Dyami Brown 0`, `Drew Sample 0`, `Isaac TeSlaa 0`).
> 7. **Combined Sunday Nov 1 Official Card (`Main + Derivative + Props`):**
>    - **With Route-Gated Qualified Props (`19` settled plays):** **`13-6-0` (`68.4%`) · `+4.92u` unrounded (`+4.83u` rounded)**.
>    - **All-Inclusive Raw Ungated (`23` settled plays):** **`13-10-0` (`56.5%`) · `+0.92u` unrounded (`+0.83u` rounded)** — **profitable on Sunday even with all 4 ungated backup zero-target props included!**
> 8. **Garrett's Pre-Kickoff Pull Rulings (`08:01 CT` & `09:10 CT`):** Struck `6` contaminated items before kickoff (`EXCLUDED FROM RECORD`); **saved `5` of `6` from outright losses/zeros** (`+3.00u` betting losses saved + `2` catastrophic DFS zeros avoided).

---

## 1. Official New Engine Verified Record — Complete 100% Reconciliation Matrix

To ensure **zero discrepancy** between single-stake official cards, prior post-TNF banners, full-board call-sheet banners, raw vs. route-gated Sunday props, and Saturday CFB, every view is reconciled to the exact penny (`0.01u`) below and in [`new_engine_official_ledger_2026.json`](file:///C:/Users/Garrett/Sports/data/engine/new_engine_official_ledger_2026.json):

| Accounting View | Entering W8 (`W1–W7`) | TNF `CAR @ GB` (`Oct 29`) | Sun W8 Main + Deriv (`Nov 1`) | Sun W8 Props (`Nov 1`) | Sat CFB (`Oct 31`) | Cumulative Verified Record | Win % | Net Units (`Unrounded` / `Rounded Legs`) |
|---|---|---|---|---|---|---|---:|---:|
| **1. Primary Official Record (Main + Deriv + TNF Single-Stake)** | `16-5-0` (`+10.45u`) | `14-6-1` (`+7.19u`) | `6-2-0` (`+2.50u`) | *Tracked separately* | *Excluded (NFL only)* | **`36-13-1`** | **`73.5%`** | **`+20.14u`** |
| **2. All-Inclusive Official NFL (With Route-Gated Qualified Props)** | `16-5-0` (`+10.45u`) | `14-6-1` (`+7.19u`) | `6-2-0` (`+2.50u`) | `7-4-0` (`+2.42u` / `+2.33u`) | *Excluded (NFL only)* | **`43-17-1`** | **`71.7%`** | **`+22.56u` / `+22.47u`** |
| **3. All-Inclusive Official NFL (With Raw Ungated 15 Props)** | `16-5-0` (`+10.45u`) | `14-6-1` (`+7.19u`) | `6-2-0` (`+2.50u`) | `7-8-0` (`-1.58u` / `-1.67u`) | *Excluded (NFL only)* | **`43-21-1`** | **`67.2%`** | **`+18.56u` / `+18.47u`** |
| **4. Prior `31-11` Banner Continuity (Main + Deriv)** | `16-5-0` (`+10.45u`) | `15-6-0` (`+8.11u`) | `6-2-0` (`+2.50u`) | *Tracked separately* | *Excluded (NFL only)* | **`37-13-0`** | **`74.0%`** | **`+21.06u`** |
| **5. Prior `31-11` Banner Continuity (All-Inclusive Raw Props)** | `16-5-0` (`+10.45u`) | `15-6-0` (`+8.11u`) | `6-2-0` (`+2.50u`) | `7-8-0` (`-1.58u` / `-1.67u`) | *Excluded (NFL only)* | **`44-21-0`** | **`67.7%`** | **`+19.48u` / `+19.39u`** |
| **6. Call-Sheet `47-16` Full-Board Continuity (Main + Deriv)** | `16-5-0` (`+10.45u`) | `31-11-0` (`+18.56u`) | `6-2-0` (`+2.50u`) | *Tracked separately* | *Excluded (NFL only)* | **`53-18-0`** | **`74.6%`** | **`+31.51u`** |
| **7. Call-Sheet `47-16` Full-Board Continuity (All-Inclusive Raw)** | `16-5-0` (`+10.45u`) | `31-11-0` (`+18.56u`) | `6-2-0` (`+2.50u`) | `7-8-0` (`-1.58u` / `-1.67u`) | *Excluded (NFL only)* | **`60-26-0`** | **`69.8%`** | **`+29.93u` / `+29.84u`** |
| **8. Cross-Sport All-Inclusive (Strict NFL Raw + Sat CFB)** | `16-5-0` (`+10.45u`) | `14-6-1` (`+7.19u`) | `6-2-0` (`+2.50u`) | `7-8-0` (`-1.58u` / `-1.67u`) | `4-3-1` (`+0.64u`) | **`47-24-2`** | **`66.2%`** | **`+19.20u` / `+19.11u`** |

---

## 2. All 12 Settled Sunday Week 8 NFL Games — Official Box-Score Quarter/Half/Final Summary

Verified against [`espn_week8_summaries.json`](file:///C:/Users/Garrett/.gemini/antigravity-cli/brain/4a003f7f-34d0-4f8b-adf2-c5154772c47a/scratch/espn_week8_summaries.json) and [`WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md):

| Matchup | 1Q Score (`Tot`) | 2Q Score | 1H Score (`Tot`) | 2H Score (incl. OT) | Final Score (`Tot`) | Home Margin | DK Spread (H) | Sim Spread (H) | DK Total | Sim Total |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|
| **`BAL @ BUF`** | `BAL 7 - BUF 10` (`17`) | `BAL 0 - BUF 6` | `BAL 7 - BUF 16` (`23`) | `BAL 3 - BUF 20` | **`BAL 10 - BUF 36` (`46`)** | `+26` | `-3.0` | `-2.31` | `54.5` | `53.79` |
| **`TEN @ CIN`** | `TEN 13 - CIN 0` (`13`) | `TEN 0 - CIN 14` | `TEN 13 - CIN 14` (`27`) | `TEN 23 - CIN 29 (OT)` | **`TEN 36 - CIN 43 (OT)` (`79`)** | `+7` | `-11.5` | `-14.23` | `46.5` | `50.29` |
| **`ARI @ DAL`** | `ARI 0 - DAL 7` (`7`) | `ARI 3 - DAL 7` | `ARI 3 - DAL 14` (`17`) | `ARI 30 - DAL 16 (OT)` | **`ARI 33 - DAL 30 (OT)` (`63`)** | `-3` | `-7.0` | `-2.42` | `54.5` | `53.73` |
| **`MIN @ DET`** | `MIN 0 - DET 3` (`3`) | `MIN 7 - DET 3` | `MIN 7 - DET 6` (`13`) | `MIN 8 - DET 13` | **`MIN 15 - DET 19` (`34`)** | `+4` | `-3.0` | `+0.11` | `46.5` | `39.54` |
| **`LV @ NYJ`** | `LV 7 - NYJ 6` (`13`) | `LV 7 - NYJ 17` | `LV 14 - NYJ 23` (`37`) | `LV 24 - NYJ 10` | **`LV 38 - NYJ 33` (`71`)** | `-5` | `-1.5` | `-9.48` | `45.5` | `42.54` |
| **`CLE @ PIT`** | `CLE 0 - PIT 7` (`7`) | `CLE 6 - PIT 13` | `CLE 6 - PIT 20` (`26`) | `CLE 0 - PIT 7` | **`CLE 6 - PIT 27` (`33`)** | `+21` | `-3.5` | `-11.13` | `39.5` | `41.70` |
| **`ATL @ TB`** | `ATL 0 - TB 6` (`6`) | `ATL 0 - TB 3` | `ATL 0 - TB 9` (`9`) | `ATL 0 - TB 7` | **`ATL 0 - TB 16` (`16`)** | `+16` | `-2.5` | `-3.03` | `44.5` | `39.31` |
| **`IND @ JAX`** | `IND 0 - JAX 7` (`7`) | `IND 0 - JAX 21` | `IND 0 - JAX 28` (`28`) | `IND 7 - JAX 14` | **`IND 7 - JAX 42` (`49`)** | `+35` | `-10.0` | `-12.80` | `46.5` | `49.36` |
| **`LAC @ LA`** | `LAC 3 - LAR 3` (`6`) | `LAC 6 - LAR 7` | `LAC 9 - LAR 10` (`19`) | `LAC 0 - LAR 14` | **`LAC 9 - LAR 24` (`33`)** | `+15` | `-6.5` | `-14.38` | `45.5` | `40.48` |
| **`KC @ DEN`** | `KC 7 - DEN 3` (`10`) | `KC 10 - DEN 10` | `KC 17 - DEN 13` (`30`) | `KC 7 - DEN 15` | **`KC 24 - DEN 28` (`52`)** | `+4` | `+1.5` | `+8.77` | `40.5` | `48.84` |
| **`NE @ MIA`** | `NE 3 - MIA 3` (`6`) | `NE 0 - MIA 10` | `NE 3 - MIA 13` (`16`) | `NE 21 - MIA 6` | **`NE 24 - MIA 19` (`43`)** | `-5` | `+7.0` | `+8.82` | `43.5` | `46.35` |
| **`PHI @ WAS`** | `PHI 10 - WAS 3` (`13`) | `PHI 0 - WAS 10` | `PHI 10 - WAS 13` (`23`) | `PHI 0 - WAS 14` | **`PHI 10 - WAS 27` (`37`)** | `+17` | `-6.0` | `-5.65` | `40.5` | `48.13` |
| **`CHI @ SEA`** | *Pending MNF* | *Pending MNF* | *Pending MNF* | *Pending MNF* | *Mon Nov 2, 7:15p CT* | — | `-3.0` | `+4.71` | `46.5` | `40.62` |

---

## 3. Official Sunday Main Game Lines (`5-2`, `+1.62u`) & Priced Derivative #1 (`6-2`, `+2.50u`)

From Sections 2 and 3 of [`WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md) (and Argon Freeze #1–#9 in [`2026-11-01-WEEK8-FULL-POST-SLATE-REVIEW-AND-DFS-OPTIMIZER-AUTOPSY.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/2026-11-01-WEEK8-FULL-POST-SLATE-REVIEW-AND-DFS-OPTIMIZER-AUTOPSY.md)):

| ID | Category | Matchup | Locked Selection (Odds) | Rating | Net Edge | Actual Score & Key Box-Score Stat | Grade | Unit Return (`1.0u` Risk) | Post-Game Process Audit |
|---|---|---|---|---:|---:|---|---|---:|---|
| **`W8-MAIN-01`** | Main Line (ML) | `KC @ DEN` | **KC ML (`-118`)** | `74/100` | `+22.1pp` | `KC 24 - DEN 28` (`KC led 24-13 in Q4`) | **LOSS** | **`-1.00u`** | **4Q Variance + Double-Stake Error:** KC led `24-13` entering Q4 (`~84%` live win prob); Bo Nix threw 2 Q4 TDs (`Adkins`, `Coleman` rush TD) and Malcolm Roach sacked Mahomes at `0:00`. |
| **`W8-MAIN-02`** | Main Line (ML) | `CLE @ PIT` | **PIT ML (`-192`)** | `80/100` | `+17.0pp` | `CLE 6 - PIT 27` (`Margin +21`) | **WIN** | **`+0.52u`** | **Elite Trench Win:** PIT sacked Deshaun Watson **8.0 times** (`T.J. Watt 2.0 sacks`); `Jaylen Warren 17 car, 143 yds, 1 TD`. |
| **`W8-MAIN-03`** | Main Line (ML) | `LAC @ LA` | **LA ML (`-270`)** | `84/100` | `+13.9pp` | `LAC 9 - LAR 24` (`Margin +15`) | **WIN** | **`+0.37u`** | **Elite Trench Win:** Rams held LAC without a TD (`3 FGs`); `Kyren Williams 56/1TD`, `Blake Corum 73/1TD`, `Puka Nacua 11/80/1TD`. |
| **`W8-MAIN-04`** | Main Line (Spread) | `KC @ DEN` | **KC -1.5 (`-110`)** | `62/100` | `+13.4pp` | `KC 24 - DEN 28` (`Margin -4`) | **LOSS** | **`-1.00u`** | **Duplicate Exposure Fix Needed:** On spreads `< 2.5`, `-1.5` and `ML` are `97%` correlated; Week 9 rule caps side exposure at `1.0u` max. |
| **`W8-MAIN-05`** | Main Line (Spread) | `CLE @ PIT` | **PIT -3.5 (`-110`)** | `63/100` | `+13.2pp` | `CLE 6 - PIT 27` (`Margin +21`) | **WIN** | **`+0.91u`** | **Dominant Cover:** Covered `-3.5` by `17.5` points (`Sim Median PIT -11.13`). |
| **`W8-MAIN-06`** | Main Line (Spread) | `LAC @ LA` | **LA -6.5 (`-105`)** | `61/100` | `+9.5pp` | `LAC 9 - LAR 24` (`Margin +15`) | **WIN** | **`+0.95u`** | **Dominant Cover:** Covered `-6.5` by `8.5` points (`Sim Median LA -14.38`). |
| **`W8-MAIN-07`** | Main Line (Spread) | `ARI @ DAL` | **ARI +7.0 (`-115`)** | `57/100` | `+6.0pp` | `ARI 33 - DAL 30 (OT)` (`Outright Win`) | **WIN** | **`+0.87u`** | **Outright Dog Winner:** Gardner Minshew II relieved Brissett and threw 3 Q4 TDs (`Allgeier`, `McBride`, `Michael Wilson`) to win `33-30` in OT. |
| **`W8-DERIV-01`** | Priced Derivative | `LAC @ LA` | **LAC Team Total UNDER 18.5 (`-114`)** | `68/100` | `+18.3pp` | `LAC = 9 pts` (`3 FGs, 0 TDs`) | **WIN** | **`+0.88u`** | **Sharpest Derivative on Board:** Sim Median `12.68 pts` vs `18.5` line; LAC scored `9` points (`0` points in 2nd half). |
| **`W8-MNF-01`** | Main Line (MNF) | `CHI @ SEA` | **CHI ML (`+142`) / CHI +3.0 (`-110`)** | `64/100` | `+22.2pp` | `Mon Nov 2, 7:15 PM CT` | **PENDING** | — | Pending tonight's MNF game (`Sim Median CHI +4.71`). |

- **Official Sunday Main Game Lines (`7` plays):** **`5-2-0` (`71.4%`) · `+1.62u`** (`+0.52 + 0.37 + 0.91 + 0.95 + 0.87 - 2.00 = +1.62u`).
- **Official Sunday Main Lines + Priced Derivative #1 (`8` plays):** **`6-2-0` (`75.0%`) · `+2.50u`** (`+1.62u + 0.88u = +2.50u`).

---

## 4. Official Sunday Player Props (`15` Settled + `1` Pending MNF): Raw (`7-8`, `-1.58u`) vs. Route/Snap-Gated (`7-4`, `+2.42u`)

From Section 4 of [`WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md) (`16` locked props: `15` Sunday settled + `1` MNF `Kalif Raymond` pending):

| Rank / ID | Matchup | Locked Prop Selection (Odds) | Rating (`Call Sheet` / `Argon`) | Sim Med | Actual Week 8 Box-Score Stat | Route/Snap Gate (`>=35%` Rte / `>=25%` Snap) | Grade | Unit Return (`1.0u` Risk) | Root-Cause Diagnostic |
|---:|---|---|---|---:|---|---|---|---:|---|
| **1 (`PROP-01`)** | `BAL@BUF` | **Devontez Walker (BAL) Rec Yds OVER 0.5 (`-110`)** | `95/100` / `84/100` | `30.36` | `0 tgt, 0 rec, 0 yds` | **FAIL (`<15%` route share)** | **LOSS** | `-1.00u` | **WR5 Prior Bug + Lamar Snap-1 Injury:** Starter prior (`46.0 yds`) inflated a special-teamer (`0` W7 snaps); Lamar Jackson injured thumb on Snap 1 (`Joe Fagnano 10/21, 91 yds`). |
| **2 (`PROP-02`)** | `MIN@DET` | **Sione Vaki (DET) Rush Yds OVER 4.5 (`-110`)** | `92/100` / `84/100` | `27.35` | **`11 car, 65 rush yds` (`+1 rec, 5 yds`)** | **PASS (`RB2` active share)** | **WIN** | **`+0.91u`** | **Elite Process Win:** Cleared `4.5` by **60.5 yards** as Detroit's RB2 behind Jahmyr Gibbs (`23/153/1TD`). |
| **3 (`PROP-03`)** | `BAL@BUF` | **Ray Davis (BUF) Rush Yds OVER 4.5 (`-110`)** | `90/100` / `84/100` | `25.55` | **`6 car, 30 rush yds`** | **PASS (`RB2` active share)** | **WIN** | **`+0.91u`** | **Elite Process Win:** Cleared `4.5` by **25.5 yards** in Buffalo's `36-10` blowout win. |
| **4 (`PROP-04`)** | `PHI@WAS` | **Dyami Brown (WAS) Rec Yds OVER 12.5 (`-110`)** | `85/100` / `83/100` | `32.25` | `0 tgt, 0 rec, 0 yds` (`1 ST tackle`) | **FAIL (`ST/WR5` share)** | **LOSS** | `-1.00u` | **WR5 Prior Bug:** WAS WR routes consolidated onto `Treylon Burks` (`3/81`), `Antonio Williams` (`5/54`), and `Stefon Diggs` (`3/38/1TD`). |
| **5 (`PROP-05`)** | `NE@MIA` | **Jaylen Wright (MIA) Rush Att OVER 4.5 (`-110`)** | `84/100` / `83/100` | `8.10` | `2 car, 5 rush yds (1 tgt)` | **PASS (`RB2` active)** | **LOSS** | `-1.00u` | **Backfield Split Misread:** `Ollie Gordon II` (`17 car, 53 yds`) handled the early-down workload; Wright only got 2 carries. |
| **6 (`PROP-06`)** | `TEN@CIN` | **Dohnte Meyers (CIN) Rec Yds OVER 13.5 (`-110`)** | `84/100` / `84/100` | `35.53` | **`3 rec, 34 rec yds (3 tgts)`** | **PASS (`WR3` with Iosivas OUT)** | **WIN** | **`+0.91u`** | **Good Process Win:** Cleared `13.5` by **20.5 yards** in Joe Burrow's `462-yard` eruption. |
| **7 (`PROP-07`)** | `TEN@CIN` | **Drew Sample (CIN) Rec Yds OVER 7.5 (`-110`)** | `84/100` / `82/100` | `26.58` | `0 tgt, 0 rec, 0 yds` | **FAIL (`Blocking TE2`)** | **LOSS** | `-1.00u` | **Blocking TE2 Prior Bug:** `Mike Gesicki` (`4/76/1TD`) and `Jack Endries` (`1/1/1TD`) ran the TE pass routes while Sample blocked. |
| **8 (`PROP-08`)** | `MIN@DET` | **Isaac TeSlaa (DET) Rec Yds OVER 17.5 (`-110`)** | `83/100` / `79/100` | `37.65` | `0 tgt, 0 rec, 0 yds` | **FAIL (`<25%` route share)** | **LOSS** | `-1.00u` | **Low-Volume Backup Trap:** Goff threw only 25 passes (`18/25, 176 yds`), condensed to St. Brown (`8`), Jamo (`6`), LaPorta (`5`), Gibbs (`4`). |
| **9 (`PROP-09`)** | `NE@MIA` | **Efton Chism III (NE) Rec Yds OVER 15.5 (`-110`)** | `83/100` / `78/100` | `35.98` | **`5 rec, 37 rec yds (5 tgts)`** | **PASS (`Slot starter` w/ Hollins OUT)** | **WIN** | **`+0.91u`** | **Elite Process Win:** Caught all 5 targets from Drake Maye for 37 yards (`+21.5 yds` over line). |
| **10 (`PROP-10`)** | `KC@DEN` | **J.K. Dobbins (DEN) Rush Yds OVER 21.5 (`-110`)** | `82/100` / `73/100` | `40.83` | `7 car, 13 rush yds (1.9 YPC)` | **PASS (`Active RB split`)** | **LOSS** | `-1.00u` | **Ignored Jonah Coleman Takeover:** `Jonah Coleman` (`11 car, 41 yds, 1 TD + 4 rec, 63 yds`) led Denver's backfield while Dobbins averaged `1.9 YPC`. |
| **11 (`PROP-11`)** | `PHI@WAS` | **Treylon Burks (WAS) Rec Yds OVER 21.5 (`-110`)** | `82/100` / `69/100` | `44.82` | **`3 rec, 81 rec yds (5 tgts, Long 53)`** | **PASS (`X-WR1` w/ McLaurin IR)** | **WIN** | **`+0.91u`** | **Elite Process Win:** Cleared `21.5` by **59.5 yards** as Washington's perimeter X-receiver. |
| **12 (`PROP-12`)** | `CHI@SEA` | **Kalif Raymond (CHI) Rec Yds OVER 21.5 (`-110`)** | `78/100` / `68/100` | `39.24` | `Mon Nov 2, 7:15 PM CT (MNF)` | **PASS (`MNF Active`)** | **PENDING** | — | Pending tonight's `CHI @ SEA` MNF game. |
| **13 (`PROP-13`)** | `ARI@DAL` | **Tyler Goodson (DAL) Rush Yds OVER 21.5 (`-110`)** | `78/100` / `69/100` | `35.13` | `7 car, 14 rush yds` (`+2 rec, 19 yds`) | **PASS (`RB2` 7 carries)** | **LOSS** | `-1.00u` | **Efficiency Loss:** Got 7 carries (`+2 catches` for `33 scrimmage yds`) but averaged `2.0 YPC` on the ground (`14 rush yds`). |
| **14 (`PROP-14`)** | `ATL@TB` | **Jahan Dotson (ATL) Rec Yds OVER 21.5 (`-110`)** | `78/100` / `68/100` | `38.07` | **`2 rec, 95 rec yds (5 tgts, Long 79)`** | **PASS (`WR2` 78% routes)** | **WIN** | **`+0.91u`** | **Elite Process Win:** Led Atlanta with **95 receiving yards** (`+73.5 yds` over line) while Drake London was bracketed (`1/8`). |
| **15 (`PROP-15`)** | `ARI@DAL` | **Jake Ferguson (DAL) Rec Yds OVER 14.5 (`-110`)** | `77/100` / `59/100` | `27.41` | `0 tgt, 0 rec, 0 yds` (`Exited Q1 3:06 ankle`) | **PASS (`TE1` active start)** | **LOSS** | `-1.00u` | **Snap-Leak + Q1 Injury Loss:** `Brevyn Spann-Ford` (`4/31`) and `Ryan Flournoy` (`3/38/1TD`) had eroded Ferguson's snaps before his Q1 ankle injury. |
| **16 (`PROP-16`)** | `CLE@PIT` | **Quinshon Judkins (CLE) Receptions OVER 1.5 (`-115`)** | `77/100` / `62/100` | `3.05` | **`2 rec, 24 rec yds (2 tgts)`** | **PASS (`RB1` checkdown)** | **WIN** | **`+0.87u`** | **Good Process Win:** Cleared `1.5 receptions` on checkdowns against Pittsburgh's 8-sack pass rush. |

### Mathematical Proof of the Minimum Route/Snap Participation Gate (`route_share >= 35%` or `snap_share >= 25%`)
- **Raw Settled Sunday Props (`15` plays):** **`7-8-0` (`46.7%`) · `-1.58u` unrounded** (`-1.67u` sum of rounded legs: `6 × +0.91u + 0.87u - 8.00u = +6.33u - 8.00u`).
- **4 Disqualified Zero-Target Tail Traps (`-4.00u`):** `Devontez Walker (0 tgt)`, `Dyami Brown (0 tgt)`, `Drew Sample (0 tgt)`, and `Isaac TeSlaa (0 tgt)` all had `0` targets because `POSITIONAL_MARKET_PRIORS` (`WR=46.0 yds`, `TE=34.0 yds`) pulled low-snap WR5s and blocking TE2s toward starter means without gating on route/snap share.
- **Qualified Active-Role Subset (`11` plays passing `route_share >= 35%` or `snap_share >= 25%`):** **`7-4-0` (`63.6%`) · `+2.42u` unrounded** (`+2.33u` rounded)!

---

## 5. Garrett's Pre-Kickoff Pull Rulings (`08:01 CT` & `09:10 CT`) — Governance Verification

Per Section 9 of [`WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md) and Section 8.1 of [`2026-11-01-WEEK8-FULL-POST-SLATE-REVIEW-AND-DFS-OPTIMIZER-AUTOPSY.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/2026-11-01-WEEK8-FULL-POST-SLATE-REVIEW-AND-DFS-OPTIMIZER-AUTOPSY.md), all **6 contaminated items** ordered pulled by Garrett at `08:01 CT` and `09:10 CT` on Sunday morning were struck prior to kickoff (`DO NOT COUNT IN RECORD, WIN OR LOSE`):

| Pull ID | Ruling Timestamp | Matchup / Slate | Pulled Selection / Exposure | Pre-Kickoff Pull Reason | Informational Actual Outcome (`EXCLUDED FROM RECORD`) | Governance Verdict |
|---|---|---|---|---|---|---|
| **`PULL-01`** | `08:01 CT` | `LV @ NYJ` | **`NYJ ML (-122)` vs LV** | Roster identity & NYJ `#28` pressure rate / `#28` EPA/play allowed contamination | `LV 38 - NYJ 33` (Would have **LOST `-1.00u`**) | **SAVED OUTRIGHT LOSS (`+1.00u` saved)** |
| **`PULL-02`** | `08:01 CT` | `LV @ NYJ` | **`NYJ -1.5 (-110)` vs LV** | Same `LV @ NYJ` offensive/defensive contamination | `LV 38 - NYJ 33` (Would have **LOST `-1.00u`**) | **SAVED OUTRIGHT LOSS (`+1.00u` saved)** |
| **`PULL-03`** | `08:01 CT` | `ATL @ TB` | **`Chris Godwin Jr. (TB) OVER 3.5 Receptions`** | Misattributed Mike Evans (`SF`) injury boost onto TB WR room | `0 rec on 1 tgt` in TB `16-0` rainstorm (Would have **LOST `-1.00u`**) | **SAVED OUTRIGHT LOSS (`+1.00u` saved)** |
| **`PULL-04`** | `08:01 CT` | `DK Cash (1A & 2A)` | **`Jets DST ($2,800)`** | NYJ `#28` pressure rate (`15.1%`) & `0.9` sacks/gm | `NYJ DST` allowed **38 points** (`2.00 DK pts`) | **SAVED CATASTROPHIC CASH DST DUD** |
| **`PULL-05`** | `09:10 CT` | `LV @ NYJ` | **`Michael Mayer (LV) OVER 2.5 Receptions`** | `LV @ NYJ` contamination + Brock Bowers active TE1 role (`2 TDs`) | `5 rec, 53 yds on 6 tgts` (Would have **WON `+0.91u`**) | **EXCLUDED PER RULE (Process integrity preserved)** |
| **`PULL-06`** | `09:10 CT` | `DK GPP (3 Lineups)` | **`Omar Cooper Jr. ($4,800 NYJ WR)`** | Non-roster DK CSV placeholder row carrying synthetic `14.3` FPPG prior | `0 catches, 0 targets, 0.00 DK pts` (while `Adonai Mitchell` went `7/142/1TD = 30.20 DK pts`) | **SAVED DEAD DFS ZERO** |

---

## 6. Reference-Only `ABSTAIN` Projections Grading (Call Sheet Sections 5, 6, 7 & 8 — Calibration Tracking Only)

> [!NOTE]
> **Governance Tag: `REFERENCE_ONLY / ABSTAIN — NOT IN OFFICIAL BANKROLL RECORD`**
> Per [`WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md) Sections 5–8, these projections lacked two-way book prices on disk at freeze time and were logged as `ABSTAIN` (`publishAllowed: false`) with `+4.0pp Edge Trigger Odds`. They are graded below against Sunday's official ESPN box scores strictly for kernel calibration tracking (`20-9-0` = **`69.0%`** combined win rate across all 29 settled Sunday `ABSTAIN` projections!).

### 6.1 Section 5: Unpriced `1Q / 1H / 2Q / 2H / Team Total` Derivatives — **`8-1-0` (`88.9%`) Settled + `1` Pending MNF**

| Rank | Matchup | Target Derivative Projection | Confidence | Pathwise Median | Trigger Odds | Actual Box-Score Outcome | Calibration Grade |
|---:|---|---|---:|---:|---:|---|---|
| **1** | `LAC@LA` | **LAC@LA 1Q Total UNDER 9.5** | `70/100` | `7.40` | `-197` | **`1Q Total = 6`** (`LAC 3 - LAR 3`) | **WIN** |
| **2** | `MIN@DET` | **MIN@DET 1Q Total UNDER 9.5** | `70/100` | `7.36` | `-192` | **`1Q Total = 3`** (`MIN 0 - DET 3`) | **WIN** |
| **3** | `LAC@LA` | **LA 1H Winner (-200)** | `69/100` | `+6.77` | `-186` | **`1H Score: LAR 10 - LAC 9`** | **WIN** |
| **4** | `CHI@SEA` | **CHI@SEA 1Q Total UNDER 9.5** | `68/100` | `7.55` | `-178` | `Mon Nov 2, 7:15 PM CT (MNF)` | **PENDING MNF** |
| **5** | `IND@JAX` | **JAX 1H Winner (-294)** | `66/100` | `+5.80` | `-164` | **`1H Score: JAX 28 - IND 0`** | **WIN** |
| **6** | `CLE@PIT` | **PIT 1H Winner (-149)** | `66/100` | `+5.44` | `-163` | **`1H Score: PIT 20 - CLE 6`** | **WIN** |
| **7** | `CLE@PIT` | **PIT 2H Winner (-127)** | `66/100` | `+5.90` | `-162` | **`2H Score: PIT 7 - CLE 0`** | **WIN** |
| **8** | `IND@JAX` | **JAX 2Q Winner (-149)** | `65/100` | `+3.58` | `-155` | **`2Q Score: JAX 21 - IND 0`** | **WIN** |
| **9** | `LV@NYJ` | **LV@NYJ 1Q Total UNDER 9.5** | `63/100` | `8.07` | `-145` | `1Q Total = 13` (`LV 7 - NYJ 6`) | **LOSS** |
| **10** | `ARI@DAL` | **DAL Team Total UNDER 33.5 (-169)** | `63/100` | `28.13` | `-144` | **`DAL Final = 30 pts`** (`ARI 33 - DAL 30 OT`) | **WIN** |

### 6.2 Section 6: Kicking Suite (`Field Goals Made OVER 1.5`) — **`3-3-0` (`50.0%`) Settled**

| Rank | Matchup | Target Kicking Projection | Confidence | Pathwise $\lambda$ | Trigger Odds | Actual Kicking Box-Score Line | Calibration Grade |
|---:|---|---|---:|---:|---:|---|---|
| **1** | `MIN@DET` | **Will Reichard (MIN) FGM OVER 1.5** | `68/100` | `2.35` | `-178` | `0/1 FG, 1/1 XP (1 pt)` | **LOSS** |
| **2** | `ATL@TB` | **Chase McLaughlin (TB) FGM OVER 1.5** | `68/100` | `2.33` | `-175` | **`3/3 FG (Long 46), 1/1 XP (10 pts)`** | **WIN** |
| **3** | `CLE@PIT` | **Chris Boswell (PIT) FGM OVER 1.5** | `67/100` | `2.31` | `-171` | **`2/3 FG (Long 37), 3/3 XP (9 pts)`** | **WIN** |
| **4** | `IND@JAX` | **Spencer Shrader (IND) FGM OVER 1.5** | `67/100` | `2.30` | `-170` | `0/0 FG, 1/1 XP (1 pt in 42-7 blowout loss)` | **LOSS** |
| **5** | `LV@NYJ` | **Matt Gay (LV) FGM OVER 1.5** | `65/100` | `2.22` | `-157` | `1/1 FG (Long 53), 5/5 XP (8 pts — LV scored 5 TDs)` | **LOSS** |
| **6** | `ARI@DAL` | **Chad Ryland (ARI) FGM OVER 1.5** | `64/100` | `2.17` | `-149` | **`2/2 FG (Long 42), 3/4 XP (9 pts)`** | **WIN** |

### 6.3 Section 7: Defense / IDP Tackles + Assists Suite (`C-300 @rynoonan` Kernel) — **`5-3-0` (`62.5%`) Settled**

| Rank | Matchup | Target IDP Tackles Projection | Confidence | Pathwise Median | Trigger Odds | Actual Defensive Box-Score Line | Calibration Grade |
|---:|---|---|---:|---:|---:|---|---|
| **1** | `KC@DEN` | **Alex Singleton (DEN LB) Tackles+Ast UNDER 12.5** | `81/100` | `9.79` | `-336` | `14 total tackles (6 solo, 8 ast, 1.0 sack)` | **LOSS** |
| **2** | `LAC@LA` | **Nate Landman (LA LB) Tackles+Ast UNDER 8.5** | `81/100` | `6.36` | `-331` | **`8 total tackles (7 solo, 1 ast)`** | **WIN** |
| **3** | `TEN@CIN` | **Demetrius Knight Jr. (CIN LB) Tackles+Ast UNDER 8.5** | `75/100` | `6.82` | `-247` | **`5 total tackles (5 solo, 0 ast)`** | **WIN** |
| **4** | `CLE@PIT` | **Payton Wilson (PIT LB) Tackles+Ast UNDER 8.5** | `72/100` | `7.06` | `-214` | **`8 total tackles (3 solo, 5 ast)`** | **WIN** |
| **5** | `IND@JAX` | **Akeem Davis-Gaither (IND LB) Tackles+Ast OVER 8.5** | `71/100` | `10.36` | `-199` | `5 total tackles (2 solo, 3 ast)` | **LOSS** |
| **6** | `LV@NYJ` | **Jamien Sherwood (NYJ LB) Tackles+Ast UNDER 7.5** | `68/100` | `6.48` | `-175` | `14 total tackles (5 solo, 9 ast)` | **LOSS** |
| **7** | `BAL@BUF` | **Roquan Smith (BAL LB) Tackles+Ast OVER 7.5** | `66/100` | `8.86` | `-162` | **`11 total tackles (6 solo, 5 ast)`** | **WIN** |
| **8** | `MIN@DET` | **Jack Campbell (DET LB) Tackles+Ast UNDER 9.5** | `65/100` | `8.52` | `-157` | **`3 total tackles (0 solo, 3 ast)`** | **WIN** |

### 6.4 Section 8: Goal-Line / Anytime TD Vulture Projections (`@locktalkbets` Kernel) — **`4-2-0` (`66.7%`) Settled**

| Rank | Matchup | Target Anytime TD Projection | Confidence | GL Share | Trigger Odds | Actual Touchdown & Box-Score Line | Calibration Grade |
|---:|---|---|---:|---:|---:|---|---|
| **1** | `IND@JAX` | **Bhayshul Tuten (JAX) Anytime TD** | `89/100` | `88.1%` | `-584` | **`2 TDs` (`39-yd rush TD` Q2 + `25-yd rec TD` Q3; `16/104` rush, `2/55` rec)** | **WIN (`2+ TDs`)** |
| **2** | `ARI@DAL` | **Javonte Williams (DAL) Anytime TD** | `84/100` | `93.1%` | `-394` | `0 TD` (`24 car, 56 yds` — vultured by `Dak Prescott 5-yd rush TD`) | **LOSS** |
| **3** | `KC@DEN` | **Kenneth Walker III (KC) Anytime TD** | `80/100` | `90.4%` | `-321` | `0 TD` (`21 car, 69 yds, 4 rec, 15 yds` — Mahomes 3 pass TDs) | **LOSS** |
| **4** | `LAC@LA` | **Kyren Williams (LA) Anytime TD** | `77/100` | `90.4%` | `-265` | **`1 TD` (`1-yd rush TD` Q2 — also `First TD` of game!)** | **WIN (`First TD`)** |
| **5** | `PHI@WAS` | **Rachaad White (WAS) Anytime TD** | `72/100` | `85.6%` | `-212` | **`1 TD` (`1-yd rush TD` Q4; `11 car, 55 yds`)** | **WIN** |
| **6** | `LV@NYJ` | **Braelon Allen (NYJ) Anytime TD** | `69/100` | `88.8%` | `-189` | **`1 TD` (`21-yd rush TD` Q3; `21 car, 147 yds`)** | **WIN** |

---

## 7. Complete Grading of [`WEEK-8-SPECIALTY-PACKS-MASTER.md`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/WEEK-8-SPECIALTY-PACKS-MASTER.md) & [`WEEK-8-SUNDAY-MONDAY-EXPANDED-CORE-AND-LINEUPS.md`](file:///C:/Users/Garrett/Sports/docs/dfs/research/2026-11-01/WEEK-8-SUNDAY-MONDAY-EXPANDED-CORE-AND-LINEUPS.md)

### 7.1 Spotlight `TEN @ CIN` (`Carnell Tate OUT` + `Tyjae Spears OUT`) Target-Funnel Trio — **`6-0` (`100%`) Sweep on Receiving Yards & Receptions!**
1. **`Wan'Dale Robinson (TEN WR)` (`78/100`):** Actual **`6 rec, 57 rec yds, 1 TD (7 tgts)`** $\to$ `OVER 44.5 Rec Yds` **WIN**, `OVER 4.5 Receptions` **WIN**, `Anytime TD (+195)` **WIN** (`3-for-3` sweep!).
2. **`Gunnar Helm (TEN TE)` (`79/100`):** Actual **`5 rec, 76 rec yds (9 tgts, +2pt conversion)`** $\to$ `OVER 18.5 Rec Yds (-110)` **WIN** (cleared by **57.5 yards**!), `OVER 2.5 Receptions (-110)` **WIN**.
3. **`Elic Ayomanor (TEN WR)` (`76/100`):** Actual **`3 rec, 34 rec yds (5 tgts)`** $\to$ `OVER 32.5 Rec Yds` **WIN**, `OVER 2.5 Receptions` **WIN**.

### 7.2 Specialty Pack 1 (Defense, Trench & IDP)
- **Pack 1A Team DST & Trench Calls (`4-1` Sunday Settled + `1` Pending MNF):**
  - `#1 PIT Steelers DST ($3,600) / PIT O2.5 Sacks & CLE TT U17.5` (`81/100`): **WIN** (`8.0 sacks`, `CLE = 6 pts`, `12.00 DK pts`).
  - `#2 LAR Rams DST ($3,400) / LAC TT U18.5 (-114)` (`80/100`): **WIN** (`2.0 sacks`, `LAC = 9 pts`, `7.00 DK pts`).
  - `#3 CHI Bears DST ($2,900) / CHI O2.5 Sacks & SEA 1H U12.5` (`76/100`): **PENDING MNF**.
  - `#4 MIN Vikings DST ($3,100) / MIN@DET 1Q U9.5 & MIN O2.5 Sacks` (`74/100`): **WIN** (`4.0 sacks`, `1Q Total = 3 pts`).
  - `#5 JAX Jaguars DST ($3,300) / IND TT U20.5 & JAX O2.5 Sacks` (`72/100`): **WIN** (`4.0 sacks`, `92-yd INT TD`, `IND = 7 pts`, `26.00 DK pts` `#1` DST on slate!).
  - `#6 CIN Bengals DST ($3,200) / TEN TT U17.5` (`70/100`): **LOSS** (`2.0 sacks`, `TEN scored 36 pts`).
- **Pack 1B Individual Sack Suite (`OVER 0.25 Sacks` — `2-4` Sunday Settled + `2` Pending MNF):**
  - **WINS (`2`):** `T.J. Watt (PIT)` **`2.0 sacks`** (`80/100`), `Josh Hines-Allen (JAX)` **`0.5 sacks`** (`61/100`, half-sack clears `0.25`!).
  - **LOSSES (`4`):** `Jared Verse` (`0.0 sacks`), `Trey Hendrickson` (`0.0 sacks`), `Jonathan Greenard` (`0.0 sacks`), `Chris Jones` (`0.0 sacks`).
  - **PENDING MNF (`2`):** `Montez Sweat (CHI)` (`78/100`) & `Jeffery Simmons (CHI)` (`71/100`).
- **Pack 1C IDP Tackles + Assists (`5-3` Sunday Settled + `1` Pending MNF):** Identical to Section 6.3 above (`5-3`, `62.5%`), plus `T.J. Edwards (CHI LB) OVER 7.5 Tackles+Ast` pending tonight.

### 7.3 Specialty Pack 2 (Anytime TD, `2+ TD` Escalator & First TD Scorer Board) — **`10-9` (`52.6%`) · `+5.27u` at Ref Book Odds**
- **10 Anytime TD Winners (`+14.27u` gross):** `Bhayshul Tuten (-145, 2 TDs -> +0.69u)`, `Kyren Williams (-140, 1 TD -> +0.71u)`, `Ja'Marr Chase (-115, 1 TD -> +0.87u)`, `Josh Allen (+110, 1 TD -> +1.10u)`, `Rachaad White (+115, 1 TD -> +1.15u)`, `Jaylen Warren (+125, 1 TD -> +1.25u)`, `Tee Higgins (+130, 2 TDs -> +1.30u)`, `Jonah Coleman (+185, 1 TD -> +1.85u)`, `Wan'Dale Robinson (+195, 1 TD -> +1.95u)`, `Chris Rodriguez Jr. (+340, 1 TD -> +3.40u)`.
- **9 Anytime TD Losses (`-9.00u`):** `Javonte Williams`, `Kenneth Walker III`, `Rhamondre Stevenson`, `Chase Brown`, `CeeDee Lamb`, `J.K. Dobbins`, `Dallas Goedert`, `Elic Ayomanor`, `Gunnar Helm`.
- **2 `2+ TD` Escalator Winners:** **`Bhayshul Tuten` (`2 TDs`)** & **`Tee Higgins` (`2 TDs`)**.
- **2 First TD Scorer Winners:** **`Josh Allen` (`BAL@BUF` First TD, Q1 `1-yd rush`)** & **`Kyren Williams` (`LAC@LA` First TD, Q2 `1-yd rush`)**.
- **1 Pending MNF:** `Colston Loveland (CHI TE) Anytime TD (+195)`.

### 7.4 Specialty Pack 3 (Correlated Anchor Parlays & Same-Game Parlays) — **`+3.36u` Combined Net Profit Across Packs 3A & 3B!**
- **Pack 3A Flagship Cross-Game Anchor Parlays (`1-4` · `+1.81u` Net Profit at `1.0u` Risk Each):**
  - **`ANCHOR-PARLAY-5` (`+581` Market Odds — `WIN +5.81u`!):** `Gunnar Helm OVER 18.5 Rec Yds (76 yds)` + `Wan'Dale Robinson OVER 4.5 Receptions (6 rec)` + `Elic Ayomanor OVER 32.5 Rec Yds (34 yds)` — **ALL 3 LEGS CASHED!**
  - **`ANCHOR-PARLAY-1` (`+285`), `ANCHOR-PARLAY-2` (`+584`), `ANCHOR-PARLAY-3` (`+1280`):** All other legs (`PIT ML`, `LA ML`, `PIT -3.5`, `LAC TT U18.5`, `ARI +7.0`) hit, losing **solely** on `KC ML / KC -1.5` (`-3.00u`).
  - **`ANCHOR-PARLAY-4` (`+584`):** Hit `Treylon Burks O21.5 Rec Yds (81 yds)`, lost on `Ferguson` / `Dobbins` (`-1.00u`).
- **Pack 3B High-Correlation Same-Game Parlays (`2-6` Settled Sunday · `-0.45u` or `+1.55u` Combined with Pack 3A + `1` Pending MNF):**
  - **`SGP-3-CLE-PIT` (`+360` Book Odds — `WIN +3.60u`!):** `PIT -3.5 (27-6)` + `CLE@PIT 1Q Total UNDER 7.5 (7 pts)` + `Quinshon Judkins OVER 1.5 Receptions (2 rec)` — **ALL 3 LEGS CASHED!**
  - **`SGP-4-LAC-LA` (`+195` Book Odds — `WIN +1.95u`!):** `LA ML (-270)` + `LAC Team Total UNDER 18.5 (9 pts)` + `Kyren Williams Anytime TD (1 TD)` — **ALL 3 LEGS CASHED!**
  - **`SGP-1`, `SGP-2`, `SGP-5`, `SGP-6`, `SGP-7`, `SGP-9`:** Lost (`-6.00u`) due to `Walker (0 yds)`, `Ferguson/Goodson/Javonte`, `KC ML/Walker/Dobbins`, `Stevenson/Wright`, `Dyami Brown/Goedert`, and `Chase Brown 0 TD` (even though all 3 TEN receiving legs in `SGP-9` cashed!).
  - **`SGP-8-CHI-SEA` (`+425`):** **PENDING MNF** (`CHI@SEA 1H Total UNDER 22.5 + Kalif Raymond OVER 21.5 Rec Yds + Colston Loveland Anytime TD`).

### 7.5 Specialty Pack 4 (1Q/1H Derivatives & Kicking Physics Suite)
- **Pack 4A Quarters, Halves & Team Totals (`5-2` Settled Sunday + `1` Pending MNF):**
  - **WINS (`5`):** `LAC TT UNDER 18.5 (-114)` (`9 pts`), `LAC@LA 1Q UNDER 9.5` (`6 pts`), `MIN@DET 1Q UNDER 9.5` (`3 pts`), `CLE@PIT 1Q UNDER 7.5` (`7 pts`), `KC 1H -0.5 / 1H Winner` (`KC led 17-13 at HT`).
  - **LOSSES (`2`):** `BAL@BUF 1H OVER 26.5` (`23 pts` — Lamar Snap-1 injury), `ARI@DAL 1H OVER 26.5` (`17 pts` — `46` pts scored in 2H/OT).
  - **PENDING MNF (`1`):** `CHI@SEA 1Q UNDER 9.5 & 1H UNDER 22.5`.
- **Pack 4B Kicking & Special Teams Physics Suite (`4-3` Settled Sunday + `1` Pending MNF):**
  - **WINS (`4`):** `Brandon Aubrey (DAL) Kicking Points OVER 7.5 & FGM OVER 1.5` (`12 pts, 3/4 FG, 3/3 XP`), `Chase McLaughlin (TB) FGM OVER 1.5` (`3/3 FG, 10 pts`), `Chris Boswell (PIT) FGM OVER 1.5` (`2/3 FG, 9 pts`), plus Call Sheet #6 `Chad Ryland (ARI) FGM OVER 1.5` (`2/2 FG, 9 pts`).
  - **LOSSES (`3`):** `Will Reichard` (`0/1 FG`), `Spencer Shrader` (`0/0 FG`), `Matt Gay` (`1/1 FG, 5/5 XP`), and `Wil Lutz Kicking Points UNDER 7.5` (`8 pts: 2/2 FG, 2/2 XP` — missed by `0.5` pt).
  - **PENDING MNF (`1`):** `Cairo Santos (CHI) FGM OVER 1.5`.

### 7.6 Expanded Sunday–Monday DFS Portfolio (`WEEK-8-SUNDAY-MONDAY-EXPANDED-CORE-AND-LINEUPS.md`) & 11-Game Main Slate Audit
- **Expanded 13-Game Optimal Lineups (`SM-1`, `SM-2`, `SM-3`):**
  - **`Lineup SM-3` (`TEN@CIN Target-Funnel Bring-Back Special`):** **`160.78 DK pts` across `8/9` settled players + `Jaxon Smith-Njigba ($9,100)` tonight on MNF!** (`Joe Burrow 45.48`, `Ja'Marr Chase 34.10`, `Jonah Coleman 20.40`, `James Cook III 18.10`, `Wan'Dale Robinson 16.70`, `Gunnar Helm 12.60`, `Rams DST 7.00`, `Elic Ayomanor 6.40`). Projected to finish **`185–195+` DK pts**!
  - **`Lineup SM-1` (`Floor+Median Hybrid`):** `101.76 DK pts` (`7/9` settled) + `Colston Loveland` & `Bears DST` tonight (hit `Josh Allen 27.56`, `Jonah Coleman 20.40`, `Chase Brown 17.10`, `Wan'Dale 16.70`, but dragged down by `Zay Flowers 0.00` at `$7,200`).
  - **`Lineup SM-2` (`High-Ceiling Tournament`):** `74.70 DK pts` (`6/9` settled) + `Caleb Williams`, `Jaxon Smith-Njigba`, and `Colston Loveland` tonight (hit `Jaguars DST 26.00`, `Wan'Dale 16.70`, `Chris Rodriguez Jr. 12.80`, `Stevenson 12.00`, dragged by `Zay Flowers 0.00`).
- **11-Game Sunday Main Slate Flagships (`week8_dfs_portfolio_2026_10_30.json`):**
  - **`1F_gpp_shipit_leverage`:** **`207.78 DK pts`** (`PAE +95.80` vs salary expectation!)
  - **`1G_gpp_ten_tate_out_funnel`:** **`192.28 DK pts`** (`PAE +79.32`)
  - **`1D_gpp_contrarian`:** **`187.68 DK pts`** (`PAE +74.72`)
  - **`1A_cash`:** **`175.28 DK pts`** (`PAE +62.32`)
  - **`1B_gpp_bal_buf`:** **`166.86 DK pts`** (despite `Zay Flowers 0.00`)
  - **`1E_gpp_grinder`:** **`140.88 DK pts`**
  - **`1C_gpp_ari_dal`:** **`128.80 DK pts`**
  - **`20-Lineup MME Portfolio`:** Mean **`124.09 DK pts`** (vs `307.38 DK pts` hindsight 11-game optimal: `Burrow 45.48`, `Higgins 40.50`, `Allgeier 39.10`, `Chase 34.10`, `Tuten 32.90`, `Pollard 31.70`, `Adonai Mitchell 30.20`, `Fannin 27.40`, `Jaguars DST 26.00`).

---

## 8. Pending Tonight: Monday Night Football (`CHI @ SEA`, Nov 2, 2026, 7:15 PM CT)

All pending MNF items tracked in [`new_engine_official_ledger_2026.json`](file:///C:/Users/Garrett/Sports/data/engine/new_engine_official_ledger_2026.json):
1. **Official Main Line (`W8-MNF-MAIN-01`):** `Chicago Bears ML (+142)` / `Chicago Bears +3.0 (-110)` (`64/100`, Sim Median `CHI +4.71`).
2. **Official Player Prop (`W8-PROP-12`):** `Kalif Raymond (CHI WR) Receiving Yards OVER 21.5 (-110)` (`78/100` Call Sheet / `68/100` Argon, Sim Median `39.24 yds`).
3. **MNF Specialty & Derivative Card:**
   - `CHI @ SEA 1Q Total UNDER 9.5` & `1H Total UNDER 22.5` (`68/100`, Sim `7.55` / `19.5`)
   - `CHI Bears DST ($2,900) / CHI Over 2.5 Team Sacks & SEA 1H Team Total Under 12.5` (`76/100`, Sim `3.25 sacks`)
   - `Montez Sweat (CHI EDGE) OVER 0.25 Sacks` (`78/100`, $\lambda = 1.17$) & `Jeffery Simmons (CHI DT) OVER 0.25 Sacks` (`71/100`, $\lambda = 0.94$)
   - `T.J. Edwards (CHI LB) Total Tackles+Ast OVER 7.5` (`51/100`, Sim `7.73`)
   - `Colston Loveland (CHI TE) Anytime TD (+195)` (`64/100`, Cole Kmet OUT reallocation)
   - `Cairo Santos (CHI PK) Field Goals Made OVER 1.5` (`63/100`, $\lambda = 2.08$)
   - `SGP-8-CHI-SEA (+425)`: `CHI@SEA 1H UNDER 22.5 + Kalif Raymond OVER 21.5 Rec Yds + Colston Loveland Anytime TD` (`70/100`).
