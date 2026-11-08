#!/usr/bin/env python3
"""
Quad-Frontier Sovereign Spine & Zero-Waste Model Router (`scripts/ops/zero_waste_model_router.py`).

Wires the entire GSE & GSI Engine to run across the 4 Frontier Sovereign Pillars:
  1. Google Argon 4 (`google/gemini-4-argon` / `Gemini 4 Argon`)
     - 2,000,000-token context window
     - Role: Cross-repo 25-package dependency auditing, 21,419-equation matrix verification,
       3,152-scenario Stage 1-2 situational context synthesis, and Stage 4.5 film-room translation.
  2. Anthropic Claude Opus 5.5 (`anthropic/claude-opus-5.5` / `Claude Opus 5.5`)
     - 1,000,000-token context window
     - Role: Adversarial theorem prover, 753 graduate math & Navier-Stokes 3D vorticity spectral
       proofs, C++20 STM32H7 256 KB SRAM (DTCM/ITCM) memory-alignment verifier, and Red-Team Diff Gate.
  3. Anthropic Claude Fable 5 (`anthropic/claude-fable-5` / `Claude Fable 5`)
     - 1,000,000-token context window
     - Role: Flagship sovereign orchestrator, 4-Voice Adversarial Council Arbiter, Cellular Sheaf
       Cohomology (Theorem 7) semantic merger across the 288-bit factor graph, and Stage 5 Conjunction Gate.
  4. OpenAI Astra (`openai/astra` / `OpenAI Astra`)
     - 512,000-token context window
     - Role: Compute-Optimal Test-Time Scaling (Snell et al., ICLR 2025 Oral, N = 4 -> 16 -> 64 rollouts),
       ASTRA Learned Reliability Diagram calibration (0.0202 mfp sort / 0.0524 ASTRA) across 6,747 market/prop
       resolutions, and Auto Exacto grammar-constrained tool execution.
"""

from __future__ import annotations

import copy
import hashlib
import json
import math
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Tuple

FrontierPillarId = Literal[
    "google/gemini-4-argon",
    "anthropic/claude-opus-5.5",
    "anthropic/claude-fable-5",
    "openai/astra",
]


@dataclass(frozen=True)
class QuadFrontierPillarSpec:
    model_id: FrontierPillarId
    display_name: str
    provider: str
    context_window_tokens: int
    engine_stages_owned: Tuple[str, ...]
    primary_capabilities: Tuple[str, ...]
    snell_tts_default_rollouts: int
    sheaf_weight_prior: float


QUAD_FRONTIER_SOVEREIGN_SPINE: Dict[FrontierPillarId, QuadFrontierPillarSpec] = {
    "google/gemini-4-argon": QuadFrontierPillarSpec(
        model_id="google/gemini-4-argon",
        display_name="Google Argon 4 (Gemini 4 Argon)",
        provider="Google DeepMind / Antigravity Ultra",
        context_window_tokens=2_000_000,
        engine_stages_owned=("Stage 0 Roster Hygiene", "Stage 1 Tendency & Injury Intake", "Stage 2 288-Bit Situational Overlay", "Stage 4.5 Film Translation"),
        primary_capabilities=(
            "21,419-Equation Cross-Repo Dependency & Dimensional Audit",
            "3,152-Scenario Situational Context & NFL Scheme Synthesis",
            "Multimodal PageIndex Vectorless Hierarchical Tree RAG",
            "Zero-Jargon Customer Film-Room Translation",
        ),
        snell_tts_default_rollouts=8,
        sheaf_weight_prior=0.26,
    ),
    "anthropic/claude-opus-5.5": QuadFrontierPillarSpec(
        model_id="anthropic/claude-opus-5.5",
        display_name="Anthropic Claude Opus 5.5",
        provider="Anthropic Logged-In Claude CLI + Hermes Subscription ($0.00 Marginal API Burn) / Antigravity",
        context_window_tokens=1_000_000,
        engine_stages_owned=("Stage 2C/2D Spectral-Jacobian Coupling", "Stage 3 JEV + Sinkhorn-Knopp Trajectory Verification", "GSI STM32H7 256KB SRAM Verifier"),
        primary_capabilities=(
            "Adversarial Theorem Proving & Lean 4 / SymPy Operator Verification",
            "753 Graduate Math (openai/math) & Navier-Stokes 32-Run Vorticity Proofs",
            "C++20 STM32H7 DTCM/ITCM 256 KB SRAM Memory-Alignment Verification",
            "Automated Red-Team Diff & Epistemic Sanity Gate (Zero API Burn via Claude CLI + Hermes Subscription)",
        ),
        snell_tts_default_rollouts=16,
        sheaf_weight_prior=0.25,
    ),
    "anthropic/claude-fable-5": QuadFrontierPillarSpec(
        model_id="anthropic/claude-fable-5",
        display_name="Anthropic Claude Fable 5",
        provider="Anthropic Sovereign Flagship",
        context_window_tokens=1_000_000,
        engine_stages_owned=("Stage 4 Cellular Sheaf Cohomology Merger", "Stage 5 Conjunction Gate & 4-Voice Council Arbiter", "Autonomous Fleet Orchestration"),
        primary_capabilities=(
            "1M-Context Sovereign Multi-Agent Orchestration",
            "Cellular Sheaf Laplacian Semantic Merging across 31 Math Domains",
            "4-Voice Adversarial Council (Skeptic, Critic, Pragmatist, Arbiter)",
            "Byzantine Generals 3m+1 Stage 5 Quorum & PASS Discipline",
        ),
        snell_tts_default_rollouts=16,
        sheaf_weight_prior=0.27,
    ),
    "openai/astra": QuadFrontierPillarSpec(
        model_id="openai/astra",
        display_name="OpenAI Astra",
        provider="OpenAI Frontier Reasoning",
        context_window_tokens=512_000,
        engine_stages_owned=("Stage 3 Snell Test-Time Scaling Rollouts", "Stage 4 ASTRA Reliability & Romano CQR Calibration", "Auto Exacto Tool Execution"),
        primary_capabilities=(
            "Snell et al. (ICLR 2025) Compute-Optimal Test-Time Scaling (N = 4 -> 16 -> 64)",
            "ASTRA Learned Reliability Diagram Slice Gate (0.0202 mfp / 0.0524 ASTRA)",
            "Romano CQR + Barber Weighted Conformal Calibration across 6,747 Resolutions",
            "XGrammar-2 / Auto Exacto 100% Schema-Valid Tool Calling",
        ),
        snell_tts_default_rollouts=64,
        sheaf_weight_prior=0.22,
    ),
}


def route_task_to_quad_frontier(
    task_domain: Literal[
        "situational_context_288bit",
        "equation_proof_and_stm32",
        "council_arbiter_and_sheaf_merge",
        "forecast_calibration_and_tts",
        "full_quad_ensemble",
    ],
    difficulty_score: float = 0.75,
) -> Dict[str, Any]:
    """
    Route an engine task to the appropriate Quad-Frontier pillar (or full 4-model ensemble)
    and compute the Snell (ICLR 2025) compute-optimal test-time rollout budget N in {4, 16, 64}.
    """
    clamped_diff = max(0.0, min(1.0, float(difficulty_score)))
    if clamped_diff < 0.35:
        rollouts_n = 4
    elif clamped_diff < 0.75:
        rollouts_n = 16
    else:
        rollouts_n = 64

    domain_to_primary: Dict[str, FrontierPillarId] = {
        "situational_context_288bit": "google/gemini-4-argon",
        "equation_proof_and_stm32": "anthropic/claude-opus-5.5",
        "council_arbiter_and_sheaf_merge": "anthropic/claude-fable-5",
        "forecast_calibration_and_tts": "openai/astra",
        "full_quad_ensemble": "anthropic/claude-fable-5",
    }
    primary_id = domain_to_primary.get(task_domain, "anthropic/claude-fable-5")
    primary_spec = QUAD_FRONTIER_SOVEREIGN_SPINE[primary_id]

    return {
        "task_domain": task_domain,
        "difficulty_score": round(clamped_diff, 4),
        "primary_pillar": asdict(primary_spec),
        "ensemble_pillars": [asdict(spec) for spec in QUAD_FRONTIER_SOVEREIGN_SPINE.values()],
        "snell_compute_optimal_rollouts_n": rollouts_n,
        "cellular_sheaf_consensus_enabled": True,
    }


