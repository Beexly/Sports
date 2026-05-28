# Sports OS — Motion and Transition Doctrine

**Status**: Doctrine. Governs all animation and motion in Galaxy Sports Edge.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `DESIGN.md` — root design tokens (includes motion tokens)
- `docs/design/visual-language-palette-lab.md` — color within motion
- `docs/design/component-system-maturity.md` — motion requirements per level
- `docs/design/design-md-spec.md` — design token system
- `docs/design/obs-inspired-scene-system.md` — scene transitions

---

## Purpose

Motion is identity in Galaxy Sports Edge. The Galaxy design direction uses
motion not as decoration but as a communication layer — transitions convey
hierarchy, timing conveys data confidence, and animation conveys the speed
and precision of the intelligence engine.

This document defines the complete motion and transition system: the token
values, the principles, the component-level motion rules, the accessibility
requirements, and the forbidden patterns. It is the authoritative reference
for any developer or designer building animated UI for Sports OS.

---

## Source Evidence from Line Audit

Wave 3 audit reviewed motion system patterns from:

**Design system motion references**:
- Material Design 3 (Google): Easing curve library (emphasized, decelerated,
  accelerated); duration tokens; component-specific animation specs
- Apple HIG: Spatial computing motion guidelines; depth-aware animation
- Framer Motion (React animation library): Physics-based spring system;
  layout animations; presence animations — MIT license, safe to use
- Vercel's design: Subtle, purposeful micro-interactions; no gratuitous animation
- Linear.app: Instant-feeling transitions; motion as data — not decoration

**Sports-specific motion references**:
- Bloomberg Terminal: Controlled data refresh animations; no animation
  that distracts from number reading
- F1 timing screens: Precise, tight animations tied to real-time data events
- NASA Mission Control: Alert motion that is clear, not alarming without cause

**Key finding**: The cinematic/luxury-OS Galaxy design direction requires
motion that is perceived as sophisticated and data-driven, not entertainment-product
flashy. The risk is over-animation — an animated confidence score or flashing
odds can look like a slot machine, which directly undermines the brand.
Motion must be earned and purposeful.

---

## User Value

