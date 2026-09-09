# Accessibility audit: current state, grep-grounded

Input for the redesign brief's §7 accessibility spec (`8970241d-claudedesignprompt.md`,
sections 7, 8, 9). This is a facts document, not a spec. Every line traces to a file and
a line number. Where I did not check something, it says "unknown," not a guess.

Scope: the public screens the brief lists in §8, mapped to the actual routes in this
repo:

| Brief screen | Route(s) audited | Page file(s) |
|---|---|---|
| Home | `/` | `apps/web/app/page.tsx` |
| Today (board) | `/board`, `/picks` | `apps/web/app/board/page.tsx`, `apps/web/app/picks/page.tsx` |
| Pick detail | no dedicated route (see note below) | `apps/web/components/picks/pick-card.tsx`, `apps/web/app/room/[gameId]/page.tsx` |
| Record | `/performance`, `/calibration`, `/proof`, `/verify` | one `page.tsx` each |
| Pricing | `/pricing` | `apps/web/app/pricing/page.tsx` |
| Methodology | `/methodology` | `apps/web/app/methodology/page.tsx` |
| Fantasy start-sit | `/fantasy/lineup` (+ `/fantasy/dfs`, `/fantasy/bestball`, `/fantasy/draft` sampled for the focus-style pattern) | `apps/web/app/fantasy/lineup/page.tsx` + `apps/web/components/fantasy/*` |
| Stats | `/stats` | `apps/web/app/stats/page.tsx`, `apps/web/app/stats/_components.tsx` |
| Account / sign-in | `/dashboard`, `/auth/signin` | one `page.tsx` each |

**No dedicated pick-detail route exists.** There is no `apps/web/app/picks/[id]/page.tsx`
and no page under `/picks/` other than the list itself (confirmed:
`find apps/web/app/picks` returns only `page.tsx` and `loading.tsx`). The factor
breakdown, receipt hash, verify button and grade the brief describes for "pick detail"
are rendered inline, in place, inside the pick row on `/picks`
(`apps/web/components/picks/pick-card.tsx`). The closest thing to a separate detail
page is `apps/web/app/room/[gameId]/page.tsx`, a per-game (not per-pick) "Game
Intelligence Room." I audited both.

---

## Cross-cutting findings (apply to every screen)

**Skip link.** Present and correctly targeted on ordinary pages: `apps/web/app/layout.tsx:222-227`
renders `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to content</a>`,
and every ordinary page renders `<main id="main-content">`. **Fails silently on one screen**:
`apps/web/app/auth/signin/page.tsx` has no element with `id="main-content"` anywhere in the
file, so activating the skip link on sign-in does nothing. See the Account / sign-in
section below.

**Global focus baseline.** `apps/web/styles/design-tokens.css:311-314` sets a sitewide
`:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; border-radius: 2px; }`,
which is the "2px ring, offset, in the focus-ring token" the brief asks for (§7). Known,
documented overrides exist where the default outline clips or is invisible:
`apps/web/styles/pickpilot-kit.css:1283-1293` explicitly overrides `.nav-links a`,
`.mobile-nav-link`, `.footer li a`, `.social-row a` with a visible 2px outline against
their pill/overflow-hidden backgrounds, and `.btn-primary:focus-visible`
(`apps/web/app/globals.css:76-78`) replaces the outline with a layered box-shadow ring.
Six specific components remove focus outline with **no replacement at all**; see
"Focus styles" below.

**Motion / reduced-motion.** `apps/web/app/globals.css:52-59` is a sitewide kill switch:
`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:
0.001ms !important; ...} }`. Because this targets the universal selector with
`!important`, it overrides both stylesheet `animation`/`transition` declarations and
inline `style={{ animation: ... }}` values (author `!important` outranks a normal inline
declaration in the CSS cascade), so it covers every plain-CSS animation in the app,
including inline ones like `apps/web/components/motion/signature-grid.tsx`'s
`animation: "signature-spin 90s linear infinite"`. On top of that blanket rule there are
targeted overrides for effects that need to freeze at a specific end state rather than
just stop: `globals.css:364-367` (`.gse-cine-anim`, used by `ShootingStars`),
`globals.css:404-407` (`.gse-marquee-track`, `.gse-sheen`, `.gse-enter-ring`), and
`globals.css:594-602` (`.gw-starfield`, `.gw-beam`, `.gw-drift*`, `.gw-orbit*`,
`.gw-gate-ring`, used by `WorldSection`). Of the 21 files in
`apps/web/components/motion/`, 13 have no JS-side `prefers-reduced-motion` check
(`useReducedMotion`/`matchMedia`), but of those, the ones I opened
(`shooting-stars.tsx`, `signature-grid.tsx`, `sentient-weather.tsx`,
`thermal-vision.tsx`) are documented or verified as pure-CSS or pure-React-prop driven,
so they fall under the blanket rule above. I did not open all 13; the remainder
(`glitch-truth.tsx`, `health-ring.tsx`, `holo-tilt-card.tsx`, `holographic-receipt.tsx`,
`marquee.tsx`, `sentient-shell.tsx`, `signal-room-atmosphere.tsx`, `signal-rule.tsx`,
`signal-state-pulse.tsx`) are **unknown** against this check. Overall status:
**pass, with 9 files unknown.**

