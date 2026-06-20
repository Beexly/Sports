# Galaxy Sports Edge — Logo Guidelines

> The mark must be **noticed, seen, heard, and felt**. It is a signal lock: an orbit (the market in motion), an edge vector (our read crossing it), and a signal core/ping (the moment of detection). This document governs every use.

## The mark

- **Concept:** broken orbital arc + crossed edge vectors + signal core, with a ping. The orbit is intentionally **open at the top** so it never reads as a circular letter (O/Q) or a coin.
- **Canonical sources:**
  - `apps/web/components/brand/brand-lockup.tsx` — `GalaxyMark` (the header/footer lockup, full color).
  - `apps/web/components/brand/logo-mark-inline.tsx` — `LogoMarkInline` (loading states, splashes, badges; gradient `#00E5FF → #7A5CFF → #FF2DD6`).
  - `apps/web/public/favicon.svg` — favicon, simplified to read at 16px.
  - `apps/web/public/logo-mark.svg` — icon used for `apple-touch` and `sizes:any`.

## Variants

| Variant | When | Source |
|---|---|---|
| Full lockup (mark + "Galaxy / Sports Edge") | Desktop header, footer, marketing | `BrandLockup` |
| Compact (mark + `GSE`) | Tight bars, mobile | `BrandLockup compact` |
| Mark only | Avatars, badges, loading | `LogoMarkInline` |
| Favicon | Browser tab (16/32px) | `public/favicon.svg` |
| App icon | Home-screen / apple-touch | `public/logo-mark.svg` |

## Color

- Palette is owned by `BRAND_COLORS` (`apps/web/lib/brand.ts`): orbit in `ionWhite`/`softUltraviolet`, vectors in `ionMagenta` (`--plasma`) + `orbitalCyan`, core `ionMagenta`, ping `orbitalCyan`, on `obsidianBlack`.
- On light surfaces: use the monochrome `ionWhite`→ink inversion; never place the cyan/magenta glow on white.
- Glow is a **drop-shadow**, not a fill. Never flatten the mark into solid neon on black (the "cheap" failure mode).

## Clear space & minimum size

- **Clear space:** at least the height of the signal core on all sides.
- **Minimum size:** mark 24px; favicon never below 16px; never set the full lockup below 28px mark height (use compact instead).

## Motion — the kinetic signature

A **sub-1s** one-shot "draw-on + lock": orbit sweeps in → edge vectors lock across it → signal core + ping pop → wordmark resolves → glow decays to rest. Recognizable from the motion alone, before the full mark lands.

- Implemented in CSS (`styles/pickpilot-kit.css`): keyframes `gse-mark-draw`, `gse-mark-pop`, `gse-mark-glow`, `gse-word-resolve`.
- Header/footer: `BrandLockup` applies `brand-lockup-kinetic` by default (`kinetic={false}` to opt out). It lives in the persistent layout, so it fires as an **arrival sting** on full load, not on in-app navigation.
- Inline: `<LogoMarkInline kinetic />` opts a mark into the same draw-on for splash/loading surfaces.
- **Reduced motion:** under `prefers-reduced-motion: reduce` all kinetic animation is disabled and the mark snaps to its fully-resolved resting state. This is mandatory.
- Total sequence budget: ≤ 0.95s. Do not loop the signature; do not chain it with other entrance motion on the same screen.

## Sound (optional, gated)

- A logo sting may accompany the lock **only on explicit user gesture** (e.g. a click), **never autoplay**. Sub-1s, low, premium — a confirm tone, not a hype impact.
- No audio element in the lockup may carry `autoPlay`. Sound is opt-in and off by default.

## Do / Don't

**Do:** keep the orbit open at top · use glow as shadow · animate once and settle · respect reduced motion · use the favicon variant below 32px.

**Don't:** fill the mark as flat neon · close the orbit into a ring · stretch/skew · recolor outside `BRAND_COLORS` · loop the kinetic signature · autoplay sound · drop the lockup below its minimum (switch to compact/mark-only instead).
