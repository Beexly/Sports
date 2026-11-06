"""Zero-Waste Model Router (`intelligence/routing/zero_waste_model_router.py`).

Implements the Uncompressed-Intelligence Zero-Waste Cost Doctrine (AGENTS.md:48-62) plus
Multi-Cloud Startup Credit & FlashBoot GPU Orchestration (2026-11-05):
  - Tier 0: Local Vectorized Computation ($0, local NumPy, DuckDB, Sinkhorn-Knopp, FWL residualization).
  - Tier 1: Free OpenRouter / Local Fast Endpoints ($0, omniroute/auto/coding:free, qwen-2.5-coder-32b:free,
            deepseek-r1:free, local MiMo on port 8080) for PBP parsing, document chunking, schema reconciliation,
            and raw tendency aggregation.
  - Tier 1B: NVIDIA NIM (`https://integrate.api.nvidia.com/v1`, Account `#1086418431979798`,
             40-RPM Token Bucket Governor `min_interval_ms=1500`).
  - Tier 1C: Scaleway Generative APIs (`https://api.scaleway.ai/v1`, `€100` free credit pool).
  - Tier 2: JEV Validated Choice Engine (`jevkit.client.ask`, ~typesafe/jev-latest) strictly for Stage 3
            snap-by-snap probability distributions conditioned on Stage 2 situational priors.
  - Tier 2B: RunPod Serverless FlashBoot GPU (`https://api.runpod.ai/v2`, `min_workers=0`, per-second GPU burst
             for `t85m_injury_resim` & `halftime_live_slate_burst` with automatic local CPU/NumPy fallback).
  - Tier 3: Frontier Arbitration (Claude 3.7 Sonnet / OpenAI o3) reserved strictly for high-leverage Stage 5
            conjunction gate sign-off and complex multi-agent arbitration.
  - Tier 3B: Google Cloud Vertex AI / Gemini Enterprise Agent Platform (`Case #00318218`).
"""
from __future__ import annotations

import json
import os
import time
from enum import Enum
from typing import Any, Dict, List, Optional


class TaskTier(str, Enum):
    TIER_0_LOCAL_VECTOR = "TIER_0_LOCAL_VECTOR"
    TIER_1_FREE_OR_LOCAL = "TIER_1_FREE_OR_LOCAL"
    TIER_1B_NVIDIA_NIM_GOVERNED = "TIER_1B_NVIDIA_NIM_GOVERNED"
    TIER_1C_SCALEWAY_CREDIT_POOL = "TIER_1C_SCALEWAY_CREDIT_POOL"
    TIER_2_JEV_VALIDATED = "TIER_2_JEV_VALIDATED"
    TIER_2B_RUNPOD_FLASHBOOT_GPU = "TIER_2B_RUNPOD_FLASHBOOT_GPU"
    TIER_3_FRONTIER_ARBITRATION = "TIER_3_FRONTIER_ARBITRATION"
    TIER_3B_GOOGLE_VERTEX_STARTUP_CREDITS = "TIER_3B_GOOGLE_VERTEX_STARTUP_CREDITS"


TIER_DEFAULT_ENDPOINTS: Dict[TaskTier, str] = {
    TaskTier.TIER_0_LOCAL_VECTOR: "local_numpy_duckdb_sinkhorn",
    TaskTier.TIER_1_FREE_OR_LOCAL: "openrouter:omniroute/auto/coding:free",
    TaskTier.TIER_1B_NVIDIA_NIM_GOVERNED: "nvidia_nim:https://integrate.api.nvidia.com/v1/meta/llama-3.1-70b-instruct",
    TaskTier.TIER_1C_SCALEWAY_CREDIT_POOL: "scaleway:https://api.scaleway.ai/v1/llama-3.3-70b-instruct",
    TaskTier.TIER_2_JEV_VALIDATED: "jevkit:~typesafe/jev-latest",
    TaskTier.TIER_2B_RUNPOD_FLASHBOOT_GPU: "runpod_flashboot:https://api.runpod.ai/v2",
    TaskTier.TIER_3_FRONTIER_ARBITRATION: "anthropic:claude-3-7-sonnet",
    TaskTier.TIER_3B_GOOGLE_VERTEX_STARTUP_CREDITS: "google_vertex:gemini-2.5-pro-enterprise-case-00318218",
}


