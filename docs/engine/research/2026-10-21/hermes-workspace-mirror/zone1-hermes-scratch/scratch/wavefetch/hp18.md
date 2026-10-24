# Claude Design brief — Galaxy Sports Edge front-end redesign (2026-09-09)

Paste everything below the line into Claude Design as the opening prompt. It is grounded in the
repo: banned phrases from `docs/positioning.md`, the current token names from
`apps/web/tailwind.config.ts`, the route map from the live footer, the user-pain list from
`GSE_BLUEPRINT.md §5`, and the trust surfaces that are already live in production.

---

You are the lead product designer for Galaxy Sports Edge (galaxysportsedge.com), and you are
redesigning the entire public front end. Read this whole brief before drawing anything. The output
is a complete design system plus the key screens, at the fidelity of a shipping product, not a
moodboard.

## 1. What this product is, in one paragraph you must internalize

Galaxy Sports Edge is a sports picks and market-intelligence platform whose entire premise is that it
does not lie about its own performance. Positioning line, verbatim and non-negotiable: "We're not AI.
We're math you can read." Every pick is a deterministic statistical model output (a factor model with a
published factor breakdown), priced against real sportsbook lines, sealed with a cryptographic receipt
at generation time, graded automatically, and published win or lose. When our own calibration falls
below the floor we set for ourselves, the site takes the curve down automatically, and it did exactly
that at 02:08 UTC today. No competitor in a 309-company survey does any of this. The design must make
that ethic visible in every pixel: calm, precise, verifiable, never hype.

## 2. Why we are redesigning (the founder's words, and what they mean)

"It's confusing, the graphics are bad, the colors are bad, the copy still sounds like AI, it is not
convenient, there is no accessibility, and I refuse to ship something that looks like this."

Translate that into the five failures to fix:
1. Information architecture. 236 pages under three footer columns with no hierarchy. A first-time
   visitor cannot tell what to do first.
2. Visual identity. The current palette is neon on black: `orbital-cyan #00E5FF`, `ion-magenta #FF38C7`,
   `soft-ultraviolet #7B61FF` on `obsidian #05070B`, with names like "nebula" and "plasma". It reads as
   a crypto dashboard, not as the most trustworthy record in sports. Replace it.
3. Copy voice. Text reads machine-written: stacked adjectives, "unlock/transform/level up" energy,
   slogans in every card. Rewrite to plain, specific, human English.
4. Convenience. The two things a user comes for, today's board and the record, are not one tap away on
   mobile, and the price of the product is not obvious.
5. Accessibility. No documented WCAG conformance, contrast failures in the dark theme, focus states
   missing, icon-only controls without names, motion without a reduced-motion path.

## 3. Audience

- Primary: US adults who follow NFL, college football, MLB and NBA and want a straight answer to "what
  does the market say and where is the model's edge," without a tout's hype. Phone first, game-day
  evenings, often one-handed.
- Secondary: skeptics and analysts who will click "verify this receipt" and recompute a hash. Design
  for them explicitly; they are the word of mouth.
- Tertiary: AI agents and crawlers. The site ships llms.txt, an OpenAPI spec and a public proof API.
  Pages must be semantic HTML with real headings and tables, not divs pretending.
- All ages. The site does not take bets or money for wagers, so there is no age gate. Responsible-play
  links and the 1-800-GAMBLER line stay on every page footer.

## 4. Information architecture (design this first)

Collapse 236 pages into five top-level destinations and one utility rail. Every existing route maps
into one of these; nothing is deleted, but only these appear in primary navigation.

1. **Today** (`/picks`, `/board`): the live board. Every fixture in the window with the real book
   line, the model's edge where one exists, and an explicit "no edge published" state where it does
   not. Filters: sport, market (moneyline, spread, total), time. Free users see two picks a day and
   every line; the rest is server-gated, so the design must have a truthful locked state, never a blur
   that pretends the number is there.
