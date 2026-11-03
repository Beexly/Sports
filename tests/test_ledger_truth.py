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
    assert records.get("40-15-1") == "+22.50u"
    assert records.get("38-13-1") == "+22.85u"
    assert records.get("47-19-1") == "+24.92u"


def test_mnf_6_tickets_reconcile_line_by_line_to_both_views():
    d = _load()
    mnf = d["mnf_chi_at_sea_2026_11_02"]
    tickets = mnf["tickets"]
    assert len(tickets) == 6
    w = sum(1 for t in tickets if t["result"] == "WIN")
    l = sum(1 for t in tickets if t["result"] == "LOSS")
    p = sum(1 for t in tickets if t["result"] == "PUSH")
    assert (w, l, p) == (4, 2, 0)

    staked_usd = round(sum(t["stake_usd"] for t in tickets), 2)
    payout_usd = round(sum(t["payout_usd"] for t in tickets), 2)
    profit_usd = round(sum(t["profit_usd"] for t in tickets), 2)
    net_u_all = round(sum(t["net_units"] for t in tickets), 3)
    assert staked_usd == 40.00
    assert payout_usd == 51.81
    assert profit_usd == 11.81
    assert net_u_all == 2.362
    assert round(net_u_all, 2) == 2.36

    main_tickets = [t for t in tickets if t["category"] == "Game Line"]
    assert len(main_tickets) == 2
    net_u_main = round(sum(t["net_units"] for t in main_tickets), 3)
    assert net_u_main == 2.708
    assert round(net_u_main, 2) == 2.71

    # Reconcile against pre-MNF base 36-13-1 (+20.14u)
    assert round(20.14 + round(net_u_all, 2), 2) == 22.50
    assert round(20.14 + round(net_u_main, 2), 2) == 22.85
    assert round(22.56 + round(net_u_all, 2), 2) == 24.92


