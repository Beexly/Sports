# Aesthetic & Design-System Audit — 2026-06-09

**Lens:** Aesthetic + design system (visual consistency, design tokens, redesign goals, motion, dark-theme integrity, responsive layout, typographic hierarchy, AI-tic patterns).
**Clones audited:** DEPLOY = `C:/Users/Garrett/Sports` · CANONICAL = `C:/Users/Garrett/Sports-canonical-2026-06-03`.
**Method:** read of `styles/*`, `tailwind.config.ts`, `app/globals.css`, `app/page.tsx`, `components/ui/*`, `components/motion/*`, `components/landing/cinematic-entrance.tsx` in BOTH clones, plus grep-based density metrics. Read-only.

---

## Grade: **B-** (CANONICAL: A- / DEPLOY: C+) — the design SYSTEM is excellent; the SHIPPING clone barely uses it.

**Verdict.** This is a genuinely strong, opinionated design system — and an honest two-system problem. CANONICAL is an A-grade aesthetic: a mature, WCAG-AA-documented token architecture (unified `--surface-*` dark scale, additive `--paper-*` light scale for data, softened cyan, a full `--data-*` viz palette), a tasteful cinematic layer (film grain, vignette, reduced-motion-safe entrance), and the redesign goals are real and shipped (GSE-Rating-led hero, reveal-less, JSON demoted to ghost pills, footer present). CANONICAL's token migration is essentially complete — only **36** raw `gray-*/white` occurrences remain, nearly all legitimate. DEPLOY — the launch target — is a different, older system: its `app/page.tsx` is built entirely on raw `bg-gray-950 / text-gray-100 / border-gray-800 / bg-pink-300`, it has **1696** raw-neutral occurrences, no Reveal motion, no cinematic entrance, no atmosphere grain, no surface tokens (the Tailwind config doesn't even define `surface-*`), and a different, weaker hero ("We're not AI. We're math you can read."). The two design-token CSS files share a header and lineage but have diverged by ~3 weeks of work that never reached deploy. The single biggest aesthetic risk is that **what you launch is not the design you matured.** Secondary issues, present even in CANONICAL: AI-tic copy density ("X, not Y" appears 106×, em-dash 1002×, eyebrow on 42 files), and a cinematic-entrance component that hardcodes hex colors instead of tokens.

---

## Findings by severity

### P0 — launch-blocking / correctness

**[P0] DEPLOY ships the OLD design system; the matured redesign lives only in CANONICAL.**
Clone: **both** (the gap itself).
Evidence:
- DEPLOY `apps/web/app/page.tsx:55` root is `className="min-h-screen w-full overflow-x-hidden bg-gray-950 text-gray-100"`; every section uses raw Tailwind neutrals (`border-gray-800`, `bg-gray-900/55` at :109, `bg-pink-300` calibration dots at :232, `bg-cyan-300` CTA at :132). No `Reveal`, no `CinematicEntrance`, no `Atmosphere`, no surface/ion tokens.
- CANONICAL `apps/web/app/page.tsx:58` root is `bg-surface-base text-ion-white`; sections use `border-surface-line`, `text-orbital-cyan`, `text-ion-1/ion-2`, `bg-eclipse/80`, `rounded-ds-md`, `btn-primary`, `font-display text-display-xl`, wrapped in `<Reveal>` (`:84,89,94`), preceded by `<CinematicEntrance/>` (`:62`) and `<Atmosphere/>` (`:63`).
- Raw-neutral occurrence count (grep `(bg|text|border)-(gray|zinc|slate|neutral)-\d{2,3}|bg-white|text-white` over `app+components`): **DEPLOY 1696** vs **CANONICAL 36**.
Recommendation: **Founder decision required.** Decide whether DEPLOY is meant to remain a deliberately narrower/simpler product (in which case the token system should still be ported so it shares the brand), or whether the CANONICAL aesthetic should be promoted to the launch target before go-live. Do not launch assuming the polished screens you have been reviewing are what users will see — verify which `page.tsx` is actually deployed. This is a process/scope call, not an autonomous flip.

