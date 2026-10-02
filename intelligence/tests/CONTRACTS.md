# Module Contracts — what the test suite enforces

**Provenance:** distilled from `~/workspace/corpus-intelligence/handoff/reasoning-depth-spec.md` (§6 data structures, §7 API, §8 test assertions) and `~/workspace/corpus-intelligence/maps/c10-map.md` (numeric gates).

## 1. Reasoning package contract (`reasoning/` at build root)

Implements the reasoning-depth spec. Canonical contract lives in `reasoning/schemas.py`
(the sibling c07/c08 builders consolidated all dataclasses there; `enums.py` owns
the closed enums). The e2e suite tests this public surface:

```python
# reasoning/schemas.py — canonical dataclasses (import from `reasoning` or `reasoning.schemas`)
@dataclass BreakingCondition: id, text, metric, op, threshold
    # metric keys into trace.observed_values; machine-checkable via evaluate_condition
@dataclass CausalLink: id, cause, mechanism, outcome, verification,
                       breaking_conditions: list[BreakingCondition], load_bearing: bool
@dataclass CausalChain: id, links: list[CausalLink]
@dataclass BetLeg: id, description, causal_link_ids: list[str], exposure: float
@dataclass ThesisBundle: id, shared_link_ids: list[str], leg_ids: list[str], combined_exposure: float
@dataclass ReasoningTrace: trace_id, depth, game, exposure, legs, chains,
                           checklist, observed_values, track_evidence, label,
                           question, levels, escalation_log, tool_calls,
                           hierarchy_order, created_at
@dataclass AdversaryReport: trace_id, breaking_conditions_met, condition_results,
                            correlated_theses, thesis_verdicts, killed_thesis_ids,
                            counter_argument, pre_mortem, weak_links, weak_link,
                            gap_assumptions, notes
@dataclass ChecklistResult: valid, verdicts, invalid_reason, requires_l5, data_gaps, conflicts
@dataclass WeakLink: link_id, verification, breaking_condition_present,
                     breaking_condition_machine_checkable

# reasoning/adversary.py (c08 owns)
def adversary_review(trace: ReasoningTrace) -> AdversaryReport   # the 4 mandatory outputs + weak-link/gap machinery
def correlated_theses(legs: list[BetLeg], trace: ReasoningTrace) -> list[ThesisBundle]
def killed_legs(report: AdversaryReport) -> list[str]            # legs of KILL theses — L5 must exclude

# reasoning/checklist.py (c08 owns)
def validate_checklist(trace: ReasoningTrace) -> ChecklistResult # UNCHECKED at L3+ → INVALID
def depth_contract_ok(depth: ReasoningDepth, exposure: Exposure) -> bool  # pick/card MUST be L5

# reasoning/escalation.py (c07 owns)
@dataclass EscalationSignal: depth, triggers: set[str], market_edge_pct, checklist_conflicts, weak_links, legs
def next_depth(signal: EscalationSignal) -> tuple[ReasoningDepth | None, str | None]
def escalate_to(trace: ReasoningTrace, target: ReasoningDepth, trigger: str) -> None  # de-escalation raises
def count_weak_links(trace: ReasoningTrace) -> int               # load-bearing INFERENCE/SINGLE_SOURCE links

# reasoning/trace.py (c07 owns) — persistence only
class TraceStore:
    def save(trace) -> str            # content hash (content-addressed)
    def load(h) -> ReasoningTrace
    def resume(h, new_level, payload, note="") -> ReasoningTrace  # merge: original levels never rewritten

# reasoning/levels.py (c07 owns)
HIERARCHY_ORDER: list[str]           # ["offensive_line", "coaching_scheme", "qb_behavior", ...]
def check_hierarchy(trace) -> bool  # OL before scheme before QB
```

**Hard contract rules (tested in e2e):**
- `depth_contract_ok`: `exposure in (PUBLISHED_PICK, CARD)` MUST be L5; anything shallower is a contract violation.
- KILL-verdict theses: `killed_legs()` must be excluded from any L5 recommendation.
- Escalation is a state machine per spec §4; de-escalation raises; level-skipping is a logged exception (`skipped=True`) in `escalation_log`.
- A load-bearing INFERENCE/SINGLE_SOURCE link is `weak_link: true` even when its breaking condition is present (T5).
- `TraceStore.resume` deep-copies the original levels unchanged (T7).
- `validate_checklist` returns INVALID naming the unchecked track when any track is `UNCHECKED` at L3+.
- Traces persist content-addressed and are resumable via `resume_trace_id` (T7).
- Garrett's hierarchy (OL → scheme → QB) is honored in every L5 synthesis (T6).

## 2. Numeric gates (from c10 research — enforced as e2e contracts)

