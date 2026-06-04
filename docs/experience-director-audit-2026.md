# 2026 Experience Director Pass — Audit

**Date:** 2026-06-04
**Scope:** Homepage + top-level routes, copy doctrine, motion system, information
architecture.
**Posture:** Experience compression, not feature sprawl. No new product systems
were invented in this pass.

---

## 0. The correction, corrected

The brief that triggered this pass (an external audit) diagnosed the site as
"blocks, cards, proof language, and isolated tools" and prescribed a five-prompt
build-out: rebuild the homepage into a command surface, ship a cinematic cold
open, rebuild the Edge Map, stand up a Nova/Galaxy Studios production system, and
expand the Academy.

Two things had to be reconciled before acting on it:

**1. Parts of the brief describe a product that does not exist in this repo.**
The brief references routes and docs as if they were built. They are not:

| Referenced by the brief | Status in repo | Reality |
|---|---|---|
| `/gsn`, `/academy`, `/fantasy/studio`, `/parlay-mri`, `/intelligence` | **Do not exist** | No route, no page, no component |
| `docs/decision-os-vision.md`, `docs/nova-production-spec.md`, `docs/managed-leagues-vision.md` | **Do not exist** | Not in `docs/` |
| "Slate Twin, Agent War Room, Parlay Genome, Trust Ledger, Bias Mirror, Nova, GM Autopilot" as shipped surfaces | **Mostly aspirational** | `/observatory`, `/board`, `/ledger`, `/performance`, `/room`, `/methodology`, `/brief`, `/journal`, `/vault` exist; the named "systems" largely do not |

Building "Nova production systems" and "Academy hard-mode labs" on top of a
product that has none of those foundations would have been the exact feature
sprawl the brief warns against. **Those prompts (4 and 5) are deferred** and
listed under §9 as grounded future work, not done in this pass.

**2. The site is further along than the brief assumes.** The worst offenders it
calls out were already fixed:

- `"glass box"` — **0 occurrences** in the app. Already removed (commit `e4d3c21`,
  "kill the AI-speak").
- `"we show the math"`, `"visible reasoning"` — **0 occurrences**.
- The homepage headline is already `"We post our losses."` with tactical body
  copy ("No edge, no pick", "The receipt stays attached").
- A **compliance scanner + trust gate** already enforces anti-tout language in CI.

**Most important nuance the external brief got backwards:** it lists
`"math you can read"` as banned AI-speak to remove. It is the opposite. It is the
brand's *anti-AI* positioning, and it is enforced by
`apps/web/lib/compliance-scanner/rules.ts` (DEC-001/002), which **bans**
`"AI-powered"` *because* the position is "We're not AI. We're math you can read."
Crusading against that phrase would have broken the brand's core differentiator.
It stays.

So this pass took the brief's **real** signal — the experience is fragmented and
over-explains trust; it should *behave* the doctrine, not narrate it — and
applied it to the product that actually exists.

---

## 1. Phase A — Audit

### What is genuinely world-class
- **The loss-first thesis.** "We post our losses." as the front door is a real,
  defensible, anti-tout position. Nobody in the category leads with this.
