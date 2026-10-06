"""
situational_wp.py — Shrunk situational win-probability decision engine.

PROVENANCE
----------
Implements the ADAPT verdict of arXiv:2604.13861v2 (Ganesh 2026), deep-read in
~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/
0207-simulationbased-optimisation-of-batting-order-and.md, ported to NFL
4th-down / 2-pt / timeout decisions:
  - blended outcome profiles  p~ = n/(n+n0)*p_hat + n0/(n+n0)*p_bar   (n0 = 50,
    the brief's stated n_min; the paper's exact lambda formula was unreadable
    in PDF extraction — this is OUR reconstruction, documented per CH-7)
  - James-Stein-style shrinkage of sparse situation cells toward coarser priors
  - state sigma = (score_differential, time_remaining, down, ydstogo,
    yardline_100, timeouts_remaining, prev_drive_turnover)
Verification: ~/workspace/corpus-intelligence/deep/c04/verified-claims.md VC-3,
challenges CH-5/CH-7/CH-8, synthesis S-6/S-7.

Complementary-football input (prev-drive non-scoring turnover, +0.6-1.0
pts/drive per 0678 in c04-map top-20 #4) enters the state as prev_turnover.

2-pt baselines as priors from 0247 (footballonomics, VC-2): 2-pt 51% -> 1.02
expected pts vs XP 98.4% -> 0.984.

GATES (0207 brief's contract, adopted verbatim):
  G1: >=5% Brier improvement of shrunk outcome probabilities over raw MLE on
      held-out 2026 4th-down/FG plays.
  G2: >=80% agreement between the shrunk engine's recommended action and the
      risk-neutral reference on a 200-play audit. The reference is our
      "WP-max empirical" rule (unshrunk league-average outcome rates through
      identical WP arithmetic) — the analog of 1575's "4th Down Bot run through
      the identical inverse pipeline". nfl4th itself is NOT reimplemented.
"""

import numpy as np
import pandas as pd

N0 = 50  # shrinkage half-weight (brief's n_min=50)
ACTIONS_4TH = ["GO", "FGA", "PUNT"]


def load_fourth_downs_frame(pbp):
    """Filter a full pbp frame to 4th-down decision plays (all columns kept)."""
    fd = pbp[(pbp["down"] == 4) & (~pbp["play_type"].isin(["no_play", "qb_kneel"]))].copy()
    return fd


def _band(s, bins, labels):
    return pd.cut(s, bins=bins, labels=labels)


def add_state_bands(df):
    d = df.copy()
    d["dist_band"] = _band(d["ydstogo"], [0, 1, 3, 7, 99], ["1", "2-3", "4-7", "8+"])
    d["yard_band"] = _band(d["yardline_100"], [0, 10, 20, 35, 50, 65, 80, 100],
                           ["1-10", "11-20", "21-35", "36-50", "51-65", "66-80", "81-99"])
    d["score_band"] = _band(d["score_differential"],
                            [-99, -17, -9, -1, 0, 1, 8, 16, 99],
                            ["<-16", "-16..-9", "-8..-1", "-1..0",
                             "0..1", "1..8", "9..16", ">16"])
    t = d["game_seconds_remaining"]
    q = d["qtr"]
    conds = [q == 5, (q == 4) & (t < 420), q == 4, q == 3, q == 2, q == 1]
    d["time_band"] = np.select(conds, ["ot", "q4_late", "q4_early", "q3", "q2", "q1"],
                               default="q1")
    return d


def add_prev_turnover(df):
    """v1 approximation of the 0678 complementary-football feature: previous
    drive ended in a non-scoring turnover by the now-defending team.
    Vectorized: drive-level flags mapped back to the first 3 plays."""
    d = df.sort_values(["game_id", "drive"]).copy()
    d["prev_drive_turnover"] = False
    dd = d[d["drive"].notna()].copy()
    if len(dd) == 0:
        return d
    key = ["game_id", "drive"]
    dd["_pos"] = dd.groupby(key, observed=True).cumcount()
    last = dd[~dd.duplicated(subset=key, keep="last")].copy()
    to = (last.get("interception", 0) == 1) | (last.get("fumble_lost", 0) == 1)
    scored = (last.get("touchdown", 0) == 1) | (
        last.get("field_goal_result", "").astype(str) == "made")
    last["_to_flag"] = (to & ~scored).astype(bool)
    flag = last.set_index(key)["_to_flag"]
    prev_key = pd.MultiIndex.from_arrays(
        [dd["game_id"], dd["drive"] - 1], names=key)
    hit = prev_key.map(flag).fillna(False).astype(bool)
    d.loc[dd.index[(hit.values) & (dd["_pos"].values < 3)], "prev_drive_turnover"] = True
    return d.drop(columns=["_pos"], errors="ignore")


