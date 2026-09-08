# Frontend quality audit: is the frontend world class?

Dimension: **IS THE FRONTEND WORLD CLASS?**
Scope: `apps/web/app` (236 `page.tsx`, 289 `.tsx`) and `apps/web/components` (191 `.tsx`).
Posture: read-only. No source edited, no git write, no gate or flag proposed for change.
Date: 2026-09-08.

**Verdict in one line.** The *content* layer is genuinely excellent and in places better
than most paid products: the empty, gated, outage and "read failure vs actually empty"
states are carefully distinguished and honestly worded, and the epistemic discipline in
the copy is real. The *presentation* layer has not kept up. There is a systemic WCAG AA
contrast failure across 185 call sites that the design system itself already diagnosed
and then failed to finish fixing, the brand's primary color carries six contradictory
meanings inside a single card, and there is no automated guard anywhere in the 26-script
guardrail suite that would catch any of it. Against the bar of a paid frontier product,
this is not yet world class. It is a strong product wearing an unfinished accessibility
and color-semantics layer.

---

## What I checked (with commands run)

Every ratio below was computed, not read off a comment. The two scripts used:

```bash
# WCAG 2.1 relative-luminance contrast for every design token on every surface
node /tmp/.../scratchpad/contrast.mjs
# Alpha-composited contrast for the pervasive `text-<accent> bg-<accent>/N` chip pattern
node /tmp/.../scratchpad/chip.mjs
```

Structural inventory:

```bash
find apps/web/app -name "loading.tsx" | sort            # 16
find apps/web/app -name "error.tsx" | sort              #  6
find apps/web/app -name "page.tsx" | wc -l              # 236

grep -rn 'role="dialog"\|aria-modal' --include=*.tsx app components
grep -rn 'role="progressbar"' --include=*.tsx app components          # 0
grep -rn "<div[^>]*onClick\|<span[^>]*onClick" --include=*.tsx        # 0  (good)
grep -rn "focus-visible:outline-none\|focus:outline-none" ... | wc -l # 47, 32 with no replacement
grep -rEo 'text-\[(8|9|10|11)px\]' --include=*.tsx app components     # 31 / 120 / 694 / 441
for c in ink-400 ink-500 ink-600; do grep -rn "text-$c\b" --include=*.tsx app components | wc -l; done  # 55 / 92 / 38
grep -rln "<table" --include=*.tsx app components | wc -l             # 35
grep -rno "<th" ... | wc -l ; grep -rno 'scope="col"\|scope="row"' ... | wc -l   # 396 / 266
grep -rn "<img" --include=*.tsx app components | grep -vc "alt="      # 0 genuinely missing
ls scripts/guardrails/                                                # 26 scripts, none about a11y
```

Files read in full or in substantial part: `app/globals.css`, `styles/design-tokens.css`,
`tailwind.config.ts`, `app/picks/page.tsx`, `app/not-found.tsx`, `app/error.tsx`,
`app/calibration/page.tsx`, `app/optimizer/page.tsx`, `app/edge-index/page.tsx`,
`app/intelligence/metrics/page.tsx`, `components/picks/pick-card.tsx`,
`components/picks/evidence-audit-drawer.tsx`, `components/proof/proof-explorer.tsx`,
`components/fantasy/dfs-optimizer.tsx`, `components/hero/enter-gate.tsx`,
`components/ui/nav.tsx`, `components/ui/nav-menu.tsx`, `components/ui/tabs.tsx`,
`components/ui/tool-page-skeleton.tsx`, `components/explainers/page-explainer.tsx`,
`components/home/tout-comparison.tsx`, `lib/fantasy/dfs-slate.ts`.

---

## Findings

### 1. BLOCKER: 185 text call sites fail WCAG AA on the dark theme, using the exact hex values the design system already documented as failures

`apps/web/styles/design-tokens.css:31-39` and `:171-173` contain an explicit,
dated WCAG remediation. It names two hexes as failures and replaces them:

```
styles/design-tokens.css:31   /* WCAG AA fix: --ion-2 re-valued from #5E6878 (3.36:1, FAIL) ...
styles/design-tokens.css:34   /* WCAG AA fix: --ion-3 re-valued from #3D4555 (1.97:1, FAIL) ...
styles/design-tokens.css:172  /* WCAG 2.1 AA: --fg-muted bumped from ion-2 (#5E6878, 3.05:1, FAIL) ...
```

Those same two hexes are still live in the Tailwind ramp that the component layer
actually uses:

```
tailwind.config.ts:172          400:  "#5E6878",
tailwind.config.ts:173          500:  "#3D4555",
tailwind.config.ts:174          600:  "#2E3849",
```

Measured (computed, not quoted from a comment):

