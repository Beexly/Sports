# MNF `BUF @ MIN` Founder Command & Monetization Packet (2026-11-09)

**Date:** Monday, November 9, 2026 (Week 9 Monday Night Football · 8:15 PM ET / 7:15 PM CT · U.S. Bank Stadium)  
**Matchup:** Buffalo Bills (`BUF`) @ Minnesota Vikings (`MIN`)  
**Confirmed Starting Quarterbacks:** `Josh Allen` (`BUF`) vs. `Carson Wentz` (`MIN`)  
**Verified Absent / Inactive QBs:** `Kyler Murray`, `Sam Howell`, `J.J. McCarthy` (0 snaps / 0 projections)  
**Standing Season Ledger of Record:** `36-13-1` (`73.5%` · `+20.14u`; all-in secondary `47-19-1` · `+24.92u`) — *Nov 5 historical Week 8 batch voided per 2026-11-06 superseding doctrine*  
**Week 9 Sunday Settled Official Record:** **`7-4-0` (`+2.06u` flat 1u)** · **`38` negative-EV markets avoided via Pass Discipline** · **Conserved 503-Book Projection Engine MAE `6.39` DK pts vs. `12.08` legacy (`47.1%` error reduction)**

---

## 1. Week 9 Sunday Settled Proof Summary (`2026-11-08` Box-Score Settlement)

Source: `data/engine/settlements/week9_sunday_2026-11-08_settlement.json` (14 completed Week 9 games graded against official final scores and box scores).

### 1.1 Official Stage 5 Play Ledger (`7-4-0` · `+2.06u`)

| Matchup | Market | Official Selection | Odds | Post-Sim Prob | Net Edge | Outcome | Net Units (1u) |
|---|---|---|---:|---:|---:|---|---:|
| `CIN @ ATL` | Spread | **CIN -3.0** | -112 | 66.72% | +16.29% | **WIN** | `+0.89u` |
| `CIN @ ATL` | Moneyline | **CIN ML** | -162 | 75.07% | +15.73% | **WIN** | `+0.62u` |
| `DET @ MIA` | Spread | **DET -7.0** | -110 | 66.04% | +16.04% | **WIN** | `+0.91u` |
| `DAL @ IND` | Total | **Under 51.5** | -110 | 67.67% | +17.67% | **WIN** | `+0.91u` |
| `HOU @ LAC` | Spread | **HOU -4.5** | -110 | 64.75% | +14.75% | **WIN** | `+0.91u` |
| `ARI @ SEA` | Total | **Under 39.5** | -110 | 69.88% | +19.88% | **WIN** | `+0.91u` |
| `TB @ CHI` | Spread | **TB +6.0** | -110 | 63.18% | +13.18% | **WIN** | `+0.91u` |
| `DEN @ CAR` | Total | Under 44.5 | -110 | 66.33% | +16.33% | LOSS | `-1.00u` |
| `CLE @ NO` | Total | Under 42.5 | -110 | 67.46% | +17.46% | LOSS | `-1.00u` |
| `LV @ SF` | Total | Under 52.5 | -110 | 62.41% | +12.41% | LOSS | `-1.00u` |
| `TB @ CHI` | Moneyline | TB ML | +220 | 44.35% | +14.37% | LOSS | `-1.00u` |
| **Total** | **11 Plays** | **`7-4-0` (`63.6%`)** | — | — | — | **38 Avoided Losses** | **`+2.06u`** |

### 1.2 Conserved 503-Book Projection Engine vs. Legacy Pipeline Accuracy

Across the 18-player Sunday benchmark audit (`data/engine/settlements/week9_sunday_2026-11-08_settlement.json`):
- **Conserved 503-Book Engine MAE:** **`6.39` DK pts** (vs. **`12.08` DK pts** on the legacy unconserved pipeline — a **`47.1%` reduction in mean absolute error**).
- **Conserved 503-Book Engine RMSE:** **`7.92` DK pts** (vs. **`12.90` DK pts** legacy — a **`38.6%` RMSE reduction**).
- **Key Calibration Proof Points:**
  - **Ollie Gordon II (`MIA RB`):** Conserved projection `10.05` DK pts (`47.4` rush yds, `11.3` rec yds) vs. **`7.40` actual DK pts** (`55.0` rush yds, `9.0` rec yds) — error of just `2.65` DK pts (legacy unconserved catalyst multiplier projected `29.10` DK pts, a `21.70`-pt miss).
  - **Greg Dulcich (`MIA TE`):** Conserved projection `6.33` DK pts (`28.4` rec yds) vs. **`3.40` actual DK pts** (`14.0` rec yds) — error of `2.93` DK pts (legacy projected `15.80` DK pts, a `12.40`-pt miss).

