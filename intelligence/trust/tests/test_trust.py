# Module tests for the `trust` package.
#
# Provenance: trust/__init__.py header. Every test asserts on a real computed
# value -- no skips, no vacuous passes. Each test FAILS if the module is
# unimplemented (imports at top raise) or if the research contract drifts.

import hashlib
import json
import math

import numpy as np
import pytest

import trust
from trust import abstention as abs_mod
from trust import enbpi as enbpi_mod
from trust import evidence_guard as eg_mod
from trust import leakwall as lw_mod


# ---------------------------------------------------------------------------
# SYS-03 / SYS-36: EnbPI gates
# ---------------------------------------------------------------------------

class TestEnbPI:
    def test_gate_early_season_gain(self):
        res = trust.enbpi_coverage_check()
        assert res["early_season_gain_pp"] >= 3.0, (
            f"weeks-1-4 EnbPI coverage must beat ICP by >=3pp: {res}"
        )

    def test_gate_full_season_deviation(self):
        res = trust.enbpi_coverage_check()
        assert abs(res["full_season_deviation_pp"]) <= 2.0, (
            f"full-season EnbPI coverage must be within +-2pp of nominal: {res}"
        )

    def test_result_keys(self):
        res = trust.enbpi_coverage_check()
        for k in ("early_season_gain_pp", "full_season_deviation_pp",
                  "enbpi_early_coverage", "icp_early_coverage",
                  "enbpi_full_coverage", "nominal_coverage"):
            assert k in res, f"missing key {k}"

    def test_anti_spec_finite_sample_quantile(self):
        # cqr.ts bug: n=5, alpha=0.1 claimed 90% while delivering 83.33% by
        # clamping ceil((n+1)(1-alpha))/n to the max residual. Honest answer: +inf.
        r = [0.5, -0.3, 0.1, 0.8, -0.6]
        assert trust.finite_sample_quantile(r, 0.9) == math.inf
        lo, hi = trust.exact_interval(r, alpha=0.1)
        assert not math.isfinite(hi - lo), (
            "n=5, alpha=0.1 cannot yield a finite 90% interval -- must be unbounded"
        )

    def test_exact_quantile_rank_math(self):
        # Independent pin of the rank convention: k = ceil((n+1)*p)-th smallest.
        rng = np.random.default_rng(99)
        r = rng.normal(0, 1, 80)
        k = math.ceil(81 * 0.9)
        assert trust.finite_sample_quantile(r, 0.9) == float(np.sort(r)[k - 1])

    def test_interval_width_minimization_is_valid(self):
        # The width-minimizing (L,U) pair must still span >= ceil((n+1)(1-alpha))
        # ranks, i.e. exact coverage >= nominal on exchangeable data.
        rng = np.random.default_rng(7)
        n, alpha = 60, 0.1
        stream = rng.normal(0, 1, n + 400)
        hits = 0
        for t in range(n, n + 400):
            lo, hi = trust.exact_interval(stream[t - n:t], alpha)
            hits += lo <= stream[t] <= hi
        assert hits / 400 >= 1 - alpha - 0.03, (
            f"rank-exact interval undercovers on iid data: {hits/400}"
        )


# ---------------------------------------------------------------------------
# S3 leak wall + SYS-28 feature store
# ---------------------------------------------------------------------------

