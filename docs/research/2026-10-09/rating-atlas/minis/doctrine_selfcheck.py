#!/usr/bin/env python3
"""
doctrine_selfcheck.py — 19-rule verification battery.
Every check either (a) demonstrates the enforcement artifact works, or
(b) ATTEMPTS A VIOLATION and proves the code refuses it.
Run: python3 doctrine_selfcheck.py   -> exit 0 iff all 19 PASS.
"""
import json, math, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from doctrine import (Warehouse, HonestyGate, Anchor, KillLedger, FeatureRegistry,
                      FounderGate, devig, shin_devig, CalibrationLedger, LatencyTracker,
                      CLVLedger, ADPGuard, CollegeGuard, promotion_check, crps_gaussian,
                      build_stack, parse_ts, sha)

RESULTS = []

def check(n, name, fn):
    try:
        fn()
        RESULTS.append((n, name, "PASS", ""))
    except Exception as e:
        RESULTS.append((n, name, "FAIL", f"{type(e).__name__}: {e}"))

def raises(fn, exc=Exception):
    try:
        fn()
    except exc:
        return
    raise AssertionError("expected violation to be REFUSED, but it was allowed")

NOW = 1_700_000_000.0
H = 3600.0

# ---------------------------------------------------------------- fixtures
def make_gate():
    folds = [
        {"fold_id": f"f{i}", "decision_t": NOW + i * H, "outcome": 41.0 + i,
         "close_mu": 41.0 + i, "close_sigma": 13.45}
        for i in range(5)
    ]
    return HonestyGate(folds, "gate_v1")

class Candidate:
    """A model candidate. Its identity() binds its proposed numbers — the verdict
    sha covers exactly this, so an invented number has no verdict."""
    def __init__(self, mu, sigma, name):
        self.mu, self.sigma, self.name = mu, sigma, name
    def identity(self):
        return {"model": self.name, "mu": self.mu, "sigma": self.sigma}
    def predict(self, fold):
        return self.mu, self.sigma

def GoodCandidate():  return Candidate(41.8, 12.0, "good_v1")
def BadCandidate():   return Candidate(41.8, 14.0, "bad_v1")


# RULE 1 — point-in-time warehouse
def r1():
    w = Warehouse("props")
    w.append({"player": "A", "line": 220.5}, NOW)
    w.append({"player": "A", "line": 224.5}, NOW + 2 * H)   # future revision
    v = w.asof(NOW + H)
    assert len(v) == 1 and v[0]["line"] == 220.5, "future row leaked into as-of view"
    raises(lambda: w.append({"player": "B"}, "no-timestamp-here"), ValueError)

# RULE 2 — anchor refuses unproven mu
def r2():
    gate = make_gate()
    a = Anchor(gate, 42.0, 13.45)
    assert a.mu == 42.0 and a.source == "pinnacle"
    v_bad = gate.evaluate(BadCandidate())
    raises(lambda: a.propose_mu(BadCandidate(), v_bad), ValueError)
    v_good = gate.evaluate(GoodCandidate())
    a.propose_mu(GoodCandidate(), v_good)
    assert a.mu == 41.8

# RULE 3 — college guard
def r3():
    g = CollegeGuard()
    clean = {"hfa_cfb": 2.1, "sigma_total_cfb": 16.3}
    assert g.validate(clean, "CFB") is True
    dirty = {"nfl_hfa_ported": 1.56}
    assert g.validate(dirty, "CFB") is False
    raises(lambda: g.require_clean(dirty, "CFB"), ValueError)
    by_value = {"hfa": 1.56}
    assert g.validate(by_value, "CFB") is False, "NFL HFA constant ported by value not caught"

# RULE 4 — PFR surfaces stay diagnostic until kill test
def r4():
    st = {"gate": make_gate(), "kill_ledger": KillLedger()}
    reg = FeatureRegistry(st["gate"], st["kill_ledger"])
    reg.declare("pfr_ybc", "diagnostic", "rule 4")
    reg.declare("pfr_broken_tackles", "diagnostic", "rule 4")
    assert "pfr_ybc" not in reg.margin_head_inputs()
    raises(lambda: reg.promote("pfr_ybc", st["gate"].evaluate(BadCandidate())), ValueError)
    v = st["gate"].evaluate(GoodCandidate())
    reg.promote("pfr_ybc", v)
    assert reg.margin_head_inputs() == ["pfr_ybc"]

