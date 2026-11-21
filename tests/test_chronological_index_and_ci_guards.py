#!/usr/bin/env python3
from __future__ import annotations

import copy
import importlib
import json
import re
import sys
from pathlib import Path

import numpy as np
import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.calibration.textbook_and_nflverse_2026_feature_engine import (
    NGUYEN_DEF_VARIANCE_SHARE,
    NGUYEN_RB_VARIANCE_SHARE,
    build_causal_multi_dataset_index,
    build_dense_chronological_game_week_map,
    chronological_nfl_week_index,
    compute_chronological_shrunk_covariance,
    compute_nguyen_yurko_step_turn_rush_decomp,
    compute_szekely_combine_prior_weight,
    get_causal_player_priors,
)
from scripts.calibration.calibrate_360_prop_families_walkforward import (
    SINGLE_PLAY_LOTTERY_REQUIRING_SPORTSBOOK_OOS,
)
from scripts.ops.offload_to_gdrive_30tb_vault import is_protected_path
from scripts.ops.tinker_remote_compute_bridge import (
    get_tinker_config,
    run_or_stage_tinker_training_session,
)


def test_jev_spine_imports_and_resolves_without_jevkit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(sys.modules, "jevkit", None)
    import scripts.ops.run_week11_jev_full_game_spine as spine

    reloaded = importlib.reload(spine)
    assert reloaded.jev_client is None

    rng = np.random.default_rng(20261120)
    answers = {
        "off_play_call": {
            "choice": "quick_game_rpo",
            "confidence": 0.62,
            "probabilities": {
                "inside_zone_run": 0.25,
                "outside_zone_run": 0.15,
                "quick_game_rpo": 0.35,
                "play_action_intermediate": 0.12,
                "deep_shot_pass": 0.05,
                "screen_or_draw": 0.08,
            },
        },
        "def_shell_call": {"choice": "two_high_quarters", "probabilities": {"two_high_quarters": 0.6}},
        "target_carrier": {"choice": "WR1", "probabilities": {"WR1": 0.4}},
        "snap_outcome": {
            "choice": "short_gain_1_4",
            "probabilities": {
                "turnover": 0.02,
                "sack_or_tfl": 0.06,
                "no_gain_or_inc": 0.28,
                "short_gain_1_4": 0.34,
                "chain_mover_5_11": 0.20,
                "explosive_12_24": 0.08,
                "breakaway_25_plus": 0.02,
            },
        },
        "pressure_disruption": {"noul": 0.22},
        "aggressive_coaching_edge": {"noul": 0.51},
    }
    res = reloaded._resolve_snap(rng, 1, 10, 75, answers, {"early_down_pass_rate": 0.55})
    assert res["play_type"] in ("pass", "run", "punt", "fg")
    assert 0 <= int(res["new_yardline_100"]) <= 99

    audit = reloaded.audit_2026_nfl_rulebook_compliance([], {"IND": 20, "HOU": 17})
    assert isinstance(audit, dict)

    with pytest.raises(RuntimeError, match="jevkit"):
        reloaded.run_week11_live_jev_spine()


def test_chronological_index_eliminates_base100_starvation_and_2x_sawtooth() -> None:
    # Step across 2025 W18 -> 2026 W1 is strictly 1 (never 83)
    c_25_18 = chronological_nfl_week_index(2025, 18)
    c_26_01 = chronological_nfl_week_index(2026, 1)
    assert c_26_01 - c_25_18 == 1

    all_pairs = [(2025, w) for w in range(1, 19)] + [(2026, w) for w in range(1, 19)]
    dense_map = build_dense_chronological_game_week_map(all_pairs)
    assert dense_map[(2026, 1)] - dense_map[(2025, 18)] == 1

    # Stationary 16-week trailing window has constant cardinality 16 across 2026 W1..W18 (zero 2x sawtooth)
    all_c = [chronological_nfl_week_index(s, w) for s, w in all_pairs]
    win_counts = []
    for w in range(1, 19):
        tc = chronological_nfl_week_index(2026, w)
        in_win = [x for x in all_c if (tc - 16) <= x < tc]
        win_counts.append(len(in_win))
    assert min(win_counts) == 16 and max(win_counts) == 16

    # Week 1 and Week 2 priors are populated from 2025 REG history (zero starvation) & stay strictly causal
    idx = build_causal_multi_dataset_index()
    p_w1 = get_causal_player_priors(idx, "00-0039163", "C.J. Stroud", "HOU", "TEN", target_week=1, target_season=2026)
    p_w2 = get_causal_player_priors(idx, "00-0039163", "C.J. Stroud", "HOU", "TEN", target_week=2, target_season=2026)
    assert p_w1["nfl_games_observed"] >= 4.0
    assert p_w2["nfl_games_observed"] >= 4.0

    # Strictly causal shrunk covariance excludes target_chrono_week & yields symmetric PSD matrix
    obs = [(chronological_nfl_week_index(2025, w), [float(w), float(w * 2), float((w % 3) + 1)]) for w in range(3, 19)]
    cov_base = compute_chronological_shrunk_covariance(obs, target_chrono_week=c_26_01, trailing_weeks=16)
    obs_plus_future = obs + [(c_26_01, [9999.0, -9999.0, 9999.0])]
    cov_after = compute_chronological_shrunk_covariance(obs_plus_future, target_chrono_week=c_26_01, trailing_weeks=16)
    np.testing.assert_allclose(cov_base, cov_after, atol=1e-12)
    eigs = np.linalg.eigvalsh(cov_base)
    assert float(np.min(eigs)) > 0.0


