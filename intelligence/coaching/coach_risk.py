"""
coach_risk.py — Per-coach-team-season 4th-down risk-preference (tau-hat) estimation.

PROVENANCE
----------
Implements the estimand of Sandholtz, Wu, Puterman & Chan (arXiv:2309.00756),
"Learning Risk Preferences from Investment and Gambling Experiments" applied to
NFL 4th-down decisions (deep-read: ~/workspace/vendor/Sports/docs/arxiv-program/
research/2026-09-21/arxiv-deep/1575-learning-risk-preferences-fourth-down.md;
verification: ~/workspace/corpus-intelligence/deep/c04/verified-claims.md VC-1).

Paper recipe (inverse optimization over a quantile-MDP):
    min_{tau in [0,1]} (1/N) sum_j 1(a_j != a*_j(sigma_j, q^pi_bar_tau))   (Eq. 4.11)
i.e. choose the tau whose tau-optimal policy best reproduces observed decisions
under Hamming loss. Joint (tau_1, tau_2) over own/opponent half (Eq. 5.5).

OUR TRANSLATION (documented, not the paper's code):
- The paper's forward model (one-period MDP, league-average stationary policy
  pi-bar, rewards 6.95/3/-2) is replaced by EMPIRICAL next-state value
  distributions: for each state cell and action, the distribution of realized
  post-play posteam win probability v = wp + wpa from nflverse pbp.
  tau-optimal action = argmax_a Q_tau[v | cell, a].
- The paper's "4th Down Bot run through the identical inverse pipeline" risk-neutral
  reference is replaced by a WP-MAX rule: argmax_a E[v | cell, a].
- Inference restricted to tau in [0.2, 0.8] (paper: tau-optimal policies plateau
  at extremes). Grid step 0.05.
- Unit of analysis: (posteam, season) with head-coach name attached from the
  verified tenure mapping where available. Within one season team == coach-team
  barring midseason firings (documented caveat; blended tau-hat in that case).
  Never fit or serve bare cross-season team tau-hat (CH-1).
- Region-gap bias adjustment (CH-4): the served tau_1 - tau_2 contrast is
  shrunk by the WP-max reference's own region gap (residual selection-bias
  fingerprint per the paper's section 9).

INPUT:  nflverse pbp parquet (2022-2026 in ~/workspace/coaching-tendencies/data/).
OUTPUT: tau_hat.csv + serve function tau_hat(team, season, region, wp).
GATE:   team-specific tau-hat rule beats WP-max rule by >=3pp Hamming accuracy
        in the opponent half on 2024-2025 4th downs (1575 brief's gate).
"""

import numpy as np
import pandas as pd

TAU_GRID = np.round(np.arange(0.2, 0.81, 0.05), 2)
ACTIONS = ["GO", "FGA", "PUNT"]
MIN_CELL_N = 30          # min action-outcomes in a fine cell before backing off
MIN_UNIT_N = 25          # paper's >=25 decisions inclusion rule per unit-region-WP cell
N0_SHRINK = 50           # not used here; kept for API parity with situational_wp

WP_BINS = [0.0, 0.2, 0.4, 0.6, 0.8, 1.01]
WP_BIN_LABELS = ["0-20", "20-40", "40-60", "60-80", "80-100"]


def load_fourth_downs(parquet_paths, extra_cols=()):
    """Load 4th-down decision plays with observed action + post-play value."""
    base = ["season", "week", "game_id", "posteam", "defteam", "down",
            "play_type", "wp", "wpa", "yardline_100", "ydstogo",
            "qtr", "game_seconds_remaining", "score_differential"]
    cols = list(dict.fromkeys(base + list(extra_cols)))
    import pyarrow.parquet as pq
    frames = []
    for p in parquet_paths:
        have = set(pq.read_schema(p).names)
        use = [c for c in cols if c in have]
        frames.append(pd.read_parquet(p, columns=use))
    df = pd.concat(frames, ignore_index=True)
    fd = df[(df["down"] == 4) & (~df["play_type"].isin(["no_play", "qb_kneel"]))].copy()
    fd = fd[fd["wp"].notna() & fd["wpa"].notna()].copy()

    def action_of(pt):
        if pt in ("pass", "run"):
            return "GO"
        if pt == "field_goal":
            return "FGA"
        if pt == "punt":
            return "PUNT"
        return None

    fd["action"] = fd["play_type"].map(action_of)
    fd = fd[fd["action"].notna()].copy()
    fd["value"] = (fd["wp"] + fd["wpa"]).clip(0, 1)  # realized post-play posteam WP
    fd["region"] = np.where(fd["yardline_100"] <= 50, "opp", "own")
    fd["wp_bin"] = pd.cut(fd["wp"], bins=WP_BINS, labels=WP_BIN_LABELS)
    fd["dist_band"] = pd.cut(fd["ydstogo"], bins=[0, 1, 3, 7, 99],
                             labels=["1", "2-3", "4-7", "8+"])
    fd["yard_band"] = pd.cut(fd["yardline_100"], bins=[0, 10, 20, 35, 50, 65, 80, 100],
                             labels=["1-10", "11-20", "21-35", "36-50", "51-65", "66-80", "81-99"])
    return fd.reset_index(drop=True)


