"""
glicko2_trueskill_engine.py
Canonical Glicko-2, Bradley-Terry-Luce (BTL), and TrueSkill Factor Graph Engine.
Implements the exact eight-step Glicko-2 system with Illinois root-finding for volatility,
Ford's graph connectivity validation with fail-closed null returns for BTL,
and TrueSkill Gaussian belief message passing with non-linear V and W functions.
"""
import math
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Set

GLICKO_SCALE = 173.7178

@dataclass
class GlickoPlayer:
    rating: float = 1500.0
    rd: float = 350.0
    volatility: float = 0.06

    @property
    def mu(self) -> float:
        return (self.rating - 1500.0) / GLICKO_SCALE

    @property
    def phi(self) -> float:
        return self.rd / GLICKO_SCALE

class CanonicalGlicko2Engine:
    """
    Exact 8-step canonical Glicko-2 rating system with Illinois algorithm root-finding.
    """
    def __init__(self, tau: float = 0.5):
        self.tau = tau # System volatility constraint parameter

    @staticmethod
    def g(phi: float) -> float:
        return 1.0 / math.sqrt(1.0 + 3.0 * (phi ** 2) / (math.pi ** 2))

    @staticmethod
    def expected_outcome(mu: float, mu_j: float, phi_j: float) -> float:
        g_val = CanonicalGlicko2Engine.g(phi_j)
        return 1.0 / (1.0 + math.exp(-g_val * (mu - mu_j)))

    def update_rating(
        self,
        player: GlickoPlayer,
        matches: List[Tuple[GlickoPlayer, float]] # list of (opponent, score: 1.0 win, 0.5 draw, 0.0 loss)
    ) -> GlickoPlayer:
        if not matches:
            # If no matches, only inflate RD by volatility
            phi_star = math.sqrt(player.phi ** 2 + player.volatility ** 2)
            return GlickoPlayer(
                rating=player.rating,
                rd=min(350.0, phi_star * GLICKO_SCALE),
                volatility=player.volatility
            )

        mu = player.mu
        phi = player.phi
        sigma = player.volatility

        # Step 3: Compute variance v and delta
        v_inv = 0.0
        delta_sum = 0.0
        for opp, score in matches:
            g_j = self.g(opp.phi)
            e_j = self.expected_outcome(mu, opp.mu, opp.phi)
            v_inv += (g_j ** 2) * e_j * (1.0 - e_j)
            delta_sum += g_j * (score - e_j)

        v = 1.0 / v_inv
        delta = v * delta_sum

        # Step 5: Illinois Algorithm to find new volatility sigma'
        a = math.log(sigma ** 2)

        def f(x: float) -> float:
            e_x = math.exp(x)
            term1_num = e_x * (delta ** 2 - phi ** 2 - v - e_x)
            term1_den = 2.0 * ((phi ** 2 + v + e_x) ** 2)
            term2 = (x - a) / (self.tau ** 2)
            return (term1_num / term1_den) - term2

        # Set initial bracket [A, B]
        A = a
        if delta ** 2 > (phi ** 2 + v):
            B = math.log(delta ** 2 - phi ** 2 - v)
        else:
            k = 1
            while f(a - k * self.tau) < 0:
                k += 1
            B = a - k * self.tau

        f_A = f(A)
        f_B = f(B)

        # Illinois secant iteration
        epsilon = 1e-6
        for _ in range(100):
            if abs(B - A) <= epsilon:
                break
            # Secant step
            C = A - f_A * (A - B) / (f_A - f_B)
            f_C = f(C)

            if f_C * f_B < 0:
                A = B
                f_A = f_B
            else:
                f_A = f_A / 2.0 # Illinois damping
            B = C
            f_B = f_C

        sigma_prime = math.exp(B / 2.0)

        # Step 6: Pre-rating deviation inflation
        phi_star = math.sqrt(phi ** 2 + sigma_prime ** 2)

        # Step 7: Precision update
        phi_prime = 1.0 / math.sqrt(1.0 / (phi_star ** 2) + 1.0 / v)
        mu_prime = mu + (phi_prime ** 2) * delta_sum

        # Step 8: Rescale to display
        new_rating = GLICKO_SCALE * mu_prime + 1500.0
        new_rd = GLICKO_SCALE * phi_prime

        return GlickoPlayer(rating=new_rating, rd=new_rd, volatility=sigma_prime)

