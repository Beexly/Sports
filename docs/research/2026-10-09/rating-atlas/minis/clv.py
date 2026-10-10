#!/usr/bin/env python3
"""clv.py — Closing Line Value ledger. THE honesty metric of professional betting:
did you beat the closing price? Long-run profit ≈ long-run CLV; without this
ledger, 'I'm up' is survivorship noise.

Ledger ops: add (bet placed), close (market closed), settle (won/lost/push),
report (aggregate: avg CLV, beat-close rate, t-stat vs 0).
State: /var/minis/workspace/clv_ledger.json
CLI: python3 clv.py add|close|settle|report [...]
"""
import json
import math
import os
import sys
import time

LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clv_ledger.json")

def _load():
    if os.path.exists(LEDGER):
        with open(LEDGER) as f:
            return json.load(f)
    return {"bets": []}

def _save(d):
    with open(LEDGER, "w") as f:
        json.dump(d, f, indent=1)

def prob_from_american(amer):
    amer = float(amer)
    return (100 / (amer + 100)) if amer > 0 else ((-amer) / ((-amer) + 100))

def clv_pct(bet_amer, close_amer):
    """CLV% = p(bet)/p(close) − 1. Positive = you beat the close = long-run edge."""
    return prob_from_american(bet_amer) / prob_from_american(close_amer) - 1.0

# ---------- ledger ops ----------
def add(bet_id, market, bet_amer, stake=1.0, note=""):
    d = _load()
    d["bets"].append({"id": bet_id, "market": market, "bet_amer": float(bet_amer),
                      "close_amer": None, "stake": float(stake), "result": None,
                      "ts_add": time.time(), "ts_close": None, "note": note})
    _save(d)
    return f"added {bet_id}: {market} @ {bet_amer:+.0f}, stake {stake}"

def close(bet_id, close_amer):
    d = _load()
    for b in d["bets"]:
        if b["id"] == bet_id:
            b["close_amer"] = float(close_amer)
            b["ts_close"] = time.time()
            b["clv"] = clv_pct(b["bet_amer"], float(close_amer))
            _save(d)
            return f"{bet_id} closed @ {close_amer:+.0f} | CLV {b['clv']*100:+.2f}%"
    return f"no bet {bet_id}"

def settle(bet_id, result):
    """result: w / l / p"""
    d = _load()
    for b in d["bets"]:
        if b["id"] == bet_id:
            b["result"] = result
            _save(d)
            return f"{bet_id} settled: {result}"
    return f"no bet {bet_id}"

def report():
    d = _load()
    bets = [b for b in d["bets"] if b.get("clv") is not None]
    if not bets:
        return "CLV ledger empty (add/close bets first)"
    clvs = [b["clv"] for b in bets]
    n = len(clvs)
    mean = sum(clvs) / n
    sd = (sum((c - mean) ** 2 for c in clvs) / (n - 1)) ** 0.5 if n > 1 else 0.0
    t = mean / (sd / math.sqrt(n)) if sd > 0 and n > 1 else 0.0
    beat = sum(1 for c in clvs if c > 0) / n
    # profit check on settled bets
    settled = [b for b in bets if b.get("result") in ("w", "l", "p")]
    profit = 0.0
    for b in settled:
        stake = b.get("stake", 1.0)
        amer = b["bet_amer"]
        if b["result"] == "w":
            profit += stake * ((amer / 100) if amer > 0 else (100 / -amer))
        elif b["result"] == "l":
            profit -= stake
        # push: 0
    lines = [
        f"CLV LEDGER — {n} bets with closes",
        f"avg CLV: {mean*100:+.2f}%  (beat-close rate {beat*100:.0f}%)",
        f"t-stat vs 0: {t:+.2f}  ({'SIGNIFICANT' if abs(t) > 2 else 'not yet significant'} at n={n})",
    ]
    if settled:
        lines.append(f"settled P&L: {profit:+.2f}u on {len(settled)} bets")
    # show recent
    for b in bets[-5:]:
        lines.append(f"  {b['id']}: {b['market'][:30]} bet {b['bet_amer']:+.0f} → close {b['close_amer']:+.0f} | CLV {b['clv']*100:+.2f}%")
    return "\n".join(lines)

def demo():
    """Seed a demo ledger showing what the report looks like with data."""
    demo_bets = [
        ("d1", "KC -3 @ -110", -110, -120, "w"),
        ("d2", "o47.5 @ -110", -110, -105, "l"),
        ("d3", "BUF ML @ +150", 150, 135, "w"),
        ("d4", "SF -7 @ -105", -105, -118, "l"),
        ("d5", "DAL +2.5 @ -110", -110, -100, "p"),
        ("d6", "u42.5 @ -110", -110, -122, "w"),
        ("d7", "PHI -1 @ -115", -115, -125, "w"),
        ("d8", "NYG +7 @ +105", 105, 95, "l"),
    ]
    for bid, mkt, bet, cl, res in demo_bets:
        add(bid, mkt, bet, stake=1.0)
        close(bid, cl)
        settle(bid, res)
    return report()

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    if cmd == "add" and len(sys.argv) >= 5:
        print(add(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else 1.0))
    elif cmd == "close" and len(sys.argv) >= 4:
        print(close(sys.argv[2], sys.argv[3]))
    elif cmd == "settle" and len(sys.argv) >= 4:
        print(settle(sys.argv[2], sys.argv[3]))
    elif cmd == "demo":
        print(demo())
    else:
        print(report())