| token | hex | on `obsidian` #05070B | on `carbon` #0D1117 | on `eclipse` #171228 |
|---|---|---|---|---|
| `ink-400` | #5E6878 | 3.58 FAIL | 3.36 FAIL | 3.23 FAIL |
| `ink-500` | #3D4555 | 2.09 FAIL | 1.97 FAIL | 1.89 FAIL |
| `ink-600` | #2E3849 | 1.71 FAIL | 1.60 FAIL | 1.54 FAIL |

Usage count: `text-ink-400` 55, `text-ink-500` 92, `text-ink-600` 38. **185 total.**
These are not confined to internal tooling. Confirmed on customer surfaces:

- `app/not-found.tsx:66` renders the entire "if you got here from a link inside the
  site" recovery instruction, including the support email, in `text-ink-500` on
  `bg-obsidian`. That is **2.09:1**. The 404 recovery copy is effectively invisible.
- `app/not-found.tsx:57` body paragraph in `text-ink-300` is fine (10.08), so the page
  reads as *partially* legible, which is worse than uniformly broken because nobody
  notices.
- `components/hero/enter-gate.tsx:174` the **"Skip intro" control** on the cinematic
  entrance gate is `text-ink-500` at **2.09:1**. A user who cannot see it cannot skip
  the intro.
- `app/pricing/page.tsx:728`, `app/launch/page.tsx`, and 26 further component files.
- `components/explainers/page-explainer.tsx:110,112` uses `text-ink-400` for the Nova
  subtitle and the modal close button glyph on a `surface-card` (eclipse) at **3.23:1**.
  A close button at 3.23:1 also fails the 3:1 non-text UI floor by the letter once the
  glyph is treated as text.

**Why it matters.** This is not a stylistic nit. It is a legal-exposure and
credibility issue for a paid subscription product, and it lands on the two pages a
confused user reaches when something has already gone wrong (404 and the entrance
gate). It is also self-inflicted twice over: the team diagnosed it, wrote the fix into
the CSS custom properties, and never propagated it to the Tailwind scale that 185 call
sites read from.

**Proposed fix.** Re-value `ink.400/500/600` in `tailwind.config.ts:172-174` to the
already-vetted lighter ramp (the repo has verified replacements: `#8B97AB` is measured
at 6.41 on carbon, `#B1BAD5` at 9.78). Do not delete the keys, since 185 sites
reference them; repointing the values inherits the fix everywhere, which is exactly the
pattern `design-tokens.css` already used for `--fg-muted`.

**Risk of fix.** Low mechanically (three hex values, no API change), but it *will*
lighten 185 rendered strings, so the visual hierarchy on dense pages will flatten
somewhat. Worth a visual pass on `app/pricing`, `components/slate-twin/*` and
`components/academy/*`, which are the heaviest users.

---

### 2. BLOCKER: no accessibility guard exists, so every finding in this report can regress silently

```bash
ls scripts/guardrails/     # 26 scripts
grep -rln "contrast\|wcag\|WCAG" scripts/guardrails/    # 1 hit, inside commercial-copy-scan.mjs, unrelated
```

The guardrail suite polices brand vocabulary, em dashes, secrets, model freeze, draft-only
publishing, ZK overclaims and Pedersen boundaries. It does not police a single
accessibility property. `.claude/skills/` ships a `contrast` skill and a `color-roles`
skill, both of which are manual, human-invoked runbooks.

**Why it matters.** Finding 1 exists precisely because a contrast fix was made once by
hand and then drifted. Without a check in `run-all.mjs` this repeats.

**Proposed fix.** Add a guard that parses `tailwind.config.ts` plus `design-tokens.css`,
computes WCAG contrast for every `text-*` token against the four canonical surfaces
(`void`, `obsidian`, `carbon`, `eclipse`), and fails on any token that is used as text
in the codebase and measures below 4.5. This *adds* a guard rather than weakening one,
so it is consistent with law 9.

**Risk of fix.** The guard will be red on first run because of finding 1. Land the token
re-value first, then the guard, so it starts green.

---

### 3. MAJOR: the brand's primary color means six contradictory things inside one card

`components/picks/pick-card.tsx` uses `plasma` (ion magenta, `#FF38C7`, the brand's
primary signal) as *both* the top of a scale and the middle-or-bottom of four others,
all rendering simultaneously on the same pick:

| line | scale | what plasma means there |
|---|---|---|
| `pick-card.tsx:32` | `PICK_GRADE_STYLES.ELITE_PLAY` | **best** grade |
| `pick-card.tsx:40` | `RISK_LEVEL_STYLES.MODERATE` | **middle** risk |
| `pick-card.tsx:524` | `badgeColor()` `>= 60` | **lowest named** confidence band |
| `pick-card.tsx:615` | `EdgeScoreBadge` `>= 30` | **second-lowest** edge band |
| `pick-card.tsx:698` | `DataQualityMeter` `< 70`, label "Med" | **middle** data quality |
| `pick-card.tsx:725` | `FreshnessIndicator` `>= 30 min` | data **going stale** |
| `pick-card.tsx:491` | `TierBadge` PREMIUM | **paid tier** (no valence at all) |

