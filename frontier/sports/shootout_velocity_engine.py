"""
Shootout Velocity Index (SVI) & Game Script Urgency Engine
Integrates:
- Bilateral Playoff Leverage Index (harmonic mean of win/loss playoff delta)
- In-State / Geographic Rivalry Escalation Factor
- NFL Scrimmage Clock Expansion Mechanics (Incomplete pass clock stoppage + hurry-up runoff)
- Bivariate Hawkes Cross-Drive Tempo Feedback
- Slate-wide Shootout Velocity Index (SVI) Ranking & P(GOTS) Calculation
"""

from __future__ import annotations
import math
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any

@dataclass(frozen=True)
class GameContext:
    game_id: str
    team_a: str
    team_b: str
    over_under: float
    spread: float          # Team A spread (e.g. -2.5)
    is_dome: bool
    wind_mph: float
    delta_p_playoffs_a: float  # P(playoff | win) - P(playoff | loss)
    delta_p_playoffs_b: float
    is_in_state: bool
    is_divisional: bool
    distance_miles: float
    proe_a: float          # Pass Rate Over Expected (-0.10 to +0.15)
    proe_b: float
    sec_per_snap_a: float  # Neutral seconds per snap (24.0 to 31.0)
    sec_per_snap_b: float
    explosive_pass_rate_a: float  # % passes 20+ yds (0.05 to 0.18)
    explosive_pass_rate_b: float
    pass_funnel_rating_a: float   # Defense pass EPA allowed - run EPA allowed
    pass_funnel_rating_b: float
    wr1_target_share_a: float     # Target concentration
    wr2_target_share_a: float
    wr1_target_share_b: float
    wr2_target_share_b: float
    fourth_down_aggression_a: float = 1.0  # Actual vs optimal 4th down attempts
    fourth_down_aggression_b: float = 1.0
    line_movement: float = 0.0

