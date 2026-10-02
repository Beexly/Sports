"""MIMO Unit 2: catchable vs raw air yards holdout.

Kill line in PREREGISTRATION_UNIT2.md is binding.
Attribution: FTN Data via nflverse (CC BY-SA 4.0) + nflverse (CC BY 4.0).
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd

TRAIN_SEASONS = (2022, 2023)
HOLDOUT_SEASONS = (2024, 2025)
MIN_TARGETS = 4
BOOTSTRAP_REPS = 2000
RNG_SEED = 20260918
ATTRIBUTION_NFLVERSE = "Data via nflverse (nflverse-data), CC BY 4.0"
ATTRIBUTION_FTN = "FTN Data via nflverse, CC BY-SA 4.0"


@dataclass
class Unit2Result:
    n_holdout_pairs: int
    spearman_catchable: float
    spearman_raw: float
    delta_rho: float
    delta_rho_ci_low: float
    delta_rho_ci_high: float
    mae_catchable_map: float
    mae_raw_map: float
    kill_line_passed: bool
    verdict: str
    train_seasons: list[int]
    holdout_seasons: list[int]
    min_targets: int
    join_keys: str
    catchable_def: str
    raw_def: str
    bootstrap_reps: int
    bootstrap_unit: str
    attribution_nflverse: str
    attribution_ftn: str


def spearman(a: np.ndarray, b: np.ndarray) -> float:
    if len(a) < 3:
        return float("nan")
    ra = pd.Series(a).rank().to_numpy()
    rb = pd.Series(b).rank().to_numpy()
    if ra.std() == 0 or rb.std() == 0:
        return float("nan")
    return float(np.corrcoef(ra, rb)[0, 1])


def week_bootstrap_delta_rho(pairs: pd.DataFrame, reps: int = BOOTSTRAP_REPS) -> tuple[float, float]:
    pairs = pairs.copy()
    pairs["season_week"] = pairs["season"].astype(str) + "-" + pairs["week"].astype(str)
    codes, uniques = pd.factorize(pairs["season_week"], sort=True)
    if len(uniques) < 5:
        return float("nan"), float("nan")
    catchable = pairs["catchable_air_yards"].to_numpy(dtype=float)
    raw = pairs["raw_air_yards"].to_numpy(dtype=float)
    nxt = pairs["next_rec_yards"].to_numpy(dtype=float)
    groups = [np.flatnonzero(codes == i) for i in range(len(uniques))]
    rng = np.random.default_rng(RNG_SEED)
    n_groups = len(groups)
    deltas: list[float] = []
    for _ in range(reps):
        pick = rng.integers(0, n_groups, size=n_groups)
        idx = np.concatenate([groups[i] for i in pick])
        if idx.size < 20:
            continue
        rc = spearman(catchable[idx], nxt[idx])
        rr = spearman(raw[idx], nxt[idx])
        if math.isfinite(rc) and math.isfinite(rr):
            deltas.append(rc - rr)
    if not deltas:
        return float("nan"), float("nan")
    arr = np.asarray(deltas, dtype=float)
    return float(np.percentile(arr, 2.5)), float(np.percentile(arr, 97.5))


def load_pbp_columns(data_dir: Path, seasons: tuple[int, ...]) -> pd.DataFrame:
    frames = []
    usecols = [
        "game_id",
        "play_id",
        "season",
        "week",
        "receiver_player_id",
        "air_yards",
        "complete_pass",
        "yards_gained",
        "pass_attempt",
    ]
    for season in seasons:
        path = data_dir / f"play_by_play_{season}.csv"
        if not path.exists():
            raise SystemExit(f"missing {path}; run pull_data_unit2.py")
        df = pd.read_csv(path, usecols=lambda c: c in set(usecols), low_memory=False)
        for c in usecols:
            if c not in df.columns:
                df[c] = np.nan
        df = df[usecols].copy()
        df["season"] = df["season"].fillna(season).astype(int)
        frames.append(df)
        print(f"loaded pbp {season}: {len(df)} rows")
    return pd.concat(frames, ignore_index=True)


def load_ftn(data_dir: Path, seasons: tuple[int, ...]) -> pd.DataFrame:
    frames = []
    for season in seasons:
        path = data_dir / f"ftn_charting_{season}.csv"
        if not path.exists():
            raise SystemExit(f"missing {path}; run pull_data_unit2.py")
        df = pd.read_csv(path, low_memory=False)
        keep = ["nflverse_game_id", "nflverse_play_id", "season", "week", "is_catchable_ball", "is_drop"]
        for c in keep:
            if c not in df.columns:
                df[c] = np.nan
        df = df[keep].copy()
        frames.append(df)
        print(f"loaded ftn {season}: {len(df)} rows")
    return pd.concat(frames, ignore_index=True)


def load_player_stats(data_dir: Path) -> pd.DataFrame:
    path = data_dir / "player_stats.csv.gz"
    if not path.exists():
        raise SystemExit(f"missing {path}")
    df = pd.read_csv(path, compression="gzip", low_memory=False)
    rename = {}
    for want, cands in {
        "season": ["season"],
        "week": ["week"],
        "player_id": ["player_id", "gsis_id"],
        "position": ["position", "position_group"],
        "targets": ["targets"],
        "rec_yards": ["receiving_yards", "rec_yards"],
        "season_type": ["season_type"],
    }.items():
        for c in cands:
            if c in df.columns:
                rename[c] = want
                break
    out = df.rename(columns=rename).copy()
    for c in ("targets", "rec_yards"):
        if c not in out.columns:
            out[c] = 0.0
        out[c] = pd.to_numeric(out[c], errors="coerce").fillna(0.0)
    if "season_type" in out.columns:
        out = out[out["season_type"].astype(str).str.upper().isin(["REG", "regular", ""])] if "REG" in set(out["season_type"].astype(str).str.upper()) else out
        # keep REG if present
        st = out["season_type"].astype(str).str.upper()
        if (st == "REG").any():
            out = out[st == "REG"]
    out["season"] = pd.to_numeric(out["season"], errors="coerce")
    out["week"] = pd.to_numeric(out["week"], errors="coerce")
    out = out.dropna(subset=["season", "week"])
    out["season"] = out["season"].astype(int)
    out["week"] = out["week"].astype(int)
    out = out[(out["week"] >= 1) & (out["week"] <= 18)]
    out["position"] = out.get("position", pd.Series([""] * len(out))).astype(str).str.upper().str.strip()
    out = out[out["position"].isin(["WR", "TE"])]
    out["player_id"] = out["player_id"].astype(str)
    return out


def build_receiver_week_air_yards(pbp: pd.DataFrame, ftn: pd.DataFrame) -> pd.DataFrame:
    pbp = pbp.copy()
    ftn = ftn.copy()
    pbp["play_id"] = pd.to_numeric(pbp["play_id"], errors="coerce")
    ftn["nflverse_play_id"] = pd.to_numeric(ftn["nflverse_play_id"], errors="coerce")
    pbp["air_yards"] = pd.to_numeric(pbp["air_yards"], errors="coerce")
    # targets: pass plays with a listed receiver
    tgt = pbp[pbp["receiver_player_id"].notna() & (pbp["receiver_player_id"].astype(str) != "")].copy()
    # air yards missing -> 0 for target (throwaway/screen edge); still a target attempt
    tgt["air_yards"] = tgt["air_yards"].fillna(0.0)
    merged = tgt.merge(
        ftn,
        left_on=["game_id", "play_id"],
        right_on=["nflverse_game_id", "nflverse_play_id"],
        how="left",
        suffixes=("", "_ftn"),
    )
    merged["is_catchable_ball"] = merged["is_catchable_ball"].fillna(False)
    # normalize catchable flag
    cb = merged["is_catchable_ball"]
    if cb.dtype == object:
        merged["is_catchable_ball"] = cb.astype(str).str.lower().isin(["true", "1", "t", "yes"])
    else:
        merged["is_catchable_ball"] = cb.astype(bool)
    merged["raw_air_yards"] = merged["air_yards"].astype(float)
    merged["catchable_air_yards"] = np.where(merged["is_catchable_ball"], merged["raw_air_yards"], 0.0)
    g = merged.groupby(["receiver_player_id", "season", "week"], as_index=False).agg(
        raw_air_yards=("raw_air_yards", "sum"),
        catchable_air_yards=("catchable_air_yards", "sum"),
        n_targets=("play_id", "count"),
        n_catchable=("is_catchable_ball", "sum"),
    )
    g = g.rename(columns={"receiver_player_id": "player_id"})
    g["player_id"] = g["player_id"].astype(str)
    return g


def build_pairs(air: pd.DataFrame, ps: pd.DataFrame) -> pd.DataFrame:
    df = ps.merge(air, on=["player_id", "season", "week"], how="inner")
    df = df.sort_values(["player_id", "season", "week"]).copy()
    df["next_week"] = df.groupby(["player_id", "season"])["week"].shift(-1)
    df["next_rec_yards"] = df.groupby(["player_id", "season"])["rec_yards"].shift(-1)
    df["next_targets"] = df.groupby(["player_id", "season"])["targets"].shift(-1)
    consecutive = df["next_week"] == df["week"] + 1
    pairs = df[consecutive & df["next_rec_yards"].notna()].copy()
    pairs = pairs[(pairs["targets"] >= MIN_TARGETS) & (pairs["next_targets"] >= MIN_TARGETS)]
    return pairs


def fit_mae_map(train: pd.DataFrame, feature: str) -> tuple[float, float]:
    """OLS next_rec_yards ~ intercept + feature on train; return (intercept, slope)."""
    x = train[feature].to_numpy(dtype=float)
    y = train["next_rec_yards"].to_numpy(dtype=float)
    if len(x) < 30 or x.std() == 0:
        return float(np.mean(y)) if len(y) else 0.0, 0.0
    slope = float(np.cov(x, y, ddof=0)[0, 1] / np.var(x))
    intercept = float(np.mean(y) - slope * np.mean(x))
    return intercept, slope


def main() -> int:
    data_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "data/mimo-xfp").resolve()
    out_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "scripts/research/mimo-xfp/results").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    pbp = load_pbp_columns(data_dir, TRAIN_SEASONS + HOLDOUT_SEASONS)
    ftn = load_ftn(data_dir, TRAIN_SEASONS + HOLDOUT_SEASONS)
    air = build_receiver_week_air_yards(pbp, ftn)
    ps = load_player_stats(data_dir)
    pairs_all = build_pairs(air, ps)

    train = pairs_all[pairs_all["season"].isin(TRAIN_SEASONS)].copy()
    holdout = pairs_all[pairs_all["season"].isin(HOLDOUT_SEASONS)].copy()

    y = holdout["next_rec_yards"].to_numpy(dtype=float)
    catchable = holdout["catchable_air_yards"].to_numpy(dtype=float)
    raw = holdout["raw_air_yards"].to_numpy(dtype=float)
    rho_c = spearman(catchable, y)
    rho_r = spearman(raw, y)
    delta = rho_c - rho_r if math.isfinite(rho_c) and math.isfinite(rho_r) else float("nan")
    ci_low, ci_high = week_bootstrap_delta_rho(holdout)

    # secondary MAE via train-fit linear maps
    b0c, b1c = fit_mae_map(train, "catchable_air_yards")
    b0r, b1r = fit_mae_map(train, "raw_air_yards")
    pred_c = b0c + b1c * catchable
    pred_r = b0r + b1r * raw
    mae_c = float(np.mean(np.abs(y - pred_c))) if len(y) else float("nan")
    mae_r = float(np.mean(np.abs(y - pred_r))) if len(y) else float("nan")

    if not math.isfinite(rho_c) or not math.isfinite(rho_r):
        verdict = "INCONCLUSIVE: non-finite rho"
        passed = False
    elif rho_c <= rho_r:
        verdict = "FAIL: catchable air yards do not beat raw air yards on holdout Spearman"
        passed = False
    elif math.isfinite(ci_low) and ci_low <= 0:
        verdict = "INCONCLUSIVE: point estimate better but week-bootstrap CI includes 0 (not an edge)"
        passed = False
    else:
        verdict = "PASS: catchable air yards beat raw air yards on holdout with CI lower bound > 0"
        passed = True

    result = Unit2Result(
        n_holdout_pairs=int(len(holdout)),
        spearman_catchable=round(rho_c, 6) if math.isfinite(rho_c) else float("nan"),
        spearman_raw=round(rho_r, 6) if math.isfinite(rho_r) else float("nan"),
        delta_rho=round(delta, 6) if math.isfinite(delta) else float("nan"),
        delta_rho_ci_low=round(ci_low, 6) if math.isfinite(ci_low) else float("nan"),
        delta_rho_ci_high=round(ci_high, 6) if math.isfinite(ci_high) else float("nan"),
        mae_catchable_map=round(mae_c, 6) if math.isfinite(mae_c) else float("nan"),
        mae_raw_map=round(mae_r, 6) if math.isfinite(mae_r) else float("nan"),
        kill_line_passed=passed,
        verdict=verdict,
        train_seasons=list(TRAIN_SEASONS),
        holdout_seasons=list(HOLDOUT_SEASONS),
        min_targets=MIN_TARGETS,
        join_keys="ftn.nflverse_game_id+nflverse_play_id = pbp.game_id+play_id; receiver_player_id",
        catchable_def="sum air_yards on targets with FTN is_catchable_ball true",
        raw_def="sum air_yards on all targets to the receiver-week",
        bootstrap_reps=BOOTSTRAP_REPS,
        bootstrap_unit="season-week",
        attribution_nflverse=ATTRIBUTION_NFLVERSE,
        attribution_ftn=ATTRIBUTION_FTN,
    )
    path = out_dir / "unit2_holdout.json"
    path.write_text(json.dumps(asdict(result), indent=2), encoding="utf-8")
    air.to_csv(out_dir / "receiver_week_air_yards_sample.csv", index=False)
    print(json.dumps(asdict(result), indent=2))
    print(f"result -> {path}")
    print(f"n air-yard receiver-weeks: {len(air)}")
    print(f"n train pairs: {len(train)} n holdout pairs: {len(holdout)}")
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
