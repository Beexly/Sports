"""
Alpha WR Target Ceiling & Duress Funnel Engine
Formulates:
- Weighted Opportunity Rating (WOPR = 1.5 * TargetShare + 0.7 * AirYardShare)
- Targets Per Route Run (TPRR) & First-Read Target Share (FRTS)
- Pocket Collapse Hazard & Target Density Under Duress (TDUD)
- Ceiling Funnel Score (CFS) for high-stakes GPP tournaments
- Two-Regime Beta-Binomial / Heavy-Tailed Yardage Simulation for 95th Percentile Ceilings
"""

from __future__ import annotations
import math
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any

@dataclass(frozen=True)
class ReceiverProfile:
    player_id: str
    name: str
    team: str
    target_share: float          # Season / rolling target share (0.10 to 0.35)
    air_yard_share: float        # Season / rolling air yard share (0.10 to 0.48)
    first_read_share: float      # First-read target % (0.15 to 0.42)
    tprr: float                  # Targets per route run (0.12 to 0.38)
    route_participation: float   # % of team pass plays running route (0.60 to 0.98)
    adot: float                  # Average depth of target in yards (5.0 to 16.0)
    catch_rate: float            # Catch rate (0.55 to 0.78)
    yards_per_rec_mu: float      # Log-normal mu for YPR (~2.4)
    yards_per_rec_sigma: float   # Log-normal sigma for YPR (~0.55)
    red_zone_share: float        # Target share inside the 20 (0.10 to 0.38)
    slot_rate: float = 0.35      # Alignment in slot vs boundary

@dataclass(frozen=True)
class OpponentDuressContext:
    opp_team: str
    edge_prwr: float             # Edge Pass Rush Win Rate (0.15 to 0.32)
    ot_pbwr: float               # Opposing OT Pass Block Win Rate (0.55 to 0.85)
    blitz_rate: float            # Defensive blitz frequency (0.15 to 0.45)
    qb_time_to_throw: float      # QB baseline time to throw (2.40s to 3.10s)
    team_projected_dropbacks: float # Team pass attempts / dropbacks (28 to 48)
    spread: float                # Spread (+ means underdog -> negative game script)
    team_hhi: float              # Team target concentration HHI (0.10 to 0.22)

