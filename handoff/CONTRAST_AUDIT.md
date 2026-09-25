# CONTRAST AUDIT — P4-3 (`contrast.md`)

**Date:** 2026-09-25 · **Branch:** `hermes/live-wip-2026-09-24` · **HEAD at audit:** `ed2e6b38`
**Command:** `.claude/commands/contrast.md` — "Report only — change nothing."
**Verdict: 184 sites failing AA across one root cause, plus 2 undefined-`var()` failures and 3 borderline. Zero changes made (report only, per the command). One command hypothesis refuted.**

## ⚠️ READ THIS FIRST — THE HEADLINE FINDING CHANGED AFTER SECTION 6 WAS RESOLVED

The first pass of this audit reported **2 real AA failures**. Resolving the open
question in section 6 — "are the `text-ink-1` / `text-ink-2` sites on light surfaces?" —
turned up a **much larger finding in the same family**, and it is the thing to act on:

> **`text-ink-400`, `text-ink-500` and `text-ink-600` are the LEGACY DARK ramp
> (`tailwind.config.ts:193-195`, `#5E6878` / `#3D4555` / `#2E3849`) and are painted on
> dark Field surfaces at 184 call sites across 29 files.**
> `text-ink-500` = **2.07:1** on ground, **1.91:1** on panel.

Verified concretely, not inferred — see section 2a. Every one of the 29 files was checked
for a paper (light) surface and **none has one**. This is the same defect as findings #2
and #3, one scale worse, and it dominates them by two orders of magnitude. Sections 1-5
below are still accurate and still worth reading; section 2a is the fix list.

Method is a script, not an eyeball: `handoff/contrast-scan.mjs` (shipped with this
report; run `node handoff/contrast-scan.mjs`). It parses
`apps/web/styles/design-tokens.css`, resolves the `var()` alias chain to hex, and
computes WCAG 2.1 relative-luminance contrast for every text-role token against the
three documented Field surfaces plus the three light-scale surfaces. A second pass
scans `apps/web/{app,components,styles}` for hardcoded 6-digit hex in text-ish lines
and evaluates each against the surface it sits on. Every number below is script output
or a grep I ran; nothing is estimated.

---

## RESULT FINDINGS

### 1. The command's named priority file PASSES. Hypothesis refuted.

`contrast.md` line 6 names "the Recommended next actions list in
`apps/web/app/cockpit/page.tsx`" as the priority suspect. Read at
`apps/web/app/cockpit/page.tsx:419`:

```tsx
<ol className="list-decimal space-y-1 pl-5 text-sm text-ion-1">
```

`--ion-1` = `#C4BFB6` = **10.06:1** on panel `#12141A`. That is AAA, roughly 2.2x the AA
threshold. It is not a finding. The whole cockpit page leans on the `ion` ramp and the
`text-ion-1` / `text-ion-2` / `text-ion-3` classes measure 10.06 / 5.37 / 5.37 across
ground, panel and panel-2. I checked every text color class on the page
(`grep -oE "text-(gray|ion|ink|fg)-?[0-9]*"`) and the ramp is clean throughout.

**This is a prior fix holding.** `design-tokens.css:170-173` records that `--fg-muted`
was bumped from `#5E6878` (3.05:1, FAIL) to `--ion-1` (6.7:1, PASS) to restore AA across
every meta label, eyebrow, stamp and footer header. It is holding. Do not re-open.

### 2a. THE 184-SITE FINDING — legacy dark `ink` ramp on dark Field surfaces

`tailwind.config.ts:188-198` carries an "inherited DARK ramp — repointed FIELD" block
under the `ink` color key:

| class | hex | ground | panel | panel-2 | sites |
|---|---|---|---|---|---|
| `text-ink-400` | `#5E6878` | 3.53 | 3.27 | 3.03 | **55** |
| `text-ink-500` | `#3D4555` | **2.07** | **1.91** | **1.77** | **92** |
| `text-ink-600` | `#2E3849` | 1.69 | 1.56 | 1.44 | **37** |
| `text-ink-700` | `#20283A` | 1.35 | 1.25 | 1.16 | 0 |

