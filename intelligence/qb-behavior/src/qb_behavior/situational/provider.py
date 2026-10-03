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

import csv as _csv  # noqa: E402
from qb_behavior.identity import is_gsis_id  # noqa: E402
from qb_behavior.form import form_ahead_of as _form_ahead_of  # noqa: E402
from qb_behavior.familiarity import familiarity as _familiarity  # noqa: E402
from qb_behavior.trust_target import (  # noqa: E402
    absence_delta as _absence_delta,
    target_profile as _target_profile,
)

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
        self._form_rows: list[dict] | None = None  # lazy qb_weekly.csv
        self._starts_rows: list[dict] | None = None  # lazy qb_starts.csv
        self._trust_rows: list[dict] | None = None  # lazy trust_targets.csv

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
    def _require_gsis(self, qb_id: str) -> None:
        if not is_gsis_id(qb_id):
            raise DataGapError(
                TRACK,
                f"qb_id {qb_id!r} is not an nflverse GSIS id (00-#######). "
                "Slugs are not resolved against the real store.",
            )

    def get_qb_profile(self, qb_id: str, week: int, season: int) -> QBBehaviorProfile:
        self._require_gsis(qb_id)
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
        self._require_gsis(qb_id)
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

    def get_form(self, qb_id: str, season: int,
                 week: int) -> dict[str, Any] | None:
        """Per-QB rolling form: trailing-16-game EPA/dropback + availability.

        corpus buildable-systems.md #1 (largest measured gain: log loss
        0.633→0.625, AUC 0.690→0.700). Anti-leakage: strictly-before weeks
        only; trade-following (keyed by qb_id). Returns None when the QB has
        no prior charted games — never a guess. Additive: not on the ABC.
        """
        if self._form_rows is None:
            path = os.path.join(self.data_dir, "qb_weekly.csv")
            try:
                with open(path, newline="") as f:
                    self._form_rows = list(_csv.DictReader(f))
            except OSError:
                self._form_rows = []
        f = _form_ahead_of(qb_id, season, week, self._form_rows)
        if f is None:
            return None
        return {
            "qb_id": f.qb_id, "season": f.season, "week": f.week,
            "form_epa": f.form_epa, "n_dropbacks": f.n_dropbacks,
            "n_games": f.n_games, "availability": f.availability,
            "gap_note": f.gap_note,
        }

    def get_familiarity(self, team: str, season: int, week: int,
                        qb_id: str | None = None) -> dict[str, Any] | None:
        """QB familiarity: share of the team's trailing-16 starts by the
        listed starter + backup flag (buildable-systems.md #28).

        "Starter" is inferred (most dropbacks in the team-week) — the result
        is labeled inference, never asserted as an official start. Returns
        None when the team has no charted starts before `week`.
        Additive: not on the ABC.
        """
        if self._starts_rows is None:
            path = os.path.join(self.data_dir, "qb_starts.csv")
            try:
                with open(path, newline="") as fh:
                    self._starts_rows = list(_csv.DictReader(fh))
            except OSError:
                self._starts_rows = []
        f = _familiarity(team, season, week, qb_id, self._starts_rows)
        if f is None:
            return None
        return {
            "team": f.team, "season": f.season, "week": f.week,
            "qb_id": f.qb_id, "familiarity": f.familiarity,
            "n_starts": f.n_starts, "backup_flag": f.backup_flag,
            "gap_note": f.gap_note,
        }

    def get_trust_targets(self, qb_id: str, season: int,
                         week: int) -> dict[str, Any] | None:
        """Per-QB trust-target profile: trailing-8-week P(target) per
        receiver + HHI (buildable-systems.md #3).

        First-read share / TPRR / air-yard share need FTN charting and are
        NOT included — n is reported alongside every share. None when the QB
        has no charted targets before `week`. Additive: not on the ABC.
        """
        if self._trust_rows is None:
            path = os.path.join(self.data_dir, "trust_targets.csv")
            try:
                with open(path, newline="") as fh:
                    self._trust_rows = list(_csv.DictReader(fh))
            except OSError:
                self._trust_rows = []
        p = _target_profile(qb_id, season, week, self._trust_rows)
        if p is None:
            return None
        return {
            "qb_id": p.qb_id, "season": p.season, "week": p.week,
            "n_targets": p.n_targets, "n_weeks": p.n_weeks, "hhi": p.hhi,
            "gap_note": p.gap_note,
            "shares": [{"receiver_id": s.receiver_id,
                        "receiver_name": s.receiver_name,
                        "targets": s.targets, "share": s.share}
                       for s in p.shares],
        }

    def get_absence_delta(self, qb_id: str, receiver_id: str, season: int,
                          week: int) -> dict[str, Any] | None:
        """Trust_delta_absent[qb][receiver]: the Pitts template — target
        distribution with vs without the receiver. None when either side of
        the split is too thin. Additive: not on the ABC.
        """
        if self._trust_rows is None:
            path = os.path.join(self.data_dir, "trust_targets.csv")
            try:
                with open(path, newline="") as fh:
                    self._trust_rows = list(_csv.DictReader(fh))
            except OSError:
                self._trust_rows = []
        d = _absence_delta(qb_id, receiver_id, season, week, self._trust_rows)
        if d is None:
            return None
        return {
            "qb_id": d.qb_id, "receiver_id": d.receiver_id,
            "receiver_name": d.receiver_name,
            "weeks_present": d.weeks_present, "weeks_absent": d.weeks_absent,
            "leader_share_with": d.leader_share_with,
            "leader_share_without": d.leader_share_without,
            "hhi_with": d.hhi_with, "hhi_without": d.hhi_without,
            "trust_delta_absent": d.trust_delta_absent,
            "gap_note": d.gap_note,
        }

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
