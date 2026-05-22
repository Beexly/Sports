# Mission Control — Decision Cockpit UX Spec

**Phase:** 4 of the build plan.
**Status:** UX/storyboard spec for Codex implementation.
**Dependencies:** `docs/evidence-engine.md` (data model), `docs/brand-safety-rules-v2.md` (what may be shown).
**Existing surfaces this replaces or evolves:** the existing `/picks` page already shows pick cards with confidence + line. The cockpit elevates them from "list of picks" to "transparent decision log" — the user sees *how* the engine got there, not just what it landed on.

**Namespace clarification — important.** Codex already shipped an *operator-side* cockpit at `apps/web/app/cockpit/` and `apps/web/components/cockpit/` (Jarvis-themed: `jarvis-assessment-panel.tsx`, `jarvis-trend.tsx`, `jarvis-diff-badge.tsx`). That is a noindex internal-only system-status surface — launch readiness, agent health, calibration state, sources, tasks. It is NOT what this document describes.

This document describes the **public-facing** decision cockpit. To avoid namespace collision, the public cockpit should live under `/picks` (extending the existing public pick page) rather than `/cockpit` (which is reserved for the Jarvis operator surface). Components should live in a new directory `apps/web/components/decision-path/` or similar — anything that does not shadow the existing `components/cockpit/` Jarvis components.

---

## What the cockpit is, in one sentence

A public-facing visualization that, for every published pick, shows the engine's actual decision path: what data it pulled, which factors were activated, which were silenced, what gate it passed, and what verdict it reached — including "no pick" as a verdict.

Not gamified. Not a dashboard. A document with a heartbeat.

---

## Design principles (from the build plan)

> "Replace generic 'intelligence' copy with a visible decision cockpit."
> "Make 'no pick' feel intelligent: silence is a decision, not an empty state."
> "Upgrade the galaxy into a functional visual system feeding factor nodes into the cockpit."
> "Keep it premium but readable: older users get clear labels, large text, high contrast, and no hidden complexity."

These four lines are the constitution. Anything that contradicts them is wrong, no matter how clever.

---

## The five-frame storyboard

Every pick (and every "no pick") moves through the same five frames. The cockpit renders them as a visual path — vertical on mobile, horizontal on desktop ≥1024px.

```
[ 1. Board ]  →  [ 2. Context ]  →  [ 3. Signals ]  →  [ 4. Gate ]  →  [ 5. Verdict ]
```

Each frame has a fixed semantic role. Copy and visuals change per pick; the structure does not.

### Frame 1 — Board

**Question:** What market am I looking at?

**Renders:** Sport / league / matchup / commence time / current line / line movement (open → current) / market depth (book count) / consensus %.

**Visual:** Compressed table-card. Two teams in oversized type (per brand guidelines §3). The line, large. Movement as a colored arrow with delta magnitude.

**Brand-safety:** Only market data — `activated` market factors only. Nothing else can appear here.

**Accessibility:**
- Team names: ≥24px on mobile, ≥32px on desktop.
- Movement arrows: never color-only — include text (`+0.5`, `-1.0`).
- Live indicator: never animation-only — text "live" with motion-reduced fallback.

### Frame 2 — Context

**Question:** What surrounds this game that the line might not have priced in?

**Renders:** Schedule context (rest days, back-to-back, travel), recent form (last-5 with margin), divisional/rivalry flag, venue (home/away, altitude, surface), weather (outdoor only). One context fact per factor, structured.

**Visual:** Six small "context tiles" in a 2×3 (mobile) or 6×1 (desktop) grid. Each tile is a factor; each tile has a state.

**Tile states:**

| State | Visual | Meaning |
|---|---|---|
| `activated` | full opacity, ion-blue border | factor is live; contributed to pick |
| `activated-zero` | full opacity, neutral border | factor is live but contributed 0 (neutral) |
| `shadow` | 40% opacity, dotted border, "shadow" label | factor exists internally; not surfaced as a fact |
| `stale` | 40% opacity, alert border, "monitoring" label | factor exists but data is past freshness |
| `unavailable` | hidden | factor adapter is offline or doesn't apply |

