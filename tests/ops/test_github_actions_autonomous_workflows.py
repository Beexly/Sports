"""Tests for GitHub Actions autonomous gameday and site-wide fabric workflows (Task 10)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

GAMEDAY_WF = REPO_ROOT / ".github" / "workflows" / "gse-connected-5stage-gameday-orchestrator.yml"
FABRIC_WF = REPO_ROOT / ".github" / "workflows" / "gse-site-wide-autonomous-fabric.yml"


def _load_yaml(path: Path) -> dict:
    assert path.is_file(), f"Missing workflow file: {path}"
    data = yaml.safe_load(path.read_text(encoding="ascii"))
    assert isinstance(data, dict)
    return data


def test_gameday_orchestrator_wires_wave48_spine_web_bridge_guards_and_artifacts() -> None:
    raw = GAMEDAY_WF.read_text(encoding="ascii")
    wf = _load_yaml(GAMEDAY_WF)

    required_scripts = (
        "run_overnight_w1_to_w11_simulation_battery.py",
        "export_sealed_slate_to_web.py",
        "verify_total_corpus_and_w11_preflight.py",
        "verify_public_root_zero_vault_leak.py",
        "run_permanent_sequenced_weekly_pipeline.py",
    )
    for script_name in required_scripts:
        assert script_name in raw, f"{GAMEDAY_WF.name} must wire {script_name}"

    assert "run_week9_full_slate_connected_workflow.py" not in raw
    assert "actions/upload-artifact@v4" in raw

    trigger_block = wf.get("on") or wf.get(True)
    assert isinstance(trigger_block, dict)
    schedules = [entry["cron"] for entry in trigger_block["schedule"]]
    assert len(schedules) >= 5
    for expr in schedules:
        assert len(expr.strip().split()) == 5, f"Malformed cron expression: {expr!r}"

    declared_set = set(schedules)
    referenced_guards = re.findall(r"github\.event\.schedule\s*==\s*'([^']+)'", raw)
    assert referenced_guards, "Expected schedule-matched job if guards"
    for guard_cron in referenced_guards:
        assert guard_cron in declared_set, (
            f"Job guard references undeclared cron {guard_cron!r}"
        )


def test_site_wide_autonomous_fabric_live_and_preserves_founder_gates() -> None:
    """Verify scheduled autonomous fabric runs without hardcoded --dry-run and keeps hard gates."""
    raw = FABRIC_WF.read_text(encoding="ascii")
    wf = _load_yaml(FABRIC_WF)

    trigger_block = wf.get("on") or wf.get(True)
    assert isinstance(trigger_block, dict)
    schedules = [entry["cron"] for entry in trigger_block["schedule"]]
    assert len(schedules) >= 1
    for expr in schedules:
        assert len(expr.strip().split()) == 5

    # Scheduled runs must NOT hardcode --dry-run on gse_autonomous_platform_fabric.py
    jobs = wf.get("jobs", {})
    assert "run-autonomous-fabric" in jobs
    steps = jobs["run-autonomous-fabric"]["steps"]
    fabric_entrypoint = "intelligence/ops/gse_autonomous_platform_fabric.py"
    fabric_steps = [s for s in steps if fabric_entrypoint in str(s.get("run", ""))]
    assert len(fabric_steps) == 1
    fabric_run = str(fabric_steps[0]["run"])
    assert "gse_autonomous_platform_fabric.py" in fabric_run

    # Ensure --dry-run is never hardcoded unconditionally (allowed only behind manual input gate)
    non_conditional_dry_run = [
        line.strip()
        for line in fabric_run.splitlines()
        if "--dry-run" in line and "github.event.inputs.dry_run" not in line
    ]
    assert non_conditional_dry_run == [], (
        f"Scheduled fabric workflow still hardcodes --dry-run: {non_conditional_dry_run}"
    )

    # All 4 founder hard gates preserved in workflow env / guardrails
    env_block = jobs["run-autonomous-fabric"].get("env") or fabric_steps[0].get("env") or {}
    combined_env = {**env_block, **(fabric_steps[0].get("env") or {})}
    assert str(combined_env.get("PUBLIC_PICKS_ENABLED", "")).lower() == "false"
    assert str(combined_env.get("LIVE_STAKE_FRACTION", "")) == "0.0"
    assert str(combined_env.get("REAL_MONEY_STAKE_CLEARED", "")).lower() == "false"
    assert str(combined_env.get("EXTERNAL_APPLICATIONS_FOUNDER_ONLY", "")).lower() == "true"
    assert str(combined_env.get("DRAFT_ONLY_MODE", "")).lower() == "true"
    assert str(combined_env.get("AUTO_PUBLISH_PUBLIC_POSTS", "")).lower() == "false"
    assert "--max-cost-usd 0.0" in fabric_run or "--max-cost-usd \"0.0\"" in fabric_run

    # Guardrails still execute
    assert "scripts/guardrails/draft-only.mjs" in raw
    assert "scripts/guardrails/em-dash-scan.mjs" in raw
    assert "scripts/guardrails/claude-api-usage.mjs" in raw
    assert "test_gse_autonomous_platform_fabric.py" in raw
