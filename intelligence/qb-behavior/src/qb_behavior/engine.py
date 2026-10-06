# Provenance: the core profile computation engine.
# Extends: qb-behavioral-profiles/code/compute_metrics.py — the season-grain
# metric definitions (HHI, trust targets, INT splits, scramble/designed,
# EPA splits) are re-implemented here as methods so they are testable,
# verification-tagged, and servable (the original is a write-once script).
# New: rolling form (#1), pressure trait w/ EB (#2), dropback outcomes (#6),
# run EPA under pressure (#7), aggressiveness (#8), burden drivers (#10),
# availability (#11) — see PROVENANCE.md.
"""ProfileEngine: computes QBProfile objects from nflverse pbp.

Composition point for c02: get_dropback_frame() / get_target_frame()
return identically-filtered play-level frames so the situational and
trust-target split layer never reimplements loading, filtering, or identity.
"""
from __future__ import annotations

import os

import polars as pl

from . import metrics as M
from .identity import canonical_name
from .loader import (DEFAULT_DATA_DIR, ENGINE_COLUMNS, MIN_DROPBACKS,
                     apply_metric_bible_filters,
                     dropback_frame, load_pbp, with_game_script)
from .profile import MetricValue, QBProfile, SeasonProfile, Verification

SRC = "qb_behavior.engine"