class TestLeakWall:
    def test_nan_kickoff_fails_closed(self):
        assert trust.latest_prior_row(kickoff_week=float("nan"), row_week=4) is None

    def test_inf_kickoff_fails_closed(self):
        assert trust.latest_prior_row(kickoff_week=float("inf"), row_week=4) is None

    def test_none_kickoff_fails_closed(self):
        assert trust.latest_prior_row(kickoff_week=None, row_week=4) is None

    def test_valid_latest_prior(self):
        rows = [{"row_week": 1, "v": "a"}, {"row_week": 3, "v": "b"},
                {"row_week": 5, "v": "c"}]
        got = trust.latest_prior_row(store=rows, kickoff_week=4, row_week=4)
        assert got == {"row_week": 3, "v": "b"}
        assert trust.latest_prior_row(store=rows, kickoff_week=1) is None

    def test_no_market_feed_raises(self):
        with pytest.raises(Exception) as ei:
            trust.select_market_snapshot(feed=None)
        assert "no_market_feed" in str(ei.value)

    def test_market_snapshot_shape(self):
        snap = trust.select_market_snapshot(feed={"p": 0.6})
        assert snap["value"] == {"p": 0.6}
        assert snap["grain"] == "market_snapshot"
        assert snap["provenance"] == "select_market_snapshot"

    def test_offline_insert_iff_key_absent(self):
        fs = trust.FeatureStore()
        assert fs.insert_offline("odds", "g1", 10.0, 11.0, "v1") is True
        assert fs.insert_offline("odds", "g1", 10.0, 11.0, "v2") is False
        assert fs.as_of("odds", "g1", 12.0) == "v1"

    def test_online_override_rules(self):
        fs = trust.FeatureStore()
        assert fs.insert_online("odds", "g1", 10.0, 11.0, "v1") is True
        # older event_ts: no override
        assert fs.insert_online("odds", "g1", 9.0, 12.0, "vX") is False
        # equal event_ts, older creation_ts: no override
        assert fs.insert_online("odds", "g1", 10.0, 10.5, "vX") is False
        # equal event_ts, newer creation_ts: override
        assert fs.insert_online("odds", "g1", 10.0, 11.5, "v2") is True
        # newer event_ts: override
        assert fs.insert_online("odds", "g1", 12.0, 12.5, "v3") is True
        assert fs.as_of("odds", "g1", 13.0) == "v3"

    def test_asof_nearest_past_value(self):
        fs = trust.FeatureStore()
        fs.insert_offline("odds", "g1", 10.0, 10.5, "early")
        fs.insert_offline("odds", "g1", 20.0, 20.5, "late")
        assert fs.as_of("odds", "g1", 15.0) == "early"
        assert fs.as_of("odds", "g1", 25.0) == "late"
        assert fs.as_of("odds", "g1", 5.0) is None

    def test_asof_source_delay(self):
        # NGS re-runs land 48h late: a row created at c is invisible before c+48.
        fs = trust.FeatureStore()
        fs.insert_offline("ngs", "g1", 100.0, 100.0, "rerun")
        assert fs.as_of("ngs", "g1", 147.9) is None
        assert fs.as_of("ngs", "g1", 148.0) == "rerun"
        # odds have zero delay
        fs.insert_offline("odds", "g1", 100.0, 100.0, "live")
        assert fs.as_of("odds", "g1", 100.0) == "live"

    def test_leak_injection_future_event(self):
        # Acceptance test (SYS-28): insert a future-dated row; prove no as-of
        # query at or before its timestamps can read it.
        fs = trust.FeatureStore()
        fs.insert_offline("odds", "g1", 10.0, 10.0, "legit")
        fs.insert_offline("odds", "g1", 999.0, 999.5, "LEAK-FUTURE-EVENT")
        for q in (10.0, 11.0, 500.0, 998.9):
            assert fs.as_of("odds", "g1", q) == "legit", f"leak visible at q={q}"
        # at q=999.0 the future event occurred but the row is not yet created
        assert fs.as_of("odds", "g1", 999.0) == "legit"
        assert fs.as_of("odds", "g1", 999.5) == "LEAK-FUTURE-EVENT"

    def test_leak_injection_future_creation(self):
        # A row whose creation_ts is in the future is invisible until created.
        fs = trust.FeatureStore()
        fs.insert_offline("odds", "g1", 10.0, 999.0, "LEAK-FUTURE-CREATION")
        assert fs.as_of("odds", "g1", 500.0) is None
        assert fs.as_of("odds", "g1", 999.0) == "LEAK-FUTURE-CREATION"


# ---------------------------------------------------------------------------
# SYS-21: Cohort-E honest baseline
# ---------------------------------------------------------------------------