**[P0] DEPLOY Tailwind config is missing the `surface-*` scale entirely — token classes would silently no-op.**
Clone: **deploy**.
Evidence: `apps/web/tailwind.config.ts` (deploy) grep for `surface` returns **NONE**. It defines `orbital-cyan`, `ion-white`, `ion`, `eclipse`, `mineral`, `rounded-ds-*` (`:40-199`) but no `surface.base/raised/sunken/overlay/line`. CANONICAL `tailwind.config.ts:62-69` defines the full `surface` object plus `paper` (`:101-105`), `data-good/bad` fills, `accent-cyan` (softened, `:130`), and `ink` light scale (`:196-198`). So if deploy code were updated to `bg-surface-base` it would render unstyled.
Recommendation: If the token system is ported to deploy (per the finding above), port the Tailwind config first so the classes resolve. Treat the two configs as needing a one-way sync from CANONICAL → DEPLOY.

### P1 — important (quality / trust / brand)

**[P1] Design-token CSS has materially diverged; CANONICAL has the AA-audited, consolidated version.**
Clone: **both**.
Evidence: `styles/design-tokens.css` — DEPLOY 320 lines (dated May 21), CANONICAL 399 lines (Jun 8). CANONICAL adds: the unified `--surface-*` ladder consolidating "three competing near-blacks" (`:24-41`), the additive `--paper-*` light data scale with documented contrast ratios (`:60-75`), accent-on-light AA variants (`:73-75`), the **softened working cyan** `--accent-cyan: #2BC4DD` replacing the eye-straining full-saturation `#00E5FF` and reserving the pure value for "1 CTA / screen" (`:90-99`), the `--data-*` viz palette (`:156-171`), and explicit WCAG-AA re-valuations of `--ion-2`/`--ion-3` (`:50-58`). DEPLOY still has `--ion-blue: #00E5FF` as the live accent (`:45`) and `--ion-2: #5E6878` (the value CANONICAL flagged as a 3.36:1 AA FAIL).
Recommendation: Sync the CANONICAL token file to DEPLOY. The AA fixes in particular (`--ion-2`, `--ion-3`, eyebrow 11→12px floor) are accessibility regressions that exist in the launch clone today.

**[P1] AI-tic copy: the "X, not Y" antithesis construction is pervasive.**
Clone: **both** (worse in canonical by volume).
Evidence: grep `, not <lowercase>` over `app+components` tsx — **DEPLOY 24**, **CANONICAL 106**. Samples: `app/page.tsx:313` "sportsbook research, not sportsbook hype"; `app/page.tsx:125` "We're not AI. We're math you can read."; `components/ui/footer.tsx:50` "calibrated market signals, not certainty"; `components/ui/methodology-section.tsx:51` "gated, not advertised". Many are genuinely load-bearing compliance lines ("Variance is described, not hidden") — but stacked at this density the construction reads as a verbal tic, the single most recognizable "AI wrote this" pattern.
Recommendation: Keep the compliance-critical ones; rewrite ~half of the rest into plain declaratives. Target: no more than one "X, not Y" per page/section. This is a copy pass, not a code change.

**[P1] Em-dash overload in user-facing copy.**
Clone: **both**.
Evidence: literal `—` count in tsx — **DEPLOY 246**, **CANONICAL 1002**. Combined with the antithesis pattern, this is the second classic AI-prose signature.
Recommendation: Audit visible-copy em-dashes (component comments are fine). Convert many to periods or commas; reserve the em-dash for genuine interruptions. A linter rule capping em-dashes per string would prevent regression.

**[P1] "Eyebrow on everything" — the mono-uppercase kicker is on nearly every section and card.**
Clone: **both**.
Evidence: files referencing `eyebrow` — DEPLOY 16, CANONICAL 42. On CANONICAL `app/page.tsx` alone there are **12** `uppercase tracking-[0.1…]` eyebrow labels (one above every section heading AND inside cards: `:85,120,127,168,236,261,303,…`). `app/board/page.tsx` has 5, `app/intelligence/page.tsx` 7. A shared `Eyebrow` primitive exists (`components/ui/eyebrow.tsx`) but its own docstring notes the inline string still lives "in PageHero and dozens of page headers" — adoption is incomplete, so the tic is also a consistency problem.
Recommendation: Demote the eyebrow from a default to a deliberate accent — use it for the top-of-page kicker, not on every card and sub-section. Finish migrating inline strings to the `Eyebrow` component so density can be controlled in one place.