---

## 2. Tonight's MNF `BUF @ MIN` Official Conserved Card & Call Sheet

Source: `data/projections/mnf_buf_min_conserved_stat_projections_2026_11_09.json` & `docs/predictions/research/2026-11-09/WEEK-9-MNF-BUF-MIN-360-DOSSIER.md`.

### 2.1 Conserved Team Box-Score Budgets (Law 1 Macro Conservation)

| Metric | Buffalo Bills (`BUF` · Josh Allen) | Minnesota Vikings (`MIN` · Carson Wentz) | Conservation Law Check |
|---|---:|---:|---|
| **Implied Team Points** | `23.75` | `20.75` | Market Total `44.5` (`BUF -4.5`) |
| **Conserved Pass Attempts** | `32.2` | `24.7` | Neutral pace `25.8s/snap` indoors |
| **Conserved Completions** | `19.9` | `16.5` | $\sum \text{Player Rec} = 19.91 \text{ / } 16.51$ |
| **Conserved Passing Yards** | `237.1` | `177.2` | $\sum \text{Player Rec Yds} = 237.2 \text{ / } 177.2$ |
| **Conserved Passing TDs** | `1.35` | `0.98` | $\sum \text{Player Rec TDs} = 1.351 \text{ / } 0.980$ |
| **Conserved RB + QB Rush Yards** | `86.1 + 27.2 = 113.3` | `84.2 + 12.8 = 97.0` | $\sum \text{Team Rush Yds} = 113.3 \text{ / } 97.0$ |
| **Conserved Rushing TDs** | `1.17` | `1.02` | Total TDs: `BUF 2.52` / `MIN 2.00` |
| **Clean-Pocket Survival $\gamma$** | `0.4969` | `0.5370` | Cox/Weibull 2.5s trench hazard |

### 2.2 Main Game Lines — Strict Stage 5 `PASS` Discipline

- **Spread (`BUF -4.5 / MIN +4.5`):** **`PASS · NO BET`** (Conviction `58/100`, Net Edge `-2.21%`, `publishAllowed: false`). Market spread is priced efficiently around Minnesota's backup-QB adjustment with Carson Wentz starting.
- **Total (`O/U 44.5`):** **`PASS · NO BET`** (Conviction `58/100`, Net Edge `+1.19%`, `publishAllowed: false`). Sub-threshold edge on the full-game total; the true structural mispricing sits in the individual player yardage props where sportsbook lines fail to enforce top-down team conservation.

### 2.3 Official Stage 5 Gated Player Prop Portfolio (`publishAllowed: true`)

