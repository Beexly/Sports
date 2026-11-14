from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[2]
_INTEL_ROOT = _REPO_ROOT / "intelligence"
for p in (str(_REPO_ROOT), str(_INTEL_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from ops.lessons_learned_and_sequenced_gate_engine import (
    SEEDED_LESSONS_2026_11_13,
    load_lessons_ledger,
    record_lesson_learned,
    run_all_lessons_learned_gates,
)
from scripts.ops import preflight_live_roster_injury_gate as preflight
from scripts.ops.run_permanent_sequenced_weekly_pipeline import (
    ALL_32_NFL_TEAMS,
    SEQUENCED_GATES_ORDER,
    resolve_nfl_week_auto,
    run_permanent_sequenced_pipeline,
)


def test_lessons_ledger_seeded_with_12_lessons_and_idempotent(tmp_path: Path) -> None:
    ledger = tmp_path / "lessons.jsonl"
    for lesson in SEEDED_LESSONS_2026_11_13:
        record_lesson_learned(lesson, ledger_path=ledger)
    # Re-recording same ID is idempotent
    record_lesson_learned(SEEDED_LESSONS_2026_11_13[0], ledger_path=ledger)

    rows = load_lessons_ledger(ledger)
    assert len(rows) == 12
    ids = {r["lesson_id"] for r in rows}
    for i in range(1, 13):
        assert f"LL-2026-11-13-{i:03d}" in ids


def test_run_all_lessons_learned_gates_passes_12_of_12_on_repo() -> None:
    report = run_all_lessons_learned_gates(_REPO_ROOT)
    assert report["total_gates"] == 12
    assert report["failed_count"] == 0, f"Failed lesson gates: {[g for g in report['gates'] if not g['passed']]}"
    assert report["all_passed"] is True


def test_lessons_gate_fails_closed_on_synthetic_stale_workflow(tmp_path: Path) -> None:
    # Minimal broken clone check for gate 005 (stale week9 workflow trigger)
    wf_dir = tmp_path / ".github" / "workflows"
    wf_dir.mkdir(parents=True)
    (wf_dir / "gse-connected-5stage-gameday-orchestrator.yml").write_text(
        'default: "9"\nrun: python scripts/ops/run_week9_full_slate_connected_workflow.py\n',
        encoding="utf-8",
    )
    rep = run_all_lessons_learned_gates(tmp_path)
    gate_005 = next(g for g in rep["gates"] if g["lesson_id"] == "LL-2026-11-13-005")
    assert gate_005["passed"] is False


def test_stage0_week10_configs_reconciled_and_qb1_ban_preserved() -> None:
    import pandas as pd

    cfg = preflight.require_week(10)
    assert cfg["confirmed_qb1"]["ARI"] == "Carson Beck"
    assert cfg["confirmed_qb1"]["BAL"] == "Jacoby Brissett"
    assert cfg["confirmed_qb1"]["LV"] == "Fernando Mendoza"
    assert cfg["confirmed_qb1"]["MIN"] == "Kirk Cousins"
    assert cfg["confirmed_qb1"]["MIA"] == "Kyle McCord"
    assert cfg["confirmed_qb1"]["SEA"] == "Drew Lock"
    # Pinned CLE invariant for test_stage0_qb1_live_starter_resolution.py
    assert cfg["confirmed_qb1"]["CLE"] == "Shedeur Sanders"
    assert any(ep["name"] == "Deshaun Watson" for ep in cfg["excluded_players"])

    # Week 10 traded players properly handled: Dortch allowed on BUF, blocked if stale ARI
    df = pd.DataFrame([
        {"name": "Greg Dortch", "team": "BUF", "position": "WR", "status": "ACTIVE", "salary": 4200},
        {"name": "Greg Dortch", "team": "ARI", "position": "WR", "status": "ACTIVE", "salary": 4200},
        {"name": "Micah Parsons", "team": "GB", "position": "LB", "status": "PUP", "salary": 5000},
        {"name": "Carson Beck", "team": "ARI", "position": "QB", "status": "ACTIVE", "salary": 5500},
    ])
    clean, _log = preflight.apply_gate(df, cfg)
    kept = set(zip(clean["name"], clean["team"]))
    assert ("Greg Dortch", "BUF") in kept
    assert ("Greg Dortch", "ARI") not in kept
    assert ("Micah Parsons", "GB") not in kept
    assert ("Carson Beck", "ARI") in kept

    preflight.assert_lineup_clean(["Greg Dortch", "Kendrick Bourne", "Josh Downs", "Carson Beck"], cfg)
    with pytest.raises(preflight.PreflightRosterGateError):
        preflight.assert_lineup_clean(["Puka Nacua"], cfg)

    # Auto-discovery helpers
    resolved_wk, resolved_path = preflight.discover_latest_stage0_config(week="auto")
    assert resolved_wk >= 10
    assert Path(resolved_path).is_file()


def test_permanent_sequenced_pipeline_executes_7_gates_for_week10(tmp_path: Path) -> None:
    out_dir = tmp_path / "seq_out"
    unified_path = tmp_path / "week10_unified_stage0_truth.json"
    receipt = run_permanent_sequenced_pipeline(
        season=2026,
        week="auto",
        season_type="REG",
        mode="dry-run-audit",
        output_dir=out_dir,
        unified_truth_out_path=unified_path,
        fetch_live_espn=False,
        repo_root=_REPO_ROOT,
    )
    assert receipt["resolved_week"] == 10
    assert receipt["gate_order_executed"] == SEQUENCED_GATES_ORDER
    assert len(SEQUENCED_GATES_ORDER) == 7
    assert receipt["all_gates_passed"] is True

    # Cryptographic parent-child linkage across all 7 gates
    gates = receipt["gates"]
    for i in range(1, len(SEQUENCED_GATES_ORDER)):
        prev_g = SEQUENCED_GATES_ORDER[i - 1]
        curr_g = SEQUENCED_GATES_ORDER[i]
        assert gates[curr_g]["parent_sha256"] == gates[prev_g]["receipt_sha256"]

    truth = json.loads(unified_path.read_text(encoding="utf-8"))
    assert len(truth["teams_32_coverage"]) == 32
    assert set(truth["teams_32_coverage"].keys()) == set(ALL_32_NFL_TEAMS)
    assert truth["active_player_team"]["Greg Dortch"] == "BUF"
    assert truth["active_player_team"]["Kendrick Bourne"] == "ARI"
    assert truth["venues"]["NE@DET"]["venue"] == "FC Bayern Munich Stadium"
    assert truth["venues"]["NE@DET"]["neutral_site"] is True
    assert truth["venues"]["NE@DET"]["is_indoor"] is False
    assert truth["venues"]["KC@ATL"]["is_indoor"] is True


def test_github_workflow_uses_week_auto_and_permanent_pipeline() -> None:
    wf_path = _REPO_ROOT / ".github" / "workflows" / "gse-connected-5stage-gameday-orchestrator.yml"
    wf_text = wf_path.read_text(encoding="utf-8")
    assert 'default: "auto"' in wf_text
    assert "run_permanent_sequenced_weekly_pipeline.py" in wf_text
    assert "run_week9_full_slate_connected_workflow.py" not in wf_text
    assert resolve_nfl_week_auto(repo_root=_REPO_ROOT) >= 10
