# GSE 2026 Implementation Roadmap — Fantasy War Room Sprint

**Document type**: Build plan (not marketing)
**Sprint scope**: Fantasy Draft OS, League Memory, Manager Genome, Voice Jarvis
**Prerequisites complete**: DFS Optimizer Phases 1-10 (all tests passing, zero TS errors)
**Branch**: claude/laughing-wozniak-gyryjx

---

## CURRENT STATE (from repo inspection)

| System | Status | Notes |
|---|---|---|
| DFS Optimizer (Phases 1-10) | COMPLETE | Solver, rules, projection sets, slate import, simulation, late swap, autopsy/calibration — do not touch |
| Signal Courtroom | EXISTS | Do not refactor |
| Agent War Room | EXISTS | Do not refactor |
| GM Ledger + Process Grade | EXISTS | Do not refactor |
| League Twin / Galaxy Slate Twin | EXISTS | Extend only |
| Bias Mirror | EXISTS | Wire to draft history |
| Trust Ledger | EXISTS | Do not refactor |
| Academy Simulator | EXISTS | Do not refactor |
| GSN Transmission | EXISTS | Do not refactor |
| Stripe/Auth/Entitlements | LIVE | Do not modify |
| Source Rights Registry + Scraping Clearance Engine | LIVE | Extend only |
| Fantasy lib (draft.ts, waivers.ts, trade.ts, players.ts, lineup.ts, etc.) | PARTIAL | Enhance, do not replace |
| Historical Draft Upload | NOT BUILT | Phase 2 |
| Manager Genome | NOT BUILT | Phase 3 |
| Voice Jarvis (draft layer) | NOT BUILT | Phase 10 (Jarvis cockpit exists) |
| League Memory Graph | NOT BUILT | Phases 1+3 |
| Draft Futures Engine | NOT BUILT | Phase 7 |
| Opponent Room Model | NOT BUILT | Phase 7 |
| Roster Destiny Simulator | NOT BUILT | Phase 9 |

---

## PHASE 1: FOUNDATION — Schema + Types (Weeks 1-2)

### 1.1 Data Model Expansion

**File**: `packages/db/prisma/schema.prisma`

Add the following enums:

```
FantasyDraftType     SNAKE | AUCTION | LINEAR
FantasyTransactionType  WAIVER_ADD | WAIVER_DROP | FAAB_BID | TRADE | FREE_AGENT
FantasyPlayoffResult    CHAMPION | RUNNER_UP | SEMI | QUARTERFINAL | MISS
FantasyRegretCategory   GOOD_PROCESS_GOOD_OUTCOME | GOOD_PROCESS_BAD_OUTCOME |
                         BAD_PROCESS_GOOD_OUTCOME | BAD_PROCESS_BAD_OUTCOME |
                         INJURY_VARIANCE | UNFORESEEABLE_CHANGE | KNOWN_RISK_IGNORED |
                         MODEL_MISS | SOURCE_MISS | USER_BIAS
```

Add the following models (with full Prisma field definitions):

- `FantasyLeague` — league name, platform, scoring system (JSON), roster slots (JSON), owner userId, created/updated timestamps
- `FantasySeason` — year, leagueId, numberOfTeams, draftType, draftDate, isKeeper, isDynasty, isSuperFlex, isIDP, isActive
- `FantasyManager` — leagueId, userId (nullable — can be other managers), displayName, teamName, isCurrentUser
- `FantasyDraft` — seasonId, draftType, draftDate, totalRounds, pickTimeSeconds, auctionBudget (nullable), rawInputSource, completed
- `FantasyDraftPick` — draftId, managerId, overallPick, round, roundPick, playerName, position, nflTeam, adpAtDraft (nullable), isKeeper, rawRow
- `FantasyAuctionBid` — draftId, managerId, playerName, position, nflTeam, finalBid, nominatedBy (nullable)
- `FantasyRosterSnapshot` — seasonId, managerId, week, rosterJson (JSON), snapshotDate
- `FantasyTransaction` — seasonId, managerId, transactionType, playerAddName, playerDropName (nullable), faabBid (nullable), processedDate
- `FantasyTrade` — seasonId, initiatorManagerId, receiverManagerId, initiatorAssetsJson (JSON), receiverAssetsJson (JSON), tradeDate, accepted
- `FantasyStanding` — seasonId, managerId, week, wins, losses, ties, pointsFor, pointsAgainst, rank
- `FantasyPlayoffResult` — seasonId, managerId, result (FantasyPlayoffResult enum), finalRank
- `FantasyManagerProfile` — managerId, displayBio, yearsActive, leagueIds (array), lastComputedGenomeAt
- `FantasyDraftTendency` — managerId, dimension (string), score (float), computedAt, seasonCount
- `FantasyRegretAnalysis` — draftId, managerId, pickId, regretCategory, regretScore, alternativePlayerName, alternativePlayerActualValue, description, computedAt
- `FantasyDraftStrategyPlan` — leagueId, managerId, season, strategyJson (JSON), createdAt, notes

