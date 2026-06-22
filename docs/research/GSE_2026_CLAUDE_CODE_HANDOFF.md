# Claude Code Implementation Handoff — Fantasy War Room Sprint

**Document type**: Direct implementation handoff — next Claude Code session starts here
**Repository**: /home/user/Sports
**Branch**: claude/laughing-wozniak-gyryjx
**Date**: 2026-06-22
**Previous sprint completed**: DFS Optimizer Phases 1-10 (all 466 tests pass, zero TS errors)
**Next sprint**: Fantasy War Room / Draft OS / League Memory / Voice Jarvis

Read this entire document before writing a single line of code. Every section is load-bearing.

---

## ORIENTATION: WHAT EXISTS AND WHAT IT IS

### Systems that are DONE — do not touch, do not refactor

| System | Location | Status |
|---|---|---|
| DFS Optimizer (all 10 phases) | `apps/web/lib/dfs/`, `workers/`, associated API routes | COMPLETE — 466 tests pass |
| Signal Courtroom | Exists in cockpit | LIVE — do not refactor |
| Agent War Room | Exists in cockpit | LIVE — do not refactor |
| GM Ledger + Process Grade | Exists in cockpit | LIVE — do not refactor |
| League Twin / Galaxy Slate Twin | `apps/web/lib/fantasy/league-twin.ts` | LIVE — extend only |
| Bias Mirror | Exists in cockpit | LIVE — wire to draft history, do not rewrite |
| Trust Ledger | Exists in cockpit | LIVE — do not refactor |
| Academy Simulator | `apps/web/lib/fantasy/academy.ts` | LIVE — do not refactor |
| GSN Transmission | Exists | LIVE — do not modify |
| Stripe/Auth/Entitlements | `apps/web/lib/stripe/`, `apps/web/lib/auth/` | LIVE — do not modify |
| Source Rights Registry | `apps/web/lib/scraping/source-rights-registry.ts` | LIVE — extend only |
| Scraping Clearance Engine | `apps/web/lib/scraping/clearance-engine.ts` | LIVE — call it, do not modify |

### Fantasy lib files that EXIST and need ENHANCEMENT (not replacement)

These files are scaffolded. Read them before writing new logic. Enhance the existing file; do not create a parallel file.

- `apps/web/lib/fantasy/draft.ts`
- `apps/web/lib/fantasy/waivers.ts`
- `apps/web/lib/fantasy/trade.ts`
- `apps/web/lib/fantasy/players.ts`
- `apps/web/lib/fantasy/lineup.ts`
- `apps/web/lib/fantasy/league-twin.ts`
- `apps/web/lib/fantasy/gm-ledger.ts`
- `apps/web/lib/fantasy/host.ts`
- `apps/web/lib/fantasy/studio.ts`
- `apps/web/lib/fantasy/academy.ts`
- `apps/web/lib/fantasy/scheme.ts`
- `apps/web/lib/fantasy/props.ts`
- `apps/web/lib/fantasy/autonomy.ts`
- `apps/web/lib/fantasy/competitive-baseline.ts`

### Systems that are NOT BUILT — build these in order

Manager Genome, Draft Upload Parsers, Draft Room State Engine, Mock Draft Engine, Pick Recommendation Engine, Draft Futures Engine, Opponent Room Model, Pick Thesis Engine, Roster Destiny Simulator, Voice Jarvis Draft Context.

---

## BUILD ORDER

**This order is strict.** Each phase must pass `npm run typecheck` and all tests before the next phase begins. Do not parallelize across phases.

---

### PHASE 1: Schema + Types

**This is the foundation. Everything depends on it. Do this first.**

#### 1a. Prisma Schema

File: `packages/db/prisma/schema.prisma`

Add these enums (append after existing enums, do not modify existing ones):

```prisma
enum FantasyDraftType {
  SNAKE
  AUCTION
  LINEAR
}

enum FantasyTransactionType {
  WAIVER_ADD
  WAIVER_DROP
  FAAB_BID
  TRADE
  FREE_AGENT
}

enum FantasyPlayoffResult {
  CHAMPION
  RUNNER_UP
  SEMI
  QUARTERFINAL
  MISS
}

enum FantasyRegretCategory {
  GOOD_PROCESS_GOOD_OUTCOME
  GOOD_PROCESS_BAD_OUTCOME
  BAD_PROCESS_GOOD_OUTCOME
  BAD_PROCESS_BAD_OUTCOME
  INJURY_VARIANCE
  UNFORESEEABLE_CHANGE
  KNOWN_RISK_IGNORED
  MODEL_MISS
  SOURCE_MISS
  USER_BIAS
}
```

Add these models (append after existing models, do not modify DFS models):

