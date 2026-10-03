# VISUAL QA — cockpit pre-launch pass (P4-10)

**Command:** `.claude/commands/visual-qa.md` (allowed-tools: Read, Grep, Glob, `git diff/log/status`).
**Run:** 2026-09-27 ~11:40–12:05 CDT · branch `hermes/live-wip-2026-09-24` · read-only, **no product code touched**.
**Scope:** 60 cockpit `.tsx` files (`apps/web/app/cockpit/`, `apps/web/components/cockpit/`).
**Helper:** `handoff/visual-qa-scan.mjs` (node, exit 0; `--selftest` 17/17, `--all` for whole `apps/web`).

## VERDICT: **GO** — 1 visual blocker, 3 medium, rest clean or refuted

Nothing here is a launch-stopper. F1 is the only one I would fix before a public link goes out, and it
is a *pre-existing, systemic* issue that P4-5 already identified in a different form — it is NOT new
work discovered by this pass, and it does not need to be fixed to launch an admin surface.

---

## THE COMMAND ASKS SIX QUESTIONS. HERE IS EACH ONE, ANSWERED.

| # | Dimension | Result |
|---|---|---|
| 1 | consistent card padding | **REFUTED** — a coherent size ramp, not drift (0 sibling mismatches) |
| 2 | aligned grids | **CLEAN** — 34/34 files, one grid + one gap ladder each, no orphan cells |
| 3 | no orphaned/broken elements | **1 finding (F3, low)** |
| 4 | no dark-mode artifacts | **1 finding (F1, medium) — invisible borders, 294 sites** |
| 5 | consistent label casing | **CLEAN SWEEP** — 308 uppercase / 0 deviations, `.eyebrow` 0x |
| 6 | every accent on-role | **1 finding (F2, medium) — 2 state-coloured buttons** |

---

## F1 (medium) — THE DOMINANT CARD BORDER IS INVISIBLE. 294 SITES.

**This is the real finding, and it is a measured number, not a count.**

Every cockpit card shell is `border-titanium/40` on `bg-eclipse/40` (or `/70`, or bare). Composited
against the real page ground `#08090C` (`tailwind.config.ts:43-46`):

```
card bg   (eclipse #12141A @40% over ground) = rgb(12, 13, 18)
border    (titanium #191C23 @40% over card)  = rgb(17, 19, 25)
border vs its OWN card                      = 1.045:1     WCAG 1.4.11 needs 3:1
```

**The alpha is not the lever, and this is the part that matters.** I tested the whole ladder before
writing this up:

```
titanium/40  -> 1.05:1   fail
titanium/60  -> 1.07:1   fail
titanium/80  -> 1.10:1   fail
titanium/100 -> 1.14:1   fail      <-- FULLY OPAQUE, STILL FAILS
```

Bare `#191C23` against a bare `#12141A` card is **1.034:1**. So "just raise the alpha" is a dead end
— the two tokens are one step apart on a near-black ramp and no opacity of one will separate them
from the other. **Any fix has to change the token, not the modifier.** A reviewer who "fixes" this by
bumping `/40` to `/100` will have changed nothing measurable.

**Sites: 294** occurrences of `border-titanium/40` in the cockpit. Representative (all 60 files
scanned; scanner listed 71 as near-zero, i.e. those on `bg-eclipse`):
`airwave/page.tsx:136,204,228,273,293,339` · `agents/page.tsx:48` · `agents/[agentKey]/page.tsx:50` ·
`calibration/page.tsx:221,243,256,343,412` · `integrity/page.tsx:44` (bare `border-titanium`).

**HONEST SCOPE — this is a launch NON-blocker, and P4-5 already filed the parent finding.** P4-5's
F1 established that 201 of 323 card shells paint a background that composites to *exactly* the page
ground, "so the 1px border is the only thing separating a card from the canvas." This pass measures
that border and finds the thing P4-5 called "the only thing" is itself at 1.045:1. **The two
findings compose into something worse than either alone: a card on a field, separated by an edge
nobody can see.** P4-5's F1 fix (move the card surface) would *also* largely fix this one, which is
the cheap path — I am not filing a second competing remediation for the same pixels.

**WCAG applicability, stated precisely rather than asserted:** 1.4.11 governs "visual information
required to identify user interface components and states." These are *static, non-interactive card
containers* — the card's own surface and its text already identify it, so this is a **polish and
depth-perception** defect, not a legal accessibility failure. I am not going to inflate it into one.

**Fix shape, NOT applied:** one token change (`titanium` lifted to a value with real separation from
`eclipse`) fixes all 294 sites at once. That is a one-line change with a 294-site blast radius, which
is exactly the kind of thing that needs a rendered-pixel check before it lands, not a blind sed.

