# Integration Contracts — `gse-intelligence-build`

**Owner:** c09 (integration module).
**Consumers:** sibling module builders (qb-behavior, coaching, trust-signals, reasoning), c10 (test-suite orchestration).
**Provenance:** `reasoning-depth-spec.md` §5 (mandatory checklist), §6 (data structures), §7 (API shape);
`tnf-intelligence-program-2026-10-01.md` §2 (Garrett's OL → scheme → QB hierarchy), §3–5 (Tracks 1–3);
`x-intake-registry.md` (trust-signal intake lanes); `corpus-intelligence/maps/c09-map.md` (verified research).

## 1. Provider interfaces (Python ABCs in `integration/providers.py`)

Every intelligence module exposes a **provider** implementing one of these ABCs.
The integration layer never imports module internals — only the provider ABC.

```python
class QBBehaviorProvider(ABC):
    @abstractmethod
    def get_qb_profile(self, qb_id: str) -> QBBehaviorProfile: ...
    @abstractmethod
    def get_pressure_splits(self, qb_id: str) -> PressureSplits: ...   # clean vs pressured; PARKED until sourced (map #8)

class CoachingProvider(ABC):
    @abstractmethod
    def get_coach_profile(self, coach_id: str) -> CoachProfile: ...     # HC/OC/DC, YoY deltas
    @abstractmethod
    def get_scheme_fingerprint(self, team: str, week: int, season: int) -> SchemeFingerprint: ...

class TrustSignalProvider(ABC):
    @abstractmethod
    def get_trust_signals(self, team: str, week: int, season: int) -> list[TrustSignal]: ...
    # TrustSignal: {player_id, signal_type, text, source_url, observed_at, verification}

class OLProvider(ABC):
    @abstractmethod
    def get_ol_state(self, team: str, week: int, season: int) -> OLState: ...
    # OLState: {starters_out: [...], practice_status: {...}, continuity_index, pressure_rate_allowed, source_verification}
```

### Data-shape contracts

- All profile objects are **frozen dataclasses** with a `verification: Verification` field on every
  numeric claim (`CORPUS | COMPUTED | SINGLE_SOURCE | INFERENCE`).
- Every numeric field that feeds an L3+ causal chain MUST carry `verification != INFERENCE`
  unless accompanied by a machine-checkable `breaking_condition` string.
- Missing data is `None` with a `data_gap: str` reason — never a zero, never an omitted field.
  (Map finding #13: zero-resolution confidence must not masquerade as signal.)

### ID-vocabulary contract (2026-10-02, real-data validation)
- **Production `qb_id` is the nflverse GSIS id** (`00-0033537`). Real providers
  (`SituationalQBProvider`, the `qb_weekly.csv` / `qb_starts.csv` /
  `trust_targets.csv` tables) are keyed on GSIS ids only.
- **Fixture slugs** (`deshaun-watson`) exist ONLY in `integration/stubs.py`
  and the pinned e2e fixtures, which run against stub providers. Slugs are
  never resolved against the real store: the store's `name` column holds
  first-initial forms (`D.Watson`) that cannot reliably invert a slug, and a
  fuzzy matcher would manufacture identity — the exact failure the
  no-guessing rule exists to prevent.
- Callers crossing the fixture→production boundary MUST translate ids
  explicitly (GSIS id in, GSIS id out). A `DataGapError` naming an unresolvable
  qb_id is the correct response to a slug on the production path.

## 2. Garrett's hierarchy — evaluation order (hard contract)

L5 synthesis MUST evaluate in this order and record a verdict per layer
(`tnf-intelligence-program-2026-10-01.md` §2; reasoning-depth-spec §8 T6):

1. **OL** — unit health, continuity, pressure allowed vs expected, DL/OL matchup grade.
2. **Coaching / scheme** — playcaller tendencies, adjustments, scheme-vs-scheme neutralization.
3. **QB behavior** — profiles, pressure splits, trust-target concentration.

A trace that reaches QB props without recorded OL and scheme verdicts is **INVALID**
(`validate_checklist` returns `ChecklistResult(valid=False, ...)`).

## 3. Checklist gate (reasoning-depth-spec §5)

`validate_checklist(trace)` enforces, at depth ≥ L3:

| Track | Provider | Verdicts |
|---|---|---|
| qb_behavior | QBBehaviorProvider | CLEAR / NOTHING-MATERIAL / DATA-GAP / CONFLICT / UNCHECKED |
| coaching_scheme | CoachingProvider | same |
| offensive_line | OLProvider | same |
| trust_signals | TrustSignalProvider | same |
| scheme_matchup | integration (computed) | same |

Rules:
- Any `UNCHECKED` at L3+ → `valid=False`, names the track. Halt, never silent downgrade.
- `DATA-GAP` on a load-bearing track → adversary assumes worst-plausible value, recorded.
- 2+ `CONFLICT` → L5 required regardless of leg count.
- Conflict resolution precedence: **live-verified > computed > corpus > single-source > inference**.

## 4. Escalation state machine (reasoning-depth-spec §4)

| Trigger | Transition |
|---|---|
| matchup / line-vs-number / injury flag | L1 → L2 |
| bet requested, causal claim, or signal conflict | L2 → L3 |
| real exposure, market contradiction > 5%, weak load-bearing link | L3 → L4 |
| thesis survives adversary, 3+ legs, "full picture" requested | L4 → L5 |
| published pick or multi-leg card | MUST be L5 (contract violation otherwise) |

`requested_depth` is a floor: the engine may escalate, never de-escalate silently.
Level-skipping is a logged exception in `escalation_log`.

## 5. Trace persistence (reasoning-depth-spec §2.6, §6)

- Traces are content-addressed: `trace_id = "trace_" + sha1(canonical_json(levels, game, depth))[:16]`.
- `resume_trace_id` merges new signals as a NEW level entry; original levels are immutable.
- Storage backend is pluggable (`TraceStore` ABC); default is a JSONL file store.

## 6. Test contract (for c10 orchestration)

- Integration tests live in `tests/test_integration_*.py`, runnable with `python3 -m pytest tests/`
  (stdlib `unittest` fallback: `python3 -m unittest discover tests/`).
- **T1 (mandatory):** Steelers–Browns Week 4 2026 — the engine MUST kill the pressure-funnel
  stack at L4: L3 chain (OL injuries → Monken quick-game 0.639 → pressure neutralization,
  breaking condition `TTT > 2.6s or quick-game < 0.55`), adversary marks
  `breaking_conditions_met: true`, four legs bundled as ONE thesis on shared link
  `pit_pressure_lands`, recommendation contains REJECT for the stack.
- T2–T7 per reasoning-depth-spec §8, implemented as trace-object assertions (never prose).

## 7. What `analyze()` guarantees

```python
analyze(req: AnalysisRequest) -> ReasoningTrace
```
- Runs specialists (stat, scheme, behavior, signal) in parallel at L3+; adversary separately;
  synthesizer sequential after.
- `exposure in ("published_pick", "card")` ⟹ returned trace depth is L5, else raises
  `ContractViolation`.
- Never returns a pick below L5. Shallower outputs are labeled `ANALYSIS-DRAFT`.

## 8. Python API (façade over the canonical engine, converged 2026-10-02)

`reasoning/` owns the canonical contract (engine, types, adversarial layer,
checklist). `integration/` is its provider-wired façade: same public
signatures, every reasoning operation delegated to `reasoning/`.

The TypeScript sketch in the spec maps to these Python signatures:

```python
from integration import analyze, adversary_review, validate_checklist, correlated_theses

analyze(req: AnalysisRequest,
        providers: ProviderRegistry,
        store: TraceStore | None = None,
        league_avgs: dict[str, float] | None = None,
        now_iso: str | None = None) -> reasoning.ReasoningTrace  # canonical trace

adversary_review(legs: tuple[BetLeg, ...],
                link_conditions: dict[str, list[BreakingCondition]],
                chains: list[CausalChain],
                outputs: dict | None = None) -> reasoning.AdversaryReport  # canonical

validate_checklist(trace) -> reasoning.ChecklistResult  # canonical validator

correlated_theses(legs: tuple[BetLeg, ...],
                  link_conditions: dict[str, list[BreakingCondition]]) -> list[ThesisBundle]
```

`link_conditions` comes from `pipeline.build_causal_chains()` (link_id → thesis breaking
conditions). `analyze()` wires all of this internally; the standalone functions exist for
unit testing and for sibling modules that run pipeline stages à la carte.