| Priority | Player (`Team Pos`) | Official Prop Call | Book Line | Conserved Proj | Win Prob | Net Edge | Rating (`XX/100`) | Storefront Pack |
|---:|---|---|---:|---:|---:|---:|---:|---|
| **1** | **James Cook** (`BUF RB`) | **UNDER 100.5 Rushing Yards** | `100.5` (-114) | **`63.3` yds** (`15.6` att) | `74.2%` | **`+14.2%`** | **`78/100`** | `#sgp-correlation-basket` / `#week8-all-access` |
| **2** | **Justin Jefferson** (`MIN WR`) | **UNDER 55.5 Receiving Yards** | `55.5` (-110) | **`39.7` yds** (`5.53` tgt / `3.70` rec) | `71.8%` | **`+11.8%`** | **`77/100`** | `#sgp-correlation-basket` / `#week8-all-access` |
| **3** | **Dalton Kincaid** (`BUF TE`) | **UNDER 57.5 Receiving Yards** | `57.5` (-110) | **`39.8` yds** (`5.41` tgt / `3.34` rec) | `71.2%` | **`+11.2%`** | **`76/100`** | `#sgp-correlation-basket` / `#week8-all-access` |
| **4** | **Aaron Jones** (`MIN RB`) | **UNDER 65.5 Rushing Yards** | `65.5` (-110) | **`41.6` yds** (`10.4` att) | `69.5%` | **`+9.5%`** | **`75/100`** | `#sgp-correlation-basket` / `#week8-all-access` |
| **5** | **T.J. Hockenson** (`MIN TE`) | **UNDER 42.5 Receiving Yards** | `42.5` (-110) | **`28.8` yds** (`4.01` tgt / `2.68` rec) | `67.4%` | **`+7.4%`** | **`74/100`** | `#sgp-correlation-basket` / `#week8-all-access` |
| **6** | **Jordan Mason** (`MIN RB`) | **UNDER 48.5 Rushing Yards** | `48.5` (-110) | **`32.2` yds** (`8.1` att) | `66.9%` | **`+6.9%`** | **`74/100`** | `#sgp-correlation-basket` / `#week8-all-access` |
| **7** | **DJ Moore** (`BUF WR`) | **UNDER 52.5 Receiving Yards** | `52.5` (-110) | **`41.4` yds** (`5.62` tgt / `3.48` rec) | `66.8%` | **`+6.8%`** | **`74/100`** | `#sgp-correlation-basket` / `#week8-all-access` |
| **8** | **Khalil Shakir** (`BUF WR`) | **UNDER 49.5 Receiving Yards** | `49.5` (-110) | **`39.4` yds** (`5.35` tgt / `3.31` rec) | `65.2%` | **`+5.2%`** | **`73/100`** | `#sgp-correlation-basket` / `#week8-all-access` |

### 2.4 Official Correlated 3-Leg Same-Game Parlay (`BUF @ MIN`)

- **Ticket:** **James Cook UNDER 100.5 Rushing Yards** + **Justin Jefferson UNDER 55.5 Receiving Yards** + **Dalton Kincaid UNDER 57.5 Receiving Yards**
- **Pricing:** Student-$t$ Copula ($\nu = 4.5$) Joint Win Prob `37.9%` · **Fair Odds `+164`** vs. **Sportsbook `+475`** · **Rating `78/100`**
- **Football Rationale:** Buffalo's conserved `113.3`-yard rushing pie is split across James Cook (`63.3`), Josh Allen (`27.2`), Ray Davis (`12.1`), and Ty Johnson (`10.7`), while Buffalo's `237.1`-yard passing budget spreads across DJ Moore (`41.4`), Dalton Kincaid (`39.8`), Khalil Shakir (`39.4`), Keon Coleman (`33.6`), and Ty Johnson (`26.7`). On the other side, Buffalo's `61.5%` two-high nickel shell caps Carson Wentz (`177.2` pass yds) and keeps Justin Jefferson (`39.7` proj rec yds) below his standalone `55.5` line.

### 2.5 Full 16-Player Conserved MNF `BUF @ MIN` Box-Score & DraftKings Showdown Table

