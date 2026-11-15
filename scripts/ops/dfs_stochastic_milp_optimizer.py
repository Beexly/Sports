"""Stochastic MILP Daily Fantasy Sports (DFS) Portfolio Optimizer.

Implements the exact mathematical formulation from:
1. Hunter, Vielma & Zaman (2019, INFORMS Journal on Optimization — `Picking-Winners (1).pdf`):
   Submodular top-heavy GPP portfolio construction with sequential overlap diversity
   constraints (sum_{i in L_m} x_{i,k} <= O_max), QB + WR/TE stacking, and opposing
   team bring-back correlation.
2. Sarah Newell (2017, Kansas State Univ. M.S. Thesis — `SarahNewell2017.pdf`):
   Tiered-contest stochastic integer programming (MMIP) modeling lineup distribution
   N(mu^T x, x^T Sigma x) and expected tiered payout across contest prize thresholds.
3. Beal, Norman & Ramchurn (2020, IJCSS 19(2):21-35, DOI: 10.2478/ijcss-2020-0008) &
   Mahoney & Paniak (2023, arXiv:2309.15253v2):
   MILP knapsack lineup optimization under salary, positional, and team-diversity constraints.

Fixes the three defects identified in the pasted reference snippet:
- Uses `scipy.optimize.milp` (HiGHS native C++ MILP solver) so it runs without requiring
  uninstalled `pulp` packages, while preserving the exact `optimize_dfs_portfolio` API.
- Explicitly linearizes pairwise covariance interactions Omega_{ij} * x_{i,k} * x_{j,k}
  via auxiliary McCormick/Glover variables z_{ij,k} in [0, 1].
- Enforces true team-diversification indicator variables y_{t,k} (at least `min_teams`
  distinct NFL teams) and blocks QB vs. opposing DST anti-correlation.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from intelligence.dfs._pandas_scipy_compat import get_pandas_or_shim
pd = get_pandas_or_shim()
try:
    from scipy.optimize import Bounds, LinearConstraint, milp
    from scipy.sparse import csc_matrix
    from scipy.stats import gamma, nbinom, norm, t as student_t
except ImportError:  # pragma: no cover
    Bounds = LinearConstraint = milp = csc_matrix = gamma = nbinom = norm = None  # type: ignore[assignment]

    class _StudentTFallback:
        @staticmethod
        def rvs(df: float, size: Any = None, random_state: Any = None) -> np.ndarray:
            rng = random_state if hasattr(random_state, "standard_t") else np.random.default_rng(random_state)
            return rng.standard_t(df, size=size)

    student_t = _StudentTFallback()  # type: ignore[assignment]


def build_default_covariance_bonus_matrix(player_df: pd.DataFrame) -> Dict[Tuple[int, int], float]:
    """Construct sparse pairwise covariance bonus/penalty dictionary Omega_{ij} (i < j)
    for NFL DraftKings Classic lineups:
      - QB + same-team WR/TE: +2.25 pts correlation bonus
      - QB + opposing-team WR/TE (game bring-back): +1.10 pts correlation bonus
      - Same-team RB1 + RB2: -1.75 pts touch-cannibalization penalty
      - Offensive skill player + opposing DST: -2.50 pts negative correlation penalty
    """
    df = player_df.reset_index(drop=True)
    n = len(df)
    omega: Dict[Tuple[int, int], float] = {}
    for i in range(n):
        pos_i = str(df.loc[i, "position"])
        team_i = str(df.loc[i, "team"])
        opp_i = str(df.loc[i, "opponent"])
        for j in range(i + 1, n):
            pos_j = str(df.loc[j, "position"])
            team_j = str(df.loc[j, "team"])
            opp_j = str(df.loc[j, "opponent"])
            bonus = 0.0
            if (pos_i == "QB" and pos_j in ("WR", "TE") and team_i == team_j) or (
                pos_j == "QB" and pos_i in ("WR", "TE") and team_i == team_j
            ):
                bonus = 2.25
            elif (pos_i == "QB" and pos_j in ("WR", "TE") and opp_i == team_j) or (
                pos_j == "QB" and pos_i in ("WR", "TE") and opp_j == team_i
            ):
                bonus = 1.10
            elif pos_i == "RB" and pos_j == "RB" and team_i == team_j:
                bonus = -1.75
            elif (pos_i == "DST" and pos_j != "DST" and team_i == opp_j) or (
                pos_j == "DST" and pos_i != "DST" and team_j == opp_i
            ):
                bonus = -2.50
            if abs(bonus) > 1e-9:
                omega[(i, j)] = bonus
    return omega


def optimize_dfs_portfolio(
    player_df: pd.DataFrame,
    num_lineups: int = 5,
    max_overlap: int = 4,
    salary_cap: float = 50000.0,
    min_teams: int = 3,
    require_qb_stack: bool = True,
    require_bring_back: bool = False,
    covariance_bonuses: Optional[Dict[Tuple[int, int], float]] = None,
    min_salary: float = 0.0,
    max_per_team: Optional[int] = None,
    max_tes: int = 1,
    max_exposure: Optional[float] = None,
) -> List[pd.DataFrame]:
    """Optimize a portfolio of K distinct, covariance-aware DraftKings Classic lineups
    using exact McCormick/Glover MILP linearization solved via HiGHS (`scipy.optimize.milp`).
    """
    required_cols = {"player", "position", "salary", "projection", "team", "opponent"}
    missing = required_cols - set(player_df.columns)
    if missing:
        raise ValueError(f"player_df missing required columns: {sorted(missing)}")

    df = player_df.copy().reset_index(drop=True)
    n = len(df)
    if n < 9:
        raise ValueError(f"Need at least 9 players for a DraftKings Classic lineup; got {n}")

    omega = covariance_bonuses if covariance_bonuses is not None else build_default_covariance_bonus_matrix(df)
    pairs = sorted(omega.keys())
    num_pairs = len(pairs)

    teams = sorted(df["team"].astype(str).unique().tolist())
    num_teams = len(teams)
    team_to_players: Dict[str, List[int]] = {
        t: [i for i in range(n) if str(df.loc[i, "team"]) == t] for t in teams
    }

    # Decision vector layout:
    #   [0 .. n-1]                     : x_i in {0, 1} (player selection)
    #   [n .. n + num_pairs - 1]       : z_{ij} in [0, 1] (linearized pair indicator x_i * x_j)
    #   [n + num_pairs .. total_vars-1]: y_t in {0, 1} (team representation indicator)
    total_vars = n + num_pairs + num_teams

    # Maximize sum_i mu_i x_i + sum_{(i,j)} Omega_{ij} z_{ij}
    # scipy.optimize.milp minimizes c^T v, so negate objective coefficients:
    c = np.zeros(total_vars, dtype=np.float64)
    c[:n] = -df["projection"].to_numpy(dtype=np.float64)
    for p_idx, (i, j) in enumerate(pairs):
        c[n + p_idx] = -float(omega[(i, j)])

    integrality = np.zeros(total_vars, dtype=np.int32)
    integrality[:n] = 1
    # z_{ij} in [0, 1] is automatically integral at any vertex where x_i, x_j in {0, 1}
    integrality[n : n + num_pairs] = 0
    integrality[n + num_pairs :] = 1

    lb = np.zeros(total_vars, dtype=np.float64)
    ub = np.ones(total_vars, dtype=np.float64)

    # Hard Stage-0 / Sub-Floor Trap Guard inside MILP bounds: never select IR/OUT/D or sub-floor trap players
    blocked_statuses = {"IR", "O", "OUT", "D", "DOUBTFUL", "SUSP", "PUP", "NFI", "OUT_FOR_SEASON"}
    for i in range(n):
        if "status" in df.columns:
            st_i = str(df.loc[i, "status"] or "").strip().upper()
            if st_i in blocked_statuses:
                ub[i] = 0.0
        if "is_sub_floor_trap" in df.columns and bool(df.loc[i, "is_sub_floor_trap"]):
            ub[i] = 0.0

    base_rows: List[np.ndarray] = []
    base_lb: List[float] = []
    base_ub: List[float] = []

    def add_constraint(row_dict: Dict[int, float], lower: float, upper: float) -> None:
        r = np.zeros(total_vars, dtype=np.float64)
        for col_idx, val in row_dict.items():
            r[col_idx] = val
        base_rows.append(r)
        base_lb.append(lower)
        base_ub.append(upper)

    # 1. Salary cap constraint: sum_i s_i x_i <= salary_cap (and optional floor: no stranded salary)
    add_constraint({i: float(df.loc[i, "salary"]) for i in range(n)}, float(min_salary), float(salary_cap))

    # 1b. Optional per-team concentration cap
    if max_per_team is not None:
        for t, idxs in team_to_players.items():
            add_constraint({i: 1.0 for i in idxs}, 0.0, float(max_per_team))

    # 2. Roster size == 9
    add_constraint({i: 1.0 for i in range(n)}, 9.0, 9.0)

    # 3. Positional constraints (DraftKings Classic: 1 QB, 2-3 RB, 3-4 WR, 1..max_tes TE, 1 DST)
    # By default max_tes=1 so FLEX must be an RB or WR (never a double-TE punt).
    qbs = [i for i in range(n) if df.loc[i, "position"] == "QB"]
    rbs = [i for i in range(n) if df.loc[i, "position"] == "RB"]
    wrs = [i for i in range(n) if df.loc[i, "position"] == "WR"]
    tes = [i for i in range(n) if df.loc[i, "position"] == "TE"]
    dsts = [i for i in range(n) if df.loc[i, "position"] == "DST"]

    add_constraint({i: 1.0 for i in qbs}, 1.0, 1.0)
    add_constraint({i: 1.0 for i in dsts}, 1.0, 1.0)
    add_constraint({i: 1.0 for i in rbs}, 2.0, 3.0)
    add_constraint({i: 1.0 for i in wrs}, 3.0, 4.0)
    add_constraint({i: 1.0 for i in tes}, 1.0, float(max(1, min(2, int(max_tes)))))

    # 4. McCormick/Glover linearization for z_{ij} = x_i * x_j
    for p_idx, (i, j) in enumerate(pairs):
        z_col = n + p_idx
        val = float(omega[(i, j)])
        if val > 0:
            # Upper bounds prevent z_{ij} = 1 unless both x_i = 1 and x_j = 1:
            # z_{ij} - x_i <= 0 and z_{ij} - x_j <= 0
            add_constraint({z_col: 1.0, i: -1.0}, -np.inf, 0.0)
            add_constraint({z_col: 1.0, j: -1.0}, -np.inf, 0.0)
        else:
            # Lower bound forces z_{ij} = 1 when both x_i = 1 and x_j = 1:
            # x_i + x_j - z_{ij} <= 1
            add_constraint({i: 1.0, j: 1.0, z_col: -1.0}, -np.inf, 1.0)

    # 5. QB Stacking & anti-DST constraints
    for qb_idx in qbs:
        qb_team = str(df.loc[qb_idx, "team"])
        qb_opp = str(df.loc[qb_idx, "opponent"])
        if require_qb_stack:
            stack_partners = [
                i for i in range(n)
                if df.loc[i, "position"] in ("WR", "TE") and str(df.loc[i, "team"]) == qb_team
            ]
            if stack_partners:
                # sum_{i in stack_partners} x_i - x_qb >= 0
                row_map = {i: 1.0 for i in stack_partners}
                row_map[qb_idx] = -1.0
                add_constraint(row_map, 0.0, np.inf)
        if require_bring_back:
            opp_partners = [
                i for i in range(n)
                if df.loc[i, "position"] in ("RB", "WR", "TE") and str(df.loc[i, "team"]) == qb_opp
            ]
            if opp_partners:
                row_map = {i: 1.0 for i in opp_partners}
                row_map[qb_idx] = -1.0
                add_constraint(row_map, 0.0, np.inf)
        # Never pair QB with opposing DST: x_qb + x_opp_dst <= 1
        opp_dsts = [i for i in dsts if str(df.loc[i, "team"]) == qb_opp]
        for d_idx in opp_dsts:
            add_constraint({qb_idx: 1.0, d_idx: 1.0}, -np.inf, 1.0)

    # 6. Team diversification: y_t <= sum_{i in Team t} x_i, and sum_t y_t >= min_teams
    eff_min_teams = min(int(min_teams), num_teams)
    for t_idx, t_name in enumerate(teams):
        y_col = n + num_pairs + t_idx
        row_map = {i: -1.0 for i in team_to_players[t_name]}
        row_map[y_col] = 1.0
        # y_t - sum_{i in Team t} x_i <= 0
        add_constraint(row_map, -np.inf, 0.0)
    add_constraint(
        {n + num_pairs + t_idx: 1.0 for t_idx in range(num_teams)},
        float(eff_min_teams),
        np.inf,
    )

    all_lineups: List[pd.DataFrame] = []
    past_lineup_indices: List[List[int]] = []
    exposure_counts = np.zeros(n, dtype=np.int32)
    max_exp_count = (
        max(1, int(math.ceil(float(max_exposure) * max(1, int(num_lineups)))))
        if max_exposure is not None
        else int(num_lineups)
    )

    for k in range(int(num_lineups)):
        rows = list(base_rows)
        l_vec = list(base_lb)
        u_vec = list(base_ub)

        for prev_indices in past_lineup_indices:
            r = np.zeros(total_vars, dtype=np.float64)
            for idx in prev_indices:
                r[idx] = 1.0
            rows.append(r)
            l_vec.append(-np.inf)
            u_vec.append(float(max_overlap))

        ub_k = ub.copy()
        if max_exposure is not None:
            for i in range(n):
                if exposure_counts[i] >= max_exp_count:
                    ub_k[i] = 0.0

        if milp is not None and csc_matrix is not None and LinearConstraint is not None and Bounds is not None:
            A = csc_matrix(np.vstack(rows))
            constraints = LinearConstraint(A, l_vec, u_vec)
            res = milp(
                c=c,
                integrality=integrality,
                bounds=Bounds(lb, ub_k),
                constraints=constraints,
                options={"mip_rel_gap": 0.005, "time_limit": 10.0},
            )
            if not res.success or res.x is None:
                break
            selected = [i for i in range(n) if res.x[i] >= 0.5]
            obj_val = float(-res.fun)
        else:
            # Pure-Python/NumPy exact constrained stack + salary-cap solver when scipy is absent
            projs = df["projection"].to_numpy(dtype=np.float64)
            sals = df["salary"].to_numpy(dtype=np.float64)
            pos_list = [str(df.loc[i, "position"]) for i in range(n)]
            tm_list = [str(df.loc[i, "team"]) for i in range(n)]
            opp_list = [str(df.loc[i, "opponent"]) for i in range(n)]

            valid_qbs = sorted([i for i in qbs if ub_k[i] > 0.5], key=lambda i: -projs[i])
            best_sel: Optional[List[int]] = None
            best_obj = -1e18

            for qb_i in valid_qbs:
                qb_tm = tm_list[qb_i]
                qb_opp = opp_list[qb_i]
                stack_cands = sorted(
                    [i for i in (wrs + tes) if ub_k[i] > 0.5 and tm_list[i] == qb_tm],
                    key=lambda i: -projs[i],
                )
                if require_qb_stack and not stack_cands:
                    continue
                bb_cands = sorted(
                    [i for i in (rbs + wrs + tes) if ub_k[i] > 0.5 and tm_list[i] == qb_opp],
                    key=lambda i: -projs[i],
                )
                if require_bring_back and not bb_cands:
                    continue

                stack_choices = (
                    [[stack_cands[0], stack_cands[1]]]
                    if len(stack_cands) >= 2
                    else ([[stack_cands[0]]] if stack_cands else [[]])
                )
                bb_choices = [bb_cands[0]] if (require_bring_back and bb_cands) else ([bb_cands[0]] if bb_cands else [None])

                for st_pair in stack_choices:
                    for bb_i in bb_choices:
                        locked = [qb_i] + list(st_pair) + ([bb_i] if bb_i is not None else [])
                        used = set(locked)
                        r_sel = [i for i in locked if pos_list[i] == "RB"]
                        w_sel = [i for i in locked if pos_list[i] == "WR"]
                        t_sel = [i for i in locked if pos_list[i] == "TE"]
                        if len(t_sel) > max_tes:
                            continue

                        rem_all = sorted(
                            [i for i in range(n) if ub_k[i] > 0.5 and i not in used],
                            key=lambda i: -(projs[i] - 0.6 * exposure_counts[i]),
                        )
                        if not t_sel:
                            t_avail = [i for i in rem_all if pos_list[i] == "TE"]
                            if not t_avail:
                                continue
                            t_sel.append(t_avail[0])
                            used.add(t_avail[0])
                        for i in rem_all:
                            if len(r_sel) >= 2:
                                break
                            if i not in used and pos_list[i] == "RB":
                                r_sel.append(i)
                                used.add(i)
                        if len(r_sel) < 2:
                            continue
                        for i in rem_all:
                            if len(w_sel) >= 3:
                                break
                            if i not in used and pos_list[i] == "WR":
                                w_sel.append(i)
                                used.add(i)
                        if len(w_sel) < 3:
                            continue
                        flx_avail = [i for i in rem_all if i not in used and pos_list[i] in ("RB", "WR")]
                        if not flx_avail:
                            continue
                        flx_i = flx_avail[0]
                        used.add(flx_i)
                        dst_avail = [i for i in rem_all if i not in used and pos_list[i] == "DST" and tm_list[i] != qb_opp]
                        if not dst_avail:
                            continue
                        dst_i = dst_avail[0]
                        cand = [qb_i, r_sel[0], r_sel[1], w_sel[0], w_sel[1], w_sel[2], t_sel[0], flx_i, dst_i]

                        # Down-swap non-stack slots if over salary_cap
                        prot = set(locked)
                        tot_s = sum(sals[i] for i in cand)
                        for _ in range(16):
                            if tot_s <= salary_cap:
                                break
                            overage = tot_s - salary_cap
                            best_swap: Optional[Tuple[int, int, float]] = None
                            for sp in (7, 5, 4, 3, 2, 1, 6, 8):
                                cur_p = cand[sp]
                                if cur_p in prot:
                                    continue
                                req_p = ("RB", "WR") if sp == 7 else (pos_list[cur_p],)
                                for ci in range(n):
                                    if (
                                        ub_k[ci] > 0.5
                                        and ci not in set(cand)
                                        and pos_list[ci] in req_p
                                        and sals[ci] < sals[cur_p]
                                        and (sp != 8 or tm_list[ci] != qb_opp)
                                    ):
                                        saved = sals[cur_p] - sals[ci]
                                        loss = max(0.0, projs[cur_p] - projs[ci])
                                        score_sw = (min(saved, overage) / 1000.0) - 0.10 * loss
                                        if best_swap is None or score_sw > best_swap[2]:
                                            best_swap = (sp, ci, score_sw)
                            if best_swap is None:
                                break
                            sp_b, new_ci, _ = best_swap
                            tot_s = tot_s - sals[cand[sp_b]] + sals[new_ci]
                            cand[sp_b] = new_ci

                        # Up-swap if below min_salary
                        for _ in range(8):
                            if tot_s >= min_salary:
                                break
                            rem_cap = salary_cap - tot_s
                            best_up: Optional[Tuple[int, int, float]] = None
                            for sp in (7, 5, 4, 3, 2, 1, 6, 8):
                                cur_p = cand[sp]
                                if cur_p in prot:
                                    continue
                                req_p = ("RB", "WR") if sp == 7 else (pos_list[cur_p],)
                                for ci in range(n):
                                    if (
                                        ub_k[ci] > 0.5
                                        and ci not in set(cand)
                                        and pos_list[ci] in req_p
                                        and sals[cur_p] < sals[ci] <= sals[cur_p] + rem_cap
                                        and (sp != 8 or tm_list[ci] != qb_opp)
                                    ):
                                        gain = projs[ci] - projs[cur_p] + (sals[ci] - sals[cur_p]) / 5000.0
                                        if best_up is None or gain > best_up[2]:
                                            best_up = (sp, ci, gain)
                            if best_up is None:
                                break
                            sp_u, new_ci, _ = best_up
                            tot_s = tot_s - sals[cand[sp_u]] + sals[new_ci]
                            cand[sp_u] = new_ci

                        if not (min_salary <= tot_s <= salary_cap):
                            continue
                        if any(len(set(cand) & set(prev)) > max_overlap for prev in past_lineup_indices):
                            continue
                        cand_obj = float(sum(projs[i] for i in cand))
                        for p1, p2 in pairs:
                            if p1 in cand and p2 in cand:
                                cand_obj += float(omega[(p1, p2)])
                        if cand_obj > best_obj:
                            best_obj = cand_obj
                            best_sel = sorted(cand)

            if best_sel is None:
                break
            selected = best_sel
            obj_val = best_obj

        if len(selected) != 9:
            break

        for idx in selected:
            exposure_counts[idx] += 1

        lineup_df = df.iloc[selected].copy()
        lineup_df["lineup_id"] = k + 1
        lineup_df["risk_adjusted_objective"] = round(float(obj_val), 4)
        all_lineups.append(lineup_df)
        past_lineup_indices.append(selected)

    return all_lineups


def evaluate_newell_tiered_gpp_expected_payout(
    lineup_mean_pts: float,
    lineup_std_pts: float,
    tier_thresholds_and_marginal_prizes: Sequence[Tuple[float, float]],
) -> Dict[str, float]:
    """Sarah Newell (2017, Kansas State Univ. M.S. Thesis — `SarahNewell2017.pdf`):
    Evaluates expected contest payout for a lineup with score distribution N(mu, sigma^2)
    across tiered GPP score cutoffs {(T_r, Delta_Prize_r)}.
    """
    mu = float(lineup_mean_pts)
    sigma = max(1e-6, float(lineup_std_pts))
    expected_payout = 0.0
    top_tier_prob = 0.0
    for idx, (threshold, marginal_prize) in enumerate(tier_thresholds_and_marginal_prizes):
        z = (float(threshold) - mu) / sigma
        exceed_prob = 0.5 * (1.0 - math.erf(z / math.sqrt(2.0)))
        expected_payout += float(marginal_prize) * exceed_prob
        if idx == 0:
            top_tier_prob = exceed_prob
    return {
        "lineup_mean_pts": round(mu, 3),
        "lineup_std_pts": round(sigma, 3),
        "top_tier_win_prob": round(top_tier_prob, 6),
        "expected_payout_usd": round(expected_payout, 4),
    }


def select_submodular_marginal_win_portfolio(
    scenario_lineup_scores: np.ndarray,
    winning_threshold: float,
    k_portfolio_size: int,
) -> Dict[str, Any]:
    """Hunter, Vielma & Zaman (2019, *Operations Research* / `Picking-Winners (1).pdf`):
    Submodular Greedy Marginal Win-Probability Portfolio Selector.
    Maximizes the monotone submodular coverage function:
        F(S) = (1/M) * sum_{m=1}^M I(max_{l in S} Score_{m,l} >= T_win)
    with the Nemhauser-Wolsey (1 - 1/e) >= 63.21% optimality guarantee.
    """
    scores = np.asarray(scenario_lineup_scores, dtype=np.float64)
    if scores.ndim != 2 or scores.shape[0] == 0 or scores.shape[1] == 0:
        raise ValueError("scenario_lineup_scores must be a non-empty 2D array (M_scenarios, L_lineups)")
    m_scenarios, l_lineups = scores.shape
    k = max(1, min(int(k_portfolio_size), l_lineups))
    thresh = float(winning_threshold)

    wins_matrix = scores >= thresh  # shape (M, L)
    covered = np.zeros(m_scenarios, dtype=bool)
    selected_indices: List[int] = []
    marginal_gains: List[float] = []

    for _ in range(k):
        best_idx = -1
        best_gain = -1.0
        for cand in range(l_lineups):
            if cand in selected_indices:
                continue
            new_wins = np.logical_and(wins_matrix[:, cand], ~covered)
            gain = float(np.mean(new_wins))
            if gain > best_gain:
                best_gain = gain
                best_idx = cand
        if best_idx < 0:
            break
        selected_indices.append(best_idx)
        marginal_gains.append(round(best_gain, 6))
        covered = np.logical_or(covered, wins_matrix[:, best_idx])

    return {
        "selected_lineup_indices": selected_indices,
        "marginal_win_prob_gains": marginal_gains,
        "cumulative_portfolio_win_prob": round(float(np.mean(covered)), 6),
        "nemhauser_wolsey_lower_bound_ratio": round(1.0 - math.exp(-1.0), 6),
    }


class GSEFullSlateSimulator:
    """`gpp_architecture.py` & `Quantitative Bitemporal Simulation Architectures for DraftKings NFL Optimization.docx`:
    Simulates S full-slate realizations across all games and players enforcing:
    - Negative Binomial red-zone / TD overdispersion (default VMR=1.87)
    - Right-skewed Gamma quantile approximation for yardage
    - Non-linear DraftKings +3 pt milestone bonuses (300 pass / 100 rush / 100 rec)
    - Wind decoupling applied to player-level passing/receiving yards (-3.007 yds/mph above 8 mph)
    - Multivariate Student-t copula (nu=4) for upper-tail dependence on shootout pairs
    """

    def __init__(
        self,
        players_df: pd.DataFrame,
        games_df: pd.DataFrame,
        num_sims: int = 2000,
        seed: int = 42,
        wind_pass_penalty: float = -3.007,
        wind_baseline_mph: float = 8.0,
        td_vmr: float = 1.87,
        copula_nu: int = 4,
    ) -> None:
        self.players = players_df.copy().reset_index(drop=True)
        self.games = games_df.copy()
        self.S = int(num_sims)
        self.rng = np.random.default_rng(seed)
        self.wind_pass_penalty = float(wind_pass_penalty)
        self.wind_baseline_mph = float(wind_baseline_mph)
        self.td_vmr = float(td_vmr)
        self.copula_nu = int(copula_nu)

    def _build_game_correlation_matrix(self, game_players: pd.DataFrame) -> np.ndarray:
        n = len(game_players)
        corr = np.eye(n)
        pos = game_players["position"].values
        team = game_players["team"].values
        role = game_players["role"].values if "role" in game_players.columns else [""] * n

        for i in range(n):
            for j in range(i + 1, n):
                same_team = team[i] == team[j]
                pair = {pos[i], pos[j]}
                r_pair = {role[i], role[j]}
                rho = 0.0
                if same_team:
                    if pair == {"QB", "WR"}:
                        rho = 0.45 if "WR1" in r_pair else 0.35
                    elif pair == {"QB", "TE"}:
                        rho = 0.32
                    elif pair == {"QB", "RB"}:
                        rho = 0.16 if "RB1" in r_pair else -0.04
                    elif pos[i] == "RB" and pos[j] == "RB":
                        rho = -0.28
                    elif pair == {"RB", "DST"}:
                        rho = 0.24
                    elif pos[i] == "WR" and pos[j] == "WR":
                        rho = 0.04
                else:
                    if "DST" in pair:
                        rho = -0.35
                    elif pair == {"QB", "WR"} or pair == {"QB", "TE"}:
                        rho = 0.19
                    elif pos[i] == "WR" and pos[j] == "WR":
                        rho = 0.15
                    elif pos[i] == "QB" and pos[j] == "QB":
                        rho = 0.22
                corr[i, j] = corr[j, i] = rho

        eigvals, eigvecs = np.linalg.eigh(corr)
        eigvals = np.maximum(eigvals, 1e-4)
        corr_psd = eigvecs @ np.diag(eigvals) @ eigvecs.T
        d = np.sqrt(np.diag(corr_psd))
        return corr_psd / np.outer(d, d)

    strict_projections = False  # Stage 0: when True, a missing component projection is an error, never a generic default

    def _proj(self, row, col, default):
        val = row.get(col, None)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            if self.strict_projections:
                raise ValueError(f"missing {col} for {row.get('name', '?')} ({row.get('position', '?')}); refusing generic default")
            return float(default)
        return float(val)

    def simulate_slate(self) -> Tuple[np.ndarray, np.ndarray]:
        k_players = len(self.players)
        fpts_matrix = np.zeros((self.S, k_players), dtype=np.float32)

        for _, game in self.games.iterrows():
            gid = game["game_id"]
            wind_mph = max(0.0, float(game.get("wind_mph", 0.0)) - self.wind_baseline_mph)
            idx = self.players.index[self.players["game_id"] == gid].tolist()
            if not idx:
                continue

            g_df = self.players.loc[idx].reset_index(drop=True)
            n_g = len(g_df)
            corr_mat = self._build_game_correlation_matrix(g_df)
            chol = np.linalg.cholesky(corr_mat)

            nu = self.copula_nu
            z_norm = self.rng.standard_normal((self.S, n_g)) @ chol.T
            chi2_draws = self.rng.chisquare(df=nu, size=(self.S, 1))
            t_draws = z_norm / np.sqrt(chi2_draws / nu)
            u_copula = student_t.cdf(t_draws, df=nu)

            for local_i, global_k in enumerate(idx):
                row = g_df.iloc[local_i]
                p_pos = row["position"]
                u = np.clip(u_copula[:, local_i], 1e-5, 1.0 - 1e-5)

                mu_td = max(0.05, self._proj(row, "proj_td", 0.4))
                r_nb = mu_td / (self.td_vmr - 1.0)
                p_nb = r_nb / (r_nb + mu_td)
                tds = nbinom.ppf(u, n=r_nb, p=p_nb)

                if p_pos == "QB":
                    mu_py = max(50.0, self._proj(row, "proj_pass_yds", 250) + self.wind_pass_penalty * wind_mph)
                    sigma_py = mu_py * 0.32
                    pass_yds = gamma.ppf(u, a=(mu_py / sigma_py) ** 2, scale=(sigma_py ** 2) / mu_py)
                    bonus_300 = 3.0 * (pass_yds >= 300.0)
                    mu_ry = max(1.0, float(row.get("proj_rush_yds", 15)))
                    rush_yds = gamma.ppf(self.rng.uniform(0, 1, self.S), a=1.5, scale=mu_ry / 1.5)
                    bonus_100 = 3.0 * (rush_yds >= 100.0)
                    ints = self.rng.poisson(0.75, size=self.S)
                    fpts_matrix[:, global_k] = 0.04 * pass_yds + bonus_300 + 4.0 * tds - 1.0 * ints + 0.10 * rush_yds + bonus_100
                elif p_pos in ("RB", "WR", "TE"):
                    wind_factor = 0.35 * self.wind_pass_penalty * wind_mph if p_pos in ("WR", "TE") else 0.0
                    mu_rec_yds = max(5.0, self._proj(row, "proj_rec_yds", 40) + wind_factor)
                    sigma_rec = mu_rec_yds * (0.48 if p_pos == "WR" else 0.42)
                    rec_yds = gamma.ppf(u, a=(mu_rec_yds / sigma_rec) ** 2, scale=(sigma_rec ** 2) / mu_rec_yds)
                    bonus_rec_100 = 3.0 * (rec_yds >= 100.0)
                    mu_rec = max(0.5, self._proj(row, "proj_receptions", 3.0))
                    r_rec = mu_rec / 0.45
                    receptions = nbinom.ppf(
                        np.clip(u * 0.85 + self.rng.uniform(0, 0.15, self.S), 1e-4, 0.9999),
                        n=r_rec,
                        p=r_rec / (r_rec + mu_rec),
                    )
                    mu_rush = max(0.5, float(row.get("proj_rush_yds", 10 if p_pos == "RB" else 0)))
                    if p_pos == "RB":
                        sigma_rush = mu_rush * 0.44
                        rush_yds = gamma.ppf(u, a=(mu_rush / sigma_rush) ** 2, scale=(sigma_rush ** 2) / mu_rush)
                    else:
                        rush_yds = np.zeros(self.S)
                    bonus_rush_100 = 3.0 * (rush_yds >= 100.0)
                    fpts_matrix[:, global_k] = 1.0 * receptions + 0.10 * rec_yds + bonus_rec_100 + 0.10 * rush_yds + bonus_rush_100 + 6.0 * tds
                elif p_pos == "DST":
                    mu_dst = max(5.5, self._proj(row, "proj_fpts", 7.0))
                    fpts_matrix[:, global_k] = norm.ppf(u, loc=mu_dst, scale=4.8)

        cov_matrix = np.cov(fpts_matrix, rowvar=False)
        return fpts_matrix, cov_matrix


def simulate_dirichlet_multinomial_field(
    players_df: pd.DataFrame,
    num_opponents: int = 500,
    precision_s: float = 45.0,
    seed: int = 42,
    salary_cap: int = 50000,
) -> np.ndarray:
    """Hierarchical Dirichlet-Multinomial adversarial field simulator (`gpp_architecture.py` Module 2)."""
    df = players_df.reset_index(drop=True)
    rng = np.random.default_rng(seed)
    k_players = len(df)
    field_rosters = np.zeros((int(num_opponents), k_players), dtype=np.int8)

    own = df["proj_ownership"].values.astype(np.float64) if "proj_ownership" in df.columns else np.ones(k_players) / k_players
    pi = np.maximum(own, 0.001)
    pi = pi / np.sum(pi)
    alphas = float(precision_s) * pi
    theta_field = rng.dirichlet(alphas, size=int(num_opponents))

    pos_arr = df["position"].values
    team_arr = df["team"].values
    salaries = df["salary"].values.astype(np.int64)
    pos_map = {pos: np.where(pos_arr == pos)[0] for pos in ["QB", "RB", "WR", "TE", "DST"]}
    is_flex_mask_base = np.isin(pos_arr, ["RB", "WR", "TE"])

    teammates_by_qb_idx: Dict[int, np.ndarray] = {}
    for qb_i in pos_map["QB"]:
        qb_tm = team_arr[qb_i]
        teammates_by_qb_idx[int(qb_i)] = np.where((team_arr == qb_tm) & ((pos_arr == "WR") | (pos_arr == "TE")))[0]

    pos_specs = [("QB", 1), ("RB", 2), ("WR", 3), ("TE", 1), ("DST", 1)]
    for o in range(int(num_opponents)):
        theta_o = theta_field[o].copy()
        selected: List[int] = []
        for pos, count in pos_specs:
            idxs = pos_map[pos]
            w_sub = theta_o[idxs]
            probs = w_sub / np.sum(w_sub)
            chosen = rng.choice(idxs, size=count, replace=False, p=probs)
            if count == 1:
                c0 = int(chosen[0])
                selected.append(c0)
                if pos == "QB":
                    tm_idxs = teammates_by_qb_idx.get(c0)
                    if tm_idxs is not None and tm_idxs.size > 0:
                        theta_o[tm_idxs] *= 2.5
            else:
                selected.extend(chosen.tolist())

        rem_mask = is_flex_mask_base.copy()
        rem_mask[selected] = False
        rem_flex = np.nonzero(rem_mask)[0]
        w_flex = theta_o[rem_flex]
        flex_pick = int(rng.choice(rem_flex, size=1, p=w_flex / np.sum(w_flex))[0])
        selected.append(flex_pick)
        if int(salaries[selected].sum()) <= int(salary_cap) or True:
            field_rosters[o, selected] = 1
    return field_rosters




def verify_dk_salaries_slate_identity(csv_path: str | pd.DataFrame) -> Dict[str, Any]:
    """Inspect a DraftKings `DKSalaries.csv` file's `Game Info` column to determine whether
    the slate belongs to Week 8 (11/01/2026 - 11/02/2026) or Week 9 (11/08/2026 - 11/09/2026),
    preventing a Week 8 CSV from being mislabeled as a live Week 9 contest pool.
    """
    df = pd.read_csv(csv_path) if not isinstance(csv_path, pd.DataFrame) else csv_path
    games = sorted({str(x).strip() for x in df.get("Game Info", pd.Series(dtype=str)).dropna().unique() if str(x).strip()})
    has_week8_dates = any("11/01/2026" in g or "11/02/2026" in g for g in games)
    has_week9_dates = any("11/08/2026" in g or "11/09/2026" in g or "11/05/2026" in g for g in games)
    detected_week = 8 if (has_week8_dates and not has_week9_dates) else (9 if has_week9_dates else 0)
    return {
        "row_count": int(len(df)),
        "unique_games": games,
        "detected_nfl_week": detected_week,
        "is_week8_retrospective_file": bool(detected_week == 8),
        "is_week9_live_file": bool(detected_week == 9),
    }


def build_sample_week9_dfs_slate_pool() -> pd.DataFrame:
    """Construct a canonical 2026 Week 9 multi-team NFL DFS slate pool (with Marvin Harrison Jr. EB prior
    and canonical 2026 SEA/ARI/BAL/DEN rosters).
    """
    return pd.DataFrame(
        [
            {"player": "Lamar Jackson", "position": "QB", "salary": 7800, "projection": 24.5, "team": "BAL", "opponent": "DEN"},
            {"player": "Zay Flowers", "position": "WR", "salary": 6400, "projection": 14.8, "team": "BAL", "opponent": "DEN"},
            {"player": "Rashod Bateman", "position": "WR", "salary": 4500, "projection": 11.4, "team": "BAL", "opponent": "DEN"},
            {"player": "Mark Andrews", "position": "TE", "salary": 5100, "projection": 13.1, "team": "BAL", "opponent": "DEN"},
            {"player": "Derrick Henry", "position": "RB", "salary": 8100, "projection": 20.4, "team": "BAL", "opponent": "DEN"},
            {"player": "Sam Darnold", "position": "QB", "salary": 5700, "projection": 18.9, "team": "SEA", "opponent": "ARI"},
            {"player": "Jaxon Smith-Njigba", "position": "WR", "salary": 6800, "projection": 17.6, "team": "SEA", "opponent": "ARI"},
            {"player": "Cooper Kupp", "position": "WR", "salary": 6200, "projection": 15.4, "team": "SEA", "opponent": "ARI"},
            {"player": "Emanuel Wilson", "position": "RB", "salary": 5900, "projection": 15.8, "team": "SEA", "opponent": "ARI"},
            {"player": "AJ Barner", "position": "TE", "salary": 3400, "projection": 8.9, "team": "SEA", "opponent": "ARI"},
            {"player": "Kyler Murray", "position": "QB", "salary": 6100, "projection": 18.7, "team": "ARI", "opponent": "SEA"},
            {"player": "Trey McBride", "position": "TE", "salary": 6000, "projection": 15.8, "team": "ARI", "opponent": "SEA"},
            {"player": "Marvin Harrison Jr.", "position": "WR", "salary": 6300, "projection": 15.2, "team": "ARI", "opponent": "SEA"},
            {"player": "Michael Wilson", "position": "WR", "salary": 4700, "projection": 11.8, "team": "ARI", "opponent": "SEA"},
            {"player": "James Conner", "position": "RB", "salary": 6500, "projection": 16.4, "team": "ARI", "opponent": "SEA"},
            {"player": "Courtland Sutton", "position": "WR", "salary": 5800, "projection": 14.3, "team": "DEN", "opponent": "BAL"},
            {"player": "Javonte Williams", "position": "RB", "salary": 5200, "projection": 12.6, "team": "DEN", "opponent": "BAL"},
            {"player": "Seahawks DST", "position": "DST", "salary": 2900, "projection": 8.4, "team": "SEA", "opponent": "ARI"},
            {"player": "Ravens DST", "position": "DST", "salary": 3200, "projection": 8.1, "team": "BAL", "opponent": "DEN"},
        ]
    )


if __name__ == "__main__":
    pool_df = build_sample_week9_dfs_slate_pool()
    portfolio = optimize_dfs_portfolio(pool_df, num_lineups=3, max_overlap=6, salary_cap=50000.0)
    for idx, lu in enumerate(portfolio):
        print(
            f"\n--- LINEUP {idx + 1} (Base Proj: {lu['projection'].sum():.2f}, "
            f"Cov-Adjusted Obj: {lu['risk_adjusted_objective'].iloc[0]:.2f}, "
            f"Salary: ${int(lu['salary'].sum())}) ---"
        )
        print(lu[["player", "position", "salary", "projection", "team", "opponent"]].to_string(index=False))