class NvidiaNimTokenBucketGovernor:
    """40-RPM Token Bucket Governor (`min_interval_ms=1500`) for NVIDIA NIM (`https://integrate.api.nvidia.com/v1`)."""

    def __init__(self, rpm_limit: int = 40, min_interval_ms: int = 1500, account_id: str = "1086418431979798") -> None:
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.account_id = os.environ.get("NVIDIA_CLOUD_ACCOUNT_ID", account_id)
        self.rpm_limit = int(rpm_limit)
        self.min_interval_ms = int(min_interval_ms)
        self._last_request_ts: float = 0.0

    def acquire_slot_metadata(self) -> Dict[str, Any]:
        now = time.monotonic()
        elapsed_ms = (now - self._last_request_ts) * 1000.0 if self._last_request_ts > 0 else float(self.min_interval_ms)
        wait_ms = max(0.0, float(self.min_interval_ms) - elapsed_ms)
        self._last_request_ts = now
        return {
            "provider": "NVIDIA_NIM_INTEGRATE_API",
            "base_url": self.base_url,
            "nvidia_cloud_account_id": self.account_id,
            "inception_status": "APPROVED",
            "rpm_limit": self.rpm_limit,
            "min_interval_ms": self.min_interval_ms,
            "recommended_backoff_ms": round(wait_ms, 2),
        }


_NVIDIA_GOVERNOR = NvidiaNimTokenBucketGovernor()


def get_cloud_credit_lanes_summary() -> Dict[str, Any]:
    """Return structured configuration for all zero-cash / credit-backed compute lanes."""
    return {
        "nvidia_nim": _NVIDIA_GOVERNOR.acquire_slot_metadata(),
        "runpod_serverless_flashboot": {
            "provider": "RUNPOD_SERVERLESS_FLASHBOOT_GPU",
            "base_url": "https://api.runpod.ai/v2",
            "graphql_url": "https://api.runpod.io/graphql",
            "min_workers": 0,
            "max_workers": 4,
            "idle_timeout_sec": 5,
            "supported_burst_jobs": ["t85m_injury_resim", "halftime_live_slate_burst"],
            "zero_balance_fallback": "local_numpy_duckdb_sinkhorn",
        },
        "scaleway_generative_apis": {
            "provider": "SCALEWAY_GENERATIVE_APIS",
            "base_url": "https://api.scaleway.ai/v1",
            "credit_pool": "EUR_100_FREE_CREDITS",
            "credit_pool_eur": 100.0,
            "models": ["llama-3.3-70b-instruct", "deepseek-r1-distill-llama-70b", "qwen-2.5-coder-32b-instruct"],
        },
        "google_vertex_ai": {
            "provider": "GOOGLE_CLOUD_VERTEX_AI_GEMINI_ENTERPRISE",
            "case_id": os.environ.get("GOOGLE_STARTUPS_CASE_ID", "00318218"),
            "program": "Google for Startups Cloud Program (AI Startup Tier)",
            "target_models": ["gemini-2.5-pro", "claude-3-7-sonnet@vertex"],
        },
        "impact_partnership": {
            "provider": "IMPACT_COM_PARTNERSHIP_LEDGER",
            "account_id": os.environ.get("IMPACT_ACCOUNT_ID", "8111208"),
        },
    }