```prisma
model FantasyLeague {
  id            String           @id @default(cuid())
  userId        String
  name          String
  platform      String?          // yahoo, espn, sleeper, mfl, cbs, other
  scoringSystem Json             // custom scoring weights
  rosterSlots   Json             // position counts
  draftSettings Json?            // default draft settings
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  seasons       FantasySeason[]
  managers      FantasyManager[]

  @@index([userId])
}

model FantasySeason {
  id              String            @id @default(cuid())
  leagueId        String
  year            Int
  numberOfTeams   Int
  draftType       FantasyDraftType  @default(SNAKE)
  draftDate       DateTime?
  isKeeper        Boolean           @default(false)
  isDynasty       Boolean           @default(false)
  isSuperFlex     Boolean           @default(false)
  isIDP           Boolean           @default(false)
  isActive        Boolean           @default(false)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  league          FantasyLeague     @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  draft           FantasyDraft?
  standings       FantasyStanding[]
  playoffResults  FantasyPlayoffResult_[]
  transactions    FantasyTransaction[]
  trades          FantasyTrade[]
  rosterSnapshots FantasyRosterSnapshot[]

  @@index([leagueId])
  @@unique([leagueId, year])
}

model FantasyManager {
  id            String                  @id @default(cuid())
  leagueId      String
  userId        String?                 // nullable — other managers may not be GSE users
  displayName   String
  teamName      String?
  isCurrentUser Boolean                 @default(false)
  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt
  league        FantasyLeague           @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  profile       FantasyManagerProfile?
  tendencies    FantasyDraftTendency[]
  picks         FantasyDraftPick[]
  auctionBids   FantasyAuctionBid[]
  standings     FantasyStanding[]
  playoffResults FantasyPlayoffResult_[]
  regretAnalyses FantasyRegretAnalysis[]

  @@index([leagueId])
  @@index([userId])
}

model FantasyDraft {
  id              String              @id @default(cuid())
  seasonId        String              @unique
  draftType       FantasyDraftType
  draftDate       DateTime?
  totalRounds     Int
  pickTimeSeconds Int                 @default(90)
  auctionBudget   Int?
  rawInputSource  String?             // yahoo_csv, espn_csv, sleeper_json, text_paste
  completed       Boolean             @default(false)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  season          FantasySeason       @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  picks           FantasyDraftPick[]
  auctionBids     FantasyAuctionBid[]
  regretAnalyses  FantasyRegretAnalysis[]

  @@index([seasonId])
}

model FantasyDraftPick {
  id            String          @id @default(cuid())
  draftId       String
  managerId     String
  overallPick   Int
  round         Int
  roundPick     Int
  playerName    String
  position      String
  nflTeam       String
  adpAtDraft    Float?
  isKeeper      Boolean         @default(false)
  rawRow        String?         // original CSV row for audit
  createdAt     DateTime        @default(now())
  draft         FantasyDraft    @relation(fields: [draftId], references: [id], onDelete: Cascade)
  manager       FantasyManager  @relation(fields: [managerId], references: [id], onDelete: Cascade)

  @@index([draftId])
  @@index([managerId])
  @@unique([draftId, overallPick])
}

model FantasyAuctionBid {
  id              String          @id @default(cuid())
  draftId         String
  managerId       String
  playerName      String
  position        String
  nflTeam         String
  finalBid        Int
  nominatedBy     String?
  createdAt       DateTime        @default(now())
  draft           FantasyDraft    @relation(fields: [draftId], references: [id], onDelete: Cascade)
  manager         FantasyManager  @relation(fields: [managerId], references: [id], onDelete: Cascade)

  @@index([draftId])
  @@index([managerId])
}

model FantasyRosterSnapshot {
  id            String          @id @default(cuid())
  seasonId      String
  managerId     String
  week          Int
  rosterJson    Json
  snapshotDate  DateTime        @default(now())
  season        FantasySeason   @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  @@index([seasonId])
  @@index([managerId])
  @@index([seasonId, week])
}

model FantasyTransaction {
  id                String                  @id @default(cuid())
  seasonId          String
  managerId         String
  transactionType   FantasyTransactionType
  playerAddName     String
  playerDropName    String?
  faabBid           Int?
  processedDate     DateTime
  createdAt         DateTime                @default(now())
  season            FantasySeason           @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  @@index([seasonId])
  @@index([managerId])
}

model FantasyTrade {
  id                    String          @id @default(cuid())
  seasonId              String
  initiatorManagerId    String
  receiverManagerId     String
  initiatorAssetsJson   Json
  receiverAssetsJson    Json
  tradeDate             DateTime
  accepted              Boolean         @default(true)
  createdAt             DateTime        @default(now())
  season                FantasySeason   @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  @@index([seasonId])
}

model FantasyStanding {
  id              String          @id @default(cuid())
  seasonId        String
  managerId       String
  week            Int
  wins            Int             @default(0)
  losses          Int             @default(0)
  ties            Int             @default(0)
  pointsFor       Float           @default(0)
  pointsAgainst   Float           @default(0)
  rank            Int?
  createdAt       DateTime        @default(now())
  season          FantasySeason   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  manager         FantasyManager  @relation(fields: [managerId], references: [id], onDelete: Cascade)

  @@index([seasonId])
  @@index([managerId])
  @@unique([seasonId, managerId, week])
}

// Rename to avoid conflict with Prisma enum FantasyPlayoffResult
model FantasyPlayoffResult_ {
  id          String                  @id @default(cuid())
  seasonId    String
  managerId   String
  result      FantasyPlayoffResult
  finalRank   Int?
  createdAt   DateTime                @default(now())
  season      FantasySeason           @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  manager     FantasyManager          @relation(fields: [managerId], references: [id], onDelete: Cascade)

  @@index([seasonId])
  @@index([managerId])
  @@unique([seasonId, managerId])
}

model FantasyManagerProfile {
  id                    String          @id @default(cuid())
  managerId             String          @unique
  displayBio            String?
  yearsActive           Int             @default(0)
  lastComputedGenomeAt  DateTime?
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  manager               FantasyManager  @relation(fields: [managerId], references: [id], onDelete: Cascade)
}

model FantasyDraftTendency {
  id            String          @id @default(cuid())
  managerId     String
  dimension     String          // adpAdherence, positionBias_RB, riskAppetite, etc.
  score         Float
  computedAt    DateTime        @default(now())
  seasonCount   Int             @default(1)
  manager       FantasyManager  @relation(fields: [managerId], references: [id], onDelete: Cascade)

  @@index([managerId])
  @@unique([managerId, dimension])
}

model FantasyRegretAnalysis {
  id                          String                  @id @default(cuid())
  draftId                     String
  managerId                   String
  pickId                      String
  regretCategory              FantasyRegretCategory
  regretScore                 Float                   // 0-100
  alternativePlayerName       String?
  alternativePlayerActualValue Float?
  description                 String?
  computedAt                  DateTime                @default(now())
  draft                       FantasyDraft            @relation(fields: [draftId], references: [id], onDelete: Cascade)
  manager                     FantasyManager          @relation(fields: [managerId], references: [id], onDelete: Cascade)

  @@index([draftId])
  @@index([managerId])
}

model FantasyDraftStrategyPlan {
  id            String    @id @default(cuid())
  leagueId      String
  managerId     String
  season        Int
  strategyJson  Json
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([leagueId])
  @@index([managerId])
}
```

