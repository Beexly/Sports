#!/usr/bin/env python3
"""
scripts/ops/build_week10_jev_spines.py

WP-8 Stage 2A prerequisite: build a REAL snap-by-snap JEV decision spine for
every remaining Week 10 game via run_jev_full_game_spine.simulate_full_game_with_jev
(live jevkit.client.ask on EVERY snap, Q1 15:00 -> Q4 0:00, querying off_play_call,
def_shell_call, target_carrier, snap_outcome, pressure_disruption,
aggressive_coaching_edge). No RNG-synthesized spines for publishable Week 10+.

Per game writes data/engine/jev_full_game_spine_{away}_{home}_week10.json in the
exact envelope the connected workflow consumes:
  spine_raw["games"]["AWAY@HOME"] -> game node with snap_by_snap_log + jev_decisions
  (gse_coach_mind_simulator.build_jev_state_tensor), fresh updated_at (<=18h),
  week=10, away_qb1/home_qb1 aligned to the Stage 0 config (SG-1 freshness gate).

Context: w1_w9 trends (trends_path_for_week(10)) + week 9/10 injury designations
from data/nflverse/injuries_2026.csv (SIM_WEEK=10).

Resume-safe: a game with a fresh (<18h) spine file is skipped unless --force.
Fail-closed: exit 1 unless every slate game has a valid fresh spine.

Usage:
  python scripts/ops/build_week10_jev_spines.py --dry-run
  python scripts/ops/build_week10_jev_spines.py --workers 3
  python scripts/ops/build_week10_jev_spines.py --only NE@DET --force
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
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
from scripts.ops.gse_coach_mind_simulator import verify_jev_spine_freshness_and_qb1  # noqa: E402
from scripts.ops.run_week10_full_slate_connected_workflow import (  # noqa: E402
    FULL_TO_ABBR,
    fetch_remaining_slate,
)
from scripts.ops.preflight_live_roster_injury_gate import require_week  # noqa: E402
from scripts.ops.enforce_stage0_roster_and_board_allowlist import (  # noqa: E402
    apply_stage0_qb1_live_starter_resolutions,
)

WEEK = 10
MAX_AGE_HOURS = 18.0
_write_lock = threading.Lock()


def spine_path(away: str, home: str) -> Path:
    return REPO_ROOT / "data" / "engine" / f"jev_full_game_spine_{away.lower()}_{home.lower()}_week{WEEK}.json"


def _game_node(data: dict, away: str, home: str) -> dict:
    return (data.get("games") or {}).get(f"{away}@{home}", data)


def fresh_spine_exists(away: str, home: str) -> bool:
    p = spine_path(away, home)
    if not p.is_file():
        return False
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        node = _game_node(data, away, home)
        ts = node.get("updated_at") or node.get("generated_at") or data.get("updated_at")
        updated = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        age_h = (datetime.now(timezone.utc) - updated).total_seconds() / 3600.0
        snaps = node.get("snap_by_snap_log", [])
        return age_h <= MAX_AGE_HOURS and len(snaps) >= 100 and all(
            isinstance(s.get("jev_decisions"), dict) and s.get("resolved_play") for s in snaps
        )
    except Exception:
        return False


def git_exe() -> str:
    git = shutil.which("git")
    if git:
        return git
    for cand in (r"C:\Program Files\Git\cmd\git.exe", r"C:\Program Files (x86)\Git\cmd\git.exe"):
        if Path(cand).exists():
            return cand
    raise RuntimeError("git executable not found — spine provenance requires a git SHA")


def get_git_sha() -> str:
    try:
        return subprocess.run(
            [git_exe(), "-C", str(REPO_ROOT), "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=30, check=True,
        ).stdout.strip()
    except Exception as exc:
        raise RuntimeError(f"git rev-parse failed: {exc}") from exc


def build_game_spine(away: str, home: str, a_qb1: str, h_qb1: str, model: str,
                     trends_teams: dict, git_sha: str, seed: int) -> dict[str, Any]:
    if not a_qb1 or not h_qb1:
        raise RuntimeError(f"{away}@{home}: missing confirmed QB1 ({away}={a_qb1!r}, {home}={h_qb1!r})")
    game_key = f"{away}@{home}"
    print(f"[{game_key}] START live JEV spine build (QB1s: {a_qb1} / {h_qb1}, seed={seed})", flush=True)
    sim = spine_runner.simulate_full_game_with_jev(away, home, trends_teams, model=model, seed=seed)
    snaps = sim.get("snap_by_snap_log", [])
    if len(snaps) < 100:
        raise RuntimeError(f"{game_key}: spine too short ({len(snaps)} snaps)")
    for i, s in enumerate(snaps):
        jev = s.get("jev_decisions") or {}
        for field in ("off_play_call", "def_shell_call", "target_carrier", "snap_outcome"):
            if not jev.get(field):
                raise RuntimeError(f"{game_key}: snap {i} missing jev_decisions.{field}")
        if "pressure_disruption_noul" not in jev:
            raise RuntimeError(f"{game_key}: snap {i} missing pressure_disruption_noul")
        if not s.get("resolved_play"):
            raise RuntimeError(f"{game_key}: snap {i} missing resolved_play")
    now = datetime.now(timezone.utc).isoformat()
    game_node = {
        **sim,
        "week": WEEK,
        "season": 2026,
        "updated_at": now,
        "generated_at": now,
        "away": away,
        "home": home,
        "away_qb1": a_qb1,
        "home_qb1": h_qb1,
        "confirmed_qb1": {away: a_qb1, home: h_qb1},
        "provenance": {
            "generator": "build_week10_jev_spines.py",
            "engine": "run_jev_full_game_spine.simulate_full_game_with_jev",
            "jev_model": model,
            "jev_transport": "jevkit.client.ask (live OpenRouter)",
            "git_sha": git_sha,
            "trends_window": "w1_w9",
            "injuries_source": "data/nflverse/injuries_2026.csv (weeks 9-10)",
            "seed": seed,
            "generated_at": now,
        },
    }
    spine_obj = {
        "schema": "gse_jev_full_game_spine_v1",
        "week": WEEK,
        "updated_at": now,
        "away_qb1": a_qb1,
        "home_qb1": h_qb1,
        "confirmed_qb1": {away: a_qb1, home: h_qb1},
        "total_drives": sim.get("total_drives"),
        "games": {game_key: game_node},
    }
    # SG-1 freshness + QB1 gate on the exact node the workflow will consume.
    chk = verify_jev_spine_freshness_and_qb1(
        game_node, expected_week=WEEK, expected_away_qb1=a_qb1,
        expected_home_qb1=h_qb1, max_age_hours=MAX_AGE_HOURS, strict=True,
    )
    p = spine_path(away, home)
    with _write_lock:
        p.write_text(json.dumps(spine_obj, indent=2), encoding="utf-8")
    print(f"[{game_key}] DONE {len(snaps)} snaps -> {p.name} ({chk['reason']}, "
          f"cost ${sim.get('usage', {}).get('total_cost_usd', 0):.4f})", flush=True)
    return {"game": game_key, "snaps": len(snaps), "path": str(p), "status": "built",
            "cost_usd": sim.get("usage", {}).get("total_cost_usd", 0)}


def main() -> int:
    ap = argparse.ArgumentParser(description="Build live-JEV Week 10 spines for every remaining game.")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--model", default="~typesafe/jev-latest")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    gate_cfg = require_week(WEEK)
    spine_runner.SIM_WEEK = WEEK
    # Authoritative simulation QB1s = the Stage-0 gate (require_week) WITH the
    # preflight qb1_ban_conflicts live-starter resolutions applied, matching what
    # load_stage0_game_roster_allowlist / the SG-1 freshness gate verify at run
    # time (e.g. CLE: DFS gate substitutes Sanders for banned Watson, but the
    # verified live starter for simulation is Watson per the preflight config).
    gate_cfg = apply_stage0_qb1_live_starter_resolutions(gate_cfg, WEEK)
    qb1_cfg = gate_cfg.get("confirmed_qb1", {})

    def qb1_name(tm: str) -> str:
        return str(qb1_cfg.get(tm) or qb1_cfg.get({"LAR": "LA", "LA": "LAR", "WSH": "WAS", "WAS": "WSH"}.get(tm, tm)) or "")

    games = fetch_remaining_slate()
    slate: list[tuple[str, str]] = []
    for g in games:
        home = FULL_TO_ABBR.get(g["homeTeamName"])
        away = FULL_TO_ABBR.get(g["awayTeamName"])
        if not home or not away:
            print(f"REFUSE_PROJECTION: unmapped team {g['awayTeamName']}@{g['homeTeamName']}", file=sys.stderr)
            return 1
        slate.append((away, home))
    if args.only:
        wanted = {tuple(x.strip().split("@")) for x in args.only.split(",") if x.strip()}
        slate = [s for s in slate if s in wanted]
    print(f"Week {WEEK} spine build: {len(slate)} games, workers={args.workers}, model={args.model}", flush=True)

    trends_raw = json.loads(spine_runner.trends_path_for_week(WEEK).read_text(encoding="utf-8"))
    trends_teams = trends_raw.get("teams", {})
    print(f"trends loaded: {len(trends_teams)} teams from {spine_runner.trends_path_for_week(WEEK).name}", flush=True)
    if args.dry_run:
        for away, home in slate:
            print(f"  {away}@{home}: QB1s {qb1_name(away)!r} / {qb1_name(home)!r}, fresh_spine={fresh_spine_exists(away, home)}")
        return 0

    git_sha = get_git_sha()
    results: list[dict[str, Any]] = []
    todo = []
    for idx, (away, home) in enumerate(slate):
        if not args.force and fresh_spine_exists(away, home):
            print(f"[{away}@{home}] SKIP fresh spine exists", flush=True)
            results.append({"game": f"{away}@{home}", "status": "skipped_fresh"})
        else:
            todo.append((idx, away, home))

    errors: list[dict[str, str]] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(build_game_spine, away, home, qb1_name(away), qb1_name(home),
                        args.model, trends_teams, git_sha, 20261113 + idx * 101): f"{away}@{home}"
            for idx, away, home in todo
        }
        for fut in as_completed(futures):
            game = futures[fut]
            try:
                results.append(fut.result())
            except Exception as exc:
                tb = traceback.format_exc()
                print(f"[{game}] FAILED: {exc}\n{tb}", file=sys.stderr, flush=True)
                errors.append({"game": game, "error": str(exc)})

    report = {
        "week": WEEK,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "git_sha": git_sha,
        "slate_games": len(slate),
        "built": sum(1 for r in results if r["status"] == "built"),
        "skipped_fresh": sum(1 for r in results if r["status"] == "skipped_fresh"),
        "failed": errors,
        "results": results,
    }
    report_path = REPO_ROOT / "data" / "engine" / "week10_jev_spine_build_report_2026_11_13.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    covered = sum(1 for away, home in slate if fresh_spine_exists(away, home))
    print(f"\nSPINE BUILD COMPLETE: {covered}/{len(slate)} games covered, {len(errors)} failures. Report: {report_path.name}", flush=True)
    if covered < len(slate):
        print("REFUSE_PROJECTION: spine coverage incomplete — WP-8 may not run until every game has a fresh live-JEV spine.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())