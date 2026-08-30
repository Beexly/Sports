# GALAXY 2026 — Public World Doctrine

Single source of truth for the Galaxy Sports Edge (GSE) + Galaxy Sports Network (GSN)
public experience. Future agent runs: read this before touching any public surface.
This document prevents guessing. It does not replace `BRAND_AND_DESIGN_SYSTEM.md` or
`apps/web/lib/brand.ts` — it sits on top of them and governs the *world layer*.

---

## 1. Thesis

> **The market is full of noise. Galaxy turns it into signal.**

Supporting doctrine (all approved, already scanner-safe):

- "The edge is not the pick. The edge is knowing what not to trust."
- "No-Bet is not absence. It is intelligence."
- "Every edge earns a receipt."
- "Sometimes the sharpest pick is no pick."
- "The board is only as smart as the data behind it." *(test-pinned — must remain in `app/page.tsx`)*
- "We detect. You decide." *(canonical closer — `CLOSING_LINE` in `lib/brand.ts`)*

Galaxy is **not a picks site**. It is a sports intelligence operating system with two faces:

- **GSE — Galaxy Sports Edge**: the decision engine. Board, odds, market gravity,
  no-bet gating, evidence trails, decision autopsies, calibration, receipts.
- **GSN — Galaxy Sports Network**: the media intelligence layer. Airwave ledger,
  paraphrased claims, entity tags, review gates, studio briefs, the transmission.

Neither face is bolted on. GSE produces evidence; GSN narrates and audits it.

## 2. Visual language — the metaphor system

Fragmented market inputs **resolve into signal**. Every chapter visual derives from
one grammar:

| Input fragment | Rendered as |
|---|---|
| odds fragments | drifting mono-type shards / dashed strokes |
| public pressure | magenta distortion, gravity-bent lines |
| injury & context | amber flags on nodes |
| media noise | scattered low-opacity text fragments |
| model disagreement | split/forked strokes |
| price movement | gravity lines bending toward a node |

These resolve into five canonical outputs:

| Output | Rendered as |
|---|---|
| signal beam | cyan vertical/convergent beam |
| market map (Galaxy Twin) | node constellation with gravity lines |
| edge window | cyan ring/window around a node |
| no-bet gate | closing aperture / barred ring |
| decision receipt | white-on-dark ledger row with timestamp |

If a visual cannot be traced to this grammar, it is decoration — remove it.

## 3. Palette and semantic color rules

Base tokens already exist (`apps/web/styles/design-tokens.css`, mirrored in
`tailwind.config.ts`). The world layer uses them with **fixed meanings**:

| Color | Token | Meaning — never anything else |
|---|---|---|
| Void black `#050608` | `--void` / `bg-void` | unknown space, market depth |
| Cosmic dark `#0D1117` | `--carbon` | page canvas |
| Deep nebula purple | `--ultraviolet` `#7A5CFF` | model layer, atmospheric depth |
| Electric cyan | `--orbital-cyan` `#00E5FF` | **verified signal, clarity, model alignment** |
| Hot magenta | `--plasma` `#FF2DD6` | **volatility, market heat, public distortion, media noise** |
| Ice white | `--ion-white` `#F6F7FA` | **canonical truth, headlines, final readouts** |
| Amber | `--caution` `#FFB454` | **caution, incomplete data, review needed** |
| Red | `--alert` `#FF6470` | **hard gate, trust failure, stop** |

Usage ratio: ~80% void/nebula dark, ~10% cyan, ~6% magenta, ~3% white, ~1% amber/red.

**Energi pass (poster-grade pop, readability intact):**

- Backgrounds are *purple-forward nebula*, never flat black — `gw-nebula` /
  `gw-nebula-deep` carry visible ultraviolet/magenta atmosphere; text sits on
  the darker wells so AA holds.
- Identity chips and key callouts are **solid saturated fills with dark ink**
  (`gw-chip-cyan`, `gw-chip-plasma`) — higher contrast than dim outline tints.
- Headline *accent words* (never prose, never more than a few words) may use
  chrome gradients (`gw-chrome-ice`, `gw-chrome-plasma`, `gw-chrome-violet`)
  and text glow (`gw-text-glow-*`). One chrome treatment per headline max.
- Magenta is a visual co-lead in atmosphere and accents, but its *meaning*
  never changes: heat/distortion/volatility. Don't use it to mark good news.

Hard rules:

- Cyan never marks danger. Magenta never marks confirmation. Amber/red are rare.
- No raw Tailwind palette classes (`text-cyan-400`, `bg-gray-800`…) on public pages —
  tests enforce this on `page.tsx`, methodology, and risk-disclosure.
- Long prose is `--ion` / `--ion-1` only. Accents are highlights, never paragraphs.
- No neon soup: max two accent hues active in a single viewport-height region.
- No gray-on-gray SaaS wash: every section sits on void/nebula atmosphere, not flat panels.

