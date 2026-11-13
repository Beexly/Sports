#!/usr/bin/env python3
"""
scripts/ops/run_week10_full_slate_connected_workflow.py

WP-8: the de-hardcoded 5-Stage Connected Game Workflow across EVERY remaining
2026 NFL Week 10 matchup (13 games, NE @ DET Munich through LAC @ BAL MNF).
TNF (WSH @ NYG) is FINAL and settled — excluded from simulation by the live
Neon query (status <> FINAL AND commenceTime > NOW()).

Slate source of truth: live Neon public.games (same query as WP-7 T-00), NOT
a hardcoded list. Team names map through the T-00 FULL_TO_ABBR table (single
source of truth; LAR -> LA data alias handled).

Per game: execute_connected_game_workflow(away, home, week=10, n_sims) runs
Stage 0 (week-aware roster gate) -> 1A (38 coaching layers) -> 1B (equation
pre-sim review) -> 2 (JEV spine + N-world simulation) -> 3/4 (conserved
post-sim projections) -> 5 (360 conjunction gate), with zero-contamination
assertions at every stage and a SHA-256 receipt chain.

Fail-closed: a game that raises is recorded with its traceback in the coverage
audit; the run exits 1 unless every remaining game produced a full dossier.
No stale ledger pins — the official record lives in verified-ledger.json.

Writes:
  - data/engine/week10_full_slate_connected_dossiers_2026_11_13.json
  - data/engine/week10_complete_360_all_games_verified_call_sheet.json
  - data/engine/week10_coverage_audit_2026.json
  - per-matchup dossiers data/engine/connected_workflow_dossier_{away}_{home}_week10.json

Usage:
  python scripts/ops/run_week10_full_slate_connected_workflow.py --dry-run
  python scripts/ops/run_week10_full_slate_connected_workflow.py --n-sims 10000
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.gates.t00_dry_run_pre_sim import (  # noqa: E402
    FULL_TO_ABBR,
    NFL_SPORT,
    data_abbr,
)
from scripts.ops.gse_connected_game_workflow import (  # noqa: E402
    execute_connected_game_workflow,
)
from scripts.ops.preflight_live_roster_injury_gate import require_week  # noqa: E402

WEEK = 10
SEASON = 2026
WINDOW_START = "2026-11-13T00:00:00Z"
WINDOW_END = "2026-11-18T00:00:00Z"
OUT_DOSSIERS = REPO_ROOT / "data" / "engine" / "week10_full_slate_connected_dossiers_2026_11_13.json"
OUT_CALL_SHEET = REPO_ROOT / "data" / "engine" / "week10_complete_360_all_games_verified_call_sheet.json"
OUT_COVERAGE = REPO_ROOT / "data" / "engine" / "week10_coverage_audit_2026.json"


def fetch_remaining_slate() -> list[dict[str, Any]]:
    """Live Neon query — identical shape to WP-7 T-00 (fail-closed)."""
    import psycopg2
    import psycopg2.extras

    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        import shutil
        neon = shutil.which("neonctl") or shutil.which("neonctl.cmd")
        if not neon:
            cand = Path(os.path.expandvars(r"%APPDATA%\npm\neonctl.cmd"))
            if cand.exists():
                neon = str(cand)
        if not neon:
            raise RuntimeError("neonctl not found on PATH and DATABASE_URL unset")
        url = subprocess.run(
            [neon, "connection-string", "main", "--project-id", "summer-brook-99380762", "--role-name", "hermes_ro"],
            capture_output=True, text=True, check=True, shell=(os.name == "nt"),
        ).stdout.strip().splitlines()[-1]
    conn = psycopg2.connect(url)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            'SELECT id, "homeTeamName", "awayTeamName", "commenceTime", status FROM games '
            'WHERE "sportId"=%s AND "commenceTime" >= %s AND "commenceTime" < %s '
            'AND status <> %s AND "commenceTime" > NOW() ORDER BY "commenceTime"',
            (NFL_SPORT, WINDOW_START, WINDOW_END, "FINAL"),
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def summarize_dossier(away_u: str, home_u: str, bundle: dict[str, Any], game: dict[str, Any]) -> dict[str, Any]:
    stage0 = bundle["stage0_roster_and_board_allowlist"]
    stage1a = bundle["stage1a_coaching_mind_and_schemes"]
    stage2 = bundle["stage2_jev_spine_and_10k_simulation"]
    stage3_4 = bundle["stage3_4_conserved_post_sim_projections"]
    stage5 = bundle["stage5_360_conjunction_gate"]
    b_a = stage2["branch_a_tuten_out_primary"]
    env_meta = stage1a.get("matchup_environment", {})
    return {
        "matchup": f"{away_u} @ {home_u}",
        "game_id": game["id"],
        "away": away_u,
        "home": home_u,
        "week": WEEK,
        "kickoff_utc": str(game["commenceTime"]),
        "window": env_meta.get("window", "Week 10 Slate"),
        "dossier_rel_path": f"data/engine/connected_workflow_dossier_{away_u.lower()}_{home_u.lower()}_week{WEEK}.json",
        "jev_spine_rel_path": f"data/engine/jev_full_game_spine_{away_u.lower()}_{home_u.lower()}_week{WEEK}.json",
        "confirmed_qb1": {
            away_u: stage0["confirmed_qb1"].get(away_u) or stage0["confirmed_qb1"].get(data_abbr(away_u)),
            home_u: stage0["confirmed_qb1"].get(home_u) or stage0["confirmed_qb1"].get(data_abbr(home_u)),
        },
        "verified_board_athletes_count": stage0["verified_board_athletes_count"],
        "matchup_environment": env_meta,
        "coaching_tendencies_resolved": stage1a.get("coaching_tendencies_resolved", {}),
        "l1_to_l5_specialist_reasoning_trace": stage1a.get("l1_to_l5_specialist_reasoning_trace", {}),
        "combined_load_bearing_priors": stage2.get("combined_load_bearing_priors", {}),
        "situational_6family_cholesky_overlay": stage3_4.get("situational_6family_cholesky_overlay", {}),
        "post_sim_team_scores": {
            "away_score_mean": b_a["away_score"]["mean"],
            "away_score_p50": b_a["away_score"]["p50"],
            "home_score_mean": b_a["home_score"]["mean"],
            "home_score_p50": b_a["home_score"]["p50"],
            "total_points_mean": b_a["total_points"]["mean"],
            "total_points_p50": b_a["total_points"]["p50"],
            "away_win_prob": b_a.get("away_win_prob"),
            "home_cover_prob": b_a.get("home_cover_prob"),
            "over_prob": b_a.get("over_total_prob"),
        },
        "stage5_board_summary": stage5["board_summary"],
        "stage5_game_line_evaluations": stage5["game_line_evaluations"],
        "cryptographic_receipt_chain": bundle["cryptographic_receipt_chain"],
        "master_bundle_sha256": bundle["master_bundle_sha256"],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="WP-8 Week 10 full-slate connected 5-stage workflow (live Neon slate).")
    ap.add_argument("--n-sims", type=int, default=10000, help="Monte Carlo worlds per game (default 10000)")
    ap.add_argument("--dry-run", action="store_true", help="Validate slate + Stage 0 config only; no sims, no JEV calls")
    ap.add_argument("--only", default="", help="Comma-separated AWAY@HOME filters (e.g. NE@DET,KC@ATL)")
    args = ap.parse_args()

    # Stage 0 hard gate first (week-aware config; fail-closed on stale rosters).
    cfg = require_week(WEEK)
    games = fetch_remaining_slate()
    slate: list[tuple[str, str, dict[str, Any]]] = []
    unmapped: list[str] = []
    for g in games:
        home = FULL_TO_ABBR.get(g["homeTeamName"])
        away = FULL_TO_ABBR.get(g["awayTeamName"])
        if not home or not away:
            unmapped.append(f'{g["awayTeamName"]} @ {g["homeTeamName"]}')
            continue
        slate.append((away, home, g))
    if unmapped:
        print(f"[WP-8] FAIL: unmapped team names: {unmapped}", file=sys.stderr)
        return 1
    if args.only:
        wanted = {m.strip().upper() for m in args.only.split(",") if m.strip()}
        slate = [(a, h, g) for a, h, g in slate if f"{a}@{h}" in wanted]
    pairs = [tuple(sorted((a, h))) for a, h, _ in slate]
    if len(pairs) != len(set(pairs)):
        print("[WP-8] FAIL: duplicate fixtures on slate", file=sys.stderr)
        return 1

    print(f"[WP-8] Week {WEEK} remaining slate: {len(slate)} games | Stage 0 as_of {cfg['as_of']} | excluded {len(cfg['excluded_players'])} | n_sims={args.n_sims}")
    for a, h, g in slate:
        print(f"  {a} @ {h}  {g['commenceTime']}  ({g['id']})")

    if args.dry_run:
        print("[WP-8] DRY RUN OK — slate + Stage 0 validated; no simulations executed.")
        return 0

    dossiers: dict[str, dict[str, Any]] = {}
    failures: dict[str, str] = {}
    for away, home, game in slate:
        key = f"{away} @ {home}"
        print(f"[WP-8] === {key} — full 5-stage + JEV spine + {args.n_sims} worlds ===", flush=True)
        try:
            bundle = execute_connected_game_workflow(away=away, home=home, week=WEEK, n_sims=args.n_sims)
            dossiers[key] = summarize_dossier(away, home, bundle, game)
            print(f"[WP-8] {key} OK sha256={bundle['master_bundle_sha256'][:16]}", flush=True)
        except Exception:
            failures[key] = traceback.format_exc()
            print(f"[WP-8] {key} FAILED — recorded in coverage audit", file=sys.stderr, flush=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    packet = {
        "schema_version": "1.0.0",
        "week": WEEK,
        "generated_at_utc": generated_at,
        "slate_source": "live Neon public.games (T-00 query shape)",
        "n_sims_per_game": args.n_sims,
        "remaining_games_count": len(slate),
        "dossiers_completed_count": len(dossiers),
        "failures_count": len(failures),
        "matchups_evaluated": sorted(dossiers),
        "dossiers": dossiers,
        "stage0": {"as_of": cfg["as_of"], "excluded": len(cfg["excluded_players"]), "qb1s": len(cfg["confirmed_qb1"])},
    }
    packet["slate_packet_sha256"] = hashlib.sha256(
        json.dumps(packet, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()

    coverage = {
        "week": WEEK,
        "generated_at_utc": generated_at,
        "expected": [f"{a} @ {h}" for a, h, _ in slate],
        "completed": sorted(dossiers),
        "failed": {k: v.splitlines()[-1] for k, v in failures.items()},
        "full_tracebacks": failures,
        "coverage": f"{len(dossiers)}/{len(slate)}",
        "all_green": not failures and len(dossiers) == len(slate),
    }
    call_sheet = {
        "week": WEEK,
        "generated_at_utc": generated_at,
        "slate_packet_sha256": packet["slate_packet_sha256"],
        "games": {
            k: {
                "post_sim_team_scores": d["post_sim_team_scores"],
                "stage5_board_summary": d["stage5_board_summary"],
                "stage5_game_line_evaluations": d["stage5_game_line_evaluations"],
                "master_bundle_sha256": d["master_bundle_sha256"],
            }
            for k, d in dossiers.items()
        },
    }
    for path, obj in ((OUT_DOSSIERS, packet), (OUT_CALL_SHEET, call_sheet), (OUT_COVERAGE, coverage)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
        print(f"[WP-8] wrote {path.relative_to(REPO_ROOT)}")

    print(f"[WP-8] COVERAGE {coverage['coverage']} | sha256={packet['slate_packet_sha256'][:16]}")
    if not coverage["all_green"]:
        print("[WP-8] FAIL — incomplete coverage; REFUSE_PROJECTION on failed games.", file=sys.stderr)
        return 1
    print("[WP-8] WEEK 10 FULL SLATE CONNECTED WORKFLOW COMPLETE — all games green.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())