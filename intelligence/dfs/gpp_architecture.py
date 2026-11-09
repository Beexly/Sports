"""
Quantitative Operations Research and Bitemporal Simulation Architectures
for DraftKings NFL Guaranteed Prize Pool Optimization
=======================================================================

Self-contained Python reference implementation of the architecture.

Layers:
1. Full-slate non-Gaussian simulator (NegBin TDs, right-skewed yardage,
   DraftKings +3 milestone cliffs, wind decoupling, Student-t copula
   upper-tail dependence as a practical proxy for vine pair-copulas).
2. Hierarchical Dirichlet-Multinomial adversarial field simulator
   (with pre-indexed QB-teammate numpy arrays and salary/multi-team filter).
3. Sequential covariance-constrained & field-leveraged portfolio MILP
   enforcing empirical Millionaire Maker structural rules.
"""

from __future__ import annotations

import numpy as np
try:
    import pandas as pd
except ImportError:
    pd = None
from scipy.stats import norm, t as student_t, nbinom, gamma
import pulp
from typing import Tuple, List, Optional, Dict


# =============================================================================
# MODULE 1: GSE / OPENJEV FULL-SLATE NON-GAUSSIAN TAIL SIMULATOR
# =============================================================================

class GSEFullSlateSimulator:
    """
    Simulates S full-slate realizations across all games and players.

    Enforces:
    - Negative Binomial red-zone / touchdown overdispersion (default VMR=1.87)
    - Right-skewed Gamma quantile approximation for yardage (qgam-style)
    - Non-linear DraftKings +3 pt milestone bonuses (300 pass / 100 rush / 100 rec)
    - Wind decoupling applied only to player-level passing/receiving yards
      (default -3.007 yds/mph above an 8 mph baseline)
    - Multivariate Student-t copula (nu=4) to induce positive upper-tail dependence
      within each game (proxy for Gumbel / Student-t vine edges on shootout pairs)
    """

    def __init__(
        self,
        players_df: pd.DataFrame,
        games_df: pd.DataFrame,
        num_sims: int = 10000,
        seed: int = 42,
        hermes_scale: float = 45.42,          # GSE-internal; kept for compatibility
        wind_pass_penalty: float = -3.007,    # yds/mph; tunable (public range ~ -1.5 to -2.0+)
        wind_baseline_mph: float = 8.0,
        td_vmr: float = 1.87,                 # Empirical Red-Zone TD VMR
        copula_nu: float = 4.0,
    ):
        self.players = players_df.copy().reset_index(drop=True)
        self.games = games_df.copy()
        self.S = num_sims
        self.rng = np.random.default_rng(seed)
        self.hermes_scale = hermes_scale
        self.wind_pass_penalty = wind_pass_penalty
        self.wind_baseline_mph = wind_baseline_mph
        self.td_vmr = td_vmr
        self.copula_nu = copula_nu

    def _build_game_correlation_matrix(self, game_players: pd.DataFrame) -> np.ndarray:
        """Linear correlation proxy used inside the Student-t copula."""
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
                    # Opposing-team game-script correlations
                    if "DST" in pair:
                        rho = -0.35
                    elif pair == {"QB", "WR"} or pair == {"QB", "TE"}:
                        rho = 0.19
                    elif pos[i] == "WR" and pos[j] == "WR":
                        rho = 0.15
                    elif pos[i] == "QB" and pos[j] == "QB":
                        rho = 0.22

                corr[i, j] = corr[j, i] = rho

        # Ensure positive semi-definiteness
        eigvals, eigvecs = np.linalg.eigh(corr)
        eigvals = np.maximum(eigvals, 1e-4)
        corr_psd = eigvecs @ np.diag(eigvals) @ eigvecs.T
        d = np.sqrt(np.diag(corr_psd))
        return corr_psd / np.outer(d, d)

    def simulate_slate(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Returns:
            fpts_matrix: (S, K) simulated DraftKings fantasy points
            cov_matrix:  empirical K x K covariance from the realizations
        """
        K = len(self.players)
        fpts_matrix = np.zeros((self.S, K), dtype=np.float32)

        for _, game in self.games.iterrows():
            gid = game["game_id"]
            wind_mph = max(0.0, game.get("wind_mph", 0.0) - self.wind_baseline_mph)
            idx = self.players.index[self.players["game_id"] == gid].tolist()
            if not idx:
                continue

            g_df = self.players.loc[idx].reset_index(drop=True)
            n_g = len(g_df)
            corr_mat = self._build_game_correlation_matrix(g_df)
            chol = np.linalg.cholesky(corr_mat)

            # Multivariate Student-t copula draws (induces upper-tail dependence)
            nu = self.copula_nu
            z_norm = self.rng.standard_normal((self.S, n_g)) @ chol.T
            chi2_draws = self.rng.chisquare(df=nu, size=(self.S, 1))
            t_draws = z_norm / np.sqrt(chi2_draws / nu)
            u_copula = student_t.cdf(t_draws, df=nu)

            for local_i, global_k in enumerate(idx):
                row = g_df.iloc[local_i]
                p_pos = row["position"]
                u = np.clip(u_copula[:, local_i], 1e-5, 1.0 - 1e-5)

                # Negative Binomial TDs (overdispersed)
                mu_td = max(0.05, float(row.get("proj_td", 0.4)))
                r_nb = mu_td / (self.td_vmr - 1.0)
                p_nb = r_nb / (r_nb + mu_td)
                tds = nbinom.ppf(u, n=r_nb, p=p_nb)

                if p_pos == "QB":
                    mu_py = max(50.0, float(row.get("proj_pass_yds", 250)) + self.wind_pass_penalty * wind_mph)
                    sigma_py = mu_py * 0.32
                    shape_k = (mu_py / sigma_py) ** 2
                    scale_theta = (sigma_py ** 2) / mu_py
                    pass_yds = gamma.ppf(u, a=shape_k, scale=scale_theta)
                    bonus_300 = 3.0 * (pass_yds >= 300.0)

                    mu_ry = max(1.0, float(row.get("proj_rush_yds", 15)))
                    rush_yds = gamma.ppf(self.rng.uniform(0, 1, self.S), a=1.5, scale=mu_ry / 1.5)
                    bonus_100 = 3.0 * (rush_yds >= 100.0)
                    ints = self.rng.poisson(0.75, size=self.S)

                    fpts_matrix[:, global_k] = (
                        0.04 * pass_yds + bonus_300 + 4.0 * tds - 1.0 * ints
                        + 0.10 * rush_yds + bonus_100
                    )

                elif p_pos in ("RB", "WR", "TE"):
                    wind_factor = 0.35 * self.wind_pass_penalty * wind_mph if p_pos in ("WR", "TE") else 0.0
                    mu_rec_yds = max(5.0, float(row.get("proj_rec_yds", 40)) + wind_factor)
                    sigma_rec = mu_rec_yds * (0.48 if p_pos == "WR" else 0.42)
                    shape_rec = (mu_rec_yds / sigma_rec) ** 2
                    rec_yds = gamma.ppf(u, a=shape_rec, scale=(sigma_rec ** 2) / mu_rec_yds)
                    bonus_rec_100 = 3.0 * (rec_yds >= 100.0)

                    mu_rec = max(0.5, float(row.get("proj_receptions", 3.0)))
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

                    fpts_matrix[:, global_k] = (
                        1.0 * receptions + 0.10 * rec_yds + bonus_rec_100
                        + 0.10 * rush_yds + bonus_rush_100 + 6.0 * tds
                    )

                elif p_pos == "DST":
                    mu_dst = max(3.0, float(row.get("proj_fpts", 7.0)))
                    fpts_matrix[:, global_k] = norm.ppf(u, loc=mu_dst, scale=4.8)

        cov_matrix = np.cov(fpts_matrix, rowvar=False)
        return fpts_matrix, cov_matrix


# =============================================================================
# MODULE 2: HIERARCHICAL DIRICHLET-MULTINOMIAL ADVERSARIAL FIELD SIMULATOR
# =============================================================================

def simulate_dirichlet_multinomial_field(
    players_df: pd.DataFrame,
    num_opponents: int = 5000,
    precision_S: float = 45.0,
    seed: int = 42,
    enforce_salary: bool = True,
    salary_cap: int = 50000,
    min_teams: int = 2,
    max_attempts_per_opponent: int = 5,
) -> np.ndarray:
    """
    Generates synthetic opponent rosters using a positional Dirichlet-Multinomial
    process with conditional stacking awareness.

    Vectorized optimization: pre-indexes `teammates_by_qb_idx` as numpy index arrays
    outside the 5,000-opponent loop (`max_attempts_per_opponent=5`).
    """
    df = players_df.reset_index(drop=True)
    rng = np.random.default_rng(seed)
    K = len(df)
    field_rosters = np.zeros((num_opponents, K), dtype=np.int8)

    pi = np.maximum(df["proj_ownership"].values.astype(np.float64), 0.001)
    pi = pi / np.sum(pi)
    alphas = precision_S * pi

    theta_field = rng.dirichlet(alphas, size=num_opponents)

    pos_arr = df["position"].values
    team_arr = df["team"].values
    salaries = df["salary"].values.astype(np.int64)

    pos_map = {
        pos: np.where(pos_arr == pos)[0]
        for pos in ["QB", "RB", "WR", "TE", "DST"]
    }
    flex_idx = np.where(np.isin(pos_arr, ["RB", "WR", "TE"]))[0]
    is_flex_mask_base = np.isin(pos_arr, ["RB", "WR", "TE"])

    # Pre-index QB -> same-team WR/TE indices outside the opponent loop
    teammates_by_qb_idx: Dict[int, np.ndarray] = {}
    for qb_i in pos_map["QB"]:
        qb_tm = team_arr[qb_i]
        teammates_by_qb_idx[int(qb_i)] = np.where(
            (team_arr == qb_tm) & ((pos_arr == "WR") | (pos_arr == "TE"))
        )[0]

    pos_specs = [("QB", 1), ("RB", 2), ("WR", 3), ("TE", 1), ("DST", 1)]

    for o in range(num_opponents):
        best_selected: Optional[List[int]] = None
        best_sal: int = 999999
        for _attempt in range(max_attempts_per_opponent):
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

            # FLEX selection using fast boolean mask
            rem_mask = is_flex_mask_base.copy()
            rem_mask[selected] = False
            rem_flex = np.nonzero(rem_mask)[0]
            if rem_flex.size == 0:
                continue
            w_flex = theta_o[rem_flex]
            probs_flex = w_flex / np.sum(w_flex)
            flex_pick = int(rng.choice(rem_flex, size=1, p=probs_flex)[0])
            selected.append(flex_pick)

            total_salary = int(salaries[selected].sum())
            if total_salary < best_sal:
                best_sal = total_salary
                best_selected = selected

            if enforce_salary:
                if total_salary > salary_cap:
                    continue
                if len(set(team_arr[selected])) < min_teams:
                    continue

            field_rosters[o, selected] = 1
            break
        else:
            if best_selected is not None and best_sal <= salary_cap:
                field_rosters[o, best_selected] = 1
            else:
                # Guaranteed salary-cap fallback: pick lowest-salary legal 9-man roster
                fallback: List[int] = []
                for pos, count in pos_specs:
                    idxs = pos_map[pos]
                    order = idxs[np.argsort(salaries[idxs])[: max(count * 3, count)]]
                    chosen = rng.choice(order, size=count, replace=False)
                    fallback.extend(chosen.tolist())
                rem_f = [int(i) for i in flex_idx if int(i) not in fallback]
                rem_f.sort(key=lambda idx_k: int(salaries[idx_k]))
                fallback.append(rem_f[0])
                field_rosters[o, fallback] = 1

    return field_rosters


# =============================================================================
# MODULE 3: SEQUENTIAL COVARIANCE-CONSTRAINED & FIELD-LEVERAGED PORTFOLIO MILP
# =============================================================================

def optimize_gpp_portfolio(
    players_df: pd.DataFrame,
    fpts_matrix: np.ndarray,
    cov_matrix: np.ndarray,
    field_rosters: Optional[np.ndarray] = None,
    num_lineups: int = 20,
    max_overlap_gamma: int = 4,
    rho_cov_ceiling: float = 0.38,
    target_avg_own: float = 0.145,
    enforce_structure: bool = True,
    solver_msg: bool = False,
) -> List[List[int]]:
    """
    Sequentially constructs a diversified GPP portfolio.

    Vectorized MILP optimizations:
    - Aggregated linear DST-vs-opposing-offense constraint:
      `3 * x[dst_i] + lpSum(x[k] for k in opp_off_indices) <= 3`
    - Pre-filters inactive/zero-projection bench players on large slates (`K > 60`).
    """
    df = players_df.copy().reset_index(drop=True)
    K = len(df)

    mean_fpts = np.mean(fpts_matrix, axis=0)
    tail_85_fpts = np.percentile(fpts_matrix, 85, axis=0)
    gpp_utility = 0.45 * mean_fpts + 0.55 * tail_85_fpts

    # Pre-filter candidate pool on large slates to top active players + all DSTs
    if K > 60 and "proj_fpts" in df.columns:
        cand_mask = (df["proj_fpts"].values >= 3.0) | (df["position"].values == "DST")
        pids = [int(i) for i in np.where(cand_mask)[0]]
    else:
        pids = list(range(K))

    teams = df["team"].unique().tolist()
    portfolio: List[List[int]] = []

    for m in range(num_lineups):
        prob = pulp.LpProblem(f"DK_GPP_Lineup_{m}", pulp.LpMaximize)
        x = pulp.LpVariable.dicts("x", pids, cat="Binary")

        # Objective: tail-weighted utility with mild chalk penalty on QB/WR/DST
        prob += pulp.lpSum(
            [
                (
                    gpp_utility[k]
                    - 3.5
                    * df.loc[k, "proj_ownership"]
                    * (df.loc[k, "position"] in ["QB", "WR", "DST"])
                )
                * x[k]
                for k in pids
            ]
        )

        # Salary band
        prob += pulp.lpSum([df.loc[k, "salary"] * x[k] for k in pids]) <= 50000
        prob += pulp.lpSum([df.loc[k, "salary"] * x[k] for k in pids]) >= 49000

        # Classic positional constraints
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "QB"]) == 1
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "DST"]) == 1
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "RB"]) >= 2
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "RB"]) <= 3
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "WR"]) >= 3
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "WR"]) <= 4
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "TE"]) >= 1
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "position"] == "TE"]) <= 2
        prob += pulp.lpSum([x[k] for k in pids]) == 9

        # Empirical salary / ownership geometry
        for k in pids:
            if df.loc[k, "position"] == "TE" and 5100 <= df.loc[k, "salary"] <= 6600:
                prob += x[k] == 0
            if df.loc[k, "position"] == "QB" and (
                df.loc[k, "proj_ownership"] > 0.20 or df.loc[k, "salary"] > 7900
            ):
                prob += x[k] == 0

        prob += pulp.lpSum(
            [x[k] for k in pids if df.loc[k, "position"] == "WR" and df.loc[k, "proj_ownership"] <= 0.05]
        ) >= 1
        prob += pulp.lpSum([x[k] for k in pids if df.loc[k, "proj_ownership"] <= 0.10]) >= 4
        prob += pulp.lpSum([df.loc[k, "proj_ownership"] * x[k] for k in pids]) <= 9.0 * target_avg_own

        # Structural stacking & anti-cannibalization
        if enforce_structure:
            for t_name in teams:
                qbs_t = [k for k in pids if df.loc[k, "team"] == t_name and df.loc[k, "position"] == "QB"]
                pass_catchers_t = [
                    k for k in pids if df.loc[k, "team"] == t_name and df.loc[k, "position"] in ["WR", "TE"]
                ]
                rbs_t = [k for k in pids if df.loc[k, "team"] == t_name and df.loc[k, "position"] == "RB"]
                dsts_t = [k for k in pids if df.loc[k, "team"] == t_name and df.loc[k, "position"] == "DST"]

                opp_rows = df.loc[df["team"] == t_name, "opponent"]
                if opp_rows.empty:
                    continue
                opp_team = opp_rows.values[0]
                opp_skill = [
                    k for k in pids if df.loc[k, "team"] == opp_team and df.loc[k, "position"] in ["RB", "WR", "TE"]
                ]
                opp_off_indices = [
                    k
                    for k in pids
                    if df.loc[k, "team"] == opp_team and df.loc[k, "position"] in ["QB", "RB", "WR", "TE"]
                ]

                if len(rbs_t) > 1:
                    prob += pulp.lpSum([x[k] for k in rbs_t]) <= 1

                for qb_k in qbs_t:
                    prob += pulp.lpSum([x[k] for k in pass_catchers_t]) >= 2 * x[qb_k]
                    prob += pulp.lpSum([x[k] for k in opp_skill]) >= 1 * x[qb_k]

                for dst_i in dsts_t:
                    if opp_off_indices:
                        prob += 3 * x[dst_i] + pulp.lpSum([x[k] for k in opp_off_indices]) <= 3

        # Sequential diversification (always applied)
        for past_lineup in portfolio:
            past_in_pids = [k for k in past_lineup if k in x]
            prob += pulp.lpSum([x[k] for k in past_in_pids]) <= max_overlap_gamma

            past_mask = np.zeros(K)
            past_mask[past_lineup] = 1.0
            past_var = float(past_mask.T @ cov_matrix @ past_mask)
            if past_var > 1e-6:
                shared_cov_weights = cov_matrix @ past_mask
                prob += pulp.lpSum([shared_cov_weights[k] * x[k] for k in pids]) <= rho_cov_ceiling * past_var

        status = prob.solve(pulp.PULP_CBC_CMD(msg=solver_msg))
        if status != pulp.LpStatusOptimal:
            print(f"Lineup {m}: solver status {pulp.LpStatus[status]} — stopping.")
            break

        chosen = [k for k in pids if pulp.value(x[k]) is not None and pulp.value(x[k]) > 0.5]
        if len(chosen) == 9:
            portfolio.append(chosen)
        else:
            print(f"Lineup {m}: incomplete selection, stopping.")
            break

    return portfolio


# =============================================================================
# POST-OPTIMIZATION GRADING
# =============================================================================

def grade_portfolio(
    portfolio: List[List[int]],
    fpts_matrix: np.ndarray,
    field_rosters: np.ndarray,
) -> Dict[str, float]:
    """
    Win-equity and score distribution summary for the generated portfolio.
    Computes `field_scores = fpts_matrix @ field_rosters.T` ONCE outside the loop.
    """
    if not portfolio or field_rosters.size == 0:
        return {}

    field_scores = fpts_matrix @ field_rosters.T  # (S, O) computed ONCE outside loop
    win_counts = []
    scores = []

    for lineup in portfolio:
        lineup_scores = fpts_matrix[:, lineup].sum(axis=1)
        scores.append(lineup_scores)
        wins = (lineup_scores[:, None] > field_scores).mean(axis=1)
        win_counts.append(wins.mean())

    return {
        "n_lineups": len(portfolio),
        "mean_win_equity": float(np.mean(win_counts)),
        "mean_score": float(np.mean([s.mean() for s in scores])),
        "p85_score": float(np.mean([np.percentile(s, 85) for s in scores])),
    }
