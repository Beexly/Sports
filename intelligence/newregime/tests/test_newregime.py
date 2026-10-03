# Provenance: newregime module tests — Phase 4 validation for the S5 race,
# SYS-28 feature store, SYS-30 drift ensemble, SYS-13/14/15/17 gated lanes,
# SYS-31 rusty-backup archetype.
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md,
#               ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S5).
#
# Every test FAILS if unimplemented (no skips, no vacuous passes). Research
# lanes assert UNTESTED status rather than fake passes (INGEST-AND-LEARN).

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))

import pytest

import newregime
from newregime import (maml_new_regime_check, nggp_new_regime_check,
                       research_lanes_status, FeatureStore, BackfillRunner,
                       leak_injection_test, DriftEnsemble,
                       drift_acceptance_check, knn_impute,
                       all_research_lanes, EstimandTaxonomy,
                       ResearchGradeNotEvaluated, STATUS_UNTESTED,
                       is_layoff_return, blanket_candidate, archetype_flag)

PACKAGE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------------------
# S5 race gates (the master e2e contract)
# ---------------------------------------------------------------------------

def test_maml_gate():
    """1912: MAML 1-5-step adapter on 2-4 games — >=0.02 Brier improvement."""
    res = maml_new_regime_check()
    assert res["brier_improvement"] >= 0.02, res
    assert res["gate_cleared"] is True
    assert res["support_examples_per_task"] == 4
    assert 1 <= res["inner_steps"] <= 5


def test_nggp_gate():
    """1902: NGGP few-shot GP with calibrated uncertainty — >=0.01 Brier."""
    res = nggp_new_regime_check()
    assert res["brier_improvement"] >= 0.01, res
    assert res["gate_cleared"] is True


def test_gate_results_are_honest_about_data_basis():
    """Honesty rule: both checks must label their data basis as seeded
    synthetic — never imply real rookie-QB / new-HC game data."""
    for res in (maml_new_regime_check(), nggp_new_regime_check()):
        basis = res["data_basis"].lower()
        assert "synthetic" in basis, res
        assert "no real" in basis, res
        assert "seed" in res, res


def test_maml_beats_baseline_on_held_out_regimes():
    """The improvement must come from adaptation on HELD-OUT tasks, not from
    fitting the eval tasks."""
    res = maml_new_regime_check()
    assert res["n_test_tasks"] > 0
    assert res["brier_maml"] < res["brier_baseline"]


# ---------------------------------------------------------------------------
# SYS-28 feature store
# ---------------------------------------------------------------------------

def test_feature_store_leak_injection_gate():
    """SYS-28 acceptance: future-dated row is unreadable before its creation
    horizon; backfill cannot leak; online override rules exact."""
    res = leak_injection_test()
    assert res["passed"] is True
    assert res["gate_cleared"] is True


def test_feature_store_offline_insert_iff_absent():
    store = FeatureStore()
    assert store.insert_offline("f", "e", 1.0, 2.0, 0.5) is True
    assert store.insert_offline("f", "e", 1.0, 2.0, 0.9) is False  # key present
    # same event_ts, NEWER creation_ts is a different key -> inserts
    assert store.insert_offline("f", "e", 1.0, 3.0, 0.9) is True


def test_feature_store_online_override_semantics():
    store = FeatureStore()
    assert store.upsert_online("f", "e", 10.0, 11.0, "a") is True
    assert store.upsert_online("f", "e", 9.0, 99.0, "b") is False   # older event
    assert store.upsert_online("f", "e", 10.0, 10.0, "b") is False  # older creation
    assert store.upsert_online("f", "e", 10.0, 12.0, "c") is True   # newer creation
    assert store.upsert_online("f", "e", 11.0, 12.0, "d") is True   # newer event
    assert store._online[("f", "e")][2] == "d"


