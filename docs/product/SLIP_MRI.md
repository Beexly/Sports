# Slip MRI

**Module:** `packages/decision-field-runtime/src/slip-mri.ts`
**Surface:** a future `tools/slip-mri/preview` (fixture-only)
**Status:** fixture-only; the strongest possible verdict is "proceed with caution."

## What it is

Accumulators / bet-builders are where tip sites make their money and where bettors lose theirs. GSE
refuses to push reckless multi-leg betting. Slip MRI takes a slip and runs *risk intelligence* on it —
it diagnoses the hidden ways the slip is more fragile than it looks. It never sells a parlay.

## What it diagnoses

`analyzeSlip(legs)` → `SlipMRI`:

- **Correlation** — legs on the same event, or the same team across events, are *not independent*;
  each correlated pair is flagged with the reason.
- **Duplicated assumptions** — two legs that repeat the same market on the same event.
- **Weakest leg** — the lowest implied-probability leg that breaks the slip most easily.
- **Combined implied probability** and **estimated fragility** (`1 − combined`).
- **Risk concentration** — `LOW | MEDIUM | HIGH` (high when correlated legs share events).
- **Authority ceiling** — the meet across legs; an unsupported leg or an `INFO_ONLY` ceiling caps it.
- **`whatWouldBreakSlip`** — the plain-language failure path.

## The verdict ladder

`PASS | WARN | PROCEED_WITH_CAUTION`. The **strongest** verdict is `PROCEED_WITH_CAUTION` — there is
no `best bet`, no `lock`, no `profit` framing. Any of {unsupported leg, correlated legs, duplicated
assumptions, `INFO_ONLY` ceiling} forces `PASS`. High fragility or high concentration forces `WARN`.

Every result carries a `responsibleWarning`: multi-leg bets are high-variance, every leg must hit,
this is a risk diagnosis not advice, and only ever stake what you can afford to lose.

## Invariants

- The verdict can never exceed `PROCEED_WITH_CAUTION`.
- Correlation is always surfaced, never hidden to inflate apparent independence.
- No profit / best-parlay / guarantee language.

## Tests

`__tests__/n5-layers.test.ts` (Slip MRI block): correlated legs flagged → PASS, an unsupported leg
forces PASS, the strongest verdict is PROCEED_WITH_CAUTION with a responsible warning present.
