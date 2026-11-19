"""Wave 29 Neuro-Symbolic Kernels: Chronofy TLDA, VeNRA, NARS/ACAL, SymRAG, PoTRE, LeanCat."""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

_CLINICAL_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::enforce_protomed_k_anonymity_l_diversity_and_sat_conflict_gate"
)
_CHRONOFY_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::compute_chronofy_temporal_logical_decay"
)
_VENRA_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::verify_venra_double_lock_fact_ledger"
)
_BIPOLAR_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::propagate_bipolar_gradual_argumentation"
)
_NESY_GAP_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::detect_nesy_rag_symbolic_knowledge_gaps"
)
_SYMRAG_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::route_symrag_adaptive_query_pathway"
)
_POTRE_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::aggregate_potre_heterogeneous_ensemble_and_compile_solver"
)
_LEANCAT_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::verify_leancat_functor_compositionality"
)
_BRIDGE_SEAM = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
    "::evaluate_wave29_neuro_symbolic_corpus_bridge"
)
_TARGET_SURFACE = (
    "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py"
)


def _arxiv_entry(
    entry_id: str,
    name: str,
    arxiv_id: str,
    category: str,
    domain: str,
    seam: str,
    role: str,
    *,
    medical_ruo: bool = False,
) -> dict[str, str]:
    posture = (
        "ingest_and_learn_medical_ruo_zero_sports_weight"
        if medical_ruo
        else "ingest_and_learn_academic_arxiv"
    )
    return {
        "id": entry_id,
        "name": name,
        "url": f"https://arxiv.org/abs/{arxiv_id}",
        "license": "CC-BY-4.0",
        "category": category,
        "domain": domain,
        "gse_seam": seam,
        "gse_target_surface": _TARGET_SURFACE,
        "license_posture": posture,
        "role": role,
        "status": "WIRED_V3",
    }


