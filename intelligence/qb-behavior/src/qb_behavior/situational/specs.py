# PROVENANCE — qb-behavior / situational / specs.py
# Implements c01's SplitSpec protocol (qb-behavior/src/qb_behavior/splits.py:
# name, dimensions, compute(frame: pl.DataFrame) -> {dimension_tuple: {metric: value}}).
# c02 OWNS these specs per qb-behavior/README.md ("Interface contract with c02"):
# situational split matrices + trust-target splits. The build job runs them via
# engine frames (never reloading pbp); the runtime server reads the precomputed
# CSVs the build job writes.
# Research: corpus-intelligence/deep/c02/buildable-systems.md (Systems 1–3);
# verified-claims.md PRESS-1..14, SIT-1..9, TRUST-1..10.
"""c02 SplitSpec implementations (c01 protocol).

Cell assignment funnels through situational/cells.py (single source of truth)
via one map_elements bucketize pass, so the build-time tables and any live
apply_split() call can never disagree on a cell definition.
"""
from __future__ import annotations

import polars as pl

from .cells import (
    TRUST_SITUATIONS,
    int_cell_from_play,
    pressure_floor,
    trust_situation,
)

BUCKET_COLS = ["qb_hit", "sack", "qtr", "score_differential", "yardline_100",
               "down", "ydstogo", "game_seconds_remaining"]


def _row_dict(row: dict) -> dict:
    return {k: row.get(k) for k in BUCKET_COLS}


def bucketize(frame: pl.DataFrame) -> pl.DataFrame:
    """Add `_cell` (INT grid key), `_p` (pressure floor 0/1), `_trust`
    (list of trust situations) from cells.py — the only cell-assignment path."""
    existing = [c for c in BUCKET_COLS if c in frame.columns]

    def _buckets(r: dict) -> dict:
        d = {k: r.get(k) for k in BUCKET_COLS}
        return {
            "p": pressure_floor(d["qb_hit"], d["sack"]),
            "cell": int_cell_from_play(d),
            "trust": [s for s in TRUST_SITUATIONS if trust_situation(s, d)],
        }

    return frame.with_columns(
        pl.struct(existing).map_elements(
            _buckets,
            return_dtype=pl.Struct({
                "p": pl.Int64,
                "cell": pl.String,
                "trust": pl.List(pl.String),
            }),
        ).alias("_b")
    )


def _int_rate(sub: pl.DataFrame) -> tuple[int, int, float | None]:
    """(n_att, n_int, int_rate_0_1) on a frame with pass_attempt/interception."""
    att = sub.filter(pl.col("pass_attempt") == 1) if "pass_attempt" in sub.columns else sub
    n = len(att)
    w = int(att["interception"].sum()) if n and "interception" in att.columns else 0
    return n, w, (w / n if n else None)


def _epa_mean(sub: pl.DataFrame) -> float | None:
    if len(sub) == 0 or "epa" not in sub.columns:
        return None
    v = sub["epa"].mean()
    return None if v is None else float(v)


class PressureFloorSplit:
    """Clean vs pressured on the FLOOR definition.

    c01 protocol: name / dimensions / compute(frame) -> {(p,): metrics}.
    Sensitivity = epa(clean) - epa(pressured) with the standard error of the
    difference (verified-claims.md PRESS-1, PRESS-14). Reported alongside the
    clean baseline (CH-PRESS-4: never rank QBs on the raw gap alone).
    """

    name = "pressure_floor"
    dimensions = ("pressured_floor",)

    def compute(self, frame: pl.DataFrame) -> dict:
        f = bucketize(frame)
        cells: dict[tuple, dict] = {}
        for p in (0, 1):
            sub = f.filter(pl.col("_b").struct.field("p") == p)
            n_att, n_int, ir = _int_rate(sub)
            epa = _epa_mean(sub)
            var = sub["epa"].var() if len(sub) > 1 and "epa" in sub.columns else None
            cells[(str(p),)] = {
                "n": len(sub), "n_att": n_att, "n_int": n_int,
                "int_rate": ir, "epa_mean": epa,
                "epa_var": None if var is None else float(var),
            }
        c0, c1 = cells[("0",)], cells[("1",)]
        sens = (c0["epa_mean"] - c1["epa_mean"]
                if c0["epa_mean"] is not None and c1["epa_mean"] is not None else None)
        se = None
        if c0["epa_var"] is not None and c1["epa_var"] is not None and c0["n"] and c1["n"]:
            import math
            se = math.sqrt(c0["epa_var"] / c0["n"] + c1["epa_var"] / c1["n"])
        cells[("sensitivity",)] = {
            "sens_epa_floor": sens,
            "sens_se": se,
            "clean_epa_baseline": c0["epa_mean"],
            "note": ("sensitivity_epa_floor attenuated toward zero: clean cell "
                     "contains unflagged hurries (no hurry data in nflverse)"),
        }
        return cells


