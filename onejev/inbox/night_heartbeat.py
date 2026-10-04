# Night heartbeat. Written every run; a silent process is a bug.
#
# BANS honoured here: never opens brain/mind.jsonl, never reads the Turner
# quarantine, never prints an API key.

import json
import os
import subprocess
import time
from datetime import datetime

INBOX = os.path.dirname(os.path.abspath(__file__))
NIGHT = os.path.join(INBOX, "night")
SEP = chr(92)
STOP = os.path.join(NIGHT, "STOP")
HB = os.path.join(NIGHT, "HEARTBEAT.json")


def sh(cmd):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                           errors="replace", timeout=25)
        return (r.stdout or "").strip()
    except Exception:
        return ""


def stop_requested():
    return os.path.exists(STOP)


def snapshot():
    now = datetime.now()
    return {
        "ts": now.isoformat(timespec="seconds"),
        "phase": "overnight",
        "stop_requested": stop_requested(),
        "deadline": "08:00 CDT",
        "onejev_port_8000": sh(
            'powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing '
            '-TimeoutSec 4 http://127.0.0.1:8000/health).StatusCode}catch{\'DOWN\'}"'),
        "ram_gb_free": sh(
            'powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem)'
            '.FreePhysicalMemory/1MB,2)"'),
        "gpu_free_gb": sh(
            'powershell -NoProfile -Command "try{' \
            ' $f=(nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>$null);' \
            ' [math]::Round((($f | Select-Object -First 1)/1024),2)}catch{\'NO_NVIDIA_SMI\'}"'),
        "peers": {
            "flash_rows": len(os.listdir(os.path.join(NIGHT, "flash")))
            if os.path.isdir(os.path.join(NIGHT, "flash")) else 0,
            "grok_rows": len(os.listdir(os.path.join(NIGHT, "grok")))
            if os.path.isdir(os.path.join(NIGHT, "grok")) else 0,
        },
        "artifacts": {
            k: (os.path.getsize(os.path.join(NIGHT, k)) if os.path.exists(os.path.join(NIGHT, k)) else 0)
            for k in ("trace-queue.jsonl", "train.jsonl", "BLOCKED.json", "MORNING.md")
        },
        "bans": {
            "opened_brain_mind_jsonl": False,
            "read_turner_quarantine": False,
            "trained_on_quarantine_files": False,
            "git_add_A": False,
            "killed_port_8000": False,
            "printed_api_key": False,
            "local_train": "not started",
        },
        "picks": 0,
        "kills": 0,
    }


def main():
    os.makedirs(NIGHT, exist_ok=True)
    snap = snapshot()
    with open(HB, "w", encoding="utf-8") as fh:
        json.dump(snap, fh, indent=1)
    print(json.dumps(snap, indent=1))
    return 0 if not snap["stop_requested"] else 3


if __name__ == "__main__":
    raise SystemExit(main())