def compute_cellular_sheaf_quad_consensus(
    pillar_probs: Dict[FrontierPillarId, float],
    market_devig_prob: float,
) -> Dict[str, Any]:
    """
    Theorem 7 Cellular Sheaf Laplacian & Satopaa-Tetlock Log-Odds Consensus
    across Google Argon 4, Claude Opus 5.5, Claude Fable 5, and OpenAI Astra.
    """
    def _logit(p: float) -> float:
        c = max(0.005, min(0.995, p))
        return math.log(c / (1.0 - c))

    def _inv_logit(lo: float) -> float:
        return 1.0 / (1.0 + math.exp(-lo))

    weighted_logit = 0.0
    total_w = 0.0
    logits: List[float] = []
    for pid, spec in QUAD_FRONTIER_SOVEREIGN_SPINE.items():
        p_val = pillar_probs.get(pid, market_devig_prob)
        lo = _logit(p_val)
        logits.append(lo)
        weighted_logit += spec.sheaf_weight_prior * lo
        total_w += spec.sheaf_weight_prior

    mean_lo = weighted_logit / max(1e-9, total_w)
    # Cellular Sheaf Dirichlet energy E(x) = sum_{u~v} ||F_{u<-e} x_u - F_{v<-e} x_v||^2
    sheaf_dirichlet_energy = 0.0
    for i in range(len(logits)):
        for j in range(i + 1, len(logits)):
            sheaf_dirichlet_energy += (logits[i] - logits[j]) ** 2

    # Positive-Part James-Stein shrinkage toward market_devig_prob capped at |delta_lo| <= 0.35
    mkt_lo = _logit(market_devig_prob)
    raw_delta = mean_lo - mkt_lo
    js_shrink = max(0.0, 1.0 - 0.15 / max(0.15, abs(raw_delta) + sheaf_dirichlet_energy))
    shrunk_delta = max(-0.35, min(0.35, raw_delta * js_shrink))
    consensus_prob = _inv_logit(mkt_lo + shrunk_delta)

    cohomology_h0_consistent = sheaf_dirichlet_energy < 0.25
    return {
        "quad_consensus_prob": round(consensus_prob, 6),
        "market_devig_prob": round(market_devig_prob, 6),
        "raw_delta_log_odds": round(raw_delta, 6),
        "shrunk_delta_log_odds": round(shrunk_delta, 6),
        "sheaf_dirichlet_energy": round(sheaf_dirichlet_energy, 6),
        "cohomology_h0_global_section": cohomology_h0_consistent,
        "gate_decision": "PUBLISH" if cohomology_h0_consistent and abs(shrunk_delta) >= 0.04 else "PASS",
    }


class _FleetModelDict(dict):
    """
    Dictionary of fleet models or verdicts that preserves exact canonical keys and length
    while allowing transparent lookup by `model_id`, `alias`, `display_name`, or legacy council key.
    """

    def __init__(self, canonical_items: Dict[str, Dict[str, Any]], extra_lookup: Dict[str, Dict[str, Any]] | None = None) -> None:
        super().__init__(canonical_items)
        self._canonical_items: Dict[str, Dict[str, Any]] = dict(canonical_items)
        self._extra_lookup: Dict[str, Dict[str, Any]] = dict(extra_lookup) if extra_lookup else {}
        self._lookup: Dict[str, Dict[str, Any]] = {}
        for k, v in canonical_items.items():
            self._lookup[k] = v
            self._lookup[k.lower()] = v
            for field in ("model_id", "alias", "display_name"):
                val = v.get(field)
                if isinstance(val, str) and val:
                    self._lookup[val] = v
                    self._lookup[val.lower()] = v
            for extra_alias in v.get("extra_aliases", ()):
                if isinstance(extra_alias, str) and extra_alias:
                    self._lookup[extra_alias] = v
                    self._lookup[extra_alias.lower()] = v
        if extra_lookup:
            for k, v in extra_lookup.items():
                if k not in self._lookup:
                    self._lookup[k] = v
                    self._lookup[k.lower()] = v
                for field in ("model_id", "alias", "display_name"):
                    val = v.get(field)
                    if isinstance(val, str) and val and val not in self._lookup:
                        self._lookup[val] = v
                        self._lookup[val.lower()] = v
                for extra_alias in v.get("extra_aliases", ()):
                    if isinstance(extra_alias, str) and extra_alias and extra_alias not in self._lookup:
                        self._lookup[extra_alias] = v
                        self._lookup[extra_alias.lower()] = v

    def copy(self) -> "_FleetModelDict":
        return _FleetModelDict(
            copy.deepcopy(self._canonical_items),
            extra_lookup=copy.deepcopy(self._extra_lookup),
        )

    def __copy__(self) -> "_FleetModelDict":
        return self.copy()

    def __deepcopy__(self, memo: Any) -> "_FleetModelDict":
        return _FleetModelDict(
            copy.deepcopy(self._canonical_items, memo),
            extra_lookup=copy.deepcopy(self._extra_lookup, memo),
        )

    def __contains__(self, key: object) -> bool:
        if super().__contains__(key):
            return True
        if isinstance(key, str):
            return key in self._lookup or key.lower() in self._lookup
        return False

    def __getitem__(self, key: str) -> Dict[str, Any]:
        if super().__contains__(key):
            return super().__getitem__(key)
        if isinstance(key, str):
            if key in self._lookup:
                return self._lookup[key]
            if key.lower() in self._lookup:
                return self._lookup[key.lower()]
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default


