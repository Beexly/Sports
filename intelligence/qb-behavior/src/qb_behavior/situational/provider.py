# PROVENANCE — qb-behavior / situational / provider.py
# Implements integration/providers.py :: QBBehaviorProvider (the ABC).
# UNPARKS get_pressure_splits: c09-map.md #8 parked it "until sourced" — the
# c02 deep research sources it (pressure-floor construction, verified-claims.md
# PRESS-1..14, SIT-1..9) with the honest _floor naming and the attenuation
# caveat. Served numbers are COMPUTED from T1 nflverse pbp precomputed tables
# (qb-behavior/data/*.csv); rights: no FTN charting, no NGS in engine outputs
# (syntheses.md S1; signal-architecture.md L7 share-alike gate).
# Research: corpus-intelligence/deep/c02/{verified-claims,syntheses,challenges,
# buildable-systems}.md; reasoning-depth-spec.md §5 Track 1 (qb_behavior).
"""SituationalQBProvider: the c02 implementation of QBBehaviorProvider.

Serves precomputed tables (pure data; stdlib+csv at runtime). Composes with
c01's core engine at build time (build/build_tables.py consumes
ProfileEngine frames); at serve time it needs only the CSVs, so the
reasoning layer never touches polars or the pbp files.
"""
from __future__ import annotations

import os
from typing import Any

import sys
_BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
if _BUILD_ROOT not in sys.path:
    sys.path.insert(0, _BUILD_ROOT)

from integration.providers import (  # noqa: E402
    DataGapError,
    PressureSplits,
    QBBehaviorProfile,
    QBBehaviorProvider,
)
from integration.types import Verification  # noqa: E402

from .protection import ProtectionStressIndex  # noqa: E402
from .serve import SituationalStore  # noqa: E402
from .trust import TrustSeries  # noqa: E402

DEFAULT_DATA_DIR = os.path.join(_BUILD_ROOT, "qb-behavior", "data")

TRACK = "qb_behavior"

FLOOR_NOTE = (
    "pressure_floor = (qb_hit == 1 OR sack == 1); hurries exist in no nflverse "
    "source, so the clean cell is contaminated and clean-vs-pressured contrasts "
    "are attenuated toward zero (conservative, never overstated). Never bare 'pressure'."
)
CHARTED_NULL_NOTE = (
    "The proposal's charted-pressure sensitivity is NULL: the nflverse FTN release "
    "has no per-play pressure field (verified-claims.md PRESS-7). Charting from "
    "outside nflverse is required."
)
FIRST_READ_GAP = (
    "first_read_rate: no pbp source. FTN read_thrown (2022+) is display-only "
    "under the L7 share-alike model-ineligibility (SIT-2); it validates proxies, "
    "never enters engine features."
)


def _f(v) -> float | None:
    if v is None:
        return None
    v = str(v).strip()
    return float(v) if v else None


