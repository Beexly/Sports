# 2026-11-02 MNF `CHI @ SEA` 360° Full-Board Master Call Sheet & Personal `$40.00` DraftKings Sportsbook Execution Card

- **Matchup:** Chicago Bears (`CHI`, 3-4) at Seattle Seahawks (`SEA`, 4-3) — Week 8 Monday Night Football
- **Venue & Kickoff:** Lumen Field (Seattle, WA — Outdoors, FieldTurf Revolution 360, `53°F`, `80% RH`, `5 mph` wind) · Mon Nov 2, 2026, 7:15 PM CT / 8:15 PM ET
- **Engine Version:** `GSE-v5.4-Forensic-Tracks1to4-Biomech-Batch9` (Commit `60d4bdbfb`)
- **Verification Gate Status:**
  - `pytest` (Tracks 1–4 Forensic + Trench V2 + Batch 9 Biomech/Metabolic + Mind Guardian): **`28 / 28 PASSED`** (`2.40s`)
  - `packages/mcp-equations-server`: **`61 / 61 PASSED`** (`2.32s`)
  - `packages/prediction-engine`: **`2,501 / 2,501 PASSED across 223 test files`** (`48.43s`)
  - `git grep "rng\.normal" -- scripts/ops/`: **`0 matches`** (100% Gamma / Lognormal / Poisson / Conserved Share allocation)
  - Conserved 10,000-World Box-Score Audit (`assert_pbp_conservation`): **`PASSED`** (`tol <= 1e-2`)
  - 2026 Roster Identity & Structural Missingness (`assert_2026_roster_identity_integrity`, `validate_pbp_structural_missingness`): **`PASSED`**

---

## 1. Personal `$40.00` DraftKings Sportsbook Capital-Preserving Execution Card

Designed specifically for a **strict `$40.00` DraftKings Sportsbook balance** where capital preservation and steady bankroll growth are paramount:
- **`$36.00` (`90%` of bankroll)** is deployed across **5 high-conviction, diversified straight bets** (so hitting just 3 of 5 preserves/grows your bankroll, and hitting 4+ builds real cash without needing a parlay miracle).
- **`$4.00` (`10%` of bankroll)** is deployed in **1 single 2-leg Conjunction-Gated SGP (`+175`)** (`wilson_lower_90 = 42.69% > 36.36% implied`, `+7.14%` joint edge) — zero 4-leg lottery tickets.

