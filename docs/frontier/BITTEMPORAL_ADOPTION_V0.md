# Bitemporal Adoption v0 — Design Record

**Status:** v0 SHIPPED as a pure in-memory layer (`packages/epistemic-twin/src/as-of.ts`,
PR #139, stacked on the Twin core from PR #137). Persistence is **founder-gated**
(Phase 1 below). Index strategy is **parked** (Phase 2 below — do not build).
**Companion contracts:** `OPERATIONAL_EPISTEMIC_TWIN_CONTRACT.md` (lands with PR #134).

## 1. Why bitemporal, in one incident

`/nflverse` OOM-500'd while `/api/health` said healthy. Any honest postmortem has to
answer two different questions that a single timestamp cannot distinguish:

- **What was true at 12:00?** (the source was already down)
- **What did the system know at 12:00?** (nothing — the probe that saw the outage
  was recorded at 12:03)

A reconstruction that mixes these lets hindsight leak: the timeline shows the outage
"known" before anyone could have known it. That is the same leak class the
prediction side already treats as radioactive (walk-forward discipline,
`PickSignalSnapshot` pre-lock persistence). Bitemporal-lite applies the identical
discipline to operational truth.

## 2. The two axes and the invariants

Every `TwinObservation` carries:

| Field | Axis | Meaning |
|---|---|---|
| `observedAt` | valid time | when the fact was true in the world |
| `recordedAt` | transaction time | when the system learned/stored it |

Enforced loudly (`TwinObservationError`, typed, thrown — never silently filtered):

1. `observedAt` and `recordedAt` must be **valid** Dates. (NaN timestamps pass every
   `<` comparison silently; the adversarial review of PR #139 showed a corrupt row
   would otherwise validate and then vanish — or worse, win — at arbitrary cuts.)
2. `recordedAt >= observedAt` — a fact can be recorded late, never before it was true.
3. The nested `evidence.observedAt` (which drives freshness decay in the frozen core)
   must be valid and must not postdate `recordedAt` — a NaN or future-dated payload
   timestamp would read as *permanently fresh* under `decayEvidence`.

## 3. The cut: `AsOfMode`

`foldObservationsAsOf(observations, asOf, mode)` filters visibility per mode:

- **`"transaction"`** — `recordedAt <= asOf`: what the system **knew** by `asOf`.
  The honest audit/incident view.
- **`"evidence"`** — `observedAt <= asOf`: what had **happened** by `asOf`, including
  facts learned later. The hindsight/analysis view.
- **`"both"`** (default) — both conditions: the strict bitemporal cut.

Proposition (test-pinned): under invariant 2, `recordedAt <= asOf` implies
`observedAt <= asOf`, so `"both"` and `"transaction"` select identical sets for
valid input. `"both"` stays the default because its meaning would not silently
change if the validation invariant were ever relaxed.

## 4. The fold law (winner selection)

Among visible observations for one capability: **latest `observedAt` wins**;
ties broken by latest `recordedAt`; full ties resolve to the later element in
input order (append-order).

Most-recent-**evidence**-wins, not last-write-wins, is load-bearing: a probe
observed 10:00 / recorded 10:05 must beat a backfill observed 09:00 / recorded
10:10. A late-arriving backfill of *old* evidence never overrides newer evidence;
a late-recorded *correction* about the same instant wins only its own tie. This
is pinned in every mode, including `"evidence"` mode where future-recorded rows
participate (the one place a mode-scoped regression to last-write-wins could
hide — mutation-tested during review).

## 5. Decay relative to the reconstruction point

`composeGraphAsOf` materializes nodes from `CapabilityTemplate`s
(`templatesFromSeed` projects the existing seed registry) and runs the **frozen**
`composeGraph` with `now = asOf`. Freshness decay is therefore evaluated at the
reconstruction point: evidence stale *relative to asOf* composes unknown exactly
as it would have live. Two boundary rules are chosen and pinned, not accidental:
observations with no matching template are ignored (evidence cannot create
capabilities — a typo'd probe id leaves its intended node honestly unknown), and
capabilities with no visible observation compose unknown with
`no_observation_as_of:<id>` ("absence of coverage is not green," extended through
time).

## 6. Adoption ladder

- **v0 (DONE, PR #139):** pure, dark, in-memory. No persistence, no consumers.
  The composition law and the as-of law are fully test-pinned (132 tests).
- **Phase 1 (FOUNDER GATE — do not build without explicit authorization):**
  a Prisma `CapabilityObservation` append-only table persisting the observation
  log (`capabilityId`, `observedAt`, `recordedAt DEFAULT now()`, status/evidence
  payload, `deploymentSha`). Append-only means: no UPDATE path, corrections are
  new rows with later `recordedAt`. The wire adapter (`adapt-op003.ts`) already
  coerces persisted ISO strings safely (unparseable → no evidence, never a
  fabricated timestamp).
- **Phase 2 (PARKED — explicitly out of scope per founder direction):** index
  strategy for large logs (BRIN on `recordedAt` for append-locality; GiST only
  if range-overlap queries ever materialize). Recorded here so nobody re-derives
  it, not as an invitation to build it.

## 7. Non-goals

No auto-remediation, no new alerting, no replacement of existing status enums
(the adapter lifts OP-003's wire form; it does not migrate it), no /api/health
wiring until #135 + #137 merge (separate consumer PR), and no persistence until
the Phase-1 gate opens. The v0 layer must remain importable without touching a
database, a clock (`asOf` is always a parameter — no `Date.now()` anywhere), or
the network.
