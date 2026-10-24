# `/board` Page — Phase 2 Specification

**Status:** Phase 2 build. Replaces Phase 1 stub `/board` page.
**Owner of code:** Codex.
**Owner of layout copy + structure:** Claude.
**Location:** `apps/web/app/board/page.tsx` plus components in `apps/web/components/marketing/`.

---

## TL;DR

The full `/board` page is the operations theater for Galaxy Sports Edge. Three sections, top to bottom: live state of the engine, what's published right now, and the Pass List of everything we considered and didn't publish. Free + transparent at the foundation.

Phase 1 ships PREVIEW-MODE stubs. Phase 2 wires real data from real endpoints. The page is one of Galaxy's three core public surfaces (alongside `/methodology` and `/ledger`).

---

## Page layout

```
┌────────────────────────────────────────────────────────┐
│  LIVE STATE STRIP (already on homepage, also here)    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  GATE CAM (live operations theater)                    │
│    3 columns: SCORING NOW / PUBLISHED TODAY /          │
│    GATED TODAY                                         │
│    Auto-refresh every 30s                              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  PUBLISHED TODAY DETAIL                                │
│    Vertical list of today's published picks            │
│    Each row: matchup, pick, line, edge index,          │
│    confidence (tier-gated), pre-mortem preview,        │
│    link to /room/[gameId]                              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  PASS LIST                                             │
│    Today's games we evaluated and did not publish      │
│    Each row: matchup, gate reason, evidence health,    │
│    edge index, link to /room/[gameId]                  │
│    Filter chips: by sport, by gate reason              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  LIVE CALIBRATION CHART                                │
│    Confidence band on X, actual win rate on Y          │
│    Perfect-calibration diagonal overlaid               │
│    "Updated: [timestamp]. Sample: N settled picks."    │
│                                                        │
├────────────────────────────────────────────────────────┤
│  EDGE INDEX EXPLAINER + LINK TO /methodology          │
└────────────────────────────────────────────────────────┘
```

---

## Data sources

### `/api/board/state`

Server endpoint returning the Gate Cam data. Composed from the Intelligence Graph.

Response shape:

```ts
type BoardState = {
  scoringNow: GameSummary[];
  publishedToday: PublishedPickSummary[];
  gatedToday: GatedGameSummary[];
  modelVersion: string;
  composedAt: string;            // ISO timestamp
  refreshIntervalSeconds: number;
};

type GameSummary = {
  gameId: string;
  matchup: string;               // "BOS @ NYY"
  startsAt: string;              // ISO
  sport: SportKey;
  edgeIndex: number | null;
  evidenceHealthGrade: EvidenceGrade;
  roomUrl: string;               // "/room/<gameId>"
};

type PublishedPickSummary = GameSummary & {
  pick: { kind: PickKind; line: string; pickGrade: PickGrade };
  confidence: number | null;     // null for FREE tier; populated for PRO+
  preMortemPreview: string | null;
};

type GatedGameSummary = GameSummary & {
  gateReason: GateReason;
  gateReasonText: string;        // friendly text
};
```

Server enforces tier projection via the Intelligence Graph. FREE tier sees `confidence: null` even though the data exists.

Cache: 30 seconds at the edge. Auto-refresh client-side every 30 seconds via polling (NOT websockets per master plan Part 4 rule 9).

### `/api/board/passes`

Server endpoint returning the Pass List with full detail beyond the homepage stub. Supports filtering.

Query params:

- `sport` — filter to one sport.
- `gateReason` — filter to one gate reason.
- `limit` — default 50, max 200.
- `offset` — pagination.

Response:

```ts
type PassListResponse = {
  total: number;
  passes: GatedGameSummary[];
  filters: {
    availableSports: SportKey[];
    availableGateReasons: GateReasonOption[];
  };
};
```

### `/api/calibration`

Server endpoint returning the calibration chart data.

Response:

```ts
type CalibrationData = {
  bands: CalibrationBand[];      // bins by confidence range
  diagonal: { x: number; y: number }[];  // perfect-calibration line
  sampleSize: number;
  lastUpdated: string;
  bootstrapState: boolean;
  warningMessage: string | null;
};

type CalibrationBand = {
  bandLabel: string;             // e.g. "60-65%"
  bandMidpoint: number;
  actualWinRate: number | null;  // null when sample size < threshold
  sampleSize: number;
};
```

When `bootstrapState === true`, the chart renders an empty state with the `warningMessage` text. Phase 4 unlocks full calibration display once `PERFORMANCE_STATS_ENABLED=true`.

---

## Components

All under `apps/web/components/marketing/`.

### `<GateCam />`

Real data version of the Phase 1 stub. Reads `/api/board/state`. Three-column grid with live updates. Each row links to the Game Room.

