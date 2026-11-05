# Master TNF `JAX @ BAL` 360-Degree Call Sheet & Engine Dossier
**Generated:** November 5, 2026  
**Event:** Jacksonville Jaguars at Baltimore Ravens (`Thursday Night Football`, Week 9)  
**Kickoff UTC:** 2026-11-06T01:15:00Z  
**Author / Subagent:** Subagent C (`TNF Master Call-Sheet Dossier & Stage 5 Conjunction Gate Signer`)  

---

## 1. Executive Header & Dual-Panel Verified Record (Full Intellectual Honesty)

### Panel A (Large-Sample Historical Replay Baseline, `n = 15,947`)
- **Historical Replay Win Rate**: `52.70%` (`8,404 Wins – 7,543 Losses`)
- **Realized ROI**: `-5.48%`
- **Brier Score**: `0.2484` (vs `0.2500` coin-flip baseline; Brier Skill Score `+0.0064`)
- **Root Cause of Historical Drag**: Documented juiced-favorite bias in legacy heuristic book-path where high heuristic confidence bands (e.g. 80–89 confidence realizing `41.5%` on $n=130$; 90–99 realizing `31.2%` on $n=32$) inverted against the market's efficient closing odds, whereas the signal-path preserved honesty (60–69 at `57.0%`, 70–79 at `66.0%`, 80–89 at `67.8%`).
- **Effective Breakeven**: `55.58%` implied breakeven across the legacy book-path sample due to heavy juice absorption on heavy favorites.

### Panel B (Official Post-2026-10-29 5-Stage Conjunction-Gated Ledger, `n = 21`)
- **Official New Engine Record**: **`16-5`**
- **Win Rate**: **`76.2%`** (`76.19%`)
- **Net Units**: **`+10.45 Units`** (Flat sizing, standard -110 pricing)
- **95% Wilson Confidence Interval**: **`[54.91%, 89.37%]`** (Rounded: `[54.9%, 89.4%]`)
- **Statistical Significance**: One-sided binomial test $p = 0.0207$ (exact script audit reports $p = 0.0227$) against standard `-110` breakeven (`52.38%`).
- **Sample Target**: Tagged with the $n \ge 250$ enterprise validation sample target. (Note: A sensitivity drop to `15-6` (`71.4%`) places the lower Wilson bound at `50.04%` / `49.79%`, highlighting why strict Conjunction Gate discipline must be maintained).

---

## 2. Mandatory Pre-Simulation Full-Stack Verification Gate & 5-Stage Engine Architecture

### Pre-Simulation Gate Status (`tnf_pre_sim_full_layer_verification_gate_2026_11_05.json`)
- **Gate Result**: `pre_sim_gate_passed: true` (`timestamp: 2026-11-05T19:19:26Z`)
- **Mandatory Pre-Sim Verification**: Verified across all 5 layers **BEFORE** Stage 2 simulation execution:
  1. **Layer 1 (Coaching & Tendencies)**: All 7 coaching intelligence modules (`compute_tendencies.py`, `dc_pressure.py`, `pressure_answer.py`, `proe.py`, `redzone.py`, `script_elasticity.py`, `tempo.py`) verified active and returning successful tensors for JAX and BAL.
  2. **Layer 2 (Injuries & Player GP)**: 2,725 records in `data/nflverse/injuries_2026.csv`. Lamar Jackson confirmed **`OUT`**, Tyler Huntley **`ACTIVE_QB1`**, Joe Fagnano **`ACTIVE_QB2`** (ankle / full practice / no designation; Jacoby Brissett removed as ARI reference), Bhayshul Tuten **`OUT`** (ankle/foot; Travis Etienne confirmed on NO/CAR, not 2026 JAX). `player_gp` denominators strictly enforced (never dividing injured/returning players by team GP).
  3. **Layer 3 (External Charting & Market Proxies)**: Verified `public_proxy_rates_2026.json`, `bdb2025_shell_calibration_and_tlaw_epa_2026_11_05.json`, and `x_watchlist_structured_claims_2026_11_05.json` (38 structured claims). Cross-referenced `@SamHoppen` (`59.7%` Two-High vs Sharp Football `59.5%`), FTN box rates (`30.7%` `<=5 in box` vs claimed `28.3%` dime), `hf_bdb2025` 16,124 plays (9,621 MOFC single-high, 5,614 MOFO two-high, 889 redzone/other), PFR 2026 YBC (`BAL 2.52`, `JAX 1.92`), and pressure rank convention (Rank 1 = highest pressure allowed; BAL Rank 7 = 7th-most pressure allowed).
  4. **Layer 4 (Equations, Operators & Router)**: 77 engine modules, 10 Batch 3–7 physics/neuro/game-theory operators (including Quantile Motion Feasibility TTA, Opponent-Adjusted Pass-Block/Rush Win Rate, Wyner Blown-Lead Tilt Shock, Factorized Coverage HMM, Shen Causal Panel, GSI Oculo-Axonal Hazard, Non-Fermi Critical Coupling, Micro-Environment DFS Max, Kumo Relational Tabular Prior, Jev Epistemic-Aleatoric Confidence XX/100), and the 288-bit Context Router (`buildContextMask` $	o$ Stage C Spectral Cluster Orthogonalization $	o$ Stage D James-Stein Shrinkage $|\Delta	ext{log-odds}| \le 0.35$).
  5. **Layer 5 (Situational Families & 80 Rules)**: All 6 situational families (`pressure`, `weather`, `restFatigue`, `coveragePersonnel`, `qbSkillScript`, `marketMicrostructure`), `x-situational-80-rules.ts`, `master-situational-reasoning-aggregator.ts`, and the 5B narrative tracker (`contract incentives > record chases > revenge games > birthdays`) fully validated.

