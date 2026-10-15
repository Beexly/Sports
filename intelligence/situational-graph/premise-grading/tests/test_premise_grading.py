"""
test_premise_grading.py — premise-grading ledger + scorer v1 contract tests
(pytest).

Run: python3 -m pytest intelligence/situational-graph/premise-grading/tests/test_premise_grading.py

The contract families, matching the build's hard fences:
  1. schema validation — malformed records are rejected (missing fields,
     bad enums, forbidden extra keys, broken grading discipline).
  2. dedupe / linking — two sources stating the same premise for a game
     produce ONE ledger record with both sources linked, never two rows.
  3. PENDING discipline — no outcome without an outcome artifact: grading
     refuses an absent artifact, a wrong-game artifact, an unknown
     premise, a REFUTED grade with no miss class, and any re-grade.
  4. aggregate math — per-type counts and the calibration table on
     synthetic graded fixtures, including the empty-cell rule (a class
     with no decisive grades has support_rate None, never smoothed).
  5. append-only integrity — grading only appends (the pre-grade bytes
     are a strict prefix), and a grade that rewrote the premise itself is
     caught by chain validation.
Plus: the seeded SEA@DEN ledger state — 8 premises, all PENDING, the
aggregate report honestly empty until tonight's game is graded.
"""

import copy
import json
import sys
import tempfile
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
PKG = HERE.parent
sys.path.insert(0, str(PKG))

import premise_grading as pg  # noqa: E402

BRIDGE_INPUT = PKG / "inputs" / "2026-week06-sea-at-den.bridge-premises.json"
READS_INPUT = PKG / "inputs" / "2026-week06-sea-at-den.wo0-premises.json"
SEEDED_LEDGER = PKG / "ledger" / "premise-grades.jsonl"
GAME = "2026_06_SEA_DEN"
COMPOSITE_ID = "premise:2026_06_SEA_DEN:altitude_short_week:SEA"
REST_ID = "premise:2026_06_SEA_DEN:rest_differential"
INJURY_ID = "premise:2026_06_SEA_DEN:injury_asymmetry:DEN"


def valid_record():
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl",
                                     delete=False) as f:
        records = pg.ingest(BRIDGE_INPUT, READS_INPUT, f.name)
    return copy.deepcopy(records[0])


def write_ledger(path, records):
    with open(path, "w", encoding="utf-8") as f:
        for i, rec in enumerate(records, start=1):
            rec = copy.deepcopy(rec)
            rec["ledger_seq"] = i
            f.write(json.dumps(rec, sort_keys=True) + "\n")
    return path


def pending(premise_id, ptype, cc, game=GAME):
    return pg._pending_record(
        premise_id=premise_id, game_key=game, premise_type=ptype,
        subject="game:" + game, statement=f"Statement for {premise_id}.",
        direction="NEUTRAL", magnitude_band=None, confidence_class=cc,
        stated_uncertainty="Stated plainly.",
        evidence=[{"kind": "test", "ref": "fixture", "as_of": "2026-10-15"}],
        sources=[{"kind": "test", "ref": "fixture",
                  "source_premise_id": premise_id}],
        as_of="2026-10-15", notes="fixture")


def artifact(path, verdict, game=GAME, miss=None, fact="The realized fact."):
    doc = {"game_key": game, "verdict": verdict, "realized_fact": fact,
           "graded_at": "2026-10-16"}
    if miss is not None:
        doc["miss_magnitude_class"] = miss
    Path(path).write_text(json.dumps(doc), encoding="utf-8")
    return path


# ----------------------------------------------------------------------
# 1. Schema validation
# ----------------------------------------------------------------------

def test_valid_record_passes():
    assert pg.validate_record(valid_record(), pg.load_schema()) == []


