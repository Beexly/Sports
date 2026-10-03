# Intelligence Graph — v0 Specification

**Status:** Phase 2 foundation work. Codex implements; Claude provides fixtures and "what good looks like" specs.
**Owner of code:** Codex.
**Owner of contract:** Claude.
**Location:** `apps/web/lib/intelligence-graph/`.
**Decision reference:** master plan Part 6 DEC-016.

---

## TL;DR

A typed primitives module that sits on top of the existing schema and produces composite read models for every downstream surface. Pure TypeScript, no DB writes (v0), no UI. The Intelligence Graph is the platform brain — Galaxy Studio, Game Intelligence Rooms, B2B widgets, and the public API all read from it.

This spec defines the types, the constructors, and the invariants. Codex picks the file layout, the function signatures, and the test shape.

---

## Why a typed primitives layer

Today the codebase reads from `Pick`, `PickSignalSnapshot`, `GameSignal`, `SourceSnapshot`, `Promotion`, etc., directly. Every surface implements its own composition (homepage cards, /picks page, cockpit pages all re-derive similar shapes from the same raw tables).

The Intelligence Graph collapses that into a single composition layer. Surfaces consume `GameIntelligenceNode` and `SlateWeather`; the graph is the only thing that knows how to assemble them.

Three reasons to do this in Phase 2:

1. **Galaxy Studio (Phase 3)** and **Game Intelligence Rooms (Phase 3)** both need to read a coherent composite view of a single game. Building Studio without the graph means Studio re-implements the composition. Building the graph first means Studio + Rooms + the B2B widgets all read from one place.
2. **Trust gates** (`PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`, etc.) are easier to enforce at one composition layer than at every consumer.
3. **The Sports Intelligence OS frame** (master plan Part 0) treats one game as one unit of intelligence. The graph is the typed expression of that unit.

---

## Core types

### `GameIntelligenceNode`

The composite read model for one game.

```ts
type GameIntelligenceNode = {
  // Identity
  gameId: string;
  externalId: string;
  sport: SportKey;
  league: string;
  startsAt: Date;
  status: GameStatus;

  // Teams
  home: TeamRef;
  away: TeamRef;

  // Market state
  marketPulse: MarketPulse;

  // Engine state
  edgeIndex: number | null;         // public per DEC-003
  publishThresholdCleared: boolean;
  modelVersion: string;

  // Picks against this game (may be empty)
  picks: PickRef[];

  // Gating decision
  gateDecision: GateDecision;

  // Evidence
  evidenceHealth: EvidenceHealth;
  evidenceTimeline: EvidenceTimelinePoint[];

  // Bootstrap awareness
  isBootstrap: boolean;
  bootstrapReason: string | null;

  // Authoring meta
  composedAt: Date;
  composedFromIngestionRunId: string | null;
};
```

### `MarketPulse`

Per-game market state aggregate. Deterministic readout. No interpretation.

```ts
type MarketPulse = {
  consensus: ConsensusMetric;       // 0..1, weighted by book reliability
  depth: DepthMetric;               // dollar-weighted side depth across reporting books
  lineMovement: LineMovementMetric; // direction, magnitude, velocity since open
  volatility: VolatilityMetric;     // normalized vs market's usual range
  sharpMoneySignal: SharpMoneyMetric | null;  // null if no books reporting
  booksPolled: number;
  booksReporting: number;
  lastObservedAt: Date;
};
```

Each sub-metric type carries its own `confidence: 0..1` and `dataQualityFlag: enum`. The graph never erases data quality — it propagates it.

### `SlateWeather`

Daily context aggregate. One per slate per day.

```ts
type SlateWeather = {
  dateKey: string;                  // YYYY-MM-DD in venue-local time
  sportsActive: SportKey[];
  totalGamesTracked: number;
  totalGamesPublished: number;
  totalGamesGated: number;
  averageEdgeIndex: number | null;
  slateDensity: SlateDensityLabel;  // QUIET / NORMAL / HEAVY / OVERLOAD
  notableConditions: WeatherCondition[];  // outdoor weather, schedule clusters, etc.
  composedAt: Date;
};
```

### `EvidenceHealth`

Source-trust scoring across the signals feeding a game.

```ts
type EvidenceHealth = {
  overall: EvidenceGrade;           // A / B / C / D / F
  sourceMix: SourceMixEntry[];
  freshnessSeconds: number;
  bootstrapShare: number;           // 0..1 — fraction of evidence still bootstrap
  conflicts: ConflictReport[];      // when sources disagree materially
};
```

