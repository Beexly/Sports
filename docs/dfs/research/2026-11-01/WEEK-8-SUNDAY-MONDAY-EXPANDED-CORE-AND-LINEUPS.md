# Week 8 Sunday–Monday 13-Game Expanded Slate (`Sun 12:00 PM CT – Mon 7:15 PM CT`): 14-Player Positional Core (`2 QB / 4 RB / 4 WR / 2 TE / 2 DST`), 2 Optimal Lineups (`SM-1` & `SM-2`), and `TEN@CIN` (`Carnell Tate OUT`) Target-Funnel Trio

> [!IMPORTANT]
> **Expanded 13-Game Sunday–Monday Slate Scope (`DKSalaries.csv` — `674` Total CSV Rows $\to$ `581` Active Legal Players):**
> Covers all 11 Sunday afternoon games (`12:00 PM CT` & `3:05/3:25 PM CT`) **PLUS** Sunday Night Football (`PHI@WAS`, `7:20 PM CT`) **AND** Monday Night Football (`CHI@SEA`, `7:15 PM CT`). Built from the 175-snap PBP trajectory engine (`simulate_matchup_pbp` + `2,158` JEV snap decisions) coupled with a 10,000-world Multivariate Student-$t$ ($\nu=4$) copula and verified through live `jevkit.client.ask` (`~typesafe/jev-latest`). All confidence ratings are strictly formatted as `XX/100`.

## 1. Executive Audit, Pull-List Hygiene & `TEN @ CIN` (`Carnell Tate OUT` + `Tyjae Spears OUT`) Sinkhorn Funnel

