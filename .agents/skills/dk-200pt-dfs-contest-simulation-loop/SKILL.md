---
name: dk-200pt-dfs-contest-simulation-loop
description: Generates a 150-lineup DraftKings GPP portfolio engineered to clear the 200+ DK point threshold by running Wave 1 correlated MILP stacking and Wave 2 500-lineup Quantal Response Equilibrium opponent field simulations across 10,000 snap-by-snap worlds. Use at T-180 min, T-60 min, late-swap windows, or upon breaking starter injury rulings.
metadata:
  source-workflow: workflows/dk-200pt-dfs-contest-simulation-loop.md
  loop-mode: loop-me
---


# Two-Wave 200+ Pt DraftKings DFS Contest Simulation & Late-Swap Loop (`loop-me`)

## Loop Definition

A recurring game-day and pre-lock DraftKings GPP workflow (`intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py` and `python Beexly/Sports/scripts/ops/solve_showdown_dfs_milp.py`) that converts situationally conditioned 10,000-world player trajectory vectors into a 150-lineup MME / high-ceiling portfolio engineered to clear the `200+` DK point threshold and beat realistic opponent field ownership.

## Use this skill when

- Executing scheduled pre-lock builds at `T-180 min` (initial two-wave portfolio) or `T-60 min` (official inactives and live weather re-solve).
- Running dynamic late-swap re-optimization between the `Early Window` and `Late Afternoon / SNF` lock conditioned on realized early-window scores and live ownership.
- Responding to a breaking `Out` or `Active` status change for any starter with projected ownership `>= 8%` or salary `>= $6,000`.

## Do not use this skill when

- Grading post-game sportsbook tickets or updating calibration weights after the slate concludes (use `continuous-post-game-learning-and-pathwise-calibration-loop`).
- Evaluating straight sportsbook sides, totals, or heavy-juice prop firewalls without DFS lineup construction (use `full-board-360-game-dossier-and-firewall-loop`).
- Running unconditioned Gaussian simulations around static mean projections without Stage 2 situational priors.

## Instructions

### 1. Trigger Conditions

- **Schedule Trigger:**
  - `T-180 min` before slate lock (Initial Two-Wave Portfolio Build).
  - `T-60 min` before slate lock (Official Inactives / Weather Re-Solve).
  - Between `Early Window` and `Late Afternoon / SNF` lock (Dynamic Late-Swap Re-Optimization conditioned on realized early-window scores and live ownership).
- **Event Trigger:** Breaking `Out`/`Active` status change for any starter with projected ownership `>= 8%` or salary `>= $6,000`.

### 2. Push Right (Autonomous Pre-Checkpoint Execution)

1. **Situational & RTP Projection Synthesis:** Compute 360-degree post-simulation player distributions (`mean`, `std`, `p75`, `p90`, `p95`, `p99`, `p_25plus`, `p_30plus`) across all 22 proprietary GSE metrics, 29 Fantasy Textbook chapters (LMM shrinkage + Markowitz covariance), and 38 Sports Medicine Return-to-Play (`RTP`) injury decay curves.
2. **Wave 1 — 120-Candidate Ceiling Lineup Generation:** Solve the correlated MILP/stacking optimizer under strict DraftKings Classic (`$50,000` cap, `QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST`, max 4 skill players per team, mandatory `QB + 2 Pass Catchers + 1 Opposing Bring-Back`, min Hamming distance $\ge 3$, player exposure cap $\le 35\%$).
3. **Wave 2 — 500-Lineup QRE Opponent Field Contest Simulation:** Generate `500` opponent field lineups using Dirichlet-Multinomial ownership + Quantal Response Equilibrium (`QRE`) chalk bias, then evaluate all `620` lineups across `10,000` correlated snap-by-snap worlds (`6,200,000` lineup-world evaluations).
4. **Selection & Export:** Rank candidates by `P(Lineup >= 200.0 DK Pts)`, `Top-0.1% GPP Win Rate`, and `Simulated Expected ROI`, and generate a ready-to-upload DraftKings CSV + JSON receipt (`docs/dfs/research/<YYYY-MM-DD>/dk-200pt-situational-dfs-and-projection-receipt.json`).

### 3. Checkpoint & Brief Delivery

- **Single Late Human Checkpoint:** Founder (`Garrett`) reviews the Top-5 `200+` Pt lineup brief (`T-15 min` before lock) to approve CSV upload or lock a core QB stack override.
- **Brief Artifact:** `docs/dfs/research/2026-11-07/dk-200pt-situational-dfs-and-projection-receipt.json`
- **Brief Contents:** Top lineups ranked by `P(>=200 Pts)` and `Top-0.1% Win Rate`, core leverage plays (`Sim Ownership % - Field Ownership %`), injury/RTP fades, and direct path to the uploadable DraftKings CSV.
