"""
GOTS Shootout Detector & SciPy HiGHS GPP Game-Stack Optimizer
DraftKings NFL GPP Lineup Optimization with:
- Zero external solver dependencies (uses SciPy 1.9+ HiGHS MILP solver)
- Mandatory QB + Teammate Pass Catcher(s)
- Mandatory Opposing Team Runback (WR/TE/pass-catching RB)
- Anti-DST correlation exclusions
- Linearized pairwise correlation synergy bonuses
- Slate-level portfolio quotas enforcing minimum exposure to top SVI games
"""

from __future__ import annotations
import math
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds
from dataclasses import dataclass
from typing import List, Dict, Tuple, Set, Optional, Any

@dataclass(frozen=True)
class DfsPlayerEntry:
    id: str
    name: str
    pos: str       # QB, RB, WR, TE, DST
    team: str
    opp: str
    game_id: str
    salary: int
    proj: float
    ceiling: float
    own: float     # Ownership projected 0.0 to 1.0 (e.g. 0.15 = 15%)
    wopr: float = 0.0
    cfs: float = 0.0

@dataclass(frozen=True)
class GameEnvironment:
    game_id: str
    team_a: str
    team_b: str
    over_under: float
    spread: float
    is_dome: bool
    svi_score: float

class GPPGameStackOptimizer:
    """
    Exact Mixed-Integer Linear Programming (MILP) lineup optimizer for DraftKings GPP tournaments.
    Guarantees structural correlation and enforces exposure quotas to top SVI shootouts.
    """
    FLEX_POS = {"RB", "WR", "TE"}
    CAP = 50000

    def __init__(self, players: List[DfsPlayerEntry], games: List[GameEnvironment]):
        self.players = players
        self.games = games
        self.p_map = {p.id: p for p in players}

    @staticmethod
    def obj_value(p: DfsPlayerEntry) -> float:
        """
        GPP Tournament leverage objective:
        Rewards high right-tail ceiling while boosting leverage against field ownership.
        """
        leverage_weight = 6.0
        leverage_term = (p.ceiling / (p.own * 100.0 + 1.5)) * leverage_weight
        cfs_bonus = (p.cfs / 100.0) * 3.5 if p.pos in ["WR", "TE"] else 0.0
        return p.ceiling * 0.45 + leverage_term + cfs_bonus

    def solve_portfolio(self, n_lineups: int = 5,
                        top_gots_min_exposure: float = 0.60,
                        require_double_stack: bool = False,
                        prefer_wr_flex: bool = True,
                        max_salary: int = 50000,
                        min_salary: int = 48500,
                        lambda_corr: float = 0.30) -> List[Dict[str, Any]]:
        """
        Generates a diversified tournament portfolio enforcing:
        - 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST under salary cap.
        - Primary stack: QB + >=1 teammate pass-catcher (or >=2 if double stack).
        - Runback: QB + >=1 opposing skill player.
        - Anti-correlation: QB != Opp DST, QB != Own DST.
        - GOTS Quota: At least top_gots_min_exposure of lineups must stack Top-2 SVI games.
        - Lineup overlap constraint: Max 6 common players.
        - Ownership Tracking: Calculates cumulative ownership and product ownership.
        """
        sorted_games = sorted(self.games, key=lambda g: g.svi_score, reverse=True)
        top_2_game_ids = {sorted_games[0].game_id, sorted_games[1].game_id} if len(sorted_games) >= 2 else {sorted_games[0].game_id}

        n_p = len(self.players)
        p_indices = {p.id: i for i, p in enumerate(self.players)}

        # Identify synergy pairs (QB with teammates, QB with opposing runback)
        synergy_pairs = []
        for i, p1 in enumerate(self.players):
            if p1.pos == "QB":
                for j, p2 in enumerate(self.players):
                    if p1.game_id == p2.game_id and i != j:
                        if p2.team == p1.team and p2.pos in ["WR", "TE"]:
                            synergy_pairs.append((i, j, 4.0)) # Teammate synergy
                        elif p2.team == p1.opp and p2.pos in ["WR", "TE", "RB"]:
                            synergy_pairs.append((i, j, 3.0)) # Runback synergy

        n_syn = len(synergy_pairs)
        n_vars = n_p + n_syn

        portfolio: List[List[DfsPlayerEntry]] = []
        portfolio_details: List[Dict[str, Any]] = []
        stack_counts = {g.game_id: 0 for g in self.games}

        # Build base objective vector (SciPy minimizes c^T x, so c = -obj)
        c = np.zeros(n_vars)
        for i, p in enumerate(self.players):
            c[i] = -self.obj_value(p)
        for s_idx, (i, j, bonus) in enumerate(synergy_pairs):
            c[n_p + s_idx] = - (bonus * lambda_corr)

        min_pass_catchers = 2 if require_double_stack else 1

        for lu_idx in range(n_lineups):
            row_list = []
            lb_list = []
            ub_list = []

            # 1. Total players = 9
            row = np.zeros(n_vars); row[:n_p] = 1.0
            row_list.append(row); lb_list.append(9.0); ub_list.append(9.0)

            # 2. Total salary in [min_salary, max_salary]
            row = np.zeros(n_vars)
            for i, p in enumerate(self.players): row[i] = p.salary
            row_list.append(row); lb_list.append(float(min_salary)); ub_list.append(float(max_salary))

            # 3. Position counts
            # QB == 1
            row = np.zeros(n_vars)
            for i, p in enumerate(self.players):
                if p.pos == "QB": row[i] = 1.0
            row_list.append(row); lb_list.append(1.0); ub_list.append(1.0)

            # DST == 1
            row = np.zeros(n_vars)
            for i, p in enumerate(self.players):
                if p.pos == "DST": row[i] = 1.0
            row_list.append(row); lb_list.append(1.0); ub_list.append(1.0)

            # RB >= 2
            row = np.zeros(n_vars)
            for i, p in enumerate(self.players):
                if p.pos == "RB": row[i] = 1.0
            row_list.append(row); lb_list.append(2.0); ub_list.append(3.0)

            # WR >= 3
            row = np.zeros(n_vars)
            for i, p in enumerate(self.players):
                if p.pos == "WR": row[i] = 1.0
            row_list.append(row); lb_list.append(3.0); ub_list.append(4.0)

            # TE >= 1
            row = np.zeros(n_vars)
            for i, p in enumerate(self.players):
                if p.pos == "TE": row[i] = 1.0
            row_list.append(row); lb_list.append(1.0); ub_list.append(2.0)

            # FLEX (RB + WR + TE) == 7
            row = np.zeros(n_vars)
            for i, p in enumerate(self.players):
                if p.pos in self.FLEX_POS: row[i] = 1.0
            row_list.append(row); lb_list.append(7.0); ub_list.append(7.0)

            # 4. Stacking Constraints (QB + Teammates + Runback)
            for i, p in enumerate(self.players):
                if p.pos == "QB":
                    teammates = [j for j, t in enumerate(self.players) if t.team == p.team and t.pos in ["WR", "TE"]]
                    runbacks = [k for k, o in enumerate(self.players) if o.team == p.opp and o.pos in ["WR", "TE", "RB"]]
                    opp_dsts = [d for d, dst in enumerate(self.players) if dst.team == p.opp and dst.pos == "DST"]
                    own_dsts = [d for d, dst in enumerate(self.players) if dst.team == p.team and dst.pos == "DST"]

                    # min_pass_catchers * x_qb - sum(x_teammate) <= 0
                    if teammates:
                        row = np.zeros(n_vars)
                        row[i] = float(min_pass_catchers)
                        for tm in teammates: row[tm] = -1.0
                        row_list.append(row); lb_list.append(-np.inf); ub_list.append(0.0)

                    # 1 * x_qb - sum(x_runback) <= 0
                    if runbacks:
                        row = np.zeros(n_vars)
                        row[i] = 1.0
                        for rb in runbacks: row[rb] = -1.0
                        row_list.append(row); lb_list.append(-np.inf); ub_list.append(0.0)

                    # Anti-DST exclusions: x_qb + x_dst <= 1
                    for d in opp_dsts:
                        row = np.zeros(n_vars); row[i] = 1.0; row[d] = 1.0
                        row_list.append(row); lb_list.append(-np.inf); ub_list.append(1.0)
                    for d in own_dsts:
                        row = np.zeros(n_vars); row[i] = 1.0; row[d] = 1.0
                        row_list.append(row); lb_list.append(-np.inf); ub_list.append(1.0)

            # 5. Linearized Pairwise Synergy Constraints:
            # w_ij <= x_i  =>  w_ij - x_i <= 0
            # w_ij <= x_j  =>  w_ij - x_j <= 0
            # w_ij >= x_i + x_j - 1 => x_i + x_j - w_ij <= 1
            for s_idx, (i, j, _) in enumerate(synergy_pairs):
                w_var = n_p + s_idx
                # w - x_i <= 0
                r1 = np.zeros(n_vars); r1[w_var] = 1.0; r1[i] = -1.0
                row_list.append(r1); lb_list.append(-np.inf); ub_list.append(0.0)
                # w - x_j <= 0
                r2 = np.zeros(n_vars); r2[w_var] = 1.0; r2[j] = -1.0
                row_list.append(r2); lb_list.append(-np.inf); ub_list.append(0.0)
                # x_i + x_j - w <= 1
                r3 = np.zeros(n_vars); r3[i] = 1.0; r3[j] = 1.0; r3[w_var] = -1.0
                row_list.append(r3); lb_list.append(-np.inf); ub_list.append(1.0)

            # 6. SVI Portfolio Exposure Quota Enforcement
            remaining_slots = n_lineups - lu_idx
            current_top_count = sum(stack_counts[gid] for gid in top_2_game_ids)
            target_min_top = int(math.ceil(n_lineups * top_gots_min_exposure))

            if (target_min_top - current_top_count) >= remaining_slots:
                # Must stack a top-2 SVI game
                row = np.zeros(n_vars)
                for i, p in enumerate(self.players):
                    if p.pos == "QB" and p.game_id in top_2_game_ids:
                        row[i] = 1.0
                row_list.append(row); lb_list.append(1.0); ub_list.append(1.0)

            # 7. Diversity constraint: sum_{i in prev_lu} x_i <= 6
            for prev_lu in portfolio:
                row = np.zeros(n_vars)
                for p in prev_lu:
                    row[p_indices[p.id]] = 1.0
                row_list.append(row); lb_list.append(-np.inf); ub_list.append(6.0)

            A = np.array(row_list)
            constraints = LinearConstraint(A, lb_list, ub_list)
            integrality = np.ones(n_vars)
            bounds = Bounds(lb=np.zeros(n_vars), ub=np.ones(n_vars))

            res = milp(c=c, constraints=constraints, integrality=integrality, bounds=bounds)

            if res.success and res.status == 0:
                sol = np.round(res.x).astype(int)
                lineup = [self.players[i] for i in range(n_p) if sol[i] == 1]
                portfolio.append(lineup)

                qb = next(p for p in lineup if p.pos == "QB")
                stack_counts[qb.game_id] += 1

                teammates = [p for p in lineup if p.team == qb.team and p.pos in ["WR", "TE"]]
                runbacks = [p for p in lineup if p.team == qb.opp and p.pos in ["WR", "TE", "RB"]]
                total_sal = sum(p.salary for p in lineup)
                total_proj = sum(p.proj for p in lineup)
                total_ceil = sum(p.ceiling for p in lineup)
                cum_own = sum(p.own * 100.0 for p in lineup)
                prod_own = float(np.prod([max(0.01, p.own) for p in lineup]))

                portfolio_details.append({
                    "lineup_index": lu_idx + 1,
                    "salary": total_sal,
                    "salary_remaining": self.CAP - total_sal,
                    "projected_pts": round(total_proj, 1),
                    "ceiling_pts": round(total_ceil, 1),
                    "cumulative_ownership": round(cum_own, 1),
                    "product_ownership": f"{prod_own:.2e}",
                    "primary_qb": f"{qb.name} ({qb.team})",
                    "game_environment": qb.game_id,
                    "primary_stack": [f"{p.name} ({p.pos})" for p in teammates],
                    "opposing_runback": [f"{p.name} ({p.pos})" for p in runbacks],
                    "roster": [
                        {"pos": p.pos, "name": p.name, "team": p.team, "salary": p.salary, "proj": p.proj, "ceiling": p.ceiling, "own": f"{p.own*100:.1f}%"}
                        for p in lineup
                    ]
                })
            else:
                break

        if portfolio:
            sim_stats_list = self.simulate_lineups_correlated(portfolio, n_sims=10000)
            for idx, detail in enumerate(portfolio_details):
                detail["sim_stats"] = sim_stats_list[idx]
                detail["sim_p90"] = sim_stats_list[idx]["sim_p90"]
                detail["sim_p99"] = sim_stats_list[idx]["sim_p99"]
                detail["ceil_ev"] = sim_stats_list[idx]["ceil_ev"]
                detail["tourney_score"] = sim_stats_list[idx]["tourney_score"]
                detail["sims_run"] = 10000

        return portfolio_details

    @staticmethod
    def simulate_lineups_correlated(lineups: List[List[DfsPlayerEntry]], n_sims: int = 10000, seed: int = 42) -> List[Dict[str, Any]]:
        """
        Fast vectorized correlated Monte Carlo simulation:
        Runs 10,000 simulations per lineup under joint team, game total (SVI), and duress shocks.
        Computes mean, median (p50), 90th percentile (p90), 99th percentile (p99), ceilEV, and duplication risk.
        """
        rng = np.random.default_rng(seed)
        all_teams = list({p.team for lu in lineups for p in lu})
        all_games = list({p.game_id for lu in lineups for p in lu})

        team_idx = {t: i for i, t in enumerate(all_teams)}
        game_idx = {g: i for i, g in enumerate(all_games)}

        z_teams = rng.standard_normal((n_sims, len(all_teams)))
        z_games = rng.standard_normal((n_sims, len(all_games)))

        results = []
        for lu in lineups:
            lu_pts = np.zeros(n_sims)
            for p in lu:
                sd = max(1.0, (p.ceiling - p.proj) / 1.645)
                t_z = z_teams[:, team_idx[p.team]]
                g_z = z_games[:, game_idx[p.game_id]]
                idio_eps = rng.standard_normal(n_sims)

                if p.pos == "DST":
                    opp_z = z_teams[:, team_idx[p.opp]] if p.opp in team_idx else 0.0
                    pts = p.proj + sd * (-0.45 * opp_z - 0.30 * g_z + 0.84 * idio_eps)
                else:
                    team_load = 0.55 if p.pos == "QB" else (0.50 if p.pos == "WR" else (0.42 if p.pos == "TE" else 0.28))
                    game_load = 0.35 if p.pos in ["QB", "WR"] else (0.30 if p.pos == "TE" else 0.18)
                    idio_load = math.sqrt(max(0.01, 1.0 - team_load**2 - game_load**2))
                    pts = p.proj + sd * (team_load * t_z + game_load * g_z + idio_load * idio_eps)

                lu_pts += np.maximum(0.0, pts)

            sorted_pts = np.sort(lu_pts)
            mean_val = float(np.mean(sorted_pts))
            p50 = float(np.percentile(sorted_pts, 50))
            p90 = float(np.percentile(sorted_pts, 90))
            p99 = float(np.percentile(sorted_pts, 99))
            top_20_pct = sorted_pts[int(0.80 * n_sims):]
            ceil_ev = float(np.mean(top_20_pct))

            owns = [max(0.005, min(0.60, p.own)) for p in lu]
            geo_own = float(np.exp(np.mean(np.log(owns))))
            dup_risk = float(np.clip((geo_own - 0.02) / 0.23, 0.0, 1.0))

            cum_own = sum(p.own * 100.0 for p in lu)
            tourney_score = ceil_ev - 0.10 * cum_own - 6.0 * dup_risk

            results.append({
                "sim_mean": round(mean_val, 1),
                "sim_p50": round(p50, 1),
                "sim_p90": round(p90, 1),
                "sim_p99": round(p99, 1),
                "ceil_ev": round(ceil_ev, 1),
                "dup_risk": round(dup_risk, 2),
                "tourney_score": round(tourney_score, 1),
                "sims_run": n_sims,
            })
        return results