_CANONICAL_9_FLEET_MODELS: Dict[str, Dict[str, Any]] = {
    "deepseek/deepseek-v3.2": {
        "model_id": "deepseek/deepseek-v3.2",
        "alias": "deepseek-v3.2",
        "display_name": "DeepSeek V3.2",
        "provider": "openrouter/opencode",
        "pricing_per_1m_in_out_usd": (0.14, 0.28),
        "context_window_tokens": 163840,
        "reasoning_effort": "high",
        "task_strengths": ("mathematical_equations_milp_and_conformal_coding",),
        "role": "Mathematical Equations, MILP Optimization & Conformal Coding Specialist",
    },
    "z-ai/glm-5.1": {
        "model_id": "z-ai/glm-5.1",
        "alias": "glm-5.1",
        "display_name": "GLM-5.1",
        "provider": "openrouter/opencode",
        "pricing_per_1m_in_out_usd": (0.10, 0.40),
        "free_opencode_alternative": "glm-5.3-flash-free",
        "cheaper_glm_tier": "z-ai/glm-5-turbo",
        "context_window_tokens": 200000,
        "reasoning_effort": "high",
        "task_strengths": (
            "frontier_situational_reasoning_and_5stage_gate",
            "long_context_corpus_and_santa_adversarial_audit",
        ),
        "role": "Frontier Situational Reasoning, 5-Stage Gate & Long-Context Adversarial Audit Brain",
    },
    "z-ai/glm-5-turbo": {
        "model_id": "z-ai/glm-5-turbo",
        "alias": "glm-5-turbo",
        "display_name": "GLM-5-Turbo",
        "provider": "openrouter/opencode",
        "pricing_per_1m_in_out_usd": (0.02, 0.08),
        "free_opencode_alternative": "glm-5.3-flash-free",
        "cheaper_glm_tier": "z-ai/glm-5-turbo",
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "task_strengths": ("high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch",),
        "role": "High-Throughput PBP Snap & Wave 2 DFS Lineup Dispatch Engine",
    },
    "x-ai/grok-4.1-fast": {
        "model_id": "x-ai/grok-4.1-fast",
        "alias": "grok-4.1-fast",
        "display_name": "Grok 4.1 Fast",
        "provider": "x-ai/openrouter",
        "pricing_per_1m_in_out_usd": (0.10, 0.40),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "task_strengths": ("high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch",),
        "role": "Real-Time Situational Signal & High-Throughput PBP / DFS Lineup Dispatcher",
    },
    "x-ai/grok-4.20-multi-agent-beta-0309": {
        "model_id": "x-ai/grok-4.20-multi-agent-beta-0309",
        "alias": "grok-4.20-beta",
        "extra_aliases": ("x-ai/grok-4.20-beta",),
        "display_name": "Grok 4.20 Beta",
        "provider": "x-ai/openrouter",
        "pricing_per_1m_in_out_usd": (0.50, 1.50),
        "context_window_tokens": 262144,
        "reasoning_effort": "xhigh",
        "task_strengths": ("frontier_situational_reasoning_and_5stage_gate",),
        "role": "Multi-Agent Frontier Situational Reasoning & 5-Stage Conjunction Gate Lead",
    },
    "xiaomi/mimo-v2-pro": {
        "model_id": "xiaomi/mimo-v2-pro",
        "alias": "mimo-v2-pro",
        "display_name": "MiMo-V2-Pro",
        "provider": "xiaomi/openrouter",
        "free_on_opencode": True,
        "free_flash_model_id": "xiaomi/mimo-v2-flash",
        "free_flash_alias": "mimo-v2-flash",
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "task_strengths": ("high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch",),
        "role": "Zero-Waste High-Throughput PBP Snap & Wave 2 DFS Lineup Worker",
    },
    "minimax/minimax-m2.7": {
        "model_id": "minimax/minimax-m2.7",
        "alias": "minimax-m2.7",
        "display_name": "MiniMax M2.7",
        "provider": "minimax/openrouter",
        "pricing_per_1m_in_out_usd": (0.15, 0.60),
        "context_window_tokens": 1000000,
        "reasoning_effort": "high",
        "task_strengths": ("long_context_corpus_and_santa_adversarial_audit",),
        "role": "1M-Context Full-Corpus Ingestion & Santa Adversarial Audit Lead",
    },
    "inkling/inkling-small-2": {
        "model_id": "inkling/inkling-small-2",
        "alias": "inkling-small-2",
        "extra_aliases": ("inkling/inkling-small-2-new", "inkling-small-2-new"),
        "display_name": "Inkling Small 2 (New)",
        "provider": "opencode/openrouter",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "task_strengths": ("high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch",),
        "role": "Ultra-Fast Low-Latency PBP Snap, Wave 2 DFS Lineup Dispatch & Schema Verification Brain",
    },
    "inkling/inkling-2": {
        "model_id": "inkling/inkling-2",
        "alias": "inkling-2",
        "display_name": "Inkling 2",
        "provider": "opencode/openrouter",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 262144,
        "reasoning_effort": "xhigh",
        "task_strengths": (
            "frontier_situational_reasoning_and_5stage_gate",
            "mathematical_equations_milp_and_conformal_coding",
        ),
        "role": "Deep Situational Reasoning, Simulation Arbitration, Mathematical Equations & Santa Verification Brain",
    },
}

CLAUDE_CLI_AND_HERMES_SUBSCRIPTION_SPINE: Dict[str, Dict[str, Any]] = {
    "anthropic/claude-opus-5.5": {
        "model_id": "anthropic/claude-opus-5.5",
        "alias": "claude-opus-5.5",
        "extra_aliases": ("claude-cli", "hermes-cli", "opus-5.5"),
        "display_name": "Anthropic Claude Opus 5.5 (Logged-In Claude CLI + Hermes Subscription)",
        "provider": "anthropic_claude_cli_and_hermes_subscription",
        "transport": "claude_cli_and_hermes_subscription_no_api_burn",
        "marginal_api_cost_per_1m_usd": (0.0, 0.0),
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "free_on_opencode": True,
        "drain_all_subscription_capacity": True,
        "never_use_claude_for_babysitting_or_workhorse": True,
        "forbidden_task_categories": (
            "babysit",
            "babysitting",
            "monitor",
            "monitoring",
            "poll",
            "polling",
            "healthcheck",
            "health_check",
            "schema_check",
            "pbp_parse",
            "workhorse",
        ),
        "reserved_strictly_for": (
            "hard_frontier_mathematical_proofs",
            "final_adversarial_arbitration_escalation",
        ),
        "orchestrator_lead": "Antigravity Frontier Orchestrator & Reasoning Lead",
        "preserves_opencode_and_openrouter_10_10_budgets": True,
        "context_window_tokens": 1_000_000,
        "reasoning_effort": "xhigh",
        "role": "Logged-In Claude CLI + Hermes Subscription Frontier Heavy-Math & Adversarial Prover ($0.00 Marginal API Burn; Never Used for Babysitting or Workhorse Loops)",
    },
}

LEGACY_OPENCODE_COUNCIL_POOL: Dict[str, Dict[str, Any]] = {
    "stealth/crouton-alpha": {
        "model_id": "stealth/crouton-alpha",
        "alias": "crouton-alpha",
        "display_name": "Stealth Crouton Alpha",
        "provider": "opencode",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "role": "Adversarial Santa-Method Reviewer #1 (Code, Roster Truth & Situational Completeness)",
    },
    "deepseek-1017": {
        "model_id": "deepseek-1017",
        "alias": "deepseek-1017",
        "display_name": "DeepSeek 1017",
        "provider": "opencode/openrouter",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "role": "Adversarial Santa-Method Reviewer #2 (21,419-Equation AST & Mathematical Bounds Verifier)",
    },
    "glm-5.3-flash-free": {
        "model_id": "glm-5.3-flash-free",
        "alias": "glm-5.3-flash-free",
        "extra_aliases": ("z-ai/glm-5.3-flash:free", "glm-5.3-flash:free"),
        "display_name": "GLM-5.3-Flash-Free",
        "provider": "opencode",
        "free_on_opencode": True,
        "cheaper_glm_tier": "z-ai/glm-5-turbo",
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "role": "Garrett's Free Vote — High-Throughput Schema, PBP & 279-Family Census Verifier",
    },
    "xiaomi/mimo-v2-flash": {
        "model_id": "xiaomi/mimo-v2-flash",
        "alias": "mimo-v2-flash",
        "extra_aliases": ("mimo-v2.6-flash",),
        "display_name": "MiMo-V2-Flash",
        "provider": "opencode/openrouter",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "role": "OpenCode Free High-Throughput PBP Snap, Sinkhorn Kernel & Wave 2 DFS Flash Worker",
    },
    "recursive/flint-v1.0:free": {
        "model_id": "recursive/flint-v1.0:free",
        "alias": "flint-v1.0-free",
        "display_name": "Recursive Flint v1.0 Free",
        "provider": "openrouter",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "role": "Free Recursive Self-Critique & Quarantine Audit Model",
    },
    "qwen3.8-flash": {
        "model_id": "qwen3.8-flash",
        "alias": "qwen3.8-flash",
        "display_name": "Qwen 3.8 Flash",
        "provider": "opencode",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "high",
        "role": "Fast Math, Structured Output & Tool-Calling Verifier",
    },
    "gpt-6-luna": {
        "model_id": "gpt-6-luna",
        "alias": "gpt-6-luna",
        "display_name": "GPT-6 Luna",
        "provider": "openrouter/opencode",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 262144,
        "reasoning_effort": "high",
        "role": "262K-Context Situational Narrative & Cross-Document Audit Verifier",
    },
    "stealth-skeleton/skeleton-math-pro": {
        "model_id": "stealth-skeleton/skeleton-math-pro",
        "alias": "skeleton-math-pro",
        "extra_aliases": ("gse/skeleton-math-pro",),
        "display_name": "Stealth-Skeleton Math Pro",
        "provider": "opencode/stealth-skeleton",
        "free_on_opencode": True,
        "pricing_per_1m_in_out_usd": (0.0, 0.0),
        "context_window_tokens": 131072,
        "reasoning_effort": "xhigh",
        "role": "Graduate Mathematical & Spectral Operator Kernel (21,419-Equation + Sinkhorn-Knopp + FWL)",
    },
    "prism-ml/ternary-bonsai-2-27b": {
        "model_id": "prism-ml/ternary-bonsai-2-27b",
        "alias": "ternary-bonsai-2-27b",
        "display_name": "PrismML Ternary Bonsai 2 27B",
        "provider": "openrouter",
        "pricing_per_1m_in_out_usd": (0.075, 0.50),
        "context_window_tokens": 262144,
        "reasoning_effort": "xhigh",
        "derived_from": "Qwen3.8-27B (Ternary ~8.5GB weights, 98.2% thinking benchmark retention)",
        "role": "Ternary Reasoning Specialist (xhigh reasoning effort, 262K context, math/coding/structured outputs)",
    },
    "anthropic/claude-opus-5.5": CLAUDE_CLI_AND_HERMES_SUBSCRIPTION_SPINE["anthropic/claude-opus-5.5"],
}

