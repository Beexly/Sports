"""League baselines missing from the coaching formula map.

Does not fit, mint, score, or edit any other eng output.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

COACH = Path(r"C:\Users\Garrett\Sports-wt-engineplan\intelligence\coaching\data")
ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
OUT = ENG / "league_baselines.parquet"
COVERAGE = ENG / "league_baselines_coverage.json"

# coaching/data/README.md describes script_elasticity.csv as (season, team):
# a full-season plays-weighted OLS slope. It does not say the file is
# point-in-time or pre-kickoff, and it has no week column. A same-season
# beta_league would be fit on games that have not been played yet at week W,
# so it is not emitted. Season S uses the n_plays-weighted mean of beta_script
# across teams in season S-1 only.
PIT_RULE = (
    "script_elasticity.csv is (season, team) with no week. "
    "coaching/data/README.md does not call it point-in-time or pre-kickoff "
    "(full-season OLS of early-down pass rate on WP bin). "
    "Same-season beta_league is not emitted. "
    "beta_league for season S is the n_plays-weighted mean of beta_script "
    "across teams in season S-1 only (null beta_script or n_plays<=0 dropped). "
    "The value is constant for every team-week in season S. "
    "Season 2022 has no prior season in this file, so beta_league is null. "
    "quick_game_rate_season_prior at (season, team, week W) is the unweighted "
    "mean of that team's quick_game_rate on weekly_tendencies rows in the same "
    "season with week strictly less than W (null rates dropped). "
    "No prior week yields null. The current week is never included."
)


def _beta_by_prior_season(elasticity: pd.DataFrame) -> dict[int, float]:
    se = elasticity.copy()
    se["season"] = pd.to_numeric(se["season"], errors="coerce")
    se["beta_script"] = pd.to_numeric(se["beta_script"], errors="coerce")
    se["n_plays"] = pd.to_numeric(se["n_plays"], errors="coerce")
    se = se.dropna(subset=["season", "beta_script", "n_plays"])
    se = se[se["n_plays"] > 0]
    out: dict[int, float] = {}
    for season, g in se.groupby(se["season"].astype(int)):
        w = g["n_plays"].astype(float)
        out[int(season)] = float((g["beta_script"].astype(float) * w).sum() / w.sum())
    return out


def main() -> None:
    elasticity = pd.read_csv(COACH / "script_elasticity.csv")
    weekly = pd.read_csv(COACH / "weekly_tendencies.csv")
    prior_beta = _beta_by_prior_season(elasticity)

    w = weekly.copy()
    w["season"] = pd.to_numeric(w["season"], errors="coerce").astype("Int64")
    w["week"] = pd.to_numeric(w["week"], errors="coerce").astype("Int64")
    w["team"] = w["team"].astype("string").str.strip()
    w["quick_game_rate"] = pd.to_numeric(w["quick_game_rate"], errors="coerce")
    w = w.dropna(subset=["season", "week", "team"])
    w["season"] = w["season"].astype(int)
    w["week"] = w["week"].astype(int)
    # One row per team-week. Mean of duplicate rates if the source repeats a key.
    w = (
        w.groupby(["season", "week", "team"], as_index=False)["quick_game_rate"]
        .mean()
    )

    parts = []
    for (season, team), g in w.groupby(["season", "team"], sort=False):
        g = g.sort_values("week")
        rates = g["quick_game_rate"].to_numpy(dtype=float)
        weeks = g["week"].to_numpy()
        prior_means = []
        # Expanding mean of rates whose week is strictly before this row.
        # Weeks are not assumed gap-free; compare week numbers, not row order alone.
        for i, week in enumerate(weeks):
            mask = weeks < week
            chosen = rates[mask]
            chosen = chosen[~pd.isna(chosen)]
            prior_means.append(float(chosen.mean()) if len(chosen) else None)
        part = g[["season", "week", "team"]].copy()
        part["quick_game_rate_season_prior"] = prior_means
        parts.append(part)

    out = pd.concat(parts, ignore_index=True)
    out["beta_league"] = out["season"].map(lambda s: prior_beta.get(int(s) - 1))
    out = out[
        ["season", "week", "team", "beta_league", "quick_game_rate_season_prior"]
    ].sort_values(["season", "week", "team"], kind="mergesort")
    out = out.reset_index(drop=True)

    ENG.mkdir(parents=True, exist_ok=True)
    out.to_parquet(OUT, index=False)

    beta_seasons = {
        str(s): prior_beta[s - 1] if (s - 1) in prior_beta else None
        for s in sorted(out["season"].unique())
    }
    coverage = {
        "rows": int(len(out)),
        "columns": list(out.columns),
        "pit_rule": PIT_RULE,
        "same_season_beta_league_emitted": False,
        "beta_league_source": "script_elasticity.csv season S-1, n_plays-weighted mean of beta_script across teams",
        "quick_game_rate_season_prior_source": (
            "weekly_tendencies.csv unweighted mean of quick_game_rate, same team-season, week < W"
        ),
        "beta_league_by_target_season": beta_seasons,
        "beta_league_nonnull": int(out["beta_league"].notna().sum()),
        "beta_league_null": int(out["beta_league"].isna().sum()),
        "quick_game_rate_season_prior_nonnull": int(out["quick_game_rate_season_prior"].notna().sum()),
        "quick_game_rate_season_prior_null": int(out["quick_game_rate_season_prior"].isna().sum()),
        "seasons": [int(s) for s in sorted(out["season"].unique())],
        "teams": int(out["team"].nunique()),
        "script_elasticity_rows": int(len(elasticity)),
        "weekly_tendencies_rows_in": int(len(weekly)),
    }
    COVERAGE.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: coverage[k] for k in ("rows", "columns", "beta_league_by_target_season", "beta_league_null", "quick_game_rate_season_prior_null")}, indent=2))


if __name__ == "__main__":
    main()