# `integration/` — provider-wired façade over the canonical reasoning engine

**Status:** converged 2026-10-02 — thin façade, no independent pipeline.
**Canonical contract:** `reasoning/` (engine, types, adversarial layer, checklist).

One callable interface over qb-behavior, coaching, trust-signals, and reasoning —
per `reasoning-depth-spec.md` §7. This package keeps the provider-wiring
vocabulary (`ProviderRegistry`, `stubs.py`) and the public function surface
(`analyze`, `adversary_review`, `correlated_theses`, `validate_checklist`),
but every reasoning operation delegates to `reasoning/`:

| File | Role |
|---|---|
| `types.py` | Façade I/O vocabulary. The closed enums (`Verification`, `ChecklistVerdict`, `ReasoningDepth`, `Exposure`), `TRACKS`, and `VERIFICATION_PRECEDENCE` are re-exported from the canonical `reasoning/enums.py` — one vocabulary for the whole build. |
| `providers.py` | Provider ABCs (`QBBehaviorProvider`, `CoachingProvider`, `TrustSignalProvider`, `OLProvider`) + frozen data shapes. Sibling modules implement these; the façade never imports module internals. |
| `api.py` | **The façade.** `analyze()` translates the `ProviderRegistry` into the canonical `DataContext` (observations, chains, checklist hints, track evidence), runs `reasoning`'s `AnalysisEngine`, and returns the canonical `ReasoningTrace` with the contract's serialized level views attached. `correlated_theses` / `validate_checklist` / `adversary_review` delegate to the canonical implementations. |
| `pipeline.py` | L3 causal-chain builder (OL deficiency → scheme adjustment → pressure neutralization, thresholds from the spec's worked example). Used by the façade to build the `DataContext` chains. Also hosts `weakest_verification` and the escalation/checklist test utilities. |
| `escalation.py` | Legacy escalation computation (`compute_depth`, `AnalysisContext`) — pinned by unit tests; the engine's state machine (`reasoning/escalation.py`) is canonical for new code. |
| `checklist.py` | `resolve_conflict`, `worst_plausible_assumption` utilities (pinned by unit tests); the blocking validator is `reasoning`'s. |
| `trace.py` | `FileTraceStore` + `resume_trace`, now persisting canonical traces. |
| `stubs.py` | Deterministic PIT@CLE Week 4 2026 fixture providers for the T1 regression test. |

## Quick start

```python
from integration import analyze, AnalysisRequest, Exposure
from integration.stubs import fixture_registry, fixture_game, fixture_league_avgs

trace = analyze(
    AnalysisRequest(game=fixture_game(), question="...", exposure=Exposure.CARD, legs=(...)),
    fixture_registry(),
    league_avgs=fixture_league_avgs(),
)
trace.levels["L5"]["recommendation"]  # REJECT / PROCEED...
```

The returned trace is `reasoning`'s canonical `ReasoningTrace`. For the
engine's native entry point (DataContext input, no providers), use
`reasoning.analyze` / `reasoning.AnalysisEngine` directly.

## Contracts

Sibling modules: implement the ABCs in `providers.py`, register via `ProviderRegistry`.
Full contract: `../contracts/integration-contracts.md`.

## Tests

`../tests/test_reasoning_spec.py` (T1–T7), `../tests/test_units.py`.
Run: `../tests/run_all.py` under `~/workspace/.venvs/gse-intel/bin/python`.
