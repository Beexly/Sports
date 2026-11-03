"""Tests for scripts/ops/replay_weeks_1_to_8_trainer.py.

The contract claims "deterministic, seeded, reproducible" and "5 epochs of
continuous prior updates". These tests check those claims rather than trusting
them: identical reruns, no fabricated week-8 rows, and priors that actually
change predictions between epochs.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "ops" / "replay_weeks_1_to_8_trainer.py"
sys.path.insert(0, str(SCRIPT.parent))

import replay_weeks_1_to_8_trainer as trainer  # noqa: E402


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    d = tmp_path_factory.mktemp("replay")
    return trainer.run(epochs=3, pbp_path=None, out_dir=d)


@pytest.fixture(scope="module")
def second_run(tmp_path_factory):
    d = tmp_path_factory.mktemp("replay2")
    return trainer.run(epochs=3, pbp_path=None, out_dir=d)


def test_source_parquet_exists():
    p = ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"
    assert p.exists(), "week-by-week PBP parquet missing"


def test_deterministic_across_runs(out, second_run):
    a = json.dumps(out["epochs"], sort_keys=True)
    b = json.dumps(second_run["epochs"], sort_keys=True)
    assert a == b, "metrics differ between identical runs — not reproducible"
    assert out["team_priors"] == second_run["team_priors"]


def test_no_fabricated_week8(out):
    assert out["week8_status"] == "ABSENT_FROM_SOURCE_PARQUET"
    assert 8 not in out["weeks_available"]
    # coverage must be the weeks that exist, not invented ones
    assert out["weeks_available"] == [1, 2, 3, 4, 5, 6, 7]
    assert out["plays_loaded"] > 10_000


def test_metrics_are_calibrated(out):
    for row in out["epochs"]:
        assert 0.0 < row["brier_pass"] < 0.25, row
        assert row["logloss_pass"] < 0.693, "worse than a coin flip"
        assert row["ece_pass"] < 0.15, f"poorly calibrated: {row['ece_pass']}"


def test_priors_change_predictions_between_epochs(out):
    """Continuous prior updates must influence the fit, not just be logged."""
    briers = [r["brier_pass"] for r in out["epochs"]]
    assert len(set(briers)) > 1, "epochs are identical — priors never fed the model"
    assert briers[-1] <= briers[0], "continuous updates made calibration worse"


def test_beta_update_math():
    a, b = trainer._beta_update(2.0, 3.0, 7, 10)
    assert (a, b) == (9.0, 6.0)


def test_ece_is_zero_when_perfectly_calibrated():
    p = np.full(1000, 0.5)
    y = np.array([0.0] * 500 + [1.0] * 500)
    assert trainer._ece(p, y) < 1e-9


def test_ece_penalises_overconfidence():
    p = np.full(1000, 0.9)
    y = np.array([1.0] * 500 + [0.0] * 500)
    assert trainer._ece(p, y) > 0.3


def test_cli_writes_artifacts(tmp_path):
    r = subprocess.run(
        [sys.executable, str(SCRIPT), "--epochs", "2", "--out-dir", str(tmp_path)],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    assert r.returncode == 0, r.stderr[-2000:]
    assert "brier=" in r.stdout
    assert "week8: ABSENT_FROM_SOURCE_PARQUET" in r.stdout
    assert (ROOT / "data" / "engine" / "team_priors_weeks_1_to_8_trained.json").exists()
    assert (tmp_path / "WEEKS-1-TO-8-CONTINUOUS-SIMULATION-REPLAY-AUDIT.md").exists()