WAVE29_ARXIV_ENTRIES: tuple[dict[str, str], ...] = (
    _arxiv_entry(
        "227",
        "kankariya/PoTRE-arXiv-2607.20268",
        "2607.20268",
        "heterogeneous-reasoning",
        "potre_poly_topological_reasoning_ensembles",
        _POTRE_SEAM,
        "4-topology cognitive ensemble with neuro-symbolic task-adaptive aggregation.",
    ),
    _arxiv_entry(
        "228",
        "naik/ReaComp-arXiv-2605.05485",
        "2605.05485",
        "symbolic-compilation",
        "reacomp_trace_compiled_symbolic_solvers",
        _POTRE_SEAM,
        "Compiles reasoning traces into zero-token reusable DSL symbolic solvers.",
    ),
    _arxiv_entry(
        "229",
        "vahdati/ARC-Survey-arXiv-2603.13372",
        "2603.13372",
        "abstraction-reasoning",
        "arc_agi_compositional_generalization_survey",
        _BRIDGE_SEAM,
        "Cross-generation ARC-AGI analysis linking test-time refinement to skill efficiency.",
    ),
    _arxiv_entry(
        "230",
        "tsigkourakos/QRS-arXiv-2602.09774",
        "2602.09774",
        "neuro-symbolic-sast",
        "qrs_rule_synthesizing_codeql_triad",
        _VENRA_SEAM,
        "Query-Review-Sanitize triad grounding SAST patterns with PoC verification.",
    ),
    _arxiv_entry(
        "231",
        "parisotto/R3NN-arXiv-1611.01855",
        "1611.01855",
        "program-synthesis",
        "r3nn_neuro_symbolic_program_induction",
        _POTRE_SEAM,
        "Cross-correlation I/O encoding with incremental DSL tree expansion.",
    ),
    _arxiv_entry(
        "232",
        "bhargava/NARS-arXiv-2610.15091",
        "2610.15091",
        "argumentation-reasoning",
        "nars_bipolar_gradual_argumentation",
        _BIPOLAR_SEAM,
        "Bipolar gradual argumentation semantics over multi-threaded claims.",
    ),
    _arxiv_entry(
        "233",
        "nandiya/NeuroGraph-arXiv-2609.00604",
        "2609.00604",
        "graph-neuro-symbolic",
        "neurograph_ontology_cypher_threat_grounding",
        _SYMRAG_SEAM,
        "Dual-model ontology-aware Cypher generation over verified graph evidence.",
    ),
    _arxiv_entry(
        "234",
        "fan/SymbolLKG-arXiv-2608.26836",
        "2608.26836",
        "logical-knowledge-graph",
        "symbollkg_topological_rule_solver_routing",
        _SYMRAG_SEAM,
        "Logical Knowledge Graph rule nodes dispatched via dynamic Logic Router.",
    ),
    _arxiv_entry(
        "235",
        "tian/NeSy-Spatial-arXiv-2608.07955",
        "2608.07955",
        "spatial-neuro-symbolic",
        "nesy_spatial_self_evolving_skill_pruning",
        _POTRE_SEAM,
        "Typed Tool-Use & Geometry skills evolved and pruned via trajectory memory.",
    ),
    _arxiv_entry(
        "236",
        "gann/NeSy-RAG-arXiv-2608.06292",
        "2608.06292",
        "explainable-rag",
        "nesy_rag_attributable_prolog_gap_detection",
        _NESY_GAP_SEAM,
        "Attributable Prolog predicates detecting pivotal missing facts deterministically.",
    ),
    _arxiv_entry(
        "237",
        "syed/Chronofy-arXiv-2607.20560",
        "2607.20560",
        "temporal-logical-rag",
        "chronofy_tlda_decay_stl_weakest_link",
        _CHRONOFY_SEAM,
        "Bayesian beta_j=2*kappa_j decay, STL robustness & weakest-link certainty bound.",
    ),
    _arxiv_entry(
        "238",
        "dhayalkar/ImpedanceMismatch-arXiv-2606.15656",
        "2606.15656",
        "knowledge-graph-theory",
        "kg_fm_lexical_bottleneck_topological_collapse",
        _VENRA_SEAM,
        "Formalizes Lexical Bottleneck, Topological Collapse, & VSA subgraph alignment.",
    ),
    _arxiv_entry(
        "239",
        "loconte/OntologyPostCorrection-arXiv-2605.29168",
        "2605.29168",
        "kg-construction",
        "ontology_grounded_deferred_kg_repair",
        _VENRA_SEAM,
        "Post-extraction canonicalization & ontology-violation repair for SPARQL KGs.",
    ),
    _arxiv_entry(
        "240",
        "pellicer/ProtoMedAgent-arXiv-2605.14113",
        "2605.14113",
        "medical-ruo-privacy",
        "protomed_k_anonymity_l_diversity_bottleneck",
        _CLINICAL_SEAM,
        "Zero-gradient Scribe-Critic bottleneck + k-anonymity/l-diversity privacy gate (RUO 0.0).",
        medical_ruo=True,
    ),
    _arxiv_entry(
        "241",
        "gajjar/6G-AI-RAN-Agents-arXiv-2605.11516",
        "2605.11516",
        "agent-orchestration",
        "ai_ran_cognitive_subroutine_orchestration",
        _SYMRAG_SEAM,
        "Executive reasoning agent orchestrating narrow calibrated predictors with guardrails.",
    ),
    _arxiv_entry(
        "242",
        "xie/MultimorbiditySAT-arXiv-2604.17340",
        "2604.17340",
        "medical-ruo-sat",
        "sat_local_comorbidity_guideline_conflict",
        _CLINICAL_SEAM,
        "SAT verification resolving intersecting local guideline contradictions (RUO 0.0).",
        medical_ruo=True,
    ),
    _arxiv_entry(
        "243",
        "cheng/CircuitSynth-arXiv-2604.10114",
        "2604.10114",
        "probabilistic-circuits",
        "circuitsynth_psdd_hard_schema_convex_fit",
        _VENRA_SEAM,
        "PSDD semantic priors enforcing 100% hard schema validity with convex soft fit.",
    ),
    _arxiv_entry(
        "244",
        "vijayaraghavan/SYMDIREC-arXiv-2603.17208",
        "2603.17208",
        "symbolic-decomposition",
        "symdirec_divide_retrieve_conquer_rtl",
        _POTRE_SEAM,
        "Decomposes structured synthesis into verified symbolic subgoals + assembly.",
    ),
    _arxiv_entry(
        "245",
        "servedio/EpisTwin-arXiv-2603.06290",
        "2603.06290",
        "temporal-knowledge-graph",
        "epistwin_temporal_kg_visual_refinement",
        _CHRONOFY_SEAM,
        "Cross-application triple lifting over time-indexed graph with visual re-grounding.",
    ),
    _arxiv_entry(
        "246",
        "agand/VeNRA-arXiv-2603.04663",
        "2603.04663",
        "deterministic-fact-ledger",
        "venra_double_lock_ufl_forensic_sentinel",
        _VENRA_SEAM,
        "Universal Fact Ledger + Double-Lock provenance & arithmetic check + Sentinel audit.",
    ),
    _arxiv_entry(
        "247",
        "christie/MEMO-arXiv-2603.04560",
        "2603.04560",
        "skill-generalization",
        "memo_correction_clustered_skillbook",
        _POTRE_SEAM,
        "Clusters local human corrections into general retrieval-augmented skill templates.",
    ),
    _arxiv_entry(
        "248",
        "cao/ACAL-arXiv-2602.18916",
        "2602.18916",
        "argumentation-arena",
        "acal_aqbaf_clash_resolution_hitl",
        _BIPOLAR_SEAM,
        "Arena Quantitative Bipolar Argumentation with clash adjudication and HITL escalation.",
    ),
    _arxiv_entry(
        "249",
        "lugones/Aurora-arXiv-2602.17999",
        "2602.17999",
        "relational-prolog-agent",
        "aurora_bcnf_prolog_prerequisite_solver",
        _NESY_GAP_SEAM,
        "BCNF catalog schema + Prolog deterministic constraint solver + natural explanations.",
    ),
    _arxiv_entry(
        "250",
        "labre/OpenMathRAG-arXiv-2602.17826",
        "2602.17826",
        "ontology-rag",
        "openmath_cross_encoder_precision_gate",
        _VENRA_SEAM,
        "Formal math ontology RAG requiring strict cross-encoder precision threshold gating.",
    ),
    _arxiv_entry(
        "251",
        "xu/LeanCat-arXiv-2512.24796",
        "2512.24796",
        "formal-category-theory",
        "leancat_functor_composition_leanbridge",
        _LEANCAT_SEAM,
        "Lean 1-category abstraction verification ensuring identity & composition laws.",
    ),
    _arxiv_entry(
        "252",
        "urooj/NEURO-GUARD-arXiv-2512.18177",
        "2512.18177",
        "medical-ruo-explainable",
        "neuro_guard_self_verified_feature_synthesis",
        _CLINICAL_SEAM,
        "Guideline-grounded ViT feature code synthesis with RAG self-verification (RUO 0.0).",
        medical_ruo=True,
    ),
    _arxiv_entry(
        "253",
        "mamidala/LocalRetoMaton-arXiv-2508.19271",
        "2508.19271",
        "automata-memory",
        "retomaton_task_adaptive_local_wfa",
        _SYMRAG_SEAM,
        "Task-adaptive Weighted Finite Automaton providing deterministic symbolic transitions.",
    ),
    _arxiv_entry(
        "254",
        "linna/LegalAI-Obligations-arXiv-2508.18880",
        "2508.18880",
        "normative-evaluation",
        "normative_doctrinal_evidential_obligations",
        _BIPOLAR_SEAM,
        "Staged normative/doctrinal/evidential/technical burden-of-proof evaluation.",
    ),
    _arxiv_entry(
        "255",
        "hakim/SymRAG-arXiv-2506.12981",
        "2506.12981",
        "adaptive-routing",
        "symrag_complexity_load_pathway_router",
        _SYMRAG_SEAM,
        "Real-time complexity + system-load routing across symbolic, neural, & hybrid lanes.",
    ),
    _arxiv_entry(
        "256",
        "dahl/BluebookRules-arXiv-2505.02763",
        "2505.02763",
        "deterministic-rule-engine",
        "bluebook_neural_parse_symbolic_format",
        _BIPOLAR_SEAM,
        "Separates neural slot parsing from deterministic symbolic rule execution (+32.4 pp).",
    ),
    _arxiv_entry(
        "257",
        "hatalis/CBR-Agents-arXiv-2504.06943",
        "2504.06943",
        "case-based-reasoning",
        "cbr_retrieve_reuse_revise_retain_loop",
        _POTRE_SEAM,
        "Mathematical retrieval, adaptation, and self-reflective retention for LLM agents.",
    ),
    _arxiv_entry(
        "258",
        "cornelio/KG-RAG-Validator-arXiv-2504.04578",
        "2504.04578",
        "hierarchical-planning",
        "kg_rag_hierarchical_symbolic_validator",
        _NESY_GAP_SEAM,
        "KG-RAG subtask decomposition checked by Symbolic Validator for state alignment.",
    ),
    _arxiv_entry(
        "259",
        "chandra/FeatureGenReasoning-arXiv-2503.11989",
        "2503.11989",
        "automated-feature-gen",
        "octree_cot_tot_feature_rule_search",
        _POTRE_SEAM,
        "Tree/CoT/OCTree language-feedback rules generating structured tabular features.",
    ),
    _arxiv_entry(
        "260",
        "jiang/MedBenchTaxonomy-arXiv-2503.07306",
        "2503.07306",
        "medical-ruo-eval",
        "medbench_8class_error_boundary_taxonomy",
        _CLINICAL_SEAM,
        "8-class clinical reasoning omission/inconsistency taxonomy under RUO 0.0.",
        medical_ruo=True,
    ),
    _arxiv_entry(
        "261",
        "bougzime/NSAI-Taxonomy-arXiv-2502.11269",
        "2502.11269",
        "neuro-symbolic-survey",
        "nsai_neuro_symbolic_neuro_architecture",
        _BRIDGE_SEAM,
        "Comparative study establishing Neuro > Symbolic < Neuro hybrid dominance.",
    ),
    _arxiv_entry(
        "262",
        "patil/ReasoningSurvey-arXiv-2502.03671",
        "2502.03671",
        "llm-reasoning-survey",
        "prompting_modular_rl_reasoning_taxonomy",
        _BRIDGE_SEAM,
        "Structured survey of prompting, neuro-symbolic modular, and RL reasoning loops.",
    ),
    _arxiv_entry(
        "263",
        "ge/TReMu-arXiv-2502.01630",
        "2502.01630",
        "temporal-memory",
        "tremu_timeline_summary_code_temporal_eval",
        _CHRONOFY_SEAM,
        "Inferred-date timeline memory + generated Python temporal calculation execution.",
    ),
    _arxiv_entry(
        "264",
        "kalyanpur/Cora-arXiv-2406.17987",
        "2406.17987",
        "constraint-solving",
        "cora_neural_extraction_symbolic_solver",
        _VENRA_SEAM,
        "Elemental Cognition Cora separating neural extraction from formal constraint solver.",
    ),
    _arxiv_entry(
        "265",
        "xu/WirelessLMM-arXiv-2402.01748",
        "2402.01748",
        "multimodal-grounding",
        "physical_symbol_grounding_causal_rag",
        _SYMRAG_SEAM,
        "Physical symbol grounding + causal RAG + neuro-symbolic feedback adaptation.",
    ),
)

