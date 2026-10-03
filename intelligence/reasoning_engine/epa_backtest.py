"""EPA facet stability across 2022-2025. Descriptive until the correlation says otherwise."""
import json
import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "coaching", "data")


def season_facets(path: str, season: int) -> pd.DataFrame:
    df = pd.read_parquet(path, columns=["posteam", "season", "week", "epa", "pass", "rush", "interception", "fumble_lost"])
    df = df[df.season == season]
    rows = []
    for (team, week), g in df.groupby(["posteam", "week"], observed=True):
        if not isinstance(team, str):
            continue
        to = g[(g.interception == 1) | (g.fumble_lost == 1)]
        rows.append({
            "season": int(season),
            "team": team,
            "week": int(week),
            "pass_epa": float(g.loc[g["pass"] == 1, "epa"].sum()),
            "rush_epa": float(g.loc[g["rush"] == 1, "epa"].sum()),
            "turnover_epa": float(to.epa.sum()) if len(to) else 0.0,
        })
    return pd.DataFrame(rows)


def main() -> None:
    frames = []
    for year in (2022, 2023, 2024, 2025):
        path = os.path.join(DATA, f"play_by_play_{year}.parquet")
        if not os.path.exists(path):
            raise SystemExit(f"missing {path}")
        frames.append(season_facets(path, year))
    all_rows = pd.concat(frames, ignore_index=True)
    # Next-week pass EPA vs this week's pass EPA, same team. Descriptive correlation.
    nxt = all_rows.copy()
    nxt["week"] = nxt["week"] - 1
    joined = all_rows.merge(nxt, on=["season", "team", "week"], suffixes=("", "_next"))
    corr = float(joined["pass_epa"].corr(joined["pass_epa_next"])) if len(joined) else None
    out = {
        "seasons": [2022, 2023, 2024, 2025],
        "team_weeks": int(len(all_rows)),
        "pairs_with_next_week": int(len(joined)),
        "pass_epa_week_to_next_corr": None if corr != corr else round(corr, 4),
        "label": "descriptive",
        "note": "Correlation of this week's pass EPA with next week's pass EPA, same team, same season. Not a fitted weight. Not a pick.",
    }
    dest = os.path.join(ROOT, "reasoning_engine", "traces", "epa-facet-2022-2025.json")
    json.dump(out, open(dest, "w"), indent=2)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