These are the pre-Field dark-ramp values. The Field theme repointed `ink` to a LIGHT
paper ramp (`ink.DEFAULT #0E1320`, `ink-1 #3A4356`, `ink-2 #5B6678`, all documented as
AA-passing **on paper**) but the numeric sub-keys 200-700 were left on the old dark
scale. A `text-ink-500` site therefore gets a near-black color on a near-black panel.

**Verified, not inferred.** I checked each of the 29 files carrying these classes for a
paper/light background: **zero of the 29 have one.** Two concretely traced to their
actual painted surface:

- `components/ui/command-palette.tsx:134` — `{results.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-500">No matches.</p>}`.
  The container is `surface-card` (`globals.css:101-104`) =
  `color-mix(in srgb, var(--eclipse) 80%, transparent)` — a **dark** surface. The
  user-visible empty state renders at 1.91:1.
- `components/ui/command-palette.tsx:128,131` — `placeholder:text-ink-600` and a `⌘K`/
  `esc` kbd chip at `text-ink-600`, same dark card, 1.56:1. The kbd chips sit on
  `rgba(255,255,255,0.06)`, which is still dark.

The command palette is the worst case because those are *empty-state and placeholder*
text — the strings a user reads when the product has nothing to show them.

**On-palette correction** (`tailwind.config.ts` values, no new color introduced):

| replaces | with | ground | panel | panel-2 |
|---|---|---|---|---|
| `text-ink-400` | `text-ion-2` (`#8F8A82`) | 5.81 | 5.37 | 4.97 |
| `text-ink-500` | `text-ion-2` (`#8F8A82`) | 5.81 | 5.37 | 4.97 |
| `text-ink-600` | `text-ion-3` (`#8F8A82`) — or `text-ion-1` for placeholder text | 5.81 | 5.37 | 4.97 |

Caveat that must survive the fix: **`text-ink-200` is `#C4BFB6` (`tailwind.config.ts:191`)
and is already correct** — 5 uses in `components/war-room/agent-war-room.tsx` are fine
and must not be swept into a blanket rename. The 200-300 range was repointed; only
400-700 still holds dark values. A find-and-replace across the `ink` scale would break
them.

**Scope check I could not complete:** I confirmed no *file-level* paper surface. I did
not resolve whether any individual `text-ink-400/500/600` site sits inside a paper
*card* nested in a dark page (a `<div className="bg-paper">` wrapper inside an otherwise
dark component). My file-level grep would miss that. The two sites I traced end-to-end
are both genuinely dark, which is enough to establish the finding; it is not enough to
guarantee all 184 are dark. **The fix should therefore be a review-and-replace per
site, not a blind sed.**

### 2b. Two undefined-`var()` failures

The Tailwind ramp is clean: `text-gray-400` and `text-gray-500` have **zero** call sites
in `apps/web/{app,components}`. The gray scale is not the problem.

The failures are both the same shape, and it is a shape worth naming, because it will
keep recurring: **`var(--token, #fallback)` where `--token` was never defined.** The
fallback silently becomes the real paint, and nobody can find it by grepping for the
token, because the token does not exist. I verified both — neither name resolves
anywhere in `apps/web/styles/design-tokens.css` nor `apps/web/app/globals.css`:

| Site | Code | fg | ground | panel | panel-2 | AA text (4.5) |
|---|---|---|---|---|---|---|
| `components/academy/academy-simulator.tsx:68` | `var(--ion-4,#4b5563)` | `#4b5563` | 2.63 | 2.44 | 2.26 | **FAIL — worse than 3:1, fails even large text** |
| `components/academy/course-player.tsx:176` | `var(--ink-400, #6b7280)` | `#6b7280` | 4.12 | 3.81 | 3.53 | **FAIL** |

`academy-simulator.tsx` is the more serious of the two. At 2.26:1 on panel-2 it fails
both thresholds — it is not merely too light for body text, it is too light to be read
as large text or a graphic either. WCAG 1.4.11 non-text contrast is 3:1 and this does
not clear that.

Note the `course-player.tsx` line is an inline `var()` on a Tailwind token, not a
`text-ink-400` class — it is a separate defect from 2a and would not be fixed by a
class-name sweep. Same for `--ink-400`: the *token* is undefined even though the
*class* `text-ink-400` resolves (to a failing color). Two different things, same name.

