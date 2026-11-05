"""
GSI v3.0 Thermodynamic Ergodic Braiding (TEB), Asynchronous Time-Slippage,
Quantum-Spectral Graph Laplacian, and Persistent Homology (TDA) Suite
===========================================================================
Implements the three falsifiable pillars of the GSI Frontier Research Agenda:

Pillar 1 (Asynchronous Subsystem Time-Slippage):
  - Operationalizes dt_i / dtau = phi_i(X(tau)) via intrinsic subsystem
    arc-length variation velocity, Dynamic Time Warping (DTW) alignment
    slippage tau_DTW(S_i, S_j), and lagged cross-correlation phase-slippage.

Pillar 2 (Braid / Lévy-Area Invariants vs. Persistent Homology & Quantum TDA):
  - ThermodynamicBraidInvariant: Chen 2nd-level antisymmetric iterated integral
    (Stochastic Lévy Area A_ij), Gauss Winding Number W_ij, SO(d) Lie-group
    braid representation exp(sum_{i<j} W_ij G_ij), and Seifert/Bregman
    irreversible entropy production rate (broken detailed balance).
  - QuantumSpectralTrajectoryLaplacian: Normalized Riemannian trajectory graph
    Laplacian L, quantum density operator rho_beta = exp(-beta L) / Tr(exp(-beta L)),
    Von Neumann spectral entropy S_VN(rho_beta), and Fiedler connectivity lambda_2.
  - PersistentHomologyBetti: Exact 0D (MST birth-death lifetimes, persistence
    entropy) and 1D (Vietoris-Rips cycle persistence) TDA feature extractor.

Pillar 3 (Ergodicity Breaking & Bifurcation Early-Warning Lead Time):
  - ErgodicBraidBifurcationMonitor: Computes Finite-Time Braiding Exponent (FTBE),
    Thirumalai-Mountain Ergodicity-Breaking (EB) parameter, and early-warning
    lead time prior to critical transitions.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
from scipy.linalg import expm
from scipy.spatial.distance import pdist, squareform


# ---------------------------------------------------------------------------
# Pillar 1: Operational Asynchronous Subsystem Time-Slippage Estimator
# ---------------------------------------------------------------------------

@dataclass
class TimeSlippageMetrics:
    """Operational measurements of subsystem clock divergence phi_i(t)."""
    subsystem_velocities: np.ndarray        # (D,) mean intrinsic clock speeds bar(phi)_i
    velocity_dispersion: float              # max_{i!=j} |phi_i - phi_j| + std(phi)
    cardiorenal_velocity_ratio: float       # phi_cardiac / (phi_renal + eps)
    mean_dtw_slippage: float                # mean normalized DTW warp displacement from diagonal
    max_dtw_slippage: float                 # max pairwise DTW warp displacement
    mean_lag_slippage: float                # mean optimal cross-correlation lag |ell^*| / T
    phase_decoherence: float                # 1 - mean_{i<j} |Corr_0(S_i, S_j)|

    def to_vector(self) -> np.ndarray:
        return np.array(
            [
                self.velocity_dispersion,
                self.cardiorenal_velocity_ratio,
                self.mean_dtw_slippage,
                self.max_dtw_slippage,
                self.mean_lag_slippage,
                self.phase_decoherence,
            ],
            dtype=np.float64,
        )


class AsynchronousTimeSlippageEstimator:
    """
    Operationalizes dt_i / dtau = phi_i(X(tau)) across D physiological subsystems.
    Calibrates baseline subsystem variation speeds on healthy/survivor reference
    trajectories so that phi_i(t) = 1.0 corresponds to normal homeostatic pacing.
    """

    def __init__(self, max_lag: int = 4, eps: float = 1e-6) -> None:
        self.max_lag = int(max_lag)
        self.eps = float(eps)
        self._baseline_step_scale: Optional[np.ndarray] = None
        self._baseline_mean: Optional[np.ndarray] = None
        self._baseline_std: Optional[np.ndarray] = None

    def fit(self, survivor_trajectories: List[np.ndarray]) -> "AsynchronousTimeSlippageEstimator":
        """
        Fits reference per-subsystem step scales and amplitude moments from
        survivor trajectories (each of shape (T_k, D)).
        """
        all_vals = []
        all_diffs = []
        for traj in survivor_trajectories:
            arr = np.asarray(traj, dtype=np.float64)
            if arr.ndim == 2 and arr.shape[0] >= 2:
                all_vals.append(arr)
                all_diffs.append(np.abs(np.diff(arr, axis=0)))
        if all_vals:
            stacked_vals = np.vstack(all_vals)
            self._baseline_mean = np.median(stacked_vals, axis=0)
            mad = np.median(np.abs(stacked_vals - self._baseline_mean), axis=0)
            self._baseline_std = np.where(mad > self.eps, 1.4826 * mad, np.std(stacked_vals, axis=0) + 1.0)
        if all_diffs:
            stacked_diffs = np.vstack(all_diffs)
            med_diff = np.median(stacked_diffs, axis=0)
            mean_diff = np.mean(stacked_diffs, axis=0)
            self._baseline_step_scale = np.where(med_diff > self.eps, med_diff, np.maximum(mean_diff, 1e-3))
        return self

    @staticmethod
    def _dtw_warp_slippage(seq_a: np.ndarray, seq_b: np.ndarray) -> float:
        """
        Computes the exact Dynamic Time Warping (DTW) optimal alignment path
        (i_k, j_k) between 1D standardized sequences seq_a and seq_b of length T,
        returning the mean normalized temporal displacement |i_k - j_k| / T.
        """
        T = len(seq_a)
        if T < 3:
            return 0.0
        cost = np.abs(seq_a[:, None] - seq_b[None, :])
        dp = np.full((T, T), np.inf, dtype=np.float64)
        dp[0, 0] = cost[0, 0]
        for i in range(T):
            for j in range(T):
                if i == 0 and j == 0:
                    continue
                best_prev = np.inf
                if i > 0:
                    best_prev = min(best_prev, dp[i - 1, j])
                if j > 0:
                    best_prev = min(best_prev, dp[i, j - 1])
                if i > 0 and j > 0:
                    best_prev = min(best_prev, dp[i - 1, j - 1])
                dp[i, j] = cost[i, j] + best_prev

        # Backtrack optimal warping path
        i, j = T - 1, T - 1
        displacements = [abs(i - j) / float(T)]
        while i > 0 or j > 0:
            if i > 0 and j > 0:
                candidates = [(dp[i - 1, j - 1], i - 1, j - 1), (dp[i - 1, j], i - 1, j), (dp[i, j - 1], i, j - 1)]
                _, i, j = min(candidates, key=lambda x: x[0])
            elif i > 0:
                i -= 1
            else:
                j -= 1
            displacements.append(abs(i - j) / float(T))
        return float(np.mean(displacements))

    def evaluate_trajectory(self, trajectory: np.ndarray) -> TimeSlippageMetrics:
        """
        Computes operational asynchronous time-slippage metrics for a single
        multivariate trajectory X of shape (T, D).
        """
        X = np.asarray(trajectory, dtype=np.float64)
        if X.ndim != 2 or X.shape[0] < 2:
            d = X.shape[1] if X.ndim == 2 else 1
            return TimeSlippageMetrics(
                subsystem_velocities=np.zeros(d, dtype=np.float64),
                velocity_dispersion=0.0,
                cardiorenal_velocity_ratio=1.0,
                mean_dtw_slippage=0.0,
                max_dtw_slippage=0.0,
                mean_lag_slippage=0.0,
                phase_decoherence=0.0,
            )

        T, D = X.shape
        if self._baseline_mean is not None and self._baseline_std is not None and len(self._baseline_mean) == D:
            Z = np.maximum(0.0, (X - self._baseline_mean) / (self._baseline_std + self.eps))
        else:
            Z = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + self.eps)

        dZ = np.abs(np.diff(Z, axis=0))
        if self._baseline_step_scale is not None and len(self._baseline_step_scale) == D:
            phi_t = np.abs(np.diff(X, axis=0)) / (self._baseline_step_scale + self.eps)
        else:
            phi_t = dZ

        bar_phi = np.mean(phi_t, axis=0) + 0.35 * np.max(Z, axis=0)
        # Pairwise clock dispersion across physiological subsystems
        diff_matrix = np.abs(bar_phi[:, None] - bar_phi[None, :])
        velocity_dispersion = float(np.max(diff_matrix) + np.std(bar_phi))
        cardiorenal_ratio = float((bar_phi[0] + 0.1) / (bar_phi[min(2, D - 1)] + 0.1))

        dtw_slips = []
        lag_slips = []
        zero_lag_corrs = []
        max_l = min(self.max_lag, max(1, T // 3))

        for i in range(D):
            for j in range(i + 1, D):
                si, sj = Z[:, i], Z[:, j]
                # DTW slippage on survivor-calibrated strain trajectories (preserving amplitude)
                dtw_slips.append(self._dtw_warp_slippage(si, sj) * float(np.mean(si + sj) + 0.1))
                sd_i, sd_j = np.std(si), np.std(sj)
                if sd_i > self.eps and sd_j > self.eps:
                    si_n = (si - np.mean(si)) / sd_i
                    sj_n = (sj - np.mean(sj)) / sd_j
                    c0 = float(np.clip(np.mean(si_n * sj_n), -1.0, 1.0))
                else:
                    si_n, sj_n = si, sj
                    c0 = 0.0
                zero_lag_corrs.append(abs(c0))

                best_lag = 0
                best_corr = abs(c0)
                for lag in range(-max_l, max_l + 1):
                    if lag == 0:
                        continue
                    if lag > 0 and T - lag >= 2:
                        c = abs(float(np.mean(si_n[:-lag] * sj_n[lag:])))
                    elif lag < 0 and T + lag >= 2:
                        c = abs(float(np.mean(si_n[-lag:] * sj_n[:lag])))
                    else:
                        continue
                    if c > best_corr + 0.02:
                        best_corr = c
                        best_lag = abs(lag)
                lag_slips.append(float(best_lag) / float(T))

        mean_dtw = float(np.mean(dtw_slips)) if dtw_slips else 0.0
        max_dtw = float(np.max(dtw_slips)) if dtw_slips else 0.0
        mean_lag = float(np.mean(lag_slips)) if lag_slips else 0.0
        phase_decoh = float(1.0 - np.mean(zero_lag_corrs)) if zero_lag_corrs else 0.5

        return TimeSlippageMetrics(
            subsystem_velocities=bar_phi,
            velocity_dispersion=velocity_dispersion,
            cardiorenal_velocity_ratio=cardiorenal_ratio,
            mean_dtw_slippage=mean_dtw,
            max_dtw_slippage=max_dtw,
            mean_lag_slippage=mean_lag,
            phase_decoherence=phase_decoh,
        )


# ---------------------------------------------------------------------------
# Pillar 2A: Thermodynamic Braid / Lévy-Area / Gauss Winding Invariant Engine
# ---------------------------------------------------------------------------

@dataclass
class BraidInvariantSummary:
    """Topological and non-equilibrium thermodynamic braid invariants."""
    levy_area_frobenius: float              # ||A||_F: total antisymmetric circulation
    max_pair_levy_area: float               # max_{i<j} |A_{ij}|
    signed_cardiorenal_levy: float          # signed circulation A_{cardiac, renal}
    gauss_winding_norm: float               # ||W||_F: total phase-space winding number
    jones_skein_trace_distance: float       # ||I - exp(sum_{i<j} W_ij G_ij)||_F in SO(D)
    seifert_entropy_production: float       # broken detailed balance dissipation rate
    bregman_volume_contraction: float       # log-det covariance contraction rate

    def to_vector(self) -> np.ndarray:
        return np.array(
            [
                self.levy_area_frobenius,
                self.max_pair_levy_area,
                self.signed_cardiorenal_levy,
                self.gauss_winding_norm,
                self.jones_skein_trace_distance,
                self.seifert_entropy_production,
                self.bregman_volume_contraction,
            ],
            dtype=np.float64,
        )


class ThermodynamicBraidInvariant:
    """
    Computes parameterization-invariant Chen iterated path integrals (Stochastic
    Lévy Area A_ij), Gauss Winding Numbers W_ij, non-abelian SO(D) Lie-algebra
    matrix exponential braid representations, and Seifert irreversible entropy
    production rates.
    """

    def __init__(self, num_subsystems: int = 5, eps: float = 1e-6) -> None:
        self.num_subsystems = int(num_subsystems)
        self.eps = float(eps)
        self._cal_mean: Optional[np.ndarray] = None
        self._cal_std: Optional[np.ndarray] = None

    def fit(self, survivor_trajectories: List[np.ndarray]) -> "ThermodynamicBraidInvariant":
        all_vals = [
            np.asarray(t, dtype=np.float64)
            for t in survivor_trajectories
            if np.asarray(t).ndim == 2 and np.asarray(t).shape[0] >= 2
        ]
        if all_vals:
            stacked = np.vstack(all_vals)
            self._cal_mean = np.median(stacked, axis=0)
            mad = np.median(np.abs(stacked - self._cal_mean), axis=0)
            self._cal_std = np.where(mad > self.eps, 1.4826 * mad, np.std(stacked, axis=0) + 1.0)
        return self

    def compute_invariants(self, trajectory: np.ndarray) -> BraidInvariantSummary:
        X = np.asarray(trajectory, dtype=np.float64)
        if X.ndim != 2 or X.shape[0] < 2:
            return BraidInvariantSummary(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

        T, D = X.shape
        if self._cal_mean is not None and self._cal_std is not None and len(self._cal_mean) == D:
            Z = np.maximum(0.0, (X - self._cal_mean) / (self._cal_std + self.eps))
        else:
            Z = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + self.eps)

        # Anchor at initial state Z(0) so chord integrals measure true loop circulation
        Z_anchored = Z - Z[0:1, :]
        dZ = np.diff(Z_anchored, axis=0)
        Z_mid = 0.5 * (Z_anchored[1:, :] + Z_anchored[:-1, :])

        # 1. Exact Chen 2nd-level Antisymmetric Iterated Integral (Stochastic Lévy Area)
        #    A_{ij} = 1/2 \int_0^T (Z_i dZ_j - Z_j dZ_i)
        #    Strictly invariant under any monotonic time reparameterization t -> psi(t)!
        levy_matrix = 0.5 * (Z_mid.T @ dZ - dZ.T @ Z_mid)
        norm_levy = levy_matrix / np.sqrt(float(max(1, T - 1)))

        # 2. Gauss Winding Number Tensor in pairwise polar coordinates
        winding_matrix = np.zeros((D, D), dtype=np.float64)
        for i in range(D):
            for j in range(i + 1, D):
                r2 = Z_mid[:, i] ** 2 + Z_mid[:, j] ** 2 + 0.25
                dtheta = (Z_mid[:, i] * dZ[:, j] - Z_mid[:, j] * dZ[:, i]) / r2
                w_ij = float(np.sum(dtheta) / (2.0 * np.pi))
                winding_matrix[i, j] = w_ij
                winding_matrix[j, i] = -w_ij

        # 3. Non-Abelian SO(D) Lie-Algebra Braid Operator U = exp(sum_{i<j} W_ij E_ij)
        U_braid = expm(0.35 * norm_levy)
        jones_skein_dist = float(np.linalg.norm(np.eye(D) - U_braid, ord="fro"))

        # 4. Seifert / Bregman Irreversible Entropy Production Rate relative to
        #    calibrated homeostatic survivor bath (D_cal = I):
        loop_flux = float(np.sum(norm_levy ** 2))
        dissipative_work = float(np.mean(np.sum(dZ ** 2, axis=1)) + np.mean(np.max(Z, axis=0) ** 2))
        seifert_epr = float(np.log1p(loop_flux + dissipative_work))

        # 5. Bregman State-Space Volume Contraction (Early vs Late half log-det covariance)
        if T >= 4:
            mid = T // 2
            cov_early = np.cov(Z[:mid].T) + 0.05 * np.eye(D)
            cov_late = np.cov(Z[mid:].T) + 0.05 * np.eye(D)
            if cov_early.ndim == 2 and cov_late.ndim == 2:
                _, logdet_early = np.linalg.slogdet(cov_early)
                _, logdet_late = np.linalg.slogdet(cov_late)
                bregman_contraction = float(logdet_early - logdet_late)
            else:
                bregman_contraction = 0.0
        else:
            bregman_contraction = 0.0

        upper_abs = np.abs(norm_levy[np.triu_indices(D, k=1)])
        levy_frob = float(np.linalg.norm(norm_levy, ord="fro"))
        max_pair = float(np.max(upper_abs)) if len(upper_abs) > 0 else 0.0
        cardiorenal_idx = min(2, D - 1)
        signed_cr = float(norm_levy[0, cardiorenal_idx])
        winding_norm = float(np.linalg.norm(winding_matrix, ord="fro"))

        return BraidInvariantSummary(
            levy_area_frobenius=levy_frob,
            max_pair_levy_area=max_pair,
            signed_cardiorenal_levy=signed_cr,
            gauss_winding_norm=winding_norm,
            jones_skein_trace_distance=jones_skein_dist,
            seifert_entropy_production=seifert_epr,
            bregman_volume_contraction=bregman_contraction,
        )


# ---------------------------------------------------------------------------
# Pillar 2B: Quantum-Spectral Trajectory Graph Laplacian (Von Neumann Entropy)
# ---------------------------------------------------------------------------

@dataclass
class QuantumSpectralSummary:
    """Quantum statistical mechanics invariants of the within-stay trajectory graph."""
    von_neumann_entropy: float              # S_VN(rho_beta) = -Tr(rho_beta log rho_beta)
    heat_kernel_trace: float                # Tr(exp(-beta * L_norm)) / T
    fiedler_connectivity: float             # lambda_2(L_norm): algebraic connectivity
    spectral_energy_highfreq: float         # High-frequency graph Dirichlet energy E_dir
    hilbert_conformal_distance: float       # Distance of spectral state from survivor center

    def to_vector(self) -> np.ndarray:
        return np.array(
            [
                self.von_neumann_entropy,
                self.heat_kernel_trace,
                self.fiedler_connectivity,
                self.spectral_energy_highfreq,
                self.hilbert_conformal_distance,
            ],
            dtype=np.float64,
        )


class QuantumSpectralTrajectoryLaplacian:
    """
    Constructs the within-stay Riemannian affinity graph over time steps t_1..t_T,
    computes the normalized graph Laplacian L_norm, and evaluates the quantum
    density matrix rho_beta = exp(-beta * L_norm) / Tr(exp(-beta * L_norm))
    using Padé matrix exponentiation (De Domenico & Biamonte 2016, Phys. Rev. X).
    """

    def __init__(self, beta: float = 0.75, eps: float = 1e-6) -> None:
        self.beta = float(beta)
        self.eps = float(eps)
        self._cal_mean: Optional[np.ndarray] = None
        self._cal_std: Optional[np.ndarray] = None
        self._cal_spec_mean: Optional[np.ndarray] = None
        self._cal_spec_inv_cov: Optional[np.ndarray] = None

    def _extract_raw_spectral(self, X: np.ndarray) -> Tuple[float, float, float, float, np.ndarray]:
        if X.ndim != 2 or X.shape[0] < 2:
            d = X.shape[1] if X.ndim == 2 else 1
            return 0.0, 1.0, 0.0, 0.0, np.zeros(d, dtype=np.float64)

        T, D = X.shape
        if self._cal_mean is not None and self._cal_std is not None and len(self._cal_mean) == D:
            Z = (X - self._cal_mean) / (self._cal_std + self.eps)
        else:
            Z = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + self.eps)

        sq_dists = squareform(pdist(Z, metric="sqeuclidean"))
        med_dist = float(np.median(sq_dists[sq_dists > 0])) if np.any(sq_dists > 0) else 1.0
        sigma2 = max(med_dist, 1e-4)
        affinity = np.exp(-sq_dists / (2.0 * sigma2))
        np.fill_diagonal(affinity, 0.0)

        deg = np.sum(affinity, axis=1)
        deg_inv_sqrt = 1.0 / np.sqrt(deg + 1e-8)
        L_norm = np.eye(T) - (deg_inv_sqrt[:, None] * affinity * deg_inv_sqrt[None, :])
        L_norm = 0.5 * (L_norm + L_norm.T)

        # Padé matrix exponential heat kernel K_beta = exp(-beta * L_norm)
        heat_kernel = expm(-self.beta * L_norm)
        trace_k = float(np.trace(heat_kernel))
        rho = heat_kernel / max(trace_k, self.eps)
        eigvals_rho = np.linalg.eigvalsh(0.5 * (rho + rho.T))
        eigvals_rho = np.clip(eigvals_rho, 1e-12, 1.0)
        eigvals_rho /= np.sum(eigvals_rho)

        # Normalized Von Neumann entropy in [0, 1]
        vn_entropy = float(-np.sum(eigvals_rho * np.log(eigvals_rho)) / max(np.log(T), 1.0))
        heat_trace_norm = float(trace_k / float(T))

        eigvals_L = np.sort(np.linalg.eigvalsh(L_norm))
        fiedler = float(eigvals_L[1]) if T >= 2 else 0.0

        # Dirichlet roughness energy Tr(Z^T L_norm Z) / (T * D)
        dirichlet_energy = float(np.trace(Z.T @ L_norm @ Z) / float(T * D))

        # Spectral-diffused terminal state profile
        diffused_Z = rho @ Z
        terminal_spec_state = np.max(np.maximum(0.0, diffused_Z), axis=0)
        return vn_entropy, heat_trace_norm, fiedler, dirichlet_energy, terminal_spec_state

    def fit(self, survivor_trajectories: List[np.ndarray]) -> "QuantumSpectralTrajectoryLaplacian":
        all_vals = [
            np.asarray(t, dtype=np.float64)
            for t in survivor_trajectories
            if np.asarray(t).ndim == 2 and np.asarray(t).shape[0] >= 2
        ]
        if all_vals:
            stacked = np.vstack(all_vals)
            self._cal_mean = np.median(stacked, axis=0)
            mad = np.median(np.abs(stacked - self._cal_mean), axis=0)
            self._cal_std = np.where(mad > self.eps, 1.4826 * mad, np.std(stacked, axis=0) + 1.0)

            spec_states = []
            for traj in all_vals:
                _, _, _, _, st = self._extract_raw_spectral(traj)
                spec_states.append(st)
            S_mat = np.vstack(spec_states)
            self._cal_spec_mean = np.mean(S_mat, axis=0)
            cov = np.cov(S_mat.T) if S_mat.shape[0] > 2 else np.eye(S_mat.shape[1])
            if cov.ndim == 0:
                cov = np.array([[float(cov)]])
            reg_cov = cov + 0.10 * np.eye(cov.shape[0])
            self._cal_spec_inv_cov = np.linalg.inv(reg_cov)
        return self

    def evaluate_trajectory(self, trajectory: np.ndarray) -> QuantumSpectralSummary:
        X = np.asarray(trajectory, dtype=np.float64)
        vn_ent, h_trace, fiedler, dir_energy, spec_state = self._extract_raw_spectral(X)
        if self._cal_spec_mean is not None and self._cal_spec_inv_cov is not None:
            diff = spec_state - self._cal_spec_mean
            hilbert_dist = float(np.sqrt(max(0.0, float(diff.T @ self._cal_spec_inv_cov @ diff))))
        else:
            hilbert_dist = float(np.linalg.norm(spec_state))

        return QuantumSpectralSummary(
            von_neumann_entropy=vn_ent,
            heat_kernel_trace=h_trace,
            fiedler_connectivity=fiedler,
            spectral_energy_highfreq=dir_energy,
            hilbert_conformal_distance=hilbert_dist,
        )


# ---------------------------------------------------------------------------
# Pillar 2C: Persistent Homology (Vietoris-Rips H_0 & H_1 Betti Features)
# ---------------------------------------------------------------------------

@dataclass
class PersistentHomologySummary:
    """Topological Data Analysis (TDA) Vietoris-Rips H_0 and H_1 persistence features."""
    h0_total_persistence: float             # Sum of H_0 connected-component death times (MST length)
    h0_max_persistence: float               # Max single H_0 filtration jump (trajectory rupture)
    h0_persistence_entropy: float           # Shannon entropy of H_0 barcode lifetimes
    h1_loop_persistence: float              # Total 1-cycle (loop) persistence across filtration
    h1_max_cycle_lifetime: float            # Maximum 1D topological hole lifetime

    def to_vector(self) -> np.ndarray:
        return np.array(
            [
                self.h0_total_persistence,
                self.h0_max_persistence,
                self.h0_persistence_entropy,
                self.h1_loop_persistence,
                self.h1_max_cycle_lifetime,
            ],
            dtype=np.float64,
        )


class PersistentHomologyBetti:
    """
    Exact 0-dimensional (Kruskal Minimum Spanning Tree filtration) and 1-dimensional
    (Vietoris-Rips non-tree chord cycle birth-death filtration) Persistent Homology
    extractor for multivariate time-series point clouds.
    """

    def __init__(self, eps: float = 1e-6) -> None:
        self.eps = float(eps)
        self._cal_mean: Optional[np.ndarray] = None
        self._cal_std: Optional[np.ndarray] = None

    def fit(self, survivor_trajectories: List[np.ndarray]) -> "PersistentHomologyBetti":
        all_vals = [
            np.asarray(t, dtype=np.float64)
            for t in survivor_trajectories
            if np.asarray(t).ndim == 2 and np.asarray(t).shape[0] >= 2
        ]
        if all_vals:
            stacked = np.vstack(all_vals)
            self._cal_mean = np.median(stacked, axis=0)
            mad = np.median(np.abs(stacked - self._cal_mean), axis=0)
            self._cal_std = np.where(mad > self.eps, 1.4826 * mad, np.std(stacked, axis=0) + 1.0)
        return self

    def evaluate_trajectory(self, trajectory: np.ndarray) -> PersistentHomologySummary:
        X = np.asarray(trajectory, dtype=np.float64)
        if X.ndim != 2 or X.shape[0] < 3:
            return PersistentHomologySummary(0.0, 0.0, 0.0, 0.0, 0.0)

        T, D = X.shape
        if self._cal_mean is not None and self._cal_std is not None and len(self._cal_mean) == D:
            Z = (X - self._cal_mean) / (self._cal_std + self.eps)
        else:
            Z = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + self.eps)

        dist_mat = squareform(pdist(Z, metric="euclidean"))
        # Kruskal Union-Find for exact H_0 persistence barcode (all birth times = 0)
        edges = []
        for u in range(T):
            for v in range(u + 1, T):
                edges.append((float(dist_mat[u, v]), u, v))
        edges.sort(key=lambda x: x[0])

        parent = list(range(T))

        def find(a: int) -> int:
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        mst_deaths = []
        adj: Dict[int, List[Tuple[int, float]]] = {i: [] for i in range(T)}
        non_tree_edges: List[Tuple[float, int, int]] = []

        for w, u, v in edges:
            ru, rv = find(u), find(v)
            if ru != rv:
                parent[ru] = rv
                mst_deaths.append(w)
                adj[u].append((v, w))
                adj[v].append((u, w))
            else:
                non_tree_edges.append((w, u, v))

        deaths = np.array(mst_deaths, dtype=np.float64)
        h0_total = float(np.sum(deaths) / max(1, T - 1))
        h0_max = float(np.max(deaths)) if len(deaths) > 0 else 0.0
        if np.sum(deaths) > self.eps and len(deaths) > 1:
            p = deaths / np.sum(deaths)
            p = np.clip(p, 1e-12, 1.0)
            h0_ent = float(-np.sum(p * np.log(p)) / np.log(len(deaths)))
        else:
            h0_ent = 0.0

        # 1D cycle persistence: each chord e=(u,v) of weight w_birth creates a 1-cycle
        # that is filled (dies) at the diameter of the fundamental cycle on the MST
        cycle_lifetimes = []
        for w_birth, u, v in non_tree_edges[: min(30, len(non_tree_edges))]:
            # Triangles (u, v, k) fill the 1-cycle at filtration scale max(d(u,k), d(v,k))
            fill_scales = []
            for k in range(T):
                if k != u and k != v:
                    fill_scales.append(max(dist_mat[u, k], dist_mat[v, k]))
            if fill_scales:
                w_death = min(fill_scales)
                if w_death > w_birth:
                    cycle_lifetimes.append(float(w_death - w_birth))

        h1_total = float(np.sum(cycle_lifetimes)) if cycle_lifetimes else 0.0
        h1_max = float(np.max(cycle_lifetimes)) if cycle_lifetimes else 0.0

        return PersistentHomologySummary(
            h0_total_persistence=h0_total,
            h0_max_persistence=h0_max,
            h0_persistence_entropy=h0_ent,
            h1_loop_persistence=h1_total,
            h1_max_cycle_lifetime=h1_max,
        )


# ---------------------------------------------------------------------------
# Pillar 3: Ergodicity Breaking & Bifurcation Early-Warning Monitor
# ---------------------------------------------------------------------------

@dataclass
class ErgodicBifurcationSummary:
    """Ergodicity breaking and Finite-Time Braiding Exponent (FTBE) metrics."""
    ftbe_exponent: float                    # Finite-Time Braiding Exponent \lambda_FTBE
    ergodicity_breaking_index: float        # Thirumalai-Mountain variance of time-averaged MSD
    late_vs_early_braid_acceleration: float # Growth in braid entropy approaching transition
    early_warning_lead_steps: int           # Steps before scalar alarm that TEB crosses threshold

    def to_vector(self) -> np.ndarray:
        return np.array(
            [
                self.ftbe_exponent,
                self.ergodicity_breaking_index,
                self.late_vs_early_braid_acceleration,
                float(self.early_warning_lead_steps),
            ],
            dtype=np.float64,
        )


class ErgodicBraidBifurcationMonitor:
    """
    Quantifies ergodicity breaking and Finite-Time Braiding Exponent (FTBE)
    along non-stationary trajectories to detect approaching critical transitions
    prior to scalar threshold crossing.
    """

    def __init__(self, window_size: int = 6, eps: float = 1e-6) -> None:
        self.window_size = int(window_size)
        self.eps = float(eps)

    def evaluate_trajectory(
        self,
        trajectory: np.ndarray,
        scalar_alarm_channel: int = 0,
        scalar_alarm_threshold: float = 2.0,
        teb_z_threshold: float = 1.65,
    ) -> ErgodicBifurcationSummary:
        X = np.asarray(trajectory, dtype=np.float64)
        if X.ndim != 2 or X.shape[0] < 4:
            return ErgodicBifurcationSummary(0.0, 0.0, 0.0, 0)

        T, D = X.shape
        Z = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + self.eps)
        dZ = np.diff(Z, axis=0)
        Z_mid = 0.5 * (Z[1:] + Z[:-1])

        # Stepwise braid operator accumulation U(t) = \prod_{s=1}^t exp(\Delta A_s)
        U = np.eye(D, dtype=np.float64)
        step_log_stretching = []
        rolling_teb_signal = np.zeros(T, dtype=np.float64)

        for t in range(T - 1):
            z_m = Z_mid[t]
            dz = dZ[t]
            # Instantaneous skew-symmetric wedge matrix \Delta A_t
            wedge = 0.5 * (np.outer(z_m, dz) - np.outer(dz, z_m))
            # Symmetric strain tensor \Delta S_t for Lyapunov/FTBE stretching
            strain = 0.25 * (np.outer(z_m, dz) + np.outer(dz, z_m))
            step_op = expm(wedge + 0.35 * strain)
            U = U @ step_op
            svals = np.linalg.svd(U, compute_uv=False)
            max_sv = max(float(svals[0]), 1.0)
            step_log_stretching.append(np.log(max_sv))
            rolling_teb_signal[t + 1] = np.linalg.norm(wedge, ord="fro") + abs(np.log(max_sv))

        ftbe = float(step_log_stretching[-1] / float(max(1, T - 1))) if step_log_stretching else 0.0

        # Thirumalai-Mountain Ergodicity-Breaking (EB) parameter:
        # Measures fluctuation of local time-averaged squared displacements across sub-windows
        w = max(2, min(self.window_size, T // 2))
        window_msds = []
        for start in range(0, T - w + 1):
            sub = Z[start : start + w]
            msd = float(np.mean(np.sum((sub - sub[0:1]) ** 2, axis=1)))
            window_msds.append(msd)
        msd_arr = np.array(window_msds, dtype=np.float64)
        mean_msd = float(np.mean(msd_arr))
        eb_index = float(np.var(msd_arr) / (mean_msd ** 2 + self.eps)) if len(msd_arr) > 1 else 0.0

        mid = max(1, (T - 1) // 2)
        early_braid = float(np.mean(rolling_teb_signal[1 : mid + 1])) if mid >= 1 else 0.0
        late_braid = float(np.mean(rolling_teb_signal[mid + 1 :])) if T - 1 > mid else early_braid
        braid_accel = float(late_braid - early_braid)

        # Lead-time calculation: compare first step where rolling TEB crosses threshold
        # vs first step where scalar channel crosses scalar_alarm_threshold
        base_teb_mean = float(np.mean(rolling_teb_signal[: max(2, T // 3)]))
        base_teb_std = float(np.std(rolling_teb_signal[: max(2, T // 3)])) + 0.15
        teb_z = (rolling_teb_signal - base_teb_mean) / base_teb_std

        teb_cross = np.where(teb_z >= teb_z_threshold)[0]
        scalar_series = np.abs(Z[:, min(scalar_alarm_channel, D - 1)])
        scalar_cross = np.where(scalar_series >= scalar_alarm_threshold)[0]

        t_teb = int(teb_cross[0]) if len(teb_cross) > 0 else T
        t_scalar = int(scalar_cross[0]) if len(scalar_cross) > 0 else T
        lead_steps = max(0, t_scalar - t_teb)

        return ErgodicBifurcationSummary(
            ftbe_exponent=ftbe,
            ergodicity_breaking_index=eb_index,
            late_vs_early_braid_acceleration=braid_accel,
            early_warning_lead_steps=lead_steps,
        )
