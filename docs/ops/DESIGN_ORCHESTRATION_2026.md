# GSE Design Orchestration — Creative Director's Call (2026-07-08)

**Role:** I'm the orchestrator + integration owner. I hold the real repo and CI; every
tool feeds me, and I wire + test + ship. This doc is the single source of truth for the
"best website of 2026" push.

---

## The verdict on Claude Design's pass (introspective, honest)

Claude Design delivered four clean, on-brand **static HTML specs** (Landing/Pricing/Picks/
Dashboard) with genuinely good discipline: one action color (cyan), SIGNAL_FADE reserved as
signature hairlines, a "paper ledger" band for proof moments, JetBrains Mono numerals,
honesty preserved (losses shown graded, illustrative footnotes, "passing is a position").

**But there's a fundamental mismatch I have to name.** Claude Design worked **without the
repo**, so it did NOT know that our real site is *already* far more cinematic than its
mockups:

- A **21-component motion library** (`MontageEntrance` cold-open, `SentientWeather` ambient
  bed, `SignalSpine`, `SignalCore`, `GeneratedPlate` with a **motion-video slot**,
  `SignalDecode` typewriter, `holo-tilt-card`, `holographic-receipt`, `observatory-beacon`,
  `glitch-truth`, `thermal-vision`, `voice-waveform`, `signal-fragment-field`, …).
- ~40 keyframe animations in `globals.css`, all `prefers-reduced-motion` guarded.
- The landing already opens with a **3.6s cinematic cold-open over a real motion bed**,
  chrome-plasma/chrome-ice text treatments, hover accent rails on the door console.

**So the real risk is the OPPOSITE of what Garrett fears.** He fears "stale / read-only /
stagnant." Reality: the live site is *maximally* cinematic — arguably at risk of being
**too much** (multiple text-chrome effects, ambient weather, decode animations, cold-open),
which collides with his other explicit wants: *clean, professional, clear to read, not
over-explaining, not confusing people.* Naively "applying" Claude Design's static mockups
would **flatten** the cinematic richness; naively piling on more motion would **overwhelm**.

## The thesis that resolves the tension

> **Cinematic where it earns attention. Editorial-calm everywhere else. One motion
> vocabulary, deployed with hierarchy and restraint.**

- **Cinematic (full wow):** the hero, ONE signature teaching beat (signal-vs-noise), the
  proof reveal, and the purchase-success moment. These are where "2026 film" lives.
