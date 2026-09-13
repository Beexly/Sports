#!/usr/bin/env python3
"""CP-SAT oracle for the DFS lineup optimizer.

Why this exists: `apps/web/lib/fantasy/dfs-optimizer.ts` is a randomized
multi-start + hill-climb heuristic. It is fast enough for the browser, but a
heuristic has no optimality guarantee, and the product claims a *best* lineup.
This script builds an independent integer-programming model of the same problem
(OR-Tools CP-SAT) and measures the exact regret of the shipped engine.

It is dev-only tooling: nothing here ships to the app, and it is not imported by
any runtime route.

  python scripts/dfs/oracle.py                 # shipped slate, 3 modes x stack on/off
  python scripts/dfs/oracle.py --synthetic 12  # + random slates, seeded
  python scripts/dfs/oracle.py --json out.json

Exit code is 1 when the shipped engine is beaten anywhere (a real falsifier).
"""

from __future__ import annotations

import argparse
import json
import os
import random
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WEB_DIR = os.path.join(REPO_ROOT, "apps", "web")
PROBE = os.path.join("scripts", "dfs-heuristic-probe.ts")

SLOTS = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]
CAP = 50000
FLEX_ELIGIBLE = {"RB", "WR", "TE"}
POSITIONS = ["QB", "RB", "WR", "TE", "DST"]

# CP-SAT needs integer coefficients; the leverage objective divides by
# (own * 100 + 1.5). Scale so the rounding error is far below any real gap.
SCALE = 10 ** 6
TOL = 1e-6  # objective units per lineup (nine players, single digits each)

TEAMS = ["PHI", "BAL", "CIN", "DET", "GB", "SEA", "LAR", "ATL", "TB", "SF",
         "HOU", "IND", "DEN", "LV", "MIA", "NYJ", "BUF", "KC", "DAL", "JAX",
         "NYG", "WAS"]


def eligible(player: dict, slot: str) -> bool:
    return player["pos"] in FLEX_ELIGIBLE if slot == "FLEX" else player["pos"] == slot


def obj_value(player: dict, mode: str) -> float:
    """Mirrors objVal() in apps/web/lib/fantasy/dfs-optimizer.ts exactly."""
    if mode == "cash":
        return float(player["proj"])
    if mode == "gpp":
        return float(player["ceiling"])
    return float(player["ceiling"]) / (player["own"] * 100 + 1.5) * 6 + player["ceiling"] * 0.45


def lineup_objective(lineup: list[dict], mode: str) -> float:
    return sum(obj_value(p, mode) for p in lineup)


def valid_lineup(lineup: list[dict], cap: int = CAP) -> tuple[bool, str]:
    """Independent structural check (does not trust the engine's own validator)."""
    if len(lineup) != len(SLOTS):
        return False, f"size {len(lineup)} != {len(SLOTS)}"
    if len({p["id"] for p in lineup}) != len(lineup):
        return False, "duplicate player"
    if sum(p["salary"] for p in lineup) > cap:
        return False, "over cap"
    for slot, player in zip(SLOTS, lineup):
        if not eligible(player, slot):
            return False, f"{player['id']} ({player['pos']}) illegal in {slot}"
    return True, "ok"


def stacks(lineup: list[dict]) -> int:
    """Same-team WR/TE count for the lineup's QB (the engine's stack metric)."""
    qb = next((p for p in lineup if p["pos"] == "QB"), None)
    if not qb:
        return 0
    return sum(1 for p in lineup
               if p["id"] != qb["id"] and p["team"] == qb["team"] and p["pos"] in ("WR", "TE"))


