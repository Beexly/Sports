"""Integration tests on real nflverse pbp — the module's acceptance gates.

Slow (minutes): engine build + tau fit over 2022-2025, gates on 2024-2025 / 2026.
Run: .build-venv/bin/python -m pytest tests/test_coaching_gates.py -x -q

Gates (from the 0207/1575 brief contracts, adopted verbatim):
  G_tau:  tau-hat rule beats WP-max rule by >=3pp Hamming accuracy,
          opponent half, 2024-2025 4th downs.
  G1:     >=5% Brier improvement (shrunk vs raw MLE) on held-out 2026 drives.
  G2:     >=80% agreement with the risk-neutral reference on a 200-play audit.
"""
import glob
import os

import pandas as pd
import pytest

from coaching.coach_risk import TauFitter, load_fourth_downs
from coaching.situational_wp import SituationalEngine
from coaching.coach_audit import audit_decisions, aggregate_audit

DATA = os.path.expanduser("~/workspace/coaching-tendencies/data")


def _train_paths():
    return sorted(glob.glob(os.path.join(DATA, "pbp_202*.parquet")))


@pytest.fixture(scope="module")
def train_pbp():
    paths = [p for p in _train_paths()
             if any(s in os.path.basename(p) for s in ("2022", "2023", "2024", "2025"))]
    return pd.concat([pd.read_parquet(p) for p in paths], ignore_index=True)


@pytest.fixture(scope="module")
def fitter(train_pbp):
    fd = load_fourth_downs(
        [p for p in _train_paths()
         if any(s in os.path.basename(p) for s in ("2022", "2023"))])
    f = TauFitter(fd)
    f.fit(seasons=[2022, 2023])
    return f, fd


@pytest.fixture(scope="module")
def engine(train_pbp):
    return SituationalEngine(train_pbp)


def test_gate_tau_hamming(fitter):
    f, fd = fitter
    eval_fd = load_fourth_downs(
        [p for p in _train_paths()
         if any(s in os.path.basename(p) for s in ("2024", "2025"))])
    g = f.hamming_gate(eval_fd)
    assert g["n"] > 1000
    assert g["delta_pp"] >= 3.0, g
    assert g["pass"] is True


def test_gate_brier(engine):
    p26 = [p for p in _train_paths() if "2026" in os.path.basename(p)]
    held = pd.read_parquet(p26[0])
    g = engine.brier_gate(held)
    assert g["n"] > 100
    assert g["improve_frac"] >= 0.05, g
    assert g["pass"] is True


def test_gate_audit_agreement(engine, train_pbp):
    p26 = [p for p in _train_paths() if "2026" in os.path.basename(p)]
    held = pd.read_parquet(p26[0])
    g = engine.audit_agreement_gate(train_pbp, held, n=200, seed=7)
    assert g["n"] == 200
    assert g["agree_frac"] >= 0.80, g
    assert g["pass"] is True


def test_audit_pipeline_runs(fitter, engine):
    f, fd = fitter
    sub = fd[fd["season"] == 2023].head(300)
    ad = audit_decisions(sub, engine, f)
    assert set(["observed", "optimal", "tau_predicted", "wp_gap"]).issubset(ad.columns)
    assert (ad["wp_gap"] >= -1e-9).all()  # optimal >= observed by construction
    agg = aggregate_audit(ad)
    assert len(agg) > 0 and "wp_left_on_table" in agg.columns