**Brand-safety:** A `shadow` tile may say "monitoring" but cannot quote a number from the shadow factor. (BS-011, BS-050.)

**Copy patterns:**

- `activated`: "Chiefs on 6 days rest after MNF win." (factual, structured.)
- `activated-zero`: "Both teams on 3 days rest — even." (neutral.)
- `shadow`: "Referee tendency: monitoring." (no number.)
- `stale`: "Weather feed stale — pick generated without."

### Frame 3 — Signals

**Question:** What did the engine actually score, factor by factor?

**Renders:** For each activated factor that contributed to the score: factor name, contribution magnitude, direction (+/−), short reason from the structured-reason enum.

**Visual:** Horizontal bar chart, one row per activated factor. Bar length = contribution magnitude. Color = direction (cyan = toward the pick, magenta = away). On the left: factor label. On the right: structured reason.

**Important:** This is the only frame where numbers from non-market factors appear, and only when those factors are `activated`. Reading-order: factors with largest absolute contribution first.

**Brand-safety:**
- Each row must trace to a `FactorContribution` row in the database (BS-015).
- No free-form LLM-generated rationale per row. The reason field is a structured enum.
- Confidence number rendered at the bottom is the v1 marketDerivedEdge until `trueEV` is activated (BS-022).

**Accessibility:**
- Bars never communicate by color alone. Include a "+12" / "-8" number adjacent.
- Direction arrows: cyan/magenta plus a ↑ / ↓ glyph.
- Each row is a `<tr>` in a real `<table>` so screen readers narrate factor → contribution → reason.

### Frame 4 — Gate

**Question:** Did this pick pass every check, or was it stopped?

**Renders:** Six gates, in order. Each is pass/fail/skip.

| Gate | Pass criteria | Failure surfacing |
|---|---|---|
| Data freshness | All required factors `freshnessSec < threshold` | "Pick blocked — weather data 87 min stale" |
| Sample size | All used factors `sampleSize ≥ minSampleSize` | "Pick blocked — referee only 4 recent games" |
| Brand safety | Linter pass (per `docs/brand-safety-rules-v2.md`) | "Pick blocked — brand-safety review" |
| Confidence threshold | `marketDerivedEdge ≥ 50` | "No pick — confidence under threshold" |
| Activation status | All used factors `activated` | "Pick blocked — internal-only factor used" |
| Public policy | `evaluatePublicPerformancePolicy() === 'PUBLISHABLE'` | "Pick held — public publishing policy" |

