#!/usr/bin/env python3
"""
Deterministic Wave State & Queue Updater for NIGHT-STATE.json, WORK-QUEUE.jsonl, and NIGHT-LESSONS.md.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WIRING_DIR = REPO_ROOT / "docs" / "wiring"


def matches_wave(item_wave: str, target_wave: str) -> bool:
    if item_wave == target_wave:
        return True
    parts_i = item_wave.split("_")[:2]
    parts_t = target_wave.split("_")[:2]
    return parts_i == parts_t


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--close-wave", required=True)
    parser.add_argument("--next-wave", required=True)
    parser.add_argument("--status", default="IN_PROGRESS")
    parser.add_argument("--lesson", default="")
    args = parser.parse_args()

    now_iso = datetime.now(timezone.utc).isoformat()

    wq_path = WIRING_DIR / "WORK-QUEUE.jsonl"
    items = [json.loads(line) for line in wq_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    for item in items:
        w = str(item.get("wave", ""))
        if matches_wave(w, args.close_wave):
            item["status"] = "DONE"
            item["completed_at_utc"] = now_iso
        elif matches_wave(w, args.next_wave) and item.get("status") == "QUEUED":
            item["status"] = "IN_PROGRESS"

    wq_path.write_text("\n".join(json.dumps(x) for x in items) + "\n", encoding="utf-8")

    done_count = sum(1 for x in items if x.get("status") in ("DONE", "COMPLETED"))
    in_prog_count = sum(1 for x in items if x.get("status") == "IN_PROGRESS")
    queued_count = sum(1 for x in items if x.get("status") == "QUEUED")

    ns_path = WIRING_DIR / "NIGHT-STATE.json"
    ns = json.loads(ns_path.read_text(encoding="utf-8"))
    ns["updated_at_utc"] = now_iso
    ns["status"] = args.status
    ns["current_wave"] = args.next_wave
    if "waves" in ns:
        for k in list(ns["waves"].keys()):
            if matches_wave(k, args.close_wave):
                ns["waves"][k] = "DONE"
            elif matches_wave(k, args.next_wave) and args.status != "ARMED":
                ns["waves"][k] = "IN_PROGRESS"
    ns["queue_summary"] = {
        "total_items": len(items),
        "done_items": done_count,
        "in_progress_items": in_prog_count,
        "queued_items": queued_count,
    }
    ns_path.write_text(json.dumps(ns, indent=2) + "\n", encoding="utf-8")

    if args.lesson:
        nl_path = WIRING_DIR / "NIGHT-LESSONS.md"
        with nl_path.open("a", encoding="utf-8") as f:
            f.write(f"\n### {args.close_wave} Closed ({now_iso})\n- {args.lesson}\n")

    print(json.dumps(ns["queue_summary"]), flush=True)


if __name__ == "__main__":
    main()