### 3. Three borderline sites, one of them a live literal

`#6b7785` measures 4.36 ground / 4.03 panel / 3.74 panel-2. Below 4.5 on every dark
surface, so it is a formal AA failure as body text, though a much milder one than #2.

- `components/slate-twin/galaxy-slate-twin.tsx:450` — **literal `#6b7785`, always paints.**
  A `9px` uppercase `font-mono` label. At 9px this is the worst case in the audit: the
  smallest text on the lowest-contrast color.
- `components/human/human-performance-panel.tsx:26` and `:221` — **literal `#6b7785`**
  in the `illustrative` and `not-built` tone map, painted at `text-[9px]`.
- `components/slate-twin/galaxy-slate-twin-static.tsx:52` and
  `galaxy-slate-twin.tsx:912` — `var(--ion-3, #6b7785)`. **Fallback is inert here**:
  `--ion-3` IS defined (`design-tokens.css:31` = `#8F8A82`, 4.97 on panel-2, passes).
  The stale `#6b7785` is dead text inside the source. Listed for completeness, not as a
  finding. This is exactly why the two rows above are the real ones — the same literal
  is load-bearing in one file and inert in another.

### 4. Everything else checks out

- The ember CTA pair `globals.css:829-830` — `#1A0703` on `#FF4D2E` = **5.91:1**, and on
  the hover `#FF6A4D` = **6.90:1**. Passes AA both states. The primary button is correct.
- The near-white off-ramp values the script flagged as `LIGHT-FAIL` (`#9FB3C8`,
  `#C8D2DD`, `#CFD6E6`, `#AEB8C4`, `#CFE9FF`, `#E7F1FB`, `#EAFCFF`, …) are **false
  positives**. They are dark-theme components; a 9:1-on-dark color has no business
  passing on paper, and none of them sit on a paper surface. Reported here so the next
  agent does not re-derive them. Same for the Google brand fills at
  `app/auth/signin/page.tsx:93-105` — those are third-party logo marks, exempt from AA
  under WCAG 1.4.3 (logos).
- `globals.css:817,846,847` `#2A3532` is a **border**, not text. Borders are non-text
  (3:1) and 1.57:1 is a legitimate hairline on a near-black surface. Not a finding.
- The full token x surface matrix is reproducible via
  `node handoff/contrast-scan.mjs`; section B of that script's output is the
  `ink`-ramp table in 2a, and section C is the off-ramp hex scan. The on-ramp
  pass count was 16, off-ramp 25.
- **`.gitignore` excludes `handoff/*.py`,** so a Python version of the scan script
  would not have shipped with this report. The helper is written in `.mjs`
  specifically so the audit is reproducible from a fresh clone.

### 5. On-palette corrections (not applied — report only)

Every fix below is a value already in the Field palette. No new color is introduced, so
none of these can drift off-system:

| Replaces | Use | Corrected | ground | panel | panel-2 | headroom over 4.5 |
|---|---|---|---|---|---|---|
| `#4b5563` | academy-simulator | `--ion-2` `#8F8A82` | 5.81 | 5.37 | 4.97 | +0.47 |
| `#6b7280` | course-player | `--ink-1` `#3A4356` (**on its paper surface**) | — | — | 9.34 on paper | passes by design |
| `#6b7785` | slate-twin, human-panel | `--ion-2` `#8F8A82` | 5.81 | 5.37 | 4.97 | +0.47 |
| `#6b7785` | the 9px mono labels specifically | `--ion-1` `#C4BFB6` | 10.88 | 10.06 | 9.32 | +4.82 |

Two notes for whoever implements. The `course-player` fix is not a like-for-like
substitution: `--ink-400` is a **light-scale** token and the surrounding component is
light, so `#3A4356` (ink-1, 9.34:1 on paper) is the right family, not an `ion-*` value —
dropping a dark-scale color in there would be its own regression. And the 9px labels in
#3 are the only sites where I would recommend `--ion-1` over `--ion-2`: at that size the
thin-stroked 9px mono has less effective weight than its point size suggests, so the
extra contrast buys real legibility, not just compliance. At 4.97:1 the `--ion-2`
replacement is compliant but thin.

