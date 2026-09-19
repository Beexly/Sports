#!/usr/bin/env python3
"""Self-audit / self-improve loop — one pass. Designed to be re-invoked on a schedule.

Each pass:
  1. RUN suite + selftest + key instruments
  2. AUDIT outputs vs pre-registered kill lines
  3. IMPROVE: write next-actions JSON from failures (never just 'no')
  4. SCORE: coverage/coupling/CLV/e-process snapshot
  5. LEDGER: append one-line progress to LOOP_LEDGER.md
  6. EXIT code 0 always after logging (loop continues); 2 only if input missing

Does not flip gates. Does not invent DB rows. Failures become next-actions.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

STATS = Path(__file__).resolve().parent
OUT = STATS / "out"
INP = STATS / "incoming" / "board-export.jsonl"
LEDGER = STATS / "LOOP_LEDGER.md"
NEXT = OUT / "loop_next_actions.json"
SUMMARY = OUT / "loop_pass_summary.json"
PY = sys.executable


def run(cmd):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return {"cmd": " ".join(map(str, cmd)), "exit": p.returncode, "tail": (p.stdout or "")[-400:]}
    except Exception as e:
        return {"cmd": " ".join(map(str, cmd)), "exit": -1, "error": str(e)}


def load_json(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def audit(results, artifacts):
    kills = []
    actions = []
    score = {}

    # suite
    suite_ok = all(r["exit"] == 0 for r in results if "run_mimo_suite" in r["cmd"] or "selftest" in r["cmd"] or True)
    # more precise
    for r in results:
        if "selftest" in r["cmd"] and r["exit"] != 0:
            actions.append({"why": "selftest failed", "cmd": r["cmd"], "replace": "fix stats_json/runner until PASS"})
        if "run_mimo_suite" in r["cmd"] and r["exit"] != 0:
            actions.append({"why": "suite exit!=0", "cmd": r["cmd"], "replace": "read out/* status DATA_BLOCKED vs EMPTY vs error"})

    cqr = artifacts.get("mondrian_cqr_v2_results") or artifacts.get("mondrian_cqr_v2") or {}
    best = cqr.get("best") or {}
    k3 = best.get("k3_coverage")
    if k3 is not None:
        score["k3_best_cov"] = k3
        if k3 < 0.85:
            kills.append({"metric": "K3_margin_band", "value": k3, "line": 0.85, "verdict": "KILL_band_model"})
            actions.append(
                {
                    "why": "K3 OOT < 0.85",
                    "replace": "use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals",
                    "owned": ["owned_nflverse_weather_props.py", "owned_replacement_engine.py"],
                }
            )

    hexj = artifacts.get("resolved_game_ids_v2") or artifacts.get("resolved_game_ids") or {}
    rate = hexj.get("resolution_rate")
    if rate is not None:
        score["hex32_resolve_rate"] = rate
        if rate < 1.0:
            actions.append(
                {
                    "why": f"hex32 resolve {rate:.4f} < 1.0",
                    "replace": "retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases",
                    "n_unresolved": hexj.get("unresolved"),
                }
            )

    ml = artifacts.get("moneyline_clv_turnaround") or {}
    base = ((ml.get("baseline") or {}).get("non_push") or {}).get("rate")
    if base is not None:
        score["ml_clv_nonpush"] = base
        if base < 0.50:
            actions.append(
                {
                    "why": f"ML CLV {base:.3f} < 0.50",
                    "replace": "e-process + logit-pool gates; totals-first product; no ML beat-close claim",
                    "owned": ["owned_replacement_engine.py", "ml_gate_totals_eprocess.py"],
                }
            )

    ore = artifacts.get("owned_replacement_engine") or {}
    pool = ore.get("logit_pool_by_market") or {}
    score["logit_pool_totals"] = (pool.get("TOTAL") or {}).get("verdict")
    score["logit_pool_ml"] = (pool.get("MONEYLINE") or {}).get("verdict")
    if score.get("logit_pool_totals") == "MODEL_ADDS_INFORMATION":
        actions.append(
            {
                "why": "totals add info vs market (logit-pool)",
                "replace": "advance totals density/CRPS path + e-process accumulation; keep kill lines",
                "positive": True,
            }
        )

    wx = artifacts.get("owned_nflverse_weather_props") or {}
    cells = wx.get("weather_mondrian_oot") or []
    ok_cells = [c for c in cells if c.get("coverage_oot") is not None and c["coverage_oot"] >= 0.85]
    score["weather_bins_ge_085"] = f"{len(ok_cells)}/{len(cells)}"
    if cells and len(ok_cells) == len(cells):
        actions.append(
            {
                "why": "weather Mondrian all bins OOT>=0.85",
                "replace": "promote weather/roof residual bands as NFL margin UQ replacement",
                "positive": True,
            }
        )

    ep_tot = ((ore.get("eprocess_by_bucket") or {}).get("ALL|TOTAL") or {})
    score["eprocess_totals_Mmax"] = ep_tot.get("M_max")
    if ep_tot.get("M_max") is not None and ep_tot["M_max"] < 20:
        actions.append(
            {
                "why": f"totals e-process M_max={ep_tot.get('M_max')} < 20",
                "replace": "accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet",
            }
        )

    if not INP.exists():
        actions.append({"why": "board-export missing", "replace": "founder/ops run board-export.mjs"})

    return kills, actions, score


def main():
    ts = datetime.now(timezone.utc).isoformat()
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    if not STATS.joinpath("run_mimo_suite.py").exists():
        print(json.dumps({"ok": False, "status": "NO_SUITE"}))
        return 2

    results.append(run([PY, str(STATS / "stats_lane_selftest.py")]))
    results.append(run([PY, str(STATS / "run_mimo_suite.py")]))
    for name, script, extra in [
        ("mondrian_cqr_v2_results", "mondrian_cqr_v3.py", []),
        ("moneyline_clv_turnaround", "moneyline_clv_turnaround.py", []),
        ("owned_replacement_engine", "owned_replacement_engine.py", []),
        ("owned_nflverse_weather_props", "owned_nflverse_weather_props.py", ["--games", r"C:\Users\Garrett\nfl_ot\games.csv"]),
        ("resolved_game_ids_v2", None, None),  # skip rerun if heavy — load existing
    ]:
        if script is None:
            continue
        outp = OUT / f"{name}.json"
        cmd = [PY, str(STATS / script), "--input", str(INP), "--out", str(outp)]
        if script == "owned_nflverse_weather_props.py":
            cmd = [PY, str(STATS / script)] + extra + ["--out", str(outp)]
        if script in ("owned_replacement_engine.py", "owned_nflverse_weather_props.py"):
            if script == "owned_replacement_engine.py":
                cmd = [PY, str(STATS / script), "--input", str(INP), "--out", str(outp)]
        results.append(run(cmd))

    artifacts = {}
    for p in OUT.glob("*.json"):
        artifacts[p.stem] = load_json(p)

    kills, actions, score = audit(results, artifacts)
    summary = {
        "ok": True,
        "ts": ts,
        "results": [{k: v for k, v in r.items() if k != "tail"} for r in results],
        "kill_line_hits": kills,
        "score_snapshot": score,
        "next_actions": actions,
        "loop_policy": "Failures become replacements; never stop at no; re-run this pass on schedule",
    }
    SUMMARY.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    NEXT.write_text(json.dumps({"ts": ts, "actions": actions}, indent=2), encoding="utf-8")

    line = f"\n- **{ts}** suite exits={[r['exit'] for r in results]} kills={len(kills)} actions={len(actions)} score={json.dumps(score, default=str)}"
    header = "# MIMO self-audit loop ledger\n"
    if not LEDGER.exists():
        LEDGER.write_text(header, encoding="utf-8")
    with LEDGER.open("a", encoding="utf-8") as f:
        f.write(line)
        for k in kills:
            f.write(f"\n  - KILL {k}")
        for a in actions[:8]:
            f.write(f"\n  - NEXT {a.get('why')} → {str(a.get('replace'))[:120]}")

    print(json.dumps({"ok": True, "ts": ts, "kills": len(kills), "actions": len(actions), "score": score}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
