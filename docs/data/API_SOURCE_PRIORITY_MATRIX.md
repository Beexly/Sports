# API Source Priority Matrix

*Source: `@sports/data-intelligence/source-dossier.ts` (27 dossiers). Recommendations are produced
by the Acquisition Governor's legal-gate-first logic, not by impressiveness. Costs/coverage are
priors for planning, not quotes.*

## Recommendation legend

`USE_NOW` · `EXPAND_EXISTING` · `ADD_ADAPTER` · `RESEARCH_ONLY` · `RIGHTS_REVIEW` ·
`PAID_EVALUATION` · `ENTERPRISE_DOSSIER` · `DO_NOT_USE`

## The matrix

| Source | Type | Legal | Cost | Unlocks | Recommendation |
|---|---|---|---|---|---|
| nflverse-data | open | FREE_OPEN (CC-BY-4.0) | free | Role State, Opportunity Conservation, Replay Lake | **EXPAND_EXISTING** |
| NWS weather | weather | FREE_OPEN (public domain) | free | Light Cone, Narrative Gravity | **USE_NOW** |
| The Odds API | low-cost API | LICENSED | low | Book DNA, Market Twin, Absorption, CLV | **USE_NOW** |
| Sleeper | fantasy platform | FREE_CAUTION | free | Fantasy Absorption, Manager DNA, League Economy | **ADD_ADAPTER** |
| Yahoo Fantasy | fantasy platform | FREE_CAUTION (OAuth) | free | League Twin, Manager DNA | **ADD_ADAPTER** |
| BALLDONTLIE | low-cost API | PAID_REQUIRED | low | multi-sport breadth, webhooks | PAID_EVALUATION |
| API-SPORTS | low-cost API | PAID_REQUIRED | low | global sports, live odds/events | PAID_EVALUATION |
| OpticOdds | low-cost API | PAID_REQUIRED | mid | dense odds / props | PAID_EVALUATION |
| SportsGameOdds | low-cost API | RIGHTS_REVIEW | low | odds breadth | RIGHTS_REVIEW |
| SportsDataIO | paid specialist | PAID_REQUIRED | mid | DFS Lab, Fantasy Absorption, ID mapping | PAID_EVALUATION |
| FantasyData | paid specialist | PAID_REQUIRED | mid | DFS salary, projections, ADP, news | PAID_EVALUATION |
| RotoWire | paid specialist | PAID_REQUIRED | mid | news/injury timing | PAID_EVALUATION |
| FantasyPros | paid specialist | PAID_REQUIRED | mid | projections, ADP, ranks | PAID_EVALUATION |
| Sportradar | enterprise | PAID_REQUIRED | enterprise | breadth/latency, official posture | ENTERPRISE_DOSSIER |
| Stats Perform / Opta | enterprise | PAID_REQUIRED | enterprise | advanced metrics, tracking | ENTERPRISE_DOSSIER |
| Genius Sports | enterprise | PAID_REQUIRED | enterprise | official-data lane | ENTERPRISE_DOSSIER |
| PFF | enterprise | PAID_REQUIRED | enterprise | player grading, charting | ENTERPRISE_DOSSIER |
| Retrosheet / Lahman / OpenFootball | open | FREE_OPEN | free | MLB/soccer backfill | RESEARCH_ONLY |
| MoneyPuck | open | FREE_CAUTION | free | NHL backfill | RESEARCH_ONLY |
| NBA.com / nba_api | scraper candidate | RIGHTS_REVIEW | — | NBA expansion | RIGHTS_REVIEW |
| MLB Stats API | scraper candidate | RIGHTS_REVIEW | — | MLB live | RIGHTS_REVIEW |
| NHL API | scraper candidate | RIGHTS_REVIEW | — | NHL live | RIGHTS_REVIEW |
| ESPN Fantasy | fantasy platform | RIGHTS_REVIEW | — | League Twin | RIGHTS_REVIEW |
| Underdog ADP | scraper candidate | RIGHTS_REVIEW | — | best-ball ADP | RIGHTS_REVIEW |
| DraftKings (unofficial) | scraper candidate | **DO_NOT_USE** | — | — | **DO_NOT_USE** |

## How the order is decided

The governor scores `AcquisitionPriority` (yield ÷ cost/risk/complexity), then — for a specific
experiment — multiplies by how well the source covers the needed fact types. So **The Odds API ranks
first for Book DNA / absorption** (dense odds + props history) and **SportsDataIO ranks first for DFS
salary lag** (salary + slate), even though the odds feed is cheaper overall. The legal verdict is
applied before any of this: a `DO_NOT_USE` source can never be `USE_NOW`, and `rightsRisk ≥ 0.5`
forces `RIGHTS_REVIEW` regardless of coverage.

## First-dollar guidance

1. **The Odds API** higher quota / historical / props — if betting-market calibration is next.
2. **SportsDataIO or FantasyData** minimum plan — if DFS / fantasy launch is next.
3. **Sleeper** adapter — the first (free, read-only) fantasy platform.
4. **Yahoo** OAuth skeleton — the first official user-auth league sync.
