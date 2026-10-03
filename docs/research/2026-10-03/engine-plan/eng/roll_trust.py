"""PRE-diff top_share_cv_4wk.

For each qb_id at each season/week (situation == all), the rolling 4 observed
weeks strictly before that week and inside the current plus previous season.
mean and sample sd (ddof=1). cv = sd/mean only when mean != 0 and 4 prior
weeks exist; otherwise null. Not joined to games.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ENG = Path(__file__).resolve().parent
CANDIDATES = [
    Path(r"C:\Users\Garrett\Sports-wt-engineplan\intelligence\qb-behavior\data\trust_weekly.csv"),
    Path(r"C:\Users\Garrett\Sports\.worktrees\calib-boundary\intelligence\qb-behavior\data\trust_weekly.csv"),
]


def locate() -> Path:
    for p in CANDIDATES:
        if p.is_file():
            return p
    raise FileNotFoundError("trust_weekly.csv not found under engineplan or calib-boundary")


def main() -> None:
    src = locate()
    df = pd.read_csv(src)
    if "situation" in df.columns:
        df = df.loc[df["situation"].astype(str) == "all"].copy()
    df["qb_id"] = df["qb_id"].astype(str)
    df["season"] = df["season"].astype(int)
    df["week"] = df["week"].astype(int)
    df["top_share"] = pd.to_numeric(df["top_share"], errors="coerce")
    df = df.sort_values(["qb_id", "season", "week"], kind="mergesort").reset_index(drop=True)

    n = len(df)
    means = np.full(n, np.nan)
    sds = np.full(n, np.nan)
    cvs = np.full(n, np.nan)

    for _, g in df.groupby("qb_id", sort=False):
        pos = g.index.to_numpy()
        seasons = g["season"].to_numpy()
        weeks = g["week"].to_numpy()
        shares = g["top_share"].to_numpy(dtype=float)
        for i in range(len(pos)):
            s = int(seasons[i])
            w = int(weeks[i])
            prior: list[float] = []
            for j in range(i - 1, -1, -1):
                sj = int(seasons[j])
                if sj < s - 1:
                    break
                wj = int(weeks[j])
                if not (sj < s or (sj == s and wj < w)):
                    continue
                v = float(shares[j])
                if np.isnan(v):
                    continue
                prior.append(v)
                if len(prior) == 4:
                    break
            if len(prior) < 4:
                continue
            arr = np.asarray(prior, dtype=float)
            mean = float(arr.mean())
            sd = float(arr.std(ddof=1))
            row = int(pos[i])
            means[row] = mean
            sds[row] = sd
            if mean != 0.0:
                cvs[row] = sd / mean

    out = pd.DataFrame(
        {
            "qb_id": df["qb_id"].to_numpy(),
            "season": df["season"].to_numpy(),
            "week": df["week"].to_numpy(),
            "top_share_4wk_mean": means,
            "top_share_4wk_sd": sds,
            "top_share_cv_4wk": cvs,
        }
    )
    parquet = ENG / "roll_trust.parquet"
    coverage_path = ENG / "roll_trust_coverage.json"
    out.to_parquet(parquet, index=False)
    rows = int(len(out))
    non_null = int(out["top_share_cv_4wk"].notna().sum())
    frac = float(non_null / rows) if rows else 0.0
    payload = {
        "rows": rows,
        "top_share_cv_4wk_non_null": non_null,
        "top_share_cv_4wk_non_null_fraction": frac,
        "source": str(src),
    }
    coverage_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))


if __name__ == "__main__":
    main()