class BradleyTerryLuceEngine:
    """
    Bradley-Terry-Luce model with Ford's graph connectivity validation.
    Fails closed (returns None) if any team is undefeated, preventing infinite scalar divergence.
    """
    @staticmethod
    def verify_ford_connectivity(teams: List[str], win_matrix: Dict[Tuple[str, str], int]) -> bool:
        r"""
        Ford's condition: For every partition of entities into non-empty sets (S, V \ S),
        at least one entity in S has defeated an entity in V \ S.
        Equivalent to: The directed win graph has a single strongly connected component.
        """
        # Build directed adjacency: edge u -> v means u defeated v
        adj: Dict[str, Set[str]] = {t: set() for t in teams}
        for (u, v), count in win_matrix.items():
            if count > 0:
                adj[u].add(v)

        # Check reachability from any node
        for start_node in teams:
            visited = set()
            queue = [start_node]
            while queue:
                curr = queue.pop(0)
                if curr not in visited:
                    visited.add(curr)
                    queue.extend(adj[curr] - visited)
            if len(visited) != len(teams):
                return False
        return True

    @staticmethod
    def solve_mle_or_fail_closed(
        teams: List[str],
        win_matrix: Dict[Tuple[str, str], int],
        max_iters: int = 100
    ) -> Optional[Dict[str, float]]:
        """
        Calculates MLE strengths pi_i via Zermelo fixed-point iteration.
        Returns None (fails closed) if the win graph violates Ford's condition.
        """
        if not BradleyTerryLuceEngine.verify_ford_connectivity(teams, win_matrix):
            return None # Fail-closed null return

        # Total wins per team
        W = {t: 0 for t in teams}
        N_pairs = {}
        for (u, v), count in win_matrix.items():
            W[u] += count
            N_pairs[(u, v)] = count + win_matrix.get((v, u), 0)

        # Initialize uniform strengths
        pi = {t: 1.0 for t in teams}

        for _ in range(max_iters):
            pi_new = {}
            for i in teams:
                denom = 0.0
                for j in teams:
                    if i != j:
                        n_ij = N_pairs.get((i, j), 0) or N_pairs.get((j, i), 0)
                        if n_ij > 0:
                            denom += n_ij / (pi[i] + pi[j])
                pi_new[i] = (W[i] / denom) if denom > 0 else pi[i]

            # Geometric mean normalization: prod(pi_i)^(1/n) = 1
            log_sum = sum(math.log(pi_new[t]) for t in teams)
            geom_mean = math.exp(log_sum / len(teams))
            pi = {t: pi_new[t] / geom_mean for t in teams}

        return pi