## 4. Motion doctrine

Motion must explain **signal, risk, trust, market gravity, or decision quality** —
otherwise delete it.

- Primitives: `Reveal`/`Stagger` (`components/motion/reveal.tsx`) for scroll entrances;
  `gw-*` utilities (`app/globals.css`) for world-specific motion (drift, beam,
  gate, orbit). CSS-only; no animation library.
- Every animated element either honors `prefers-reduced-motion` via the global
  guard in `globals.css` or renders a meaningful static state.
- Essential content is never animation-gated: text and CTAs are readable with
  all animation disabled.
- Hover motion ≤ 200ms; ambient motion ≥ 8s loops, low amplitude. Nothing flickers.
- The `CinematicEntrance` is the only full-screen takeover. Never add a second.

## 5. World modules (public IA)

| Module | Route | Role |
|---|---|---|
| Galaxy Twin / Market Observatory | `/observatory` (preview on home) | the slate as a living market map |
| Board | `/board` | published + gated rows, the live decision surface |
| Signal Lab / Trend Lab | `/trends` | statistically defensible trend mining |
| No-Bet Gate | board gating + home chapter | restraint as a first-class output |
| Decision Autopsy | `/performance/losses` | losses dissected in public |
| Parlay MRI | `/parlay-mri` | correlation and stacked-risk education |
| GSN / Airwave Studio | `/gsn`, `/airwave` | media noise → graded record → studio briefs |
| Academy | `/academy` | process training, graded on decision quality |
| Receipts Ledger | `/performance`, `/vault`, `/ledger` | calibration, history, accountability |
| Cost of Noise calculator | home chapter | interactive decision-quality education |

## 6. Homepage chapter architecture

`app/page.tsx` is a journey, not a stack. Order is doctrine:

1. **Hero — the world opens.** GSE/GSN identity, thesis headline, trust-safe subcopy,
   live board-state telemetry (real data, honest empty states), aurora + starfield.
2. **Galaxy Twin.** Illustrative market-map schematic: nodes, gravity, pressure
   distortion, edge window, no-bet gate. Labeled "illustrative system schematic".
3. **Signal vs noise.** Fragment field resolving into a beam + the real telemetry
   panels (ten-second product test — test-pinned).
4. **Market Mirage.** A popular-looking pick degrading as risk layers reveal.
5. **No-Bet Gate.** Heroic restraint + the real scored/published/gated lanes.
6. **Decision Autopsy.** Evidence-trail preview → `/performance/losses`.
7. **Parlay MRI.** Stacked-risk preview → `/parlay-mri`.
8. **GSN / Airwave.** Noise → paraphrase → tags → review gate → studio brief.
   Never claim live SiriusXM/scraper capture.
9. **Cost of Noise calculator.** Educational, no profit math.
10. **Receipts.** Source health ledger, trend targets, methodology, responsible close.

Test-pinned content (strings, loaders, testids) listed in §10 must stay in
`page.tsx` *source* — components don't satisfy source-level scans.

## 7. GSE story / GSN story

**GSE** speaks in receipts: every public row shows its inputs, freshness, and gate
status. The empty board is presented as discipline, not failure. Calibration and
losses are public. The conversion promise is *decision quality*, never outcomes.

**GSN** speaks in records: pundit claims are paraphrased, timestamped, entity-tagged,
human-review-gated, then graded. GSN is the narrative layer of the same evidence
engine — show prep, studio briefs, the transmission. Until live capture is licensed
and wired, all Airwave personas/claims are labeled illustrative.

## 8. Trust-safe copy rules

- Registry: `apps/web/lib/trust-claims.ts` is law. Banned (enforced by tests):
  "guaranteed", bare "lock", "sure thing", "risk-free", "easy money", "can't lose",
  "verified track record", "thousands of bettors", "trusted by serious bettors".
- Also avoid: "beat the books", "AI predicts every winner", bare "track record"
  (brand-voice test), fake testimonials, fake performance, fake live odds,
  invented matchups/teams on the homepage.
- Every illustrative visual carries an explicit "illustrative" label.
- Responsible-play helpline (`HELPLINE` in `lib/brand.ts`) stays in the footer;
  the responsible close (`homepage-responsible-close`) stays on the homepage.

## 9. Reduced-motion & accessibility rules

- Global `prefers-reduced-motion` kill-switch in `globals.css` stays. New `gw-*`
  animations must also be listed in the reduced-motion overrides there.
- Entrance: skippable (button + Escape), focus-managed, scroll-locked, sr-announced,
  bypassable via `#enter` / `?intro=skip`. Never trap the user.
- Focus: `:focus-visible` outline from tokens on all interactive elements.
- Contrast: text tokens are WCAG-AA verified on carbon/eclipse — don't invent
  new text colors below `--ion-1`.
- Calculator and all chapters fully keyboard-operable (native inputs/buttons only).

## 10. Test-pinned homepage contract (do not remove from `app/page.tsx`)

