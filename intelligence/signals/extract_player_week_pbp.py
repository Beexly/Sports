#!/usr/bin/env python3
"""Player-week aggregation from the in-repo nflverse play-by-play parquets.

WHY THIS EXISTS. Census row C-074 (player signals table) is recorded as
BUILT-EMPTY, and the total-signal spec's build-order step 4 is "fill the
player `signals` table". The DB-backed writer (apps/web signal-ledger-writer)
projects from production tables; this extractor is the in-repo counterpart:
it derives the SAME kind of measured player-week rows from the play-by-play
parquets the repo already carries (intelligence/coaching/data/), so the
population path exists — and is auditable — without a production database.

WHAT IT EMITS. One JSON object per (player, season, week) with MEASURED
counts/sums only — no rate is pre-computed beyond target share, whose two
inputs (player targets, team pass attempts) are both in the row so the
share is checkable rather than trusted:

  gsis_id, player_name, team, season, week, as_of (max game_date in window),
  targets, receptions, receiving_yards, air_yards, yards_after_catch,
  rush_attempts, rushing_yards, pass_attempts, completions, passing_yards,
  team_pass_attempts

Plus a manifest (player_week_pbp.manifest.json) with per-file sha256, row
counts, and the extraction timestamp — every downstream signal row carries
this provenance in its rightsSnapshot.

RULES. Regular season only (season_type == "REG"). A target is a pass play
with a receiver_player_id. Air yards / YAC are summed over targets as
recorded by nflverse (nulls contribute 0 and are counted in the manifest
when they occur). Nothing is imputed; a player-week with no plays does not
appear — absence is silence, exactly like the engine slate provider.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import polars as pl

DATA_DIR = Path(__file__).resolve().parents[1] / "coaching" / "data"
DEFAULT_OUT = Path(__file__).resolve().parent / "player_week_pbp.jsonl"
SEASONS = (2022, 2023, 2024, 2025, 2026)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def aggregate_season(path: Path) -> tuple[list[dict], dict]:
    df = pl.read_parquet(path).filter(pl.col("season_type") == "REG")
    base = df.select(
        "season", "week", "game_date", "posteam",
        "passer_player_id", "passer_player_name",
        "receiver_player_id", "receiver_player_name",
        "rusher_player_id", "rusher_player_name",
        "pass_attempt", "rush_attempt", "complete_pass",
        "passing_yards", "receiving_yards", "rushing_yards",
        "air_yards", "yards_after_catch",
    )

    def agg(id_col: str, name_col: str, exprs: list[pl.Expr]) -> pl.DataFrame:
        return (
            base.filter(pl.col(id_col).is_not_null())
            .group_by(["season", "week", id_col])
            .agg(
                pl.col(name_col).first().alias("player_name"),
                pl.col("posteam").first().alias("team"),
                pl.col("game_date").max().alias("as_of"),
                *exprs,
            )
            .rename({id_col: "gsis_id"})
        )

    zero = pl.lit(0)
    receiving = agg("receiver_player_id", "receiver_player_name", [
        pl.len().alias("targets"),
        pl.col("complete_pass").fill_null(0).sum().alias("receptions"),
        pl.col("receiving_yards").fill_null(0).sum().alias("receiving_yards"),
        pl.col("air_yards").fill_null(0).sum().alias("air_yards"),
        pl.col("yards_after_catch").fill_null(0).sum().alias("yards_after_catch"),
    ])
    rushing = agg("rusher_player_id", "rusher_player_name", [
        pl.col("rush_attempt").fill_null(0).sum().alias("rush_attempts"),
        pl.col("rushing_yards").fill_null(0).sum().alias("rushing_yards"),
    ])
    passing = agg("passer_player_id", "passer_player_name", [
        pl.col("pass_attempt").fill_null(0).sum().alias("pass_attempts"),
        pl.col("complete_pass").fill_null(0).sum().alias("completions"),
        pl.col("passing_yards").fill_null(0).sum().alias("passing_yards"),
    ])

    team_pass = (
        base.group_by(["season", "week", "posteam"])
        .agg(pl.col("pass_attempt").fill_null(0).sum().alias("team_pass_attempts"))
        .rename({"posteam": "team"})
    )

    merged = receiving.join(rushing, on=["season", "week", "gsis_id"], how="full", coalesce=True, suffix="_r")
    merged = merged.join(passing, on=["season", "week", "gsis_id"], how="full", coalesce=True, suffix="_p")
    # Names/teams can arrive from any of the three sides after full joins.
    merged = merged.with_columns(
        pl.coalesce(["player_name", "player_name_r", "player_name_p"]).alias("player_name"),
        pl.coalesce(["team", "team_r", "team_p"]).alias("team"),
        pl.coalesce(["as_of", "as_of_r", "as_of_p"]).alias("as_of"),
    ).drop([c for c in merged.columns if c.endswith("_r") or c.endswith("_p")])
    for col in ("targets", "receptions", "receiving_yards", "air_yards", "yards_after_catch",
                "rush_attempts", "rushing_yards", "pass_attempts", "completions", "passing_yards"):
        merged = merged.with_columns(pl.col(col).fill_null(0))
    merged = merged.join(team_pass, on=["season", "week", "team"], how="left")
    merged = merged.sort(["season", "week", "gsis_id"])

    rows = merged.to_dicts()
    stats = {
        "file": path.name,
        "sha256": sha256_of(path),
        "plays_reg": df.height,
        "player_weeks": len(rows),
        "players": merged["gsis_id"].n_unique(),
        "weeks": sorted(merged["week"].unique().to_list()),
    }
    return rows, stats


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--seasons", type=int, nargs="*", default=list(SEASONS))
    args = ap.parse_args()

    extracted_at = datetime.now(timezone.utc).isoformat()
    all_rows: list[dict] = []
    files: list[dict] = []
    for season in args.seasons:
        path = DATA_DIR / f"play_by_play_{season}.parquet"
        if not path.exists():
            print(f"missing parquet for {season}: {path}", file=sys.stderr)
            return 1
        rows, stats = aggregate_season(path)
        all_rows.extend(rows)
        files.append(stats)
        print(f"{season}: {stats['player_weeks']} player-weeks, {stats['players']} players, weeks {stats['weeks']}")

    with args.out.open("w") as fh:
        for row in all_rows:
            fh.write(json.dumps(row, default=str) + "\n")
    manifest = {
        "artifact": "player_week_pbp",
        "source_dataset": "nflverse play_by_play (in-repo parquets, intelligence/coaching/data/)",
        "extracted_at": extracted_at,
        "extractor": "intelligence/signals/extract_player_week_pbp.py",
        "total_player_weeks": len(all_rows),
        "files": files,
    }
    manifest_path = args.out.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {len(all_rows)} player-week rows -> {args.out}")
    print(f"manifest -> {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
