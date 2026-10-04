#!/usr/bin/env python3
"""
dixon_coles_simulation_engine.py
================================
Implementation of the Bivariate Dixon-Coles Generalized Autoregressive Score (GAS)
dynamics and the V4 Football-Aware Match-State Simulation Architecture
(arXiv:2608.05030).

Provides:
  1. DixonColesGAS: Dynamic attack/defence state updates with half-life decay,
     bivariate low-score tau-adjustment, and coherent probability matrices.
  2. RankingMetrics: Multi-class proper scoring rules including Ranked Probability
     Score (RPS), Brier Score, and Log Loss for 1X2 outcomes.
  3. CandidateGeometry: Top-K matrix cell extraction with deterministic tail anchors
     (high-scoring draws, high home/away wins, runaways) preventing candidate ceiling collapse.
  4. V4MatchSimulator: Goal-by-goal match-state path simulation with shared root
     breakthrough adjudication, dynamic post-goal hazard cascades, time-aware stopping,
     and fail-closed candidate validation.
"""

import math
import numpy as np
from typing import Dict, List, Tuple, Any, Optional

class DixonColesGAS:
    """
    Generalized Autoregressive Score (GAS) dynamic Poisson model with Dixon-Coles (1997)
    bivariate correlation adjustment for low-scoring match outcomes.
    
    Attributes:
        half_life_days: State decay half-life in days (default 1440.0 days).
        gain_attack (ga): Gain parameter for attack innovation (default 0.04).
        gain_vuln (gv): Gain parameter for vulnerability innovation (default 0.02).
        rho: Bivariate correlation parameter for low scores (default -0.05).
        max_score: Upper cutoff for score distribution grid (default 10).
    """

    def __init__(
        self,
        half_life_days: float = 1440.0,
        gain_attack: float = 0.04,
        gain_vuln: float = 0.02,
        rho: float = -0.05,
        max_score: int = 10
    ):
        if half_life_days <= 0:
            raise ValueError(f"half_life_days must be positive, got {half_life_days}")
        if not (-1.0 < rho < 1.0):
            raise ValueError(f"rho must be in (-1, 1), got {rho}")

        self.half_life_days = float(half_life_days)
        self.gain_attack = float(gain_attack)
        self.gain_vuln = float(gain_vuln)
        self.rho = float(rho)
        self.max_score = int(max_score)

        # Team states: team_name -> value
        self.attack_states: Dict[str, float] = {}
        self.vuln_states: Dict[str, float] = {}
        self.last_update_day: Dict[str, float] = {}

    def get_states(self, team: str, current_day: float = 0.0) -> Tuple[float, float]:
        """Returns decayed (attack, vulnerability) states for a team at current_day."""
        att = self.attack_states.get(team, 0.0)
        vul = self.vuln_states.get(team, 0.0)
        last_day = self.last_update_day.get(team, current_day)
        delta_t = max(0.0, current_day - last_day)

        if delta_t > 0:
            decay_factor = math.exp(-delta_t / self.half_life_days)
            att *= decay_factor
            vul *= decay_factor

        return att, vul

    def predict_lambdas(
        self,
        home_team: str,
        away_team: str,
        mu_h: float = 0.35,
        mu_a: float = 0.15,
        current_day: float = 0.0
    ) -> Tuple[float, float]:
        """
        Computes expected goal intensities lambda_H and lambda_A.
        ln(lambda_H) = mu_H + a_H - v_A
        ln(lambda_A) = mu_A + a_A - v_H
        """
        a_h, v_h = self.get_states(home_team, current_day)
        a_a, v_a = self.get_states(away_team, current_day)

        log_lam_h = mu_h + a_h - v_a
        log_lam_a = mu_a + a_a - v_h

        # Bound numerical lambdas to sane athletic intervals [0.05, 10.0]
        lam_h = math.exp(max(-3.0, min(log_lam_h, 3.0)))
        lam_a = math.exp(max(-3.0, min(log_lam_a, 3.0)))

        return lam_h, lam_a

    def tau_factor(self, x: int, y: int, lam_h: float, lam_a: float, rho: Optional[float] = None) -> float:
        """
        Dixon-Coles adjustment factor tau_{x,y}(lam_h, lam_a, rho) for (x, y) in {0, 1}^2.
        Enforces non-negativity to ensure valid probability measures.
        """
        r = self.rho if rho is None else rho
        if x == 0 and y == 0:
            val = 1.0 - (lam_h * lam_a * r)
        elif x == 0 and y == 1:
            val = 1.0 + (lam_h * r)
        elif x == 1 and y == 0:
            val = 1.0 + (lam_a * r)
        elif x == 1 and y == 1:
            val = 1.0 - r
        else:
            val = 1.0
        return max(0.0, val)

    def compute_bivariate_matrix(
        self,
        lam_h: float,
        lam_a: float,
        rho: Optional[float] = None
    ) -> np.ndarray:
        """
        Constructs normalized joint probability matrix P(Home=x, Away=y)
        over the grid [0, max_score] x [0, max_score].
        """
        if lam_h <= 0 or lam_a <= 0:
            raise ValueError(f"Goal intensities must be positive: ({lam_h}, {lam_a})")

        m = self.max_score + 1
        matrix = np.zeros((m, m), dtype=np.float64)

        # Precompute Poisson PMFs
        p_h = np.array([math.exp(-lam_h + k * math.log(lam_h) - math.lgamma(k + 1)) for k in range(m)])
        p_a = np.array([math.exp(-lam_a + k * math.log(lam_a) - math.lgamma(k + 1)) for k in range(m)])

        for x in range(m):
            for y in range(m):
                tau = self.tau_factor(x, y, lam_h, lam_a, rho)
                matrix[x, y] = p_h[x] * p_a[y] * tau

        total_mass = float(np.sum(matrix))
        if total_mass <= 0:
            raise RuntimeError("Total probability mass non-positive in score matrix")
        matrix /= total_mass
        return matrix

    @staticmethod
    def compute_1x2_probabilities(matrix: np.ndarray) -> Tuple[float, float, float]:
        """
        Aggregates joint score matrix into 1X2 probabilities (p_home, p_draw, p_away).
        """
        p_home = float(np.sum(np.tril(matrix, -1).T))  # x > y -> lower triangle of matrix (row > col)
        # Actually row is x (home), col is y (away).
        # x > y is rows > cols, which is np.tril(matrix, -1).
        p_home = float(np.sum(np.tril(matrix, -1)))
        p_draw = float(np.sum(np.diag(matrix)))
        p_away = float(np.sum(np.triu(matrix, 1)))

        total = p_home + p_draw + p_away
        return p_home / total, p_draw / total, p_away / total

    def update_after_match(
        self,
        home_team: str,
        away_team: str,
        score_h: int,
        score_a: int,
        match_day: float,
        mu_h: float = 0.35,
        mu_a: float = 0.15,
        clip_bound: float = 3.0
    ):
        """
        Applies online score-driven (GAS) update following date-batch match completion.
        Uses clipped standardized score innovations.
        """
        lam_h, lam_a = self.predict_lambdas(home_team, away_team, mu_h, mu_a, match_day)

        # Standardized innovations: (x - lambda) / sqrt(lambda)
        inno_h = (float(score_h) - lam_h) / math.sqrt(lam_h)
        inno_a = (float(score_a) - lam_a) / math.sqrt(lam_a)

        inno_h = max(-clip_bound, min(inno_h, clip_bound))
        inno_a = max(-clip_bound, min(inno_a, clip_bound))

        a_h, v_h = self.get_states(home_team, match_day)
        a_a, v_a = self.get_states(away_team, match_day)

        # Update attack and opponent vulnerability
        new_a_h = a_h + self.gain_attack * inno_h
        new_v_a = v_a + self.gain_vuln * inno_h

        new_a_a = a_a + self.gain_attack * inno_a
        new_v_h = v_h + self.gain_vuln * inno_a

        self.attack_states[home_team] = new_a_h
        self.vuln_states[home_team] = new_v_h
        self.last_update_day[home_team] = match_day

        self.attack_states[away_team] = new_a_a
        self.vuln_states[away_team] = new_v_a
        self.last_update_day[away_team] = match_day


