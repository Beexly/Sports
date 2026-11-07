#include "gse_c_kernel.h"
#include "gse_cpp_kernel.hpp"
#include <cassert>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <vector>

int main() {
    // 1. Test C11 Sinkhorn-Knopp Bounded Conservation (Gate G1)
    {
        const double priors[4] = {0.26, 0.22, 0.14, 0.05};
        const double floors[4] = {0.25, 0.18, 0.10, 0.00};
        const double caps[4]   = {0.38, 0.32, 0.25, 0.08};
        double out_w[4] = {0.0, 0.0, 0.0, 0.0};

        gse_status_t st = gse_c_sinkhorn_knopp_bounded_conservation(
            priors, floors, caps, 1.0, 4, 50, 1e-9, out_w
        );
        assert(st == GSE_STATUS_OK);
        double total = out_w[0] + out_w[1] + out_w[2] + out_w[3];
        assert(std::fabs(total - 1.0) < 1e-6);
        assert(out_w[0] >= floors[0] - 1e-9);
        assert(out_w[3] <= caps[3] + 1e-9);
        std::printf("[PASS] C11 Gate G1 Sinkhorn-Knopp Conservation: sum=%.6f, alpha_w=%.4f, wr4_w=%.4f\n",
                    total, out_w[0], out_w[3]);
    }

    // 2. Test C11 Empirical Bayes Role-Prior Shrinkage (Gate G2)
    {
        const double raw_fpts[2] = {15.0, 21.71}; // Player 0 = WR4 fluke, Player 1 = Ollie Gordon II bellcow
        const double dk_avg[2]   = {14.2, 12.5};
        const double priors[2]   = {2.8,  18.5};
        const double snaps[2]    = {8.0,  58.0};
        const int32_t bellcow[2] = {0,    1};
        const int32_t trap[2]    = {1,    0};
        double shrunk[2] = {0.0, 0.0};

        gse_status_t st = gse_c_empirical_bayes_role_shrinkage(
            raw_fpts, dk_avg, priors, snaps, bellcow, trap, 65.0, 2, shrunk
        );
        assert(st == GSE_STATUS_OK);
        assert(shrunk[0] <= 4.2 + 1e-9);
        assert(std::fabs(shrunk[1] - 21.71) < 1e-6);
        std::printf("[PASS] C11 Gate G2 Empirical Bayes Shrinkage: wr4_trap=%.2f (<=4.20), bellcow=%.2f\n",
                    shrunk[0], shrunk[1]);
    }

    // 3. Test C++20 Student-t (nu=4) Copula 10,000-World Simulator + Benchmark
    {
        constexpr size_t n_sims = 10000;
        constexpr size_t n_players = 80;
        std::vector<double> mean_fpts(n_players, 14.5);
        std::vector<double> std_fpts(n_players, 5.2);
        std::vector<int32_t> team_ids(n_players, 0);
        std::vector<int32_t> game_ids(n_players, 0);
        std::vector<int32_t> pos_codes(n_players, 3);

        for (size_t p = 0; p < n_players; ++p) {
            team_ids[p] = static_cast<int32_t>(p % 16);
            game_ids[p] = static_cast<int32_t>(p % 8);
            pos_codes[p] = static_cast<int32_t>((p % 5) + 1);
        }

        std::vector<double> out_worlds(n_sims * n_players, 0.0);
        std::vector<double> out_p90(n_players, 0.0);
        std::vector<double> out_p99(n_players, 0.0);
        std::vector<double> out_bonus(n_players, 0.0);

        const auto t0 = std::chrono::steady_clock::now();
        gse_status_t st = gse_cpp_simulate_student_t_dfs_worlds(
            mean_fpts.data(), std_fpts.data(), team_ids.data(), game_ids.data(), pos_codes.data(),
            n_sims, n_players, 20261107ULL,
            out_worlds.data(), out_p90.data(), out_p99.data(), out_bonus.data()
        );
        const auto t1 = std::chrono::steady_clock::now();
        const double elapsed_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();

        assert(st == GSE_STATUS_OK);
        assert(out_p99[0] > out_p90[0]);
        assert(out_p90[0] > mean_fpts[0]);
        std::printf("[PASS] C++20 Student-t (nu=4) 10,000x80 Copula Benchmark: %.2f ms (p90=%.2f, p99=%.2f)\n",
                    elapsed_ms, out_p90[0], out_p99[0]);
    }

    return 0;
}