| Module | Method | Gate (from research) |
|---|---|---|
| ratings | G-Elo MOV (1448) | ΔLS ≥ 0.005, accuracy ≥ baseline +1pp, NFL 2019–2023 backtest |
| ratings | covariate-assisted BT + QB decomp (0213) | beat plain BT + Elo on 2022–2024 rolling log-loss by ≥ 0.003 |
| ratings | BT production algos (2601.14727) | ≥2% walk-forward Brier improvement (2022–2024) over engine baseline |
| ratings | relativized features (0049) | absolute feature clears ≥0.01 AUC vs relativized twin or dropped |
| qb | rGAX residualization (1143) | robustness-slope stability ≥ 0.90 (reported 0.936 vs 0.757) |
| qb | contamination discipline (0424) | cross-fit residuals; shrinkage within position×volume bins |
| combining | angular CDF combining (1550) | fallback θ=67.5°; optimized θ must not lose to linear pool |
| combining | afCRPS training (0748) | ≥2% holdout CRPS gain, no ensemble collapse |
| trust | EnbPI no-split conformal (1641) | weeks-1–4 coverage beats ICP by ≥3pp; full-season within ±2pp of nominal |
| trust | conformal reject gate (0987) | publish/abstain gate; abstention lifts accuracy (0716: MC-dropout +2.3–3.0pp at 80% coverage) |
| trust | leak walls (CARDS_EDGE_VALIDATE) | non-finite week stamps fail closed (return null); missing market feed refuses `no_market_feed` |
| trust | calibration baselines (Cohort E) | pooled 2016–2025: Brier 0.2106, adaptive-bin ECE 0.0126 — module must reproduce within tolerance |
| staking | Kelly stop-loss PDE (1203) | ≥95% of free-Kelly log growth; stop-hit frequency cut ≥50% |
| staking | α-governor (1749) | CORRECTED 2026-10-02: linear cushion rule (ledger §12 first approx); floor holds (max DD ≤30%, min B/M ≥ α−0.02); marginal cost vs SHIPPED sizer ≤30%; dominates naive κ-reduction at equivalent drawdown |
| staking | Dominant Asset screen (1213) | E[(1+X_i)/(1+X_j)] ≤ 1 suppresses/merges dominated picks |
| staking | effective-price (0283) | adopt if ≥2% of +EV picks flip −EV under effective-price accounting |
| staking | variant selection (1083) | mean ignorance (log₂); ≥0.05-bit promotion gate |
| trust | proof ledger | Wilson 95% LB must clear 52.4% before any edge claim |
| newregime | MAML adapter (1912) | ≥0.02 Brier improvement on new-regime prediction |
| newregime | NGGP few-shot GP (1902) | ≥0.01 Brier gate |
| qb | INT projection (kicker-defense-props) | FTN worthy-INT rate × expected dropbacks × 52.3% conversion |
| qb | sack-prop veto | individual sack props NOT projected (R² < 0.005); team sacks from forced-rates only |
| qb | Edge Sheet luck layer | fumble recovery = pure noise; turnover→points ≈ 4.5; fair margin = (home net EPA/play − away net EPA/play) × 63 + 2.0 |
| qb | on-field efficiency blend | 55% pass EPA residual / 15% rush EPA residual / 15% CPOE / 10% explosive-pass / 5% INT luck |

**REJECT verdicts that must stay rejected (tested as negative gates):**
- xFP/FPOE as weighted next-week feature (Δrho = −0.0165 holdout failure)
- 1631 drawdown optimizer (no edge input — decorative)
- 1173 Dirichlet-process forecast combination
- Difficulty/consensus abstention heuristics (invalidated by 0716)
- Play-level bootstrap CIs (coverage 0.60 at nominal 0.90 — game-clustered resampling required)

## 3. Corrected contracts (quality-gate findings, 2026-10-02)

### α-governor (1749) — contract corrected
The ledger's §14 gate ("≥80% of the unconstrained full-Kelly X-hat sizer's
growth", i.e. cost ≤20%) compared against the wrong baseline and is
structurally unachievable under EITHER discrete rule the ledger's §12 names —
verified by the quality gate via brute-force DGP grid search (nonlinear rule:
79% cost; linear rule: 52% cost vs X-hat). The ledger's §12 names two rules;
the "exact" nonlinear reconstruction π=1−α/d_t was implemented first and
measured a 67% marginal growth cost vs the shipped κ=0.25 sizer — the paper's
turnpike property is asymptotic and its finite-horizon insurance cost is
prohibitive on a 36-week season. Adopted: the ledger's linear cushion rule
π=max(0,min(1,(d_t−α)/(1−α))) (full sizer at peak, zero at the α floor).
The honest contract, measured against the SHIPPED sizer the governor layers
onto: (1) floor holds empirically (max DD ≤ 30%, min B_t/M_t ≥ α−0.02);
(2) marginal growth cost ≤ 30% (measured ~24%); (3) DOMINANCE over naive
κ-reduction — at equivalent drawdown the governor keeps ~76% of shipped
growth vs ~46% for κ=0.10 de-levering. That dominance is the economic reason
to adopt it. All documented in `staking/alpha_governor.py` and the e2e gate.

### Pipeline integration contract (`tests/e2e/test_pipeline_integration_e2e.py`)
Wire-first sequencing enforced end to end:
- combining (angular CDF, θ=67.5°) → trust calibration_chain (ECE must not
  degrade) → trust proof-ledger floor (Wilson 52.4%) gates the edge claim →
  staking CVaR sizer (stake ≤ fractional-Kelly cap; conservative edge ≤ p_hat;
  zero stake on negative edge) → α-governor scales by drawdown state.
- trust abstention (NNTD × market disagreement) vetoes the pick: stake = 0.
- Leak wall: non-finite weeks fail closed; missing market feed raises.
- Determinism: fixed seed → identical stake through the full flow.
- Engine: `AnalysisEngine.analyze` runs pipeline outputs in DataContext;
  Exposure.NONE traces complete with the depth contract holding;
  PUBLISHED_PICK from L1 escalates to L5 (spec §7); traces are isolated per
  game (trace.game populated from the request — quality-gate fix 2026-10-02;
  the engine previously left `game` empty).