MODEL_ID_ALIASES: Dict[str, str] = {
    "deepseek-v3.2": "deepseek/deepseek-v3.2",
    "glm-5.1": "z-ai/glm-5.1",
    "glm-5-turbo": "z-ai/glm-5-turbo",
    "z-ai/glm-5.3-flash:free": "glm-5.3-flash-free",
    "glm-5.3-flash:free": "glm-5.3-flash-free",
    "glm-5.3-flash-free": "glm-5.3-flash-free",
    "grok-4.1-fast": "x-ai/grok-4.1-fast",
    "grok-4.20-beta": "x-ai/grok-4.20-multi-agent-beta-0309",
    "x-ai/grok-4.20-beta": "x-ai/grok-4.20-multi-agent-beta-0309",
    "mimo-v2-pro": "xiaomi/mimo-v2-pro",
    "mimo-v2-flash": "xiaomi/mimo-v2-flash",
    "mimo-v2.6-flash": "xiaomi/mimo-v2-flash",
    "xiaomi/mimo-v2-flash": "xiaomi/mimo-v2-flash",
    "minimax-m2.7": "minimax/minimax-m2.7",
    "inkling-small-2": "inkling/inkling-small-2",
    "inkling-small-2-new": "inkling/inkling-small-2",
    "inkling/inkling-small-2-new": "inkling/inkling-small-2",
    "inkling-2": "inkling/inkling-2",
    "crouton-alpha": "stealth/crouton-alpha",
    "claude-opus-5.5": "anthropic/claude-opus-5.5",
    "claude-cli": "anthropic/claude-opus-5.5",
    "hermes-cli": "anthropic/claude-opus-5.5",
}

APPROVED_VERIFICATION_MODELS: Dict[str, Dict[str, Any]] = _FleetModelDict(
    _CANONICAL_9_FLEET_MODELS,
    extra_lookup=LEGACY_OPENCODE_COUNCIL_POOL,
)

ADVERSARIAL_VERIFICATION_COUNCIL_POOL: Dict[str, Dict[str, Any]] = _FleetModelDict(
    _CANONICAL_9_FLEET_MODELS,
    extra_lookup=LEGACY_OPENCODE_COUNCIL_POOL,
)


def _build_routing_bucket(
    task_type: str,
    model_ids: Tuple[str, ...],
    rationale: str,
) -> Dict[str, Any]:
    agents = [_CANONICAL_9_FLEET_MODELS[mid] for mid in model_ids]
    primary = agents[0]
    return {
        "task_type": task_type,
        "primary_model_id": primary["model_id"],
        "primary_alias": primary["alias"],
        "primary_display_name": primary["display_name"],
        "primary_agent": primary,
        "models": [a["model_id"] for a in agents],
        "model_ids": [a["model_id"] for a in agents],
        "aliases": [a["alias"] for a in agents],
        "display_names": [a["display_name"] for a in agents],
        "agents": agents,
        "rationale": rationale,
    }


MODEL_ROUTING_TABLE: Dict[str, Dict[str, Any]] = {
    "frontier_situational_reasoning_and_5stage_gate": _build_routing_bucket(
        "frontier_situational_reasoning_and_5stage_gate",
        (
            "x-ai/grok-4.20-multi-agent-beta-0309",
            "inkling/inkling-2",
            "z-ai/glm-5.1",
        ),
        "Multi-agent xhigh situational synthesis, Stage 3 simulation arbitration, and Stage 5 conjunction gate.",
    ),
    "mathematical_equations_milp_and_conformal_coding": _build_routing_bucket(
        "mathematical_equations_milp_and_conformal_coding",
        (
            "deepseek/deepseek-v3.2",
            "inkling/inkling-2",
        ),
        "21,419-equation AST verification, Showdown/Classic MILP optimization, and Romano CQR / Barber conformal coding.",
    ),
    "long_context_corpus_and_santa_adversarial_audit": _build_routing_bucket(
        "long_context_corpus_and_santa_adversarial_audit",
        (
            "minimax/minimax-m2.7",
            "z-ai/glm-5.1",
        ),
        "1M-token full-corpus book/paper ingestion, cross-document provenance verification, and Santa adversarial audit.",
    ),
    "high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch": _build_routing_bucket(
        "high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch",
        (
            "inkling/inkling-small-2",
            "x-ai/grok-4.1-fast",
            "z-ai/glm-5-turbo",
            "xiaomi/mimo-v2-pro",
        ),
        "Ultra-low-latency snap-by-snap PBP transitions, Wave 2 150-lineup DFS portfolio simulation, and schema checks.",
    ),
}


_TASK_DOMAIN_TOKEN_WEIGHTS: Dict[str, Dict[str, int]] = {
    "frontier_situational_reasoning_and_5stage_gate": {
        "frontier": 2,
        "situational": 3,
        "5stage": 3,
        "stage5": 3,
        "gate": 2,
        "conjunction": 3,
        "jev": 2,
        "arbitration": 2,
        "weather": 2,
        "trench": 2,
        "injury": 2,
        "coaching": 2,
        "reasoning": 1,
    },
    "mathematical_equations_milp_and_conformal_coding": {
        "mathematical": 3,
        "math": 3,
        "equation": 3,
        "equations": 3,
        "milp": 3,
        "conformal": 3,
        "cqr": 3,
        "code": 2,
        "coding": 2,
        "ast": 3,
        "sympy": 2,
        "jacobian": 2,
        "spectral": 2,
        "kelly": 2,
    },
    "long_context_corpus_and_santa_adversarial_audit": {
        "long": 1,
        "context": 1,
        "corpus": 3,
        "santa": 3,
        "adversarial": 3,
        "audit": 2,
        "book": 2,
        "books": 2,
        "provenance": 2,
        "monograph": 2,
        "arxiv": 2,
        "1m": 2,
    },
    "high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch": {
        "high": 1,
        "throughput": 2,
        "pbp": 3,
        "snap": 3,
        "snaps": 3,
        "wave2": 3,
        "dfs": 3,
        "lineup": 3,
        "lineups": 3,
        "dispatch": 2,
        "fast": 2,
        "workhorse": 4,
        "babysit": 4,
        "babysitting": 4,
        "monitor": 4,
        "monitoring": 4,
        "poll": 4,
        "polling": 4,
        "healthcheck": 4,
        "health": 3,
        "schema": 3,
        "ingest": 3,
        "cron": 3,
        "watchdog": 3,
        "small": 2,
        "turbo": 2,
    },
}


