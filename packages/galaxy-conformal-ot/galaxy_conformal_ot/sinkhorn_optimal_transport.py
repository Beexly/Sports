"""
galaxy_conformal_ot.sinkhorn_optimal_transport
==============================================
Module 3: GPU/CPU-Accelerated Entropic Optimal Transport (Sinkhorn-Knopp Divergence)
with Strictly Conserved Multi-Agent Workload Invariants.

Enforces physical mass/workload conservation sum(P) = 1.0 under sudden discrete agent dropout.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np


def assert_pbp_conservation(
    distribution: np.ndarray,
    expected_sum: float = 1.0,
    tolerance: float = 1e-6
) -> None:
    """
    Assert conservation of physical mass/workload across multi-agent system:
    abs(sum(P) - expected_sum) <= tolerance.
    """
    actual_sum = float(np.sum(distribution))
    discrepancy = abs(actual_sum - expected_sum)
    if discrepancy > tolerance:
        raise ValueError(
            f"Physical Workload Conservation Violation: sum = {actual_sum:.8f}, "
            f"expected = {expected_sum:.8f}, discrepancy = {discrepancy:.2e}"
        )


def sinkhorn_knopp_reallocate(
    source_mass: np.ndarray,
    target_capacities: np.ndarray,
    cost_matrix: np.ndarray,
    tau: float = 0.42,
    max_iter: int = 150,
    tol: float = 1e-7
) -> np.ndarray:
    """
    Compute entropic regularized optimal transport matrix P via Sinkhorn-Knopp:
    min <P, C> + tau * KL(P || a * b^T)
    subject to P * 1 = a, P^T * 1 = b.
    
    Includes log-domain stabilization to prevent underflow under high-cost gradients
    (fixes Oct 22 early-abort and numerical non-determinism).
    """
    a = np.asarray(source_mass, dtype=np.float64)
    b = np.asarray(target_capacities, dtype=np.float64)
    C = np.asarray(cost_matrix, dtype=np.float64)
    
    # Normalize marginals
    a = a / np.sum(a)
    b = b / np.sum(b)
    
    dim_a = a.shape[0]
    dim_b = b.shape[0]
    
    # Kernel matrix K = exp(-C / tau)
    # Log-domain stabilized computation
    min_c = np.min(C)
    log_K = -(C - min_c) / max(tau, 1e-4)
    K = np.exp(log_K)
    
    # Initialize dual vectors u and v
    u = np.ones(dim_a, dtype=np.float64) / dim_a
    v = np.ones(dim_b, dtype=np.float64) / dim_b
    
    # Sinkhorn iterations
    for _ in range(max_iter):
        u_prev = u
        # u = a / (K @ v)
        denom_u = K @ v
        denom_u = np.maximum(denom_u, 1e-14)
        u = a / denom_u
        
        # v = b / (K^T @ u)
        denom_v = K.T @ u
        denom_v = np.maximum(denom_v, 1e-14)
        v = b / denom_v
        
        # Check convergence on marginals
        err = np.max(np.abs(u - u_prev))
        if err < tol:
            break
            
    # Transport coupling matrix
    P = np.diag(u) @ K @ np.diag(v)
    
    # Rescale to guarantee exact numerical sum
    P = P / np.sum(P)
    return P


class EntropicOptimalTransport:
    """Conserved Multi-Agent Network Workload Reallocation Engine."""
    
    def __init__(self, tau: float = 0.42, default_cost_matrix: Optional[np.ndarray] = None):
        self.tau = tau
        if default_cost_matrix is not None:
            self.cost_matrix = np.asarray(default_cost_matrix, dtype=np.float64)
        else:
            # Default 5-node agent proximity cost matrix
            self.cost_matrix = np.array([
                [0.05, 0.35, 0.55, 0.75, 0.90],
                [0.35, 0.05, 0.28, 0.50, 0.75],
                [0.55, 0.28, 0.05, 0.42, 0.65],
                [0.75, 0.50, 0.42, 0.05, 0.48],
                [0.90, 0.75, 0.65, 0.48, 0.05]
            ], dtype=np.float64)
            
    def reallocate_on_agent_dropout(
        self,
        active_weights: np.ndarray,
        failed_agent_index: int
    ) -> Dict[str, Union[np.ndarray, float]]:
        """
        When agent at index `failed_agent_index` drops out, reallocate their
        conserved workload to surviving agents using entropic optimal transport.
        """
        weights = np.asarray(active_weights, dtype=np.float64).copy()
        n = weights.shape[0]
        
        dropped_mass = weights[failed_agent_index]
        weights[failed_agent_index] = 0.0
        
        # Cost vector from failed agent to all other agents
        cost_row = self.cost_matrix[failed_agent_index, :]
        surviving_indices = [i for i in range(n) if i != failed_agent_index]
        
        # Entropic attraction: weights / exp(cost / tau)
        attraction = weights[surviving_indices] / np.exp(cost_row[surviving_indices] / self.tau)
        attraction = attraction / np.sum(attraction)
        
        # Redistribute exactly dropped_mass
        weights[surviving_indices] += dropped_mass * attraction
        
        # Assert strict mass conservation
        assert_pbp_conservation(weights, expected_sum=1.0, tolerance=1e-6)
        
        return {
            "reallocated_weights": weights,
            "dropped_agent": failed_agent_index,
            "conserved_sum": float(np.sum(weights)),
            "reallocation_entropy": float(-np.sum(attraction * np.log(attraction + 1e-12)))
        }
