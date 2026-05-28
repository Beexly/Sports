# Design QA Rubric — Galaxy Sports Edge

Design enforcement standard. Every surface must pass this rubric before
shipping or expansion.

## Posture

> Breathtaking at the entrance. Calm inside the workflow.

The first impression may be cinematic. Inside the workflow, the design
must become surgical: dense, accurate, fast, low-noise.

## Forbidden patterns

- ❌ Casino green (saturated #00FF00 family)
- ❌ Cheap neon (uncontrolled glows on every element)
- ❌ Fake AI sparkle (bubbles, animated stars on data surfaces)
- ❌ Crypto-dashboard noise (rainbow gradients, gauges, plasma)
- ❌ Generic SaaS cards (rounded-2xl drop shadow on everything)
- ❌ Unsupported confidence visuals (full meter at 100% without source)
- ❌ Win-rate bars as hero content
- ❌ Tout banners (giant "PICK OF THE DAY" treatments)
- ❌ Gradient text overuse (one per page maximum)
- ❌ Plasma glow on every interactive element
- ❌ Animated backgrounds on telemetry surfaces (data must not move)
- ❌ Auto-playing video or audio
- ❌ Carousel pickers for navigation-critical content

## Required patterns

- ✅ One arch headline per page maximum
- ✅ Numerals in a numeric font (tabular figures for data)
- ✅ Data cards follow Evidence Chain anatomy
- ✅ Charts show numbers first, visualization second
- ✅ No pie charts (use bar / table / list)
- ✅ Lime reserved for **live freshness ping only**
- ✅ Every data card has source + freshness
- ✅ Focus-visible rings on every interactive element
- ✅ `prefers-reduced-motion` respected
- ✅ Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- ✅ Tap targets ≥ 44×44px on mobile
- ✅ Sticky CTAs only where they serve user task, not marketing

## Color tokens (do not invent)

- `bg-carbon` — page background
- `border-mineral` — divider and card border
- `text-ion-blue` — accent, eyebrow, hover
- `text-white` / `text-gray-100..600` — text scale
- `text-green-400` / `text-amber-400` / `text-red-400` — semantic state
- `text-violet-400` / `text-cyan-400` / `text-rose-400` — categorical accent

If you reach for a color outside this set, stop and ask why.

## Type scale

- Display: `text-6xl font-black tracking-tight`
- H1: `text-4xl..5xl font-black tracking-tight`
- H2: `text-2xl..3xl font-black`
- Section eyebrow: `font-mono text-xs uppercase tracking-[0.22em] text-ion-blue`
- Body: `text-sm..base leading-7 text-gray-400`
- Caption: `font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600`

## Spacing rhythm

- Section vertical: `py-16` (compact), `py-20` (standard), `py-24..28`
  (hero)
- Card padding: `p-5` (compact), `p-6` (standard), `p-8` (hero)
- Grid gaps: `gap-3` (dense), `gap-4` (standard), `gap-5..6` (premium)
- Page max-width: `max-w-7xl` for grids, `max-w-4xl..5xl` for editorial

## Card density

- Compact: 3-column grid, dense info, no decoration
- Standard: 2-column grid, evidence row + body + footer
- Hero: full-bleed gradient card, one per page max

## Badge consistency

Badges encode tier, state, or grade. They must be readable in isolation:

- Tier: FREE / PRO / ELITE (corner pill, border + bg + text)
- State: live / preview / beta / waitlist (`<StateBadge />`)
- Grade: A / B / C / D / + / 0 / − (square monospace)
- Result: WIN / LOSS / PUSH (color-coded text)

Never invent a new badge style. Extend the existing set.

## Empty / loading / error states

- Empty: explain what would appear, with `Bootstrap mode` framing if
  stub-mode active
- Loading: skeleton card matching final layout; never a spinner alone
- Error: human-readable message; never a raw stack; offer next action

## Mobile

- 375px is the design width baseline
- Hamburger nav for routes not in primary 5
- Sticky elements only where they serve task (not promotions)
- Horizontal scroll prohibited
- Bottom safe-area padding on iOS

## Accessibility — required

- Every form input has a label
- Every image has alt text
- Every interactive element is keyboard-reachable
- Modal/drawer traps focus and returns on close
- Color is never the only carrier of meaning

## Scoring

A surface fails the rubric if it has any forbidden pattern present, any
required pattern missing on a data surface, or any accessibility violation
at A or AA level.

## Review

- Per-surface on creation
- Audit pass quarterly
- Pre-launch full audit