`EvidenceHealth.overall = 'F'` is a hard gate. The graph refuses to mark a game as `publishThresholdCleared` if evidence health is F, regardless of edge.

### `ModelCourtCase`

A Q&A exchange grounded in evidence. Phase 4 surface; Phase 2 ships the type.

```ts
type ModelCourtCase = {
  gameId: string;
  question: string;
  evidenceRefs: EvidenceRef[];      // local-only — never wider web sources
  answer: string;
  refusal: RefusalReason | null;    // null when answered; non-null when refused
  modelVersion: string;
  answeredAt: Date;
};
```

Phase 4 wires this to Claude API. Phase 2 type-defines it.

### `UserLens`

Fantasy / Fan / Bettor / Creator / Analyst view configuration. Selects which panels emphasize on a Game Room.

```ts
type UserLens =
  | { kind: 'FANTASY'; format: 'DFS' | 'SEASON_LONG' }
  | { kind: 'FAN'; team: TeamRef | null }
  | { kind: 'BETTOR'; tier: SubscriptionTier }
  | { kind: 'CREATOR'; outputs: CreatorAssetKind[] }
  | { kind: 'ANALYST' };
```

### `MonetizationSurface`

Entitlement-aware projection of an intelligence node. The function `projectForSurface(node, surface, viewer)` is the only thing that should compose a node for a render.

```ts
type MonetizationSurface =
  | 'PUBLIC_HOMEPAGE'
  | 'FREE_TIER_PICK_DETAIL'
  | 'PRO_TIER_PICK_DETAIL'
  | 'ELITE_TIER_PICK_DETAIL'
  | 'CREATOR_STUDIO'
  | 'B2B_WIDGET_MARKET_PULSE'
  | 'B2B_WIDGET_SLATE_WEATHER'
  | 'B2B_API_GAME_NODE';
```

Projection enforces:

- FREE tier sees Edge Index but not the factor breakdown.
- PRO tier sees the factor breakdown.
- ELITE tier sees the factor breakdown + the pre-mortem + the "What Was Learned" annotations.
- B2B widgets see only what the buyer paid for; the projection enforces this without the widget code needing to check entitlements.

### `CreatorAsset`

The Galaxy Studio output type. Phase 3 surface; Phase 2 type-defines it.

```ts
type CreatorAsset = {
  assetKind: CreatorAssetKind;
  derivedFromGameId: string;
  body: string;                     // the actual text/script/blurb
  citations: CitationRef[];         // every claim links to local evidence
  complianceScan: ComplianceScanResult;
  publicReady: boolean;             // false if compliance scan flagged anything
  generatedAt: Date;
  generatedFromModelVersion: string;
};

type CreatorAssetKind =
  | 'FAN_EXPLAINER'
  | 'FANTASY_ANGLE'
  | 'BETTING_EDUCATION'
  | 'X_THREAD'
  | 'TIKTOK_REELS_SCRIPT'
  | 'NEWSLETTER_BLOCK'
  | 'SPONSOR_SAFE_BLURB'
  | 'YOUTUBE_TITLE_IDEAS';
```

---

## Inputs

The graph reads from the existing schema. No new tables in v0.

- `Game` — identity, schedule, status.
- `Pick` — picks and their state.
- `PickSignalSnapshot` — settled-pick signal history.
- `GameSignal` — live signal history per game.
- `SourceSnapshot` — evidence registry.
- `IngestionRun` — freshness + bootstrap awareness.
- `LossAutopsy` (Phase 2 schema add) — when present, attaches to settled losing picks for the Galaxy Memory slot.
- `Promotion` — for sponsor-safe blurb compliance check (creator assets).

If a required input is missing, the constructor sets the relevant fields to `null` and marks `isBootstrap: true`. The graph never invents data.

---

## Constructors

All pure functions. No side effects. Easy to test.

```ts
buildGameIntelligenceNode(input: GameNodeInput): GameIntelligenceNode;
buildSlateWeather(input: SlateInput): SlateWeather;
buildMarketPulse(input: MarketPulseInput): MarketPulse;
buildEvidenceHealth(input: EvidenceHealthInput): EvidenceHealth;
projectForSurface<S extends MonetizationSurface>(
  node: GameIntelligenceNode,
  surface: S,
  viewer: ViewerContext,
): SurfaceProjection<S>;
```