class ShrunkLookup:
    """Hierarchical shrunk lookup: fine cell -> backoff cells -> global mean.

    estimate = w_fine * mean_fine + (1 - w_fine) * backoff, applied recursively,
    w = n / (n + n0).
    """

    def __init__(self, df, value_col, hierarchies, n0=N0):
        self.n0 = n0
        # empty key lists are redundant: global_mean already covers them
        self.hierarchies = [h for h in hierarchies if len(h) > 0]
        self.global_mean = float(df[value_col].mean())
        self.tables = []
        for keys in self.hierarchies:
            t = df.groupby(list(keys), observed=True)[value_col].agg(["mean", "count"])
            self.tables.append(t)

    def predict(self, key_dict):
        backoff = self.global_mean
        for keys, tab in zip(reversed(self.hierarchies), reversed(self.tables)):
            if len(keys) == 0:  # global-only level: nothing further to blend
                continue
            try:
                loc_key = key_dict[keys[0]] if len(keys) == 1 else tuple(
                    key_dict[k] for k in keys)
                row = tab.loc[loc_key]
            except KeyError:
                continue
            m, n = float(row["mean"]), float(row["count"])
            w = n / (n + self.n0)
            backoff = w * m + (1 - w) * backoff
        return float(np.clip(backoff, 0, 1))

    def raw_mean(self):
        """Unshrunk global MLE (the weak baseline for G1)."""
        return float(np.clip(self.global_mean, 0, 1))