class ProfileEngine:
    def __init__(self, data_dir: str = DEFAULT_DATA_DIR,
                 name_map: dict[str, str] | None = None,
                 auto_name_map: bool = True,
                 extra_columns: list[str] | None = None):
        self.data_dir = data_dir
        self.name_map = name_map or {}
        self._auto_name_map = auto_name_map and not self.name_map
        self._columns = list(dict.fromkeys(ENGINE_COLUMNS + (extra_columns or [])))
        self._pbp: pl.DataFrame | None = None
        self._db: pl.DataFrame | None = None

    def _ensure_name_map(self):
        # c02 fix 2026-10-02: was df.select(idc, nmc).unique() — unique()
        # collapses each (id, name) to ONE vote, so build_name_map_from_pbp's
        # "most common wins" tied 1-1 between a 1-season variant ("Aa.Rodgers")
        # and the 17-season canonical ("A.Rodgers"), breaking nondeterministically.
        # Count occurrences per (id, name) instead.
        from collections import Counter
        if self._auto_name_map and not self.name_map:
            df = self.pbp()
            votes: dict[str, Counter] = {}
            for idc, nmc in (("passer_player_id", "passer_player_name"),
                             ("rusher_player_id", "rusher_player_name"),
                             ("receiver_player_id", "receiver_player_name")):
                if idc in df.columns and nmc in df.columns:
                    vc = (df.select(idc, nmc).drop_nulls()
                            .group_by(idc, nmc).agg(pl.len().alias("n")))
                    for r in vc.iter_rows(named=True):
                        votes.setdefault(r[idc], Counter())[r[nmc]] += r["n"]
            self.name_map = {pid: c.most_common(1)[0][0]
                             for pid, c in votes.items() if c}
            self._auto_name_map = False

    # -- data access ------------------------------------------------------
    def pbp(self, seasons: list[int] | None = None) -> pl.DataFrame:
        if self._pbp is None:
            df = load_pbp(self.data_dir, seasons, columns=self._columns)
            df = apply_metric_bible_filters(df)
            self._pbp = with_game_script(df)
        return self._pbp

    def dropbacks(self, seasons: list[int] | None = None) -> pl.DataFrame:
        if self._db is None:
            self._db = dropback_frame(self.pbp(seasons))
        return self._db

    def get_dropback_frame(self, qb_id: str, season: int) -> pl.DataFrame:
        """C02 COMPOSITION POINT: filtered dropback-level frame for one
        QB-season. c02 computes arbitrary situational splits from this."""
        return self.dropbacks().filter(
            (pl.col("passer_player_id") == qb_id) & (pl.col("season") == season))

    def get_target_frame(self, qb_id: str, season: int) -> pl.DataFrame:
        """C02 COMPOSITION POINT: targeted-pass frame (attempts with a
        receiver) for trust-target split work."""
        return self.get_dropback_frame(qb_id, season).filter(
            (pl.col("pass_attempt") == 1) & pl.col("receiver_player_id").is_not_null())

    def list_qbs(self, min_dropbacks: int = MIN_DROPBACKS) -> list[dict]:
        q = (self.dropbacks().group_by("passer_player_id")
             .agg(pl.len().alias("dropbacks"))
             .filter(pl.col("dropbacks") >= min_dropbacks))
        return [{"qb_id": r["passer_player_id"],
                 "qb_name": canonical_name(r["passer_player_id"], self.name_map),
                 "dropbacks": r["dropbacks"]}
                for r in q.iter_rows(named=True)]

    # -- season profile ----------------------------------------------------
    def compute_season_profile(self, qb_id: str, season: int) -> SeasonProfile | None:
        self._ensure_name_map()
        qd = self.get_dropback_frame(qb_id, season)
        n_db = len(qd)
        if n_db < MIN_DROPBACKS:
            return None
        att = qd.filter(pl.col("pass_attempt") == 1)
        n_att = len(att)
        name = canonical_name(qb_id, self.name_map)
        mv: dict[str, MetricValue] = {}
        V = Verification.COMPUTED

        def put(key, value, n=None, note="", verification=V,
                ci_low=None, ci_high=None, source=SRC):
            mv[key] = MetricValue(value=value, verification=verification, n=n,
                                  source=source, note=note,
                                  ci_low=ci_low, ci_high=ci_high)

        # --- target concentration (HHI) -----------------------------------
        tg = self.get_target_frame(qb_id, season)
        counts: dict[str, int] = {}
        if len(tg):
            for r in tg.group_by("receiver_player_id").agg(pl.len().alias("t")).iter_rows(named=True):
                counts[str(r["receiver_player_id"])] = r["t"]
        shares = M.target_shares(counts)
        hhi = round(M.hhi(shares.values()), 4)
        top1 = round(M.top_k_share(list(shares.values()), 1), 4)
        top2 = round(M.top_k_share(list(shares.values()), 2), 4)
        top_recv = max(counts, key=counts.get) if counts else None
        put("hhi", hhi, n=len(tg), source="nflverse pbp; HHI of target shares")
        put("top1_share", top1, n=len(tg))
        put("top2_share", top2, n=len(tg))
        put("top_receiver", canonical_name(top_recv, self.name_map) if top_recv else None,
            n=counts.get(top_recv, 0) if top_recv else 0,
            verification=Verification.CORPUS)

        # --- trust targets: 3rd down / red zone ---------------------------
        for label, filt in (("third", pl.col("down") == 3),
                            ("rz", pl.col("yardline_100") <= 20)):
            sub = tg.filter(filt)
            c2: dict[str, int] = {}
            for r in sub.group_by("receiver_player_id").agg(pl.len().alias("t")).iter_rows(named=True):
                c2[str(r["receiver_player_id"])] = r["t"]
            s2 = M.target_shares(c2)
            top = max(c2, key=c2.get) if c2 else None
            put(f"{label}_top_recv",
                canonical_name(top, self.name_map) if top else None,
                n=len(sub), verification=Verification.CORPUS)
            put(f"{label}_top_share",
                round(M.top_k_share(list(s2.values()), 1), 4) if s2 else None,
                n=len(sub))
            put(f"{label}_targets", len(sub), n=len(sub), verification=Verification.CORPUS)

        # --- INT situational splits ---------------------------------------
        n_int = int(att.select(pl.col("interception").sum()).item() or 0)
        put("int_rate", round(100 * n_int / n_att, 2) if n_att else None,
            n=n_att, note=f"{n_int}/{n_att}")
        put("ints", n_int, n=n_att, verification=Verification.CORPUS)
        put("expected_ints", round(M.expected_ints(n_att), 2), n=n_att,
            note="1.867%/dropback baseline (verified by recomputation)")
        put("int_luck", round(M.int_luck(n_int, n_att), 2), n=n_att,
            note="actual - expected; +unlucky/-lucky, mean-reverts")

        def intrate(a: pl.DataFrame):
            n = len(a)
            if n == 0:
                return None, 0, None, None
            i = int(a.select(pl.col("interception").sum()).item() or 0)
            lo, hi = M.wilson_interval(i, n)
            return round(100 * i / n, 2), n, round(lo * 100, 2), round(hi * 100, 2)

        for q in (1, 2, 3, 4):
            v, n, lo, hi = intrate(att.filter(pl.col("qtr") == q))
            put(f"int_q{q}", v, n=n, ci_low=lo, ci_high=hi)
        for s in ("leading", "tied", "trailing"):
            v, n, lo, hi = intrate(att.filter(pl.col("script") == s))
            put(f"int_{s}", v, n=n, ci_low=lo, ci_high=hi)
        a_hit = att.filter(pl.col("qb_hit") == 1) if "qb_hit" in att.columns else att.clear()
        a_clean = att.filter(pl.col("qb_hit").fill_null(0) == 0) if "qb_hit" in att.columns else att
        for label, a in (("hit", a_hit), ("clean", a_clean)):
            v, n, lo, hi = intrate(a)
            put(f"int_{label}", v, n=n, ci_low=lo, ci_high=hi,
                note="hit proxy = qb_hit flag; sacks excluded by construction")

        # --- run behavior --------------------------------------------------
        n_scr = int(qd.select(pl.col("qb_scramble").sum()).item() or 0) if "qb_scramble" in qd.columns else 0
        put("scramble_rate", round(n_scr / n_db, 4) if n_db else None, n=n_db)
        put("scrambles", n_scr, n=n_db, verification=Verification.CORPUS)
        # designed rushes: QB is rusher, not a scramble/kneel/spike
        des = self.pbp().filter(
            (pl.col("rusher_player_id") == qb_id) & (pl.col("season") == season) &
            (pl.col("rush_attempt") == 1) &
            (pl.col("qb_scramble").fill_null(0) == 0) &
            (pl.col("qb_kneel").fill_null(0) == 0) &
            (pl.col("qb_spike").fill_null(0) == 0)) if "rush_attempt" in self.pbp().columns else None
        n_des = len(des) if des is not None else 0
        put("designed_rushes", n_des, n=n_db + n_des, verification=Verification.CORPUS)
        put("designed_rush_rate",
            round(n_des / (n_db + n_des), 4) if (n_db + n_des) else None, n=n_db + n_des)

        # --- EPA splits ----------------------------------------------------
        def epamean(d: pl.DataFrame):
            v = d.select(pl.col("epa").mean()).item() if "epa" in d.columns and len(d) else None
            return round(v, 3) if v is not None else None

        put("epa_db", epamean(qd), n=n_db)
        for s in ("leading", "tied", "trailing"):
            put(f"epa_{s}", epamean(sub_s := qd.filter(pl.col("script") == s)), n=len(sub_s))
        for q in (1, 2, 3, 4):
            put(f"epa_q{q}", epamean(sub_q := qd.filter(pl.col("qtr") == q)), n=len(sub_q))

        # --- dropback outcomes (#6): complete/incomplete/scramble/sack/INT --
        n_sack = int(qd.select(pl.col("sack").sum()).item() or 0) if "sack" in qd.columns else 0
        n_comp = int(att.select(pl.col("complete_pass").sum()).item() or 0) if "complete_pass" in att.columns else 0
        outcomes = {
            "complete": n_comp, "incomplete": n_att - n_comp - n_int,
            "scramble": n_scr, "sack": n_sack, "int": n_int,
        }
        for k, v in outcomes.items():
            put(f"outcome_{k}_pct", round(100 * v / n_db, 2) if n_db else None,
                n=n_db, note="dropback-outcome split (partition-01 #6)")

        # --- aggressiveness: aDOT / air-yard share / deep rate (#8) ---------
        ay = qd.select("air_yards").to_series().to_list() if "air_yards" in qd.columns else []
        put("adot", round(M.adot(ay), 2) if M.adot(ay) is not None else None, n=len([v for v in ay if v is not None]),
            note="public aggressiveness proxy; NGS true aggressiveness is internal-only")
        put("deep_rate_10", (lambda d: round(d, 4) if d is not None else None)(M.deep_rate(ay)),
            n=len([v for v in ay if v is not None]))

        # --- run EPA: scramble vs designed (#7) -----------------------------
        scr = qd.filter(pl.col("qb_scramble") == 1) if "qb_scramble" in qd.columns else qd.clear()
        put("epa_scramble", epamean(scr), n=len(scr))
        put("epa_designed", epamean(des) if des is not None else None, n=n_des,
            note="behavioral decomposition for props/fantasy, not a team-strength family")

        # --- pressure-to-sack trait, EB-shrunk (#2, Challenge A) -------------
        # Floor implementation on nflverse: pressures proxied by (qb_hit OR sack);
        # the <2.5s split and FTN is_qb_fault_sack plug in when wired.
        n_pressured = len(a_hit) + n_sack
        p2s_raw = n_sack / n_pressured if n_pressured else None
        p2s_shrunk = M.eb_shrink(n_sack, n_pressured, M.P2S_LEAGUE_BASELINE, M.P2S_SHRINK_PRIOR_N) if n_pressured else None
        put("p2s_raw", round(p2s_raw, 4) if p2s_raw is not None else None, n=n_pressured,
            note="PROXY-GRADE: nflverse floor proxy (qb_hit OR sack) UNDERCOUNTS true "
                 "charting pressures (no hurries), so p2s_raw is BIASED UPWARD vs the "
                 "~18% charting baseline. Descriptive only — never a modeled skill.")
        put("p2s_shrunk", round(p2s_shrunk, 4) if p2s_shrunk is not None else None, n=n_pressured,
            note="EB-shrunk toward 18% league baseline; inherits the proxy's upward "
                 "bias — replace with FTN/SumerSports charting when wired; flag n<30",
            verification=Verification.COMPUTED)
        put("p2s_small_sample", M.small_sample_flag(n_pressured), n=n_pressured)

        # --- burden drivers (#10): context load, reported separately ---------
        n_deep = sum(1 for v in ay if v is not None and v >= 10)
        n_ay = len([v for v in ay if v is not None])
        put("burden_deep_throw_share",
            round(n_deep / n_ay, 4) if n_ay else None, n=n_ay,
            note="burden driver: depth. Burden != quality; weights not hardcoded (SHADOW)")
        put("burden_pressure_share",
            round(n_pressured / n_db, 4) if n_db else None, n=n_db,
            note="burden driver: pressure faced (proxy)")

        return SeasonProfile(season=season, qb_id=qb_id, qb_name=name,
                             dropbacks=n_db, metrics=mv)

    # -- rolling form (BUILD 1) ----------------------------------------------
    def compute_rolling_form(self, qb_id: str, window: int = 16) -> list[dict]:
        """Per-QB rolling EPA/dropback, game-ordered, trade-following.

        Keyed by passer_player_id (follows trades/midseason takeovers).
        Availability weight uses weeks STRICTLY before the current week
        (anti-leakage rule). Measured: log loss 0.633->0.625, AUC 0.690->0.700.
        """
        qd = (self.dropbacks().filter(pl.col("passer_player_id") == qb_id)
              .sort(["season", "week"])
              .with_columns(pl.col("epa").fill_null(0.0)))
        if len(qd) == 0 or "week" not in qd.columns:
            return []
        games = (qd.group_by(["season", "week", "game_id"] if "game_id" in qd.columns else ["season", "week"])
                 .agg(pl.col("epa").mean().alias("epa_db"),
                      pl.len().alias("dropbacks")))
        games = games.sort(["season", "week"])
        epa_list = games["epa_db"].to_list()
        roll = M.rolling_mean(epa_list, window)
        rows = []
        for i, r in enumerate(games.iter_rows(named=True)):
            # availability weight: prior-games dropback share, strictly before
            prior = games.slice(0, i)
            avail = (r["dropbacks"] / prior["dropbacks"].sum()) if len(prior) and prior["dropbacks"].sum() else None
            rows.append({"season": r["season"], "week": r["week"],
                         "epa_db": round(r["epa_db"], 3),
                         "rolling_epa_db": round(roll[i], 3) if roll[i] is not None else None,
                         "availability_weight": round(avail, 4) if avail else None,
                         "verification": Verification.COMPUTED.value})
        return rows

    # -- availability / familiarity (#11) --------------------------------------
    def availability(self, qb_id: str, season: int) -> dict:
        qd = self.get_dropback_frame(qb_id, season)
        games = qd.select("game_id").n_unique() if "game_id" in qd.columns else None
        return {"qb_id": qb_id, "season": season,
                "games_with_dropbacks": games,
                "dropbacks": len(qd),
                "verification": Verification.COMPUTED.value}

    # -- full profile ----------------------------------------------------------
    def get_profile(self, qb_id: str,
                    seasons: list[int] | None = None) -> QBProfile:
        self._ensure_name_map()
        name = canonical_name(qb_id, self.name_map)
        prof = QBProfile(qb_id=qb_id, qb_name=name)
        for s in (seasons or sorted(self.dropbacks()["season"].unique().to_list())):
            sp = self.compute_season_profile(qb_id, int(s))
            if sp is not None:
                prof.seasons.append(sp)
        prof.rolling_form = self.compute_rolling_form(qb_id)
        return prof
