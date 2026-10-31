from __future__ import annotations

import json
import time
import tracemalloc
from pathlib import Path

from argon_drop.live_certs import load_verified_pbp
from scripts.ops.gse_coach_mind_simulator import (
    DEFAULT_SEALED_BASELINE,
    canonical_hash,
    freeze_deep,
    simulate_matchup_pbp,
)
from scripts.ops.run_90min_injury_delta import run_90min_injury_delta_check


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_mounted_pbp_and_single_game_10k_timing_and_residual_benchmark() -> None:
    pbp_path = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"
    spine_path = REPO_ROOT / "data" / "engine" / "nfl_2026_w8_jev_full_game_spine.json"
    assert load_verified_pbp(pbp_path) == pbp_path
    assert load_verified_pbp(spine_path) == spine_path
    assert pbp_path.stat().st_size > 7_000_000

    sealed = freeze_deep(DEFAULT_SEALED_BASELINE)
    # Warm up cached PBP metrics & measure peak memory on 1,000 worlds
    tracemalloc.start()
    simulate_matchup_pbp(
        sealed_state=sealed,
        expected_hash=canonical_hash(sealed),
        away="WAS",
        home="KC",
        away_inj=[],
        home_inj=[],
        n_sims=1000,
        seed=41,
    )
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    # Measure true un-instrumented 10,000-world pathwise wall time
    t0 = time.perf_counter()
    res = simulate_matchup_pbp(
        sealed_state=sealed,
        expected_hash=canonical_hash(sealed),
        away="WAS",
        home="KC",
        away_inj=[],
        home_inj=[],
        n_sims=10000,
        seed=42,
    )
    wall_sec = time.perf_counter() - t0

    cons = res["pathwise_conservation_residuals"]
    assert cons["max_residual"] <= 1e-9
    assert cons["sinkhorn_dual_residual_max"] <= 1e-6
    assert wall_sec < 30.0
    assert peak_bytes < 512 * 1024 * 1024


def test_weeks_1_to_7_conjunction_replay_and_wave2_cqr_2462_locked() -> None:
    artifact_path = REPO_ROOT / "data" / "engine" / "weeks_1_7_conjunction_cqr_backtest_2026_10_30.json"
    assert artifact_path.exists()
    data = json.loads(artifact_path.read_text(encoding="utf-8"))

    cqr = data["wave2_design2_2462_locked_games_cqr_backtest"]
    assert cqr["n_locked_games"] == 2462
    assert cqr["romano_cqr_empirical_coverage"] >= 0.89
    assert cqr["min_major_subgroup_coverage"] >= 0.82
    assert cqr["design2_kill_gate_triggered"] is False
    assert cqr["design2_verdict"] == "PASS — DEPLOYED"

    replay = data["weeks_1_to_7_2026_held_out_conjunction_replay"]
    assert replay["total_games_evaluated"] == 107
    assert replay["wins"] == 30
    assert replay["losses"] == 17
    assert replay["pushes"] == 3
    assert replay["win_rate_pct"] >= 63.0
    assert replay["net_units"] > 10.0


def test_90min_injury_delta_and_aigoat_patch_present() -> None:
    inj_res = run_90min_injury_delta_check()
    assert inj_res["status"] == "VERIFIED_PASS"
    tb_shares = inj_res["reallocated_teams"]["TB"]["reallocated_shares"]  # type: ignore[index]
    assert tb_shares[0] == 0.0 and tb_shares[1] == 0.0
    assert abs(sum(tb_shares) - 1.0) <= 1e-6

    patch_file = REPO_ROOT / "aigoat_mcp_patch.diff"
    assert patch_file.exists()
    patch_text = patch_file.read_text(encoding="utf-8")
    assert "127.0.0.1" in patch_text
    assert "FLEET_AGENT_TOKEN_HASHES" in patch_text
