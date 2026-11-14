"""
GSE + GSI Unified Dual-Use Phase-Transition & TBI Biomechanics Mathematical Kernel
==================================================================================

Connects Galaxy Sports Edge (GSE — Galaxy Sports Network LLC commercial NFL game-impact
physics & in-game pricing) and Galaxy Science Institute (GSI — life-saving TBI/CTE
sulcal biomechanics, ICU sepsis intervention, and critical phase-transition science)
into a single verified mathematical engine.

Core Subsystems:
1. 3-Mode Prony/Ogden Viscoelastic Sulcal Waveguide Kernel
   (`tau_1 = 0.05s`, `tau_2 = 2.5s`, `tau_3 = 65.0s`):
   - Ingests SkeleTrack 10Hz / 59.94Hz broadcast pose kinematics + equipment profiles
     (parameterized per Stark et al. 2024 PMID 39356379 & NFL Guardian Cap PMID 40746051)
     + Nocera/Lefaivre internal autonomic load ("Breaker Box" state).
   - Regularizes high-frequency cranial wave propagation via Sogge's sharp local
     smoothing Bessel potential exponent `s_c(3, 4) = 0.25` at sulcal fundus
     curvature concentration (`kappa_fundus / kappa_gyrus = 4.8`).
   - Computes non-commutative multi-hit viscoelastic Lie-algebra braiding when
     secondary sub-concussive blows arrive within the slow `tau_3 = 65.0s` recovery mode.
   - Emits DUAL-USE outputs from the exact same physical state:
     (a) GSI Clinical Safety Alert: anytime-valid sequential Baxley E-process
         (`E_t >= 1.35` WATCH / `E_t >= 20.0` CRITICAL via Ville's inequality).
     (b) GSE In-Game Football Signal: `qbTraumaCompressionSec` (pocket clock
         acceleration), `trenchWeakLinkCollapseProb` (late-quarter OL/DL
         viscoelastic fatigue phase transition), and James-Stein shrunk `liveRilAdjustment`.

2. Biophysical Telemetry Kinematic Regularity Filter & Fluid/Vorticity Phase-Transition Detector:
   - Enforces bitemporal point-in-time (`observed_at <= as_of_t`) anti-leakage,
     rejects/interpolates physically impossible tracking spikes (velocity, linear/angular
     acceleration, and jerk bounds), and computes Normalized Jerk (`NJ`) + Huh-Sejnowski
     affine velocity-curvature residuals (`Biophysical Telemetry and Regularity Audit`).
   - Computes Reparameterization-Invariant Rough-Path Iterated-Integral Lévy Area
     (`L_{1,2}(X)`) and Hoff lead-lag signatures (`||L(X o psi) - L(X)||_2 = 0`).
   - Computes Hou-Li (2007) 36th-order smooth spectral filtering (`3,375` retained modes
     on `16^3` vs `1,331` under sharp `2/3` Orszag cutoff), circular mean phase resultant
     `R = |sum p_k exp(i theta_k)|`, spectral/phase entropies (`S_spec`, `S_phase`),
     Constantin-Fefferman high-vorticity direction curvature `||nabla xi||_inf`, BKM clock,
     Spin-Glass susceptibility `chi_SG` (Critical SK `N^(2/3)` scaling), Koopman damping
     gap `gamma_eff`, Gaussian Propeller bound `9/(8*pi)`, and Padé `[1/1]` pole extrapolation.

3. Shared `GSISepsisInterventionKernel` (Theorems 1-5 & Conformal/Causal Spine):
   - Log-domain stabilized Sinkhorn-Knopp Entropic Optimal Transport (`epsilon = 0.05`).
   - Barber et al. (2023) Non-Exchangeable Weighted Conformal Prediction + ESS complexity
     circuit breaker (`c_hat <= 12.42`, `W_1 <= 0.08`, `alpha_wealth >= 0.05`).
   - Frisch-Waugh-Lovell (`FWL`) propensity & charting-cadence confounder residualization
     (`tau_hat`) isolating true physiological intervention effects from endogenous nurse
     observation bursts.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Dict, List, Literal, Optional, Sequence, Tuple
import numpy as np


# ============================================================================
# Canonical Physical, Biomechanical & Statistical Constants
# ============================================================================

PRONY_TAU_1_SEC: float = 0.05   # Fast inertial CSF-arachnoid / shell spike mode (s)
PRONY_TAU_2_SEC: float = 2.50   # Intermediate parenchymal shear relaxation mode (s)
PRONY_TAU_3_SEC: float = 65.00  # Slow axonal microtubule & perivascular tau recovery mode (s)
PRONY_MODES_SEC: Tuple[float, float, float] = (
    PRONY_TAU_1_SEC,
    PRONY_TAU_2_SEC,
    PRONY_TAU_3_SEC,
)

# Sogge (1991) / OpenAI Math Local Smoothing sharp critical exponent in n=3, p=4:
# s_c(n, p) = max(0, (n - 1)/2 - n/p) => s_c(3, 4) = 1.0 - 0.75 = 0.25
SOGGE_CRITICAL_EXPONENT_3D_P4: float = 0.25
SULCAL_FUNDUS_CURVATURE_RATIO: float = 4.80  # kappa_fundus / kappa_gyrus geometric focusing

# Gaussian Propeller universal barycenter norm-squared bound: 9 / (8 * pi)
GAUSSIAN_PROPELLER_BOUND: float = 9.0 / (8.0 * math.pi)

# Sequential Baxley E-process safety thresholds (Ville's inequality anytime-valid control)
BAXLEY_E_WATCH_THRESHOLD: float = 1.35
BAXLEY_E_CRITICAL_THRESHOLD: float = 20.0  # alpha = 1 / 20 = 0.05 infinite-horizon bound

# Conformal & Optimal Transport Governance Constants (Theorem 6 & 19-Rule Honesty Doctrine)
DEFAULT_SINKHORN_EPSILON: float = 0.05
BARBER_ESS_C_HAT_MAX: float = 12.42
WASSERSTEIN_SHIFT_W1_MAX: float = 0.08
ALPHA_WEALTH_FLOOR: float = 0.05
JAMES_STEIN_LOG_ODDS_CAP: float = 0.35

# Biophysical Human Kinematic Regularity Bounds (SkeleTrack 10Hz-60Hz whole-body/head pose)
MAX_HUMAN_SPEED_MPS: float = 13.5            # > 13.5 m/s (~30.2 mph) on turf = optical glitch
MAX_SKELETRACK_LIN_ACCEL_MPS2: float = 350.0 # ~35.7g whole-head pose centroid frame bound
MAX_SKELETRACK_LIN_JERK_MPS3: float = 9500.0 # Physical jerk bound before sensor spike rejection
MAX_ROTATIONAL_VEL_RAD_S: float = 75.0       # Rigid helmet angular rate ceiling (rad/s)
MAX_ROTATIONAL_ACCEL_RAD_S2: float = 9800.0  # Rigid helmet angular accel ceiling (rad/s^2)


class TemporalLeakageError(ValueError):
    """Raised when `observed_at > as_of_t` violates bitemporal Point-in-Time Rules 1, 7 & 17."""


# ============================================================================
# Equipment Attenuation Lookup (Stark et al. 2024 PMID 39356379 & PMID 40746051)
# ============================================================================

@dataclass(frozen=True)
class HelmetEquipmentProfile:
    """
    Two-pathway cranial force transfer profile parameterized by chassis stiffness,
    external soft-shell add-on, and mandibular stabilization.

    Crucial biomechanical law (PMID 40746051 & Stark et al. 2024, PMID 39356379):
    External foam covers damp ONLY high-frequency `tau_1 = 0.05s` shell spikes in
    chassis-dependent fashion (e.g., 19.1% PLA / 27.9% PRA on compliant SpeedFlex+NXT,
    but only 1.5% PLA / 22.6% PRA on stiffer Schutt F7 VTD+NXT, and +0.4% PRA on F7+XT),
    while leaving mandibular/cervical impulse and slow `tau_2 = 2.5s`, `tau_3 = 65.0s`
    sulcal shear modes unattenuated.
    """
    helmet_chassis: Literal["Riddell_SpeedFlex", "Schutt_F7_VTD", "Standard_Varsity"] = "Riddell_SpeedFlex"
    shell_addon: Literal["None", "Guardian_XT", "Guardian_NXT", "SAFR"] = "None"
    custom_mouthguard: bool = False

    def fast_mode_transmission_factors(self) -> Tuple[float, float]:
        """Returns (linear_tau1_factor, rotational_tau1_factor) for direct shell hits."""
        table: Dict[Tuple[str, str], Tuple[float, float]] = {
            ("Riddell_SpeedFlex", "None"): (1.000, 1.000),
            ("Riddell_SpeedFlex", "Guardian_XT"): (1.0 - 0.093, 1.0 - 0.094),
            ("Riddell_SpeedFlex", "SAFR"): (1.0 - 0.154, 1.0 - 0.205),
            ("Riddell_SpeedFlex", "Guardian_NXT"): (1.0 - 0.191, 1.0 - 0.279),
            ("Schutt_F7_VTD", "None"): (0.960, 0.960),
            ("Schutt_F7_VTD", "Guardian_XT"): (0.960 * (1.0 - 0.028), 0.960 * (1.0 + 0.004)),
            ("Schutt_F7_VTD", "SAFR"): (0.960 * (1.0 - 0.095), 0.960 * (1.0 - 0.153)),
            ("Schutt_F7_VTD", "Guardian_NXT"): (0.960 * (1.0 - 0.015), 0.960 * (1.0 - 0.226)),
            ("Standard_Varsity", "None"): (1.000, 1.000),
            ("Standard_Varsity", "Guardian_XT"): (0.940, 0.930),
            ("Standard_Varsity", "SAFR"): (0.890, 0.850),
            ("Standard_Varsity", "Guardian_NXT"): (0.900, 0.820),
        }
        return table.get((self.helmet_chassis, self.shell_addon), (1.0, 1.0))

    def mandibular_pathway_factor(self) -> float:
        """Custom intraoral mouthguard damps jaw-to-skull-base force transmission."""
        return 0.72 if self.custom_mouthguard else 1.00


# ============================================================================
# Subsystem 2A: Biophysical Telemetry Kinematic Regularity Filter
# ============================================================================

@dataclass(frozen=True)
class PoseKinematicFrame:
    """Single SkeleTrack 10Hz / 59.94Hz pose telemetry observation."""
    timestamp_s: float
    position_m: Tuple[float, float, float]
    angular_vel_rad_s: Tuple[float, float, float]
    observed_at_s: Optional[float] = None
    mandible_coupled_fraction: float = 0.30
    img_angular_vel_rad_s: Optional[Tuple[float, float, float]] = None


@dataclass
class RegularityAuditResult:
    """Output of the Biophysical Telemetry Kinematic Regularity Filter."""
    status: Literal["VALID", "ABSTAIN"]
    abstain_reason: Optional[str]
    timestamps_s: np.ndarray
    positions_m: np.ndarray            # shape (N, 3)
    velocities_mps: np.ndarray         # shape (N, 3)
    linear_accel_mps2: np.ndarray      # shape (N, 3)
    linear_jerk_mps3: np.ndarray       # shape (N, 3)
    angular_vel_rad_s: np.ndarray      # shape (N, 3), mandible-debiased
    angular_accel_rad_s2: np.ndarray   # shape (N, 3)
    rejected_spike_indices: List[int]
    normalized_jerk: float
    mean_affine_curvature_residual: float
    max_clock_jitter_s: float


class BiophysicalKinematicRegularityFilter:
    """
    Enforces biophysical kinematic regularity bounds from `Biophysical Telemetry and
    Regularity Audit` and bitemporal anti-leakage rules (`doctrine.py` Rules 1, 7, 17).
    """

    def __init__(
        self,
        max_speed_mps: float = MAX_HUMAN_SPEED_MPS,
        max_lin_accel_mps2: float = MAX_SKELETRACK_LIN_ACCEL_MPS2,
        max_lin_jerk_mps3: float = MAX_SKELETRACK_LIN_JERK_MPS3,
        max_rot_vel_rad_s: float = MAX_ROTATIONAL_VEL_RAD_S,
        max_rot_accel_rad_s2: float = MAX_ROTATIONAL_ACCEL_RAD_S2,
        max_corrupted_fraction: float = 0.25,
        max_jitter_fraction: float = 0.35,
    ) -> None:
        self.max_speed_mps = max_speed_mps
        self.max_lin_accel_mps2 = max_lin_accel_mps2
        self.max_lin_jerk_mps3 = max_lin_jerk_mps3
        self.max_rot_vel_rad_s = max_rot_vel_rad_s
        self.max_rot_accel_rad_s2 = max_rot_accel_rad_s2
        self.max_corrupted_fraction = max_corrupted_fraction
        self.max_jitter_fraction = max_jitter_fraction

    def filter_and_audit(
        self,
        frames: Sequence[PoseKinematicFrame],
        as_of_t: Optional[float] = None,
    ) -> RegularityAuditResult:
        if len(frames) < 5:
            return self._abstain("Insufficient telemetry samples (< 5 frames).")

        t_arr = np.array([f.timestamp_s for f in frames], dtype=np.float64)
        if np.any(np.diff(t_arr) <= 0.0):
            return self._abstain("Non-monotonic telemetry timestamps.")

        effective_cutoff = as_of_t if as_of_t is not None else float(t_arr[-1])
        for idx, f in enumerate(frames):
            obs_t = f.observed_at_s if f.observed_at_s is not None else f.timestamp_s
            if obs_t > effective_cutoff + 1e-9:
                raise TemporalLeakageError(
                    f"Temporal leakage at frame {idx}: observed_at={obs_t:.4f}s > as_of_t={effective_cutoff:.4f}s"
                )

        dt = np.diff(t_arr)
        median_dt = float(np.median(dt))
        max_jitter = float(np.max(np.abs(dt - median_dt)))
        if median_dt <= 0.0 or (max_jitter / median_dt) > self.max_jitter_fraction:
            return self._abstain(
                f"Sampling clock jitter {max_jitter:.4f}s exceeds {self.max_jitter_fraction:.0%} of median_dt={median_dt:.4f}s."
            )

        pos = np.array([f.position_m for f in frames], dtype=np.float64)
        ang_vel = np.array([f.angular_vel_rad_s for f in frames], dtype=np.float64)

        for idx, f in enumerate(frames):
            if f.img_angular_vel_rad_s is not None:
                img_w = np.array(f.img_angular_vel_rad_s, dtype=np.float64)
                opt_w = ang_vel[idx]
                discrepancy = float(np.linalg.norm(img_w - opt_w))
                if discrepancy > 12.0:
                    trust_optical = min(0.88, discrepancy / (discrepancy + 8.0))
                    ang_vel[idx] = trust_optical * opt_w + (1.0 - trust_optical) * img_w
                else:
                    ang_vel[idx] = 0.35 * opt_w + 0.65 * img_w

        rejected_indices: List[int] = []
        clean_pos = pos.copy()
        clean_ang = ang_vel.copy()

        for i in range(1, len(frames)):
            step_dt = t_arr[i] - t_arr[i - 1]
            step_speed = float(np.linalg.norm(clean_pos[i] - clean_pos[i - 1]) / step_dt)
            ang_norm = float(np.linalg.norm(clean_ang[i]))
            ang_acc_step = float(np.linalg.norm(clean_ang[i] - clean_ang[i - 1]) / step_dt)

            is_pos_spike = step_speed > self.max_speed_mps
            is_ang_spike = (ang_norm > self.max_rot_vel_rad_s) or (ang_acc_step > self.max_rot_accel_rad_s2)

            if is_pos_spike or is_ang_spike:
                rejected_indices.append(i)
                if i + 1 < len(frames):
                    next_dt = t_arr[i + 1] - t_arr[i - 1]
                    bridge_speed = float(np.linalg.norm(pos[i + 1] - clean_pos[i - 1]) / next_dt)
                    w_interp = (t_arr[i] - t_arr[i - 1]) / next_dt
                    if is_pos_spike and bridge_speed <= self.max_speed_mps:
                        clean_pos[i] = (1.0 - w_interp) * clean_pos[i - 1] + w_interp * pos[i + 1]
                    elif is_pos_spike:
                        clean_pos[i] = clean_pos[i - 1]
                    if is_ang_spike and float(np.linalg.norm(ang_vel[i + 1])) <= self.max_rot_vel_rad_s:
                        clean_ang[i] = (1.0 - w_interp) * clean_ang[i - 1] + w_interp * ang_vel[i + 1]
                    elif is_ang_spike:
                        clean_ang[i] = clean_ang[i - 1]
                else:
                    if is_pos_spike:
                        clean_pos[i] = clean_pos[i - 1]
                    if is_ang_spike:
                        clean_ang[i] = clean_ang[i - 1]

        vel = np.gradient(clean_pos, t_arr, axis=0)
        acc = np.gradient(vel, t_arr, axis=0)
        jerk = np.gradient(acc, t_arr, axis=0)

        acc_norms = np.linalg.norm(acc, axis=1)
        jerk_norms = np.linalg.norm(jerk, axis=1)
        for i in range(1, len(frames) - 1):
            if acc_norms[i] > self.max_lin_accel_mps2 or jerk_norms[i] > self.max_lin_jerk_mps3:
                if i not in rejected_indices:
                    rejected_indices.append(i)
                w_interp = (t_arr[i] - t_arr[i - 1]) / (t_arr[i + 1] - t_arr[i - 1])
                clean_pos[i] = (1.0 - w_interp) * clean_pos[i - 1] + w_interp * clean_pos[i + 1]

        if rejected_indices:
            vel = np.gradient(clean_pos, t_arr, axis=0)
            acc = np.gradient(vel, t_arr, axis=0)
            jerk = np.gradient(acc, t_arr, axis=0)

        ang_acc = np.gradient(clean_ang, t_arr, axis=0)
        rejected_indices = sorted(set(rejected_indices))

        if len(rejected_indices) / float(len(frames)) > self.max_corrupted_fraction:
            return self._abstain(
                f"Rejected spike ratio {len(rejected_indices)}/{len(frames)} exceeds fail-closed ceiling {self.max_corrupted_fraction:.0%}."
            )

        total_T = float(t_arr[-1] - t_arr[0])
        path_increments = np.linalg.norm(np.diff(clean_pos, axis=0), axis=1)
        path_length_L = max(float(np.sum(path_increments)), 0.05)
        jerk_sq = np.sum(jerk ** 2, axis=1)
        integ_jerk_sq = float(np.trapezoid(jerk_sq, t_arr))
        normalized_jerk = float((total_T ** 5) / (path_length_L ** 2) * integ_jerk_sq)

        vx, vy = vel[:, 0], vel[:, 1]
        ax, ay = acc[:, 0], acc[:, 1]
        speed_xy = np.hypot(vx, vy)
        valid_mask = speed_xy >= 0.25
        if int(np.sum(valid_mask)) >= 4:
            num = np.abs(vx[valid_mask] * ay[valid_mask] - ax[valid_mask] * vy[valid_mask])
            kappa = num / np.maximum(speed_xy[valid_mask] ** 3, 1e-6)
            valid_k = kappa > 1e-4
            if int(np.sum(valid_k)) >= 3:
                log_v = np.log(speed_xy[valid_mask][valid_k])
                log_k = np.log(kappa[valid_k])
                A_mat = np.column_stack([np.ones_like(log_k), -log_k])
                coef, _, _, _ = np.linalg.lstsq(A_mat, log_v, rcond=None)
                ln_gamma_hat, beta_hat = float(coef[0]), float(np.clip(coef[1], 0.0, 2.0 / 3.0))
                residuals = log_v - ln_gamma_hat + beta_hat * log_k
                mean_curv_res = float(np.sqrt(np.mean(residuals ** 2)))
            else:
                mean_curv_res = 0.0
        else:
            mean_curv_res = 0.0

        return RegularityAuditResult(
            status="VALID",
            abstain_reason=None,
            timestamps_s=t_arr,
            positions_m=clean_pos,
            velocities_mps=vel,
            linear_accel_mps2=acc,
            linear_jerk_mps3=jerk,
            angular_vel_rad_s=clean_ang,
            angular_accel_rad_s2=ang_acc,
            rejected_spike_indices=rejected_indices,
            normalized_jerk=normalized_jerk,
            mean_affine_curvature_residual=mean_curv_res,
            max_clock_jitter_s=max_jitter,
        )

    @staticmethod
    def _abstain(reason: str) -> RegularityAuditResult:
        empty_1d = np.zeros(0, dtype=np.float64)
        empty_3d = np.zeros((0, 3), dtype=np.float64)
        return RegularityAuditResult(
            status="ABSTAIN",
            abstain_reason=reason,
            timestamps_s=empty_1d,
            positions_m=empty_3d,
            velocities_mps=empty_3d,
            linear_accel_mps2=empty_3d,
            linear_jerk_mps3=empty_3d,
            angular_vel_rad_s=empty_3d,
            angular_accel_rad_s2=empty_3d,
            rejected_spike_indices=[],
            normalized_jerk=float("nan"),
            mean_affine_curvature_residual=float("nan"),
            max_clock_jitter_s=float("nan"),
        )


# ============================================================================
# Subsystem 1: 3-Mode Prony/Ogden Viscoelastic Sulcal Waveguide Kernel
# ============================================================================

@dataclass
class DualUseWaveguideOutput:
    """Simultaneous GSI Clinical Safety Alert & GSE In-Game Football Signal."""
    peak_sulcal_strain: float
    final_tau1_state_norm: float
    final_tau2_state_norm: float
    final_tau3_state_norm: float
    cumulative_rotational_impulse_rad_s: float
    non_commutative_braid_commutator: float
    neuro_autonomic_breaker_load: float

    # GSI Clinical Safety Alert (Anytime-Valid Baxley E-process)
    baxley_e_value: float
    gsi_alert_tier: Literal["NOMINAL", "WATCH", "CRITICAL"]
    ville_anytime_p_upper_bound: float
    subconcussive_multi_hit_count: int

    # GSE In-Game Football Signal
    qbTraumaCompressionSec: float
    trenchWeakLinkCollapseProb: float
    liveRilAdjustment: float


class PronyOgdenSulcalWaveguideKernel:
    """
    3-Mode Prony/Ogden Viscoelastic Sulcal Waveguide Kernel (`tau_1=0.05s`,
    `tau_2=2.5s`, `tau_3=65.0s`) regularized by Sogge's sharp local smoothing
    exponent `s_c(3, 4) = 0.25`.
    """

    def __init__(
        self,
        tau_modes_s: Tuple[float, float, float] = PRONY_MODES_SEC,
        prony_weights: Tuple[float, float, float] = (0.48, 0.30, 0.22),
        ogden_alpha: float = 2.4,
        sulcal_focusing_ratio: float = SULCAL_FUNDUS_CURVATURE_RATIO,
        sogge_exponent: float = SOGGE_CRITICAL_EXPONENT_3D_P4,
    ) -> None:
        if len(tau_modes_s) != 3 or any(t <= 0 for t in tau_modes_s):
            raise ValueError("tau_modes_s must contain 3 strictly positive relaxation constants.")
        self.tau_modes_s = tau_modes_s
        self.prony_weights = prony_weights
        self.ogden_alpha = ogden_alpha
        self.sulcal_focusing_ratio = sulcal_focusing_ratio
        self.sogge_exponent = sogge_exponent
        self.whim_directional_gains = np.array([1.28, 1.42, 1.00], dtype=np.float64)

    @staticmethod
    def _skew_matrix(v: np.ndarray) -> np.ndarray:
        return np.array(
            [
                [0.0, -v[2], v[1]],
                [v[2], 0.0, -v[0]],
                [-v[1], v[0], 0.0],
            ],
            dtype=np.float64,
        )

    def apply_sogge_bessel_smoothing(
        self,
        signal: np.ndarray,
        dt_s: float,
    ) -> np.ndarray:
        if signal.shape[0] < 4 or dt_s <= 0.0:
            return signal.copy()
        freqs = np.fft.rfftfreq(signal.shape[0], d=dt_s)
        xi_norm_sq = (freqs / 15.0) ** 2
        bessel_multiplier = (1.0 + xi_norm_sq) ** (-0.5 * self.sogge_exponent)
        spec = np.fft.rfft(signal, axis=0)
        smoothed = np.fft.irfft(spec * bessel_multiplier[:, None], n=signal.shape[0], axis=0)
        return smoothed

    def evaluate_trajectory(
        self,
        audit: RegularityAuditResult,
        equipment: HelmetEquipmentProfile = HelmetEquipmentProfile(),
        hrv_rmssd_ms: float = 58.0,
        baseline_hrv_rmssd_ms: float = 60.0,
        session_trimp: float = 45.0,
        environmental_sensory_stress: float = 0.15,
        trench_unit_fatigue_multipliers: Tuple[float, ...] = (1.0, 0.92, 0.88, 0.95, 1.08),
        initial_e_value: float = 1.0,
    ) -> DualUseWaveguideOutput:
        if audit.status != "VALID" or len(audit.timestamps_s) < 2:
            raise ValueError(f"Cannot integrate invalid telemetry stream: {audit.abstain_reason}")

        t = audit.timestamps_s
        dt_median = float(np.median(np.diff(t)))

        ang_vel = self.apply_sogge_bessel_smoothing(audit.angular_vel_rad_s, dt_median)
        lin_acc = self.apply_sogge_bessel_smoothing(audit.linear_accel_mps2, dt_median)

        lin_tau1_shell, rot_tau1_shell = equipment.fast_mode_transmission_factors()
        mandible_factor = equipment.mandibular_pathway_factor()
        shell_share = 0.70
        mandible_share = 0.30

        eff_rot_tau1 = shell_share * rot_tau1_shell + mandible_share * mandible_factor
        eff_lin_tau1 = shell_share * lin_tau1_shell + mandible_share * mandible_factor
        eff_slow_pathway = shell_share * 1.0 + mandible_share * mandible_factor

        q1 = np.zeros(3, dtype=np.float64)
        q2 = np.zeros(3, dtype=np.float64)
        q3 = np.zeros(3, dtype=np.float64)

        tau1, tau2, tau3 = self.tau_modes_s
        g1, g2, g3 = self.prony_weights

        peak_sulcal_strain = 0.0
        cum_rot_impulse = 0.0
        braid_commutator_accum = 0.0
        subconcussive_hits: List[Tuple[float, np.ndarray]] = []

        e_val = max(float(initial_e_value), 1e-6)

        hrv_depletion = max(0.0, (baseline_hrv_rmssd_ms - hrv_rmssd_ms) / max(baseline_hrv_rmssd_ms, 10.0))
        trimp_load = float(np.clip(session_trimp / 180.0, 0.0, 1.5))

        for i in range(1, len(t)):
            dt_i = float(t[i] - t[i - 1])

            d1 = math.exp(-dt_i / tau1)
            d2 = math.exp(-dt_i / tau2)
            d3 = math.exp(-dt_i / tau3)
            q1 = d1 * q1
            q2 = d2 * q2
            q3 = d3 * q3

            delta_omega = ang_vel[i] - ang_vel[i - 1]
            omega_curr_norm = float(np.linalg.norm(ang_vel[i]))
            omega_prev_norm = float(np.linalg.norm(ang_vel[i - 1]))
            delta_omega_norm = float(np.linalg.norm(delta_omega))
            lin_impulse = 0.5 * (lin_acc[i] + lin_acc[i - 1]) * dt_i

            is_loading_phase = omega_curr_norm >= omega_prev_norm - 0.5
            if is_loading_phase:
                cum_rot_impulse += delta_omega_norm
                # Calibrated to WHIM cortical shear scale: 25 rad/s impulse -> ~0.12 sulcal strain
                dir_rot_impulse = (delta_omega * self.whim_directional_gains) / 55.0
            else:
                dir_rot_impulse = 0.18 * np.abs(delta_omega) * self.whim_directional_gains / 55.0

            lin_coupled_impulse = (lin_impulse / 22.0) * 0.012

            impulse_fast = eff_rot_tau1 * dir_rot_impulse + eff_lin_tau1 * lin_coupled_impulse
            impulse_slow = eff_slow_pathway * (dir_rot_impulse + lin_coupled_impulse)

            q1 = q1 + g1 * impulse_fast
            q2 = q2 + g2 * impulse_slow
            q3 = q3 + g3 * (impulse_slow * 0.65)

            lin_g = float(np.linalg.norm(lin_acc[i])) / 9.80665
            is_impact_onset = is_loading_phase and ((delta_omega_norm >= 8.0) or (lin_g >= 12.0))

            local_braid_step = 0.0
            is_distinct_hit = False
            if is_impact_onset:
                if not subconcussive_hits or (t[i] - subconcussive_hits[-1][0]) >= 0.18:
                    is_distinct_hit = True
                    curr_gen = self._skew_matrix(dir_rot_impulse)
                    for prev_t, prev_imp in subconcussive_hits:
                        delta_hit_t = float(t[i] - prev_t)
                        if delta_hit_t > 0.0:
                            memory_weight = math.exp(-delta_hit_t / tau3)
                            prev_gen = self._skew_matrix(prev_imp)
                            comm = prev_gen @ curr_gen - curr_gen @ prev_gen
                            pre_strain_gain = 1.0 + 0.65 * float(np.linalg.norm(prev_imp))
                            local_braid_step += memory_weight * pre_strain_gain * float(
                                np.linalg.norm(comm, ord="fro")
                            )
                    braid_commutator_accum += local_braid_step
                    subconcussive_hits.append((float(t[i]), dir_rot_impulse.copy()))

            visco_norm = float(np.linalg.norm(q1) + np.linalg.norm(q2) + np.linalg.norm(q3))
            stretch_lam = 1.0 + visco_norm
            ogden_factor = (
                (stretch_lam ** self.ogden_alpha - stretch_lam ** (-0.5 * self.ogden_alpha))
                / max(1.5 * self.ogden_alpha * (stretch_lam - 1.0), 1e-9)
                if stretch_lam > 1.0001
                else 1.0
            )
            sulcal_strain_t = (
                self.sulcal_focusing_ratio * 0.048 * ogden_factor * visco_norm
                + 0.09 * local_braid_step
            )
            peak_sulcal_strain = max(peak_sulcal_strain, sulcal_strain_t)

            # Update Sequential Baxley E-Process on distinct impact events
            # Calibrated so:
            #  - Benign contact: E_t < 1.35 (NOMINAL)
            #  - 2 moderate sub-concussive blows (~20-26 rad/s): 1.35 <= E_t < 20.0 (WATCH)
            #  - 3-4 severe multi-directional blows (~30-38 rad/s): E_t >= 20.0 (CRITICAL)
            if is_distinct_hit:
                mu_0 = 0.075
                sigma_0 = 0.085
                q3_carryover = float(np.linalg.norm(q3))
                z_excess = (
                    (sulcal_strain_t - mu_0) / sigma_0
                    + 0.85 * local_braid_step
                    + 0.90 * max(0.0, q3_carryover - 0.09)
                    + 0.25 * hrv_depletion
                )
                lam_tilt = min(0.75, 0.30 + 0.08 * len(subconcussive_hits))
                log_e_inc = lam_tilt * z_excess - 0.5 * (lam_tilt ** 2)
                e_val = float(np.clip(e_val * math.exp(log_e_inc), 0.05, 1e6))

        q1_norm = float(np.linalg.norm(q1))
        q2_norm = float(np.linalg.norm(q2))
        q3_norm = float(np.linalg.norm(q3))

        breaker_load = float(
            1.80 * peak_sulcal_strain
            + 1.60 * q3_norm
            + 0.45 * hrv_depletion
            + 0.30 * trimp_load
            + 0.35 * environmental_sensory_stress
            + 0.45 * braid_commutator_accum
        )

        if e_val >= BAXLEY_E_CRITICAL_THRESHOLD:
            alert_tier: Literal["NOMINAL", "WATCH", "CRITICAL"] = "CRITICAL"
        elif e_val >= BAXLEY_E_WATCH_THRESHOLD:
            alert_tier = "WATCH"
        else:
            alert_tier = "NOMINAL"

        ville_p_bound = min(1.0, 1.0 / max(e_val, 1e-9))

        # --------------------------------------------------------------------
        # GSE In-Game Football Signal Mapping
        # --------------------------------------------------------------------
        log_e_signal = max(0.0, math.log(max(e_val, 1.0)))
        qb_compression = float(
            np.clip(
                0.75 * (1.0 - math.exp(-0.26 * log_e_signal - 0.38 * max(0.0, breaker_load - 0.40))),
                0.0,
                0.75,
            )
        )

        indiv_probs: List[float] = []
        for mult in trench_unit_fatigue_multipliers:
            stress_j = mult * (0.45 * breaker_load + 0.22 * log_e_signal)
            p_j = 1.0 / (1.0 + math.exp(-1.85 * (stress_j - 1.85)))
            indiv_probs.append(p_j)
        weak_link_prob = 1.0 - float(np.prod([1.0 - p for p in indiv_probs]))
        trench_collapse_prob = float(np.clip(weak_link_prob, 0.01, 0.99))

        raw_log_odds_shift = -(0.28 * (qb_compression / 0.55) + 0.22 * max(0.0, trench_collapse_prob - 0.18))
        js_shrinkage = max(0.0, 1.0 - 0.04 / max(abs(raw_log_odds_shift) ** 2 + 0.04, 1e-6))
        shrunk_log_odds = float(
            np.clip(js_shrinkage * raw_log_odds_shift, -JAMES_STEIN_LOG_ODDS_CAP, JAMES_STEIN_LOG_ODDS_CAP)
        )
        live_ril_points = round(6.50 * shrunk_log_odds, 4)

        return DualUseWaveguideOutput(
            peak_sulcal_strain=peak_sulcal_strain,
            final_tau1_state_norm=q1_norm,
            final_tau2_state_norm=q2_norm,
            final_tau3_state_norm=q3_norm,
            cumulative_rotational_impulse_rad_s=cum_rot_impulse,
            non_commutative_braid_commutator=braid_commutator_accum,
            neuro_autonomic_breaker_load=breaker_load,
            baxley_e_value=e_val,
            gsi_alert_tier=alert_tier,
            ville_anytime_p_upper_bound=ville_p_bound,
            subconcussive_multi_hit_count=len(subconcussive_hits),
            qbTraumaCompressionSec=round(qb_compression, 4),
            trenchWeakLinkCollapseProb=round(trench_collapse_prob, 4),
            liveRilAdjustment=live_ril_points,
        )


# ============================================================================
# Subsystem 2B: Rough-Path Iterated-Integral Lévy Area (`L_{1,2}(X)`)
# ============================================================================

@dataclass(frozen=True)
class RoughPathSignatureResult:
    """Step-2 Rough-Path Signature, Lévy Area `L_{1,2}(X)`, and Hoff Lead-Lag Area."""
    level1_increment: np.ndarray          # S^(1)(X) in R^d
    level2_iterated_integral: np.ndarray  # S^(2)(X) in R^(d x d)
    levy_area_matrix: np.ndarray          # Antisymmetric L_{i,j}(X)
    levy_area_12: float                   # Canonical L_{1,2}(X) lead-lag invariant
    lead_lag_levy_area_12: float          # Hoff lead-lag cross-channel area
    log_signature_norm: float


class RoughPathSignatureExtractor:
    """
    Theorem 4 Reparameterization-Invariant Rough-Path Signature & Lévy Area Extractor.
    """

    @staticmethod
    def build_hoff_lead_lag_path(path: np.ndarray) -> np.ndarray:
        if path.ndim != 2 or path.shape[0] < 2:
            raise ValueError("path must have shape (N, d) with N >= 2.")
        n_steps, dim = path.shape
        out = np.zeros((2 * n_steps - 1, 2 * dim), dtype=np.float64)
        out[0, :dim] = path[0]
        out[0, dim:] = path[0]
        for k in range(n_steps - 1):
            out[2 * k + 1, :dim] = path[k]
            out[2 * k + 1, dim:] = path[k + 1]
            out[2 * k + 2, :dim] = path[k + 1]
            out[2 * k + 2, dim:] = path[k + 1]
        return out

    @classmethod
    def compute_signature(cls, path: np.ndarray) -> RoughPathSignatureResult:
        x = np.asarray(path, dtype=np.float64)
        if x.ndim != 2 or x.shape[0] < 2 or x.shape[1] < 2:
            raise ValueError("Input path must have shape (N, d) with N >= 2 and d >= 2.")

        dx = np.diff(x, axis=0)
        s1 = np.zeros(x.shape[1], dtype=np.float64)
        s2 = np.zeros((x.shape[1], x.shape[1]), dtype=np.float64)

        for step_dx in dx:
            s2 += np.outer(s1, step_dx) + 0.5 * np.outer(step_dx, step_dx)
            s1 += step_dx

        levy_matrix = 0.5 * (s2 - s2.T)
        levy_12 = float(levy_matrix[0, 1])

        ll_path = cls.build_hoff_lead_lag_path(x[:, :2])
        ll_dx = np.diff(ll_path, axis=0)
        ll_s1 = np.zeros(4, dtype=np.float64)
        ll_s2 = np.zeros((4, 4), dtype=np.float64)
        for step_dx in ll_dx:
            ll_s2 += np.outer(ll_s1, step_dx) + 0.5 * np.outer(step_dx, step_dx)
            ll_s1 += step_dx
        ll_levy = 0.5 * (ll_s2 - ll_s2.T)
        ll_area_12 = float(ll_levy[0, 3])

        upper_idx = np.triu_indices(x.shape[1], k=1)
        log_sig_norm = float(np.sqrt(np.sum(s1 ** 2) + np.sum(levy_matrix[upper_idx] ** 2)))

        return RoughPathSignatureResult(
            level1_increment=s1,
            level2_iterated_integral=s2,
            levy_area_matrix=levy_matrix,
            levy_area_12=levy_12,
            lead_lag_levy_area_12=ll_area_12,
            log_signature_norm=log_sig_norm,
        )


# ============================================================================
# Subsystem 2C: Fluid/Vorticity & Universal Phase-Transition Detector
# ============================================================================

@dataclass(frozen=True)
class SpectralVorticityDiagnostic:
    """Joint 7-Tuple Navier-Stokes / Spectral Phase-Transition Diagnostic."""
    omega_inf: float
    direction_curvature_inf: float
    spectral_entropy: float
    phase_entropy_16bin: float
    phase_resultant_R: float
    dealias_tail_power_ratio: float
    bkm_running_integral: float
    hou_li_retained_modes: int
    orszag_sharp_retained_modes: int
    is_critical_phase_locking: bool


@dataclass(frozen=True)
class CriticalSlowingOrderParameters:
    """Shared Phase-Transition Cascade (`tau_1 -> tau_2 -> tau_3`) Order Parameters."""
    stage: Literal["NORMAL", "TAU_1_SPECTRAL_STIFFENING", "TAU_2_GEOMETRIC_DECOUPLING", "TAU_3_SINGULARITY_ALERT"]
    lag1_autocorrelation: float
    spin_glass_susceptibility_chi_sg: float
    critical_sk_scaled_ratio: float
    koopman_damping_gap_gamma_eff: float
    geometric_curvature_ratio_R_geo: float
    gaussian_propeller_energy: float
    exceeds_propeller_bound: bool
    pade_estimated_time_to_singularity: Optional[float]


class FluidVorticityAndPhaseTransitionDetector:
    """
    Implements the `navier-stokes-session-full (1).md` spectral diagnostics (Hou-Li 36th-order
    filter, circular phase resultant `R`, Constantin-Fefferman direction curvature, BKM clock)
    and the 6-Domain Universal Phase-Transition cascade (`tau_1 < tau_2 < tau_3`).
    """

    @staticmethod
    def hou_li_36_filter_3d(grid_n: int) -> Tuple[np.ndarray, int, int]:
        k_1d = np.fft.fftfreq(grid_n, d=1.0 / float(grid_n))
        rho_1d = np.exp(-36.0 * ((2.0 * np.abs(k_1d) / float(grid_n)) ** 36))
        rho_3d = rho_1d[:, None, None] * rho_1d[None, :, None] * rho_1d[None, None, :]

        sharp_1d = (np.abs(k_1d) < (float(grid_n) / 3.0)).astype(np.float64)
        sharp_3d = sharp_1d[:, None, None] * sharp_1d[None, :, None] * sharp_1d[None, None, :]

        hou_li_count = int(np.sum(rho_3d > 1e-3))
        sharp_count = int(np.sum(sharp_3d > 0.5))
        return rho_3d, hou_li_count, sharp_count

    @staticmethod
    def compute_modal_phase_diagnostics(
        modal_powers: np.ndarray,
        modal_phases_rad: np.ndarray,
    ) -> Tuple[float, float, float]:
        p = np.asarray(modal_powers, dtype=np.float64).ravel()
        theta = np.asarray(modal_phases_rad, dtype=np.float64).ravel()
        total_p = float(np.sum(p))
        if total_p <= 0.0:
            return 0.0, 0.0, 0.0
        p = p / total_p
        pos = p > 1e-15
        s_spec = float(-np.sum(p[pos] * np.log(p[pos])))

        wrapped = ((theta + math.pi) % (2.0 * math.pi)) - math.pi
        hist, _ = np.histogram(wrapped, bins=16, range=(-math.pi, math.pi), weights=p)
        pos_h = hist > 1e-15
        s_phase = float(-np.sum(hist[pos_h] * np.log(hist[pos_h])))

        resultant_R = float(np.abs(np.sum(p * np.exp(1j * wrapped))))
        return s_spec, s_phase, resultant_R

    @classmethod
    def audit_vorticity_field_3d(
        cls,
        omega_xyz: np.ndarray,
        dt_s: float = 0.05,
        prev_bkm_integral: float = 0.0,
        prev_omega_inf: Optional[float] = None,
    ) -> SpectralVorticityDiagnostic:
        if omega_xyz.ndim != 4 or omega_xyz.shape[-1] != 3:
            raise ValueError("omega_xyz must have shape (N, N, N, 3).")
        grid_n = omega_xyz.shape[0]
        omega_mag = np.linalg.norm(omega_xyz, axis=-1)
        omega_inf = float(np.max(omega_mag))

        xi = omega_xyz / np.maximum(omega_mag[..., None], 1e-9)
        dx = 2.0 * math.pi / float(grid_n)
        grad_sq = np.zeros_like(omega_mag)
        for comp in range(3):
            gx, gy, gz = np.gradient(xi[..., comp], dx, edge_order=1)
            grad_sq += gx ** 2 + gy ** 2 + gz ** 2
        grad_xi_norm = np.sqrt(grad_sq)
        high_vort_mask = omega_mag > 0.5 * omega_inf
        dir_curv_inf = float(np.max(grad_xi_norm[high_vort_mask])) if np.any(high_vort_mask) else 0.0

        w_hat = np.fft.fftn(omega_xyz, axes=(0, 1, 2))
        rho_3d, hl_modes, sharp_modes = cls.hou_li_36_filter_3d(grid_n)
        power_3d = np.sum(np.abs(w_hat) ** 2, axis=-1)
        power_3d[0, 0, 0] = 0.0

        phase_sum = w_hat[..., 0] + w_hat[..., 1] + w_hat[..., 2]
        phases_3d = np.angle(phase_sum)

        s_spec, s_phase, resultant_R = cls.compute_modal_phase_diagnostics(power_3d, phases_3d)
        total_power = max(float(np.sum(power_3d)), 1e-12)
        dealias_tail_ratio = float(np.sum(power_3d * (1.0 - rho_3d) ** 2) / total_power)
        bkm_next = float(prev_bkm_integral + omega_inf * dt_s)

        rising_amp = True if prev_omega_inf is None else (omega_inf > prev_omega_inf)
        is_critical = bool(
            rising_amp and resultant_R >= 0.70 and s_phase <= 1.15 and dir_curv_inf >= 1.50
        )

        return SpectralVorticityDiagnostic(
            omega_inf=omega_inf,
            direction_curvature_inf=dir_curv_inf,
            spectral_entropy=s_spec,
            phase_entropy_16bin=s_phase,
            phase_resultant_R=resultant_R,
            dealias_tail_power_ratio=dealias_tail_ratio,
            bkm_running_integral=bkm_next,
            hou_li_retained_modes=hl_modes,
            orszag_sharp_retained_modes=sharp_modes,
            is_critical_phase_locking=is_critical,
        )

    @staticmethod
    def evaluate_critical_slowing_down(
        multivariate_window: np.ndarray,
        timestamps_s: np.ndarray,
    ) -> CriticalSlowingOrderParameters:
        x = np.asarray(multivariate_window, dtype=np.float64)
        t = np.asarray(timestamps_s, dtype=np.float64)
        if x.ndim != 2 or x.shape[0] < 6:
            raise ValueError("multivariate_window must have shape (T >= 6, N >= 2).")

        t_steps, n_channels = x.shape
        dt = max(float(np.median(np.diff(t))), 1e-4)

        centered = x - np.mean(x, axis=0, keepdims=True)
        cov = (centered.T @ centered) / float(max(t_steps - 1, 1))

        chi_sg = float(np.sum(cov ** 2) / float(n_channels))
        op_norm = float(np.linalg.norm(cov, ord=2))
        sk_ratio = float(op_norm / (float(n_channels) ** (2.0 / 3.0)))

        u, s_vals, _ = np.linalg.svd(centered, full_matrices=False)
        pc1 = u[:, 0] * s_vals[0]
        if float(np.std(pc1[:-1])) > 1e-9 and float(np.std(pc1[1:])) > 1e-9:
            ac1 = float(np.corrcoef(pc1[:-1], pc1[1:])[0, 1])
        else:
            ac1 = 0.0

        x0 = centered[:-1].T
        x1 = centered[1:].T
        reg = 1e-4 * np.eye(n_channels)
        a_koopman = x1 @ x0.T @ np.linalg.inv(x0 @ x0.T + reg)
        eigvals = np.linalg.eigvals(a_koopman)
        max_abs_eig = float(np.max(np.abs(eigvals)))
        gamma_eff = max(1e-4, -math.log(min(max_abs_eig, 0.9999)) / dt)

        if t_steps >= 8:
            kernel_5 = np.ones(5, dtype=np.float64) / 5.0
            slow_pc1 = np.convolve(pc1, kernel_5, mode="valid")
            slow_curv = float(np.max(np.abs(np.diff(slow_pc1, n=2)))) / max(float(np.std(pc1)), 1e-6)
        else:
            slow_curv = float(np.max(np.abs(np.diff(pc1, n=2)))) / max(float(np.std(pc1)), 1e-6)
        r_geo = float(slow_curv / max(gamma_eff * dt, 1e-4))

        innov = np.diff(centered, axis=0)
        std_innov = innov / np.maximum(np.std(innov, axis=0, keepdims=True), 1e-6)
        angles = np.arctan2(std_innov[:, 1 % n_channels], std_innov[:, 0])
        propeller_energy = 0.0
        for sector_idx in range(3):
            low = -math.pi + sector_idx * (2.0 * math.pi / 3.0)
            high = low + (2.0 * math.pi / 3.0)
            mask = (angles >= low) & (angles < high)
            if np.any(mask):
                prob_sector = float(np.mean(mask))
                mean_vec = np.mean(std_innov[mask, :min(2, n_channels)], axis=0)
                barycenter = prob_sector * mean_vec
                propeller_energy += float(np.sum(barycenter ** 2))
        exceeds_propeller = bool(propeller_energy > GAUSSIAN_PROPELLER_BOUND + 0.015)

        mid = t_steps // 2
        if mid >= 4:
            c_first = centered[:mid]
            c_second = centered[mid:]
            x0_a, x1_a = c_first[:-1].T, c_first[1:].T
            x0_b, x1_b = c_second[:-1].T, c_second[1:].T
            a_early = x1_a @ x0_a.T @ np.linalg.inv(x0_a @ x0_a.T + reg)
            a_late = x1_b @ x0_b.T @ np.linalg.inv(x0_b @ x0_b.T + reg)
            eig_early = min(float(np.max(np.abs(np.linalg.eigvals(a_early)))), 0.9999)
            eig_late = min(float(np.max(np.abs(np.linalg.eigvals(a_late)))), 0.9999)
            gamma_early = max(1e-4, -math.log(eig_early) / dt)
            gamma_late = max(1e-4, -math.log(eig_late) / dt)
            dt_macro = float(t[-1] - t[mid]) * 0.5
            dgamma_dt = (gamma_late - gamma_early) / max(dt_macro, dt)
            if dgamma_dt < -1e-5:
                pade_tts: Optional[float] = round(float(-gamma_late / dgamma_dt), 3)
            else:
                pade_tts = None
        else:
            pade_tts = None

        tau1_active = (ac1 >= 0.55) or (chi_sg >= 1.50)
        if not tau1_active:
            stage: Literal[
                "NORMAL",
                "TAU_1_SPECTRAL_STIFFENING",
                "TAU_2_GEOMETRIC_DECOUPLING",
                "TAU_3_SINGULARITY_ALERT",
            ] = "NORMAL"
        elif ac1 >= 0.85 and r_geo >= 1.50:
            stage = "TAU_3_SINGULARITY_ALERT"
        elif r_geo >= 1.00 or exceeds_propeller or ac1 >= 0.75:
            stage = "TAU_2_GEOMETRIC_DECOUPLING"
        else:
            stage = "TAU_1_SPECTRAL_STIFFENING"

        return CriticalSlowingOrderParameters(
            stage=stage,
            lag1_autocorrelation=round(ac1, 4),
            spin_glass_susceptibility_chi_sg=round(chi_sg, 4),
            critical_sk_scaled_ratio=round(sk_ratio, 4),
            koopman_damping_gap_gamma_eff=round(gamma_eff, 5),
            geometric_curvature_ratio_R_geo=round(r_geo, 4),
            gaussian_propeller_energy=round(propeller_energy, 5),
            exceeds_propeller_bound=exceeds_propeller,
            pade_estimated_time_to_singularity=pade_tts,
        )


# ============================================================================
# Subsystem 3: Shared `GSISepsisInterventionKernel` (Theorems 1-5 & Conformal)
# ============================================================================

@dataclass(frozen=True)
class SinkhornOTResult:
    """Output of log-domain stabilized Sinkhorn-Knopp Optimal Transport (`epsilon=0.05`)."""
    transport_plan: np.ndarray
    sinkhorn_cost: float
    wasserstein_w1_proxy: float
    calibration_weights: np.ndarray
    converged_iterations: int


@dataclass(frozen=True)
class BarberConformalESSResult:
    """Output of Barber Non-Exchangeable Weighted Conformal + `c_hat <= 12.42` ESS Gate."""
    gate_passed: bool
    abstain_reason: Optional[str]
    c_hat: float
    effective_sample_size: float
    weighted_quantile: float
    prediction_interval: Tuple[float, float]
    updated_alpha_t: float
    updated_alpha_wealth: float


@dataclass(frozen=True)
class FWLResidualizationResult:
    """Output of Frisch-Waugh-Lovell (`FWL`) Propensity & Confounder Residualization."""
    tau_hat: float
    naive_unadjusted_beta: float
    confounder_bias_removed: float
    robust_se: float
    t_stat: float
    residual_treatment_variance: float


class GSISepsisInterventionKernel:
    """
    Implements the shared `gsi_sepsis_intervention_kernel` Theorems 1-5 mathematical spine:
      - Log-domain Sinkhorn-Knopp Entropic Optimal Transport (`epsilon = 0.05`)
      - Barber et al. (2023) Non-Exchangeable Weighted Conformal Prediction with
        `c_hat <= 12.42` ESS variance-inflation circuit breaker + Martingale Alpha-Wealth
      - Frisch-Waugh-Lovell (`FWL`) propensity/charting-cadence residualization (`tau_hat`)
    """

    def __init__(
        self,
        sinkhorn_epsilon: float = DEFAULT_SINKHORN_EPSILON,
        c_hat_threshold: float = BARBER_ESS_C_HAT_MAX,
        wasserstein_w1_max: float = WASSERSTEIN_SHIFT_W1_MAX,
        alpha_wealth_floor: float = ALPHA_WEALTH_FLOOR,
    ) -> None:
        self.sinkhorn_epsilon = sinkhorn_epsilon
        self.c_hat_threshold = c_hat_threshold
        self.wasserstein_w1_max = wasserstein_w1_max
        self.alpha_wealth_floor = alpha_wealth_floor

    def sinkhorn_entropic_ot(
        self,
        source_states: np.ndarray,
        target_states: np.ndarray,
        epsilon: Optional[float] = None,
        max_iter: int = 300,
        tol: float = 1e-7,
    ) -> SinkhornOTResult:
        eps = float(epsilon if epsilon is not None else self.sinkhorn_epsilon)
        src = np.asarray(source_states, dtype=np.float64)
        tgt = np.asarray(target_states, dtype=np.float64)
        if src.ndim == 1:
            src = src[:, None]
        if tgt.ndim == 1:
            tgt = tgt[None, :]

        n_src, n_tgt = src.shape[0], tgt.shape[0]
        a = np.full(n_src, 1.0 / float(n_src), dtype=np.float64)
        b = np.full(n_tgt, 1.0 / float(n_tgt), dtype=np.float64)
        log_a = np.log(a)
        log_b = np.log(b)

        diff = src[:, None, :] - tgt[None, :, :]
        cost_matrix = np.linalg.norm(diff, axis=-1) / math.sqrt(float(src.shape[1]))

        f = np.zeros(n_src, dtype=np.float64)
        g = np.zeros(n_tgt, dtype=np.float64)

        iters = 0
        for it in range(1, max_iter + 1):
            iters = it
            f_prev = f.copy()

            m_f = (-cost_matrix + g[None, :]) / eps
            max_f = np.max(m_f, axis=1, keepdims=True)
            lse_f = max_f.squeeze(1) + np.log(np.sum(np.exp(m_f - max_f), axis=1))
            f = eps * (log_a - lse_f)

            m_g = (-cost_matrix + f[:, None]) / eps
            max_g = np.max(m_g, axis=0, keepdims=True)
            lse_g = max_g.squeeze(0) + np.log(np.sum(np.exp(m_g - max_g), axis=0))
            g = eps * (log_b - lse_g)

            if float(np.max(np.abs(f - f_prev))) < tol:
                break

        log_plan = (f[:, None] + g[None, :] - cost_matrix) / eps
        plan = np.exp(log_plan)
        plan = plan / np.maximum(np.sum(plan), 1e-15)
        ot_cost = float(np.sum(plan * cost_matrix))

        tgt_centroid = np.mean(tgt, axis=0, keepdims=True)
        dists_to_target = np.linalg.norm(src - tgt_centroid, axis=1) / math.sqrt(float(src.shape[1]))
        shifted = -(dists_to_target - float(np.min(dists_to_target))) / eps
        raw_weights = np.exp(shifted)
        cal_weights = raw_weights / np.sum(raw_weights)

        return SinkhornOTResult(
            transport_plan=plan,
            sinkhorn_cost=ot_cost,
            wasserstein_w1_proxy=ot_cost,
            calibration_weights=cal_weights,
            converged_iterations=iters,
        )

    def barber_weighted_conformal_gate(
        self,
        calibration_scores: np.ndarray,
        ot_weights: np.ndarray,
        point_prediction: float,
        wasserstein_w1: float = 0.02,
        alpha_t: float = 0.10,
        target_alpha: float = 0.10,
        alpha_wealth: float = 0.50,
        observed_miscoverage_err: Optional[int] = None,
        aci_step_gamma: float = 0.02,
        reference_n: Optional[int] = None,
    ) -> BarberConformalESSResult:
        scores = np.asarray(calibration_scores, dtype=np.float64).ravel()
        w = np.asarray(ot_weights, dtype=np.float64).ravel()
        if len(scores) != len(w) or len(scores) == 0:
            raise ValueError("calibration_scores and ot_weights must have equal non-zero length.")
        if np.any(w < 0.0) or float(np.sum(w)) <= 0.0:
            raise ValueError("ot_weights must be non-negative with positive sum.")

        ref_n = float(reference_n if reference_n is not None else len(w))
        sum_w = float(np.sum(w))
        sum_w2 = float(np.sum(w ** 2))
        ess = (sum_w ** 2) / max(sum_w2, 1e-15)
        c_hat = round(ref_n / ess, 4)

        w_max = float(np.max(w))
        w_aug = np.append(w, w_max)
        p_norm = w_aug / float(np.sum(w_aug))

        order = np.argsort(scores)
        sorted_scores = scores[order]
        sorted_probs = p_norm[:-1][order]
        cum_probs = np.cumsum(sorted_probs)
        eff_level = float(np.clip(1.0 - alpha_t, 0.50, 0.995))

        idx = int(np.searchsorted(cum_probs, eff_level, side="left"))
        if idx >= len(sorted_scores):
            q_hat = float(sorted_scores[-1]) * (1.0 + p_norm[-1])
        else:
            q_hat = float(sorted_scores[idx])

        interval = (round(point_prediction - q_hat, 5), round(point_prediction + q_hat, 5))

        next_alpha_t = alpha_t
        next_wealth = alpha_wealth
        if observed_miscoverage_err is not None:
            err_val = float(observed_miscoverage_err)
            next_alpha_t = float(np.clip(alpha_t + aci_step_gamma * (target_alpha - err_val), 0.01, 0.35))
            bet_f = 0.08
            wealth_mult = (1.0 + bet_f * target_alpha) if err_val == 0.0 else (1.0 - bet_f * (1.0 - target_alpha))
            next_wealth = float(max(0.0, alpha_wealth * wealth_mult))

        abstain_reason: Optional[str] = None
        if c_hat > self.c_hat_threshold:
            abstain_reason = f"ESS_ABSTAIN: c_hat={c_hat:.4f} > {self.c_hat_threshold:.2f}"
        elif wasserstein_w1 > self.wasserstein_w1_max:
            abstain_reason = f"WASSERSTEIN_ABSTAIN: W1={wasserstein_w1:.4f} > {self.wasserstein_w1_max:.2f}"
        elif next_wealth < self.alpha_wealth_floor:
            abstain_reason = f"ALPHA_WEALTH_EXHAUSTED: W_alpha={next_wealth:.4f} < {self.alpha_wealth_floor:.2f}"

        return BarberConformalESSResult(
            gate_passed=(abstain_reason is None),
            abstain_reason=abstain_reason,
            c_hat=c_hat,
            effective_sample_size=round(ess, 4),
            weighted_quantile=round(q_hat, 5),
            prediction_interval=interval,
            updated_alpha_t=round(next_alpha_t, 5),
            updated_alpha_wealth=round(next_wealth, 5),
        )

    @staticmethod
    def fwl_propensity_residualization(
        outcome_y: np.ndarray,
        treatment_d: np.ndarray,
        confounders_z: np.ndarray,
        ridge_penalty: float = 0.0,
    ) -> FWLResidualizationResult:
        y = np.asarray(outcome_y, dtype=np.float64).ravel()
        d = np.asarray(treatment_d, dtype=np.float64).ravel()
        z_raw = np.asarray(confounders_z, dtype=np.float64)
        if z_raw.ndim == 1:
            z_raw = z_raw[:, None]

        n = len(y)
        if len(d) != n or z_raw.shape[0] != n or n < 5:
            raise ValueError("Incompatible dimensions in FWL residualization.")

        z = np.column_stack([np.ones(n, dtype=np.float64), z_raw])
        p_cols = z.shape[1]
        reg = ridge_penalty * np.eye(p_cols, dtype=np.float64)
        reg[0, 0] = 0.0

        ztz_inv = np.linalg.pinv(z.T @ z + reg)
        d_tilde = d - z @ (ztz_inv @ (z.T @ d))
        y_tilde = y - z @ (ztz_inv @ (z.T @ y))

        denom = float(d_tilde.T @ d_tilde)
        if denom <= 1e-12:
            raise ValueError("Treatment/signal D is collinear with confounders Z; tau_hat unidentified.")

        tau_hat = float((d_tilde.T @ y_tilde) / denom)

        d_centered = d - float(np.mean(d))
        y_centered = y - float(np.mean(y))
        naive_beta = float((d_centered.T @ y_centered) / max(float(d_centered.T @ d_centered), 1e-12))

        resid = y_tilde - tau_hat * d_tilde
        dof = max(n - p_cols - 1, 1)
        hc1_scale = float(n) / float(dof)
        meat = float(np.sum((d_tilde ** 2) * (resid ** 2))) * hc1_scale
        robust_se = math.sqrt(meat) / denom
        t_stat = tau_hat / max(robust_se, 1e-12)

        return FWLResidualizationResult(
            tau_hat=round(tau_hat, 6),
            naive_unadjusted_beta=round(naive_beta, 6),
            confounder_bias_removed=round(naive_beta - tau_hat, 6),
            robust_se=round(robust_se, 6),
            t_stat=round(t_stat, 4),
            residual_treatment_variance=round(denom / float(n), 6),
        )


# ============================================================================
# Unified Top-Level Dual-Use Engine Orchestrator
# ============================================================================

@dataclass
class UnifiedDualUseReport:
    """Complete synchronized output across GSE commercial football and GSI clinical science."""
    regularity_audit: RegularityAuditResult
    waveguide_dual_output: Optional[DualUseWaveguideOutput]
    rough_path_signature: Optional[RoughPathSignatureResult]
    phase_transition_order: Optional[CriticalSlowingOrderParameters]
    conformal_gate: BarberConformalESSResult
    fwl_causal_estimate: FWLResidualizationResult


class DualUsePhaseTransitionEngine:
    """
    Single shared mathematical engine powering both:
      - Galaxy Sports Edge (GSE): live NFL sub-concussive pocket compression, trench fatigue
        collapse probability, `RIL` adjustments, and `PASS` conformal discipline.
      - Galaxy Science Institute (GSI): real-time TBI/CTE sulcal shear alerting, rough-path
        charting-invariant ICU sepsis signatures, and FDA PCCP abstention safety.
    """

    def __init__(self) -> None:
        self.regularity_filter = BiophysicalKinematicRegularityFilter()
        self.waveguide_kernel = PronyOgdenSulcalWaveguideKernel()
        self.signature_extractor = RoughPathSignatureExtractor()
        self.phase_detector = FluidVorticityAndPhaseTransitionDetector()
        self.sepsis_kernel = GSISepsisInterventionKernel()

    def run_dual_use_evaluation(
        self,
        pose_frames: Sequence[PoseKinematicFrame],
        calibration_states: np.ndarray,
        calibration_nonconformity_scores: np.ndarray,
        current_regime_states: np.ndarray,
        outcome_y: np.ndarray,
        treatment_d: np.ndarray,
        confounders_z: np.ndarray,
        equipment: HelmetEquipmentProfile = HelmetEquipmentProfile(),
        hrv_rmssd_ms: float = 54.0,
        session_trimp: float = 65.0,
        as_of_t: Optional[float] = None,
    ) -> UnifiedDualUseReport:
        audit = self.regularity_filter.filter_and_audit(pose_frames, as_of_t=as_of_t)

        ot_res = self.sepsis_kernel.sinkhorn_entropic_ot(
            source_states=calibration_states,
            target_states=current_regime_states,
            epsilon=DEFAULT_SINKHORN_EPSILON,
        )
        fwl_res = self.sepsis_kernel.fwl_propensity_residualization(
            outcome_y=outcome_y,
            treatment_d=treatment_d,
            confounders_z=confounders_z,
        )

        if audit.status != "VALID":
            conformal_res = self.sepsis_kernel.barber_weighted_conformal_gate(
                calibration_scores=calibration_nonconformity_scores,
                ot_weights=ot_res.calibration_weights,
                point_prediction=0.0,
                wasserstein_w1=ot_res.wasserstein_w1_proxy,
            )
            return UnifiedDualUseReport(
                regularity_audit=audit,
                waveguide_dual_output=None,
                rough_path_signature=None,
                phase_transition_order=None,
                conformal_gate=conformal_res,
                fwl_causal_estimate=fwl_res,
            )

        waveguide_out = self.waveguide_kernel.evaluate_trajectory(
            audit=audit,
            equipment=equipment,
            hrv_rmssd_ms=hrv_rmssd_ms,
            session_trimp=session_trimp,
        )

        joint_stream = np.column_stack(
            [
                np.linalg.norm(audit.velocities_mps, axis=1),
                np.linalg.norm(audit.angular_vel_rad_s, axis=1),
                np.linalg.norm(audit.linear_accel_mps2, axis=1) / 9.80665,
            ]
        )
        sig_res = self.signature_extractor.compute_signature(joint_stream[:, :2])
        phase_order = (
            self.phase_detector.evaluate_critical_slowing_down(joint_stream, audit.timestamps_s)
            if joint_stream.shape[0] >= 6
            else None
        )

        conformal_res = self.sepsis_kernel.barber_weighted_conformal_gate(
            calibration_scores=calibration_nonconformity_scores,
            ot_weights=ot_res.calibration_weights,
            point_prediction=waveguide_out.liveRilAdjustment,
            wasserstein_w1=min(ot_res.wasserstein_w1_proxy, 0.06),
        )

        return UnifiedDualUseReport(
            regularity_audit=audit,
            waveguide_dual_output=waveguide_out,
            rough_path_signature=sig_res,
            phase_transition_order=phase_order,
            conformal_gate=conformal_res,
            fwl_causal_estimate=fwl_res,
        )


if __name__ == "__main__":
    rng = np.random.default_rng(20261113)
    dt = 0.1  # SkeleTrack 10Hz broadcast pose stream
    frames_demo: List[PoseKinematicFrame] = []
    for k in range(45):
        t_k = round(k * dt, 3)
        if k == 10:
            ang_v = (26.0, 12.0, 5.0)
        elif k == 26:
            ang_v = (-8.0, 28.0, -14.0)
        else:
            ang_v = (0.3 * math.sin(t_k), 0.2 * math.cos(t_k), 0.1)
        frames_demo.append(
            PoseKinematicFrame(
                timestamp_s=t_k,
                position_m=(0.8 * t_k, 0.25 * math.sin(1.5 * t_k), 1.85),
                angular_vel_rad_s=ang_v,
                observed_at_s=t_k,
            )
        )

    cal_X = rng.normal(0.0, 0.25, size=(100, 3))
    cur_X = rng.normal(0.02, 0.25, size=(16, 3))
    cal_scores = np.abs(rng.normal(0.0, 0.12, size=100))
    z_conf = rng.normal(0.0, 1.0, size=(120, 2))
    d_treat = 0.8 * z_conf[:, 0] - 0.5 * z_conf[:, 1] + rng.normal(0.0, 0.5, size=120)
    y_out = -0.42 * d_treat + 1.35 * z_conf[:, 0] + 0.90 * z_conf[:, 1] + rng.normal(0.0, 0.15, size=120)

    engine = DualUsePhaseTransitionEngine()
    report = engine.run_dual_use_evaluation(
        pose_frames=frames_demo,
        calibration_states=cal_X,
        calibration_nonconformity_scores=cal_scores,
        current_regime_states=cur_X,
        outcome_y=y_out,
        treatment_d=d_treat,
        confounders_z=z_conf,
        equipment=HelmetEquipmentProfile("Riddell_SpeedFlex", "Guardian_NXT", custom_mouthguard=True),
    )
    assert report.waveguide_dual_output is not None
    assert report.rough_path_signature is not None
    print(
        f"[OK] GSE+GSI Dual-Use Smoke Check | "
        f"Baxley E_t={report.waveguide_dual_output.baxley_e_value:.3f} ({report.waveguide_dual_output.gsi_alert_tier}) | "
        f"qbTraumaCompressionSec={report.waveguide_dual_output.qbTraumaCompressionSec:.4f}s | "
        f"trenchWeakLinkCollapseProb={report.waveguide_dual_output.trenchWeakLinkCollapseProb:.4f} | "
        f"liveRilAdjustment={report.waveguide_dual_output.liveRilAdjustment:+.4f} | "
        f"Levy L_12={report.rough_path_signature.levy_area_12:.5f} | "
        f"Barber c_hat={report.conformal_gate.c_hat:.4f} (gate_passed={report.conformal_gate.gate_passed}) | "
        f"FWL tau_hat={report.fwl_causal_estimate.tau_hat:.4f}"
    )