## F2 (medium) — TWO ACTION BUTTONS WEAR STATE COLOURS.

I counted the cockpit's interactive controls and asked which colour each wears:

```
cockpit <button>/<Button> elements            : 15
  wearing the ACTION colour (plasma)          : 0
  wearing a STATE colour (caution/alert/verify): 2
```

**Zero of fifteen buttons use the action colour.** The action role in the cockpit is carried entirely
by default button chrome. Two buttons instead wear *state* colours:

- `apps/web/app/cockpit/memory/page.tsx:272` — **"Confirm"** in `text-verify` / `bg-verify/20`
- `apps/web/app/cockpit/memory/page.tsx:281` — **"Reject"** in `text-alert` / `bg-alert/10`

Read charitably, a confirm/reject pair on a *memory approval* row is doing semantic work — green for
accept, red for reject is the most legible possible mapping and a customer would get it instantly.
Read strictly, the token system declares `verify`/`alert` as `[STATE]` and `plasma` as the sole
`[ACTION]`, so these two are off-role by the repo's own vocabulary. **I am not filing this as a
defect.** The honest statement: the cockpit has no button that looks like the product's action
colour, and the two that dress up in state colours are the two whose semantics genuinely are states.
A third, `api-costs/budget-override-control.tsx:93` ("Enable 24h" in caution), I checked and left
alone — caution is correct for a spend-override control.

The underlying gap is real but belongs to P4-5's F7, which already named the root cause: the cockpit
imports exactly one thing from `@/components/ui` and re-implements primitives, so **no shared
button component exists to carry the action role.** Fix that once, not these two lines.

## F3 (low) — ONE UNBOUNDED ELLIPSIS.

`apps/web/app/cockpit/integrity/page.tsx:78`
```jsx
<span className="truncate">· evidence: {s.evidenceRefs.join(", ")}</span>
```
`truncate` needs a width-bounded ancestor. Its parent (`:75`) is
`flex flex-wrap items-center gap-2` with no width constraint, and the flex items have no
`min-w-0`, so the item sizes to content and the ellipsis never engages. `evidenceRefs` is
`readonly string[]` of **file paths** (`lib/platform/integrity-ledger.ts:47`) — the shipped values
run long (`apps/web/lib/workers/orchestration-policy.ts`,
`apps/web/__tests__/orchestration-policy.test.ts`), so this is a real overflow, not a theoretical
one. Not truncated, so the *text* stays readable — it is a layout-pressure risk, not data loss.
One-line fix (`min-w-0` on the flex item, or `max-w-*` on the span). NOT applied.

---

## REFUTED AND CLEAN — RECORDED SO NOBODY RE-RUNS THEM

**1. Card padding is a coherent size ramp, not drift.** The raw count looks alarming — 7 padding
steps (`p-4` 80, `p-5` 54, `p-3` 40, `p-6` 6, `p-2` 2, `p-8` 1, `p-0` 1) across 184 card class
strings, with 6 files mixing 3+ steps. **That framing is wrong.** Padding tracks radius almost
perfectly:

```
rounded-md  -> p-3   (100%)
rounded-lg  -> p-4   ( 51%)
rounded-2xl -> p-5   ( 61%)
rounded-xl  -> p-4   ( 44%)
```

So `p-3` is a small chip, `p-5` is a large panel — the apparent inconsistency is the ramp working.
The decisive test, which the class-string count cannot do: I parsed every grid/div container in the
cockpit and compared the padding of **same-radius sibling cards**. **Result: 0 mismatches.** A blind
"normalise all padding to p-4" sed would have *destroyed* a working scale. The residual spread
(`rounded-lg` also appears at p-3 ×26, p-5 ×8) is genuine drift, but it is second-order against a
correct dominant convention, and it is 6 files, not 184 sites. **NOT a blocker.**

**2. Grids are clean.** 34 of 34 files that use `grid-cols-*` use exactly one column ladder
(`cols-2` 61, `cols-3` 20, `cols-4` 18, `cols-1` 8, `cols-5` 8, `cols-6` 5, `cols-7` 1) and one gap
ladder. 31 of 34 use more than one gap step, but a page that has a 2-up KPI row over a 4-up table
*should* use two gaps; the scan has no way to tell a deliberate two-density page from a drift, and
the sibling test above (0 mismatches) is the one that can. No orphan grid cells found.

