#ifndef GSE_BUILDING_DLL
#define GSE_BUILDING_DLL
#endif
#include "gse_c_kernel.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

gse_status_t gse_c_sinkhorn_knopp_bounded_conservation(
    const double* prior_weights,
    const double* min_floor_weights,
    const double* max_cap_weights,
    double target_total_sum,
    size_t n_players,
    uint32_t max_iters,
    double tol,
    double* out_weights
) {
    if (prior_weights == NULL || min_floor_weights == NULL ||
        max_cap_weights == NULL || out_weights == NULL) {
        return GSE_STATUS_ERR_NULL_PTR;
    }
    if (n_players == 0 || target_total_sum <= 0.0 || max_iters == 0) {
        return GSE_STATUS_ERR_INVALID_DIM;
    }

    double* w = (double*)calloc(n_players, sizeof(double));
    int* locked = (int*)calloc(n_players, sizeof(int));
    if (w == NULL || locked == NULL) {
        free(w);
        free(locked);
        return GSE_STATUS_ERR_ALLOC_FAILED;
    }

    double sum_prior = 0.0;
    for (size_t i = 0; i < n_players; ++i) {
        double p = prior_weights[i] > 1e-9 ? prior_weights[i] : 1e-9;
        w[i] = p;
        sum_prior += p;
    }

    /* Initial proportional scaling to target_total_sum */
    if (sum_prior > 0.0) {
        double scale = target_total_sum / sum_prior;
        for (size_t i = 0; i < n_players; ++i) {
            w[i] *= scale;
        }
    }

    /* Iterative Bregman / Sinkhorn-Knopp projection onto bounded simplex [min_floor, max_cap] */
    for (uint32_t iter = 0; iter < max_iters; ++iter) {
        int any_clamped = 0;
        double locked_sum = 0.0;
        double free_sum = 0.0;

        for (size_t i = 0; i < n_players; ++i) {
            if (locked[i]) {
                locked_sum += w[i];
                continue;
            }
            if (w[i] < min_floor_weights[i]) {
                w[i] = min_floor_weights[i];
                locked[i] = 1;
                locked_sum += w[i];
                any_clamped = 1;
            } else if (w[i] > max_cap_weights[i]) {
                w[i] = max_cap_weights[i];
                locked[i] = 1;
                locked_sum += w[i];
                any_clamped = 1;
            } else {
                free_sum += w[i];
            }
        }

        double remaining = target_total_sum - locked_sum;
        if (remaining < 0.0) {
            remaining = 0.0;
        }

        double current_total = locked_sum + free_sum;
        if (!any_clamped && fabs(current_total - target_total_sum) <= tol) {
            break;
        }

        if (free_sum > 1e-12 && remaining > 0.0) {
            double rescale = remaining / free_sum;
            for (size_t i = 0; i < n_players; ++i) {
                if (!locked[i]) {
                    w[i] *= rescale;
                }
            }
        } else {
            break;
        }
    }

    memcpy(out_weights, w, n_players * sizeof(double));
    free(w);
    free(locked);
    return GSE_STATUS_OK;
}

gse_status_t gse_c_empirical_bayes_role_shrinkage(
    const double* raw_sim_fpts,
    const double* dk_avg_fpts,
    const double* salary_role_prior,
    const double* effective_snaps,
    const int32_t* is_vacated_bellcow,
    const int32_t* is_sub_floor_trap,
    double prior_strength_k,
    size_t n_players,
    double* out_shrunk_fpts
) {
    if (raw_sim_fpts == NULL || dk_avg_fpts == NULL || salary_role_prior == NULL ||
        effective_snaps == NULL || is_vacated_bellcow == NULL ||
        is_sub_floor_trap == NULL || out_shrunk_fpts == NULL) {
        return GSE_STATUS_ERR_NULL_PTR;
    }
    if (n_players == 0 || prior_strength_k <= 0.0) {
        return GSE_STATUS_ERR_INVALID_DIM;
    }

    for (size_t i = 0; i < n_players; ++i) {
        if (is_sub_floor_trap[i] != 0 && is_vacated_bellcow[i] == 0) {
            /* Gate G2: Hard shrinkage on sub-floor WR4/TE3/RB3 trap */
            double shrunk = 0.25 * raw_sim_fpts[i] + 0.75 * salary_role_prior[i];
            if (shrunk > 4.2) {
                shrunk = 4.2;
            }
            out_shrunk_fpts[i] = shrunk > 0.0 ? shrunk : 0.0;
            continue;
        }

        double n_eff = effective_snaps[i] > 0.0 ? effective_snaps[i] : 15.0;
        double lambda = n_eff / (n_eff + prior_strength_k);
        double sample_est = raw_sim_fpts[i] > 0.0 ? raw_sim_fpts[i] : dk_avg_fpts[i];
        double blended = lambda * sample_est + (1.0 - lambda) * salary_role_prior[i];

        if (is_vacated_bellcow[i] != 0 && raw_sim_fpts[i] > blended) {
            /* Preserve verified vacated-workload bell-cow projection */
            blended = raw_sim_fpts[i];
        }
        out_shrunk_fpts[i] = blended > 0.0 ? blended : 0.0;
    }

    return GSE_STATUS_OK;
}

gse_status_t gse_c_dk_ppr_milestone_scoring(
    const double* base_fpts_matrix,
    const double* pass_yds_matrix,
    const double* rush_yds_matrix,
    const double* rec_yds_matrix,
    size_t n_sims,
    size_t n_players,
    double* out_total_matrix,
    double* out_bonus_rate
) {
    if (base_fpts_matrix == NULL || pass_yds_matrix == NULL ||
        rush_yds_matrix == NULL || rec_yds_matrix == NULL ||
        out_total_matrix == NULL || out_bonus_rate == NULL) {
        return GSE_STATUS_ERR_NULL_PTR;
    }
    if (n_sims == 0 || n_players == 0) {
        return GSE_STATUS_ERR_INVALID_DIM;
    }

    uint32_t* bonus_hits = (uint32_t*)calloc(n_players, sizeof(uint32_t));
    if (bonus_hits == NULL) {
        return GSE_STATUS_ERR_ALLOC_FAILED;
    }

    for (size_t s = 0; s < n_sims; ++s) {
        const size_t row_offset = s * n_players;
        for (size_t p = 0; p < n_players; ++p) {
            const size_t idx = row_offset + p;
            double bonus = 0.0;
            if (pass_yds_matrix[idx] >= 300.0) {
                bonus += 3.0;
            }
            if (rush_yds_matrix[idx] >= 100.0) {
                bonus += 3.0;
            }
            if (rec_yds_matrix[idx] >= 100.0) {
                bonus += 3.0;
            }
            if (bonus > 0.0) {
                bonus_hits[p] += 1U;
            }
            out_total_matrix[idx] = base_fpts_matrix[idx] + bonus;
        }
    }

    const double inv_sims = 1.0 / (double)n_sims;
    for (size_t p = 0; p < n_players; ++p) {
        out_bonus_rate[p] = (double)bonus_hits[p] * inv_sims;
    }

    free(bonus_hits);
    return GSE_STATUS_OK;
}
