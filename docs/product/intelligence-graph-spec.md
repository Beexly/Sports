# Intelligence Graph — Spec

> Phase 2 foundation work. Pure TypeScript types + pure functions over
> existing data. No UI. No DB writes (initially). Powers every Sports
> Intelligence OS surface (Game Rooms, Studio, B2B widgets/API, Model
> Court, future creator/analyst lenses).
>
> Lives at `apps/web/lib/intelligence-graph/`. Tested in
> `apps/web/__tests__/intelligence-graph-*.test.ts` (new files per
> primitive).

## Why a typed primitives layer

Five surfaces (Game Rooms, Studio, B2B widgets, Model Court, future
calibration/lens views) all need the same projections of the same
underlying data. Without a shared layer, each surface re-derives the
same read-models, drifts independently, and ships subtly different
numbers for the same game.

The Intelligence Graph centralizes the projections so:

- Every surface that displays Market Pulse for a game sees the same
  numbers
- Bootstrap-canonical gating happens in one place
- The trust-claims rules apply uniformly
- Tests cover the projections directly, not their N consumers

## Inputs

Read-only from existing Prisma rows:

- `Game`
- `Pick`
- `PickSignalSnapshot`
- `GameSignal`
- `SourceSnapshot`
- `Promotion`
- `Odds`
- `IngestionRun` (for freshness checks)
- `LossAutopsy` (when it lands — see issue queue)
- Future: user/community signals (Phase 4+)

## Core types (Phase 2 v0)

### `GameIntelligenceNode`

The composite read-model for a single game. Returned by
`getGameIntelligence(gameId)`. Fields:

- `game: Game` — the underlying row
- `marketPulse: MarketPulse | null` — `null` when no odds yet
- `evidenceHealth: EvidenceHealth` — source-trust scoring
- `signals: GameSignal[]` — chronologically ordered, deduplicated
- `pick: Pick | null` — the published pick if one exists
- `pickSnapshot: PickSignalSnapshot | null` — the at-publish factor
  breakdown
- `gateDecision: GateDecision` — published / gated / not-yet-scored,
  with reasons (NEW in Phase 2 — schema extension)
- `freshnessMs: number` — age of the most recent input
- `policyState: { canShowEdge: boolean; canShowConfidence: boolean;
  canShowWinRate: boolean }` — derived from entitlements +
  bootstrap-canonical gates
- `isBootstrap: boolean` — mirrors `Pick.isBootstrap` when a pick
  exists; otherwise derived from game state

### `MarketPulse`

Per-game market state aggregate. Deterministic readouts only. Fields:

- `consensusFair: { home: number; away: number; draw?: number }` —
  fair-value implied probabilities
- `depth: number` — number of books polled
- `lineMovement: { since30m: number; since1h: number; since3h: number;
  sinceOpen: number }` — points (or implied prob delta for ML)
- `sharpVsPublic: { sharpPct: number | null; publicPct: number | null }`
  — `null` when source coverage is thin
- `volatility: number` — standard deviation across book lines
- `lastRefresh: Date`

No EV, no Kelly, no implied advantage display. Just market state.

### `EvidenceHealth`

Source-trust scoring across the signals contributing to a game.
Fields:

- `score: number` — 0-100
- `sources: Array<{ name: string; trust: number; lastSeen: Date;
  staleness: 'fresh' | 'aging' | 'stale' }>`