So a single card can show a magenta "Elite Play" ribbon next to a magenta "Med" data
quality label next to a magenta 62/100 confidence badge. The color carries no
information because it carries all of it.

`verify` (mint green) is equally overloaded: highest confidence (`:523`), highest edge
(`:613`), LOW_RISK (`:39`), STRONG_PLAY which is the **second** grade (`:33`), WIN
(`:632`), positive factor bullet (`:322`), high data quality (`:694`), fresh data
(`:719`), and **the FREE tier badge** (`:485`). Green therefore reads as both "best
outcome" and "you are not paying us".

Compounding this, the design system defines a canonical confidence ladder that **no
component uses**:

```
styles/design-tokens.css:154-157
  --conf-elite:  var(--plasma);       /* highest */
  --conf-strong: var(--ion-blue);
  --conf-solid:  var(--ultraviolet);
  --conf-lean:   var(--ion-1);
```

```bash
grep -rn "conf-solid\|conf-elite\|conf-strong\|conf-lean" --include=*.tsx apps/web
# zero hits in any component; only design-tokens.css and tailwind.config.ts
```

The ladder is dead code, and `badgeColor()` implements the *inverse* of it: the token
file says plasma is the top of the confidence ladder, `badgeColor()` uses plasma for the
bottom band it names.

The categorical layer repeats the collision. `lib/fantasy/dfs-slate.ts:89-91`:

```ts
export const DFS_POS_HEX: Record<DfsPos, string> = {
  QB: "#00E5FF", RB: "#7B61FF", WR: "#FF38C7", TE: "#F5F7FF", DST: "#9fb3c8",
};
```

These are raw hexes that bypass the token layer entirely and reuse the three signal
colors for a purely nominal encoding, so magenta additionally means "wide receiver".

**Why it matters.** This product's whole pitch is that its numbers are readable. Color
is the fastest read on a card and here it is noise. At the frontier-product bar, a user
should be able to learn one color law and apply it everywhere.

**Proposed fix.** Adopt one law and make the ladders derive from it: reserve
`verify`/`alert`/`caution` for outcome and data-health valence only; reserve `plasma`
for brand and tier emphasis only; drive every 0-100 quality ladder from the existing
`--conf-*` tokens so the ladder in `design-tokens.css` becomes real. Give DFS positions
a separate categorical ramp that does not reuse signal hues. `.claude/skills/color-roles`
already exists for exactly this pass.

**Risk of fix.** Wide but shallow diff, and it touches the most-viewed component in the
product. Land it behind a visual QA pass, not as a drive-by.

---

### 4. MAJOR: 32 controls remove the focus ring with no replacement, including the site's primary hero CTA

```bash
grep -rn "focus-visible:outline-none\|focus:outline-none" --include=*.tsx app components | wc -l   # 47
# ... minus those that add a ring/shadow/outline replacement on the same line
# = 32 with no replacement
```

`app/globals.css` (via `styles/design-tokens.css`) defines a correct global default:

```css
:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }
```

These 32 sites override it away. The clearest offenders are buttons, where there is no
border-color fallback at all:

- **`components/hero/enter-gate.tsx:152`** the primary "Enter the engine" CTA. Its only
  ring is `gse-enter-ring` at `:161-165`, which is `aria-hidden`, decorative, and
  rendered unconditionally rather than on focus. So keyboard focus on the single most
  prominent button on the entrance produces **no visual change whatsoever**.
- `components/hero/enter-gate.tsx:174` "Skip intro" replaces the ring with
  `focus-visible:text-ink-300`, a color-only indicator on text that already measures
  2.09:1 (finding 1). Color alone is not a sufficient focus indicator.
- `components/fantasy/dfs-optimizer.tsx:82` the Cash / GPP / Leverage segmented control,
  the optimizer's primary mode switch.
- `components/trust-ledger/proof-of-record.tsx:60` and `:69`, on the trust surface.
- `components/slate-twin/galaxy-slate-twin.tsx:1163`, `:1178`.

**Why it matters.** WCAG 2.4.7. A keyboard user cannot tell where they are on the
entrance gate or in the optimizer.

**Proposed fix.** Delete the `focus-visible:outline-none` utility from these class lists
so the global `:focus-visible` rule applies again, or where a custom look is wanted,
gate the existing decorative ring on focus rather than rendering it always.

**Risk of fix.** Very low. Removing an override restores an already-designed default.

---

### 5. MAJOR: two `aria-modal="true"` dialogs have no focus trap and no focus restore

`components/picks/evidence-audit-drawer.tsx:149-150` declares `role="dialog"` and
`aria-modal="true"`. Its effect hook at `:117-133` does three things: binds Escape,
focuses the close button once on open, and locks body scroll. It does **not** trap Tab,
and it does **not** restore focus to the trigger on close.