class TestCohortE:
    def test_gate_brier(self):
        res = trust.cohort_e_baseline()
        assert abs(res["brier"] - 0.2106) < 0.005, f"Cohort-E Brier drifted: {res}"

    def test_gate_adaptive_ece(self):
        res = trust.cohort_e_baseline()
        assert abs(res["adaptive_ece"] - 0.0126) < 0.005, (
            f"Cohort-E adaptive ECE drifted: {res}"
        )

    def test_chain_stages(self):
        s_raw = np.linspace(0.05, 0.95, 200)
        rng = np.random.default_rng(3)
        y = (rng.random(200) < s_raw).astype(float)
        group = np.tile(np.arange(5), 40)
        out = trust.calibration_chain(s_raw, y, group)
        assert math.isfinite(out["temperature"])
        assert out["platt_w"].shape == (2,)
        assert 0.05 <= out["tau"] <= 2.0, "tau must be clamped to [0.05, 2]"
        assert len(out["group_intercepts"]) == 5
        assert np.all((out["p_final"] > 0) & (out["p_final"] < 1))

    def test_adaptive_ece_honest_binning(self):
        # Equal-count bins: perfectly calibrated probs -> ECE ~ 0 on large n.
        rng = np.random.default_rng(11)
        p = rng.uniform(0.1, 0.9, 5000)
        y = (rng.random(5000) < p).astype(float)
        assert trust.adaptive_ece(p, y) < 0.02


# ---------------------------------------------------------------------------
# Proof ledger: Wilson floor
# ---------------------------------------------------------------------------

class TestProofLedger:
    def test_floor(self):
        assert trust.proof_ledger_floor() == pytest.approx(0.524, abs=1e-9)

    def test_admissible(self):
        assert trust.edge_claim_admissible(wilson_lb=0.53) is True
        assert trust.edge_claim_admissible(wilson_lb=0.51) is False

    def test_floor_is_strict(self):
        # "must CLEAR 52.4%" -- exactly 0.524 does not clear.
        assert trust.edge_claim_admissible(wilson_lb=0.524) is False
        assert trust.edge_claim_admissible(wilson_lb=None) is False

    def test_wilson_lower_bound_pinned(self):
        # Hand-computed: 56/100 at z=1.96 -> 0.46228 (cross-checked algebraically).
        assert trust.wilson_lower_bound(56, 100) == pytest.approx(0.46228, abs=1e-4)
        lb = trust.wilson_lower_bound(60, 100)
        assert 0.5 < lb < 0.6  # below the point estimate, above the null
        assert trust.wilson_lower_bound(70, 100) > trust.wilson_lower_bound(60, 100)


# ---------------------------------------------------------------------------
# Negative gates
# ---------------------------------------------------------------------------

class TestNegativeGates:
    def test_uncertainty_resampling_unit_is_game(self):
        assert trust.uncertainty_resampling_unit() == "game"

    def test_abstention_not_disagreement_alone(self):
        assert trust.abstention_signal() != "model_disagreement"


# ---------------------------------------------------------------------------
# SYS-22: evidence guard
# ---------------------------------------------------------------------------

def _green_artifact(aid="T-GREEN-001"):
    evidence = {
        "brier": 0.2100, "baseline_brier": 0.2200, "adaptive_ece": 0.0100,
        "wilson_lb": 0.5500, "claims_brier_improvement": True,
    }
    return {
        "artifact_id": aid,
        "name": "green",
        "evidence": evidence,
        "evidence_hash": hashlib.sha256(
            json.dumps(evidence, sort_keys=True, default=str).encode()).hexdigest(),
        "n": 100,
        "window": (20240101, 20240201),
        "version": "1.0",
        "claims_edge": True,
        "provenance_complete": True,
        "leakage_attested": True,
        "uses_conformal": False,
        "feeds_picks": True,
        "has_intervals": True,
        "test_independent": True,
    }


