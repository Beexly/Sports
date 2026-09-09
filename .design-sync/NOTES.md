# design-sync notes — beexly/sports (Galaxy Sports Edge)

Repo-specific gotchas for re-syncs. One bullet per item.

## Shape and entry
- No Storybook anywhere in the repo (confirmed with the user 2026-09-09). Shape is `package`.
- `apps/web` is a Next.js app, not a library: there is no `dist/`. The converter bundles the
  hand-curated entry `.design-sync/entry.tsx` (`cfg.entry`), which re-exports only presentational,
  client-safe components. Every export is pinned in `cfg.componentSrcMap`; adding a component means
  adding BOTH an export line in `entry.tsx` and a pin (`"Name": "apps/web/components/<path>.tsx"`).
- `cfg.pkg` is the root package name (`sports-prediction-platform`) because the entry lives under
  `.design-sync/` and the converter walks up to the root `package.json`. Previews therefore import
  from `"sports-prediction-platform"`. `cfg.srcDir` is `apps/web/components` relative to the root.
- Next.js-only imports (`next/link`, `next/image`, `next/navigation`, `next/dynamic`) resolve to
  `.design-sync/shims/*` through `.design-sync/tsconfig.json` `paths`; `@/*` maps to `apps/web/*`.
  Components that read `process.env` (gates, pricing phase) get an empty env from
  `.design-sync/shims/process-env.ts` (imported first in the entry) so every gate resolves to its
  fail-closed default — nothing is flipped.
- Excluded on purpose: anything importing `@/lib/auth`, `@sports/db`, `next/headers`, `next-auth`,
  `@sports/data-ingestion`/`@sports/prediction-engine` (server or heavy), 3D/shader heroes, fantasy
  suite, cockpit panels that fetch, `Attribution`, `NavAuth`, `BillingNoticeBanner`, `CommandPalette`.

## Styling
- Tailwind is compiled once per sync with `cfg.buildCmd` (Tailwind CLI, `apps/web/app/globals.css`,
  which `@import`s `styles/design-tokens.css` and `styles/pickpilot-kit.css`) into
  `.design-sync/.cache/tailwind.css` = `cfg.cssEntry`. Re-run `buildCmd` before the converter
  whenever component classes change; the compiled file is gitignored (`.git/info/exclude`).
- Tailwind only emits classes used under `apps/web/{app,components,lib}` — a preview's own layout
  glue must use inline styles, not utility classes the app never uses.
- Cards render on a white body. Most components have `variant="paper"` (default) and `variant="dark"`;
  dark-first components (PickCard, MethodologySection, ToolPageSkeleton, world sections) need a
  `background: var(--carbon)` wrapper in their preview or they float on white.
- Fonts: the app loads Exo 2 / Inter / JetBrains Mono / Instrument Serif via `next/font`. For the
  bundle they ship as latin-subset woff2 fetched from Google Fonts into `.design-sync/fonts/`
  (`cfg.extraFonts`). `[FONT_MISSING]` for Geist, Geist Mono, Rajdhani, Space Grotesk, Iowan Old Style
  is expected: those are fallback names inside the token font stacks and the app itself never
  ships them (`--f-body` resolves to Inter in production too).

## Fixture policy (AGENTS.md law 8)
- Preview fixtures under `.design-sync/previews/` are layout fixtures for the design tool, exactly
  like test fixtures — every file says so in its header comment. They never state win rates, ROI,
  records or benchmarks, and copy never frames the engine as AI (CLAUDE.md rule 8).

## Known render warns
- `[FONT_MISSING]` for the five fallback families above (see Styling).

## Re-sync risks
- `.design-sync/.cache/tailwind.css` is regenerated, so the compiled CSS depends on the Tailwind
  version pinned in `apps/web` at sync time.
- The `PublicPick` / `FactorBreakdown` fixture in `previews/PickCard.tsx` tracks `packages/types`;
  a type change there breaks the preview compile (`! preview build failed: PickCard`).
- Playwright: the pre-installed chromium build (`/opt/pw-browsers/chromium-1194`) pins
  `playwright@1.56.0` in `.ds-sync/`; the repo's own playwright pins build 1223 and will not launch.