Behavior:
- Auto-refresh every 30s.
- Animated "freshness" indicator on each row (subtle, no spinner spam).
- Clicking a row navigates to `/room/[gameId]`.
- Mobile: stacks columns vertically with section headers.

### `<PublishedTodayDetail />`

Vertical list of today's published picks. Reads same `/api/board/state` data.

Per row:
- Matchup + start time.
- Sport icon.
- Pick (e.g. "BOS -3.5") + line + grade badge.
- Edge Index value (public).
- Confidence (tier-gated: shown to PRO+).
- Pre-mortem preview (first sentence; full pre-mortem in the Game Room).
- "View room" link.

Empty state: "Engine published zero picks today. See the [Pass List](#pass-list) for everything we considered."

### `<PassList />`

Real data version of the Phase 1 stub. Reads `/api/board/passes`. Supports filter chips at the top.

Per row:
- Matchup + start time.
- Gate reason badge.
- Evidence health grade.
- Edge Index value.
- One-line gate reason text.
- Link to Game Room.

Filter chips: sport selector (multi-select), gate reason selector (multi-select). Clear filters button.

Empty state: "No gated games on this slate."

### `<LiveCalibration />`

Real data version of the Phase 1 stub. Reads `/api/calibration`.

Bootstrap state: shows an empty chart with the warning message and a single line: "Building calibration history. N settled picks collected."

Canonical state (`PERFORMANCE_STATS_ENABLED=true`): renders the full chart with confidence bands, the perfect-calibration diagonal, and the sample-size annotation.

Visualization: hand-built SVG or Recharts. No new charting dependency.

### `<EdgeIndexExplainer />`

Small section at the bottom of the page explaining what Edge Index means and linking to `/methodology`. Lifted from the methodology page intro.

---

## Tier projection

Tier behavior on `/board`:

- **FREE:** sees Gate Cam fully, sees Published Today rows with Edge Index but no confidence number and no factor breakdown link. Sees Pass List in full. Sees Live Calibration in bootstrap state until canonical mode.
- **PRO:** adds confidence number + factor breakdown links on Published Today rows.
- **ELITE:** adds early-access annotations on Published Today rows + draft Model Journal entries that reference today's picks.

Projection enforced via the Intelligence Graph's `projectForSurface(node, 'PUBLIC_BOARD', viewer)`.

---

## Bootstrap state

When the engine is in bootstrap mode:

- Gate Cam still renders, with `LAST REFRESH` showing `BOOTSTRAP MODE`.
- Published Today is empty.
- Pass List renders with the games that have been scored but gated for bootstrap-only signals.
- Live Calibration shows the bootstrap empty state.
- A banner at the top of the page: "The engine is in bootstrap mode. Canonical mode unlocks when N settled picks land."

---

## SEO

`/board` is a high-value SEO target — "today's NFL picks," "MLB picks today," etc. don't fit Galaxy's voice, but "transparent sports model what was gated today" or similar long-tail does.

Page metadata:

- Title: `Today's Board — Galaxy Sports Edge`
- Description: `Every game the model evaluated today, with the picks we published and the picks we gated. Transparent factor scoring. Most days, fewer than five picks.`
- OG image: a snapshot of the Live State Strip composited with the day's slate density.
- Structured data: SportsEvent schema for each Published Today row + the date itself.

---

## Acceptance criteria (Phase 2 `/board` v0 → green)

1. `/board` route renders the four sections.
2. `/api/board/state` returns the correct shape and respects tier projection.
3. `/api/board/passes` returns filtered results correctly.
4. `/api/calibration` returns bootstrap or canonical based on env flag.
5. Auto-refresh every 30s wired client-side via polling.
6. Mobile layout works at 390px.
7. Tap targets 44px+ on interactive elements.
8. Bootstrap state renders correctly when env flag is off.
9. Banned-vocabulary scan on rendered HTML returns zero hits.
10. Edge Index visible to FREE tier; confidence number gated to PRO+.

When all 10 hold, `/board` is v0-complete.

---

## Open items

- **OPEN-BOARD-1:** Should the Pass List default sort be by Edge Index descending (closest to publish), by start time ascending (next game first), or by gate reason? Default: by start time ascending, with Edge Index as a column sort option. Codex confirms.
- **OPEN-BOARD-2:** Should there be a "yesterday" tab to see yesterday's settled picks alongside today's board? Default: yes, with a one-day lookback selector. Codex confirms.
- **OPEN-BOARD-3:** Refresh cadence — 30s default, but heavy days might stress the cron endpoint. Codex tunes during load testing.

---

*Spec authored by Claude. Codex implements. Tier projection enforced through the Intelligence Graph.*
