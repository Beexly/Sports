"""Verify the final on-disk state of the week-8 engine artifacts.

Run:  python reconciliation/_verify_final_state.py

Checks that the data the engine depends on is present and internally consistent:
the official ledger, the latest workflow-run checkpoint (6/6 seats PASS), the DFS
packets, the vision catalog, the week 1-8 feature store, and the trained team
priors. Prints one aligned line per check.

WHY THIS IS A SCRIPT, NOT A MODULE
----------------------------------
This file previously ran all of its work at import time against hardcoded
relative paths ("data/engine/..."). Anything that imported it — a test
collector, an auditor walking the package — executed the whole probe as a side
effect and only worked when CWD happened to be the repo root. Now the work sits
behind main() and paths are anchored to the git top-level, so the script behaves
the same from any working directory and importing it does nothing.
"""

from __future__ import annotations

import glob
import json
import os
import subprocess
from pathlib import Path


def _repo_root() -> Path:
    """Anchor on THIS FILE's location, not the caller's CWD.

    Anchoring via `git rev-parse --show-toplevel` alone is wrong: it resolves to
    whatever repo encloses the current working directory. This script lives in a
    repo whose artifacts are the ones being verified, but C:\\Users\\Garrett is
    ALSO a git repo, so running from the home directory resolved the "root" to
    home and reported every artifact MISSING while exiting 0 — a false negative
    that reads like a clean run. The script's own path is unambiguous.

    git is still consulted, but only from the script's directory, and only to
    confirm which repo it belongs to.
    """
    here = Path(__file__).resolve().parents[1]
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True, cwd=here,
        ).stdout.strip()
        if out:
            resolved = Path(out).resolve()
            # Trust git only when it agrees this script's directory is inside it.
            if resolved == here or here.is_relative_to(resolved):
                return resolved
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return here


def _line(k: str, v) -> None:
    print(f"{k:36s} {v}")


def main() -> int:
    root = _repo_root()
    _line("repo root", root)

    head = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                          capture_output=True, text=True, cwd=root).stdout.strip()
    up = subprocess.run(["git", "rev-parse", "--short",
                         "origin/hermes/week8-forensic-tracks-1-3"],
                        capture_output=True, text=True, cwd=root).stdout.strip()
    dirty = subprocess.run(["git", "status", "--porcelain"],
                           capture_output=True, text=True, cwd=root).stdout.strip()
    _line("git HEAD", head)
    _line("git origin (same branch)", up)
    _line("HEAD == origin", str(head == up))
    _line("dirty files", len(dirty.splitlines()))
    for f in dirty.splitlines()[:5]:
        print("    dirty:", f)

    ledger_path = root / "data" / "engine" / "new_engine_official_ledger_2026.json"
    if ledger_path.exists():
        L = json.load(ledger_path.open(encoding="utf-8"))
        vr = L["verified_record"]
        sv = L["secondary_views"]
        recs = [v.get("record") for v in sv] if isinstance(sv, list) else list(sv)
        _line("ledger verified_record", f'{vr.get("record")} {vr.get("net_units")}')
        _line("ledger secondary views", recs)
    else:
        _line("ledger", f"MISSING ({ledger_path})")

    runs = sorted(glob.glob(str(root / "data" / "engine" / "workflow_runs" / "run_*.json")),
                  key=os.path.getmtime)
    if runs:
        d = json.load(open(runs[-1], encoding="utf-8"))
        sts = [(s["seat"], s["status"]) for s in d.get("seats", [])]
        _line("runner checkpoint", os.path.basename(runs[-1]))
        _line("runner seat statuses", sts)
        _line("runner 6/6 PASS", str(len(sts) == 6 and all(x[1] == "PASS" for x in sts)))
    else:
        _line("runner checkpoint", "MISSING (no run_*.json)")

    packets = sorted(glob.glob(str(root / "data" / "dfs" / "*_packet_2026_11_03.json")))
    if not packets:
        _line("dfs packets", "MISSING")
    for f in packets:
        p = json.load(open(f, encoding="utf-8"))
        lus = p["lineups"]
        maxsal = max(l["salary"] for l in lus)
        sizes = {len(l["players"]) for l in lus}
        cpt = {sum(1 for x in l["players"] if x.get("slot") == "CPT") for l in lus}
        _line(f"packet {p['slate_name'][:26]}",
              f"lineups={len(lus)} max_sal={maxsal} rosters={sizes} cpt={cpt}")

    cat_path = root / "intelligence" / "vision" / "data" / "nfl_video_2026_catalog.json"
    if cat_path.exists():
        cat = json.load(cat_path.open(encoding="utf-8"))
        _line("catalog games_discovered", cat.get("games_discovered"))
        _line("catalog embeddable_pages", cat.get("embeddable_pages"))
        _line("catalog weeks_present", cat.get("weeks_present"))
    else:
        _line("catalog", f"MISSING ({cat_path})")

    fs_path = root / "intelligence" / "vision" / "data" / "family_features_week1_to_8.parquet"
    if fs_path.exists():
        import pandas as pd
        fs = pd.read_parquet(fs_path)
        cov = {int(k): int(v) for k, v in fs["week"].value_counts().sort_index().to_dict().items()}
        _line("feature store weeks/rows", f"{cov} rows={len(fs)}")
    else:
        _line("feature store", f"MISSING ({fs_path})")

    pr_path = root / "data" / "engine" / "team_priors_weeks_1_to_8_trained.json"
    if pr_path.exists():
        pr = json.load(pr_path.open(encoding="utf-8"))
        s = sorted(round(v["pass_rate_alpha"] + v["pass_rate_beta"], 1)
                   for v in pr["team_priors"].values())
        _line("prior strength min/max", f"{s[0]} / {s[-1]}")
        _line("epoch brier", [round(e["brier_pass"], 6) for e in pr["epochs"]])
        _line("trainer weeks_available", pr.get("weeks_available"))
        _line("trainer week8_status", pr.get("week8_status"))
    else:
        _line("team priors", f"MISSING ({pr_path})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
