# NFL Week 10 Sunday-Monday 360-Degree Verified Call Sheet (2026-11-15)

> **RELEASE STATUS: HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER (publishAllowed: false) -- WIRE-FIRST INTERNAL CALIBRATION & VERIFICATION ONLY.**

- **Generated (UTC):** `2026-11-15T13:22:41.798554+00:00`
- **Slate Coverage:** 13/13 (`all_green: True`)
- **Master Packet SHA-256 (`slate_packet_sha256`):** `3f3c0b0eb4feff196730862b20a11565ac76f95f3ba90d31a4e40dfe484cf139`
- **Opening Kickoff:** `NE @ DET` Munich (`08:30 AM CST` / `14:30 UTC`)

> **Stage-5 Live Pricing & WIRE-FIRST Gate Notice:** All 13 Week 10 matchups are evaluated directly against live ESPN/DraftKings spreads, totals, and moneylines (`6` game lines per matchup) with de-vigged market implied probabilities. Every board currently carries `0` two-sided player-prop prices (`props_with_two_sided_prices: 0`), triggering `STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES` across all props, while `WIRE_FIRST_CALIBRATION_HOLD` (`CALIBRATION_ADJUSTMENTS_ENABLED != true`) forces `decision: PASS`, `publishAllowed: false`, and `0.0u` recommended stake across all game lines.

## Ledger Governance & Historical Dual-Panel Reference

- **Active Season Ledger of Record (`/record`):** `79-46-0` (`+81.47u` across `75` covered priced picks; `53/200` CLV-backed settled plays toward the 200-play win-rate display gate; win-rate percentage remains suppressed until `200` settled CLV-backed plays) per `apps/web/lib/ledger/verified-ledger.json`. Pipeline aggregate (`withSettlementEvents: 4,222`): `2,212-1,835-31` (`4,078` settled, `-295.23u` across `3,354` covered priced picks).
- **Archival Diagnostic Checkpoints (Non-Standing Context Only):** Inside internal Stage-5 audit telemetry, two non-standing diagnostic denominators remain anchored purely for regression tracking: (1) Panel A legacy heuristic replay sample (`15,947` settled legacy picks, `8,404-7,543`, ROI `-0.0548`, Brier `0.2484` -- documenting why heuristic book scoring was replaced), and (2) archival pre-Week-8 `16-5` baseline checkpoint (Wilson 95pct CI `[0.5491, 0.8937]` -- superseded by `/record`).

## 1. Full 13-Game Executive Slate Table (`NE @ DET` Munich First)

