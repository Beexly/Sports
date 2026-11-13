#!/usr/bin/env python3
"""
scripts/ops/build_week10_jev_spines.py

WP-8 Stage 2A prerequisite: build a REAL snap-by-snap JEV decision spine for
every remaining Week 10 game — jevkit.client.ask on EVERY snap (Q1 15:00 ->
Q4 0:00), querying off_play_call, def_shell_call, target_carrier, snap_outcome,
pressure_disruption (+ aggressive_coaching_edge). No RNG-synthesized spines:
Garrett's hard doctrine requires live JEV on every snap for publishable output.

Per game writes data/engine/jev_full_game_spine_{away}_{home}_week10.json with
a fresh envelope (updated_at=now, week=10, away_qb1/home_qb1 from the Stage 0
config, provenance) so verify_jev_spine_freshness_and_qb1 passes (<=18h).

Context: w1_w9 trends (WP-3/4 regen) + week 9/10 injury designations from
injuries_2026.csv (SIM_WEEK=10 in run_jev_full_game_spine).

Resume-safe: a game with a fresh (<18h) spine file is skipped unless --force.
Fail-closed: any game whose spine fails to build is recorded; exit 1 unless
every slate game has a valid spine.

Usage:
  python scripts/ops/build_week10_jev_spines.py --dry-run
  python scripts/ops/build_week10_jev_spines.py --workers 3
  python scripts/ops/build_week10_jev_spines.py --only NE@DET --force
"""
from __future__ import annotations

import argparse
import json
import sys
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import scripts.ops.run_jev_full_game_spine as spine_runner  # noqa: E402
from scripts.ops.run_week10_full_slate_connected_workflow import (  # noqa: E402
    FULL_TO_ABBR,
    fetch_remaining_slate,
)
from scripts.ops.preflight_live_roster_injury_gate import require_week  # noqa: E402

WEEK = 10
MAX_AGE_HOURS = 18.0
_write_lock = threading.Lock()


def spine_path(away: str, home: str) -> Path:
    return REPO_ROOT / "data" / "engine" / f"jev_full_game_spine_{away.lower()}_{home.lower()}_week{WEEK}.json"


def fresh_spine_exists(away: str, home: str) -> bool:
    p = spine_path(away, home)
    if not p.is_file():
        return False
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        ts = d.get("updated_at") or d.get("generated_at")
        if not ts:
            return False
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0
        return 0 <= age <= MAX_AGE_HOURS and int(d.get("week", 0)) == WEEK and len(d.get("snap_by_snap_log", [])) >= 100
    except Exception:
        return False


def build_one(away: str, home: str, trends_teams: dict[str, Any], qb1: dict[str, str], model: str, seed: int) -> dict[str, Any]:
    spine = spine_runner.simulate_full_game_with_jev(away, home, trends_teams, model=model, seed=seed)
    snaps = spine.get("snap_by_snap_log", [])
    if len(snaps) < 100:
        raise RuntimeError(f"spine too short: {len(snaps)} snaps (JEV degradation suspected)")
    now = datetime.now(timezone.utc).isoformat()
    spine.update({
        "schema": "gse_jev_full_game_spine_v1",
        "updated_at": now,
        "week": WEEK,
        "away_qb1": qb1.get(away, ""),
        "home_qb1": qb1.get(home, ""),
        "provenance": {
            "builder": "scripts/ops/build_week10_jev_spines.py",
            "model": model,
            "provider": "openrouter",
            "method": "live jevkit.client.ask on every snap (Q1 15:00 -> Q4 0:00)",
            "trends": "nfl_2026_w1_w9_trends_and_usage.json",
            "injuries": "injuries_2026.csv weeks 9+10",
            "seed": seed,
        },
    })
    p = spine_path(away, home)
    p.parent.mkdir(parents=True, exist_ok=True)
    with _write_lock:
        p.write_text(json.dumps(spine, indent=2, default=str), encoding="utf-8")
    return {"matchup": f"{away}@{home}", "snaps": len(snaps), "path": str(p.relative_to(REPO_ROOT)), "updated_at": now}


