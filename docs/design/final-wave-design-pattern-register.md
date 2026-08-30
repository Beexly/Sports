# Sports OS — Final Wave Design Pattern Register

**Status**: Doctrine. Living register — updated when patterns are added, modified, or deprecated.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `DESIGN.md` — design token source of truth
- `docs/design/visual-language-palette-lab.md` — color and typography usage
- `docs/design/design-to-react-review.md` — implementation translation protocol
- `docs/design/stitch-agent-workflow.md` — content composition workflow

---

## Purpose

This register documents the canonical UI/UX design patterns used across
Sports OS. Each pattern has a name, a description of when to use it,
a description of when NOT to use it, and the technical requirements for
correct implementation.

This is the living reference that prevents pattern drift — where different
parts of the product start handling the same problem differently because
there was no documented canonical pattern.

---

## Pattern Catalog

---

### Pattern 1 — Pick Card

**Status**: Implemented (baseline). Extend only via documented variant.

**What it is**: The core intelligence output unit. A contained surface
that presents a single pick with its direction, sport, game, confidence
tier, and source freshness disclosure.

**When to use**: Anywhere a pick is displayed to the user — public feed,
Pro dashboard, cockpit preview.

**When NOT to use**: Never display raw pick database records directly.
Always render through the Pick Card component.

**Required elements**:
- Sport label (e.g., "NFL", "NBA") — `--ash` color, uppercase, monospace
- Game label (team A vs. team B, game date) — `--silver` body text
- Pick direction (Over/Under, spread direction) — prominent, `--plasma` accent
- Tier badge (FREE / PRO / ELITE) — gated display
- Source freshness timestamp — always visible, never omitted
- "Entertainment purposes only" disclosure — always visible on public surfaces

**Forbidden elements**:
- Lock icon or padlock imagery
- Win rate counter in the pick card body (belongs in a separate stats surface)
- Animated confidence score
- Sportsbook green background

**Tier variants**:
- Free: direction visible, confidence score hidden (blurred or omitted)
- Pro: direction + confidence score visible
- Elite: all Pro fields + early access indicator

**Implementation**: `apps/web/components/public/PickCard.tsx`

---

### Pattern 2 — Evidence Drawer

**Status**: Implemented (cockpit only). Not for public surfaces.

**What it is**: An expandable panel that reveals the full evidence chain
behind a pick — source tier badges, evidence text, timestamps, and
source freshness status.

**When to use**: Cockpit operator view when reviewing a pick's provenance.
Pro/Elite public view (read-only, summarized version if enabled by owner).

**When NOT to use**: Never show the raw evidence drawer (with internal
source identifiers) on a public route.

**Required elements**:
- Evidence tier badge per evidence item (T1 / T2 / T3 etc.)
- Evidence text (the claim or data point)
- Source attribution (outlet name, not internal source ID)
- TTL indicator (is this evidence within its freshness window?)
- Overall evidence freshness status (FRESH / DEGRADED / STALE)

**Forbidden elements**:
- Internal source reliability scores (cockpit-only, never public)
- API endpoint paths or credentials
- Source IDs that reveal the ingestion architecture

**Implementation**: `apps/web/components/cockpit/EvidenceDrawer.tsx`

---

### Pattern 3 — Signal Ticker

**Status**: Doctrine only. Not yet implemented.

**What it is**: A horizontal scrolling marquee of real-time signal events —
line movements, new evidence arrivals, pick status updates. The "pulse"
of the intelligence network made visible.

**When to use**: Homepage hero surface, cockpit header, live view panels.

**When NOT to use**: Within a pick card (the ticker is environmental, not
pick-specific). On surfaces where motion would be distracting.

**Required elements**:
- Signal type label (ODDS / INJURY / PICK / SETTLEMENT)
- Signal summary (one line, 60 characters max)
- Timestamp (HH:MM format, relative to now)
- Color coding: ODDS → `--orbital-cyan`, INJURY → `--ultraviolet`,
  PICK → `--plasma`, SETTLEMENT → `--silver`

**Motion rules**:
- Scroll speed: 40–60px per second (matches eye tracking comfort for
  data tickers per the motion design guidelines in `DESIGN.md`)
- Pause on hover
- No animation unless data has actually changed in the last 5 minutes

**Implementation**: `apps/web/components/public/SignalTicker.tsx`
(proposed, requires owner approval before adding to homepage)

---

### Pattern 4 — Market Gravity Meter

**Status**: Doctrine only. Not yet implemented.

**What it is**: A visual representation of line movement — where a game
opened, where the current line sits, and what the movement implies about
market sentiment. NOT a "sharp money" indicator. A "market context" indicator.

**When to use**: Pro and Elite pick detail views. The intelligence brief
surface (operator-produced).

**When NOT to use**: Free tier (this is a Pro+ feature). Any surface where
the user might interpret line movement as a pick recommendation without
an accompanying evidence chain.

**Required elements**:
- Opening line
- Current line
- Movement delta
- Direction indicator (arrow)
- "Market context — not a sharp money signal" label (always visible)
- Source attribution: "odds data via The Odds API"

**Forbidden elements**:
- "Sharp money moving on [team]" — forbidden claim language
- Win probability displayed as a percentage without evidence backing
- Any framing that implies the line movement is a reliable pick signal

**Implementation**: `apps/web/components/public/MarketGravityMeter.tsx`
(proposed)

---

### Pattern 5 — Source Tier Badge

**Status**: Partially implemented. Extend via registered variant.

**What it is**: A small badge that displays the tier (T1–T6) of a source
or evidence item, with a tooltip explaining what the tier means.