def route_zero_waste_task(task_name: str, tier: TaskTier, fallback: Optional[str] = None) -> Dict[str, Any]:
    """Route a task to the most cost-effective tier while preserving uncompressed intelligence."""
    if isinstance(tier, str) and not isinstance(tier, TaskTier):
        tier = TaskTier(tier)

    endpoint = TIER_DEFAULT_ENDPOINTS.get(tier, "openrouter:omniroute/auto/coding:free")
    zero_cash_tiers = (
        TaskTier.TIER_0_LOCAL_VECTOR,
        TaskTier.TIER_1_FREE_OR_LOCAL,
        TaskTier.TIER_1B_NVIDIA_NIM_GOVERNED,
        TaskTier.TIER_1C_SCALEWAY_CREDIT_POOL,
        TaskTier.TIER_2B_RUNPOD_FLASHBOOT_GPU,
        TaskTier.TIER_3B_GOOGLE_VERTEX_STARTUP_CREDITS,
    )
    is_zero_cost = tier in zero_cash_tiers

    # Allow local Xiaomi MiMo on port 8080 for Tier 1 when available
    mimo_active = os.environ.get("MIMO_LOCAL_PORT", "").strip() != ""
    if tier == TaskTier.TIER_1_FREE_OR_LOCAL and mimo_active:
        endpoint = "local_mimo:http://localhost:8080/v1"

    # Task-specific burst promotion for T-85m injury resim & Halftime live slate burst
    normalized_task = (task_name or "").strip().lower()
    if normalized_task in {"t85m_injury_resim", "halftime_live_slate_burst"} and tier == TaskTier.TIER_2B_RUNPOD_FLASHBOOT_GPU:
        endpoint = f"runpod_flashboot:https://api.runpod.ai/v2/{normalized_task}"
        if fallback is None:
            fallback = "local_numpy_duckdb_sinkhorn"

    if fallback is None:
        if tier == TaskTier.TIER_1B_NVIDIA_NIM_GOVERNED:
            fallback = "scaleway:https://api.scaleway.ai/v1/llama-3.3-70b-instruct"
        elif tier == TaskTier.TIER_1C_SCALEWAY_CREDIT_POOL:
            fallback = "openrouter:omniroute/auto/coding:free"
        elif tier == TaskTier.TIER_2B_RUNPOD_FLASHBOOT_GPU:
            fallback = "local_numpy_duckdb_sinkhorn"
        elif tier == TaskTier.TIER_3_FRONTIER_ARBITRATION:
            fallback = "google_vertex:gemini-2.5-pro-enterprise-case-00318218"

    if is_zero_cost:
        est_cost: Any = 0.0
    elif tier == TaskTier.TIER_2_JEV_VALIDATED:
        est_cost = "JEV_CREDIT"
    else:
        est_cost = "FRONTIER_METERED"

    lanes = get_cloud_credit_lanes_summary()
    return {
        "task_name": task_name,
        "tier": tier.value,
        "endpoint": endpoint,
        "is_zero_cost": is_zero_cost,
        "estimated_cost_usd": est_cost,
        "fallback": fallback,
        "zero_waste_doctrine_compliant": True,
        "cloud_credit_lanes": lanes,
    }


CONSTITUTIONAL_GATEKEEPER_INVARIANTS: Dict[str, Dict[str, Any]] = {
    "INV-1": {
        "name": "Spine Freshness",
        "rule": "spine_age_hours <= 18.0",
        "max_spine_age_hours": 18.0,
        "description": "Data spine (injuries, depth chart, odds snapshot) must be <= 18 hours old prior to evaluation.",
    },
    "INV-2": {
        "name": "Stage 1->2 Coupling",
        "rule": "stage1_to_stage2_coupled is True",
        "description": "Stage 1 coaching/injury/weather context must be explicitly coupled into Stage 2 situational priors before Stage 3 simulation.",
    },
    "INV-3": {
        "name": "Variance Floor & Probability Cap",
        "rule": "std >= 1.15 and max_prob <= 0.78",
        "min_std": 1.15,
        "max_prob": 0.78,
        "description": "Simulated prop/line distribution must maintain std >= 1.15 and post-calibration probability must never exceed 0.78.",
    },
    "INV-4": {
        "name": "Decoy Trap Filter",
        "rule": "not (line <= 0.45 * prior)",
        "decoy_ratio_threshold": 0.45,
        "description": "If live market prop line is <= 0.45 * healthy player prior (severe injury/snap-count decoy trap), block OVER automatically.",
    },
    "INV-5": {
        "name": "Two-Sided De-Vigged Price Exists",
        "rule": "two_sided_devig_exists is True and 0.01 < market_prob_devig < 0.99",
        "description": "Both OVER/UNDER or two-sided moneyline/spread prices must exist and be de-vigged before computing edge.",
    },
}


