# Cockpit Responsive / Breakpoint Audit

**Command:** `.claude/commands/responsive.md` — "Audit the cockpit grid and cards across
breakpoints (mobile, tablet, desktop). Find: overflow, cramped multi-column lists that should
stack, fixed widths, text that wraps badly, and touch targets under ~44px. Report per breakpoint
with the offending component + fix. **Don't change layout yet.**"

**Run:** 2026-09-25 17:05 CT · agent: hermes · branch: `hermes/live-wip-2026-09-24`
**Result: FINDINGS.** 2 real defects, 1 systemic, 3 refuted scanner hits, 2 clean sweeps.

**No product code was changed.** Per the command's last line, this is report-only.

---

## Method, and what it is not

Two tools, both shipped so the audit is reproducible:

1. **`node handoff/responsive-scan.mjs`** (add `--all` for the whole app) — five static rules
   over `apps/web/{app,components}`: R1 wide table, R2 fixed grid, R3 short touch target,
   R4 nowrap/truncate outside a table, R5 fixed width > 375px. The scanner is **exhaustive, not
   correct**. It over-reports by design and every hit is verified by hand below.
2. **A real headless Chrome driven over CDP** (temp harness, not in the repo) that reproduces the
   exact DOM shapes and Tailwind class strings copied out of the source, then measures
   `scrollWidth` vs `clientWidth` and `getBoundingClientRect()` at 375 / 768 / 1024.

The second tool exists because the first one cannot answer the question the command actually
asks. "Does this text wrap badly" and "is this element wider than its container" are computed
properties. Reading class strings and reasoning about CSS produces plausible stories; it does not
produce evidence. Every number in the findings section below was measured in a browser at a named
viewport, and two control specimens were included specifically to prove the measurement can
detect the failure it claims to detect.

**What this audit is NOT.** No rendered-pixel check against production: the cockpit is
admin-gated, so these are faithful DOM reproductions, not screenshots of the live authenticated
surface. Font loading differs (harness uses the browser default; production loads `--f-body`), so
absolute text widths carry a small error. No tablet-portrait 768px real-device check, no
orientation change, no dynamic-content stress (a 60-item table vs a 2-item table behaves
differently and only the empty/short case was reproduced). `sm:`/`md:`/`lg:` activation is inferred
from Tailwind defaults because `tailwind.config.ts` declares **no** `theme.screens` override, so
the standard 640/768/1024 breakpoints apply.

---

## Findings

### F1 — The cockpit has no navigation at all below 768px · SEVERITY: high

`apps/web/app/cockpit/layout.tsx:149-154`

```tsx
<aside className="hidden w-56 shrink-0 md:block" aria-label="Cockpit navigation">
  <CockpitNav nav={NAV} />
</aside>
```

`md:block` means the sidebar exists only at ≥768px. Below that the cockpit renders 28 destinations
(`NAV` in `layout.tsx:25-84`) and **no way to reach any of them**. There is no drawer, no
hamburger, no select, no footer nav. Verified: `grep` for drawer/sheet/hamburger/mobile-nav across
`app/cockpit/**` and `components/cockpit/**` returns nothing, and the only responsive visibility
class in either tree is this one `md:block`.

The repo already owns the fix's precedent: `apps/web/components/ui/mobile-nav.tsx` is the public
site's mobile nav, used by `components/ui/nav-auth.tsx:105,140`. The cockpit layout simply does
not use it.

**Fix:** render `<CockpitNav>` inside a `md:hidden` disclosure (a `<details>` element needs no
client component and no new dependency) so the 28 destinations are reachable below `md`, and keep
the `md:block` aside for desktop. Note this is a *new capability*, not a layout tweak, so it
belongs in its own task rather than a P4-4 style fix.

### F2 — The cockpit header overflows its own container on mobile with a realistic email · SEVERITY: medium

`apps/web/app/cockpit/layout.tsx:123-146`

The header row is `flex items-center justify-between` holding three fixed-width pills on the left
and `Signed in as {session.user.email}` on the right. There is no `flex-wrap`, no `truncate`, no
`min-w-0`, and no `overflow-*` anywhere in the row. The email is an arbitrary-length string.

Measured at 375px, holding the component's own class strings fixed and varying only the email:

| email length | example | overflow at 375 | at 768 | at 1024 |
|---|---|---|---|---|
| 11 ch | short owner address | 0px | 0px | 0px |
| 24 ch | personal address | 0px | 0px | 0px |
| 35 ch | work address | 0px | 0px | 0px |
| **43 ch** | `first.last+tag@domain.tld` | **14px** | 0px | 0px |
| **61 ch** | long subdomain | **134px** | 0px | 0px |