@pytest.mark.parametrize("mutate", [
    lambda r: r.pop("statement"),                       # missing required
    lambda r: r.update(direction="SIDEWAYS"),           # bad enum
    lambda r: r.update(probability=0.5),                # forbidden extra key
    lambda r: r.update(confidence_class="CERTAIN"),     # bad enum
    lambda r: r.update(evidence=[]),                    # no evidence links
    lambda r: r.update(graded_at="2026-10-16"),         # PENDING + graded_at
    lambda r: r["outcome"].update(verdict="SUPPORTED"),  # PENDING + verdict
    lambda r: r.update(miss_magnitude_class="SMALL"),   # PENDING + miss
    lambda r: r.update(ledger_seq=0),                   # seq below minimum
])
def test_malformed_records_rejected(mutate):
    rec = valid_record()
    mutate(rec)
    assert pg.validate_record(rec, pg.load_schema()) != []


def graded_record(verdict, miss):
    rec = valid_record()
    rec["status"] = "GRADED"
    rec["outcome"] = {"verdict": verdict, "realized_fact": "It happened.",
                      "outcome_artifact": "artifact.json"}
    rec["graded_at"] = "2026-10-16"
    rec["grader_id"] = "test-grader"
    rec["miss_magnitude_class"] = miss
    return rec


@pytest.mark.parametrize("verdict,miss,ok", [
    ("SUPPORTED", "NONE", True),
    ("REFUTED", "SMALL", True),
    ("REFUTED", "LARGE", True),
    ("UNRESOLVED", None, True),
    ("REFUTED", None, False),       # refuted needs a miss class
    ("REFUTED", "NONE", False),
    ("SUPPORTED", "SMALL", False),  # supported has no miss
    ("UNRESOLVED", "NONE", False),  # unresolved establishes no miss
])
def test_grading_discipline_matrix(verdict, miss, ok):
    errs = pg.validate_record(graded_record(verdict, miss), pg.load_schema())
    assert (errs == []) == ok, errs


def test_graded_without_realized_fact_rejected():
    rec = graded_record("SUPPORTED", "NONE")
    rec["outcome"]["realized_fact"] = None
    assert pg.validate_record(rec, pg.load_schema()) != []
    rec = graded_record("SUPPORTED", "NONE")
    rec["outcome"]["outcome_artifact"] = None
    assert pg.validate_record(rec, pg.load_schema()) != []


# ----------------------------------------------------------------------
# 2. Dedupe / linking
# ----------------------------------------------------------------------

def test_ingest_seed_shape(tmp_path):
    records = pg.ingest(BRIDGE_INPUT, READS_INPUT, tmp_path / "seed.jsonl")
    assert len(records) == 8  # 5 bridge + 5 read - 2 deduped
    assert all(r["status"] == "PENDING" for r in records)
    assert all(r["game_key"] == GAME for r in records)
    keys = [(r["game_key"], r["premise_type"]) for r in records]
    assert len(keys) == len(set(keys))  # no (game, type) counted twice


def test_deduped_premises_link_both_sources(tmp_path):
    records = pg.ingest(BRIDGE_INPUT, READS_INPUT, tmp_path / "seed.jsonl")
    by_id = {r["premise_id"]: r for r in records}
    for pid in (COMPOSITE_ID, REST_ID):
        rec = by_id[pid]
        kinds = [s["kind"] for s in rec["sources"]]
        assert kinds == ["bridge_model", "layer2_read"], pid
        assert "Corroborating Layer 2 read" in rec["stated_uncertainty"]
        assert "DEDUPED" in rec["notes"]
    # the read's own premise ids survive as linked source ids
    src_ids = [s["source_premise_id"] for s in by_id[COMPOSITE_ID]["sources"]]
    assert "premise:2026_06_SEA_DEN:wo0:altitude_short_week_composite" \
        in src_ids


def test_bridge_only_and_read_only_premises(tmp_path):
    records = pg.ingest(BRIDGE_INPUT, READS_INPUT, tmp_path / "seed.jsonl")
    by_id = {r["premise_id"]: r for r in records}
    assert len(by_id["premise:2026_06_SEA_DEN:coaching_continuity:DEN"]
               ["sources"]) == 1
    injury = by_id[INJURY_ID]
    assert injury["direction"] == "FAVORS_AWAY"
    assert injury["confidence_class"] == "QUALITATIVE"
    assert "The read is qualitative" in injury["stated_uncertainty"]
    assert by_id["premise:2026_06_SEA_DEN:pass_discipline"]["direction"] \
        == "NO_BET"