**File**: `packages/types/src/fantasy-draft.ts`

Export TypeScript interfaces matching all new Prisma models. Add:

```typescript
export interface ManagerGenome {
  managerId: string
  adpAdherence: number        // -1 to 1 correlation coefficient
  positionBias: PositionBias
  riskAppetite: number        // negative = value, positive = reach
  rookieEnthusiasm: number    // -1 (underweights) to 1 (overweights)
  injuryAvoidance: number
  favoriteTeamBias: string | null
  panicDraftScore: number
  waiverAggression: number
  tradeActivity: number
  auctionStrategy: AuctionStrategy | null
  computedAt: string
  seasonCount: number
}

export interface PositionBias {
  QB: number; RB: number; WR: number; TE: number; K: number; DST: number
}

export interface DraftRoomState {
  draftId: string
  currentPick: number
  currentRound: number
  userTeamIndex: number
  picks: DraftPick[]
  rosters: Record<string, Roster>
  board: DraftBoard
  availablePlayers: DraftPlayer[]
  settings: LeagueSettings
}

export interface PickRecommendation {
  player: DraftPlayer
  score: number
  thesis: string
  counterThesis: string
  opportunityCost: string
  nextPickPlan: string
  whatMakesItWrong: string
  tierCliffAlert: TierCliffAlert | null
  positionRunAlert: PositionRunAlert | null
  futureAvailability: number  // 0-1 probability
  vorScore: number
  adpValue: number
  rosterFitScore: number
  tierUrgency: number
}

export interface TierCliffAlert {
  position: string
  tier: number
  playersRemaining: number
  picksUntilCliff: number
}

export interface PositionRunAlert {
  position: string
  consecutivePicksOfPosition: number
  percentageOfPositionGone: number
}

export type ParsedDraftPick = {
  overallPick: number
  round: number
  roundPick: number
  managerName: string
  playerName: string
  position: string
  nflTeam: string
  adpAtDraft?: number
  isKeeper?: boolean
}

export type ParsedAuctionBid = {
  managerName: string
  playerName: string
  position: string
  nflTeam: string
  finalBid: number
  nominatedBy?: string
}

export type DataLabel = 'ILLUSTRATIVE' | 'MODELED' | 'LICENSED'
```

**File**: `packages/types/src/index.ts`

Add `export * from './fantasy-draft'`

**Acceptance criteria**:
- `npm run db:generate` passes with zero errors
- `npm run typecheck` passes with zero errors
- All new types export cleanly

---

## PHASE 2: HISTORICAL DRAFT UPLOAD (Weeks 2-3)

### 2.1 Upload Parsers

**File**: `apps/web/lib/fantasy/parsers/snake-draft-csv.ts`
- `parseSnakeDraftCsv(csv: string): ParsedDraftPick[]`
- Handle Yahoo, ESPN, Sleeper, CBS format variations
- Detect column headers automatically; fall back to positional columns
- Trim whitespace, normalize position strings (RB/rb → RB)
- Throw `ParseError` with row number for malformed rows

**File**: `apps/web/lib/fantasy/parsers/auction-draft-csv.ts`
- `parseAuctionDraftCsv(csv: string): ParsedAuctionBid[]`
- Parse $X and X bid formats
- Detect platform format by header signature

**File**: `apps/web/lib/fantasy/parsers/draft-text-paste.ts`
- `parseDraftTextBoard(text: string): ParsedDraftPick[]`
- Regex parser for formats like: `Pick 1.01: Patrick Mahomes (QB - KC) - Team Alpha`
- Also handle: `1.01 Mahomes QB KC Team Alpha`
- Return partial parse results with `parseWarnings` array — do not throw on ambiguous rows

**File**: `apps/web/lib/fantasy/parsers/sleeper-api.ts`
- `parseSleeperDraftData(sleeperDraftJson: unknown): ParsedDraftPick[]`
- Normalize Sleeper draft JSON format (no OAuth — user must paste or export JSON)

