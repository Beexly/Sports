"""Read nfl4th precomputed RDS releases. Does not fit a model.

The play-by-play CSV does not carry go_wp, punt_wp, or fg_wp.
Those values are published as RDS on nflverse/nfl4th.
NaN stays null. A row without game_id or play_id is not written.

Stdout is one JSON object: {"read", "kept", "refused"}.
The JSONL is written to <out>.tmp and renamed only after both seasons load.
"""

from __future__ import annotations

import json
import math
import os
import sys
import urllib.request
from pathlib import Path

import rdata


def num(value: object) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if math.isnan(parsed) or math.isinf(parsed):
        return None
    return parsed


def play_id_of(value: object) -> int | float | None:
    parsed = num(value)
    if parsed is None:
        return None
    if parsed.is_integer():
        return int(parsed)
    return parsed


def season_of(game_id: str) -> int | None:
    head = game_id.split("_", 1)[0]
    if len(head) == 4 and head.isdigit():
        return int(head)
    return None


def load_season(season: int, cache_dir: Path) -> tuple[list[dict[str, object]], int, dict[str, int]]:
    url = (
        "https://github.com/nflverse/nfl4th/releases/download/"
        f"nfl4th_infrastructure/pre_computed_go_boost_{season}.rds"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "gse-cycle8"})
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = response.read()
    cache = cache_dir / f"pre_computed_go_boost_{season}.rds"
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(payload)
    frame = rdata.conversion.convert(rdata.parser.parse_file(cache))
    rows: list[dict[str, object]] = []
    read = 0
    refused = {"missing_game_id": 0, "missing_play_id": 0}
    for record in frame.to_dict(orient="records"):
        read += 1
        game_id = record.get("game_id")
        play_id = play_id_of(record.get("play_id"))
        if game_id is None or str(game_id).strip() == "":
            refused["missing_game_id"] += 1
            continue
        if play_id is None:
            refused["missing_play_id"] += 1
            continue
        rows.append(
            {
                "game_id": str(game_id),
                "play_id": play_id,
                "season": season_of(str(game_id)),
                "go_wp": num(record.get("go_wp")),
                "punt_wp": num(record.get("punt_wp")),
                "fg_wp": num(record.get("fg_wp")),
            }
        )
    return rows, read, refused


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: extract_fourth_down.py <out.jsonl> <cache-dir>")
    out = Path(sys.argv[1])
    cache_dir = Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.name + ".tmp")
    read = 0
    kept = 0
    refused = {"missing_game_id": 0, "missing_play_id": 0}
    try:
        with tmp.open("w", encoding="utf-8", newline="\n") as handle:
            for season in (2024, 2025):
                rows, season_read, season_refused = load_season(season, cache_dir)
                read += season_read
                for reason, count in season_refused.items():
                    refused[reason] = refused.get(reason, 0) + count
                for row in rows:
                    handle.write(json.dumps(row, separators=(",", ":")) + "\n")
                    kept += 1
        if read != kept + sum(refused.values()):
            raise RuntimeError(f"read {read} != kept {kept} + refused {sum(refused.values())}")
        os.replace(tmp, out)
    except Exception:
        if tmp.exists():
            tmp.unlink()
        raise
    sys.stdout.write(json.dumps({"read": read, "kept": kept, "refused": refused}, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