`components/explainers/page-explainer.tsx:99-100` has the identical shape: `role="dialog"`,
`aria-modal="true"`, Escape and arrow keys at `:83-88`, initial focus at `:80`, no trap,
no restore.

The repo proves it knows the correct pattern. `components/ui/mobile-nav.tsx:151-180`
implements a real cycle trap and returns focus to `triggerRef` on Escape, with the WCAG
clauses cited in a comment at `:154`.

**Why it matters.** `aria-modal="true"` is a promise to assistive tech that the rest of
the page is inert. Here it is not, so a screen-reader user tabs straight out of the
Evidence Audit drawer into the page behind it while the AT still believes it is in a
modal. On close, focus falls to the top of the document, so a keyboard user loses their
place in the board. The Evidence Audit drawer is the product's proof surface, which
makes this the worst possible place for it.

**Proposed fix.** Extract the `mobile-nav.tsx:151-180` trap into a shared hook and call
it from both dialogs, plus store and restore `document.activeElement` across open/close.

**Risk of fix.** Low. Additive, and the reference implementation already exists in-repo.

---

### 6. MAJOR: the two headline numbers are only defined in a `title` tooltip

`components/picks/pick-card.tsx:144-148` and `:162-166`:

```tsx
<p className="mb-1 text-[10px] font-medium text-ion-1"
   title="How strongly the model likes this pick, 0-100. Unlocks with Pro.">
  Confidence
</p>
```

`title` is not reachable by keyboard, does not appear on touch devices at all, and has
inconsistent screen-reader support. So on mobile, which is where a board like this is
mostly read, "Confidence" and "Edge Score" render as bare integers with no scale and no
definition anywhere on the card. `EdgeScoreBadge` at `:611-625` renders a naked
`{edgeScore}` with the scale carried only in `aria-label` (screen-reader only).

The **Risk** label at `:178` has no `title` and no definition at all, and
`RISK_LEVEL_LABELS` values render with no key.

Definitions do exist, but nowhere near the number:

```
app/pricing/page.tsx:576   "A 0 to 100 ranking score of how strongly the model likes a pick..."
app/faq/page.tsx:68        "A 0-100 rating of how much better our number is than the market price..."
```

And `/edge-index`, the page literally named after the number, never states its range or
direction: `app/edge-index/page.tsx:34-37` says only "A public, free composite score for
a game."

Same class of problem elsewhere:
- `components/proof/proof-explorer.tsx:120` renders a stat labelled **"Disc. spread"**
  with a `%` suffix. "Discrimination spread" is defined nowhere a user can reach
  (`grep -rni "discrimination spread\|disc. spread"` returns no user-facing definition).
- `components/picks/pick-card.tsx:395-397` renders **`trueProb 63.2%`**, an internal
  camelCase identifier, to a paying subscriber with no gloss. Per the finding already
  established this session, on 89 per cent of published MONEYLINE picks this value's
  companion `marketFairProb` is absent, so what the user is reading is not what the label
  implies.
- `components/picks/pick-card.tsx:456` `ScoreBar` renders `{Math.round(value)}` with the
  `max` prop (30, 20, 25, 15) never shown, so "Consensus 24" has no denominator.
- `components/fantasy/dfs-optimizer.tsx:139-141` renders `{m.proj} proj`, `{m.ceiling} ceil`
  and `Leverage {m.leverageScore}` with no units and no range; the only gloss for leverage
  sits in a different panel at `:236`.

**Why it matters.** "We're not AI, we're math you can read" is the positioning. A number
a user cannot read the definition of, on the device most of them use, is the one thing
this product cannot ship.

**Proposed fix.** Replace the `title`-only pattern with a real inline affordance: a
keyboard-focusable info control that reveals the definition in the DOM (the repo already
has `components/explainers/page-explainer.tsx` and `components/picks/ask-why.tsx` as
precedent), and put the range in the visible label ("Edge Score /100"). Add the Edge
Index range and direction to `app/edge-index/page.tsx`. Rename `trueProb` and
"Disc. spread" to plain words in the render layer.

**Risk of fix.** Low. Additive text and one shared component.

---

### 7. MAJOR: `text-ultraviolet` fails AA on every surface except `carbon`, and is used 89 times

Measured for `--ultraviolet` `#7B61FF`:

| surface | ratio | AA text |
|---|---|---|
| `void` #05070B | 4.80 | pass |
| `carbon` #0D1117 | **4.5023** | pass by 0.0023 |
| `eclipse` #171228 | 4.33 | **FAIL** |
| `titanium` #211A33 | 3.96 | **FAIL** |
| `slate` #20283A | 3.50 | **FAIL** |

Composited chip pattern, computed:

