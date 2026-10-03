# Game Intelligence Rooms — Specification

**Status:** Phase 3 read-only ships; Phase 4 adds Model Court conversational layer.
**Owner of code:** Codex.
**Owner of panel copy + Model Court prompts:** Claude.
**Location:** `apps/web/app/room/[gameId]/`.
**Decision reference:** master plan Part 6 DEC-015, DEC-020 (Claude API only, no OpenAI), DEC-024.

---

## TL;DR

A persistent intelligence surface per tracked game at `/room/[gameId]`. Replaces the thin pick-detail page with a permanent surface that survives the game itself — pre-game it's evidence + market state, in-game it's live updates, post-game it's outcome + post-mortem + what the model learned.

Game Rooms are the primary unit that downstream surfaces (Galaxy Studio, B2B widgets, the public API) read from. They are the human-facing render of the Intelligence Graph.

---

## Two-phase rollout

### Phase 3 — Read-only

Every panel except Model Court ships. Panels render from the Intelligence Graph. No conversational layer. No chat. No write actions.

### Phase 4 — Model Court conversational

Adds the Model Court Q&A panel. Powered by the Claude API (DEC-020). Cites local evidence only. Refuses on thin evidence.

---

## Route shape

- `/room/[gameId]` — public, free-tier sees public projection, Pro/Elite see the full breakdown.
- `/room/[gameId]/lens/[lensKind]` — same room rendered through a specific lens (fantasy / fan / bettor / creator / analyst). Lenses re-prioritize which panels are emphasized; they do not change the underlying data.

---

## Panels (Phase 3 ships all except Model Court)

### 1. Market Pulse

**Source:** `GameIntelligenceNode.marketPulse` from the Intelligence Graph.

**What it shows:**

