# Design tokens and contrast: current state and a proposed semantic set

Input for the redesign brief's deliverable "Design tokens (light and dark) as CSS
variables with contrast ratios" (brief section 9; visual identity is section 5,
accessibility is section 7).

Every ratio in this document was produced by running:

```
node docs/design/redesign-2026-09/contrast-check.mjs current    # today's app
node docs/design/redesign-2026-09/contrast-check.mjs proposed   # the new token set
node docs/design/redesign-2026-09/contrast-check.mjs all        # both, plus an informational section
```

The script (`contrast-check.mjs`, committed in this folder) implements the WCAG
relative luminance and contrast ratio formulas directly, with no dependency. Do not
hand-type a ratio into this document; run the script and copy its output. Its exit
code is 1 if any AA-gated pair fails (checked with `current` and `proposed`
separately: `current` exits 1 today because of one real failure below; `proposed`
exits 0).

**Headline result: 1 of 72 current pairs fails AA. All 54 proposed pairs pass.**

## 1. Current inventory

### 1.1 Which file is actually live

`apps/web/app/globals.css` line 9 does `@import "../styles/design-tokens.css";`
before anything else, and that is the only design-token file `apps/web` imports.
Everything in this document about "current" colors is measured from
`apps/web/styles/design-tokens.css` and `apps/web/tailwind.config.ts`, because
those are the two files the running app actually resolves `var(--x)` and
`bg-x`/`text-x` classes against.

Two other files carry a similar-looking palette but are **not** what the app
renders, and their numbers should not be trusted as a description of production:

- `design-system/colors_and_type.css` is headed "v3 Cinematic Intelligence" and
  ships different hex values for the same names (for example `--carbon: #0B0F18`
  vs. the live `#0D1117`, `--plasma: #FF2D8A` vs. the live `#FF38C7`,
  `--ultraviolet: #9B7BFA` vs. the live `#7B61FF`). It is only referenced from
  `design-system/ui_kits/web/*.css` and `design-system/preview/_board.css`, a
  separate prototype kit, never from `apps/web`.
- `DESIGN.md`'s YAML front matter says "Authoritative source:
  apps/web/styles/design-tokens.css... Do NOT modify here without syncing
  design-tokens.css," but it has drifted from that source anyway: `titanium:
  "#1A1D23"` vs. the live `#211A33`, `ion_white: "#F6F7FA"` vs. the live
  `#F5F7FF`, `plasma: "#FF2DD6"` vs. the live `#FF38C7`. Treat `DESIGN.md`'s
  colors section as stale; it needs a re-sync pass separate from this redesign.

There is also a smaller drift **inside** the two live files: `tailwind.config.ts`
sets `obsidian: "#080A0F"` while `design-tokens.css` sets `--obsidian: #05070B`
(`--void` and `--obsidian` are meant to be aliases of the same color). And
`design-tokens.css`'s own comment for `--ion-2` says it was "re-valued... to
#9AA6B8" but the line under the comment actually sets `#B1BAD5`; the value that
ships is `#B1BAD5`, which is what this document measures, but the comment is
wrong and should be fixed or removed when someone next touches that file.

No `[data-theme]` attribute or theme toggle exists anywhere in `apps/web` today
(`grep -rn "data-theme"` returns nothing). "Dark" (the `carbon`/`eclipse`/
`titanium` scale) and "paper" (the `paper`/`paper-raised`/`paper-sunken` scale)
are two hardcoded **surface systems** used in different places, not a switchable
theme: marketing and cosmic pages render one, data-dense boards and tools render
the other, chosen per component via a `variant` prop, never by user preference or
`prefers-color-scheme`. The brief asks for "light and dark, both first class" as
an actual theme; building that toggle is separate implementation work, not just
a token rename, and `tokens-proposal.css` below is written the way an eventual
toggle would consume it (`:root` + `[data-theme="dark"]` + a
`prefers-color-scheme` fallback), so today's two-surfaces-by-variant pattern and
tomorrow's real toggle both work with the same variables once the code migrates.

### 1.2 Color custom properties in `apps/web/styles/design-tokens.css`

Grouped as the file groups them. "Canonical" values are the ones actually set;
several names are aliases (`var(--other-name)`) rather than their own hex, noted
as such.