def solve_optimum(slate: list[dict], mode: str, stack: bool,
                  locks: set[str], excludes: set[str], cap: int = CAP,
                  time_limit: float = 30.0) -> tuple[float, list[dict]]:
    """Exact optimum over the same constraints the engine enforces."""
    from ortools.sat.python import cp_model

    players = [p for p in slate if p["id"] not in excludes]
    model = cp_model.CpModel()

    assign: dict[tuple[int, str], cp_model.IntVar] = {}
    for i, slot in enumerate(SLOTS):
        for p in players:
            if eligible(p, slot):
                assign[(i, p["id"])] = model.NewBoolVar(f"x_{i}_{p['id']}")
        vars_here = [v for (i2, _), v in assign.items() if i2 == i]
        if not vars_here:
            raise ValueError(f"no eligible player for slot {slot} after excludes")
        model.AddExactlyOne(vars_here)

    for p in players:
        row = [v for (i, pid), v in assign.items() if pid == p["id"]]
        if row:
            model.AddAtMostOne(row)

    model.Add(sum(v * p["salary"] for (i, pid), v in assign.items()
                  for p in [next(q for q in players if q["id"] == pid)]) <= cap)

    for pid in locks:
        row = [v for (i, qid), v in assign.items() if qid == pid]
        if not row:
            raise ValueError(f"lock {pid} is not on the slate or has no legal slot")
        model.AddExactlyOne(row)

    in_lineup = {}
    for p in players:
        row = [v for (i, pid), v in assign.items() if pid == p["id"]]
        if row:
            b = model.NewBoolVar(f"in_{p['id']}")
            model.Add(sum(row) == b)
            in_lineup[p["id"]] = b

    if stack:
        # The QB's team must own >=1 stacked WR/TE, mirroring enforceStack().
        teams = sorted({p["team"] for p in players})
        z = {t: model.NewBoolVar(f"qbteam_{t}") for t in teams}
        model.AddExactlyOne(list(z.values()))
        qb_slot = SLOTS.index("QB")
        for p in players:
            v = assign.get((qb_slot, p["id"]))
            if v is not None:
                model.Add(v <= z.get(p["team"], 0) if p["team"] in z else 0)
        for t in teams:
            catchers = [in_lineup[p["id"]] for p in players
                        if p["team"] == t and p["pos"] in ("WR", "TE") and p["id"] in in_lineup]
            if catchers:
                model.Add(sum(catchers) >= z[t])
            else:
                model.Add(z[t] == 0)

    model.Maximize(sum(v * round(obj_value(p, mode) * SCALE)
                       for (i, pid), v in assign.items()
                       for p in [next(q for q in players if q["id"] == pid)]))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"CP-SAT status {solver.StatusName(status)}")

    lineup = []
    for i, slot in enumerate(SLOTS):
        for p in players:
            v = assign.get((i, p["id"]))
            if v is not None and solver.Value(v) == 1:
                lineup.append(p)
                break
    return lineup_objective(lineup, mode), lineup


def synthetic_slate(rng: random.Random, n_per_pos: dict[str, int]) -> list[dict]:
    slate, n = [], 0
    for pos in POSITIONS:
        for _ in range(n_per_pos[pos]):
            team = rng.choice(TEAMS)
            opp = rng.choice([t for t in TEAMS if t != team])
            base = {"QB": (5200, 8200, 15.0, 32.0), "RB": (4000, 8600, 6.0, 30.0),
                    "WR": (3200, 8800, 5.0, 31.0), "TE": (2800, 6800, 4.0, 24.0),
                    "DST": (2200, 4200, 3.0, 18.0)}[pos]
            salary = rng.randrange(base[0], base[1], 100)
            ceiling = round(rng.uniform(base[2], base[3]), 1)
            proj = round(max(0.0, ceiling * rng.uniform(0.45, 0.8)), 1)
            slate.append({
                "id": f"s{n}_{pos.lower()}",
                "name": f"Synth {n}",
                "pos": pos,
                "team": team,
                "opp": opp,
                "salary": salary,
                "proj": proj,
                "floor": round(proj * 0.55, 1),
                "ceiling": ceiling,
                "own": round(rng.uniform(0.01, 0.35), 2),
            })
            n += 1
    return slate


