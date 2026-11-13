#!/usr/bin/env python3
"""
scripts/ops/refresh_week10_slate_aggregates.py

Crucible-fix slate refresh: rebuild the WP-8 slate-level aggregates from the
13 per-game sealed dossiers WITHOUT re-simulating any game. Used after a
single-game re-seal (e.g. HOU@CLE Watson live-starter fix ed07a8fb5, SF@DAL
roof-closed environment fix) so the master call sheet + all-games bundle
reflect the corrected dossiers while the other games stay byte-identical.

Rebuilds (same shapes/hashes as run_week10_full_slate_connected_workflow.py):
  - data/engine/week10_full_slate_connected_dossiers_2026_11_13.json (packet)
  - data/engine/week10_complete_360_all_games_verified_call_sheet.json
  - data/engine/week10_coverage_audit_2026.json (timestamp refresh only)

Usage:
  python scripts/ops/refresh_week10_slate_aggregates.py --matchups HOU@CLE,SF@DAL
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.run_week10_full_slate_connected_workflow import (  # noqa: E402
    OUT_CALL_SHEET,
    OUT_COVERAGE,
    OUT_DOSSIERS,
    WEEK,
    summarize_dossier,
)


def main() -> int:
    ap = argparse.ArgumentParser(description="Refresh Week 10 slate aggregates from sealed per-game dossiers (no re-simulation).")
    ap.add_argument("--matchups", default="HOU@CLE,SF@DAL", help="Comma-separated AWAY@HOME dossiers to re-summarize from disk")
    args = ap.parse_args()

    packet = json.loads(OUT_DOSSIERS.read_text(encoding="utf-8"))
    coverage = json.loads(OUT_COVERAGE.read_text(encoding="utf-8"))
    dossiers: dict[str, Any] = packet["dossiers"]
    if len(dossiers) != 13:
        raise RuntimeError(f"expected 13 sealed dossiers in slate packet, found {len(dossiers)}")

    refreshed: list[str] = []
    for m in args.matchups.split(","):
        m = m.strip().upper()
        if not m:
            continue
        away_u, home_u = m.split("@")
        key = f"{away_u} @ {home_u}"
        if key not in dossiers:
            raise RuntimeError(f"{key} not present in slate packet")
        prev = dossiers[key]
        dossier_path = REPO_ROOT / prev["dossier_rel_path"]
        bundle = json.loads(dossier_path.read_text(encoding="utf-8"))
        # summarize_dossier consumes the on-disk master bundle (same stage keys
        # as the in-memory bundle returned by execute_connected_game_workflow).
        game = {"id": prev["game_id"], "commenceTime": prev["kickoff_utc"]}
        new_summary = summarize_dossier(away_u, home_u, bundle, game)
        if new_summary["master_bundle_sha256"] != bundle["master_bundle_sha256"]:
            raise RuntimeError(f"{key}: summary hash mismatch vs sealed dossier")
        dossiers[key] = new_summary
        refreshed.append(key)
        print(f"[SLATE-REFRESH] {key} re-summarized from {prev['dossier_rel_path']} | master_sha256={bundle['master_bundle_sha256'][:16]}")

    generated_at = datetime.now(timezone.utc).isoformat()
    packet["generated_at_utc"] = generated_at
    packet["dossiers_completed_count"] = len(dossiers)
    packet["failures_count"] = 0
    packet["matchups_evaluated"] = sorted(dossiers)
    packet.pop("slate_packet_sha256", None)
    packet["slate_packet_sha256"] = hashlib.sha256(
        json.dumps(packet, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()

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
    coverage["generated_at_utc"] = generated_at
    coverage["completed"] = sorted(dossiers)
    coverage["coverage"] = f"{len(dossiers)}/13"
    coverage["all_green"] = len(dossiers) == 13 and not coverage.get("failed")

    for path, obj in ((OUT_DOSSIERS, packet), (OUT_CALL_SHEET, call_sheet), (OUT_COVERAGE, coverage)):
        path.write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
        print(f"[SLATE-REFRESH] wrote {path.relative_to(REPO_ROOT)}")

    print(f"[SLATE-REFRESH] COVERAGE {coverage['coverage']} | refreshed={refreshed} | slate_packet_sha256={packet['slate_packet_sha256'][:16]}")
    if not coverage["all_green"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())