def test_feature_store_asof_never_reads_future_creation():
    """The leak wall: a row with creation_ts in the future is invisible to
    every as-of query at or before its creation horizon, even when the
    as-of time is past the row's event_ts."""
    store = FeatureStore(source_delays={"src": 10.0})
    store.insert_offline("f", "e", 50.0, 60.0, "old")
    store.insert_offline("f", "e", 500.0, 1000.0, "leak")  # future creation
    assert store.get_as_of("f", "e", 999.0, source="src") == "old"
    assert store.get_as_of("f", "e", 1000.0, source="src") == "old"  # within delay
    assert store.get_as_of("f", "e", 1011.0, source="src") == "leak"  # horizon passed


def test_backfill_runner_no_leakage_by_construction():
    store = FeatureStore()
    runner = BackfillRunner(store)
    n = runner.run([(300.0, 0.5), (100.0, 0.1), (200.0, 0.3)],
                   "f", "e", creation_start=500.0)
    assert n == 3
    assert store.get_as_of("f", "e", 499.0) is None       # nothing before stamp
    assert store.get_as_of("f", "e", 500.0) == 0.5        # nearest past value
    assert runner.watermark >= 500.0


# ---------------------------------------------------------------------------
# SYS-30 drift ensemble
# ---------------------------------------------------------------------------

def test_drift_acceptance_gate():
    """SYS-30: label-flip drift fires within 2 weeks at <=1 false alarm/season."""
    res = drift_acceptance_check()
    assert res["drift_detection_delay_weeks"] is not None
    assert res["drift_detection_delay_weeks"] <= 2, res
    assert res["false_alarms"] <= res["n_seasons"], res
    assert res["gate_cleared"] is True


def test_drift_ensemble_majority_vote_branches():
    """Abrupt branch = ADWIN+HDDM-A+KSWIN majority; gradual = HDDM-A+HDDM-W+PH."""
    from newregime.drift import ABRUPT_DETECTORS, GRADUAL_DETECTORS
    assert set(ABRUPT_DETECTORS) == {"ADWIN", "HDDM_A", "KSWIN"}
    assert set(GRADUAL_DETECTORS) == {"HDDM_A", "HDDM_W", "PageHinkley"}
    ens = DriftEnsemble()
    assert set(ens.detectors) == {"ADWIN", "HDDM_A", "KSWIN", "HDDM_W",
                                  "PageHinkley"}


def test_knn_impute_k4():
    """Imputation: kNN(k=4) fills missing with neighbor mean; no crash on
    edge missingness."""
    out = knn_impute([1.0, None, 3.0, 5.0, 7.0, 9.0])
    assert out[1] == pytest.approx((1.0 + 3.0 + 5.0 + 7.0) / 4)
    assert out[0] == 1.0 and out[5] == 9.0
    assert all(v is not None for v in out)


# ---------------------------------------------------------------------------
# Gated research lanes: assert UNTESTED, never fake passes
# ---------------------------------------------------------------------------

def test_research_lanes_are_untested_not_faked():
    lanes = all_research_lanes()
    assert {l.sys_id for l in lanes} == {"SYS-13", "SYS-14", "SYS-15", "SYS-17"}
    for lane in lanes:
        d = lane.status_dict()
        assert d["status"] == STATUS_UNTESTED, d
        assert d["gate_cleared"] is False, d
        assert d["research_grade"] is True, d
        assert d["gate"], d  # every lane documents its numeric gate
        with pytest.raises(ResearchGradeNotEvaluated):
            lane.evaluate()


def test_research_lanes_status_reports_all_lanes():
    status = research_lanes_status()
    ids = {l["sys_id"] for l in status["lanes"]}
    assert {"SYS-13", "SYS-14", "SYS-15", "SYS-17", "SYS-31",
            "S5/1912/1902"} <= ids
    by_id = {l["sys_id"]: l for l in status["lanes"]}
    for sys_id in ("SYS-13", "SYS-14", "SYS-15", "SYS-17"):
        assert by_id[sys_id]["status"] == STATUS_UNTESTED
        assert by_id[sys_id]["gate_cleared"] is False
    # the S5 race entry reflects the real synthetic-DGP checks
    assert by_id["S5/1912/1902"]["gate_cleared"] is True