The threshold sits between 35 and 43 characters, so this does not fire for every operator and
will not show up in a casual check. It is a data-dependent overflow that appears only for
accounts with longer addresses, and it is worst exactly where the viewport is narrowest. Because
the row has no `overflow-hidden`, the overflow escapes into the page and the whole header row
pushes the layout rather than ellipsizing one field.

**Fix:** `min-w-0` on the email `<div>` plus `truncate` on the inner `<span>`, and `hidden sm:inline`
on the "Sports Intelligence OS" subtitle. That keeps the two identity pills (the part an operator
scans for) and drops the decorative subtitle first, which is the correct priority.

### F3 — Every interactive control in the cockpit is under the 44px touch floor · SEVERITY: medium, systemic

The command asks for "touch targets under ~44px". Measured, the answer is that the *pattern* is
wrong, not that a few components slipped.

Measured boxes (Chrome, 375px, real class strings):

| control | source | measured | short of 44px by |
|---|---|---|---|
| "JSON readiness" pill | `media/page.tsx:86` | 108 × **30px** | 14px |
| "Airwave" pill | `media/page.tsx:89` | 68 × **30px** | 14px |
| "Studio" pill | `media/page.tsx:92` | 60 × **30px** | 14px |
| "Content" pill | `media/page.tsx:95` | 68 × **30px** | 14px |
| ⌘K floating button | `cockpit-command-palette.tsx:135` | 75 × **38px** | 6px |

R3 in the static scan flags only 11 sites because it looks for an element whose *entire* class
string is short. The real scale is larger, and counting by repeated class string is the honest
measure of it: **`px-3 py-1.5` (which renders 30px) appears on 24 interactive `<Link>`/`<button>`
elements in the cockpit tree, and `px-3 py-2` (32px) on 15 more.** So this is one convention
applied 39 times, not eleven separate defects, and it will regress silently the next time someone
writes a new button. The palette FAB is `px-3.5 py-2` and measures 38px, so even the one control
that is already mobile-first misses.

There is no `min-h-[44px]` or equivalent anywhere in the cockpit tree, so nothing in the current
code holds the line when a new button is added.

**Weight this honestly:** the cockpit is an admin surface, presumably used on desktop, and WCAG
2.5.8 (Target Size Minimum, AA) explicitly exempts inline targets and has a 24px floor. Nothing
here is a *legal* failure, and the pills are 60-108px wide, so they are not hard to hit. This is
flagged because the command asked for it and because F1 means the mobile audience is not a
hypothetical: once a phone can navigate the cockpit at all, these become real targets.

**Fix:** adopt a single button class for cockpit actions rather than repeating per-call padding
strings, and give it `min-h-[44px]` at the `sm:` breakpoint and up, leaving the current compact
size below it if the density is wanted on phones. The palette FAB needs the treatment most, since
it is already a mobile-only affordance.

### F4 — `grid-cols-3` at 375px leaves 106px cells holding a 43-character caption on ~3 lines · SEVERITY: low

`apps/web/app/cockpit/agents/page.tsx:67` — three `StatusTile`s per agent card, no responsive
prefix. Measured at 375px: no overflow (0px), each cell 106px wide, and the 43-character caption
renders 41px tall at a 14px line height, i.e. **~3 lines inside a 106px column**.

The 8px uppercase label above it (`StatusTile` at `status-tile.tsx:57`, `text-[8px]` with
`tracking-[0.16em]`) is the sharper half of this: it is 8px, which is below every legibility floor
in common use and is not a size any breakpoint should ship at, and it is fixed with no
`sm:text-[9px]` or similar step. The parent card grid is correctly responsive
(`grid-cols-1 md:grid-cols-2` at `agents/page.tsx:43`), so this is the inner stat row only.

**Fix:** `grid-cols-3` is defensible for three integer counters, so the real change is the
caption: hide it below `sm` (`hidden sm:block`) so the mobile cell shows label plus number, and
step the label from `text-[8px]` to `text-[9px]` at `sm:`.

The other three R2 hits are the same shape and the same verdict: `journal/[entryId]/page.tsx:76`
(two counters, fits), `media/page.tsx:140` (two tiles, fits), `cockpit/page.tsx:1038` (Target /
Win Rate, fits). None overflows; only the 8px label is worth changing.

---

