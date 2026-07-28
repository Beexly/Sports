# UQ Honesty Stack — Module Index

**Last updated**: 2026-07-28 (post walk-forward harness + Council↔Gate alignment)

One-page map so the next agent does not rediscover ownership, invariants, or
test locations. Companion docs:

- `docs/ops/UQ_HANDOFF_2026-07-24.md` — original design handoff
- `docs/ops/UQ_HARDENING_SESSION_2026-07-28.md` — verification + dedup + council

## Calibration (Venn-Abers family)

| Module | Path | Invariants | Tests |
|--------|------|------------|-------|
| PAV (linear-time isotonic) | `calibration/pav.ts` | non-decreasing fitted values; weighted pool; total on empty | `__tests__/pav.test.ts` |
| Inductive Venn-Abers | `calibration/ivap.ts` | p0≤p1; width≥0; empty→0.5/0.5; imports shared PAV | `__tests__/ivap.test.ts` |
| Aggregation (geo + Neumaier) | `calibration/aggregation.ts` | ordered multiprob; finite on extremes | `__tests__/aggregation.test.ts` |
| Cross Venn-Abers | `calibration/cvap.ts` | K-fold IVAP + geo mean; fold clamp; deterministic seed | `__tests__/cvap.test.ts` |
| Local isotonic patch | `calibration/local-isotonic-patch.ts` | minSamples gate; λ∈[0,1]; isotonic knots | `__tests__/local-isotonic-patch.test.ts` |
| Multicalib audit-and-patch | `calibration/multicalib-audit-patch.ts` | minSamples gate; no cross-group contamination; maxIterations honest | `__tests__/multicalib-audit-patch.test.ts` |

## Conformal / Mondrian

| Module | Path | Invariants | Tests |
|--------|------|------------|-------|
| Mondrian residual manager | `conformal/mondrian.ts` | hierarchical fallback; abs residual; (n+1) quantile | `__tests__/mondrian.test.ts` |
| Sports taxonomy | `conformal/sports-taxonomy.ts` | pure category assignment; parent chain terminates | `__tests__/sports-taxonomy.test.ts` |
| Levene / Welch / split quality | `conformal/levene-welch.ts` | total function (no throw/NaN); saturated mean leg | `__tests__/levene-welch.test.ts` |
| LWT-MCPS sketch | `conformal/lwt-mcps-sketch.ts` | deterministic partition; sample accounting; depth bound | `__tests__/lwt-mcps-sketch.test.ts` |

## Edge Lab (decision path)

| Module | Path | Invariants | Tests |
|--------|------|------------|-------|
| Selective gate | `edge-lab/selective-gate.ts` | sole FIRE authority; width No-Bet; MIN_STRATUM_CALIBRATION=100; disjoint sets | `edge-lab/__tests__/selective-gate-multiprob.test.ts` |
| Agent role contracts | `edge-lab/agent-roles.ts` | typed roles + context | (via council tests) |
| Sequential Edge Lab Council | `edge-lab/edge-lab-council.ts` | guardian hard veto; placebo undefined≠passed; diagnostic-only ledger | `edge-lab/__tests__/edge-lab-council.test.ts` |
| Walk-forward taxonomy harness | `edge-lab/walk-forward-taxonomy.ts` | per-row Mondrian; underpowered/under-coverage/wide alerts; no invented fields | `edge-lab/__tests__/walk-forward-taxonomy.test.ts` |
| Council↔Gate alignment | — | shared width / sample-floor / lower-endpoint / placebo doctrine | `edge-lab/__tests__/council-gate-alignment.test.ts` |

## Design principles (do not violate)

1. Finite-sample honesty first (exchangeability → multiprob / group-conditional coverage).
2. Selective prediction / No-Bet is first-class — never overridden by apparent edge.
3. Everything affecting a displayed probability must be recomputable from the Glass Ledger (when a writer exists).
4. Pure TypeScript for core UQ primitives; no external ML libs for PAV/IVAP/CVAP/Mondrian core.
5. Prefer pure functions and explicit data structures over hidden mutable state.
6. Absence of evidence ≠ evidence of failure (thin strata stay silent; undefined placebo is untested).

## Certificate / math pack — UNBLOCKED and landed (#220, 2026-07-28)

Previously listed as blocked ("artifact pack never found; do not fabricate
statistical formulas"). The founder supplied the bodies via PR #220, so it was
reviewed and merged rather than invented. Now on main under
`packages/prediction-engine/src/certificate/`:

| Module | Boundary |
|--------|----------|
| `decision-certificate.ts` | Schema v1, parse validation, canonical-JSON SHA-256 hash, reason codes |
| `gate-certificate-bridge.ts` | **Post-gate only** — consumes gate output, never replaces it |
| `stratum-coverage.ts` | Sample floors / coverage |
| `selective-abstention.ts` | **Helpers only** — thresholds must not fork the gate |
| `proper-scoring.ts` | Offline reliability (Brier / log-loss / reliability diagram) |
| `kelly-lower-endpoint.ts` | **INTERNAL only** — never a public "recommended stake" |
| Tests | `certificate/__tests__/certificate-modules.test.ts` |

Three defects were found and fixed in review — recorded because each is the
kind that survives a green suite:
1. `proper-scoring.ts` did not compile under `noUncheckedIndexedAccess`, which
   was masking a real crash: a non-positive bin count drove the index negative.
2. `parseDecisionCertificate` rejected interval endpoints of exactly 0 or 1 —
   values the real gate emits whenever an isotonic region is unanimous. Those
   certificates failed their own validator and could not be re-verified,
   defeating the recompute path certificates exist to provide.
3. The abstention sample floor re-declared `100` instead of importing
   `MIN_STRATUM_CALIBRATION` — a silent fork of the gate's authority.

## Explicitly blocked (do not invent)

- **Ledger multiprob persistence** — `PRODUCT_CASCADE_MAP.md` §4: no production
  consumer of `FiredDecision`; domain mismatch with `LedgerPickEntry`. Unchanged
  by #220 — the certificate bridge is a pure transform with no writer.

## Next high-leverage items

1. Feed real walk-forward / historical-replay rows into `runWalkForwardTaxonomy`
   from an existing replay harness (wiring only — the harness is ready).
2. Wire `certificateFromGateCandidate` at a real post-gate call site. Pure
   transform today with no production consumer.
3. Optional: property-based fuzz (fast-check) on PAV/CVAP for random sequences.
4. **Known flaky test, unrelated to the UQ stack**:
   `apps/web/__tests__/ai-control-plane-budget-pg.test.ts > "100 concurrent
   end-to-end invocations stay within the cap"` asserts `completed === 60`
   exactly. Each invocation holds $0.10 worst-case but settles $0.05 on
   first-route success, *releasing* headroom that can admit more — so the count
   is timing-dependent and only equals 60 if every hold is taken before any
   settlement. Observed 62 on one CI run, green on re-run. **Not a cap breach**
   (62 × $0.05 = $3.10, well under the $6.00 cap); the exact-equality assertion
   is the defect, not the budget system. It will intermittently red unrelated
   PRs until the assertion is changed to a bound.