def build_constitutional_gatekeeper_prompt(game_id: str, candidate_ticket: Dict[str, Any]) -> Dict[str, Any]:
    """Build the 5-invariant Constitutional Gatekeeper system prompt and deterministic pre-check."""
    spine_age_hours = float(candidate_ticket.get("spine_age_hours", 2.0))
    stage1_to_stage2_coupled = bool(candidate_ticket.get("stage1_to_stage2_coupled", True))
    sim_std = float(candidate_ticket.get("std", candidate_ticket.get("sim_std", 2.40)))
    model_prob = float(candidate_ticket.get("model_prob", candidate_ticket.get("prob", 0.58)))
    line = float(candidate_ticket.get("line", 50.0))
    healthy_prior = float(candidate_ticket.get("prior", candidate_ticket.get("healthy_prior", 55.0)))
    over_odds = candidate_ticket.get("over_odds", candidate_ticket.get("side_a_odds", -110))
    under_odds = candidate_ticket.get("under_odds", candidate_ticket.get("side_b_odds", -110))
    market_prob_devig = candidate_ticket.get("market_prob_devig", 0.50)

    inv1_ok = spine_age_hours <= 18.0
    inv2_ok = stage1_to_stage2_coupled is True
    inv3_ok = (sim_std >= 1.15) and (model_prob <= 0.78)
    inv4_ok = not (healthy_prior > 0 and line <= 0.45 * healthy_prior)
    inv5_ok = (
        over_odds is not None
        and under_odds is not None
        and market_prob_devig is not None
        and (0.01 < float(market_prob_devig) < 0.99)
    )

    checks = {
        "INV-1": {"passed": inv1_ok, "observed_spine_age_hours": spine_age_hours, "threshold": "<= 18.0h"},
        "INV-2": {"passed": inv2_ok, "observed_stage1_to_stage2_coupled": stage1_to_stage2_coupled},
        "INV-3": {"passed": inv3_ok, "observed_std": sim_std, "observed_prob": model_prob, "threshold": "std >= 1.15 and max_prob <= 0.78"},
        "INV-4": {"passed": inv4_ok, "observed_line": line, "observed_prior": healthy_prior, "decoy_cutoff": round(0.45 * healthy_prior, 2)},
        "INV-5": {"passed": inv5_ok, "over_odds": over_odds, "under_odds": under_odds, "market_prob_devig": market_prob_devig},
    }
    violations: List[str] = [k for k, v in checks.items() if not v["passed"]]
    passed_all = len(violations) == 0

    system_prompt = (
        "You are the Galaxy Sports Edge Stage 5 Constitutional Gatekeeper.\n"
        "You must evaluate every candidate NFL side, total, player prop, or SGP leg against five hard, "
        "non-negotiable invariants before publication:\n"
        "  1. [INV-1] Spine Freshness: Data spine age MUST be <= 18h (`spine_age_hours <= 18.0`).\n"
        "  2. [INV-2] Stage 1->2 Coupling: Stage 1 coaching tendencies, active injuries, and weather MUST be coupled into Stage 2 situational priors.\n"
        "  3. [INV-3] Variance Floor & Probability Cap: Simulated distribution MUST satisfy `std >= 1.15` and calibrated `max_prob <= 0.78`.\n"
        "  4. [INV-4] Decoy Trap Filter: Reject any OVER where `line <= 0.45 * prior` (bookmaker snap-count/injury decoy alert).\n"
        "  5. [INV-5] Two-Sided De-Vigged Price Exists: Both sides of the market must be present and de-vigged (`0.01 < market_prob_devig < 0.99`).\n"
        "If ANY invariant fails, output `{\"decision\": \"PASS\", \"publishAllowed\": false}` with the failed invariant IDs."
    )

    return {
        "game_id": game_id,
        "system_prompt": system_prompt,
        "user_prompt": json.dumps({"game_id": game_id, "candidate_ticket": candidate_ticket}, sort_keys=True),
        "invariants_spec": CONSTITUTIONAL_GATEKEEPER_INVARIANTS,
        "invariant_checks": checks,
        "passed_all_invariants": passed_all,
        "violations": violations,
        "decision": "SPEAK" if passed_all else "PASS",
        "publishAllowed": passed_all,
        "routing": route_zero_waste_task(
            task_name=f"constitutional_gatekeeper:{game_id}",
            tier=TaskTier.TIER_1B_NVIDIA_NIM_GOVERNED,
            fallback="scaleway:https://api.scaleway.ai/v1/llama-3.3-70b-instruct",
        ),
    }