_WAVE29_BRIDGE_CACHE: dict[tuple[float, float, float, float, bool], dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def compute_chronofy_temporal_logical_decay(
    evidence_items: Sequence[Mapping[str, Any]],
    *,
    reacquire_threshold: float = 0.45,
) -> dict[str, Any]:
    """Chronofy TLDA Bayesian exp(-2*kappa*t) decay, STL robustness & weakest-link bound."""
    if not evidence_items:
        return {
            "weakest_link_validity": 0.0,
            "stl_min_robustness": -1.0,
            "mean_validity": 0.0,
            "reacquisition_triggered": True,
            "reacquire_ids": [],
            "decayed_items": [],
        }

    decayed: list[dict[str, Any]] = []
    validities: list[float] = []
    robustness_vals: list[float] = []
    reacquire_ids: list[str] = []

    for idx, raw in enumerate(evidence_items):
        fact_id = str(raw.get("fact_id") or f"fact_{idx}")
        rel = _clamp(float(raw.get("reliability", 1.0)), 0.0, 1.0)
        kappa = max(0.0, float(raw.get("kappa", 0.05)))
        age_h = max(0.0, float(raw.get("age_hours", 0.0)))
        max_age_h = max(1e-6, float(raw.get("max_valid_age_hours", 24.0)))
        beta = 2.0 * kappa
        v_j = rel * math.exp(-beta * age_h)
        rho_j = max_age_h - age_h
        stale = v_j < float(reacquire_threshold) or rho_j < 0.0
        if stale:
            reacquire_ids.append(fact_id)
        validities.append(v_j)
        robustness_vals.append(rho_j)
        decayed.append(
            {
                "fact_id": fact_id,
                "beta": round(beta, 6),
                "validity": round(v_j, 6),
                "stl_robustness": round(rho_j, 6),
                "stale": stale,
            }
        )

    weakest = min(validities)
    stl_min = min(robustness_vals)
    return {
        "weakest_link_validity": round(weakest, 6),
        "stl_min_robustness": round(stl_min, 6),
        "mean_validity": round(sum(validities) / float(len(validities)), 6),
        "reacquisition_triggered": len(reacquire_ids) > 0,
        "reacquire_ids": reacquire_ids,
        "decayed_items": decayed,
    }


def verify_venra_double_lock_fact_ledger(
    ledger: Mapping[tuple[str, str, str], float],
    required_bindings: Sequence[tuple[str, str, str]],
    formula_op: str,
    claimed_value: float,
    *,
    tol: float = 1e-6,
    schema_bounds: tuple[float, float] | None = None,
) -> dict[str, Any]:
    """VeNRA Double-Lock provenance + deterministic arithmetic + PSDD schema bounds."""
    op = str(formula_op).strip().lower()
    if op not in {"sum", "diff", "ratio", "weighted_mean"}:
        raise ValueError(f"Unsupported VeNRA formula_op: {formula_op}")

    unbound_keys: list[tuple[str, str, str]] = []
    values: list[float] = []
    for key in required_bindings:
        if key not in ledger:
            unbound_keys.append(key)
            continue
        val = float(ledger[key])
        if not math.isfinite(val):
            unbound_keys.append(key)
            continue
        values.append(val)

    if unbound_keys or not values:
        return {
            "double_lock_passed": False,
            "hallucination_detected": True,
            "exact_value": None,
            "claimed_value": float(claimed_value) if math.isfinite(claimed_value) else None,
            "unbound_keys": unbound_keys,
            "schema_valid": False,
        }

    exact_val: float | None
    if op == "sum":
        exact_val = float(sum(values))
    elif op == "weighted_mean":
        exact_val = float(sum(values) / float(len(values)))
    elif op == "diff":
        exact_val = None if len(values) < 2 else float(values[0] - sum(values[1:]))
    else:
        exact_val = (
            None
            if len(values) < 2 or abs(values[1]) <= 1e-12
            else float(values[0] / values[1])
        )

    claimed_f = float(claimed_value)
    schema_valid = True
    if schema_bounds is not None:
        lo, hi = float(schema_bounds[0]), float(schema_bounds[1])
        schema_valid = (
            math.isfinite(claimed_f)
            and lo <= claimed_f <= hi
            and exact_val is not None
            and lo <= exact_val <= hi
        )

    arith_ok = (
        exact_val is not None
        and math.isfinite(claimed_f)
        and abs(exact_val - claimed_f) <= float(tol)
    )
    passed = (len(unbound_keys) == 0) and schema_valid and arith_ok
    return {
        "double_lock_passed": passed,
        "hallucination_detected": not passed,
        "exact_value": round(exact_val, 8) if exact_val is not None else None,
        "claimed_value": round(claimed_f, 8) if math.isfinite(claimed_f) else None,
        "unbound_keys": unbound_keys,
        "schema_valid": schema_valid,
    }


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-_clamp(x, -12.0, 12.0)))


