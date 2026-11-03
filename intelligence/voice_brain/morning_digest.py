"""Spoken morning/evening digest built from real on-disk artifacts.

Every sentence is generated from a file that exists on this machine. If an artifact
is missing, the digest says so — it does not fill the gap with a plausible number.

Artifacts read
  data/engine/new_engine_official_ledger_2026.json   verified_record + secondary_views
  data/engine/team_priors_weeks_1_to_8_trained.json  epoch metrics + week coverage
  data/engine/workflow_runs/run_*.json               last 6-seat checkpoint
  data/dfs/*_packet_2026_11_03.json                  latest DFS packets
  docs/dfs/research/2026-11-03/*.md                  packet presence

Usage
  python -m intelligence.voice_brain.morning_digest            # print text
  python -m intelligence.voice_brain.morning_digest --json      # JSON only
  python -m intelligence.voice_brain.morning_digest --speak     # speak it too
  python -m intelligence.voice_brain.morning_digest --evening   # evening framing
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

LEDGER = ROOT / "data" / "engine" / "new_engine_official_ledger_2026.json"
PRIORS = ROOT / "data" / "engine" / "team_priors_weeks_1_to_8_trained.json"
RUNS_DIR = ROOT / "data" / "engine" / "workflow_runs"
DFS_DIR = ROOT / "data" / "dfs"
DFS_DOCS = ROOT / "docs" / "dfs" / "research" / "2026-11-03"


def _load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _ledger_section() -> dict:
    d = _load_json(LEDGER)
    if d is None:
        return {"available": False, "note": f"missing {LEDGER.name}"}
    vr = d.get("verified_record") or {}
    secondaries = []
    for view in d.get("secondary_views") or []:
        if isinstance(view, dict):
            secondaries.append({
                "name": view.get("name") or view.get("view") or view.get("id"),
                "record": view.get("record"),
                "net_units": view.get("net_units"),
            })
    return {
        "available": True,
        "verified_record": vr.get("record"),
        "net_units": vr.get("net_units"),
        "win_pct": vr.get("win_pct"),
        "total_graded": vr.get("total_graded"),
        "secondary_views": [s for s in secondaries if s.get("record")],
        "as_of": d.get("as_of"),
    }


def _priors_section() -> dict:
    d = _load_json(PRIORS)
    if d is None:
        return {"available": False, "note": f"missing {PRIORS.name}"}
    epochs = d.get("epochs") or []
    last = epochs[-1] if epochs else {}
    return {
        "available": True,
        "generated_at_utc": d.get("generated_at_utc"),
        "plays_loaded": d.get("plays_loaded"),
        "weeks_available": d.get("weeks_available"),
        "week8_status": d.get("week8_status"),
        "epochs_run": len(epochs),
        "last_epoch": {
            "brier": last.get("brier"),
            "log_loss": last.get("log_loss"),
            "ece": last.get("ece"),
        },
        "team_priors_count": len(d.get("team_priors") or {}),
        "secondary_epa_rmse_last_week": d.get("secondary_epa_rmse_last_week"),
    }


def _latest_run() -> dict:
    if not RUNS_DIR.exists():
        return {"available": False, "note": "no workflow_runs directory"}
    runs = sorted(p for p in RUNS_DIR.glob("run_*.json") if p.is_file())
    if not runs:
        return {"available": False, "note": "no run checkpoints"}
    d = _load_json(runs[-1]) or {}
    seats = d.get("seats") or d.get("results") or []
    seat_rows = []
    for seat in seats if isinstance(seats, list) else []:
        seat_rows.append({
            "seat": seat.get("seat"),
            "name": seat.get("name"),
            "status": seat.get("status"),
        })
    return {
        "available": True,
        "path": runs[-1].name,
        "started_at_utc": d.get("started_at_utc") or d.get("started_at"),
        "finished_at_utc": d.get("finished_at_utc") or d.get("finished_at"),
        "seats": seat_rows,
        "passed": sum(1 for s in seat_rows if str(s.get("status")).upper() == "PASS"),
        "failed": sum(1 for s in seat_rows if str(s.get("status")).upper() in {"FAIL", "ERROR"}),
    }


def _dfs_section() -> dict:
    packets = []
    if DFS_DIR.exists():
        for p in sorted(DFS_DIR.glob("*_packet_2026_11_03.json")):
            d = _load_json(p) or {}
            packets.append({
                "packet": p.name,
                "slate": d.get("slate_name"),
                "portfolio_size": d.get("portfolio_size"),
                "win_threshold_p99": d.get("win_threshold_p99"),
            })
    docs = sorted(p.name for p in DFS_DOCS.glob("*.md")) if DFS_DOCS.exists() else []
    return {"available": bool(packets), "packets": packets, "docs": docs}


def build_digest(evening: bool = False) -> dict:
    """Assemble the digest dict from real artifacts only."""
    led = _ledger_section()
    pri = _priors_section()
    run = _latest_run()
    dfs = _dfs_section()

    lines = []
    greeting = "Good evening" if evening else "Good morning"
    lines.append(f"{greeting}. This is the GSE brain digest for {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC.")

    if led["available"]:
        lines.append(
            f"Canonical ledger: {led['verified_record']} for {led['net_units']}"
            + (f", {led['win_pct']} percent" if led.get("win_pct") else "")
            + (f" across {led['total_graded']} graded plays." if led.get("total_graded") else ".")
        )
        if led["secondary_views"]:
            views = "; ".join(
                f"{v['name']} {v['record']} {v['net_units']}" for v in led["secondary_views"][:4]
            )
            lines.append(f"Secondary views: {views}.")
    else:
        lines.append(f"Canonical ledger unavailable: {led['note']}.")

    if pri["available"]:
        last = pri["last_epoch"]
        lines.append(
            f"Weeks one through eight replay trainer: {pri['epochs_run']} epochs on "
            f"{pri['plays_loaded']} plays, weeks {pri['weeks_available']}, "
            f"week eight status {pri['week8_status']}."
        )
        if last.get("brier") is not None:
            lines.append(
                f"Last epoch Brier {last['brier']:.4f}, log loss {last['log_loss']:.4f}, "
                f"calibration error {last['ece']:.4f}."
            )
        lines.append(f"{pri['team_priors_count']} team priors written.")
    else:
        lines.append(f"Replay trainer output unavailable: {pri['note']}.")

    if run["available"]:
        lines.append(
            f"Last workflow run {run['path']} finished with {run['passed']} seats passing "
            f"and {run['failed']} failing."
        )
    else:
        lines.append(f"No workflow checkpoint: {run['note']}.")

    if dfs["available"]:
        for p in dfs["packets"]:
            lines.append(
                f"DFS packet {p['slate']}: {p['portfolio_size']} lineups, "
                f"p99 field threshold {p['win_threshold_p99']} points."
            )
    else:
        lines.append("No DFS packets on disk for 2026-11-03.")

    lines.append("All figures above are read from disk; nothing is estimated in this digest.")

    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "framing": "evening" if evening else "morning",
        "sections": {
            "ledger": led,
            "replay_trainer": pri,
            "workflow_run": run,
            "dfs": dfs,
        },
        "text": " ".join(lines),
    }


def speak_digest(digest: dict | None = None, evening: bool = False) -> dict:
    """Speak the digest via voice_interface.speak (fish-audio first, SAPI fallback)."""
    digest = digest or build_digest(evening=evening)
    try:
        from .voice_interface import fish_audio_available, speak

        ok = bool(speak(digest["text"], prefer_fish_audio=True))
        return {
            "spoken": ok,
            "voice_provider": "fish_audio" if (ok and fish_audio_available()) else "sapi",
            "chars": len(digest["text"]),
        }
    except Exception as exc:
        return {"spoken": False, "voice_provider": "error", "error": str(exc)}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="GSE spoken morning/evening digest")
    ap.add_argument("--evening", action="store_true")
    ap.add_argument("--json", action="store_true", help="emit JSON only")
    ap.add_argument("--speak", action="store_true", help="also speak the digest")
    ap.add_argument("--out", default=None, help="optional path to write the digest JSON")
    args = ap.parse_args(argv)

    digest = build_digest(evening=args.evening)
    if args.speak:
        digest["voice"] = speak_digest(digest)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(digest, indent=2), encoding="utf-8")
    if args.json:
        print(json.dumps(digest, indent=2))
    else:
        print(digest["text"])
        if "voice" in digest:
            print(f"[voice] spoken={digest['voice'].get('spoken')} provider={digest['voice'].get('voice_provider')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
