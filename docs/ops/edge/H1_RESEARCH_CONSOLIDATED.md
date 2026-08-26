# H1+ Research Consolidated — Agents 1-10 + 11-19 (2026-08-23)

## Research Agents Complete: 19/30
- Batch 1 (10 agents): all complete, results consolidated below
- Batch 2 (9 agents): all complete, results consolidated below  
- Batch 3 (9 agents): just launched, ~35 min into 60-min runtime

## H1 Edge Priorities (ranked by edge strength + data reliability)

### Tier 1 — HIGH EDGE (defense + ST underserved)
1. **QB Pressures (hurries + hits + sacks)** — data: NFLVerse player_stats_def + PFR
   - Books price sacks only; pressures capture QB disruption better (~5% edge per PropsBot)
2. **TFL (tackles for loss)** — data: ESPN leaderboard + PFF
   - Mispriced as sack prop; clears on runs/screens/backside pursuit
3. **Pass Deflections (PD)** — data: ESPN + PFR
   - Higher volume + lower luck than INTs; Gridiron Decoded calls PD "honest measure"
4. **Defensive snap share %** — data: FantasyPros + RotoWire
5. **Special teams**: weather-adjusted FG%, dynamic kickoff returns (74.5% rate in 2025)

### Tier 2 — Market Structure
1. Uncorrelated prop combos escaping SGP tax (~5% edge)
2. Time-based line movement (Day 7→6 = 0.022 shift vs Day 1→0 = 0.008)
3. Steam-chasing — negative autocorrelation, fade the steam
4. Early-season public bias (prior playoff teams cover only 35.6% in Week 1)

### Tier 3 — Situational
1. Red zone TE target share (20-33% vs 15% overall)
2. 3rd down distance archetypes (personnel package mismatches)
3. No-huddle/base tempo (Commanders 61.6% vs Patriots 2.4%)
4. Game-script WP asymmetry (models too conservative at 70-80% WP)

## Codebase Audit: 13 abandoned/partial implementations
- 6 dead ghost branches (pre-restructure, never merged)
- 5 INERT/stub modules in active edge-lab/
- 3 unpatched CLV measurement fixes on sideline branches

## Data Gap: CRITICAL
The repo only ingests NFLVerse `player_stats_week` (offensive).
NFLVerse also publishes `player_stats_def` + `player_stats_kicking` — free CC-BY-4.0.
Defense + special-teams props are the major uncovered edge category.
