#!/usr/bin/env python3
# Provenance: Garrett 2026-10-02 hard constraint — ZeroGPU deploy must be
# provably $0 forever. This monitor is the tripwire: if the Space hardware
# ever leaves the free ZeroGPU tier, or the Space stops serving, it raises a
# LOUD alert (non-zero exit, stderr). Cron-friendly: run every 30 min.
#
# Usage: python3 drift_monitor.py [space_id ...]
#   default: Beexly/mimo-brain-engine Beexly/studio-chat
# Exit 0: all clear. Exit 2: DRIFT DETECTED (see stderr).

"""ZeroGPU drift monitor: free hardware + serving, or loud alert."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request

SPACES = sys.argv[1:] or ["Beexly/mimo-brain-engine", "Beexly/studio-chat"]

# Hardware strings that are FREE. Anything else on a monitored Space = drift.
# ZeroGPU request types look like "zero-a10g". cpu-basic is the free CPU tier.
FREE_HARDWARE_PREFIXES = ("zero-", "cpu")
PAID_HARDWARE_MARKERS = ("t4-", "a10g-", "a100", "l4", "l40s", "h100", "v100")

HF_API = "https://huggingface.co/api/spaces"


def _hf_get(path: str) -> dict:
    # Use the huggingface skill's credential via env passthrough is not
    # available here; use the skill binary instead.
    out = subprocess.run(
        [os.path.expanduser("~/workspace/skills/huggingface/bin/hf-api"),
         "GET", path],
        capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        raise RuntimeError(f"hf-api GET {path} failed: {out.stderr[:300]}")
    return json.loads(out.stdout)


def _serving(url: str) -> tuple[bool, str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "gse-drift-monitor/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            code = resp.status
            body = resp.read(200).decode(errors="replace")
            if code == 200:
                return True, "ok"
            return False, f"HTTP {code}: {body[:100]}"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)[:200]


def check_space(space: str) -> list[str]:
    problems: list[str] = []
    try:
        # /runtime carries stage/hardware/domains; the repo endpoint does not.
        info = _hf_get(f"/api/spaces/{space}/runtime")
    except Exception as exc:  # noqa: BLE001
        return [f"{space}: could not read Space runtime: {exc}"]
    hw = info.get("hardware") or {}
    current = hw.get("current")
    requested = hw.get("requested")
    for label, val in (("current", current), ("requested", requested)):
        if val is None:
            continue
        v = str(val).lower()
        if any(m in v for m in PAID_HARDWARE_MARKERS):
            problems.append(
                f"{space}: PAID HARDWARE DETECTED ({label}={val}) — billing risk!")
        elif not v.startswith(FREE_HARDWARE_PREFIXES):
            problems.append(
                f"{space}: unknown hardware tier ({label}={val}) — verify it is free")
    stage = info.get("stage")
    domains = info.get("domains") or []
    url = None
    for d in domains:
        if d.get("domain"):
            url = f"https://{d['domain']}/"
            break
    if url:
        ok, detail = _serving(url)
        if not ok:
            # ZeroGPU cold starts can take minutes: one retry before alerting.
            import time as _t
            _t.sleep(90)
            ok, detail = _serving(url)
        if not ok:
            problems.append(f"{space}: not serving ({detail}) [stage={stage}]")
    else:
        problems.append(f"{space}: no domain found [stage={stage}]")
    return problems


def main() -> int:
    all_problems: list[str] = []
    for space in SPACES:
        all_problems.extend(check_space(space))
    if all_problems:
        sys.stderr.write("ZEROGPU DRIFT ALERT\n")
        for p in all_problems:
            sys.stderr.write(f"  - {p}\n")
        sys.stderr.write(
            "Action: verify Space settings on huggingface.co — hardware must stay\n"
            "on ZeroGPU (free tier). Paid GPU hardware bills usage-based.\n")
        return 2
    print(f"OK: {len(SPACES)} Space(s) on free hardware and serving: {', '.join(SPACES)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