2. **Record** (`/performance`, `/calibration`, `/clv`, `/proof`, `/ledger`, `/verify`,
   `/accountability`, `/performance/losses`, `/kill-ledger`): the public track record. This is the
   product's reason to exist. One page, one scroll: settled picks, the calibration curve, closing-line
   value, the loss autopsies, and the proof-of-record hash, each with a "how this is measured" drawer.
   It must render honestly in three states: measured and published, measured but not yet eligible
   (show the curve and the numbers with the gap to the floor named), and not enough data (dark, with
   the count still needed).
3. **How it works** (`/methodology`, `/engine`, `/integrity`, `/data`, `/how-we-make-money`,
   `/pledge`, `/fable`, `/academy`, `/tools`): the factor model explained in plain English with the
   factor breakdown of a real pick, the data sources and their rights status, the pricing ladder and
   why it is proof-gated, the free calculators.
4. **Fantasy** (`/fantasy/*`, `/house`, `/fantasy/lineup`, `/fantasy/studio`): projections,
   start-sit, draft tools, on nflverse-graded data.
5. **Stats** (`/stats`, `/mlb`, `/nhl`, `/weather`, `/trends`, `/observatory`, `/parlay-mri`,
   `/the-beat`, `/newsletter`, `/podcast`): StatKing facts, weather, trends, media.

Utility rail: Pricing, Sign in, Account, Search. Pricing shows the founding ladder exactly as coded:
Fantasy $4.99/mo or $49/yr, Pro $14.99/mo or $99/yr, Elite $24.99/mo or $179/yr, founding members
grandfathered for life, step-ups named in advance and triggered only by published proof. No fake
"was $X" strikethroughs.

Deliver a sitemap diagram and a mobile navigation pattern (bottom tab bar for the five destinations,
utility in a sheet).

## 5. Visual identity

Design principle: **an instrument, not a casino.** Reference the feel of a well-made measurement
tool or a broadsheet's data desk: generous whitespace, strong typographic hierarchy, restrained
color used only for meaning, real tables, real charts with axes and units.

- **Themes**: light and dark, both first-class, both meeting WCAG 2.2 AA on every token pair. Provide
  the full token set as CSS variables with the semantic roles below, plus the hex values, plus the
  measured contrast ratio for every foreground/background pair you use.
- **Semantic color roles** (keep these names so engineering can map them to the existing
  `bg-paper-raised / border-paper-border / *-on-light` structure): surface, surface-raised,
  surface-sunken, hairline, text, text-muted, accent (one brand hue, used sparingly), positive
  (win, verified), negative (loss, void), caution (stale, degraded), info, focus-ring. One accent hue,
  not three. Derive the brand from the receipt and the record, not from space imagery. The name
  "Galaxy" can live in the wordmark without neon nebulae anywhere else.
- **Typography**: one text family with true italics and tabular numerals, one mono for hashes,
  receipts, lines and odds. Type scale with a 16px minimum body on mobile, 1.5 line height, measure
  of 60 to 75 characters for prose. Numbers align in tables. Odds are typeset consistently
  (American odds with sign, lines with half-points).
- **Data visualization**: one chart system. Reliability diagram with the diagonal, bins and n per bin
  visible; CLV distribution; line-movement sparkline; factor breakdown as a horizontal bar chart with
  the factor names in words. Every chart has a title that states the claim, axis labels with units,
  the sample size, and the timestamp of the data. Never a chart without n.
- **Imagery**: no stock photos, no AI-generated art, no planets. Iconography is a single consistent
  outline set. Team identity through abbreviation and a small color chip, never logo-dependent.
- **Motion**: purposeful only (state change, live update). Everything respects
  `prefers-reduced-motion`. No auto-playing intro. No "replay intro" link.

## 6. Copy voice (rewrite every string you touch)

Rules the whole site already lives under, from `docs/positioning.md` and the copy deck:
- Never: AI-powered, AI-driven, AI-assisted, machine learning (when describing the engine), "our
  AI," Mission Control, ecosystem, transform, unlock your, level up, your edge starts here, pick card,
  VIP card, first-person algorithm voice ("I think"), personified model language, any certainty
  language about outcomes, guaranteed, lock, sure thing, risk-free, free money, insider.
- Always: say what was measured, on how many, as of when. "MLB moneylines, 379 settled, calibration
  error 0.052 against our 0.050 floor, measured 02:08 UTC" beats "elite calibration."