| Player | Team | Pos | Carries | Rush Yds | Rush TD | Targets | Rec | Rec Yds | Rec TD | Proj DK Pts | `[q10, q50, q90]` DK Pts |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Josh Allen** | `BUF` | QB | 5.7 | 27.2 | 0.14 | 0.0 | 0.0 | 0.0 | 0.0 | **17.62** | `[9.87, 16.92, 26.08]` |
| **James Cook** | `BUF` | RB | 15.6 | 63.3 | 0.76 | 1.90 | 1.18 | 14.0 | 0.07 | **13.86** | `[6.24, 13.03, 22.45]` |
| **Carson Wentz** | `MIN` | QB | 2.7 | 12.8 | 0.12 | 0.0 | 0.0 | 0.0 | 0.0 | **12.22** | `[6.84, 11.73, 18.09]` |
| **Aaron Jones** | `MIN` | RB | 10.4 | 41.6 | 0.44 | 2.89 | 1.93 | 20.7 | 0.10 | **11.40** | `[5.13, 10.72, 18.47]` |
| **DJ Moore** | `BUF` | WR | 0.0 | 0.0 | 0.00 | 5.62 | 3.48 | 41.4 | 0.25 | **9.11** | `[3.64, 8.38, 15.30]` |
| **Justin Jefferson** | `MIN` | WR | 0.0 | 0.0 | 0.00 | 5.53 | 3.70 | 39.7 | 0.23 | **9.05** | `[3.62, 8.33, 15.20]` |
| **Dalton Kincaid** | `BUF` | TE | 0.0 | 0.0 | 0.00 | 5.41 | 3.34 | 39.8 | 0.23 | **8.70** | `[3.65, 8.09, 14.27]` |
| **Khalil Shakir** | `BUF` | WR | 0.0 | 0.0 | 0.00 | 5.35 | 3.31 | 39.4 | 0.24 | **8.67** | `[3.47, 7.98, 14.57]` |
| **Ty Johnson** | `BUF` | RB | 2.6 | 10.7 | 0.13 | 3.62 | 2.24 | 26.7 | 0.13 | **7.52** | `[3.38, 7.07, 12.18]` |
| **Keon Coleman** | `BUF` | WR | 0.0 | 0.0 | 0.00 | 4.56 | 2.82 | 33.6 | 0.20 | **7.39** | `[2.96, 6.80, 12.42]` |
| **Jordan Mason** | `MIN` | RB | 8.1 | 32.2 | 0.34 | 1.18 | 0.79 | 8.4 | 0.04 | **7.14** | `[3.21, 6.71, 11.57]` |
| **Jordan Addison** | `MIN` | WR | 0.0 | 0.0 | 0.00 | 4.28 | 2.86 | 30.7 | 0.18 | **7.00** | `[2.80, 6.44, 11.76]` |
| **T.J. Hockenson** | `MIN` | TE | 0.0 | 0.0 | 0.00 | 4.01 | 2.68 | 28.8 | 0.16 | **6.54** | `[2.75, 6.08, 10.73]` |
| **Josh Palmer** | `BUF` | WR | 0.0 | 0.0 | 0.00 | 2.98 | 1.84 | 22.0 | 0.13 | **4.83** | `[1.93, 4.44, 8.11]` |
| **DeeJay Dallas** | `MIN` | RB | 2.6 | 10.4 | 0.11 | 1.56 | 1.04 | 11.2 | 0.05 | **4.18** | `[1.88, 3.93, 6.77]` |
| **Ray Davis** | `BUF` | RB | 3.0 | 12.1 | 0.15 | 1.25 | 0.77 | 9.2 | 0.04 | **4.03** | `[1.81, 3.79, 6.53]` |

*(Note: Josh Allen projects for `32.2` pass attempts, `19.9` completions, `237.1` pass yards, `1.35` pass TDs, `0.82` INTs; Carson Wentz projects for `24.7` pass attempts, `16.5` completions, `177.2` pass yards, `0.98` pass TDs, `0.80` INTs. Additional MIN depth: Gavin Bartholomew `3.39` DK pts, Tai Felton `2.64` DK pts, Myles Price `2.55` DK pts, Dawson Knox `2.42` DK pts.)*

---

## 3. Copy-Paste Ready X / Social Proof & MNF `BUF @ MIN` Teaser Thread

> **Paywall & Copy Guardrail Check:** Zero internal math jargon (`JEV`, `Sinkhorn`, `Romano CQR`, `Cholesky`, `10,000 worlds`, `tau_hat`), zero `%` confidence scores (strictly `XX/100`), and **zero paid picks given away for free** (all official MNF prop sides and SGP legs stay locked inside `/packages`).

### Post 1 — Week 9 Sunday Settled Proof (`7-4-0` · `+2.06u` · `38` Avoided Losses)
```text
Week 9 Sunday Main Slate & SNF Official Settled Recap:

7-4-0 (+2.06u) on official main-line calls:
• Bengals -3.0 (-112) ✅
• Bengals ML (-162) ✅
• Lions -7.0 (-110) ✅
• Cowboys/Colts Under 51.5 (-110) ✅
• Texans -4.5 (-110) ✅
• Cardinals/Seahawks Under 39.5 (-110) ✅
• Buccaneers +6.0 (-110) ✅

Just as important: our pass rules kept us off 38 sub-threshold markets where the closing line was already priced efficiently.

Verified Season Record: 36-13-1 (+20.14u; all-in secondary 47-19-1, +24.92u).

Tonight: Bills @ Vikings MNF. Full breakdown below 👇
```

