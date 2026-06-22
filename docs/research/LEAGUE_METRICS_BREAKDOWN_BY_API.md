# League Benchmarking Metrics Breakdown by API Source
**Date:** June 22, 2026

---

## Summary Table: Metrics Availability by Platform

| Metric | Sleeper | Yahoo | ESPN | MFL | Computed |
|--------|---------|-------|------|-----|----------|
| **Core Standings** | ✓ | ✓ | ✓ | ✓ | — |
| Win-Loss Record | ✓ | ✓ | ✓ | ✓ | — |
| Winning Streak | Manual | Manual | Manual | Manual | ✓ |
| Points For (PF) | ✓ | ✓ | ✓ | ✓ | — |
| Points Against (PA) | ✓ | ✓ | ✓ | ✓ | — |
| Point Differential | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Advanced Stats** | | | | | |
| Expected Wins | — | — | — | — | ✓ |
| Luck Factor (W-L vs EW) | — | — | — | — | ✓ |
| Win % vs League Median | — | ✓ | — | — | ✓ |
| Strength of Schedule | — | ✓ | — | ✓ | ✓ |
| Playoff Position | — | ✓ | ✓ | ✓ | — |
| Division Standing | — | ✓ | ✓ | — | — |
| **Roster Composition** | | | | | |
| Roster Size | ✓ | ✓ | ✓ | ✓ | — |
| Bench Points | — | ✓ | ✓ | — | ✓ |
| Active vs Bench Split | ✓ | ✓ | ✓ | — | — |
| **Transaction Data** | | | | | |
| Waiver Claims | Limited | ✓ | Limited | ✓ | — |
| Trade History | Limited | ✓ | Limited | ✓ | — |
| Free Agent Pickups | Limited | ✓ | Limited | ✓ | — |
| FAAB Budget Used | — | Maybe | — | ✓ | — |
| **Market Signals** | | | | | |
| Add/Drop Trending | ✓ | — | — | — | — |
| Ownership % | ✓ | — | — | ✓ | — |
| Player Handcuff Pairs | — | — | — | — | ✓ |
| **Dynasty/Long-term** | | | | | |
| Franchise History | — | — | — | ✓ | — |
| Multi-season Records | — | ✓ | Limited | ✓ | — |
| Keeper/Dynasty Data | — | Limited | — | ✓ | — |
| Draft History | Limited | — | — | ✓ | — |
| **Real-time Updates** | | | | | |
| Live Game Scoring | — | Limited | Limited | Limited | — |
| Intra-week Updates | — | Hourly | Hourly | Poll-based | — |
| Injury Status | ✓ (roster) | ✓ | ✓ | — | — |

---

## Metric Definitions & Calculations

### Core Standings Metrics (All Platforms)

**Win-Loss Record (W-L)**
- Direct from API: `roster.settings.wins`, `roster.settings.losses`, `roster.settings.ties`
- Sleeper: available in `/league/<id>/rosters` endpoint
- Yahoo: available via league standings endpoint
- ESPN: available via league endpoint (unofficial)
- MFL: available via league records endpoint

**Points For (PF)**
- Direct from API: `roster.settings.fpts` (Sleeper), or sum of weekly scores (all)
- Sleeper: integer + decimal `fpts_decimal` for precision
- Yahoo: cumulative weekly points
- ESPN: cumulative weekly points
- MFL: franchise season totals

**Points Against (PA)**
- Calculated: sum of opponent scores when facing each team
- Sleeper: reverse from opposing rosters in matchups
- Yahoo: provided or calculated from matchup history
- ESPN: provided via standings
- MFL: available as league stat

**Point Differential (PD)**
- Calculation: `PF - PA`
- Significance: predictor of future wins (luck factor)
- All platforms support via historical data

---

### Advanced Benchmarking Metrics (Requires Computation)

**Expected Wins (EW)**
- **Formula:** `Team's PF ranked vs League PA distribution`
- **Interpretation:** How many wins the team "should have" based on scoring
- **Example:** Team with 1,200 PF in 12-team league where avg PF is 1,000
  - If league median is 1,100, team's EW = 12 * (1,200 / sum_all_PF)
- **Requirement:** Historical matchup records + all team scores
- **Available from:** Sleeper (matchups endpoint), Yahoo (full history), MFL (records)