class RankingMetrics:
    """
    Evaluation metrics for 1X2 categorical predictions and ranked score distributions.
    Enforces strict proper scoring rules (Gneiting & Raftery 2007) and RPS (Epstein 1969).
    """

    @staticmethod
    def ranked_probability_score(p_vector: Tuple[float, float, float], outcome_idx: int) -> float:
        """
        Ranked Probability Score (RPS) for ordered 3-class outcomes [Home=0, Draw=1, Away=2].
        RPS = 1/(K-1) * sum_{i=1}^{K-1} (sum_{j=1}^i p_j - sum_{j=1}^i o_j)^2
        Bounded in [0, 1]. Lower is better.
        """
        if outcome_idx not in (0, 1, 2):
            raise ValueError(f"outcome_idx must be 0, 1, or 2; got {outcome_idx}")

        p_h, p_d, p_a = p_vector
        o_h = 1.0 if outcome_idx == 0 else 0.0
        o_d = 1.0 if outcome_idx == 1 else 0.0

        # Term 1: (p_h - o_h)^2
        term1 = (p_h - o_h) ** 2
        # Term 2: (p_h + p_d - (o_h + o_d))^2
        term2 = (p_h + p_d - (o_h + o_d)) ** 2

        rps = 0.5 * (term1 + term2)
        return float(rps)

    @staticmethod
    def multi_class_brier(p_vector: Tuple[float, float, float], outcome_idx: int) -> float:
        """
        Multi-class Brier score = sum_{k=1}^3 (p_k - o_k)^2.
        Lower is better.
        """
        if outcome_idx not in (0, 1, 2):
            raise ValueError(f"outcome_idx must be 0, 1, or 2; got {outcome_idx}")

        brier = 0.0
        for k in range(3):
            o_k = 1.0 if k == outcome_idx else 0.0
            brier += (p_vector[k] - o_k) ** 2
        return float(brier)

    @staticmethod
    def multi_class_log_loss(
        p_vector: Tuple[float, float, float],
        outcome_idx: int,
        eps: float = 1e-15
    ) -> float:
        """
        Multi-class logarithmic loss (cross-entropy) = -ln(max(eps, p_{outcome})).
        Lower is better.
        """
        if outcome_idx not in (0, 1, 2):
            raise ValueError(f"outcome_idx must be 0, 1, or 2; got {outcome_idx}")

        prob = max(eps, min(1.0, p_vector[outcome_idx]))
        return float(-math.log(prob))


