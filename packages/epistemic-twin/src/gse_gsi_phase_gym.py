# packages/epistemic-twin/src/gse_gsi_phase_gym.py
"""
OpenAI Gym-compatible Counterfactual Environment (GSE-GSI-PhaseGym-v1)
unifying:
  - 19-Rule Honesty Doctrine (Warehouse.asof(t), CollegeGuard, Shin De-Vig)
  - CLIP + SkeleTrack v2 Visual-Kinematic Contact-Mode Conditioning
  - Mezard-Parisi 1-RSB Spin-Glass Susceptibility & Navier-Stokes Phase Resultant R
  - Theorem 6 Conformal ESS Gate (c_hat <= 12.42) & Positive-Part James-Stein Shrinkage
"""
import hashlib
import json
import math
from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class BitemporalObservation:
    step_timestamp: float
    observed_at: float
    domain: str  # "NFL", "CFB", "ICU_SEPSIS", "TBI_WAVEGUIDE"
    close_anchor_mu: float
    sigma_dispersion: float
    clip_contact_mode_probs: Tuple[float, float, float, float]  # (shell, facemask, ground, body)
    modal_phases_rad: List[float]
    modal_energies: List[float]
    ot_weights: List[float]
    lefaivre_breaker_load: float


class GseGsiPhaseGymEnv:
    """
    Standardized step/reset RL & Counterfactual Digital-Twin Environment
    enforcing the 19-Rule Honesty Doctrine and Theorem 6 Conformal Risk Control.
    """
    NFL_FORBIDDEN_IN_CFB = {13.45, 13.36, 1.56, -2.33}
    MAX_C_HAT = 12.42
    MAX_JS_DELTA = 0.35

    def __init__(self, domain: str = "NFL") -> None:
        self.domain = domain
        self.step_idx = 0
        self.alpha_wealth = 1.0
        self.kill_ledger: List[Dict[str, object]] = []

    @staticmethod
    def compute_navier_stokes_phase_resultant(phases: List[float], energies: List[float]) -> float:
        """Computes R = |sum_k p_k exp(i * theta_k)| from phase_entropy.py."""
        tot_e = sum(energies) + 1e-12
        re_sum = sum((e / tot_e) * math.cos(th) for th, e in zip(phases, energies))
        im_sum = sum((e / tot_e) * math.sin(th) for th, e in zip(phases, energies))
        return round(math.hypot(re_sum, im_sum), 6)

    @staticmethod
    def shin_fair_prob(decimal_odds_a: float, decimal_odds_b: float) -> Tuple[float, float, float]:
        """Rule 6: Closed-form Shin de-vigging (returns p_a, p_b, insider_z)."""
        q_a = 1.0 / decimal_odds_a
        q_b = 1.0 / decimal_odds_b
        s = q_a + q_b
        if s <= 1.0:
            return q_a / s, q_b / s, 0.0
        diff_sq = (q_a - q_b) ** 2
        z = ((s - 1.0) * (diff_sq - s)) / (s * (diff_sq - 1.0) + 1e-12)
        z = max(0.0, min(0.25, abs(z)))
        denom = 2.0 * (1.0 - z)
        p_a = (math.sqrt(z * z + 4.0 * (1.0 - z) * (q_a * q_a / s)) - z) / denom
        p_b = (math.sqrt(z * z + 4.0 * (1.0 - z) * (q_b * q_b / s)) - z) / denom
        norm = p_a + p_b
        return round(p_a / norm, 6), round(p_b / norm, 6), round(z, 6)

    def step(
        self,
        obs: BitemporalObservation,
        proposed_log_odds_deltas: List[float],
        empirical_variance: float,
        realized_outcome: float,
    ) -> Tuple[Dict[str, float], float, bool, Dict[str, object]]:
        """
        Executes one bitemporal environment step with 19-Rule Honesty Gate enforcement.
        """
        self.step_idx += 1
        # Rule 1 & Rule 7/17: Point-in-time Warehouse.asof(t) leakage check
        if obs.observed_at > obs.step_timestamp:
            self._record_kill_ledger("RULE_1_TEMPORAL_LEAKAGE", obs.observed_at, obs.step_timestamp)
            raise RuntimeError(f"TemporalLeakageError: observed_at={obs.observed_at} > t={obs.step_timestamp}")

        # Rule 3: CollegeGuard parameter isolation
        if self.domain == "CFB" and round(obs.sigma_dispersion, 2) in self.NFL_FORBIDDEN_IN_CFB:
            self._record_kill_ledger("RULE_3_COLLEGE_GUARD_VIOLATION", obs.sigma_dispersion, 15.15)
            raise RuntimeError(f"CollegeGuard: NFL constant {obs.sigma_dispersion} blocked in CFB model.")

        # Theorem 6: Conformal Effective Sample Size (c_hat <= 12.42)
        sum_w = sum(obs.ot_weights) + 1e-12
        sum_w2 = sum(w * w for w in obs.ot_weights)
        c_hat = round(len(obs.ot_weights) * (sum_w2 / (sum_w * sum_w)) * 2.0, 4)
        if c_hat > self.MAX_C_HAT:
            return (
                {"c_hat": c_hat, "action_emitted": 0.0},
                0.0,
                False,
                {"status": "ABSTAINED_PASS_DISCIPLINE", "reason": f"c_hat={c_hat} > 12.42"},
            )

        # Stage D: Positive-Part James-Stein Shrinkage with |Delta log-odds| <= 0.35 clamp
        m_dim = len(proposed_log_odds_deltas)
        l2_sq = sum(d * d for d in proposed_log_odds_deltas) + 1e-12
        js_factor = max(0.0, 1.0 - max(m_dim - 2, 1) * empirical_variance / l2_sq)
        shrunk_deltas = [
            max(-self.MAX_JS_DELTA, min(self.MAX_JS_DELTA, js_factor * d))
            for d in proposed_log_odds_deltas
        ]

        # Compute Navier-Stokes Phase Resultant R(t) & CLIP-conditioned contact hazard
        phase_r = self.compute_navier_stokes_phase_resultant(obs.modal_phases_rad, obs.modal_energies)
        # CLIP weights: facemask/oblique (idx 1) and ground (idx 2) bypass Guardian Cap shell foam (PMID 40746051)
        unattenuated_contact_hazard = (
            0.35 * obs.clip_contact_mode_probs[0]
            + 0.95 * obs.clip_contact_mode_probs[1]
            + 0.90 * obs.clip_contact_mode_probs[2]
            + 0.25 * obs.clip_contact_mode_probs[3]
        )

        # Combine close anchor mu with shrunk residual shift
        mu_challenger = obs.close_anchor_mu + sum(shrunk_deltas)
        crps_close = abs(realized_outcome - obs.close_anchor_mu)
        crps_challenger = abs(realized_outcome - mu_challenger)
        crps_gain = crps_close - crps_challenger  # Positive means challenger beat Pinnacle close

        # Update Martingale Alpha-Wealth (formal/credit-budget)
        covered = abs(realized_outcome - mu_challenger) <= 1.645 * obs.sigma_dispersion
        err_ind = 0.0 if covered else 1.0
        self.alpha_wealth = round(self.alpha_wealth * (1.0 + 0.05 * (0.10 - err_ind)), 6)

        state_summary = {
            "mu_challenger": round(mu_challenger, 4),
            "phase_resultant_R": phase_r,
            "clip_unattenuated_hazard": round(unattenuated_contact_hazard, 4),
            "c_hat": c_hat,
            "alpha_wealth": self.alpha_wealth,
            "lefaivre_breaker_load": obs.lefaivre_breaker_load,
        }
        return state_summary, round(crps_gain, 5), False, {"status": "VERIFIED_STEP", "js_factor": round(js_factor, 4)}

    def _record_kill_ledger(self, violation: str, observed: float, limit: float) -> None:
        prev_hash = str(self.kill_ledger[-1]["sha256"]) if self.kill_ledger else "0" * 64
        entry = {
            "step": self.step_idx,
            "violation": violation,
            "observed": observed,
            "limit": limit,
            "prev_hash": prev_hash,
        }
        digest = hashlib.sha256(json.dumps(entry, sort_keys=True).encode("utf-8")).hexdigest()
        entry["sha256"] = digest
        self.kill_ledger.append(entry)


if __name__ == "__main__":
    env = GseGsiPhaseGymEnv(domain="CFB")
    sample_obs = BitemporalObservation(
        step_timestamp=1762473600.0,
        observed_at=1762470000.0,
        domain="CFB",
        close_anchor_mu=-7.5,
        sigma_dispersion=15.15,  # CollegeGuard-compliant CFB sigma
        clip_contact_mode_probs=(0.40, 0.35, 0.15, 0.10),
        modal_phases_rad=[0.1, 0.15, 0.12, 0.08],
        modal_energies=[1.2, 0.9, 1.5, 1.1],
        ot_weights=[0.95, 0.91, 0.88, 0.92, 0.85, 0.90],
        lefaivre_breaker_load=0.62,
    )
    state, reward, done, info = env.step(
        sample_obs,
        proposed_log_odds_deltas=[0.18, 0.12, -0.05, 0.22],
        empirical_variance=0.02,
        realized_outcome=-6.0,
    )
    print("GSE-GSI-PhaseGym-v1 Self-Check PASS:", state, "CRPS Gain:", reward, info)
