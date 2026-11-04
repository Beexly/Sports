"""Zero-Waste Model Router (`intelligence/routing/zero_waste_model_router.py`).

Implements the Uncompressed-Intelligence Zero-Waste Cost Doctrine (AGENTS.md:48-62):
  - Tier 0: Local Vectorized Computation ($0, local NumPy, DuckDB, Sinkhorn-Knopp, FWL residualization).
  - Tier 1: Free OpenRouter / Local Fast Endpoints ($0, omniroute/auto/coding:free, qwen-2.5-coder-32b:free,
            deepseek-r1:free, local MiMo on port 8080) for PBP parsing, document chunking, schema reconciliation,
            and raw tendency aggregation.
  - Tier 2: JEV Validated Choice Engine (`jevkit.client.ask`, ~typesafe/jev-latest) strictly for Stage 3
            snap-by-snap probability distributions conditioned on Stage 2 situational priors.
  - Tier 3: Frontier Arbitration (Claude 3.7 Sonnet / OpenAI o3) reserved strictly for high-leverage Stage 5
            conjunction gate sign-off and complex multi-agent arbitration.
"""
from __future__ import annotations

import os
from enum import Enum
from typing import Any, Dict, Optional


class TaskTier(str, Enum):
    TIER_0_LOCAL_VECTOR = "TIER_0_LOCAL_VECTOR"
    TIER_1_FREE_OR_LOCAL = "TIER_1_FREE_OR_LOCAL"
    TIER_2_JEV_VALIDATED = "TIER_2_JEV_VALIDATED"
    TIER_3_FRONTIER_ARBITRATION = "TIER_3_FRONTIER_ARBITRATION"


TIER_DEFAULT_ENDPOINTS: Dict[TaskTier, str] = {
    TaskTier.TIER_0_LOCAL_VECTOR: "local_numpy_duckdb_sinkhorn",
    TaskTier.TIER_1_FREE_OR_LOCAL: "openrouter:omniroute/auto/coding:free",
    TaskTier.TIER_2_JEV_VALIDATED: "jevkit:~typesafe/jev-latest",
    TaskTier.TIER_3_FRONTIER_ARBITRATION: "anthropic:claude-3-7-sonnet",
}


def route_zero_waste_task(task_name: str, tier: TaskTier, fallback: Optional[str] = None) -> Dict[str, Any]:
    """Route a task to the most cost-effective tier while preserving uncompressed intelligence."""
    endpoint = TIER_DEFAULT_ENDPOINTS.get(tier, "openrouter:omniroute/auto/coding:free")
    is_zero_cost = tier in (TaskTier.TIER_0_LOCAL_VECTOR, TaskTier.TIER_1_FREE_OR_LOCAL)

    # Allow local Xiaomi MiMo on port 8080 for Tier 1 when available
    mimo_active = os.environ.get("MIMO_LOCAL_PORT", "").strip() != ""
    if tier == TaskTier.TIER_1_FREE_OR_LOCAL and mimo_active:
        endpoint = "local_mimo:http://localhost:8080/v1"

    return {
        "task_name": task_name,
        "tier": tier.value,
        "endpoint": endpoint,
        "is_zero_cost": is_zero_cost,
        "estimated_cost_usd": 0.0 if is_zero_cost else ("JEV_CREDIT" if tier == TaskTier.TIER_2_JEV_VALIDATED else "FRONTIER_METERED"),
        "fallback": fallback,
        "zero_waste_doctrine_compliant": True,
    }