| pattern | on carbon | verdict |
|---|---|---|
| `text-ultraviolet` on `bg-ultraviolet/5` | 4.32 | FAIL |
| `text-ultraviolet` on `bg-ultraviolet/10` | 4.10 | FAIL |
| `text-ultraviolet` on `bg-ultraviolet/30` | 3.14 | FAIL |

89 usages of `text-ultraviolet`. Confirmed failures on a public page:

- `app/intelligence/metrics/page.tsx:15` renders `MetricCard` on `bg-eclipse`.
  Line `:26` applies `stabilityClass()` (`:22`, returns `text-ultraviolet` for "signal")
  at `text-[10px]`, measuring **4.33:1**.
- Same file `:50`, `<Row term="Our edge" tone="text-ultraviolet">`, whose `<dt>` at `:65`
  is `text-[10px]` on eclipse. **4.33:1**, on the page whose entire job is explaining the
  metrics honestly.

Worse in the cockpit, where the chip pattern is used at 30 per cent:
`app/cockpit/media/page.tsx:33`, `app/cockpit/sources/page.tsx:64` and `:76`,
`app/cockpit/airwave/page.tsx:23` all use `bg-ultraviolet/30 text-ultraviolet`,
measured **3.14:1**.

`components/proof/proof-explorer.tsx:161` uses `tone="text-ultraviolet"` for the
"Edge level" stat. That one lands on `bg-carbon` (`Stat` at `:206`) so it scrapes a
4.50 pass, but only because of the surface it happens to sit on.

**Why it matters.** A token that passes only on one of five surfaces, by 0.002, is not a
token. It is a coin flip that the next author will lose.

**Proposed fix.** Where ultraviolet is used as *text*, use `--ultraviolet-glow` `#9F87FF`,
which is already in the system and measures 6.65 / 6.40 / 5.86 on carbon / eclipse /
titanium. `pick-card.tsx:507-508` already does exactly this for `PickTypeBadge`, so the
precedent is in the same repo. Keep `--ultraviolet` for fills, borders and bars only.

**Risk of fix.** Low, and largely mechanical.

---

### 8. MAJOR: the freshness indicator's dot contradicts its own label

`components/picks/pick-card.tsx:718-737`. The text color has four branches; the dot has
three:

```
text (:719-731):  <10m verify | 10-29m ion-2 | 30-59m plasma | >=60m alert
dot  (:736):      <10m verify | <30m  ion-3  | else plasma
```

At 60 minutes or older the label turns red (`text-alert`) while the dot beside it stays
magenta (`bg-plasma`). So the strongest data-staleness warning the card can give is
rendered in two disagreeing colors, one of which (magenta) also means "Elite Play" three
rows up (finding 3).

**Why it matters.** Rule 5 in `CLAUDE.md` is "no stale data, always validate timestamps
and freshness". The one widget that communicates freshness disagrees with itself at
exactly the threshold that matters.

**Proposed fix.** Derive both the dot and the label from a single `tone` value computed
once from `ageMinutes`.

**Risk of fix.** Trivial, contained to one function.

---

### 9. MAJOR: DFS optimizer, faded rows drop below AA and the pin/fade controls are far below the touch-target floor

`components/fantasy/dfs-optimizer.tsx:222`:

```tsx
<div ... style={{ opacity: fade ? 0.4 : 1, ... }}>
```

Computed at 0.4 opacity over `carbon`:

- `text-ion-white` player name: **3.65:1**, FAIL
- `text-ion-2` salary and ownership: **2.52:1**, FAIL

A faded player is not decoration. The row stays interactive (you un-fade it from the same
row), and the salary and ownership numbers on it are exactly what a user compares against
when deciding whether to un-fade.

Same file `:227-228`:

```tsx
<button ... className="px-1 text-sm" ...>★</button>
<button ... className="px-1 text-sm" ...>✕</button>
```

`px-1` plus a 14px glyph is roughly 22 x 20 CSS pixels, against WCAG 2.5.8's 24 x 24
minimum and well under the 44px the repo itself uses 69 times elsewhere via `min-h-11`
(for example `pick-card.tsx:236`, `:654`, `:673`). These two buttons sit adjacent in a
`max-h-[60vh]` scrolling list, so on a phone the pin and fade targets are neighbours,
both undersized, and mis-taps are destructive to the user's in-progress lineup.

**Why it matters.** This is the flagship tool behind the Fantasy tier.

**Proposed fix.** Replace `opacity: 0.4` with an explicit muted foreground token plus a
strikethrough or a "faded" pill so the state is conveyed without dropping contrast. Give
both buttons `min-h-11 min-w-11` and separate them, consistent with the convention the
repo already applies 69 times.

**Risk of fix.** Low. Row height grows on the pool list, so check the `max-h-[60vh]`
scroll region still shows a useful number of players.

---

### 10. MINOR: 1,286 sub-12px font sizes, against the design system's own written floors

