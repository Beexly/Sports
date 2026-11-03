from __future__ import annotations

import importlib
import json
import os
from pathlib import Path

import scripts.ops.gse_coach_mind_simulator as sim
from scripts.ops.trench_pocket_physics import (
    PASS_RUSHER_STRAIN_VARYING_INTERCEPTS,
    compute_ibrahim_voronoi_pocket_survival,
    compute_nguyen_yurko_matthews_strain_multilevel,
    compute_nikolaou_pelechrinis_team_collapse_pgm,
    compute_sharp_pass_rush_protection_adjustment,
)

ROOT = Path(__file__).resolve().parents[1]


def test_derive_comp_base_never_sees_biomech():
    assert sim.derive_comp_base(0.62) == 0.62
    os.environ["ENABLE_BIOMECH_KINETIC_TRANSLATION_V1"] = "1"
    importlib.reload(sim)
    assert sim.derive_comp_base(0.62) == 0.62
    os.environ["ENABLE_BIOMECH_KINETIC_TRANSLATION_V1"] = "0"


def test_generator_explicitly_unsets_flags(monkeypatch):
    monkeypatch.setenv("ENABLE_TRENCH_POCKET_PHYSICS_V2", "1")
    monkeypatch.setenv("ENABLE_BIOMECH_KINETIC_TRANSLATION_V1", "1")
    import scripts.ops.run_chi_sea_mnf_360_board_review as gen
    importlib.reload(gen)
    assert os.environ.get("ENABLE_TRENCH_POCKET_PHYSICS_V2") == "0"
    assert os.environ.get("ENABLE_BIOMECH_KINETIC_TRANSLATION_V1") == "0"


def test_card_has_no_telemetry_and_sibling_stamped():
    card = json.loads((ROOT / "data" / "engine" / "mnf_chi_sea_360_locked_card_2026_11_02.json").read_text(encoding="utf-8"))
    banned = [
        "biomech_kinetic_overlay",
        "batch9_biomech_and_metabolic_telemetry",
        "trench_pocket_physics_v2",
        "lumen_field_cleat_turf_slip_prob",
    ]
    assert not any(k in json.dumps(card) for k in banned)
    tele = json.loads((ROOT / "data" / "engine" / "mnf_chi_sea_360_telemetry_2026_11_02.json").read_text(encoding="utf-8"))
    assert tele["class"] == "RESEARCH_TELEMETRY_NOT_FOR_PUBLICATION"


def test_peer_reviewed_strain_voronoi_sharp_and_collapse_pgm():
    assert "Jeffery Simmons" in PASS_RUSHER_STRAIN_VARYING_INTERCEPTS
    assert "Myles Garrett" in PASS_RUSHER_STRAIN_VARYING_INTERCEPTS
    assert "Nick Bosa" in PASS_RUSHER_STRAIN_VARYING_INTERCEPTS
    assert "Aaron Donald" in PASS_RUSHER_STRAIN_VARYING_INTERCEPTS

    strain = compute_nguyen_yurko_matthews_strain_multilevel(
        rusher_trajectory=[(0.0, 0.0), (0.0, 1.2), (0.0, 2.6)],
        qb_trajectory=[(0.0, 5.0), (0.0, 5.0), (0.0, 5.0)],
        rusher_name="Jeffery Simmons",
        position="DT",
    )
    assert strain["varying_intercept_u_j"] == 0.57
    assert strain["multilevel_expected_strain_s_inv"] > 0.50

    voronoi = compute_ibrahim_voronoi_pocket_survival(
        blindside_voronoi_areas_yd2=[5.0 - 0.10 * t for t in range(25)],
        center_voronoi_areas_yd2=[4.2 - 0.15 * t for t in range(25)],
    )
    assert voronoi["center_survival_at_throw"] < voronoi["blindside_survival_at_throw"]
    assert voronoi["log_rank_chi2_reference"] == 99.2

    sharp = compute_sharp_pass_rush_protection_adjustment(
        raw_strain_rate=1.80,
        slide_protection_rate=0.50,
        rb_te_boink_chip_rate=0.40,
        two_man_post_double_rate=0.30,
    )
    assert sharp["effective_strain_rate"] < sharp["raw_strain_rate"]
    assert sharp["chip_route_delay_penalty"] > 0.0

    pgm = compute_nikolaou_pelechrinis_team_collapse_pgm(
        prior_mental_state=[-1, -1, 0],
        prior_observed_perf=[-1, -1, -1],
        influence_matrix_R=[[0.0, 0.4, 0.4], [0.4, 0.0, 0.4], [0.4, 0.4, 0.0]],
        self_reliance_r=[0.2, 0.2, 0.2],
    )
    assert pgm["team_collapse_risk"] > 0.50
    assert pgm["collapse_alert"] is True