- `gaps: string[]` — named missing sources ("no balldontlie injury
  pull in last 6h")
- `band: 'thin' | 'adequate' | 'rich'`

The Model Court refuses to answer when `band === 'thin'`.

### `SlateWeather`

Daily context aggregate. Returned by `getSlateWeather(date)`. Fields:

- `date: Date`
- `gamesTracked: number`
- `gamesScored: number`
- `gamesPublished: number`
- `gamesGated: number`
- `topGateReasons: Array<{ reason: string; count: number }>`
- `modelVersion: string`
- `lastRefresh: Date`

Powers the homepage Live State Strip and the `/embed/slate-weather`
widget.

### `ModelCourtCase`

A single Q&A exchange grounded in evidence. Fields:

- `id: string`
- `gameId: string | null` — `null` for slate-level questions
- `question: string`
- `evidenceCited: Array<{ source: string; snapshotId: string;
  excerpt: string }>`
- `answer: string`
- `confidence: 'high' | 'moderate' | 'thin' | 'refused'`
- `refusalReason: string | null`
- `userLens: UserLens['kind']`
- `createdAt: Date`

The Model Court agent (Phase 4) writes one of these per exchange. The
read-only Game Room (Phase 3) hides this surface or shows it as
"coming soon."

### `UserLens`

Discriminated union for the lens switcher.

- `{ kind: 'fan'; highlights: ['rivalry', 'narrative', 'venue'] }`
- `{ kind: 'fantasy'; highlights: ['injuries', 'usage', 'matchup'] }`
- `{ kind: 'bettor'; highlights: ['line', 'sharp', 'edge', 'gate'] }`
- `{ kind: 'creator'; highlights: ['hooks', 'shareable', 'visuals'] }`
- `{ kind: 'analyst'; highlights: ['raw signals', 'calibration',
  'history'] }`

Each lens reorders the Game Room panels and tunes the Model Court
prompt.

### `MonetizationSurface`

Entitlement-aware projection of an Intelligence Node. Fields:

- `tier: 'free' | 'pro' | 'elite' | 'api'`
- `redacted: Array<keyof GameIntelligenceNode>` — which fields are
  hidden at this tier
- `upgradeReasons: Array<{ field: string; minimumTier: 'pro' | 'elite' |
  'api' }>`
- `viewableNode: Partial<GameIntelligenceNode>` — what actually
  renders

### `CreatorAsset`

The Studio output type. See `docs/product/galaxy-studio-spec.md` for
the asset taxonomy.

## Pure functions (Phase 2 v0)

```ts
getGameIntelligence(gameId: string): Promise<GameIntelligenceNode>
getSlateWeather(date: Date): Promise<SlateWeather>
projectForLens(node: GameIntelligenceNode, lens: UserLens):
  GameIntelligenceNode
projectForTier(node: GameIntelligenceNode, tier: MonetizationSurface['tier']):
  MonetizationSurface
explainGate(node: GameIntelligenceNode): { reasons: string[];
  rewordedForPublic: string[] }
```

All read-only. All deterministic. Tests pass identical fixtures and
assert identical outputs.

## Hard rules

1. **No DB writes.** Intelligence Graph is a read layer. If a surface
   needs to persist (Model Court Q&A history, user lens preferences),
   that goes through dedicated tables and gets surfaced via Graph
   primitives.
2. **No LLM calls.** The Graph is pure data projection. LLM consumers
   (Model Court, Studio) call it; it never calls them.
3. **Bootstrap-canonical gating enforced inside the Graph.** Surfaces
   never check `isBootstrap` themselves — they consume the Graph's
   `policyState`.
4. **No new dependencies.** Pure TypeScript + Prisma client.

## Test plan

- `intelligence-graph-types.test.ts` — type-level assertions
  (compile-time)
- `intelligence-graph-projections.test.ts` — pure function determinism
- `intelligence-graph-policy.test.ts` — `policyState` matches
  entitlements + bootstrap gates
- `intelligence-graph-fixtures.test.ts` — Claude-supplied fixtures
  from `__fixtures__/intelligence-graph/` produce expected outputs

## Open questions

- Should `LossAutopsy` go in the schema before Phase 2 ships, or is the
  Graph allowed to read autopsies as JSON-on-`Pick` until then? Codex
  call. Logged in `docs/ops/issue-queue.md`.
- The `GateDecision` schema extension — is this a new model, or a
  field on `Pick`? Codex proposes in a markdown handoff before Phase 2
  begins.

## Phase 2 deliverable

A working `apps/web/lib/intelligence-graph/index.ts` exporting the
types + pure functions above, plus `__tests__/intelligence-graph-*.test.ts`
covering each primitive. Read consumers (Gate Cam, Public Ledger,
Methodology page) in Phase 1/2 begin reading through the Graph instead
of re-deriving from `Pick`.