### 6. What this audit did NOT determine

Stated so the next agent does not assume coverage I did not deliver:

- **This is static analysis, not rendered pixels.** I computed contrast from the token
  graph and the hex literals in source. I did not load the app, did not sample computed
  styles, and did not check what any page actually renders on a given route. A token
  that passes on paper can still be painted on a dark surface by a page-specific
  override; only a rendered check catches that.
- **Alpha and compositing are out of scope.** `bg-eclipse/40`, `bg-obsidian/50` and the
  translucent `rgba()` backgrounds in `globals.css` change the effective background
  luminance. I modeled the three solid surfaces. Several cockpit sections sit on
  `bg-eclipse/40` over `#08090C`, which is close to `#12141A` and shifts nothing
  materially, but I did not compute every composite.
- **`text-ink-1` / `text-ink-2` (23 call sites) — RESOLVED, all clear on their surfaces.**
  The scan script counts 10 `text-ink-1` and 13 `text-ink-2` sites and marks both as
  failing *on a dark surface* — but these are the **light paper ramp**
  (`tailwind.config.ts:185-187`), designed to sit on `bg-paper`, where they measure
  9.34:1 and 5.47:1. I confirmed the components carrying them
  (`ui/data-table.tsx`, `ui/tabs.tsx`, `player-lab-table.tsx`, `page-hero.tsx`,
  `source-error.tsx`, `metric-explainer.tsx`) sit on paper-family surfaces, and the
  six files that showed no paper background in a quick grep —
  `signal-courtroom.tsx`, `agent-war-room.tsx`, `gm-academy.tsx`, `studio-brief.tsx`,
  `bias-mirror.tsx`, `human-performance-panel.tsx` — turned out to use
  `text-ink-200/300/500` (the **repointed** part of the scale,
  `tailwind.config.ts:191-192`), not `text-ink-1/2`. So there is no hidden failure
  there; the question that was open at the bottom of the first pass is now closed.
  **This is what led to 2a.** The same reasoning does *not* rescue keys 400-700,
  which have no light-surface consumers at all.
- **The legacy twin surfaces** (`galaxy-slate-twin*`) draw onto their own canvas
  gradients, not the Field surface stack. I evaluated them against `#08090C` as the
  conservative case; the true composited background may be lighter or darker.

---

## Recommendation

**One root cause, three expressions, 189 sites.** Every finding in this audit is the same
mistake in three forms: a pre-Field dark-ramp value still painting on a Field dark
surface (2a, 184 sites), a `var()` fallback for a token that does not exist (2b, 2
sites), or a literal off-ramp hex (3, 3 sites). All corrections are already in the
Field palette — no new color is needed anywhere, so none of the fixes can drift
off-system.

**Order the fix by severity, not by file count.** 2a is the headline but each of its
sites is a small, local class swap; 2b's `academy-simulator.tsx:68` at 2.26:1 and
`command-palette.tsx:134` at 1.91:1 are the two places where a real customer reads
illegible text, and those are single-line fixes that can land today.

Three things that must survive whoever implements this:

1. **Do not sed the `ink` scale.** `text-ink-200` / `text-ink-300` are already correct
   (`tailwind.config.ts:191-192`); only 400-700 hold dark values. A blanket rename
   breaks the 5 correct uses in `agent-war-room.tsx`.
2. **Do not fix 2b with a class sweep.** `--ink-400` and `--ion-4` are inline `var()`
   fallbacks, invisible to a Tailwind class search. And the `--ink-400` *token* being
   undefined is a different defect from the `text-ink-400` *class* resolving to a
   failing color, despite the shared name.
3. **Review per site, do not bulk-replace.** I proved 2 of 184 end-to-end and cleared
   the file-level surface for all 29 files; I did not resolve paper-card nesting
   inside dark components. A blind sed could repaint a light-surface site dark.

The change is source-level on customer-facing surfaces, so it is `hermes:` work, not
founder-gated. It is not one commit — 189 sites with a nesting caveat wants the
per-site review first, then a mechanical pass, with `typecheck` + `lint` + a visual
spot-check of the command palette and the empty states in between.
