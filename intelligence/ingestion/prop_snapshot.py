"""PROP SNAPSHOT — archive the DK prop board for every upcoming game.

The pre-registration cycle learned the lesson: no week-5 archive existed, so
the model-vs-line test couldn't run retroactively. This script snapshots the
full DK board for all upcoming games, stamped, so every future week has the
pre-game archive the falsifier needs. Idempotent: one file per (game,
capture hour) — repeated runs extend the archive instead of duplicating.

Cron-able: run every 6h. Bounded: 14 games x ~55 pages each, ~3 min.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence" / "ingestion"))
from espn_prop_client import prop_board, normalize  # noqa: E402

OUT_DIR = REPO / "docs" / "data-sources" / "research" / "props-archive"


def main() -> int:
    req = urllib.request.Request(
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
        headers={"User-Agent": "Mozilla/5.0"})
    d = json.load(urllib.request.urlopen(req, timeout=30))
    evs = d.get("events") or []
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%dT%H")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    captured = []
    for e in evs:
        gid = e["id"]
        out = OUT_DIR / f"{gid}_{stamp}.json"
        if out.exists():
            continue
        try:
            items = prop_board(gid, max_pages=60)
            rows = normalize(items)
            out.write_text(json.dumps({
                "captured_utc": now.isoformat(),
                "game_id": gid, "game": e.get("name"),
                "commence": e.get("date"),
                "count": len(rows), "lines": rows,
            }, indent=1), encoding="utf-8")
            captured.append((gid, e.get("name"), len(rows)))
        except Exception as ex:
            captured.append((gid, e.get("name"), f"FAIL {ex}"))
    for gid, name, n in captured:
        print(f"  {gid} {name}: {n}")
    print(f"\narchive dir: {OUT_DIR.relative_to(REPO)} | captured {len(captured)} games")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