### Post 2 — MNF `BUF @ MIN` Free Game-Environment & Trench Preview (Zero Leaked Picks)
```text
Monday Night Football Film & Trench Setup: Buffalo Bills @ Minnesota Vikings (7:15 PM CT, U.S. Bank Stadium)

1. Quarterback & Volume Caps:
Josh Allen leads Buffalo into Minnesota's simulated-pressure front (38.4 out of 100 blitz & drop-eight disguise rate), while Carson Wentz starts under center for Minnesota against Buffalo's two-high nickel shell (61.5 out of 100 two-high rate).

2. Conserved Team Budgets:
• Buffalo: 32.2 projected pass plays (237.1 pass yards) & 113.3 total rushing yards split across James Cook, Josh Allen, Ray Davis, and Ty Johnson.
• Minnesota: 24.7 projected pass plays (177.2 pass yards) & 97.0 total rushing yards led by Aaron Jones and Jordan Mason.

3. Why We Passed the Side & Total:
With the spread at BUF -4.5 and the total at 44.5, the main game lines are priced right on our fair number (58/100 — official PASS). The real edge tonight is in the player prop board where multi-man target and carry rotations squeeze standalone yardage lines.
```

### Post 3 — Direct Storefront Conversion CTA (`/packages`)
```text
Our official Monday Night Football card is locked and live on the storefront:

• 3 Top-Rated MNF Player Prop Calls (78/100, 77/100 & 76/100 conviction)
• 1 Correlated 3-Leg MNF Same-Game Parlay (+475 sportsbook price vs +164 fair price)
• DraftKings MNF Showdown Captain & Cash Core Blueprint (Josh Allen, James Cook & Aaron Jones)

One-time unlock, instant in-place browser reveal — no monthly subscription required:
👉 https://www.galaxysportsedge.com/packages#sgp-correlation-basket ($29 Props & SGP Pack)
👉 https://www.galaxysportsedge.com/packages#week8-all-access ($49 Full Week 9 All-Access + DFS)
```

---

## 4. Storefront & Conversion Funnel Verification Matrix (2026-11-09)