- Transitions that orient users within a complex data UI (entering the
  Evidence Drawer doesn't feel disorienting).
- Animation that communicates data states (a settling pick fades to
  "settled" without a jarring cut).
- Reduced cognitive load — fluid transitions allow users to track context.

---

## Operator Value

- Motion doctrine prevents components from individually introducing
  conflicting animation styles.
- A consistent motion system makes the product feel premium and intentional —
  supporting the positioning.
- Forbidden motion patterns prevent the product from reading as gambling-adjacent.

---

## Current Sports OS Fit

The current `apps/web/` uses Tailwind's transition utilities and some
Framer Motion animations on the homepage galaxy animation. Motion doctrine
formalizes these into a governed system with specific tokens and rules.

---

## Motion Token System

All motion values must be referenced from these tokens, not hardcoded:

```css
/* Duration tokens */
--duration-instant:    100ms;  /* Micro-interactions: hover, focus ring */
--duration-fast:       200ms;  /* Element reveal, simple fade */
--duration-standard:   300ms;  /* Most component transitions */
--duration-deliberate: 500ms;  /* Drawer opens, panel slides */
--duration-slow:       750ms;  /* Page-level transitions, hero elements */
--duration-cinematic:  1200ms; /* Signature moments — landing, brand beats */

/* Easing tokens */
--ease-in:         cubic-bezier(0.4, 0, 1, 1);       /* Exiting elements */
--ease-out:        cubic-bezier(0, 0, 0.2, 1);       /* Entering elements */
--ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);     /* Elements staying in view */
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful, precise arrivals */
--ease-data:       cubic-bezier(0.0, 0.0, 0.2, 1);   /* Data refresh animations — feels exact */
--ease-cinematic:  cubic-bezier(0.16, 1, 0.3, 1);    /* Hero/brand moments */

/* Scale tokens (for transforms) */
--scale-subtle:   0.98;   /* Pressed state */
--scale-enter:    0.96;   /* Element entering from scale */
--scale-reveal:   1.02;   /* Attention-drawing reveal */

/* Translate tokens (for slide animations) */
--translate-sm:   8px;
--translate-md:   16px;
--translate-lg:   32px;
--translate-xl:   64px;

/* Blur tokens (for reveal animations) */
--blur-enter:     4px;    /* Starting blur for reveal */
--blur-focus:     0px;    /* Focused/arrived state */
```

---

## Motion Principles

### Principle 1 — Motion as Information

Every animation must convey something:
- A fade-in on content means "new data arrived"
- A slide-down means "this content is revealed below"
- A pulse means "this value is live/active"
- Absence of animation means "this is stable state"

If an animation conveys nothing except visual interest, remove it.

### Principle 2 — Earned Motion

Motion is earned by data significance, not added for polish. A confidence
score display does not animate unless the confidence score actually changed.
A line movement ticker does not pulse unless the line actually moved.

**Test**: Cover the UI with a piece of paper. If the animation would still
"feel right" with no data change — it is not earned. Remove it.

### Principle 3 — Hierarchy via Duration

Longer durations = higher visual hierarchy:
- Page-level transitions: `--duration-slow` to `--duration-cinematic`
- Panel/drawer: `--duration-deliberate`
- Component transitions: `--duration-standard`
- Micro-interactions: `--duration-instant` to `--duration-fast`

Do not use a `--duration-cinematic` animation for a button hover state.
Do not use `--duration-instant` for a page-level reveal.

### Principle 4 — Easing Precision

Entering elements use `--ease-out` — they decelerate into place.
Exiting elements use `--ease-in` — they accelerate out of view.
Data refresh animations use `--ease-data` — they feel mechanical and exact,
not playful.
Brand/hero moments use `--ease-cinematic` — they feel expensive.

### Principle 5 — No Looping in Production Data Context

Continuous looping animations (infinite spin, bounce, pulse) are reserved
for:
- Loading states (skeleton loaders, data fetch indicators)
- Live data indicators (a "live" badge that subtly pulses)

Continuous looping may not be used on:
- Confidence score displays
- Odds or line values
- Any metric that implies realtime accuracy the data may not have

### Principle 6 — Accessibility First

All animations must respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

For components using Framer Motion:

```tsx
const { prefersReducedMotion } = useReducedMotion();

const variants = {
  hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
  visible: { opacity: 1, y: 0 },
};
```

---

## Component Motion Specifications

### Pick Card

**Enter**: Fade up
```
opacity: 0 → 1
translateY: var(--translate-sm) → 0
duration: var(--duration-standard)
easing: var(--ease-out)
```

**Settlement**: Cross-fade to settled state
```
Pick content: opacity: 1 → 0 (duration: fast)
Settlement badge: opacity: 0 → 1 (duration: standard, ease-out)
```

**Hover (interactive)**: Subtle lift
```
translateY: 0 → -2px
duration: var(--duration-instant)
easing: var(--ease-out)
```

**FORBIDDEN on Pick Card**:
- Pulsing confidence score
- Animated odds value change
- Flashing or blinking any value
- Continuous loop animation on any data field

---

### Evidence Drawer

**Open**: Slide up from bottom (mobile) / Slide in from right (desktop)
```
translateY: var(--translate-xl) → 0 (mobile)
translateX: var(--translate-xl) → 0 (desktop)
opacity: 0 → 1
duration: var(--duration-deliberate)
easing: var(--ease-out)
```

**Close**: Reverse of open
```
easing: var(--ease-in)
duration: var(--duration-fast) (exits are faster than entrances)
```

**Evidence item stagger**: Children enter with stagger
```
Stagger delay: 50ms per item
Max stagger: 300ms total (cap after 6 items)
```

---

### Signal Ticker

**Value update**: Number count animation
```
Previous value fades down: opacity 1→0, translateY 0→-4px, duration: fast
New value fades up: opacity 0→1, translateY 4px→0, duration: fast, ease-out
```

**Line movement (up)**: Value turns orbital-cyan briefly
```
Color: current → var(--orbital-cyan) → current
Duration: 800ms total (200ms to cyan, 600ms fade back)
```

**Line movement (down)**: Value turns muted red briefly (not casino green)
```
Color: current → hsl(0, 60%, 55%) → current
Duration: 800ms total
```

**FORBIDDEN on Signal Ticker**:
- Continuous pulsing
- Looping animation when value is stable
- Flash that implies real-time data when data is not real-time

---

### Confidence Score Display

**Appear**: Simple fade only
```
opacity: 0 → 1
duration: var(--duration-standard)
easing: var(--ease-out)
```

**FORBIDDEN on Confidence Score**:
- Any numerical count-up animation
- Any animated bar fill or progress animation
- Any pulse or glow that draws attention to the score as a "live" value
- Any animation that makes the score appear to change over time

**Rationale**: An animated confidence score looks like a slot machine result.
This directly conflicts with the brand's positioning as a calibrated analytics
platform and triggers gambling-association concerns.

---

### Page Transitions

**Route entry**: Fade + subtle upward drift
```
opacity: 0 → 1
translateY: var(--translate-md) → 0
duration: var(--duration-slow)
easing: var(--ease-cinematic)
```

**Preserve scroll position**: Do not animate scroll position — jump instantly.

**Skeleton loading**: Shimmer animation
```
background-position: -200% → 200%
duration: 1500ms
easing: linear
iteration: infinite (while loading only)
```

---

### Galaxy Background / Constellation

**Star field**: Subtle continuous drift
```
Individual stars: translateX/Y ±2px over 8–20s
easing: linear
iteration: infinite
opacity: 0.4–0.8 (not full opacity — reads as background, not foreground)
```

**Constellation lines**: Appear on hover over picks
```
stroke-dashoffset: length → 0
duration: var(--duration-deliberate)
easing: var(--ease-out)
```

**Cursor attractor**: Smooth follow with slight lag
```
transition: transform 150ms var(--ease-out)
Max displacement: 30px from center
```

---

## Forbidden Motion Patterns

| Pattern | Why forbidden |
|---|---|
| Animated confidence score count-up | Slot machine association |
| Pulsing odds or line values | Implies false "live" urgency |
| Casino-style spin or reel | Brand violation |
| Looping motion on stable data | Misleading about data state |
| Flashing or blinking (>3Hz) | Accessibility violation (WCAG 2.3.1) |
| Motion on hover for all interactive elements | Not all hover interaction needs motion |
| Parallax on mobile scroll | Performance and accessibility concerns |
| Continuous float or bob on data values | Entertainment aesthetic; not intelligence |
| Animation that bypasses prefers-reduced-motion | Accessibility violation |
| Duration > 2s for any user-triggered interaction | Feels slow and unresponsive |

---

## Motion Review Checklist

Before any animated component reaches Level 2 in the Component Maturity system:

- [ ] All animation values use design tokens (no magic numbers)
- [ ] `prefers-reduced-motion` respected in all animations
- [ ] Confidence scores are NOT animated (no count-up, no pulse)
- [ ] Continuous animations are only present in loading states
- [ ] Entering elements use `--ease-out`; exiting elements use `--ease-in`
- [ ] Data refresh animations use `--ease-data`
- [ ] No animation on Confidence Score Display (any state change)
- [ ] Pick Card does not pulse, blink, or flash any data value
- [ ] Signal Ticker value change animation is < 1 second total
- [ ] Page-level transitions use `--duration-slow` or `--duration-cinematic`
- [ ] Framer Motion's `useReducedMotion()` hook is used in all animated components

---

## Validation Requirements

A task is NOT complete until:
- All production animated components use motion token CSS variables
- `prefers-reduced-motion` global CSS rule is in the global stylesheet
- No Confidence Score Display has any animation beyond a simple opacity fade
- No data value (odds, confidence, line) has a continuous loop animation
- Motion review checklist passes for all Level 2+ animated components

---

## Approval Gates

| Action | Approving party |
|---|---|
| Adding a new motion token | Operator |
| Adding continuous loop animation to any data-display component | Owner (requires strong justification) |
| Adding animation to Confidence Score Display beyond opacity | FORBIDDEN — no approval path |
| Removing `prefers-reduced-motion` support from any component | FORBIDDEN |
| Adding animation longer than 1s to any user-triggered interaction | Operator |

---

## Codex Audit Requirements

1. Confirm `prefers-reduced-motion` CSS rule exists in the global stylesheet
2. Confirm no Confidence Score Display component has count-up, pulse, or
   bar-fill animation in any state
3. Confirm all Framer Motion animated components import and use `useReducedMotion()`
4. Confirm no motion token values are hardcoded (all reference CSS variables)
5. Confirm no continuous loop animation exists on Pick Card, Signal Ticker
   odds value, or Confidence Score Display outside of loading states
6. Report any blinking animation exceeding 3Hz as P0 (WCAG 2.3.1 violation)
