# 2026 NFL WEEK 8 — DFS MAIN SLATE MASTER PORTFOLIO (DRAFTKINGS `$50,000` & FANDUEL `$60,000` CASH + GPP)

**Generated:** `2026-10-30T23:58:00Z`  
**Engine Version:** `GSE 10-Layer Autonomous Engine (v5.3.0 Pathwise 360°)`  
**Simulation Footprint:** `22,750,000` Snap Evaluations (`13 Games × 10,000 Worlds × 175 Snaps/World`)  
**2026 Week 8 Sunday Main Slate Matchups:** `BAL @ BUF` · `TEN @ CIN` · `ARI @ DAL` · `MIN @ DET` · `LV @ NYJ` · `CLE @ PIT` · `ATL @ TB` · `IND @ JAX` · `LAC @ LA` · `KC @ DEN` · `NE @ MIA`  
**Official Verified Engine Record:** Pre-Week-8 New Engine **`16-5 · 76.2% · +10.45u`** | Week 8 TNF **`31-11 · +18.56u`** | Cumulative Verified Season **`47-16 · 74.6% · +29.01u`**  
**Companion Data Artifact:** [`data/engine/week8_dfs_portfolio_2026_10_30.json`](file:///C:/c/wt-sports/data/engine/week8_dfs_portfolio_2026_10_30.json)

---

## 1. THREE MANDATORY STRUCTURAL FADES (GARRETT & 2026 PBP AUDIT)

Before constructing a single Cash or GPP lineup on the Week 8 Sunday Main Slate, three public chalk traps identified directly in `play_by_play_2026.parquet` and `pennydata_2026_player_week_stats.csv` are **hard-faded**:

1. **HARD FADE #1 — J.K. Dobbins (`RB`, `DEN`, `KC @ DEN`):**
   - **2026 Usage Cliff Verified:** After logging `18` carries in Week 5 and `17` carries in Week 6, Denver **phased J.K. Dobbins out in Week 7 (`6 carries, 23 rushing yards, 0 targets, 0 catches`)** while **Jonah Coleman (`9 carries, 54 rushing yards, 2 targets`)** took lead early-down work and **RJ Harvey (`14.6 PPR pts` in Week 6, `14.0 PPR pts` on `54 receiving yards` in Week 7)** monopolized high-value passing-down and space touches.
   - **Action:** `is_phased_out = True` in `scripts/ops/run_week8_slate.py`. Zero exposure to J.K. Dobbins in Cash or GPP. In `KC @ DEN` tournament stacks, only **RJ Harvey (`$4,600` DK)** or **Courtland Sutton (`$5,800` DK)** are eligible Denver skill pieces.

2. **HARD FADE #2 — Ladd McConkey & All Los Angeles Chargers Pass-Catchers (`LAC @ LA`):**
   - **2026 PBP Reality:** The Chargers offense has been **putrid** (`c285_off_ridge_epa = -0.2572`, `#32` in recent efficiency: **`-0.397` EPA/play and `-0.570` pass EPA/play (`27.4%` success rate) in Week 5**, followed by **`-0.311` EPA/play and `-0.407` pass EPA/play (`27.0%` success rate) in Week 6**).
   - **Target Collapse:** Ladd McConkey missed Week 5 and logged **1 target, 1 reception, 17 yards (`2.7` PPR pts) in Week 6** while Justin Herbert was under relentless pressure (`-0.288` EPA/play vs blitz).
   - **Action:** Zero LAC offensive players in Cash or GPP. We attack `LAC @ LA` exclusively from the **Los Angeles Rams side (`Matthew Stafford`, `Puka Nacua`, `Kyren Williams`, and `Rams DST $3,100`)**.

3. **HARD FADE #3 — Detroit Lions Passing Chalk vs. Brian Flores' `#1` NFL Defense (`MIN @ DET`):**
   - **2026 PBP Reality:** Brian Flores' Minnesota Vikings defense is **`#1` in the entire NFL in 2026**:
     - **Defensive EPA/Play Allowed:** **`-0.1927` (`#1` in NFL)** | **Schedule-Adjusted C-285 Ridge:** **`-0.1614` (`#1` in NFL)**
     - **Defensive Success Rate Allowed:** **`35.10%` (`#1` in NFL)**
     - **Sack Rate & Havoc:** **`6.19%` sack rate (`21` sacks + `7` INTs in 6 games)**
     - **FTN Simulated-Pressure / Blitz Rate:** **`72.22%` (`#1` in NFL)** holding opposing QBs to **`-0.2144` EPA/play on blitzes** and **`-0.5127` EPA/play on obvious passing downs**!
     - **Every Single 2026 Opponent Held to Negative EPA:** GB (`-0.175`), CHI (`-0.125`), TB (`-0.246`), MIA (`-0.204`), NO (`-0.351`), IND (`-0.112`).
   - **Action:** When `evaluate_qb_matchup_2x2` conditions on Flores' `-0.2144` FTN blitz EPA allowed and `-0.1614` C-285 ridge defense, Jared Goff's naive blitz bonus vanishes (`-0.145` net EPA shift). We **fade Detroit passing chalk (`Jared Goff`)** in DFS Cash and tournaments.

---

## 2. OPTIMAL LINEUP BUILDS — DRAFTKINGS (`$50,000` CAP) & FANDUEL (`$60,000` CAP)

### Lineup #1: DraftKings Cash Core / Double-Up Lineup (`$49,900 / $50,000` — Romano CQR $q_{0.10}$ Floor-Optimized)
- **Zero Dobbins · Zero LAC · Zero Goff vs Flores.**
- Built around the two highest-total games on the slate (`BAL @ BUF` `54.5` total and `TEN @ CIN` where Tennessee is missing traded All-Pro DT Jeffery Simmons) plus three un-phased-out bellcow RBs (**Bijan Robinson, Derrick Henry, Chase Brown**) and **Rams DST** against the putrid Chargers offense (`-0.354` EPA/play in Weeks 5–6).

| Slot | Player | Team | 2026 W8 Matchup | DK Salary | Mean Pts | Median Pts | CQR `[q10, q90]` | Proj Own% | Structural Role & 7-Signal Justification |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **QB** | **Patrick Mahomes** | KC | `KC @ DEN` | `$6,800` | `23.6` | `22.8` | `[16.2, 32.4]` | `14.5%` | `+0.247` static EPA/DB + `+0.25` vs blitz; DEN `#32` missed tackles (`56` MTkl) |
| **RB1** | **Derrick Henry** | BAL | `BAL @ BUF` | `$7,400` | `22.9` | `21.8` | `[15.2, 32.1]` | `24.2%` | `68.5%` carry share + `78%` GL share in slate-high `54.5`-total shootout |
| **RB2** | **Bijan Robinson** | ATL | `ATL @ TB` | `$7,100` | `21.9` | `21.0` | `[14.8, 30.1]` | `25.0%` | `82.0%` touch share (`64.2%` carry + `17.8%` target share); zero phase-out risk |
| **WR1** | **Ja'Marr Chase** | CIN | `TEN @ CIN` | `$7,900` | `24.2` | `22.7` | `[15.1, 34.5]` | `26.4%` | `30.8%` target share + `42.1%` air yards vs TEN defense missing Jeffery Simmons |
| **WR2** | **Puka Nacua** | LA | `LAC @ LA` | `$7,500` | `21.1` | `20.2` | `[14.0, 29.8]` | `21.8%` | `31.4%` target share in McVay motion script (`-6.5` favorite vs LAC) |
| **WR3** | **Andrei Iosivas** | CIN | `TEN @ CIN` | `$3,200` | `11.6` | `10.8` | `[7.0, 18.5]` | `8.8%` | `86%` route participation; red-zone slot outlet opposite Chase |
| **TE** | **Travis Kelce** | KC | `KC @ DEN` | `$5,000` | `14.8` | `13.9` | `[9.4, 21.8]` | `15.2%` | Signal 1: Denver allows **`29.0%` Red-Zone xTD share to TEs** (`#2` highest in NFL) |
| **FLEX** | **Chase Brown** | CIN | `TEN @ CIN` | `$2,100` / `$5,300`* | — | — | — | — | *See exact `$50,000` salary table below* |

#### Verified Exact `$50,000` DraftKings Cash Roster (`$49,900` Used · `$100` Remaining)
| Slot | Player | Team | Matchup | DK Salary | Mean Pts | Median Pts | CQR `[q10, q90]` | Structural Floor Note |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **QB** | **Joe Burrow** | CIN | `TEN @ CIN` | `$6,600` | `23.8` | `22.9` | `[16.1, 32.8]` | Facing TEN without Jeffery Simmons (`CIN -11.5`, `+0.035` trench boost) |
| **RB1** | **Derrick Henry** | BAL | `BAL @ BUF` | `$7,400` | `22.9` | `21.8` | `[15.2, 32.1]` | `89.5` rush yd line (`+12.6%` Sniper edge); `60.5` sim total |
| **RB2** | **Bijan Robinson** | ATL | `ATL @ TB` | `$7,100` | `21.9` | `21.0` | `[14.8, 30.1]` | `76.5` rush yd line (`+12.6%` Sniper edge); 3-down bellcow |
| **WR1** | **Ja'Marr Chase** | CIN | `TEN @ CIN` | `$7,900` | `24.2` | `22.7` | `[15.1, 34.5]` | `#1` Sniper Prop (`1Q OVER 15.5` `+15.4%` edge, `FG OVER 82.5` `+13.6%` edge) |
| **WR2** | **Khalil Shakir** | BUF | `BAL @ BUF` | `$5,500` | `16.4` | `15.6` | `[10.8, 23.6]` | High-completion slot funnel in `BAL @ BUF` (`54.5` total) |
| **WR3** | **Andrei Iosivas** | CIN | `TEN @ CIN` | `$3,200` | `11.6` | `10.8` | `[7.0, 18.5]` | `86%` route share; locks Bengals passing TDs with Burrow + Chase |
| **TE** | **Pat Freiermuth** | PIT | `CLE @ PIT` | `$2,900` | `10.9` | `10.2` | `[7.0, 16.6]` | `18.6%` target share; highest Pt/$ CQR $q_{0.10}$ TE floor |
| **FLEX** | **Jonathan Taylor** | IND | `IND @ JAX` | `$6,900` | `20.8` | `19.9` | `[14.2, 28.7]` | `82.5` rush yd line (`+11.6%` Sniper edge); `71.4%` carry share |
| **DST** | **Steelers DST** | PIT | `CLE @ PIT` | `$2,400` | `9.6` | `9.1` | `[5.6, 15.8]` | T.J. Watt (`71.1%` sack prob) vs CLE `-0.069` C-285 ridge offense |
| **TOTAL** | **9 / 9 Legal** | — | **Cap: `$50,000`** | **`$49,900`** | **`162.1`** | **`154.0`** | **`[105.8, 232.7]`** | **`$100` Remaining · Zero Phased-Out RBs · Zero LAC** |

---

### Lineup #2: DraftKings Flagship GPP Stack #1 (`BAL @ BUF` `54.5`-Total Game Stack + `Rams DST` vs Putrid `LAC`)
- **Contest Target:** Flagship Single-Entry / 3-Max / Milly Maker.
- **Thesis:** `BAL @ BUF` has the highest simulated median total on the slate (`58.4+` pts). We pair **Josh Allen + Khalil Shakir + Dalton Kincaid** with **Derrick Henry + Zay Flowers** on the Baltimore bring-back, add **Chase Brown** (`TEN @ CIN` post-Simmons trade surge `+3.4` xFP gap), and lock **Rams DST (`$2,900`)** against the Chargers' putrid `-0.354` Wk 5–6 offense.

| Slot | Player | Team | Matchup | DK Salary | Mean Pts | CQR `[q10, q90]` | Stack & Matchup Role |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **QB** | **Josh Allen** | BUF | `BAL @ BUF` | `$7,800` | `26.4` | `[18.1, 36.8]` | `42.4%` inside-the-5 QB vulture rush share + `+0.29` blitz EPA |
| **RB1** | **Derrick Henry** | BAL | `BAL @ BUF` | `$7,400` | `22.9` | `[15.2, 32.1]` | `BAL @ BUF` Bring-Back #1 (`+12.6%` Sniper rush edge) |
| **RB2** | **Chase Brown** | CIN | `TEN @ CIN` | `$5,300` | `16.8` | `[10.9, 24.5]` | `CHASE_BROWN_XFP_SURGE` facing TEN without Jeffery Simmons |
| **WR1** | **Zay Flowers** | BAL | `BAL @ BUF` | `$6,200` | `18.1` | `[11.4, 26.8]` | `BAL @ BUF` Bring-Back #2 (`28.6%` target share) |
| **WR2** | **Khalil Shakir** | BUF | `BAL @ BUF` | `$5,500` | `16.4` | `[10.8, 23.6]` | Primary Josh Allen slot correlation ($\rho = +0.54$) |
| **WR3** | **Keon Coleman** | BUF | `BAL @ BUF` | `$4,500` | `13.4` | `[8.1, 21.2]` | Downfield air-yards & end-zone double stack with Allen |
| **TE** | **Dalton Kincaid** | BUF | `BAL @ BUF` | `$4,700` | `13.9` | `[8.8, 21.4]` | Middle-of-field seam funnel vs Baltimore safety rotation |
| **FLEX** | **RJ Harvey** | DEN | `KC @ DEN` | `$4,600` | `14.5` | `[9.2, 22.1]` | **Dobbins Phase-Out Winner:** `14.6` & `14.0` PPR pts in Wks 6–7 (`54` rec yds Wk 7) |
| **DST** | **Rams DST** | LA | `LAC @ LA` | `$2,900` | `9.8` | `[5.8, 16.2]` | **Attacks Putrid LAC Offense (`-0.397` / `-0.311` EPA/play in Wks 5–6)** |
| **TOTAL** | **9 / 9 Legal** | — | **Cap: `$50,000`** | **`$48,900`** | **`152.2`** | **`[98.3, 224.7]`** | **5-Man `BAL @ BUF` Stack + RJ Harvey Leverage + Rams DST vs LAC** |

---

### Lineup #3: DraftKings GPP Stack #2 (`KC @ DEN` Mile High Stack + `LA Rams` Onslaught vs Putrid `LAC`)
- **Thesis:** Combines **Patrick Mahomes + Travis Kelce** (`29.0%` DEN RZ xTD share to TEs, Signal 1) + **RJ Harvey** (Denver's real receiving/explosive RB after phasing out Dobbins, exploiting DEN's `#32` missed-tackle shootout environment) with a **Puka Nacua + Kyren Williams + Rams DST** onslaught against the collapsing Chargers.

| Slot | Player | Team | Matchup | DK Salary | Mean Pts | CQR `[q10, q90]` | Stack & Matchup Role |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **QB** | **Patrick Mahomes** | KC | `KC @ DEN` | `$6,800` | `23.6` | `[16.2, 32.4]` | `+0.247` static EPA/DB; DEN `#32` missed tackles (`56` MTkl, `+4.8%` YAC) |
| **RB1** | **Kyren Williams** | LA | `LAC @ LA` | `$7,200` | `21.4` | `[14.5, 29.8]` | Positive script bellcow (`LA -6.5`) + correlates with Rams DST ($\rho = +0.43$) |
| **RB2** | **RJ Harvey** | DEN | `KC @ DEN` | `$4,600` | `14.5` | `[9.2, 22.1]` | Mile High Bring-Back (Replaces phased-out Dobbins; `68` & `54` rec yd ceiling) |
| **WR1** | **Ja'Marr Chase** | CIN | `TEN @ CIN` | `$7,900` | `24.2` | `[15.1, 34.5]` | Overall WR1 ceiling vs TEN (`+15.4%` 1Q edge, `+13.6%` FG edge) |
| **WR2** | **Puka Nacua** | LA | `LAC @ LA` | `$7,500` | `21.1` | `[14.0, 29.8]` | `31.4%` target share alpha vs LAC secondary |
| **WR3** | **Xavier Worthy** | KC | `KC @ DEN` | `$5,200` | `14.9` | `[8.9, 23.4]` | Deep-shot air density (`0.848` at `5,280 ft`) stack with Mahomes |
| **TE** | **Travis Kelce** | KC | `KC @ DEN` | `$5,000` | `14.8` | `[9.4, 21.8]` | Signal 1: `29.0%` DEN RZ xTD share allowed to TEs |
| **FLEX** | **Andrei Iosivas** | CIN | `TEN @ CIN` | `$3,200` | `11.6` | `[7.0, 18.5]` | Mini-stack correlation with Ja'Marr Chase (`TEN @ CIN`) |
| **DST** | **Rams DST** | LA | `LAC @ LA` | `$2,600` | `9.8` | `[5.8, 16.2]` | Attacks LAC `-0.570` / `-0.407` pass EPA/play (Wks 5–6) |
| **TOTAL** | **9 / 9 Legal** | — | **Cap: `$50,000`** | **`$50,000`** | **`155.9`** | **`[100.1, 228.5]`** | **`$0` Remaining · Zero Dobbins · Zero LAC Offense · Zero Goff vs Flores** |

---

### Lineup #4: FanDuel Cash Core (`$59,900 / $60,000` Cap — Half-PPR TD-Heavy Optimization)
- **Slots:** `QB` **Joe Burrow** (`$7,600`) · `RB1` **Derrick Henry** (`$8,500`) · `RB2` **Bijan Robinson** (`$8,100`) · `WR1` **Ja'Marr Chase** (`$8,600`) · `WR2` **Puka Nacua** (`$8,000`) · `WR3` **Andrei Iosivas** (`$4,500`) · `TE` **Pat Freiermuth** (`$4,700`) · `FLEX` **Chase Brown** (`$6,200`) · `DEF` **Steelers DST** (`$3,700`).
- **Total Salary:** **`$59,900 / $60,000`** · **Projected Median:** `146.8 FD pts` · **CQR 90% Interval:** `[101.4, 208.6]`.
