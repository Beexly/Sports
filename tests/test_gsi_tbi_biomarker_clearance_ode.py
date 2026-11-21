"""Tests for mirrored GSI ADR-0003 Biphasic Neuro-Biomarker Clearance ODE."""

from __future__ import annotations

import pytest

from evaluation.gsi.tbi_biomarker_clearance_ode import (
    ASSAY_CUTOFFS,
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
    assert low["head_ct_triage_escalation_only"] is True
    assert low["standalone_lesion_diagnosis_permitted"] is False
    assert low["return_to_play_clearance_permitted"] is False
    assert low["mmp13_excluded"] is True
    assert low["regulatory_basis"] == "FDA 21 CFR 866.5830(b)(2)"
    assert low["assay"] == "istat_tbi_plasma"

    high_gfap = evaluate_rule_in_signal(30.0, 100.0)
    assert high_gfap["alert_triggered"] is True
    assert high_gfap["standalone_lesion_diagnosis_permitted"] is False
    assert high_gfap["return_to_play_clearance_permitted"] is False

    # istat_tbi_plasma requires UCH-L1 >= 360.0 pg/mL; 327.0 is serum cutoff (Banyan/VIDAS/Papa)
    below_plasma_uchl1 = evaluate_rule_in_signal(5.0, 327.0)
    assert below_plasma_uchl1["alert_triggered"] is False
    assert below_plasma_uchl1["return_to_play_clearance_permitted"] is False

    high_plasma_uchl1 = evaluate_rule_in_signal(5.0, 360.0)
    assert high_plasma_uchl1["alert_triggered"] is True
    assert high_plasma_uchl1["return_to_play_clearance_permitted"] is False

    for serum_assay in ("banyan_bti_serum", "vidas_tbi_serum", "papa_2022_research_serum"):
        gfap_cut = float(ASSAY_CUTOFFS[serum_assay]["gfap"])
        res_uchl1 = evaluate_rule_in_signal(5.0, 327.0, assay=serum_assay)
        assert res_uchl1["alert_triggered"] is True
        assert res_uchl1["assay"] == serum_assay
        assert res_uchl1["head_ct_triage_escalation_only"] is True
        assert res_uchl1["standalone_lesion_diagnosis_permitted"] is False
        assert res_uchl1["return_to_play_clearance_permitted"] is False

        res_gfap = evaluate_rule_in_signal(gfap_cut, 100.0, assay=serum_assay)
        assert res_gfap["alert_triggered"] is True

    with pytest.raises(ValueError, match="unknown assay"):
        evaluate_rule_in_signal(10.0, 100.0, assay="unverified_mixed")


def test_gsi_tbi_ode_benchmark_entrypoint() -> None:
    bench = run_benchmark()
    assert bench["benchmark"] == "gsi_adr0003_tbi_ode_v1"
    assert bench["monotonic_decay"] is True
    assert bench["rule_in_doctrine_preserved"] is True
