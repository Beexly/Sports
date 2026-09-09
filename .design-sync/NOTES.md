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

- The compiled CSS carries `body { color: var(--ion) }` from globals.css. The card page only
  overrides the body background to white, so any plain, unclassed text in a preview inherits the pale
  dark-theme foreground and disappears on white. Give preview prose an explicit `color: var(--ink)`
  or put it on a `var(--carbon)` ground.
- Components styled only with `ion-*` / `orbital-*` text utilities and no background of their own
  (ValueGapBadge, BoardHealthBadge, NavMenu, MetricHonesty, RiskDisclosure, StatusTile, ChecklistRow,
  Jarvis*, HonestyNote, FormulaPlaque, OddsFormatToggle, HonestBand, ReliabilityChart,
  CalibrationCurve) need the dark wrapper even though they have no `variant` prop. ResultCard and
  PlayerCard set `bg-obsidian` themselves and are fine on white.
- Full-bleed marketing sections (ToutComparison, PricingPlans) exceed the 900x700 capture frame;
  their previews use a fixed frame with `overflow: hidden` and a scaled inner wrapper. Wide cards use
  `cfg.overrides.<Name>.cardMode = "column"` (NavMenu, PageHero, ToutComparison, PickCard, PricingPlans).
- Components that hardcode `next/image src="/brand/gse-emblem*.png"` (BrandLockup, Footer, ResultCard,
  PlayerCard) get the emblem from the `PUBLIC_ASSETS` map in `.design-sync/shims/next-image.tsx`
  (inlined data URI). Add any new `/public` asset a component hardcodes to that map.
- MobileNav has no controlled-open prop, so only its closed trigger is previewed. Marquee is captured
  mid-scroll by design.

## Fixture policy (AGENTS.md law 8)
- Preview fixtures under `.design-sync/previews/` are layout fixtures for the design tool, exactly
  like test fixtures — every file says so in its header comment. They never state win rates, ROI,
  records or benchmarks, and copy never frames the engine as AI (CLAUDE.md rule 8).

## Known render warns
- `[FONT_MISSING]` for the five fallback families above (see Styling).
- None of the 53 cards is flagged `bad`; the GRID_OVERFLOW warns were resolved with column card mode.

## Re-sync risks
- `.design-sync/.cache/tailwind.css` is regenerated, so the compiled CSS depends on the Tailwind
  version pinned in `apps/web` at sync time.
- The `PublicPick` / `FactorBreakdown` fixture in `previews/PickCard.tsx` tracks `packages/types`;
  a type change there breaks the preview compile (`! preview build failed: PickCard`).
- Playwright: the pre-installed chromium build (`/opt/pw-browsers/chromium-1194`) pins
  `playwright@1.56.0` in `.ds-sync/`; the repo's own playwright pins build 1223 and will not launch.
- `cfg.tokensGlob` alone is a NO-OP: `lib/css.mjs` `copyTokens()` returns early unless
  `cfg.tokensPkg` is also set, and it resolves the glob inside `node_modules/<tokensPkg>`, not
  from a repo path. So `ds-bundle/tokens/` ships EMPTY and `apps/web/styles/design-tokens.css` is
  never copied. This is harmless — globals.css `@import`s the token file, so every custom property
  is compiled into `.design-sync/.cache/tailwind.css` = `_ds_bundle.css`, which `styles.css`
  imports, so rendered designs do get the tokens. Do not "fix" it by inventing a `tokensPkg`;
  do not let `conventions.md` point at `tokens/design-tokens.css` (corrected 2026-09-09 to point
  at `_ds_bundle.css`, which is where the properties actually resolve).
- Playwright on Windows (2026-09-09): the repo's own `playwright` in `Sports/node_modules` launched
  fine against the machine's `ms-playwright` cache (builds 1223/1228/1234) and the render check ran
  53/53 clean. The `/opt/pw-browsers/chromium-1194` + `playwright@1.56.0` pin noted above was
  specific to the earlier Linux session — it is not a cross-machine requirement.