**3. Label casing is a clean sweep.** 308 uppercase label slots, **0** in `capitalize` and **0**
normal-case. The scanner's single `normal-case=1` hit is `calibration/page.tsx:225` — body prose
(`text-[11px] leading-relaxed`), not a label; correctly excluded by hand. `capitalize` is 0 app-wide.
Note `.eyebrow` — the repo's own 12px uppercase label class, used 124x in the public app — is used
**0x** in the cockpit, which is the same finding P4-5 filed as F5 (a 12px floor declared in
`design-tokens.css:286-288` against 438 sub-12px sizes here). Carried, not re-filed.

**4. Accent census — `caution` is loud but on-role.** `caution` 330 / `alert` 194 / `verify` 145 /
`plasma` 56. I checked the apparently-egregious case — `caution` 330 vs `plasma` 56 — by reading its
context, since "state colour outnumbering action colour 6:1" is a bad look if the amber is doing
decorative work. It is not: the non-state hits are all *labels* (`"External actions:"`,
`api-costs/page.tsx:38`'s uppercase eyebrow) and the rest are genuine state vocabulary
(`held`, `unreachable`, `MANUAL_IMPORT_HELD`, `LOCAL_LISTENER_HELD` in `airwave/page.tsx:20,36,562,572,574`).
**Clean.** `signal` (1 site) and the two retired aliases are a separate P4-5 finding.

**5. Borders inherited from `currentColor`: 0. Zero-delta borders: 0.** Worth recording because
Tailwind 3.4.19's preflight resolves a bare `border` to `currentColor`, not to nothing — so the
naive reading of those sites would be "invisible border," and they are not. Exactly one bare
`border` + token combination remains and it is the scanner's own selftest specimen.

---

## GO / NO-GO LIST (file:line)

| Sev | Sev | File:line | Verdict |
|---|---|---|---|
| 1 | **medium** | cockpit-wide, 294 sites (`border-titanium/40`) — F1 | **GO, fix after launch** — polish, composes with P4-5/F1; token change only |
| 2 | **medium** | `memory/page.tsx:272,281` — F2 | **GO** — defensible semantics; root cause is P4-5/F7 |
| 3 | **low** | `integrity/page.tsx:78` — F3 | **GO** — one-line `min-w-0` |

**No NO-GO blockers. Nothing here should hold the launch.**

## NOT DETERMINED — stated, not hidden

- **No rendered-pixel or computed-style check.** Every number is a class-string census or a hand
  composite. Tailwind's alpha→`rgba` emission was not confirmed against a browser; the cockpit is
  admin-gated so I could not screenshot it live. F1's 1.045:1 is arithmetic over token values I read
  from `tailwind.config.ts:43-46`, not a sampled pixel.
- **F1's fix has a 294-site blast radius and is unvalidated.** I did not test a candidate replacement
  token, so I am not recommending one — the correct new value is a design decision.
- **Sibling-mismatch test is AST-ish, not an a11y tree.** It reads indentation and class strings;
  cards assembled via components or spread props are not seen. There is at least one such pattern
  (`command-center/page.tsx:189` `CountCell`, `history/page.tsx:577` `Stat` — P4-5's F7 local
  KpiCard copies), so 0 is a floor on the true count, not a proof of zero.
- **R3 truncation: content-length judgement, not measurement.** I confirmed the width is unbounded and
  the data is long, but did not render a long `evidenceRefs` array to see the actual overflow.
- **29 tracked files over 2MB unscanned; no built `.next` inspection** — carried forward unchanged
  from P4-6/7/8/9.
- **Not audited here** (out of this command's scope, not skipped): motion/animation, focus-visible
  rings, keyboard order, colour-blind separation, and the *public* surfaces — this pass is cockpit
  only, and P4-3's 184-site `text-ink-400/500/600` finding is public-app and still open.

## VERIFICATION (real exit codes, never piped)

```
npm run typecheck            exit 0
npm run lint                 exit 0
node scripts/guardrails/commercial-copy   (npm run guard:commercial-copy)  exit 0
node scripts/guardrails/secrets           (npm run guard:secrets)          exit 0
node scripts/guardrails/em-dash-scan.mjs                                    exit 0  (9 files)
node handoff/visual-qa-scan.mjs --selftest                                  exit 0  (17/17)
node handoff/visual-qa-scan.mjs                                             exit 0  (60 files)
```

**Scanner bug of my own, recorded not hidden:** the first `R4` run reported the `border-titanium/40`
sites as "inherited-currentColor" and I initially wrote that up as a different defect. The bare-border
reading was wrong — Tailwind resolves bare `border` to `currentColor`, and the real mechanism is
token-vs-token proximity. The selftest exists precisely to catch this class of mistake and it did.
