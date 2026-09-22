# Galaxy Sports Edge — Brand & Design-System Director's Review

**Author:** Brand & design-system director (GSN/GSE)
**Date:** 2026-06-01
**Method:** Read of `DESIGN.md`, `CLAUDE.md`, `COMPETITIVE_INTELLIGENCE.md`, `design-system/README.md`,
`apps/web/styles/design-tokens.css`, `apps/web/tailwind.config.ts`, `apps/web/app/globals.css`,
`apps/web/lib/brand.ts`, `apps/web/app/page.tsx`, and the `ui/ hero/ home/ brand/ motion/ picks/ performance/ pricing`
component trees; benchmark research vs. Polaris / Primer / Radix / shadcn (URLs cited §9). Constraint: read-only,
zero code changes; one new markdown file only.
**Label key:** `[verified]` = read in-repo · `[verified-ext]` = external source · `[inferred]` · `[recommended]`.

> **Naming note (read first).** Three names coexist. The *prompt* says **Galaxy Sports Network (GSN)**;
> `COMPETITIVE_INTELLIGENCE.md` uses **GSN**; but the **code source-of-truth is unambiguously
> "Galaxy Sports Edge" (GSE)** — `lib/brand.ts:16` `BRAND_NAME = "Galaxy Sports Edge"`, monogram `GSE`
> (`lib/brand.ts:30`, `brand-lockup.tsx:28`), domain `galaxysportsedge.com`. `[verified]` This doc treats
> **GSE as the shipping brand** and **GSN as the strategy/working alias**, and flags the split as a P0
> governance decision (§8). I will write "GSE" for product surfaces.

---

## 1. Brand strategy — what GSE *is*

**Positioning (verified in repo).** GSE is *not* a sportsbook, tout, or casino app. It is a **calibrated sports-
intelligence terminal** whose wedge is **"proof, not promises"** (`COMPETITIVE_INTELLIGENCE.md` §0). The brand
artifacts and code are coherent on this: tagline *"Find the signal before the market moves"* (`brand.ts:22`),
homepage arch headline *"Math you can read."* (`app/page.tsx:191`), closer *"We detect. You decide."* (`brand.ts:197`).
`[verified]`

**Personality.** Calm, factual, slightly cinematic; *"Calibrated. Precise. Always acquiring. Intelligence isn't
loud. It's on frequency."* (`brand.ts:7-9`). The reference set is explicitly **Bloomberg Terminal / F1 telemetry /
NASA Mission Control / Apple restraint / Perplexity clarity** (`DESIGN.md` Design Philosophy) — i.e., authority
through calm, "95% neutral so 5% signal earns every pixel." `[verified]`

**Voice (verified, `design-system/README.md`).** First-person plural for the product, second person for the user,
active present tense, *show-don't-promise*. Casing: sentence-case headlines, **mono ALL-CAPS eyebrows** at
0.16em tracking, tabular numerals, real minus `−`. Emoji ≈ zero; the only glyphs are data glyphs (`↑ ↓ − · →`).
`[verified]`

**The "galaxy / observatory / engine-in-the-open" motif (verified, and it's the brand's best asset).**
This is not aspirational copy — it is *built*:
- **Galaxy/observatory:** `components/hero/interactive-galaxy.tsx` is a 140-particle 2D canvas with three
  elliptical orbits, constellation links, cursor-parallax, and — crucially on-message — **"evidence nodes"** that
  *ripple when a traveler passes* (`interactive-galaxy.tsx:420-470`). The hero literally renders "intelligence
  orbiting evidence." It has a full reduced-motion static fallback (`:498-501`). `[verified]`
- **Engine-in-the-open:** the homepage centerpiece is a four-beat narrative — **01 The Gate → 02 The Pass List →
  03 Calibration → 04 The Autopsy** (`app/page.tsx:243-605`). Copy: *"Watch it think, decline, and grade itself,"*
  *"It says no far more than it says yes,"* *"No edge, no pick,"* *"When we are wrong, we say so."* This is the
  anti-tout aesthetic executed as IA, not slogan. `[verified]`
