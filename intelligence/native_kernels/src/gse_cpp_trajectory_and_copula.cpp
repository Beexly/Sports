#ifndef GSE_BUILDING_DLL
#define GSE_BUILDING_DLL
#endif
#include "gse_cpp_kernel.hpp"
#include <algorithm>
#include <cmath>
#include <vector>

namespace gse::cpp {

double Xoshiro256StarStar::next_standard_normal() noexcept {
    // Box-Muller transform using deterministic open-interval uniforms
    const double u1 = next_uniform_open();
    const double u2 = next_uniform_open();
    const double r = std::sqrt(-2.0 * std::log(u1));
    constexpr double two_pi = 6.28318530717958647692;
    return r * std::cos(two_pi * u2);
}

double Xoshiro256StarStar::next_chi_square_df4() noexcept {
    // Chi-square(df=4) is identically distributed as -2 * ln(U1 * U2)
    // or sum of 4 squared standard normals. Using -2 * (ln(U1) + ln(U2)) is exact & branchless.
    const double u1 = next_uniform_open();
    const double u2 = next_uniform_open();
    const double chi2 = -2.0 * (std::log(u1) + std::log(u2));
    return chi2 > 1e-6 ? chi2 : 1e-6;
}

StudentTCopulaEngine::StudentTCopulaEngine(size_t n_sims, size_t n_players, uint64_t seed)
    : n_sims_(n_sims), n_players_(n_players), seed_(seed) {}

gse_status_t StudentTCopulaEngine::simulate_correlated_dfs_worlds(
    std::span<const double> mean_fpts,
    std::span<const double> std_fpts,
    std::span<const int32_t> team_ids,
    std::span<const int32_t> game_ids,
    std::span<const int32_t> pos_codes,
    std::span<double> out_worlds_matrix,
    std::span<double> out_p90_ceiling,
    std::span<double> out_p99_ceiling,
    std::span<double> out_bonus_prob
) noexcept {
    if (mean_fpts.size() != n_players_ || std_fpts.size() != n_players_ ||
        team_ids.size() != n_players_ || game_ids.size() != n_players_ ||
        pos_codes.size() != n_players_ ||
        out_worlds_matrix.size() != n_sims_ * n_players_ ||
        out_p90_ceiling.size() != n_players_ ||
        out_p99_ceiling.size() != n_players_ ||
        out_bonus_prob.size() != n_players_) {
        return GSE_STATUS_ERR_INVALID_DIM;
    }

    Xoshiro256StarStar rng(seed_);

    // Map arbitrary game_ids and team_ids (including large ESPN event IDs or negative numbers)
    // to compact dense indices [0 .. K-1] so memory allocation is strictly O(n_players_)
    std::vector<int32_t> unique_games(game_ids.begin(), game_ids.end());
    std::sort(unique_games.begin(), unique_games.end());
    unique_games.erase(std::unique(unique_games.begin(), unique_games.end()), unique_games.end());

    std::vector<int32_t> unique_teams(team_ids.begin(), team_ids.end());
    std::sort(unique_teams.begin(), unique_teams.end());
    unique_teams.erase(std::unique(unique_teams.begin(), unique_teams.end()), unique_teams.end());

    std::vector<size_t> compact_game_idx(n_players_, 0U);
    std::vector<size_t> compact_team_idx(n_players_, 0U);
    for (size_t p = 0; p < n_players_; ++p) {
        auto git = std::lower_bound(unique_games.begin(), unique_games.end(), game_ids[p]);
        compact_game_idx[p] = static_cast<size_t>(std::distance(unique_games.begin(), git));
        auto tit = std::lower_bound(unique_teams.begin(), unique_teams.end(), team_ids[p]);
        compact_team_idx[p] = static_cast<size_t>(std::distance(unique_teams.begin(), tit));
    }

    std::vector<double> game_shocks(unique_games.size() + 1U, 0.0);
    std::vector<double> team_pass_shocks(unique_teams.size() + 1U, 0.0);
    std::vector<uint32_t> bonus_counts(n_players_, 0U);

    // Position codes: 1=QB, 2=RB, 3=WR, 4=TE, 5=DST
    for (size_t s = 0; s < n_sims_; ++s) {
        for (size_t g = 0; g < game_shocks.size(); ++g) {
            game_shocks[g] = rng.next_standard_normal();
        }
        for (size_t t = 0; t < team_pass_shocks.size(); ++t) {
            team_pass_shocks[t] = rng.next_standard_normal();
        }

        // Student-t (nu=4) radial scaling factor: sqrt(4 / chi2_4), clamped for numerical stability
        const double chi2 = rng.next_chi_square_df4();
        const double t_scale = std::clamp(std::sqrt(4.0 / chi2), 0.55, 2.65);
        const size_t row_offset = s * n_players_;

        for (size_t p = 0; p < n_players_; ++p) {
            const size_t g_id = compact_game_idx[p];
            const size_t t_id = compact_team_idx[p];
            const int32_t pos = pos_codes[p];

            const double g_z = game_shocks[g_id];
            const double t_z = team_pass_shocks[t_id];
            const double idio_z = rng.next_standard_normal();

            double latent_z = 0.0;
            if (pos == 1) { // QB
                latent_z = 0.46 * g_z + 0.64 * t_z + 0.61 * idio_z;
            } else if (pos == 3 || pos == 4) { // WR or TE
                latent_z = 0.42 * g_z + 0.52 * t_z + 0.74 * idio_z;
            } else if (pos == 2) { // RB
                latent_z = 0.28 * g_z - 0.14 * t_z + 0.95 * idio_z;
            } else { // DST
                latent_z = -0.25 * g_z + 0.96 * idio_z;
            }

            const double raw_mu = std::isfinite(mean_fpts[p]) ? mean_fpts[p] : 0.0;
            const double raw_sigma = std::isfinite(std_fpts[p]) ? std::abs(std_fpts[p]) : 0.0;
            const double mu = std::max(0.0, raw_mu);
            const double sigma = std::max(0.0, raw_sigma);
            double pts = std::max(0.0, mu + sigma * latent_z * t_scale);
            if (!std::isfinite(pts)) {
                pts = 0.0;
            }

            // DraftKings +3.0 milestone bonus trigger in right tail (300-yd pass / 100-yd rush/rec)
            bool hit_bonus = false;
            if (pos == 1 && pts >= 22.5) {
                pts += 3.0;
                hit_bonus = true;
            } else if ((pos == 2 || pos == 3 || pos == 4) && pts >= 18.5) {
                pts += 3.0;
                hit_bonus = true;
            }
            if (hit_bonus) {
                bonus_counts[p] += 1U;
            }
            out_worlds_matrix[row_offset + p] = pts;
        }
    }

    // Compute p90, p99, and bonus probabilities per player using std::nth_element
    std::vector<double> col_buf(n_sims_, 0.0);
    const size_t idx_p90 = static_cast<size_t>(0.90 * static_cast<double>(n_sims_ - 1));
    const size_t idx_p99 = static_cast<size_t>(0.99 * static_cast<double>(n_sims_ - 1));
    const double inv_sims = 1.0 / static_cast<double>(n_sims_);

    for (size_t p = 0; p < n_players_; ++p) {
        for (size_t s = 0; s < n_sims_; ++s) {
            col_buf[s] = out_worlds_matrix[s * n_players_ + p];
        }
        std::nth_element(col_buf.begin(), col_buf.begin() + static_cast<ptrdiff_t>(idx_p90), col_buf.end());
        out_p90_ceiling[p] = col_buf[idx_p90];

        std::nth_element(col_buf.begin(), col_buf.begin() + static_cast<ptrdiff_t>(idx_p99), col_buf.end());
        out_p99_ceiling[p] = col_buf[idx_p99];

        out_bonus_prob[p] = static_cast<double>(bonus_counts[p]) * inv_sims;
    }

    return GSE_STATUS_OK;
}

} // namespace gse::cpp