| Token | Hex (or alias) | Role |
|---|---|---|
| `--void` | `#05070B` | deepest environment layer |
| `--obsidian` | `#05070B` | default canvas (alias of void in this file) |
| `--carbon` | `#0D1117` | page background |
| `--eclipse` | `#171228` | raised surface |
| `--titanium` | `#211A33` | elevated surface |
| `--slate` | `#20283A` | hover state |
| `--mineral` | `#3B3158` | default border |
| `--mineral-hi` | `#4D4175` | border hover / strong divider |
| `--carbon-1`, `--steel`, `--steel-1`, `--graphite` | alias of obsidian/eclipse/titanium/slate | legacy names, older boards |
| `--ion-white` | `#F5F7FF` | highest-emphasis dark-scale text |
| `--ion` | `#D5DDE9` | primary dark-scale body text |
| `--ion-1` | `#AEB7D2` | secondary dark-scale text |
| `--ion-2` | `#B1BAD5` | tertiary dark-scale text (comment says `#9AA6B8`; shipped value is `#B1BAD5`) |
| `--ion-3` | `#8B97AB` | muted dark-scale text |
| `--paper` | `#F7F8FB` | light-scale page background |
| `--paper-raised` | `#FFFFFF` | light-scale card/row background |
| `--paper-sunken` | `#F0F2F6` | light-scale zebra/well background |
| `--paper-border` | `#D9DEE7` | light-scale hairline (border, not text) |
| `--ink` | `#0E1320` | primary light-scale body text |
| `--ink-1` | `#3A4356` | secondary light-scale text |
| `--ink-2` | `#5B6678` | muted light-scale meta text |
| `--plasma-on-light` | `#B0118C` | plasma darkened for AA text on paper |
| `--orbital-cyan-on-light` | `#06748A` | orbital cyan darkened for AA text on paper |
| `--ultraviolet-on-light` | `#5B43C9` | ultraviolet darkened for AA text on paper |
| `--verify-on-light` | `#0B6B46` | verify darkened for AA text on paper |
| `--alert-on-light` | `#C0122F` | alert darkened for AA text on paper |
| `--caution-on-light` | `#9A4D00` | caution darkened for AA text on paper |
| `--plasma` / `-glow` / `-deep` / `-ink` | `#FF38C7` / `#FF66E0` / `#C81EAA` / `#1A0014` | primary brand signal (magenta) |
| `--ion-blue` / `-glow` / `-deep` / `-ink` | `#00E5FF` / `#5BEEFF` / `#00A8BF` / `#001226` | secondary signal; same hex as orbital-cyan |
| `--orbital-cyan` / `-glow` / `-deep` | `#00E5FF` / `#5BEEFF` / `#00A8BF` | "signature accent"; identical hex to ion-blue |
| `--nebula-purple` / `-glow` / `-deep` | `#A855F7` / `#C084FC` / `#7E3FC2` | decorative gradient anchor, rare |
| `--electric-blue` / `-glow` / `-deep` | `#2A6BFF` / `#5B8DFF` / `#1A4ACC` | supporting cool, rare |
| `--ultraviolet` / `-glow` / `-deep` | `#7B61FF` / `#9F87FF` / `#5942CC` | depth / model layer signal |
| `--lime` / `-glow` / `-deep` / `-ink` | `#D4FF3D` / `#E8FF6B` / `#A8CC22` / `#1A2400` | live-tick accent only |
| `--cyan` / `-glow` / `-deep` / `-ink` | `#6FD9FF` / `#A8E8FF` / `#2A8FAF` / `#001824` | small telemetry accent only |
| `--amber`, `--gold`, `--cobalt*` | alias of `--ion-blue*` | deprecated; auto-redirect to cyan |
| `--signal` / `-glow` / `-deep` / `-ink` | alias of `--plasma*` | "most surfaces use --signal" |
| `--verify` / `-deep` | `#5FD9A3` / `#2D9870` | positive confirmation (mint) |
| `--alert` / `-deep` | `#FF6470` / `#B53C45` | critical warning (vermilion) |
| `--caution` / `-deep` | `#FFB454` / `#B5781F` | incomplete data / review needed |
| `--mint`, `--vermilion`, `--magenta`, `--slate-blue` | alias of verify/alert/plasma/ion-1 | deprecated names |
| `--conf-elite/strong/solid/lean` | plasma / ion-blue / ultraviolet / ion-1 | confidence ladder |
| `--risk-low/moderate/high` | verify / ultraviolet / alert | risk ladder |
| `--bg`, `--bg-raised`, `--bg-elevated`, `--bg-hover` | carbon / eclipse / titanium / slate | semantic surface aliases |
| `--fg`, `--fg-1`, `--fg-meta`, `--fg-muted`, `--fg-disabled` | ion-white / ion / ion-1 / ion-1 / ion-2 | semantic text aliases |
| `--border`, `--border-strong` | mineral / mineral-hi | semantic border aliases |
| `--accent`, `--accent-2`, `--accent-3`, `--premium` | plasma / ion-blue / ultraviolet / ultraviolet | semantic accent aliases |

Non-color tokens in the same file:

- **Spacing**: `--s-1` (4px) through `--s-40` (160px), a standard 4px-based scale.
- **Radii**: `--r-xs` 3px, `--r-sm` 6px, `--r-md` 10px, `--r-lg` 14px, `--r-pill` 999px.
- **Widths**: `--w-content` 1200px, `--w-wide` 1440px, `--w-prose` 720px.
- **Motion**: `--ease-out`, `--ease-in-out` cubic-beziers; `--dur-fast` 150ms,
  `--dur-base` 280ms, `--dur-slow` 520ms, `--dur-cinematic` 880ms.
- **Shadows / glows**: `--glow-plasma`, `--glow-ion-blue`, `--glow-uv`,
  `--glow-lime`, `--glow-cyan`, `--glow-soft` (all colored, atmospheric blurs),
  plus neutral `--shadow-modal` and `--shadow-float`.
- **Type families**: `--f-display` "Exo 2, Rajdhani, Space Grotesk, system-ui,
  sans-serif" (alias `--f-arch`); `--f-body` "Geist, Inter, system-ui,
  -apple-system, sans-serif"; `--f-numerals` "JetBrains Mono, Geist Mono,
  ui-monospace, monospace" (alias `--f-mono`); `--f-editorial` "Instrument
  Serif, Iowan Old Style, Georgia, serif." (Section 3 below reconciles this with
  what `app/layout.tsx` actually loads through `next/font`.)
- **Type roles**: `--t-arch-*` (220px down to 36px, weight 800-900, for hero
  slams), `--t-display-*` (96px down to 24px), `--t-body-lg/body/body-sm/body-xs`
  (17 / 15 / 13 / 12px, all at line-height 1.4-1.55), `--t-eyebrow*` (12-13px
  mono, uppercase), `--t-num-*` (96px down to 11px, tabular numerals), `--t-edit-*`
  (56/32/20px italic serif).

### 1.3 Named colors in `apps/web/tailwind.config.ts`

Canonical Brand Bible names plus the environment/ion/paper/signal scales (hex
matches `design-tokens.css` except `obsidian`, noted above), then the legacy
alias ramps kept so old class names keep working:

| Tailwind name | Hex | Note |
|---|---|---|
| `obsidian-black`, `void` | `#05070B` | |
| `ion-white-2`, `ion-white` | `#F5F7FF` | `ion-white-2` exists "distinct from the .ion-white alias" |
| `orbital-cyan`, `ion-magenta`, `soft-ultraviolet`, `electric-blue`, `nebula-purple` | `#00E5FF` / `#FF38C7` / `#7B61FF` / `#2A6BFF` / `#A855F7` | Brand Bible canonical names |
| `cosmic-gray`, `carbon` | `#0D1117` | |
| `steel-gray`, `titanium` | `#211A33` | |
| `obsidian` | `#080A0F` | **drifts from `--obsidian: #05070B` in design-tokens.css** |
| `eclipse` | `#171228` | |
| `slate` | `#20283A` | |
| `mineral`, `mineral-hi` | `#3B3158` / `#4D4175` | |
| `ion.DEFAULT/1/2/3` | `#D5DDE9` / `#AEB7D2` / `#B1BAD5` / `#9AA3C0` | `ion.3` here (`#9AA3C0`) differs from `--ion-3` in design-tokens.css (`#8B97AB`) |
| `paper.DEFAULT/raised/sunken/border` | `#F7F8FB` / `#FFFFFF` / `#F0F2F6` / `#D9DEE7` | matches design-tokens.css |
| `plasma-on-light`, `orbital-cyan-on-light`, `ultraviolet-on-light` | `#B0118C` / `#06748A` / `#5B43C9` | matches |
| `verify-on-light`, `alert-on-light`, `caution-on-light` | `#0B6B46` / `#C0122F` / `#9A4D00` | matches |
| `plasma.DEFAULT/glow/deep/ink` | `#FF38C7` / `#FF66E0` / `#C81EAA` / `#1A0014` | matches |
| `ion-blue.DEFAULT/glow/deep/ink` | `#00E5FF` / `#5BEEFF` / `#00A8BF` / `#001226` | matches |
| `ultraviolet.DEFAULT/glow/deep` | `#7B61FF` / `#9F87FF` / `#5942CC` | matches |
| `ds-cyan.DEFAULT/glow/deep` | `#00E5FF` / `#5BEEFF` / `#00A8BF` | separate name, same hex as ion-blue |
| `lime.DEFAULT/glow/deep` | `#D4FF3D` / `#E8FF6B` / `#A8CC22` | matches |
| `verify`, `alert` | `#5FD9A3` / `#FF6470` | matches |
| `caution.DEFAULT/deep` | `#FFB454` / `#B5781F` | matches |
| `brand.50-950` | `#FFE3F6` ... `#1A0014` | legacy magenta ramp |
| `accent.50-950` | `#E6F8FF` ... `#001226` | legacy cyan ramp |
| `ink.DEFAULT/1/2` | `#0E1320` / `#3A4356` / `#5B6678` | light-scale (paper) inks, matches design-tokens.css |
| `ink.50-1000` | `#F5F7FF` ... `#05070B` | separate legacy DARK ramp, same numeric-key object as the light `ink.DEFAULT/1/2` above -- two different scales share one Tailwind color name |
| `confidence.high/mid/low` | `#FF38C7` / `#7B61FF` / `#AEB7D2` | legacy 3-tier alias, repointed to canonical hexes |
| `risk.low/mid/high` | `#5FD9A3` / `#7B61FF` / `#FF6470` | |

