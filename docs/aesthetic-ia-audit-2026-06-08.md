# GSE Aesthetic & IA Audit — Remediation Spec
*Date: 2026-06-08 | Auditor: Design Lead (Nimble Analyst)*

---

## EXECUTIVE DIAGNOSIS

Five owner complaints, each grounded in specific audit evidence.

---

### 1. "Organization is horrible — categories all over the place."

- The live route tree has **122 routes and ~46 top-level segments** behind a 6-door nav. The gap between what the nav promises and what actually exists is the felt chaos.
- **Five distinct competing surfaces for "the daily slate"**: `/board`, `/picks` (verbatim clone of board — same title, same PickCard render), `/today`, `/brief`, and `/dashboard`. A user cannot identify which is the starting page.
- The Intelligence subnav links to `/trends`, `/observatory`, `/airwave`, `/track`, `/the-beat` — all **top-level routes, not `/intelligence/*`** — so the "one system" nav bar is actually five scattered orphans wearing a shared tab strip.
- Per-sport pages (`/mlb`, `/nhl`, `/nflverse`) sit orphaned at top level, disconnected from `/players` and `/board` which already handle multi-sport data.

---

### 2. "We're over-feeding and over-sharing the transparency — too much information."

- The `MetricExplainer` "How we read it" aside renders **always-open** on all 22 data pages (11 engines + 11 player views): ~6–9 sentences of buy-low/sell-high methodology prose sitting exposed before a single data row is visible.
- Every engine table has a `<Note>` component **printed twice** — once above the table (SubHead `note`) and again below it (`Note()` helper). Eight views. Literal duplication, zero information gain.
- The ProofView opens with two methodology essay paragraphs (train/test windows, normalization procedure) **before** its three KPI cards.
- A typical data page stacks 12–20 sentences of prose around a single table, with the methodology restated above and below.

---

### 3. "Some pages are different colors while others are white — the aesthetic isn't near what I wanted."