class SituationalQBProvider(QBBehaviorProvider):
    """c02 situational + trust-target provider (integration ABC)."""

    def __init__(self, data_dir: str = DEFAULT_DATA_DIR):
        self.data_dir = data_dir
        self.store = SituationalStore(data_dir)
        self.trust = TrustSeries(data_dir)
        self.protection = ProtectionStressIndex(data_dir)

    # -- internal helpers -------------------------------------------------
    def _qb_week(self, qb_id: str, week: int, season: int) -> tuple[dict, list[str]]:
        """Season-to-date weekly row (point-in-time) + gap notes."""
        notes: list[str] = []
        row, used_week = self.store.weekly_row(qb_id, season, week)
        if row is None:
            if self.store.season_row(qb_id, season) is None:
                raise DataGapError(TRACK,
                                   f"no data for qb_id={qb_id} season={season}")
            row = self.store.season_row(qb_id, season)
            notes.append(f"no weekly grain for {season}; serving season aggregate")
            used_week = None
        max_w = self.store.max_week(season)
        if max_w is not None and week > max_w:
            notes.append(f"data through week {max_w}; week {week} not yet played/charted")
        return row, notes

    # -- ABC: QB profile ----------------------------------------------------
    def get_qb_profile(self, qb_id: str, week: int, season: int) -> QBBehaviorProfile:
        row, notes = self._qb_week(qb_id, week, season)
        gaps = list(notes)
        gaps.append(FIRST_READ_GAP)
        gaps.append("cpoe served is the nflverse pbp column (cpoe_nflverse_pbp), "
                    "not NGS CPOE (NGS-7: different estimators, never the NGS name)")
        gaps.append("aggressiveness = public proxy P(air_yards>=20) "
                    "(aggressiveness_proxy_deep_rate, NGS-8); NGS true "
                    "aggressiveness is internal-only and never served")

        t_all = self.trust.latest(qb_id, season, week, "all")
        t_3rd = self.trust.latest(qb_id, season, week, "third")
        t_rz = self.trust.latest(qb_id, season, week, "rz")
        if t_all is None:
            gaps.append("target_hhi: no trust-target week meets the T>=25 guard")

        return QBBehaviorProfile(
            qb_id=qb_id,
            name=row.get("name") or qb_id,
            team=row.get("team") or "",
            week=week,
            season=season,
            epa_per_dropback=_f(row.get("epa")),
            cpoe=_f(row.get("cpoe_pbp")),
            pressure_to_sack_rate=_f(row.get("p2s_eb")),
            first_read_rate=None,
            scramble_rate=_f(row.get("scramble_rate")),
            aggressiveness=_f(row.get("deep_rate_20")),
            adot=_f(row.get("adot")),
            target_hhi=(t_all or {}).get("hhi"),
            trust_target_share_3rd=(t_3rd or {}).get("top_share"),
            trust_target_share_redzone=(t_rz or {}).get("top_share"),
            verification=Verification.COMPUTED,
            data_gap=" | ".join(gaps) if gaps else None,
        )

    # -- ABC: pressure splits (UNPARKED — sourced by c02 research) ------------
    def get_pressure_splits(self, qb_id: str, week: int, season: int) -> PressureSplits:
        row, notes = self._qb_week(qb_id, week, season)
        gaps = list(notes)
        gaps.append(FLOOR_NOTE)
        gaps.append(CHARTED_NULL_NOTE)

        team = row.get("team") or ""
        max_w = self.store.max_week(season)
        season_key = SituationalStore.season_key_for(season, week, max_w)
        m0 = self.store.int_rate_marginal(qb_id, team, season_key, 0)
        m1 = self.store.int_rate_marginal(qb_id, team, season_key, 1)

        n_press = _f(row.get("n_press")) or 0
        if n_press >= 100:
            epa_c, epa_p = _f(row.get("epa_clean")), _f(row.get("epa_press"))
            sens = _f(row.get("sens_epa_floor"))
        else:
            epa_c = epa_p = sens = None
            gaps.append(
                f"sensitivity_epa_floor NULL: {int(n_press)} pressured dropbacks "
                f"< 100 guard (proposal :23)")
        gaps.append(
            f"int_rate_clean level={m0['level']} (n={m0['n']}); "
            f"int_rate_pressure level={m1['level']} (n={m1['n']}); "
            f"EB M=25 ladder league->team->QB; null floor n<30")

        return PressureSplits(
            qb_id=qb_id,
            int_rate_clean=m0["rate"],
            int_rate_pressure=m1["rate"],
            epa_per_dropback_clean=epa_c,
            epa_per_dropback_pressure=epa_p,
            verification=Verification.COMPUTED,
            data_gap=" | ".join(gaps),
        )

    # -- c02 extras (beyond the ABC) ------------------------------------------
    def get_int_situational(self, qb_id: str, season: int, week: int,
                            situation: dict) -> dict[str, Any]:
        """EB-shrunk INT rate for a query situation.

        situation: {pressured (0/1), qtr, score_differential, yardline_100,
        down, ydstogo}. Returns rate (0-1), n, level, cell, season_key.
        """
        row, _ = self._qb_week(qb_id, week, season)
        team = row.get("team") or ""
        max_w = self.store.max_week(season)
        return self.store.int_rate_for_situation(qb_id, team, season, week,
                                                 situation, max_w)

    def get_trust_series(self, qb_id: str, season: int,
                         situation: str = "all") -> list[dict[str, Any]]:
        """Week-ordered trust-target series (point-in-time)."""
        return self.trust.series(qb_id, season, situation)

    def get_trust_stability(self, qb_id: str, season: int, week: int,
                            situation: str = "all") -> dict[str, Any]:
        """Trust stability: 4-week CV of top_share + HHI autocorrelation."""
        return {
            "top_share_cv_4wk": self.trust.top_share_cv(qb_id, season, week, situation),
            "hhi_autocorr_lag1": self.trust.hhi_autocorr(qb_id, season, situation),
            "verification": Verification.COMPUTED.value,
        }

    def get_protection_stress(self, team: str, season: int,
                              week: int) -> dict[str, Any] | None:
        """Team-week Protection Stress (analyst/display use only — PRESS-5)."""
        return self.protection.get(team, season, week)

    def build_info(self) -> dict[str, str]:
        """Build provenance for citation by the reasoning layer."""
        return dict(self.store.meta)

    def get_sensitivity(self, qb_id: str, week: int,
                        season: int) -> dict[str, Any]:
        """sensitivity_epa_floor + clean baseline + SE (the honest triple —
        never the raw gap alone, CH-PRESS-4)."""
        row, notes = self._qb_week(qb_id, week, season)
        n_press = _f(row.get("n_press")) or 0
        out: dict[str, Any] = {
            "sensitivity_epa_floor": _f(row.get("sens_epa_floor")),
            "sens_se": _f(row.get("sens_se")),
            "clean_epa_baseline": _f(row.get("clean_epa_baseline")),
            "epa_clean": _f(row.get("epa_clean")),
            "epa_pressured_floor": _f(row.get("epa_press")),
            "n_clean": _f(row.get("n_clean")),
            "n_pressured_floor": n_press,
            "verification": Verification.COMPUTED.value,
            "note": FLOOR_NOTE,
        }
        if n_press < 100:
            out["sensitivity_epa_floor"] = None
            out["null_reason"] = (f"{int(n_press)} pressured dropbacks < 100 guard")
        return out