#### 1b. TypeScript Types

File: `packages/types/src/fantasy-draft.ts` (create new file)

```typescript
export type DataLabel = 'ILLUSTRATIVE' | 'MODELED' | 'LICENSED'

export type FantasyDraftTypeEnum = 'SNAKE' | 'AUCTION' | 'LINEAR'
export type FantasyTransactionTypeEnum = 'WAIVER_ADD' | 'WAIVER_DROP' | 'FAAB_BID' | 'TRADE' | 'FREE_AGENT'
export type FantasyPlayoffResultEnum = 'CHAMPION' | 'RUNNER_UP' | 'SEMI' | 'QUARTERFINAL' | 'MISS'
export type FantasyRegretCategoryEnum =
  | 'GOOD_PROCESS_GOOD_OUTCOME'
  | 'GOOD_PROCESS_BAD_OUTCOME'
  | 'BAD_PROCESS_GOOD_OUTCOME'
  | 'BAD_PROCESS_BAD_OUTCOME'
  | 'INJURY_VARIANCE'
  | 'UNFORESEEABLE_CHANGE'
  | 'KNOWN_RISK_IGNORED'
  | 'MODEL_MISS'
  | 'SOURCE_MISS'
  | 'USER_BIAS'

export type DraftPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'FLEX' | 'SFLX' | 'IDP'

export interface PositionBias {
  QB: number
  RB: number
  WR: number
  TE: number
  K: number
  DST: number
}

export interface AuctionStrategy {
  starterBias: number       // how much manager pays up for starters vs. handcuffs
  valueHunter: number       // tendency to find bargains in mid-auction
  nominationAggression: number // nominate expensive players to drain budgets
}

export interface ManagerGenome {
  managerId: string
  adpAdherence: number         // Pearson correlation [-1, 1]; +1 = follows ADP exactly
  positionBias: PositionBias   // ratio vs. league average; >1 = biased toward
  riskAppetite: number         // mean ADP-delta; negative = value hunter, positive = reach
  rookieEnthusiasm: number     // [-1, 1]; +1 = overweights rookies
  injuryAvoidance: number      // fraction of injured players avoided vs. league avg
  favoriteTeamBias: string | null  // NFL team code if detected, null otherwise
  panicDraftScore: number      // fraction of picks that joined a position run
  waiverAggression: number     // transaction count / league avg; 1.0 = average
  tradeActivity: number        // trade count / league avg; 1.0 = average
  auctionStrategy: AuctionStrategy | null  // null if no auction data
  computedAt: string           // ISO timestamp
  seasonCount: number          // how many seasons this genome is computed from
}

export interface DraftPlayer {
  name: string
  position: DraftPosition
  nflTeam: string
  adp: number
  tier: number
  projectedPoints?: number     // DataLabel: MODELED until licensed
  dataLabel: DataLabel
  injuryFlag: boolean
  isRookie: boolean
  byeWeek?: number
}

export interface DraftBoard {
  available: DraftPlayer[]
  drafted: Array<{ player: DraftPlayer; pickNumber: number; teamIndex: number }>
  pickNumber: number
  round: number
}

export interface Roster {
  teamIndex: number
  managerName: string
  picks: DraftPlayer[]
  positionCounts: Record<string, number>
}

export interface LeagueSettings {
  numberOfTeams: number
  totalRounds: number
  draftType: FantasyDraftTypeEnum
  scoring: Record<string, number>  // { passTd: 4, rushYd: 0.1, ... }
  rosterSlots: Record<string, number>  // { QB: 1, RB: 2, WR: 2, FLEX: 1, ... }
  isSuperflex: boolean
  isSuperFlex: boolean
  isIDP: boolean
  isKeeper: boolean
  isDynasty: boolean
  auctionBudget?: number
  playoffWeeks: number[]
}

export interface DraftRoomState {
  draftId: string
  currentPick: number
  currentRound: number
  userTeamIndex: number
  totalTeams: number
  totalRounds: number
  picks: Array<{ pickNumber: number; teamIndex: number; player: DraftPlayer }>
  rosters: Record<number, Roster>
  board: DraftBoard
  settings: LeagueSettings
  activeAlerts: Array<TierCliffAlert | PositionRunAlert>
}

export interface TierCliffAlert {
  type: 'TIER_CLIFF'
  position: string
  tier: number
  playersRemaining: number
  picksUntilCliff: number
}

export interface PositionRunAlert {
  type: 'POSITION_RUN'
  position: string
  consecutivePicksOfPosition: number
  percentageOfPositionGone: number
}

export interface PickRecommendation {
  player: DraftPlayer
  score: number               // 0-100 composite score
  thesis: string              // primary reason for pick
  counterThesis: string       // strongest argument against
  opportunityCost: string     // best player foregone
  nextPickPlan: string        // what the plan is at user's next turn
  whatMakesItWrong: string    // specific scenario that invalidates this recommendation
  tierCliffAlert: TierCliffAlert | null
  positionRunAlert: PositionRunAlert | null
  futureAvailability: number  // 0-1 probability player survives to next user pick
  vorScore: number
  adpValue: number            // positive = value, negative = reach
  rosterFitScore: number
  tierUrgency: number
  dataLabel: DataLabel
}

export interface OpportunityCostResult {
  bestAlternative: DraftPlayer
  alternativeVorScore: number
  costDescription: string
}

export interface FuturesTree {
  picksUntilUserTurn: number
  tierSurvivalProbabilities: Record<string, number>  // tierId → probability
  playerReturnProbabilities: Record<string, number>  // playerName → probability
  positionCliffProbabilities: Record<string, number>  // position → probability
  simulationCount: number
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
  rawRow?: string
}

export type ParsedAuctionBid = {
  managerName: string
  playerName: string
  position: string
  nflTeam: string
  finalBid: number
  nominatedBy?: string
}

export type ParseError = {
  row: number
  rawRow: string
  message: string
}

export type ParseResult<T> = {
  records: T[]
  warnings: ParseError[]
  errors: ParseError[]
}

export interface MockDraftConfig {
  settings: LeagueSettings
  userTeamIndex: number
  playerPool: DraftPlayer[]
  genomes?: Map<number, ManagerGenome>  // teamIndex → genome; optional
}

export interface MockDraftState extends DraftRoomState {
  isMockDraft: true
  completedAt?: string
}

export interface PickOpts {
  targetPositions?: DraftPosition[]  // override position ranking
  avoidPlayers?: string[]
  mode?: 'auto' | 'manual'
}

export interface PositionNeed {
  position: DraftPosition
  priority: 'critical' | 'high' | 'medium' | 'low'
  currentCount: number
  targetCount: number
}

export interface PlayerPickProbability {
  player: DraftPlayer
  probability: number  // 0-1
  reasoning: string
}

export interface OpponentModel {
  teamIndex: number
  managerName: string
  needs: PositionNeed[]
  pickProbabilities: PlayerPickProbability[]
  genome: ManagerGenome | null
}

export interface PickThesis {
  primaryReason: string
  supportingSignals: string[]
  quantifiedUncertainty: string
}

export interface CounterThesis {
  primaryRisk: string
  quantifiedDownside: string
}

export interface UncertaintyAssessment {
  level: 'low' | 'medium' | 'high'
  primaryDriver: string
  mitigatingFactors: string[]
}

export interface RosterDestinyResult {
  simulationCount: number
  winsByWeek: Record<number, { p10: number; p50: number; p90: number }>
  playoffProbability: number
  championshipProbability: number
  weakestWeeks: number[]
  tradeLeverageScore: number
  byeWeekExposure: Record<number, number>  // week → number of starters on bye
  dataLabel: DataLabel
}

export interface DraftAutopsy {
  draftId: string
  managerId: string
  overallProcessGrade: string    // A+, A, A-, B+, B, B-, C+, C, C-, D, F
  processScore: number           // 0-100
  pickGrades: PickProcessGrade[]
  regretCategories: Record<FantasyRegretCategoryEnum, number>  // count per category
  topMistakes: PickProcessGrade[]
  topSuccesses: PickProcessGrade[]
  summary: string
}

export interface PickProcessGrade {
  pickId: string
  overallPick: number
  playerName: string
  processGrade: string
  adpAdherence: number
  rosterFitScore: number
  tierConsciousness: number
  positionRunAvoidance: number
  roundValue: number
  regretCategory?: FantasyRegretCategoryEnum
}

export interface JarvisContext {
  query: string
  systemPrompt: string
  draftState: DraftRoomState
  topRecommendations: PickRecommendation[]
  activeAlerts: Array<TierCliffAlert | PositionRunAlert>
  mode: 'short' | 'long'
}
```