def propagate_bipolar_gradual_argumentation(
    base_scores: Mapping[str, float],
    support_edges: Sequence[tuple[str, str, float]],
    attack_edges: Sequence[tuple[str, str, float]],
    *,
    damping: float = 0.5,
    max_iter: int = 50,
    tol: float = 1e-7,
    target_node: str | None = None,
    escalation_margin: float = 0.08,
) -> dict[str, Any]:
    """NARS/ACAL damped log-odds bipolar gradual argumentation with HITL clash flag."""
    if not base_scores:
        return {
            "converged_scores": {},
            "iterations": 0,
            "converged": True,
            "target_node": target_node,
            "target_score": 0.5,
            "clash_detected": False,
            "escalate_hitl": True,
        }

    nodes = sorted(base_scores.keys())
    z0: dict[str, float] = {}
    for nd in nodes:
        p = _clamp(float(base_scores[nd]), 1e-4, 1.0 - 1e-4)
        z0[nd] = math.log(p / (1.0 - p))

    probs: dict[str, float] = {nd: _sigmoid(z0[nd]) for nd in nodes}
    supp_in: dict[str, list[tuple[str, float]]] = {nd: [] for nd in nodes}
    att_in: dict[str, list[tuple[str, float]]] = {nd: [] for nd in nodes}
    for src, dst, w in support_edges:
        if src in probs and dst in supp_in and float(w) > 0.0:
            supp_in[dst].append((src, float(w)))
    for src, dst, w in attack_edges:
        if src in probs and dst in att_in and float(w) > 0.0:
            att_in[dst].append((src, float(w)))

    damp = max(0.0, float(damping))
    iters = 0
    converged = False
    for it in range(1, max(1, int(max_iter)) + 1):
        iters = it
        next_probs: dict[str, float] = {}
        max_delta = 0.0
        for nd in nodes:
            s_term = sum(w * probs[src] for src, w in supp_in[nd])
            a_term = sum(w * probs[src] for src, w in att_in[nd])
            z_next = z0[nd] + damp * (s_term - a_term)
            p_next = _sigmoid(z_next)
            max_delta = max(max_delta, abs(p_next - probs[nd]))
            next_probs[nd] = p_next
        probs = next_probs
        if max_delta <= float(tol):
            converged = True
            break

    tgt = target_node if (target_node is not None and target_node in probs) else nodes[-1]
    tgt_score = probs[tgt]
    clash_nodes = [
        nd
        for nd in nodes
        if supp_in[nd] and att_in[nd]
    ]
    clash_detected = (tgt in clash_nodes) if target_node is not None else len(clash_nodes) > 0
    escalate_hitl = abs(tgt_score - 0.5) <= float(escalation_margin)
    return {
        "converged_scores": {k: round(v, 6) for k, v in probs.items()},
        "iterations": iters,
        "converged": converged,
        "target_node": tgt,
        "target_score": round(tgt_score, 6),
        "clash_detected": clash_detected,
        "escalate_hitl": escalate_hitl,
    }


