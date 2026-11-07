#ifndef GSE_CPP_KERNEL_HPP
#define GSE_CPP_KERNEL_HPP

#include "gse_c_kernel.h"
#include <cstddef>
#include <cstdint>

#ifdef __cplusplus
#include <memory>
#include <span>
#include <vector>

namespace gse::cpp {

/**
 * Deterministic, zero-allocation xoshiro256** PRNG engine for reproducible
 * 10,000-world x 175-snap and dedicated DFS Student-t copula simulations.
 * Follows cpp-pro Rule of Zero and constexpr initialization.
 */
class Xoshiro256StarStar final {
public:
    explicit constexpr Xoshiro256StarStar(uint64_t seed) noexcept : state_{0, 0, 0, 0} {
        uint64_t z = seed;
        for (size_t i = 0; i < 4; ++i) {
            z += 0x9e3779b97f4a7c15ULL;
            uint64_t x = z;
            x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
            x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
            state_[i] = x ^ (x >> 31);
        }
    }

    [[nodiscard]] inline uint64_t next_u64() noexcept {
        const uint64_t result = rotl(state_[1] * 5ULL, 7) * 9ULL;
        const uint64_t t = state_[1] << 17;
        state_[2] ^= state_[0];
        state_[3] ^= state_[1];
        state_[1] ^= state_[2];
        state_[0] ^= state_[3];
        state_[2] ^= t;
        state_[3] = rotl(state_[3], 45);
        return result;
    }

    [[nodiscard]] inline double next_uniform_open() noexcept {
        // Uniform in (0, 1) with 53-bit precision
        const uint64_t u = (next_u64() >> 11) | 1ULL;
        return static_cast<double>(u) * (1.0 / 9007199254740992.0);
    }

    [[nodiscard]] double next_standard_normal() noexcept;
    [[nodiscard]] double next_chi_square_df4() noexcept;

private:
    uint64_t state_[4];

    [[nodiscard]] static constexpr uint64_t rotl(const uint64_t x, int k) noexcept {
        return (x << k) | (x >> (64 - k));
    }
};

/**
 * Modern C++20 Student-t (nu = 4) Heavy-Tailed Copula Simulator for Stage 3
 * Dedicated DFS Contest Simulations (EQ-DFS-02 & EQ-DFS-07).
 */
class StudentTCopulaEngine final {
public:
    StudentTCopulaEngine(size_t n_sims, size_t n_players, uint64_t seed);
    ~StudentTCopulaEngine() noexcept = default;

    // Rule of Zero / non-copyable, movable
    StudentTCopulaEngine(const StudentTCopulaEngine&) = delete;
    StudentTCopulaEngine& operator=(const StudentTCopulaEngine&) = delete;
    StudentTCopulaEngine(StudentTCopulaEngine&&) noexcept = default;
    StudentTCopulaEngine& operator=(StudentTCopulaEngine&&) noexcept = default;

    [[nodiscard]] gse_status_t simulate_correlated_dfs_worlds(
        std::span<const double> mean_fpts,
        std::span<const double> std_fpts,
        std::span<const int32_t> team_ids,
        std::span<const int32_t> game_ids,
        std::span<const int32_t> pos_codes,
        std::span<double> out_worlds_matrix,
        std::span<double> out_p90_ceiling,
        std::span<double> out_p99_ceiling,
        std::span<double> out_bonus_prob
    ) noexcept;

private:
    size_t n_sims_;
    size_t n_players_;
    uint64_t seed_;
};

} // namespace gse::cpp

extern "C" {
#endif

/**
 * C ABI wrapper around gse::cpp::StudentTCopulaEngine::simulate_correlated_dfs_worlds
 * so Python ctypes can invoke the C++20 heavy-tailed copula engine directly.
 */
GSE_API gse_status_t gse_cpp_simulate_student_t_dfs_worlds(
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
);

#ifdef __cplusplus
}
#endif

#endif /* GSE_CPP_KERNEL_HPP */
