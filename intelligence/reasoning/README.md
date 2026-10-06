# `reasoning/` — the L1–L5 reasoning engine

**Owners:** c07 (levels, trace, escalation, engine, specialists) + c08
(adversarial layer: `adversary.py`, `checklist.py`). One package, one contract:
shared dataclasses live in `schemas.py` — consume them, never redefine them.

Implements `corpus-intelligence/handoff/reasoning-depth-spec.md` §7
(`analyze` / `adversary_review` / `validate_checklist` / `correlated_theses`).

## Layout

| File | Implements |
|---|---|
| `schemas.py` | Canonical dataclasses: `ReasoningTrace`, `CausalChain/Link`, `BreakingCondition`, `BetLeg`, `ThesisBundle`, `AdversaryReport`, `ChecklistResult`, `Claim`, `EscalationEntry`, `ToolCall` |
| `enums.py` | Closed enums: `ReasoningDepth`, `Verification`, `ChecklistVerdict`, `Exposure`, plus `TRACKS` and `VERIFICATION_PRECEDENCE` |
| `engine.py` | `analyze(req, ctx) → ReasoningTrace`: L1→L2→L3→(L4 checklist + adversary)→L5 synthesis, with escalation, persistence, resume |
| `levels.py` | L1–L5 runners; `HIERARCHY_ORDER` (OL → scheme → QB); `check_hierarchy` (T6) |
| `escalation.py` | `next_depth` trigger matrix; `escalate_to` (skips logged, de-escalation refused); `count_weak_links` (T5) |
| `trace.py` | `TraceStore` (content-addressed save/load/`resume` — T7); tagged serialization |
| `specialists.py` | stat / scheme / behavior / signal / adversary specialists (parallel) + registry |
| `interfaces.py` | `AnalysisRequest`, `DataContext`, `GameRequest`, `SpecialistOutput` |
| `exceptions.py` | `ContractViolation`, `ChecklistInvalid`, `AdversaryNotWired`, `TraceNotFound`, … |
| `adversary.py` | c08: `adversary_review(trace)`, `correlated_theses`, `killed_legs` |
| `checklist.py` | c08: `validate_checklist`, `depth_contract_ok`, `describe_gate` |

## Contracts the engine enforces

- A published pick or multi-leg card **MUST** come back L5 (`Exposure.CARD` /
  `PUBLISHED_PICK` raise the floor; `_finalize` raises `ContractViolation`
  otherwise).
- Breaking conditions evaluate against `trace.observed_values`; any met
  condition sets `breaking_conditions_met` (OR semantics per link).
- Legs sharing a causal link are **one thesis**; KILL-verdict legs are never
  recommended (T1).
- Resume merges new levels; original levels are never rewritten (T7).

## Tests

- `tests/test_reasoning_engine.py` — pipeline incl. the mandatory T1
  (Week 4 PIT@CLE pre-kickoff kills the pressure-funnel stack → REJECT)
- `tests/test_reasoning_units.py` — enums, escalation, conditions, store, levels
- `tests/e2e/test_reasoning_trace_e2e.py` — c10 gate: spec §8 T1–T7 over these seams
- `tests/test_adversary.py`, `tests/test_checklist.py` — c08's unit depth

Run: `PYTHONPATH=tests .venv/bin/python -m pytest tests/test_reasoning_engine.py
tests/test_reasoning_units.py tests/e2e/test_reasoning_trace_e2e.py`