class AlphaTargetCeilingEngine:
    """Evaluates tournament-winning right-tail target upside for WRs/TEs."""

    @staticmethod
    def calculate_wopr(target_share: float, air_yard_share: float) -> float:
        """
        Weighted Opportunity Rating (WOPR):
        WOPR = 1.5 * TargetShare + 0.7 * AirYardShare
        Elite alpha threshold: WOPR >= 0.70.
        """
        return 1.5 * target_share + 0.7 * air_yard_share

    @staticmethod
    def calculate_pocket_collapse_prob(context: OpponentDuressContext) -> float:
        """
        Calculates probability of pocket collapse / duress within 2.30s:
        p_duress = sigmoid( 4.5 * (edge_prwr - ot_pbwr + 0.45) + 1.2 * blitz_rate - 0.8 * (qb_time_to_throw - 2.65) )
        """
        trench_delta = context.edge_prwr - context.ot_pbwr + 0.45
        z = 4.5 * trench_delta + 1.2 * context.blitz_rate - 0.8 * (context.qb_time_to_throw - 2.65)
        p = 1.0 / (1.0 + math.exp(-z))
        return float(np.clip(p, 0.15, 0.65))

    @staticmethod
    def calculate_duress_funnel_ratio(rec: ReceiverProfile) -> float:
        """
        Duress Funnel Ratio (psi):
        When pocket collapses, QBs abandon progressions 3-4 and lock onto their alpha security blanket.
        Alpha receivers with high first-read share and low/intermediate aDOT get target SURGES (psi > 1.30).
        Deep-threat-only WRs with high aDOT lose targets under duress (psi < 0.80).
        """
        base_psi = 1.0
        # High first read share creates panic lock-in
        base_psi += 1.2 * max(0.0, rec.first_read_share - 0.22)
        
        # Intermediate/quick separation routes thrive under duress
        if rec.adot < 9.5:
            base_psi += 0.25
        elif rec.adot > 13.5:
            base_psi -= 0.35  # Deep routes cannot develop before pocket collapse
            
        # Target per route run confidence
        base_psi += 0.8 * max(0.0, rec.tprr - 0.22)
        return float(np.clip(base_psi, 0.60, 2.20))

    @classmethod
    def calculate_ceiling_funnel_score(cls, rec: ReceiverProfile, ctx: OpponentDuressContext) -> Dict[str, float]:
        """
        Computes the Ceiling Funnel Score (CFS) on a 0-100 scale.
        CFS measures the probability that this receiver monopolizes targets in a high-volume ceiling environment.
        """
        wopr = cls.calculate_wopr(rec.target_share, rec.air_yard_share)
        p_duress = cls.calculate_pocket_collapse_prob(ctx)
        psi = cls.calculate_duress_funnel_ratio(rec)

        # 1. Earning Base (E_base)
        e_base = (0.40 * min(1.5, wopr / 0.70) +
                  0.35 * min(1.5, rec.tprr / 0.30) +
                  0.25 * min(1.5, rec.first_read_share / 0.35))

        # 2. Target Tree Concentration Multiplier (C_tree)
        c_tree = 1.0 + 1.25 * max(0.0, ctx.team_hhi - 0.14)

        # 3. Duress Funnel Leverage (D_mult)
        d_mult = 1.0 + 1.20 * p_duress * (psi - 1.0)

        # 4. Game Script & Pace Volume Factor (V_pace)
        spread_factor = 1.0 + 0.025 * min(14.0, max(0.0, ctx.spread))
        v_pace = ((ctx.team_projected_dropbacks / 35.0) ** 0.85) * spread_factor * rec.route_participation

        cfs_raw = e_base * c_tree * d_mult * v_pace
        cfs = 100.0 / (1.0 + math.exp(-3.2 * (cfs_raw - 1.35)))

        return {
            "cfs": round(float(cfs), 1),
            "wopr": round(float(wopr), 3),
            "p_duress": round(float(p_duress), 3),
            "psi_funnel": round(float(psi), 2),
            "cfs_raw": round(float(cfs_raw), 3)
        }

    @classmethod
    def simulate_gpp_right_tail(cls, rec: ReceiverProfile, ctx: OpponentDuressContext,
                                n_sims: int = 25000) -> Dict[str, Any]:
        """
        Two-Regime Beta-Binomial / Heavy-Tailed Yardage Monte Carlo Simulation:
        Partitions dropbacks into Clean vs. Duress states.
        Simulates target distribution, catches, receiving yards with Pareto right tail,
        and touchdown probability to generate the exact 90th, 95th, and 99th percentile GPP ceilings.
        """
        np.random.seed(42)
        p_duress = cls.calculate_pocket_collapse_prob(ctx)
        psi = cls.calculate_duress_funnel_ratio(rec)

        # Solve for clean and duress target shares:
        # target_share = (1 - p)*pi_clean + p*psi*pi_clean
        pi_clean = rec.target_share / (1.0 - p_duress + p_duress * psi)
        pi_duress = pi_clean * psi

        # Negative game script increases dropback volume
        spread_mult = 1.0 + 0.03 * max(0.0, ctx.spread)
        lambda_db = ctx.team_projected_dropbacks * spread_mult * rec.route_participation
        sim_db = np.random.poisson(lambda_db, size=n_sims)

        # State-dependent dropback partitioning
        sim_duress_db = np.random.binomial(sim_db, p_duress)
        sim_clean_db = sim_db - sim_duress_db

        # Beta-binomial target draws (modeling game-to-game target variance)
        conc = 22.0
        p_c = np.random.beta(conc * pi_clean, conc * (1.0 - pi_clean), size=n_sims)
        p_d = np.random.beta(conc * pi_duress, conc * (1.0 - pi_duress), size=n_sims)

        t_clean = np.random.binomial(sim_clean_db, p_c)
        t_duress = np.random.binomial(sim_duress_db, p_d)
        total_targets = t_clean + t_duress

        # Catch outcomes
        receptions = np.random.binomial(total_targets, rec.catch_rate)

        # Receiving Yards: Log-normal per catch with 8% Pareto blowout tail
        yards = np.zeros(n_sims)
        for i in range(n_sims):
            r = receptions[i]
            if r > 0:
                catch_yds = np.random.lognormal(mean=rec.yards_per_rec_mu, sigma=rec.yards_per_rec_sigma, size=r)
                # Explosive play booster (8% of catches break free for 30-70 yds)
                explosives = np.random.rand(r) < 0.08
                catch_yds[explosives] += np.random.uniform(25.0, 55.0, size=np.sum(explosives))
                yards[i] = np.sum(catch_yds)

        # Touchdowns: Red zone target volume Poisson process
        rz_targets = np.random.binomial(total_targets, rec.red_zone_share)
        td_prob_per_rz = 0.28
        touchdowns = np.random.binomial(rz_targets, td_prob_per_rz)
        # Deep TDs on explosive plays
        deep_tds = np.random.binomial(receptions, 0.035 if rec.adot > 11.0 else 0.015)
        total_tds = touchdowns + deep_tds

        # DraftKings Scoring: 1 pt/rec, 0.1 pt/yd, 6 pt/TD, +3 pt 100-yd bonus
        dk_points = receptions * 1.0 + yards * 0.10 + total_tds * 6.0 + (yards >= 100.0) * 3.0

        cfs_info = cls.calculate_ceiling_funnel_score(rec, ctx)

        return {
            "player": rec.name,
            "cfs": cfs_info["cfs"],
            "wopr": cfs_info["wopr"],
            "psi_funnel": cfs_info["psi_funnel"],
            "targets": {
                "median": float(np.median(total_targets)),
                "mean": float(np.mean(total_targets)),
                "p75": float(np.percentile(total_targets, 75)),
                "p90": float(np.percentile(total_targets, 90)),
                "p95": float(np.percentile(total_targets, 95)),
                "p99": float(np.percentile(total_targets, 99)),
                "max": int(np.max(total_targets))
            },
            "receptions": {
                "median": float(np.median(receptions)),
                "p90": float(np.percentile(receptions, 90)),
                "p95": float(np.percentile(receptions, 95))
            },
            "yards": {
                "median": float(np.median(yards)),
                "p90": float(np.percentile(yards, 90)),
                "p95": float(np.percentile(yards, 95))
            },
            "dk_points": {
                "median": float(np.median(dk_points)),
                "mean": float(np.mean(dk_points)),
                "p75": float(np.percentile(dk_points, 75)),
                "p90": float(np.percentile(dk_points, 90)),
                "p95": float(np.percentile(dk_points, 95)),
                "p99": float(np.percentile(dk_points, 99))
            }
        }