| Matchup | Kickoff | Confirmed QB1s | Model Mean (Away - Home) | Model Total | Live Market (ESPN/DK) | 360 Props / Markets | Stage-5 Status |
|---|---|---|---|---|---|---|---|
| **NE @ DET** | 8:30 AM CST (Munich) | Drake Maye / Jared Goff | NE 23.76 - DET 28.52 | 52.28 | DET -2.5 (-120) / O/U 50.5 (-115/-105); ML +120/-142 | 53 / 77 | PASS (0 BETS / publishAllowed: false) |
| **BUF @ NYJ** | 12:00 PM CST | Josh Allen / Geno Smith | BUF 33.08 - NYJ 18.94 | 52.02 | NYJ +8.5 (-115) / O/U 50.5 (-115/-105); ML -470/+360 | 62 / 77 | PASS [WIRE_FIRST_HOLD: BUF -8.5 (-105, p=0.6517 vs mkt=0.4892, edge=+0.1625, conf 70/100)] (publishAllowed: false) |
| **CAR @ NO** | 12:00 PM CST | Bryce Young / Tyler Shough | CAR 21.68 - NO 21.33 | 43.01 | NO -1.5 (-105) / O/U 48.5 (-118/-102); ML -102/-118 | 65 / 77 | PASS [WIRE_FIRST_HOLD: Under 48.5 (-102, p=0.6377 vs mkt=0.4826, edge=+0.1551, conf 69/100)] (publishAllowed: false) |
| **HOU @ CLE** | 12:00 PM CST | C.J. Stroud / Deshaun Watson (sim QB1; DFS ban retained) | HOU 24.82 - CLE 15.63 | 40.45 | CLE +4.5 (-108) / O/U 40.5 (-112/-108); ML -225/+185 | 56 / 77 | PASS [WIRE_FIRST_HOLD: HOU -4.5 (-112, p=0.6347 vs mkt=0.5043, edge=+0.1304, conf 66/100)] (publishAllowed: false) |
| **JAX @ TEN** | 12:00 PM CST | Trevor Lawrence / Cam Ward | JAX 29.04 - TEN 14.40 | 43.44 | TEN +10.5 (-105) / O/U 46.5 (-110/-110); ML -750/+525 | 63 / 77 | PASS [WIRE_FIRST_HOLD: JAX -10.5 (-115, p=0.6609 vs mkt=0.5108, edge=+0.1501, conf 68/100)] (publishAllowed: false) |
| **KC @ ATL** | 12:00 PM CST | Patrick Mahomes / Michael Penix Jr. | KC 27.64 - ATL 20.34 | 47.98 | ATL +3.0 (-102) / O/U 47.5 (-105/-115); ML -180/+150 | 59 / 77 | PASS [WIRE_FIRST_HOLD: KC -3.0 (-118, p=0.6434 vs mkt=0.5174, edge=+0.1260, conf 65/100)] (publishAllowed: false) |
| **MIA @ IND** | 12:00 PM CST | Kyle McCord / Daniel Jones | MIA 15.48 - IND 20.61 | 36.09 | IND -4.5 (-110) / O/U 37.5 (-110/-110); ML +185/-225 | 58 / 77 | PASS (0 BETS / publishAllowed: false) |
| **MIN @ GB** | 12:00 PM CST | Kirk Cousins / Jordan Love | MIN 22.78 - GB 23.53 | 46.31 | GB -2.5 (-120) / O/U 42.5 (-105/-115); ML +124/-148 | 53 / 77 | PASS (0 BETS / publishAllowed: false) |
| **LAR @ ARI** | 3:05 PM CST | Matthew Stafford / Carson Beck | LAR 25.04 - ARI 14.99 | 40.03 | ARI +9.5 (-108) / O/U 38.5 (-108/-112); ML -485/+370 | 67 / 77 | PASS (0 BETS / publishAllowed: false) |
| **SEA @ LV** | 3:05 PM CST | Drew Lock / Fernando Mendoza | SEA 22.86 - LV 16.40 | 39.26 | LV +6.5 (-110) / O/U 40.5 (-108/-112); ML -290/+235 | 59 / 77 | PASS (0 BETS / publishAllowed: false) |
| **SF @ DAL** | 3:25 PM CST | Brock Purdy / Dak Prescott | SF 32.28 - DAL 23.45 | 55.73 | DAL +4.5 (-112) / O/U 55.5 (-118/-102); ML -218/+180 | 58 / 77 | PASS (0 BETS / publishAllowed: false) |
| **PIT @ CIN** | 7:20 PM CST (SNF) | Aaron Rodgers / Joe Burrow | PIT 21.33 - CIN 29.34 | 50.67 | CIN -3.5 (-108) / O/U 49.5 (-105/-115); ML +154/-185 | 65 / 77 | PASS [WIRE_FIRST_HOLD: CIN -3.5 (-108, p=0.6526 vs mkt=0.4957, edge=+0.1569, conf 69/100)] (publishAllowed: false) |
| **LAC @ BAL** | 7:15 PM CST Mon (MNF) | Justin Herbert / Jacoby Brissett | LAC 16.87 - BAL 27.17 | 44.04 | BAL -4.5 (-108) / O/U 38.5 (-110/-110); ML +185/-225 | 55 / 70 | PASS [WIRE_FIRST_HOLD: BAL -4.5 (-108, p=0.6855 vs mkt=0.4957, edge=+0.1898, conf 72/100); Over 38.5 (-110, p=0.6786 vs mkt=0.5000, edge=+0.1786, conf 71/100); BAL ML (-225, p=0.7875 vs mkt=0.6636, edge=+0.1239, conf 65/100)] (publishAllowed: false) |

## 2. Cryptographic 6-Stage Receipt Lineage (`Stage 0 -> Stage 5`)