`styles/design-tokens.css:266-273` states the floors explicitly:

```
/* SIZE FLOORS — body >= 14px, body-sm >= 13px for legibility. */
/* Eyebrow bumped from 11px to 12px floor (was often rendered ~10px). */
```

Measured usage of arbitrary sub-floor sizes:

| class | count |
|---|---|
| `text-[8px]` | 31 |
| `text-[9px]` | 120 |
| `text-[10px]` | 694 |
| `text-[11px]` | 441 |
| **total** | **1,286** |

Densest files: `app/cockpit/page.tsx` (27), `app/trends/page.tsx` (21),
`app/nflverse/page.tsx` (21), `components/picks/pick-card.tsx` (20).

Note the interaction with finding 7: several of the 4.33:1 `text-ultraviolet` strings are
also `text-[10px]`, so they are simultaneously under-contrast and under-size. The
8px tier is used 31 times, which is not readable by anyone at any contrast.

**Proposed fix.** Convert the `text-[10px]` eyebrow idiom to the existing `text-eyebrow`
token (12px, already defined at `tailwind.config.ts:210`) and eliminate the 8px and 9px
tiers.

**Risk of fix.** Layout reflow across many dense panels. Do it per surface, not globally.

---

### 11. MINOR: zero `role="progressbar"` anywhere, on a product built out of meters

```bash
grep -rn 'role="progressbar"' --include=*.tsx app components   # 0
```

Every bar in the product is a bare `<div>` with an inline `width` percentage:
`pick-card.tsx:459-462` (`ScoreBar`, four per card), `pick-card.tsx:703-708`
(`DataQualityMeter`), `dfs-optimizer.tsx:145-147` (salary cap meter),
`dfs-optimizer.tsx:200-202` (exposure bars).

`DataQualityMeter` is handled well by accident: the wrapper carries a good
`aria-label` at `:701` and the bar itself is `aria-hidden` at `:704`, so it degrades
correctly. `ScoreBar` and the DFS bars have neither, so the visual magnitude is available
only to sighted users.

**Proposed fix.** Give the bars `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/
`aria-valuemax`/`aria-valuetext`, which also fixes the missing-denominator half of
finding 6 for free (`aria-valuemax` carries the `max` that `ScoreBar` currently drops).

**Risk of fix.** None, purely additive.

---

### 12. MINOR: the nav dropdown cannot be dismissed from the keyboard

`components/ui/nav-menu.tsx` is otherwise thoughtful: it tracks `aria-expanded` as real
state (`:26`, `:45`) specifically so the hover-CSS menu does not lie to assistive tech
(the file comment at `:6-12` says so), and it opens on `onFocusCapture` and closes on a
containment-checked `onBlurCapture` (`:33-40`) so keyboard traversal works.

What is missing: no Escape handler, so hover/focus-triggered content cannot be dismissed
without moving focus (WCAG 1.4.13 Dismissible), and no arrow-key navigation within the
panel. The trigger is also an `<a href>` that carries `aria-haspopup="true"` (`:42-44`),
so activating it navigates rather than opening the popup it advertises.

**Proposed fix.** Add an Escape handler that sets `open` to false and returns focus to
the trigger. Arrow-key roving is optional polish.

**Risk of fix.** Low.

---

### 13. MINOR: the skip link is dead on the pages where it matters most

`app/layout.tsx:222-227` renders a correct, well-styled skip link to `#main-content`.

```bash
for f in $(grep -rln "<main" --include=*.tsx app); do grep -q 'id="main-content"' $f || echo $f; done
```

Missing the target: `app/not-found.tsx`, `app/error.tsx`'s siblings
`app/stats/error.tsx`, `app/players/error.tsx`, `app/fantasy/error.tsx`,
`app/intelligence/error.tsx`, plus `app/cockpit/layout.tsx` and
`app/embed/edge-index/[gameId]/page.tsx`.

Every key public route I checked (home, pricing, board, optimizer, calibration,
performance, methodology, faq, dashboard, trends, clv, edge-index, fantasy) **does** carry
the id, so this is narrow. But the four error boundaries and the 404 are exactly the
pages where a user is already lost.

**Proposed fix.** Add `id="main-content"` to the `<main>` in those seven files.

**Risk of fix.** None.

---

### 14. MINOR: an accessible tab primitive exists and is used twice; 26 files hand-roll `aria-pressed` bars instead

`components/ui/tabs.tsx` is a well-documented, URL-driven, genuinely accessible tab
component. It is imported by 2 files. Meanwhile:

```bash
grep -rlno "aria-pressed" --include=*.tsx app components | wc -l   # 26 files, 35 usages
grep -rln 'role="tablist"' --include=*.tsx app components          # only tabs.tsx and pundit-ledger.tsx
```

