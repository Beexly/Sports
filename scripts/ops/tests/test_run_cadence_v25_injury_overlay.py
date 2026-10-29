"""TDD suite for run_cadence_v25_injury_overlay.py (cadence v2.5).

Invariants under test:
  1. Only report_status designations (Out/Doubtful/Questionable) become role keys;
     a blank report_status is never promoted, however severe the practice status.
  2. The role mapping matches the coach-mind simulator loader (QB1/WR1..WR3/TE1/RB1,
     plus LT/CB1/EDGE1 for the first lineman/corner/edge).
  3. Sinkhorn reallocation under the sealed cost matrix moves mass iff a skill role
     (WR1/WR2/WR3/TE1/RB1) is scratched, and the scratched role keeps only the sealed
     0.01 floor.
  4. Seal verification reports unchanged against the recorded week-2026-W44 merkle.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "ops"))

import run_cadence_v25_injury_overlay as cadence  # noqa: E402
import gse_coach_mind_simulator as sim  # noqa: E402


def _write_csv(path: Path, rows):
    fields = ["season", "season_type", "game_type", "team", "week", "gsis_id", "position",
              "full_name", "first_name", "last_name", "report_primary_injury",
              "report_secondary_injury", "report_status", "practice_primary_injury",
              "practice_secondary_injury", "practice_status"]
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({**{f: "" for f in fields}, **row})


def test_blank_report_status_is_not_a_designation(tmp_path):
    path = tmp_path / "injuries.csv"
    _write_csv(path, [
        {"team": "CAR", "week": "8", "position": "QB", "full_name": "Bryce Young",
         "report_status": "", "practice_status": "Did Not Participate In Practice"},
        {"team": "CAR", "week": "8", "position": "G", "full_name": "Damien Lewis",
         "report_status": "Out", "practice_status": "Did Not Participate In Practice"},
    ])
    mapped = cadence.week_designations(path, 8)
    assert mapped["CAR"] == ["LT"], "a blank report_status must not create a role"


def test_role_mapping_matches_simulator_keys(tmp_path):
    path = tmp_path / "injuries.csv"
    _write_csv(path, [
        {"team": "GB", "week": "8", "position": "WR", "full_name": "Matthew Golden",
         "report_status": "Questionable"},
        {"team": "GB", "week": "8", "position": "C", "full_name": "Sean Rhyan",
         "report_status": "Out"},
        {"team": "GB", "week": "8", "position": "LB", "full_name": "Zaire Franklin",
         "report_status": "Out"},
        {"team": "GB", "week": "8", "position": "G", "full_name": "Travis Glover",
         "report_status": "Out"},
        {"team": "GB", "week": "8", "position": "DT", "full_name": "Devonte Wyatt",
         "report_status": "Questionable"},
    ])
    mapped = cadence.week_designations(path, 8)
    assert mapped["GB"] == ["WR1", "LT", "EDGE1"], (
        "expected WR1 + first lineman (LT) + first edge (EDGE1); second lineman and DT carry no role"
    )


def test_sinkhorn_reallocates_only_when_a_skill_role_is_scratched():
    sealed, _digest = sim.load_sealed_object_readonly()

    unchanged = cadence.team_reallocation(sealed, ["LT", "EDGE1", "CB1"])
    assert unchanged["mass_moved"] == pytest.approx(0.0)
    assert unchanged["total_mass_after"] == pytest.approx(1.0)

    scratched = cadence.team_reallocation(sealed, ["EDGE1", "LT", "WR1"])
    assert scratched["mass_moved"] > 0.2
    assert scratched["feasible_shares"]["WR1"] < 0.02, "sealed floor keeps a residual share"
    assert scratched["execution_multipliers"]["WR1"] == pytest.approx(0.82)
    assert sum(scratched["feasible_shares"].values()) == pytest.approx(1.0, abs=1e-9)


def test_cross_check_agrees_with_simulator_sinkhorn():
    sealed, _digest = sim.load_sealed_object_readonly()
    roles = ["EDGE1", "LT", "WR1"]
    forward = cadence.team_reallocation(sealed, roles)["feasible_shares"]
    reverse = cadence.cross_check(sealed, roles)["feasible_shares"]
    for role, share in forward.items():
        assert reverse[role] == pytest.approx(share, abs=1e-9)


def test_seal_hash_is_unchanged():
    seal = cadence.verify_seal()
    assert seal["unchanged"] is True, seal["checks"]
    assert seal["sealed_center_merkle"] == cadence.AUTHORITATIVE_MERKLE
    assert seal["tau"] == 0.42