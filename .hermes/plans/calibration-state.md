# GSE: a calibration state a customer can actually be shown

## What this changes

GSE measured its calibration carefully and then could not tell anyone the answer.

`compilePublicClaim` — "no compiler pass, no public claim" — gated every public
number on `calibrationPublishable?: boolean`. That is an **assertion**. Any
caller could pass `true` and the single gate that guards every published figure
would allow the claim; nothing in the compiler could distinguish a verified
reading from a hopeful one. Meanwhile `CONFIDENCE_PROBABILITY_CAVEAT` has been
computed on every report, carried on `CalibrationReport`, and pinned by tests
since 2026-09-19 — and rendered on **no customer surface at all**. The string
existed. The disclosure did not.

So the Proof Room could show a customer every calibration receipt in the
platform and still not answer the only question they had: *is your calibration
any good?* The verdict lived in a gate flag, a publish receipt, and a streak
counter, none of which render, and none of which a customer can read.

## What was added

**`lib/calibration/public-state.ts`** — grades the durable eligibility evidence
into one state, composed from the existing sources of truth and never
re-implementing a floor or a metric:

| State | Means | Figures shown |
|---|---|---|
| `NO_EVIDENCE` | never measured | none |
| `UNAVAILABLE` | the read failed — **not a verdict** | none |
| `STALE` | real but past the schedule | none |
| `COLLECTING` | below the sample floor | none |
| `BELOW_FLOOR` | measured, and it fails | yes, with the named failure |
| `MEETS_FLOOR` | cleared our floor on this sample | yes |

`MEETS_FLOOR` is reachable only from a real GREEN report. There is no code path
that grants it without one, and no test input short of one produces it.

**`components/calibration/calibration-state-card.tsx`** — the surface the caveat
was written for, now rendering the state and shipping `notEstablished` on every
reading. The limits travel *inside* the card element, so a screenshot of the
state is a screenshot of the caveats.

**Wired into `/calibration`** above the gate reading, and into the claim
compiler, which now judges `CALIBRATION` claims on the graded state when one is
supplied. The boolean is retained and still honoured, so existing callers are
unaffected — but a verified state overrides it, and an explicit `null` state
blocks rather than falling back.

## The honesty properties, and where they are pinned

- **A claim the evidence contradicts is refused** — `calibrationPublishable: true`
  alongside a `NO_EVIDENCE` state now BLOCKs. This is the defect; that it used to
  ALLOW is in the test name.
- **Withheld is withheld, not approximated** — a sub-floor sample carries no
  `evidence` object at all, so a renderer has nothing to print.
- **A failed read is never a verdict** — `UNAVAILABLE` reports no failing floors,
  and `worseState` ranks it below every passing state.
- **Stale evidence keeps none of its numbers** — an expired passing reading
  renders as `STALE` with no figures.
- **Bad news is publishable** — `BELOW_FLOOR` ships its evidence and names the
  floor it missed.
- **`MEETS_FLOOR` never says "is calibrated"** — it says it cleared *our* floor
  on *this* sample, and a test rejects `is calibrated` / `accurate` in any state.
- **The copy is scanned, not trusted** — every statement and limit line is run
  through `scanForBannedPhrases` and `scanForNumericPerformanceClaims`.

## One finding worth flagging

The pre-existing `CONFIDENCE_PROBABILITY_CAVEAT` trips the numeric-claim
heuristic: it reads *"the 80+ band claims about 87% and realizes about 52%"* —
percentages beside performance words. That is a **disclosure of
anti-predictivity**, the opposite of an unsupported claim, and the heuristic
cannot tell the difference.

I did not strip the numbers to satisfy it. Deleting "87% / 52%" would delete the
sentence telling customers the confidence score does not work — the exact
overclaim this work exists to prevent. The scanner assertion is scoped to the
copy this module authors, and a companion test asserts the figures are still
present, so the caveat cannot later be edited down into vagueness to pass a lint.
The real `trust-gate` guardrail passes; it checks banned phrases and is clean.

## Also

`vitest.config.ts` — the workspace `@sports/*` symlinks point into a separate
stale checkout, so package-root tests silently read sources this PR never
touched. Aliased the remaining package roots, matching the three already there,
with a test asserting they resolve here.

**Not done, deliberately:** the remaining measured quantities (spread, total) have
no proven floors of their own, so they are not claimed. A `MEETS_FLOOR` on
moneylines is not evidence about them, and saying so is recorded in the ledger's
`nextAction`.