**Tests** (required before Phase 3):
- `apps/web/lib/fantasy/parsers/__tests__/snake-draft-csv.test.ts`
- `apps/web/lib/fantasy/parsers/__tests__/auction-draft-csv.test.ts`
- `apps/web/lib/fantasy/parsers/__tests__/draft-text-paste.test.ts`
- Each test file includes: valid input → correct output, malformed input → ParseError with row, edge cases (empty, single row, BOM)

### 2.2 Upload API Routes

**File**: `apps/web/app/api/fantasy/leagues/[id]/seasons/[sid]/upload-draft/route.ts`
- POST: accepts `multipart/form-data` with CSV file OR JSON body with `draftData` string and `format` (`snake_csv|auction_csv|text_paste|sleeper_json`)
- Auth-gated (session required)
- Parses, normalizes, stores as `FantasyDraft` + `FantasyDraftPick` records
- Returns `{ draftId, picksImported, warnings }`

**File**: `apps/web/app/api/fantasy/leagues/[id]/seasons/[sid]/upload-results/route.ts`
- POST: accepts season standings JSON or CSV
- Stores `FantasyStanding` and `FantasyPlayoffResult` records

**File**: `apps/web/app/api/fantasy/leagues/[id]/seasons/[sid]/upload-transactions/route.ts`
- POST: accepts transaction history CSV or JSON
- Stores `FantasyTransaction` records

### 2.3 League Config API

**File**: `apps/web/lib/fantasy/league-service.ts`
- `createLeague(userId: string, input: CreateLeagueInput): Promise<FantasyLeague>`
- `listLeagues(userId: string): Promise<FantasyLeague[]>`
- `getLeague(id: string, userId: string): Promise<FantasyLeague & { seasons; managers }>`
- `updateLeague(id: string, userId: string, input: UpdateLeagueInput): Promise<FantasyLeague>`
- `createSeason(leagueId: string, input: CreateSeasonInput): Promise<FantasySeason>`
- `addManager(leagueId: string, input: AddManagerInput): Promise<FantasyManager>`
- Auth check: user must own or be member of league

**API routes**:
- `apps/web/app/api/fantasy/leagues/route.ts` — GET list, POST create
- `apps/web/app/api/fantasy/leagues/[id]/route.ts` — GET detail, PUT update, DELETE
- `apps/web/app/api/fantasy/leagues/[id]/seasons/route.ts` — GET list, POST create
- `apps/web/app/api/fantasy/leagues/[id]/managers/route.ts` — GET list, POST add

**File**: `apps/web/lib/fantasy/league-service.test.ts` — mocked Prisma, test all service functions

### 2.4 Upload UI

**File**: `apps/web/app/fantasy/war-room/league-setup/page.tsx` — league list + create form
**File**: `apps/web/app/fantasy/war-room/league-setup/upload/page.tsx` — draft upload wizard entry
**File**: `apps/web/components/fantasy/upload-draft-wizard.tsx`
- Step 1: Select league + season
- Step 2: Choose format (CSV, text paste, Sleeper JSON)
- Step 3: Preview parsed picks (show first 10, warn on errors)
- Step 4: Confirm + store

**Acceptance criteria**:
- Can upload a snake draft CSV; picks stored in DB
- Parse errors surface in UI with row-level detail
- `npm run typecheck` passes, tests pass

---

## PHASE 3: MANAGER GENOME ENGINE (Weeks 3-4)

**File**: `apps/web/lib/fantasy/manager-genome.ts`

Exported functions:

```typescript
computeGenome(managerId: string, seasons: FantasyManagerSeason[]): ManagerGenome
computeAdpAdherence(picks: FantasyDraftPick[], adpSource: AdpRecord[]): number
computePositionBias(picks: FantasyDraftPick[], roundRange?: [number, number]): PositionBias
computeRiskAppetite(picks: FantasyDraftPick[], adpSource: AdpRecord[]): number
computeRookieEnthusiasm(picks: FantasyDraftPick[], rookieList: string[]): number
computeInjuryAvoidance(picks: FantasyDraftPick[], injuryList: string[]): number
detectFavoriteTeamBias(picks: FantasyDraftPick[]): string | null
detectPanicDraftPattern(picks: FantasyDraftPick[], positionalRuns: PositionRun[]): number
computeWaiverAggression(transactions: FantasyTransaction[], leagueAvg: number): number
computeTradeActivity(trades: FantasyTrade[], leagueAvg: number): number
computeAuctionStrategy(bids: FantasyAuctionBid[]): AuctionStrategy | null
```

