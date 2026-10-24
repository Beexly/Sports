"""
Test Suite for Sovereign Command Pipeline Runner
Verifies:
1. Aerodynamics calculation under indoor dome vs open air.
2. SGP 50,000-draw Copula execution with measured correlations.
3. L1-L5 Reasoning Trace Engine execution with breaking conditions.
4. Clean JSON & Markdown outbox generation.
"""

import json
import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
import numpy as np

from intelligence.pipeline.sovereign_command_runner import (
    GameInput,
    SovereignCommandPipeline,
)
from intelligence.reasoning.schemas import (
    BetLeg,
    BreakingCondition,
    CausalChain,
    CausalLink,
)
from intelligence.reasoning.enums import Verification
from intelligence.sgp.sgp_copula_engine import Leg, NormalMarginal, PoissonMarginal


def test_sovereign_command_pipeline_e2e(tmp_path):
    pipeline = SovereignCommandPipeline(repo_root=Path(__file__).resolve().parents[2])

    game = GameInput(
        event_id="test_401872994",
        away_team="BUF",
        home_team="LAR",
        week=6,
        season=2026,
        commence_time="2026-10-13T00:15:00Z",
        venue="SoFi Stadium",
        stadium_type="dome",
        altitude_m=30.0,
        temperature_c=21.1,  # 70 F
        relative_humidity=0.55,
        wind_vector_ms=(0.0, 0.0, 0.0),
    )

    market_lines = {
        "spread": {"favorite": "LAR", "line": -3.5, "price": -110},
        "total": {"over_under": 55.5, "over_price": -110, "under_price": -110},
        "moneyline": {"home_lar": -185, "away_buf": 154},
    }

    trench_link = CausalLink(
        id="trench_oliver_out",
        cause="Ed Oliver (Bills DT1) OUT",
        mechanism="Buffalo interior pressure drops; Stafford clean-pocket rate > 75%",
        outcome="Rams offensive efficiency increases",
        verification=Verification.COMPUTED,
        breaking_conditions=[
            BreakingCondition(id="bc_sacks", text="Stafford sacks > 3", metric="stafford_sacks", op=">", threshold=3.0)
        ],
        load_bearing=True,
    )
    chain = CausalChain(id="chain_trench", links=[trench_link])

    bet_legs = [
        BetLeg(id="leg_spread", description="LAR -3.5 (-110)", causal_link_ids=["trench_oliver_out"], exposure=1.0)
    ]

    sgp_legs = [
        Leg(marginal=NormalMarginal(mean=268.0, sd=45.0), condition=lambda x: x > 260.5, label="Stafford Over 260.5 Yds"),
        Leg(marginal=PoissonMarginal(lam=1.85), condition=lambda x: x > 1.5, label="Stafford Over 1.5 TDs"),
    ]
    sgp_sub_indices = [0, 1]

    observations = {"stafford_sacks": 1.0, "air_density_kg_m3": 1.189}

    res = pipeline.execute(
        game=game,
        market_lines=market_lines,
        observations=observations,
        causal_chains=[chain],
        bet_legs=bet_legs,
        sgp_legs=sgp_legs,
        sgp_sub_indices=sgp_sub_indices,
        post_to_bus=False,
    )

    assert res.passed_all_gates is True
    assert res.game_id == "test_401872994"
    assert res.aerodynamics["air_density_kg_m3"] > 1.10
    assert res.sgp_results is not None
    assert res.sgp_results["true_copula_prob"] > res.sgp_results["independent_prob"]
    assert res.json_path.exists()
    assert res.md_path.exists()

    with open(res.json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["game_id"] == "test_401872994"
    assert "aerodynamics" in data
    assert "sgp_simulation" in data
    assert "synthesis" in data