File: `packages/types/src/index.ts` — add at end: `export * from './fantasy-draft'`

#### 1c. Acceptance

Run these in order. All must pass before Phase 2:

```bash
npm run db:generate
npm run typecheck
npm run test
```

---

### PHASE 2: League Config Service + API

#### Files to create

`apps/web/lib/fantasy/league-service.ts`

All functions must:
- Accept userId and verify ownership before any mutation
- Use Prisma client from `packages/db`
- Throw `Error` with specific message on auth failure (not 403 — throw; let route handler return 403)

Functions required:
```typescript
createLeague(userId: string, input: CreateLeagueInput): Promise<FantasyLeague>
listLeagues(userId: string): Promise<FantasyLeague[]>
getLeague(id: string, userId: string): Promise<FantasyLeague & { seasons: FantasySeason[]; managers: FantasyManager[] }>
updateLeague(id: string, userId: string, input: UpdateLeagueInput): Promise<FantasyLeague>
deleteLeague(id: string, userId: string): Promise<void>
createSeason(leagueId: string, userId: string, input: CreateSeasonInput): Promise<FantasySeason>
addManager(leagueId: string, userId: string, input: AddManagerInput): Promise<FantasyManager>
```

`apps/web/app/api/fantasy/leagues/route.ts`
- GET: session required, returns `listLeagues(session.user.id)`
- POST: session required, validates body, calls `createLeague`

