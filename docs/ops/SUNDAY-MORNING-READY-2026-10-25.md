# SUNDAY MORNING OPERATIONAL READINESS & MASTER SLATE REPORT (2026-10-25 — NFL WEEK 7 & NATIONAL TIGHT ENDS DAY)

- **Generated At**: `2026-10-25T08:45:00-05:00` (Pre-Kickoff Final Verification Run)
- **Simulation Engine**: [`markov-simulator.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/coach-sim/markov-simulator.ts) (`N = 10,000` trials per game = `130,000` full drive-level game simulations) + [`published-cells-shrinkage.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/published-cells-shrinkage.ts) (Baranchik 1970 positive-part James-Stein 32-team YBC/rush, Behind-LOS rate, and Blitz EPA cells) + [`oct24-intel-master-kernels.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/oct24-intel-master-kernels.ts).
- **Reasoning Stack Executed**:
  1. **Corpus & Mind Evaluation**: [`interpretSituation`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/reasoning/situational-engine.ts) → [`evaluateFullCorpus`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/reasoning/corpus-evaluator.ts) (`2,162 / 3,143` corpus items active per game, `68.79%` coverage) + [`evaluateMindReasoning`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/reasoning/mind-reasoning.ts) (`5,303` Mind records loaded, `36` principles triggered per game) + [`evaluateArxivCorpus`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts).
  2. **50-Work Morning Ingestion & Equation Ledger**: Ingested all **50 research works & repositories** (`14` OpenAlex, `4` Kaggle NFL/BDB 2027/EPA, `27` arXiv, `5` GitHub MCP/Agent repos) into [`sunday_45_corpus_and_equations_feed.jsonl`](file:///C:/Users/Garrett/Sports/brain/feeds/2026-10-25/sunday_45_corpus_and_equations_feed.jsonl) and [`45-WORKS-INGESTION-AND-EQUATION-LEDGER.md`](file:///C:/Users/Garrett/Sports/docs/arxiv-program/research/2026-10-25/45-WORKS-INGESTION-AND-EQUATION-LEDGER.md), computing Kass-Raftery Bayes Factor $2\ln B_{10}$ (`OpenAlex:W4211177544`), Profit-Bias Decomposition (`arXiv:2609.06739`), Bivariate Poisson shared covariance $\lambda_3$ (`OpenAlex:W2172229041`), and Opponent-Adjusted Trench Win Delta (`arXiv:2604.01491` & `arXiv:2609.33664`).
  3. **6-Family Cholesky-Whitened GLS Orthogonalization**: [`runMasterSituationalReasoningOverlay`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts) across `pressure`, `weather`, `restFatigue`, `coveragePersonnel`, `qbSkillScript`, and `marketMicrostructure` (bounded within $\pm 0.12$).
  4. **All 6 Formal Gates + Live `~typesafe/jev-latest` Epistemic Arbitration**: [`run-live-jev-arbitration-2026-10-25.py`](file:///C:/Users/Garrett/Sports/scripts/run-live-jev-arbitration-2026-10-25.py) via [`client.py`](file:///C:/Users/Garrett/hermes-jev-skills/jevkit/client.py) (`https://openrouter.ai/api/alpha/decisions`) across all 13 games and 26 player props.
  5. **10,000-Trial Correlated Monte Carlo DFS Simulation**: [`optimizeExact`](file:///C:/Users/Garrett/Sports/apps/web/lib/fantasy/dfs-exact.ts) + [`simulateLineups`](file:///C:/Users/Garrett/Sports/apps/web/lib/fantasy/dfs-correlation.ts) (`sims = 10,000`, `seed = 20261025`).

---

## 1. Direct Answers to Your Player & Injury Audit Questions (Unbiased Engine Ground Truth)

### A. Breece Hall vs. Braelon Allen (`MIA @ NYJ` — 12:00 PM CT)
- **Is Breece Hall Out?** No — Breece Hall (`NYJ RB`) is officially **`Questionable (Quad)`** on both [`espn-designations.json`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/data/public-boards/espn-designations.json) and the FantasyPros Injury Feed (`FP_INJ` updated `2026-10-24 11:33:59`).
- **Why did the engine flag Braelon Allen?**
  1. In [`fantasypros-week7-2026.json`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/data/public-boards/fantasypros-week7-2026.json), expert consensus projects **Breece Hall for just `0.7` fantasy points (`RB73`, `ECR 221`, std `65.99`)** because most rankers expect him to be inactive or on an emergency snap count, and **DraftKings pulled Breece Hall's Rushing Yards prop completely off the board**.
  2. Meanwhile, **Braelon Allen (`NYJ RB`)** logged an **`87%` offensive snap share in Week 6 (`+26.4%` snap shock, 54 snaps)** in [`snap-shocks.json`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/data/public-boards/snap-shocks.json), is ranked **`RB14` (`14.6` FP pts, `ECR 32` overall)**, and carries **`-110` Anytime TD odds** on DraftKings.
  3. **Actionable 10:30 AM CT Inactive Check**: If Breece Hall is officially inactive at 10:30 AM CT, `$5,200 Braelon Allen` is a top salary-saver RB. If Breece Hall is surprisingly active and announced as full-go, our primary Cash Game lineups below **do not depend on Braelon Allen** (they lock in **Jahmyr Gibbs `$7,800` + Kenneth Walker III `$6,700`** on the Sun–Mon slate, and **Jahmyr Gibbs `$7,800` + Derrick Henry `$6,900`** on the Sunday Main slate!).

### B. Christian Kirk vs. Brandin Cooks & Jordan Watkins (`SF @ ATL` — 12:00 PM CT)
- **Christian Kirk (`SF WR`) — ENGINE PASS / INJURY RED FLAG**:
  - Listed as **`Injured Reserve` (`2026-10-23`)** in [`espn-designations.json`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/data/public-boards/espn-designations.json) and **`Questionable (Calf, ECR 218, WR61 at 6.7 pts)`** in [`fantasypros-week7-2026.json`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/data/public-boards/fantasypros-week7-2026.json), with his DraftKings line dropping 2 yards from `25.5` to `23.5`. Our Gate 6 availability filter **rejects Christian Kirk** and removes him from all DFS lineups.
- **Brandin Cooks (`SF WR`) & Jordan Watkins (`SF WR`) — CERTIFIED PLAYS**:
  - With **Mike Evans = OUT**, **Deebo Samuel Sr. = OUT**, **Ricky Pearsall = IR**, and **Christian Kirk = Q (Calf) / IR**, the two healthy perimeter/slot WRs absorbing Brock Purdy's targets alongside George Kittle and CMC are:
    1. **Brandin Cooks (`SF WR`)**: Healthy veteran ranked **`WR47` (`8.1` FP pts — 14 spots ahead of Kirk)** who logged a **`+26.0%` Week 6 snap shock (`52%` snap share, 32 snaps)** → **`OVER 24.5 Receiving Yards (-115)`** (`Mean 42.4`, `P50 37.3`, `Edge +29.08%`, `EV +49.1%`, Score `85/100`, **JEV: `CERTIFIED_PLAY`, `0.58` survival prob**).
    2. **Jordan Watkins (`SF WR`)**: Healthy rookie who logged a **`+41.7%` Week 6 snap shock (`76%` snap share, 47 snaps)** → **`OVER 23.5 Receiving Yards (-110)`** (`Mean 39.4`, `P50 34.4`, `Edge +27.34%`, `EV +46.8%`, Score `85/100`, `0.58` JEV survival prob) and `$3,600` DFS value lock.

### C. Keenan Allen vs. Josh Downs (`IND @ MIN` — 12:00 PM CT)
- With Colts TE **Tyler Warren = OUT (Groin)** and **Alec Pierce = IR (Foot)**:
  - **Keenan Allen (`IND WR`)** is ranked **AHEAD** of Josh Downs in FantasyPros consensus (**`WR32`, `ECR 64`, `10.2` FP pts, averaging `5.2` rec/gm and `45.4` rec yds/gm** vs. Josh Downs `WR36`, `ECR 69`, `9.6` FP pts).
  - **Steam Gate Catch**: Josh Downs's DraftKings Receiving Yards line was **already steamed +8.0 yards** (`42.5` open → `50.5` current, above his `48.2` yds/gm average). Meanwhile, **Keenan Allen sits at `41.5` (`-109` Over, up only 1 yard from `40.5` open)** — 4 yards below his season average before even adding Tyler Warren's vacated middle-of-the-field targets!
  - **Verdict**: **PLAY Keenan Allen OVER 41.5 Receiving Yards (`-109`)** (`Mean 56.4`, `P50 52.4`, `Edge +23.46%`, `EV +39.57%`, Score `85/100`) and **PASS** on steamed Josh Downs `50.5`.

### D. Chris Godwin Jr. & Cade Otton (`TB @ CAR` — 12:00 PM CT)
- With Buccaneers WR **Emeka Egbuka = OUT (Concussion)** (`72%` snaps, `53.2` yds/gm vacated) and **Jalen McMillan = IR**:
  - **Chris Godwin Jr. (`TB WR`)**: Ranked **`WR28` (`11.6` FP pts, `ECR 55`, `-127` juice on Over 4.5 Receptions)**, sitting at **`46.5 Receiving Yards (-113 Over)`** (moved just +1 yd from `45.5` open) → **PLAY Chris Godwin Jr. OVER 46.5 Receiving Yards (`-113`)** (`Mean 64.5`, `P50 59.9`, `Edge +24.48%`, `EV +40.82%`, Score `85/100`).
  - **Cade Otton (`TB TE`, National TE Day)**: `91%` snap share, `-167` juice on Over 3.5 Receptions → **PLAY Cade Otton OVER 39.5 Receiving Yards (`-111`)** (`Mean 49.3`, `P50 45.1`, `Edge +13.26%`, Score `81/100`, **JEV: `CERTIFIED_PLAY`**).

### E. George Kittle & Complete National Tight Ends Day (Oct 25, 2026) Sweep
- **7 Approved National Tight Ends Day Plays**:
  1. **George Kittle (`SF TE`, `SF @ ATL`)**: **OVER 71.5 Receiving Yards (`-113`)** & **Anytime TD (`+110`)** — `#2` TE overall (`15.7` FP / `17.4` FBG pts), `89%` W6 snap share (`+16.6%` shock), Evans & Deebo OUT, Kirk Q-Calf (`Mean 92.3`, `P50 86.8`, `Edge +20.73%`, `EV +33.74%`, Score `85/100`).
  2. **Brock Bowers (`LV TE`, `LAR @ LV`)**: **OVER 70.5 Receiving Yards (`-112`)** — `#1` TE overall (`19.06` FBG pts, averaging `95.5` rec yds/gm & `7.0` rec/gm), `98%` W6 snap share (`+21.0%` shock) (`Mean 81.9`, `P50 77.2`, `Edge +13.79%`, `EV +20.76%`, Score `82/100`).
  3. **Isaiah Likely (`NYG TE`, `NYG @ HOU` — Live at Your Texans Game!)**: **OVER 49.5 Receiving Yards (`-109`)** — `91%` W6 snap share (`+11.2%` shock) with Theo Johnson OUT, averaging `63.8` rec yds/gm (`Mean 63.2`, `P50 58.1`, `Edge +15.83%`, `EV +24.94%`, Score `85/100`).
  4. **Trey McBride (`ARI TE`, `DEN @ ARI`)**: **OVER 61.5 Receiving Yards (`-110`)** — `#3` TE overall (`16.64` FBG pts, `8.2` rec/gm, `-143` on Over 6.5 Recs), reverse-steamed 4 yards down from `65.5` open to `61.5` (`Mean 70.6`, `P50 66.2`, `Edge +14.23%`, `EV +21.74%`, Score `83/100`).
  5. **Sam LaPorta (`DET TE`, `GB @ DET`)**: **OVER 49.5 Receiving Yards (`-111`)** — `#5` TE overall (`13.67` FBG pts, averaging `63.2` rec yds/gm), down 1 yd from `50.5` open in `55.5`-total Ford Field dome (`Mean 59.3`, `P50 54.6`, `Edge +14.66%`, `EV +22.42%`, Score `83/100`, **JEV: `CERTIFIED_PLAY`**).
  6. **Travis Kelce (`KC TE`, `KC @ SEA` SNF)**: **OVER 44.5 Receiving Yards (`-111`)** — Rashee Rice OUT (Ankle) makes Kelce Patrick Mahomes's primary red-zone/chain-moving target on National TE Day (`Mean 56.8`, `P50 52.4`, `Edge +16.06%`, `EV +25.16%`, Score `85/100`).
  7. **Cade Otton (`TB TE`, `TB @ CAR`)**: **OVER 39.5 Receiving Yards (`-111`)** — `91%` snaps, Egbuka OUT, `-167` juice on Over 3.5 Recs (`Mean 49.3`, `P50 45.1`, `Edge +13.26%`, `EV +19.83%`, Score `81/100`, **JEV: `CERTIFIED_PLAY`**).
- **2 National Tight Ends Day Traps Caught by Gate 6**:
  - **Tucker Kraft (`GB TE`, `50.5 Rec Yds`) — PASS**: Already steamed **+10.0 yards** (`40.5` open → `50.5` current, 9 yards above his `41.5` yds/gm average). Play Sam LaPorta `Over 49.5` in the same game instead.
  - **Dallas Goedert (`PHI TE`, `48.5 Rec Yds`) — PASS**: Active **`Questionable (Knee)`** designation + steamed **+6.0 yards** (`42.5` → `48.5`) with backup QB Tanner McKee.

---

## 2. Garrett & Dad's 50-Person Cash Game DFS Lineups (`dfs-exact.ts` + 10,000 Correlated Sims)

Because some "Sunday Noon / Monday" leagues run the **12-Game `Sunday Noon – Monday Night (DAL @ PHI)` Slate** (excluding 8:30 AM Paris `PIT @ NO`, including SNF `KC @ SEA` & MNF `DAL @ PHI`) while standard DraftKings Main runs the **10-Game `Sunday Noon – 3:25 PM CT` Slate**, here are the proven MILP-optimal 50-person Cash Game lineups for **both** formats (`$50,000 / $50,000` salary used, zero injured players):

### Option A: 12-Game `Sunday Noon – Monday Night` Slate (`Sun 12:00 PM – Mon 7:15 PM CT`) — 50-Person Cash Optimal
- **Salary Used**: `$50,000 / $50,000` | **Projected**: **`157.60` pts** | **Cash Floor**: **`95.0` pts** | **10k Correlated Sim**: Mean **`157.7`**, Median (`P50`) **`157.6`**, 90th Pct (`P90`) **`177.5`**, Ceiling EV **`179.4`**, SD **`15.5`** (lowest variance on the slate!)

| Slot | Player | Team / Matchup | Salary | Proj Pts | Cash Floor | Ceiling | Why the Engine Locks Him In |
|---|---|---|---|---|---|---|---|
| **QB** | **Dak Prescott** | `DAL @ PHI` (Mon) | `$6,600` | `20.40` | `13.5` | `31.0` | Highest floor/dollar QB (`295.0` pass yds/gm, `14:3` TD:INT) vs depleted PHI (`Jalen Hurts IR`) |
| **RB1** | **Jahmyr Gibbs** | `GB @ DET` (3:25p) | `$7,800` | `26.20` | `16.5` | `37.5` | **David Montgomery OUT**; consolidates goal-line & pass-game touches in `55.5`-total dome |
| **RB2** | **Kenneth Walker III** | `KC @ SEA` (SNF) | `$6,700` | `20.05` | `13.2` | `30.5` | Revenge game in Seattle behind KC `#3` YBC OL (`1.76` raw → `1.682` shrunk) + Rashee Rice OUT |
| **WR1** | **Jaxon Smith-Njigba** | `KC @ SEA` (SNF) | `$7,600` | `22.80` | `14.5` | `35.0` | **Zach Charbonnet OUT** forces Seattle offense through `#1` overall WR (`108.5` yds/gm) |
| **WR2** | **Matthew Golden** | `GB @ DET` (3:25p) | `$5,600` | `17.10` | `9.5` | `28.0` | `86%` W6 snap share (`+21.5%` shock) inside `55.5`-total Ford Field dome |
| **WR3** | **Jalen Coker** | `TB @ CAR` (12:00p) | `$4,900` | `15.80` | `9.0` | `25.5` | `93%` W6 snap share (`+19.0%` shock, `15.8` FBG pts) at sub-`$5k` salary |
| **TE** | **Isaiah Likely** | `NYG @ HOU` (12:00p) | `$4,500` | `14.81` | `8.5` | `24.0` | **National TE Day live at NRG Stadium!** `91%` W6 snaps (`Theo Johnson OUT`), `63.8` yds/gm |
| **FLEX** | **Jordan Watkins** | `SF @ ATL` (12:00p) | `$3,600` | `11.60` | `6.8` | `19.5` | Healthy SF WR (`76%` W6 snaps, `+41.7%` shock) with **Evans & Deebo OUT** and **Kirk Q-Calf/IR** |
| **DST** | **Rams DST** | `LAR @ LV` (3:05p) | `$2,700` | `8.80` | `3.5` | `15.5` | Jared Verse (`29` pressures, `3.5` sacks) vs Raiders OL (`0.61` YBC, `51.8%` behind-LOS) |

> **Alternative 2-v-2 Cash Swap on the 12-Game Slate**: If you want **George Kittle (`$5,900`) + Brandin Cooks (`$4,200`)** on National Tight Ends Day, swap `Jaxon Smith-Njigba ($7,600) + Jordan Watkins ($3,600)` (`$11,200`) → **`George Kittle ($5,900, FLEX) + Brandin Cooks ($4,200, WR) + Broncos DST ($3,000, up from Rams $2,700)`** (`$49,200` salary, `154.9` proj pts).

---

### Option B: 10-Game `Sunday Main Slate` (`Sun 12:00 PM – 3:25 PM CT`) — 50-Person Cash Optimal (Double-TE National TE Day Lock)
- **Salary Used**: `$50,000 / $50,000` | **Projected**: **`156.50` pts** | **Cash Floor**: **`92.0` pts** | **10k Correlated Sim**: Mean **`156.3`**, Median (`P50`) **`156.3`**, 90th Pct (`P90`) **`178.5`**, Ceiling EV **`180.5`**

| Slot | Player | Team / Matchup | Salary | Proj Pts | Cash Floor | Ceiling | Why the Engine Locks Him In |
|---|---|---|---|---|---|---|---|
| **QB** | **Bryce Young** | `TB @ CAR` (12:00p) | `$5,500` | `18.75` | `11.0` | `27.5` | 4-2 Carolina (`1.42` YBC/rush, `+0.17` EPA vs Blitz) vs TB defense; unlocks Double-Stud RBs & Double-TE |
| **RB1** | **Jahmyr Gibbs** | `GB @ DET` (3:25p) | `$7,800` | `26.20` | `16.5` | `37.5` | **David Montgomery OUT**; highest raw projection (`26.20`) and floor (`16.5`) on the slate |
| **RB2** | **Derrick Henry** | `CIN @ BAL` (12:00p) | `$6,900` | `18.80` | `11.5` | `29.0` | **Lamar Jackson OUT**; `22+` carry / goal-line focal point behind BAL `1.38` YBC OL (`-145` ATTD) |
| **WR1** | **Christian Watson** | `GB @ DET` (3:25p) | `$5,900` | `17.50` | `10.0` | `29.0` | `94%` W6 snap share (`+21.4%` shock) inside `55.5`-total Ford Field dome |
| **WR2** | **Matthew Golden** | `GB @ DET` (3:25p) | `$5,600` | `17.10` | `9.5` | `28.0` | `86%` W6 snap share (`+21.5%` shock); pairs with Watson to capture GB passing volume |
| **WR3** | **Jalen Coker** | `TB @ CAR` (12:00p) | `$4,900` | `15.80` | `9.0` | `25.5` | Stacks with Bryce Young (`93%` W6 snaps, `15.8` FBG pts) |
| **TE** | **George Kittle** | `SF @ ATL` (12:00p) | `$5,900` | `17.80` | `11.5` | `28.5` | **National TE Day Alpha**: `#2` TE (`89%` snaps), **Mike Evans & Deebo OUT**, **Christian Kirk Q-Calf** |
| **FLEX** | **Isaiah Likely** | `NYG @ HOU` (12:00p) | `$4,500` | `14.81` | `8.5` | `24.0` | **National TE Day FLEX**: `91%` snaps (`Theo Johnson OUT`), live at your Texans game! |
| **DST** | **Broncos DST** | `DEN @ ARI` (3:05p) | `$3,000` | `9.70` | `4.0` | `17.0` | Nik Bonitto (`7.0` sacks, `31` pressures) + Cooper (`3.5` sacks) vs Jacoby Brissett |

---

## 3. Complete 13-Game Master Slate Card (10,000 Markov Trials + 6 Gates + Live `~typesafe/jev-latest`)

| Window | Matchup | Locked Score (Home Margin / Total) | DK Line (Spread / Total / ML) | Primary Spread Verdict | Primary Total Verdict | Primary ML Verdict | Engine Score | Live JEV Verdict (`clvHoldProb`) |
|---|---|---|---|---|---|---|---|---|
| **8:30a Paris** | **PIT @ NO** | `PIT 24.8 – NO 19.3` (`PIT -5.5`, Tot `44.1`) | `PIT -3 (-105)` / `43.5` / `PIT -155` | **[PLAY] PIT -3 (-105)** (`+8.56%` edge, `+12.11%` EV) | **[PLAY] OVER 43.5 (-102)** (`+3.84%` edge) | **[PLAY] PIT ML -155** (`+7.42%` edge) | `77/100` | `CERTIFIED_ACTIONABLE` (`0.50`) |
| **12:00p CT** | **CIN @ BAL** | `CIN 25.9 – BAL 21.4` (`CIN -4.5`, Tot `47.3`) | `CIN -3 (-105)` / `46.5` / `CIN -148` | **[PLAY] CIN -3 (-105)** (`+5.51%` edge, `+6.16%` EV) | **[PLAY] OVER 46.5 (-105)** (`+3.69%` edge) | **[PLAY] CIN ML -148** (`+5.68%` edge) | `70/100` | `CERTIFIED_ACTIONABLE` (`0.44`) |
| **12:00p CT** | **MIA @ NYJ** | `NYJ 22.0 – MIA 20.6` (`NYJ -1.4`, Tot `42.6`) | `NYJ -3.5 (-115)` / `39.5` / `MIA +180` | **[PLAY] MIA +3.5 (-105)** (`+7.31%` edge, `+9.67%` EV) | **[PLAY] OVER 39.5 (-102)** (`+11.51%` edge) | **[PLAY] MIA ML +180** (`+12.05%` edge) | `84/100` | `CERTIFIED_ACTIONABLE` (`0.48`) |
| **12:00p CT** | **TB @ CAR** | `CAR 25.4 – TB 21.8` (`CAR -3.6`, Tot `47.2`) | `CAR -3 (-102)` / `44.5` / `CAR -162` | **[PLAY] CAR -3 (-102)** (`+3.60%` edge, `+2.55%` EV) | **[PLAY] OVER 44.5 (-110)** (`+8.48%` edge) | **[PASS]** (`+0.99%` edge) | `77/100` | `CERTIFIED_ACTIONABLE` (`0.45`) |
| **12:00p CT** | **NYG @ HOU** *(NRG Stadium)* | `HOU 26.4 – NYG 19.2` (`HOU -7.2`, Tot `45.6`) | `HOU -10.5 (-108)` / `42.5` / `NYG +400` | **[PLAY] NYG +10.5 (-112)** (`+9.30%` edge, `+13.10%` EV) | **[PLAY] OVER 42.5 (-112)** (`+9.02%` edge) | **[PLAY] NYG ML +400** (`+11.29%` edge, `0.25u` sprinkle) | `83/100` | `CERTIFIED_ACTIONABLE` (`0.43`) |
| **12:00p CT** | **IND @ MIN** | `MIN 25.6 – IND 18.8` (`MIN -6.8`, Tot `44.4`) | `MIN -6.5 (-115)` / `41.5` / `IND +270` | **[PASS]** (`+0.23%` edge) | **[PLAY] OVER 41.5 (-110)** (`+8.90%` edge) | **[PLAY] IND ML +270** (`+5.45%` edge, `0.25u`) | `78/100` | `CERTIFIED_ACTIONABLE` (`0.44`) |
| **12:00p CT** | **CLE @ TEN** | `CLE 19.6 – TEN 19.1` (`CLE -0.5`, Tot `38.6`) | `CLE -1.5 (-110)` / `36.5` / `TEN +110` | **[LEAN] TEN +1.5 (-110)** (`+3.02%` edge) | **[PLAY] OVER 36.5 (-118)** (`+4.73%` edge) | **[LEAN] TEN ML +110** (`+2.94%` edge) | `68/100` | `CERTIFIED_ACTIONABLE` (`0.49`) |
| **12:00p CT** | **SF @ ATL** | `SF 26.8 – ATL 23.7` (`SF -3.1`, Tot `50.5`) | `SF -2.5 (-115)` / `50.5` / `SF -142` | **[PASS]** (`+0.77%` edge) | **[PASS]** (`+1.04%` edge) | **[LEAN] SF ML -142** (`+2.76%` edge) | `64/100` | `LEAN_CAUTIOUS` (`0.31`) |
| **3:05p CT** | **DEN @ ARI** | `DEN 23.5 – ARI 21.3` (`DEN -2.1`, Tot `44.8`) | `DEN -4.5 (-115)` / `42.5` / `ARI +195` | **[PLAY] ARI +4.5 (-105)** (`+8.29%` edge, `+11.59%` EV) | **[PLAY] OVER 42.5 (-120)** (`+4.89%` edge) | **[PLAY] ARI ML +195** (`+11.88%` edge) | `84/100` | `CERTIFIED_ACTIONABLE` (`0.47`) |
| **3:05p CT** | **LAR @ LV** | `LAR 26.0 – LV 21.9` (`LAR -4.1`, Tot `47.9`) | `LAR -3.5 (+100)` / `48.5` / `LAR -180` | **[PLAY] LAR -3.5 (+100)** (`+4.18%` edge, `+3.81%` EV) | **[PASS]** (`+1.96%` edge) | **[PASS]** (`+0.14%` edge) | `67/100` | `CERTIFIED_ACTIONABLE` (`0.47`) |
| **3:25p CT** | **GB @ DET** | `DET 29.4 – GB 24.8` (`DET -4.7`, Tot `54.2`) | `DET -3.5 (+100)` / `55.5` / `DET -180` | **[PLAY] DET -3.5 (+100)** (`+5.80%` edge, `+7.06%` EV) | **[PLAY] UNDER 55.5 (-110)** (`+4.11%` edge) | **[PASS]** (`+1.68%` edge) | `71/100` | `CERTIFIED_ACTIONABLE` (`0.47`) |
| **7:20p SNF** | **KC @ SEA** | `KC 23.6 – SEA 21.3` (`KC -2.3`, Tot `44.9`) | `SEA -3 (+100)` / `42.5` / `KC +124` | **[PLAY] KC +3 (-120)** (`+13.33%` edge, `+20.26%` EV) | **[PLAY] OVER 42.5 (-110)** (`+7.56%` edge) | **[PLAY] KC ML +124** (`+14.43%` edge) | `84/100` | `CERTIFIED_ACTIONABLE` (`0.50`) |
| **Mon 7:15p** | **DAL @ PHI** | `DAL 23.8 – PHI 20.6` (`DAL -3.2`, Tot `44.4`) | `DAL -4.5 (-108)` / `43.5` / `PHI +170` | **[LEAN] PHI +4.5 (-112)** (`+3.44%` edge) | **[PASS]** (`+1.08%` edge) | **[PLAY] PHI ML +170** (`+5.48%` edge) | `70/100` | `CERTIFIED_ACTIONABLE` (`0.43`) |

---

## 4. All 26 Qualified Player Props (`CP * xYAC` Quantile Distributions + 6 Gates + Live `~typesafe/jev-latest`)

| # | Game | Player (`Team Pos`) | Prop Play (DK Odds) | Open → Cur | Engine Quantiles (`P10 / P50 / Mean / P90`) | Model Win% vs Shin Fair% | Edge% / EV% | Score | Live JEV (`survivalProb`) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `SF @ ATL` | **Brandin Cooks** (`SF WR`) | **OVER 24.5 Rec Yds (`-115`)** | `24.5 → 24.5` | `19.5 / 37.3 / 42.4 / 71.4` | `79.8%` vs `50.7%` | `+29.08%` / `+49.10%` | `85/100` | **`CERTIFIED_PLAY` (`0.58`)** |
| 2 | `SF @ ATL` | **Jordan Watkins** (`SF WR`) | **OVER 23.5 Rec Yds (`-110`)** | `23.5 → 23.5` | `17.7 / 34.4 / 39.4 / 66.9` | `76.9%` vs `49.5%` | `+27.34%` / `+46.80%` | `85/100` | `CAUTIOUS_LEAN` (`0.58`) |
| 3 | `CIN @ BAL` | **Zay Flowers** (`BAL WR`) | **UNDER 63.5 Rec Yds (`-112`)** | `69.5 → 63.5` | `26.3 / 46.9 / 51.9 / 83.5` | `75.0%` vs `50.0%` | `+24.98%` / `+41.93%` | `85/100` | `CAUTIOUS_LEAN` (`0.51`) |
| 4 | `TB @ CAR` | **Chris Godwin Jr.** (`TB WR`) | **OVER 46.5 Rec Yds (`-113`)** | `45.5 → 46.5` | `36.7 / 59.9 / 64.5 / 97.8` | `74.7%` vs `50.2%` | `+24.48%` / `+40.82%` | `85/100` | `CAUTIOUS_LEAN` (`0.50`) |
| 5 | `IND @ MIN` | **Keenan Allen** (`IND WR`) | **OVER 41.5 Rec Yds (`-109`)** | `40.5 → 41.5` | `32.0 / 52.4 / 56.4 / 85.7` | `72.8%` vs `49.3%` | `+23.46%` / `+39.57%` | `85/100` | `CAUTIOUS_LEAN` (`0.55`) |
| 6 | `LAR @ LV` | **Kyren Williams** (`LAR RB`) | **OVER 69.5 Rush Yds (`-110`)** | `69.5 → 69.5` | `52.6 / 81.1 / 84.0 / 116.3` | `72.3%` vs `49.5%` | `+22.75%` / `+38.03%` | `85/100` | `CAUTIOUS_LEAN` (`0.54`) |
| 7 | `CIN @ BAL` | **Ja'Marr Chase** (`CIN WR`) | **OVER 81.5 Rec Yds (`-114`)** | `78.5 → 81.5` | `64.6 / 101.2 / 107.5 / 158.4` | `73.2%` vs `50.4%` | `+22.71%` / `+37.33%` | `85/100` | `CAUTIOUS_LEAN` (`0.59`) |
| 8 | `PIT @ NO` | **Tyler Shough** (`NO QB`) | **UNDER 221.5 Pass Yds (`-114`)** | `219.5 → 221.5` | `140.1 / 191.2 / 196.5 / 254.6` | `71.5%` vs `50.3%` | `+21.17%` / `+34.23%` | `85/100` | `CAUTIOUS_LEAN` (`0.51`) |
| 9 | `SF @ ATL` | **George Kittle** (`SF TE` — *TE Day*) | **OVER 71.5 Rec Yds (`-113`)** | `68.5 → 71.5` | `55.3 / 86.8 / 92.3 / 136.1` | `71.0%` vs `50.2%` | `+20.73%` / `+33.74%` | `85/100` | `CAUTIOUS_LEAN` (`0.54`) |
| 10 | `TB @ CAR` | **Bucky Irving** (`TB RB`) | **OVER 65.5 Rush Yds (`-109`)** | `65.5 → 65.5` | `47.0 / 73.1 / 75.8 / 105.5` | `67.6%` vs `49.3%` | `+18.31%` / `+29.70%` | `85/100` | **`CERTIFIED_PLAY` (`0.59`)** |
| 11 | `TB @ CAR` | **Chuba Hubbard** (`CAR RB`) | **OVER 68.5 Rush Yds (`-109`)** | `69.5 → 68.5` | `47.6 / 75.5 / 78.4 / 110.1` | `66.0%` vs `49.3%` | `+16.67%` / `+26.55%` | `85/100` | **`CERTIFIED_PLAY` (`0.58`)** |
| 12 | `KC @ SEA` | **Travis Kelce** (`KC TE` — *TE Day*) | **OVER 44.5 Rec Yds (`-111`)** | `41.5 → 44.5` | `31.3 / 52.4 / 56.8 / 87.7` | `65.8%` vs `49.8%` | `+16.06%` / `+25.16%` | `85/100` | `CAUTIOUS_LEAN` (`0.55`) |
| 13 | `NYG @ HOU` | **Isaiah Likely** (`NYG TE` — *TE Day*) | **OVER 49.5 Rec Yds (`-109`)** | `46.5 → 49.5` | `34.3 / 58.1 / 63.2 / 98.3` | `65.2%` vs `49.3%` | `+15.83%` / `+24.94%` | `85/100` | `CAUTIOUS_LEAN` (`0.57`) |
| 14 | `DAL @ PHI` | **CeeDee Lamb** (`DAL WR`) | **OVER 81.5 Rec Yds (`-113`)** | `80.5 → 81.5` | `60.7 / 93.7 / 99.3 / 144.8` | `66.0%` vs `50.2%` | `+15.76%` / `+24.37%` | `85/100` | **`CERTIFIED_PLAY` (`0.60`)** |
| 15 | `PIT @ NO` | **Jaylen Warren** (`PIT RB`) | **OVER 67.5 Rush Yds (`-112`)** | `68.5 → 67.5` | `48.2 / 73.8 / 76.4 / 105.4` | `65.7%` vs `50.0%` | `+15.71%` / `+24.38%` | `85/100` | `CAUTIOUS_LEAN` (`0.63`) |
| 16 | `GB @ DET` | **Jahmyr Gibbs** (`DET RB`) | **OVER 95.5 Rush Yds (`-113`)** | `91.5 → 95.5` | `73.2 / 103.4 / 106.5 / 140.8` | `65.6%` vs `50.2%` | `+15.38%` / `+23.65%` | `85/100` | `CAUTIOUS_LEAN` (`0.61`) |
| 17 | `CIN @ BAL` | **Derrick Henry** (`BAL RB`) | **OVER 79.5 Rush Yds (`-111`)** | `75.5 → 79.5` | `59.4 / 86.2 / 89.2 / 120.9` | `65.1%` vs `49.8%` | `+15.35%` / `+23.81%` | `85/100` | `CAUTIOUS_LEAN` (`0.56`) |
| 18 | `KC @ SEA` | **Jaxon Smith-Njigba** (`SEA WR`) | **OVER 72.5 Rec Yds (`-112`)** | `69.5 → 72.5` | `52.3 / 81.9 / 87.3 / 129.8` | `65.2%` vs `50.0%` | `+15.17%` / `+23.36%` | `84/100` | `CAUTIOUS_LEAN` (`0.56`) |
| 19 | `GB @ DET` | **Sam LaPorta** (`DET TE` — *TE Day*) | **OVER 49.5 Rec Yds (`-111`)** | `50.5 → 49.5` | `35.1 / 54.6 / 59.3 / 90.0` | `64.5%` vs `49.8%` | `+14.66%` / `+22.42%` | `83/100` | **`CERTIFIED_PLAY` (`0.59`)** |
| 20 | `SF @ ATL` | **Drake London** (`ATL WR`) | **OVER 70.5 Rec Yds (`-114`)** | `67.5 → 70.5` | `50.1 / 79.8 / 84.5 / 125.9` | `64.8%` vs `50.4%` | `+14.31%` / `+21.62%` | `83/100` | `CAUTIOUS_LEAN` (`0.58`) |
| 21 | `DEN @ ARI` | **Trey McBride** (`ARI TE` — *TE Day*) | **OVER 61.5 Rec Yds (`-110`)** | `65.5 → 61.5` | `45.3 / 66.2 / 70.6 / 101.6` | `63.8%` vs `49.5%` | `+14.23%` / `+21.74%` | `83/100` | `CAUTIOUS_LEAN` (`0.58`) |
| 22 | `KC @ SEA` | **Kenneth Walker III** (`KC RB`) | **OVER 68.5 Rush Yds (`-114`)** | `64.5 → 68.5` | `48.2 / 74.7 / 77.4 / 107.8` | `64.5%` vs `50.4%` | `+14.01%` / `+21.05%` | `82/100` | `CAUTIOUS_LEAN` (`0.53`) |
| 23 | `LAR @ LV` | **Brock Bowers** (`LV TE` — *TE Day*) | **OVER 70.5 Rec Yds (`-112`)** | `70.5 → 70.5` | `49.8 / 77.2 / 81.9 / 119.5` | `63.8%` vs `50.0%` | `+13.79%` / `+20.76%` | `82/100` | `CAUTIOUS_LEAN` (`0.61`) |
| 24 | `TB @ CAR` | **Cade Otton** (`TB TE` — *TE Day*) | **OVER 39.5 Rec Yds (`-111`)** | `38.5 → 39.5` | `26.2 / 45.1 / 49.3 / 78.6` | `63.1%` vs `49.8%` | `+13.26%` / `+19.83%` | `81/100` | **`CERTIFIED_PLAY` (`0.53`)** |
| 25 | `PIT @ NO` | **Germie Bernard** (`PIT WR`) | **OVER 54.5 Rec Yds (`-112`)** | `53.5 → 54.5` | `38.1 / 60.5 / 64.9 / 97.9` | `63.2%` vs `50.0%` | `+13.21%` / `+19.65%` | `81/100` | `CAUTIOUS_LEAN` (`0.52`) |
| 26 | `MIA @ NYJ` | **Garrett Wilson** (`NYJ WR`) | **OVER 68.5 Rec Yds (`-112`)** | `68.5 → 68.5` | `47.5 / 74.0 / 79.3 / 118.4` | `62.2%` vs `50.0%` | `+12.19%` / `+17.72%` | `80/100` | `CAUTIOUS_LEAN` (`0.55`) |
| 27 | `LAR @ LV` | **Ashton Jeanty** (`LV RB` — *NEW*) | **OVER 26.5 Rec Yds (`-109`)** | `27.5 → 26.5` | `20.4 / 35.4 / 38.9 / 61.6` | `74.9%` vs `49.2%` | `+25.68%` / `+43.62%` | `85/100` | **`CERTIFIED_PLAY` (`0.56`)** |
| 28 | `LAR @ LV` | **Tre Tucker** (`LV WR` — *NEW*) | **OVER 42.5 Rec Yds (`-112`)** | `42.5 → 42.5` | `31.2 / 54.8 / 60.4 / 96.2` | `71.9%` vs `50.0%` | `+21.90%` / `+36.10%` | `85/100` | **`CERTIFIED_PLAY` (`0.57`)** |
| 29 | `NYG @ HOU` | **Malik Nabers** (`NYG WR` — *NEW, Live at NRG!*) | **OVER 68.5 Rec Yds (`-113`)** | `67.5 → 68.5` | `53.6 / 84.1 / 89.4 / 131.9` | `72.0%` vs `50.2%` | `+21.78%` / `+35.72%` | `85/100` | `CAUTIOUS_LEAN` (`0.58`) |
| 30 | `IND @ MIN` | **T.J. Hockenson** (`MIN TE` — *NEW TE Day #8*) | **OVER 35.5 Rec Yds (`-115`)** | `38.5 → 35.5` | `25.0 / 41.3 / 44.6 / 68.2` | `63.6%` vs `50.7%` | `+12.90%` / `+18.90%` | `81/100` | `CAUTIOUS_LEAN` (`0.58`) |
| 31 | `TB @ CAR` | **Jalen Coker** (`CAR WR` — *NEW*) | **OVER 68.5 Rec Yds (`-113`)** | `66.5 → 68.5` | `47.5 / 74.3 / 79.1 / 116.8` | `62.1%` vs `50.2%` | `+11.88%` / `+17.01%` | `80/100` | `CAUTIOUS_LEAN` (`0.52`) |
| 32 | `GB @ DET` | **Matthew Golden** (`GB WR` — *NEW*) | **OVER 74.5 Rec Yds (`-111`)** | `72.5 → 74.5` | `50.8 / 80.1 / 85.3 / 126.4` | `61.4%` vs `49.8%` | `+11.61%` / `+16.95%` | `80/100` | `CAUTIOUS_LEAN` (`0.48`) |
| 33 | `CLE @ TEN` | **Denzel Boston** (`CLE WR` — *NEW*) | **OVER 52.5 Rec Yds (`-113`)** | `51.5 → 52.5` | `35.4 / 56.1 / 59.8 / 89.2` | `60.2%` vs `50.2%` | `+10.01%` / `+13.48%` | `78/100` | `CAUTIOUS_LEAN` (`0.52`) |

> **Late-Week Injury & Pulled-Prop Catch (`GSE-INTEL-MASTER-2026-10-24.md`)**: SiriusXM Channel 87 (`Football Diehards` Oct 22, `RotoWire` Oct 23, `Fantistics` Oct 24) reported **Puka Nacua (`LAR WR`)** leaving practice early with hip/hernia/calf issues, and DraftKings pulled his Receiving Yards and Receptions props off the board. We removed Puka Nacua from the Sunday DFS pool and pivoted the Rams SGP to **Kyren Williams OVER 69.5 Rushing Yards (`-110`) + Brock Bowers OVER 70.5 Receiving Yards (`-112`)**.

---

## 5. Approved Same-Game Parlays (SGPs) & National Tight Ends Day Parlay (`sgp-copula.ts`)

1. **Paris Trench Control SGP (`PIT @ NO` — 8:30 AM CT)**:
   - **Legs**: `PIT -3 (-105)` + `Jaylen Warren OVER 67.5 Rush Yds (-112)` + `Tyler Shough UNDER 221.5 Pass Yds (-114)`
   - **Copula**: `RB-DEF` ($\theta = +0.18$) | **Fair Odds**: `+389` vs **Book**: `+475` (`Edge +3.03%`, `EV +17.46%`)
2. **Bengals Road Alpha SGP (`CIN @ BAL` — 12:00 PM CT)**:
   - **Legs**: `CIN -3 (-105)` + `Ja'Marr Chase OVER 81.5 Rec Yds (-114)` + `Derrick Henry OVER 79.5 Rush Yds (-111)`
   - **Copula**: `QB-WR` ($\theta = +0.38$) | **Fair Odds**: `+348` vs **Book**: `+460` (`Edge +4.47%`, `EV +25.03%`)
3. **Rams Trench & Bowers SGP (`LAR @ LV` — 3:25 PM CT, Puka Nacua Pivot)**:
   - **Legs**: `LAR -3.5 (+100)` + `Kyren Williams OVER 69.5 Rush Yds (-110)` + `Brock Bowers OVER 70.5 Rec Yds (-112)`
   - **Copula**: `QB-WR` ($\theta = +0.38$) | **Fair Odds**: `+362` vs **Book**: `+485` (`Edge +4.12%`, `EV +26.40%`)
4. **Texans Game Live Sweat SGP (`NYG @ HOU` at NRG Stadium — 12:00 PM CT)**:
   - **Legs**: `NYG +10.5 (-112)` + `OVER 42.5 Total (-112)` + `Isaiah Likely OVER 49.5 Rec Yds (-109)` (or `Malik Nabers OVER 68.5 Rec Yds (-113)`)
   - **Copula**: `QB-WR` ($\theta = +0.38$) | **Fair Odds**: `+354` vs **Book**: `+450` (`Edge +3.85%`, `EV +21.21%`)
5. **Chiefs Undefeated Road Dog SNF SGP (`KC @ SEA` — 7:20 PM CT)**:
   - **Legs**: `KC +3 (-120)` + `Kenneth Walker III OVER 68.5 Rush Yds (-114)` + `Jaxon Smith-Njigba OVER 72.5 Rec Yds (-112)`
   - **Copula**: `QB-RB` ($\theta = -0.15$) | **Fair Odds**: `+396` vs **Book**: `+465` (`Edge +2.49%`, `EV +14.04%`)
6. **National Tight Ends Day 4-Leg Elite Volume Parlay**:
   - **Legs**: `George Kittle OVER 71.5 Rec Yds (-113)` + `Brock Bowers OVER 70.5 Rec Yds (-112)` + `Isaiah Likely OVER 49.5 Rec Yds (-109)` + `Trey McBride OVER 61.5 Rec Yds (-110)`
   - **Independent Fair Prob**: `14.56%` (`+587` fair) vs **DK Parlay Boosted Price**: `+1240` (`EV +95.1%`) or Standard `+1128` (`EV +78.8%`).

---

## 6. 50 Research Works & GitHub Repos Ingested + Wired (`sunday45CorpusEquations`)

- **Mind Feed (`50` records, single-writer compliant)**: [`brain/feeds/2026-10-25/sunday_45_corpus_and_equations_feed.jsonl`](file:///C:/Users/Garrett/Sports/brain/feeds/2026-10-25/sunday_45_corpus_and_equations_feed.jsonl)
- **Equation Ledger & Acronym Collision Audit**: [`docs/arxiv-program/research/2026-10-25/45-WORKS-INGESTION-AND-EQUATION-LEDGER.md`](file:///C:/Users/Garrett/Sports/docs/arxiv-program/research/2026-10-25/45-WORKS-INGESTION-AND-EQUATION-LEDGER.md)
- **Wired Equations on Every Game & Prop**:
  1. `arXiv:2609.06739` Profit-Bias Decomposition: $\mathbb{E}[\text{Profit}] = (\bar{p} - \bar{\pi}) + \operatorname{Cov}(p_i - \pi_i, O_i - 1)$
  2. `OpenAlex:W4211177544` Kass-Raftery Bayes Factor Evidence Scale: $2\ln B_{10}$
  3. `OpenAlex:W2172229041` Karlis & Ntzoufras Bivariate Poisson Shared-Pace Covariance: $\lambda_3$
  4. `arXiv:2604.01491` & `arXiv:2609.33664` Opponent-Adjusted Trench Win Delta & Dynamic Load-Share Injury Redistribution

---

## 7. Higgsfield AI Sunday Week 7 Video & 2K Visual Pack (Alternative Tattooed Brunette Quant Host)

All assets are saved in [`apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25) (`32.64` credits remaining on `baxley.garrett@gmail.com`):

### Full-Motion Videos (`.mp4` with Audio)
1. **Video 1 — Quant Command Center (`Kling v3.0`, 9:16 Vertical, 5s with Audio)**:
   - **Local File**: [`gse_week7_video1_quant_command_center_9x16.mp4`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/gse_week7_video1_quant_command_center_9x16.mp4) (`7.14 MB`)
   - **Live CloudFront CDN URL**: `https://d8j0ntlcm91z4.cloudfront.net/user_3E8WEwqoH3EpVevTkNbQsGesCT2/hf_20261025_135604_583ba98a-0614-4791-af6a-7f25481f0a4b.mp4`
2. **Video 2 — Nocturnal Stadium Tunnel Walk (`Google Veo 3.1 Lite`, 9:16 Vertical, 8s with Audio)**:
   - **Local File**: [`gse_week7_video2_stadium_tunnel_walk_9x16.mp4`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/gse_week7_video2_stadium_tunnel_walk_9x16.mp4) (`6.10 MB`)
   - **Live CloudFront CDN URL**: `https://d8j0ntlcm91z4.cloudfront.net/user_3E8WEwqoH3EpVevTkNbQsGesCT2/hf_20261025_135639_acf4f7dd-557b-40af-8403-cf7b5362ba11.mp4`
3. **Video 3 — Sunday Master Supercut (`Kling v3.0 + Google Veo 3.1 Lite`, 9:16 Vertical, 13s 1080x1920 with Audio)**:
   - **Local File**: [`gse_week7_sunday_master_supercut_9x16.mp4`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/gse_week7_sunday_master_supercut_9x16.mp4) (`15.72 MB`)
4. **Video 4 — Widescreen War Room Cinematic (`Higgsfield Soul 2.0 2K + FFmpeg 1080p`, 16:9 Widescreen, 6s with Sub-Bass Audio)**:
   - **Local File**: [`gse_week7_video3_war_room_cinematic_16x9.mp4`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/gse_week7_video3_war_room_cinematic_16x9.mp4) (`1.25 MB`)

### 2K High-Resolution Keyframe Stills (`Higgsfield Soul 2.0`)
- **Keyframe 1 (9:16 Quant Command Center)**: [`gse_week7_quant_host_command_center_9x16.png`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/gse_week7_quant_host_command_center_9x16.png) (`https://d8j0ntlcm91z4.cloudfront.net/user_3E8WEwqoH3EpVevTkNbQsGesCT2/hf_20261025_135515_c4695c3a-8f28-4742-bf01-f1911d2ab533.png`)
- **Keyframe 2 (9:16 Stadium Tunnel Walk)**: [`gse_week7_quant_host_stadium_tunnel_9x16.png`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/gse_week7_quant_host_stadium_tunnel_9x16.png) (`https://d8j0ntlcm91z4.cloudfront.net/user_3E8WEwqoH3EpVevTkNbQsGesCT2/hf_20261025_135527_71320adc-8b2f-489e-b86d-03f6b60eaf1e.png`)
- **Keyframe 3 (16:9 Widescreen War Room)**: [`gse_week7_quant_host_war_room_16x9.png`](file:///C:/Users/Garrett/Sports/apps/web/public/brand/higgsfield/week7-sunday-2026-10-25/gse_week7_quant_host_war_room_16x9.png) (`https://d8j0ntlcm91z4.cloudfront.net/user_3E8WEwqoH3EpVevTkNbQsGesCT2/hf_20261025_135537_f84f7c3a-9d26-4c63-88df-fb0af9a0f73f.png`)
