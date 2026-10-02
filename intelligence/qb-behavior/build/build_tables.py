#!/usr/bin/env python3
# PROVENANCE — qb-behavior / build / build_tables.py
# Build-time table generator for the c02 situational layer.
# Implements: corpus-intelligence/deep/c02/buildable-systems.md (Systems 1–3,
#   build order §1–3,5); verified-claims.md PRESS-1..14, SIT-1..9, TRUST-1..10.
# Consumes c01's ProfileEngine frames (get_dropback_frame / dropbacks / name_map)
# and c02's SplitSpec implementations (situational/specs.py) — never reloads
# pbp, never reimplements loading/filtering/identity (README contract).
# Cell assignment: situational/cells.py via specs.bucketize (single source of
#   truth shared with the runtime server).
# Output: qb-behavior/data/*.csv (pure data; the runtime serves them with
#   stdlib+csv only, per tests/README.md rule 5).
#
# Run: ~/workspace/gse-intelligence-build/.venv/bin/python \
#        qb-behavior/build/build_tables.py
"""Precompute c02 situational tables from nflverse pbp.

Tables:
  data/qb_weekly.csv   QB x season x week (season-to-date thru week), 2022-2026
  data/qb_season.csv   QB x season, 2010-2026
  data/int_cells.csv   INT situational raw cells (scope L/T/Q), pooled keys
  data/trust_weekly.csv QB x season x week x trust-situation, 2022-2026
  data/meta.csv        build provenance
"""
from __future__ import annotations

import csv
import datetime
import os
import sys

import numpy as np
import polars as pl

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC_DIR = os.path.join(BUILD_ROOT, "qb-behavior", "src")
DATA_DIR = os.path.join(BUILD_ROOT, "qb-behavior", "data")
sys.path.insert(0, SRC_DIR)
sys.path.insert(0, BUILD_ROOT)

from qb_behavior import ProfileEngine, metrics as M  # noqa: E402
from qb_behavior.identity import canonical_name  # noqa: E402
from qb_behavior.situational import cells as C  # noqa: E402
from qb_behavior.situational import specs as S  # noqa: E402

CODE_VERSION = "c02-build-1"
WEEKLY_SEASONS = (2022, 2023, 2024, 2025, 2026)
SEASON_SEASONS = tuple(range(2010, 2027))
MIN_PRESSURED_DROPBACKS = 100   # proposal :23 — charted guard; applied to the floor too
MIN_TRUST_TARGETS = 25          # TRUST-7 denominator guard


def _mode(series: pl.Series):
    vc = series.drop_nulls().value_counts()
    return vc[0, 0] if len(vc) else None


def qb_grain_metrics(qd: pl.DataFrame, eng: ProfileEngine, qb_id: str) -> dict:
    """Base + pressure-floor metrics for one QB grain (season-to-date frame)."""
    n_db = len(qd)
    att = qd.filter(pl.col("pass_attempt") == 1) if "pass_attempt" in qd.columns else qd.clear()
    n_att = len(att)
    epa_s = qd["epa"].drop_nulls() if "epa" in qd.columns else pl.Series([], dtype=pl.Float64)
    epa_mean = float(epa_s.mean()) if len(epa_s) else None
    cpoe_s = qd["cpoe"].drop_nulls() if "cpoe" in qd.columns else pl.Series([], dtype=pl.Float64)
    cpoe = float(cpoe_s.mean()) if len(cpoe_s) else None  # nflverse pbp column; served as cpoe_nflverse_pbp
    ay = qd["air_yards"].to_list() if "air_yards" in qd.columns else []
    n_scr = int(qd["qb_scramble"].sum()) if "qb_scramble" in qd.columns else 0
    n_sack = int(qd["sack"].sum()) if "sack" in qd.columns else 0
    n_hit = int(qd["qb_hit"].sum()) if "qb_hit" in qd.columns else 0
    n_press_floor = n_hit + n_sack
    p2s = M.eb_shrink(n_sack, n_press_floor, M.P2S_LEAGUE_BASELINE, M.P2S_SHRINK_PRIOR_N) \
        if n_press_floor else None

    pf = S.PressureFloorSplit().compute(qd)
    c0, c1 = pf[("0",)], pf[("1",)]
    sens_row = pf[("sensitivity",)]

    return {
        "db": n_db,
        "epa": epa_mean,
        "cpoe_pbp": cpoe,
        "adot": M.adot(ay),
        "deep_rate_20": M.deep_rate(ay, 20.0),
        "scramble_rate": (n_scr / n_db) if n_db else None,
        "p2s_eb": p2s,
        "n_clean": c0["n"], "n_press": c1["n"],
        "epa_clean": c0["epa_mean"], "epa_press": c1["epa_mean"],
        "var_clean": c0["epa_var"], "var_press": c1["epa_var"],
        "sens_epa_floor": sens_row["sens_epa_floor"],
        "sens_se": sens_row["sens_se"],
        "clean_epa_baseline": sens_row["clean_epa_baseline"],
        "int_n_clean": c0["n_int"], "int_att_clean": c0["n_att"],
        "int_n_press": c1["n_int"], "int_att_press": c1["n_att"],
        "name": canonical_name(qb_id, eng.name_map),
        "team": _mode(qd["posteam"]) if "posteam" in qd.columns else None,
    }


