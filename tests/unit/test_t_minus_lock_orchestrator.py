"""Unit tests for GSE T-Minus Lock Orchestrator & 7-Point Pre-Card Sanity Firewall."""

from __future__ import annotations

import copy
import json
import subprocess
import sys
import time
from pathlib import Path

import pytest
from scripts.ops.gse_t_minus_lock_orchestrator import (
    CardSanityFirewallError,
    is_player_truly_inactive,
    render_operator_ranked_card_markdown,
    sync_espn_t90_inactives,
    verify_card_sanity_or_raise,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture
def real_lac_bal_bundle() -> dict:
    """Load real connected workflow dossier for LAC@BAL Week 10."""
    dossier_path = (
        REPO_ROOT
        / "data"
        / "engine"
        / "connected_workflow_dossier_lac_bal_week10.json"
    )
    with open(dossier_path, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def real_dfs_packet() -> dict:
    """Load real DFS showdown packet for LAC@BAL Week 10."""
    dfs_path = (
        REPO_ROOT
        / "data"
        / "dfs"
        / "week10_mnf_lac_bal_showdown_packet.json"
    )
    with open(dfs_path, encoding="utf-8") as f:
        return json.load(f)


def test_real_lac_bal_w10_offline_verify_and_card_order(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test real LAC@BAL Week 10 dossier passes S1..S7 and renders ordered card."""
    stage0_cfg = real_lac_bal_bundle.get("stage0_roster_and_board_allowlist", {})
    results = verify_card_sanity_or_raise(
        bundle=real_lac_bal_bundle,
        stage0_cfg=stage0_cfg,
        dfs_packet=real_dfs_packet,
    )

    assert results["S1_zero_excluded_leak"] is True
    assert results["S2_zero_duplicate_normalized_names"] is True
    assert results["S3_integer_discrete_td_int_support"] is True
    assert results["S4_qb_scramble_rush_calibrated"] is True
    assert results["S5_skill_sniper_gate_liveness"] is True
    assert results["S6_five_pillar_profiler_and_jacobians"] is True
    assert results["S7_confidence_format_clean"] is True

    card_md = render_operator_ranked_card_markdown(
        matchup="LAC@BAL",
        bundle=real_lac_bal_bundle,
        include_dfs=False,
        dfs_packet=real_dfs_packet,
    )

    card_file = REPO_ROOT / "data" / "cards" / "ranked_plays_card_w10_lac_bal.md"
    assert card_file.is_file()
    assert all(ord(c) <= 127 for c in card_md), "Markdown card must be pure 7-bit ASCII."
    assert "\u2014" not in card_md and "—" not in card_md, "Markdown card must not have em-dashes."

    # Verify descending confidence order: 69/100 -> 65/100 -> 63/100 -> ...
    extracted_confs: list[int] = []
    for line in card_md.splitlines():
        if line.startswith("| ") and "/100**" in line:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 3:
                conf_str = parts[2].replace("*", "")
                if "/100" in conf_str:
                    extracted_confs.append(int(conf_str.split("/")[0]))

    assert len(extracted_confs) >= 5
    assert extracted_confs[0] == 69  # SGP
    assert extracted_confs[1] == 65  # Henry carries / Vidal carries
    assert extracted_confs[3] == 63  # Henry rush yds / Herbert pass att
    for i in range(len(extracted_confs) - 1):
        assert (
            extracted_confs[i] >= extracted_confs[i + 1]
        ), "Plays must be descending in confidence."


def test_firewall_s1_negative_inactive_leak_projections(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S1 raises CardSanityFirewallError when excluded player leaks into projections."""
    bundle = copy.deepcopy(real_lac_bal_bundle)
    stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
    st34 = bundle["stage3_4_conserved_post_sim_projections"]

    # Lamar Jackson is confirmed excluded (IR - Back) in stage0
    st34["athlete_post_sim_projections"]["Lamar Jackson"] = {
        "athlete": "Lamar Jackson",
        "team": "BAL",
        "position": "QB",
        "projections": {"rush_yds": {"mean": 45.0}},
    }

    with pytest.raises(CardSanityFirewallError, match="S1_zero_excluded_leak"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)


def test_firewall_s1_negative_inactive_leak_dfs_roster(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S1 raises CardSanityFirewallError when excluded player leaks into DFS roster."""
    dfs = copy.deepcopy(real_dfs_packet)
    stage0_cfg = real_lac_bal_bundle.get("stage0_roster_and_board_allowlist", {})

    # Inject excluded player Lamar Jackson into DFS cash lineup
    dfs["cash_lineup"]["roster"].append({
        "slot": "FLEX",
        "player": "Lamar Jackson",
        "team": "BAL",
        "pos": "QB",
    })

    with pytest.raises(CardSanityFirewallError, match="S1_zero_excluded_leak"):
        verify_card_sanity_or_raise(real_lac_bal_bundle, stage0_cfg, dfs)


def test_firewall_s2_negative_duplicate_normalized_names(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S2 catches duplicate normalized names (e.g. Tre' Harris + Tre Harris split)."""
    bundle = copy.deepcopy(real_lac_bal_bundle)
    stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
    st34 = bundle["stage3_4_conserved_post_sim_projections"]
    projs = st34["athlete_post_sim_projections"]

    # Inject split aliases
    projs["Tre' Harris"] = {"athlete": "Tre' Harris", "team": "LAC", "position": "WR"}
    projs["Tre Harris"] = {"athlete": "Tre Harris", "team": "LAC", "position": "WR"}

    with pytest.raises(CardSanityFirewallError, match="S2_zero_duplicate_normalized_names"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)


def test_firewall_s3_negative_fractional_td_corruption(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S3 catches fractional-multiplied TD corruption (1 * 0.49 = 0.49 < 0.5)."""
    bundle = copy.deepcopy(real_lac_bal_bundle)
    stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
    st34 = bundle["stage3_4_conserved_post_sim_projections"]
    projs = st34["athlete_post_sim_projections"]

    # Inject corrupted pass_tds p50 = 0.49 on Herbert with mean >= 0.85
    projs["Justin Herbert"]["projections"]["pass_tds"] = {
        "mean": 1.14,
        "std": 1.18,
        "p50": 0.49,
    }

    with pytest.raises(CardSanityFirewallError, match="S3_integer_discrete_td_int_support"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)


def test_firewall_s4_negative_qb_scramble_rush_uncalibrated(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S4 catches uncalibrated QB scramble rush bug (e.g. 2.97 vs 21.5 line)."""
    bundle = copy.deepcopy(real_lac_bal_bundle)
    stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
    st34 = bundle["stage3_4_conserved_post_sim_projections"]
    projs = st34["athlete_post_sim_projections"]

    # Set Herbert boarded line to 21.5 and mean projection to 2.97 (< 0.45 * 21.5)
    projs["Justin Herbert"]["board_lines"]["Total Rushing Yards (incl. overtime)"] = 21.5
    projs["Justin Herbert"]["projections"]["rush_yds"]["mean"] = 2.97

    with pytest.raises(CardSanityFirewallError, match="S4_qb_scramble_rush_calibrated"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)


def test_firewall_s5_negative_all_skill_props_sniper_gate(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S5 catches mass-veto bug where all qualifying skill props are PASS_SNIPER_GATE."""
    bundle = copy.deepcopy(real_lac_bal_bundle)
    stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
    st5 = bundle["stage5_360_conjunction_gate_and_call_sheet"]

    # Veto every qualifying skill prop with PASS_SNIPER_GATE
    for prop in st5["core_prop_evaluations"]:
        pos = prop.get("position", "")
        mkt = prop.get("market", "").lower()
        line_val = float(prop.get("line", 0.0))
        if prop.get("has_two_sided_price"):
            is_rec = pos in ("WR", "TE") and "rec" in mkt and "yard" in mkt and line_val >= 18.5
            is_rush = pos == "RB" and "rush" in mkt and "yard" in mkt and line_val >= 24.5
            if is_rec or is_rush:
                prop["decision"] = "PASS_SNIPER_GATE"

    with pytest.raises(CardSanityFirewallError, match="S5_skill_sniper_gate_liveness"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)


def test_firewall_s6_negative_orphaned_jacobian(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S6 catches orphaned zero Jacobians or unfired intelligence pillars."""
    bundle = copy.deepcopy(real_lac_bal_bundle)
    stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
    receipt = bundle["stage2_jev_spine_and_10k_simulation"]["runtime_intelligence_receipt"]

    receipt["all_jacobians_nonzero"] = False
    with pytest.raises(CardSanityFirewallError, match="S6_five_pillar_profiler_and_jacobians"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)

    receipt["all_jacobians_nonzero"] = True
    receipt["all_pillars_fired"] = False
    with pytest.raises(CardSanityFirewallError, match="S6_five_pillar_profiler_and_jacobians"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)


def test_firewall_s7_negative_invalid_confidence_format(
    real_lac_bal_bundle: dict, real_dfs_packet: dict
) -> None:
    """Test S7 rejects confidence strings with '%' or non-XX/100 formatting."""
    bundle = copy.deepcopy(real_lac_bal_bundle)
    stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
    st5 = bundle["stage5_360_conjunction_gate_and_call_sheet"]

    # Inject '%' into approved prop confidence
    for prop in st5["core_prop_evaluations"]:
        if prop.get("publishAllowed") is True:
            prop["confidence_score"] = "65%"
            break

    with pytest.raises(CardSanityFirewallError, match="S7_confidence_format_clean"):
        verify_card_sanity_or_raise(bundle, stage0_cfg, real_dfs_packet)


def test_cli_offline_verify_subprocess_timing() -> None:
    """Test CLI --offline-verify runs as subprocess and completes in < 1.5 seconds."""
    cmd = [
        sys.executable,
        "scripts/ops/gse_t_minus_lock_orchestrator.py",
        "--week",
        "10",
        "--matchup",
        "LAC@BAL",
        "--offline-verify",
    ]
    t0 = time.perf_counter()
    proc = subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    elapsed = time.perf_counter() - t0

    assert proc.returncode == 0, f"Process failed with stderr: {proc.stderr}"
    assert elapsed < 1.5, f"Execution took {elapsed:.3f}s (must be < 1.5s)"
    assert "OPERATOR-FIRST RANKED CONFIDENCE CARD" in proc.stdout
    assert "7-Point Pre-Card Sanity Firewall: 100% PASS" in proc.stdout


def test_is_player_truly_inactive_activated_from_ir_vs_excluded() -> None:
    """day-to-day with empty injuries is NOT excluded; Out/IR/Doubtful/practice-squad are."""
    # Activated-from-IR pattern: David Njoku / Denzel Perryman
    assert is_player_truly_inactive(None, "day-to-day", []) is False
    assert is_player_truly_inactive("Questionable", "day-to-day", []) is False
    assert is_player_truly_inactive(None, "active", []) is False
    assert (
        is_player_truly_inactive("Questionable", "active", [{"status": "Questionable"}])
        is False
    )

    # Truly inactive statuses
    assert is_player_truly_inactive("Out", "active", []) is True
    assert is_player_truly_inactive("Doubtful", "active", []) is True
    assert is_player_truly_inactive("Injured Reserve", "day-to-day", []) is True
    assert is_player_truly_inactive(None, "day-to-day", [{"status": "Injured Reserve"}]) is True
    assert is_player_truly_inactive(None, "active", [{"status": "Out"}]) is True
    assert is_player_truly_inactive(None, "active", [{"status": "Doubtful"}]) is True
    assert is_player_truly_inactive(None, "practice-squad", []) is True
    assert is_player_truly_inactive(None, "injured-reserve", []) is True
    assert is_player_truly_inactive(None, "suspended", []) is True
    assert is_player_truly_inactive(None, "out", []) is True


def test_sync_espn_t90_inactives_lifts_activated_from_ir_and_excludes_inactives(
    tmp_path: Path,
) -> None:
    """sync_espn_t90_inactives lifts David Njoku/Denzel Perryman and keeps true inactives."""
    cfg_path = tmp_path / "week10_config.json"
    cfg_data = {
        "week": 10,
        "excluded_players": [
            {
                "name": "David Njoku",
                "team": "LAC",
                "position": "TE",
                "reason": "IR - no detail (stale Neon wk10)",
            },
            {
                "name": "Denzel Perryman",
                "team": "LAC",
                "position": "LB",
                "reason": "IR - no detail (stale Neon wk10)",
            },
            {
                "name": "Lamar Jackson",
                "team": "BAL",
                "position": "QB",
                "reason": "IR - Back",
            },
            {
                "name": "Rashod Bateman",
                "team": "BAL",
                "position": "WR",
                "reason": "OUT - Ankle (stale)",
            },
        ],
    }
    cfg_path.write_text(json.dumps(cfg_data), encoding="utf-8")

    summary_payload = {
        "injuries": [
            {
                "team": {"abbreviation": "LAC"},
                "injuries": [
                    {
                        "status": "Out",
                        "athlete": {
                            "displayName": "Ladd McConkey",
                            "position": {"abbreviation": "WR"},
                        },
                        "details": {"type": "Back"},
                    },
                ],
            },
            {
                "team": {"abbreviation": "BAL"},
                "injuries": [
                    {
                        "status": "Doubtful",
                        "athlete": {
                            "displayName": "Kyle Hamilton",
                            "position": {"abbreviation": "S"},
                        },
                        "details": {"type": "Groin"},
                    },
                ],
            },
        ]
    }
    away_roster_payload = {
        "athletes": [
            {
                "position": "offense",
                "items": [
                    {
                        "displayName": "David Njoku",
                        "position": {"abbreviation": "TE"},
                        "status": {"type": "day-to-day"},
                        "injuries": [],
                    },
                    {
                        "displayName": "Ladd McConkey",
                        "position": {"abbreviation": "WR"},
                        "status": {"type": "active"},
                        "injuries": [{"status": "Out"}],
                    },
                    {
                        "displayName": "Jake Browning",
                        "position": {"abbreviation": "QB"},
                        "status": {"type": "practice-squad"},
                        "injuries": [],
                    },
                ],
            },
            {
                "position": "defense",
                "items": [
                    {
                        "displayName": "Denzel Perryman",
                        "position": {"abbreviation": "LB"},
                        "status": {"type": "day-to-day"},
                        "injuries": [],
                    },
                    {
                        "displayName": "Derwin James Jr.",
                        "position": {"abbreviation": "S"},
                        "status": {"type": "day-to-day"},
                        "injuries": [{"status": "Injured Reserve"}],
                    },
                ],
            },
        ]
    }
    home_roster_payload = {
        "athletes": [
            {
                "position": "offense",
                "items": [
                    {
                        "displayName": "Lamar Jackson",
                        "position": {"abbreviation": "QB"},
                        "status": {"type": "day-to-day"},
                        "injuries": [{"status": "Injured Reserve"}],
                    },
                    {
                        "displayName": "Rashod Bateman",
                        "position": {"abbreviation": "WR"},
                        "status": {"type": "active"},
                        "injuries": [],
                    },
                ],
            },
            {
                "position": "defense",
                "items": [
                    {
                        "displayName": "Kyle Hamilton",
                        "position": {"abbreviation": "S"},
                        "status": {"type": "active"},
                        "injuries": [{"status": "Doubtful"}],
                    },
                ],
            },
        ]
    }

    res = sync_espn_t90_inactives(
        away="LAC",
        home="BAL",
        week=10,
        summary_payload=summary_payload,
        away_roster_payload=away_roster_payload,
        home_roster_payload=home_roster_payload,
        config_path=cfg_path,
    )

    updated = json.loads(cfg_path.read_text(encoding="utf-8"))
    excluded_names = {p["name"] for p in updated["excluded_players"]}

    # Activated-from-IR & active-empty-injuries players lifted
    assert "David Njoku" not in excluded_names
    assert "Denzel Perryman" not in excluded_names
    assert "Rashod Bateman" not in excluded_names
    assert set(res["lifted_exclusions"]) == {"David Njoku", "Denzel Perryman", "Rashod Bateman"}

    # Truly inactive players excluded
    assert "Lamar Jackson" in excluded_names
    assert "Ladd McConkey" in excluded_names
    assert "Jake Browning" in excluded_names
    assert "Derwin James Jr." in excluded_names
    assert "Kyle Hamilton" in excluded_names
    assert set(res["added_exclusions"]) == {
        "Derwin James Jr.",
        "Jake Browning",
        "Kyle Hamilton",
        "Ladd McConkey",
    }