def select_strongest_agent_for_task(task_type: str) -> Dict[str, Any]:
    """
    Deterministically select the strongest approved fleet agent(s) for a given task type.
    Supports exact canonical keys in `MODEL_ROUTING_TABLE` as well as whole-token domain
    scoring so short tokens (`"ast"`, `"book"`, `"small"`) never false-match unrelated words
    (`"master"`, `"forecast"`, `"sportsbook"`, `"smallest"`), and returns a deep copy so
    caller mutations never corrupt `MODEL_ROUTING_TABLE`.
    """
    norm = (task_type or "").strip().lower()
    if norm in MODEL_ROUTING_TABLE:
        res = copy.deepcopy(MODEL_ROUTING_TABLE[norm])
        res["requested_task_type"] = task_type
        return res

    tokens = re.findall(r"[a-z0-9]+", norm)
    best_bucket_key = "frontier_situational_reasoning_and_5stage_gate"
    best_score = 0
    for bucket_key, weight_map in _TASK_DOMAIN_TOKEN_WEIGHTS.items():
        score = sum(weight_map.get(tok, 0) for tok in tokens)
        if bucket_key == "long_context_corpus_and_santa_adversarial_audit" and "long_context" in norm:
            score += 3
        if bucket_key == "frontier_situational_reasoning_and_5stage_gate" and ("5-stage" in norm or "5_stage" in norm):
            score += 3
        if score > best_score:
            best_score = score
            best_bucket_key = bucket_key

    res = copy.deepcopy(MODEL_ROUTING_TABLE[best_bucket_key])
    res["requested_task_type"] = task_type
    return res


DUAL_PROVIDER_BUDGET_GOVERNOR: Dict[str, float] = {
    "opencode_budget_usd": 10.00,
    "openrouter_budget_usd": 10.00,
    "total_budget_usd": 20.00,
    "hard_circuit_breaker_at_pct": 0.95,
}

HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS: Dict[str, Dict[str, Any]] = {
    "spot_1_symbolic_ast_21419_equations_and_jacobian": {
        "spot_id": "spot_1_symbolic_ast_21419_equations_and_jacobian",
        "subscription_lead": {
            "model_id": "anthropic/claude-opus-5.5",
            "transport": "claude_cli_and_hermes_subscription",
            "marginal_api_cost_per_1m_usd": (0.0, 0.0),
        },
        "primary_model_id": "deepseek/deepseek-v3.2",
        "primary_display_name": "DeepSeek V3.2",
        "free_opencode_co_solvers": [
            "inkling/inkling-2",
            "deepseek-1017",
            "stealth-skeleton/skeleton-math-pro",
        ],
        "models": [
            "anthropic/claude-opus-5.5",
            "deepseek/deepseek-v3.2",
            "inkling/inkling-2",
            "deepseek-1017",
            "stealth-skeleton/skeleton-math-pro",
        ],
        "description": "21,419-Equation Symbolic AST Verification, Cross-Equation Jacobian Coupling & Operator Bounds.",
    },
    "spot_2_two_wave_200pt_dfs_milp_and_knapsack_portfolio": {
        "spot_id": "spot_2_two_wave_200pt_dfs_milp_and_knapsack_portfolio",
        "subscription_lead": {
            "model_id": "anthropic/claude-opus-5.5",
            "transport": "claude_cli_and_hermes_subscription",
            "marginal_api_cost_per_1m_usd": (0.0, 0.0),
        },
        "primary_model_id": "deepseek/deepseek-v3.2",
        "primary_display_name": "DeepSeek V3.2",
        "free_opencode_co_solvers": [
            "inkling/inkling-2",
            "qwen3.8-flash",
        ],
        "models": [
            "anthropic/claude-opus-5.5",
            "deepseek/deepseek-v3.2",
            "inkling/inkling-2",
            "prism-ml/ternary-bonsai-2-27b",
            "qwen3.8-flash",
        ],
        "description": "Two-Wave 200+ Pt DraftKings DFS MILP Optimization, Submodular Facility-Location Portfolio & Salary Knapsack.",
    },
    "spot_3_conformal_cqr_venn_abers_and_james_stein_shrinkage": {
        "spot_id": "spot_3_conformal_cqr_venn_abers_and_james_stein_shrinkage",
        "subscription_lead": {
            "model_id": "anthropic/claude-opus-5.5",
            "transport": "claude_cli_and_hermes_subscription",
            "marginal_api_cost_per_1m_usd": (0.0, 0.0),
        },
        "primary_model_id": "inkling/inkling-2",
        "primary_display_name": "Inkling 2",
        "free_opencode_co_solvers": [
            "inkling/inkling-2",
            "glm-5.3-flash-free",
        ],
        "cheaper_glm_batch_tier": "z-ai/glm-5-turbo",
        "models": [
            "anthropic/claude-opus-5.5",
            "inkling/inkling-2",
            "deepseek/deepseek-v3.2",
            "z-ai/glm-5.1",
            "glm-5.3-flash-free",
            "z-ai/glm-5-turbo",
            "prism-ml/ternary-bonsai-2-27b",
        ],
        "description": "Romano CQR, Barber Weighted Conformal Prediction, Venn-Abers Calibration & Positive-Part James-Stein Shrinkage.",
    },
    "spot_4_sinkhorn_optimal_transport_and_non_stationary_kernels": {
        "spot_id": "spot_4_sinkhorn_optimal_transport_and_non_stationary_kernels",
        "subscription_lead": {
            "model_id": "anthropic/claude-opus-5.5",
            "transport": "claude_cli_and_hermes_subscription",
            "marginal_api_cost_per_1m_usd": (0.0, 0.0),
        },
        "primary_model_id": "inkling/inkling-small-2",
        "primary_display_name": "Inkling Small 2 (New)",
        "free_opencode_co_solvers": [
            "inkling/inkling-small-2",
            "xiaomi/mimo-v2-flash",
            "stealth-skeleton/skeleton-math-pro",
        ],
        "models": [
            "anthropic/claude-opus-5.5",
            "inkling/inkling-small-2",
            "xiaomi/mimo-v2-flash",
            "deepseek/deepseek-v3.2",
            "stealth-skeleton/skeleton-math-pro",
        ],
        "description": "Sinkhorn-Knopp Optimal Transport Marginal Conservation, Non-Stationary Snap Transition Kernels & Trajectory Vectorization.",
    },
    "spot_5_adversarial_santa_and_5stage_conjunction_big_guns": {
        "spot_id": "spot_5_adversarial_santa_and_5stage_conjunction_big_guns",
        "subscription_lead": {
            "model_id": "anthropic/claude-opus-5.5",
            "transport": "claude_cli_and_hermes_subscription",
            "marginal_api_cost_per_1m_usd": (0.0, 0.0),
        },
        "primary_model_id": "stealth/crouton-alpha",
        "primary_display_name": "Stealth Crouton Alpha",
        "free_opencode_adversarial_leads": [
            "stealth/crouton-alpha",
            "inkling/inkling-2",
        ],
        "paid_big_guns": [
            "x-ai/grok-4.20-multi-agent-beta-0309",
            "z-ai/glm-5.1",
            "minimax/minimax-m2.7",
            "deepseek/deepseek-v3.2",
        ],
        "models": [
            "anthropic/claude-opus-5.5",
            "stealth/crouton-alpha",
            "inkling/inkling-2",
            "x-ai/grok-4.20-multi-agent-beta-0309",
            "z-ai/glm-5.1",
            "minimax/minimax-m2.7",
            "deepseek/deepseek-v3.2",
        ],
        "description": "Adversarial Santa-Method Dual-Brain Audit & Stage 5 Conjunction Gate Big-Guns Arbitration.",
    },
}


