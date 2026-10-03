# Galaxy Memory — Persistence Specification

**Status:** Phase 3 build. The post-settlement game-room slot.
**Owner of code:** Codex.
**Owner of retention policy + copy:** Claude.
**Location:** `apps/web/lib/galaxy-memory/`, surfaces on `/room/[gameId]`.
**Decision reference:** master plan Part 2.F.2 (Game Intelligence Rooms F.2), Part 6 DEC-015. Companion spec: `docs/product/game-room-spec.md`.

---

## TL;DR

Game Rooms persist after the game is over. The Galaxy Memory slot is what makes them durable — settled outcome, post-mortem if loss, what the model learned, links to Model Journal essays that referenced the game. Rooms become the searchable historical record.

This is not a separate product. It's a panel on the existing Game Room with specific persistence semantics: never expires, never auto-removed, never edited after publication (only appended-to via Model Journal cross-references).

---

## What persists

For every settled game that was tracked (whether published or gated):

1. **Settlement outcome** — final score, W/L/Push relative to the pick (if any), settled-at timestamp.
2. **Pick snapshot at publish time** — captured from `PickSignalSnapshot`, never updated.
3. **Pre-mortem published at the time** — captured from `Pick.preMortemContent`, never updated.
4. **Loss autopsy** — if the pick lost AND an autopsy was authored, the `LossAutopsy` record is linked.
5. **Pre-mortem comparison** — for losses, the CALLED / DID_NOT_HAPPEN / MISSED tags from the comparator.
6. **Model Journal cross-references** — when a Model Journal essay references this game, the link is appended.
7. **Twitter/Discord post-mortem thread anchors** — for posted losses, links to the social posts so the public record remains traceable.
8. **Model version stamps** — the model version at publish and the model version at settlement (these may differ if a model version shipped in between).

---

## Retention policy

- **Permanent.** Galaxy Memory records do not expire.
- **Append-only.** After publication, the record is immutable except for explicitly-appendable cross-reference fields (Model Journal links, social post anchors).
- **Public.** All Galaxy Memory data is public per the platform's transparency posture. No tier gating on Memory itself.

Rationale: the historical record is the moat. Promising "every settled pick stays here forever" is core to "we publish our losses, we publish our autopsies." If Memory were lossy, the promise would be too.

---

## Surfaces

### Game Room Memory panel (Phase 3 read-only)

Renders below the Evidence Timeline on `/room/[gameId]` when the game is settled.

```
┌─────────────────────────────────────────────────────────┐
│  GALAXY MEMORY                                          │
│  Settled: 2026-05-22T23:55:00Z                          │
│  Final: BOS 112, NYK 99                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Pick: BOS -3.5 ✅ WIN                                  │
│  Published at 73% confidence (SOLID_PLAY)               │
│  Heaviest factor: rest advantage (0.81)                 │
│                                                         │
│  Pre-mortem at publish:                                 │
│  - [bullets that did not happen, struck through]        │
│                                                         │
│  Settlement model version: v6.0.5                       │
│  Publish model version: v6.0.4                          │
│                                                         │
│  Referenced in:                                         │
│  - Model Journal Week 21, 2026 [link]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Game Room Memory panel for losses

Same shape, but the autopsy + comparison is the headline:

```
┌─────────────────────────────────────────────────────────┐
│  GALAXY MEMORY                                          │
│  Settled: 2026-05-15T02:00:00Z                          │
│  Final: GSW 124, LAL 110                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Pick: LAL +145 ❌ LOSS                                 │
│  Published at 68% confidence (SOLID_PLAY)               │
│                                                         │
│  AUTOPSY HEADLINE:                                      │
│  Late injury flipped the rest-advantage read on         │
│  LAL +145.                                              │
│                                                         │
│  Pre-mortem comparison:                                 │
│  ⚪ Rest advantage flip — did not happen                │
│  ⚪ Venue form sample weakness — did not happen         │
│  ⚪ Sharp money line move — did not happen              │
│  ❌ MISSED: INJURY_SHOCK — not in any pre-mortem bullet │
│                                                         │
│  What we learned:                                       │
│  [from LossAutopsy.whatWeLearned, full text]            │
│                                                         │
│  Coverage gap acknowledged:                             │
│  Injury feed lag of 8-12 minutes vs Twitter beat        │
│  reporters. v6.0.4 tightens the injury-news cutoff.     │
│                                                         │
│  Read full autopsy: [link to /performance/losses/<id>]  │
│                                                         │
│  Referenced in:                                         │
│  - Model Journal Week 19, 2026 [link]                   │
│  - Twitter post-mortem thread: [link]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Galaxy Memory index page (Phase 4 add)

