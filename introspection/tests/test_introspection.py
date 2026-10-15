"""Tests for the SPEC-C S0 store + S1 LMS accrual build.

Run: python3 -m pytest introspection/tests -q
The isolation test (§4.9) locates the repo root via GSE_REPO_ROOT or by
walking up from this file until packages/prediction-engine is found.
"""

from __future__ import annotations

import json
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src import dossier as dossier_mod
from src import importer as importer_mod
from src import lms as lms_mod
from src import manifest as manifest_mod
from src import premise as premise_mod
from src.store import StampAuthorityError, Store, record_sha

BRIDGE_PATH = os.environ.get(
    "GSE_BRIDGE_PREMISES",
    os.path.expanduser(
        "~/workspace/_scratch/premise-grading/intelligence/situational-graph/premise-grading/inputs/2026-week06-sea-at-den.bridge-premises.json"
    ),
)
GRADING_PATH = os.environ.get(
    "GSE_GRADING_LEDGER",
    os.path.expanduser(
        "~/workspace/_scratch/premise-grading/intelligence/situational-graph/premise-grading/ledger/premise-grades.jsonl"
    ),
)


@pytest.fixture()
def store(tmp_path):
    return Store(str(tmp_path / "introspection"))


def make_valid_premise():
    return {
        "premise_id": "premise:test:1",
        "game_id": "2026_06_SEA_DEN",
        "family": "offensive_line_injuries",
        "type_id": "ol_starter_out_inactive",
        "TRIGGER": "starting LT ruled out; backup starting",
        "AFFECTED": "inactive_status",
        "DIRECTION": -1,
        "MAGNITUDE": None,
        "p": 0.8,
        "resolution": {
            "quantity": "inactive_status",
            "comparator": "eq",
            "threshold": "OUT",
            "source": "injury feed / official inactives",
            "resolve_by_utc": "2026-10-16T00:15:00Z",
        },
        "LOG": "test premise",
        "inputs_hash": "x",
    }