| Slot | Bet Type | Exact DraftKings Selection | DK Odds | Exact Stake (`$`) | Profit (`$`) | Total Payout (`$`) | Post-Shrink `model_p` | De-Vig `market_p` | Net Edge (`%`) | Barber 80% CQR Band |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **Straight Prop (#1 Overall Edge & Floor)** | **Kalif Raymond (`CHI WR`) `OVER 21.5 Receiving Yards`** | `-110` | **`$10.00`** | `+$9.09` | `$19.09` | **`70.28%`** | `50.00%` | **`+20.28%`** | `[10.1, 73.8] yds` (`Median 35.5`) |
| **2** | **Straight Game Spread (Key Number `+3.0` Anchor)** | **Chicago Bears `+3.0`** | `-105` | **`$9.00`** | `+$8.57` | `$17.57` | **`57.61%`** | `48.92%` | **`+8.69%`** | Sim Median `CHI 22.8 – SEA 19.1` |
| **3** | **Straight Player Prop (Uncorrelated Blitz/Scramble)** | **Sam Darnold (`SEA QB`) `OVER 4.5 Rushing Yards`** | `-110` | **`$7.50`** | `+$6.82` | `$14.32` | **`79.33%`** | `50.00%` | **`+29.33%`** | `[0.1, 28.3] yds` (`Median 11.4`) |
| **4** | **Straight Player Prop (WR1 Reception Floor)** | **Rome Odunze (`CHI WR`) `OVER 2.5 Receptions`** | `-110` | **`$6.00`** | `+$5.45` | `$11.45` | **`66.36%`** | `50.00%` | **`+16.36%`** | `Sim Mean 4.06 / Median 4.0 rec` |
| **5** | **Straight Plus-Money Outright Kicker** | **Chicago Bears `Moneyline (+142)`** *(or `Luther Burden III OVER 51.5 Rec Yds -110`)* | `+142` | **`$3.50`** | `+$4.97` | `$8.47` | **`48.22%`** | `39.62%` | **`+8.60%`** | Fair Odds `+107` vs `+142` |
| **6** | **2-Leg Conjunction-Gated SGP Kicker** | **Kalif Raymond `OVER 21.5 Rec Yds` + `CHI +3.0`** *(or `+ Rome Odunze OVER 2.5 Rec`)* | `+175` | **`$4.00`** | `+$7.00` | `$11.00` | **`43.50%`** | `36.36%` | **`+7.14%`** | `wilson_lower_90 = 42.69%` (`SPEAK`) |
| **TOTAL** | **6 Tickets (`90%` Straights / `10%` 2-Leg SGP)** | **Full `$40.00` Allocation** | — | **`$40.00`** | **`+$41.90`** | **`$81.90`** | — | — | — | **Zero Low-Participation Traps** |

> [!TIP]
> **Optional Swap if Live `1Q Total UNDER 9.5` Is Posted at `-135` or Better on Your DK App:**
> If DraftKings posts `1st Quarter Total UNDER 9.5` at `-135` or better (`model_p = 58.66%`, Sim 1Q median `7.55 pts`, SEA Q1 Off EPA `-0.2337`), you can move the `$3.50` from Slot 5 (`CHI ML +142`) onto `1Q UNDER 9.5` for an even higher-floor, lower-variance card.

---

## 2. Why Every Ticket Cleared the Upgraded Forensic & Physics Gates

1. **Ticket 1 — `Kalif Raymond (CHI) OVER 21.5 Receiving Yards (-110)` (`$10.00`):**
   - **Verified 2026 Participation (`snap_counts_2026.parquet` + `ngs_highlight_participation_2026.parquet`):** Played in all 7 games (`player_gp = 7`), logging **`323` of `529` offensive snaps (`61.9%` season, `70.0%` in Week 7)** and a **`68.2%` route share** (`82.4%` route rate per offensive snap). Easily clears `enforce_route_snap_participation_gate(route_share >= 0.35, snap_share >= 0.25)`.
   - **2026 Production & Physics:** Averaging **`34.86 rec yds/g`** (`244 yds` on `26 catches` / `31 targets`) with a **`96.8%` Open Rate (#1 on CHI)** and Batch 9 Elastic Separation Coefficient $\mathcal{E}_{sc} = 2.1147$ against Seattle's two-high underneath shell (`RB/Slot funnel`).
   - **Conserved 10,000-World Output:** Empirical Bayes shrunk mean = **`36.78 yds`**, Conserved Sim Median = **`35.49 yds`**, `model_p = 70.28%` (`+20.28%` edge over `-110`).

2. **Ticket 2 (`$9.00` on `CHI +3.0 -105`) & Ticket 5 (`$3.50` on `CHI ML +142`):**
   - **Trench & Pocket Physics V2 (`apply_trench_pocket_shock` + `EQ-NOV02-079/080/084`):** Chicago's mid-season trade acquisition of **DT Jeffery Simmons (`TEN -> CHI`, ACTIVE tonight)** elevates CHI's interior wavefront burst threshold ($\mathcal{W}_{\text{burst}} = 708.46$) against Seattle's interior OL (`Oluwatimi 0.74, Bradford 0.68`). Combined with **Sam Darnold's `0.214` P2S (`#30` in NFL, Bayesian-shrunk `0.2049`)** and `50.0%` QB-fault sack share, SEA's adjusted sack probability jumps from `6.25%` to **`11.07%`**.
   - **EPA Trajectory:** Chicago is `+0.089` Offensive EPA/play over W6–W7 (`+0.180` in W7) while Seattle is `-0.039` season Offensive EPA/play (`-0.089` in W7, `-0.225` Rush EPA/play). Taking **`CHI +3.0 (-105)`** for `$9.00` protects your bankroll on a 3-point game while **`$3.50` on `CHI ML (+142)`** captures the outright win (`FWL-capped model_p = 48.22%` vs `39.62%` implied).

3. **Ticket 3 — `Sam Darnold (SEA) OVER 4.5 Rushing Yards (-110)` (`$7.50`):**
   - **Biomechanical & Cognitive TPR Angle (`EQ-NOV02-085` & `EQ-NOV02-086`):** Chicago blitzes at **`42.33%`** (`#2` in NFL) and adds Jeffery Simmons up the middle. Under `compute_qb_tensor_product_cognitive_probs`, interior pocket compression shifts Darnold's scramble probability to **`41.64%`** on collapsing dropbacks.
   - **Empirical Floor:** Darnold averages **`8.67 rush yds/g`** in 2026 (`52 yds` in 6 GP), and in our conserved rush allocation he posts a **`13.21` mean / `11.35` median** (`model_p = 79.33%`, EB shrunk mean `10.74 yds`). Usually clears on a single flushed scramble.

4. **Ticket 4 — `Rome Odunze (CHI) OVER 2.5 Receptions (-110)` (`$6.00`):**
   - **Participation & Injury Consolidation:** Plays **`85.0%` of offensive snaps (`94.0%` in Week 7)** and **`88.5%` route share**. With **TE2 Cole Kmet RULED OUT (Back)** (`61.4%` snaps, `2.0 tgt/g` vacated), Odunze (`3.43 rec/g` on `5.43 tgt/g`) projects for **`4.06` mean / `4.0` median receptions** (`EB shrunk mean = 3.69`, `model_p = 66.36%`, `+16.36%` edge at the discounted `2.5` line).

---

## 3. Complete 360° Prop & Participation Gate Audit Table (All 18 Live DK Props + 8 Blocked Low-Route Backups)

### A. All 18 Live Priced DraftKings Props (`data/engine/mnf_chi_sea_360_locked_card_2026_11_02.json`)

| Player (`Team Pos`) | Market | Line (Odds) | `GP` | 2026 Avg | EB Shrunk | Conserved Sim Mean / Med | Barber 80% CQR | `snap` / `route` | Gate | `model_p` (`edge`) | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sam Darnold** (`SEA QB1`) | `Rushing Yards` | `4.5 (-110)` | `6` | `8.67` | `10.74` | `13.21 / 11.35` | `[0.1, 28.3]` | `0.850 / 1.000` | `ELIGIBLE` | **`79.33%` (`+29.33%`)** | **PLAY (`OVER 4.5`)** |
| **Kalif Raymond** (`CHI WR3`) | `Receiving Yards` | `21.5 (-110)` | `7` | `34.86` | `36.78` | `39.47 / 35.49` | `[10.1, 73.8]` | `0.619 / 0.682` | `ELIGIBLE` | **`70.28%` (`+20.28%`)** | **PLAY (`OVER 21.5`)** |
| **Rome Odunze** (`CHI WR1`) | `Receptions` | `2.5 (-110)` | `7` | `3.43` | `3.69` | `4.06 / 4.00` | `[-2.2, 10.8]` | `0.850 / 0.885` | `ELIGIBLE` | **`66.36%` (`+16.36%`)** | **PLAY (`OVER 2.5`)** |
| **Kalif Raymond** (`CHI WR3`) | `Receptions` | `2.5 (-110)` | `7` | `3.71` | `3.96` | `4.32 / 4.00` | `[-3.2, 11.8]` | `0.619 / 0.682` | `ELIGIBLE` | **`65.71%` (`+15.71%`)** | **ALT PLAY (`OVER 2.5`, correlated w/ Rec Yds)** |
| **Sam Darnold** (`SEA QB1`) | `Passing Yards` | `233.5 (-110)` | `6` | `215.00` | `217.82` | `221.20 / 221.00` | `[162.8, 280.8]` | `0.850 / 1.000` | `ELIGIBLE` | **`58.86%` (`+8.86%`)** | **LEAN (`UNDER 233.5`)** |
| **Caleb Williams** (`CHI QB1`) | `Passing Yards` | `228.5 (-110)` | `4` | `255.00` | `248.61` | `243.50 / 243.00` | `[171.8, 314.8]` | `0.965 / 1.000` | `ELIGIBLE` | **`58.54%` (`+8.54%`)** | **LEAN (`OVER 228.5`)** |
| **Luther Burden III** (`CHI WR2`) | `Receiving Yards` | `51.5 (-110)` | `7` | `70.14` | `66.96` | `62.52 / 58.73` | `[25.8, 103.6]` | `0.606 / 0.674` | `ELIGIBLE` | **`57.88%` (`+7.88%`)** | **LEAN (`OVER 51.5`)** |
| **Rome Odunze** (`CHI WR1`) | `Receiving Yards` | `41.5 (-110)` | `7` | `54.43` | `53.41` | `51.98 / 47.84` | `[18.6, 90.9]` | `0.850 / 0.885` | `ELIGIBLE` | **`57.64%` (`+7.64%`)** | **LEAN (`OVER 41.5`)** |
| **Caleb Williams** (`CHI QB1`) | `Rushing Yards` | `21.5 (-110)` | `4` | `32.00` | `27.79` | `24.42 / 22.01` | `[5.9, 45.8]` | `0.965 / 1.000` | `ELIGIBLE` | `51.29%` (`+1.29%`) | **`PASS` (`< 6%` edge)** |
| **Luther Burden III** (`CHI WR2`) | `Receptions` | `4.5 (-110)` | `7` | `5.00` | `5.06` | `5.15 / 5.00` | `[-2.2, 12.8]` | `0.606 / 0.674` | `ELIGIBLE` | `51.26%` (`+1.26%`) | **`PASS` (`< 6%` edge)** |
| **Jaxon Smith-Njigba** (`SEA WR1`) | `Receptions` | `7.5 (-110)` | `7` | `8.29` | `8.11` | `7.85 / 7.00` | `[-0.2, 15.8]` | `0.836 / 0.892` | `ELIGIBLE` | `52.11%` (`+2.11%`) | **`PASS` (On 7.5 hook)** |
| **Jaxon Smith-Njigba** (`SEA WR1`) | `Receiving Yards` | `98.5 (-110)` | `7` | `123.86` | `114.44` | `101.25 / 98.43` | `[57.2, 148.3]` | `0.836 / 0.892` | `ELIGIBLE` | `50.07%` (`+0.07%`) | **`PASS` (Jaylon Johnson shadow)** |
| **Colston Loveland** (`CHI TE1`) | `Receiving Yards` | `41.5 (-110)` | `7` | `34.86` | `38.41` | `43.38 / 39.33` | `[12.3, 79.6]` | `0.851 / 0.784` | `ELIGIBLE` | `47.21%` (`-2.79%`) | **`PASS` (Sim median 39.3 < 41.5)** |
| **Colston Loveland** (`CHI TE1`) | `Receptions` | `4.5 (-110)` | `7` | `3.71` | `4.21` | `4.92 / 4.00` | `[-2.2, 12.8]` | `0.851 / 0.784` | `ELIGIBLE` | `46.94%` (`-3.06%`) | **`PASS` (Sim median 4.0 < 4.5)** |
| **Caleb Williams** (`CHI QB1`) | `Pass Completions` | `20.5 (-110)` | `4` | `22.00` | `22.55` | `22.98 / 22.00` | `[10.8, 35.8]` | `0.965 / 1.000` | `ELIGIBLE` | `57.62%` (`+7.62%`) | **`PASS` (Small sample GP=4 shrink)** |
| **Sam Darnold** (`SEA QB1`) | `Pass Completions` | `20.5 (-110)` | `6` | `18.33` | `19.60` | `21.12 / 20.00` | `[9.8, 33.8]` | `0.850 / 1.000` | `ELIGIBLE` | `51.20%` (`+1.20%`) | **`PASS`** |
| **Caleb Williams** (`CHI QB1`) | `Passing TDs` | `1.5 (-110)` | `4` | `1.25` | `1.77` | `2.19 / 2.00` | `[-3.2, 7.8]` | `0.965 / 1.000` | `ELIGIBLE` | `64.72%` (`+14.71%`) | **`PASS` (CHI 13.16% RZ TD% conflict)** |
| **Sam Darnold** (`SEA QB1`) | `Passing TDs` | `1.5 (-110)` | `6` | `1.33` | `1.99` | `2.78 / 3.00` | `[-3.2, 7.8]` | `0.850 / 1.000` | `ELIGIBLE` | `25.11%` (`-24.89%`) | **`PASS`** |

### B. Low-Participation & Inactive Players Hard-Blocked by `enforce_route_snap_participation_gate` & `block_inactive_player`
- **Hard-Zero Inactive Blocks (`proj = 0.0`, `publishAllowed = False`):** `Cole Kmet (CHI TE2 — OUT, Back)`, `Zach Charbonnet (SEA RB — OUT, Knee, 0 GP in 2026)`, `Eric Saubert (SEA TE2 — IR, Calf)`, `Drake Thomas (SEA LB — OUT, Ankle)`.
- **Low-Route / Low-Snap Blocks (`PASS_LOW_PARTICIPATION` — `route_share < 0.35` or `snap_share < 0.25`):** `Sam Roush (CHI TE3, 21.7% route)`, `Roschon Johnson (CHI RB3, 15.0% snap)`, `Jahdae Walker (CHI WR5, 14.5% route)`, `Zavion Thomas (CHI WR4, 11.0% route)`, `Tory Horton (SEA WR4, 32.0% route)`, `Brady Russell (SEA FB1, 14.2% route)`, `Elijah Arroyo (SEA TE3, 20.5% route)`, `Nick Kallerup (SEA TE4, 15.0% route)`.