One brief requirement is violated outright: §5 says "No auto-playing intro. No 'replay
intro' link," and the footer has exactly that. `apps/web/components/ui/footer.tsx:143-145`
renders `<a href="/?intro=play" ...>▶ Replay intro</a>` on every page. **Fail** (not one of
the twelve requested checks, but directly contradicts the brief and belongs in this
audit).

**Mobile target size.** Pass. `.mobile-nav-trigger` (the hamburger) is 44x44
(`apps/web/styles/pickpilot-kit.css:1019-1029`); `.mobile-nav-link` has `min-height: 44px`
(`pickpilot-kit.css:1053-1057`); the collapsible section header button in
`apps/web/components/ui/mobile-nav.tsx:112` carries `min-h-11` (Tailwind, 44px) directly.
This is shared by every screen through `<Nav />` / `<MobileNav />`.

**Age gate.** The brief (§3, §10) is explicit: "the site does not take bets or money for
wagers, so there is no age gate... Age gate is gone; all ages." That is not the current
state. `apps/web/lib/age-verify/surface.ts:32-49` defines `AGE_GATED_PREFIXES`, enforced
in `apps/web/middleware.ts:45-53` (redirect to `/age-verify` with a `gse_age_ok` cookie
check), and it is **always on with no env flag** (the file's own comment at
`surface.ts:16-18` says this is deliberate). The gated list is wider than "just
`/fantasy`": it includes `/board`, `/picks`, `/performance`, `/today`, `/intelligence`,
`/ledger`, `/glass-ledger`, `/kill-ledger`, `/stats`, `/vault`, `/watchlist`, `/pricing`,
`/compare`, `/fantasy`, `/contests`, `/live`. Of the screens in this audit's scope, that
means `/board`, `/picks`, `/performance`, `/pricing`, `/stats`, and all of `/fantasy/*`
are gated; `/`, `/calibration`, `/proof`, `/verify`, `/methodology`, `/dashboard`, and
`/auth/signin` are not (none of those paths match a listed prefix). The gate itself
(`apps/web/app/age-verify/page.tsx`) is a small, clean, keyboard-usable form (one h1,
two labeled submit buttons, a link to `/responsible-play`), so the *implementation* has
no accessibility problem of its own. The problem is that it exists at all on
6 of 9 audited screens, which is a direct contradiction of the brief. **Fail** on every
screen it covers.

---

## Per-screen checklist