def detect_nesy_rag_symbolic_knowledge_gaps(
    clauses: Sequence[Mapping[str, Any]],
    known_facts: Mapping[str, bool],
    candidate_unknowns: Sequence[str],
) -> dict[str, Any]:
    """NeSy-RAG symbolic sensitivity scan identifying pivotal unknown Boolean facts."""
    unknowns: list[str] = []
    for raw_u in candidate_unknowns:
        u = str(raw_u)
        if u not in known_facts and u not in unknowns:
            unknowns.append(u)
    if len(unknowns) > 12:
        raise ValueError("candidate_unknowns exceeds bounded 12-variable limit")

    base_state = {str(k): bool(v) for k, v in known_facts.items()}

    def _eval_dnf(state: Mapping[str, bool]) -> bool:
        for cl in clauses:
            reqs = cl.get("requires") or {}
            conc = bool(cl.get("conclusion", True))
            if not conc:
                continue
            if all(state.get(str(var)) is bool(val) for var, val in reqs.items()):
                return True
        return False

    n_unk = len(unknowns)
    if n_unk == 0:
        out = _eval_dnf(base_state)
        return {
            "determined_without_gaps": True,
            "known_outcome_if_determined": out,
            "pivotal_unknowns": [],
            "non_pivotal_unknowns": [],
            "assignments_checked": 1,
        }

    total_masks = 1 << n_unk
    outcomes: list[bool] = []
    for mask in range(total_masks):
        st = dict(base_state)
        for bit_i, name in enumerate(unknowns):
            st[name] = bool((mask >> bit_i) & 1)
        outcomes.append(_eval_dnf(st))

    pivotal: list[str] = []
    non_pivotal: list[str] = []
    for bit_i, name in enumerate(unknowns):
        bit = 1 << bit_i
        is_piv = False
        for mask in range(total_masks):
            if (mask & bit) == 0 and outcomes[mask] != outcomes[mask | bit]:
                is_piv = True
                break
        if is_piv:
            pivotal.append(name)
        else:
            non_pivotal.append(name)

    unique_outs = set(outcomes)
    det = len(unique_outs) == 1
    return {
        "determined_without_gaps": det,
        "known_outcome_if_determined": outcomes[0] if det else None,
        "pivotal_unknowns": pivotal,
        "non_pivotal_unknowns": non_pivotal,
        "assignments_checked": total_masks,
    }


