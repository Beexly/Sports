# Observatory Edge Map - Visual Encoding

The Edge Map (the Observatory "slate twin") is a spatial intelligence instrument,
not a decorative galaxy. Every visual property carries meaning. This document is
the source of truth for that encoding and mirrors the in-product **Legend**
(collapsible, hidden by default, beneath the canvas).

> The Edge Map runs on **illustrative / demo data** until the readiness gate
> opens. The `ILLUSTRATIVE SLATE - DEMO DATA, NOT LIVE` disclosure stays visible
> at all times. Encodings without a wired live source (public/sharp split) stay
> dark rather than guess.

## Visual encoding

| Channel | Encodes | Read it as |
|---|---|---|
| **Core size + brightness** | Signal density | How many independent factors align on the read |
| **Halo** | Volatility | How fragile the read is - bigger halo, more fragile |
| **Orbit wobble** | Contradiction mass | Credible counter-evidence still in play |
| **Confidence ring** | Confidence at the scrubbed step | Radius + brightness grow with confidence; it **collapses toward the core when the read goes on hold** |
| **Trail** | Line movement | The path of the price from open, revealed up to the scrubbed step |
| **Market satellites** | Markets on the game | Each market orbits the core; **satellite size = market depth** |
| **Magenta lobe vs cyan node** | Public-money pull vs sharp divergence | The "dark-matter" tug-of-war: the crowd bends the orbit one way, sharp action pulls it back |
| **Impact ring** | Injury / roster event | A shockwave fires at the event's timeline step, then leaves a residual ring |
| **Core colour** | Verdict | Cyan = PLAY, ultraviolet = WATCHLIST, magenta = NO-BET, **grey = held** |

## The timeline (the 4D axis)

The scrubber moves every system through `Opening line -> Overnight -> Injury
report -> Public money -> Sharp move -> Model re-run -> Final -> Result`.
Scrubbing visibly morphs each system: confidence rings fill or collapse, impact
shockwaves fire at their step, trails extend, and a read whose confidence decays
below the hold line flips to a **HOLD** state (greyed core, collapsed ring). It
is a 4D axis, not an inert slider.

## Camera states

`overview -> league focus -> game focus -> market drill -> release`. Transitions
are eased (no jump-cuts); clicking a system flies the camera to it, and drilling
a market pulls the camera in closer. Selecting a league flies to its cluster.

## Inspect HUD

On hover or focus, a compact HUD reads the system in five scannable fields:

- **Verdict** (+ live confidence) - PLAY / WATCHLIST / NO-BET / HOLD
- **Changed** - what moved since the opening read (confidence drift + line direction)
- **Risk** - volatility band + contradiction mass
- **Breaks on** - the single event that would invalidate the read
- **Receipt** - settlement status (honest for pre-launch: illustrative / nothing to settle)

The full accessible read lives in the inspector card and slate manifest below
the canvas, which are also the keyboard controls.

## Layout

Leagues are laid out as **separated clusters** seated on a wide ring (and lifted
or dropped on Y), with games spaced inside each cluster above a guaranteed
minimum separation. No overlapping cores, no piled orbit rings. The layout is
deterministic and unit-tested (`lib/slate-twin/layout.ts`).

## Labels

Progressive disclosure prevents label pile-up:

- **Overview** shows only league-cluster labels; individual game labels appear on
  hover (or, under reduced motion, all at once, de-conflicted).
- **League focus** reveals that league's game labels.
- **Game focus** shows the selected label + its market labels.

Visible labels are de-conflicted vertically (a minimum gap is enforced) and a
thin leader line connects an offset label back to its node. Labels never overlap.

## Performance + accessibility

- The GL layer is lazy-loaded (`next/dynamic { ssr: false }`) and only mounted on
  viewport intersection; a fast static composition stands in for first paint/LCP.
- Particle counts and bloom scale to the device (DPR + cores/memory heuristic);
  the rAF loop pauses when the section is offscreen or the tab is hidden, and the
  GL context is disposed on unmount.
- `prefers-reduced-motion` renders a single static, de-conflicted, fully legible
  frame with no animation loop. The canvas is `aria-hidden`; the manifest and
  inspector are the accessible, keyboard-navigable source of truth.

## Guardrails

- The trust gate forbids the casino-tier certainty term that rhymes with "clock";
  this surface uses "hold" / "cleared" / "acquire" instead.
- No fabricated live data - demo/illustrative data stays clearly labelled.