`components/fantasy/optimizer-workspace.tsx:48-58`, the DFS/Start-Sit/Draft switcher on
the flagship `/optimizer` route, is a row of `aria-pressed` toggle buttons. A screen
reader announces three independent toggle buttons rather than a tab set, there is no
arrow-key movement between them, and no `aria-controls` linking a button to the panel it
governs. `components/fantasy/dfs-optimizer.tsx:81-88` repeats the pattern for Cash/GPP/
Leverage.

`aria-pressed` is not wrong for a filter chip. It is wrong for a control that swaps the
main panel, which is what both of these do.

**Proposed fix.** Adopt `components/ui/tabs.tsx` for the panel-swapping cases, starting
with `optimizer-workspace.tsx`. Leave genuine filter chips on `aria-pressed`.

**Risk of fix.** Moderate, because `tabs.tsx` is URL-driven and `optimizer-workspace`
holds React state. Either lift selection to a query param (which also makes the tool
shareable and bookmarkable, a product win) or add a state-driven sibling primitive.

---

### 15. MINOR: the design system documents contrast for hex values it no longer holds

`styles/design-tokens.css:31-33` claims `--ion-2` was re-valued "to #9AA6B8 (7.68:1 on
carbon)". The actual value on line 33 is `#B1BAD5`, which measures **9.78**.
`:171` annotates `--fg-meta` as "#98A3B5, AA pass at 6.7:1"; it resolves to `--ion-1` =
`#AEB7D2`, which measures **9.47**. `:172-173` repeats the `#98A3B5` figure for
`--fg-muted`.

Every live value is *better* than its comment claims, so nothing is unsafe here. But in a
repository whose stated premise is "this product does not lie about its own numbers"
(AGENTS.md, THE STANDARD), a design system carrying three stale verified-measurement
claims is a small crack in exactly the discipline the repo is built on. It is also how
finding 1 survived: the comments read as though the remediation was complete.

**Proposed fix.** Update the three comments to the measured values, or drop the hexes
from the comments and keep only the ratio.

**Risk of fix.** None.

---

### 16. MINOR: roughly 130 `<th>` elements carry no `scope`

```bash
grep -rno "<th" --include=*.tsx app components | wc -l              # 396
grep -rno 'scope="col"\|scope="row"' --include=*.tsx app components # 266
```

The best tables are exemplary (`components/home/tout-comparison.tsx:89-101` has
`scope="col"` and `scope="row"` plus a responsive stacking rule at `:187-195`;
`app/trends/page.tsx:185`, `app/mlb/page.tsx:88` and `app/fantasy/dfs/page.tsx:64` all
carry `<caption class="sr-only">`). The remaining ~130 are inconsistent rather than
absent-by-design.

**Proposed fix.** Sweep the remaining `<th>` elements. Mechanical.

---

## What I checked and found CORRECT

These are not filler. Several are better than the market.

- **Empty, gated, outage and error states on `/picks` are excellent.**
  `app/picks/page.tsx:337-379` renders a *distinct* backend-outage state that is
  deliberately colored `caution` rather than the gate's cyan, never leaks the HTTP status,
  and says in plain words "this is a connection problem on our side, not a verdict on the
  board". `:381-420` renders a separate gated/stale state with different copy per `kind`.
  The `fetchPicks` helper at `:84-127` classifies deliberate dark states and returns them
  as data rather than throwing an error page. This is the single best thing in the
  frontend.
- **`app/dashboard/page.tsx` distinguishes "read failed" from "genuinely empty."**
  Lines `:128-131` and `:315` and `:542-548` are explicit about it, with a comment
  explaining that an empty array from a failed `findMany` is indistinguishable from a real
  empty board and must not render as one. Very few products get this right.
- **No fake interactive elements.** `grep` for `onClick` on `<div>` or `<span>` returns
  **0** across 480 files. Everything clickable is a `<button>` or a `<Link>`.
- **Image alt text is complete.** Zero `<img>` or `<Image>` without `alt`. Decorative
  images correctly use `alt=""` plus `aria-hidden` (`components/immersive/generated-plate.tsx:59`,
  `components/academy/film-room.tsx:95`), and meaningful ones have real descriptions
  (`components/academy/film-room.tsx:56`).
- **Wide tables are handled properly.** All the `min-w-[560px]` through `min-w-[1200px]`
  tables I sampled sit inside `overflow-x-auto` wrappers with `sr-only` captions
  (`app/trends/page.tsx:183-185`, `app/mlb/page.tsx:86-88`,
  `app/fantasy/dfs/page.tsx:62-64`). Only 7 of 35 tables lack a scroll wrapper and 6 of
  those are admin or cockpit.
- **Reduced motion is honored globally and with `!important`,** so it also defeats inline
  `style` animations: `app/globals.css:53-62`.