- Live audit: **23 dark routes, 2 light routes** (`/intelligence/engines` and `/players`). Both light-page outliers share the same `<IntelligenceSubnav>` as the surrounding dark pages — clicking any subnav tab flips the entire screen dark → light without leaving the section. This is the single most visible transition failure.
- Three **competing dark systems** read as different blacks: `BRAND_COLORS.obsidianBlack` (#050608) on marketing pages, `bg-carbon` (#0D1117) on data pages, raw `bg-gray-950` (#030712) on `/picks`, `/performance`, `/board`. Navigating picks → trends → track shifts the black slightly each hop.
- The hybrid was intentional (light "paper" for data, dark "cosmic" for marketing) but every competitor — including PrizePicks, which has an identical marketing-vs-product dilemma — **keeps its working product a single consistent theme**. The hybrid is not a design choice; it is an unresolved inconsistency.

---

### 4. "We don't sound like real humans — it sounds like AI."

- The `X, not Y` antithesis is the **structural backbone of the entire site**. Forty-plus instances across heroes, eyebrows, blurbs, and engine tags: "See the reasoning, not just the number" / "Track the number, not the noise" / "Measured. Not guessed." / "a case, not a badge." One or two would be sharp. Forty sounds generated.
- The brand voice file (`lib/brand.ts`) itself is written in **staccato fortune-cookie fragments**: "Calibrated. Precise. Always acquiring. Intelligence isn't loud. It's on frequency." This is the source file — the clipped AI cadence flows downstream from it.
- Recurring filler phrases caught by the audit: "the part that matters," "real enough to defend," "a number we can't yet stand behind," "before it's priced in," "the machinery." These are textbook LLM tells.
- Every section carries a `font-mono uppercase tracking-[0.18em]` eyebrow. Stacking them on every paragraph reads as a generated-content cadence, not editorial judgment.

---

### 5. "It doesn't feel first-of-its-kind / cutting edge — doesn't align with competitor platforms."

- The hybrid white paper pages look like a legacy data portal (PFR-style) while the dark pages look like an unfinished Sleeper clone. Neither reads as a unified premium brand.
- Color is spent on backgrounds and decorative gradients rather than on **data meaning**. PFF's entire brand identity lives in a red→yellow→green grade heat-map on a *neutral* surface. GSE's accent cyan appears on nav chrome and section decorations, not on the metric itself.
- No standardized card unit. PrizePicks is premium at high density because one identical card module repeats everywhere. GSE mixes PickCards, engine tables, MetricExplainers, and ProofViews with no shared anatomy — density reads as chaos rather than a tidy grid.
- No in-page navigation on dense analysis pages. PFR deliberately added a persistent vertical "On This Page" sidebar after learning that hover-nav caused clutter. GSE's long pages have no section index, so structure is invisible.

---

## SINGLE THEME DECISION

### The Evidence

The live audit is decisive: **23/25 routes are already dark**. The two outliers (`/intelligence/engines`, `/players`) are the source of the owner's complaint — they are the *exceptions*, not the intended dual-theme. The brand identity is a galaxy/space theme: dark navy, cyan, ultraviolet. Every piece of marketing, every cinematic moment, and 92% of the working product is dark.

### Option A — All-Light Editorial (PFF / The Athletic model)

**What it requires:**
- Replace `bg-carbon`, `bg-eclipse`, `BRAND_COLORS.obsidianBlack`, `bg-gray-950` with `bg-paper` (#F8F7F4) or equivalent light surface across all 23 dark routes.
- Replace `text-ion` (light text on dark) with `text-ink` (dark text on light) site-wide.
- Retheme `<Atmosphere/>` components (the cinematic starfield) — remove or invert.
- Rebuild the color accent system: cyan/ultraviolet do not meet WCAG AA on white without significant desaturation.
- Reconsider the entire brand identity: "galaxy/space" as a light theme reads as a contradiction.

**Rework cost: LARGE.** 23 routes, the global CSS token layer, and every component that uses `BRAND_COLORS.*` directly.

**Pros:** Maximizes data readability at dense tables; matches editorial competitors (PFF, Stathead, The Athletic default); whitespace feels premium.

**Cons:** Abandons the committed brand identity; the galaxy/space concept is incoherent on a white surface; requires a color system rebuild; puts GSE in the same visual bucket as legacy data portals rather than next-generation consumer products; Sleeper, PrizePicks product board, and Underdog core product are all dark — the consumer-forward cohort has moved dark.

---

### Option B — All-Dark Premium (Sleeper / PrizePicks model)

**What it requires:**
- Migrate `/intelligence/engines` and `/players` from `bg-paper`/`text-ink` to the dark system: use `bg-carbon` (#0D1117) + `text-ion`.
- Consolidate the three competing dark blacks into **one canonical dark surface token**: `--surface-base: #0D1117` (`bg-carbon`), with `--surface-raised: #161B22` and `--surface-overlay: #1C2128`. Replace all `bg-gray-950`, `bg-eclipse`, and `BRAND_COLORS.obsidianBlack` inline usages with these tokens.
- **Desaturate the cyan accent** from full-saturation to ~70% saturation (Sleeper's eye-strain lesson): `--accent-primary: hsl(191, 70%, 52%)` instead of the current `hsl(191, 100%, 52%)`. Reserve full saturation for one primary CTA per screen.
- Apply `text-ion` (near-white, slightly warm, not pure #FFFFFF) consistently on all surfaces so table data is readable without optical vibration.
- Remove the light design tokens (`bg-paper`, `bg-paper-raised`, `text-ink`, `border-paper-border`) from active pages — keep them in the token file for a future opt-in light mode toggle.

**Rework cost: SMALL.** Two routes change surface class; one token consolidation pass unifies the three competing dark blacks; accent saturation is a single token edit. Most of the site is already there.

**Pros:** Matches the brand identity completely; aligns with the cutting-edge consumer cohort (Sleeper, PrizePicks, Underdog core product); rework is surgical; consistency is achieved by fixing the two outliers, not rebuilding 23 pages; dark keeps data-dense tables readable with proper contrast without the whitespace overhead of light themes.

**Cons:** Long-session eye strain is a real risk if accents are not desaturated (Sleeper explicitly fixed this); no light mode until a toggle is built.

---

### RECOMMENDATION: Option B — All-Dark Premium

**Reasoning:** The brand is a galaxy. 23/25 routes are already there. The rework to go all-light is a full rebrand; the rework to unify the dark system is two route changes and one token pass. The modern consumer leaders (Sleeper, PrizePicks product board) are dark and explicit about why — users spend 60+ minutes per session, dark keeps the data prominent. PrizePicks proves the exact coexistence model: a light marketing splash can live at the top-of-funnel entrance while the working product is uniformly dark. GSE already has this — its `/` homepage and cold-open are dark and cinematic. The fix is to stop letting two outlier routes break the spell.

The owner retains final call. If the owner's vision is explicitly editorial/light (The Athletic model), Option A is viable but requires committing to a brand identity pivot away from the galaxy concept.

---

### Exact Token Changes (Option B)

**Consolidate dark surface tokens in `apps/web/styles/design-tokens.css`:**

```
--surface-base:    #0D1117   /* was bg-carbon — the single base surface */
--surface-raised:  #161B22   /* was bg-eclipse and many bg-gray-900 usages */
--surface-overlay: #1C2128   /* was bg-gray-800 overlays */
--surface-border:  #30363D   /* replaces border-gray-800, border-paper-border on dark */
```

**Accent desaturation:**
```
--accent-cyan:     hsl(191, 68%, 50%)   /* was hsl(191, 100%, 52%) — reduces vibration */
--accent-violet:   hsl(262, 60%, 62%)   /* desaturate from full ultraviolet */
```

**Pages to migrate (the two light outliers):**
- `apps/web/app/intelligence/engines/page.tsx` — replace `min-h-screen bg-paper text-ink` + `bg-paper-raised` cards with `min-h-screen bg-[var(--surface-base)] text-[var(--ion)]`
- `apps/web/app/players/page.tsx` — replace `min-h-screen bg-paper text-ink` + `border-paper-border` with `bg-[var(--surface-base)] text-[var(--ion)]`

**Pages to standardize (raw Tailwind dark pages):**
- `apps/web/app/board/page.tsx`, `apps/web/app/picks/page.tsx`, `apps/web/app/performance/page.tsx` — replace `bg-gray-950` with token class.

---

## SIMPLIFIED IA

### Proposed Top-Level Destinations (5 doors)

The existing nav already shows ~6 doors. The problem is 46+ top-level segments behind them. This IA enforces that **nothing lives outside a door.**

```
Board  |  Players  |  Intelligence  |  Fantasy  |  Account
```

Each door is named for what the **user wants to do**, not for an internal product concept.

---

### Door-by-Door Breakdown

**BOARD** — "What should I look at today?"

Merge into one destination:
- `/board` (keep as canonical route)
- `/picks` — CUT (verbatim clone of `/board`; zero unique value)
- `/today` — fold as a panel/tab on `/board`, not a separate route
- `/brief` — fold as a panel/tab on `/board`
- `/dashboard` (signed-in landing) — redirect to `/board`
- `/room/[gameId]` — drill-down from a board row (keep the route, surface from board)
- `/weather` — collapse into game/matchup card as a factor chip; not a top-level destination

Net: 5 → 1 canonical route + 1 child drill-down.

---

**PLAYERS** — "Who should I start / target / avoid?"

Keep `/players` as the single hub with the existing `?view=` tab pattern. DELETE the 10 standalone `/players/*` child routes (already shadowed by `?view=`):
- `/players/combine`, `/players/dfs`, `/players/edge`, `/players/injuries`, `/players/market`, `/players/nextgen`, `/players/opportunity`, `/players/qbr`, `/players/snaps`, `/players/trenches` — all route to the same lab via `?view=`

Fold into Players:
- `/intelligence/players` — MERGE; player research belongs under one hub
- `/nflverse` — FOLD as a data source view filter, not a standalone page
- `/mlb`, `/nhl` — FOLD as sport filters; multi-sport player surface

Net: 14 scattered routes → 1 hub with sport/view filters.

---

**INTELLIGENCE** — "Is this edge real? What does the model say?"

Move everything currently linked by `<IntelligenceSubnav>` under `/intelligence/*`:

Stays:
- `/intelligence` — cinematic showpiece / methodology storytelling (keep)
- `/intelligence/engines` — engine selector (keep)
- `/intelligence/metrics` — glass-box dictionary (keep)
- `/intelligence/proof` — track record (keep)

Move under `/intelligence/*`:
- `/trends` → `/intelligence/trends`
- `/observatory` → `/intelligence/observatory`
- `/airwave` → `/intelligence/airwave`
- `/track` → `/intelligence/track`
- `/the-beat` → `/intelligence/the-beat` (pick one newsroom — see below)
- `/human` → `/intelligence/human` or CUT (assess unique value)
- `/parlay-mri` → `/intelligence/parlay-mri`

Consolidate proof/track-record:
- `/ledger`, `/vault`, `/performance`, `/performance/losses`, `/intelligence/proof` — MERGE into ONE `/intelligence/track-record` surface with sub-tabs (Published Picks / Outcomes / Calibration). The user question "has this been right?" has one address.

Methodology:
- `/methodology` — KEEP; rename section clearly "How It Works"
- `/data` — KEEP; rename "Data Sources"
- `/integrations` — CUT (duplicate of `/data`; fold any unique content in)

Newsroom — pick one:
- `/the-beat` — KEEP (reliability-tiered newsroom; clearer job description)
- `/gsn` — CUT or redirect to `/intelligence/the-beat`
- `/blog`, `/journal` — FOLD as content types inside The Beat (article vs research note)
- `/changelog` — move to Company/Account group

Net: ~20 scattered routes → 7 clean `/intelligence/*` children.

---

**FANTASY** — "How do I win my league?"

- `/fantasy` — KEEP as the hub workspace
- `/optimizer`, `/fantasy/lineup`, `/fantasy/dfs`, `/players/dfs` — MERGE into one Lineup/DFS optimizer at `/fantasy/lineup` (or `/fantasy/optimizer`); CUT the duplicates
- `/parlay-mri` — MOVE under `/intelligence` (it is an analysis tool, not a fantasy tool)
- `/fantasy/academy` — FOLD into one site-wide Academy at `/learn` or as a tab inside Fantasy
- `/academy` (if separate) — MERGE with `/fantasy/academy`
- Draft, waivers, trade, props, contests remain as tabs inside the hub

Net: 4–5 optimizer/DFS routes → 1 unified surface.

---

**ACCOUNT** — (Nav icon/menu, not a top-level door in the horizontal nav)

Group non-product destinations under Account menu + footer "Company" section:
- `/pricing` — Account menu or footer
- `/about` — Company footer
- `/press`, `/faq`, `/changelog`, `/contact`, `/privacy`, `/terms`, `/responsible-play` — Company footer
- `/promotions` — FOLD under Account or CUT (thin page; cockpit/promo-desk handles ops)
- `/vs/tout-services` — FOLD into `/about` comparison section or CUT
- `/cipher` — move to a non-indexed `/play/cipher` easter-egg route

---

**OPS (hidden from users):**
- Collapse `/admin` (6 pages) INTO `/cockpit` (27 pages) — one operator console
- Route-guard behind staff auth; remove from sitemap

---

### Route Count Impact

| Before | After |
|--------|-------|
| ~122 routes, ~46 top-level segments | ~5 product doors + ~35 organized children + 1 ops tree |
| Concepts a new user must hold: ~15–20 | Concepts a new user must hold: **5** |

---

## TRANSPARENCY → PROGRESSIVE DISCLOSURE

### The Rule

> **Default (zero clicks):** Page title as a plain-English answered question + the data table/numbers + at most ONE orienting sentence above it. Column meanings live in hover/focus tooltips (already implemented in `DataTable` — this is the gold standard).
>
> **On-demand (one click):** Methodology definitions, formulas, normalization procedures, train/test windows, buy-low/sell-high doctrine, "commonly misread" — all behind a single "How we read it ▸" expander OR on the dedicated `/intelligence/metrics` + `/methodology` pages reached by a link.
>
> **Rule of thumb:** A metric's name + tooltip is the default. Its definition, formula, statistical caveats, and methodology essay are on-demand. Never state the same methodology twice on one page.

---

### Top 5 Cuts (Priority Order)

**Cut 1 — Delete the duplicated bottom `<Note>` in all 8 engine views.**

File: `apps/web/components/intelligence/engine-view.tsx`

The `Note()` helper (lines 58–60) re-prints `{f.note}` / `{model.note}` / `{z.note}` BELOW the table. The identical string is already passed as `note=` into the `SubHead` ABOVE the table. Eight views affected: `ExpectedPointsView`, `QbForwardView`, `RushingContactView`, `RouteRateView`, `ScoringZoneView`, `TeamEnvironmentView`, `OpportunityTransferView`, `ClvView`. Pure redundancy. Zero information loss. Highest confidence removal.

**Cut 2 — Collapse the always-open `MetricExplainer` into a closed expander on all 22 data pages.**

Files: `apps/web/components/ui/metric-explainer.tsx`, `apps/web/components/ui/page-hero.tsx`, `apps/web/app/intelligence/engines/page.tsx` (line 167), `apps/web/app/players/page.tsx` (line 64)

The `aside` prop currently renders 3 term/definition pairs (~6–9 sentences) open on every engine and player view. Change to: closed by default, labeled "How we read it ▸", opens inline on click. On pages where `DataTable` column tooltips already carry the definitions (which is most of them), consider removing the explainer entirely — the tooltip IS the disclosure layer.

**Cut 3 — Trim every `PageHero` description to one plain sentence.**

File: `apps/web/components/ui/page-hero.tsx` (lines 74–76), registry: `apps/web/lib/intelligence/registry.tsx` (11 `EngineEntry.description` fields), `apps/web/lib/players/views.tsx` (11 `PlayerView.description` fields)

Each is currently 2–4 sentences of methodology prose. Reduce to one sentence that names what the page answers. Move the "how it's computed" clause entirely out of the hero — it belongs in the on-demand explainer or the `/intelligence/metrics` dictionary.

**Cut 4 — Move ProofView methodology essays behind a "Methodology ▸" expander.**

File: `apps/web/components/intelligence/engine-view.tsx` (lines 888–907)

Two prose paragraphs (year-over-year description, multi-year normalization procedure) currently appear before the 3 KPI cards. Invert: lead with the KPI cards (Grade ρ, Lift, hit-rate) + one-line verdict, then a collapsed "Methodology ▸" expander for the statistical detail. The page answers "did this work?" — lead with the answer.

**Cut 5 — Deduplicate Player Lab blurb/footnote pairs.**

Files: `apps/web/lib/players/views.tsx`, `apps/web/components/players/player-lab-table.tsx` (lines 671–673 blurb, 692–694 footnote)

Many sections carry both a `blurb` above the table and a `footnote` below it that restates the same content (e.g., WOPR formula appears in footnote while blurb already references opportunity share). Move formulas and thresholds into the relevant column `tooltip` props (the established gold standard). Keep at most one blurb line (plain English, what the table answers). Cut footnotes that merely restate the blurb.

---

### What Stays (Do Not Touch)

- **DataTable column `tooltip` / `title` attributes** — this is the correct disclosure model; standardize everything else to match it
- **SubHead `note` line** above each table — one sentence of orientation is the right altitude
- **Attribution footer** (`apps/web/components/ui/attribution.tsx`) — already minimal, legally required
- **`/intelligence/metrics` dictionary page** — the right home for deep methodology; the fix is to *stop duplicating it elsewhere*, not to cut it
- **`/methodology` page** — keep as the on-demand trust destination; cut it from the homepage if it currently renders inline there
- **`DecisionAutopsy` + `SignalCourtroom` on `/intelligence`** — these belong on the cinematic showpiece page; tighten copy but keep the components

---

## HUMAN COPY VOICE GUIDE

### 7 Principles

**1. Lead with the sport, not the philosophy.**
The first noun in a hero should be a game, a line, a player, an injury, or an edge — not "the board," "the math," "the machinery," or "transparency." If a headline would fit on a meditation app, rewrite it.

**2. Retire the `X, not Y` antithesis as a default structure.**
Cap it at roughly one per page, and only when the contrast is genuinely surprising. Everywhere else, say the true thing as a plain declarative. Delete the reflexive "Not a pick." / "not advice" tags from engine descriptions — state the tool's purpose once globally, then stop repeating it.

**3. Talk like a sharp sports-data team to a smart friend.**
Contractions, specifics, and real verbs. "We grade every take against what actually happened" beats "A signal is a case, not a badge." Confidence is shown by being specific, not by sounding wise.

**4. Show the receipt instead of describing your honesty.**
State the threshold once, plainly ("Win rate goes live after 200 settled signals"), then stop reassuring. Cut: "real enough to defend," "a number we can't yet stand behind," "before the record exists," "No synthetic p-values," "No fabricated picks." The restraint is credible when it is brief.

**5. One eyebrow style, used sparingly.**
Mono-uppercase kickers (`font-mono text-[10px] uppercase tracking-[0.18em]`) should mark genuine section breaks, not decorate every paragraph. Prefer a plain section heading. If a section needs both an eyebrow and a heading, one of them is redundant.

**6. Kill the staccato fragment cadence.**
Replace fortune-cookie stacks ("Measured. Not guessed." / "Calibrated. Precise. Always acquiring.") with one real sentence that says what the product does. Start with `lib/brand.ts` — the voice definition file is the source of the clipped AI rhythm throughout the codebase.

**7. Ration the em-dash and extended metaphor.**
Use the dash for true asides, not for a dramatic pause in every sentence. Keep at most one signature metaphor for the brand (galaxy/signal) and drop the courtroom/war-room/autopsy pile-up. Concrete beats clever.

---

### 10 Before / After Rewrites (Real Strings)

**1. Homepage H1**
- BEFORE: "The board is only as smart as the data behind it." *(page.tsx:84)*
- AFTER: "Every pick comes with the data that made it."

**2. Homepage state description**
- BEFORE: "See the current state, not a promise." *(page.tsx:158)*
- AFTER: "Here's exactly what's live right now: what cleared, what we passed on, and which feeds are up."

**3. Homepage closer**
- BEFORE: "The math can point. The decision stays yours." *(page.tsx:314)*
- AFTER: "We do the analysis. You make the call — and you can see every step of ours."

**4. Intelligence hero**
- BEFORE: "See the reasoning, not just the number. / Most products hand you a pick and ask for trust. We show the machinery: thousands of independent reads, converging on a signal — and every one graded and recorded so it can be checked." *(intelligence/page.tsx:290–308)*
- AFTER: "See why, not just what. / Most sites give you a pick and say trust us. We show the work: several models price each game independently, and every signal is graded against the closing line so you can check it."

**5. Intelligence ticker**
- BEFORE: "Edge lives in the disagreement." *(intelligence/page.tsx:341)*
- AFTER: "When our models agree the market is mispriced, that's the bet."

**6. The Beat hero**
- BEFORE: "Breaking news, scored. / Everyone aggregates the beat writers. We do the part that matters: the instant a report lands, we weigh the source by tier, map it to the players and lines it moves, decay it by freshness, and tell you the move — before it's priced in." *(the-beat/page.tsx:37–45)*
- AFTER: "News, ranked by who's reporting it. / The moment a report drops, we rate the source, flag the players and lines it moves, and tell you whether it's worth acting on — before the market catches up."

**7. CLV Tracker hero**
- BEFORE: "Track the number, not the noise." *(track/page.tsx:33–34)*
- AFTER: "Closing Line Value is the only stat that proves you have an edge. Track it here."

**8. Observatory hero + restraint statement**
- BEFORE: "Don't take the pick. Enter the model." / "We would rather show you nothing than show you a number we can't yet stand behind." *(observatory/page.tsx:115, 167–170)*
- AFTER: "See the whole slate the way our model does." / "The Edge Map goes live once we have enough settled results to read it honestly. Until then, here's exactly what it'll show."

**9. Trends hero**
- BEFORE: "Find the edges before they become consensus. / ...The engine is ready. The public trend table stays empty until the data is real enough to defend." *(trends/page.tsx:69–75)*
- AFTER: "Spot the trend before everyone's betting it. / We test trends against real play-by-play data — targets, injuries, age curves, rest. Nothing gets published until the sample is big enough to trust."

**10. Brand pillars (source file)**
- BEFORE: "Data with purpose. / Measured. Not guessed. / See it first. Use it better. / Process over emotion." *(lib/brand.ts:75–92)*
- AFTER: "Real data behind every signal. / Numbers we can show, not hunches we're selling. / Catch the edge before the line moves. / A repeatable process, win or lose."

---

## PHASED EXECUTION PLAN

Phases are ordered to deliver visible owner wins first, then structural fixes, then polish. Sizes are effort estimates for a single developer: S = hours, M = 1–2 days, L = 3–5 days.

---

### Phase 1 — Theme Unification (Size: S)

**Goal:** Eliminate the two light-page outliers. The owner's complaint is resolved the moment every navigation click stays dark.

**Key files:**
- `apps/web/styles/design-tokens.css` — add `--surface-base`, `--surface-raised`, `--surface-overlay`, `--surface-border` tokens; desaturate `--accent-cyan` to hsl(191, 68%, 50%)
- `apps/web/app/intelligence/engines/page.tsx` — replace `bg-paper text-ink bg-paper-raised` classes
- `apps/web/app/players/page.tsx` — replace `bg-paper text-ink border-paper-border` classes
- `apps/web/app/board/page.tsx`, `apps/web/app/picks/page.tsx`, `apps/web/app/performance/page.tsx` — replace raw `bg-gray-950` with token class

**Do not touch:** `<Atmosphere/>` components, `BRAND_COLORS` dark values in marketing pages — those are already correct and serve the cinematic entrance.

**Validation:** Navigate the Intelligence subnav (engines → metrics → proof) and the Players tab — no dark/light flash.

---

### Phase 2 — Transparency Trim (Size: M)

**Goal:** Cut the methodology overload from data pages so the answer leads and the proof is one click away.

**Key files (in priority order):**
1. `apps/web/components/intelligence/engine-view.tsx` — delete 8 duplicate bottom `<Note>` calls
2. `apps/web/components/ui/metric-explainer.tsx` + `apps/web/components/ui/page-hero.tsx` — add `defaultOpen={false}` toggle to the aside; make it a `<details>`/expander component
3. `apps/web/app/intelligence/engines/page.tsx` (line 167) + `apps/web/app/players/page.tsx` (line 64) — pass `aside` only where column tooltips don't already cover it
4. `apps/web/lib/intelligence/registry.tsx` (11 `EngineEntry.description` fields) — trim each to one sentence
5. `apps/web/lib/players/views.tsx` (11 `PlayerView.description` + blurb/footnote fields) — trim descriptions; push formulas to column tooltips; cut duplicate footnotes
6. `apps/web/components/intelligence/engine-view.tsx` (ProofView, lines 888–907) — wrap essays in a `<details>` expander; promote KPI cards to the lead

---

### Phase 3 — IA Consolidation (Size: L)

**Goal:** Reduce the 46-segment top level to 5 doors. Each sub-task can ship independently.

**Phase 3a — Kill `/picks` (Size: S)**
- `apps/web/app/picks/page.tsx` — redirect to `/board`; update any nav links

**Phase 3b — Move Intelligence orphans under `/intelligence/*` (Size: M)**
- Add `/intelligence/trends`, `/intelligence/observatory`, `/intelligence/track`, `/intelligence/the-beat` redirects from their current top-level routes
- Update `<IntelligenceSubnav>` to use the `/intelligence/*` paths
- This makes the subnav's tab destinations match what it claims to organize

**Phase 3c — Consolidate proof/track-record (Size: M)**
- Merge `/ledger`, `/vault`, `/performance` content into one `/intelligence/track-record` surface with sub-tabs
- Add redirects from the three legacy routes

**Phase 3d — Players hub cleanup (Size: M)**
- Add redirects from `/players/*` child routes to `/players?view=*` equivalents
- Fold `/nflverse`, `/mlb`, `/nhl` as sport/view filters on `/players`

**Phase 3e — Board consolidation (Size: M)**
- Merge `/today` and `/brief` panels into `/board`
- Add redirects; update nav

**Phase 3f — Admin → Cockpit merge (Size: S)**
- Audit `/admin` vs `/cockpit` for any non-overlapping functionality; migrate
- Remove `/admin` from sitemap

---

### Phase 4 — Copy Rewrite (Size: M)

**Goal:** Make every hero and section head sound like a person who watched the game.

**Key files (in priority order):**
1. `apps/web/lib/brand.ts` — rewrite the voice definition and pillar fragments first; every downstream copy will improve once the source is human
2. `apps/web/app/page.tsx` — homepage heroes and section heads
3. `apps/web/app/intelligence/page.tsx` — TICKER_PHRASES array + hero + courtroom copy
4. `apps/web/app/track/page.tsx`, `apps/web/app/the-beat/page.tsx`, `apps/web/app/trends/page.tsx`, `apps/web/app/observatory/page.tsx` — heroes
5. `apps/web/lib/intelligence/registry.tsx` — engine names and one-line descriptions (the `X, not Y` tags on each engine)
6. `apps/web/app/pricing/page.tsx` — founding rate copy

**Rule for the rewrite pass:** For each string, ask: "Does the first noun reference a game, player, line, or edge? Does it pass the 'meditation app' test? Does it avoid `X, not Y`?" If any answer is wrong, rewrite.

---

### Sequencing Rationale

| Phase | Owner Pain It Resolves | Risk |
|-------|----------------------|------|
| 1 — Theme | "Some pages white, some dark" | Low — 2 files change |
| 2 — Transparency | "Over-feeding the transparency" | Low — deletions and collapses |
| 3 — IA | "Categories all over the place" | Medium — route changes need redirects |
| 4 — Copy | "Doesn't sound like real humans" | Low — copy only, no logic |

Phases 1 and 2 can ship the same day. Phase 3 sub-tasks are independent and can be deployed incrementally. Phase 4 can be parallelized with any of the above.

---

*Audit sources: live-site theme audit (25 routes), transparency audit (22 data surfaces), IA audit (122 routes), copy audit (24 AI-voice examples + 10 tics), competitor research (PFF, FantasyPros, Stathead, The Athletic, Sleeper, Underdog, PrizePicks, Rotowire).*