- **Editorial-calm (Claude Design's discipline):** pricing plans, pick cards, dashboard
  ledger, comparison tables — the scannable, decision-critical content. Motion here is a
  single tasteful accent (a hover tilt, a signal-fade underline), never a spectacle.
- **Interactive, not just animated:** Garrett's real ask is *interactive experience /
  community / engaging / fun*, not more things that auto-play. That's a product layer
  (live board pulse, hover-to-reveal reasoning, a "your read vs the model" micro-interaction,
  streak/participation surfaces) — bigger than a style pass, tracked below.

## Tool orchestration — each at its highest leverage

| Tool | Role | Why it, specifically |
|---|---|---|
| **Me (Claude Code)** | Orchestrator + integration owner. Set the reference implementation + motion/clarity vocabulary in the REAL codebase; wire every asset; typecheck/lint/build/test; ship. | Only actor with the real repo + CI + the guardrails. Everything routes through me. |
| **Claude Design** | Visual exploration + editorial discipline — **repo-aware, component-scoped**. Refine SPECIFIC components/states (a pricing card, the pick-card locked state, the dashboard ledger) as tight specs I translate. NOT full-page redesigns from scratch. | It's excellent at layout/hierarchy/calm. Its weakness here was flying blind + flattening. Fix the brief (below). |
| **Higgsfield** | Cinematic MEDIA the DOM can't produce: a brand hero film loop / ambient observatory background / animated proof-viz / motion-graphic explainer. Self-hosted, poster+lazy+reduced-motion fallback, perf-budgeted. | Real new capability. The hero's `GeneratedPlate` already has a **motion-video slot** — a perfect, low-risk insertion point. Brief below. |
| **Codex** | Mechanical breadth once I've set the reference pattern: apply a token/spacing/motion-guard sweep across ~200 components in parallel. | Consistency at scale; parallel hands. |

## Execution sequence (I drive; nothing spends external credits without a green light)

1. **Lock the vocabulary in-code (me).** One elevated reference per funnel view using
   EXISTING primitives (e.g. `holo-tilt-card` on pick cards, a SIGNAL_FADE hairline +
   reveal cadence on the price ladder), reduced-motion safe, tested. This becomes the
   pattern the other tools follow.
2. **Higgsfield hero loop (green-light gated — spends credits).** Generate the ambient
   observatory motion plate to the spec below; I wire it into the `GeneratedPlate` motion
   slot with a poster still + reduced-motion fallback.
3. **Claude Design v2 (repo-aware brief below).** Component-scoped refinements to the
   scannable funnel surfaces; I translate to real Tailwind.
4. **Codex sweep.** Token/spacing/motion-guard consistency pass across the long tail.
5. **Interactivity/community layer (product, separate track).** Scoped after the visual
   language is locked.

Guardrails unchanged: server-side paywall untouched, honesty copy untouched, prices from
`getCurrentPricingPhase()`, WCAG-tuned tokens preserved, every motion `prefers-reduced-motion`
guarded, LCP/perf budgeted (hero media = poster-first + lazy).

---

## BRIEF A — Claude Design v2 (paste; fixes the "flying blind + flattening" problem)

```
You are refining a LIVING, already-cinematic Next.js site (Galaxy Sports Edge) — NOT
designing a static one from scratch. Critical context your last pass was missing:

The real site ALREADY has a 21-component motion library and ~40 reduced-motion-guarded
keyframes. The landing opens with a 3.6s cinematic cold-open over a motion bed; it uses
chrome-plasma/chrome-ice text, an ambient "sentient weather" layer, a signal-decode
typewriter, hover accent rails, and a hero GeneratedPlate with a motion-video slot. DO NOT
flatten any of this. Your job is EDITORIAL DISCIPLINE, not motion removal.

Thesis: cinematic where it earns attention (hero, one signature beat, proof reveal,
purchase success); editorial-calm everywhere else (pricing plans, pick cards, dashboard
ledger, tables). One motion vocabulary, restraint over spectacle, clarity over density.

Deliver COMPONENT-SCOPED refinement specs (not full-page redesigns) for: the pricing plan
card + the public price-ladder, the pick-card open/locked/graded states, and the dashboard
30-day ledger. For each: the calm, scannable layout; where the ONE tasteful motion accent
goes; the exact GSE tokens (surface scale void→mineral, text-ion/ion-1/2/3 AA-tuned, cyan
as the single action color, SIGNAL_FADE only as signature hairlines, ds-* spacing). Keep
honesty copy and prices as-is (prices come from a pricing-phase object). Output tight specs
I can translate straight into Tailwind — assume I own the codebase and will wire them.
```

## BRIEF B — Higgsfield cinematic hero loop (spec; fire on green light)

```
Generate a seamless, loopable ambient background motion plate for a sports "decision
intelligence" site's hero. Mood: an observatory / deep-space command console — calm,
premium, precise, NOT flashy or arcade. 8–12s seamless loop, subtle parallax drift only
(no hard cuts, no text, no logos, no readable numbers). Palette STRICTLY: deep space black
(#05070B / #080A0F) base; accents in orbital cyan (#00E5FF) sparingly, with faint soft-
ultraviolet (#7B61FF) and a whisper of ion-magenta (#FF38C7) — cyan dominant, others as
rare glints. Think: slow-drifting nebula field, faint signal constellations, a distant
core glow, occasional single telemetry ping. Dark enough that white/cyan text sits on top
at WCAG-AA. Deliverables: 1920×1080 + a mobile-safe 9:16 crop, H.264 + WebM, and a first-
frame poster still. Must look intentional at 0.85 opacity behind a headline.
```
Delivery target in code: the hero `GeneratedPlate` `motion`/`still` slot (already built to
accept it) — I add poster-first load, lazy, and a reduced-motion still fallback.
