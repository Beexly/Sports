# `integration/` — the unified NFL intelligence API

**Owner:** c09. **Status:** implemented, tested (spec §8 T1–T7 green).

One callable interface over qb-behavior, coaching, trust-signals, and reasoning —
per `reasoning-depth-spec.md` §7. Owns the cross-module contracts and the end-to-end
game-analysis pipeline.

## Layout

| File | Implements |
|---|---|
| `types.py` | Spec §6: trace schema, `Verification`, `ChecklistVerdict`, `ReasoningDepth`, `BetLeg`, `ThesisBundle`, `AdversaryReport` |
| `providers.py` | Provider ABCs (`QBBehaviorProvider`, `CoachingProvider`, `TrustSignalProvider`, `OLProvider`) + frozen data shapes. Sibling modules implement these; integration never imports module internals. |
| `escalation.py` | Spec §4: L1–L5 state machine. `compute_depth()` walks every step with a logged trigger; skipping is impossible by construction. |
| `checklist.py` | Spec §5: blocking validator. Any `UNCHECKED` track at L3+ → `INVALID`, named. 2+ `CONFLICT` → L5 forced. Precedence: live-verified > computed > corpus > single-source > inference. |
| `specialists.py` | Spec §2.2/§2.4: stat, scheme, behavior, signal specialists (parallel) + separate adversary pass. |
| `pipeline.py` | Spec §4 L2/L3: cross-stat correlations (computed, never asserted) + causal-chain builder (OL deficiency → scheme adjustment → pressure neutralization, thresholds from the spec's worked example). |
| `synthesis.py` | Spec §2.2/§8 T6: L5 synthesis in Garrett's hierarchy order — OL → scheme → QB. |
| `trace.py` | Spec §2.6: content-addressed, append-only, resumable traces (`FileTraceStore`, `resume_trace`). |
| `stubs.py` | Deterministic PIT@CLE Week 4 2026 fixture providers for the T1 regression test. |
| `api.py` | `analyze()`, `adversary_review()`, `correlated_theses()` (+ `validate_checklist` re-export). |

## Quick start

```python
from integration import analyze, AnalysisRequest, Exposure
from integration.stubs import fixture_registry, fixture_game, fixture_league_avgs

trace = analyze(
    AnalysisRequest(game=fixture_game(), question="...", exposure=Exposure.CARD, legs=(...)),
    fixture_registry(),
    league_avgs=fixture_league_avgs(),
)
trace.levels["L5"]["recommendation"]  # REJECT / PROCEED / NO BET
```

## Contracts

Sibling modules: implement the ABCs in `providers.py`, register via `ProviderRegistry`.
Full contract: `../contracts/integration-contracts.md`.

## Tests

`../tests/test_reasoning_spec.py` (T1–T7), `../tests/test_units.py`.
Run: `python3 -m unittest discover -s ../tests` or via c10's `../tests/run_all.py`
(needs the build venv: `.venv/bin/python`).