Each constructor accepts an explicit input object (not a `Pick` or `Game` Prisma row directly). This lets the graph be tested with fixtures and lets the wiring layer translate between Prisma shapes and graph inputs.

The wiring layer lives separately at `apps/web/lib/intelligence-graph/wiring/` — that's where `db.pick.findMany` calls happen. The graph itself doesn't touch Prisma.

---

## Invariants

These are non-negotiable. Tests enforce them.

1. **No invented data.** If a source is missing, the field is `null` and `bootstrapShare` rises accordingly.
2. **Bootstrap propagation.** Any node composed from bootstrap signals has `isBootstrap: true`.
3. **No public EV/Kelly/win-rate.** The projection layer for any public surface returns shapes that do not include these fields. The graph computes them internally for engine use; projection strips them.
4. **Evidence-grade F is a hard gate.** `publishThresholdCleared` is `false` when evidence health is F.
5. **Model version stamped everywhere.** Every output includes the model version that produced it.
6. **Refusal is a first-class output.** `ModelCourtCase.refusal` can be non-null even when `answer` is empty.
7. **The graph never depends on a connector.** No network calls. No live API fetches. All data comes from the database.

---

## Tests

Codex picks the test shape. Recommended minimum coverage:

- One unit test per constructor with happy-path input.
- One unit test per constructor with missing-data input (verify bootstrap propagation).
- One unit test per surface projection (verify entitlement enforcement).
- One integration test wiring the graph against the existing schema seed data.
- One snapshot test verifying the graph output for a known game matches a fixture.

Fixtures live at `apps/web/__fixtures__/intelligence-graph/`. Claude writes the fixtures.

---

## Out of scope for v0

- No DB writes. The graph reads; it does not persist.
- No caching layer. Re-derive on every request. Phase 5 adds caching if perf demands it.
- No GraphQL. Internal TypeScript only.
- No public API. Phase 5 ships the B2B API on top of the graph.
- No real-time subscriptions. Re-derive on poll.

---

## Risk register

- **R-IG-1: Composition is slow.** If `buildGameIntelligenceNode` takes longer than 50ms on a representative game, the homepage will feel sluggish. Mitigation: profile in Phase 2 verification; add memoization if needed.
- **R-IG-2: Type drift.** If we add fields to `Pick` or `PickSignalSnapshot` and forget to extend the graph, surfaces will silently drop the new data. Mitigation: every schema change has a paired "does the graph need an update?" line in the PR description.
- **R-IG-3: Entitlement bypass.** If a surface reads from the underlying Prisma row directly instead of through the graph, it bypasses projection. Mitigation: lint rule in Phase 2 that flags direct `db.pick.findMany` calls in route handlers.

---

## Acceptance criteria (Phase 2 graph v0 → green)

1. Types defined in `apps/web/lib/intelligence-graph/types.ts`.
2. Constructors in `apps/web/lib/intelligence-graph/builders/`.
3. Surface projections in `apps/web/lib/intelligence-graph/projections/`.
4. Wiring layer in `apps/web/lib/intelligence-graph/wiring/`.
5. Tests in `apps/web/__tests__/intelligence-graph/` covering all invariants.
6. Fixtures in `apps/web/__fixtures__/intelligence-graph/` provided by Claude.
7. `npm run typecheck` green.
8. `DATABASE_URL=stub npm run test --workspace=apps/web` green.
9. At least one homepage component (probably Gate Cam) wired to read from the graph instead of raw Prisma in Phase 2.

When all nine hold, the graph is v0-complete.

---

## Open items

- **OPEN-IG-1:** Should `GameIntelligenceNode` include the full `evidenceTimeline` or a paginated cursor? Default: include the last 20 points; expose `evidenceTimelineCursor` for full history. Codex to confirm.
- **OPEN-IG-2:** How does the graph express "we considered this game and gated it"? Default: `gateDecision.outcome === 'GATED'` plus `gateDecision.reason: GateReason`. Codex to confirm shape.
- **OPEN-IG-3:** Should `ModelCourtCase` cache answers per `(gameId, questionHash)` pair? Default: no, Phase 4 conversational layer decides this; v0 type-only.

---

*Spec authored by Claude. Codex implements. Open items resolve via PR description or `docs/ops/decision-log.md`.*