Also not overridden, so still resolving to Tailwind's stock v3 palette: any
`emerald-*` or `rose-*` utility (used by `lib/intelligence/colors.ts`, see
section 2). `emerald-700 = #047857`, `rose-700 = #BE123C`.

Non-color tokens: `spacing.ds-1` (4px) through `ds-30` (120px) mirroring the CSS
`--s-*` scale; `borderRadius.ds-xs/sm/md/lg` (3/6/10/14px); `fontSize.arch-*`
and `display-*` (the latter as `clamp()` fluid sizes, 48px-96px); `boxShadow`
glow/glass/pop/modal/float utilities mirroring the CSS `--glow-*` /
`--shadow-*` tokens; `animation`/`keyframes` for live-pulse, fade-up, shimmer,
marquee, ambient-drift, signature-spin, cursor-blink.

### 1.4 Fonts actually loaded (`apps/web/app/layout.tsx`)

Four Google fonts load through `next/font/google`, bound to the CSS variables
above:

- `Exo_2` -> `--f-display` (weights 500-900; also serves `--f-arch` via an
  alias in `design-tokens.css`, so it is fetched once)
- `Inter` -> `--f-body` (the doctrine stack names "Geist" first, but Next's
  font manifest does not expose Geist, so Inter is what actually renders)
- `JetBrains_Mono` -> `--f-numerals` (also serves `--f-mono` via alias)
- `Instrument_Serif` -> `--f-editorial` (weight 400 only, normal and italic)

So the four families the brief needs to reconcile against are **Exo 2, Inter,
JetBrains Mono, Instrument Serif** -- see section 4.

## 2. Measured current pairs

Every row below is grepped from a real component, not invented. Citations:

- `KpiCard` -- `apps/web/components/ui/kpi-card.tsx` lines 23-39 (`VARIANTS`)
- `PageHero` -- `apps/web/components/ui/page-hero.tsx` lines 27-43 (`VARIANTS`)
- `MetricExplainer` -- `apps/web/components/ui/metric-explainer.tsx` lines 36-56 (`VARIANTS`)
- `DataTable` -- `apps/web/components/ui/data-table.tsx` lines 108-169 (`SURFACE`)
- `lib/intelligence/colors.ts` lines 19-36 (`toneClass` / `toneClass(..., "dark")`)
- `PickCard` -- `apps/web/components/picks/pick-card.tsx` lines 30-43
  (`PICK_GRADE_STYLES`, `RISK_LEVEL_STYLES`), 471-641 (badge components), plus
  inline classNames in the card body (lines 100-114, 192-235, 254, 340-357)
- body defaults -- `apps/web/app/globals.css` lines 25-37 and
  `apps/web/styles/design-tokens.css` lines 285-294
- `text-ultraviolet` (base, not `-glow`) as small text --
  `apps/web/components/ui/methodology-section.tsx` lines 94, 123 (on
  `bg-carbon`, line 126/151) and `apps/web/components/fantasy/bestball-board.tsx`
  line 238 (18px regular, inside `.surface-card`, defined in
  `apps/web/app/globals.css` lines 102-106 as eclipse at 80% opacity)

Command run: `node docs/design/redesign-2026-09/contrast-check.mjs current`