`apps/web/app/api/fantasy/leagues/[id]/route.ts`
- GET: session required, calls `getLeague`
- PUT: session required, calls `updateLeague`
- DELETE: session required, calls `deleteLeague`

`apps/web/app/api/fantasy/leagues/[id]/seasons/route.ts`
- GET: session required
- POST: session required, calls `createSeason`

`apps/web/app/api/fantasy/leagues/[id]/managers/route.ts`
- GET: session required
- POST: session required, calls `addManager`

`apps/web/lib/fantasy/league-service.test.ts`
- Mock Prisma: `vi.mock('packages/db', () => ({ prisma: mockPrisma }))`
- Test all service functions with mocked responses
- Test auth failures (wrong userId returns error)

---

### PHASE 3: Draft Upload Parsers

#### Critical: test files must be created alongside each parser.

`apps/web/lib/fantasy/parsers/snake-draft-csv.ts`

```typescript
export function parseSnakeDraftCsv(csv: string): ParseResult<ParsedDraftPick>
```

Handle column detection:
- Yahoo CSV headers: `Round`, `Pick`, `Team`, `Player Name`, `Position`, `NFL Team`
- ESPN CSV: `RD`, `PK`, `TEAM`, `PLAYER NAME`, `POS`, `PRO TEAM`
- Sleeper export: `round`, `pick_no`, `picked_by`, `full_name`, `position`, `team`
- CBS: `Rd`, `Pk`, `Team Name`, `Player`, `Pos`, `Pro Team`
- Positional fallback: columns 0-5 in detected order

Normalize:
- Position to uppercase (`rb` → `RB`)
- NFL team to 2-3 letter uppercase code
- Trim all whitespace
- Parse overallPick from round × teamsInRound + roundPick if not present

`apps/web/lib/fantasy/parsers/auction-draft-csv.ts`

```typescript
export function parseAuctionDraftCsv(csv: string): ParseResult<ParsedAuctionBid>
```

Handle bid formats: `$45`, `45`, `45.00`

`apps/web/lib/fantasy/parsers/draft-text-paste.ts`

```typescript
export function parseDraftTextBoard(text: string): ParseResult<ParsedDraftPick>
```

Must handle at minimum:
- `Pick 1.01: Patrick Mahomes (QB - KC) - Team Alpha`
- `1.01 Mahomes QB KC Team Alpha`
- `Round 1, Pick 1: Patrick Mahomes, QB, KC (Team Alpha)`

Return partial results with warnings — do not throw on ambiguous rows.

`apps/web/lib/fantasy/parsers/sleeper-api.ts`

```typescript
export function parseSleeperDraftData(json: unknown): ParseResult<ParsedDraftPick>
```

Normalize Sleeper draft JSON format (no OAuth — user pastes exported JSON).

Tests (create alongside each parser):
- `apps/web/lib/fantasy/parsers/__tests__/snake-draft-csv.test.ts`
- `apps/web/lib/fantasy/parsers/__tests__/auction-draft-csv.test.ts`
- `apps/web/lib/fantasy/parsers/__tests__/draft-text-paste.test.ts`

Each test file must include:
1. Valid Yahoo/ESPN/Sleeper format input → correct ParsedDraftPick[]
2. Malformed row → ParseError with row number in errors[]
3. Empty input → empty records, no throw
4. BOM character at start of CSV → handled correctly