- Consensus across reporting books (0–1 weighted score).
- Depth per side (dollar-weighted across books that publish depth).
- Line movement (direction, magnitude, velocity since open).
- Volatility (normalized against the market's usual range).
- Sharp money signal (when at least one book reports it; null otherwise).

**What it does not show:**

- No public EV. No public Kelly. No public win-rate.
- No "we recommend this side" interpretation. The panel reports market state; it does not editorialize.

**Bootstrap state:** When `MarketPulse.booksReporting` is below threshold (default: 3), the panel shows a bootstrap badge and the consensus/depth metrics render with reduced opacity + a "thin coverage" annotation.

### 2. Slate Weather context

**Source:** `SlateWeather` for the game's date plus `GameIntelligenceNode`-level conditions.

**What it shows:**

- Outdoor weather conditions for outdoor games (temperature, wind, precipitation, dome indicator).
- Schedule density (rest days for both teams, density score for the slate).
- News flags from the evidence registry (injury reports, lineup changes, beat-reporter signals).
- Line movement aggregate for the slate (is everyone moving the same direction?).

**Behavior:** Empty when no notable conditions exist. Does not invent context.

### 3. Model Court (Phase 4)

**Source:** Claude API on top of `GameIntelligenceNode`.

**What it does:**

- Accepts user questions about the game.
- Composes answers grounded in `evidenceRefs` from the node.
- Refuses when evidence is thin.
- Refuses to produce betting certainty language.
- Stamps every answer with the model version that produced the node.

**Three query modes:**

- *Ask This Game* — questions scoped to one `gameId`.
- *Ask The Slate* — questions scoped to all games for a date.
- *Explain For My Lens* — answers rephrased through the active `UserLens`.

**Hard requirements:**

- No unsupported claims (every assertion cites an `EvidenceRef`).
- No public betting certainty language ("definitely will win," "guaranteed cover," etc.).
- No EV, Kelly, or win-rate figures in answers.
- Refusals are first-class outputs — the panel renders the refusal explicitly rather than returning empty.

**Refusal behavior:**

```
Q: "Will the home team cover?"
A: "We don't make outcome certainty calls. We can show you the factor breakdown that produced our score for this game — [factor breakdown link]. Or we can show you what would change our mind — [pre-mortem link]."
```

**Prompt design:** Claude owns the system prompt and the refusal templates. They live at `apps/web/lib/intelligence-graph/model-court/prompts.ts`. Codex wires Claude API; Claude writes the prompts.

### 4. Evidence Timeline

**Source:** `GameIntelligenceNode.evidenceTimeline`.

**What it shows:**

- Visualization of `PickSignalSnapshot` history: how the signals evolved over time as data arrived.
- Per-snapshot: timestamp, source mix, evidence grade, edge index value at that moment.
- Hover/tap reveals the snapshot's full contents.

**Visual:** Horizontal timeline with markers at each ingestion event. Recharts or hand-built SVG. No new dependency.

### 5. What Would Change Our Mind

**Source:** Pre-mortem auto-summary pipeline (Phase 2 build, Phase 3 surface).

**What it shows:**

- Pre-mortem text generated when the pick was published.
- Lists 2–4 conditions that would have to be true for the pick to lose.
- Public on every pick. No tier gating.

**Tone:** Direct, specific. *"If rest advantage flips, this loses. If late-injury news moves the line >2 pts, our edge evaporates."*

**Drives trust:** the model commits to its weak points before the outcome lands.

### 6. Lens Switcher

**Source:** `UserLens` from the Intelligence Graph.

**What it does:**

- Five tabs: Fantasy / Fan / Bettor / Creator / Analyst.
- Selecting a lens re-prioritizes which panels appear in which order.
- Does not change underlying data.

**Lens definitions:**

- **Bettor (default for Pro/Elite):** Market Pulse + Evidence Timeline + What Would Change Our Mind front and center. Edge Index visible. Factor breakdown if tier permits.
- **Fan:** Slate Weather + non-betting context. Hides Edge Index. Hides factor breakdown. Reframes the page as a sports-event preview.
- **Fantasy:** Slate Weather + player-level prop signals + season-long fantasy notes.
- **Creator:** Studio assets generated from this game (if any) + citations + asset library.
- **Analyst:** Everything visible. Evidence Timeline maximized. Raw signal data exposed.

The non-active panels still render below the prioritized ones — lens only reorders.

### 7. Galaxy Memory slot

**Source:** Settled outcome + `LossAutopsy` (when present) + Model Journal references.

**What it shows (post-game only):**

- Settled outcome (W/L/Push).
- Post-mortem narrative when the pick lost (from `LossAutopsy.whatWeLearned`).
- Link to the Model Journal essay that referenced this game (if any).
- "What did we learn from this game?" annotation when present.

**Persistence:** Galaxy Memory is permanent. A game's Room remains accessible after the game is over, with the Memory slot populated.

---

## Lens behavior detail

The lens kind affects:

- Panel order on the page.
- Which panels are collapsed by default.
- The Model Court refusal copy (in Phase 4) — a Fan lens user gets a different refusal than an Analyst lens user.
- The CTA at the bottom of the Room ("See more games like this" routes by lens).

The lens kind does NOT affect:

- The underlying `GameIntelligenceNode` data.
- The evidence citations.
- The compliance scanner rules.

---

## Tier projection

Every Room renders through `projectForSurface(node, surface, viewer)`:

- **Free tier on a published pick's Room:** sees Edge Index, sees Pre-Mortem (What Would Change Our Mind), sees Market Pulse with public metrics. Does not see the full factor breakdown. Does not see the pick's confidence number.
- **Pro tier:** adds the full factor breakdown + confidence number + alerts integration.
- **Elite tier:** adds the "What Was Learned" annotation + early access to draft Model Journal entries that reference this game.
- **Free tier on a gated game's Room:** sees Edge Index, sees the gate reason, sees Pass List context. Does not see hypothetical "what we would have done."

---

## Bootstrap-state behavior

A Room renders correctly even during bootstrap. Specifically:

- If the game has zero `GameSignal` rows yet, the Room renders an "Evidence is thin — check back near game time" state.
- The Model Court refuses on bootstrap-only games.
- The Evidence Timeline shows "First signal expected at [timestamp]."
- The Galaxy Memory slot is hidden until settlement.

Rooms never display bootstrap-era data as if it were canonical.

---

## Acceptance criteria (Phase 3 read-only Room → green)

1. `/room/[gameId]` route live.
2. All panels except Model Court render.
3. Tier projection enforced via the Intelligence Graph.
4. Bootstrap-state behavior visible and tested.
5. Lens switcher functional.
6. Galaxy Memory slot renders post-settlement.
7. Brand-safety scan against rendered room HTML returns zero hits across a 20-game sample.
8. Phase 1 verification gates respected (no banned vocabulary, no public EV/Kelly/win-rate).

When all eight hold, Phase 3 Room is green.

## Acceptance criteria (Phase 4 Model Court → green)

1. Model Court panel ships.
2. Claude API integration uses the prompts at `apps/web/lib/intelligence-graph/model-court/prompts.ts`.
3. Refusals render correctly when evidence is thin.
4. Refusals render correctly when the question implies betting certainty.
5. Citations render inline with every answer.
6. Eval suite at `docs/ops/evals/model-court-*` passes.
7. Average response latency under 3 seconds.
8. Cost per query under $0.05 (target — adjust based on Claude API pricing at the time).

When all eight hold, Phase 4 Model Court is green.

---

## Open items

- **OPEN-ROOM-1:** Should the Room URL be `/room/[gameId]` or `/game/[gameId]`? Default: `/room/[gameId]` — matches the Game Intelligence Room product name and avoids collision with potential `/game/*` admin routes. Codex confirms.
- **OPEN-ROOM-2:** Should the lens preference persist per user? Default: yes, in `User.preferences` JSON. Codex confirms.
- **OPEN-ROOM-3:** Should Model Court chat history persist? Default: yes, as `ModelCourtCase` rows in DB (Phase 4 schema). Phase 3 type-defines this.

---

*Spec authored by Claude. Codex implements. Refusal semantics are non-negotiable. The Model Court does not produce certainty.*
