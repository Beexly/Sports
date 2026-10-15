"""Gate known cases, taken verbatim from the four extracted audits.

Each case is a claim the audits actually made; the gate must reproduce the
audit-consistent verdict. Sources: census-combine-reliability-addendum-2026-10-15.md.
"""

import math

from ..gate import FeatureEvidence, TransferEstimate, evaluate, reps_needed


def test_reps_needed_matches_pratheeksh_table():
    # Pratheeksh-7S Table 1 (reps to reach reliability 0.70).
    assert math.ceil(reps_needed(0.98)) == 1
    assert math.ceil(reps_needed(0.56)) == 2
    assert math.ceil(reps_needed(0.51)) == 3
    assert math.ceil(reps_needed(0.34)) == 5
    assert math.ceil(reps_needed(0.15)) == 13
    assert math.isinf(reps_needed(0.0))


def test_peak_speed_reliable_but_redundant():
    # faith-amanze notebook cell 5: reliability 0.99, r = -0.98 vs official forty.
    ev = FeatureEvidence(
        name="tracked peak speed",
        reliability=0.99, reliability_basis="rep-mean", reliability_n=375,
        transfer=TransferEstimate(effect=0.47, ci_lo=0.38, ci_hi=0.55, controlled=True,
                                  covariates=("position", "weight")),
        redundancy_r=-0.98, redundancy_against="official forty",
    )
    v = evaluate(ev)
    assert v.verdict == "FAIL"
    assert "REDUNDANT" in v.flags


def test_cut_efficiency_composite_fails_repeatability():
    # Pratheeksh-7S: cross-route cut-efficiency composite reliability 0.03.
    ev = FeatureEvidence(name="WR cut-efficiency composite", reliability=0.03,
                         reliability_basis="rep-mean")
    v = evaluate(ev)
    assert v.verdict == "FAIL"
    assert "repeatability" in v.legs and v.legs["repeatability"] == "FAIL"


def test_dl_drill_null_at_n65_is_underpowered_not_fail():
    # faith-amanze: reliable pass-rush features, transfer ~0, MDE 0.36 at n=65.
    ev = FeatureEvidence(
        name="DL pass-rush drill peak_speed",
        reliability=0.75, reliability_basis="rep-mean", reliability_n=102,
        transfer=TransferEstimate(effect=-0.02, controlled=True,
                                  covariates=("weight", "position")),
        n=65, mde=0.36,
    )
    v = evaluate(ev)
    assert v.verdict == "UNDERPOWERED"


def test_burst_powered_null_fails():
    # Pratheeksh-7S: burst -> get-off r = 0.03 (CI -0.16..0.23), ceiling 0.68.
    ev = FeatureEvidence(
        name="pass-rush burst -> get-off",
        reliability=0.48, reliability_basis="rep-mean", reliability_n=103,
        transfer=TransferEstimate(effect=0.03, ci_lo=-0.16, ci_hi=0.23, controlled=True,
                                  covariates=("position/role",)),
        n=103,
    )
    v = evaluate(ev)
    assert v.verdict == "FAIL"  # marginal reliability AND a powered null


def test_bend_score_underpowered_until_repeatability_measured():
    # StevanHRG: controlled transfer +0.99 (0.45..1.53); repeatability unreported.
    ev = FeatureEvidence(
        name="Combine Bend Score",
        reliability=None,
        transfer=TransferEstimate(effect=0.99, ci_lo=0.45, ci_hi=1.53, controlled=True,
                                  covariates=("log draft slot", "weight", "edge share", "10-yd split")),
        n=63,
    )
    v = evaluate(ev)
    assert v.verdict == "UNDERPOWERED"
    assert any("repeatability unmeasured" in r for r in v.reasons)


def test_ktd_as_published_fails_on_leakage():
    # usufalbaz KTD: outcome (separation) is the feature's denominator.
    ev = FeatureEvidence(name="KTD (published ratio)", outcome_leakage=True)
    v = evaluate(ev)
    assert v.verdict == "FAIL"
    assert v.legs["construct"] == "FAIL"


def test_clean_feature_passes():
    ev = FeatureEvidence(
        name="hypothetical clean feature",
        reliability=0.82, reliability_basis="split-half",
        transfer=TransferEstimate(effect=0.40, ci_lo=0.12, ci_hi=0.65, controlled=True,
                                  covariates=("height", "weight", "draft slot")),
        redundancy_r=0.42, redundancy_against="10-yd split",
        n=65,
    )
    v = evaluate(ev)
    assert v.verdict == "PASS"