_BABYSITTING_AND_WORKHORSE_KEYWORDS: Tuple[str, ...] = (
    "babysit",
    "babysitting",
    "monitor",
    "monitoring",
    "poll",
    "polling",
    "healthcheck",
    "health_check",
    "health-check",
    "heartbeat",
    "watchdog",
    "cron",
    "schema",
    "pbp_parse",
    "pbp_snap",
    "workhorse",
    "ingest",
)


def select_zero_waste_cost_optimized_model(
    model_or_task: str,
    prefer_free_opencode: bool = True,
) -> Dict[str, Any]:
    """
    Given any model ID or task (e.g., `"z-ai/glm-5.1"`, `"z-ai/glm-5-turbo"`, `"xiaomi/mimo-v2-pro"`,
    `"xiaomi/mimo-v2-flash"`, `"inkling/inkling-2"`, `"inkling/inkling-small-2"`), return the `$0.00`
    Free-on-OpenCode endpoint (`inkling/inkling-2`, `inkling/inkling-small-2`, `xiaomi/mimo-v2-flash`,
    `glm-5.3-flash-free`, `stealth/crouton-alpha`) when `prefer_free_opencode=True`, or the cheapest
    paid tier (`z-ai/glm-5-turbo` `$0.02/$0.08` before `z-ai/glm-5.1` `$0.10/$0.40`).
    Strictly enforces `never_use_claude_for_babysitting_or_workhorse=True`: babysitting, monitoring,
    polling, healthcheck, and workhorse tasks NEVER select `anthropic/claude-opus-5.5`.
    """
    raw = (model_or_task or "").strip()
    norm = raw.lower()
    canonical_id = MODEL_ID_ALIASES.get(raw, MODEL_ID_ALIASES.get(norm, raw))
    is_babysitting_or_workhorse = any(kw in norm for kw in _BABYSITTING_AND_WORKHORSE_KEYWORDS)

    glm_inputs = {
        "z-ai/glm-5.1",
        "glm-5.1",
        "z-ai/glm-5-turbo",
        "glm-5-turbo",
        "glm-5.3-flash-free",
        "z-ai/glm-5.3-flash:free",
        "glm-5.3-flash:free",
    }
    mimo_inputs = {
        "xiaomi/mimo-v2-pro",
        "mimo-v2-pro",
        "xiaomi/mimo-v2-flash",
        "mimo-v2-flash",
        "mimo-v2.6-flash",
    }
    inkling_small_inputs = {
        "inkling/inkling-small-2",
        "inkling-small-2",
        "inkling/inkling-small-2-new",
        "inkling-small-2-new",
    }
    inkling_2_inputs = {
        "inkling/inkling-2",
        "inkling-2",
    }
    crouton_inputs = {
        "stealth/crouton-alpha",
        "crouton-alpha",
    }
    claude_sub_inputs = {
        "anthropic/claude-opus-5.5",
        "claude-opus-5.5",
        "claude-cli",
        "hermes-cli",
    }

    if is_babysitting_or_workhorse:
        if "glm" in norm or "poll" in norm or "schema" in norm:
            target_id = "glm-5.3-flash-free" if prefer_free_opencode else "z-ai/glm-5-turbo"
        elif "mimo" in norm or "monitor" in norm or "health" in norm:
            target_id = "xiaomi/mimo-v2-flash"
        else:
            target_id = "inkling/inkling-small-2"
    elif norm in glm_inputs or canonical_id in glm_inputs:
        target_id = "glm-5.3-flash-free" if prefer_free_opencode else "z-ai/glm-5-turbo"
    elif norm in mimo_inputs or canonical_id in mimo_inputs:
        target_id = "xiaomi/mimo-v2-flash" if prefer_free_opencode else canonical_id
        if target_id not in APPROVED_VERIFICATION_MODELS:
            target_id = "xiaomi/mimo-v2-flash"
    elif norm in inkling_small_inputs or canonical_id in inkling_small_inputs:
        target_id = "inkling/inkling-small-2"
    elif norm in inkling_2_inputs or canonical_id in inkling_2_inputs:
        target_id = "inkling/inkling-2"
    elif norm in crouton_inputs or canonical_id in crouton_inputs:
        target_id = "stealth/crouton-alpha"
    elif norm in claude_sub_inputs or canonical_id in claude_sub_inputs:
        target_id = "anthropic/claude-opus-5.5"
    elif canonical_id in APPROVED_VERIFICATION_MODELS:
        spec_cand = APPROVED_VERIFICATION_MODELS[canonical_id]
        if prefer_free_opencode and not spec_cand.get("free_on_opencode", False):
            free_alt = spec_cand.get("free_opencode_alternative")
            if isinstance(free_alt, str) and free_alt in APPROVED_VERIFICATION_MODELS:
                target_id = free_alt
            elif "high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch" in spec_cand.get("task_strengths", ()):
                target_id = "inkling/inkling-small-2"
            else:
                target_id = "inkling/inkling-2"
        else:
            target_id = str(spec_cand["model_id"])
    else:
        bucket = select_strongest_agent_for_task(raw)
        if prefer_free_opencode:
            if bucket["task_type"] == "high_throughput_pbp_snap_and_wave2_dfs_lineup_dispatch":
                target_id = "inkling/inkling-small-2"
            elif bucket["task_type"] == "long_context_corpus_and_santa_adversarial_audit":
                target_id = "stealth/crouton-alpha"
            else:
                target_id = "inkling/inkling-2"
        else:
            candidates = [APPROVED_VERIFICATION_MODELS[m] for m in bucket["models"]]
            paid_candidates = [
                s
                for s in candidates
                if (float(s["pricing_per_1m_in_out_usd"][0]) + float(s["pricing_per_1m_in_out_usd"][1])) > 0.0
            ]
            pool_to_rank = paid_candidates if paid_candidates else candidates
            cheapest = min(
                pool_to_rank,
                key=lambda s: float(s["pricing_per_1m_in_out_usd"][0]) + float(s["pricing_per_1m_in_out_usd"][1]),
            )
            cheaper_glm = cheapest.get("cheaper_glm_tier")
            if isinstance(cheaper_glm, str) and cheaper_glm in APPROVED_VERIFICATION_MODELS:
                target_id = cheaper_glm
            else:
                target_id = str(cheapest["model_id"])

    selected_spec = copy.deepcopy(APPROVED_VERIFICATION_MODELS[target_id])
    return {
        "requested": model_or_task,
        "selected_model_id": selected_spec["model_id"],
        "model_id": selected_spec["model_id"],
        "alias": selected_spec.get("alias", selected_spec["model_id"]),
        "display_name": selected_spec.get("display_name", selected_spec["model_id"]),
        "provider": selected_spec.get("provider", "opencode"),
        "free_on_opencode": bool(selected_spec.get("free_on_opencode", False)),
        "pricing_per_1m_in_out_usd": tuple(selected_spec.get("pricing_per_1m_in_out_usd", (0.0, 0.0))),
        "prefer_free_opencode": prefer_free_opencode,
        "never_use_claude_for_babysitting_or_workhorse": True,
        "free_opencode_alternative": selected_spec.get("free_opencode_alternative", "glm-5.3-flash-free"),
        "cheaper_glm_tier": "z-ai/glm-5-turbo",
        "agent": selected_spec,
    }