def test_probit_lane_gate_rejects_by_default():
    """SYS-14: EP is adopted only if it beats PFM-VB — else REJECT. The stub
    must carry that rejection logic in its gate text."""
    lane = [l for l in all_research_lanes() if l.sys_id == "SYS-14"][0]
    assert "REJECT" in lane.gate


def test_estimand_taxonomy_reporting_standard():
    """SYS-17: the reporting standard is adoptable now (labeling needs no
    data); censor-at-IR analyses must carry the warning."""
    labeled = EstimandTaxonomy.label_claim(
        "high workload raises soft-tissue injury risk",
        EstimandTaxonomy.TOTAL_EFFECT)
    assert labeled["estimand"] == EstimandTaxonomy.TOTAL_EFFECT
    assert labeled["warning"] is None
    bad = EstimandTaxonomy.label_claim(
        "naive censor-at-IR analysis", EstimandTaxonomy.CONTROLLED_DIRECT_EFFECT)
    assert bad["warning"] is not None
    with pytest.raises(ValueError):
        EstimandTaxonomy.label_claim("x", "vibes-based-effect")


# ---------------------------------------------------------------------------
# SYS-31 rusty-backup archetype
# ---------------------------------------------------------------------------

def test_rusty_backup_rule_boundaries():
    assert is_layoff_return(8, 10) is True
    assert is_layoff_return(12, 25) is True
    assert is_layoff_return(7, 25) is False    # gap too short
    assert is_layoff_return(12, 9) is False    # too few attempts


def test_blanket_is_individual_player_not_positional_lean():
    """Blanket = the individual player with the most separation-friendly role;
    never a positional 'lean RB checkdowns' output."""
    targets = {"wr_alpha": 11, "rb_beta": 9, "slot_gamma": 7, "te_delta": 12}
    roles = {"wr_alpha": "wr1", "rb_beta": "receiving_rb",
             "slot_gamma": "slot", "te_delta": "te"}
    pick = blanket_candidate(targets, roles)
    assert pick == "wr_alpha"  # a named player, highest targets in blanket roles
    assert pick != "rb_beta"   # not the checkdown lean despite 9 targets


def test_archetype_flag_gates_vector_entry():
    out = archetype_flag("qb_1", 10, 14,
                         {"wr_a": 8, "rb_b": 6}, {"wr_a": "wr1", "rb_b": "receiving_rb"})
    assert out["is_layoff_return"] is True
    assert out["blanket_candidate"] == "wr_a"
    assert out["gate_status"] == STATUS_UNTESTED
    assert out["gate_cleared"] is False  # backtest not run — no vector entry
    off = archetype_flag("qb_2", 3, 14, {}, {})
    assert off["is_layoff_return"] is False
    assert off["blanket_candidate"] is None


# ---------------------------------------------------------------------------
# Package hygiene
# ---------------------------------------------------------------------------

def test_provenance_headers_on_every_file():
    """Every module file starts with a provenance header naming the research
    (SYS number + source doc paths)."""
    for fname in os.listdir(PACKAGE_DIR):
        if not fname.endswith(".py"):
            continue
        with open(os.path.join(PACKAGE_DIR, fname)) as f:
            head = "".join(f.readline() for _ in range(12))
        assert "Provenance:" in head, f"{fname} missing provenance header"
    # tests too
    testdir = os.path.join(PACKAGE_DIR, "tests")
    for fname in os.listdir(testdir):
        if not fname.endswith(".py"):
            continue
        with open(os.path.join(testdir, fname)) as f:
            head = "".join(f.readline() for _ in range(12))
        assert "Provenance:" in head, f"tests/{fname} missing header"


def test_public_api_surface():
    assert callable(newregime.maml_new_regime_check)
    assert callable(newregime.nggp_new_regime_check)
    assert callable(newregime.research_lanes_status)
    assert callable(newregime.leak_injection_test)
    assert callable(newregime.drift_acceptance_check)