def route_symrag_adaptive_query_pathway(
    *,
    hop_count: int,
    has_symbolic_aggregation: bool,
    constraint_count: int,
    system_load: float,
    wfa_raw_transitions: Sequence[Sequence[float]],
) -> dict[str, Any]:
    """SymRAG complexity/load adaptive pathway router + Local RetoMaton stochastic WFA."""
    hops = max(1, int(hop_count))
    cons = max(0, int(constraint_count))
    load = _clamp(float(system_load), 0.0, 1.0)
    complexity = _clamp(
        0.25 * (min(hops, 4) / 4.0)
        + (0.35 if has_symbolic_aggregation else 0.0)
        + 0.25 * (min(cons, 5) / 5.0)
        + 0.15 * load,
        0.0,
        1.0,
    )

    if has_symbolic_aggregation and hops >= 2 and load < 0.85:
        pathway = "HYBRID"
    elif has_symbolic_aggregation or cons >= 2:
        pathway = "SYMBOLIC"
    else:
        pathway = "NEURAL"

    wfa_matrix: list[list[float]] = []
    for row in wfa_raw_transitions:
        if not row:
            wfa_matrix.append([])
            continue
        cleaned = [max(0.0, float(x)) for x in row]
        row_sum = sum(cleaned)
        if row_sum <= 1e-12:
            uni = 1.0 / float(len(cleaned))
            wfa_matrix.append([round(uni, 8) for _ in cleaned])
        else:
            wfa_matrix.append([round(x / row_sum, 8) for x in cleaned])

    stochastic_ok = bool(wfa_matrix) and all(
        bool(r) and abs(sum(r) - 1.0) <= 1e-5 and all(v >= 0.0 for v in r)
        for r in wfa_matrix
    )
    return {
        "selected_pathway": pathway,
        "complexity_score": round(complexity, 6),
        "system_load": round(load, 4),
        "wfa_transition_matrix": wfa_matrix,
        "row_stochastic_verified": stochastic_ok,
    }


def aggregate_potre_heterogeneous_ensemble_and_compile_solver(
    agent_proposals: Sequence[Mapping[str, Any]],
    trace_rules: Sequence[Mapping[str, Any]],
    *,
    min_pass_rate: float = 0.85,
) -> dict[str, Any]:
    """PoTRE verified heterogeneous log-odds aggregation + ReaComp trace solver compiler."""
    seen_topologies: set[str] = set()
    accepted_weights: list[float] = []
    accepted_logits: list[float] = []
    rejected_ids: list[str] = []

    for idx, prop in enumerate(agent_proposals):
        aid = str(prop.get("agent_id") or f"agent_{idx}")
        topo = str(prop.get("topology") or "direct").strip().lower()
        verified = bool(prop.get("symbolically_verified", False))
        if not verified:
            rejected_ids.append(aid)
            continue
        p = _clamp(float(prop.get("prob", 0.5)), 1e-4, 1.0 - 1e-4)
        base_w = max(0.0, float(prop.get("weight", 1.0)))
        novelty_mult = 1.25 if topo not in seen_topologies else 1.0
        seen_topologies.add(topo)
        accepted_weights.append(base_w * novelty_mult)
        accepted_logits.append(math.log(p / (1.0 - p)))

    if not accepted_weights or sum(accepted_weights) <= 1e-12:
        consensus_prob = 0.5
        all_rejected = True
    else:
        w_tot = sum(accepted_weights)
        z_bar = sum(w * z for w, z in zip(accepted_weights, accepted_logits, strict=True)) / w_tot
        consensus_prob = _sigmoid(z_bar)
        all_rejected = False

    compiled_rules: list[dict[str, Any]] = []
    pruned_count = 0
    for rule in trace_rules:
        pr = float(rule.get("pass_rate", 0.0))
        if pr >= float(min_pass_rate):
            compiled_rules.append(dict(rule))
        else:
            pruned_count += 1

    return {
        "verified_consensus_prob": round(consensus_prob, 6),
        "accepted_count": len(accepted_weights),
        "rejected_count": len(rejected_ids),
        "rejected_agent_ids": rejected_ids,
        "all_rejected": all_rejected,
        "represented_topologies": sorted(seen_topologies),
        "compiled_solver_rules": compiled_rules,
        "compiled_rule_count": len(compiled_rules),
        "pruned_rule_count": pruned_count,
        "zero_runtime_llm_tokens": True,
    }