**When to use**: Evidence Drawer, public Trust Layer disclosure surfaces,
Pick Provenance view.

**When NOT to use**: In pick cards on the public feed (too much cognitive
load for the primary pick consumption surface).

**Variants**:
- T1: `--orbital-cyan` border, "Official / Primary Source" tooltip
- T2: `--orbital-cyan` at 70% opacity, "Licensed / Structured Data" tooltip
- T3: `--ash` border, "Trusted Secondary Source" tooltip
- T4: `--ash` at 70% opacity, "Market Signal (context only)" tooltip
- T5: `--ash` at 50% opacity, "Community Signal (watchlist only)" tooltip
- T6: dashed border, `--ash` at 40%, "Synthetic / AI-Generated" tooltip

**Implementation**: `apps/web/components/ui/SourceTierBadge.tsx`

---

### Pattern 6 — Confidence Score Display

**Status**: Implemented (Pro/Elite only).

**What it is**: The numeric confidence score (0–100) for a pick, displayed
with the mandatory governance wrapper.

**When to use**: Pro and Elite pick cards. Pick detail views.

**When NOT to use**: Free tier. Any surface accessible without session authentication.

**Required elements**:
- Numeric score (rendered in JetBrains Mono)
- Color coding:
  - 85–100: `--ultraviolet` with glow (high conviction, earned glow rule applies)
  - 65–84: `--silver` (moderate confidence)
  - 0–64: `--ash` (lower confidence — displayed, not hidden, per transparency rules)
- Mandatory context label: "Confidence is calibrated against historical results —
  not a guarantee of outcome"
- Minimum picks requirement: score is not displayed until ≥30 settled picks
  are in the model version's calibration set (show "Calibrating — insufficient data"
  state otherwise)

**Forbidden**:
- Displaying a score of 99 or 100 for a pick with <30 settled picks
- Using confidence score in a social graphic without the context label
- Animated score changing in real time

**Implementation**: `apps/web/components/public/ConfidenceScore.tsx`

---

### Pattern 7 — Settlement Badge

**Status**: Doctrine. Implemented as part of Pick Card.

**What it is**: A badge that indicates whether a pick has been settled
(WIN / LOSS / PUSH / VOID) and when.

**When to use**: Any settled pick display — historical feed, ledger, loss room.

**When NOT to use**: On an unsettled pick (show "Pending Settlement" state instead).

**Badge variants**:
- WIN: `--silver` text, muted green border (not full-saturation green —
  semantic only, not celebratory)
- LOSS: `--silver` text, muted red border (not full-saturation red)
- PUSH: `--ash` text, `--ash` border
- VOID: `--ash` text, dashed border, tooltip explaining why voided

**Forbidden**:
- Celebration imagery, confetti, win sound effects on WIN settlement
- Full-saturation green or red (casino associations)
- Displaying WIN/LOSS settlement before the game's final result is confirmed
  from a T1 source

**Implementation**: `apps/web/components/ui/SettlementBadge.tsx`

---

### Pattern 8 — Empty State

**Status**: Implemented. Extend via established template.

**What it is**: The state displayed when a surface has no data to show.

**When to use**: Pick feed (no active picks), Ledger (no settled picks yet),
Evidence Drawer (no evidence), Calibration (insufficient data).

**Required elements**:
- Icon (consistent with brand — not clip art, not generic spinner)
- Short headline (what is empty, in plain language)
- Body text (what the user can do or what the system is doing)
- Optional: CTA button (if there is an action the user can take)

**Forbidden**:
- "No picks today — check back!" language (sounds like tout service)
- Fabricated placeholder picks in the empty state
- Confidence scores in empty state illustrations

**Voice for empty states**:
- "No active picks in the current window. Intelligence updates as markets open."
- "Calibration in progress. Minimum 30 settled picks required before confidence
  scores are displayed."
- "No evidence items in the vault for this entity. Add a source to begin."

**Implementation**: `apps/web/components/ui/EmptyState.tsx`

---

## Pattern Retirement Protocol

When a pattern is deprecated:

1. Update this register: mark status as `Deprecated — replaced by [Pattern N]`
2. Leave the original entry — never delete from this register
3. Add a new entry for the replacement pattern
4. Update all components using the deprecated pattern via a MEDIUM-tier codemod
   per `docs/audit/codemod-safety-policy.md`

---

## Forbidden Pattern List

These patterns must never be implemented, regardless of design request:

| Forbidden pattern | Why | Alternative |
|---|---|---|
| Lock icon on a pick | Implies guaranteed outcome | Settlement Badge (WIN) after settlement only |
| Real-time win counter | Fabricated precision | Static win rate badge with claim governance |
| "AI predicts..." headline | Certainty language | "Model context:" or "Evidence suggests:" |
| Sportsbook green action button | Brand safety | `--plasma` primary CTA |
| Animated confidence score counting up | Misleading about real-time precision | Static score with governance wrapper |
| Fake "sharp money alert" badge | Unsupported claim | Market Gravity Meter with context label |

---

## Codex Audit Requirements

1. Confirm Pick Card renders with source freshness disclosure on all public routes
2. Confirm Confidence Score component has `showDisclaimer` logic and it defaults to true
3. Confirm Settlement Badge does not render WIN/LOSS before T1 confirmation
4. Confirm no component uses a full-saturation casino green (#00FF00 or similar)
5. Confirm empty states do not contain placeholder pick data
6. Report any lock icon (`🔒` or `lock` in className/aria) in any component as P1