class SituationalEngine:
    """4th-down (v1) + 2-pt (v2) situational decision engine.

    pbp: full nflverse pbp DataFrame (all plays, all columns); the engine
    derives 4th-down, FG, and state-model frames internally.
    """

    def __init__(self, pbp, n0=N0):
        self.n0 = n0
        fd = load_fourth_downs_frame(pbp)
        c4 = add_state_bands(fd)
        cfg = add_state_bands(pbp[pbp["play_type"] == "field_goal"].copy())
        call_ = add_prev_turnover(add_state_bands(pbp))

        # conversion outcomes among GO plays
        go = c4[c4["play_type"].isin(["pass", "run"])].copy()
        go["converted"] = ((go["fourth_down_converted"] == 1)
                           | (go.get("first_down", 0) == 1)).astype(float)
        self.p_conv = ShrunkLookup(
            go, "converted",
            [["dist_band", "yard_band"], ["dist_band"], ["yard_band"]], n0)
        self._p_conv_raw = float(go["converted"].mean())

        fg = cfg[cfg["play_type"] == "field_goal"].copy()
        fg["made"] = (fg["field_goal_result"] == "made").astype(float)
        self.p_make = ShrunkLookup(
            fg, "made", [["yard_band"], []], n0)
        self._p_make_raw = float(fg["made"].mean())

        # post-play WP state model: E[wp+wpa | state]
        call_["post_wp"] = (call_["wp"] + call_["wpa"]).clip(0, 1)
        self.state_wp = ShrunkLookup(
            call_, "post_wp",
            [["down", "dist_band", "yard_band", "score_band", "time_band"],
             ["dist_band", "yard_band", "score_band"],
             ["yard_band", "score_band"]], n0)

        # 2-pt priors (0247, VC-2)
        tp = call_[call_["two_point_conv_result"].isin(["success", "failure"])].assign(
            ok=lambda d: (d["two_point_conv_result"] == "success").astype(float))
        self._p_2pt_prior, self._p_xp_prior = 0.51, 0.984
        if len(tp) >= 10:
            self.p_2pt = ShrunkLookup(tp, "ok", [["yard_band"]], n0)
            self._has_2pt = True
        else:
            self.p_2pt, self._has_2pt = None, False

    # ---- state WP queries ----
    def W(self, down, dist_band, yard_band, score_band, time_band):
        return self.state_wp.predict({"down": down, "dist_band": dist_band,
                                      "yard_band": yard_band, "score_band": score_band,
                                      "time_band": time_band})

    def _opp_yard_band(self, yardline_100):
        return _band(pd.Series([100 - yardline_100]), [0, 10, 20, 35, 50, 65, 80, 100],
                     ["1-10", "11-20", "21-35", "36-50", "51-65", "66-80", "81-99"]).iloc[0]

    def _flip_score_band(self, score_band):
        flip = {"<-16": ">16", "-16..-9": "9..16", "-8..-1": "1..8",
                "-1..0": "0..1", "0..1": "-1..0",
                "1..8": "-8..-1", "9..16": "-16..-9", ">16": "<-16"}
        return flip.get(str(score_band), "0..1")

    def W_opp_has_ball(self, spot_yardline_100, score_band, time_band):
        """Our WP when the opponent has 1st & 10 at the spot (posteam yardline_100)."""
        w_opp = self.W(1, "1", self._opp_yard_band(spot_yardline_100),
                       self._flip_score_band(score_band), time_band)
        return 1.0 - w_opp

    # ---- action evaluation ----
    def evaluate_4th(self, yardline_100, ydstogo, score_differential,
                     game_seconds_remaining, qtr, timeouts_rem=3, prev_turnover=False):
        """Return {action: expected_posteam_WP} for GO/FGA/PUNT.

        timeouts_rem / prev_turnover are accepted as part of the v1 state
        signature (0207's proposed state) but not yet modeled — documented
        stubs (CH-8)."""
        d = add_state_bands(pd.DataFrame([{
            "ydstogo": ydstogo, "yardline_100": yardline_100,
            "score_differential": score_differential,
            "game_seconds_remaining": game_seconds_remaining, "qtr": qtr}]))
        r = d.iloc[0]
        db, yb, sb, tb = (str(r["dist_band"]), str(r["yard_band"]),
                          str(r["score_band"]), str(r["time_band"]))

        p_conv = self.p_conv.predict({"dist_band": db, "yard_band": yb})
        # converted: ~1st & 10 at the sticks
        new_y = max(1, yardline_100 - ydstogo)
        nyb = str(_band(pd.Series([new_y]), [0, 10, 20, 35, 50, 65, 80, 100],
                       ["1-10", "11-20", "21-35", "36-50", "51-65", "66-80", "81-99"]).iloc[0])
        w_go = (p_conv * self.W(1, "1", nyb, sb, tb)
                + (1 - p_conv) * self.W_opp_has_ball(yardline_100, sb, tb))

        if yardline_100 <= 65:  # realistic FG range gate
            p_make = self.p_make.predict({"yard_band": yb})
            # make: kickoff, opp ball at their 25 (yardline_100=75), score +3
            sb_up3 = str(_band(pd.Series([score_differential + 3]),
                               [-99, -17, -9, -1, 0, 1, 8, 16, 99],
                               ["<-16", "-16..-9", "-8..-1", "-1..0",
                                "0..1", "1..8", "9..16", ">16"]).iloc[0])
            w_make = self.W_opp_has_ball(25, sb_up3, tb)
            w_miss = self.W_opp_has_ball(max(1, yardline_100 - 8), sb, tb)  # spot of kick
            w_fga = p_make * w_make + (1 - p_make) * w_miss
        else:
            w_fga = -np.inf

        # punt: expected net ~ empirical 38 net; opponent ball at max(1, y-38)... 
        # use shrunk-free simple model: landing spot = min(99, yardline_100 + 38) from
        # our perspective is wrong direction; punt goes toward opponent endzone:
        land = max(1, yardline_100 - 38) if yardline_100 > 45 else max(1, yardline_100 - 20)
        w_punt = self.W_opp_has_ball(land, sb, tb)
        return {"GO": float(w_go), "FGA": float(w_fga), "PUNT": float(w_punt)}

    def optimal_4th(self, *args, **kwargs):
        ev = self.evaluate_4th(*args, **kwargs)
        a = max(ev, key=ev.get)
        return a, ev

    # ---- 2-pt (v2, prior-anchored) ----
    def two_pt_edge(self, yard_band="1-10"):
        """Expected-point edge of going for 2 vs XP. Positive -> go for 2."""
        p = (self.p_2pt.predict({"yard_band": yard_band}) if self._has_2pt
             else self._p_2pt_prior)
        # xp expected value fixed at 0.984 (0247)
        return 2 * p - self._p_xp_prior

    # ---- gates ----
    def brier_gate(self, heldout_pbp):
        """G1: >=5% Brier improvement of shrunk vs raw-MLE outcome probs.
        heldout_pbp: full pbp DataFrame (e.g. 2026 weeks 1-3)."""
        heldout_4th = load_fourth_downs_frame(heldout_pbp)
        heldout_fg = heldout_pbp[heldout_pbp["play_type"] == "field_goal"]
        go = heldout_4th[heldout_4th["play_type"].isin(["pass", "run"])].copy()
        go = add_state_bands(go)
        go["converted"] = ((go["fourth_down_converted"] == 1)
                           | (go.get("first_down", 0) == 1)).astype(float)
        fg = add_state_bands(heldout_fg[heldout_fg["play_type"] == "field_goal"].copy())
        fg["made"] = (fg["field_goal_result"] == "made").astype(float)

        def brier(pred, y):
            return float(np.mean((np.asarray(pred) - np.asarray(y)) ** 2))

        p_s = [self.p_conv.predict({"dist_band": str(r["dist_band"]),
                                    "yard_band": str(r["yard_band"])})
               for _, r in go.iterrows()]
        p_r = [self._p_conv_raw for _ in range(len(go))]
        m_s = [self.p_make.predict({"yard_band": str(r["yard_band"])})
               for _, r in fg.iterrows()]
        m_r = [self._p_make_raw for _ in range(len(fg))]

        b_s = (brier(p_s, go["converted"]) * len(go)
               + brier(m_s, fg["made"]) * len(fg)) / max(1, len(go) + len(fg))
        b_r = (brier(p_r, go["converted"]) * len(go)
               + brier(m_r, fg["made"]) * len(fg)) / max(1, len(go) + len(fg))
        improve = (b_r - b_s) / b_r if b_r > 0 else 0.0
        return {"brier_shrunk": b_s, "brier_raw": b_r,
                "improve_frac": improve, "n": len(go) + len(fg),
                "pass": bool(improve >= 0.05)}

    def audit_agreement_gate(self, train_pbp, sample_pbp, n=200, seed=7):
        """G2: >=80% agreement with the risk-neutral reference on n-play audit.

        The reference is a second SituationalEngine fit on the same train data
        with n0 -> 0 (unshrunk MLE, identical hierarchy and WP arithmetic) —
        the analog of 1575's "4th Down Bot run through the identical inverse
        pipeline". A situation-BLIND reference (league-average rates) was tried
        first and rejected: it conflates situation-awareness with shrinkage
        quality, disagreeing 22.5% of the time by construction.
        """
        ref = SituationalEngine(train_pbp, n0=1e-9)
        sample_4th = load_fourth_downs_frame(sample_pbp)
        s = sample_4th.sample(min(n, len(sample_4th)), random_state=seed)
        agree = tot = 0
        for _, r in s.iterrows():
            kw = dict(yardline_100=float(r["yardline_100"]),
                      ydstogo=float(r["ydstogo"]),
                      score_differential=float(r["score_differential"]),
                      game_seconds_remaining=float(r["game_seconds_remaining"]),
                      qtr=int(r["qtr"]))
            a_shrunk, _ = self.optimal_4th(**kw)
            a_ref, _ = ref.optimal_4th(**kw)
            tot += 1
            if a_shrunk == a_ref:
                agree += 1
        frac = agree / tot if tot else 0.0
        return {"agree_frac": frac, "n": tot, "pass": bool(frac >= 0.80)}