- **Reticle/observatory** marks: `brand-lockup.tsx` draws an orbit+vector+core+ping SVG; `design-system/` also
  ships a reticle/crosshair mark. `[verified]`

**Trustworthy-but-exciting vs. scammy-tout — GSE's line is drawn in code, not just guidelines.**

| Tout aesthetic (what GSE rejects) | GSE's encoded counter |
|---|---|
| 🔥/💰/🏆 emoji, "LOCK OF THE DAY" | Banned-language list `brand.ts:225-233`; emoji ≈ zero `[verified]` |
| Casino green = "winner" | `green` **forbidden as brand** (`DESIGN.md`); semantic `--verify #5FD9A3` mint substitute `[verified]` |
| Win-rate hero before it's earned | Calibration gated to **30 settled picks** before any curve renders (`app/page.tsx:494-499`, `CalibrationCurve` empty-state `:153-179`) `[verified]` |
| Hidden losses | **Autopsy** is a *first-class public surface* (`app/page.tsx:542-605`) `[verified]` |
| Glow on everything | "Plasma is signal, not decoration"; forbidden-patterns list (`DESIGN.md`) `[verified]` |

**Strategic read.** The brand strategy is genuinely best-in-class for the category and *consistent with the
competitive moat* (lead with the scoreboard, be the venue-agnostic trust layer, ship the honest agent —
`COMPETITIVE_INTELLIGENCE.md` §3). The gap is **not strategy or tokens** — it is **execution consistency** between
the polished public marketing surfaces and the older product/performance surfaces (§5).

---

## 2. Design-token audit — what exists, gaps, what to formalize