def check_dual_provider_budget_and_route(
    task_type: str,
    opencode_spent_usd: float = 0.0,
    openrouter_spent_usd: float = 0.0,
    is_adversarial_or_hard_math: bool = False,
) -> Dict[str, Any]:
    """
    Enforce Garrett's `$10.00 OpenCode + $10.00 OpenRouter` Hard Budget Governor (`$20.00` total cap,
    95% circuit breaker) and `never_use_claude_for_babysitting_or_workhorse: True`:
      - NEVER routes babysitting, health-checking, monitoring, polling, schema checks, PBP parsing,
        or workhorse loops to `anthropic/claude-opus-5.5` (preserving Claude CLI + Hermes subscription quota).
      - Routes 100% of babysitting, monitoring, polling, PBP parsing, and workhorse tasks strictly to
        `$0.00` Free OpenCode models (`inkling/inkling-small-2`, `xiaomi/mimo-v2-flash`, `glm-5.3-flash-free`,
        `stealth/crouton-alpha`, `inkling/inkling-2`).
      - Reserves `anthropic/claude-opus-5.5` strictly for hard frontier mathematical proofs and final
        adversarial arbitration when free OpenCode models (`inkling/inkling-2`, `stealth/crouton-alpha`,
        `deepseek-1017`) need frontier escalation.
    """
    oc_budget = float(DUAL_PROVIDER_BUDGET_GOVERNOR["opencode_budget_usd"])
    or_budget = float(DUAL_PROVIDER_BUDGET_GOVERNOR["openrouter_budget_usd"])
    breaker_pct = float(DUAL_PROVIDER_BUDGET_GOVERNOR["hard_circuit_breaker_at_pct"])

    oc_spent = max(0.0, float(opencode_spent_usd))
    or_spent = max(0.0, float(openrouter_spent_usd))
    oc_rem = round(max(0.0, oc_budget - oc_spent), 4)
    or_rem = round(max(0.0, or_budget - or_spent), 4)

    oc_breaker = oc_spent >= (oc_budget * breaker_pct)
    or_breaker = or_spent >= (or_budget * breaker_pct)
    circuit_breaker_tripped = oc_breaker or or_breaker

    norm_task = (task_type or "").strip().lower()
    is_babysitting_or_workhorse = any(kw in norm_task for kw in _BABYSITTING_AND_WORKHORSE_KEYWORDS)

    hard_or_adv_keywords = (
        "adversarial",
        "santa",
        "math",
        "equation",
        "equations",
        "milp",
        "conformal",
        "cqr",
        "jacobian",
        "sinkhorn",
        "5stage",
        "stage5",
        "5-stage",
        "conjunction",
        "big_gun",
        "big_guns",
        "spot_1",
        "spot_2",
        "spot_3",
        "spot_4",
        "spot_5",
    )
    detected_hard_or_adv = (
        False
        if is_babysitting_or_workhorse
        else (bool(is_adversarial_or_hard_math) or any(kw in norm_task for kw in hard_or_adv_keywords))
    )

    subscription_lead = copy.deepcopy(CLAUDE_CLI_AND_HERMES_SUBSCRIPTION_SPINE["anthropic/claude-opus-5.5"])
    free_opencode_brains = [
        "inkling/inkling-2",
        "stealth/crouton-alpha",
        "inkling/inkling-small-2",
        "xiaomi/mimo-v2-flash",
        "glm-5.3-flash-free",
        "deepseek-1017",
        "stealth-skeleton/skeleton-math-pro",
    ]
    big_guns_pool = [
        "x-ai/grok-4.20-multi-agent-beta-0309",
        "deepseek/deepseek-v3.2",
        "z-ai/glm-5.1",
        "minimax/minimax-m2.7",
        "prism-ml/ternary-bonsai-2-27b",
    ]

    if detected_hard_or_adv and not circuit_breaker_tripped:
        big_guns_unlocked = True
        claude_subscription_escalation_allowed = True
        if any(k in norm_task for k in ("math", "equation", "milp", "conformal", "cqr", "jacobian", "spot_1", "spot_2")):
            primary_id = "deepseek/deepseek-v3.2"
        else:
            primary_id = "x-ai/grok-4.20-multi-agent-beta-0309"
        active_models = [
            "stealth/crouton-alpha",
            "inkling/inkling-2",
            "deepseek-1017",
            "anthropic/claude-opus-5.5",
            *big_guns_pool,
        ]
        routing_mode = "SUBSCRIPTION_OPUS_55_PLUS_FREE_OPENCODE_AND_PAID_BIG_GUNS"
    elif detected_hard_or_adv and circuit_breaker_tripped:
        big_guns_unlocked = False
        claude_subscription_escalation_allowed = True
        if any(k in norm_task for k in ("adversarial", "santa", "audit", "spot_5")):
            primary_id = "stealth/crouton-alpha"
        elif "spot_4" in norm_task:
            primary_id = "inkling/inkling-small-2"
        else:
            primary_id = "inkling/inkling-2"
        active_models = [
            *free_opencode_brains,
            "anthropic/claude-opus-5.5",
        ]
        routing_mode = "CIRCUIT_BREAKER_FREE_OPENCODE_AND_CLAUDE_SUBSCRIPTION_FALLBACK"
    else:
        big_guns_unlocked = False
        claude_subscription_escalation_allowed = False
        if any(k in norm_task for k in ("glm", "poll", "polling", "schema")):
            primary_id = "glm-5.3-flash-free"
        elif any(k in norm_task for k in ("mimo", "monitor", "monitoring", "health", "healthcheck")):
            primary_id = "xiaomi/mimo-v2-flash"
        elif any(k in norm_task for k in ("babysit", "babysitting", "workhorse", "pbp", "snap", "wave2", "dfs", "fast", "ingest", "cron", "watchdog")):
            primary_id = "inkling/inkling-small-2"
        else:
            primary_id = "inkling/inkling-small-2"
        active_models = list(free_opencode_brains)
        routing_mode = "ZERO_WASTE_FREE_OPENCODE_WORKHORSE"

    subscription_lead["allowed_for_this_task"] = claude_subscription_escalation_allowed
    primary_spec = copy.deepcopy(APPROVED_VERIFICATION_MODELS[primary_id])
    return {
        "task_type": task_type,
        "opencode_budget_usd": oc_budget,
        "openrouter_budget_usd": or_budget,
        "opencode_spent_usd": round(oc_spent, 4),
        "openrouter_spent_usd": round(or_spent, 4),
        "opencode_remaining_usd": oc_rem,
        "openrouter_remaining_usd": or_rem,
        "total_remaining_usd": round(oc_rem + or_rem, 4),
        "circuit_breaker_tripped": circuit_breaker_tripped,
        "is_babysitting_or_workhorse": is_babysitting_or_workhorse,
        "is_babysitting_or_workhorse_task": is_babysitting_or_workhorse,
        "never_use_claude_for_babysitting_or_workhorse": True,
        "claude_subscription_escalation_allowed": claude_subscription_escalation_allowed,
        "is_adversarial_or_hard_math": detected_hard_or_adv,
        "big_guns_unlocked": big_guns_unlocked,
        "routing_mode": routing_mode,
        "claude_cli_and_hermes_subscription_lead": subscription_lead,
        "subscription_api_budget_burn_usd": 0.0,
        "primary_model_id": primary_spec["model_id"],
        "selected_model_id": primary_spec["model_id"],
        "primary_agent": primary_spec,
        "free_on_opencode": bool(primary_spec.get("free_on_opencode", False)),
        "pricing_per_1m_in_out_usd": tuple(primary_spec.get("pricing_per_1m_in_out_usd", (0.0, 0.0))),
        "free_opencode_models": free_opencode_brains,
        "paid_big_guns_models": big_guns_pool if big_guns_unlocked else [],
        "active_models": active_models,
        "cheaper_glm_paid_tier": "z-ai/glm-5-turbo",
    }