- Human, not synthetic: short declarative sentences, contractions allowed, one idea per sentence, no
  stacked adjectives, no colon-headline pairs, no em-dashes, no rhetorical questions, no "not X, but
  Y" constructions, no closing slogans. Reading level: a motivated 15-year-old can follow it.
- Honesty is the brand: wherever a number is withheld, the UI says why and what would change it.
  "Calibration is measured but not yet eligible for publication: 0.052 vs 0.050 floor, streak 0 of 3
  green runs" is a feature, not an apology.
- Provide a voice guide of 15 before/after pairs drawn from the live site, and rewrite the home page,
  the board empty and locked states, the record page, the pricing page and the methodology page in
  full.

## 7. Accessibility, as a specification you deliver, not a promise

- WCAG 2.2 AA across both themes: contrast 4.5:1 text, 3:1 UI and graphics, visible focus on every
  interactive element (2px ring, offset, in the focus-ring token), target size 24×24 minimum,
  44×44 on mobile primary actions.
- Keyboard: every flow completable without a mouse; skip link; logical tab order; no keyboard traps in
  drawers and sheets.
- Screen readers: landmarks, one h1 per page, headings in order, tables with headers and captions,
  charts with a text alternative that states the same claim and numbers, live regions for score and
  line updates, names on icon-only controls.
- Color is never the only carrier of meaning: win/loss/void also differ by glyph and label; stale data
  has a text badge, not only a tint.
- Motion: reduced-motion variants for every animation; no parallax; no flashing.
- Forms: labels always visible, errors in text next to the field, no placeholder-as-label.
- Deliver an accessibility checklist per screen and an annotated example of the board and the record
  page with landmarks, headings and focus order marked.

## 8. Screens to deliver (mobile 390px and desktop 1280px for each)

1. Home: one screen that answers "what is this, what is today's board, what is the record, what does
   it cost," with the receipt-verification demo one tap away ("Don't trust us. Recompute our hash.").
2. Today (board): full slate; a pick row with book line, model edge, confidence shown as a ranking
   score and explicitly not a probability; the three states: edge published, no edge, locked.
3. Pick detail: the factor breakdown, the line history, the receipt hash with a verify button, the
   grade after settlement, the loss autopsy when it lost.
4. Record: the three states described in §4.2.
5. Verify a receipt: paste a hash or pick id, see the recomputation step by step.
6. Pricing: the ladder, grandfather guarantee, what each tier sees on the board, no dark patterns.
7. Methodology: the factor model in words and one worked example.
8. Fantasy start-sit: one decision per screen.
9. Stats (StatKing): a facts table with source and freshness.
10. Empty, loading, error and degraded states for the board and record (degraded means the data feed
    is stale; show the age and the source).
11. Account and sign-in.
12. Footer and navigation on both breakpoints.

## 9. Deliverables

- Design tokens (light and dark) as CSS variables with contrast ratios.
- Component library: buttons, inputs, tabs, tables, pick row, chart frame, badge set (win, loss, void,
  push, stale, locked, verified), drawer, sheet, toast, empty state, skeleton.
- The twelve screens above, both breakpoints, with annotations.
- Sitemap and route-to-destination mapping for all 236 existing pages.
- Voice guide with 15 before/after pairs and the five rewritten pages.
- Accessibility spec per §7.
- A one-page "why it looks like this" rationale that engineering and the founder can read in five
  minutes.

## 10. Constraints you cannot break

- No number that is not from the live truth surface or the proof API; use realistic placeholders
  labelled as placeholders where you must.
- No claim of accuracy, win rate or ROI anywhere in the design. The record page shows measurements
  with n and date; it never editorializes them.
- Nothing framed as AI. Confidence is a ranking score, not a probability, and the UI says so once,
  plainly.
- Both themes, both breakpoints, AA everywhere. If a color you love fails contrast, the color loses.
- Keep the wordmark "Galaxy Sports Edge" and the line "math you can read."
- Age gate is gone; all ages; responsible-play footer stays.

Start with the sitemap and the token set, show them, then the home, board and record screens, then
the rest. Ask exactly one question if a constraint is ambiguous; otherwise decide and note the
decision in the rationale.