class CandidateGeometry:
    """
    Extracts candidate scorelines from Dixon-Coles prior and augments with
    deterministic tail anchors (arXiv:2608.05030 §3.2, §4.3) to prevent candidate ceiling truncation.
    """

    # 5 canonical tail anchor categories:
    # 1. High-scoring draw: (2, 2), (3, 3)
    # 2. High-scoring home win: (3, 1), (4, 1)
    # 3. High-scoring away win: (1, 3), (1, 4)
    # 4. Runaway home win: (4, 0), (5, 0)
    # 5. Runaway away win: (0, 4), (0, 5)
    DEFAULT_TAIL_ANCHORS: List[Tuple[int, int]] = [
        (2, 2), (3, 3),
        (3, 1), (4, 1),
        (1, 3), (1, 4),
        (4, 0), (5, 0),
        (0, 4), (0, 5)
    ]

    @classmethod
    def generate_candidate_pool(
        cls,
        matrix: np.ndarray,
        top_k: int = 10,
        include_tail_anchors: bool = True
    ) -> List[Tuple[int, int]]:
        """
        Extracts Top-K scores by prior probability and merges with deterministic tail anchors.
        Preserves unique score tuples.
        """
        m = matrix.shape[0]
        indexed_scores = []
        for x in range(m):
            for y in range(m):
                indexed_scores.append(((x, y), matrix[x, y]))

        # Sort descending by prior probability
        indexed_scores.sort(key=lambda item: item[1], reverse=True)
        top_scores = [score for score, _ in indexed_scores[:top_k]]

        if not include_tail_anchors:
            return top_scores

        pool = list(top_scores)
        pool_set = set(top_scores)

        for anchor in cls.DEFAULT_TAIL_ANCHORS:
            if anchor not in pool_set:
                pool.append(anchor)
                pool_set.add(anchor)

        return pool


