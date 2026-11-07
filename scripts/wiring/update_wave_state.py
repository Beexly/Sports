#!/usr/bin/env python3
"""
Deterministic Wave State & Queue Updater for NIGHT-STATE.json, WORK-QUEUE.jsonl, and NIGHT-LESSONS.md.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List

REPO_ROOT = Path(__file__).resolve().parents[2]
WIRING_DIR = REPO_ROOT / "docs" / "wiring"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--close-wave", required=True)
    parser.add_argument("--next-wave", required=True)
    parser.add_argument("--status", default="IN_PROGRESS")
    parser.add_argument("--lesson", default="")
    args = parser.parse_args()

    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Update WORK-QUEUE.jsonl
    wq_path = WIRING_DIR / "WORK-QUEUE.jsonl"
    items = [json.loads(line) for line in wq_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    for item in items:
        if item.get("wave") == args.close_wave:
            item["status"] = "DONE"
            item["completed_at_utc"] = now_iso
        elif item.get("wave") == args.next_wave and item.get("status") == "QUEUED":
            item["status"] = "IN_PROGRESS"

    wq_path.write_text("\n".join(json.dumps(x) for x in items) + "\n", encoding="utf-8")

    done_count = sum(1 for x in items if x.get("status") == "DONE")
    in_prog_count = sum(1 for x in items if x.get("status") == "IN_PROGRESS")
    queued_count = sum(1 for x in items if x.get("status") == "QUEUED")

    # 2. Update NIGHT-STATE.json
    ns_path = WIRING_DIR / "NIGHT-STATE.json"
    ns = json.loads(ns_path.read_text(encoding="utf-8"))
    ns["updated_at_utc"] = now_iso
    ns["status"] = args.status
    ns["current_wave"] = args.next_wave
    if "waves" in ns:
        if args.close_wave in ns["waves"]:
            ns["waves"][args.close_wave] = "DONE"
        if args.next_wave in ns["waves"] and args.status != "ARMED":
            ns["waves"][args.next_wave] = "IN_PROGRESS"
    ns["queue_summary"] = {
        "total_items": len(items),
        "done_items": done_count,
        "in_progress_items": in_prog_count,
        "queued_items": queued_count,
    }
    ns_path.write_text(json.dumps(ns, indent=2) + "\n", encoding="utf-8")

    # 3. Append to NIGHT-LESSONS.md
    if args.lesson:
        nl_path = WIRING_DIR / "NIGHT-LESSONS.md"
        with nl_path.open("a", encoding="utf-8") as f:
            f.write(f"\n### {args.close_wave} Closed ({now_iso})\n- {args.lesson}\n")

    print(json.dumps(ns["queue_summary"]), flush=True)


if __name__ == "__main__":
    main()