**[P1] Off-palette `yellow-*` and `slate-*` leak into CANONICAL cockpit/operator surfaces.**
Clone: **canonical**.
Evidence: `app/cockpit/journal/new/journal-new-form.tsx:281` `bg-yellow-400 … text-gray-950`; `app/cockpit/journal/page.tsx:130` same yellow button; `app/cockpit/journal/page.tsx:15`, `losses/page.tsx:48`, `market-twin/page.tsx:74`, `studio/studio-workspace.tsx:57` all use `border-slate-500/40 bg-slate-500/10 text-slate-300` status pills. Yellow/gold was explicitly deprecated from the system (`design-tokens.css:73-84` "gold / amber removed"), so these are off-brand.
Recommendation: Replace yellow CTAs with `btn-primary` (plasma) or `bg-orbital-cyan/10`; map the slate status pills onto the `--data-*`/`verify`/`alert` tokens. Operator-only pages, so P1 not P0, but they're inconsistencies inside the "clean" clone.

### P2 — worth doing

**[P2] CinematicEntrance hardcodes hex instead of tokens — a consistency gap inside the flagship motion piece.**
Clone: **canonical**.
Evidence: `components/landing/cinematic-entrance.tsx:73-78` defines `toneColor` as literal `#22d3ee / #f472b6 / #a78bfa / #f0f4ff`, and the whole file repeats inline `"#22d3ee"`, `"#060912"`, `"#1A1D23"` (`:191,207,283,296,355,388,…`). These approximate but don't equal the token values (`--orbital-cyan` resolves to the softened `#2BC4DD`; `--plasma` is `#FF2DD6` not `#f472b6`). So the cold-open uses a slightly different palette than the rest of the site.
Recommendation: Replace the hex literals with `var(--orbital-cyan)`, `var(--plasma)`, `var(--ultraviolet)`, `var(--void)`. Low risk; tightens brand coherence at the most-watched first impression.

**[P2] The well-built `Reveal` motion primitive is unused in DEPLOY.**
Clone: **deploy**.
Evidence: `components/motion/reveal.tsx` is byte-identical across clones (IntersectionObserver, reduced-motion-safe, fires once). CANONICAL imports it throughout `page.tsx`; DEPLOY's `page.tsx` imports nothing from `components/motion/*`. Dead capability in the launch clone — sections appear with no entrance, flattening the "motion as identity" redesign goal.
Recommendation: If deploy stays its own product, either wire `Reveal` into key sections or remove the unused dir to avoid drift. Tied to the P0 scope decision.

**[P2] `marquee`, `nav`, `footer` differ across clones — shared "kit" components have drifted.**
Clone: **both**.
Evidence: `diff` shows `components/motion/marquee.tsx`, `components/ui/nav.tsx`, `components/ui/footer.tsx` all DIFFERENT between clones (footer 103 vs 118 lines). `reveal.tsx` and `signature-grid.tsx` are identical. So the "shared kit" is partially shared, partially forked.
Recommendation: Pick a source of truth (CANONICAL) for each shared primitive and reconcile. Even if the products differ, the brand chrome (nav, footer) should not.

### P3 — minor / polish

**[P3] Google OAuth button is intentionally white-on-light — correct, but flag it so future token sweeps don't "fix" it.**
Clone: **canonical**. Evidence: `app/auth/signin/page.tsx:76` `bg-white … text-gray-900` — Google brand guidelines require this; it's one of the legitimate 36 raw-neutral hits. Recommendation: add an allowlist comment so it survives audits.

**[P3] Skip-link uses `bg-white text-black`.**
Clone: **canonical**. Evidence: `app/layout.tsx:217` focus skip-link. Fine for max-contrast a11y; could use `bg-ion-white text-void` to stay on-token. Cosmetic.

---

## Strengths (real, grounded)

