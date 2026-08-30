# Programmable DSL — Specification

**Status:** Phase 5 build. Combines radicals #2 (DSL filters) + #12 (programmable alerts).
**Owner of code:** Codex.
**Owner of language syntax + ergonomics + docs:** Claude.
**Location:** `packages/galaxy-dsl/`, `apps/web/app/dsl/`, `apps/web/lib/dsl/`.
**Decision reference:** master plan Part 2.C.1 + Part 2.C.10.

---

## TL;DR

A small domain-specific language for Pro and Elite users to write their own scoring filters and alert scripts against Galaxy's live and historical data. Parser, sandbox, runtime, save/share/star.

**Positioning:** "Sports betting's Bloomberg Terminal." Power users can express questions like *"find picks where edge > 3.0 and home rest > 2 and market consensus > 0.65 and schedule density diff < 1.0"* and watch them run live.

Pro tier gets filters. Elite tier gets filters + alerts. The DSL runtime is the same; the alert layer adds notification triggers on top.

---

## Why a DSL, not a form-based filter

Form-based filters (dropdowns + sliders) cover ~5 dimensions cleanly. Galaxy has 11+ factors plus market state, evidence health, schedule data, line history — far more than a form can present without overwhelming.

A DSL lets users express complex compound queries naturally:

```
filter picks where
  edge > 3.0 and
  home.rest_days > 2 and
  market.consensus > 0.65 and
  schedule_density_diff < 1.0
```

vs the same in form-based:

> [Edge slider: 3.0 to 10.0] [Home rest dropdown: 2+] [Consensus slider: 0.65 to 1.0] [Schedule density diff: 0 to 1.0]

The DSL also enables **save / share / star** — users can publish their filter as a named query, share it via URL, star community queries.

---

## Language design

Goals:
- Readable to non-programmers.
- Minimal syntax.
- No hidden complexity.
- Sandboxed (no eval, restricted AST).
- Type-safe at parse time (catches mistakes before runtime).

### Reserved keywords

```
filter, where, and, or, not, in, has, between, when, then, alert, save, as,
true, false, null
```

### Identifiers

Snake_case for fields. Dot-notation for nested access:

```
edge
home.rest_days
market.consensus
game.sport
pick.confidence
schedule.density_diff
factor_breakdown.rest_advantage
```

### Operators

Comparison: `>` `<` `>=` `<=` `==` `!=`
Logical: `and` `or` `not`
Membership: `in`, `not in`
Range: `between`
Existence: `has`

### Examples

#### Simple filter

```
filter picks where
  edge > 3.0 and
  game.sport == "NBA"
```

#### Compound filter

```
filter picks where
  edge > 3.0 and
  home.rest_days > 2 and
  market.consensus between 0.6 and 0.8 and
  game.sport in ["NBA", "NFL"]
```

#### Saved query

```
save as "my_solid_nba_plays"
filter picks where
  edge > 3.0 and
  game.sport == "NBA" and
  pick.confidence > 70
```

#### Alert script (Elite tier)

```
alert when
  pick.confidence > 75 and
  game.sport == "NFL" and
  market.line_movement > 2.0
then notify ["sms", "discord"]
```

#### Compound alert

```
alert when
  has factor_breakdown.rest_advantage and
  factor_breakdown.rest_advantage > 0.7 and
  pick.confidence > 70
then notify ["email"]
```

#### Backtest invocation

```
filter picks where
  edge > 3.0 and
  game.sport == "NBA"
between "2026-01-01" and "2026-05-01"
```

---

## Parser

Hand-rolled or PEG.js (Codex picks). Codex implements; Claude reviews ergonomics.

Output: AST of typed nodes. Type checking at parse time catches:
- Unknown field references.
- Type mismatches (comparing number to string).
- Unsupported operators on field types.
- Reserved keyword misuse.

Error messages must be specific and helpful:

