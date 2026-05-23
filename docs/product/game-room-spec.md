# Game Intelligence Room — Spec

> Phase 3 (read-only) + Phase 4 (Model Court conversational). Replaces
> a thin "pick detail" page with a persistent per-game intelligence
> surface.
>
> Route: `/room/[gameId]`.
> Page: `apps/web/app/room/[gameId]/page.tsx`.
> Data loader: `apps/web/lib/game-room/load-room.ts`.
> Tests: `apps/web/__tests__/game-room-*.test.ts`.

## Why this exists

Today a user views one pick at a time, reads the factor breakdown, and
leaves. The game itself has no persistent home — there's no place to
return to as new signals arrive, no place to host the pre-mortem, no
place for the post-game autopsy, no place for the eventual Model Court
conversation.

The Game Room is that home. One URL per tracked game. Bookmarks
survive from "we're scoring this" through "we published / gated" to
"settled, here's what the model learned." The room becomes the
canonical surface every other product line (Studio, B2B widgets,
Model Journal) cites.

## Panels (Phase 3 read-only)

Every panel reads from the Intelligence Graph. No panel re-derives
state from raw Prisma rows.

### Market Pulse

`MarketPulse` from the Intelligence Graph. Shows consensus fair-value
probabilities across polled books, line movement, depth, volatility,
sharp/public split (when source coverage allows). Deterministic
readouts only. No EV display.

### Slate Weather context

`SlateWeather` for the day this game belongs to. Tells the user how
busy the slate is and where this game sits in the publish/gate flow.

### Evidence Timeline

Chronological view of `GameSignal[]` ordered by ingestion time. Each
signal shows: source, captured-at, what changed, trust score.

### What Would Change Our Mind (pre-mortem)

Auto-generated from the factor breakdown. Lists the conditions under
which the published pick would lose. Holds the model accountable in
advance.

For unpublished games: lists what would have to be true for the model
to publish.

### Galaxy Memory

Postgame retention slot. Visible after settlement. Shows:

- Settled outcome
- Post-mortem if loss (radical #6)
- What the model learned (links to the Model Journal essay that
  referenced this game)
- Links to any Studio assets generated from this game

### Lens Switcher

Top-of-page control. Switches `UserLens['kind']` between Fan,
Fantasy, Bettor, Creator, Analyst. Each lens reorders the panels and
changes the prose tone of any narrative content.

### Model Court (Phase 4)

Phase 3 shows a "Coming soon — Model Court conversational layer
arrives in Phase 4" placeholder. Phase 4 ships:

- "Ask This Game" — bound to this `gameId`
- "Ask The Slate" — bound to the date
- "Explain For My Lens" — re-projects the answer through the current
  lens

Every answer cites local evidence (`SourceSnapshot[]`,
`PickSignalSnapshot`, `GameSignal[]`). Refuses when
`EvidenceHealth.band === 'thin'`. Never produces unsupported betting
certainty language.

## Hard rules

1. **One URL per game forever.** Game IDs are stable. The Room URL
   survives schedule changes, postponements, reschedules.
2. **Bootstrap-canonical gating respected.** Bootstrap-era data does
   not display as canonical. The Room's policy banner shows when a
   game's history is bootstrap data.
3. **Entitlement gating at the panel level.** Free users see
   Market Pulse + Slate Weather + Evidence Timeline. Pro adds the
   factor breakdown + What Would Change Our Mind. Elite adds Model
   Court (Phase 4) + advanced query.
4. **No EV / Kelly / win-rate claims** unless the relevant gate
   allows.
5. **Claude API only** for Model Court (master plan decision #20).
6. **Model Court refuses on thin evidence.** Refusal copy is
   pre-written, calm, and points users to what's missing.

## Implementation shape

```ts
// apps/web/lib/game-room/load-room.ts
export async function loadGameRoom(
  gameId: string,
  lens: UserLens['kind'],
  viewer: ViewerEntitlements
): Promise<{
  node: GameIntelligenceNode;
  projected: MonetizationSurface;
  panels: GameRoomPanelState;
}>
```

The page component is server-rendered with this data. Client islands
handle the lens switcher and (Phase 4) the Model Court conversation.

## Storage (Phase 4)

`ModelCourtCase` rows persist conversation history. The room's URL
deep-links to a specific case via a query string. Cases are kept
forever for owner audit and for future training of the methodology
tutor.

## Tests

- `game-room-load-room.test.ts` — data loader returns expected shape
- `game-room-lens-projection.test.ts` — lens switching reorders
  panels correctly
- `game-room-tier-projection.test.ts` — free/pro/elite gating works
- `game-room-bootstrap-banner.test.ts` — bootstrap games show the
  banner
- `game-room-model-court-refusal.test.ts` (Phase 4) — Model Court
  refuses on thin evidence
- `game-room-model-court-citations.test.ts` (Phase 4) — every Court
  answer cites at least one evidence row

## Open questions

- Should the Room URL be `/room/[gameId]` or `/game/[gameId]`?
  Provisional: `/room/[gameId]` matches the product name "Game
  Intelligence Room" and reinforces persistence. Codex confirms during
  Phase 3 implementation.
- Does the room replace the existing `/picks/[id]` detail page, or
  live alongside? Provisional: replace, with `301` redirects from
  `/picks/[id]` to `/room/[gameId]?pickFocus=[id]`. Codex confirms.

## Phase 3 deliverable

- `/room/[gameId]` route, server-rendered, all panels except Model
  Court conversational
- Lens switcher (client island)
- Bootstrap-canonical banner when applicable
- Entitlement-gated panels per the rules above
- Full test coverage per the test plan above

## Phase 4 addition

- Model Court conversational layer (Ask This Game / Slate / Lens)
- `ModelCourtCase` persistence
- Refusal copy and citation enforcement
- Deep-linkable cases via query string