- **The token architecture (CANONICAL) is genuinely senior work.** One canonical black consolidated from three competing near-blacks, an additive light `--paper-*` scale so dense data tables read like a spreadsheet without abandoning the dark brand, every text token annotated with its measured contrast ratio, and a deliberate "softened cyan for surfaces, pure cyan for one CTA per screen" discipline (`design-tokens.css:24-99`, `tailwind.config.ts:54-198`). This is the strongest part of the whole product aesthetically.
- **Reduced-motion safety is layered and real.** A global `@layer base` reset zeroes all animations (`globals.css:50`), the `Reveal` primitive checks `prefers-reduced-motion` and renders content immediately (`reveal.tsx:83-114`), the `CinematicEntrance` branches to a static identity with no flashing (`cinematic-entrance.tsx:103,121-126`), and per-effect `@media (prefers-reduced-motion)` blocks neutralize grain/sheen/marquee/enter-ring (`globals.css:295-298,360-364`). Three independent layers — well above typical.
- **The cinematic entrance is tasteful AND honest.** `role="dialog"` + `aria-modal`, focus-managed Skip, Escape-to-skip, scroll lock, polite live region, localStorage so it plays long once then ~3s on return (`cinematic-entrance.tsx:99-159`). Crucially it labels every numeral as an "illustrative system trace" and its memorable lines are the brand's honest philosophy ("CONFIDENCE IS NOT EVIDENCE") — no fake odds presented as real (`:19-24,266,613`). This respects the no-fabrication posture.
- **The JSON-button demotion goal is fully met (CANONICAL).** `json-raw-actions.tsx` never renders raw JSON into the DOM; it's two neutral secondary pills that lazily serialize on click, with honest failure handling if the clipboard is blocked (`:36-100`). Exactly the "demote the JSON button" intent, executed cleanly.
- **The atmosphere/grain layer is correct chrome.** `atmosphere.tsx` + the `gse-grain/gse-vignette/gse-scanlines` CSS are `pointer-events-none` + `aria-hidden`, whisper opacity, reduced-motion-aware (`globals.css:304-364`) — depth without harming the a11y tree or interaction.
- **The footer redesign goal is met in BOTH clones.** DEPLOY's `footer.tsx` is a real four-column footer with an ambient wordmark, a dedicated Responsible-gaming column, social, and a limits-first disclaimer (`:36-82`, styled via `pickpilot-kit.css` `.footer*`). Not a stub.
- **Responsive layout is considered (CANONICAL).** The home hero uses asymmetric content grids (`lg:grid-cols-[1.02fr_0.98fr]`, `[0.9fr_1.1fr]`, `[1fr_1fr]`) with proper `sm:`/`lg:` breakpoints and `grid-cols-2 sm:grid-cols-4` metric rows (`page.tsx:82,131,165,259`).
- **Typographic system is rich and intentional.** Layered type roles (`--t-arch-*`, `--t-display-*`, `--t-num-*`, `--t-edit-*`), tabular numerals for data, an editorial Instrument-Serif italic accent against the geometric display face as the "designed" signal (`globals.css:351-358`, `design-tokens.css:179-220`).

---

## What would move this from B- to A

1. **Resolve the two-system split (the A-blocker).** Make a founder call on whether DEPLOY is a deliberately simpler product or should inherit the CANONICAL aesthetic. Either way, port the CANONICAL `design-tokens.css` + `tailwind.config.ts` (surface/paper/data/softened-cyan/AA fixes) into DEPLOY so both clones share ONE token system and the launch clone gets the accessibility fixes. Today the polished design you review is not the design you ship.
2. **Run an AI-tic copy pass.** Cap "X, not Y" at ~1 per page (keep compliance lines), halve visible-copy em-dashes, and demote the eyebrow from default-on-everything to a deliberate per-page kicker. Add lint guards so it doesn't regress. This is the difference between "obviously AI-written" and "a real brand voice."
3. **Finish the shared-primitive consolidation.** One source of truth for `nav`, `footer`, `marquee`, and the inline `eyebrow` string → the `Eyebrow` component. Tokenize the `CinematicEntrance` hex literals and clean the cockpit `yellow-*`/`slate-*` leaks so even the internal surfaces are 100% on-palette.
4. **Prove it visually.** Once synced, capture both clones' home + one data page at mobile/desktop with normal and reduced-motion, confirm AA on the re-valued tokens, and attach to this audit. (Out of scope for this read-only pass; flagged as the verification step.)

---

### Note (cross-lens, flagged not owned)
CANONICAL's own `BRAND_AND_DESIGN_SYSTEM.md` flags a **P0 brand-naming split** (GSN vs GSE; code source-of-truth is "Galaxy Sports Edge", `lib/brand.ts:16`). That's brand governance, not aesthetics, but it touches every wordmark — defer to the brand/process lens.