def verify_leancat_functor_compositionality(
    objects: Sequence[str],
    morphisms: Mapping[str, tuple[str, str]],
    composition_table: Mapping[tuple[str, str], str],
    functor_obj_map: Mapping[str, str],
    functor_morph_map: Mapping[str, str],
    target_identities: Mapping[str, str],
    target_composition_table: Mapping[tuple[str, str], str],
) -> dict[str, Any]:
    """LeanCat functor verification checking F(id_X)=id_F(X) and F(g o f)=F(g) o F(f)."""
    id_violations: list[str] = []
    comp_violations: list[str] = []

    for obj in objects:
        preferred = f"id_{obj}"
        candidates = [
            m for m, (dom, cod) in morphisms.items() if dom == obj and cod == obj
        ]
        chosen_id: str | None = preferred if preferred in candidates else None
        if chosen_id is None:
            for cand in candidates:
                left_ok = all(
                    composition_table.get((g, cand)) == g
                    for (g, f), _h in composition_table.items()
                    if f == cand or morphisms.get(g, ("", ""))[0] == obj
                    if (g, cand) in composition_table
                )
                right_ok = all(
                    composition_table.get((cand, f)) == f
                    for (g, f), _h in composition_table.items()
                    if g == cand or morphisms.get(f, ("", ""))[1] == obj
                    if (cand, f) in composition_table
                )
                if left_ok and right_ok:
                    chosen_id = cand
                    break
        if chosen_id is None:
            id_violations.append(f"missing_source_identity:{obj}")
            continue
        mapped_id = functor_morph_map.get(chosen_id)
        mapped_obj = functor_obj_map.get(obj, "")
        expected_target_id = target_identities.get(mapped_obj)
        if mapped_id is None or expected_target_id is None or mapped_id != expected_target_id:
            id_violations.append(f"identity_mismatch:{obj}:{mapped_id}!={expected_target_id}")

    for (g, f), h in composition_table.items():
        fg = functor_morph_map.get(g)
        ff = functor_morph_map.get(f)
        fh = functor_morph_map.get(h)
        if fg is None or ff is None or fh is None:
            comp_violations.append(f"unmapped_morphism:{g},{f}->{h}")
            continue
        composed = target_composition_table.get((fg, ff))
        if composed != fh:
            comp_violations.append(f"comp_mismatch:({fg}o{ff})={composed}!={fh}")

    return {
        "functor_valid": (len(id_violations) == 0 and len(comp_violations) == 0),
        "identity_violations": id_violations,
        "composition_violations": comp_violations,
        "identities_checked": len(objects),
        "compositions_checked": len(composition_table),
    }


def enforce_protomed_k_anonymity_l_diversity_and_sat_conflict_gate(
    equivalence_classes: Sequence[Mapping[str, Any]],
    guideline_rules: Sequence[Mapping[str, Any]],
    *,
    k_min: int = 3,
    l_min: int = 2,
) -> dict[str, Any]:
    """ProtoMedAgent privacy + SAT comorbidity conflict gate (always RUO 0.0 sports weight)."""
    if not equivalence_classes:
        k_ok = False
        l_ok = False
        min_k = 0
        min_l = 0
    else:
        sizes = [int(ec.get("records_count", 0)) for ec in equivalence_classes]
        divs = [
            len({str(v) for v in (ec.get("sensitive_values") or ())})
            for ec in equivalence_classes
        ]
        min_k = min(sizes)
        min_l = min(divs)
        k_ok = min_k >= int(k_min)
        l_ok = min_l >= int(l_min)

    conflicts: list[dict[str, Any]] = []
    n_rules = len(guideline_rules)
    for i in range(n_rules):
        ra = guideline_rules[i]
        act_a = str(ra.get("target_action") or "").strip().lower()
        pol_a = int(ra.get("polarity", 0))
        cond_a = {str(c) for c in (ra.get("conditions") or ())}
        neg_a = {str(c) for c in (ra.get("negated_conditions") or ())}
        for j in range(i + 1, n_rules):
            rb = guideline_rules[j]
            act_b = str(rb.get("target_action") or "").strip().lower()
            pol_b = int(rb.get("polarity", 0))
            if not act_a or act_a != act_b or (pol_a * pol_b) >= 0:
                continue
            cond_b = {str(c) for c in (rb.get("conditions") or ())}
            neg_b = {str(c) for c in (rb.get("negated_conditions") or ())}
            if (cond_a & neg_b) or (cond_b & neg_a):
                continue
            conflicts.append(
                {
                    "rule_a": str(ra.get("rule_id") or f"r_{i}"),
                    "rule_b": str(rb.get("rule_id") or f"r_{j}"),
                    "target_action": act_a,
                    "joint_comorbidity_assignment": sorted(cond_a | cond_b),
                }
            )

    return {
        "k_anonymity_satisfied": k_ok,
        "l_diversity_satisfied": l_ok,
        "min_class_size": min_k,
        "min_distinct_sensitive": min_l,
        "privacy_gate_passed": k_ok and l_ok,
        "sat_conflict_count": len(conflicts),
        "local_comorbidity_conflicts": conflicts,
        "clinical_ruo_sports_weight": 0.0,
        "sports_promotion_allowed": False,
    }