def run_probe(cases: list[dict]) -> dict[str, dict]:
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        job_path = os.path.join(tmp, "job.json")
        out_path = os.path.join(tmp, "out.json")
        with open(job_path, "w", encoding="utf-8") as fh:
            json.dump({"cases": cases}, fh)
        proc = subprocess.run(
            ["npx", "tsx", PROBE, "--job", job_path, "--out", out_path],
            cwd=WEB_DIR, capture_output=True, text=True, shell=os.name == "nt", timeout=1800,
        )
        if proc.returncode != 0:
            sys.stderr.write(proc.stdout[-2000:] + "\n" + proc.stderr[-2000:] + "\n")
            raise SystemExit(f"probe failed (exit {proc.returncode})")
        with open(out_path, encoding="utf-8") as fh:
            payload = json.load(fh)
    return {r["id"]: r for r in payload["results"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--synthetic", type=int, default=0, help="number of random slates")
    ap.add_argument("--seed", type=int, default=20260912)
    ap.add_argument("--restarts", type=int, default=60, help="engine restarts per case")
    ap.add_argument("--json", default=os.path.join("scripts", "dfs", "oracle-report.json"))
    args = ap.parse_args()

    # The shipped slate is the single source of truth: read it out of the engine.
    dump = subprocess.run(
        ["npx", "tsx", "-e",
         "import {DFS_SLATE} from './lib/fantasy/dfs-slate';"
         "console.log(JSON.stringify(DFS_SLATE));"],
        cwd=WEB_DIR, capture_output=True, text=True, shell=os.name == "nt", timeout=300,
    )
    shipped = json.loads(dump.stdout.strip().splitlines()[-1])

    rng = random.Random(args.seed)
    slates = [("shipped", shipped)]
    for i in range(args.synthetic):
        slates.append((f"synthetic-{i}", synthetic_slate(
            rng, {"QB": 5, "RB": 9, "WR": 12, "TE": 5, "DST": 5})))

    cases, meta = [], {}
    for sid, slate in slates:
        for mode in ("cash", "gpp", "leverage"):
            for stack in (False, True):
                case_id = f"{sid}|{mode}|stack={int(stack)}"
                cases.append({"id": case_id, "mode": mode, "stack": stack,
                              "restarts": args.restarts, "locks": [], "excludes": [],
                              "slate": slate})
                meta[case_id] = (sid, slate, mode, stack)

    heuristic = run_probe(cases)

    rows, failures, structural = [], [], []
    for case_id, (sid, slate, mode, stack) in meta.items():
        opt_val, opt_lineup = solve_optimum(slate, mode, stack, set(), set())
        h = heuristic[case_id]
        h_lineup = h.get("lineup") or []
        ok, why = valid_lineup(h_lineup)
        if not ok:
            structural.append({"case": case_id, "problem": why})
        h_val = h["objective"] if h["objective"] is not None else float("-inf")
        gap = opt_val - h_val
        st = stacks(h_lineup) if h_lineup else 0
        if stack and h_lineup and st == 0:
            structural.append({"case": case_id, "problem": "stack required but lineup has no stack"})
        rows.append({
            "case": case_id, "slate": sid, "mode": mode, "stack": stack,
            "oracle_objective": round(opt_val, 6),
            "heuristic_objective": None if h_val == float("-inf") else round(h_val, 6),
            "gap": None if h_val == float("-inf") else round(gap, 6),
            "gap_pct": None if not opt_val else round(100 * gap / abs(opt_val), 4),
            "heuristic_salary": h.get("salary"),
            "heuristic_stack": st,
            "matches_optimum": abs(gap) <= TOL,
            "oracle_lineup": [p["id"] for p in opt_lineup],
            "heuristic_lineup": [p["id"] for p in h_lineup],
        })
        if gap > TOL:
            failures.append(rows[-1])

    header = f"{'case':<38}{'oracle':>10}{'engine':>10}{'gap':>10}{'gap%':>8}"
    print(header)
    print("-" * len(header))
    for r in rows:
        hv = "n/a" if r["heuristic_objective"] is None else f"{r['heuristic_objective']:.3f}"
        gp = "n/a" if r["gap"] is None else f"{r['gap']:.3f}"
        pc = "n/a" if r["gap_pct"] is None else f"{r['gap_pct']:.2f}%"
        print(f"{r['case']:<38}{r['oracle_objective']:>10.3f}{hv:>10}{gp:>10}{pc:>8}")

    report = {
        "generated_by": "scripts/dfs/oracle.py",
        "engine": "apps/web/lib/fantasy/dfs-optimizer.ts (optimizeOne)",
        "solver": "OR-Tools CP-SAT",
        "objective_scale": SCALE,
        "tolerance": TOL,
        "cases": len(rows),
        "cases_at_optimum": sum(1 for r in rows if r["matches_optimum"]),
        "cases_beaten": len(failures),
        "structural_problems": structural,
        "rows": rows,
    }
    out_path = os.path.join(REPO_ROOT, args.json)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)

    print()
    print(f"cases: {report['cases']}  at optimum: {report['cases_at_optimum']}  "
          f"beaten by oracle: {report['cases_beaten']}  structural problems: {len(structural)}")
    for s in structural:
        print(f"  STRUCTURAL {s['case']}: {s['problem']}")
    for f in failures[:10]:
        print(f"  BEATEN {f['case']}: oracle {f['oracle_objective']:.3f} > engine "
              f"{f['heuristic_objective']:.3f} (+{f['gap']:.3f}, {f['gap_pct']:.2f}%)")
        print(f"    oracle:    {f['oracle_lineup']}")
        print(f"    engine:    {f['heuristic_lineup']}")
    print(f"report -> {out_path}")
    return 1 if (failures or structural) else 0


if __name__ == "__main__":
    raise SystemExit(main())