**Visual:** Six checkmarks/x-marks in a row, with the gate name beneath. Failed gates expand to show the reason inline (not in a tooltip — old eyes shouldn't have to hover).

**Brand-safety:** When a gate fails, the cockpit shows the failure visibly. This is the system being honest, and it's marketing — see Phase 5 / `docs/content-surfaces.md` for the "Why the model stayed quiet" post that may reference these.

### Frame 5 — Verdict

**Question:** What is the engine's actual output?

**Renders:** One of three states, in oversized type.

1. **PUBLISHED.** Pick name + confidence (tier-gated per `evaluatePublicPerformancePolicy`). The classic v1 pick card.
2. **HELD.** Pick + reason. Pick exists internally; not surfaced as a recommendation. Public sees the reason ("waiting on confirmed lineup").
3. **NO PICK.** No bet. Reason. Optional pointer to the operator's reasoning (links to "Why the model stayed quiet" if one is published).

**Visual:** Same vertical real-estate as a v1 pick card. The verdict word is hero typography. Never an empty state. Never "no picks today" as the *only* message — there is always a reason given.

**Brand-safety:**
- PUBLISHED picks gate confidence per tier (FREE sees pick, hides confidence; PRO sees both).
- HELD/NO PICK never show a confidence number.
- NO PICK reasons are picked from a structured enum, not free-form.

---

## The galaxy → cockpit visual model

Existing hero: animated galaxy on the homepage (replaced from Three.js per CODEX_HANDOFF_2.md — `apps/web/components/hero/interactive-galaxy.tsx`).

**Refactor for cockpit:** The galaxy isn't decorative — it represents the factor universe. Each star is a factor. Each factor has a state.

- Bright, in-cluster star = `activated`.
- Dim, outer-orbit star = `shadow`.
- Pulsing-and-dimming star = `stale`.
- Off = `unavailable`.

When the user hovers a factor tile in Frame 2 (Context), the corresponding star in the galaxy hero highlights. This binds the brand metaphor to the engine: the galaxy *is* the engine's situational awareness.

**Constraint:** Motion-reduced mode disables the pulsing; activated factors still render bright, shadow ones still render dim — the metaphor degrades to static but stays comprehensible.

---

## Tier gating in the cockpit

Per CLAUDE.md's tier table:

| Frame | FREE | PRO | ELITE |
|---|---|---|---|
| Board | full | full | full |
| Context | full (factor presence visible) | full | full |
| Signals | factor names visible, contribution magnitudes redacted | full | full |
| Gate | full (pass/fail visible) | full | full |
| Verdict | one pick per day, confidence hidden | all picks, confidence visible | all picks + line movement + early-access |

**Why this works for free users:** They see the engine's *process* on all picks, every day, transparently. They see *which* picks they don't have access to. The conversion ask is "see the numbers," not "see anything at all."

**Brand-safety:** Tier redaction happens server-side. The redacted FREE-tier response from `/api/picks/daily-slate` literally does not contain the number — it's not just CSS-hidden (BS, CLAUDE.md non-negotiable #3).

---

## "No pick" as a first-class state

This is the build plan's most important UX directive. Implementation:

- The cockpit *always* renders. If the engine produced zero published picks today, the cockpit renders five blank Board cards with the games of the day and the reason each was held.
- Each held game runs through the full 5-frame storyboard so the reason is structured.
- Reason categories surfaced publicly (others stay internal):
  - "Weather data stale at slate publish time."
  - "Lineup not confirmed yet — checking back at 90 min to tip."
  - "Market depth below threshold (< 5 books)."
  - "Confidence under publish threshold."
  - "Calibration review in progress for [factor]."
- Each held-game card has a small `Why?` toggle that expands the gate sequence inline.

**Marketing surface:** The "Why the model stayed quiet" content surface (see `docs/content-surfaces.md`) draws from these reasons. Silence becomes a publishing rhythm.

---

## Older-user readability — non-negotiable

Garrett's audience skews older than the average crypto-Twitter capper. The cockpit's job is to feel premium *and* be readable at arm's length without glasses.

**Type sizing minimums:**

- Hero typography (team names, verdict word): ≥32px desktop, ≥24px mobile.
- Body copy (reasons, gate names): ≥18px desktop, ≥17px mobile.
- Microcopy (timestamps, tier labels): ≥14px, with `--fg-muted` already bumped to `--ion-1` (per CODEX_HANDOFF_2 Round 4 — 6.7:1 contrast).

**Contrast:**

- All non-decorative text passes WCAG AA (Round 4 audit already established this baseline).
- The galaxy hero text overlay uses `--ion-white` on `--obsidian`; verified ≥7:1 in current tokens.

**Labels over icons:**

- Every icon has a text label adjacent. No icon-only buttons.
- The factor-tile states (Frame 2) include both the visual state AND a text word: "live", "monitoring", "stale", "—".

**No hidden complexity:**

- No accordion-by-default for primary content. The 5 frames render expanded.
- Tooltips are supplemental, never primary.
- The "Why?" toggle on held games expands *in place*, not in a modal.

**Motion:**

- All infinite pulses already have `prefers-reduced-motion: reduce` fallbacks (Round 4).
- The galaxy-to-cockpit star highlight uses a 200ms fade; motion-reduced = instant.

---

## Responsive layout

### Desktop (≥1024px)

```
┌───────────────────────────────────────────────────────────┐
│                    Galaxy hero (sticky)                    │
├───────────────────────────────────────────────────────────┤
│  [Board] → [Context] → [Signals] → [Gate] → [Verdict]     │
│   …repeat per pick / per held game…                       │
└───────────────────────────────────────────────────────────┘
```

5-frame row, scrollable down the page. Each pick is one row.

### Tablet (640–1023px)

5-frame row collapses to a 2-column grid: Board+Verdict on top, Context+Gate+Signals below. Verdict word stays large.

### Mobile (<640px)

Frames stack vertically. Each frame is a full-width card. Vertical line connector between frames carries the "decision path" metaphor.

---

## Components Codex should build

`apps/web/components/decision-path/` (new directory — chosen to avoid colliding with the existing operator-Jarvis `components/cockpit/`).

```
components/decision-path/
├── decision-path.tsx         # 5-frame container
├── frame-board.tsx
├── frame-context.tsx
├── frame-signals.tsx
├── frame-gate.tsx
├── frame-verdict.tsx
├── factor-tile.tsx           # used by frame-context
├── signal-bar.tsx            # used by frame-signals
├── gate-check.tsx            # used by frame-gate
├── held-game-card.tsx        # "no pick" full-frame storyboard
└── galaxy-star-binding.tsx   # hover-to-highlight binding
```

Server-data flow:

- `/api/picks/daily-slate` already returns the published picks (tier-gated).
- Add `/api/picks/daily-decisions` returning the full decision graph for every game (published + held + no-pick), tier-gated identically.
- The cockpit page reads `daily-decisions` server-side, hydrates client components for hover binding.

---

## Existing surfaces — relationship

| Page | What it does today | Cockpit relationship |
|---|---|---|
| `/picks` | Tier-gated pick cards | becomes the cockpit. Each card expands to the 5-frame path. |
| `/observatory` | Founder-voice page explaining the engine | adds a live "today's decision log" link to the cockpit. |
| `/vault` | Historical picks | each historical pick gets a "see the decision path" expander — the same 5 frames, frozen at that pick's `evidenceBundleId`. |
| `/methodology` | How the engine works, in prose | adds an interactive demo: a sample game running through all 5 frames with annotations. (This may already partly exist — the AnnotatedSampleSignal component from CODEX_HANDOFF_2.) |

The cockpit pattern is the *thing*. Once it's built, every public surface that shows a pick uses it.

---

## What this is NOT

- **NOT a real-time dashboard with auto-refresh tickers.** Pace is calm. Decisions don't change second-by-second; the slate publishes at a fixed cadence, the cockpit reflects that cadence.
- **NOT gamified.** No streaks, no "🔥", no "you missed the lock!" patterns. Brand voice is precise, not promotional.
- **NOT an admin tool.** The operator dashboard at `/admin/factors` is a separate thing for Garrett. The cockpit is what the *public* sees.
- **NOT a place where shadow data leaks.** Frame 2 may say "monitoring"; it never shows a shadow-factor's value (BS-011, BS-050).

---

## Acceptance criteria

A reasonable launch criterion for the cockpit:

- [ ] The 5 frames render for every game on the slate (published, held, or no-pick).
- [ ] Held / no-pick games display a structured reason from the enum.
- [ ] Tier gating happens server-side; FREE-tier API response does not contain the redacted numbers.
- [ ] Hover-bound galaxy stars match factor tiles 1:1 on desktop; motion-reduced disables animation but keeps the binding.
- [ ] All hero typography ≥32px desktop, ≥24px mobile.
- [ ] All factor-state communications are color + text (never color alone).
- [ ] `apps/web/__tests__/shadow-leak.test.ts` passes against the new cockpit endpoint.
- [ ] WCAG 2.1 AA contrast verified across all 5 frames (axe scan in CI).
- [ ] The component renders in <1.5s LCP on a mid-range mobile device.

---

## One-paragraph summary

The cockpit is the brand's promise made visible. Every pick — and every silence — is rendered as a five-frame decision path: what we looked at, what surrounded it, what signals fired, what gates it passed or failed, and what the engine concluded. The galaxy hero is the factor universe rendered as starlight; the cockpit is what happens when starlight meets a slate. Older users get oversized type and high contrast; everyone gets the same transparent reasoning. The most important UX outcome: "no pick" is never an empty state. It's the engine being intelligent in public.