Upload route: `apps/web/app/api/fantasy/leagues/[id]/seasons/[sid]/upload-draft/route.ts`
- POST multipart/form-data with file OR JSON body with `{ draftData: string, format: string }`
- Session required
- Parse → store FantasyDraft + FantasyDraftPick records
- Return `{ draftId: string, picksImported: number, warnings: ParseError[] }`

---

### PHASE 4: Manager Genome Engine

`apps/web/lib/fantasy/manager-genome.ts`

The genome is computed from historical picks. If a manager has only 1 season, compute with lower confidence (include `seasonCount: 1` in output). If 3+ seasons, higher confidence.

Each function must be a pure function (no side effects, no DB calls). The API route calls service functions that load data, then calls genome functions.

Exact function signatures:

```typescript
export function computeGenome(
  managerId: string,
  picks: FantasyDraftPick[],
  transactions: FantasyTransaction[],
  trades: FantasyTrade[],
  auctionBids: FantasyAuctionBid[],
  adpRecords: AdpRecord[],
  seasonCount: number
): ManagerGenome

export function computeAdpAdherence(
  picks: FantasyDraftPick[],
  adpRecords: AdpRecord[]
): number  // Pearson correlation; return 0 if adpRecords empty

export function computePositionBias(
  picks: FantasyDraftPick[],
  leaguePickDistribution: Record<string, number>,
  roundRange?: [number, number]
): PositionBias

export function computeRiskAppetite(
  picks: FantasyDraftPick[],
  adpRecords: AdpRecord[]
): number  // mean ADP-delta

export function computeRookieEnthusiasm(
  picks: FantasyDraftPick[],
  rookieList: string[]
): number

export function detectFavoriteTeamBias(
  picks: FantasyDraftPick[]
): string | null

export function detectPanicDraftPattern(
  picks: FantasyDraftPick[],
  windowSize?: number
): number

export function computeWaiverAggression(
  transactions: FantasyTransaction[],
  leagueAvgTransactions: number
): number

export function computeTradeActivity(
  trades: FantasyTrade[],
  leagueAvgTrades: number
): number

export interface AdpRecord {
  playerName: string
  adp: number
  position: string
}
```

`apps/web/lib/fantasy/manager-genome.test.ts`

Fixture data: define 3 managers inline with known tendencies.
- Manager A: strict ADP follower (adpAdherence should be ~0.9), RB-heavy in rounds 1-3
- Manager B: constant reacher (adpAdherence ~-0.3), QB-early
- Manager C: value hunter (riskAppetite strongly negative), no position bias

Assert each genome dimension is within expected range (not exact — probabilistic).
Assert `detectFavoriteTeamBias` returns `'KC'` when manager has 3 KC picks in rounds 1-8.

API route: `apps/web/app/api/fantasy/leagues/[id]/managers/[mid]/genome/route.ts`
- GET: load manager picks/transactions/trades from DB, compute genome, cache in FantasyDraftTendency
- If `computedAt` < 24 hours ago and no new season data, return cached

---

### PHASE 5: Pick Recommendation Engine

`apps/web/lib/fantasy/pick-recommendation.ts`

This is the core of the draft room. Every draft UI feature is downstream of this.

**Important**: Player data comes from user-uploaded player pool or an illustrative pool. Gate real projections. All `PickRecommendation` outputs must carry `dataLabel: 'MODELED'` until a licensed projection source is wired.

```typescript
export function recommendPick(
  state: DraftRoomState,
  opts: PickOpts
): PickRecommendation

export function scorePlayer(
  player: DraftPlayer,
  state: DraftRoomState,
  opts: PickOpts
): number  // 0-100 composite

export function computeVOR(
  players: DraftPlayer[],
  position: DraftPosition,
  numberOfTeams: number,
  startersPerTeam: number
): Map<string, number>  // playerName → VOR score

export function computeADPValue(
  player: DraftPlayer,
  currentPick: number
): number  // positive = value, negative = reach

export function computeRosterFit(
  player: DraftPlayer,
  roster: Roster,
  settings: LeagueSettings
): number  // 0-1

export function computeTierUrgency(
  player: DraftPlayer,
  board: DraftBoard
): number  // 0-1; 1 = last player in tier

export function generateThesis(
  player: DraftPlayer,
  score: number,
  vorScore: number,
  adpValue: number,
  rosterFit: number,
  tierUrgency: number
): string

export function generateCounterThesis(
  player: DraftPlayer,
  score: number,
  board: DraftBoard
): string

export function generateNextPickPlan(
  player: DraftPlayer,
  state: DraftRoomState,
  opts: PickOpts
): string
```

VOR baseline: replacement level = player at rank `(numberOfTeams × startersPerTeam) + 1` for the position. VOR = player projected points - replacement level projected points. If no projected points (illustrative data), use ADP rank as proxy.

`apps/web/lib/fantasy/pick-recommendation.test.ts`

- Test VOR: fixture pool of 30 RBs; verify player 1 has highest VOR, player 25+ has 0 or near-0
- Test ADP value: player at ADP 10 taken at pick 5 → positive value; taken at pick 15 → negative
- Test roster fit: user already has 2 RBs → lower RB fit score; 0 QB → higher QB fit score
- Test tier urgency: last player in a tier → score near 1.0
- Test recommendation output includes thesis, counterThesis, opportunityCost, nextPickPlan, whatMakesItWrong

