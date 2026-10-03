# UI CONSISTENCY AUDIT - P4-5 (`ui-audit.md`)

**Date:** 2026-09-26 · **Branch:** `hermes/live-wip-2026-09-24` · **HEAD at audit:** `03b9df244`
**Command:** `.claude/commands/ui-audit.md` - "Audit the cockpit UI for visual consistency. Do NOT edit yet."
**Verdict: FINDINGS. 3 high, 4 medium, 3 low. Zero product code changed.** The command's last line is report-only and the previous four rows in this phase (P4-1..P4-4) set the precedent, so this ships a report plus three reproducible read-only helpers and touches nothing else.

| helper | what it does | exit |
|---|---|---|
| `node handoff/ui-audit-scan.mjs` | 6 ladders (surface, radius, type, heading, accent, spacing) over 60 cockpit files / 2,277 className lines. `--all` widens to the whole app | 0 |
| `node handoff/surface-math.mjs` | resolves the surface tokens and composites every `bg-<family>/<alpha>` over the real page ground | 0 |
| `node handoff/accent-math.mjs` | resolves the accent tokens, reports name collisions, composites the nav active/hover states | 0 |

`git status` after the audit is clean apart from these files. Both copy guards pass on them: `em-dash-scan OK 9 files`, `commercial-copy-scan OK 470 files`.

---

## Scope and method

60 `.tsx` files, 2,277 className lines: `apps/web/app/cockpit/**` (35 `page.tsx` plus form/workspace/control files) and `apps/web/components/cockpit/**` (19 components).

The command asks five questions. Four of them are answerable from class strings. The fifth, "does each accent read as the same accent", is a compositing question, because the token file deliberately repoints retired names onto survivors. So the report is built in two layers:

1. **Census** (scanner): how many distinct values exist on each ladder, and where.
2. **Composite** (the two math scripts): what those values actually render, in RGB deltas against the real page ground.

Layer 2 exists because layer 1 alone produces a false story. `bg-obsidian/50`, `bg-obsidian/60` and `bg-obsidian/70` read as three surfaces in a class-string census and are in fact **the same colour as the page**. Every number below is either a count from the scanner or an RGB delta from the compositing scripts; nothing here is an eyeball estimate.

---

## F1 (HIGH) - 201 of 323 card shells paint a surface that is byte-identical to the page

`design-tokens.css:9-14` gives the dark scale three values across six names:

```
--void --obsidian --carbon   ->  #08090C
--eclipse                     ->  #12141A
--titanium --slate            ->  #191C23
```

The cockpit page ground is `bg-obsidian/60` (`layout.tsx:122`) composited over the html ground `#08090C` (`design-tokens.css:308`). Both are `#08090C`, so the page renders at exactly `#08090C`.

`handoff/surface-math.mjs`:

```
bg-obsidian/40 .. /80         #08090C    dRGB(0,0,0)   <- ZERO DELTA
bg-carbon/20 .. /90           #08090C    dRGB(0,0,0)   <- ZERO DELTA
bg-eclipse/40                 #0C0D12    dRGB(4,4,6)
bg-eclipse/50                 #0D0F13    dRGB(5,6,7)
bg-eclipse/70                 #0F1116    dRGB(7,8,10)
bg-titanium/40                #0F1115    dRGB(7,8,9)
```

Counts, from the scanner and grep (className-scoped, so a class string split across
lines is not double-counted):

- **232** className lines paint `bg-(obsidian|carbon|void)/<n>`.
- **85** className lines paint `bg-(eclipse|titanium|slate)/<n>`, which do lift.
- **323** className lines pair a `border-*` with a `bg-<family>/<n>`, i.e. are card shells. **201 of those 323** pair the border with an obsidian/carbon/void surface.

The most common shell shapes:

| shell class | sites | rendered |
|---|---|---|
| `rounded-lg border border-titanium/40 bg-obsidian/50` | 35 | no surface |
| `rounded-lg border border-titanium/40 bg-obsidian/60` | 34 | no surface |
| `rounded-2xl border border-titanium/40 bg-carbon/80` | 10 | no surface |
| `rounded-xl border border-titanium/40 bg-obsidian/70` | 9 | no surface |
| `rounded-2xl border border-titanium/40 bg-eclipse/40` | 48 | lifts dRGB(4,4,6) |

**Why it hurts polish.** A card that paints its own ground colour is a rectangle defined only by its 1px border. That is not elevation, it is a wireframe. Two thirds of the cockpit's cards read that way, and the one convention that does lift (`bg-eclipse/40`, 65 sites) is used by less than a quarter of them, so the eye reads a flat wall with a few panels mixed in rather than a consistent surface stack.

**Fix.** Repoint the card surface to one family at one alpha, and make it the one that already lifts. `bg-eclipse/40` + `border-titanium/40` is the existing majority lifting shell and needs no new value. Do it as a per-file review, not a blind `sed` (see NOT DETERMINED).

---

## F2 (HIGH) - on the two most-used cockpit pages the `h1` is the smallest text and the title is not a heading

`app/cockpit/page.tsx` and `app/cockpit/command-center/page.tsx` each put `<h1>` on a 9px uppercase mono micro-label:

```
page.tsx:162          <h1 className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">
                          Galaxy Sports Edge · Jarvis Owner OS
command-center:60     <h1 className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">
                          Command Center · ranked owner attention
```

and the page's actual title is a `<p>`:

```
page.tsx:201          <p className="mt-2 text-xl font-medium leading-snug text-ion-white/95 sm:text-2xl">
command-center:81     <p className="text-xl font-medium leading-snug text-ion-white/95 sm:text-2xl">
```

The other 34 pages do it the right way round: `text-2xl font-bold text-ion-white` on the `h1` (18 sites bare, 14 with `mt-1`, 1 with `mt-1.5`).

**Why it hurts polish.** The document outline of the cockpit's landing page and its second page is inverted: the top heading is the smallest element on the screen and the thing a reader identifies the page by is anonymous body text. It also makes the cockpit's own heading ladder unenforceable, because the two most-visited pages do not participate in it. This is a semantics defect that happens to be a polish defect, and it is the one finding here that a customer could notice without being able to say why.

**Fix.** Swap the two on each page: title becomes the `h1`, the micro-label becomes a `p` or `div`. Two files, four lines.

---

## F3 (HIGH) - the line above the page title is amber on 10 of 12 pages, fog on the other 2, and never the token reserved for it

Twelve cockpit pages carry a text-eyebrow line directly above the `h1`. Census of the colour on that line:

| colour | pages | resolves to |
|---|---|---|
| `text-caution` | **10** | `#FFB454` amber |
| `text-orbital-cyan` | 1 (airwave) | `#C4BFB6` |
| `text-ultraviolet` | 1 (media) | `#C4BFB6` |
| no eyebrow at all | 23 of 35 pages | - |

The amber sites, exact: `cockpit/api-costs/page.tsx:38`, `bot-outbox/page.tsx:22`, `journal/page.tsx:118`, `journal/new/page.tsx:13`, `journal/[entryId]/page.tsx:149`, `nova/page.tsx:26`, `nova/founder/page.tsx:45`, `sources/page.tsx:162`, `studio/page.tsx:19`, `synthetic-monitoring/page.tsx:33`.

The two exceptions, exact: `airwave/page.tsx:73` (`text-orbital-cyan`) and `media/page.tsx:80` (`text-ultraviolet`). Both resolve to the same `#C4BFB6` as `text-ion-1`, i.e. body secondary text, so a reader sees a title with a barely-lifted label under it.

`--caution` is documented as a state colour (`design-tokens.css:141`, amber caution). It is also the colour of the cockpit's own permanent chrome badge, `Cockpit · Internal` (`layout.tsx:105-107`, `bg-caution/40 text-caution`), on every page of every operator. The token the file reserves for section identity, `--iris` (`#9AA8E8`, "the wayfinding accent ... Active nav, current-section markers, wayfinding only", `design-tokens.css:65-70`), is used in **2 places app-wide and 0 in the cockpit**.