extern "C" GSE_API gse_status_t gse_cpp_simulate_student_t_dfs_worlds(
    const double* mean_fpts,
    const double* std_fpts,
    const int32_t* team_ids,
    const int32_t* game_ids,
    const int32_t* pos_codes,
    size_t n_sims,
    size_t n_players,
    uint64_t seed,
    double* out_worlds_matrix,
    double* out_p90_ceiling,
    double* out_p99_ceiling,
    double* out_bonus_prob
) {
    if (mean_fpts == nullptr || std_fpts == nullptr || team_ids == nullptr ||
        game_ids == nullptr || pos_codes == nullptr || out_worlds_matrix == nullptr ||
        out_p90_ceiling == nullptr || out_p99_ceiling == nullptr || out_bonus_prob == nullptr) {
        return GSE_STATUS_ERR_NULL_PTR;
    }
    if (n_sims == 0 || n_players == 0) {
        return GSE_STATUS_ERR_INVALID_DIM;
    }

    gse::cpp::StudentTCopulaEngine engine(n_sims, n_players, seed);
    return engine.simulate_correlated_dfs_worlds(
        std::span<const double>(mean_fpts, n_players),
        std::span<const double>(std_fpts, n_players),
        std::span<const int32_t>(team_ids, n_players),
        std::span<const int32_t>(game_ids, n_players),
        std::span<const int32_t>(pos_codes, n_players),
        std::span<double>(out_worlds_matrix, n_sims * n_players),
        std::span<double>(out_p90_ceiling, n_players),
        std::span<double>(out_p99_ceiling, n_players),
        std::span<double>(out_bonus_prob, n_players)
    );
}
