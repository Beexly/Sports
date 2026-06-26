# Authority Flight Record

**Module:** `packages/decision-field-runtime/src/authority-flight-record.ts`
(a thin presenter over `authority-vector.ts` `composeAuthority` — **not** a new authority system)
**Surface:** Proof tab of `/matches/preview/*` and the offline Event Genome page
**Status:** fixture-only; the binding layer on fixtures is Source-reality → `INFO_ONLY`.

## What it is

For every card, stat, trend, prediction, and market, GSE can attach one honest record of *what it was
allowed to say and why*. The Flight Record is the receipt: requested expression vs permitted
expression, the binding layer, the full 8-layer trace, what is missing, and what would upgrade it —
in plain language, not enum names.

## The eight layers

`composeAuthority` takes the meet across eight ceilings; the lowest one binds:

1. **Rights** — do we have the rights to use this data for this audience?
2. **Temporal** — is it fresh / knowable in time?
3. **Source-reality** — live vs fixture/shadow data.
4. **Evidence** — is there enough?
5. **Local expression** — the read's own strength.
6. **Model maturity** — has the model beaten its baseline out-of-sample?
7. **Entitlement** — the viewer's access tier.
8. **Owner action** — owner sign-off.

The permitted strength is `strengthMin(requested, meet)` on the lattice
`INFO_ONLY < WATCH < WAIT < PERSONALIZED < ACTION < PUBLIC_ACTION`.

## On fixtures

`buildFlightRecord({ requested: "PUBLIC_ACTION", authority: FIXTURE_AUTHORITY })` returns
`permittedExpression: "INFO_ONLY"`, `bindingLayer: "SOURCE_REALITY"`, `lifecycleStage: "FIXTURE"`,
and `whatWouldUpgrade: "…activate the live data source…"`. We ask for the strongest claim on purpose so
the cap is visible: **the fixture cannot speak above FYI, and the record says exactly why.**

## Why a presenter, not a system

There is one authority engine (`composeAuthority`) and one decision grammar (`DecisionState`). The
Flight Record only *explains* their output for humans. No parallel authority math, no competing
ceiling — Phase 19's "no parallel systems" rule applies.

## Tests

`__tests__/n5-layers.test.ts` (Flight Record block): a fixture request is capped at `INFO_ONLY` with
`SOURCE_REALITY` binding + an upgrade hint; a fully-live public request clears to `PUBLIC_ACTION`.