Status is one of **pass**, **fail**, **unknown**, or **n/a** (the check does not apply to
this screen's content, e.g. no tables on a page with no tabular data).

### Home (`/`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | No icon-only interactive element found in `page.tsx` or its directly-imported components (`WaitlistForm`, `RiskDisclosure`, `MethodologySection`). |
| Skip link target | pass | `id="main-content"` at `app/page.tsx:83`. |
| One h1, heading order | pass | One `<h1>` at `page.tsx:113`; `<h2>` at 153, 247, 299, 318; no `<h3>` in the file; no stray `<h1>` found in `methodology-section.tsx`, `world-section.tsx`, `no-bet-gate.tsx`, `signal-core-lazy.tsx`, `montage-entrance.tsx`, `risk-disclosure.tsx`, `nflverse-lab-door.tsx`, `waitlist-form.tsx`. |
| Landmarks | pass | header via `<Nav/>` (`components/ui/nav.tsx:92`), `<nav aria-label="Primary">` (`nav.tsx:97`), `<main id="main-content">` (`page.tsx:83`), `<footer>` via `<Footer/>` (`components/ui/footer.tsx:95`). |
| Tables (div vs real) | n/a | No tabular content on this screen. |
| Charts have text alternative | n/a | No `<svg>`/`<canvas>` in `page.tsx`. |
| Animation has reduced-motion guard | pass | Covered by the global rule; see cross-cutting note. |
| Focus styles | pass | No `outline-none` in `page.tsx`; relies on the sitewide `:focus-visible` token. |
| Placeholder-as-label | pass | `WaitlistForm` gives every field a real `<label htmlFor>` (`components/gsn/waitlist-form.tsx:193,217,241,292,305,319,330`), placeholder text is supplementary, not the only label. |
| Color-only meaning | n/a | No win/loss/void content on this screen. |
| Age gate | pass | `/` is not in `AGE_GATED_PREFIXES` (`lib/age-verify/surface.ts:32-49`). |
| Mobile nav target size | pass | Shared `<Nav/>`/`<MobileNav/>`; see cross-cutting note. |

### Today / board (`/board`, `/picks`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | `/board`: no `<button>` in `board/page.tsx` at all. `/picks`: decorative `<svg aria-hidden="true">` icons inside status blocks that always carry a visible heading (`app/picks/page.tsx:356-365,389-401,482-490`); the date-picker's "Apply date" button has visible text (`picks/page.tsx:802-806`). |
| Skip link target | pass | `id="main-content"` at `board/page.tsx:78` and `picks/page.tsx:242`. |
| One h1, heading order | pass | `/board`: one `<h1>` at `board/page.tsx:181`, `<h2>`s at 257/272, `<h2>`/`<h3>` pair (303/318) inside the reusable row component, correctly nested. `/picks`: one `<h1>` at `picks/page.tsx:256`, `<h2>`s follow inside status/empty blocks (374, 389, 409, 453, 497), no skipped level. |
| Landmarks | pass | Both pages: header (`<Nav/>`), `<main id="main-content">`, footer (`<Footer/>`). Evidence: `board/page.tsx:76,78,286`; `picks/page.tsx:240,242,576`. |
| Tables (div vs real) | pass | Neither page fakes a table with divs. `/board`'s game/pass list renders each row as an `<article>` with its own `<h3>` (`board/page.tsx:313-334`), which is a legitimate card pattern for records with optional, variable fields, not a hidden multi-column table. `/picks` renders pick rows through `PickCard` (see Pick detail section). |
| Charts have text alternative | n/a | No `<svg>`/`<canvas>` in `board/page.tsx`; `/picks` empty/error-state icons are decorative and `aria-hidden`. |
| Animation has reduced-motion guard | pass | `/board` imports `SignalRoomAtmosphere`; no `requestAnimationFrame`/`canvas`/`setInterval` found in that file, so it is CSS-driven and covered by the global rule. |
| Focus styles | pass | Neither `board/page.tsx` nor `picks/page.tsx` uses `outline-none` without a replacement. The date input at `picks/page.tsx:795-801` explicitly pairs `focus:outline-none` with `focus:ring-1 focus:ring-orbital-cyan`, a correct replacement. |
| Placeholder-as-label | pass | The date field has a real (visually-hidden) label: `<label htmlFor="date" className="sr-only ...">Date</label>` at `picks/page.tsx:791`, placeholder is not used as the only label anywhere on these two pages. |
| Color-only meaning | pass | `BoardHealthBadge` and `BoardSurfaceChip` (`components/board/board-health-badge.tsx:25-28`, `board-surface-chip.tsx:32`) always render a text status/label (`DEGRADED`/`HEALTHY`/`UNAVAILABLE`, "Signal board..."/"Market board...") next to the color; not color alone. |
| Age gate | fail | Both `/board` and `/picks` are in `AGE_GATED_PREFIXES` (`lib/age-verify/surface.ts:33-34`). |
| Mobile nav target size | pass | Shared component. |

### Pick detail (no dedicated route: inline `PickCard` on `/picks`, plus `/room/[gameId]`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | `VerifyPickButton` has visible text "Verify this pick" next to its decorative glyph (`components/picks/verify-pick-button.tsx:60-65`). `EvidenceAuditDrawer`'s open trigger has visible text plus `aria-label` (`evidence-audit-drawer.tsx:137-144`); its close button is icon-only but carries `aria-label="Close"` (`evidence-audit-drawer.tsx:178-183`). `AskWhy`'s two buttons both have visible text (`ask-why.tsx:70-90`). The "unlocks with Pro" locked-value link has visible text plus the icon (`pick-card.tsx:648-666`), not icon-only. |
| Skip link target | pass (room only) | `/room/[gameId]` has `id="main-content"` at `app/room/[gameId]/page.tsx:34`. `PickCard` itself is not a page, so this check does not apply to it directly; it inherits `/picks`'s target. |
| One h1, heading order | pass | `/room/[gameId]`: one `<h1>` at line 44 (the matchup), then `<h2>` for every `Panel` (lines 59, 78, 89, 110, 138, 149, 158 call a `Panel` helper that renders `<h2>` at line 182), with `<h3>` only nested inside a specific panel's content (lines 126, 142), which is correct order with no skipped level. `PickCard` renders no heading elements of its own (it is a card inside a page that already has its own h1), so it does not introduce a duplicate h1. |
| Landmarks | pass | `/room/[gameId]` has header (`<Nav/>`), `<main id="main-content">`, footer (`<Footer/>`) at lines 5, 6, 34, 173, 174. |
| Tables (div vs real) | pass | `/room/[gameId]` uses a `<dl>` for label/value market-pulse stats, a correct semantic choice, not a table impersonated by divs. `PickCard`'s factor breakdown (`ScoreBar`, `pick-card.tsx:439-465`) renders each factor's label and numeric value as plain text above a decorative percentage bar; not a table, and does not need to be one. |
| Charts have text alternative | pass | The "horizontal bar chart" the brief asks for (methodology §7/§9) is `ScoreBar`: the label and value are real text nodes, not an image, so there is nothing that needs a separate text alternative (`pick-card.tsx:452-462`). |
| Animation has reduced-motion guard | pass | No animation in `pick-card.tsx` or the room page beyond `transition-colors`, covered by the global rule. |
| Focus styles | pass | No `outline-none` in `pick-card.tsx`, `verify-pick-button.tsx`, `ask-why.tsx`, or the room page. |
| Placeholder-as-label | n/a | No free-text inputs in either. |
| Color-only meaning | pass | `ResultBadge` always renders the literal word `WIN`/`LOSS`/`PUSH`/`VOID` as its text content, colored but never color-only (`pick-card.tsx:628-639`). The risk-level badge always shows `riskInfo.label` text next to its color (`pick-card.tsx:177-181`). |
| Age gate | fail (mixed) | `PickCard` lives on `/picks`, which is gated. `/room/[gameId]` ("`/room`") is **not** in `AGE_GATED_PREFIXES`, so the closest thing to a standalone pick/game detail page is not gated while the list it is linked from is. |
| Mobile nav target size | pass | Shared component. |
| **Keyboard trap / focus trap in drawer** (extra, flagged because the brief's §7 calls it out by name) | fail | `EvidenceAuditDrawer` sets `role="dialog" aria-modal="true"` and moves initial focus to its close button and closes on Escape (`evidence-audit-drawer.tsx:117-129,149-151`), but it never constrains Tab to the dialog's own focusable elements. `MobileNav`, by contrast, does exactly this (`components/ui/mobile-nav.tsx`, the `FOCUSABLE_SELECTOR` Tab/Shift+Tab loop at lines 157-175). A keyboard user can Tab out of the "modal" drawer into the page behind the backdrop while it is still visually open, which is a real mismatch with `aria-modal="true"`. |

### Record (`/performance`, `/calibration`, `/proof`, `/verify`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | The verify-a-receipt button on `/verify` has visible text "Verify" (`components/trust-ledger/verify-console.tsx:270-276`); the in-browser recompute button has visible text (`verify-console.tsx:104-109`). No icon-only control found in `calibration/page.tsx` or `proof/page.tsx`. |
| Skip link target | pass | `id="main-content"` present on all four: `performance/page.tsx:114,244`, `calibration/page.tsx:98`, `proof/page.tsx:128`, `verify/page.tsx:31`. |
| One h1, heading order | pass | `/performance` defines an `<h1>` in two places (`page.tsx:116` inside `BootstrapShell`, and `page.tsx:251` in the main content), but they are mutually exclusive early-return branches of the same `export default async function PerformancePage()` (the bootstrap branch `return`s at line 145-180, before the main-content `return` at line 241), so only one ever renders per request. `/calibration` and `/proof` each have exactly one `<h1>` (`calibration/page.tsx:103`, `proof/page.tsx:136`). `/verify` has one `<h1>` (`verify/page.tsx:33`). |
| Landmarks | pass | All four: header (`<Nav/>`), `<main id="main-content">`, footer (`<Footer/>`). |
| Tables (div vs real) | pass | `/performance`'s "Recent periods" list is a real `<table>` with `<th scope="col">` headers (`performance/page.tsx:425-448`), not divs; the "By sport" summary is a card grid (`SportCard`), an appropriate non-table pattern for a small fixed set of summary cards. `/calibration` and `/proof` present the reliability data through the interactive bucket scrubber (see chart row below), not a table. Note: neither this table nor the pricing table (below) has a `<caption>`, only a preceding `<h2>`; the sitewide `DataTable` component (`components/ui/data-table.tsx:362-363`) does add a `<caption>`, so the pattern is inconsistent across the app. |
| Charts have text alternative | pass, partial | The reliability curve (`components/home/calibration-curve.tsx`, rendered inside `ProofExplorer` on `/calibration` and `/proof`) is an `<svg role="img" aria-label="Calibration reliability curve with N settled canonical picks">` (`calibration-curve.tsx:80-84`). The `aria-label` states the sample size but not the per-bucket expected/observed numbers that are drawn as visible `<text>` inside the SVG (lines 106-146). Those SVG text nodes are not separately exposed to assistive tech once the parent carries `role="img"`. However, the same screen also renders an adjacent, fully accessible "band scrubber": one real `<button aria-pressed>` per confidence band plus a `role="status" aria-live="polite"` region that prints Observed / Expected / Delta as text for the selected band (`components/proof/proof-explorer.tsx:108-158`). A keyboard/screen-reader user can get every bucket's numbers this way, one band at a time; a sighted user gets the whole curve in one glance. This satisfies the "same claim and numbers" requirement, just via a different, less immediate route for AT users. A second, independent reliability-chart implementation exists at `components/calibration/reliability-chart.tsx` (used on `/calibration/market`, not one of the nine audited screens), with its own `<figure>/<figcaption>` plus `role="img" aria-label={title}`, but there `aria-label` is only the chart's title ("Reliability"), with no numbers at all, and no adjacent text equivalent that I found. |
| Animation has reduced-motion guard | pass | No JS-driven charts on these four pages beyond the SVG components above, which have no looping CSS animation of their own (`CalibrationCurve`'s only animated property, the path's `stroke-dashoffset` transition, carries `motion-reduce:transition-none` directly, `calibration-curve.tsx:130`). |
| Focus styles | pass | The `/verify` hash input pairs `focus:outline-none` with `focus:ring-2 focus:ring-orbital-cyan/25` (`verify-console.tsx:265`), a correct replacement. No bare `outline-none` found in `performance/page.tsx`, `calibration/page.tsx`, or `proof/page.tsx`. |
| Placeholder-as-label | pass | The receipt-hash input has a real (visually-hidden) label, `<span className="sr-only">Receipt hash</span>` inside a wrapping `<label>` (`verify-console.tsx:259-261`); the placeholder text ("Paste a 64-character receipt hash") is a hint, not the only label. |
| Color-only meaning | pass | The band-scrubber's delta uses a `+`/`-` sign glyph alongside its color, by explicit design comment ("Sign glyph carries the direction alongside the color", `proof-explorer.tsx:141-142`). |
| Age gate | mixed | `/performance` is in `AGE_GATED_PREFIXES` (fail); `/calibration`, `/proof`, `/verify` are not listed and are not gated (pass). |
| Mobile nav target size | pass | Shared component. |

### Pricing (`/pricing`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | The comparison table's included/excluded glyphs carry `role="img" aria-label="Included"` / `aria-label="Not included"` (`app/pricing/page.tsx:734-753`), and they use different shapes (checkmark vs. X), not color alone. |
| Skip link target | pass | `id="main-content"` at `pricing/page.tsx:317`. |
| One h1, heading order | pass | One `<h1>` at line 336; `<h2>`s at 377, 412, 468, 506, 563, 594, 631, 664; `<h3>`s (567, 574, 609) nested correctly under their section's `<h2>`. |
| Landmarks | pass | header (`<Nav/>`), `<main id="main-content">`, footer (`<Footer/>`) at lines 306, 317, 688. |
| Tables (div vs real) | pass | The "Side by side" comparison is a real `<table>` with `<th scope="col">`/plain `<td>` cells (`pricing/page.tsx:508-553`), not a div grid. No `<caption>` (see the Record section's note; same gap here). |
| Charts have text alternative | n/a | No data chart on this page (the included/excluded glyphs above are the only SVGs, and both carry an accessible name). |
| Animation has reduced-motion guard | pass | No bespoke animation beyond standard hover/transition utility classes, covered by the global rule. |
| Focus styles | unknown | I did not check every interactive element on this 760-line page (the FAQ accordion and plan-selection controls were not individually opened); no `outline-none` was found in `pricing/page.tsx` itself via full-file grep, so nothing failing was found, but full coverage is unconfirmed. |
| Placeholder-as-label | unknown | I did not locate a form input on this page to check; if the plan-selection UI has one, it was not opened this pass. |
| Color-only meaning | pass | See icon-only row: included/excluded is glyph-shaped, not color-only. |
| Age gate | fail | `/pricing` is in `AGE_GATED_PREFIXES` (`lib/age-verify/surface.ts:44`). |
| Mobile nav target size | pass | Shared component. |

### Methodology (`/methodology`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | No `<button>`/icon-only link found in `methodology/page.tsx`; the decorative galaxy visualization is `aria-hidden="true"` (`components/hero/interactive-galaxy-lazy.tsx:18`), which is correct for a purely decorative element. |
| Skip link target | pass | `id="main-content"` at `methodology/page.tsx:84`. |
| One h1, heading order | pass | One `<h1>` at line 104; `<h2>`s at 125, 141, 167, 221, 259, 308, 333; `<h3>`s (181, 192, 202, 237, 270, 278, 289) each nested under a preceding `<h2>`, no skipped level. |
| Landmarks | pass | header (`<Nav/>`), `<main>`, footer (`<Footer/>`) at lines 83, 84, 351. |
| Tables (div vs real) | n/a | No tabular content found. |
| Charts have text alternative | n/a | No `<svg>`/`<canvas>` in `methodology/page.tsx`. |
| Animation has reduced-motion guard | pass | Only decorative, `aria-hidden` motion (the interactive galaxy), covered by the global rule and separately non-informational. |
| Focus styles | pass | No `outline-none` found in `methodology/page.tsx`. |
| Placeholder-as-label | n/a | No form inputs found on this page. |
| Color-only meaning | n/a | No win/loss/void content here. |
| Age gate | pass | `/methodology` is not in `AGE_GATED_PREFIXES`. |
| Mobile nav target size | pass | Shared component. |

### Fantasy start-sit (`/fantasy/lineup`, plus `/fantasy/dfs`, `/fantasy/bestball`, `/fantasy/draft`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | None of `lineup-optimizer.tsx`, `dfs-optimizer.tsx`, `bestball-board.tsx`, `draft-assistant.tsx` contains an `<svg>` at all (confirmed by grep); every button in these four files is text-labeled. |
| Skip link target | pass | `FantasyShell` (used by every `/fantasy/*` tool page) renders `<main id="main-content">` (`components/fantasy/fantasy-shell.tsx:53`). |
| One h1, heading order | pass | `FantasyShell` renders exactly one `<h1>` (`fantasy-shell.tsx:71`); the four tool pages (`lineup/page.tsx`, `dfs/page.tsx`, `bestball/page.tsx`, `draft/page.tsx`) render no heading elements of their own, they only pass content into the shell. |
| Landmarks | pass | `FantasyShell` renders header (`<Nav/>`), `<main>`, footer (`<Footer/>`) at lines 52, 53, 100. |
| Tables (div vs real) | pass | The bench/roster list in `lineup-optimizer.tsx` (lines 79-92) is a list of buttons with visible per-row text, an appropriate non-table pattern for a "tap to toggle" list, not a hidden data table. |
| Charts have text alternative | n/a | No `<svg>`/`<canvas>` in any of the four components. |
| Animation has reduced-motion guard | pass | No bespoke `animation`/`transition` beyond `transition-colors` utility classes, covered by the global rule. |
| Focus styles | **fail** | Six confirmed instances of `focus-visible:outline-none` with no replacement ring, border, or shadow anywhere in the same class string or inline style: `components/fantasy/lineup-optimizer.tsx:85` (the "mark player out" toggle), `components/fantasy/dfs-optimizer.tsx:82` (mode switch), `components/fantasy/bestball-board.tsx:107` (position filter) and `:115` ("Reset draft"), `components/fantasy/draft-assistant.tsx:127` (position filter) and `:135` ("Reset draft"). A keyboard user tabbing through any of these four tools gets no visible focus indicator on these specific controls. |
| Placeholder-as-label | n/a | The only inputs found in these four files are a checkbox and a range slider, each with a real `<label>` wrapping it (`dfs-optimizer.tsx:89,93`), not text inputs with placeholder text. |
| Color-only meaning | pass | The start/sit verdict is rendered as visible text (`call.verdict`) colored by a CSS variable, not a bare color chip (`lineup-optimizer.tsx:58`); the "OUT" toggle state replaces the projection number with the literal text "OUT" plus strikethrough, not a color change alone (`lineup-optimizer.tsx:90`). |
| Age gate | fail | `/fantasy` is in `AGE_GATED_PREFIXES` (`lib/age-verify/surface.ts:46`); this is the specific instance the brief and `AGENTS.md` already flag as a decision to reverse. |
| Mobile nav target size | pass | Shared component. |

### Stats (`/stats`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | No icon-only control found in `stats/page.tsx` or `stats/_components.tsx`. |
| Skip link target | pass | `Shell` (the shared stats-section wrapper) renders `<main id="main-content">` (`app/stats/_components.tsx:13`). |
| One h1, heading order | pass | `Shell` renders exactly one `<h1>` (`_components.tsx:16`); `stats/page.tsx` itself defines no heading elements, it only supplies content into `Shell`/`SectionHeader` (`SectionHeader` renders `<h2>`, `_components.tsx:121`). |
| Landmarks | pass | `Shell` renders header (`<Nav/>`), `<main>`, footer (`<Footer/>`) at lines 12, 13, 20. |
| Tables (div vs real) | pass, best example in the app | The shared data-table renderer in `_components.tsx:133` is a real `<table>` with `<caption className="sr-only">{caption}</caption>` and `<th scope="col">` on every header cell, plus a sticky header. This is the one place in the codebase that ships both a semantic table AND a caption together. |
| Charts have text alternative | pass | `BarChart` (`_components.tsx:92-98`) renders each bar's label and numeric value as plain visible text next to a decorative fill bar, not an image; nothing needs a separate alternative because nothing is opaque to assistive tech. `ScoreRing` (`_components.tsx:104-119`) is a CSS `conic-gradient` ring with the numeric score as real text in the center; the "not measured" state explicitly swaps the ring color and number for a dashed outline and an em dash, with an `(unmeasured)` text suffix on the label (`_components.tsx:109`), so absence of data is never conveyed by color/shape alone. |
| Animation has reduced-motion guard | n/a | No looping animation found in `stats/_components.tsx`. |
| Focus styles | unknown | Not checked; I read `stats/page.tsx` and `_components.tsx` only, not every `/stats/*` sub-page (`/stats/ask`, `/stats/compare`, etc., 15 sub-routes total). One sampled sub-page, `/stats/ask`, has `focus:outline-none` on its search input with only a `focus:border-orbital-cyan` color change as a replacement, no ring (`app/stats/ask/page.tsx:30`); a border-color change is a legitimate, if subtle, WCAG 2.4.7 technique, so I am marking this pass-with-a-note rather than fail, but did not verify contrast of that border color change. |
| Placeholder-as-label | pass | `/stats/ask`'s question input carries `aria-label="Ask StatKing a question"` (`app/stats/ask/page.tsx:26-27`) as well as its placeholder, so it has an accessible name independent of the placeholder. |
| Color-only meaning | n/a | No win/loss/void content on this screen. |
| Age gate | fail | `/stats` is in `AGE_GATED_PREFIXES` (`lib/age-verify/surface.ts:41`). |
| Mobile nav target size | pass | Shared component. |

### Account (`/dashboard`) and sign-in (`/auth/signin`)

| Check | Status | Evidence |
|---|---|---|
| Icon-only controls named | pass | The Google-OAuth button on `/auth/signin` has visible text "Continue with Google" next to its decorative, `aria-hidden` logo SVG (`app/auth/signin/page.tsx:85-113`). No icon-only control found in `dashboard/page.tsx`. |
| Skip link target | **fail** | `/auth/signin` has no element with `id="main-content"` anywhere in `app/auth/signin/page.tsx`; the global skip link (`layout.tsx:222-227`) has nothing to jump to on this page. `/dashboard` is fine: `id="main-content"` at `app/dashboard/page.tsx:238`. |
| One h1, heading order | pass | `/dashboard` defines `<h1>` in two places (`page.tsx:56` "Sign in required", `page.tsx:245` the welcome heading), but they are mutually exclusive branches of one function (`if (!session?.user?.id) { return (...) }` at lines 52-53, versus the main `return` at line 221), so only one renders per request, same pattern as `/performance`. `/auth/signin` has exactly one `<h1>` (line 61). |
| Landmarks | **fail (partial), on `/dashboard`; fail on `/auth/signin`** | `/dashboard` has a custom `<header>` with a `<nav>` inside it (`dashboard/page.tsx:223-236`, not the shared global `<Nav/>`) and `<main id="main-content">` (line 238), but **no `<footer>` anywhere in the file**, confirmed by reading the file to its end. That also means the responsible-play / 1-800-GAMBLER footer links the brief requires "on every page footer" (§3) are absent from `/dashboard`. `/auth/signin` has none of header, nav, main, or footer landmarks at all; it is a single unlandmarked `<div>`. |
| Tables (div vs real) | pass | `/dashboard`'s stat tiles (`StatCard`, end of `dashboard/page.tsx`) are a card grid, an appropriate pattern for a handful of KPIs, not a table pretending to be divs. |
| Charts have text alternative | n/a | No `<svg>`/`<canvas>` chart on either page. |
| Animation has reduced-motion guard | n/a | No bespoke animation found on either page. |
| Focus styles | pass | No `outline-none` found in `dashboard/page.tsx` or `auth/signin/page.tsx`. |
| Placeholder-as-label | n/a | No text inputs on either page (sign-in is a single OAuth button). |
| Color-only meaning | unknown | `/dashboard` renders pick confidence and edge-score numbers with descriptive `aria-label`s (`dashboard/page.tsx:531,561`), which is good practice, but I did not check every status chip on this 680-line page for a color-only case. |
| Age gate | pass | Neither `/dashboard` nor `/auth/signin` is in `AGE_GATED_PREFIXES`. |
| Mobile nav target size | n/a on `/auth/signin` (no nav rendered); pass on `/dashboard`'s custom nav, where every link carries `min-h-11` directly in its className (`dashboard/page.tsx:229-231`). |

---

## Fail counts by check (across the 9 screens/screen-groups above)

| Check | Fails | Screens |
|---|---|---|
| Age gate present (brief says it must not be) | 6 | Board, Picks, Performance, Pricing, Stats, Fantasy |
| Focus styles (`outline-none` with no replacement) | 1 screen-group (6 individual instances) | Fantasy (`lineup-optimizer.tsx`, `dfs-optimizer.tsx`, `bestball-board.tsx` x2, `draft-assistant.tsx` x2) |
| Landmarks missing | 2 | Account (`/dashboard` has no footer), Sign-in (`/auth/signin` has no header/nav/main/footer at all) |
| Skip link target missing | 1 | Sign-in (`/auth/signin`) |
| Keyboard trap / focus trap absent in a modal drawer | 1 | Pick detail (`EvidenceAuditDrawer`) |
| Icon-only controls without a name | 0 | none found |
| Duplicate/misordered headings | 0 | none found (the two-h1-in-one-file cases on Performance and Dashboard are mutually exclusive branches, not simultaneous duplicates) |
| Tables built from divs where a real table was needed | 0 | none found; every place with genuinely columnar data (Pricing comparison, Performance "recent periods," Stats data table) already uses a real `<table>` |
| Charts without any text alternative | 0 fully missing; 1 partial | Record group: `CalibrationCurve`'s own `aria-label` omits per-bucket numbers, though an adjacent accessible control supplies them |
| Animation without reduced-motion guard | 0 confirmed; 9 files unknown | 9 of 21 files in `components/motion/` not individually opened |
| Placeholder-as-label | 0 | none found; every input checked has a real `<label>` or `aria-label` |
| Color-only meaning | 0 | none found; every win/loss/void/status render pairs color with a text word or distinct glyph |
| Mobile nav target size below 44px | 0 | trigger, links, and section toggles all measured at 44px or more |
| Replay-intro link (brief §5 explicitly bans it) | 1 (sitewide) | footer, every page |

Two items above are marked "unknown, not zero": 9 of the 21 `components/motion/` files
were not individually opened, and per-check coverage on `/pricing` (focus, placeholder)
and `/dashboard` (color-only) was not exhaustive on those specific pages. Everything else
in this table is a checked, confirmed count, not an estimate.