# RULE 5 — FTN fingerprints diagnostic
def r5():
    st = {"gate": make_gate(), "kill_ledger": KillLedger()}
    reg = FeatureRegistry(st["gate"], st["kill_ledger"])
    reg.declare("ftn_motion_z", "diagnostic", "rule 5")
    reg.declare("ftn_drop_when_catchable_z", "diagnostic", "rule 5")
    assert reg.margin_head_inputs() == []

# RULE 6 — devig discipline + calibration-weighted pools
def r6():
    # overround book -> shin path
    p1, p2, method = devig(0.548, 0.505)
    assert method == "shin" and abs(p1 + p2 - 1.0) < 1e-6, f"shin devig sum {p1+p2}"
    # sanity: shin shifts probability TOWARD the favorite vs multiplicative
    m1 = 0.548 / 1.053
    assert p1 > m1, "shin should shade the favorite up relative to multiplicative"
    # sub-1 book -> multiplicative fallback ONLY there
    q1, q2, method2 = devig(0.45, 0.48)
    assert method2.startswith("multiplicative"), method2
    # fair book
    _, _, m3 = devig(0.5, 0.5)
    assert "shin" in m3
    # pools: volume-weighted refused; missing calibration refused
    cal = CalibrationLedger()
    cal.record_calibration("pinnacle", 0.97)
    cal.record_calibration("dk", 0.90)
    p = cal.pool({"pinnacle": 0.55, "dk": 0.60}, weight_basis="calibration")
    assert 0.5 < p < 0.6
    raises(lambda: cal.pool({"pinnacle": 0.55}, weight_basis="volume"), ValueError)
    raises(lambda: cal.pool({"fd": 0.55}), ValueError)   # no calibration history

# RULE 7 — injury latency bound
def r7():
    lt = LatencyTracker(hard_bound_s=6 * H)
    lt.record(NOW, NOW + 5 * H)                       # 5h: inside bound
    raises(lambda: lt.record(NOW, NOW + 7 * H), ValueError)  # 7h: bound blown
    m = lt.measured_latency()
    assert m["n"] == 1 and abs(m["mean_s"] - 5 * H) < 1

# RULE 8 — weather/rest are context, not coefficients
def r8():
    st = {"gate": make_gate(), "kill_ledger": KillLedger()}
    reg = FeatureRegistry(st["gate"], st["kill_ledger"])
    reg.declare("wind mph", "context", "rule 8")
    reg.declare("rest days", "context", "rule 8")
    assert reg.margin_head_inputs() == []
    # and no silent promote:
    raises(lambda: reg.promote("wind mph", st["gate"].evaluate(BadCandidate())), ValueError)

# RULE 9 — CLV ledger; promotion on backtest alone refused
def r9():
    clv = CLVLedger()
    assert clv.promotion_supported() is False          # empty ledger = backtest only
    for i in range(12):
        clv.record(f"m{i}", pre_price=-110, close_price=-105, side="over",
                   pre_devig=0.525, close_devig=0.512)
    assert clv.promotion_supported(10) is True
    assert clv.mean_clv() > 0
    v_bad = make_gate().evaluate(BadCandidate())
    ok = promotion_check(v_bad, clv, FounderGate())
    assert ok is False, "backtest-alone promotion slipped through"

# RULE 10 — ADP isolation enforced in code
def r10():
    adp = ADPGuard()
    adp.ingest("mfl", "A.J. Brown", 2.1)
    adp.ingest("ffc", "A.J. Brown", 1.8)
    out = adp.feed("rankings_diagnostic")              # the ONLY legal head
    assert "A.J. Brown" in out
    raises(lambda: adp.feed("win_probability"), ValueError)
    raises(lambda: adp.feed("rating"), ValueError)
    raises(lambda: adp.feed("margin"), ValueError)
    raises(lambda: adp.ingest("betfair", "X", 1.0), ValueError)