**Luck Factor (Wins - Expected Wins)**
- **Formula:** `Actual W/L - Expected Wins`
- **Interpretation:** Positive = lucky (won games you shouldn't), Negative = unlucky
- **Range:** -0.5 to +0.5 per game on average
- **Use:** Process grading (did roster/decisions maximize luck-adjusted ROI?)
- **Sleeper example:** Team 8-2 with 1,050 PF should be ~7-3 (luck: +1 win)

**Win Percentage vs League Median**
- **Formula:** Compare team's W/L to league median scoring team's W/L
- **Requirement:** League-wide scoring distribution
- **Available from:** Yahoo (explicit), can compute from others

**Strength of Schedule (SOS)**
- **Formula:** Average opponent PF (or rank) for remaining games
- **Interpretation:** Are you facing top or bottom teams?
- **Requirement:** Future schedule + historical opponent strength
- **Available from:** Yahoo (explicit), MFL (season records)

---

### Roster Composition Metrics

**Active Starters vs Bench**
- Sleeper: `roster.starters` array vs `roster.players` array (set difference = bench)
- Yahoo: explicit active/bench roster structure
- ESPN: active vs bench roster sections
- MFL: roster composition via roster endpoint

**Bench Points**
- **Calculation:** Sum of points from benched players (if league scoring includes it)
- **Significance:** Indicator of bench depth and opportunity cost
- **Availability:** ESPN (if bench scoring enabled), Yahoo, MFL
- **Sleeper note:** Must calculate from individual benched player performance data

**Injury Impact**
- Sleeper: `player.injury_status` in player map + roster roster roster
- Yahoo: injury designation + expected return
- ESPN: injury status per player
- Calculation: Projected points lost per injured starter

---

### Transaction Data Metrics

**Waiver Claims (Adds)**
- Sleeper: No transaction endpoint; use trending as proxy (add momentum)
- Yahoo: Full transaction history (date, player, position)
- ESPN: Transaction history (limited)
- MFL: Full transaction ledger with dates

**FAAB Usage**
- Sleeper: Not available (not supported on platform)
- Yahoo: Budget remaining + bids placed per team
- ESPN: Not directly available
- MFL: Budget tracking for each owner

**Trade Analysis**
- Sleeper: No official trade endpoint (recommend manual import)
- Yahoo: Trade history with both sides + veto status
- ESPN: Trade history (unofficial)
- MFL: Full trade ledger for value calibration

**Trade Acceptance Rate**
- Calculation: `Accepted trades / Total proposed trades`
- Significance: Manager profile (risk tolerance, negotiation style)
- Requirement: Trade history API
- Available from: Yahoo, MFL (via manual scraping for Sleeper)

---

### Market Signal Metrics

**Add/Drop Trending (Sleeper Exclusive)**
- Sleeper endpoint: `GET /v1/players/nfl/trending/{add|drop}?lookback_hours=24&limit=25`
- Returns: `{ player_id, count }` (count = number of adds/drops in lookback window)
- **Interpretation:** Market momentum (not advice, just velocity)
- **Use Cases:**
  - Waiver wire priority signals
  - Bubble player risk identification
  - League-wide panic indicators

**Ownership Percentage**
- Sleeper: Requires scraping league rosters (no native API)
- Yahoo: Built-in ownership % (sport-wide or league-specific)
- ESPN: Unofficial (requires scraping)
- MFL: Via roster API (calculate percentage)

**Bench Handcuff Identification**
- Calculation: For each RB starter, is backup RB rostered?
- Requirement: Player relationships + full rosters
- Significance: Playoff predictor (handcuff preparedness)
- Available from: All (requires player role mapping)

---

### Dynasty & Long-term Metrics

**Franchise Records (MFL Only)**
- Multi-year W-L record per team
- All-time PPR/PPG records
- Trade history and value trends
- Draft position analysis (which picks became studs?)

**Multi-season Trends**
- Sleeper: Some historical leagues exist; manual sync per season
- Yahoo: Full multi-year API support
- ESPN: Limited (data was deleted Aug 2025)
- MFL: Best support for dynasty analysis

**Keeper/Dynasty Trade Value**
- MFL: Tracks keeper costs and trend
- Calculation: ADP vs actual draft position over multiple years
- Significance: Long-term franchise equity

**Draft Efficiency**
- Formula: Points contributed per pick position
- Requirement: Multi-year draft data
- MFL: Native support
- Others: Manual reconstruction required

---

## Recommended Metric Hierarchy for MVP

### Tier 1: Immediate (All Platforms)
- Win-Loss Record
- Points For / Points Against
- Point Differential
- Bench vs Active Roster

### Tier 2: High Value (Most Platforms)
- Winning Streak
- Expected Wins (computed)
- Luck Factor (computed)
- Strength of Schedule

### Tier 3: Competitive Differentiation
- Transaction history (Yahoo/MFL full; Sleeper limited)
- Market momentum (Sleeper trending)
- Multi-season trends (Yahoo/MFL)
- Playoff probability model (computed)

### Tier 4: Dynasty Deep Dive (MFL + Manual)
- Franchise all-time records
- Draft efficiency by year
- Trade value trends
- Keeper cost analysis

---

## Implementation Strategy

### Phase 1: Core (Week 1)
```
dashboard = {
  wins: roster.settings.wins,
  losses: roster.settings.losses,
  pointsFor: roster.settings.fpts,
  pointsAgainst: computed from league matchups,
  differential: pointsFor - pointsAgainst,
}
```

### Phase 2: Advanced Benchmarking (Week 2-3)
```
advanced = {
  streak: computed from weekly results,
  expectedWins: percentile rank × league size,
  luckFactor: actual_wins - expected_wins,
  sosRemaining: avg opponent strength for upcoming weeks,
}
```

### Phase 3: Market Signals (Week 3)
```
market = {
  addTrending: sleeper trending endpoint,
  ownership: roster ownership %,
  bench_points: computed from player game logs,
}
```

### Phase 4: Historical Depth (Week 4+)
```
history = {
  multiSeason: yahoo/mfl historical data,
  tradeHistory: yahoo/mfl transaction endpoint,
  draftAnalysis: mfl draft efficiency,
}
```

---

## Data Freshness Requirements

| Metric | Refresh Interval | Timeliness | Source |
|--------|------------------|-----------|--------|
| Standings (W-L) | After each game | 30 min | API |
| Points (PF/PA) | After each game | 30 min | API |
| Market Trending | Hourly | Real-time | Sleeper |
| Transactions | Daily | 24 hrs | Yahoo/MFL |
| Strength of Schedule | Weekly | Set schedule | Manual |
| Playoff Probability | Weekly | Set schedule | Computed |
| Draft Analysis | Seasonal | Off-season | MFL |

---

## Next Steps

1. **Select MVP platform:** Sleeper (zero auth, ready now)
2. **Build snapshot schema:** Capture weekly standings + PF/PA
3. **Implement benchmarking layer:** Compute luck factor & SOS
4. **Add trending layer:** Integrate Sleeper adds/drops
5. **Extend to multi-platform:** Yahoo OAuth → MFL API
6. **Deepen dynasty:** MFL franchise records (Phase 4)