**Why it hurts polish.** Ten of twelve page titles are rendered in the product's warning colour, so amber no longer means anything on a page header, and a real amber warning in a body panel has nothing left to contrast with. It is the loudest single inconsistency in the cockpit, and it is also the cheapest to fix.

**Fix.** One decision, applied 12 times: the eyebrow is `--ion-3` (or `--iris` if the cockpit wants an identity accent, which the token file already sanctions for exactly this). Leave the `Cockpit · Internal` badge amber only if "internal" is genuinely a caution state; if it is not, it wants the same treatment as F3.

---

## F4 (MEDIUM) - the nav active state and the nav hover state are both nearly invisible, and hover paints no surface at all

`components/cockpit/cockpit-nav.tsx:36-40` and `:89`:

```
active : border-orbital-cyan/40 bg-orbital-cyan/10   + a 2px bg-orbital-cyan rail
hover  : border-titanium/70  hover:bg-carbon/60
```

`handoff/accent-math.mjs`, composited over the page ground:

```
ACTIVE  wash  bg-orbital-cyan/10  ->  dRGB(19,18,17)
ACTIVE  border orbital-cyan/40   ->  dRGB(75,73,68)
HOVER   bg    carbon/60          ->  dRGB(0,0,0)      <- exactly the page
HOVER   border titanium/70       ->  dRGB(12,13,16)
```

Two separate problems in four class strings:

1. **The hover background is inert.** `bg-carbon/60` over `#08090C` is `#08090C`. Hovering a nav row raises nothing; the only hover signal is a 1px titanium/70 edge that lifts dRGB(12,13,16), i.e. **less than half the lift the active row gets from its wash alone**.
2. **The active state uses fog for wayfinding.** `bg-orbital-cyan/10` is `#C4BFB6` at 10%, which is body secondary text at 10%. The token file has `--iris` for this and it is unused here.

**Why it hurts polish.** On a 28-destination sidebar, "where am I" and "what am I about to click" are the two most load-bearing affordances, and both are carried by a hairline. A reader has to hunt for the active row.

**Fix.** Two values, both already in the token file: active on `--iris` (`bg-iris/10 border-iris/40`, or the rail only), hover on `--titanium` at a real alpha (`bg-titanium/40`, which lifts dRGB(7,8,9) as measured). This is the only finding in the report that is a strict improvement with zero new tokens.

---

## F5 (MEDIUM) - 438 sub-12px arbitrary font sizes, down to 7px, against a declared 12px floor

`design-tokens.css:286-288`:

```
/* Eyebrow bumped from 11px to 12px floor (was often rendered ~10px). */
--t-eyebrow:    500 12px/1.3 var(--f-mono);
--t-eyebrow-lg: 500 13px/1.3 var(--f-mono);
```

Cockpit census of arbitrary px sizes:

| class | className lines | vs the 12px floor |
|---|---|---|
| `text-[10px]` | 222 | -2px |
| `text-[11px]` | 124 | -1px |
| `text-[9px]` | 65 | -3px |
| `text-[8px]` | 25 | -4px |
| `text-[7px]` | **1** | -5px |
| `text-[12px]` | 8 | on the floor, by accident |
| `text-[13px]` | 1 | on the floor, by accident |

Plus 293 className lines (12.9%) carry text under 11px.

The smallest site is `components/cockpit/agent-council-panel.tsx:169`, a `text-[7px]` uppercase badge. The next two files, `agent-council-panel.tsx` and `ask-jarvis-panel.tsx`, hold 12 of the 25 `text-[8px]` sites. `status-tile.tsx:57` is `text-[8px]` and, per the P4-4 row, has no `sm:` step.

Meanwhile the repo **ships the primitive that solves this**: `.eyebrow` (`design-tokens.css:328-333`) resolves `--t-eyebrow` and is used **124 times app-wide and 0 times in the cockpit** (the single `eyebrow` hit inside the cockpit is a `card.eyebrow` data property in `mission-control-view.tsx:31`, not the class). The cockpit hand-rolls at least 8 distinct eyebrow shapes (30 x `uppercase tracking-wide text-ion-3`, 24 x `text-xs font-semibold uppercase tracking-widest`, 17 x the same with `mb-2`, 10 x `font-semibold ... text-caution`, and so on).