class TestEvidenceGuard:
    def test_ship_when_15_of_15(self):
        v = trust.evidence_guard_evaluate(_green_artifact("T-GREEN-002"))
        assert v["decision"] == "SHIP"
        assert v["passed"] == 15
        verdict, art = trust.evidence_guard_publish(_green_artifact("T-GREEN-003"))
        assert verdict == "SHIP" and art is not None

    def test_hold_on_soft_failure(self):
        a = _green_artifact("T-HOLD-001")
        a["n"] = 20  # below the 30-sample floor -> soft fail
        v = trust.evidence_guard_evaluate(a)
        assert v["decision"] == "HOLD"
        assert "sample_floor" in v["failed"]
        verdict, art = trust.evidence_guard_publish(_green_artifact("T-HOLD-002"))
        assert verdict == "SHIP"  # untouched green artifact still ships
        # publish() maps a HOLD evaluation to HOLD (held from publishing)
        b = _green_artifact("T-HOLD-003")
        b["n"] = 20
        verdict_b, art_b = trust.evidence_guard_publish(b)
        assert verdict_b == "HOLD" and art_b is None

    def test_blocked_artifact_regression(self):
        # A8 precedent: Boltzmann 0.2558 vs isotonic 0.2148, delta=0.041.
        a = _green_artifact("T-A8-001")
        a["evidence"] = dict(a["evidence"], brier=0.2558, baseline_brier=0.2148)
        v = trust.evidence_guard_evaluate(a)
        assert v["decision"] == "BLOCKED", f"A8 must BLOCK: {v}"
        verdict, art = trust.evidence_guard_publish(a)
        assert verdict == "HOLD" and art is None, (
            "known-BLOCKED artifact must confirm HOLD at publish"
        )
        with pytest.raises(Exception):
            trust.live_pick_value("T-A8-001", 0.2558)

    def test_hash_tamper_blocks(self):
        a = _green_artifact("T-TAMPER-001")
        a["evidence_hash"] = "0" * 64  # tampered hash
        v = trust.evidence_guard_evaluate(a)
        assert v["decision"] == "BLOCKED"
        assert "evidence_rebound" in v["hard_failed"]

    def test_publish_rebinds_hash(self):
        a = _green_artifact("T-REBIND-001")
        del a["evidence_hash"]
        verdict, art = trust.evidence_guard_publish(a)
        assert verdict == "SHIP"
        assert art["evidence_hash"] == hashlib.sha256(
            json.dumps(art["evidence"], sort_keys=True, default=str).encode()
        ).hexdigest()

    def test_live_pick_value_passes_through_when_clean(self):
        assert trust.live_pick_value("T-NEVER-BLOCKED", 0.21) == 0.21


# ---------------------------------------------------------------------------
# SYS-25: NNTD abstention
# ---------------------------------------------------------------------------

class TestAbstention:
    def test_backtest_gate_brier_cut(self):
        res = trust.abstention_backtest()
        assert res["brier_cut"] >= 0.005, (
            f"abstention must cut published-set Brier by >=0.005: {res}"
        )

    def test_backtest_gate_coverage_loss(self):
        res = trust.abstention_backtest()
        assert res["coverage_loss"] <= 0.20, (
            f"coverage loss must be <=20%: {res}"
        )

    def test_nntd_uses_late_checkpoints(self):
        # Early checkpoints disagree but late ones agree -> low disagreement.
        rng = np.random.default_rng(5)
        K = 30
        cp = np.full(K, 0.6)
        cp[:5] = rng.normal(0.6, 0.3, 5)  # wild early training
        assert trust.nntd_disagreement(cp) < 0.05
        # Late checkpoints disagree -> high disagreement.
        cp2 = np.full(K, 0.6)
        cp2[-3:] = [0.3, 0.6, 0.9]
        assert trust.nntd_disagreement(cp2) > 0.15

    def test_composite_requires_both(self):
        assert trust.abstain_decision(0.9, 0.9, 0.1, 0.1) is True
        assert trust.abstain_decision(0.9, 0.01, 0.1, 0.1) is False
        assert trust.abstain_decision(0.01, 0.9, 0.1, 0.1) is False

    def test_threshold_calibration(self):
        rng = np.random.default_rng(9)
        scores = rng.uniform(0, 1, 1000)
        errors = np.where(scores > 0.7, 0.30, 0.10)  # high scores -> high error
        tau = trust.calibrate_threshold_to_target_error(scores, errors, 0.25)
        sel = scores > tau
        assert 0.01 <= sel.mean() <= 0.25
        assert abs(errors[sel].mean() - 0.25) < 0.05


def test_calibration_chain_stages_pinned_no_mixtures():
    # 1173 REJECTED: production chain is exactly the four pinned stages.
    from trust import calibration_chain_stages
    assert calibration_chain_stages() == [
        "temperature", "platt", "isotonic", "hierarchical_eb_tau",
    ]