def _fmt(v, nd=4):
    if v is None:
        return ""
    if isinstance(v, float):
        return f"{v:.{nd}f}"
    return str(v)


def build_qb_tables(eng: ProfileEngine):
    """qb_weekly.csv (2022-2026, season-to-date) + qb_season.csv (2010-2026)."""
    db = eng.dropbacks()
    weekly_rows, season_rows = [], []
    header = ["qb_id", "name", "team", "season", "week", "db", "epa", "cpoe_pbp",
              "adot", "deep_rate_20", "scramble_rate", "p2s_eb",
              "n_clean", "n_press", "epa_clean", "epa_press",
              "var_clean", "var_press", "sens_epa_floor", "sens_se",
              "clean_epa_baseline",
              "int_n_clean", "int_att_clean", "int_n_press", "int_att_press"]

    for season in SEASON_SEASONS:
        sdb = db.filter(pl.col("season") == season)
        if len(sdb) == 0:
            continue
        qbs = sdb["passer_player_id"].drop_nulls().unique().to_list()
        # season grain (all years)
        for qb in qbs:
            qd = sdb.filter(pl.col("passer_player_id") == qb)
            if len(qd) < 100:
                continue
            m = qb_grain_metrics(qd, eng, qb)
            season_rows.append([qb, m["name"], m["team"], season, "", *[m[k] for k in header[5:]]])
        # weekly grain (2022+): season-to-date through each week
        if season in WEEKLY_SEASONS and "week" in sdb.columns:
            weeks = sorted(sdb["week"].drop_nulls().unique().to_list())
            for w in weeks:
                wdb = sdb.filter(pl.col("week") <= w)
                for qb in wdb["passer_player_id"].drop_nulls().unique().to_list():
                    qd = wdb.filter(pl.col("passer_player_id") == qb)
                    if len(qd) < 50:  # weekly floor is lower; guards applied at serve
                        continue
                    m = qb_grain_metrics(qd, eng, qb)
                    weekly_rows.append([qb, m["name"], m["team"], season, w,
                                        *[m[k] for k in header[5:]]])

    with open(os.path.join(DATA_DIR, "qb_weekly.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in weekly_rows:
            w.writerow([_fmt(v, 4) if isinstance(v, float) else v for v in r])
    with open(os.path.join(DATA_DIR, "qb_season.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in season_rows:
            w.writerow([_fmt(v, 4) if isinstance(v, float) else v for v in r])
    print(f"qb_weekly.csv: {len(weekly_rows)} rows; qb_season.csv: {len(season_rows)} rows")


def _pool_filter(db: pl.DataFrame, season_key: str) -> pl.DataFrame:
    """3-season pooling (SIT-5): season S pools S-2..S. Week keys pool
    2024+2025+2026 weeks<=W (point-in-time)."""
    if "_w" in season_key:
        s, wstr = season_key.split("_w")
        w = int(wstr)
        return db.filter(
            ((pl.col("season") == 2024) | (pl.col("season") == 2025)) |
            ((pl.col("season") == 2026) & (pl.col("week") <= w)))
    s = int(season_key)
    return db.filter(pl.col("season").is_in([s - 2, s - 1, s]))


def build_int_cells(eng: ProfileEngine):
    """int_cells.csv: raw (n, w) per 288-cell grid, scopes L/T/Q.
    EB shrinkage (M=25, ladder league->team->QB) happens at serve time."""
    db = eng.dropbacks()
    keys = [str(s) for s in range(2010, 2026)]
    max_w = 0
    if "week" in db.columns:
        w2026 = db.filter(pl.col("season") == 2026)["week"].drop_nulls()
        max_w = int(w2026.max()) if len(w2026) else 0
    keys += [f"2026_w{w}" for w in range(1, max_w + 1)]

    rows = []
    for key in keys:
        pool = _pool_filter(db, key)
        if len(pool) == 0:
            continue
        b = S.bucketize(pool)
        cell = pl.col("_b").struct.field("cell")
        att = b.filter(pl.col("pass_attempt") == 1)
        # league
        for r in att.group_by(cell.alias("cell")).agg(
                pl.len().alias("n"),
                pl.col("interception").fill_null(0).sum().alias("w")).iter_rows(named=True):
            rows.append(("L", "NFL", key, r["cell"], r["n"], int(r["w"])))
        # team
        if "posteam" in att.columns:
            for r in att.group_by("posteam", cell.alias("cell")).agg(
                    pl.len().alias("n"),
                    pl.col("interception").fill_null(0).sum().alias("w")).iter_rows(named=True):
                rows.append(("T", r["posteam"], key, r["cell"], r["n"], int(r["w"])))
        # qb
        for r in att.group_by("passer_player_id", cell.alias("cell")).agg(
                pl.len().alias("n"),
                pl.col("interception").fill_null(0).sum().alias("w")).iter_rows(named=True):
            rows.append(("Q", r["passer_player_id"], key, r["cell"], r["n"], int(r["w"])))
        print(f"  int_cells key={key}: pool_n={len(pool)}", flush=True)

    with open(os.path.join(DATA_DIR, "int_cells.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["scope", "id", "season_key", "cell", "n", "w"])
        w.writerows(rows)
    print(f"int_cells.csv: {len(rows)} rows")


def _hhi_bootstrap(counts: np.ndarray, resamples: int = 200, seed: int = 42) -> tuple[float, float]:
    """Bootstrap 95% CI for HHI over target counts. Deterministic (seeded)."""
    rng = np.random.default_rng(seed)
    total = counts.sum()
    if total == 0:
        return (0.0, 0.0)
    probs = counts / total
    draws = rng.multinomial(total, probs, size=resamples)
    hhis = ((draws / total) ** 2).sum(axis=1)
    return (float(np.percentile(hhis, 2.5)), float(np.percentile(hhis, 97.5)))


def build_trust_weekly(eng: ProfileEngine):
    """trust_weekly.csv: per QB x week x trust-situation concentration."""
    db = eng.dropbacks()
    rows = []
    for season in WEEKLY_SEASONS:
        sdb = db.filter((pl.col("season") == season) &
                        (pl.col("pass_attempt") == 1) &
                        pl.col("receiver_player_id").is_not_null())
        if len(sdb) == 0 or "week" not in sdb.columns:
            continue
        b = S.bucketize(sdb)
        exp = b.with_columns(pl.col("_b").struct.field("trust").alias("trust")).explode("trust", empty_as_null=True)
        g = exp.group_by("passer_player_id", "week", "trust", "receiver_player_id").agg(
            pl.len().alias("t"),
            pl.col("air_yards").fill_null(0).sum().alias("ay"),
            pl.col("receiver_player_name").first().alias("rname"),
        )
        # per (qb, week, trust): assemble
        keys = g.select("passer_player_id", "week", "trust").unique()
        for k in keys.iter_rows(named=True):
            qb, wk, sit = k["passer_player_id"], k["week"], k["trust"]
            sub = g.filter((pl.col("passer_player_id") == qb) &
                           (pl.col("week") == wk) & (pl.col("trust") == sit))
            counts = sub["t"].to_numpy()
            total = int(counts.sum())
            if total < MIN_TRUST_TARGETS:
                continue
            shares = counts / total
            hhi = float((shares ** 2).sum())
            lo, hi = _hhi_bootstrap(counts)
            order = np.argsort(-counts)
            top_share = float(shares[order[0]])
            top2 = float(shares[order[:2]].sum())
            top_row = sub.row(order[0], named=True)
            ay_total = float(sub["ay"].sum())
            top_ay_share = float(top_row["ay"] / ay_total) if ay_total > 0 else 0.0
            rows.append([qb, season, wk, sit, total, len(counts),
                         round(hhi, 4), round(lo, 4), round(hi, 4),
                         round(1 / hhi, 2) if hhi > 0 else "",
                         round(top_share, 4), round(top2, 4),
                         top_row["receiver_player_id"], top_row["rname"],
                         round(top_ay_share, 4)])
        print(f"  trust_weekly season={season}: {len(sdb)} targets", flush=True)

    with open(os.path.join(DATA_DIR, "trust_weekly.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["qb_id", "season", "week", "situation", "targets", "n_recv",
                    "hhi", "hhi_lo", "hhi_hi", "n_eff", "top_share", "top2_share",
                    "top_recv_id", "top_recv_name", "top_ay_share"])
        w.writerows(rows)
    print(f"trust_weekly.csv: {len(rows)} rows")


def build_meta():
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = [
        ("built_at_utc", now),
        ("code_version", CODE_VERSION),
        ("source", "nflverse pbp parquet 2010-2026 via qb-behavioral-profiles/data (T1 CC-BY-4.0)"),
        ("filters", "metric-bible: garbage-time removed (4Q WP>0.95/<0.05), kneels/spikes excluded, scramble passer backfill"),
        ("dropback_grain", "qb_dropback==1, REG only"),
        ("pressure_floor_def", "qb_hit==1 OR sack==1; hurries absent everywhere; clean cell contaminated; contrasts attenuated toward zero"),
        ("min_pressured_dropbacks", str(MIN_PRESSURED_DROPBACKS)),
        ("min_trust_targets", str(MIN_TRUST_TARGETS)),
        ("int_cells", "288-cell grid p{0,1}_q{1..4}_s{0..2}_z{0..2}_d{0..3}; raw (n,w); EB M=25 ladder league->team->QB at serve; null floor n<30; QB pressure cells need >=100 pressured dropbacks in pool"),
        ("int_pooling", "3-season pooling S-2..S; 2026 week keys pool 2024+2025+2026w<=W (point-in-time)"),
        ("trust_hhi_ci", "bootstrap 200 resamples, seed 42, percentile 2.5/97.5"),
        ("rights", "T1 nflverse only. No FTN charting, no NGS in engine artifacts. first_read_rate: no pbp source (FTN read_thrown is display-only). TTT: NULL (no proxy)."),
        ("veto", "no predicted_sacks column exists anywhere (R2<0.005 sack-prop veto)"),
    ]
    with open(os.path.join(DATA_DIR, "meta.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["key", "value"])
        w.writerows(rows)
    print("meta.csv written")


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    print("loading engine (pbp 2010-2026)...", flush=True)
    # extra_columns: cpoe is pruned from the default ENGINE_COLUMNS but the
    # c02 tables serve it (as cpoe_nflverse_pbp, honestly suffixed per NGS-7)
    eng = ProfileEngine(extra_columns=["cpoe"])
    eng._ensure_name_map()
    print(f"pbp rows: {len(eng.pbp())}; dropbacks: {len(eng.dropbacks())}", flush=True)
    build_qb_tables(eng)
    build_int_cells(eng)
    build_trust_weekly(eng)
    build_meta()
    print("BUILD COMPLETE")


if __name__ == "__main__":
    main()