| Matchup | `master_bundle_sha256` | `stage0` | `stage1a` | `stage1b` | `stage2` | `stage3_4` | `stage5` |
|---|---|---|---|---|---|---|---|
| NE @ DET | `4ac8f22658ad36f1` | `defc50b661` | `e6bea98dd9` | `18464c3383` | `a1ef50a446` | `ed2fb8a7a7` | `56483b1b84` |
| BUF @ NYJ | `b5a7b30ef6a23b36` | `f18e4d6a0d` | `f12ddf6cb9` | `3be2d54a80` | `17bac8b867` | `66ecdd21d4` | `0125034d27` |
| CAR @ NO | `9e43c976b8fe2660` | `3ccc760f8f` | `d1268ee3e4` | `0df31ad087` | `78b2587ae3` | `7d4ecd6f81` | `b3f27e88ab` |
| HOU @ CLE | `83cecb6ac998de37` | `570c1cff34` | `bc349840b6` | `179aae30f5` | `2cc8056da3` | `557217852c` | `a41f8d9464` |
| JAX @ TEN | `c38f338665667462` | `d31529ef2e` | `056fff4557` | `89ea514127` | `41b1f3f23d` | `23fd5a376e` | `f596c9aeac` |
| KC @ ATL | `00f5e3b297dcb345` | `1be69ff1f8` | `2f7ad3efe5` | `5d110ccd49` | `eb3440cd15` | `55fd9f7488` | `32b1fc8db3` |
| MIA @ IND | `a438d2e0004a9f03` | `fc449af0e5` | `fd27383140` | `517fa3f90f` | `61677dc3b4` | `b7b1a0f2b3` | `a69d7193dc` |
| MIN @ GB | `7190e66a7b936495` | `8a7d23e41c` | `776c5a4843` | `c7fe2703b2` | `ae270a32a1` | `1605b1adf4` | `7d3f9eb36f` |
| LAR @ ARI | `84778098c02a0c52` | `c1d9ddc9e5` | `723888730b` | `1bed2bbbf1` | `0b22b7941d` | `19e673291b` | `7e9d8a36ec` |
| SEA @ LV | `c42e9c4343709de1` | `4db17fc563` | `d15745455a` | `145216c37b` | `86e499f8e5` | `0e3a318b65` | `a9264cacc4` |
| SF @ DAL | `ed955577efcd3957` | `9e4ae135d9` | `5abaa0d614` | `26818b6dd0` | `7c91417dfb` | `7ba7b91c09` | `49e3452d56` |
| PIT @ CIN | `a29d651adb48c73b` | `1936d92a68` | `d8f785743a` | `41ec5db79b` | `de08116b84` | `91dfa3ba77` | `2fb63ab6f9` |
| LAC @ BAL | `5d7f0443129d591b` | `b88c36ca5d` | `8ab5e99e98` | `2bb533389b` | `04676991c1` | `5b01f7b068` | `1e495c93ff` |

## 3. Opening Slate Spotlight: `NE @ DET` (Munich, 08:30 AM CST)