- **The engine-in-the-open beats.** Gate → Pass List → Calibration → Autopsy on
  the homepage is honest and concrete. The empty states are honest ("Empty is an
  honest state. Nothing is staged.").
- **Restraint as product.** `loadBoardState` and the gate surfaces never invent
  rows; sample data is labeled "Preview mode" and "never settles."
- **The galaxy hero.** `interactive-galaxy.tsx` is a tasteful 2D canvas
  (depth-tiered particles, parallax, constellation lines, reduced-motion static
  fallback) with no Three.js weight. This is good craft.
- **Trust infrastructure.** Trust-claim registry + `scanForBannedPhrases` + the
  `guard:trust` CI gate enforce the voice automatically.

### What still read like a prototype (and was addressed)
- **The hero's bottom half was a static telemetry strip + two buttons.** It
  *told* you stats and *offered* links. It did not feel like a system that is
  doing something right now. → Replaced with the **CommandDeck** (§4).
- **Motion was decoration, not state.** The Tailwind animation set was
  `live-pulse / shimmer / marquee / ambient-drift / signature-spin / cursor-blink`
  — all ambient. Nothing communicated a *state change* (a read clearing, a hold,
  a breach). → Added a **state-communicating motion system** (§5).
- **No cold open.** The site opened straight into a hero. → Added the
  **SignalBreachIntro** (§4), once-per-session and reduced-motion-exempt.

### Where copy still over-explains (recommended, not all done here)
- `EngineCenterpiece` intro + each of the four beats restate "restraint" in prose.
  The beats are strong; the connective paragraphs can lose ~30% of their words.
- `ResponsibleBand` and `MethodologySection` cover overlapping ground on a single
  scroll. Candidate for a merge in a later pass.

### Above-the-fold "must do work" — route by route
| Route | Above the fold today | Verdict |
|---|---|---|
| `/` (home) | Galaxy + "We post our losses." + **CommandDeck** (new) | Now a command surface. ✓ |
| `/observatory` (Edge Map) | **Deliberate pre-launch placeholder** — text + status card, dark until settled history exists | Correct as-is; NOT a galaxy needing polish (see §9.1) |
| `/board` | Today's evaluated slate | The real "slate"; primary destination |
| `/ledger`, `/performance` | Receipts + autopsies | The proof layer; keep |
| `/methodology` | How the gate works | The "how" — fine as a reading surface |

---

## 2. Phase B — Information architecture: the loop

The product runs one loop. The homepage now routes into it explicitly via the
CommandDeck, mapped to **routes that exist**:

```
Observe ──▶ Decide ──▶ Prove ──▶ (Train) ──▶ (Broadcast)
   │           │          │           │            │
/observatory /board   /ledger     /methodology   /journal
 (Edge Map)  (Board) (+performance)  (the "how")  /brief
```

- **Observe / Decide / Prove** have first-class routes and are surfaced as the
  three CommandDeck tiles (Decide = primary).
- **Train** maps to `/methodology` today. There is **no Academy**; the brief's
  "hard-mode labs" are future work (§9), not a shipped lane.
- **Broadcast** maps to `/journal` + `/brief` today. There is **no GSN / Nova**;
  the synthetic-presenter system is future work (§9).

Naming the loop honestly — and not drawing lanes for surfaces that don't exist —
is the IA decision.

---

## 3. Phase C — Copy doctrine

**Voice:** tactical, human, short. Demonstrate trust through behavior (receipts,
timestamps, gates, autopsies), don't assert it.

**Approved, in use:** "Price moved." · "News broke." · "The model disagreed." ·
"No edge, no pick." · "What cleared. What we held." · "Every read keeps its
receipt." · "The receipt stays attached." · "Signal acquired." · "Enter the
slate."

**Keep (brand-critical, not banned):** "math you can read" — the anti-AI line,
compliance-enforced. Do not remove.

**Hard constraint discovered — the word `lock` is banned.** The trust gate and
`scanForBannedPhrases` reject the standalone word `lock` (tout's "lock of the
day") across `apps/web/**` and `packages/**`, comments included. Word boundaries
spare `block` / `unlock` / `clock` / `locked`. **Consequence for this pass:** the
external brief's motion token named `lock` and its "the system locks" beat would
have failed CI. They were renamed to `acquire` (a read clears the gate) and the
reject beat to `hold` (the gate held) — which also happen to match the existing
gate vocabulary better. See §5.

---

## 4. Phase D — Experience unification (shipped)

### CommandDeck — `apps/web/app/page.tsx`
The hero's lower half is now one live band that answers a first-time visitor's
three questions in ten seconds:

1. **Is anything happening?** — a status line: live dot, "Engine live", "Last run
   {time}", model version, and a `scan-line` sweep that says *the engine is
   reading*.
2. **What's the posture?** — five real counts from `BoardStateData`:
   **Under review · Cleared · Held · Sports · Books**. Nothing fabricated; an
   empty slate shows honest zeros. ("Held" surfaces `gatedToday` up front — the
   restraint becomes the headline metric.)
3. **Where do I go?** — the loop as tiles: **Observe → Decide → Prove**, Decide
   (the board) primary. Footer: "No edge, no pick." + the methodology way-in.

This replaced a static telemetry grid and a two-button row. It is server-rendered
(no client JS), reuses real data already loaded by the page, and preserves every
homepage-doctrine test contract (`Live board telemetry`, the field names,
`grid grid-cols-2`, `sm:flex sm:min-w-max`, single `font-arch`, the arch headline).

### SignalBreachIntro — `apps/web/components/hero/signal-breach-intro.tsx`
A cold open that *plays* the loop instead of explaining it: price moved → model
disagreed → **no edge, no pick** (held) → **signal acquired** → the receipt stays
attached → "Enter the slate." It resolves *into* the live galaxy hero (no hard
cut). Product rules, deliberately:

- **Once per browser session** (`sessionStorage`). Not on every navigation —
  replaying a splash on each click is hostile.
- **`prefers-reduced-motion` → never shows.** The command surface is already there.
- **Always skippable** — focusable Skip control, Escape/Enter/Space, click,
  scroll, or touch; plus auto-dismiss (~4.7s).
- **No audio, no canvas, no libs.** Pure CSS motion tokens, so the global
  reduced-motion neutraliser applies. Post-hydration overlay over server-rendered
  content → never blocks first paint or the crawlable DOM.
- The `useIntroMode` hook encapsulates the decision and avoids hydration mismatch
  (SSR + first client render → nothing; the effect decides).

---

## 5. Phase E — Motion system (shipped)

State-communicating tokens. Keyframes live once in `apps/web/app/globals.css`
(single source of truth, same pattern as `pp-live-pulse`); Tailwind exposes them
as `animate-<token>` via `tailwind.config.ts` (animation entries only, so no
duplicate `@keyframes` emission). All are GPU-friendly (opacity / transform /
box-shadow / clip-path) and are neutralised under reduced motion by the global
base layer.

| Token | State it communicates | Brief's name |
|---|---|---|
| `boot` | a surface coming online | boot |
| `breach` | a signal breaking in (sharp entrance) | breach |
| `scan` | the engine actively reading (sweep) | scan |
| `acquire` | a read clearing the gate (the lock-on moment) | ~~lock~~ → renamed (banned word) |
| `hold` | the gate holding / no-bet (firm, no celebration) | ~~reject~~ → renamed to match gate voice |
| `pulse-ring` | live attention without noise | pulse (renamed to avoid clobbering Tailwind's `animate-pulse`) |
| `orbit` | ambient market motion | orbit |
| `impact` | a result landing | impact |
| `autopsy` | a post-result review unveiling | autopsy |
| `transmit` | an on-air broadcast | transmit |

Plus a composable helper, `.scan-line`, for clipped status bands (used by the
CommandDeck status line).

**In use now:** `scan` (CommandDeck), `breach` (intro kicker), `live-dot` pulse.
The rest are defined as the shared vocabulary for the loop surfaces (Observe /
Prove / Broadcast) so future work pulls from one set instead of inventing motion
per component.

---

## 6. Files changed
- `apps/web/app/page.tsx` — hero evolved into the CommandDeck; intro mounted.
- `apps/web/components/hero/signal-breach-intro.tsx` — **new** cold open + `useIntroMode`.
- `apps/web/app/globals.css` — motion-system keyframes + `.scan-line`.
- `apps/web/tailwind.config.ts` — `animate-<token>` animation entries.
- `docs/experience-director-audit-2026.md` — this document.

## 7. Verification
- `typecheck` (apps/web) — pass
- `lint` (apps/web, `--max-warnings=0`) — pass
- `guard:trust` — pass (no banned phrases)
- `homepage-doctrine-hero`, `public-copy-scan-strong`, `brand-voice-vocabulary` — pass
- production `build` — see commit/run log
- (Screenshots captured via the repo's Playwright script where the environment allows.)

## 8. Design rule going forward
Every surface must answer one of five questions fast: **What changed? What
matters? What's the risk? What would change the read? What did we learn after?**
If a section answers none, cut it, collapse it, or make it an interaction.

## 9. Deliberately out of scope (grounded next steps)
These are the brief's remaining prompts, re-scoped to reality. They are **not**
done and should each be their own pass with their own foundations:

1. **Observatory / Edge Map** (brief Prompt 3) — **do not "polish the galaxy."**
   The brief misreads reality: there is no galaxy on `/observatory`. That route is
   a *deliberate placeholder* (`apps/web/app/observatory/page.tsx` says so) and is
   intentionally dark until real settled history exists. The galaxy the brief
   critiques is the **homepage hero** (`interactive-galaxy.tsx`), which is already
   strong. Building a spatial market visualization now would manufacture a view
   with no data behind it — a direct violation of non-negotiable rule #1 ("No fake
   data"). The real Prompt-3 work happens **after** the readiness gate opens and
   live market data exists; at that point the homepage galaxy + this pass's motion
   system are the visual language to extend. Until then, the placeholder is the
   honest surface.
2. **Academy** (brief Prompt 5). Does not exist. Requires a curriculum/lab data
   model before any "hard-mode" UI. Net-new product.
3. **Nova / Galaxy Studios** (brief Prompt 4). Does not exist as a route. Requires
   a consent/disclosure/human-review pipeline and avatar-vendor decisions before
   any presenter UI. Net-new product with real legal surface area; do not
   prototype the persona before the safety rails.
4. **Copy compression on `EngineCenterpiece` / `ResponsibleBand`** — trim the
   connective prose now that the CommandDeck carries the "what's happening" load.