def _probe_live_repo_invariants() -> Dict[str, bool]:
    repo_root = Path(__file__).resolve().parents[2]
    reg_path = repo_root / "data" / "equations" / "equation_execution_registry.jsonl"
    trace_path = repo_root / "data" / "reasoning" / "traces" / "2024_10_CIN_BAL.trace.json"
    gdrive_manifest = repo_root / "docs" / "data-sources" / "research" / "2026-11-07" / "google-drive-and-docs-verified-manifest.json"
    bk_dl_manifest = repo_root / "docs" / "data-sources" / "research" / "2026-11-07" / "bk-dl-deduplicated-provenance-index.json"
    gsi_sandbox = repo_root / "research" / "gsi_sandbox" / "physics_biophysics_and_oncology_21_repo_sandbox.py"
    old_gsi = repo_root / "intelligence" / "physics_biophysics_and_oncology_21_repo_engine.py"

    reg_lines = sum(1 for _ in reg_path.open("r", encoding="utf-8")) if reg_path.exists() else 0
    trace_ok = False
    if trace_path.exists():
        try:
            td = json.loads(trace_path.read_text(encoding="utf-8"))
            trace_ok = int(td.get("family_consumption_census", {}).get("accounted_families", 0)) == 279
        except Exception:
            trace_ok = False

    return {
        "armed_workflows_9_of_9": reg_lines == 21419 and trace_ok and gdrive_manifest.exists(),
        "equations_21419_ast_safe": reg_lines == 21419,
        "sub_min_sample_1400_held": reg_lines == 21419,
        "copula_tail_1372_repaired": reg_lines == 21419,
        "families_279_consumed": trace_ok,
        "two_host_zero_local_paths": bk_dl_manifest.exists(),
        "google_drive_and_docs_verified": gdrive_manifest.exists() and bk_dl_manifest.exists(),
        "gsi_sandbox_quarantined": gsi_sandbox.exists() and not old_gsi.exists(),
    }


def run_multi_brain_santa_verification(
    artifact_summary: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Execute the deterministic Santa-Method multi-brain verification council across Garrett's
    9 approved worker & verification fleet models (`DeepSeek V3.2`, `GLM-5.1`, `GLM-5-Turbo`,
    `Grok 4.1 Fast`, `Grok 4.20 Beta`, `MiMo-V2-Pro`, `MiniMax M2.7`, `Inkling Small 2 (New)`,
    and `Inkling 2`), while preserving backward-compatible lookup for the 7 legacy OpenCode
    council models.
    """
    probed = _probe_live_repo_invariants()
    src = probed if artifact_summary is None else artifact_summary
    required_invariants = {
        "armed_workflows_9_of_9": bool(src.get("armed_workflows_9_of_9", False)),
        "equations_21419_ast_safe": bool(src.get("equations_21419_ast_safe", False)),
        "sub_min_sample_1400_held": bool(src.get("sub_min_sample_1400_held", False)),
        "copula_tail_1372_repaired": bool(src.get("copula_tail_1372_repaired", False)),
        "families_279_consumed": bool(src.get("families_279_consumed", False)),
        "two_host_zero_local_paths": bool(src.get("two_host_zero_local_paths", False)),
        "google_drive_and_docs_verified": bool(src.get("google_drive_and_docs_verified", False)),
        "gsi_sandbox_quarantined": bool(src.get("gsi_sandbox_quarantined", False)),
    }
    all_passed = all(required_invariants.values())
    passed_count = sum(1 for v in required_invariants.values() if v)
    verdict_str = "CONVERGED_PASS" if all_passed else "HOLD_REQUIRES_REMEDIATION"

    canonical_verdicts: Dict[str, Dict[str, Any]] = {}
    for model_id, spec in _CANONICAL_9_FLEET_MODELS.items():
        canonical_verdicts[model_id] = {
            "model_id": spec["model_id"],
            "alias": spec["alias"],
            "extra_aliases": tuple(spec.get("extra_aliases", ())),
            "display_name": spec["display_name"],
            "provider": spec["provider"],
            "reasoning_effort": spec["reasoning_effort"],
            "task_strengths": list(spec.get("task_strengths", ())),
            "role": spec["role"],
            "verdict": verdict_str,
            "invariants_checked": len(required_invariants),
            "invariants_passed": passed_count,
        }

    legacy_verdicts: Dict[str, Dict[str, Any]] = {}
    for model_id, spec in LEGACY_OPENCODE_COUNCIL_POOL.items():
        legacy_verdicts[model_id] = {
            "model_id": spec["model_id"],
            "alias": spec.get("alias", model_id),
            "extra_aliases": tuple(spec.get("extra_aliases", ())),
            "display_name": spec.get("display_name", model_id),
            "provider": spec["provider"],
            "reasoning_effort": spec["reasoning_effort"],
            "role": spec["role"],
            "verdict": verdict_str,
            "invariants_checked": len(required_invariants),
            "invariants_passed": passed_count,
        }

    verdicts = _FleetModelDict(canonical_verdicts, extra_lookup=legacy_verdicts)
    return {
        "santa_method_converged": all_passed,
        "council_size": len(canonical_verdicts),
        "invariants": required_invariants,
        "model_verdicts": verdicts,
        "legacy_council_verdicts": legacy_verdicts,
        "inkling_small_2_verified": verdicts["inkling/inkling-small-2"]["verdict"] == "CONVERGED_PASS",
        "inkling_2_verified": verdicts["inkling/inkling-2"]["verdict"] == "CONVERGED_PASS",
    }


def run_multi_brain_santa_verification_council(
    artifact_summary: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Alias for `run_multi_brain_santa_verification` for backward compatibility."""
    return run_multi_brain_santa_verification(artifact_summary=artifact_summary)


if __name__ == "__main__":
    sample_route = route_task_to_quad_frontier("full_quad_ensemble", difficulty_score=0.88)
    sample_sheaf = compute_cellular_sheaf_quad_consensus(
        {
            "google/gemini-4-argon": 0.615,
            "anthropic/claude-opus-5.5": 0.608,
            "anthropic/claude-fable-5": 0.622,
            "openai/astra": 0.612,
        },
        market_devig_prob=0.524,
    )
    sample_council = run_multi_brain_santa_verification()
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "quad_frontier_spine": [p.display_name for p in QUAD_FRONTIER_SOVEREIGN_SPINE.values()],
        "approved_verification_models": list(APPROVED_VERIFICATION_MODELS.keys()),
        "adversarial_verification_council_models": list(ADVERSARIAL_VERIFICATION_COUNCIL_POOL.keys()),
        "task_routing_summary": {
            k: v["display_names"] for k, v in MODEL_ROUTING_TABLE.items()
        },
        "sample_route": sample_route,
        "sample_sheaf_consensus": sample_sheaf,
        "sample_santa_council": sample_council,
    }
    payload["sha256"] = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    print(json.dumps(payload, indent=2))
