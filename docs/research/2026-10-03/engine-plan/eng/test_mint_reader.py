from sheet_mint import get, ids, source

def test_get_callable():
    fn = get("js_41")
    assert callable(fn)
    assert abs(fn([1, 0], [0, 1], [0.5, 0.5]) - 1) < 1e-9

def test_ids_sorted():
    got = ids()
    assert got == sorted(got)
    assert "js_41" in got and "herbrich_hinge" not in got

def test_unknown_none():
    assert get("herbrich_hinge") is None
    assert get("kalman_update") is None
    assert get("murphy_brier") is None
    assert get("timesoccer_nll") is None
    assert source("nope") is None

def test_source():
    s = source("js_41")
    assert s["footer"] == 147 and s["equation_number"] == "4.1" and s["log_base"] == 2
