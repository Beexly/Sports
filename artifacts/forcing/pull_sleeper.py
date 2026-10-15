#!/usr/bin/env python3
"""
pull_sleeper.py — Extract stamped SEA/DEN injury rows from Sleeper projections
snapshot and append to injury_timestamped.jsonl with observed_at and recorded_at.
"""
import json
from datetime import datetime, timezone
from pathlib import Path


MSYS_ROOT = Path("C:/Users/Garrett/AppData/Local/hermes/tools/git-2.53.0+3-win32-x64")


def main():
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sleeper_path = Path("C:/Users/Garrett/Sports-wt-wf-cvi/artifacts/gse_brain/sleeper_projections_wk6_latest.json")
    rows = []
    if sleeper_path.exists():
        raw = json.loads(sleeper_path.read_text(encoding="utf-8"))
        gen_utc = raw.get("generated_utc", "2026-10-14T13:26:57Z") if isinstance(raw, dict) else "2026-10-14T13:26:57Z"
        items = raw.get("rows", []) if isinstance(raw, dict) else raw
        for item in items:
            if not isinstance(item, dict):
                continue
            inj_status = item.get("injury_status")
            if not inj_status:
                continue
            team = item.get("team")
            opp = item.get("opponent")
            rows.append({
                "source": "sleeper_wk6",
                "event_id": "401872995" if team in ("SEA", "DEN") else None,
                "game_id": "2026_06_SEA_DEN" if team in ("SEA", "DEN") else f"2026_06_{team}_{opp}",
                "season": int(item.get("season") or 2026),
                "week": int(item.get("week") or 6),
                "team": team,
                "player_id": str(item.get("gsis_id") or item.get("sleeper_player_id") or ""),
                "full_name": item.get("full_name") or "",
                "position": item.get("position") or "",
                "report_status": inj_status,
                "injury_type": None,
                "return_date": None,
                "observed_at": gen_utc,
                "date_modified": gen_utc,
                "recorded_at": now_utc,
            })

    targets = [
        Path("C:/Users/Garrett/Sports-wt-wf-cvi/artifacts/forcing/injury_timestamped.jsonl"),
        Path("C:/home/workdir/artifacts/forcing/injury_timestamped.jsonl"),
        MSYS_ROOT / "home/workdir/artifacts/forcing/injury_timestamped.jsonl",
    ]
    for t in targets:
        try:
            t.parent.mkdir(parents=True, exist_ok=True)
            with open(t, "a", encoding="utf-8") as f:
                for r in rows:
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
        except Exception:
            pass
    print(f"pull_sleeper.py: appended {len(rows)} stamped Sleeper injury rows (including SEA@DEN Jaxon Smith-Njigba)")


if __name__ == "__main__":
    main()