## Refuted scanner hits — recorded so nobody re-runs this

These came back from the static scan and did not survive measurement. They are the reason the
audit has a browser in it.

**R4, all 8 `truncate` sites: 0px overflow, every one.** The scan flags `truncate` without
`min-w-0` as an overflow risk. Measured at 375px, `cockpit/page.tsx:499,507,837,843`,
`integrity/page.tsx:78`, `synthetic-monitoring/page.tsx:152,201`,
`journal/[entryId]/page.tsx:124` and `agent-council-panel.tsx:165` all report
`scrollWidth == clientWidth`. The scan's rule is wrong for this tree: in every case the
`truncate` sits on a block or flex child, where `min-width:auto` already resolves to 0 because
`overflow:hidden` is set. The rule is only load-bearing for a **grid** item, and the cockpit's
`truncate` sites are not grid items. `agent-council-panel.tsx:165` is the one that would break,
and it already has `min-w-0` on its wrapper at line 164.

The two control specimens were built to prove the measurement could detect this class, and both
reported 0px, which is consistent with the rule not applying here rather than with a broken
measurement. **The R4 rule is retained in the script but should be read as "truncate on a grid
item", not "any truncate".**

**R1, wide tables: a clean sweep, 22 of 22 app-wide.** Six cockpit tables carry
`min-w-[800px]` through `min-w-[1200px]` (`airwave:302` 920, `content:169` 800,
`jarvis/trend:60` 900, `sources:287` 980, `sources:362` 860, `history:470` 1200). Every one
already has an `overflow-x-auto` ancestor, verified by reading the enclosing element, and the
scan reports `scroll-ancestor:YES` for all 22 hits across the whole app. This is the codebase
getting a hard class right, and the report says so rather than manufacturing a finding.

**R5, fixed widths: 1 hit, and it is a table.** `history/page.tsx:470`'s `min-w-[1200px]` was
counted as a non-table fixed width by the scan; it is on a `<table>` with a scroll ancestor, so
it belongs to R1. Zero genuine non-table fixed widths in the cockpit.

---

## Per-breakpoint summary

| | 375 (mobile) | 768 (tablet) | 1024 (desktop) |
|---|---|---|---|
| **Navigation** | **absent (F1)** — 28 destinations unreachable | present (`md:`) | present |
| **Overflow** | header only, ≥43ch email (F2) | none | none |
| **Wide tables** | 6 scroll horizontally, correct | correct | correct |
| **Text truncation** | 0 overflow, all 8 sites | 0 | 0 |
| **Touch targets** | 30-38px (F3) | 30-38px | 30-38px |
| **Cramped grids** | 106px cells, 3-line caption, 8px label (F4) | comfortable | comfortable |

---

## Recommended order, and the one thing not to do

1. **F1 first.** Until a phone can navigate the cockpit, F2 and F3 are desktop issues and F4 is
   cosmetic. F1 also has the clearest precedent in the repo (`components/ui/mobile-nav.tsx`).
2. **F2 second.** Small, self-contained, and the `min-w-0` + `truncate` pair is a pattern the
   codebase already uses correctly elsewhere.
3. **F3 third, as one class not eleven edits.** Extract the repeated pill class before changing
   it, or the next new button reintroduces 30px.
4. **F4 last.** Hide the caption below `sm`; step the 8px label to 9px.

**Do not** "fix" this by suppressing the numbers or by tightening the R1/R4 rules in
`responsive-scan.mjs` until the scan comes back clean. R1 is a clean sweep because the code is
correct; R4 fires on correct code. Tightening either rule would make the scanner agree with
itself while the mobile surface stays broken, which is the same failure the confidence-ranking
work in this repo was written to avoid.

---

## Reproducing

```bash
node handoff/responsive-scan.mjs        # cockpit (60 files)
node handoff/responsive-scan.mjs --all  # whole app (508 files)
```

Both guards pass on this file and the scanner:
`node scripts/guardrails/commercial-copy-scan.mjs` → OK, 470 files.
`node scripts/guardrails/em-dash-scan.mjs` → OK, 9 copy files.

The browser measurements are reproducible but their harness is **not** committed: it lives in
`%LOCALAPPDATA%/Temp/resp-audit/` and imports no product file. That is a deliberate gap, stated
rather than papered over. If these numbers need to be re-checked later, the harness has to be
rebuilt, and the one number that is cheap to re-derive without it is the 44px touch table
(arithmetic on the padding classes) and the header overflow threshold (the email-length sweep).