def test_arxiv_4_papers_invariants() -> None:
    # Szekely et al. (arXiv:2303.05774v1): rookie Combine weight decays to 0.0 at >= 4 games
    assert compute_szekely_combine_prior_weight(0) == pytest.approx(0.15)
    assert compute_szekely_combine_prior_weight(2) > 0.0
    assert compute_szekely_combine_prior_weight(4) == 0.0
    assert compute_szekely_combine_prior_weight(12) == 0.0

    # Nguyen & Yurko (arXiv:2603.17866v3): RB skill variance exceeds defense variance (~0.733 vs 0.267)
    assert NGUYEN_RB_VARIANCE_SHARE > NGUYEN_DEF_VARIANCE_SHARE
    decomp = compute_nguyen_yurko_step_turn_rush_decomp({"rush_ryoe": 0.4, "rush_stacked": 0.20})
    assert 0.70 < decomp["rb_skill_share"] < 0.76
    assert 0.72 <= decomp["explosive_cv"] <= 1.48


def test_calibration_metrics_governance_locks_and_offload_guards(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    heads_p = REPO_ROOT / "data" / "calibration" / "prop_family_calibration_heads_2026.json"
    heads = json.loads(heads_p.read_text(encoding="utf-8"))
    assert heads["strictly_causal"] is True
    assert heads["prior_season_bridge_2025_reg"] is True
    for fam, row in heads["families"].items():
        for metric in ("walkforward_brier", "walkforward_log_loss", "walkforward_ece", "walkforward_equal_mass_ece"):
            assert metric in row
            assert np.isfinite(float(row[metric]))
    for fam in SINGLE_PLAY_LOTTERY_REQUIRING_SPORTSBOOK_OOS:
        assert heads["families"][fam]["eligible_for_play"] is False

    # Governance lock: publishes_pick must stay False
    manifest = json.loads((REPO_ROOT / "data" / "gse-dataset" / "nflverse-ingest-manifest.json").read_text(encoding="utf-8"))
    assert manifest["publishes_pick"] is False

    # No remaining base-100 season/year encoding in executable expected-metrics code
    exp_dir = REPO_ROOT / "packages" / "prediction-engine" / "src" / "expected-metrics"
    for ts_file in exp_dir.glob("*.ts"):
        txt = ts_file.read_text(encoding="utf-8", errors="ignore")
        code_txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.S)
        code_txt = re.sub(r"//.*", "", code_txt)
        assert re.search(r"\b(?:season|year)\s*\*\s*100\b", code_txt) is None, (
            f"Base-100 season/year encoding found in {ts_file.name}"
        )

    # Offload active-workspace safety guard
    assert is_protected_path(Path(r"C:\c\wt-owner")) is True
    assert is_protected_path(Path(r"C:\Users\Garrett\.hermes")) is True
    assert is_protected_path(Path(r"C:\Users\Garrett\iCloudPhotos")) is False

    # Tinker bridge fails closed when TINKER_API_KEY is absent without leaking secrets
    monkeypatch.delenv("TINKER_API_KEY", raising=False)
    empty_env = tmp_path / "missing.env"
    cfg = get_tinker_config(env_files=(empty_env,))
    assert cfg["configured"] is False
    with pytest.raises(RuntimeError):
        run_or_stage_tinker_training_session(
            REPO_ROOT / "brain" / "feeds" / "2026-11-20" / "master_compendium_5books_13tables_v3.jsonl",
            env_files=(empty_env,),
        )