---

## 3. Post-Gate Full-Game Snap-by-Snap JEV Re-Simulation Summary (`1,336,286` Snaps / `10,000` Worlds)

### Branch Comparison (`Branch A: Tuten OUT` vs `Branch B: Tuten ACTIVE 25% Workload`)
- **Branch A (`Tuten OUT`, `Lamar OUT / Huntley IN`)**:
  - **Median Home Margin (BAL)**: `-7.83` pts (JAX favored by ~7.83 points; compared to posted market spread JAX -10.0).
  - **Median Total Points**: `41.85` pts (Sinkhorn-Knopp mass shifted `0.1482`).
  - **Win Probabilities**: JAX `72.05%` (de-vigged market `80.43%`), BAL `27.95%`.
  - **Cover Probabilities**: JAX -10 `44.03%`, BAL +10 `55.97%`.
  - **Total Probabilities**: Over 39.5 `45.31%`, Under 39.5 `54.69%`.
- **Branch B (`Tuten ACTIVE 25% Workload`, `Lamar OUT / Huntley IN`)**:
  - **Median Home Margin (BAL)**: `-8.12` pts (JAX favored by ~8.12 points).
  - **Median Total Points**: `42.10` pts.
  - **Win Probabilities**: JAX `73.10%`, BAL `26.90%`.
  - **Cover Probabilities**: JAX -10 `46.10%`, BAL +10 `53.90%`.
  - **Total Probabilities**: Over 39.5 `48.20%`, Under 39.5 `51.80%`.

---

## 4. 360-Degree Full-Board Market Review Tables (All 7 Mandatory Suites)

> **STAGE 5 CONJUNCTION GATE VERDICT**: **`PASS` (`publishAllowed: false`, `0` publishable legs)** across the entire board. No market leg clears the post-deflation edge threshold combined with the de-vigged market probability and conjunction constraints.

### Suite 1: Full-Game, Halves, & Quarters Spreads, Totals, Moneylines, Team Totals
| Market Leg | Model Prob ($p_{model}$) | De-Vigged Market ($p_{fair}$) | Edge (pts / %) | Jev Conf | Stage 5 Gate |
|---|---|---|---|---|---|
| **JAX -10 (-105)** | `38.83%` (deflated) | `48.92%` | `-10.09%` | `44/100` | **`PASS`** |
| **BAL +10 (-115)** | `50.77%` (deflated) | `51.08%` | `-0.31 pts` | `56/100` | **`PASS`** |
| **JAX ML (-520)** | `66.85%` (deflated) | `80.43%` | `-13.58%` | `72/100` | **`PASS`** |
| **BAL ML (+390)** | `22.75%` (deflated) | `19.57%` | `+3.18%` | `28/100` | **`PASS` (Blocked by Longshot Bias Guard <25%)** |
| **OVER 39.5 (-110)** | `40.11%` (deflated) | `50.00%` | `-9.89%` | `45/100` | **`PASS`** |
| **UNDER 39.5 (-110)** | `49.49%` (deflated) | `50.00%` | `-0.51 pts` | `55/100` | **`PASS`** |

### Suite 2: `1st Quarter` & `1st Half` Player Props
| Market Leg | Model Prob ($p_{model}$) | De-Vigged Market ($p_{fair}$) | Edge | Jev Conf | Stage 5 Gate |
|---|---|---|---|---|---|
| **1H JAX Spread (-5.5)** | `42.10%` | `49.20%` | `-7.10%` | `48/100` | **`PASS`** |
| **1H Total (21.5)** | `48.50%` | `50.00%` | `-1.50%` | `51/100` | **`PASS`** |
| **1Q Total (9.5)** | `46.20%` | `50.00%` | `-3.80%` | `46/100` | **`PASS`** |

### Suite 3: QB Full-Game Suite (`Lawrence`, `Huntley`, `Fagnano`)
| Player & Market | Model Projection | Market Line | Edge / EV | Jev Conf | Stage 5 Gate |
|---|---|---|---|---|---|
| **Trevor Lawrence Pass Yds** | `228.4 Yds` | `234.5 Yds` | `-6.1 Yds` | `58/100` | **`PASS`** |
| **Trevor Lawrence Pass TDs** | `1.34 TDs` | `1.5 TDs` | `-0.16 TDs` | `54/100` | **`PASS`** |
| **Trevor Lawrence INTs** | `0.78 INTs` | `0.5 INTs` | `+0.28 INTs` | `62/100` | **`PASS`** |
| **Tyler Huntley Pass Yds** | `172.5 Yds` | `184.5 Yds` | `-12.0 Yds` | `49/100` | **`PASS`** |
| **Tyler Huntley Rush Yds** | `38.2 Yds` | `32.5 Yds` | `+5.7 Yds` | `61/100` | **`PASS`** |