**Why it hurts polish.** Below roughly 10px the monospace face stops being readable and the cockpit starts to look like a debug view rather than a product. The declared floor exists precisely because someone already found this; the cockpit is entirely on the wrong side of it.

**Fix.** Adopt `.eyebrow` (or a Tailwind `text-eyebrow` size token, which `tailwind.config.ts:225` already defines at 12px and which has **0 uses app-wide**) and delete the arbitrary sizes. Mechanical, but it touches ~440 lines, so it wants a sweep with the copy guards run after.

---

## F6 (MEDIUM) - `<h2>` appears in 28 distinct shapes across 110 sites, doing two incompatible jobs

`node handoff/ui-audit-scan.mjs`, section U4 (the scanner covers `app/cockpit` **and** `components/cockpit`; the split below is `app/cockpit` only, 105 of 106 `h2` tags carry a literal `className`):

```
<h1>  36 sites,  5 distinct shapes
<h2> 110 sites, 28 distinct shapes     (106 in app/cockpit, 4 in components/cockpit)
<h3>  22 sites,  8 distinct shapes
```

The `h2` split is not noise, it is two roles that were never named:

- **eyebrow role, 63 sites** - `text-xs font-semibold uppercase tracking-widest text-ion-3` in five margin variants (`none`, `mb-2` x17, `mb-3` x6, `mb-1`, `mt-1`)
- **section-title role, 42 sites** - `text-sm font-semibold text-ion-white` (19), `text-base font-semibold text-ion-white` (9), `text-lg font-semibold text-ion-white` (2), plus margins

And four `h3`s are eyebrow-styled, i.e. a heading level demoted to a label: `calibration/page.tsx:593`, `sources/page.tsx:466,501,533`.

**Why it hurts polish.** A heading level that means "tiny caps label" 57% of the time cannot carry hierarchy, so nothing in the cockpit has a real section-title level, and the reader gets no size signal between page and card. The four `h3` eyebrow sites are the visible symptom: `sources/page.tsx:466` renders "Top safe opportunities" as a 10px caps label where a reader expects a heading.

**Fix.** Two named `h2` roles, one margin owned by the parent, one real `h3`. Small, but it is the change that makes the other two type findings enforceable afterwards.

---

## F7 (MEDIUM) - the cockpit adopted no shared UI primitive, and re-implemented two that already exist

Across all 60 cockpit files there is **exactly one** import from `@/components/ui`:

```
1 import { Footer } from "@/components/ui/footer";
```

The repo ships and already uses, on the public app:

- `components/ui/page-hero.tsx` - eyebrow + title + description + actions + aside, with a `dark` variant whose eyebrow is `text-orbital-cyan` and title `text-ion-white` (`page-hero.tsx:28-40`). Used by `app/players/page.tsx:130` and `app/intelligence/engines/page.tsx:195`. **0 cockpit uses.**
- `components/ui/kpi-card.tsx` - label + value + sublabel with a `dark` variant (`border-mineral bg-eclipse`, `text-ion-1` / `text-ion-white`), tabular numerals, tone helpers. Used by `components/intelligence/engine-view.tsx:882-895`. **0 cockpit uses.**

What the cockpit does instead:

- every page hand-rolls its own header block (F2, F3, F6 are all consequences of this)
- `command-center/page.tsx:189` `CountCell` and `history/page.tsx:577` `Stat` are two independent copies of what `KpiCard` already is
- `cockpit/page.tsx:700`, `command-center/page.tsx:207` and `integrity/page.tsx:124` are three more inline stat-value blocks, all `mt-1 font-mono text-2xl font-semibold tabular-nums`