# ---------------------------------------------------------------- chain ---
def test_chain_integrity_and_tamper_detection(store, tmp_path):
    store.append_jsonl("versions.jsonl", {"kind": "A"})
    store.append_jsonl("versions.jsonl", {"kind": "B"})
    assert store.verify_all() == []
    path = tmp_path / "introspection" / "versions.jsonl"
    lines = path.read_text(encoding="utf-8").splitlines()
    rec = json.loads(lines[0])
    rec["kind"] = "TAMPERED"
    lines[0] = json.dumps(rec, sort_keys=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    problems = store.verify_all()
    assert problems and any("record_sha mismatch" in p for p in problems)


def test_dossier_versions_chain_and_immutability(store):
    d1 = store.write_dossier(2026, 6, "2026_06_SEA_DEN", {"premises": []})
    d2 = store.write_dossier(2026, 6, "2026_06_SEA_DEN", {"premises": [], "revises": 1})
    assert d2["prev_sha"] == d1["record_sha"]
    assert store.verify_dossier_chain(2026, 6, "2026_06_SEA_DEN") == []
    assert d2["record_sha"] == record_sha(d2)


# ---------------------------------------------------------- stamp power ---
def test_author_supplied_timestamps_rejected(store):
    with pytest.raises(StampAuthorityError):
        store.append_jsonl("versions.jsonl", {"kind": "A", "authored_utc": "2020-01-01T00:00:00Z"})
    with pytest.raises(StampAuthorityError):
        store.write_dossier(2026, 6, "2026_06_SEA_DEN", {"stamped_utc": "2020-01-01T00:00:00Z"})
    rec = store.append_jsonl("versions.jsonl", {"kind": "A"})
    assert rec["stamped_utc"].endswith("Z")  # server stamp, UTC


# -------------------------------------------------------------- premise ---
def test_valid_premise_is_gradeable():
    verdict = premise_mod.validate_premise(make_valid_premise())
    assert verdict["gradeable"] and verdict["strict_ok"]


def test_missing_p_rejected_in_strict_mode():
    premise = make_valid_premise()
    premise["p"] = None
    verdict = premise_mod.validate_premise(premise)
    assert not verdict["strict_ok"]
    assert any("probability" in r for r in verdict["unresolvable_reasons"])
    with pytest.raises(premise_mod.PremiseRejected):
        premise_mod.assert_strict(premise)


def test_p_out_of_range_flagged():
    premise = make_valid_premise()
    premise["p"] = 0.995
    verdict = premise_mod.validate_premise(premise)
    assert not verdict["gradeable"]
    assert any("[0.01, 0.99]" in r for r in verdict["unresolvable_reasons"])


def test_bad_affected_rejected():
    premise = make_valid_premise()
    premise["AFFECTED"] = "vibes_index"
    premise["resolution"]["quantity"] = "vibes_index"
    verdict = premise_mod.validate_premise(premise)
    assert not verdict["gradeable"]
    assert any("resolvable-quantity registry" in r for r in verdict["unresolvable_reasons"])


def test_unregistered_family_and_type_flagged():
    premise = make_valid_premise()
    premise["family"] = "moon_phases"
    premise["type_id"] = "lunar_rush"
    verdict = premise_mod.validate_premise(premise)
    assert not verdict["gradeable"]
    assert any("adjustment families" in r for r in verdict["unresolvable_reasons"])


def test_unresolvable_stored_not_graded(store):
    premise = make_valid_premise()
    premise["p"] = None
    premise["resolution"] = None
    verdict = premise_mod.validate_premise(premise)
    assert verdict["gradeable"] is False
    assert verdict["unresolvable_reasons"]  # reasons recorded, record kept
    doc = store.write_dossier(
        2026,
        6,
        "2026_06_SEA_DEN",
        {"premises": [{**premise, "status": "UNRESOLVABLE", "gradeable": False}]},
    )
    assert doc["premises"][0]["status"] == "UNRESOLVABLE"


# ------------------------------------------------------------- forecast ---
def test_forecast_vector_validation():
    ok = dossier_mod.validate_line_move_forecast({"status": "FORECAST", "q": [0.2, 0.5, 0.3]})
    assert ok["kind"] == "FORECAST"
    with pytest.raises(dossier_mod.ForecastError):
        dossier_mod.validate_line_move_forecast({"status": "FORECAST", "q": [0.2, 0.5, 0.4]})
    with pytest.raises(dossier_mod.ForecastError):
        dossier_mod.validate_line_move_forecast({"status": "FORECAST", "q": [0.2, 0.5]})
    missed = dossier_mod.validate_line_move_forecast({"status": "MISSED_T0", "reason": "T0 predates the store"})
    assert missed["kind"] == "MISSED_T0"


def test_categorize_thresholds():
    assert dossier_mod.categorize(-0.5) == "AWAY"
    assert dossier_mod.categorize(-2.5) == "AWAY"
    assert dossier_mod.categorize(0.0) == "FLAT"
    assert dossier_mod.categorize(0.49) == "FLAT"
    assert dossier_mod.categorize(0.5) == "HOME"


def test_read_of_record(store):
    store.write_dossier(2026, 6, "G", {"premises": []})
    versions = store.dossier_versions(2026, 6, "G")
    authored = versions[0]["authored_utc"]
    assert dossier_mod.t0_read(versions, authored) is not None  # <= T0 includes equality
    assert dossier_mod.t0_read(versions, "2000-01-01T00:00:00Z") is None
    assert dossier_mod.final_read(versions, "2999-01-01T00:00:00Z") is not None
    assert dossier_mod.final_read(versions, authored) is None  # strict < kickoff


# ------------------------------------------------------------------ RPS ---
def test_rps_hand_computed_pins():
    assert lms_mod.rps([1.0, 0.0, 0.0], "AWAY") == 0.0
    assert lms_mod.rps([0.0, 0.0, 1.0], "HOME") == 0.0
    # uniform vs FLAT: Q=(1/3,2/3), O=(0,1) -> 1/2 * (1/9 + 1/9) = 1/9
    assert abs(lms_mod.rps([1 / 3, 1 / 3, 1 / 3], "FLAT") - 1 / 9) < 1e-12
    # fully wrong: q all on HOME, outcome AWAY -> Q=(0,0), O=(1,1) -> 1/2*(1+1) = 1
    assert lms_mod.rps([0.0, 0.0, 1.0], "AWAY") == 1.0


# ------------------------------------------------------------------ LMS ---
REF = [0.25, 0.5, 0.25]


def test_lms_perfect_forecast_positive_skill():
    rows = [
        {"game_id": "g1", "week": "W1", "q": [1.0, 0.0, 0.0], "outcome": "AWAY"},
        {"game_id": "g2", "week": "W1", "q": [0.0, 0.0, 1.0], "outcome": "HOME"},
    ]
    result = lms_mod.lms(rows, REF)
    assert result["status"] == "OK" and result["lms"] == 1.0


def test_lms_reference_forecast_zero_skill():
    rows = [{"game_id": "g1", "week": "W1", "q": list(REF), "outcome": "FLAT"}]
    result = lms_mod.lms(rows, REF)
    assert result["lms"] == 0.0


def test_lms_missing_scores_as_reference():
    rows = [{"game_id": "g1", "week": "W1", "q": None, "outcome": "HOME"}]
    result = lms_mod.lms(rows, REF)
    assert result["missing"] == 1 and result["lms"] == 0.0


def test_lms_pending_excluded_but_counted():
    rows = [{"game_id": "g1", "week": "W1", "q": None, "outcome": None}]
    result = lms_mod.lms(rows, REF)
    assert result["status"] == "NO_RESOLVED_GAMES" and result["pending"] == 1


def test_week_block_bootstrap_insufficient_weeks():
    rows = [{"game_id": "g1", "week": "W1", "q": [1.0, 0.0, 0.0], "outcome": "AWAY"}]
    boot = lms_mod.week_block_bootstrap(rows, REF, b=100)
    assert boot["interval"] is None and boot["status"] == "INSUFFICIENT_WEEKS"


def test_week_block_bootstrap_two_weeks_runs():
    rows = [
        {"game_id": "g1", "week": "W1", "q": [0.9, 0.05, 0.05], "outcome": "AWAY"},
        {"game_id": "g2", "week": "W2", "q": [0.05, 0.05, 0.9], "outcome": "HOME"},
    ]
    boot = lms_mod.week_block_bootstrap(rows, REF, b=200, seed=7)
    assert boot["status"] == "OK" and boot["interval"][0] <= boot["interval"][1]


# -------------------------------------------------------------- manifest ---
def test_manifest_generation(store):
    rec = store.append_jsonl("versions.jsonl", {"kind": "A"})
    manifest = manifest_mod.build_daily_manifest(store, "2026-10-15", [rec["record_sha"]], os.path.abspath(__file__))
    assert manifest["records_stamped_that_day"] == 1
    assert manifest["sha256"] == manifest_mod.manifest_sha([rec["record_sha"]])
    entry = manifest_mod.append_ledger_entry(store, manifest)
    assert entry["type"] == "INTEGRITY" and entry["freeze_hash"] == manifest["sha256"]
    assert store.verify_all() == []


# -------------------------------------------------------------- importer ---
@pytest.mark.skipif(not (os.path.exists(BRIDGE_PATH) and os.path.exists(GRADING_PATH)), reason="seed inputs not present")
def test_importer_dedupes_and_flags_all_legacy(store):
    bridge_doc = importer_mod.load_bridge_doc(BRIDGE_PATH)
    grading = importer_mod.load_grading_records(GRADING_PATH)
    result = importer_mod.import_sources(store, bridge_doc, grading)
    report = result["report"]
    assert report["source_records_read"] == {"bridge_model": 5, "premise_grading_ledger": 8}
    assert report["duplicates_linked"] == 5
    assert report["premises_stored"] == 8
    assert report["imported_clean"] == 0
    assert report["imported_flagged_unresolvable"] == 8
    for premise in result["premises"]:
        assert premise["status"] == "UNRESOLVABLE"
        assert any("probability" in r for r in premise["unresolvable_reasons"])
        assert any("resolution" in r for r in premise["unresolvable_reasons"])


# ------------------------------------------------------------- isolation ---
def _repo_root():
    env = os.environ.get("GSE_REPO_ROOT")
    if env:
        return env
    here = os.path.dirname(os.path.abspath(__file__))
    cur = here
    for _ in range(8):
        if os.path.isdir(os.path.join(cur, "packages", "prediction-engine")):
            return cur
        cur = os.path.dirname(cur)
    return None


PRICING_AREAS = [
    os.path.join("packages", "prediction-engine", "src"),
    os.path.join("packages", "quote-plane"),
    os.path.join("apps", "web", "lib", "pricing"),
    os.path.join("apps", "web", "app", "pricing"),
    os.path.join("apps", "web", "components", "pricing"),
]
FORBIDDEN_SPECIFIERS = ("introspection", "situational-graph", "premise-grading", "reasoning-dossier", "intelligence/")
IMPORT_RE = re.compile(r"""(?:from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"])""")


def test_isolation_no_import_path_into_pricing():
    """SPEC-C §4.9: no import path from introspection/ (or the bridge) into
    any SPEC-B pricing module. Scans import specifiers only (a comment that
    mentions introspection is not an import path)."""
    root = _repo_root()
    assert root is not None, "repo root not found (set GSE_REPO_ROOT)"
    violations = []
    scanned = 0
    for area in PRICING_AREAS:
        base = os.path.join(root, area)
        if not os.path.isdir(base):
            continue
        for dirpath, _dirs, files in os.walk(base):
            if "node_modules" in dirpath:
                continue
            for name in files:
                if not name.endswith((".ts", ".tsx", ".js", ".jsx", ".mts")):
                    continue
                scanned += 1
                with open(os.path.join(dirpath, name), encoding="utf-8", errors="replace") as fh:
                    text = fh.read()
                for m in IMPORT_RE.finditer(text):
                    spec = next(g for g in m.groups() if g)
                    if any(bad in spec for bad in FORBIDDEN_SPECIFIERS):
                        violations.append(f"{os.path.join(dirpath, name)}: imports {spec!r}")
    assert scanned > 0, "no pricing files scanned — the test would be vacuous"
    assert violations == [], "§4.9 isolation violated:\n" + "\n".join(violations)
