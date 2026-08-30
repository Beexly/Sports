# `/ledger` Page + Loss Room — Phase 2 Specification

**Status:** Phase 2 build. Public Ledger replaces the Phase 1 homepage preview stub. Loss Room is a filtered sub-archive.
**Owner of code:** Codex.
**Owner of layout copy + structure:** Claude.
**Location:** `apps/web/app/ledger/page.tsx`, `apps/web/app/performance/losses/page.tsx` (existing route, gets Phase 2 wiring per the prior pickup doc).
**Decision reference:** master plan Part 2.F.5 (Trust + Compliance toolkit), Part 6 DEC-018. Companion docs: `docs/loss-room-shell-spec.md` (Codex's earlier scaffold) + this product-layer spec.

---

## TL;DR

The Public Ledger is the historical record of every settled pick, with the full signal snapshot at publish time attached. The Loss Room is the same data filtered to losses, with `LossAutopsy` records attached when authored.

Both pages are free + public. No tier gating on the historical record itself — the signal snapshot is what makes Galaxy's restraint visible. Tier gating applies only to the *learning surface* (Elite gets "What Was Learned" weekly digest annotations).

---

## `/ledger` page

### Layout

```
┌────────────────────────────────────────────────────────┐
│  PAGE HERO                                             │
│   Every pick we've published. Every signal snapshot.   │
│   Every outcome.                                       │
│                                                        │
│   Filters: Sport · Confidence band · Pick grade ·      │
│            Outcome (W/L/Push) · Date range             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  LEDGER TABLE                                          │
│   Columns:                                             │
│    - Matchup (with sport icon)                         │
│    - Pick (line + side)                                │
│    - Pick grade                                        │
│    - Edge Index at publish                             │
│    - Confidence at publish                             │
│    - Settled outcome (W ✅ / L ❌ / Push ⚖️)           │
│    - Published at (date)                               │
│    - Settled at (date)                                 │
│    - Link to Game Room (with signal snapshot)          │
│                                                        │
│  Sort: by settled-at descending default                │
│  Pagination: 50 rows per page                          │
│  Permalink per row: /ledger/<pickId>                   │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  CALIBRATION OVERLAY (sidebar / responsive bottom)     │
│   Same Live Calibration chart from /board              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  WHAT THIS PAGE IS NOT                                 │
│   - Not a win-rate marketing surface.                  │
│   - Not a "we hit X%" claim.                           │
│   - This is the data. You decide what it says.         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Data source

Server endpoint `/api/ledger` returning paginated settled picks.

Query params:

- `sport` — filter to one sport.
- `confidenceBand` — bin filter (e.g. `60-65`, `65-70`).
- `pickGrade` — filter by `PickGrade` enum.
- `outcome` — `W` / `L` / `PUSH`.
- `from`, `to` — date range.
- `limit` — default 50, max 200.
- `cursor` — cursor pagination.

Response:

```ts
type LedgerResponse = {
  total: number;
  rows: LedgerRow[];
  cursor: string | null;
  filters: LedgerFilters;
};

type LedgerRow = {
  pickId: string;
  matchup: string;
  sport: SportKey;
  pick: { kind: PickKind; line: string };
  pickGrade: PickGrade;
  edgeIndexAtPublish: number | null;
  confidenceAtPublish: number;
  outcome: 'W' | 'L' | 'PUSH';
  publishedAt: string;
  settledAt: string;
  roomUrl: string;
  hasAutopsy: boolean;          // true if a LossAutopsy is attached
  hasPreMortem: boolean;
};
```

### Per-row detail (when expanded or routed via `/ledger/<pickId>`)

Each row links to the Game Intelligence Room at `/room/[gameId]`. The Room has the full signal snapshot. The Ledger row is a summary card; the Room is the deep dive.

If a `LossAutopsy` is attached to a settled loss, the Ledger row gets a small "📋 Autopsy" badge that links directly to the Loss Room detail page.

If a pre-mortem was generated at publish, the Ledger row gets a "📝 Pre-mortem" badge.

### Trust gates

The `/ledger` page is governed by the same trust gates as the rest of Public Performance:

- When `PERFORMANCE_STATS_ENABLED=false`: the page renders an empty state with the message "We're building the ledger from canonical signals. Bootstrap-era picks are not surfaced." No bootstrap picks render. No win-rate-style aggregation is computed.
- When `PERFORMANCE_STATS_ENABLED=true`: the full page renders with all canonical settled picks.

The page does NOT compute aggregate win rates or claim percentages anywhere. Users can compute their own from the filter results. We do not present "X% over the last 30 days" as a marketing number.

---

## Loss Room

A sub-archive of the Ledger filtered to settled losses, with `LossAutopsy` records integrated.

Routes (some already exist per `CODEX_PICKUP_2026-05-22_LOSS_AUTOPSY_AND_PROMO_WIRE.md`):

- `/performance/losses` — index of public autopsies + losses.
- `/performance/losses/[id]` — single autopsy detail page.

### Index page (`/performance/losses`)

Layout:

```
┌────────────────────────────────────────────────────────┐
│  PAGE HERO                                             │
│   Every loss. What we saw. What we missed. What we     │
│   learned.                                             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  AUTOPSY LIST                                          │
│   Each entry: pick, outcome, settled date, headline    │
│   (from LossAutopsy.headline), root cause badge,       │
│   lesson tags                                          │
│                                                        │
│   Filter: by root cause, by sport, by date range,      │
│   by lesson tag                                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  LOSSES WITHOUT AUTOPSY                                │
│   Smaller section: settled losses where no autopsy     │
│   has been authored yet                                │
│   "These losses are in the queue for autopsy.          │
│    Cockpit operators are working through them."        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Data source: prefer `LossAutopsy.findMany({ where: { isPublic: true, status: 'PUBLISHED' } })` per the Codex pickup spec, with fallback to derived-from-Pick rendering when the autopsy table returns no rows.

### Detail page (`/performance/losses/[id]`)

Layout for an authored autopsy:

```
┌────────────────────────────────────────────────────────┐
│  PICK HEADLINE                                         │
│   The pick + the line + ❌ LOSS + settled date         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  AUTOPSY HEADLINE                                      │
│   From LossAutopsy.headline (≤140 chars)              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  WHAT WE SAW                                           │
│   From LossAutopsy.whatWeSaw                          │
│   (Renders the factor breakdown at publish time)      │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  WHAT HAPPENED                                         │
│   From LossAutopsy.whatHappened                       │
│   (Specific events between publish and settlement)    │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  WHAT WE LEARNED                                       │
│   From LossAutopsy.whatWeLearned                      │
│   (Whether this changes a factor weight, or is        │
│    variance)                                          │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  PRE-MORTEM COMPARISON                                 │
│   Renders the pre-mortem published with this pick,    │
│   alongside the actual cause from the autopsy.        │
│   Visual indicator on each pre-mortem bullet:         │
│    - ✅ called it (this was the cause)                │
│    - ⚪ did not happen (unrelated)                    │
│    - ❌ missed (cause not in pre-mortem)              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ROOT CAUSE BADGE + LESSON TAGS                        │
│   From LossAutopsy.rootCause + .lessonTags            │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  LINK BACK TO GAME ROOM                                │
│   The Galaxy Memory slot in the Room references       │
│   this autopsy                                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Voice rules for autopsies

Locked by Claude. Codex enforces via compliance scanner on the cockpit author UI.

- First-person plural is allowed ("We saw," "We missed") because the autopsy is the operator's analysis, not the model's voice.
- No "tough loss." No "we'll get 'em next time." No editorializing the outcome emotionally.
- Specific factor names. Specific events. Specific data.
- "What we learned" must commit to one of three outcomes: (1) this changes factor weight X, (2) this is variance, (3) this is a known limitation we'll address in model version N.
- No comparisons to other operators ("at least we autopsy our losses, unlike...").

---

## Compliance scanner

Both the Ledger and the Loss Room run through the platform compliance scanner. Hard refuse on:

- Any banned vocabulary from `docs/positioning.md`.
- Any aggregate win-rate claim ("we hit 65%").
- Any "best book" or "sharpest" claim.
- Any comparison to competitor operators.
- Any guarantee language.

The Ledger page itself does not compute aggregates, so most compliance work is on the autopsy content.

---

## Acceptance criteria (Phase 2 Ledger + Loss Room → green)

### Ledger:

1. `/ledger` route renders the table + filters + calibration overlay.
2. `/api/ledger` returns paginated settled picks with cursor pagination.
3. All filter types work.
4. Permalink per row functions (`/ledger/<pickId>`).
5. Trust-gate behavior verified (off-flag shows empty state).
6. No aggregate win-rate computation anywhere on the page.
7. Mobile layout at 390px works.

### Loss Room:

8. `/performance/losses` prefers `LossAutopsy.findMany` with derived fallback.
9. `/performance/losses/[id]` renders all sections when `LossAutopsy` exists.
10. Pre-mortem comparison correctly tags each bullet as called/did-not-happen/missed.
11. Compliance scanner runs on every autopsy render.
12. Galaxy Memory slot on Game Room cross-references the autopsy URL.

When all 12 hold, the Phase 2 surface is complete.

---

## Open items

- **OPEN-LEDGER-1:** Should the Ledger expose a CSV export? Default: yes, Phase 4 per DEC-006 (free CSV downloads of settled-pick data as the researcher precursor). Reference here, build in Phase 4.
- **OPEN-LEDGER-2:** Should rows show the Edge Index at settlement time as well as at publish? Default: yes, the delta between publish and settlement is itself an interesting datum. Codex confirms.
- **OPEN-LOSS-1:** Should the autopsy detail page allow public comments? Default: no, Phase 5 if at all (radical #8 GitHub Issues for the model handles the community feedback channel). Confirm.
- **OPEN-LOSS-2:** Should losses-without-autopsy show the raw Pick data, or just the headline + "autopsy pending"? Default: just the headline + queue marker. Surfacing raw Pick data without operator analysis risks reading as defensive ("here's the loss, but we don't want to talk about it"). Confirm.

---

*Spec authored by Claude. Codex implements. Voice rules locked. The Ledger is the data; the Loss Room is the analysis.*