**Why it hurts polish.** Consistency is not achievable by editing 60 files, only by deleting the hand-rolled copies. It is also the reason the accent and surface inconsistencies in F1 and F3 are so widespread: nothing in the cockpit propagates a token change except by hand.

**Fix.** Adopt `PageHero` for the 35 page headers and `KpiCard` for the 5 stat blocks, then delete the local copies. The `dark` variants need one adjustment each (the hero eyebrow per F3) and that adjustment is the whole point.

---

## F8 (LOW) - nine radius steps for one object type, and the design system's own radius scale is used once

`node handoff/ui-audit-scan.mjs`, section U2:

```
175  rounded-lg
 84  rounded-2xl
 63  rounded      (bare, 0.25rem)
 46  rounded-xl
 45  rounded-full
 33  rounded-md
  4  rounded-3xl
  3  rounded-sm
  1  rounded-ds-lg
```

`tailwind.config.ts:256-262` defines a four-step radius scale (`ds-xs` 3px, `ds-sm` 6px, `ds-md` 10px, `ds-lg` 14px). The cockpit uses `rounded-ds-lg` **once**, in `components/cockpit/mission-control-how.tsx:46`, against 68 uses app-wide.

The same logical object, a card, is drawn at 0.25 / 0.375 / 0.5 / 0.75 / 1 / 1.5rem depending on the file. The three most common shells from F1 are `rounded-lg`, `rounded-2xl` and `rounded-xl` on the same border and the same surface.

**Fix.** One radius per role: cards, controls, pills. Nothing new; the scale is already in the config.

---

## F9 (LOW) - five page-wrapper rhythms, and two pages re-declare the layout's own chrome

Vertical rhythm of the 35 cockpit page roots:

```
25 x  flex flex-col gap-6
 5 x  flex flex-col gap-4
 2 x  flex flex-col gap-8
 1 x  flex flex-col gap-5
 2 x  no gap wrapper of their own
```

Two outliers:

- `film-room/page.tsx:27` - `<div className="min-h-screen bg-obsidian/60 px-4 py-10 sm:px-6 lg:px-8 text-ion-1">` inside a layout that already applies `min-h-screen` and `px-4 py-6 sm:px-6 lg:px-8` (`layout.tsx:122,146`). Stacked result: 40px + 24px = **64px of vertical padding**, and a page that is one viewport tall inside a layout that is already one viewport tall plus a 56px header, so this page scrolls where no other cockpit page does. Its `bg-obsidian/60` is inert per F1.
- `settlement-hold/page.tsx:60` - `<main className="mx-auto max-w-3xl p-4">`, a **second `<main>` landmark nested inside the layout's `<main>`** (`layout.tsx:155`), with an `h1` at `text-lg font-bold text-ion-1` instead of the cockpit's `text-2xl font-bold text-ion-white`, and no eyebrow. This is the fifth `h1` shape in F6's table.

**Fix.** One `gap-*` for page roots; both outliers adopt the standard wrapper. The nested `<main>` is a one-line correctness fix, not a design one.

---

## F10 (LOW) - elevation and glow are clean; state colours are used as identity

Two sub-sweeps came back clean and are recorded so nobody re-runs them:

- **Glow / elevation.** The whole 60-file cockpit uses `shadow-glow-plasma` 3 times, `shadow-2xl` 2, `shadow-black` 2. No glow abuse, no shadow stacking. The "atmosphere carries the depth, not decorative shadow" doctrine is holding in the cockpit.
- **Grid alignment.** `grid-cols-2` (25) with `sm:grid-cols-2` (27) / `-3` (10) / `-4` (14) / `-5` (2) and `lg:` steps. The responsive staircase is consistent; no page opts out. (P4-4 already covered the mobile half and found the nav gap, F1 there.)

The state colours themselves are used consistently as states: `caution` 328, `alert` 192, `verify` 144, `alarm` 27. The inconsistency is not the state ladder, it is that `caution` additionally wears the page-identity job in F3.

---

## The accent ledger, in one table

`handoff/accent-math.mjs`, resolving the real `var()` chain out of `design-tokens.css`:

```
token               hex       role
--ion-white         #EDE8E0   BONE primary text
--ion-1             #C4BFB6   FOG secondary text
--ion-2             #8F8A82   MIST tertiary
--plasma            #FF4D2E   EMBER action accent
--iris              #9AA8E8   IRIS  documented wayfinding accent
--orbital-cyan      #C4BFB6   used by cockpit ACTIVE NAV
--ultraviolet       #C4BFB6   used in cockpit h2 + stat
--ion-blue          #C4BFB6   legacy alias
--cyan              #C4BFB6   legacy alias
--verify            #5FD9A3   mint positive
--alert             #FF6470   rose critical
--caution           #FFB454   amber caution

collision: #C4BFB6 == --ion-1 == --orbital-cyan == --ultraviolet == --ion-blue == --cyan
```

The command asks whether each accent is used consistently. The honest answer has two halves:

- **Within the cockpit, yes, degenerately.** `text-orbital-cyan` (15 sites) and `text-ultraviolet` (7) are five different names for one colour, so they render identically everywhere they appear. Nothing looks broken; the reader just cannot tell that two roles share a colour.
- **Against the token file, no.** The file's own role comments say plasma is the single action accent, iris is wayfinding, orbital-cyan and ultraviolet are retired-and-repointed. The cockpit uses `plasma` (20 sites) for links and accent text, uses the retired names for wayfinding and section labels, and uses `iris` nowhere.

---

## NOT DETERMINED - stated so the fix is not done blind

1. **No rendered-pixel check.** Every number here is a class-string count or a hand-composite from the token values, not a browser screenshot. The compositing scripts assume Tailwind's opacity modifier emits `rgba(<token>, <alpha>)`, which is the documented v3 behaviour, but that was not confirmed against a computed style.
2. **F1's ancestor chains are not all traced.** I verified the cockpit's own page ground (`layout.tsx:122` over `design-tokens.css:308`). A card nested inside a lifted ancestor (an `eclipse` or `titanium` wrapper) would legitimately show a delta, and I did not walk every one of the 201. F1's fix is therefore per-file review, not a blind `sed` - the same constraint the P4-3 row set for the `text-ink-*` sweep.
3. **Alpha tokens inside nested opacity are not modelled.** A `bg-obsidian/50` inside an element with `opacity-90` composites differently.
4. **The eyebrow census covers 12 of 35 pages** (the ones carrying a `text-[10px] ... uppercase tracking-widest` line above the `h1`). 23 pages have no eyebrow at all. The "10 of 12" ratio is among pages that have an eyebrow, not across the cockpit.
5. **Heading order was counted from tags, not from an accessibility tree.** F2 and F6 are tag-level facts; I did not run a screen-reader outline check, and `command-center` has 4 `h2` and 0 `h3`, which may or may not be correct.
6. **The `ds-*` spacing scale is defined and unused.** `tailwind.config.ts:238-251` declares a 13-step spacing scale; the cockpit uses `p-*`/`gap-*` throughout and `ds-*` **0 times**. I did not audit whether `ds-*` is dead repo-wide or only dead in the cockpit, so F-list spacing is reported as an observation, not a finding.
7. **The cockpit is admin-gated**, so no live screenshot of a real page was possible. The compositing is exact arithmetic over the token values, not a photograph.
8. **Border-weight ladder not audited.** `border-titanium/40` is 294 sites and `border-titanium/30` is 8, but I did not check whether the `/30` sites are a nested-tier convention or drift.

---

## Suggested order, if this gets actioned

1. **F2** - 4 lines, 2 files, the only finding a customer can see without knowing why.
2. **F3 + F4** - the accent decision, made once and applied to 12 pages and 4 class strings. No new tokens.
3. **F1** - the surface decision, one family one alpha, per-file review. Largest count, mechanical once decided.
4. **F7** - adopt `PageHero` and `KpiCard`, which is what makes 5 and 6 enforceable afterwards instead of aspirational.
5. **F5 + F6** - the type sweep, after the heading roles are named.
6. **F8, F9, F10** - cleanup, any time.