def evaluate_wave29_neuro_symbolic_corpus_bridge(
    *,
    away_clean_epa: float,
    home_clean_epa: float,
    effective_wind_mph: float,
    injury_report_age_hours: float = 2.5,
    is_short_week: bool = False,
) -> dict[str, Any]:
    """Execute all 8 Wave 29 neuro-symbolic kernels safely with Stage-2 weight = 0.0."""
    cache_key = (
        round(float(away_clean_epa), 6),
        round(float(home_clean_epa), 6),
        round(float(effective_wind_mph), 4),
        round(float(injury_report_age_hours), 4),
        bool(is_short_week),
    )
    if cache_key in _WAVE29_BRIDGE_CACHE:
        return dict(_WAVE29_BRIDGE_CACHE[cache_key])

    chronofy = compute_chronofy_temporal_logical_decay(
        [
            {
                "fact_id": "qb_injury_status",
                "reliability": 0.96,
                "kappa": 0.04,
                "age_hours": float(injury_report_age_hours),
                "max_valid_age_hours": 12.0,
            },
            {
                "fact_id": "stadium_wind_obs",
                "reliability": 0.92,
                "kappa": 0.06,
                "age_hours": 1.0,
                "max_valid_age_hours": 6.0,
            },
        ]
    )
    hm_epa = float(home_clean_epa)
    aw_epa = float(away_clean_epa)
    epa_edge = round(hm_epa - aw_epa, 8)
    venra = verify_venra_double_lock_fact_ledger(
        ledger={("HOME", "clean_epa", "W1_10"): hm_epa, ("AWAY", "clean_epa", "W1_10"): aw_epa},
        required_bindings=[("HOME", "clean_epa", "W1_10"), ("AWAY", "clean_epa", "W1_10")],
        formula_op="diff",
        claimed_value=epa_edge,
        tol=1e-6,
        schema_bounds=(-0.50, 0.50),
    )
    bipolar = propagate_bipolar_gradual_argumentation(
        base_scores={
            "epa_advantage": _clamp(0.5 + epa_edge, 0.05, 0.95),
            "wind_drag": 0.62,
            "home_control": 0.50,
        },
        support_edges=[("epa_advantage", "home_control", 0.55)],
        attack_edges=[
            (
                "wind_drag",
                "home_control",
                0.25 if float(effective_wind_mph) >= 12.0 else 0.05,
            )
        ],
        target_node="home_control",
    )
    gaps = detect_nesy_rag_symbolic_knowledge_gaps(
        clauses=[
            {"requires": {"weather_checked": True, "qb_active": True}, "conclusion": True},
        ],
        known_facts={"weather_checked": True},
        candidate_unknowns=["qb_active"],
    )
    symrag = route_symrag_adaptive_query_pathway(
        hop_count=3 if is_short_week else 2,
        has_symbolic_aggregation=True,
        constraint_count=3,
        system_load=0.32,
        wfa_raw_transitions=[[0.75, 0.25], [0.30, 0.70]],
    )
    potre = aggregate_potre_heterogeneous_ensemble_and_compile_solver(
        agent_proposals=[
            {
                "agent_id": "adv_1",
                "topology": "adversarial",
                "prob": _clamp(0.50 + 0.5 * epa_edge, 0.05, 0.95),
                "symbolically_verified": True,
            },
            {
                "agent_id": "hier_1",
                "topology": "hierarchical",
                "prob": _clamp(0.52 + 0.4 * epa_edge, 0.05, 0.95),
                "symbolically_verified": True,
            },
        ],
        trace_rules=[{"rule_id": "r_trench", "pass_rate": 0.92, "token_savings_pct": 78.0}],
    )
    leancat = verify_leancat_functor_compositionality(
        objects=["Stage1", "Stage2"],
        morphisms={
            "id_Stage1": ("Stage1", "Stage1"),
            "id_Stage2": ("Stage2", "Stage2"),
            "m12": ("Stage1", "Stage2"),
        },
        composition_table={("m12", "id_Stage1"): "m12", ("id_Stage2", "m12"): "m12"},
        functor_obj_map={"Stage1": "T1", "Stage2": "T2"},
        functor_morph_map={"id_Stage1": "id_T1", "id_Stage2": "id_T2", "m12": "t12"},
        target_identities={"T1": "id_T1", "T2": "id_T2"},
        target_composition_table={("t12", "id_T1"): "t12", ("id_T2", "t12"): "t12"},
    )
    clinical = enforce_protomed_k_anonymity_l_diversity_and_sat_conflict_gate(
        equivalence_classes=[
            {"class_id": "c0", "records_count": 4, "sensitive_values": ["a", "b"]}
        ],
        guideline_rules=[
            {
                "rule_id": "g1",
                "conditions": ["c_a"],
                "target_action": "protocol_x",
                "polarity": 1,
            },
            {
                "rule_id": "g2",
                "conditions": ["c_b"],
                "target_action": "protocol_x",
                "polarity": -1,
            },
        ],
    )

    scalars = [
        float(chronofy["weakest_link_validity"]),
        float(chronofy["stl_min_robustness"]),
        float(venra["exact_value"] or 0.0),
        float(bipolar["target_score"]),
        float(symrag["complexity_score"]),
        float(potre["verified_consensus_prob"]),
        float(leancat["compositions_checked"]),
        float(clinical["clinical_ruo_sports_weight"]),
    ]
    result = {
        "wave29_wired": True,
        "arxiv_entries_count": len(WAVE29_ARXIV_ENTRIES),
        "oss_registry_target_entries": 265,
        "scalars_verified_count": len(scalars),
        "all_scalars_finite": all(math.isfinite(x) for x in scalars),
        "live_stage2_weight": 0.0,
        "clinical_ruo_sports_weight": float(clinical["clinical_ruo_sports_weight"]),
        "chronofy": chronofy,
        "venra": venra,
        "bipolar_argumentation": bipolar,
        "nesy_rag_gaps": gaps,
        "symrag_routing": symrag,
        "potre_reacomp": potre,
        "leancat": leancat,
        "protomed_ruo": clinical,
    }
    _WAVE29_BRIDGE_CACHE[cache_key] = dict(result)
    return result
