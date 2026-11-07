#ifndef GSE_C_KERNEL_H
#define GSE_C_KERNEL_H

#include <stddef.h>
#include <stdint.h>

#ifdef _WIN32
  #ifdef GSE_BUILDING_DLL
    #define GSE_API __declspec(dllexport)
  #else
    #define GSE_API __declspec(dllimport)
  #endif
#else
  #define GSE_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Status codes returned by C11 native kernel operations.
 * Follows c-pro defensive error-checking rules.
 */
typedef enum {
    GSE_STATUS_OK = 0,
    GSE_STATUS_ERR_NULL_PTR = -1,
    GSE_STATUS_ERR_INVALID_DIM = -2,
    GSE_STATUS_ERR_ALLOC_FAILED = -3,
    GSE_STATUS_ERR_NON_CONVERGENCE = -4
} gse_status_t;

/**
 * Gate G1: Sinkhorn-Knopp iterative target/carry share conservation with
 * active alpha starter floor constraints.
 *
 * @param prior_weights     Input array of length n_players (non-negative prior shares)
 * @param min_floor_weights Input array of length n_players (Gate G1 alpha starter floors)
 * @param max_cap_weights   Input array of length n_players (role ceiling caps)
 * @param target_total_sum  Conserved team total share (e.g., 1.0 for target share)
 * @param n_players         Number of players on the team
 * @param max_iters         Maximum Bregman projection iterations
 * @param tol               Convergence tolerance (L1 residual)
 * @param out_weights       Output array of length n_players (caller-allocated)
 * @return GSE_STATUS_OK on success, negative error code otherwise
 */
GSE_API gse_status_t gse_c_sinkhorn_knopp_bounded_conservation(
    const double* prior_weights,
    const double* min_floor_weights,
    const double* max_cap_weights,
    double target_total_sum,
    size_t n_players,
    uint32_t max_iters,
    double tol,
    double* out_weights
);

/**
 * Gate G2: Empirical Bayes Role-Prior Shrinkage (EQ-DFS-EB-SHRINKAGE).
 * Shrinks noisy sample fantasy averages toward the positional/salary role prior,
 * preventing sub-floor WR4/TE3 1-game flukes from polluting MILP lineups.
 *
 * @param raw_sim_fpts       Input array [n_players] of raw simulation FPTS
 * @param dk_avg_fpts        Input array [n_players] of DraftKings CSV FPPG
 * @param salary_role_prior  Input array [n_players] of salary-conditioned role prior FPTS
 * @param effective_snaps    Input array [n_players] of effective sample snaps
 * @param is_vacated_bellcow Input array [n_players] (1 = verified vacated starter, 0 = normal)
 * @param is_sub_floor_trap  Input array [n_players] (1 = WR4/TE3/RB3 sub-floor trap, 0 = normal)
 * @param prior_strength_k   Shrinkage prior pseudo-snap constant (e.g. 65.0)
 * @param n_players          Number of players
 * @param out_shrunk_fpts    Output array [n_players] of shrunk projections
 * @return GSE_STATUS_OK on success
 */
GSE_API gse_status_t gse_c_empirical_bayes_role_shrinkage(
    const double* raw_sim_fpts,
    const double* dk_avg_fpts,
    const double* salary_role_prior,
    const double* effective_snaps,
    const int32_t* is_vacated_bellcow,
    const int32_t* is_sub_floor_trap,
    double prior_strength_k,
    size_t n_players,
    double* out_shrunk_fpts
);

/**
 * Stage 3 Dedicated DFS Scoring Kernel:
 * Computes exact DraftKings PPR + +3.0 (300-yd passing / 100-yd rushing / 100-yd receiving)
 * milestone bonus points across [n_sims x n_players] worlds in cache-aligned C11.
 *
 * @param base_fpts_matrix   Input [n_sims * n_players] row-major base fantasy points
 * @param pass_yds_matrix    Input [n_sims * n_players] row-major simulated passing yards
 * @param rush_yds_matrix    Input [n_sims * n_players] row-major simulated rushing yards
 * @param rec_yds_matrix     Input [n_sims * n_players] row-major simulated receiving yards
 * @param n_sims             Number of Monte Carlo worlds (e.g. 10,000)
 * @param n_players          Number of curated players
 * @param out_total_matrix   Output [n_sims * n_players] total DK points with bonuses
 * @param out_bonus_rate     Output [n_players] probability of hitting >= 1 DK 300/100-yd bonus
 * @return GSE_STATUS_OK on success
 */
GSE_API gse_status_t gse_c_dk_ppr_milestone_scoring(
    const double* base_fpts_matrix,
    const double* pass_yds_matrix,
    const double* rush_yds_matrix,
    const double* rec_yds_matrix,
    size_t n_sims,
    size_t n_players,
    double* out_total_matrix,
    double* out_bonus_rate
);

/**
 * EQ-DFS-10 & EQ-DFS-14: Pickands-Balkema-de Haan EVT Generalized Pareto (GPD)
 * p99.9 Milly-Maker Tail Exceedance + Tweedie Compound Poisson-Gamma Zero-Probability
 * & Wasserstein DRO Ambiguity-Adjusted Score (EQ-DFS-08).
 *
 * @param mean_fpts          Input [n_players] mean projected fantasy points
 * @param std_fpts           Input [n_players] standard deviation of fantasy points
 * @param p90_threshold      Input [n_players] empirical p90 threshold u_i
 * @param gpd_xi             Input [n_players] GPD tail shape parameter xi_i (>0 heavy tail)
 * @param wasserstein_eps    Wasserstein ambiguity ball radius epsilon_W
 * @param tweedie_p          Tweedie power index p in (1, 2) (e.g. 1.52)
 * @param n_players          Number of players
 * @param out_p999_evt       Output [n_players] EVT-GPD 99.9th percentile ceiling
 * @param out_zero_prob      Output [n_players] Tweedie exact point-mass at zero P(Y=0)
 * @param out_dro_robust_ev  Output [n_players] Wasserstein DRO lower-bound robust EV
 * @return GSE_STATUS_OK on success
 */
GSE_API gse_status_t gse_c_evt_gpd_tweedie_and_wasserstein_dro(
    const double* mean_fpts,
    const double* std_fpts,
    const double* p90_threshold,
    const double* gpd_xi,
    double wasserstein_eps,
    double tweedie_p,
    size_t n_players,
    double* out_p999_evt,
    double* out_zero_prob,
    double* out_dro_robust_ev
);

/**
 * EQ-DFS-12: Level-k Cognitive Hierarchy & Quantal Response Equilibrium (QRE)
 * Field Ownership Fixed-Point Solver (Camerer, Ho & Chong 2004; McKelvey & Palfrey 1995).
 *
 * @param projections        Input [n_players] GSE player projections
 * @param salaries           Input [n_players] DraftKings salaries
 * @param naive_fppg         Input [n_players] historical box-score FPPG (Level-0 anchor)
 * @param poisson_tau        Cognitive hierarchy Poisson mean thinking steps (e.g. 1.5)
 * @param n_players          Number of players
 * @param out_qre_ownership  Output [n_players] equilibrium field ownership probability
 * @param out_level3_edge    Output [n_players] GSE Level-3 best-response leverage score
 * @return GSE_STATUS_OK on success
 */
GSE_API gse_status_t gse_c_level_k_qre_ownership_fixed_point(
    const double* projections,
    const double* salaries,
    const double* naive_fppg,
    double poisson_tau,
    size_t n_players,
    double* out_qre_ownership,
    double* out_level3_edge
);

#ifdef __cplusplus
}
#endif

#endif /* GSE_C_KERNEL_H */