`/memory` — searchable archive of all settled-game Memory panels. Filters by sport / outcome / date / has-autopsy / referenced-by-journal.

This is essentially `/ledger` with the Memory perspective — every settled pick has a Memory page reachable from the Ledger row. Phase 4 adds the explicit index page to make it discoverable.

---

## Schema additions

If the Memory data is derivable from existing tables (`Pick`, `PickSignalSnapshot`, `LossAutopsy`, `ModelJournalEntry`, `AgentRunLog` for social anchors), no schema additions are needed. Codex's call during Phase 3 implementation.

If a denormalized `GalaxyMemory` table is preferred for query performance:

```prisma
model GalaxyMemory {
  id                       String   @id @default(cuid())
  gameId                   String   @unique
  settlementOutcome        String?  // "W" | "L" | "PUSH" | null if no pick
  finalScore               String?
  pickIdAtSettle           String?
  publishedModelVersion    String?
  settlementModelVersion   String
  lossAutopsyId            String?
  preMortemComparisonJson  Json?    // CALLED/DID_NOT_HAPPEN/MISSED tags
  modelJournalRefs         String[] // array of journal entry IDs
  socialThreadAnchors      Json     // { twitterThreadUrl?, discordThreadUrl? }
  settledAt                DateTime
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  game         Game         @relation(fields: [gameId], references: [id])
  pickAtSettle Pick?        @relation(fields: [pickIdAtSettle], references: [id])
  lossAutopsy  LossAutopsy? @relation(fields: [lossAutopsyId], references: [id])

  @@index([settledAt])
  @@index([settlementOutcome])
}
```

The denormalized table is OPTIONAL — derive vs persist is Codex's call based on query patterns.

---

## Cross-reference appending

When a `ModelJournalEntry` is published and it references one or more games, the publish path updates Memory:

- For each referenced `gameId`, append the journal entry's slug to the Memory's `modelJournalRefs` array (or equivalent if derived).
- This is the only post-publication mutation allowed on Memory data.

Similarly, when the Twitter bot posts a post-mortem thread for a settled loss, the thread URL appends to the Memory's `socialThreadAnchors`.

---

## What Memory does NOT do

- **Does not store outcome predictions made after settlement.** Memory captures what happened, not retrospective takes.
- **Does not allow operator editing of pre-mortem text post-publication.** The pre-mortem is what we said at publish time. If the operator wants to comment on it after the fact, that goes in the autopsy or the Model Journal.
- **Does not auto-summarize or compress.** Full text is preserved.
- **Does not call LLMs.** All Memory rendering is deterministic from persisted data.

---

## Privacy + transparency

Memory is public. Anyone can navigate to `/room/[gameId]` for any past tracked game and see the Memory panel.

No PII anywhere in Memory data. Even when an operator authored an autopsy, the autopsy's `authorEmail` field is NOT surfaced publicly — only the autopsy content.

---

## Acceptance criteria (Phase 3 Galaxy Memory v0 → green)

1. Memory panel renders on `/room/[gameId]` for settled games.
2. Win-state panel shows pick + factor + pre-mortem comparison correctly.
3. Loss-state panel shows pick + autopsy + comparison correctly (when autopsy exists).
4. Loss-state without autopsy shows pick + "autopsy pending" placeholder.
5. Model Journal cross-references append correctly on journal publish.
6. Social thread anchors append correctly on bot post.
7. No PII in any rendered Memory output.
8. Brand-safety scan on 50 settled-game Memory panels returns zero hits.
9. Memory data is read-only after settlement (mutation attempts log to AgentRunLog and 403).

When all 9 hold, Galaxy Memory v0 is live.

---

## Open items

- **OPEN-MEM-1:** Should Memory have its own dedicated index page at `/memory`, separate from `/ledger`? Default: no in Phase 3 (Ledger row → Game Room → Memory panel is enough). Phase 4 may add `/memory` as a separate index with different filters.
- **OPEN-MEM-2:** Should Memory be syndicated via RSS/Atom feeds? Default: no in v0. The `/ledger` page covers RSS-like consumption.
- **OPEN-MEM-3:** Should the social-thread anchors be re-pollable to verify links remain live? Default: yes, via a synthetic monitoring check (CHECK-MEM-1) — verifies anchor URLs return 200 weekly. Phase 4 add.

---

*Spec authored by Claude. Codex implements. Append-only persistence locked.*
