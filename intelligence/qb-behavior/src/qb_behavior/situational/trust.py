# PROVENANCE — qb-behavior / situational / trust.py
# Runtime server for trust-target time series (stdlib + csv ONLY).
# Implements: corpus-intelligence/deep/c02/buildable-systems.md (System 3);
# verified-claims.md TRUST-7 (computable metrics), TRUST-8 (charted/pbp_proxy
# boundary), TRUST-9 (validation gates: persistence, point-in-time).
# HHI math reuses c01's metrics primitives (import, not reimplement).
"""Trust-target time series: HHI / N_eff / top-share per QB x week x situation.

Point-in-time: week w rows use only plays from week w (KONTOGRAPH
anti-leakage — verified-claims.md TRUST-9). Trust STABILITY is the 4-week
rolling CV of top_share (persistence gate: descriptive vs predictive).
"""
from __future__ import annotations

import csv
import os
from typing import Any


def _f(v: str) -> float | None:
    v = (v or "").strip()
    return float(v) if v else None


def _i(v: str) -> int | None:
    v = (v or "").strip()
    return int(float(v)) if v else None


class TrustSeries:
    """Loads data/trust_weekly.csv once; serves series + stability."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        # (qb_id, season, week, situation) -> row
        self.rows: dict[tuple, dict] = {}
        self._load()

    def _load(self) -> None:
        p = os.path.join(self.data_dir, "trust_weekly.csv")
        if not os.path.exists(p):
            return
        with open(p, newline="") as f:
            for r in csv.DictReader(f):
                self.rows[(r["qb_id"], int(r["season"]), int(r["week"]),
                           r["situation"])] = r

    def series(self, qb_id: str, season: int,
               situation: str = "all") -> list[dict[str, Any]]:
        """Week-ordered rows for one QB/season/situation (point-in-time)."""
        out = [r for (q, s, w, sit), r in self.rows.items()
               if q == qb_id and s == season and sit == situation]
        out.sort(key=lambda r: int(r["week"]))
        return [
            {"week": int(r["week"]), "targets": _i(r["targets"]),
             "n_recv": _i(r["n_recv"]), "hhi": _f(r["hhi"]),
             "hhi_lo": _f(r["hhi_lo"]), "hhi_hi": _f(r["hhi_hi"]),
             "n_eff": _f(r["n_eff"]), "top_share": _f(r["top_share"]),
             "top2_share": _f(r["top2_share"]),
             "top_recv_id": r["top_recv_id"], "top_recv_name": r["top_recv_name"],
             "top_ay_share": _f(r["top_ay_share"])}
            for r in out
        ]

    def latest(self, qb_id: str, season: int, week: int,
               situation: str = "all") -> dict[str, Any] | None:
        """Latest row with week <= requested (point-in-time)."""
        cands = [(int(r["week"]), r) for (q, s, w, sit), r in self.rows.items()
                 if q == qb_id and s == season and sit == situation and w <= week]
        if not cands:
            return None
        _, r = max(cands, key=lambda t: t[0])
        return {
            "week": int(r["week"]), "targets": _i(r["targets"]),
            "n_recv": _i(r["n_recv"]), "hhi": _f(r["hhi"]),
            "hhi_lo": _f(r["hhi_lo"]), "hhi_hi": _f(r["hhi_hi"]),
            "n_eff": _f(r["n_eff"]), "top_share": _f(r["top_share"]),
            "top2_share": _f(r["top2_share"]),
            "top_recv_id": r["top_recv_id"], "top_recv_name": r["top_recv_name"],
            "top_ay_share": _f(r["top_ay_share"]),
        }

    def top_share_cv(self, qb_id: str, season: int, week: int,
                     situation: str = "all", window: int = 4) -> float | None:
        """Trust STABILITY: coefficient of variation of top_share over the
        trailing `window` weeks (TRUST-7). None when < 2 weeks available."""
        vals = [p["top_share"] for p in self.series(qb_id, season, situation)
                if p["week"] <= week and p["top_share"] is not None]
        vals = vals[-window:]
        if len(vals) < 2:
            return None
        mean = sum(vals) / len(vals)
        if mean <= 0:
            return None
        var = sum((v - mean) ** 2 for v in vals) / len(vals)
        return (var ** 0.5) / mean

    def hhi_autocorr(self, qb_id: str, season: int,
                     situation: str = "all", lag: int = 1) -> float | None:
        """Week-to-week persistence of HHI (TRUST-9 persistence gate).
        Returns lag-`lag` autocorrelation; None when < 4 pairs."""
        vals = [p["hhi"] for p in self.series(qb_id, season, situation)
                if p["hhi"] is not None]
        if len(vals) < lag + 3:
            return None
        x = vals[:-lag]
        y = vals[lag:]
        mx, my = sum(x) / len(x), sum(y) / len(y)
        num = sum((a - mx) * (b - my) for a, b in zip(x, y))
        den = (sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y)) ** 0.5
        return num / den if den > 0 else None
