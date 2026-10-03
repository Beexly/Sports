"""Attach point-in-time roll_trust and league quick-game diffs onto learn_wide.

Does not score, fit, chart, or rewrite learn_wide.parquet.
"""
from __future__ import annotations

import json
from pathlib import Path

import polars as pl

ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
WIDE_PATH = ENG / "learn_wide.parquet"
OUT_PATH = ENG / "learn_wide_plus.parquet"
COV_PATH = ENG / "learn_wide_plus_coverage.json"

TEAM_NORM = {"LAR": "LA", "WSH": "WAS", "JAC": "JAX"}
ROLL_COLS = ["top_share_4wk_mean", "top_share_4wk_sd", "top_share_cv_4wk"]
QG_COL = "quick_game_rate_season_prior"
NEW_COLS = ROLL_COLS + [QG_COL]


def _norm_team(col: str) -> pl.Expr:
    return pl.col(col).replace(TEAM_NORM)


def _pit_side(
    games: pl.DataFrame,
    side_col: str,
    src: pl.DataFrame,
    src_id_col: str,
    value_cols: list[str],
) -> pl.DataFrame:
    """Latest source row with season*100+week strictly before the game and season lag <= 2."""
    g = games.select(
        "game_id",
        "season",
        pl.col(side_col).alias("_id"),
        (pl.col("season") * 100 + pl.col("week") - 1).alias("_ask"),
    )
    s = src.select(
        pl.col(src_id_col).alias("_id"),
        (pl.col("season") * 100 + pl.col("week")).alias("_skey"),
        pl.col("season").alias("_src_season"),
        *value_cols,
    )
    known = g.filter(pl.col("_id").is_not_null()).sort(["_id", "_ask"])
    s = s.filter(pl.col("_id").is_not_null()).sort(["_id", "_skey"])
    hit = known.join_asof(
        s,
        left_on="_ask",
        right_on="_skey",
        by="_id",
        strategy="backward",
    )
    lag_ok = (
        pl.col("_src_season").is_not_null()
        & ((pl.col("season") - pl.col("_src_season")) >= 0)
        & ((pl.col("season") - pl.col("_src_season")) <= 2)
    )
    hit = hit.select(
        "game_id",
        *[
            pl.when(lag_ok).then(pl.col(c)).otherwise(None).alias(c)
            for c in value_cols
        ],
    )
    return g.select("game_id").join(hit, on="game_id", how="left")


def _home_minus_away(
    games: pl.DataFrame,
    src: pl.DataFrame,
    home_col: str,
    away_col: str,
    src_id_col: str,
    value_cols: list[str],
) -> pl.DataFrame:
    home = _pit_side(games, home_col, src, src_id_col, value_cols)
    away = _pit_side(games, away_col, src, src_id_col, value_cols)
    both = home.join(away, on="game_id", how="inner", suffix="_away")
    exprs = [(pl.col(c) - pl.col(f"{c}_away")).alias(c) for c in value_cols]
    return both.select("game_id", *exprs)


def main() -> None:
    wide = pl.read_parquet(WIDE_PATH)
    overlap = [c for c in NEW_COLS if c in wide.columns]
    if overlap:
        raise SystemExit("new columns already on learn_wide: " + ",".join(overlap))
    if wide["game_id"].n_unique() != wide.height:
        raise SystemExit("learn_wide game_id is not unique")

    games = wide.select(["game_id", "season", "week", "home", "away", "h_qb", "a_qb"])
    roll = pl.read_parquet(ENG / "roll_trust.parquet").select(
        ["qb_id", "season", "week", *ROLL_COLS]
    )
    # beta_league is a league constant. Do not read it and do not emit a diff.
    base = pl.read_parquet(ENG / "league_baselines.parquet").select(
        ["season", "week", "team", QG_COL]
    )

    games_team = games.with_columns(
        _norm_team("home").alias("home"),
        _norm_team("away").alias("away"),
    )
    base = base.with_columns(_norm_team("team").alias("team"))

    roll_diff = _home_minus_away(games, roll, "h_qb", "a_qb", "qb_id", ROLL_COLS)
    qg_diff = _home_minus_away(games_team, base, "home", "away", "team", [QG_COL])
    feat = roll_diff.join(qg_diff, on="game_id", how="inner")
    if feat.height != games.height or feat["game_id"].n_unique() != feat.height:
        raise SystemExit(f"feature row mismatch: {feat.height} vs {games.height}")

    out = wide.join(feat, on="game_id", how="left")
    if out.height != wide.height:
        raise SystemExit(f"join changed row count: {out.height}")
    if out.columns[: len(wide.columns)] != wide.columns:
        raise SystemExit("existing columns were not preserved in order")
    if out.columns[len(wide.columns) :] != NEW_COLS:
        raise SystemExit("new columns missing or reordered: " + ",".join(out.columns[len(wide.columns) :]))

    out.write_parquet(OUT_PATH)
    n = out.height
    cov = {
        "row_count": n,
        "column_count": out.width,
        "non_null_fraction": {
            c: (n - out[c].null_count()) / n for c in NEW_COLS
        },
    }
    COV_PATH.write_text(json.dumps(cov, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(cov))


if __name__ == "__main__":
    main()