- **Full Dossier SHA (`master_bundle_sha256`):** `4ac8f22658ad36f1a17ff59e2ad3fcbaf77ed5a2082141772b98169c5071ce82` (`data/engine/connected_workflow_dossier_ne_det_week10.json`)
- **Venue & Weather:** `FC Bayern Munich Stadium (Allianz Arena)` (`neutral_site: True`, `is_indoor: False`, `grass`), `46.0 F`, `6.0 mph` wind, `15pct` precip prob, `6h` circadian travel.
- **Post-Sim Team Means:** NE `23.76` - DET `28.52` (Mean Total `52.28` | Pass/Rush NE `275.1`/`81.8`, DET `285.0`/`120.8`).
- **Live ESPN/DK Market:** `NE +2.5` (+100) / `DET -2.5` (-120), O/U `50.5` (O `-115` / U `-105`), ML NE `+120` / DET `-142`.
- **Stage-5 Verdict:** `0 BETS / FULL-BOARD PASS (publishAllowed: false)` (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`).
- **Stage-5 Game-Line Evaluations (Held Internal):** `NE +2.5` (+100): post-sim `0.4597` vs mkt `0.4783`, edge `-0.0186`, conf `51/100` -> `PASS`; `DET -2.5` (-120): post-sim `0.5403` vs mkt `0.5217`, edge `+0.0186`, conf `52/100` -> `PASS`; `Over 50.5` (-115): post-sim `0.5710` vs mkt `0.5108`, edge `+0.0602`, conf `57/100` -> `PASS`; `Under 50.5` (-105): post-sim `0.4290` vs mkt `0.4892`, edge `-0.0602`, conf `51/100` -> `PASS`; `NE ML` (+120): post-sim `0.3707` vs mkt `0.4365`, edge `-0.0658`, conf `51/100` -> `PASS`; `DET ML` (-142): post-sim `0.6293` vs mkt `0.5635`, edge `+0.0658`, conf `58/100` -> `PASS`
- **Active Injury Decoy Blocks (`extract_active_decoy_keys`):** `0` blocked (`CLEAR_NORMAL_ROLE` entries cleared).

### Top `NE @ DET` Conserved Skill, Kicking & IDP Projections

| Player | Team | Pos | Key Projected Means |
|---|---|---|---|
| Jared Goff | DET | QB | Pass Yds 285.00, Pass TD 2.02, INT 0.88, Rush Yds 22.81, Car 5.30 |
| Drake Maye | NE | QB | Pass Yds 275.12, Pass TD 1.81, INT 1.01, Rush Yds 14.99, Car 5.02 |
| Jahmyr Gibbs | DET | RB | Rush Yds 79.39, Car 17.19, Rec 4.95, Rec Yds 49.04, TD 1.08 |
| Corey Kiner | NE | RB | Rush Yds 16.43, Car 3.85, Rec 1.19, Rec Yds 4.97, TD 0.23 |
| Sione Vaki | DET | RB | Rush Yds 13.57, Car 3.95, Rec 0.84, Rec Yds 6.76, TD 0.16 |
| Amon-Ra St. Brown | DET | WR | Rec 5.69, Rec Yds 78.35, Rec TD 0.56, Rush Yds 2.79 |
| A.J. Brown | NE | WR | Rec 4.34, Rec Yds 50.62, Rec TD 0.33, Rush Yds 1.61 |
| Jameson Williams | DET | WR | Rec 3.02, Rec Yds 47.36, Rec TD 0.34, Rush Yds 2.65 |
| Mack Hollins | NE | WR | Rec 2.89, Rec Yds 38.83, Rec TD 0.26, Rush Yds 1.67 |
| DeMario Douglas | NE | WR | Rec 3.35, Rec Yds 38.08, Rec TD 0.25, Rush Yds 1.64 |
| Romeo Doubs | NE | WR | Rec 2.00, Rec Yds 32.01, Rec TD 0.21, Rush Yds 1.71 |
| Isaac TeSlaa | DET | WR | Rec 1.71, Rec Yds 27.08, Rec TD 0.19, Rush Yds 2.65 |
| Efton Chism III | NE | WR | Rec 1.78, Rec Yds 19.86, Rec TD 0.14, Rush Yds 1.65 |
| Kyle Williams | NE | WR | Rec 1.13, Rec Yds 16.32, Rec TD 0.11, Rush Yds 1.66 |
| Sam LaPorta | DET | TE | Rec 3.74, Rec Yds 46.97, Rec TD 0.34 |
| Hunter Henry | NE | TE | Rec 3.08, Rec Yds 34.78, Rec TD 0.23 |
| Eli Raridon | NE | TE | Rec 1.75, Rec Yds 21.71, Rec TD 0.14 |
| Brock Wright | DET | TE | Rec 1.56, Rec Yds 12.16, Rec TD 0.08 |
| Jake Bates | DET | PK | Kick Pts 9.48, FG 2.09, PAT 3.21 |
| Andy Borregales | NE | PK | Kick Pts 7.92, FG 1.75, PAT 2.68 |
| Christian Elliss | NE | LB | Tkl+Ast 7.59, Solo 4.26, Ast 3.33, Exp Sacks 0.103, 2026 PBP GP/Sacks 7/1.0 |
| Chuck Clark | DET | S | Tkl+Ast 6.49, Solo 3.56, Ast 2.93, Exp Sacks 0.128, 2026 PBP GP/Sacks 6/1.0 |

## 4. Remaining 12 Matchup Breakdowns (Live ESPN/DK Evaluations)

### BUF @ NYJ (12:00 PM CST)
- **QB1s:** BUF `Josh Allen` vs NYJ `Geno Smith` | **Dossier SHA:** `b5a7b30ef6a23b36`
- **Post-Sim Score & Environment:** BUF `33.08` - NYJ `18.94` (Total `52.02`) | Venue `MetLife Stadium` (`is_indoor: False`, `54.0 F`, `6.0 mph` wind)
- **Live ESPN/DK Market:** `NYJ +8.5` (-115) / O/U `50.5` (O `-115` / U `-105`) / ML -470 vs +360
- **360 Board & Decoy Scope:** `62` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` -- `WIRE_FIRST_CALIBRATION_HOLD` suppresses candidate leans: `BUF -8.5` (-105, sim `0.6517` vs mkt `0.4892`, edge `+0.1625`, conf `70/100`)

### CAR @ NO (12:00 PM CST)
- **QB1s:** CAR `Bryce Young` vs NO `Tyler Shough` | **Dossier SHA:** `9e43c976b8fe2660`
- **Post-Sim Score & Environment:** CAR `21.68` - NO `21.33` (Total `43.01`) | Venue `Caesars Superdome` (`is_indoor: True`, `70.0 F`, `0.0 mph` wind)
- **Live ESPN/DK Market:** `NO -1.5` (-105) / O/U `48.5` (O `-118` / U `-102`) / ML -102 vs -118
- **360 Board & Decoy Scope:** `65` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` -- `WIRE_FIRST_CALIBRATION_HOLD` suppresses candidate leans: `Under 48.5` (-102, sim `0.6377` vs mkt `0.4826`, edge `+0.1551`, conf `69/100`)

### HOU @ CLE (12:00 PM CST)
- **QB1s:** HOU `C.J. Stroud` vs CLE `Deshaun Watson` (`confirmed_qb1` sim starter with DFS ban retained in Stage 0 pools; projected Pass Yds `242.98`, Pass TD `1.00`, INT `0.98`, Rush Yds `7.46`) | **Dossier SHA:** `83cecb6ac998de37`
- **Post-Sim Score & Environment:** HOU `24.82` - CLE `15.63` (Total `40.45`) | Venue `Huntington Bank Field` (`is_indoor: False`, `47.0 F`, `9.0 mph` wind)
- **Live ESPN/DK Market:** `CLE +4.5` (-108) / O/U `40.5` (O `-112` / U `-108`) / ML -225 vs +185
- **360 Board & Decoy Scope:** `56` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` -- `WIRE_FIRST_CALIBRATION_HOLD` suppresses candidate leans: `HOU -4.5` (-112, sim `0.6347` vs mkt `0.5043`, edge `+0.1304`, conf `66/100`)

### JAX @ TEN (12:00 PM CST)
- **QB1s:** JAX `Trevor Lawrence` vs TEN `Cam Ward` | **Dossier SHA:** `c38f338665667462`
- **Post-Sim Score & Environment:** JAX `29.04` - TEN `14.40` (Total `43.44`) | Venue `Nissan Stadium` (`is_indoor: False`, `54.0 F`, `6.0 mph` wind)
- **Live ESPN/DK Market:** `TEN +10.5` (-105) / O/U `46.5` (O `-110` / U `-110`) / ML -750 vs +525
- **360 Board & Decoy Scope:** `63` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` -- `WIRE_FIRST_CALIBRATION_HOLD` suppresses candidate leans: `JAX -10.5` (-115, sim `0.6609` vs mkt `0.5108`, edge `+0.1501`, conf `68/100`)

### KC @ ATL (12:00 PM CST)
- **QB1s:** KC `Patrick Mahomes` vs ATL `Michael Penix Jr.` | **Dossier SHA:** `00f5e3b297dcb345`
- **Post-Sim Score & Environment:** KC `27.64` - ATL `20.34` (Total `47.98`) | Venue `Mercedes-Benz Stadium` (`is_indoor: True`, `70.0 F`, `0.0 mph` wind)
- **Live ESPN/DK Market:** `ATL +3.0` (-102) / O/U `47.5` (O `-105` / U `-115`) / ML -180 vs +150
- **360 Board & Decoy Scope:** `59` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` -- `WIRE_FIRST_CALIBRATION_HOLD` suppresses candidate leans: `KC -3.0` (-118, sim `0.6434` vs mkt `0.5174`, edge `+0.1260`, conf `65/100`)

### MIA @ IND (12:00 PM CST)
- **QB1s:** MIA `Kyle McCord` vs IND `Daniel Jones` | **Dossier SHA:** `a438d2e0004a9f03`
- **Post-Sim Score & Environment:** MIA `15.48` - IND `20.61` (Total `36.09`) | Venue `Lucas Oil Stadium` (`is_indoor: True`, `70.0 F`, `0.0 mph` wind)
- **Live ESPN/DK Market:** `IND -4.5` (-110) / O/U `37.5` (O `-110` / U `-110`) / ML +185 vs -225
- **360 Board & Decoy Scope:** `58` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` across all game lines and props.

### MIN @ GB (12:00 PM CST)
- **QB1s:** MIN `Kirk Cousins` vs GB `Jordan Love` | **Dossier SHA:** `7190e66a7b936495`
- **Post-Sim Score & Environment:** MIN `22.78` - GB `23.53` (Total `46.31`) | Venue `Lambeau Field` (`is_indoor: False`, `54.0 F`, `6.0 mph` wind)
- **Live ESPN/DK Market:** `GB -2.5` (-120) / O/U `42.5` (O `-105` / U `-115`) / ML +124 vs -148
- **360 Board & Decoy Scope:** `53` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` across all game lines and props.

### LAR @ ARI (3:05 PM CST)
- **QB1s:** LAR `Matthew Stafford` vs ARI `Carson Beck` | **Dossier SHA:** `84778098c02a0c52`
- **Post-Sim Score & Environment:** LAR `25.04` - ARI `14.99` (Total `40.03`) | Venue `State Farm Stadium` (`is_indoor: True`, `70.0 F`, `0.0 mph` wind)
- **Live ESPN/DK Market:** `ARI +9.5` (-108) / O/U `38.5` (O `-108` / U `-112`) / ML -485 vs +370
- **360 Board & Decoy Scope:** `67` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` across all game lines and props.

### SEA @ LV (3:05 PM CST)
- **QB1s:** SEA `Drew Lock` vs LV `Fernando Mendoza` | **Dossier SHA:** `c42e9c4343709de1`
- **Post-Sim Score & Environment:** SEA `22.86` - LV `16.40` (Total `39.26`) | Venue `Allegiant Stadium` (`is_indoor: True`, `70.0 F`, `0.0 mph` wind)
- **Live ESPN/DK Market:** `LV +6.5` (-110) / O/U `40.5` (O `-108` / U `-112`) / ML -290 vs +235
- **360 Board & Decoy Scope:** `59` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` across all game lines and props.

### SF @ DAL (3:25 PM CST)
- **QB1s:** SF `Brock Purdy` vs DAL `Dak Prescott` | **Dossier SHA:** `ed955577efcd3957`
- **Post-Sim Score & Environment:** SF `32.28` - DAL `23.45` (Total `55.73`) | Venue `AT&T Stadium` (`is_indoor: True`, `70.0 F`, `0.0 mph` wind)
- **Live ESPN/DK Market:** `DAL +4.5` (-112) / O/U `55.5` (O `-118` / U `-102`) / ML -218 vs +180
- **360 Board & Decoy Scope:** `58` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` across all game lines and props.

### PIT @ CIN (7:20 PM CST (SNF))
- **QB1s:** PIT `Aaron Rodgers` vs CIN `Joe Burrow` | **Dossier SHA:** `a29d651adb48c73b`
- **Post-Sim Score & Environment:** PIT `21.33` - CIN `29.34` (Total `50.67`) | Venue `Paycor Stadium` (`is_indoor: False`, `54.0 F`, `6.0 mph` wind)
- **Live ESPN/DK Market:** `CIN -3.5` (-108) / O/U `49.5` (O `-105` / U `-115`) / ML +154 vs -185
- **360 Board & Decoy Scope:** `65` core props across `77` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` -- `WIRE_FIRST_CALIBRATION_HOLD` suppresses candidate leans: `CIN -3.5` (-108, sim `0.6526` vs mkt `0.4957`, edge `+0.1569`, conf `69/100`)

### LAC @ BAL (7:15 PM CST Mon (MNF))
- **QB1s:** LAC `Justin Herbert` vs BAL `Jacoby Brissett` | **Dossier SHA:** `5d7f0443129d591b`
- **Post-Sim Score & Environment:** LAC `16.87` - BAL `27.17` (Total `44.04`) | Venue `M&T Bank Stadium` (`is_indoor: False`, `54.0 F`, `6.0 mph` wind)
- **Live ESPN/DK Market:** `BAL -4.5` (-108) / O/U `38.5` (O `-110` / U `-110`) / ML +185 vs -225
- **360 Board & Decoy Scope:** `55` core props across `70` market types; `0` two-sided prop prices (`STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES`); Decoy blocks: `0` blocked (`None`).
- **Stage-5 Verdict (`publishAllowed: false`):** `PASS` -- `WIRE_FIRST_CALIBRATION_HOLD` suppresses candidate leans: `BAL -4.5` (-108, sim `0.6855` vs mkt `0.4957`, edge `+0.1898`, conf `72/100`); `Over 38.5` (-110, sim `0.6786` vs mkt `0.5000`, edge `+0.1786`, conf `71/100`); `BAL ML` (-225, sim `0.7875` vs mkt `0.6636`, edge `+0.1239`, conf `65/100`)