class INTSituationalSplit:
    """Raw INT counts per 288-cell grid (verified-claims.md SIT-6).

    compute() returns RAW (n, w) per cell — EB shrinkage to the
    league->team->QB ladder (M=25) happens at serve time in serve.py, where
    the pooled league/team cells are available. Engine lane only: actual
    interception occurrence, never the worthy-rate formula (SIT-9).
    """

    name = "int_situational"
    dimensions = ("p", "q", "s", "z", "d")

    def compute(self, frame: pl.DataFrame) -> dict:
        f = bucketize(frame)
        cells: dict[tuple, dict] = {}
        if len(f) == 0:
            return cells
        grp = f.group_by(pl.col("_b").struct.field("cell").alias("cell")).agg(
            pl.len().alias("n_all"),
            pl.col("interception").sum().alias("w_all"),
        )
        for r in grp.iter_rows(named=True):
            n_att, n_int, _ = _int_rate(
                f.filter(pl.col("_b").struct.field("cell") == r["cell"])
            )
            # n = dropbacks in cell (denominator for the rate), w = INTs.
            # Use attempts for w/n consistency with the INT recipe.
            cells[(r["cell"],)] = {"n": n_att, "w": n_int}
        return cells


class TrustSituationSplit:
    """Target concentration per trust situation (verified-claims.md TRUST-7).

    Runs on the TARGET frame (pass attempts with a receiver). Returns per
    situation the receiver target counts — HHI/shares computed at serve time
    with the shared c01 metrics primitives (import, not reimplement).
    """

    name = "trust_situation"
    dimensions = ("situation",)

    def compute(self, frame: pl.DataFrame) -> dict:
        f = bucketize(frame)
        out: dict[tuple, dict] = {}
        for s in TRUST_SITUATIONS:
            sub = f.filter(pl.col("_b").struct.field("trust").list.contains(s))
            counts: dict[str, int] = {}
            ay: dict[str, float] = {}
            if len(sub) and "receiver_player_id" in sub.columns:
                g = sub.group_by("receiver_player_id").agg(
                    pl.len().alias("t"),
                    pl.col("air_yards").sum().alias("ay") if "air_yards" in sub.columns
                    else pl.len().alias("ay"),
                )
                for r in g.iter_rows(named=True):
                    rid = str(r["receiver_player_id"])
                    counts[rid] = r["t"]
                    ay[rid] = float(r["ay"] or 0.0)
            out[(s,)] = {"targets": counts, "air_yards": ay, "n": len(sub)}
        return out


class DownDistanceSplit:
    """Marginal down/distance cells (INT-grid component)."""

    name = "down_distance"
    dimensions = ("d",)

    def compute(self, frame: pl.DataFrame) -> dict:
        f = bucketize(frame)
        out: dict[tuple, dict] = {}
        for d in ("d0", "d1", "d2", "d3"):
            sub = f.filter(pl.col("_b").struct.field("cell").str.contains(f"_({d})$"))
            n_att, n_int, ir = _int_rate(sub)
            out[(d,)] = {"n": len(sub), "n_att": n_att, "n_int": n_int,
                         "int_rate": ir, "epa_mean": _epa_mean(sub)}
        return out


class FieldZoneSplit:
    """Marginal field-zone cells (INT-grid component)."""

    name = "field_zone"
    dimensions = ("z",)

    def compute(self, frame: pl.DataFrame) -> dict:
        f = bucketize(frame)
        out: dict[tuple, dict] = {}
        for z in ("z0", "z1", "z2"):
            sub = f.filter(pl.col("_b").struct.field("cell").str.contains(f"_(z{z[1]})_"))
            n_att, n_int, ir = _int_rate(sub)
            out[(z,)] = {"n": len(sub), "n_att": n_att, "n_int": n_int,
                         "int_rate": ir, "epa_mean": _epa_mean(sub)}
        return out


class ScriptSplit:
    """Marginal game-script cells (INT-grid component)."""

    name = "script"
    dimensions = ("s",)

    def compute(self, frame: pl.DataFrame) -> dict:
        f = bucketize(frame)
        out: dict[tuple, dict] = {}
        for s in ("s0", "s1", "s2"):
            sub = f.filter(pl.col("_b").struct.field("cell").str.contains(f"_(s{s[1]})_"))
            n_att, n_int, ir = _int_rate(sub)
            out[(s,)] = {"n": len(sub), "n_att": n_att, "n_int": n_int,
                         "int_rate": ir, "epa_mean": _epa_mean(sub)}
        return out


class QuarterSplit:
    """Marginal quarter cells (INT-grid component)."""

    name = "quarter"
    dimensions = ("q",)

    def compute(self, frame: pl.DataFrame) -> dict:
        f = bucketize(frame)
        out: dict[tuple, dict] = {}
        for q in ("q1", "q2", "q3", "q4"):
            sub = f.filter(pl.col("_b").struct.field("cell").str.contains(f"_(q{q[1]})_"))
            n_att, n_int, ir = _int_rate(sub)
            out[(q,)] = {"n": len(sub), "n_att": n_att, "n_int": n_int,
                         "int_rate": ir, "epa_mean": _epa_mean(sub)}
        return out


#: Registry of c02 split specs (mirrors c01's SPLIT_REGISTRY convention if any).
SPLIT_SPECS: dict[str, object] = {
    s.name: s for s in (
        PressureFloorSplit(),
        INTSituationalSplit(),
        TrustSituationSplit(),
        DownDistanceSplit(),
        FieldZoneSplit(),
        ScriptSplit(),
        QuarterSplit(),
    )
}
