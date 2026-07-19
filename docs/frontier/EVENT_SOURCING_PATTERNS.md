# Event-Sourcing Patterns — What This Repo Already Does, Named

**Status:** design record (docs-only). Nothing here authorizes new persistence —
any new table or migration stays founder-gated per standing doctrine.

## 1. Thesis

Galaxy Sports Edge already event-sources every surface where trust is at stake.
It just never named the pattern. Naming it matters because the next subsystem
should copy the discipline *deliberately* — and because the one time a subsystem
ignored it (the DEC-062 promoter that trusted self-reported aggregates), the
result was structurally fake and unfalsifiable.

The pattern, wherever it appears: **append immutable facts, derive state by
replay, reject impossible facts loudly.**

## 2. Inventory — where the pattern already lives

| Mechanism | Facts appended | Derived state | Replay proof |
|---|---|---|---|
| Slate commitments (`freeze-slate-commitments.ts`) | write-once, create-only commitment rows (+ Pedersen aggregate fields) | the sealed slate | `/api/verify/slate` recomputes from persisted rows |
| Hash-chain ledger | chained decision records | public track record | `recompute.ts` re-derives byte-for-byte |
| `PickSignalSnapshot` | pre-lock signal snapshots | walk-forward evaluation windows | promotion harness rejects any window containing post-lock predictions |
| Promotion gate (`packages/prediction-engine/src/promotion/`) | row-level persisted records only; `PromotionDecision` + sha256 `windowHash` | ELIGIBLE / NOT_ELIGIBLE verdicts | verdict re-derivable from rows; self-reported aggregates unrepresentable in the input type |
| Twin observation log (`packages/epistemic-twin/src/as-of.ts`) | `TwinObservation` (observedAt/recordedAt, in-memory in v0) | composed capability graph as-of any cut | `composeGraphAsOf` is a pure function of (templates, log, asOf, mode) |

## 3. The three laws (extracted, so the next system inherits them)

1. **Append-only facts.** A correction is a new fact with a later transaction
   time, never an UPDATE. Slate commitments are create-only; ledger entries chain;
   Twin corrections are new observations that win a fold tie-break, leaving the
   original visible to earlier reconstructions.
2. **Replayable derivation.** Any number the platform asserts publicly must be
   recomputable from persisted facts by an independent path (`recompute.ts`, the
   slate verifier, the promotion gate's replay invariant). If a derivation can't
   be replayed, it isn't a claim — it's a rumor.
3. **Loud rejection of impossible facts.** Temporally impossible or corrupt input
   throws typed errors (`TwinObservationError` for NaN/inverted timestamps,
   `PromotionIntegrityError` for post-lock predictions) *before* any statistics
   or composition run. Silent filtering is the failure mode: a corrupt row that
   quietly vanishes is indistinguishable from honest absence, which poisons
   every downstream "absence means X" inference.

## 4. When to event-source vs. mutable rows

Event-source when any of these hold; otherwise plain mutable rows are fine:

| Signal | Examples here | Why |
|---|---|---|
| The value backs a public or paid claim | picks, CLV, calibration, track record | claims must be replayable (law 2) |
| "What did we know at T?" is a real question | health capabilities, promotion windows | requires transaction time (bitemporal) |
| Auditability outranks write convenience | slate seals, ledger, refunds/entitlement transitions | corrections must be visible as corrections |
| Multiple writers / late arrivals are expected | probes, settlement feeds, backfills | ordering law resolves races deterministically |

Mutable rows remain correct for UI preferences, caches (the nflverse single-flight
cache is a cache, not a record), and anything whose history carries no claim.

## 5. Anti-patterns (each observed or nearly-shipped here — not hypothetical)

- **Self-reported aggregates.** The DEC-062 promoter read model-adjacent summary
  fields instead of recomputing from rows; a hardcoded stub was indistinguishable
  from a working system. Fix class: make the harness input type accept only
  row-level facts, so fakeness is unrepresentable — not merely discouraged.
- **Mutating a snapshot.** Rights snapshots, signal snapshots, and commitments are
  point-in-time captures. An edited snapshot is a forged one.
- **Fabricated timestamps.** A missing/unparseable time is *absence of evidence*,
  never `new Date()` at read time. (The OP-003 adapter coerces garbage to null;
  the Twin composes it as unknown.)
- **Silent filtering of corrupt events.** The PR #139 review caught NaN-dated
  observations passing validation and silently disappearing at every cut —
  the fix rejects them loudly at the boundary (law 3).
- **Event-sourcing as a license to persist.** The pattern describes *shape*, not
  *permission*. New tables, migrations, and any Phase-1 Twin persistence remain
  founder-gated regardless of how correct the event model is.

## 6. Adoption guidance for the next subsystem

Start from `packages/epistemic-twin/src/as-of.ts` as the reference implementation
of the fact/fold/replay split (it is small, pure, and fully test-pinned), and from
`packages/prediction-engine/src/promotion/` as the reference for making dishonest
input unrepresentable. Copy the laws, not the code. If the new system needs
bitemporal reconstruction, read `BITTEMPORAL_ADOPTION_V0.md` first — the fold
ordering and validation invariants there were adversarially reviewed and are not
free to re-derive casually.