| Pair | fg | bg | kind | ratio | AA |
|---|---|---|---|---|---|
| body: ion on carbon | #D5DDE9 | #0D1117 | text | 13.83:1 | PASS |
| body: ion-white heading on carbon | #F5F7FF | #0D1117 | text | 17.69:1 | PASS |
| eyebrow/.crumb: fg-meta (ion-1) on carbon | #AEB7D2 | #0D1117 | text | 9.47:1 | PASS |
| PageHero dark: eyebrow text-orbital-cyan on carbon | #00E5FF | #0D1117 | text | 12.30:1 | PASS |
| PageHero dark: title text-ion-white on carbon | #F5F7FF | #0D1117 | text | 17.69:1 | PASS |
| PageHero dark: desc text-ion-1 on carbon | #AEB7D2 | #0D1117 | text | 9.47:1 | PASS |
| PageHero paper: eyebrow text-orbital-cyan-on-light on paper | #06748A | #F7F8FB | text | 5.11:1 | PASS |
| PageHero paper: title text-ink on paper | #0E1320 | #F7F8FB | text | 17.46:1 | PASS |
| PageHero paper: desc text-ink-1 on paper | #3A4356 | #F7F8FB | text | 9.34:1 | PASS |
| KpiCard dark: label text-ion-1 on bg-eclipse | #AEB7D2 | #171228 | text | 9.11:1 | PASS |
| KpiCard dark: value text-ion-white on bg-eclipse | #F5F7FF | #171228 | text | 17.02:1 | PASS |
| KpiCard dark: sub text-ion-1 on bg-eclipse | #AEB7D2 | #171228 | text | 9.11:1 | PASS |
| KpiCard paper: label text-ink-2 on bg-paper-raised | #5B6678 | #FFFFFF | text | 5.81:1 | PASS |
| KpiCard paper: value text-ink on bg-paper-raised | #0E1320 | #FFFFFF | text | 18.54:1 | PASS |
| KpiCard paper: sub text-ink-2 on bg-paper-raised | #5B6678 | #FFFFFF | text | 5.81:1 | PASS |
| MetricExplainer dark: title text-orbital-cyan on bg-eclipse | #00E5FF | #171228 | text | 11.83:1 | PASS |
| MetricExplainer dark: term text-ion-white on bg-eclipse | #F5F7FF | #171228 | text | 17.02:1 | PASS |
| MetricExplainer dark: def text-ion-1 on bg-eclipse | #AEB7D2 | #171228 | text | 9.11:1 | PASS |
| MetricExplainer paper: title text-orbital-cyan-on-light on bg-paper-raised | #06748A | #FFFFFF | text | 5.42:1 | PASS |
| MetricExplainer paper: term text-ink on bg-paper-raised | #0E1320 | #FFFFFF | text | 18.54:1 | PASS |
| MetricExplainer paper: def text-ink-1 on bg-paper-raised | #3A4356 | #FFFFFF | text | 9.92:1 | PASS |
| DataTable dark: headText text-ion-2 on bg-carbon | #B1BAD5 | #0D1117 | text | 9.78:1 | PASS |
| DataTable dark: headStrong text-ion-1 on bg-carbon | #AEB7D2 | #0D1117 | text | 9.47:1 | PASS |
| DataTable dark: cell text on bg-eclipse (raised row) | #F5F7FF | #171228 | text | 17.02:1 | PASS |
| DataTable dark: muted text-ion-2 on bg-eclipse | #B1BAD5 | #171228 | text | 9.41:1 | PASS |
| DataTable dark: active/sorted text-orbital-cyan on bg-eclipse | #00E5FF | #171228 | text | 11.83:1 | PASS |
| DataTable dark: input placeholder text-ion-2 on bg-eclipse | #B1BAD5 | #171228 | text | 9.41:1 | PASS |
| DataTable dark: cell text on zebra bg-carbon/40-over-eclipse | #F5F7FF | #131221 | text | 17.28:1 | PASS |
| DataTable paper: headText text-ink-2 on bg-paper-sunken | #5B6678 | #F0F2F6 | text | 5.18:1 | PASS |
| DataTable paper: headStrong text-ink-1 on bg-paper-sunken | #3A4356 | #F0F2F6 | text | 8.85:1 | PASS |
| DataTable paper: cell text on bg-paper-raised (raised row) | #0E1320 | #FFFFFF | text | 18.54:1 | PASS |
| DataTable paper: muted text-ink-2 on bg-paper-raised | #5B6678 | #FFFFFF | text | 5.81:1 | PASS |
| DataTable paper: active/sorted text-orbital-cyan-on-light on bg-paper-raised | #06748A | #FFFFFF | text | 5.42:1 | PASS |
| DataTable paper: cell text on zebra bg-paper-sunken/60-over-paper-raised | #0E1320 | #F6F7FA | text | 17.31:1 | PASS |
| toneClass paper good: text-emerald-700 on paper | #047857 | #F7F8FB | text | 5.16:1 | PASS |
| toneClass paper good: text-emerald-700 on paper-sunken | #047857 | #F0F2F6 | text | 4.89:1 | PASS |
| toneClass paper bad: text-rose-700 on paper | #BE123C | #F7F8FB | text | 5.92:1 | PASS |
| toneClass paper bad: text-rose-700 on paper-sunken | #BE123C | #F0F2F6 | text | 5.61:1 | PASS |
| toneClass paper neutral: text-ink-1 on paper | #3A4356 | #F7F8FB | text | 9.34:1 | PASS |
| toneClass dark good: text-verify on carbon | #5FD9A3 | #0D1117 | text | 10.76:1 | PASS |
| toneClass dark bad: text-alert on carbon | #FF6470 | #0D1117 | text | 6.59:1 | PASS |
| toneClass dark neutral: text-ion-1 on carbon | #AEB7D2 | #0D1117 | text | 9.47:1 | PASS |
| PickCard: game time text-ion-1 on bg-carbon | #AEB7D2 | #0D1117 | text | 9.47:1 | PASS |
| PickCard: team name text-white on bg-carbon | #FFFFFF | #0D1117 | text | 18.92:1 | PASS |
| PickCard: selection text-white on bg-carbon | #FFFFFF | #0D1117 | text | 18.92:1 | PASS |
| PickCard: sport chip text-ion-1 on bg-titanium | #AEB7D2 | #211A33 | text | 8.33:1 | PASS |
| PickCard: field labels text-ion-1 on bg-carbon | #AEB7D2 | #0D1117 | text | 9.47:1 | PASS |
| PickCard: 'how we grade' link text-ion-2 on bg-carbon | #B1BAD5 | #0D1117 | text | 9.78:1 | PASS |
| PickCard: info box text-ion-1 on bg-orbital-cyan/5-over-carbon | #AEB7D2 | #0C1C23 | text | 8.71:1 | PASS |
| PickCard: 'LIVE' badge text-plasma-ink on bg-plasma | #1A0014 | #FF38C7 | ui | 6.30:1 | PASS |
| PickCard: risk LOW_RISK text-verify on bg-carbon | #5FD9A3 | #0D1117 | text | 10.76:1 | PASS |
| PickCard: risk MODERATE text-plasma on bg-carbon | #FF38C7 | #0D1117 | text | 5.99:1 | PASS |
| PickCard: risk HIGH_VARIANCE/LINE_STEAM text-ultraviolet-glow on bg-carbon | #9F87FF | #0D1117 | text | 6.65:1 | PASS |
| PickCard: risk INJURY_RISK text-alert on bg-carbon | #FF6470 | #0D1117 | text | 6.59:1 | PASS |
| Badge: GradeBadge ELITE_PLAY text-plasma on bg-plasma/10 | #FF38C7 | #251529 | ui | 5.45:1 | PASS |
| Badge: GradeBadge STRONG_PLAY text-verify on bg-verify/10 | #5FD9A3 | #152525 | ui | 9.02:1 | PASS |
| Badge: GradeBadge SOLID_PLAY text-ion-blue on bg-ion-blue/10 | #00E5FF | #0C262E | ui | 10.25:1 | PASS |
| Badge: GradeBadge LEAN text-ion-2 on bg-titanium/40 | #B1BAD5 | #151522 | ui | 9.34:1 | PASS |
| Badge: TierBadge FREE text-verify on bg-verify/10 | #5FD9A3 | #152525 | ui | 9.02:1 | PASS |
| Badge: TierBadge PREMIUM text-plasma on bg-plasma/10 | #FF38C7 | #251529 | ui | 5.45:1 | PASS |
| Badge: ResultBadge WIN text-verify on bg-verify/10 | #5FD9A3 | #152525 | ui | 9.02:1 | PASS |
| Badge: ResultBadge LOSS text-alert on bg-alert/10 | #FF6470 | #251920 | ui | 5.90:1 | PASS |
| Badge: ResultBadge PUSH text-ion-2 on bg-titanium | #B1BAD5 | #211A33 | ui | 8.61:1 | PASS |
| Badge: ResultBadge VOID text-ion-1 on bg-titanium | #AEB7D2 | #211A33 | ui | 8.33:1 | PASS |
| Badge: PickTypeBadge SPREAD text-ion-blue on bg-ion-blue/10 | #00E5FF | #0C262E | ui | 10.25:1 | PASS |
| Badge: PickTypeBadge MONEYLINE/TOTAL text-ultraviolet-glow on bg-ultraviolet/10 | #9F87FF | #18192E | ui | 6.07:1 | PASS |
| Badge: ConfidenceBadge >=80 text-verify on bg-verify/10 | #5FD9A3 | #152525 | ui | 9.02:1 | PASS |
| Badge: ConfidenceBadge >=70 text-ion-blue on bg-ion-blue/10 | #00E5FF | #0C262E | ui | 10.25:1 | PASS |
| Badge: ConfidenceBadge >=60 text-plasma on bg-plasma/10 | #FF38C7 | #251529 | ui | 5.45:1 | PASS |
| Badge: ConfidenceBadge <60 text-ion-2 on bg-titanium | #B1BAD5 | #211A33 | ui | 8.61:1 | PASS |
| Bare text-ultraviolet (base, not -glow) on bg-carbon | #7B61FF | #0D1117 | text | 4.50:1 | PASS (barely; 0.002 over the floor) |
| **Bare text-ultraviolet (base, not -glow) on .surface-card (~eclipse/80%)** | **#7B61FF** | **#151225** | **text** | **4.36:1** | **FAIL** |

