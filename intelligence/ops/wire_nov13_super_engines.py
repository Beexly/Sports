"""Unified runtime bridge wiring the 7 Nov 13 super-engines and Week 11+ NGS tracking.

Imported by both `engine/kernels/__init__.py` and
`scripts/ops/verify_and_wire_all_layers_before_sim.py` so every simulation run
exercises physical air-density/altitude adjustments, terminal CVI/injury tables,
multimodal PMF pooling, OOF logit-temp calibration, Week 11+ AWS NGS tracking gates,
mind-thermodynamics adversarial checks, and sovereign dual-cloud free-model routing.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
SRC_ROOT = REPO_ROOT / "src"
if SRC_ROOT.exists() and str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))


def _load_hyphen_module(module_name: str, rel_path: str):
    existing = sys.modules.get(module_name)
    if existing is not None:
        return existing
    target = REPO_ROOT / rel_path
    spec = importlib.util.spec_from_file_location(module_name, target)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load super-engine module at {target}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod


# 1. Sports universe physics & bitemporal situations (hyphenated folder)
_physics_mod = _load_hyphen_module(
    "gse_sports_universe_physics_and_situations",
    "intelligence/week10_engines_2026_11_13/GSE-Drive-Book-and-Research-Signal-Codex-2026-11-13/gse_sports_universe_physics_and_situations.py",
)
barometric_pressure_at_altitude_hpa = _physics_mod.barometric_pressure_at_altitude_hpa
humid_air_density_kg_m3 = _physics_mod.humid_air_density_kg_m3
enforce_bitemporal_asof = _physics_mod.enforce_bitemporal_asof
STADIUM_PSYCHROMETRICS_REGISTRY = _physics_mod.STADIUM_PSYCHROMETRICS_REGISTRY

# 2. Situational coach & terminal CVI injury engine
from intelligence.week10_engines_2026_11_13.gse_situational_coach_and_injury_engine import (  # noqa: E402
    CVI_TERMINAL_RECORD,
    GSE_PROPRIETARY_SEVEN,
    epa_table_sha256,
)

# 3. Multimodal decisions router
from intelligence.decisions.multimodal_decisions_router import (  # noqa: E402
    MultimodalDecisionsRouter,
    compute_zero_fallback_displacement,
    pool_calibrated_pmfs,
)

# 4. OOF logit-temp calibration + 3-class push EV
from intelligence.calibration.oof_logit_temp_calibration import (  # noqa: E402
    LogitTempCalibrator,
    PurgedEmbargoedChronologicalSplitter,
    compute_three_class_push_ev,
    devig_two_way_decimal_odds,
)

# 5. AWS Next Gen Stats Going Deep suite (Week 11+ unlocked cleanly; default holds)
from gse_engine.tracking.aws_ngs_going_deep_gse_gsi_suite import (  # noqa: E402
    AWS_NGS_ACTIVE_ML_MODELS,
    NFL_TRACKING_HZ,
    DualEpauletRFIDFrame,
    StadiumEdgeRFIDSmoother,
    assert_week11_simulation_hold,
)

# 6. Mind thermodynamics & T1-T8 mutation harness (hyphenated folder)
_thermo_mod = _load_hyphen_module(
    "gse_mind_thermodynamics_and_t1_t8_mutations",
    "intelligence/week10_engines_2026_11_13/GSE-Mind-Thermodynamics-and-T1-T8-Mutation-Harness-2026-11-13/gse_mind_thermodynamics_and_t1_t8_mutations.py",
)
evaluate_masked_boltzmann = _thermo_mod.evaluate_masked_boltzmann
evaluate_attention_thermodynamics = _thermo_mod.evaluate_attention_thermodynamics
evaluate_bellman_q_decay_defense = _thermo_mod.evaluate_bellman_q_decay_defense
evaluate_mind_principles = _thermo_mod.evaluate_mind_principles
AdversarialMutationHarness = _thermo_mod.AdversarialMutationHarness

# 7. Sovereign dual-cloud free-model router
from intelligence.ops.gse_gsi_qwencloud_free_router import (  # noqa: E402
    WORKSPACES,
    FreeModelPool,
    SovereignDualCloudRouter,
)

WEEK11_PLUS_APPROVED_WEEKS: tuple[int, ...] = tuple(range(11, 23))


def assert_approved_ngs_tracking_week(week: int, season: int = 2026) -> None:
    """Validate AWS NGS tracking week using the Week 11-22 approved season window."""
    assert_week11_simulation_hold(season=season, week=week, approved_weeks=WEEK11_PLUS_APPROVED_WEEKS)


def build_nov13_super_engine_manifest() -> dict[str, Any]:
    """Return runtime health & symbol wiring proof for all 7 Nov 13 super-engines."""
    assert_approved_ngs_tracking_week(11, season=2026)
    pressure_hpa = float(barometric_pressure_at_altitude_hpa(elevation_m=15.0))
    sample_air_density = float(
        humid_air_density_kg_m3(temp_c=21.0, pressure_hpa=pressure_hpa, rel_humidity_pct=50.0)
    )
    router = MultimodalDecisionsRouter()
    return {
        "wired": True,
        "engine_count": 7,
        "approved_ngs_weeks": list(WEEK11_PLUS_APPROVED_WEEKS),
        "nfl_tracking_hz": NFL_TRACKING_HZ,
        "aws_ngs_models_count": (
            int(AWS_NGS_ACTIVE_ML_MODELS)
            if isinstance(AWS_NGS_ACTIVE_ML_MODELS, int)
            else len(AWS_NGS_ACTIVE_ML_MODELS)
        ),
        "proprietary_seven_count": len(GSE_PROPRIETARY_SEVEN),
        "cvi_terminal_entries": len(CVI_TERMINAL_RECORD),
        "stadium_psychrometrics_count": len(STADIUM_PSYCHROMETRICS_REGISTRY),
        "sample_air_density_kg_m3": round(sample_air_density, 5),
        "router_cls": router.__class__.__name__,
        "calibrator_cls": LogitTempCalibrator.__name__,
        "mutation_harness_cls": AdversarialMutationHarness.__name__,
        "free_router_workspaces": len(WORKSPACES),
    }


__all__ = [
    "AdversarialMutationHarness",
    "AWS_NGS_ACTIVE_ML_MODELS",
    "CVI_TERMINAL_RECORD",
    "DualEpauletRFIDFrame",
    "FreeModelPool",
    "GSE_PROPRIETARY_SEVEN",
    "LogitTempCalibrator",
    "MultimodalDecisionsRouter",
    "NFL_TRACKING_HZ",
    "PurgedEmbargoedChronologicalSplitter",
    "SovereignDualCloudRouter",
    "STADIUM_PSYCHROMETRICS_REGISTRY",
    "StadiumEdgeRFIDSmoother",
    "WEEK11_PLUS_APPROVED_WEEKS",
    "WORKSPACES",
    "assert_approved_ngs_tracking_week",
    "assert_week11_simulation_hold",
    "barometric_pressure_at_altitude_hpa",
    "build_nov13_super_engine_manifest",
    "compute_three_class_push_ev",
    "compute_zero_fallback_displacement",
    "devig_two_way_decimal_odds",
    "enforce_bitemporal_asof",
    "epa_table_sha256",
    "evaluate_attention_thermodynamics",
    "evaluate_bellman_q_decay_defense",
    "evaluate_masked_boltzmann",
    "evaluate_mind_principles",
    "humid_air_density_kg_m3",
    "pool_calibrated_pmfs",
]