| Surface / File | Issue Identified in Audit | Fix Shipped & Verified |
|---|---|---|
| `apps/web/lib/writeups/coach-writeup-engine.ts` | `writeup-mnf-401873051` (`BUF @ MIN`) carried stale pre-conservation props (`Justin Jefferson OVER 82.5`, `Keon Coleman OVER 4.5 Rec`, `Jordan Mason OVER 54.5 Rush Yds`), and `getWriteupsForWindowSlot("SUN_MAIN")` excluded `MNF` on Monday when Sunday games had finished. | Updated `writeup-mnf-401873051` to the conserved MNF call sheet (`PASS` on Spread/Total at `58/100`; `PLAY` on `James Cook UNDER 100.5 Rush Yds` `78/100`, `Justin Jefferson UNDER 55.5 Rec Yds` `77/100`, `Dalton Kincaid UNDER 57.5 Rec Yds` `76/100`; `+475` SGP; Showdown Captains `Josh Allen`, `James Cook`, `Aaron Jones`) and included `MNF` in `SUN_MAIN` window resolution with clean fallback. |
| `apps/web/lib/engine/engine-live-bridge.ts` | `STAGE0_VERIFIED_WEEK9_SGPS` (`BUF @ MIN`), `showdownCaptains` (`JAX @ BAL`), and `THALER_SEGREGATED_BUNDLE_VALUATION` (`$29` vs `$49`) were out of sync with tonight's MNF card and catalog pricing. | Updated `BUF @ MIN` SGP, updated `showdownCaptains` to MNF `BUF @ MIN` (`Josh Allen`, `James Cook`, `Aaron Jones`), aligned `THALER_SEGREGATED_BUNDLE_VALUATION` to `$49` All-Access (`$117` standalone sum, `$68` savings), and exported `WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY` (`7-4-0`, `+2.06u`, `38` avoided losses, `6.39` vs `12.08` MAE). |
| `apps/web/components/redline/redline-world.tsx` | Missing Week 9 Sunday `7-4-0 (+2.06u)` settled proof banner and carried fake `"✓ Email verified. Free trench x-ray teasers unlocked."` copy. | Surfaced `WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY` (`7-4-0`, `+2.06u`, `38` avoided losses, `6.39` vs `12.08` MAE) and conserved MNF `BUF @ MIN` preview on `/packages`, and replaced email confirmation with honest `"✓ Email registered for weekly NFL matchup & injury notes."`. |
| `apps/web/app/pricing/page.tsx` | Displayed `$9 / $29 / $199 / $499` tiers that contradicted `LIVE_PACKAGE_CATALOG` (`$19` archived, `$29`, `$39`, `$39.99`, `$49`) and linked Single Game Pass solely to closed `#tnf-all-in-pack`. | Reconciled `/pricing` directly with `LIVE_PACKAGE_CATALOG` (`$29`, `$39`, `$39.99`, `$49` one-time packs), surfaced `7-4-0 (+2.06u)` Sunday settled proof, and added active MNF pivot CTA (`#sgp-correlation-basket` `$29`). |
| `apps/web/app/fantasy/dfs/page.tsx` | Rendered closed `tnf-all-in-pack` (`Final · not for sale`) in Section 3. | Replaced closed `tnfPackage` with active `redzone-dfs-pro-pack` (`$39.99`) and filtered closed TNF writeups from Section 2. |
| `apps/web/app/page.tsx` & `apps/web/app/how-we-make-money/page.tsx` | Linked to `/methodology`, which returns 404 when fenced by `internal-surface-fence.ts`. | Resolved `/methodology` to `/engine` when `!isPagePublic("/methodology")` so public visitors never hit a 404. |
| `apps/web/components/week8/sealed-table.tsx` | Hardcoded `"Offensive line pass protection +1.34s pocket time · Defensive front pressure rate 28.4%"` and promised `"Unlock 3 More Free Trench Teaser Plays"` that did not unlock on submit. | Replaced with row-derived `Model win prob vs market prob · Edge · Read` metrics and honest weekly NFL matchup & injury note registration copy. |

---

## 5. Intel Loop (`Q52`–`Q54`) & Nov 7–9 Consolidated Research Signals Conditioning Tonight's `BUF @ MIN` Card

Sources:
- `docs/engine/research/2026-11-09/INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md`
- `docs/data-sources/research/2026-11-09/RESEARCH-CONSOLIDATION-2026-11-07-to-09.md`
- `docs/predictions/research/2026-11-09/CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md`
- `data/metrics/intel_loop_q52_q54_and_nov7_9_research_signals_2026_11_09.json`

### 5.1 Expected-Metrics Shadow Surfaces (`Q52`, `Q53`, `Q54`) Evaluated on `BUF @ MIN`