---

### PHASE 6: Mock Draft Engine

`apps/web/lib/fantasy/mock-draft.ts`

```typescript
export class MockDraftEngine {
  private state: MockDraftState

  constructor(config: MockDraftConfig)
  getState(): MockDraftState
  simulateAIPick(teamIndex: number): PickResult
  applyUserPick(playerName: string): MockDraftState
  runToUserTurn(): MockDraftState
  isComplete(): boolean
}

export function initMockDraft(config: MockDraftConfig): MockDraftState

// AI pick logic:
// 1. Compute position weights for this team based on roster needs
// 2. If genome available: adjust weights by genome's positionBias
// 3. Score all available players: inversely by ADP rank + position weight
// 4. Weighted random selection from top N=20 candidates
// 5. Apply adpAdherence from genome: high adpAdherence = less variance in selection
```

`apps/web/lib/fantasy/mock-draft.test.ts`
- Test 12-team, 15-round mock draft completes without error
- Test snake pick order is correct (team 1 picks 1, 24, 25; team 12 picks 12, 13, 36)
- Test AI pick for RB-heavy genome favors RBs in early rounds
- Test user pick removes player from available board

API routes:
- `apps/web/app/api/fantasy/mock-draft/route.ts` — POST `{ config }` → `{ mockDraftId, state }`; GET `{ mockDraftId }` → state
- `apps/web/app/api/fantasy/mock-draft/[id]/pick/route.ts` — POST `{ playerName }` → updated state
- `apps/web/app/api/fantasy/mock-draft/[id]/ai-pick/route.ts` — POST → simulate next AI pick, return state
- `apps/web/app/api/fantasy/mock-draft/[id]/run-to-user/route.ts` — POST → advance all AI picks until user's turn, return state

Mock draft state is in-memory (no DB storage needed for mock). Use a simple in-memory Map keyed by mockDraftId with a TTL. Or store in Redis if REDIS_URL is available.

---

### PHASE 7: Draft Futures Engine

`apps/web/lib/fantasy/draft-futures.ts`

```typescript
export function computeTierSurvival(
  tier: number,
  position: DraftPosition,
  picksUntilNext: number,
  board: DraftBoard,
  adpRecords: AdpRecord[]
): number  // 0-1

export function computePositionCliffProbability(
  position: DraftPosition,
  board: DraftBoard,
  picksUntilNext: number,
  adpRecords: AdpRecord[]
): number

export function computePlayerReturnProbability(
  player: DraftPlayer,
  picksUntilNext: number,
  board: DraftBoard,
  adpRecords: AdpRecord[]
): number

export function runFuturesSimulation(
  board: DraftBoard,
  picksUntilNext: number,
  adpRecords: AdpRecord[],
  simulationCount?: number  // default 500
): FuturesTree
```

Algorithm for `runFuturesSimulation`:
1. For each simulation, for each pick between now and user's next turn:
   - Compute pick probability for each available player using ADP as weight (player with ADP closest to current pick number has highest probability)
   - Sample one player using weighted random
   - Remove from available pool
2. After all simulations, for each player, compute fraction of simulations where player was not taken = returnProbability

`apps/web/lib/fantasy/draft-futures.test.ts`
- Test: when only 1 player remains in a tier, tier survival = low regardless of picks
- Test: player with ADP far ahead of current pick has high return probability
- Test: player with ADP at current pick has low return probability

---

### PHASE 8: Voice Jarvis Context Layer

**Gate check before building**: Confirm Elite tier is active and Claude API budget is approved. This phase requires Claude API calls.

`apps/web/lib/fantasy/jarvis-draft-context.ts`

```typescript
export function buildJarvisSystemPrompt(
  state: DraftRoomState,
  userGenome: ManagerGenome | null,
  mode: 'short' | 'long'
): string

export function buildPickQueryContext(
  query: string,
  state: DraftRoomState,
  topRecommendations: PickRecommendation[]
): JarvisContext

export function formatJarvisResponse(
  raw: string,
  mode: 'short' | 'long'
): string
// short mode: strip to 2 sentences max
// long mode: structure into thesis + recommendation + caveat
```

System prompt must include:
- Current pick number and round
- User's current roster (positions filled, positions needed)
- Top 3 recommendations with thesis summaries
- Any active tier cliff or position run alerts
- User genome summary if available ("You historically reach for QBs in round 3; current recommendation is RB")
- Hard constraint: "You are an advisory assistant only. You cannot make picks. Do not guarantee any outcome."

`apps/web/app/api/fantasy/jarvis/draft-query/route.ts`

```typescript
// POST { query: string, draftStateId: string, mode: 'short' | 'long' }
// Auth: session required
// Entitlement: Elite tier required (check subscription tier, return 403 if not Elite)
// Rate limit: 10 queries per draft session (store count in session or Redis)
// Calls Claude API with buildJarvisSystemPrompt + buildPickQueryContext
// Returns { response: string, mode: string, queryCount: number }
// No mutations to draft state — read only
```

`apps/web/components/fantasy/voice-jarvis-panel.tsx`

