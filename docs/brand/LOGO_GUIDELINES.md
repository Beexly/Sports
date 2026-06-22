# Galaxy — Logo Guidelines (2026 brand-family mark)

> The mark must be **noticed, seen, heard, and felt**. It is a signal lock: a split orbital ring (the market in motion), an edge blade slicing through it (our read cutting the market), a signal core at the crossing, and a ping (the moment of detection). It is the **shared symbol** of Galaxy Sports Edge (the product/site) and Galaxy Sports Network (the company/network). This document governs every use.

## The mark (2026)

- **Concept:** a bold **split orbital ring** (open via two dash gaps so it never reads as a coin or an "O"), a sharp **edge blade** slicing diagonally through it, a **signal core** (plasma) at the crossing, and a **ping** (ultraviolet). Cyan ring + ion-white blade + plasma core + ultraviolet ping.
- **Canonical sources:**
  - `apps/web/components/brand/brand-lockup.tsx` — `GalaxyMark` (the header/footer lockup, full color).
  - `apps/web/components/brand/logo-mark-inline.tsx` — `LogoMarkInline` (loading states, splashes, badges; full brand color, or a monochrome `color` override).
  - `apps/web/components/brand/gsn-lockup.tsx` — `GsnLockup` (the Galaxy Sports Network identity: shared mark + Network wordmark; `bug` = the on-air corner mark).
  - `apps/web/public/favicon.svg` — favicon, simplified to read at 16px.
  - `apps/web/public/logo-mark.svg` — icon used for `apple-touch` and `sizes:any`.

## Brand family

- **Galaxy Sports Edge (GSE)** — the product/site. Lockup = mark + "Galaxy / Sports Edge". This is the live consumer brand.
- **Galaxy Sports Network (GSN)** — the company/network (the LLC). Lockup = mark + "Galaxy / Sports Network" (`GsnLockup`). Used on the broadcast (The Beat), the Studio, the Academy, and as the parent-company attribution. Same mark, different wordmark.

## Variants

| Variant | When | Source |
|---|---|---|
| GSE full lockup (mark + "Galaxy / Sports Edge") | Desktop header, footer, marketing | `BrandLockup` |
| GSE compact (mark + `GSE`) | Tight bars, mobile | `BrandLockup compact` |
| GSN lockup (mark + "Galaxy / Sports Network") | Broadcast, Studio, network surfaces | `GsnLockup` |
| GSN on-air bug (mark + `GSN`) | Broadcast on-air bar | `GsnLockup variant="bug"` |
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