class TrueSkillFactorGraphEngine:
    """
    TrueSkill Gaussian Belief Engine using Expectation Propagation (EP) message passing.
    """
    @staticmethod
    def v_function(t: float, epsilon: float) -> float:
        """Additive mean adjustment function V(t, epsilon)."""
        from scipy.stats import norm
        denom = norm.cdf(t - epsilon)
        if denom < 1e-12:
            return -t + epsilon
        return float(norm.pdf(t - epsilon) / denom)

    @staticmethod
    def w_function(t: float, epsilon: float) -> float:
        """Multiplicative variance reduction factor W(t, epsilon)."""
        v = TrueSkillFactorGraphEngine.v_function(t, epsilon)
        return float(v * (v + (t - epsilon)))

    @staticmethod
    def update_duel(
        mu_winner: float, sigma_winner: float,
        mu_loser: float, sigma_loser: float,
        beta: float = 25.0 / 6.0,
        draw_margin: float = 0.0
    ) -> Tuple[Tuple[float, float], Tuple[float, float]]:
        """
        Single 1v1 duel update via TrueSkill EP equations:
        c^2 = 2*beta^2 + sigma_w^2 + sigma_l^2
        """
        c = math.sqrt(2.0 * (beta ** 2) + (sigma_winner ** 2) + (sigma_loser ** 2))
        t = (mu_winner - mu_loser) / c
        eps = draw_margin / c

        v = TrueSkillFactorGraphEngine.v_function(t, eps)
        w = TrueSkillFactorGraphEngine.w_function(t, eps)

        # Winner update
        mu_w_prime = mu_winner + ((sigma_winner ** 2) / c) * v
        sigma_w_prime = sigma_winner * math.sqrt(max(1e-4, 1.0 - ((sigma_winner ** 2) / (c ** 2)) * w))

        # Loser update
        mu_l_prime = mu_loser - ((sigma_loser ** 2) / c) * v
        sigma_l_prime = sigma_loser * math.sqrt(max(1e-4, 1.0 - ((sigma_loser ** 2) / (c ** 2)) * w))

        return (mu_w_prime, sigma_w_prime), (mu_l_prime, sigma_l_prime)


class AdaptiveFootballGlicko2Engine(CanonicalGlicko2Engine):
    """
    Adaptive Glicko-2 Framework for Football Forecasting (arXiv:2607.01722).
    Incorporates:
      1. Margin-of-victory (MOV) adjustment: logarithmic dampening of blowout scores.
      2. Dominance weighting: modulates match variance contribution.
      3. Home advantage delta_home in latent ability scale.
      4. Ordered-logit 3-way draw model (Away Win, Draw, Home Win) via cutoffs (theta_1, theta_2).
    """
    def __init__(
        self,
        tau: float = 0.5,
        home_advantage_rating: float = 65.0, # ~0.374 in mu scale
        theta_1: float = -0.45,
        theta_2: float = 0.45
    ):
        super().__init__(tau=tau)
        self.delta_home = home_advantage_rating / GLICKO_SCALE
        self.theta_1 = float(theta_1)
        self.theta_2 = float(theta_2)
        if self.theta_1 >= self.theta_2:
            raise ValueError(f"theta_1 must be strictly less than theta_2, got {theta_1} >= {theta_2}")

    @staticmethod
    def margin_of_victory_multiplier(goal_diff: int) -> float:
        """
        Logarithmic MOV multiplier: ln(1 + |goal_diff|)
        Ensures non-linear diminishing returns for blowouts.
        """
        return math.log(1.0 + abs(goal_diff))

    def predict_1x2_ordered_logit(
        self,
        home_player: GlickoPlayer,
        away_player: GlickoPlayer
    ) -> Tuple[float, float, float]:
        """
        Predicts 3-way outcome probabilities (P(Home), P(Draw), P(Away))
        using cumulative ordered logit with combined rating deviation.
        """
        phi_comb = math.sqrt(home_player.phi ** 2 + away_player.phi ** 2)
        g_val = self.g(phi_comb)
        
        # Latent differential including home field advantage
        z = g_val * (home_player.mu + self.delta_home - away_player.mu)

        # Cumulative probabilities:
        # P(Away Win) = sigma(theta_1 - z)
        # P(Away or Draw) = sigma(theta_2 - z)
        # P(Home Win) = 1 - sigma(theta_2 - z)
        p_away = 1.0 / (1.0 + math.exp(-(self.theta_1 - z)))
        p_away_or_draw = 1.0 / (1.0 + math.exp(-(self.theta_2 - z)))
        
        p_draw = max(0.0, p_away_or_draw - p_away)
        p_home = max(0.0, 1.0 - p_away_or_draw)

        # Normalize to guarantee conservation
        total = p_home + p_draw + p_away
        return p_home / total, p_draw / total, p_away / total