# RULE 11 — Novig is a reference, never the close
def r11():
    a = Anchor(make_gate(), 42.0, 13.45)
    raises(lambda: a.set_close("novig", 42.5), ValueError)
    raises(lambda: a.set_close("consensus", 42.5), ValueError)
    a.set_close("pinnacle", 42.2)
    assert a.source == "pinnacle"

# RULE 12 — scheme splits are observed frequencies, diagnostic
def r12():
    st = {"gate": make_gate(), "kill_ledger": KillLedger()}
    reg = FeatureRegistry(st["gate"], st["kill_ledger"])
    for f in ["run_gap_x_box", "man_zone_rate", "blitz_rate_z"]:
        reg.declare(f, "diagnostic", "rule 12")
    assert reg.margin_head_inputs() == []

# RULE 13 — coaching features countable + kill-recorded
def r13():
    kl = KillLedger()
    st = {"gate": make_gate(), "kill_ledger": kl}
    reg = FeatureRegistry(st["gate"], kl)
    reg.declare("chall_per_coach_year", "diagnostic", "rule 13")
    reg.declare("dc_blitz_z", "diagnostic", "rule 13")
    reg.declare("oc_change_shock", "diagnostic", "rule 13")
    assert reg.margin_head_inputs() == []
    # kill path works and is recorded:
    reg.declare("coach_hotseat_idx", "production", "rule 13")
    reg.demote_to_kill("coach_hotseat_idx", "walk_forward_crps_v1",
                       "CRPS worse than close by 0.31", "redo with tenure interaction")
    assert reg.role("coach_hotseat_idx") == "diagnostic"
    assert kl.why("coach_hotseat_idx") and kl.verify_chain()

# RULE 14 — fatigue curve informs live totals only
def r14():
    st = {"gate": make_gate(), "kill_ledger": KillLedger()}
    reg = FeatureRegistry(st["gate"], st["kill_ledger"])
    reg.declare("q_by_q_epa_fatigue", "diagnostic", "rule 14")
    assert reg.margin_head_inputs() == []

# RULE 15 — founder gate flip discipline
def r15():
    f = FounderGate()
    f.report(120, 0.21, 0.04); f.report(130, 0.20, 0.03)
    assert f.can_flip_production() is False            # 2 green != 3
    f.report(110, 0.215, 0.045)
    assert f.can_flip_production() is True             # 3 consecutive green
    f.report(150, 0.30, 0.02)                          # Brier blowout breaks streak
    assert f.can_flip_production() is False
    f.report(120, 0.30, 0.30)                          # n fails
    assert f.can_flip_production() is False

# RULE 16 — kill ledger append-only, tamper-evident
def r16():
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as tf:
        path = tf.name
    kl = KillLedger(path)
    kl.record("featA", "test1", "failed", "reopen if n>=200")
    kl.record("featB", "test2", "failed", "reopen on new data source")
    assert not hasattr(kl, "delete") and not hasattr(kl, "clear"), \
        "kill ledger grew a delete verb — rule 16 broken"
    assert kl.verify_chain()
    # tamper with the file -> chain must break
    with open(path) as f:
        lines = f.readlines()
    e = json.loads(lines[0]); e["result"] = "PASSED-after-the-fact"; lines[0] = json.dumps(e) + "\n"
    with open(path, "w") as f:
        f.writelines(lines)
    kl2 = KillLedger(path)
    assert not kl2.verify_chain(), "tampered kill ledger verified clean"
    os.unlink(path)

# RULE 17 — latency after t is worthless
def r17():
    T = LatencyTracker.usable
    assert T(NOW, NOW + H, NOW + 0.5 * H) is True      # observed pre-decision
    assert T(NOW, NOW + H, NOW + 2 * H) is False       # arrives after t: worthless
    assert T(NOW, NOW + H, NOW - H) is False           # observed before report: bug

