"""Tests for mirrored GSI ADR-0003 Biphasic Neuro-Biomarker Clearance ODE."""

from __future__ import annotations

import pytest

from evaluation.gsi.tbi_biomarker_clearance_ode import (
    evaluate_rule_in_signal,
    run_benchmark,
    simulate_biphasic_biomarker_clearance,
)


def test_biphasic_decay_and_validation() -> None:
    t0 = simulate_biphasic_biomarker_clearance(180.0, 0.0)
    t24 = simulate_biphasic_biomarker_clearance(180.0, 24.0)
    t48 = simulate_biphasic_biomarker_clearance(180.0, 48.0)
    assert t48 < t24 < t0 == 180.0

    with pytest.raises(ValueError):
        simulate_biphasic_biomarker_clearance(-1.0, 12.0)


def test_adr0003_rule_in_only_doctrine() -> None:
    low = evaluate_rule_in_signal(10.0, 100.0)
    assert low["alert_triggered"] is False
    assert low["rule_in_only_doctrine"] is True
    assert low["return_to_play_clearance_permitted"] is False

    high_gfap = evaluate_rule_in_signal(30.0, 100.0)
    assert high_gfap["alert_triggered"] is True
    assert high_gfap["return_to_play_clearance_permitted"] is False

    high_uchl1 = evaluate_rule_in_signal(5.0, 327.0)
    assert high_uchl1["alert_triggered"] is True
    assert high_uchl1["return_to_play_clearance_permitted"] is False


def test_gsi_tbi_ode_benchmark_entrypoint() -> None:
    bench = run_benchmark()
    assert bench["benchmark"] == "gsi_adr0003_tbi_ode_v1"
    assert bench["monotonic_decay"] is True
    assert bench["rule_in_doctrine_preserved"] is True