def main() -> int:
    ap = argparse.ArgumentParser(description="Build live-JEV Week 10 spines for every remaining game.")
    ap.add_argument("--workers", type=int, default=3, help="Concurrent games (default 3; snaps within a game are sequential)")
    ap.add_argument("--model", default="~typesafe/jev-latest")
    ap.add_argument("--force", action="store_true", help="Rebuild even if a fresh spine exists")
    ap.add_argument("--only", default="", help="Comma-separated AWAY@HOME filters")
    ap.add_argument("--dry-run", action="store_true", help="Validate slate + context only; no JEV calls")
    args = ap.parse_args()

    spine_runner.SIM_WEEK = WEEK
    cfg = require_week(WEEK)
    qb1_cfg = cfg.get("confirmed_qb1", {})

    def qb1_name(tm: str) -> str:
        return str(qb1_cfg.get(tm) or qb1_cfg.get({"LAR": "LA", "LA": "LAR"}.get(tm, tm)) or "")

    games = fetch_remaining_slate()
    slate: list[tuple[str, str]] = []
    for g in games:
        home = FULL_TO_ABBR.get(g["homeTeamName"])
        away = FULL_TO_ABBR.get(g["awayTeamName"])
        if not home or not away:
            print(f"[SPINE] FAIL unmapped: {g['awayTeamName']} @ {g['homeTeamName']}", file=sys.stderr)
            return 1
        slate.append((away, home))
    if args.only:
        wanted = {m.strip().upper() for m in args.only.split(",") if m.strip()}
        slate = [(a, h) for a, h in slate if f"{a}@{h}" in wanted]

    trends_path = spine_runner.trends_path_for_week(WEEK)
    trends_teams = json.loads(trends_path.read_text(encoding="utf-8")).get("teams", {})
    print(f"[SPINE] Week {WEEK}: {len(slate)} games | trends {trends_path.name} | model {args.model} | workers {args.workers}")
    for a, h in slate:
        status = "FRESH-CACHED" if fresh_spine_exists(a, h) else "TO-BUILD"
        print(f"  {a}@{h}  QB1s {qb1_name(a)} / {qb1_name(h)}  [{status}]")
    if args.dry_run:
        print("[SPINE] DRY RUN OK — no JEV calls made.")
        return 0

    pending = [(a, h) for a, h in slate if args.force or not fresh_spine_exists(a, h)]
    results: list[dict[str, Any]] = []
    failures: dict[str, str] = {}
    if not pending:
        print("[SPINE] all spines fresh — nothing to build.")
    else:
        print(f"[SPINE] building {len(pending)} spines via live JEV...", flush=True)
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = {}
            for idx, (a, h) in enumerate(pending):
                seed = 20261113 + idx * 101
                futs[ex.submit(build_one, a, h, trends_teams, {a: qb1_name(a), h: qb1_name(h)}, args.model, seed)] = f"{a}@{h}"
            for fut in as_completed(futs):
                key = futs[fut]
                try:
                    r = fut.result()
                    results.append(r)
                    print(f"[SPINE] {key} OK — {r['snaps']} snaps -> {r['path']}", flush=True)
                except Exception:
                    failures[key] = traceback.format_exc()
                    print(f"[SPINE] {key} FAILED:\n{failures[key]}", file=sys.stderr, flush=True)

    report = {
        "week": WEEK,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "slate_count": len(slate),
        "built": results,
        "cached": [f"{a}@{h}" for a, h in slate if (a, h) not in pending],
        "failed": failures,
        "all_green": not failures and len(results) + len(slate) - len(pending) == len(slate),
    }
    rp = REPO_ROOT / "data" / "engine" / "week10_jev_spine_build_report_2026_11_13.json"
    rp.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"[SPINE] report -> {rp.relative_to(REPO_ROOT)} | built {len(results)} | cached {len(slate) - len(pending)} | failed {len(failures)}")
    if not report["all_green"]:
        print("[SPINE] FAIL — incomplete spine coverage; WP-8 must REFUSE_PROJECTION.", file=sys.stderr)
        return 1
    print("[SPINE] ALL WEEK 10 SPINES GREEN (live JEV, every snap).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())