## Wave learnings folded 2026-09-09 (grading re-run, 4 batches)
- **Add `BoardSurfaceChip` to the "needs a `var(--carbon)` wrapper" list above.** It uses the
  low-opacity dark-first pattern (`border-caution/50 bg-caution/10 text-caution`, and the
  orbital-cyan equivalent for `market`), so its `OddsFreshFalse` / `OddsFreshUnknown` cells were
  nearly invisible on the white card body. Rule of thumb: ANY chip/badge built on a
  `*-caution/NN` or `*-orbital-cyan/NN` low-opacity token needs the wrapper, whether or not it
  has a `variant` prop.
- **Fixture numbers must not echo real product metrics (AGENTS.md law 8).** The `CountUp` fixture
  shipped `458` / "Settled picks calibrated" and `64.2%` / "Confidence, ten-bin average". `458`
  is the exact settled-pick sample size in AGENTS.md's live calibration notes and "ten-bin" is the
  real ECE bucketing language, so the card read as a published accuracy benchmark. Replaced with
  neutral counters (a token count, an animation duration) keeping the same prop shapes. When
  authoring a numeric fixture, pick a quantity that CANNOT be mistaken for a performance claim —
  not just an invented one.
- **Capture screenshots animated components mid-tween.** `CountUp`'s captured value never equals
  its authored value (observed `441` vs authored `458`; `1,246` vs `1284`; `3.1s` vs `3.2s`): the
  capture step shoots before the ease-out settles and does not force
  `prefers-reduced-motion: reduce`. Not fixable from a preview file. Consequence for grading: judge
  an animated counter on plausibility and styling, NOT on the exact number matching the source.
- **`EvidenceAuditDrawer` is previewed closed-only, on purpose** — it fetches its content on open,
  so an open-state capture would render an empty/error panel. Its two cells vary by the `label`
  prop. Treat this as the standing convention for any fetch-on-open component: preview the trigger,
  not the open state, and say so in a comment at the top of the preview file.

## State as of 2026-09-09
- Uploaded to claude.ai/design project **Galaxy Sports Edge**
  (`d25d1331-0bb1-4d12-b9ba-ad4f78ab310f`, now pinned as `cfg.projectId`). 292 files, 53 components,
  render check 53/53 clean, all 53 graded good, 0 floor cards, 0 deletes. The project's
  `_ds_sync.json` is the verification anchor — a future re-sync on ANY machine skips unchanged
  components from it, so grades never need re-earning.
- This run executed in the clone at `C:\Users\Garrett\Sports` (branch `claude/tender-faraday-stlhlz`).
  `apps/web/components`, `tailwind.config.ts`, `globals.css` and `styles/design-tokens.css` there are
  byte-identical to `origin/main` (verified with `git diff` against `154b89305`), so the bundle
  reflects main even though `.design-sync/` lives on this branch. Merging `.design-sync/` to main is
  still worth doing so the next sync finds it from a normal checkout.
- Build output is excluded via `.git/info/exclude` (NOT `.gitignore` — AGENTS.md law 2 freezes that
  file): `/ds-bundle/`, `/.ds-sync/`, `/.design-sync/.cache/`, `/.design-sync/learnings/`,
  `/.design-sync/node_modules`. A fresh clone must re-add those.