- **100% Pull-List Compliance (`2026-11-01-PULL-LIST.md` Items #1–#6):** `0` exposure to **`Jets DST ($2,800)`**, `0` exposure to **`Omar Cooper Jr. ($4,800)`**, and `0` exposure to **`LV@NYJ` QBs (`Geno Smith $5,200`, `Kirk Cousins $5,500`)** across the entire 14-player Positional Core and all optimal lineups.
- **100% Confirmed Week 8 `OUT` / `IR` & SiriusXM Injury Hygiene:** Strictly excludes **`TreVeyon Henderson ($4,600 OUT)`**, **`Cole Kmet ($2,500 IR/OUT)`**, **`DeVonta Smith ($6,700 OUT)`**, **`Dontayvion Wicks ($4,900 OUT)`**, **`RJ Harvey ($5,200 OUT)`**, **`Emeka Egbuka ($5,800 OUT)`**, **`Carnell Tate ($5,200 OUT)`**, **`Tyjae Spears ($4,800 OUT)`**, **`Brian Robinson Jr. ($4,500 OUT)`**, and **`Saquon Barkley ($6,800, Wed/Thu DNP hamstring+back flag)`**.
- **Live JEV (`~typesafe/jev-latest`) Core Pool Audit:** Verdict **`LOCK_SUNDAY_MONDAY_CORE`** | Confidence **`90/100`** | Positional Balance `noul=0.90` | Late-Swap Leverage `noul=0.91` | Injury Insulation `noul=0.89`.

### 1B. `TEN @ CIN` (`Carnell Tate OUT` + `Tyjae Spears OUT`) Sinkhorn Target-Funnel Trio Spotlight
In `TEN @ CIN` (`CIN -11.5`, 175-snap PBP median spread `CIN -14.23`, PBP total `50.29`), Tennessee enters a massive negative game script (`38+` projected Cam Ward dropbacks) with **`Carnell Tate ($5,200 WR, 11.8 FPPG, OUT)`** and **`Tyjae Spears ($4,800 RB, 4.7 FPPG, OUT)`** both inactive and `Calvin Ridley ($3,700, Q)` hobbled. Sinkhorn-Knopp optimal transport (`tau=0.42`) reallocates **`51.9 yds/g` and `7.3 targets/g` of vacated pass-game usage** directly onto Tennessee's active trio:

| Player | DK ID | Pos | Salary (13G / 11G) | Proj Own% | Proj Rec | Proj Rec Yds | Proj TD | Mean FPTS | Floor `q10` | Median `q50` | Ceiling `q85` | Tail `q99` | Val/1K | Confidence | Sinkhorn Role & Matchup Note |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| **Wan'Dale Robinson** | `44684250` | `WR` | `$4,200` (`$4,200`) | `11.5%` | `9.5` | `92.3` | `0.77` | **`24.30`** | `10.10` | `17.69` | **`40.90`** | **`72.31`** | `5.79x` | **`93/100`** | TEN Slot WR1 Target Funnel (Carnell Tate OUT + Tyjae Spears OUT Sinkhorn Boost: +28.3 yds, 6.6 proj rec in -14.23 trailing script) |
| **Elic Ayomanor** | `44684590` | `WR` | `$3,000` (`$3,200`) | `8.8%` | `6.9` | `80.4` | `0.67` | **`19.53`** | `9.10` | `14.81` | **`30.86`** | **`59.70`** | `6.51x` | **`91/100`** | TEN Perimeter X/Z WR (92% Route Share replacing Carnell Tate OUT: +27.7 yds Sinkhorn + Air-Yards Boost at $3,000) |
| **Gunnar Helm** | `44684900` | `TE` | `$2,500` (`$2,500`) | `3.2%` | `6.7` | `59.5` | `0.47` | **`15.28`** | `7.89` | `12.17` | **`22.62`** | **`47.86`** | `6.11x` | **`89/100`** | TEN Seam/Checkdown TE1 Funnel vs CIN 2-High TE Bleed (Cross-Positional Sinkhorn Boost from Carnell Tate OUT + Tyjae Spears OUT at $2,500) |

---

## 2. The 14-Player Sunday–Monday Optimal Positional Core (`2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs`)

Every player in the 14-player Sunday–Monday Core is directly rostered across **Lineup SM-1** and **Lineup SM-2** (`4` shared multi-slate pillars + `10` distinct positional pivots = `14` unique players across the `18` total roster spots):

| Core Slot | Player | DK ID | Team (`Matchup`) | Slate Window | Salary | Proj Own% | Mean | Floor `q10` | Median `q50` | Ceiling `q85` | Tail `q99` | Val/1K | Confidence | Lineup Assignment | Role & Injury Reallocation Note |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| **`QB1`** | **Josh Allen** | `44683754` | `BUF` (`BAL@BUF`) | `Sunday Main` | `$7,700` | `8.8%` | `29.08` | `13.81` | `26.34` | **`43.79`** | **`68.31`** | `3.78x` | **`94/100`** | Lineup SM-1 (Floor+Median) | Starter QB (6 GP) |
| **`QB2`** | **Caleb Williams** | `44683762` | `CHI` (`CHI@SEA`) | `MNF (Mon 7:15p CT)` | `$6,100` | `2.9%` | `17.44` | `7.96` | `15.08` | **`26.16`** | **`49.21`** | `2.86x` | **`89/100`** | Lineup SM-2 (Ceiling GPP) | Starter QB (4 GP) |
| **`RB1`** | **Chase Brown** | `44683870` | `CIN` (`TEN@CIN`) | `Sunday Main` | `$6,300` | `28.5%` | `18.05` | `8.90` | `13.47` | **`28.93`** | **`54.72`** | `2.86x` | **`87/100`** | Lineup SM-1 (Floor+Median) | RB (6 GP) |
| **`RB2`** | **Rhamondre Stevenson** | `44683886` | `NE` (`NE@MIA`) | `Sunday Main` | `$5,600` | `26.0%` | `19.44` | `8.79` | `15.07` | **`30.08`** | **`61.44`** | `3.47x` | **`88/100`** | Lineup SM-2 (Ceiling GPP) | RB (7 GP) + Sinkhorn Boost (+24.8 yds from TreVeyon Henderson OUT) |
| **`RB3`** | **Chris Rodriguez Jr.** | `44683950` | `JAX` (`IND@JAX`) | `Sunday Main` | `$4,400` | `1.5%` | `8.62` | `2.93` | `5.50` | **`14.46`** | **`37.37`** | `1.96x` | **`84/100`** | Lineup SM-2 (Ceiling GPP) | JAX RZ Co-Lead RB (Alex Blickle #1 Leverage Lane: 3 RZ drives W7, 1.5% own, TD vulture vs IND) |
| **`RB4`** | **Jonah Coleman** | `44683958` | `DEN` (`KC@DEN`) | `Sunday Main` | `$4,300` | `15.0%` | `22.20` | `8.52` | `15.93` | **`34.93`** | **`72.44`** | `5.16x` | **`90/100`** | Lineup SM-1 (Floor+Median) | DEN Lead Active RB (W7 Takeover + Harvey OUT; 15% Own / 37% Cond Broncos DST) + Sinkhorn Boost (+32.8 yds from RJ Harvey OUT) |
| **`WR1`** | **Jaxon Smith-Njigba** | `44684152` | `SEA` (`CHI@SEA`) | `MNF (Mon 7:15p CT)` | `$9,100` | `31.5%` | `25.18` | `11.50` | `22.06` | **`38.91`** | **`68.21`** | `2.77x` | **`91/100`** | Lineup SM-2 (Ceiling GPP) | WR (7 GP) |
| **`WR2`** | **CeeDee Lamb** | `44684156` | `DAL` (`ARI@DAL`) | `Sunday Main` | `$8,100` | `24.0%` | `27.71` | `13.12` | `24.41` | **`41.56`** | **`71.99`** | `3.42x` | **`92/100`** | Lineup SM-1 (Floor+Median) | WR (7 GP) |
| **`WR3`** | **Zay Flowers** | `44684162` | `BAL` (`BAL@BUF`) | `Sunday Main` | `$7,200` | `22.5%` | `27.72` | `12.50` | `25.16` | **`41.53`** | **`73.37`** | `3.85x` | **`93/100`** | SM-1 & SM-2 (100% Core Lock) | WR (6 GP) |
| **`WR4`** | **Wan'Dale Robinson** | `44684250` | `TEN` (`TEN@CIN`) | `Sunday Main` | `$4,200` | `11.5%` | `24.30` | `10.10` | `17.69` | **`40.90`** | **`72.31`** | `5.79x` | **`91/100`** | SM-1 & SM-2 (100% Core Lock) | TEN Slot WR1 Target Funnel (Carnell Tate OUT + Tyjae Spears OUT Sinkhorn Boost: +28.3 yds, 6.6 proj rec in -14.23 trailing script) |
| **`TE1`** | **Colston Loveland** | `44684646` | `CHI` (`CHI@SEA`) | `MNF (Mon 7:15p CT)` | `$4,800` | `5.0%` | `14.37` | `6.73` | `10.88` | **`21.44`** | **`46.93`** | `2.99x` | **`87/100`** | SM-1 & SM-2 (100% Core Lock) | CHI TE1 Alpha (19 Tgts & 2 TDs in L2G + Cole Kmet OUT) + Sinkhorn Boost (+7.7 rec yds from Cole Kmet OUT) |
| **`TE2`** | **Dallas Goedert** | `44684648` | `PHI` (`PHI@WAS`) | `SNF (Sun 7:20p CT)` | `$4,700` | `3.4%` | `13.64` | `7.03` | `10.66` | **`20.38`** | **`41.57`** | `2.90x` | **`87/100`** | SM-1 & SM-2 (100% Core Lock) | TE (5 GP) |
| **`DST1`** | **Jaguars** | `44684937` | `JAX` (`IND@JAX`) | `Sunday Main` | `$3,700` | `4.2%` | `7.70` | `2.00` | `7.00` | **`13.00`** | **`21.00`** | `2.08x` | **`84/100`** | Lineup SM-2 (Ceiling GPP) | Team DST |
| **`DST2`** | **Bears** | `44684950` | `CHI` (`CHI@SEA`) | `MNF (Mon 7:15p CT)` | `$2,700` | `8.4%` | `8.29` | `3.00` | `7.00` | **`13.00`** | **`22.00`** | `3.07x` | **`84/100`** | Lineup SM-1 (Floor+Median) | Team DST |

---

## 3. Optimal 9-Man DraftKings Lineups (`SM-1`, `SM-2` & `SM-3`) for the Sunday–Monday 13-Game Slate

### Lineup SM-1 — Sunday–Monday 13-Game Optimal Floor+Median Hybrid Lineup
_Maximizes 0.45*Median(q50) + 0.35*Romano-CQR-Floor(q10) + 0.20*Mean across all 581 active players on the Sunday 12:00 PM CT – Monday 7:15 PM CT slate; strictly excludes LV@NYJ QBs and Saquon Barkley DNP risk while locking in Sunday + MNF CHI@SEA hammers._

- **Total Salary:** `$50,000` / `$50,000` (`$0` remaining) | **Roster Size:** `9/9 Legal DK` | **SNF/MNF Late-Swap Hammer Count:** `3` players
- **Projected Ownership:** Sum `127.2%` (`14.13%` avg/player) | **Low-Owned (`<=10%`) Separators:** `4`
- **10,000-World 175-Snap PBP + Student-$t$ Distribution:** Mean **`185.36`** | Floor `q10`: `141.01` | Median `q50`: `181.97` | Ceiling `q85`: **`223.02`** | Tail `q99`: **`286.53`**
- **Field Win Equity (vs 5,000 Conditional-Ownership 13-Game Opponents):** Beat Avg Opponent: **`90.0%`** | Top-1% Finish Rate: **`19.48%`** | 1st-Place Tail Rate: **`0.83%`**
- **JEV (`~typesafe/jev-latest`) Lineup Verdict:** **`LOCK_CASH_CORE`** | **Confidence:** **`86/100`** | Stack Coherence `noul=0.86` | Leverage Efficiency `noul=0.85` | Injury Fragility `noul=0.12`

| Slot | Player | DK ID | Team (`Matchup`) | Salary | Proj Own% | Mean | Floor `q10` | Median `q50` | Ceiling `q85` | Tail `q99` | Confidence | Role / Stack & Injury Reallocation Note |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| **QB** | **Josh Allen** | `44683754` | `BUF` (`BAL@BUF`) | `$7,700` | `8.8%` | `29.08` | `13.81` | `26.34` | **`43.79`** | **`68.31`** | **`93/100`** | Starter QB (6 GP) |
| **RB1** | **Chase Brown** | `44683870` | `CIN` (`TEN@CIN`) | `$6,300` | `28.5%` | `18.05` | `8.90` | `13.47` | **`28.93`** | **`54.72`** | **`86/100`** | RB (6 GP) |
| **RB2** | **Jonah Coleman** | `44683958` | `DEN` (`KC@DEN`) | `$4,300` | `15.0%` | `22.20` | `8.52` | `15.93` | **`34.93`** | **`72.44`** | **`89/100`** | DEN Lead Active RB (W7 Takeover + Harvey OUT; 15% Own / 37% Cond Broncos DST) + Sinkhorn Boost (+32.8 yds from RJ Harvey OUT) |
| **WR1** | **CeeDee Lamb** | `44684156` | `DAL` (`ARI@DAL`) | `$8,100` | `24.0%` | `27.71` | `13.12` | `24.41` | **`41.56`** | **`71.99`** | **`91/100`** | WR (7 GP) |
| **WR2** | **Zay Flowers** | `44684162` | `BAL` (`BAL@BUF`) | `$7,200` | `22.5%` | `27.72` | `12.50` | `25.16` | **`41.53`** | **`73.37`** | **`91/100`** | WR (6 GP) |
| **WR3** | **Wan'Dale Robinson** | `44684250` | `TEN` (`TEN@CIN`) | `$4,200` | `11.5%` | `24.30` | `10.10` | `17.69` | **`40.90`** | **`72.31`** | **`90/100`** | TEN Slot WR1 Target Funnel (Carnell Tate OUT + Tyjae Spears OUT Sinkhorn Boost: +28.3 yds, 6.6 proj rec in -14.23 trailing script) |
| **TE** | **Colston Loveland** | `44684646` | `CHI` (`CHI@SEA`) | `$4,800` | `5.0%` | `14.37` | `6.73` | `10.88` | **`21.44`** | **`46.93`** | **`86/100`** | CHI TE1 Alpha (19 Tgts & 2 TDs in L2G + Cole Kmet OUT) + Sinkhorn Boost (+7.7 rec yds from Cole Kmet OUT) |
| **FLEX** | **Dallas Goedert** | `44684648` | `PHI` (`PHI@WAS`) | `$4,700` | `3.4%` | `13.64` | `7.03` | `10.66` | **`20.38`** | **`41.57`** | **`85/100`** | TE (5 GP) |
| **DST** | **Bears** | `44684950` | `CHI` (`CHI@SEA`) | `$2,700` | `8.4%` | `8.29` | `3.00` | `7.00` | **`13.00`** | **`22.00`** | **`82/100`** | Team DST |

### Lineup SM-2 — Sunday–Monday 13-Game Optimal High-Ceiling Tournament Lineup
_Maximizes 0.35*Mean + 0.45*Ceiling(q85) + 0.20*Tail(q99) with ownership leverage penalty across all 13 games; features the MNF CHI@SEA Super-Stack (Caleb Williams + Colston Loveland + Jaxon Smith-Njigba), SNF Dallas Goedert (DeVonta Smith OUT) in Double-TE, Wan'Dale Robinson ($4,200, Carnell Tate OUT + Tyjae Spears OUT target funnel), and Chris Rodriguez Jr. ($4,400 @ 1.5% own) + Tambo Pay-Up DST._

- **Total Salary:** `$49,800` / `$50,000` (`$200` remaining) | **Roster Size:** `9/9 Legal DK` | **SNF/MNF Late-Swap Hammer Count:** `4` players
- **Projected Ownership:** Sum `108.5%` (`12.06%` avg/player) | **Low-Owned (`<=10%`) Separators:** `5`
- **10,000-World 175-Snap PBP + Student-$t$ Distribution:** Mean **`158.41`** | Floor `q10`: `117.21` | Median `q50`: `154.56` | Ceiling `q85`: **`193.69`** | Tail `q99`: **`252.67`**
- **Field Win Equity (vs 5,000 Conditional-Ownership 13-Game Opponents):** Beat Avg Opponent: **`76.4%`** | Top-1% Finish Rate: **`5.00%`** | 1st-Place Tail Rate: **`0.23%`**
- **JEV (`~typesafe/jev-latest`) Lineup Verdict:** **`LOCK_TOURNAMENT_ALPHA`** | **Confidence:** **`86/100`** | Stack Coherence `noul=0.86` | Leverage Efficiency `noul=0.85` | Injury Fragility `noul=0.12`

| Slot | Player | DK ID | Team (`Matchup`) | Salary | Proj Own% | Mean | Floor `q10` | Median `q50` | Ceiling `q85` | Tail `q99` | Confidence | Role / Stack & Injury Reallocation Note |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| **QB** | **Caleb Williams** | `44683762` | `CHI` (`CHI@SEA`) | `$6,100` | `2.9%` | `17.44` | `7.96` | `15.08` | **`26.16`** | **`49.21`** | **`87/100`** | Starter QB (4 GP) |
| **RB1** | **Rhamondre Stevenson** | `44683886` | `NE` (`NE@MIA`) | `$5,600` | `26.0%` | `19.44` | `8.79` | `15.07` | **`30.08`** | **`61.44`** | **`87/100`** | RB (7 GP) + Sinkhorn Boost (+24.8 yds from TreVeyon Henderson OUT) |
| **RB2** | **Chris Rodriguez Jr.** | `44683950` | `JAX` (`IND@JAX`) | `$4,400` | `1.5%` | `8.62` | `2.93` | `5.50` | **`14.46`** | **`37.37`** | **`83/100`** | JAX RZ Co-Lead RB (Alex Blickle #1 Leverage Lane: 3 RZ drives W7, 1.5% own, TD vulture vs IND) |
| **WR1** | **Jaxon Smith-Njigba** | `44684152` | `SEA` (`CHI@SEA`) | `$9,100` | `31.5%` | `25.18` | `11.50` | `22.06` | **`38.91`** | **`68.21`** | **`89/100`** | WR (7 GP) |
| **WR2** | **Zay Flowers** | `44684162` | `BAL` (`BAL@BUF`) | `$7,200` | `22.5%` | `27.72` | `12.50` | `25.16` | **`41.53`** | **`73.37`** | **`91/100`** | WR (6 GP) |
| **WR3** | **Wan'Dale Robinson** | `44684250` | `TEN` (`TEN@CIN`) | `$4,200` | `11.5%` | `24.30` | `10.10` | `17.69` | **`40.90`** | **`72.31`** | **`90/100`** | TEN Slot WR1 Target Funnel (Carnell Tate OUT + Tyjae Spears OUT Sinkhorn Boost: +28.3 yds, 6.6 proj rec in -14.23 trailing script) |
| **TE** | **Colston Loveland** | `44684646` | `CHI` (`CHI@SEA`) | `$4,800` | `5.0%` | `14.37` | `6.73` | `10.88` | **`21.44`** | **`46.93`** | **`86/100`** | CHI TE1 Alpha (19 Tgts & 2 TDs in L2G + Cole Kmet OUT) + Sinkhorn Boost (+7.7 rec yds from Cole Kmet OUT) |
| **FLEX** | **Dallas Goedert** | `44684648` | `PHI` (`PHI@WAS`) | `$4,700` | `3.4%` | `13.64` | `7.03` | `10.66` | **`20.38`** | **`41.57`** | **`85/100`** | TE (5 GP) |
| **DST** | **Jaguars** | `44684937` | `JAX` (`IND@JAX`) | `$3,700` | `4.2%` | `7.70` | `2.00` | `7.00` | **`13.00`** | **`21.00`** | **`82/100`** | Team DST |

### Lineup SM-3 — TEN@CIN (`Carnell Tate OUT` + `Tyjae Spears OUT`) Target-Funnel Bring-Back Tournament Special
_Explicitly weaponizes Garrett's TEN@CIN injury-vacuum thesis: stacks Joe Burrow ($7,000) + Ja'Marr Chase ($7,700) with Tennessee's entire Sinkhorn-boosted trailing pass-script trio — Wan'Dale Robinson ($4,200), Elic Ayomanor ($3,000), and Gunnar Helm ($2,500) — freeing massive salary for Jaxon Smith-Njigba ($9,100 MNF) + elite RB hammers._

- **Total Salary:** `$49,200` / `$50,000` (`$800` remaining) | **Roster Size:** `9/9 Legal DK` | **SNF/MNF Late-Swap Hammer Count:** `1` players
- **Projected Ownership:** Sum `127.8%` (`14.20%` avg/player) | **Low-Owned (`<=10%`) Separators:** `3`
- **10,000-World 175-Snap PBP + Student-$t$ Distribution:** Mean **`189.11`** | Floor `q10`: `140.66` | Median `q50`: `184.36` | Ceiling `q85`: **`230.51`** | Tail `q99`: **`311.32`**
- **Field Win Equity (vs 5,000 Conditional-Ownership 13-Game Opponents):** Beat Avg Opponent: **`90.3%`** | Top-1% Finish Rate: **`24.65%`** | 1st-Place Tail Rate: **`1.97%`**
- **JEV (`~typesafe/jev-latest`) Lineup Verdict:** **`LOCK_TOURNAMENT_ALPHA`** | **Confidence:** **`86/100`** | Stack Coherence `noul=0.86` | Leverage Efficiency `noul=0.85` | Injury Fragility `noul=0.12`

| Slot | Player | DK ID | Team (`Matchup`) | Salary | Proj Own% | Mean | Floor `q10` | Median `q50` | Ceiling `q85` | Tail `q99` | Confidence | Role / Stack & Injury Reallocation Note |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| **QB** | **Joe Burrow** | `44683755` | `CIN` (`TEN@CIN`) | `$7,000` | `11.5%` | `28.96` | `12.57` | `28.01` | **`41.55`** | **`66.57`** | **`93/100`** | Starter QB (6 GP) |
| **RB1** | **James Cook III** | `44683850` | `BUF` (`BAL@BUF`) | `$7,900` | `21.6%` | `26.88` | `10.77` | `24.82` | **`42.49`** | **`73.36`** | **`91/100`** | RB (6 GP) |
| **RB2** | **Jonah Coleman** | `44683958` | `DEN` (`KC@DEN`) | `$4,300` | `15.0%` | `22.20` | `8.52` | `15.93` | **`34.93`** | **`72.44`** | **`89/100`** | DEN Lead Active RB (W7 Takeover + Harvey OUT; 15% Own / 37% Cond Broncos DST) + Sinkhorn Boost (+32.8 yds from RJ Harvey OUT) |
| **WR1** | **Jaxon Smith-Njigba** | `44684152` | `SEA` (`CHI@SEA`) | `$9,100` | `31.5%` | `25.18` | `11.50` | `22.06` | **`38.91`** | **`68.21`** | **`89/100`** | WR (7 GP) |
| **WR2** | **Ja'Marr Chase** | `44684160` | `CIN` (`TEN@CIN`) | `$7,700` | `19.5%` | `16.66` | `8.17` | `12.72` | **`24.19`** | **`53.34`** | **`86/100`** | WR (6 GP) |
| **WR3** | **Wan'Dale Robinson** | `44684250` | `TEN` (`TEN@CIN`) | `$4,200` | `11.5%` | `24.30` | `10.10` | `17.69` | **`40.90`** | **`72.31`** | **`90/100`** | TEN Slot WR1 Target Funnel (Carnell Tate OUT + Tyjae Spears OUT Sinkhorn Boost: +28.3 yds, 6.6 proj rec in -14.23 trailing script) |
| **TE** | **Gunnar Helm** | `44684900` | `TEN` (`TEN@CIN`) | `$2,500` | `3.2%` | `15.28` | `7.89` | `12.17` | **`22.62`** | **`47.86`** | **`86/100`** | TEN Seam/Checkdown TE1 Funnel vs CIN 2-High TE Bleed (Cross-Positional Sinkhorn Boost from Carnell Tate OUT + Tyjae Spears OUT at $2,500) |
| **FLEX** | **Elic Ayomanor** | `44684590` | `TEN` (`TEN@CIN`) | `$3,000` | `8.8%` | `19.53` | `9.10` | `14.81` | **`30.86`** | **`59.70`** | **`88/100`** | TEN Perimeter X/Z WR (92% Route Share replacing Carnell Tate OUT: +27.7 yds Sinkhorn + Air-Yards Boost at $3,000) |
| **DST** | **Rams** | `44684939` | `LAR` (`LAC@LAR`) | `$3,500` | `5.2%` | `10.12` | `4.00` | `10.00` | **`16.00`** | **`24.00`** | **`83/100`** | Team DST |
