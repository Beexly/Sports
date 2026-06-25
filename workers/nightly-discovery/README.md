# Nightly Discovery Worker

The autonomous "smarter every night" organ (Charter Move #2 / Pillar 3) — in its
honest, owner-gated form.

Each night it re-tests the **bounded, pre-registered** candidate family
(`packages/prediction-engine/src/candidate-registry.ts`) on newly settled data and
decides what — if anything — to **propose** to the owner. It never decides anything
itself. Two layers of discipline stand between a lucky result and a proposal:

1. **Benjamini-Hochberg FDR** across the night's family (`multiple-testing.ts`).
2. **Cross-night confirmation** — K consecutive independent discovery nights past a
   Bonferroni-over-nights bar — so one lucky night can never promote noise, and a
   decayed live signal is symmetrically demoted.

## Structurally unable to flip a gate

This is the load-bearing safety property, enforced three ways:

- The only status a `DiscoveryProposal` can hold is the **literal** `"PROPOSED"`. An
  `IMPLEMENTED`/`APPLIED` artifact is not constructible by the type.
- `discovery-engine.ts` exports proposal **producers** only — no `apply()`/`write()`,
  and it imports no gate-writer.
- `scripts/guardrails/discovery-shadow.mjs` fails CI if the worker imports a gate-writer
  or if any emitted `proposals.json` contains a non-`PROPOSED` status.

The owner is the sole actor who can act on a proposal, downstream, by hand.

## Run the dry-run

```bash
npx tsx workers/nightly-discovery/src/dry-run.ts
```

It runs the engine on a deterministic scenario and writes
`workers/nightly-discovery/out/{proposals.json,REPORT.md}` (gitignored). No DB writes,
no network, no gate flips.

## Wiring to real data (next step)

A production night replaces the in-memory scenario with: for each candidate, run the
existing leakage-safe walk-forward + Clark-West harness over newly settled games →
a `CandidateNightResult { id, pValue, effectSize, sampleSize }`. Everything downstream
(FDR, cross-night, proposal emission) is unchanged. Persisting each night's
`updatedHistory` is the worker's only state.