def test_ingest_deterministic(tmp_path):
    a, b = tmp_path / "a.jsonl", tmp_path / "b.jsonl"
    pg.ingest(BRIDGE_INPUT, READS_INPUT, a)
    pg.ingest(BRIDGE_INPUT, READS_INPUT, b)
    assert a.read_bytes() == b.read_bytes()


def test_ingest_direction_conflict_refused(tmp_path):
    doc = json.loads(READS_INPUT.read_text(encoding="utf-8"))
    for p in doc["premises"]:
        if p["type"] == "rest_differential":
            p["direction"] = "FAVORS_HOME"
    bad = tmp_path / "reads.json"
    bad.write_text(json.dumps(doc), encoding="utf-8")
    with pytest.raises(pg.Refusal):
        pg.ingest(BRIDGE_INPUT, bad, tmp_path / "out.jsonl")


# ----------------------------------------------------------------------
# 3. PENDING discipline — no outcome without an outcome artifact
# ----------------------------------------------------------------------

def test_grade_refuses_absent_artifact(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    with pytest.raises(pg.Refusal, match="outcome artifact absent"):
        pg.grade(ledger, "p:1", tmp_path / "nope.json", "grader")


def test_grade_refuses_wrong_game_artifact(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    art = artifact(tmp_path / "a.json", "SUPPORTED", game="2026_06_OTHER")
    with pytest.raises(pg.Refusal, match="does not match"):
        pg.grade(ledger, "p:1", art, "grader")


def test_grade_refuses_unknown_premise(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    art = artifact(tmp_path / "a.json", "SUPPORTED")
    with pytest.raises(pg.Refusal, match="not in ledger"):
        pg.grade(ledger, "p:ghost", art, "grader")


def test_grade_refuses_empty_realized_fact(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    art = artifact(tmp_path / "a.json", "SUPPORTED", fact="  ")
    with pytest.raises(pg.Refusal, match="realized_fact"):
        pg.grade(ledger, "p:1", art, "grader")


def test_grade_refuses_refuted_without_miss_class(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    art = artifact(tmp_path / "a.json", "REFUTED")
    with pytest.raises(pg.Refusal, match="miss_magnitude_class"):
        pg.grade(ledger, "p:1", art, "grader")


def test_grade_happy_path_and_no_regrade(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    art = artifact(tmp_path / "a.json", "REFUTED", miss="MODERATE")
    graded = pg.grade(ledger, "p:1", art, "grader-7")
    assert graded["status"] == "GRADED"
    assert graded["outcome"]["verdict"] == "REFUTED"
    assert graded["miss_magnitude_class"] == "MODERATE"
    assert graded["grader_id"] == "grader-7"
    state = pg.fold(pg.read_ledger(ledger))
    assert state[0]["outcome"]["verdict"] == "REFUTED"
    assert pg.validate_ledger(ledger) == []
    with pytest.raises(pg.Refusal, match="already graded"):
        pg.grade(ledger, "p:1", art, "grader-7")


# ----------------------------------------------------------------------
# 4. Aggregate math on synthetic graded fixtures
# ----------------------------------------------------------------------

@pytest.fixture
def synthetic_ledger(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl", [
        pending("p:a", "friction_x", "CORROBORATED"),
        pending("p:b", "friction_x", "CORROBORATED"),
        pending("p:c", "friction_x", "CORROBORATED"),
        pending("p:d", "weather_y", "QUALITATIVE"),
        pending("p:e", "weather_y", "QUALITATIVE"),
    ])
    pg.grade(ledger, "p:a", artifact(tmp_path / "a.json", "SUPPORTED"), "g")
    pg.grade(ledger, "p:b", artifact(tmp_path / "b.json", "SUPPORTED"), "g")
    pg.grade(ledger, "p:c", artifact(tmp_path / "c.json", "REFUTED",
                                     miss="SMALL"), "g")
    pg.grade(ledger, "p:d", artifact(tmp_path / "d.json", "UNRESOLVED"), "g")
    return ledger


def test_aggregate_counts(synthetic_ledger):
    rep = pg.report(pg.read_ledger(synthetic_ledger))
    assert rep["totals"] == {"premises": 5, "PENDING": 1, "SUPPORTED": 2,
                             "REFUTED": 1, "UNRESOLVED": 1}
    assert rep["by_premise_type"]["friction_x"] == \
        {"PENDING": 0, "SUPPORTED": 2, "REFUTED": 1, "UNRESOLVED": 0}
    assert rep["by_premise_type"]["weather_y"] == \
        {"PENDING": 1, "SUPPORTED": 0, "REFUTED": 0, "UNRESOLVED": 1}


def test_calibration_math_and_empty_cell_rule(synthetic_ledger):
    rep = pg.report(pg.read_ledger(synthetic_ledger))
    cal = rep["calibration_by_confidence_class"]
    assert cal["CORROBORATED"]["decisive"] == 3
    assert cal["CORROBORATED"]["support_rate"] == pytest.approx(2 / 3)
    # QUALITATIVE has an UNRESOLVED and a PENDING but zero decisive
    # grades: the support rate stays empty (None) — no smoothing, and
    # UNRESOLVED is not smuggled into the denominator.
    assert cal["QUALITATIVE"]["decisive"] == 0
    assert cal["QUALITATIVE"]["support_rate"] is None
    assert "—" in pg.report_text(rep)


# ----------------------------------------------------------------------
# 5. Append-only integrity
# ----------------------------------------------------------------------

def test_grading_only_appends(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    before = Path(ledger).read_bytes()
    pg.grade(ledger, "p:1", artifact(tmp_path / "a.json", "SUPPORTED"), "g")
    after = Path(ledger).read_bytes()
    assert after.startswith(before) and len(after) > len(before)


def test_grade_never_rewrites_the_premise(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED")])
    pg.grade(ledger, "p:1", artifact(tmp_path / "a.json", "SUPPORTED"), "g")
    lines = Path(ledger).read_text(encoding="utf-8").splitlines()
    tampered = json.loads(lines[1])
    tampered["statement"] = "A different claim, retrofitted after the game."
    lines[1] = json.dumps(tampered, sort_keys=True)
    Path(ledger).write_text("\n".join(lines) + "\n", encoding="utf-8")
    errs = pg.validate_ledger(ledger)
    assert any("rewrote immutable field statement" in e for e in errs)


def test_broken_seq_chain_detected(tmp_path):
    ledger = write_ledger(tmp_path / "l.jsonl",
                          [pending("p:1", "t", "STAMPED"),
                           pending("p:2", "t", "STAMPED")])
    lines = Path(ledger).read_text(encoding="utf-8").splitlines()
    rec = json.loads(lines[1])
    rec["ledger_seq"] = 7
    lines[1] = json.dumps(rec, sort_keys=True)
    Path(ledger).write_text("\n".join(lines) + "\n", encoding="utf-8")
    assert pg.validate_ledger(ledger) != []


# ----------------------------------------------------------------------
# Seeded ledger: tonight's state, honestly empty
# ----------------------------------------------------------------------

def test_seeded_ledger_all_pending():
    assert pg.validate_ledger(SEEDED_LEDGER) == []
    records = pg.read_ledger(SEEDED_LEDGER)
    assert len(records) == 8
    for rec in records:
        assert rec["status"] == "PENDING"
        assert rec["outcome"] == {"verdict": "PENDING",
                                  "realized_fact": None,
                                  "outcome_artifact": None}
        assert rec["graded_at"] is None and rec["grader_id"] is None
    rep = pg.report(records)
    assert rep["totals"]["premises"] == 8
    assert rep["totals"]["PENDING"] == 8
    for cal in rep["calibration_by_confidence_class"].values():
        assert cal["support_rate"] is None  # nothing graded, nothing faked
