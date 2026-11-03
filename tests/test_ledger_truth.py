import json
from pathlib import Path

LEDGER = Path(__file__).resolve().parents[1] / "data" / "engine" / "new_engine_official_ledger_2026.json"


def _load():
    return json.loads(LEDGER.read_text(encoding="utf-8"))


def test_verified_record_math():
    d = _load()
    vr = d["verified_record"]
    assert vr["wins"] + vr["losses"] + vr["pushes"] == vr["total_graded"] == 50
    legs = vr["component_legs"]
    wins = sum(l["wins"] for l in legs)
    losses = sum(l["losses"] for l in legs)
    pushes = sum(l["pushes"] for l in legs)
    net = sum(float(l["net_units"].rstrip("u")) for l in legs)
    assert (wins, losses, pushes) == (36, 13, 1)
    assert abs(net - 20.14) < 1e-9


def test_tnf_reconciles_rows_to_settlement():
    d = _load()
    rows = d["tonight_pending_card_car_at_gb"]
    w = sum(1 for r in rows if r["result"] == "WIN")
    l = sum(1 for r in rows if r["result"] == "LOSS")
    s = sum(1 for r in rows if r["result"] in ("SPLIT", "PUSH"))
    settle = d["tnf_settlement"]["official_card"]
    assert (w, l, s) == (settle["wins"], settle["losses"], settle["splits"]) == (14, 6, 1)


def test_old_banner_is_superseded_not_live():
    d = _load()
    assert "31-11" not in json.dumps(d["verified_record"])
    banners = [s["banner"] for s in d.get("superseded", [])]
    assert any("31-11-0" in b for b in banners)


def test_leg_provenance_present():
    d = _load()
    for leg in d["verified_record"]["component_legs"]:
        assert leg["source"], leg
        assert isinstance(leg["source"], str) and len(leg["source"]) > 10, leg


def test_secondary_views_labeled():
    d = _load()
    for v in d.get("secondary_views", []):
        assert v["record_class"] == "secondary_view"
    assert not any("60-26-0" in json.dumps(v) for v in d.get("secondary_views", []))
    records = {v["record"]: v["net_units"] for v in d.get("secondary_views", [])}
    assert records.get("38-13-1") == "+22.85u"
    assert records.get("47-19-1") == "+24.92u"