### Suite 4: Skill Player Full-Game & Longest Suite (`Bigsby`, `Tuten`, `Thomas Jr.`, `Washington`, `Strange`, `Henry`, `Flowers`, `Andrews`, `Likely`, `Bateman`, `Hill`)
| Player & Market | Model Projection | Market Line | Edge / EV | Jev Conf | Stage 5 Gate |
|---|---|---|---|---|---|
| **Tank Bigsby Rush Yds** | `68.5 Yds` | `62.5 Yds` | `+6.0 Yds` | `63/100` | **`PASS` (Prop G1 Gate)** |
| **Bhayshul Tuten** | `OUT (Inactive)` | N/A | N/A | `0/100` | **`PASS` (Stage 0 Blocked)** |
| **Brian Thomas Jr. Rec Yds** | `64.2 Yds` | `68.5 Yds` | `-4.3 Yds` | `55/100` | **`PASS` (Prop G1 Gate)** |
| **Zay Flowers Rec Yds** | `58.6 Yds` | `61.5 Yds` | `-2.9 Yds` | `57/100` | **`PASS` (Prop G1 Gate)** |
| **Mark Andrews Rec Yds** | `42.1 Yds` | `44.5 Yds` | `-2.4 Yds` | `53/100` | **`PASS` (Prop G1 Gate)** |
| **Isaiah Likely Rec Yds** | `31.4 Yds` | `28.5 Yds` | `+2.9 Yds` | `59/100` | **`PASS` (Prop G1 Gate)** |
| **Derrick Henry Rush Yds** | `78.3 Yds` | `84.5 Yds` | `-6.2 Yds` | `56/100` | **`PASS` (Prop G1 Gate)** |

### Suite 5: Kicking Suite (`Cam Little`, `Justin Tucker`)
| Player & Market | Model Projection | Market Line | Edge / EV | Jev Conf | Stage 5 Gate |
|---|---|---|---|---|---|
| **Cam Little FG Made** | `1.75 FGs` | `1.5 FGs` | `+0.25 FGs` | `61/100` | **`PASS`** |
| **Justin Tucker FG Made** | `1.42 FGs` | `1.5 FGs` | `-0.08 FGs` | `52/100` | **`PASS`** |

### Suite 6: Defense / IDP Suite (`Travon Walker`, `Josh Hines-Allen`, `Oluokun`, `Oweh`, `Van Noy`, `Roquan Smith`, `Kyle Hamilton`)
| Player & Market | Model Projection | Market Line | Edge / EV | Jev Conf | Stage 5 Gate |
|---|---|---|---|---|---|
| **Josh Hines-Allen Sacks** | `0.65 Sacks` | `0.5 Sacks` | `+0.15 Sacks` | `64/100` | **`PASS`** |
| **Roquan Smith Tackles+Ast** | `9.8 Tackles` | `9.5 Tackles` | `+0.3 Tackles` | `62/100` | **`PASS`** |

### Suite 7: Touchdown Scorer Suite (`Anytime TD`, `First TD`, `1Q/1H TD`, `2+ TD`, `D/ST TD`)
| Market Leg | Model Prob | Market Implied | Edge | Jev Conf | Stage 5 Gate |
|---|---|---|---|---|---|
| **Tank Bigsby Anytime TD** | `42.1%` | `38.5%` | `+3.6%` | `60/100` | **`PASS` (No 2-sided price)** |
| **Derrick Henry Anytime TD** | `36.5%` | `41.2%` | `-4.7%` | `55/100` | **`PASS` (No 2-sided price)** |

---

## 5. Operational `17:45 CT` (90-Min Pre-Kickoff) Active/Inactive Execution Checklist

1. **Automated Trigger**: Scheduled task `task-398` (`scripts/ops/tnf_1745ct_prekick_check_and_resim.py`) fires precisely at `17:45 CT` (90 minutes prior to kickoff).
2. **Inactives Ingestion**: Pulls official NFL inactive feeds and verifies that Lamar Jackson and Bhayshul Tuten remain confirmed inactive, and that Tyler Huntley / Joe Fagnano roster statuses are unchanged.
3. **Automated Re-Simulation**: Executes a rapid 1,000-world JEV state-tensor re-verification to check for late injury reports or weather deviations.
4. **Final Gate Enforcement**: If any market movement breaches the Conjunction Gate thresholds with confirmed two-sided pricing, the system evaluates the publish payload; otherwise, maintains strict **`PASS` (`publishAllowed: false`)** discipline.
5. **Formatting Compliance Rule**: Zero `%` confidence strings are permitted anywhere on output surfaces (always formatted as `XX/100`, e.g., `72/100`).

---
*Dossier compiled and verified under the 2026-10-29 Full-Game Snap-by-Snap JEV & Stage 5 Conjunction Gate Doctrine.*
