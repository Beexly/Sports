# Player-aware (QB-decomposed) team utilities — INFERENCE extension.
#
# Provenance: SYS-01 extension (buildable-systems.md), ledger-proposed
# INFERENCE from the 0213 improvement experiment
# (arxiv-deep/0213-recent-advances-in-the-bradleyterry-model.md §14):
# decompose u_i = tau_team + q_QB(i) so a QB change (injury, trade, benching)
# moves the team's rating WITHOUT refitting the model.
# Marked INFERENCE wherever surfaced: the decomposition is the ledger's
# proposal, not a paper-reported result.
#
# Data basis: SYNTHETIC DGP (ratings/_dgp.py) — the DGP's true team strength
# is tau_team + q_QB, so the decomposition matches the generative truth.

import numpy as np

from ._dgp import N_TEAMS, gen_season
from .plusdc import _sigmoid


class QBDecomposedRating:
    """Team rating with player-aware utilities.

    Fit once: tau (team base, 32) and q (QB effect per QB id) via ridge
    regression on game outcomes with team and QB dummies. After fitting,
    set_qb(team, qb_id) moves that team's rating by exactly
    q_new - q_old — no refit.
    """

    def __init__(self, lam=5.0):
        self.lam = lam
        self.tau = np.zeros(N_TEAMS)
        self.q = {}
        self.current_qb = {}

    def fit(self, games):
        fg = [g for g in games if not g["tie"]]
        qb_ids = sorted({g["qb_home"] for g in fg} | {g["qb_away"] for g in fg})
        qi = {q: k for k, q in enumerate(qb_ids)}
        nq = len(qb_ids)
        n = len(fg)
        # design: [team_home - team_away (32)] + [qb_home - qb_away (nq)]
        X = np.zeros((n, N_TEAMS + nq))
        y = np.zeros(n)
        for k, g in enumerate(fg):
            X[k, g["home"]] = 1.0
            X[k, g["away"]] = -1.0
            X[k, N_TEAMS + qi[g["qb_home"]]] = 1.0
            X[k, N_TEAMS + qi[g["qb_away"]]] = -1.0
            y[k] = 1.0 if g["home_win"] else 0.0
        # ridge logistic regression via Newton (same discipline as
        # fit_plusdc: objective must increase every step)
        lam = self.lam
        beta = np.zeros(N_TEAMS + nq)
        for _ in range(60):
            s = _sigmoid(X @ beta)
            grad = X.T @ (y - s) - lam * beta
            if float(np.max(np.abs(grad))) < 1e-10:
                break
            w = s * (1 - s)
            H = -((X.T * w) @ X) - lam * np.eye(N_TEAMS + nq)
            step = np.linalg.solve(H, grad)
            beta = beta - step  # full Newton step (concave objective)
        self.tau = beta[:N_TEAMS] - beta[:N_TEAMS].mean()
        qraw = beta[N_TEAMS:]
        qraw = qraw - qraw.mean()
        self.q = {qb: float(qraw[qi[qb]]) for qb in qb_ids}
        # current QB = most recent starter seen per team
        for g in fg:
            self.current_qb[g["home"]] = g["qb_home"]
            self.current_qb[g["away"]] = g["qb_away"]
        return self

    def team_rating(self, team):
        qb = self.current_qb.get(team)
        return float(self.tau[team] + self.q.get(qb, 0.0))

    def set_qb(self, team, qb_id):
        """Change the QB assignment WITHOUT refitting. The team's rating
        moves by exactly q_new - q_old."""
        old = self.team_rating(team)
        self.current_qb[team] = qb_id
        if qb_id not in self.q:
            self.q[qb_id] = 0.0  # unseen QB: league-average effect
        return old, self.team_rating(team)


def qb_change_moves_rating_without_refit():
    """0213 extension gate (INFERENCE): verify on synthetic data that a QB
    change moves the team rating with no refit.

    Returns True iff the rating moves by exactly the QB-effect difference
    and no fitting occurs between the two reads.
    """
    games = gen_season(2023)
    model = QBDecomposedRating().fit(games)
    team = 0
    old_qb = model.current_qb[team]
    # pick a different QB id with a different fitted effect
    alt_qb = next(q for q in model.q if q != old_qb)
    before = model.team_rating(team)
    old_r, new_r = model.set_qb(team, alt_qb)
    moved = bool(abs((new_r - old_r) - (model.q[alt_qb] - model.q[old_qb])) < 1e-12)
    return bool(moved and old_r == before and new_r != old_r)