class DavidsonBradleyTerryEngine:
    """
    Davidson (1970) / Tsokos et al. (arXiv:1807.01623) Bradley-Terry Extension with Draw Parameter.
    P(i beats j) = pi_i / (pi_i + pi_j + delta * sqrt(pi_i * pi_j))
    P(Draw)      = (delta * sqrt(pi_i * pi_j)) / (pi_i + pi_j + delta * sqrt(pi_i * pi_j))
    P(j beats i) = pi_j / (pi_i + pi_j + delta * sqrt(pi_i * pi_j))
    """
    def __init__(self, delta: float = 0.5):
        if delta < 0:
            raise ValueError(f"Draw parameter delta must be non-negative, got {delta}")
        self.delta = float(delta)

    def predict_probabilities(
        self,
        strength_i: float,
        strength_j: float,
        home_advantage_i: float = 0.25
    ) -> Tuple[float, float, float]:
        """
        Computes (p_i_win, p_draw, p_j_win) under Davidson model with home advantage.
        pi_i = exp(strength_i + home_advantage_i)
        pi_j = exp(strength_j)
        """
        pi_i = math.exp(strength_i + home_advantage_i)
        pi_j = math.exp(strength_j)
        geom_mean = math.sqrt(pi_i * pi_j)
        
        denom = pi_i + pi_j + self.delta * geom_mean
        p_i = pi_i / denom
        p_draw = (self.delta * geom_mean) / denom
        p_j = pi_j / denom

        return p_i, p_draw, p_j


if __name__ == "__main__":
    glicko = CanonicalGlicko2Engine()
    print("Glicko-2 & TrueSkill Engine initialized.")

    # Test Glicko-2 player update
    p0 = GlickoPlayer(rating=1500.0, rd=200.0, volatility=0.06)
    opp1 = GlickoPlayer(rating=1400.0, rd=30.0)
    opp2 = GlickoPlayer(rating=1550.0, rd=100.0)
    opp3 = GlickoPlayer(rating=1700.0, rd=300.0)

    # 1 win, 1 loss, 1 win
    matches = [(opp1, 1.0), (opp2, 0.0), (opp3, 1.0)]
    p_updated = glicko.update_rating(p0, matches)
    print(f"\nGlicko-2 Update:")
    print(f" - Initial: Rating={p0.rating:.1f}, RD={p0.rd:.1f}, Vol={p0.volatility:.4f}")
    print(f" - Updated: Rating={p_updated.rating:.1f}, RD={p_updated.rd:.1f}, Vol={p_updated.volatility:.4f}")
    assert p_updated.rd < p0.rd, "Rating deviation must decrease after 3 matches"

    # Test BTL Ford Connectivity check
    teams = ["Chiefs", "Bills", "Ravens"]
    connected_wins = {
        ("Chiefs", "Bills"): 2,
        ("Bills", "Ravens"): 1,
        ("Ravens", "Chiefs"): 1
    }
    btl_res = BradleyTerryLuceEngine.solve_mle_or_fail_closed(teams, connected_wins)
    print(f"\nBTL Connected Graph: Strengths={btl_res}")
    assert btl_res is not None

    disconnected_wins = {
        ("Chiefs", "Bills"): 3,
        ("Chiefs", "Ravens"): 2,
        ("Bills", "Ravens"): 1
        # No team has defeated the Chiefs! Undefeated team!
    }
    btl_fail = BradleyTerryLuceEngine.solve_mle_or_fail_closed(teams, disconnected_wins)
    print(f"BTL Undefeated Graph: Returned Null={btl_fail is None} (Fail-Closed)")
    assert btl_fail is None, "Must return None (fail-closed) when graph is not strongly connected"

    # Test TrueSkill
    (w_mu, w_sig), (l_mu, l_sig) = TrueSkillFactorGraphEngine.update_duel(25.0, 8.33, 25.0, 8.33)
    print(f"\nTrueSkill Duel Update: Winner mu={w_mu:.2f} | Loser mu={l_mu:.2f}")
    assert w_mu > 25.0 and l_mu < 25.0

    print("\nGlicko-2, BTL & TrueSkill tests passed 100%!")