- **`ConfidenceBadge` is epistemically careful.** `components/picks/pick-card.tsx:527-558`
  renders the uncalibrated heuristic as `72/100` and explicitly *not* as `72%`, with a
  comment at `:539-541` explaining that "%" would read as a win probability the number is
  not. Its `aria-label` says "out of 100".
- **`LockedValue` vs `MissingValue` is a real distinction, correctly drawn.**
  `pick-card.tsx:640-696`. A locked value links to pricing and says "unlocks with Pro";
  an entitled-but-absent value says "not captured" with no upsell, and the comment at
  `:679-684` explains that upselling an already-entitled user over missing data "reads as
  a bait, not a gate". That is product judgment, not just code.
- **`components/proof/proof-explorer.tsx` is honest under pressure.** The comments at
  `:95-104`, `:114-116` and `:167-178` document three separate stats that were *removed*
  because they implied a probability claim the engine does not make. The band states at
  `:181-189` distinguish "under 30 settled" from "zero settled" with different copy.
- **`ToolPageSkeleton` is correct,** with `aria-busy`, `aria-live="polite"` and an
  `sr-only` label, and it mirrors the real page shell
  (`components/ui/tool-page-skeleton.tsx:13-17`). It is wired into all 16 `loading.tsx`
  files with route-specific labels.
- **`components/ui/mobile-nav.tsx:151-180` is a textbook focus trap** with Escape,
  cycle-wrapping Tab and focus restoration to the trigger, with the WCAG clauses cited.
- **The `--paper` light scale is fully verified and correct.** Every `ink`, accent-on-light
  and semantic-on-light token I computed passes AA on `--paper` and `--paper-sunken`
  (`ink` 17.46, `ink-1` 9.34, `ink-2` 5.47, `verify-on-light` 6.17, `alert-on-light` 5.87,
  `plasma-on-light` 4.68). The one to watch is `plasma-on-light` at 4.44 on
  `--paper-sunken`, which is a marginal fail on the zebra surface only.
- **The demo/sample-data banners are unmissable and honest**
  (`app/picks/page.tsx:243-247`, `components/fantasy/dfs-optimizer.tsx:64-75`), correctly
  toned `caution` with a comment stating that "fictional players must never read as real",
  and they carry `role="status"` + `aria-live="polite"`.
- **The 404 page is well-composed** (brand mark, four real recovery routes, a working
  support mailto, `robots: noindex`). Its only defect is the contrast in finding 1.
- **Every client component that calls `fetch()` has an error path.** The sweep for
  fetchers with no error/catch/failed handling returned zero.

---

## What I could not check and why

- **Rendered contrast in a real browser.** Everything here is computed from the token and
  class definitions in source. Backdrop blur (`surface-glass`, `backdrop-blur-sm`), the
  three stacked body radial gradients (`app/globals.css:29-35`), and `.atmo-glow` /
  `.atmo-environment` overlays all shift the effective background under text by a few
  points. My ratios assume the flat token surface underneath, which is the *optimistic*
  case, so the real numbers are equal or slightly worse. The failures are large enough
  that this does not change any verdict, but the borderline ones (`--ultraviolet` at
  4.5023 on carbon) could flip either way in practice. NOT VERIFIED in a browser.
- **Actual viewport behaviour.** No dev server, no browser, no device emulation. The
  responsive findings are inferred from `min-w-[...]`, `overflow-x-auto` and breakpoint
  classes in source. I found no evidence of horizontal-overflow breakage but I could not
  observe a rendered page at 320px. NOT VERIFIED.
- **Screen-reader output.** No AT was run. Focus-trap and `aria-modal` findings are read
  from code, and the absence of a trap in `evidence-audit-drawer.tsx` /
  `page-explainer.tsx` is established by the absence of any keydown handler for Tab and
  any `activeElement` capture, not by observed AT behaviour.
- **Automated axe/Lighthouse pass.** Not run. No browser available in this session.
- **The full 236-page surface.** I read the core commercial and proof routes in depth
  (`/picks`, `/board`, `/optimizer`, `/calibration`, `/pricing`, `/dashboard`,
  `/edge-index`, `/intelligence/metrics`, 404, error boundary) and sampled the rest via
  targeted greps. Individual pages in `app/cockpit/**`, `app/academy/**`,
  `app/fantasy/**` and the marketing long tail were counted in the aggregate greps but
  not read line by line.
- **The cockpit as a product surface.** I treated `app/cockpit/**` as internal operator
  tooling and did not hold it to the customer-facing bar, though its contrast failures
  (`bg-ultraviolet/30 text-ultraviolet` at 3.14:1) are noted in finding 7. If the cockpit
  is customer-facing for any tier, that judgment call should be revisited.
- **Whether any finding here is already claimed on the ledger.** I did not
  cross-reference `docs/ops/AGENT_LEDGER.md` or `docs/data/FLEET_DISPATCH.md`, so some of
  these may be dispatched work rather than new.