- Web Speech API (`window.SpeechRecognition`) for input — check browser support, graceful fallback to text
- `window.speechSynthesis` for response playback — optional, user can toggle
- Push-to-talk: hold spacebar OR tap microphone button
- Short/long mode toggle
- Renders top recommendation inline below response
- Shows remaining query count (10 per session)
- No audio data sent to server — only transcript text

---

### PHASE 9: Draft War Room UI

Build only after Phases 1-8 are complete and all services are tested.

`apps/web/app/fantasy/war-room/page.tsx` — entry: league list, "Start Mock Draft" button, "Upload Past Draft" button
`apps/web/app/fantasy/war-room/draft/page.tsx` — main draft board, loads mock draft state, connects to recommendation engine
`apps/web/components/fantasy/draft-board.tsx` — full board: pick grid (rounds × teams), color-coded by position
`apps/web/components/fantasy/player-pool-panel.tsx` — filterable player list (position filter, search, sort by score/ADP/VOR), shows data label badge
`apps/web/components/fantasy/roster-panel.tsx` — user's current roster with filled/empty slots
`apps/web/components/fantasy/pick-card.tsx` — top recommendation with thesis, counter-thesis, future availability bar
`apps/web/components/fantasy/tier-cliff-radar.tsx` — visual alert when a tier is about to close
`apps/web/components/fantasy/position-run-radar.tsx` — position run heat indicator
`apps/web/components/fantasy/futures-panel.tsx` — tier survival and player return probability bars
`apps/web/components/fantasy/bias-mirror-nudge.tsx` — shows genome-detected bias when recommendation aligns with known bias ("Note: you historically reach for QBs — this pick follows that pattern")

All components must:
- Use existing design system (no new color definitions)
- Show `DataLabel` badge on all player/projection data
- Have at minimum render tests

---

### PHASE 10: Cockpit Integration

`apps/web/app/cockpit/fantasy-war-room/page.tsx`
- League list with season count
- Manager genome summary (top 3 dimensions per manager)
- Draft history upload status per league
- Link to run mock draft

Add nav link in existing cockpit navigation. Do not break existing cockpit pages.

---

## SAFETY GATES

These are hard stops — not guidelines. Enforce them in every phase.

### Data label enforcement

Every piece of player/projection data must carry `DataLabel`:
- `'ILLUSTRATIVE'` — synthetic/demo data, clearly labeled as example
- `'MODELED'` — computed by GSE model, not from licensed source
- `'LICENSED'` — from a licensed, contracted data provider

Do not present MODELED data as if it were LICENSED. Every UI component that displays projections must show the badge.

### No real player projections without license

Until a projection data source contract is signed (owner action item), all player projected point values must be:
1. Labeled `'MODELED'` or `'ILLUSTRATIVE'`
2. Marked with a visible disclaimer in the UI
3. Not referenced in any marketing copy as "real projections"

### No Voice Jarvis response that claims guaranteed outcome

The Jarvis system prompt must include: "You are an advisory assistant only. Do not guarantee any outcome. Do not say 'you should take' — say 'the recommendation is.' Do not say 'this will win you the league' — say 'this improves your expected points.' Under no circumstances suggest auto-drafting."

### No auto-drafting

No code path should ever submit a pick on the user's behalf without explicit user action (click or confirmed voice command with confirmation step). Auto-draft is not a feature — it is a liability.

### No live platform sync without ToS approval

Do not write any code that reads draft state from Yahoo/ESPN/Sleeper live feeds. If user asks for this, return: "Live sync requires platform ToS review — coming soon."

---

## ANTI-PATTERNS TO AVOID

1. Do not add `any` types. TypeScript strict mode is enforced. If a type is genuinely unknown, use `unknown` and narrow it.
2. Do not skip tests. No phase is complete without passing tests.
3. Do not modify DFS optimizer files. They are done. Leave them alone.
4. Do not modify Stripe/auth/entitlement infrastructure. They are live.
5. Do not create new color definitions — use existing design tokens.
6. Do not fabricate player data. Use clearly-labeled illustrative fixtures.
7. Do not call the Scraping Clearance Engine with any fantasy source that isn't in the source-rights-registry. If unsure, do not scrape.
8. Do not build evasion tooling (CAPTCHA bypass, credential misuse, proxy rotation). These are permanently excluded per CLAUDE.md.
9. Do not build the Chrome extension or live OAuth sync — these are founder-gated.
10. Do not present uncertainty as certainty. Every recommendation must include what makes it wrong.

---

## HOW TO START

1. Read `packages/db/prisma/schema.prisma` — understand the existing DFS models before appending fantasy models.
2. Read existing fantasy lib files (list in ORIENTATION section above) before writing new ones.
3. Run `npm run typecheck` to confirm baseline passes before you write anything.
4. Run `npm run test` to confirm 466 tests pass before you write anything.
5. Append fantasy enums and models to schema.prisma.
6. Run `npm run db:generate`.
7. Create `packages/types/src/fantasy-draft.ts`.
8. Add export to `packages/types/src/index.ts`.
9. Run `npm run typecheck`. Fix all errors before Phase 2.
10. Proceed in order.