- Converter deps: this clone already had `esbuild`, `@types/react`, `playwright` and `tailwindcss`
  in `Sports/node_modules`, so `.ds-sync/` only needed `npm i ts-morph` (no install scripts, so the
  repo's `strict-allow-scripts` control was never engaged).

## Design-agent feedback folded 2026-09-09 (post-contract run)
- **`JetBrainsMono-700.woff2` was missing; the fix is to ADD it, not to drop the `@font-face`.**
  The design agent recommended deleting the rule on the grounds that "nothing asks for 700 / 500 is
  the heaviest weight the number treatments use". That is wrong about this repo:
  `design-tokens.css:267-269` sets `--t-num-3xl` / `--t-num-2xl` / `--t-num-xl` to weight **700** on
  `var(--f-numerals)`, and 79 call sites under `apps/web` pair `font-mono`/`font-numerals` with
  `font-bold`. Dropping the rule would degrade the largest numerals to synthetic bold or a fallback.
  The fix was free: every per-weight woff2 in `.design-sync/fonts/` is **byte-identical within its
  family** (JetBrains 400/500/600 share one md5; Inter's four share one; Exo2's five share one) —
  they are variable fonts copied to per-weight filenames. `JetBrainsMono-700.woff2` had simply never
  been copied. Fixed by copying the existing file to that name, matching how Inter-700 and
  Exo2-700/800/900 already work. **When a weight goes missing again, copy — never download, never
  delete the rule.**
- **"183 custom properties under component selectors" is NOT a source problem — do not chase it.**
  Parsing every rule block of `ds-bundle/_ds_bundle.css`: 417 non-`:root` custom properties, of which
  **417 are `--tw-*`** and **0** are hand-authored. They are Tailwind's own internals — the
  `*,:after,:before` and `::backdrop` reset blocks (51 each) plus `--tw-gradient-*` / `--tw-shadow-*`
  on utility classes (`.from-accent-500`, `.shadow-lg`, `.via-caution`). There is nothing upstream in
  `design-tokens.css` to annotate for these; adding `@kind` there would not touch one of them. This is
  token-classifier noise, not repo debt.
- **"79 unclassifiable tokens" is real but has no upstream `:root` fix.** All 170 declarations in
  `apps/web/styles/design-tokens.css` are ALREADY under `:root` (line 6) — the `:root` scoping the
  design agent asked for is done. The unclassifiable ones are the bare-name colors (`--void`,
  `--eclipse`, `--titanium`, `--graphite`, `--mint`, `--premium`, `--magenta`, `--vermilion`, ...)
  that carry no family prefix. Families that DO parse: `--t-*` (27), `--glow-*` (9), `--f-*` (7),
  `--r-*` (5), `--s-*` (4), `--dur-*` (4), `--w-*` (3), `--ease-*` (2). No `@kind` annotation syntax
  exists in this repo or in the skill's staged scripts, so none was invented — see the `tokensGlob`
  NO-OP bullet under Re-sync risks for why the tokens only ever surface inside `_ds_bundle.css`.
- **`--gold` is declared twice with conflicting values** — `design-tokens.css:120` = `var(--ion-blue)`
  (blue) and `:149` = `var(--amber)`. Later wins, so `--gold` is amber; line 120 is dead and
  misleading to anyone reading the palette. Left as-is (no runtime effect); flag it to the contract.

## Re-sync 2026-09-09 (second run, post-contract)
- **`package-validate.mjs` does NOT catch a broken `@font-face` src.** It validates that
  `styles.css` `@import`s resolve and warns `[FONT_MISSING]` for families with no `@font-face` at
  all, but a rule whose `src: url(./X.woff2)` points at a file that isn't in `fonts/` passes clean.
  That is how `JetBrainsMono-700.woff2` shipped broken through a fully green validate. The design
  agent found it, not the validator. **On any run that touches `fonts/`, check by hand that every
  `url(./...)` in `.design-sync/fonts/fonts.css` has a matching file in that directory.**
- **The project contains files this sync does not produce — never delete them.** As of this run
  `list_files` also returns `DESIGN-CONTRACT.md` (authored by the Claude Design agent),
  `uploads/**` (18 files: the redesign inputs, incl. a `redesign-2026-09/` copy), and the
  server-generated `_adherence.oxlintrc.json` + `_ds_manifest.json`. On the anchored atomic path
  this is safe automatically (`deletes` comes verbatim from `upload.deletePaths`, which was `[]`).
  **The danger is a future NO-ANCHOR run** (re-adoption after a lost config), where the skill says
  to review `list_files` and put files "this build doesn't produce" into the plan's `deletes` —
  doing that literally would destroy the design agent's contract and the user's uploaded inputs.
  Exclude `DESIGN-CONTRACT.md`, `uploads/**`, `_adherence.oxlintrc.json` and `_ds_manifest.json`
  from any hand-reviewed delete list.
- Verdict this run: `bundle:false`, `aux:false`, `styling:true` — the ONLY delta was the font file
  landing in the `styles.css` import closure (`styleSha` 4694c72e… → fbc983187…). 53/53 components
  carried forward from the anchor with zero re-grading (`capture: skipped=empty_worklist`), render
  check 53/53, validate clean with the one known `[FONT_MISSING]` warn. 293 files uploaded.
- `conventions.md` validated against the fresh build with **zero drift** — all 49 classes, 9 `var(--*)`
  tokens and 9 component names it names still resolve. Not rewritten (correctly: content belongs to
  its authors).