Genome dimension definitions:
- `adpAdherence`: Pearson correlation between actual pick position and ADP at draft time. +1 = always follows consensus, -1 = always fades consensus.
- `positionBias`: For each position, (manager's picks at position in rounds 1-5) / (league average picks at position in rounds 1-5). Above 1.0 = biased toward; below 1.0 = biased away.
- `riskAppetite`: Mean ADP-delta of all picks (actual pick - ADP). Negative = values hunter. Positive = reach tendency.
- `rookieEnthusiasm`: Compare manager rookie pick rate vs. league average rookie pick rate. Score normalized to [-1, 1].
- `injuryAvoidance`: Fraction of injury-flagged players avoided vs. league average avoidance rate.
- `favoriteTeamBias`: If manager has 2+ same-NFL-team players in rounds 1-8 (normalized by team popularity), flag team. Return null if no clear bias.
- `panicDraftScore`: Count of "position runs joined" (picked same position as 2+ consecutive picks before in rounds 3-10) / total picks in that range.
- `waiverAggression`: Manager's transaction count / league average. 1.0 = average.
- `tradeActivity`: Manager's trade count / league average. 1.0 = average.
- `auctionStrategy`: `{ starterBias: number, valueHunter: number, nominationAggression: number }` — only if auction data present.

**File**: `apps/web/lib/fantasy/manager-genome.test.ts`
- Fixture data: 3 synthetic managers with known tendencies
- Assert genome dimensions are within expected ranges
- Assert detectFavoriteTeamBias returns correct team when 3+ same-team picks in rounds 1-8

**API route**: `apps/web/app/api/fantasy/leagues/[id]/managers/[mid]/genome/route.ts`
- GET: compute or return cached genome
- Cache genome for 24h (store computedAt on FantasyDraftTendency records)
- Recompute if new season data uploaded

**Acceptance criteria**:
- Genome computes from fixture data with correct dimension values
- Tests pass, typecheck passes

---

## PHASE 4: HISTORICAL REGRET ENGINE (Week 4)

**File**: `apps/web/lib/fantasy/regret-engine.ts`

Purpose: For each draft pick, reconstruct what value the manager received vs. what they could have received if they had taken the best available at that slot.

Exported functions:

```typescript
computeRegretAnalysis(
  draft: FantasyDraft,
  picks: FantasyDraftPick[],
  seasonScores: PlayerSeasonScore[],  // gated: requires season scoring data
  adpSource: AdpRecord[]
): RegretAnalysis[]

classifyRegretCategory(
  processScore: number,   // was it a good process pick?
  outcomeScore: number    // did the player produce?
): FantasyRegretCategory

computeAlternativeBestAvailable(
  slotIndex: number,
  picks: FantasyDraftPick[],
  allPlayers: DraftPlayer[],
  seasonScores: PlayerSeasonScore[]
): DraftPlayer | null
```

**RegretCategory logic**:
- `GOOD_PROCESS_GOOD_OUTCOME`: picked near ADP, player produced → right call
- `GOOD_PROCESS_BAD_OUTCOME`: picked near ADP, player underproduced → variance/injury → not manager's fault
- `BAD_PROCESS_GOOD_OUTCOME`: reach pick, player produced → lucky
- `BAD_PROCESS_BAD_OUTCOME`: reach pick, player underproduced → classic mistake
- `INJURY_VARIANCE`: player was healthy at draft, missed 8+ games to injury
- `UNFORESEEABLE_CHANGE`: trade, scheme change, team change mid-season
- `KNOWN_RISK_IGNORED`: player had documented injury concern at draft; manager ignored it
- `MODEL_MISS`: model had high confidence, player underproduced without clear external cause
- `USER_BIAS`: detected via Bias Mirror integration (favorite team or anchoring)

**Data gate**: `seasonScores` parameter is `null` until a licensed scoring source is wired. When null, regret analysis returns process-only classification (ADP adherence, process score) without outcome delta. Label all outputs `DataLabel.MODELED` until licensed.

**File**: `apps/web/lib/fantasy/regret-engine.test.ts`
- Unit tests with synthetic pick data and synthetic season scores
- Assert each RegretCategory is correctly assigned for each fixture

**API route**: `apps/web/app/api/fantasy/leagues/[id]/seasons/[sid]/regret-analysis/route.ts`
- GET: compute or return cached regret analysis for a season

**File**: `apps/web/lib/fantasy/alternative-path-simulator.ts`
- `simulateAlternativeDraft(picks, alternatives, constraints): AlternativePathResult`
- Gated: requires historical scoring data. Returns empty result if data not licensed.

---

## PHASE 5: DRAFT WAR ROOM — LIVE BOARD (Weeks 4-6)

### 5.1 Draft Room State Engine

**File**: `apps/web/lib/fantasy/draft-room-state.ts`

```typescript
class DraftRoomStateEngine {
  initDraft(config: DraftConfig): DraftRoomState
  applyPick(state: DraftRoomState, pick: MakePick): DraftRoomState
  getAvailablePlayers(state: DraftRoomState): DraftPlayer[]
  getRosterForTeam(state: DraftRoomState, teamIndex: number): Roster
  computePickOrder(totalTeams: number, totalRounds: number, draftType: FantasyDraftType): number[][]
  detectPositionRun(state: DraftRoomState, windowSize?: number): PositionRunAlert | null
  detectTierCliff(state: DraftRoomState, position: string): TierCliffAlert | null
  isUserTurn(state: DraftRoomState): boolean
  picksUntilUserNextTurn(state: DraftRoomState): number
}
```

**File**: `apps/web/lib/fantasy/draft-room-state.test.ts`
- Test snake draft pick order (12 teams, 15 rounds)
- Test auction draft state transitions
- Test tier cliff detection with fixture player pool
- Test position run detection

**API route**: `apps/web/app/api/fantasy/draft/[id]/state/route.ts`
- GET: return current draft state
- SSE stream (EventSource) for live updates during mock draft

### 5.2 Mock Draft Engine

**File**: `apps/web/lib/fantasy/mock-draft.ts`

```typescript
class MockDraftEngine {
  init(config: MockDraftConfig): MockDraftState
  simulateAIPick(state: MockDraftState, teamIndex: number, genome?: ManagerGenome): PickResult
  applyUserPick(state: MockDraftState, playerName: string): MockDraftState
  applyAIPick(state: MockDraftState, teamIndex: number): MockDraftState
  runToUserTurn(state: MockDraftState): MockDraftState
  runFullDraft(state: MockDraftState): MockDraftState  // for bulk simulation
}
```

AI pick logic:
- Base: weighted random from available players, weighted by inverse ADP rank
- Position need adjustment: if team has no RB in rounds 1-4, increase RB weight × 1.4
- If Manager Genome available for that team index: apply genome adjustments (position bias, ADP adherence)
- Result is probabilistic — same input can produce different picks across runs

**File**: `apps/web/lib/fantasy/mock-draft.test.ts`

**API routes**:
- `apps/web/app/api/fantasy/mock-draft/route.ts` — POST init, GET state
- `apps/web/app/api/fantasy/mock-draft/[id]/pick/route.ts` — POST user pick
- `apps/web/app/api/fantasy/mock-draft/[id]/ai-pick/route.ts` — POST simulate next AI pick
- `apps/web/app/api/fantasy/mock-draft/[id]/run-to-user/route.ts` — POST advance to user's next turn

### 5.3 Pick Recommendation Engine

**File**: `apps/web/lib/fantasy/pick-recommendation.ts`

```typescript
recommendPick(state: DraftRoomState, opts: PickOpts): PickRecommendation
scorePlayer(player: DraftPlayer, state: DraftRoomState, opts: PickOpts): PlayerScore
computeVOR(players: DraftPlayer[], position: Position, replacementThreshold: number): Map<string, number>
computeADPValue(player: DraftPlayer, currentPick: number): number  // positive = value, negative = reach
computeRosterFit(player: DraftPlayer, roster: Roster, settings: LeagueSettings): number
computeTierUrgency(player: DraftPlayer, board: DraftBoard): number
```

VOR baseline: replacement level = player at the `(numberOfTeams × startingCountAtPosition)` rank in position. Score every player above replacement level. Normalize to 0-100.

Every `PickRecommendation` must include:
- `thesis`: 1-2 sentence evidence-based rationale
- `counterThesis`: strongest argument against this pick
- `opportunityCost`: best player foregone by taking this pick
- `nextPickPlan`: what the plan becomes at user's next turn if this pick is made
- `whatMakesItWrong`: specific scenario that invalidates the recommendation

**File**: `apps/web/lib/fantasy/pick-recommendation.test.ts`
- Test VOR computation with fixture player pool
- Test ADP value scoring (reaches vs. values)
- Test roster fit (no QB needed → lower QB score)
- Test tier urgency (last player in tier → high urgency)

### 5.4 Draft War Room UI

**File**: `apps/web/app/fantasy/war-room/draft/page.tsx` — main draft board page
**File**: `apps/web/components/fantasy/draft-board.tsx` — full board component
**File**: `apps/web/components/fantasy/player-pool-panel.tsx` — filterable, sortable player list
**File**: `apps/web/components/fantasy/roster-panel.tsx` — current user roster + all team rosters
**File**: `apps/web/components/fantasy/pick-card.tsx` — recommendation card with thesis/counter-thesis
**File**: `apps/web/components/fantasy/opponent-roster-panel.tsx` — other teams' rosters
**File**: `apps/web/components/fantasy/tier-cliff-radar.tsx` — visual tier break alert
**File**: `apps/web/components/fantasy/position-run-radar.tsx` — position run indicator

**Acceptance criteria**:
- Mock draft runnable end-to-end: init → AI picks advance → user makes pick → recommendation renders with thesis
- Tier cliff alert fires when final player in a tier is available at user's pick
- `npm run typecheck` passes, render tests pass

---

## PHASE 6: DRAFT FUTURES ENGINE (Week 6-7)

**File**: `apps/web/lib/fantasy/draft-futures.ts`

Purpose: Model what the draft board will look like at the user's next pick, given probabilistic AI behavior.

```typescript
computeTierSurvival(
  tier: PlayerTier,
  picksUntilNext: number,
  board: DraftBoard,
  adpSource: AdpRecord[]
): number  // 0-1 probability that at least one tier member survives to user's next pick

computePositionCliffProbability(
  position: Position,
  board: DraftBoard,
  picksUntilNext: number,
  adpSource: AdpRecord[]
): number  // 0-1 probability that a significant position run occurs before user's next pick

computePlayerReturnProbability(
  player: DraftPlayer,
  picksUntilNext: number,
  board: DraftBoard,
  adpSource: AdpRecord[]
): number  // 0-1 probability this player is still available at user's next pick

computeOpportunityCost(
  currentPick: DraftPlayer,
  alternative: DraftPlayer,
  board: DraftBoard,
  picksUntilNext: number
): OpportunityCostResult

runFuturesTree(
  state: DraftRoomState,
  depth?: number  // default: 2 picks ahead
): FuturesTree  // tree of probable board states
```

Algorithm: For each pick between now and user's next turn, compute probability that each available player is taken using ADP distribution as a proxy for pick probability. Monte Carlo: run N=500 simulations, record survivor sets. Probability = fraction of simulations where player survives.

**File**: `apps/web/lib/fantasy/draft-futures.test.ts`
- Test tier survival: all top-tier players gone by pick 5 → low survival probability
- Test player return: player at ADP 1 → low return probability
- Test opportunity cost output structure

---

## PHASE 7: OPPONENT ROOM MODEL (Week 7)

**File**: `apps/web/lib/fantasy/opponent-model.ts`

Purpose: For each opponent in the draft, estimate probability of taking each available player in their next N picks.

```typescript
buildOpponentModel(
  teams: DraftTeam[],
  genomes: Map<string, ManagerGenome>,  // nullable per team
  board: DraftBoard,
  adpSource: AdpRecord[]
): OpponentModel

estimateOpponentPickProbabilities(
  team: DraftTeam,
  genome: ManagerGenome | null,
  availablePlayers: DraftPlayer[],
  picksUntilTurn: number
): PlayerPickProbability[]

detectOpponentNeed(
  team: DraftTeam,
  settings: LeagueSettings
): PositionNeed[]
```

Model inputs:
1. Roster needs (what positions does each team lack?)
2. ADP baseline (what are players likely to go at?)
3. Manager Genome if available (adjust for known tendencies)
4. Recent picks in draft (detect positional run momentum)

Output: for each opponent × each available player → probability [0-1] that opponent takes that player in next 1, 2, or 3 picks.

**File**: `apps/web/lib/fantasy/opponent-model.test.ts`
- Fixture: 3-team draft, known rosters, known genomes
- Assert probability of RB-heavy manager taking next available RB is higher than baseline

---

## PHASE 8: PICK THESIS ENGINE (Week 8)

**File**: `apps/web/lib/fantasy/pick-thesis.ts`

Purpose: Generate structured evidence-based thesis for every recommendation. Connected to Signal Courtroom evidence format.

```typescript
generateThesis(
  recommendation: PickRecommendation,
  signals: DraftSignal[],
  state: DraftRoomState
): PickThesis

generateCounterThesis(
  recommendation: PickRecommendation,
  signals: DraftSignal[]
): CounterThesis

assessUncertainty(
  recommendation: PickRecommendation,
  signals: DraftSignal[]
): UncertaintyAssessment
```

Every thesis must:
- Name the primary reason for the pick (VOR, tier urgency, roster fit, ADP value)
- Reference at least one supporting signal or data point
- Quantify uncertainty where possible ("75% chance this tier survives to your next pick")

Every counter-thesis must:
- Name the strongest opposing reason
- Quantify the downside scenario ("if this player misses 4+ games, his VOR drops to baseline")

**Guidance on Claude API usage** (when enabled):
- Claude API is NOT the source of truth for player data
- Claude API may be used for natural language formatting of thesis text
- Thesis reasoning must be computed by the engine; Claude formats presentation only
- Rate limit: 1 Claude API call per recommendation, only in Elite tier

---

## PHASE 9: ROSTER DESTINY SIMULATOR (Weeks 8-9)

**File**: `apps/web/lib/fantasy/roster-destiny.ts`

Purpose: Given a current roster at any point in the draft, simulate how this roster performs over a full season.

```typescript
simulateRosterSeason(
  roster: Roster,
  settings: LeagueSettings,
  simulationCount?: number  // default 500
): RosterDestinyResult

computeWeeklyLineupExpectation(
  roster: Roster,
  week: number,
  settings: LeagueSettings
): LineupExpectation

computeByeWeekExposure(
  roster: Roster,
  settings: LeagueSettings
): ByeWeekExposure

computePlayoffSchedule(
  roster: Roster,
  settings: LeagueSettings,
  playoffWeeks: number[]
): PlayoffScheduleScore

computeTradeLeverage(
  roster: Roster,
  tradeTarget: Player
): TradeLeverageScore
```

Output includes:
- Projected wins range (P10, P50, P90)
- Playoff qualification probability
- Weakest weeks (by-bye exposure, injury concentration)
- Trade leverage score (does roster have surplus to offer?)

**Data gate**: All projections are clearly labeled `DataLabel.MODELED` until a licensed scoring source is wired. Do not present modeled output as real projections.

**File**: `apps/web/lib/fantasy/roster-destiny.test.ts`

---

## PHASE 10: VOICE JARVIS INTEGRATION (Weeks 9-11)

### 10.1 Backend Context Layer

**File**: `apps/web/lib/fantasy/jarvis-draft-context.ts`

```typescript
buildJarvisSystemPrompt(
  state: DraftRoomState,
  userHistory: UserDraftHistory,
  mode: 'short' | 'long'
): string

buildPickQueryContext(
  query: string,
  state: DraftRoomState,
  recommendation: PickRecommendation | null
): JarvisContext

formatJarvisResponse(raw: string, mode: 'short' | 'long'): string
```

System prompt includes:
- Current pick number, round, team position
- User's current roster
- Top 3 recommendations with thesis summaries
- Tier cliff alerts active
- Position run alerts active
- User's genome summary (if computed)

**File**: `apps/web/app/api/fantasy/jarvis/draft-query/route.ts`
- POST `{ query: string, draftStateId: string, mode: 'short' | 'long' }`
- Auth: session required, Elite tier required
- Builds context, calls Claude API, returns formatted response
- No auto-drafting: response is advisory only, no pick mutations
- Rate limit: 10 queries per draft session

### 10.2 Voice UI Component

**File**: `apps/web/components/fantasy/voice-jarvis-panel.tsx`
- Web Speech API for voice input (browser-native, no audio storage server-side)
- Browser TTS (`window.speechSynthesis`) for response playback
- Push-to-talk interface (hold spacebar or button)
- Short/long answer toggle
- Text fallback for non-voice environments
- Displays recommendation with thesis inline

### Voice Guardrails
- No auto-drafting without explicit user platform permission
- Responses are advisory only
- Short mode: max 2 sentences
- Long mode: structured response with thesis + counter-thesis
- No guaranteed outcome language
- No "best pick" language without uncertainty qualifier

---

## PHASE 11: DRAFT AUTOPSY (Weeks 9-10)

**File**: `apps/web/lib/fantasy/draft-autopsy.ts`

Purpose: Grade a completed draft on process quality. Process grade is separate from outcome grade.

```typescript
gradeCompletedDraft(
  draft: FantasyDraft,
  picks: FantasyDraftPick[],
  adpSource: AdpRecord[],
  genome: ManagerGenome | null
): DraftAutopsy

gradePickProcess(
  pick: FantasyDraftPick,
  state: DraftRoomStateAtPick,
  adpSource: AdpRecord[]
): PickProcessGrade

classifyProcessOutcomeCell(
  processGrade: PickProcessGrade,
  outcomeScore: number | null  // null until scoring data licensed
): RegretCategory

generateAutopsySummary(autopsy: DraftAutopsy): string
```

Process grade dimensions:
- ADP adherence (was this pick near consensus?)
- Roster fit at time of pick (did team need this position?)
- Tier consciousness (was there a tier break ignored?)
- Position run avoidance (did manager panic into a run?)
- Round value (did manager get market value or overpay/underpay?)

Connected to DFS autopsy/calibration pattern already established in DFS Optimizer.

**API route**: `apps/web/app/api/fantasy/leagues/[id]/seasons/[sid]/draft-autopsy/route.ts`

---

## PHASE 12: SEASON CONTINUITY HANDOFFS (Weeks 10-12)

**File**: `apps/web/lib/fantasy/season-continuity.ts`

Purpose: After draft completes, wire the draft results into existing season-long tools.

```typescript
handoffToWaiverPro(
  draft: FantasyDraft,
  roster: Roster,
  settings: LeagueSettings
): WaiverProContext

handoffToTradeCalculator(
  roster: Roster,
  leagueRosters: Roster[],
  genome: ManagerGenome
): TradeCalculatorContext

handoffToRosterCoach(
  roster: Roster,
  settings: LeagueSettings,
  weeklySchedule: NflWeeklySchedule
): RosterCoachContext
```

Data contracts:
- Draft → Waiver: roster composition, positional strengths/weaknesses, draft grade
- Draft → Trade: roster value by position, surplus/deficit, genome-informed negotiation hints
- Draft → Roster Coach: bye weeks, injury concentration, projected weak weeks

---

## WHAT NOT TO BUILD YET (Founder-Gated)

| Feature | Gate | Reason |
|---|---|---|
| Chrome extension for live draft room overlay | Platform ToS review + founder approval | Platform API terms unclear; could violate Yahoo/ESPN ToS |
| Real-money contests | Legal/compliance review | Gambling license implications vary by state |
| Yahoo/ESPN/Sleeper OAuth live sync | API ToS review + founder approval | Platform API terms for read access unclear |
| Real player projections | Licensed data source contract | Cannot present modeled projections as real without license |
| Sportsbook affiliate integration | Compliance review | Prediction-to-affiliate conflict of interest |
| Real DFS ownership data | Licensed data source | Must be purchased from authorized provider |

---

## TESTING REQUIREMENTS

Every phase must pass before the next phase begins:

| Test type | Requirement |
|---|---|
| Schema | Prisma generate succeeds; data model tests validate field types and relations |
| Parsers | CSV and text parsing with real-format examples; malformed input handling |
| Service layer | Unit tests with mocked Prisma client; all service functions covered |
| Engines | Pure function unit tests; all exported functions covered |
| API routes | Integration tests; auth enforcement; error response codes |
| UI | At minimum: render tests; interaction tests for upload wizard |

Test tooling already established: Vitest + Testing Library + Supertest. Follow existing patterns.

---

## ACCEPTANCE CRITERIA PER PHASE

| Phase | Done when |
|---|---|
| 1: Schema + Types | `npm run db:generate` passes, `npm run typecheck` passes, types export cleanly |
| 2: Upload + League Config | Upload wizard completes full flow; picks stored in DB; error cases handled |
| 3: Manager Genome | Genome computes from fixture data; all dimensions within expected ranges |
| 4: Regret Engine | Process categories assigned correctly on fixture data; data gate enforced |
| 5: Draft War Room | Mock draft runnable end-to-end; tier cliff + position run alerts fire |
| 6: Draft Futures | Tier survival + player return probabilities within expected ranges on fixtures |
| 7: Opponent Model | Per-opponent pick probabilities produced; genome adjustments applied |
| 8: Pick Thesis | Every recommendation includes thesis, counter-thesis, opportunity cost, what makes it wrong |
| 9: Roster Destiny | Season simulation produces P10/P50/P90 win ranges; data label enforced |
| 10: Voice Jarvis | Push-to-talk → draft query → response rendered; Elite tier gate enforced; no auto-draft |
| 11: Draft Autopsy | Process grade computed from fixture draft; process/outcome classification correct |
| 12: Season Continuity | Data contracts populated for Waiver Pro, Trade Calculator, Roster Coach |
