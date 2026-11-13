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
        data = json.loads(p.read_text(encoding="utf-8"))
        updated = datetime.fromisoformat(str(data.get("updated_at")).replace("Z", "+00:00"))
        age_h = (datetime.now(timezone.utc) - updated).total_seconds() / 3600.0
        snaps = data.get("spine", [])
        return age_h <= MAX_AGE_HOURS and len(snaps) >= 100 and all(
            isinstance(s.get("snap_outcome"), dict) and "yards_gained" in s["snap_outcome"] for s in snaps
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


def build_game_spine(away: str, home: str, qb1s: dict[str, str], model: str, trends: dict, git_sha: str) -> dict[str, Any]:
    a_qb1 = qb1s.get(away, "")
    h_qb1 = qb1s.get(home, "")
    if not a_qb1 or not h_qb1:
        raise RuntimeError(f"{away}@{home}: missing confirmed QB1 ({away}={a_qb1!r}, {home}={h_qb1!r})")
    game_key = f"{away}@{home}"
    print(f"[{game_key}] START live JEV spine build (QB1s: {a_qb1} / {h_qb1})", flush=True)
    spine = spine_runner.simulate_game_spine(
        away_team=away, home_team=home, away_qb1=a_qb1, home_qb1=h_qb1,
        trends=trends, model=model, max_snaps=220,
    )
    if len(spine) < 100:
        raise RuntimeError(f"{game_key}: spine too short ({len(spine)} snaps)")
    for i, snap in enumerate(spine):
        for field in ("off_play_call", "def_shell_call", "target_carrier", "snap_outcome", "pressure_disruption"):
            if not snap.get(field):
                raise RuntimeError(f"{game_key}: snap {i} missing {field}")
    now = datetime.now(timezone.utc).isoformat()
    out = {
        "schema": "jev_full_game_snap_decision_spine_v1",
        "week": WEEK,
        "away_team": away,
        "home_team": home,
        "away_qb1": a_qb1,
        "home_qb1": h_qb1,
        "updated_at": now,
        "provenance": {
            "generator": "build_week10_jev_spines.py",
            "engine": "run_jev_full_game_spine.simulate_game_spine",
            "jev_model": model,
            "jev_transport": "jevkit.client.ask (live OpenRouter)",
            "git_sha": git_sha,
            "trends_window": "w1_w9",
            "injuries_source": "data/nfl/injuries_2026.csv (weeks 9-10)",
            "generated_at": now,
        },
        "snap_count": len(spine),
        "spine": spine,
    }
    p = spine_path(away, home)
    with _write_lock:
        p.write_text(json.dumps(out, indent=2), encoding="utf-8")
    ok, msg = spine_runner.verify_jev_spine_freshness_and_qb1(p, away, home, a_qb1, h_qb1)
    if not ok:
        raise RuntimeError(f"{game_key}: freshness gate failed post-write: {msg}")
    print(f"[{game_key}] DONE {len(spine)} snaps -> {p.name} ({msg})", flush=True)
    return {"game": game_key, "snaps": len(spine), "path": str(p), "status": "built"}


def main() -> int:
    ap = argparse.ArgumentParser(description="Build live-JEV Week 10 spines for every remaining game.")
    ap.add_argument("--workers", type=int, default=3, help="Concurrent games (default 3; snaps within a game are sequential)")
    ap.add_argument("--model", default="~typesafe/jev-latest")
    ap.add_argument("--force", action="store_true", help="Rebuild even if a fresh spine exists")
    ap.add_argument("--only", default="", help="Comma-separated AWAY@HOME filters")
    ap.add_argument("--dry-run", action="store_true", help="Validate slate + context only; no JEV calls")
    args = ap.parse_args()

    require_week(WEEK)
    cfg = json.loads((REPO_ROOT / "data" / "engine" / "week10_stage0_preflight_config.json").read_text(encoding="utf-8"))
    qb1_cfg = cfg.get("confirmed_qb1", {})

    def qb1_name(tm: str) -> str:
        return str(qb1_cfg.get(tm) or qb1_cfg.get({"LAR": "LA", "LA": "LAR"}.get(tm, tm)) or "")

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

    trends = spine_runner.load_w1_w9_trends()
    print(f"trends loaded: {len(trends.get('teams', {}))} teams, window w1_w9", flush=True)
    if args.dry_run:
        for away, home in slate:
            print(f"  {away}@{home}: QB1s {qb1_name(away)!r} / {qb1_name(home)!r}, fresh_spine={fresh_spine_exists(away, home)}")
        return 0

    git_sha = get_git_sha()
    results: list[dict[str, Any]] = []
    todo = []
    for away, home in slate:
        if not args.force and fresh_spine_exists(away, home):
            print(f"[{away}@{home}] SKIP fresh spine exists", flush=True)
            results.append({"game": f"{away}@{home}", "status": "skipped_fresh"})
        else:
            todo.append((away, home))

    errors: list[dict[str, str]] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(build_game_spine, away, home, {t: qb1_name(t) for t in (away, home)}, args.model, trends, git_sha): f"{away}@{home}"
            for away, home in todo
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