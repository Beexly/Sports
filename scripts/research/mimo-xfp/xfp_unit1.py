"""MIMO Unit 1: xFP / FPOE expectation stack and pre-registered holdout test.

Kill line is in PREREGISTRATION.md and is binding:
  If holdout Spearman rho(xFP) <= rho(raw prior FP), Unit 1 FAILS.

Attribution: Data via nflverse (nflverse-data), CC BY 4.0.
No database. Opportunity-only expectation. Week-grouped bootstrap.
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd

TRAIN_MAX_SEASON = 2019
HOLDOUT_MIN_SEASON = 2020
HOLDOUT_MAX_SEASON = 2025
MIN_OPPS = 8
POSITIONS = ("QB", "RB", "WR", "TE")
ATTRIBUTION = "Data via nflverse (nflverse-data), CC BY 4.0"
BOOTSTRAP_REPS = 2000
RNG_SEED = 20260918


@dataclass
class RateTable:
    """League-average PPR points per opportunity by position (train only)."""

    intercept: dict[str, float]
    b_targets: dict[str, float]
    b_carries: dict[str, float]
    b_pass: dict[str, float]
    n_weeks: dict[str, int]


@dataclass
class HoldoutResult:
    n_pairs: int
    spearman_xfp: float
    spearman_naive: float
    delta_rho: float
    rmse_xfp: float
    rmse_naive: float
    delta_rho_ci_low: float
    delta_rho_ci_high: float
    kill_line_passed: bool
    verdict: str
    attribution: str
    train_max_season: int
    holdout_seasons: list[int]
    min_opps: int
    scoring: str
    bootstrap_reps: int
    bootstrap_unit: str


def spearman(a: np.ndarray, b: np.ndarray) -> float:
    if len(a) < 3:
        return float("nan")
    ra = pd.Series(a).rank().to_numpy()
    rb = pd.Series(b).rank().to_numpy()
    if ra.std() == 0 or rb.std() == 0:
        return float("nan")
    return float(np.corrcoef(ra, rb)[0, 1])


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if len(y_true) == 0:
        return float("nan")
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def fit_rates(df: pd.DataFrame) -> RateTable:
    """OLS by position on train seasons. Features are opportunities only."""
    intercept: dict[str, float] = {}
    b_targets: dict[str, float] = {}
    b_carries: dict[str, float] = {}
    b_pass: dict[str, float] = {}
    n_weeks: dict[str, int] = {}
    for pos in POSITIONS:
        sub = df[df["position"] == pos]
        n_weeks[pos] = int(len(sub))
        if len(sub) < 100:
            intercept[pos] = 0.0
            b_targets[pos] = 0.0
            b_carries[pos] = 0.0
            b_pass[pos] = 0.0
            continue
        y = sub["fp_ppr"].to_numpy(dtype=float)
        cols = [np.ones(len(sub))]
        names = ["intercept"]
        if pos in ("RB", "WR", "TE"):
            cols.append(sub["targets"].to_numpy(dtype=float))
            names.append("targets")
        if pos in ("RB", "QB"):
            cols.append(sub["carries"].to_numpy(dtype=float))
            names.append("carries")
        if pos == "QB":
            cols.append(sub["pass_att"].to_numpy(dtype=float))
            names.append("pass_att")
        X = np.column_stack(cols)
        # ridge-lite for stability on sparse roles; expectation still opportunity-only
        lam = 1e-3
        xtx = X.T @ X + lam * np.eye(X.shape[1])
        beta = np.linalg.solve(xtx, X.T @ y)
        coef = dict(zip(names, (float(v) for v in beta)))
        intercept[pos] = coef.get("intercept", 0.0)
        b_targets[pos] = coef.get("targets", 0.0)
        b_carries[pos] = coef.get("carries", 0.0)
        b_pass[pos] = coef.get("pass_att", 0.0)
    return RateTable(intercept, b_targets, b_carries, b_pass, n_weeks)


def xfp_row(row: pd.Series, rates: RateTable) -> float:
    pos = row["position"]
    return float(
        rates.intercept.get(pos, 0.0)
        + rates.b_targets.get(pos, 0.0) * float(row["targets"])
        + rates.b_carries.get(pos, 0.0) * float(row["carries"])
        + rates.b_pass.get(pos, 0.0) * float(row["pass_att"])
    )


def load_player_stats(data_dir: Path) -> pd.DataFrame:
    path = data_dir / "player_stats.csv.gz"
    if not path.exists():
        raise SystemExit(f"missing {path}; run pull_data.py first")
    df = pd.read_csv(path, compression="gzip", low_memory=False)
    return df


def normalize(df: pd.DataFrame) -> pd.DataFrame:
    cols = df.columns
    rename = {}
    for want, cands in {
        "season": ["season", "Season"],
        "week": ["week", "Week"],
        "player_id": ["player_id", "gsis_id", "pfr_id"],
        "player_name": ["player_name", "player_display_name", "player_name_pfr"],
        "position": ["position", "position_group"],
        "team": ["recent_team", "team"],
        "targets": ["targets"],
        "carries": ["carries", "rushing_attempts", "rush_att"],
        "pass_att": ["pass_attempts", "attempts", "pass_att"],
        "fantasy_points_ppr": ["fantasy_points_ppr", "ppr_pts"],
        "fantasy_points": ["fantasy_points"],
        "receptions": ["receptions", "rec"],
        "rec_yards": ["receiving_yards", "rec_yards"],
        "rush_yards": ["rushing_yards", "rush_yds"],
        "pass_yards": ["passing_yards", "pass_yds"],
        "pass_td": ["passing_tds", "pass_td"],
        "interceptions": ["interceptions", "int"],
        "rush_td": ["rushing_tds", "rush_td"],
        "rec_td": ["receiving_tds", "rec_td"],
    }.items():
        for c in cands:
            if c in cols:
                rename[c] = want
                break
    out = df.rename(columns=rename).copy()
    for c in ("targets", "carries", "pass_att", "receptions", "rec_yards", "rush_yards", "pass_yards", "pass_td", "interceptions", "rush_td", "rec_td"):
        if c not in out.columns:
            out[c] = 0.0
        out[c] = pd.to_numeric(out[c], errors="coerce").fillna(0.0)
    if "fantasy_points_ppr" not in out.columns:
        out["fantasy_points_ppr"] = np.nan
    out["fantasy_points_ppr"] = pd.to_numeric(out["fantasy_points_ppr"], errors="coerce")
    # fallback standard PPR recompute if missing
    need = out["fantasy_points_ppr"].isna()
    if need.any():
        recomputed = (
            0.04 * out["pass_yards"]
            + 4.0 * out["pass_td"]
            - 2.0 * out["interceptions"]
            + 0.1 * out["rush_yards"]
            + 0.1 * out["rec_yards"]
            + 6.0 * (out["rush_td"] + out["rec_td"])
            + 1.0 * out["receptions"]
        )
        out.loc[need, "fantasy_points_ppr"] = recomputed[need]
    out["fp_ppr"] = out["fantasy_points_ppr"].fillna(0.0)
    out["opportunities"] = out["targets"] + out["carries"] + out["pass_att"]
    if "position" not in out.columns:
        out["position"] = ""
    out["position"] = out["position"].astype(str).str.upper().str.strip()
    out = out[out["position"].isin(POSITIONS)].copy()
    out = out[out["season"].notna() & out["week"].notna()].copy()
    out["season"] = out["season"].astype(int)
    out["week"] = out["week"].astype(int)
    # drop postseason / weird weeks
    out = out[(out["week"] >= 1) & (out["week"] <= 18)].copy()
    if "player_id" not in out.columns:
        out["player_id"] = out.get("player_name", pd.Series(range(len(out)))).astype(str)
    out["player_id"] = out["player_id"].astype(str)
    return out


def apply_xfp(df: pd.DataFrame, rates: RateTable) -> pd.Series:
    """Vectorized opportunity-only xFP by position group."""
    pos = df["position"]
    xfp = (
        pos.map(rates.intercept).fillna(0.0).astype(float)
        + pos.map(rates.b_targets).fillna(0.0).astype(float) * df["targets"].astype(float)
        + pos.map(rates.b_carries).fillna(0.0).astype(float) * df["carries"].astype(float)
        + pos.map(rates.b_pass).fillna(0.0).astype(float) * df["pass_att"].astype(float)
    )
    return xfp


def build_pairs(df: pd.DataFrame, rates: RateTable) -> pd.DataFrame:
    df = df.sort_values(["player_id", "season", "week"]).copy()
    df["xfp"] = apply_xfp(df, rates)
    df["fpoe"] = df["fp_ppr"] - df["xfp"]
    df["next_week"] = df.groupby(["player_id", "season"])["week"].shift(-1)
    df["next_fp"] = df.groupby(["player_id", "season"])["fp_ppr"].shift(-1)
    df["next_opps"] = df.groupby(["player_id", "season"])["opportunities"].shift(-1)
    consecutive = df["next_week"] == df["week"] + 1
    pairs = df[consecutive & df["next_fp"].notna()].copy()
    pairs = pairs[(pairs["opportunities"] >= MIN_OPPS) & (pairs["next_opps"] >= MIN_OPPS)]
    return pairs


def week_bootstrap_delta_rho(pairs: pd.DataFrame, reps: int = BOOTSTRAP_REPS) -> tuple[float, float, list[float]]:
    """Bootstrap season-week clusters using pre-grouped index arrays."""
    pairs = pairs.copy()
    pairs["season_week"] = pairs["season"].astype(str) + "-" + pairs["week"].astype(str)
    codes, uniques = pd.factorize(pairs["season_week"], sort=True)
    if len(uniques) < 5:
        return float("nan"), float("nan"), []
    xfp = pairs["xfp"].to_numpy(dtype=float)
    fp = pairs["fp_ppr"].to_numpy(dtype=float)
    nxt = pairs["next_fp"].to_numpy(dtype=float)
    groups = [np.flatnonzero(codes == i) for i in range(len(uniques))]
    rng = np.random.default_rng(RNG_SEED)
    n_groups = len(groups)
    deltas: list[float] = []
    for _ in range(reps):
        pick = rng.integers(0, n_groups, size=n_groups)
        idx = np.concatenate([groups[i] for i in pick])
        if idx.size < 30:
            continue
        rx = spearman(xfp[idx], nxt[idx])
        rn = spearman(fp[idx], nxt[idx])
        if math.isfinite(rx) and math.isfinite(rn):
            deltas.append(rx - rn)
    if not deltas:
        return float("nan"), float("nan"), []
    arr = np.asarray(deltas, dtype=float)
    return float(np.percentile(arr, 2.5)), float(np.percentile(arr, 97.5)), deltas


def main() -> int:
    data_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/mimo-xfp")
    data_dir = data_dir.resolve()
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("scripts/research/mimo-xfp/results")
    out_dir = out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    raw = load_player_stats(data_dir)
    df = normalize(raw)
    train = df[(df["season"] <= TRAIN_MAX_SEASON) & (df["season"] >= 2009)].copy()
    holdout = df[(df["season"] >= HOLDOUT_MIN_SEASON) & (df["season"] <= HOLDOUT_MAX_SEASON)].copy()
    rates = fit_rates(train)
    pairs = build_pairs(holdout, rates)

    y = pairs["next_fp"].to_numpy(dtype=float)
    pred_x = pairs["xfp"].to_numpy(dtype=float)
    pred_n = pairs["fp_ppr"].to_numpy(dtype=float)
    rho_x = spearman(pred_x, y)
    rho_n = spearman(pred_n, y)
    rmse_x = rmse(y, pred_x)
    rmse_n = rmse(y, pred_n)
    delta = rho_x - rho_n if math.isfinite(rho_x) and math.isfinite(rho_n) else float("nan")
    ci_low, ci_high, _ = week_bootstrap_delta_rho(pairs)

    # kill line
    if not math.isfinite(rho_x) or not math.isfinite(rho_n):
        verdict = "INCONCLUSIVE: non-finite rho"
        passed = False
    elif rho_x <= rho_n:
        verdict = "FAIL: xFP does not beat naive raw FP on holdout Spearman"
        passed = False
    elif math.isfinite(ci_low) and ci_low <= 0:
        verdict = "INCONCLUSIVE: point estimate better but week-bootstrap CI includes 0 (not an edge)"
        passed = False
    else:
        verdict = "PASS: xFP beats naive on holdout with week-bootstrap CI lower bound > 0"
        passed = True

    result = HoldoutResult(
        n_pairs=int(len(pairs)),
        spearman_xfp=round(rho_x, 6) if math.isfinite(rho_x) else float("nan"),
        spearman_naive=round(rho_n, 6) if math.isfinite(rho_n) else float("nan"),
        delta_rho=round(delta, 6) if math.isfinite(delta) else float("nan"),
        rmse_xfp=round(rmse_x, 6) if math.isfinite(rmse_x) else float("nan"),
        rmse_naive=round(rmse_n, 6) if math.isfinite(rmse_n) else float("nan"),
        delta_rho_ci_low=round(ci_low, 6) if math.isfinite(ci_low) else float("nan"),
        delta_rho_ci_high=round(ci_high, 6) if math.isfinite(ci_high) else float("nan"),
        kill_line_passed=passed,
        verdict=verdict,
        attribution=ATTRIBUTION,
        train_max_season=TRAIN_MAX_SEASON,
        holdout_seasons=[HOLDOUT_MIN_SEASON, HOLDOUT_MAX_SEASON],
        min_opps=MIN_OPPS,
        scoring="standard PPR (nflverse fantasy_points_ppr preferred)",
        bootstrap_reps=BOOTSTRAP_REPS,
        bootstrap_unit="season-week",
    )

    rates_path = out_dir / "rate_table.json"
    rates_path.write_text(json.dumps(asdict(rates), indent=2), encoding="utf-8")
    result_path = out_dir / "unit1_holdout.json"
    result_path.write_text(json.dumps(asdict(result), indent=2), encoding="utf-8")

    # weekly FPOE sample for later noise rule; not a kill metric
    sample = pairs.sort_values("fpoe").head(20)[
        ["season", "week", "player_id", "position", "opportunities", "fp_ppr", "xfp", "fpoe"]
    ]
    sample.to_csv(out_dir / "fpoe_extreme_low.csv", index=False)
    sample_hi = pairs.sort_values("fpoe", ascending=False).head(20)[
        ["season", "week", "player_id", "position", "opportunities", "fp_ppr", "xfp", "fpoe"]
    ]
    sample_hi.to_csv(out_dir / "fpoe_extreme_high.csv", index=False)

    print(json.dumps(asdict(result), indent=2))
    print(f"rates -> {rates_path}")
    print(f"result -> {result_path}")
    print(f"attribution: {ATTRIBUTION}")
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