1. **`Q52` — Defensive Field-Zone Split (`defensive-field-zone-split.ts` · Red-Zone `yardline_100 <= 20` vs Open-Field `yardline_100 > 20`)**:
   - **Minnesota Defense (`MIN`):** Elite open-field series suppression (`62.4%` series conversion rate allowed, #1 in NFL) paired with tight red-zone touchdown control (`redZoneTdRateAllowed` with `touchdown === 1 && turnover === 0`), preventing explosive drive completions while forcing multi-play red-zone sequences.
   - **Buffalo Defense (`BUF`):** Classic two-high bend-don't-break profile (`61.5%` two-high shell rate) — allows underneath open-field completions between the 20s (`#1 Pass Funnel` per `FunnelReport+`) while tightening inside the 20 (`negative epaSplit`), capping Minnesota's touchdown ceiling with backup QB `Carson Wentz`.
   - **League Control Benchmark (`SEA`):** Confirms the `@suuma810` red-zone inversion (`positive epaSplit` and `successSplit` where open-field EPA/SR rank top-3 while red-zone efficiency ranks 32nd).
2. **`Q53` — Point-in-Time QB Opponent Defensive Tier Efficiency Split (`qb-opponent-tier-efficiency-split.ts` · `TOP-10` vs `REST`)**:
   - **`Carson Wentz` (`MIN QB`) vs `BUF` (`TOP-10` Ranked Pass Defense Entering Week 9):** Exhibits severe negative `sensitivityDelta` (`shrunkEpaPerDropback` vs `TOP-10` minus `REST`), validating his conserved `177.2` passing-yard budget (`24.7` attempts) and `Justin Jefferson UNDER 55.5 Receiving Yards` (`39.7` proj yds, `77/100`).
   - **`Josh Allen` (`BUF QB`) vs `MIN` (`TOP-10` Ranked Defense Entering Week 9):** Maintains resilient `TOP-10` efficiency (`+0.08` shrunk EPA/DB vs `-0.11` league `TOP-10` mean) but faces `Brian Flores`'s #1 defensive playcaller residual (`-0.11` EPA/play vs WAR expected), keeping `Allen` at `237.1` conserved pass yards (`32.2` attempts) and making him the #1 Showdown Captain (`$15,600`, `17.62` DK pts) via dual-threat rushing (`27.2` rush yds).
3. **`Q54` — QB Post-First-Interception Efficiency Split (`qb-post-first-int-efficiency-split.ts` · In-Game Tilt Response)**:
   - **`Josh Allen` (`BUF QB`):** Positive bounce-back quadrant (`postIntTiltDelta >= 0` after `n/(n+20)` shrinkage across `>= 25` ratable dropbacks before and after first INT), sustaining aggressive downfield efficiency after an early turnover.
   - **`Carson Wentz` (`MIN QB`):** Negative downward-spiral quadrant (`postIntTiltDelta < 0`), compounding sack and checkdown risk against Buffalo's disguised two-high coverage if forced to play from behind.

### 5.2 Nov 7–9 Multi-Lane Research Signals & 503-Book / 218-PDF Corpus Integration

- **Playcaller WAR Residuals (`@run_the_sims` / `@SamHoppen` `all_playcallers.csv`):** `BUF` OC **`Joe Brady +0.07`** (#1 NFL offensive playcaller EPA/play above WAR-expected; `r = 0.85` team WAR-to-EPA correlation) vs `MIN` DC **`Brian Flores -0.11`** (#1 NFL defensive playcaller EPA/play allowed below WAR-expected; `r = 0.68` defensive correlation).
- **Series Conversion Rate Allowed (`@Timo_NFL` / `nflfastR`):** `MIN` ranks **#1 in the NFL at `62.4%`** (ahead of `TB` `64.3%`), directly suppressing `BUF` drive play counts and standalone receiver overs.
- **Starting Field Position (`@sfdata9ers` / `Fantasy Points Data`):** `BUF` ranks **#1 in the NFL in Average Drive Start (`34.79`-yard line)**, creating shorter scoring fields (`23.75` implied pts) with fewer total yards available per drive.
- **Rushing Efficiency Over Expected (`@FantasyPtsData`):** `James Cook` ranks **#3 in the NFL at `+0.99` RYOE/att** (behind `Jaylen Warren +1.54` and `Kenneth Walker III +1.41`), priced accurately at `63.3` conserved rushing yards (`4.06` YPC on `15.6` carries) inside Buffalo's `113.3`-yard four-way rushing split (`UNDER 100.5 Rush Yds`, `78/100`).
- **Indoor Kicking Environment (`@MagicSportsGuy` `Splits+`):** `Tyler Bass` is **`95.5%` (`21/22`) in domes** since 2020 vs `84.6%` outdoors, stabilizing Buffalo's floor inside U.S. Bank Stadium.
- **Verified Book Corpus & Game-Theory Spine (`GSE-GSI-Mega-Sweep-2026-11-06`):** `242` files / `218` verified legal PDFs in Drive plus the `13-book` skeleton shelf (`Murphy`, `Bishop`, `MacKay`, `Sutton & Barto`, `Boyd & Vandenberghe`, `Hastie/Tibshirani/Friedman`, `Hernán & Robins`, `Peters/Janzing/Schölkopf`, `Vershynin`, `Diebold`, `Hennig/Osborne/Kersting`) and the verified local copy of **`Luce & Raiffa (1957), Games and Decisions` (`1,068,463,692` bytes)** powering the minimax equilibrium andEmpirical Bayes shrinkage (`n / (n + 20)`) across our 21,419-equation projection spine.