# RULE 18 — sigma proposals need evidence
def r18():
    gate = make_gate()
    a = Anchor(gate, 42.0, 13.45)
    raises(lambda: a.propose_sigma(BadCandidate(), gate.evaluate(BadCandidate())), ValueError)
    v = gate.evaluate(GoodCandidate())
    a.propose_sigma(GoodCandidate(), v)
    assert a.sigma == 12.0
    raises(lambda: a.propose_sigma(Candidate(41.8, 9.0, "other_model"), v), ValueError)

# RULE 19 — gate unbypassable: manifest tamper voids, forged verdicts refuse
def r19():
    gate = make_gate()
    a = Anchor(gate, 42.0, 13.45)
    v = gate.evaluate(GoodCandidate())
    assert v.verdict == "PROMOTED"
    # TAMPER with the frozen manifest (invent a friendlier fold list)
    gate._manifest.append({"fold_id": "f99", "decision_t": NOW, "outcome": 0.0,
                           "close_mu": 0.0, "close_sigma": 0.1})
    assert gate.manifest_intact() is False
    raises(lambda: gate.evaluate(GoodCandidate()), RuntimeError)   # gate voids itself
    gate._manifest.pop()                                           # restore the frozen list
    assert gate.manifest_intact() is True
    # forged verdict from a different manifest:
    # forged verdict from a DIFFERENT (intact) manifest:
    folds_b = [{"fold_id": f"b{i}", "decision_t": NOW + i * H, "outcome": 40.0 + i,
                "close_mu": 40.0 + i, "close_sigma": 13.45} for i in range(4)]
    gate_b = HonestyGate(folds_b, "gate_v1")
    assert gate_b.manifest_sha != gate.manifest_sha
    v2 = gate_b.evaluate(GoodCandidate())
    a3 = Anchor(gate, 42.0, 13.45)
    raises(lambda: a3.propose_mu(GoodCandidate(), v2), ValueError)  # wrong manifest sha
    # verdict that doesn't cover the candidate (invented number):
    raises(lambda: a.propose_mu(Candidate(10.0, 12.0, "good_v1"), v), ValueError)

ALL = [
    (1, "point-in-time warehouse (future leak + missing stamp)", r1),
    (2, "anchor: mu stays Pinnacle close until gate PROMOTED", r2),
    (3, "college guard: no NFL constants by key or by value", r3),
    (4, "PFR surfaces diagnostic until kill test clears", r4),
    (5, "FTN fingerprints diagnostic", r5),
    (6, "devig: shin primary / mult sub-1 only / calibration pools", r6),
    (7, "injury latency hard bound", r7),
    (8, "weather/rest = context role enforced", r8),
    (9, "CLV ledger; backtest-alone promotion refused", r9),
    (10, "ADP isolation: feeds rankings_diagnostic ONLY", r10),
    (11, "Novig reference, never the close", r11),
    (12, "scheme splits diagnostic", r12),
    (13, "coaching features + kill-recorded demotion", r13),
    (14, "fatigue curve diagnostic", r14),
    (15, "founder gate: 3 green runs, metric floors", r15),
    (16, "kill ledger append-only + tamper-evident", r16),
    (17, "latency after t = worthless", r17),
    (18, "sigma proposals require PROMOTED verdict coverage", r18),
    (19, "honesty gate: manifest tamper voids; forged verdicts refuse", r19),
]

if __name__ == "__main__":
    for n, name, fn in ALL:
        check(n, name, fn)
    print("=" * 74)
    fails = 0
    for n, name, st, err in RESULTS:
        mark = "PASS" if st == "PASS" else "FAIL"
        print(f"  [{mark}] rule {n:>2}  {name}" + (f"   -> {err}" if err else ""))
        fails += (st != "PASS")
    print("=" * 74)
    print(f"  {len(RESULTS) - fails}/{len(RESULTS)} rules enforced in code. "
          f"{'THE GATE HOLDS.' if fails == 0 else 'DOCTRINE VIOLATION PRESENT.'}")
    sys.exit(1 if fails else 0)