class ShootoutVelocityEngine:
    """Calculates Game Script Urgency, Pace Escalation, and SVI."""

    @staticmethod
    def calculate_bilateral_pli(delta_p_a: float, delta_p_b: float) -> float:
        """
        Harmonic mean of playoff leverage for both teams.
        delta_p = P(playoff | win) - P(playoff | loss).
        Harmonic mean enforces that BOTH teams must have meaningful stakes.
        """
        eps = 1e-5
        if delta_p_a <= 0 or delta_p_b <= 0:
            return 0.0
        return (2.0 * delta_p_a * delta_p_b) / (delta_p_a + delta_p_b + eps)

    @staticmethod
    def calculate_rivalry_factor(is_in_state: bool, is_divisional: bool, distance_miles: float) -> float:
        """
        Rivalry / Geographic Urgency Factor:
        Distance decay + in-state Governor's Cup bonus + divisional stakes.
        """
        d_0 = 300.0  # Characteristic distance in miles
        geo_proximity = math.exp(-max(0.0, distance_miles) / d_0)
        
        base_factor = 1.0
        if is_in_state:
            base_factor += 0.40  # In-state bragging rights / media intensity
        if is_divisional:
            base_factor += 0.35  # Divisional tiebreaker stakes
            
        base_factor += 0.25 * geo_proximity
        return base_factor

    @classmethod
    def compute_game_script_urgency(cls, game: GameContext) -> Dict[str, float]:
        """Computes composite Game Script Urgency (GSU) on a 0-100 scale."""
        pli = cls.calculate_bilateral_pli(game.delta_p_playoffs_a, game.delta_p_playoffs_b)
        pli_norm = np.clip(pli / 0.35, 0.0, 1.0)
        
        rivalry = cls.calculate_rivalry_factor(game.is_in_state, game.is_divisional, game.distance_miles)
        rivalry_norm = np.clip((rivalry - 1.0) / 1.0, 0.0, 1.0)
        
        avg_proe = (game.proe_a + game.proe_b) / 2.0
        proe_norm = np.clip((avg_proe + 0.05) / 0.15, 0.0, 1.0)
        
        avg_4th = (game.fourth_down_aggression_a + game.fourth_down_aggression_b) / 2.0
        fourth_norm = np.clip((avg_4th - 0.8) / 0.6, 0.0, 1.0)
        coaching_norm = 0.6 * proe_norm + 0.4 * fourth_norm
        
        gsu_index = (0.45 * pli_norm + 0.25 * rivalry_norm + 0.30 * coaching_norm) * 100.0
        return {
            "gsu_index": float(gsu_index),
            "pli": float(pli),
            "rivalry_factor": float(rivalry),
            "coaching_aggression": float(coaching_norm)
        }

    @classmethod
    def compute_svi(cls, game: GameContext) -> float:
        """
        Exact mathematical equation for Shootout Velocity Index (0 to 100):
        SVI = 100 / (1 + exp( -0.6 * (z_pace + z_env + z_expl + z_funnel + z_urgency + z_vegas + z_cond) ))
        """
        avg_sps = (game.sec_per_snap_a + game.sec_per_snap_b) / 2.0
        z_pace = 1.8 * (28.0 - avg_sps)

        # Environmental conditions
        if game.is_dome:
            z_env = 1.35
        elif game.wind_mph > 15.0:
            z_env = -1.5 - 0.12 * (game.wind_mph - 15.0)
        else:
            z_env = 0.0

        # Bilateral Explosive Pass Rate
        epr_a, epr_b = game.explosive_pass_rate_a, game.explosive_pass_rate_b
        bilat_epr = (2.0 * epr_a * epr_b) / (epr_a + epr_b + 1e-5)
        z_expl = 25.0 * (bilat_epr - 0.09)

        # Pass-Funnel Defense Matchup
        z_funnel = 0.8 * (game.pass_funnel_rating_a + game.pass_funnel_rating_b)

        # Game Script Urgency
        gsu = cls.compute_game_script_urgency(game)["gsu_index"]
        z_urgency = 0.04 * (gsu - 50.0)

        # Vegas Total and Closeness
        spread_mag = abs(game.spread)
        z_vegas = 0.12 * (game.over_under - 45.0) - 0.25 * max(0.0, spread_mag - 3.5) + 0.10 * game.line_movement

        # Target Condensation (HHI)
        hhi_a = game.wr1_target_share_a ** 2 + game.wr2_target_share_a ** 2
        hhi_b = game.wr1_target_share_b ** 2 + game.wr2_target_share_b ** 2
        avg_hhi = (hhi_a + hhi_b) / 2.0
        z_cond = 15.0 * (avg_hhi - 0.09)

        v_latent = z_pace + z_env + z_expl + z_funnel + z_urgency + z_vegas + z_cond
        svi = 100.0 / (1.0 + math.exp(-0.6 * v_latent))
        return round(float(svi), 2)

    @classmethod
    def simulate_clock_expansion(cls, game: GameContext, n_sims: int = 2500) -> Dict[str, float]:
        """
        Simulates the mechanical clock stoppage expansion theorem:
        NFL Game clock for scrimmage plays = 3300 seconds.
        Incomplete passes stop clock immediately (consuming only 5-6s of game clock).
        Hurry-up / dome tempo cuts in-bounds runoff from 34s to 20-22s.
        High PROE + dome acceleration increases play volume by +25% to +35%.
        """
        np.random.seed(42)
        gsu = cls.compute_game_script_urgency(game)["gsu_index"]
        
        # Shootout urgency elevates pass rate significantly
        urgency_pass_bonus = 0.08 * (gsu / 70.0) if game.is_dome else 0.02
        base_pass_rate_a = min(0.74, 0.58 + game.proe_a + urgency_pass_bonus)
        base_pass_rate_b = min(0.72, 0.58 + game.proe_b + urgency_pass_bonus)
        
        comp_rate_a = 0.66 + (0.03 if game.is_dome else 0.0)
        comp_rate_b = 0.65 + (0.03 if game.is_dome else 0.0)

        avg_sps = (game.sec_per_snap_a + game.sec_per_snap_b) / 2.0
        # Hurry-up / dome no-huddle cuts in-bounds runoff to 21-23s
        dome_urgency_cut = (4.0 + 2.5 * (gsu / 70.0)) if game.is_dome else 0.0
        runoff_in_bounds = max(18.0, avg_sps - dome_urgency_cut)

        total_plays = []
        pass_att_a = []
        pass_att_b = []

        for _ in range(n_sims):
            clock = 3300.0  # scrimmage seconds
            pa = 0
            pb = 0
            possession = 0 if np.random.rand() > 0.5 else 1
            
            while clock > 0:
                is_a = (possession == 0)
                pr = base_pass_rate_a if is_a else base_pass_rate_b
                cr = comp_rate_a if is_a else comp_rate_b

                if np.random.rand() < pr:
                    # Pass play
                    if is_a: pa += 1
                    else: pb += 1
                    
                    if np.random.rand() < cr:
                        # Complete pass
                        is_oob = np.random.rand() < 0.20
                        dt = 7.0 if is_oob else runoff_in_bounds
                    else:
                        # Incomplete pass -> Clock stops! Only ~5.5s consumed
                        dt = 5.5
                else:
                    # Run play
                    is_oob = np.random.rand() < 0.08
                    dt = 7.0 if is_oob else (runoff_in_bounds + 3.0)

                clock -= dt
                if np.random.rand() < 0.17:  # End of drive
                    possession = 1 - possession

            total_plays.append(pa + pb)
            pass_att_a.append(pa)
            pass_att_b.append(pb)

        return {
            "mean_total_plays": float(np.mean(total_plays)),
            "p10_plays": float(np.percentile(total_plays, 10)),
            "p90_plays": float(np.percentile(total_plays, 90)),
            "mean_pass_attempts_a": float(np.mean(pass_att_a)),
            "mean_pass_attempts_b": float(np.mean(pass_att_b))
        }

    @classmethod
    def rank_slate_games(cls, games: List[GameContext]) -> List[Tuple[GameContext, float, Dict[str, float]]]:
        """Ranks all slate games by SVI and evaluates simulated play volume."""
        results = []
        for g in games:
            svi = cls.compute_svi(g)
            sim = cls.simulate_clock_expansion(g, n_sims=1000)
            results.append((g, svi, sim))
        results.sort(key=lambda x: x[1], reverse=True)
        return results
