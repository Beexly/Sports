# NFL World State Machine

## Purpose

The world model should represent NFL reality as a set of source-provenanced state transitions rather than a flat stat table. Every state change needs a source, timestamp, freshness window, confidence, and product-tier rule.

## Season-Level States

| State | Inputs | Outputs | Primary Sources |
| --- | --- | --- | --- |
| Offseason reset | Final rosters, coaching changes, contracts, draft capital | Baseline team/player priors | nflverse rosters, draft/combine, licensed provider, manual notes |
| Free agency | Signings, releases, trades, cap/contract changes | Roster continuity and role uncertainty | Team reports, licensed provider, nflverse contracts |
| Draft | Picks, prospect traits, college production | Rookie priors and developmental uncertainty | nflreadr draft/combine, CFBD |
| OTAs/minicamp | Public practice notes and roster battles | Low-confidence development signals | Team reports, news claim cards |
| Training camp | Depth-chart movement, injuries, role reps, coach comments | Role volatility and availability priors | Official/team reports, licensed provider, claim cards |
| Preseason | Snaps, role, personnel, opponent quality | Usage translation and roster risk | PBP, snap/participation, depth charts |
| Regular week | Market, injury, weather, practice, travel, matchup | Game forecast and scenario envelope | Odds API, NWS, official reports, nflverse |
| Live game | Score, drive, play, clock, injuries, weather updates | Win probability and momentum state | PBP/live licensed feed if approved |
| Postgame settlement | Final score, closing line, injuries, source corrections | Evaluation, CLV, calibration, autopsy | Odds provider, PBP, official stats |

## Weekly Game Lifecycle

1. Schedule locked: create game shell, venue, expected kickoff, teams, rest/travel priors.
2. Opening market: record opener, implied probability, provider and bookmaker context.
3. Early injury/practice: track availability uncertainty and official/team report confidence.
4. Midweek update: refresh weather, practice participation, news claims, depth movement, market deltas.
5. Final report: lock inactive scenarios, roof/weather, market state, and source freshness.
6. Live phase: update score, game clock, drive state, injuries, momentum, and scenario probabilities only if a licensed live source exists.
7. Settlement: record outcome, closing line, forecast error, source freshness, and model autopsy.
8. Calibration: update backtest metrics only through approved internal learning gates.

## Entity States

| Entity | Key States | Notes |
| --- | --- | --- |
| Player | Healthy, limited, questionable, doubtful, out, IR, suspended, role-changing, returning | No diagnosis language. Availability impact only. |
| Team | Baseline, roster churn, injury cluster, travel stress, weather mismatch, coaching change, market disagreement | Team state is a composition of roster, schedule, market, and environment. |
| Game | Scheduled, priced, previewed, in progress, final, settled, corrected | Corrections should create new snapshots rather than mutating audit evidence silently. |
| Source | Approved, pending, blocked, stale, degraded, over-limit, contract-expired | Product should show degraded confidence, not fabricated certainty. |
| Signal | Inactive, active, shadow, blocked, stale, confidence-limited | Signal status must travel with every prediction and public card. |

## Product-State Rule

FREE can show stable, public-safe summaries. PRO can show richer source-backed matchup context. ELITE can show scenario tools and high-friction signals. Founder-only keeps formulas, source-risk, provider choices, weightings, and experimental signals.