class V4MatchSimulator:
    """
    Goal-by-Goal Match-State Simulator (V4) implementing:
      - Shared Root Breakthrough adjudication (0-0 equilibrium break probability).
      - Time-aware Poisson point process with 90-minute horizon.
      - Post-goal cascade hazard modulation:
          * Leader contracts exposure (lead protection).
          * Trailer expands aggressiveness (response capacity).
          * Counter-attack vulnerability exposure.
      - Fail-closed candidate pool reranker.
    """

    def __init__(
        self,
        lead_contraction: float = 0.85,
        trail_expansion: float = 1.25,
        counter_vulnerability: float = 1.15,
        match_minutes: float = 90.0
    ):
        self.lead_contraction = float(lead_contraction)
        self.trail_expansion = float(trail_expansion)
        self.counter_vulnerability = float(counter_vulnerability)
        self.match_minutes = float(match_minutes)

    def evaluate_root_breakthrough(self, lam_h: float, lam_a: float) -> Dict[str, Any]:
        """
        Evaluates shared root decision: probability that match equilibrium breaks from 0-0.
        P(breakthrough) = 1 - P(0, 0) in Poisson prior = 1 - exp(-(lam_h + lam_a)).
        """
        lam_total = lam_h + lam_a
        p_no_goals = math.exp(-lam_total)
        p_breakthrough = 1.0 - p_no_goals
        verdict = "first_goal_more_likely" if p_breakthrough >= 0.5 else "stalemate_favored"
        return {
            "p_breakthrough": float(p_breakthrough),
            "p_0_0": float(p_no_goals),
            "root_verdict": verdict
        }

    def simulate_path(
        self,
        lam_h_base: float,
        lam_a_base: float,
        rng: Optional[np.random.Generator] = None
    ) -> Dict[str, Any]:
        """
        Simulates a single 90-minute match path goal-by-goal with dynamic cascade adjustments.
        Returns final score, goal event times, and cascade depth.
        """
        if rng is None:
            rng = np.random.default_rng()

        current_time = 0.0
        score_h = 0
        score_a = 0
        events = []

        # Current hazard rates per 90-minute match (intensity per minute = lam / 90)
        curr_lam_h = lam_h_base
        curr_lam_a = lam_a_base

        while current_time < self.match_minutes:
            total_intensity_per_min = (curr_lam_h + curr_lam_a) / self.match_minutes
            if total_intensity_per_min <= 0:
                break

            # Next goal inter-arrival time: Exp(total_intensity)
            inter_arrival = rng.exponential(1.0 / total_intensity_per_min)
            next_time = current_time + inter_arrival

            if next_time >= self.match_minutes:
                break

            # Goal occurs at next_time
            current_time = next_time
            p_home_goal = curr_lam_h / (curr_lam_h + curr_lam_a)
            if rng.random() < p_home_goal:
                score_h += 1
                scoring_team = "home"
            else:
                score_a += 1
                scoring_team = "away"

            events.append({
                "minute": round(current_time, 1),
                "team": scoring_team,
                "score_after": (score_h, score_a)
            })

            # Post-goal cascade modulation
            margin = score_h - score_a
            if margin > 0:
                # Home leading
                curr_lam_h = lam_h_base * (self.lead_contraction ** min(3, margin))
                curr_lam_a = lam_a_base * (self.trail_expansion ** min(3, margin))
                # Counter-attack exposure: when away pushes, home may get counter chances
                curr_lam_h *= self.counter_vulnerability
            elif margin < 0:
                # Away leading
                curr_lam_a = lam_a_base * (self.lead_contraction ** min(3, abs(margin)))
                curr_lam_h = lam_h_base * (self.trail_expansion ** min(3, abs(margin)))
                # Counter-attack exposure for away
                curr_lam_a *= self.counter_vulnerability
            else:
                # Level score: reset closer to base intensities
                curr_lam_h = lam_h_base
                curr_lam_a = lam_a_base

        return {
            "final_score": (score_h, score_a),
            "total_goals": score_h + score_a,
            "events": events,
            "cascade_transitions": len(events)
        }

    def simulate_match_distribution(
        self,
        lam_h: float,
        lam_a: float,
        num_simulations: int = 5000,
        seed: Optional[int] = 42
    ) -> Dict[Tuple[int, int], float]:
        """
        Runs Monte Carlo simulation of paths and computes score distribution.
        """
        rng = np.random.default_rng(seed)
        counts: Dict[Tuple[int, int], int] = {}

        for _ in range(num_simulations):
            path = self.simulate_path(lam_h, lam_a, rng=rng)
            score = path["final_score"]
            counts[score] = counts.get(score, 0) + 1

        dist = {k: v / num_simulations for k, v in counts.items()}
        return dist

    def rerank_candidate_pool(
        self,
        simulated_dist: Dict[Tuple[int, int], float],
        candidate_pool: List[Tuple[int, int]],
        top_n: int = 3
    ) -> List[Tuple[Tuple[int, int], float]]:
        """
        Reranks the candidate pool based on simulation frequency.
        Enforces FAIL-CLOSED validation: Only scores inside candidate_pool are permitted.
        """
        candidate_set = set(candidate_pool)
        scored_candidates = []

        for cand in candidate_pool:
            freq = simulated_dist.get(cand, 0.0)
            scored_candidates.append((cand, freq))

        # Sort descending by simulated frequency
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        return scored_candidates[:top_n]

    @staticmethod
    def audit_harness(
        top_ranked: List[Tuple[Tuple[int, int], float]],
        candidate_pool: List[Tuple[int, int]],
        true_score: Optional[Tuple[int, int]] = None
    ) -> Dict[str, Any]:
        """
        Performs audit verification compliant with arXiv:2608.05030 §3, §6:
        - Confirms all ranked candidates belong to candidate_pool (zero out-of-pool hallucinations).
        - Computes Top-1 and Top-3 exact hits against true_score if provided.
        - Computes candidate pool coverage of true_score.
        """
        cand_set = set(candidate_pool)
        for score, _ in top_ranked:
            if score not in cand_set:
                raise ValueError(f"Violation: Ranked score {score} not in candidate pool!")

        audit = {
            "pool_size": len(candidate_pool),
            "ranked_count": len(top_ranked),
            "fail_closed_valid": True,
            "top_1_score": top_ranked[0][0] if top_ranked else None,
            "top_3_scores": [s[0] for s in top_ranked[:3]]
        }

        if true_score is not None:
            audit["true_score"] = true_score
            audit["candidate_pool_covered"] = bool(true_score in cand_set)
            audit["top_1_hit"] = bool(top_ranked and top_ranked[0][0] == true_score)
            audit["top_3_hit"] = bool(any(s[0] == true_score for s in top_ranked[:3]))

        return audit