**Result: 72 pairs measured, 71 pass, 1 fails.**

### The one failure

`ultraviolet` (`#7B61FF`, the base "depth / model layer" hue) is used as plain
small text color (`text-ultraviolet`, not the lighter `text-ultraviolet-glow`
variant) in several places: `apps/web/components/ui/methodology-section.tsx`
(lines 94, 123), `apps/web/components/world/no-bet-gate.tsx`,
`apps/web/components/world/airwave-signal-layer.tsx`,
`apps/web/components/fantasy/fantasy-shell.tsx`,
`apps/web/components/fantasy/dfs-optimizer.tsx`,
`apps/web/components/fantasy/bestball-board.tsx`,
`apps/web/components/fantasy/props-edge.tsx`,
`apps/web/components/fantasy/fantasy-upsell.tsx`, and
`apps/web/components/fantasy/sleeper-connect.tsx`.

On `bg-carbon` it measures 4.50:1, which clears the 4.5:1 floor by 0.002, too
thin a margin to trust across real font rendering and sub-pixel color
management. On `bg-eclipse` (and on `.surface-card`, which is eclipse at 80%
opacity, `apps/web/app/globals.css` lines 102-106) it measures 4.33-4.36:1,
which is a real AA failure for body-sized text. `apps/web/components/picks/
pick-card.tsx` never makes this mistake: everywhere it needs ultraviolet as
text it already reaches for `text-ultraviolet-glow` (`#9F87FF`, which measures
6.07-6.65:1 in the table above) and keeps bare `ultraviolet` for backgrounds
and borders only. The fix for the current app, independent of anything in this
redesign, is to swap `text-ultraviolet` for `text-ultraviolet-glow` at every
one of those call sites. This is a real, pre-existing bug in the live dark
theme, matching what the brief's section 2 calls out ("contrast failures in
the dark theme").

Everything else measured (72 pairs total across `KpiCard`, `PageHero`,
`MetricExplainer`, `DataTable`, the shared tone-color helper, `PickCard`'s
variant tables and every badge style in `pick-card.tsx`, plus the global body
defaults) already passes AA. `design-tokens.css`'s own comments explain why:
`--ion-2` and `--ion-3` were both re-valued in a prior pass specifically to
clear 4.5:1 on carbon and eclipse, and the `*-on-light` accent variants exist
specifically so paper-surface components never reach for a raw brand hue that
would fail on white.

## 3. Proposed semantic token set

The brief (section 5) fixes the role names: `surface`, `surface-raised`,
`surface-sunken`, `hairline`, `text`, `text-muted`, `accent`, `positive`,
`negative`, `caution`, `info`, `focus-ring`. It also asks for exactly **one**
accent hue, not the current three-hue signal set (plasma / ion-blue /
ultraviolet), and for that hue to come from "the receipt and the record," not
space imagery.

The proposal below keeps every existing, already-AA-verified hex it can and
only changes the name it hangs under. That is a deliberate choice: fewer new
numbers means fewer new risks, and it makes the migration in section 5 a
rename in most cases rather than a re-tint.

- **accent** becomes the existing orbital cyan (`#00E5FF` dark / `#06748A`
  light). Of the three current signal hues, this is the one already carrying
  the "signature accent" role in `DESIGN.md`, the one used for links, active
  table headers, and the eyebrow rule across every component measured in
  section 2, and the one that already reads as "measurement and telemetry"
  rather than "brand mascot color." It is not a new invented color: the brief
  says pick one hue, and this repo already leans on this one the hardest.
  Plasma (magenta) and ultraviolet both retire as UI accents under this
  proposal; nothing stops either from surviving purely as a decorative
  wordmark or marketing-page flourish outside the semantic token system.
- **positive**, **negative**, **caution** carry forward unchanged
  (`verify`/`verify-on-light`, `alert`/`alert-on-light`,
  `caution`/`caution-on-light`). They already read correctly (green = good,
  red = bad, amber = caution) and already pass AA on every surface tested.
- **info** is the one genuinely new color in this proposal (`#1D4E9B` light /
  `#8FB8F5` dark). Nothing named "info" exists today; the closest candidate,
  `electric-blue` (`#2A6BFF`), measures 4.03-4.46:1 against the dark surfaces
  here and fails the 4.5:1 text floor, so it was not reused. `info` is meant
  for neutral disclosure text: "how this is measured" drawers, calibration
  eligibility explanations, anything the brief's section 7 wants read as fact
  rather than as the accent color's activity or an alarm.
- **surface** / **surface-raised** / **surface-sunken** map onto the existing
  page/card/well ladder in both scales (`paper`/`paper-raised`/`paper-sunken`
  for light, `carbon`/`eclipse`/`void` for dark).
- **text** / **text-muted** collapse the current three-deep hierarchy (`ink`/
  `ink-1`/`ink-2` and `ion`/`ion-1`/`ion-2`) to the two tiers the brief names.
  `ink`/`ion` become `text`; `ink-1`/`ion-1` become `text-muted`. `ink-2`/
  `ion-2` (the third, most-muted tier) has no direct home in the new set; see
  the mapping table in section 5 for what to do with call sites that used it.
