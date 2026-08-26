#!/usr/bin/env python3
"""
Player-week signal extractor for the independent modelProb pipeline (Q2 / C-28).

MARKET-FREE BY CONSTRUCTION. Reads only nflverse play-by-play and emits per
(player, week) receiving-volume and depth aggregates. It never reads a line, a
price, a spread, a total, a consensus or a confidence — there is no market
column in its output and no market column is consulted to produce one.

Signals emitted:
  targets  — falsifier SURVIVOR (logM 33.1). Count of pass attempts on which the
             player is the intended receiver.
  adot     — average depth of target = mean air_yards over those attempts.
             Stands in for the PFR REC `adot` in the persistence table (r=0.900
             season-level, n=5 pairs). Derived here from PBP directly because
             pfr_advstats is absent from every origin ref.

NOT emitted: avgSeparation (falsifier SURVIVOR, logM 44.3). Separation is a Next
Gen Stats TRACKING metric; play-by-play carries no separation or cushion column
(verified: neither appears in the 2023 header). It cannot be derived here and is
recorded as MISSING rather than approximated by a proxy.

Usage: zcat data/nflverse/pbp/play_by_play_2023.csv.gz | python3 scripts/ops/build-player-week-signals.py > out.jsonl
"""
import csv
import json
import sys

FORBIDDEN_MARKET_TOKENS = (
    "spread_line", "total_line", "odds", "price", "vegas", "moneyline",
)


def main() -> int:
    reader = csv.DictReader(sys.stdin)
    fieldnames = reader.fieldnames or []

    # Fail loudly rather than silently emitting a market-contaminated signal.
    consumed = {"season", "season_type", "week", "receiver_player_id",
                "receiver_player_name", "posteam", "pass_attempt", "air_yards"}
    for col in consumed:
        if col not in fieldnames:
            print(f"MISSING: play-by-play column {col}", file=sys.stderr)
            return 2
    for col in consumed:
        low = col.lower()
        if any(tok in low for tok in FORBIDDEN_MARKET_TOKENS):
            print(f"REFUSED: market column {col} in the consumed set", file=sys.stderr)
            return 2

    agg: dict[tuple, dict] = {}
    plays = 0
    for row in reader:
        plays += 1
        if row.get("season_type") != "REG":
            continue
        if row.get("pass_attempt") != "1":
            continue
        pid = (row.get("receiver_player_id") or "").strip()
        if not pid or pid == "NA":
            continue
        try:
            season = int(row["season"])
            week = int(row["week"])
        except (ValueError, KeyError, TypeError):
            continue

        key = (pid, season, week)
        cell = agg.get(key)
        if cell is None:
            cell = {
                "playerId": pid,
                "playerName": (row.get("receiver_player_name") or "").strip() or None,
                "team": (row.get("posteam") or "").strip() or None,
                "season": season,
                "week": week,
                "targets": 0,
                "_airSum": 0.0,
                "_airN": 0,
            }
            agg[key] = cell

        cell["targets"] += 1
        raw_air = (row.get("air_yards") or "").strip()
        if raw_air and raw_air != "NA":
            try:
                cell["_airSum"] += float(raw_air)
                cell["_airN"] += 1
            except ValueError:
                pass

    out = 0
    for cell in agg.values():
        air_n = cell.pop("_airN")
        air_sum = cell.pop("_airSum")
        # Honest null, never 0.0 — a player with no recorded air_yards has an
        # UNKNOWN adot, not a zero-depth one.
        cell["adot"] = (air_sum / air_n) if air_n > 0 else None
        cell["adotN"] = air_n
        sys.stdout.write(json.dumps(cell, sort_keys=True) + "\n")
        out += 1

    print(f"[player-week-signals] plays={plays} rows={out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