```
Error at line 3, column 12: "home_team" is not a field.
Did you mean "home.team"?

Available fields on the root pick object:
  - edge (number)
  - home (Team object)
  - away (Team object)
  - game (Game object)
  - pick (Pick object)
  - market (MarketState object)
  - schedule (ScheduleData object)
  - factor_breakdown (FactorBreakdown object)
```

---

## Sandbox

The DSL is **not** general-purpose JavaScript. Hard constraints:

1. No `eval`. No `Function()` constructor. No dynamic code execution.
2. No file I/O. No network. No process access.
3. No mutation of inputs. The DSL is read-only against Galaxy's data.
4. No loops. No recursion. No variable assignment.
5. Execution time bounded: per-filter query cannot run more than 5 seconds against a slate of 100 games.
6. Memory bounded: AST nodes capped at 200 per filter.

The runtime walks the AST and applies it to data. No code generation.

---

## Available fields (initial set)

Field schema for Phase 5. Codex implements; Claude curates the field list and documentation.

### Root pick object

- `edge: number` — Edge Index at publish.
- `pick: Pick`
- `game: Game`
- `home: Team`
- `away: Team`
- `market: MarketState`
- `schedule: ScheduleData`
- `factor_breakdown: FactorBreakdown`
- `evidence: EvidenceHealth`
- `outcome: PickOutcome | null` — null for unsettled.

### Pick object

- `pick.kind: PickKind` — SPREAD / TOTAL / MONEYLINE / PROP
- `pick.confidence: number` — 50-95
- `pick.grade: PickGrade` — SOLID_PLAY / LEAN / NOTE
- `pick.line: string`
- `pick.side: PickSide` — HOME / AWAY / OVER / UNDER

### Game object

- `game.sport: SportKey` — NBA / NFL / MLB / NHL / ...
- `game.starts_at: Date`
- `game.is_outdoor: boolean`
- `game.is_primetime: boolean`

### Team object

- `home.rest_days: number`
- `home.travel_distance_miles: number`
- `home.last_game_was_back_to_back: boolean`

(Same fields for `away`.)

### MarketState object

- `market.consensus: number` — 0..1
- `market.depth: number` — 0..1
- `market.line_movement: number` — magnitude, can be negative
- `market.volatility: number` — 0..1
- `market.sharp_money_signal: boolean`
- `market.books_reporting: number`

### ScheduleData object

- `schedule.density_diff: number` — home density minus away density
- `schedule.games_in_last_7_days: { home: number; away: number }`

### FactorBreakdown object (one field per factor)

- `factor_breakdown.consensus: number`
- `factor_breakdown.depth: number`
- `factor_breakdown.edge: number`
- `factor_breakdown.line_movement: number`
- `factor_breakdown.volatility: number`
- `factor_breakdown.head_to_head: number`
- `factor_breakdown.venue_form: number`
- `factor_breakdown.schedule_stress: number`
- `factor_breakdown.rest_advantage: number`
- `factor_breakdown.cross_market: number`
- `factor_breakdown.data_quality: number`

### EvidenceHealth object

- `evidence.overall: EvidenceGrade` — "A" / "B" / "C" / "D" / "F"
- `evidence.bootstrap_share: number` — 0..1
- `evidence.freshness_seconds: number`

---

## Save / share / star

### Save

User saves a query under a name. Persists to `UserDSLQuery`:

```prisma
model UserDSLQuery {
  id          String   @id @default(cuid())
  userId      String
  name        String
  dslSource   String   @db.Text
  isPublic    Boolean  @default(false)
  starCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])

  @@unique([userId, name])
  @@index([userId])
  @@index([isPublic, starCount])
}

model UserDSLQueryStar {
  id          String   @id @default(cuid())
  queryId     String
  userId      String
  createdAt   DateTime @default(now())

  query       UserDSLQuery @relation(fields: [queryId], references: [id])
  user        User         @relation(fields: [userId], references: [id])

  @@unique([queryId, userId])
}
```