- **hairline** carries forward unchanged (`paper-border` / `mineral`). It is a
  decorative divider color, not a text color or a UI component whose state
  must be told apart by color alone, so WCAG's 1.4.11 non-text contrast
  requirement does not gate it, and this proposal does not force it to 3:1
  (see the informational section in the script's output: it measures
  1.27:1-1.59:1, same order of magnitude as the current app's own dividers).
- **focus-ring** is set to the same hex as `accent` in each theme. A single
  bright, brand-colored ring at 2px with a 2px offset (brief section 7) is
  the simplest way to guarantee 3:1 against every surface, and it already
  does: see the table below.

### 3.1 The CSS

Also written standalone to `docs/design/redesign-2026-09/tokens-proposal.css`
(same content, for engineering to diff against or paste directly):

```css
:root {
  /* Light theme (default). Values are the CURRENT --paper*, --ink*,
     and --*-on-light hexes from apps/web/styles/design-tokens.css,
     carried forward unchanged under their new role names. */

  --surface: #F7F8FB;         /* page background. == old --paper */
  --surface-raised: #FFFFFF;  /* cards, rows, popovers. == old --paper-raised */
  --surface-sunken: #F0F2F6;  /* zebra stripes, wells, insets. == old --paper-sunken */
  --hairline: #D9DEE7;        /* dividers and card edges. == old --paper-border.
                                  Decorative only (WCAG 1.4.11 does not require
                                  3:1 on plain dividers); do not use it to carry
                                  a UI-component boundary that needs 3:1 -- give
                                  that its own border color if one comes up. */

  --text: #0E1320;            /* body copy and headings. == old --ink */
  --text-muted: #3A4356;      /* secondary text, captions, meta. == old --ink-1 */

  --accent: #06748A;          /* the one brand hue. == old --orbital-cyan-on-light.
                                  Links, active states, the wordmark accent.
                                  Sparingly -- never a large fill under body text. */

  --positive: #0B6B46;        /* win, verified, settled-good. == old --verify-on-light */
  --negative: #C0122F;        /* loss, void, error. == old --alert-on-light */
  --caution: #9A4D00;         /* stale, degraded, pending review. == old --caution-on-light */
  --info: #1D4E9B;            /* neutral disclosure, "how this is measured" callouts. NEW. */

  --focus-ring: #06748A;      /* == --accent. 2px solid, 2px offset, every
                                  interactive element (brief section 7). */
}

[data-theme="dark"] {
  /* Dark theme. Values are the CURRENT --carbon/--eclipse/--void and
     --ion/--ion-1/--verify/--alert/--caution hexes, carried forward
     unchanged under their new role names. */

  --surface: #0D1117;         /* page background. == old --carbon */
  --surface-raised: #171228;  /* cards, rows, popovers. == old --eclipse */
  --surface-sunken: #05070B;  /* recessed wells, deepest layer. == old --void / --obsidian */
  --hairline: #3B3158;        /* dividers and card edges. == old --mineral.
                                  Decorative only, see the light-theme note above. */

  --text: #D5DDE9;            /* body copy and headings. == old --ion (today's body default) */
  --text-muted: #AEB7D2;      /* secondary text, captions, meta. == old --ion-1 */

  --accent: #00E5FF;          /* the one brand hue. == old --orbital-cyan.
                                  Replaces the old plasma / ion-blue / ultraviolet
                                  three-hue signal set -- one hue, used sparingly. */

  --positive: #5FD9A3;        /* win, verified, settled-good. == old --verify */
  --negative: #FF6470;        /* loss, void, error. == old --alert */
  --caution: #FFB454;         /* stale, degraded, pending review. == old --caution */
  --info: #8FB8F5;            /* neutral disclosure, "how this is measured" callouts. NEW. */

  --focus-ring: #00E5FF;      /* == --accent. 2px solid, 2px offset, every
                                  interactive element (brief section 7). */
}

/* prefers-color-scheme fallback for a viewer with no explicit
   data-theme (system default), matching the dark values above. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --surface: #0D1117;
    --surface-raised: #171228;
    --surface-sunken: #05070B;
    --hairline: #3B3158;
    --text: #D5DDE9;
    --text-muted: #AEB7D2;
    --accent: #00E5FF;
    --positive: #5FD9A3;
    --negative: #FF6470;
    --caution: #FFB454;
    --info: #8FB8F5;
    --focus-ring: #00E5FF;
  }
}
```

### 3.2 Proposed pair contrast table

Command run: `node docs/design/redesign-2026-09/contrast-check.mjs proposed`

**Every pair below passes.** Each of `text`, `text-muted`, `accent`, `positive`,
`negative`, `caution`, `info` and `focus-ring` is checked against all three
surfaces (`surface`, `surface-raised`, `surface-sunken`) in both themes.

| Theme | Pair | fg | bg | kind | ratio | AA |
|---|---|---|---|---|---|---|
| light | text on surface | #0E1320 | #F7F8FB | text | 17.46:1 | PASS |
| light | text-muted on surface | #3A4356 | #F7F8FB | text | 9.34:1 | PASS |
| light | accent on surface (text) | #06748A | #F7F8FB | text | 5.11:1 | PASS |
| light | accent on surface (UI) | #06748A | #F7F8FB | ui | 5.11:1 | PASS |
| light | positive on surface | #0B6B46 | #F7F8FB | text | 6.17:1 | PASS |
| light | negative on surface | #C0122F | #F7F8FB | text | 5.87:1 | PASS |
| light | caution on surface | #9A4D00 | #F7F8FB | text | 5.76:1 | PASS |
| light | info on surface | #1D4E9B | #F7F8FB | text | 7.56:1 | PASS |
| light | focus-ring on surface (3:1 UI) | #06748A | #F7F8FB | ui | 5.11:1 | PASS |
| light | text on surface-raised | #0E1320 | #FFFFFF | text | 18.54:1 | PASS |
| light | text-muted on surface-raised | #3A4356 | #FFFFFF | text | 9.92:1 | PASS |
| light | accent on surface-raised (text) | #06748A | #FFFFFF | text | 5.42:1 | PASS |
| light | accent on surface-raised (UI) | #06748A | #FFFFFF | ui | 5.42:1 | PASS |
| light | positive on surface-raised | #0B6B46 | #FFFFFF | text | 6.55:1 | PASS |
| light | negative on surface-raised | #C0122F | #FFFFFF | text | 6.23:1 | PASS |
| light | caution on surface-raised | #9A4D00 | #FFFFFF | text | 6.11:1 | PASS |
| light | info on surface-raised | #1D4E9B | #FFFFFF | text | 8.03:1 | PASS |
| light | focus-ring on surface-raised (3:1 UI) | #06748A | #FFFFFF | ui | 5.42:1 | PASS |
| light | text on surface-sunken | #0E1320 | #F0F2F6 | text | 16.54:1 | PASS |
| light | text-muted on surface-sunken | #3A4356 | #F0F2F6 | text | 8.85:1 | PASS |
| light | accent on surface-sunken (text) | #06748A | #F0F2F6 | text | 4.84:1 | PASS |
| light | accent on surface-sunken (UI) | #06748A | #F0F2F6 | ui | 4.84:1 | PASS |
| light | positive on surface-sunken | #0B6B46 | #F0F2F6 | text | 5.84:1 | PASS |
| light | negative on surface-sunken | #C0122F | #F0F2F6 | text | 5.56:1 | PASS |
| light | caution on surface-sunken | #9A4D00 | #F0F2F6 | text | 5.45:1 | PASS |
| light | info on surface-sunken | #1D4E9B | #F0F2F6 | text | 7.16:1 | PASS |
| light | focus-ring on surface-sunken (3:1 UI) | #06748A | #F0F2F6 | ui | 4.84:1 | PASS |
| dark | text on surface | #D5DDE9 | #0D1117 | text | 13.83:1 | PASS |
| dark | text-muted on surface | #AEB7D2 | #0D1117 | text | 9.47:1 | PASS |
| dark | accent on surface (text) | #00E5FF | #0D1117 | text | 12.30:1 | PASS |
| dark | accent on surface (UI) | #00E5FF | #0D1117 | ui | 12.30:1 | PASS |
| dark | positive on surface | #5FD9A3 | #0D1117 | text | 10.76:1 | PASS |
| dark | negative on surface | #FF6470 | #0D1117 | text | 6.59:1 | PASS |
| dark | caution on surface | #FFB454 | #0D1117 | text | 10.73:1 | PASS |
| dark | info on surface | #8FB8F5 | #0D1117 | text | 9.32:1 | PASS |
| dark | focus-ring on surface (3:1 UI) | #00E5FF | #0D1117 | ui | 12.30:1 | PASS |
| dark | text on surface-raised | #D5DDE9 | #171228 | text | 13.30:1 | PASS |
| dark | text-muted on surface-raised | #AEB7D2 | #171228 | text | 9.11:1 | PASS |
| dark | accent on surface-raised (text) | #00E5FF | #171228 | text | 11.83:1 | PASS |
| dark | accent on surface-raised (UI) | #00E5FF | #171228 | ui | 11.83:1 | PASS |
| dark | positive on surface-raised | #5FD9A3 | #171228 | text | 10.35:1 | PASS |
| dark | negative on surface-raised | #FF6470 | #171228 | text | 6.34:1 | PASS |
| dark | caution on surface-raised | #FFB454 | #171228 | text | 10.32:1 | PASS |
| dark | info on surface-raised | #8FB8F5 | #171228 | text | 8.97:1 | PASS |
| dark | focus-ring on surface-raised (3:1 UI) | #00E5FF | #171228 | ui | 11.83:1 | PASS |
| dark | text on surface-sunken | #D5DDE9 | #05070B | text | 14.73:1 | PASS |
| dark | text-muted on surface-sunken | #AEB7D2 | #05070B | text | 10.08:1 | PASS |
| dark | accent on surface-sunken (text) | #00E5FF | #05070B | text | 13.11:1 | PASS |
| dark | accent on surface-sunken (UI) | #00E5FF | #05070B | ui | 13.11:1 | PASS |
| dark | positive on surface-sunken | #5FD9A3 | #05070B | text | 11.46:1 | PASS |
| dark | negative on surface-sunken | #FF6470 | #05070B | text | 7.02:1 | PASS |
| dark | caution on surface-sunken | #FFB454 | #05070B | text | 11.43:1 | PASS |
| dark | info on surface-sunken | #8FB8F5 | #05070B | text | 9.93:1 | PASS |
| dark | focus-ring on surface-sunken (3:1 UI) | #00E5FF | #05070B | ui | 13.11:1 | PASS |

**Result: 54 pairs measured, 54 pass, 0 fail.**

No color needed to be dropped or changed after measuring; every reused hex
already had enough margin. The worst case in the whole table is `accent` on
`surface-sunken` in light mode at 4.84:1, still comfortably clear of the 4.5:1
text floor.

Two dividers are reported separately, not gated (see the reasoning under
`--hairline` above): `hairline` on `surface` measures 1.27:1 in light and
1.59:1 in dark. That is expected for a decorative border and is not an AA
failure; it is listed here only so nobody mistakes the omission for an
oversight.

## 4. Old name to new role mapping

For engineering to alias the new tokens onto the existing class names without
a full rewrite. "Direct alias" means `--old-name: var(--new-role)` is exact and
safe; "needs a decision" means the two names don't line up one to one.

| Old name (CSS var / Tailwind class) | New role | Alias type |
|---|---|---|
| `--paper`, `bg-paper` | `surface` (light) | direct alias |
| `--paper-raised`, `bg-paper-raised` | `surface-raised` (light) | direct alias |
| `--paper-sunken`, `bg-paper-sunken` | `surface-sunken` (light) | direct alias |
| `--paper-border`, `border-paper-border` | `hairline` (light) | direct alias |
| `--carbon`, `bg-carbon` | `surface` (dark) | direct alias |
| `--eclipse`, `bg-eclipse` | `surface-raised` (dark) | direct alias |
| `--void` / `--obsidian` | `surface-sunken` (dark) | direct alias (note: `tailwind.config.ts`'s `obsidian` hex, `#080A0F`, drifts from `design-tokens.css`'s `#05070B`; reconcile to one value before aliasing, see section 1.1) |
| `--titanium`, `bg-titanium` | no direct home | **needs a decision** -- titanium currently sits between eclipse and slate as a fourth surface step; the new set has three. Fold it into `surface-raised` (closest measured neighbor) unless a screen specifically needs a fourth step, in which case add a component-local variable, not a new global role. |
| `--mineral`, `border-mineral` | `hairline` (dark) | direct alias |
| `--ink`, `text-ink` | `text` (light) | direct alias |
| `--ink-1`, `text-ink-1` | `text-muted` (light) | direct alias |
| `--ink-2`, `text-ink-2` | no direct home | **needs a decision** -- the new set has two text tiers, not three. Most current `ink-2` call sites are meta/caption text (table headers, timestamps); fold these into `text-muted` (it already passes AA with room: 9.34:1-9.92:1) rather than inventing a third tier. |
| `--ion`, `text-ion` (body default) | `text` (dark) | direct alias |
| `--ion-1`, `text-ion-1` | `text-muted` (dark) | direct alias |
| `--ion-white`, `text-ion-white` | `text` (dark) | **needs a decision** -- ion-white is brighter than ion (17.69:1 vs. 13.83:1 on carbon) and is currently reserved for headings/high-emphasis values (`KpiCard` value, `PageHero` title, `MetricExplainer` term). The two-tier system does not distinguish "heading" from "body," so this proposal folds ion-white into `text` too; a component that wants a heading to read brighter than body copy can do that with weight/size, not a separate color. |
| `--ion-2`, `text-ion-2` | no direct home | **needs a decision**, same as `ink-2` above: fold into `text-muted`. |
| `--orbital-cyan`, `text-orbital-cyan`, `bg-orbital-cyan` | `accent` (dark) | direct alias |
| `--orbital-cyan-on-light`, `text-orbital-cyan-on-light` | `accent` (light) | direct alias |
| `--plasma`, `text-plasma`, `bg-plasma`; `--ion-blue`, `text-ion-blue`; `--ultraviolet`, `text-ultraviolet` (and their `-glow`/`-deep` variants) | `accent` where the role is "the brand hue, sparingly," otherwise **needs a decision per call site** | Every current use of these three as a *badge/status color* (grade, tier, confidence-level badges in `pick-card.tsx`) is really encoding a rank or category, not "the brand." Those call sites need a real category or rank scale, not a squeeze into one accent hue; keep them as component-local tokens (e.g. a `--rank-1/2/3/4` ladder) rather than forcing them through `accent`, `positive`, `negative` or `caution`. Anywhere these three were used purely decoratively (glows, gradients, hero accents) can keep using the raw legacy hex outside the semantic token system; they just stop being part of the AA-governed UI palette. |
| `--verify`, `text-verify`, `bg-verify`; `--verify-on-light` | `positive` | direct alias |
| `--alert`, `text-alert`, `bg-alert`; `--alert-on-light` | `negative` | direct alias |
| `--caution`, `bg-caution`; `--caution-on-light` | `caution` | direct alias |
| `--amber`, `--gold`, `--cobalt*` | retire | these already auto-redirect to `--ion-blue` (i.e. today's cyan); once `accent` replaces `ion-blue`/`orbital-cyan` as the one hue, delete these aliases rather than repointing them again |
| `--lime`, `text-lime`; `--cyan`, `text-cyan` (the "rare accents") | no direct home | keep as component-local, non-semantic decorative tokens ("live tick," "telemetry ping") outside the AA-governed set, exactly as their current comments already say ("use sparingly, never as surface") |
| (none currently) | `info` | new token, no migration needed; adopt it going forward for neutral disclosure copy that currently borrows `text-ion-1`/`text-ink-1` by default |
| `:focus-visible { outline: 2px solid var(--signal) }` (`design-tokens.css` line 312, currently plasma) | `focus-ring` | **needs a decision** -- this is a real behavior change, not just a rename: the focus ring moves from plasma to the single accent hue (cyan). Confirm this is desired before landing; it is consistent with "one accent hue" but is a visible, sitewide change. |

## 5. Typography recommendation (brief section 5)

The brief wants "one text family with true italics and tabular numerals, one
mono for hashes, receipts, lines and odds," a 16px minimum body on mobile, 1.5
line height, and a 60-75 character prose measure.

**Recommendation: Inter as the one text family, JetBrains Mono as the one mono
family.** Concretely:

- **Inter** (already loaded, `--f-body`) covers both body copy and headings.
  It ships true italics (a genuinely different drawn face, not a synthetic
  oblique) and supports tabular figures through the standard OpenType
  feature: `font-variant-numeric: tabular-nums;` or, equivalently,
  `font-feature-settings: "tnum" 1;`. `design-tokens.css` line 293 already
  turns on `"ss01", "cv11"` at the `body` level; adding `"tnum"` there (or a
  `.num`/`[data-num]` utility, which the file already has at lines 296-300,
  just needs `font-family` pointed at Inter instead of the numerals mono
  where prose numbers need to align without going full monospace) is a
  small, additive change.
- **Exo 2** (`--f-display`, `--f-arch`) is the current headline/hero face:
  a heavy, geometric, uppercase-leaning display font. This is the typeface
  most responsible for the "crypto dashboard" read the brief's section 2
  explicitly wants gone. Recommend retiring it from the semantic type system
  in this redesign; if the founder wants to keep a distinct display weight
  for the wordmark or a hero slam, that can live outside the body/heading
  type roles as a one-off, the way `--t-arch-*` already exists as a
  separate scale from `--t-display-*`.
- **JetBrains Mono** (`--f-numerals`, `--f-mono`) is already the right choice
  for the brief's "one mono for hashes, receipts, lines and odds": it is
  inherently fixed-width (tabular by construction, no feature flag needed),
  legible at small sizes, and already wired to the `.num`/`.mono`/`[data-num]`
  utility class in `design-tokens.css` (lines 296-300). No change needed.
- **Instrument Serif** (`--f-editorial`) is a single-weight (400), true-italic
  editorial serif. It does not fit the brief's "one text family" requirement
  on its own (no bold, not built for dense body copy at small sizes), but it
  is a reasonable sparing accent for pull quotes or a loss-autopsy narrative
  lead-in, matching the "broadsheet's data desk" reference in section 5.
  Recommend keeping it out of the core semantic type roles (body, heading,
  meta) and reserving it for that one editorial-accent use.

**Type scale finding:** the brief sets a 16px minimum body size on mobile.
The current primary body token, `--t-body` (`design-tokens.css` line 259), is
**15px**, one pixel under that floor; `--t-body-sm` is 13px and `--t-body-xs`
is 12px, both clearly under it. `--t-body-sm`/`--t-body-xs` look intentionally
reserved for meta/caption text (labels, timestamps, badge text), which the
brief's 16px floor is about primary reading paragraphs, not every UI label, so
those two are likely fine as is. `--t-body` itself is the one that needs to
move: recommend bumping it to 16px (line height can stay close to the current
1.55, which already satisfies the brief's 1.5 minimum). This is a token change
a designer or engineer should make deliberately, not a side effect of this
contrast pass, so it is called out here rather than folded into
`tokens-proposal.css`.

The brief's 60-75 character prose measure maps onto the existing `--w-prose:
720px` width token (`design-tokens.css` line 210); at a 16-17px body size that
width sits in the target range, so no change is needed there once `--t-body`
moves to 16px.

## 6. How to reproduce every number in this document

```bash
cd /home/user/Sports
node docs/design/redesign-2026-09/contrast-check.mjs current
node docs/design/redesign-2026-09/contrast-check.mjs proposed
node docs/design/redesign-2026-09/contrast-check.mjs all
```

`current` exits 1 (one real failure, section 2). `proposed` exits 0 (54 of 54
pass, section 3.2). `all` runs both plus the two informational hairline rows
and exits 1 (driven by the one current failure).