Strings: "The board is only as smart as the data behind it.", "No public pick or
projection appears unless the", "Board state", "Ten-second product test",
"Source health", "context feeds", "licensed reporting", "Today&apos;s lanes",
"First trend targets", "Trend Lab", "Open Trend Lab", "Real NFL rows",
"No public rows yet", "No active scoring rows.", "No public pick has cleared.",
"Rows stay empty instead of blocking the experience or inventing data.",
"Trend engine is ready; observations are waiting on live intake writes.",
"Demo data suppressed", "The math can point. The decision stays yours.",
`data-testid="homepage-responsible-close"`.

Identifiers: `loadBoardState`, `loadBoardPasses`, `loadTrendWorkbench`,
`loadNflverseUsagePulse`, `loadPublicCalibrationReport`, `PUBLIC_DATA_SOURCES`,
`CONTEXT_INTELLIGENCE_SOURCES`, `DATA_SOURCE_STACK`, `TREND_BACKLOG`,
`suppressedDemoData`, `state.scoringNow`, `state.publishedToday`,
`state.gatedTodayRows`, `sportsWatched`, `booksPolled`, `openPicks`, `lastRefresh`,
`MethodologySection`, `RiskDisclosure`, `includePastPerformance`, `font-numerals`.

Class requirements: `bg-carbon`, `bg-eclipse`, `border-mineral`, `text-orbital-cyan`,
`text-ion-white` present; **no** `(text|bg|border)-(gray|cyan|pink|green|yellow|emerald|orange)-N`.

Forbidden: `FALLBACK_PICKS`, `TESTIMONIALS`, `AnnotatedSampleSignal`,
`sample-data-banner-home`, `StackSection`, `ThreeQuestions`, `LiveStateStrip`,
"Gate Cam", "Three questions", "SEA -1.5", real team names as fixtures.

## 10.5 Owner doctrine — 2026-06-11 notes (overrides anything above that conflicts)

Direct from the owner's review notes; these are LAW for public surfaces:

- **Don't show our hand.** No vendor/connector/API names on the front of the
  tool (homepage, nav, footer, hub/landing pages, page metadata). Public
  surfaces render `publicLabel` capability codenames from
  `lib/data-sources/catalog.ts` ("Play-by-play substrate", "Market pricing
  mesh", "League sync bridge"). Real names + license attribution live ONLY on
  the deeper `/integrations` and `/nflverse` pages — that is the strategic
  compliance placement (nflverse CC BY-SA attribution stays there, always).
- **The funnel.** A FEW proprietary doors: Board, Player Lab, Intelligence
  Engines (one condensed menu), the Fantasy tools, the optimizers.
  **Contests is standalone** (own top-level door — big market). **The Beat**
  is the casual-browse surface and visibly feeds our scores. **The Academy**
  is semi-standalone.
- **Airwave and Studio are internal.** Never linked from public nav/footer.
  They live in the cockpit lineage; routes stay reachable for the operator.
- **Voice.** First person plural — "we", "we at GSN". The word "AI" does not
  appear on public surfaces; we say "the engine", "our models", "the desk".
  Required legal/responsible-play disclosures are never weakened.
- **No grey.** Surface tokens are violet-shifted (carbon `#100D1D`, eclipse
  `#171228`, titanium `#211A33`, mineral `#3B3158`, mineral-hi `#4D4175`) —
  panels sit in the nebula, not in SaaS grey. Keep luminance when adjusting.
- **Beex Weekly.** The weekly podcast is Beex's voice on the record:
  `lib/gsn/beex-weekly.ts` drafts the script from real transmissions; owner
  approval + voice consent are hard gates; there is no autonomous publish.

## 11. Forbidden patterns

- Fake live data, fake counts, fake testimonials, fake performance, fake urgency.
- Claiming live SiriusXM/Airwave capture or scraping of protected sources.
- Frontend-only gating of anything trust-related.
- Generic SaaS hero ("data-driven picks", feature-card grids as the lead).
- Neon clutter; animation without explanatory purpose; second full-screen takeover.
- New dependencies / package-lock changes for visual work.

## 12. QA checklist (run before shipping public-world changes)

- [ ] `npx tsc --noEmit` clean in `apps/web`
- [ ] Targeted vitest: `homepage-*`, `home-signal-anatomy`, `data-first-public-surfaces`,
      `sample-mode-ui`, `public-copy-scan-strong`, `brand-voice-vocabulary`,
      `critical-routes-shape`, `trust-claims`
- [ ] Reduced motion: every chapter readable, entrance instant-skips
- [ ] Keyboard: skip intro, calculator, all CTAs reachable; focus visible
- [ ] Mobile first screen: thesis + CTA visible without scroll; no horizontal overflow
- [ ] No console hydration warnings on `/`
- [ ] Empty-data state (no DB) still reads as a designed, honest state
- [ ] package-lock.json untouched