**What exists (and it's mature).** `[verified]`
- **Single source of truth, doubly mirrored:** `styles/design-tokens.css` (`:root` CSS vars) is the authority;
  `tailwind.config.ts` mirrors it; `DESIGN.md` front-matter mirrors it again as machine-readable YAML. `globals.css`
  imports the token file first and forbids redefining color/font (`globals.css:1-10`).
- **Color — three tiers, well-architected (this *is* the Polaris/Primer pattern):**
  1. *Primitives:* environment scale `void→carbon→eclipse→titanium→slate→mineral→mineral-hi` (8 steps),
     ion text scale `ion-white→ion→ion-1→ion-2→ion-3` (5 steps), three signals (plasma `#FF2DD6`, orbital-cyan
     `#00E5FF`, ultraviolet `#7A5CFF`), rare accents (lime, cyan), semantics (verify/alert).
  2. *Semantic aliases:* `--bg`, `--bg-raised`, `--fg`, `--fg-meta`, `--border`, `--accent`, `--premium`, plus
     **confidence ladder** (`--conf-elite/strong/solid/lean`) and **risk ladder** (`design-tokens.css:105-136`).
  3. *Deprecated→repointed aliases:* `--amber/--gold/--cobalt → --ion-blue`, `--magenta → --plasma`, so legacy
     boards inherit the new brand **without a refactor** (`design-tokens.css:71-103`). This is exactly the
     "alias layer over primitives" Polaris/Primer recommend. `[verified-ext]`
- **Type:** six families bound to CSS vars (`arch / display / display-tech / body / mono / numerals / editorial`)
  with a full role scale (`--t-arch-*`, `--t-display-*`, `--t-num-*`, `--t-edit-*`, `--t-eyebrow`) — numerals are
  JetBrains Mono tabular, non-negotiable (`design-tokens.css:177-218`). `[verified]`
- **Spacing/radius/motion/glow:** 4px grid (`--s-1..--s-40`), radius `xs/sm/md/lg/pill`, four motion durations
  (`--dur-fast 150 / base 280 / slow 520 / cinematic 880`), two easings, atmospheric glow tokens, modal/float
  shadows. Reduced-motion zeroes all durations globally (`globals.css:50-59`). `[verified]`

**Gaps / what to formalize (`recommended`):**
1. **Token-contract drift between the two design systems.** `design-system/colors_and_type.css` + its README still
   document the *previous* palette (`plasma #FF2D8A`, `ion-blue #4FA8FF` true-blue, gold radii notes, 12px eyebrow
   tracking) whereas the **shipping** tokens are `plasma #FF2DD6`, `ion-blue/orbital-cyan #00E5FF`, 0.16em eyebrows.
   `[verified]` Anyone pulling from `design-system/` will build off-brand. **Action:** declare
   `apps/web/styles/design-tokens.css` the *sole* authority, regenerate `design-system/` from it (or stamp it
   "ARCHIVE — superseded").
2. **No primitive↔semantic boundary enforcement in Tailwind.** The config exposes *both* primitives (`plasma`,
   `eclipse`) and legacy numeric scales (`brand.50..950`, `ink.50..1000`, `accent.50..950`, `confidence.high/mid/low`
   that don't reference the canonical hexes — e.g. `confidence.high #FF3BC7` ≠ `--conf-elite #FF2DD6`,
   `tailwind.config.ts:141-150`). `[verified]` Two parallel confidence palettes is a Polaris anti-pattern.
   **Action:** point `confidence/risk` Tailwind keys at the canonical hexes; deprecate the `brand/ink/accent`
   numeric scales in favor of named tokens.
3. **Light mode does not exist.** `:root` is dark-only; 2026 guidance treats dark mode as a *mode*, not the only
   theme, and Radix ships paired light/dark scales toggled by one class. `[verified-ext]` For a dark-native terminal
   this is defensible, but should be a *documented decision*, not an omission.
4. **Numeric spacing aliases triple-spelled** (`--s-4` ≈ `ds-4` ≈ Tailwind `4`). Pick one surface vocabulary.

**Benchmark verdict.** GSE's token *theory* matches Polaris/Primer (primitive→alias→component) `[verified-ext]`.
GSE's *enforcement* (one integrity test, §4) is narrower than Polaris's token CI. The depth of the environment +
confidence-ladder system is **more sophisticated** than a default shadcn theme.

---

## 3. Component-library audit — coverage, a11y, consistency, dark-mode, motion

**Coverage (verified).** Public: `Nav`, `MobileNav`, `Footer`, `BrandLockup`, `RiskDisclosure`,
`MethodologySection`, `InteractiveGalaxy`, `SignalPreviewQueue`, homepage beats (`CalibrationCurve`,
`MissionControl`, `ToutComparison`, `AnnotatedSampleSignal`, `StartInSixty`), motion (`Reveal`, `Marquee`,
`SignatureGrid`), picks (`PickCard`, `EvidenceAuditDrawer`), performance (`CalibrationPanel`, `BootstrapState`),
billing (`SubscribeButton`, `ManageSubscriptionButton`). Plus a `cockpit/` set. This covers the DESIGN.md
"signature components" (Pick Card, Evidence Drawer, Confidence Score, Settlement Badge, Calibration). `[verified]`

**Consistency — the #1 finding: a two-tier codebase.** `[verified]`
- **Tier A (best-in-class, token-pure):** `app/page.tsx`, `interactive-galaxy.tsx`, `calibration-curve.tsx`,
  `nav`/`footer` (CSS-class system in `pickpilot-kit.css`, all `var(--token)`). These earn the Linear/Vercel/Stripe
  comparison.
- **Tier B (legacy raw-Tailwind, off-doctrine):** product/perf/cockpit surfaces still author **raw palette classes**.
  Off-token occurrences by dir: `components/picks` 62, `components/performance` 48, `components/cockpit` 25,
  `components/ui` 4, `components/pricing` 1. `[verified]` Worst offenders:
  - **`components/performance/calibration-panel.tsx`** — the *single most important trust surface* — uses raw
    `text-green-400 / text-red-400 / text-yellow-400 / bg-green-500/5 / border-red-500/40` (`:38-62`) plus a full
    `gray-200..900` set. The green/red verdict colors **directly violate** DESIGN.md's "casino green forbidden /
    use `--verify` mint" rule, and there is **no test guarding this file** (verified: no `__tests__` ref). `[verified]`
  - **`components/picks/pick-card.tsx`** — semantic colors *are* tokenized (`text-plasma`, `bg-verify/10`, etc.,
    enforced by `picks-design-token-integrity.test.ts`), but it still carries ~30 raw neutral classes the test's
    regex omits: `bg-gray-900` (card bg, should be `eclipse`), `border-gray-800` (should be `mineral`),
    `text-white` ×3 (should be `ion-white`), `text-gray-400`, `bg-gray-950/40`. `[verified]` Result: the flagship
    output card sits a half-step off the homepage's surface system.

**Accessibility (verified, mixed).**
- *Strong:* `:focus-visible` global plasma ring (`design-tokens.css:252`); reduced-motion honored globally and in
  JS (`calibration-curve.tsx:55`, `interactive-galaxy.tsx`); `aria-label` on the calibration SVG `role="img"`
  (`:78`); decorative icons `aria-hidden`; sample banners use `role="status" aria-live="polite"`
  (`app/page.tsx:140-143`); meta text token bumped **ion-2→ion-1** for AA (`design-tokens.css:123-127`).
- *Gaps (`recommended`):* `PickCard` badges encode result by **color alone** (WIN green / LOSS red text) — needs a
  glyph or the W/L/P/V monogram DESIGN.md specifies (Settlement Badge: *"Never ✓/✗ alone — screen readers need
  labels"*). The reliability bars in `calibration-panel` similarly rely on color. Touch-target 44px is met on
  homepage CTAs (`min-h-11`) but not audited on dense cockpit rows.

**Dark mode.** Single dark theme, executed with real atmospheric depth (multi-layer body radial glow,
`globals.css:30-34`) — *not* flat black. Best-practice within the chosen constraint; no light theme (§2 gap 3).
`[verified]`

**Motion.** Disciplined and on-doctrine: `Reveal` fade+4-8px translate, `live-dot` 2.4s plasma pulse, calibration
path draw-on (1200ms), marquee for tickers. No card-scale-on-hover, no spinners. Reduced-motion is comprehensive.
`[verified]` This already satisfies "no overanimated sci-fi."

---

## 4. Visual language of the trust surfaces (the brand's whole point)

**Calibration curve (`components/home/calibration-curve.tsx`) — exemplary, keep as the template.** `[verified]`
Diagonal = perfect calibration (dashed `--mineral`), observed-vs-predicted plotted in **one** accent
(`stroke-orbital-cyan`), axis labels in `ion-2` mono, points are `fill-carbon stroke-orbital-cyan` rings, and the
**honest empty state** shows `{sampleSize}/30` instead of a fake curve (`:153-179`). This obeys every DESIGN.md
data-viz rule (numerals first, one accent, subtle grid, no pie). This is the visual signature of "proof not
promises" and should be the reference every other chart is rebuilt against.

**Calibration / discrimination panel (`components/performance/calibration-panel.tsx`) — right *content*, wrong
*palette*.** `[verified]` The information design is excellent: a discrimination verdict ("does higher confidence
win more?"), a reliability bar per bucket with an *expected marker*, a Brier score with plain-English bands
(`:31-36`), and an explicit "calibration never auto-adjusts the model" disclaimer. But it renders the verdict in
raw `green/red/yellow-400` and the chrome in `gray-*`, so the *most credibility-bearing module on the site* looks
like a generic SaaS template and breaks the no-casino-green doctrine. **This is the highest-leverage visual fix in
the repo (§10).**

**Pick card (`components/picks/pick-card.tsx`) — the output unit.** `[verified]` Structure largely matches the
DESIGN.md Pick Card anatomy: grade/tier/result badges, selection box, confidence/edge/risk row, reasoning,
factor-breakdown bars (consensus/depth/edge/movement on `ion-blue/ultraviolet/verify/plasma`), data-quality +
freshness footer, evidence-drawer trigger for all tiers. Confidence color uses the ladder semantics. Gaps: raw
neutral surfaces (§3); result badges color-only (§3 a11y); no explicit **"What would change this" weakness
disclosure** that DESIGN.md mandates on PRO+ cards.

**Engine-in-the-open beats (homepage) — best execution on the site.** Gate lanes (Scoring=cyan, Published=plasma,
Gated=mineral), Pass List, Calibration, Autopsy — each a `surface-card`/`surface-lifted` with mono eyebrows and
tabular numerals. *"No pick has earned the plasma state"* (`app/page.tsx:413`) ties color to *earned conviction*.
`[verified]`

---

## 5. Concrete upgrades to reach best-in-class

`[recommended]` unless noted.
1. **Re-skin the trust surfaces to tokens (P0).** `calibration-panel.tsx` and `pick-card.tsx` → swap every
   `gray-*`/`green/red/yellow-*`/`text-white` for `eclipse / titanium / mineral / ion / ion-1 / verify / alert /
   ultraviolet`. Highest visual ROI; un-breaks the casino-green doctrine on the page that *is* the moat. (§10 ships
   the calibration-panel half.)
2. **Add a redundant encoding to outcome/verdict UI.** Pair WIN/LOSS color with the W/L/P/V monogram (DESIGN.md
   Settlement Badge) and the verdict color with an icon — fixes color-only a11y *and* hardens against the
   "color = casino" read.
3. **Ship the "What would change this" weakness line on PRO+ pick cards** — it's a DESIGN.md signature element and
   a literal embodiment of "proof not promises"; competitors never show their own counter-evidence.
4. **Promote one calibration component.** The homepage `CalibrationCurve` (token-pure) and the performance
   `CalibrationPanel` (token-dirty) duplicate intent. Extract a shared `<CalibrationViz>` so the curve renders
   identically on `/`, `/performance`, and a future shareable "model accountability" card
   (`COMPETITIVE_INTELLIGENCE.md` §4).
5. **Formalize a CLV / line-movement micro-viz token set** ahead of the planned CLV metric — reuse the confidence
   ladder + `↑/↓` data glyphs; one accent per chart.
6. **Token CI parity with Polaris/Primer:** extend `picks-design-token-integrity.test.ts` to (a) include `gray`/
   `white`/`black` in the banned regex and (b) cover `components/performance/*` and `components/cockpit/*`. Prevents
   Tier B from regrowing. `[verified-ext]` (Polaris/Primer gate tokens in CI.)
7. **Resolve the GSN vs GSE name** and regenerate `design-system/` from the live token file (§2 gap 1, §8).
8. **Document the dark-only decision** (or add a Radix-style paired scale) so it reads as intent, not gap.

---

## 6. Accessibility / contrast pass (dark surfaces)

`[verified]` against `design-tokens.css` + WCAG AA (4.5:1 text / 3:1 large·UI).
- **PASS — body & primary text:** `--ion #D5DDE9` on `--carbon #0D1117` ≈ **11.6:1**; on `--eclipse #11161F` ≈
  **10.5:1**. `--ion-white #F6F7FA` ~15:1.
- **PASS — meta (already remediated):** `--fg-meta`/`--fg-muted` were correctly bumped **ion-2 (#5E6878, 3.05:1 FAIL)
  → ion-1 (#98A3B5, ~6.7:1 PASS)** with an in-file note (`design-tokens.css:123-127`). Good catch; keep it.
- **CAUTION — eyebrow/labels at 11px in `ion-2`:** several components still set 10–11px meta in `text-ion-2`
  (`app/page.tsx:215` hero telemetry labels; calibration axis text). At ~3.05:1 this *fails* AA for sub-large text.
  **Action:** floor all readable meta at `ion-1`; reserve `ion-2`/`ion-3` for decoration only (DESIGN.md already
  says `ion-3` is non-text).
- **PASS — accents on dark:** orbital-cyan `#00E5FF` on carbon ~10:1; plasma `#FF2DD6` on carbon ~6.4:1 (AA for
  large/bold — keep plasma to headings/CTAs/large numerals, *not* 11px body, which the doctrine already says).
- **PASS — on-accent text:** `--plasma-ink #1A0014` on plasma is the specified pairing; `btn-primary` uses it.
- **VERIFY — semantic on tinted chips:** `text-verify`/`text-alert` on their own `/10` tints (pick-card badges)
  are low-contrast small text; confirm ≥4.5:1 or enlarge/bolden.
- **Focus:** global 2px plasma ring present; ensure Tier-B components that override outlines re-apply it.
- **Motion:** reduced-motion fully honored (CSS + JS). PASS.

Net: the *system* is AA-aware and self-documents its fixes; remaining risk is **11px `ion-2` meta** in a handful
of components.

---

## 7. Prioritized design-system roadmap

| P | Item | Surface / file | Why | Done-when |
|---|---|---|---|---|
| **P0** | Token-skin `calibration-panel.tsx` (kill green/red/yellow + gray) | `components/performance/calibration-panel.tsx` | Most credibility-bearing module breaks no-casino-green; unguarded | No raw palette classes; uses verify/alert/ultraviolet/eclipse; typecheck+tests pass (§10) |
| **P0** | Resolve GSN↔GSE name; archive stale `design-system/` palette | `lib/brand.ts`, `design-system/*` | Two palettes + two names = off-brand builds | Single authority documented |
| **P1** | Token-skin `pick-card.tsx` neutrals + add W/L/P/V monogram + weakness line | `components/picks/pick-card.tsx` | Flagship card off-surface + color-only a11y + missing signature element | Token-pure; redundant encoding; PRO+ weakness shown |
| **P1** | Floor readable meta at `ion-1` (kill 11px `ion-2` text) | homepage + perf + cockpit | AA failure at 3.05:1 | No readable text in ion-2/ion-3 |
| **P1** | Extend token-integrity CI to gray/white + perf/cockpit dirs | `__tests__/picks-design-token-integrity.test.ts` | Stop Tier-B regrowth (Polaris/Primer-style gate) | Test covers all customer components |
| **P2** | Extract shared `<CalibrationViz>`; promote to shareable accountability card | `home/` + `performance/` | DRY + competitive moat (public calibration) | One component, three placements |
| **P2** | Repoint Tailwind `confidence/risk` keys to canonical hexes; deprecate numeric `brand/ink/accent` scales | `tailwind.config.ts` | Remove parallel palettes | Keys reference token hexes |
| **P3** | Decide light-mode (Radix paired scale) or document dark-only | `design-tokens.css` | 2026 norm; make it intent | ADR written |
| **P3** | CLV / line-movement micro-viz token set | new | Pre-build for CLV metric | Reuses ladder + glyphs |

---

## 8. Governance flags
1. **Brand name (P0):** GSN (prompt/CI doc) vs GSE (code). Pick one; the code path is the cheaper truth.
2. **Two design systems (P0):** `apps/web/styles/*` (live) vs `design-system/*` (stale palette/README). Declare one
   authority; the YAML in `DESIGN.md` already self-declares the CSS file as canonical — extend that to kill the
   `design-system/` palette drift.
3. **Token-integrity test scope:** currently 3 files; the green/red violation lives *outside* it. Widen before
   re-skinning so the fix is locked in.

---

## 9. Sources
- Shopify Polaris tokens / semantic-alias layer & component tokens — https://polaris-react.shopify.com/design/colors/color-tokens · https://github.com/Shopify/polaris-tokens · https://github.com/Shopify/polaris/discussions/10225
- Design-token primitive/alias good practice — https://goodpractices.design/articles/design-tokens
- Radix Colors 12-step scale (bg/UI/text steps) & one-class dark mode — https://www.radix-ui.com/colors · https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- shadcn/ui + Radix tokens, dark-mode contract (Jan 2026) — https://radixcn.com/ · https://www.figma.com/community/file/1342715840824755935/
- 2026 trust-first / anti-theatrics / fintech-transparency / dark-mode-as-core — https://www.figma.com/resource-library/web-design-trends/ · https://www.eleken.co/blog-posts/modern-fintech-design-guide · https://elements.envato.com/learn/ux-ui-design-trends · https://www.onething.design/post/top-10-fintech-ux-design-practices-2026

---

## 10. THE single highest-leverage SAFE design code improvement

**What:** Re-skin **`apps/web/components/performance/calibration-panel.tsx`** from raw Tailwind palette classes to
GSE design tokens — specifically replace the verdict colors `text-green-400/text-red-400/text-yellow-400/text-gray-400`
and their rings (`border-green-500/40 bg-green-500/5`, etc., in the `VERDICT_META` map `:38-62`) with
**`verify / alert / ultraviolet / ion-1`** tokens, and replace the chrome neutrals (`bg-gray-900`, `border-gray-800`,
`bg-gray-800`, `text-gray-200/500/600`, `from-brand-500 to-brand-400`, `bg-white/70`) with
**`eclipse / mineral / titanium / ion / ion-1 / ion-2`, the `--conf-*` ladder for the observed-rate fill, and
`mineral-hi` for the expected marker.** Add the **W/L-style icon or text cue** to the verdict so it is not
color-only.

**Exact target (illustrative — verify hexes against `design-tokens.css` before writing):**
```tsx
// VERDICT_META — tokens, not casino colors:
improving:          { tone: "text-verify",      ring: "border-verify/40 bg-verify/10" },
inverted:           { tone: "text-alert",        ring: "border-alert/40 bg-alert/10" },
flat:               { tone: "text-ultraviolet",  ring: "border-ultraviolet/40 bg-ultraviolet/10" },
"insufficient-data":{ tone: "text-ion-1",        ring: "border-mineral bg-eclipse/60" },
// section shell:  border-gray-800 → border-mineral; from-gray-900 → from-eclipse;
// reliability bar: from-brand-500 to-brand-400 → bg-conf-strong (or [background:var(--conf-strong)]);
// expected marker: bg-white/70 → bg-mineral-hi ;  meta text-gray-500/600 → text-ion-1 (AA).
```

**Why this one:**
- **Highest brand leverage:** the calibration/discrimination panel *is* the "proof, not promises" wedge
  (`COMPETITIVE_INTELLIGENCE.md` §3). Today it renders the brand's signature claim in the exact **casino green/red**
  the doctrine forbids — fixing it aligns the most-watched trust surface with `DESIGN.md`.
- **Safe by construction:** it is a **component**, not a `*/page.tsx`, so it is **outside** the scope of the
  banned-word / hardcoded-outcome-% scanners (verified: `brand-voice-vocabulary.test.ts` and `picks-page-policy-gate.test.ts`
  read only `app/**/page.tsx`). It changes **no copy, no numbers, no logic** — all values still flow from
  `loadPublicCalibrationReport()` at request time. `[verified]`
- **No JIT/token risk:** `verify`, `alert`, `ultraviolet`, `ion-blue`, `eclipse`, `mineral`, `mineral-hi`, `conf-*`
  all already exist in `tailwind.config.ts` and are used elsewhere, so classes purge correctly. `[verified]`
- **No test breakage / net-positive:** **no existing test scans this file** (verified), so the change can't fail a
  current assertion; it moves the file into compliance with the *same* token contract
  `picks-design-token-integrity.test.ts` already enforces for pick-card.

**How to verify:**
1. `npm run typecheck` — pure className/string edits, types unaffected → passes.
2. `npm run test` — full suite green; spot-run `vitest run performance`/`calibration` to confirm the panel's
   data-driven tests still pass.
3. `npm run lint` — no new classes outside the token set.
4. **Token-integrity guard (recommended companion):** add `components/performance/calibration-panel.tsx` to
   `checkedFiles` in `picks-design-token-integrity.test.ts` and add `gray|white|black` to its banned regex; the
   re-skinned file passes and the casino-green violation can never silently return.
5. Visual: load `/performance` — verdict reads mint/vermilion/UV on `--eclipse`, no green/red SaaS chrome, AA meta.