def _quantile_optimal_action(cell_values, tau):
    """cell_values: dict action -> np.array of realized values. Returns argmax_a Q_tau."""
    best_a, best_q = None, -np.inf
    for a in ACTIONS:
        v = cell_values.get(a)
        if v is None or len(v) == 0:
            continue
        q = np.quantile(v, tau)
        if q > best_q:
            best_q, best_a = q, a
    return best_a


class TauFitter:
    """Fits tau-hat per (team, season, region, wp_bin) via the Hamming-loss
    inverse problem on empirical next-state value distributions."""

    def __init__(self, fd, tau_grid=None, min_cell_n=MIN_CELL_N, min_unit_n=MIN_UNIT_N):
        self.fd = fd
        self.tau_grid = TAU_GRID if tau_grid is None else np.asarray(tau_grid)
        self.min_cell_n = min_cell_n
        self.min_unit_n = min_unit_n
        self._action_values = self._build_action_value_tables()
        self._wpmax_table = self._build_wpmax_table()
        self.tau_table_ = None

    # ---- value-distribution tables (fine -> coarse -> league backoff) ----
    def _build_action_value_tables(self):
        fine = (
            self.fd.groupby(["region", "wp_bin", "dist_band", "yard_band", "action"],
                            observed=True)["value"]
            .apply(np.asarray)
        )
        coarse = (
            self.fd.groupby(["region", "wp_bin", "action"], observed=True)["value"]
            .apply(np.asarray)
        )
        league = self.fd.groupby(["action"])["value"].apply(np.asarray)
        return {"fine": fine, "coarse": coarse, "league": league}

    def _cell_values(self, row):
        key_fine = (row["region"], row["wp_bin"], row["dist_band"], row["yard_band"])
        out = {}
        for a in ACTIONS:
            v = None
            try:
                v = self._action_values["fine"].loc[key_fine + (a,)]
            except KeyError:
                pass
            if v is None or len(v) < self.min_cell_n:
                try:
                    v = self._action_values["coarse"].loc[(row["region"], row["wp_bin"], a)]
                except KeyError:
                    v = None
            if v is None or len(v) < self.min_cell_n:
                v = self._action_values["league"].loc[a]
            out[a] = np.asarray(v)
        return out

    def tau_optimal_action(self, row, tau):
        return _quantile_optimal_action(self._cell_values(row), tau)

    # ---- WP-max (risk-neutral) reference rule ----
    def _build_wpmax_table(self):
        tab = {}
        for (region, wpb, a), v in self._action_values["coarse"].items():
            tab.setdefault((region, wpb, a), float(np.mean(v)))
        return tab

    def wpmax_action(self, row):
        best_a, best_m = None, -np.inf
        for a in ACTIONS:
            m = self._wpmax_table.get((row["region"], row["wp_bin"], a))
            if m is None:
                m = float(np.mean(self._action_values["league"].loc[a]))
            if m > best_m:
                best_m, best_a = m, a
        return best_a

    # ---- inverse problem ----
    def fit_unit(self, unit_df):
        """unit_df: observed decisions of one (team, season, region, wp_bin).
        Returns dict(tau_hat, n, hamming_min, fallback)."""
        n = len(unit_df)
        if n < self.min_unit_n:
            return {"tau_hat": np.nan, "n": n, "hamming_min": np.nan, "fallback": True}
        losses = {}
        for tau in self.tau_grid:
            miss = 0
            for _, r in unit_df.iterrows():
                if self.tau_optimal_action(r, tau) != r["action"]:
                    miss += 1
            losses[tau] = miss / n
        best_loss = min(losses.values())
        cands = [t for t, l in losses.items() if l == best_loss]
        return {"tau_hat": float(np.median(cands)), "n": n,
                "hamming_min": best_loss, "fallback": False}

    def fit(self, seasons=None):
        df = self.fd if seasons is None else self.fd[self.fd["season"].isin(seasons)]
        rows = []
        for (team, season, region, wpb), g in df.groupby(
                ["posteam", "season", "region", "wp_bin"], observed=True):
            r = self.fit_unit(g)
            r.update({"team": team, "season": int(season), "region": region,
                      "wp_bin": str(wpb)})
            rows.append(r)
        tab = pd.DataFrame(rows)
        # fallback chain: unit -> team-season-region pooled -> region-wp league
        # -> region-only league -> global prior (0.5). Never serve NaN (CH-1).
        ok = tab[~tab["fallback"]]
        pooled = ok.groupby(["team", "season", "region"], observed=True)["tau_hat"].median()
        league = ok.groupby(["region", "wp_bin"], observed=True)["tau_hat"].median()
        league_r = ok.groupby(["region"], observed=True)["tau_hat"].median()
        prior = float(ok["tau_hat"].median()) if len(ok) else 0.5

        def resolve(r):
            if not r["fallback"]:
                return r["tau_hat"], "unit"
            v = pooled.get((r["team"], r["season"], r["region"]), np.nan)
            if not np.isnan(v):
                return float(v), "pooled"
            v = league.get((r["region"], r["wp_bin"]), np.nan)
            if not np.isnan(v):
                return float(v), "league"
            v = league_r.get(r["region"], np.nan)
            if not np.isnan(v):
                return float(v), "league_region"
            return prior, "prior"

        resolved = tab.apply(resolve, axis=1, result_type="expand")
        tab["tau_hat_served"] = resolved[0]
        tab["fallback_level"] = resolved[1]
        assert tab["tau_hat_served"].notna().all(), "fallback chain leaked NaN"
        self.tau_table_ = tab
        self._fallback_maps = {"pooled": pooled, "league": league,
                               "league_region": league_r, "prior": prior}
        return tab

    # ---- serving ----
    def serve(self, team, season, region, wp):
        """Return served tau-hat. Walks the fallback chain; never returns NaN."""
        assert self.tau_table_ is not None, "call fit() first"
        wpb = WP_BIN_LABELS[int(np.clip(np.digitize(wp, WP_BINS) - 1, 0, 4))]
        tab = self.tau_table_
        m = tab[(tab.team == team) & (tab.season == season)
                & (tab.region == region) & (tab.wp_bin == wpb)]
        if len(m):
            return float(m.iloc[0]["tau_hat_served"]), m.iloc[0]["fallback_level"]
        fm = self._fallback_maps
        v = fm["league"].get((region, wpb), np.nan)
        if not np.isnan(v):
            return float(v), "league"
        v = fm["league_region"].get(region, np.nan)
        if not np.isnan(v):
            return float(v), "league_region"
        return float(fm["prior"]), "prior"

    # ---- gate: tau-hat rule vs WP-max rule, opponent half ----
    def hamming_gate(self, eval_df):
        """Hamming accuracy of tau-rule vs wpmax-rule at predicting observed
        decisions, opponent half only. Returns dict with the >=3pp gate check."""
        assert self.tau_table_ is not None
        sub = eval_df[eval_df["region"] == "opp"].copy()
        if len(sub) == 0:
            return {"n": 0, "acc_tau": np.nan, "acc_wpmax": np.nan,
                    "delta_pp": np.nan, "pass": False}
        hit_tau = hit_max = 0
        for _, r in sub.iterrows():
            tau, _ = self.serve(r["posteam"], int(r["season"]), "opp", float(r["wp"]))
            if self.tau_optimal_action(r, tau) == r["action"]:
                hit_tau += 1
            if self.wpmax_action(r) == r["action"]:
                hit_max += 1
        acc_tau, acc_max = hit_tau / len(sub), hit_max / len(sub)
        delta = (acc_tau - acc_max) * 100
        return {"n": len(sub), "acc_tau": acc_tau, "acc_wpmax": acc_max,
                "delta_pp": delta, "pass": bool(delta >= 3.0)}