### Share

Saved query becomes a URL at `/dsl/q/[queryId]` if `isPublic = true`. Visitors can:
- Read the query body.
- Run it against the current slate (their tier permission applies).
- Fork it into their own saved queries.
- Star it.

### Star

Pro+ users can star public queries. Most-starred queries surface on `/dsl/community` as the discoverable library.

---

## Alerts (Elite tier only)

Alerts use the same DSL parser but a different grammar root: `alert when ... then notify [...]`.

Notification channels:
- `email`
- `sms` (Twilio)
- `discord` (DM via the bot)
- `webhook` (Pro+ tier sends to a user-supplied URL)

Alert runtime:
- Triggered on every scoring cycle (every 30 minutes).
- For each Elite user with active alerts, evaluates their alerts against the current slate.
- Fires notification when the alert condition holds AND has not fired in the last `cooldown` window (default: 1 hour per alert).
- Rate-limited at 50 alerts per user per day.

Storage:

```prisma
model UserDSLAlert {
  id          String   @id @default(cuid())
  userId      String
  name        String
  dslSource   String   @db.Text
  channels    String[] // email, sms, discord, webhook
  webhookUrl  String?
  cooldownSeconds Int  @default(3600)
  isActive    Boolean  @default(true)
  lastFiredAt DateTime?
  fireCount   Int      @default(0)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, isActive])
}
```

---

## UI

### `/dsl` page (Pro+)

- Code editor (Monaco or CodeMirror).
- Field reference sidebar.
- "Run" button — executes against the live slate.
- Results panel showing matching picks.
- "Save as" button — name + visibility (private / public).
- "Star" button on public queries.

### `/dsl/community` page

- Most-starred public queries.
- Filter by sport / tag.
- One-click fork.

### `/dsl/alerts` page (Elite)

- List of user's saved alerts.
- Add / edit / disable.
- Test fire (sends a sample notification).
- Fire log per alert.

---

## Docs site

The DSL needs a docs surface at `/dsl/docs`. Claude writes the docs. Sections:

1. Quickstart (3 example queries).
2. Field reference (every available field with type + range).
3. Operator reference.
4. Common patterns (per sport).
5. Saved query / sharing / starring.
6. Alerts (Elite only).
7. FAQ.

The docs are public — they show off the platform's depth even to non-subscribers.

---

## Acceptance criteria (Phase 5 DSL v0 → green)

1. Parser implemented with full operator + field set.
2. Type checker catches all 4 documented error classes.
3. Sandbox enforces all 6 hard constraints.
4. Filter runtime executes against the live slate.
5. Save / share / star functionality works.
6. Alert runtime fires on schedule with cooldowns and rate limits.
7. UI shipped at `/dsl`, `/dsl/community`, `/dsl/alerts`.
8. Docs page complete at `/dsl/docs`.
9. Backtest invocation works against historical data.
10. Compliance scanner runs on public query names + bodies (anti-abuse).
11. Field reference matches actual data shape (no doc drift).

When all 11 hold, DSL v0 is live.

---

## Open items

- **OPEN-DSL-1:** Should the DSL support user-defined functions? Default: no in v0. Keeps the language simple. Phase 6+ may add this.
- **OPEN-DSL-2:** Should alerts be available to Pro tier too, or strictly Elite? Default: per tier narrative ("Master it"), alerts are Elite-only. Pro gets filters; Elite gets filters + alerts.
- **OPEN-DSL-3:** Should there be DSL templates pre-loaded for common patterns? Default: yes, 10 starter queries in `/dsl/templates`. Codex picks the seed set with Claude.
- **OPEN-DSL-4:** What's the API for external integration? Default: a `/api/dsl/run` endpoint for Pro+ that accepts a DSL string and returns matching picks. Codex confirms shape.

---

*Spec authored by Claude. Codex implements parser + sandbox + runtime. The DSL is power-user terrain; ergonomics matter.*
