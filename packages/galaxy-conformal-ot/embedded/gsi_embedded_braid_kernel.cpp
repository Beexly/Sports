/**
 * gsi_embedded_braid_kernel.cpp
 * =============================
 * Deterministic bare-metal implementation of GSI Sovereign v4.0 Embedded Braid Kernel.
 */

#include "gsi_embedded_braid_kernel.hpp"
#include <algorithm>
#include <cmath>

namespace gsi::frontier::embedded {

void EmbeddedBraidKernel::interpolate_dropouts(
    const StaticSensorMatrix& input,
    std::array<std::array<float, BRAID_DIM>, SEQUENCE_STEPS>& clean_frames
) {
    bool has_valid_history = false;
    std::array<float, BRAID_DIM> last_valid{};

    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        bool is_dropped = true;
        for (std::size_t d = 0; d < BRAID_DIM; ++d) {
            if (std::abs(input.frames[t][d]) > 1e-6f) {
                is_dropped = false;
                break;
            }
        }

        if (!is_dropped) {
            clean_frames[t] = input.frames[t];
            last_valid = input.frames[t];
            has_valid_history = true;
        } else if (has_valid_history) {
            // Carry-forward previous valid telemetry
            clean_frames[t] = last_valid;
        } else {
            // Initial dropped frame: look ahead for the first valid frame
            bool found_ahead = false;
            for (std::size_t f = t + 1; f < SEQUENCE_STEPS; ++f) {
                for (std::size_t d = 0; d < BRAID_DIM; ++d) {
                    if (std::abs(input.frames[f][d]) > 1e-6f) {
                        clean_frames[t] = input.frames[f];
                        last_valid = input.frames[f];
                        has_valid_history = true;
                        found_ahead = true;
                        break;
                    }
                }
                if (found_ahead) break;
            }
            if (!found_ahead) {
                for (std::size_t d = 0; d < BRAID_DIM; ++d) {
                    clean_frames[t][d] = 0.0f;
                }
            }
        }
    }
}

void EmbeddedBraidKernel::compute_chen_levy_matrix(
    const std::array<std::array<float, BRAID_DIM>, SEQUENCE_STEPS>& frames,
    std::array<std::array<float, BRAID_DIM>, BRAID_DIM>& levy_matrix
) {
    // Clear output matrix
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        for (std::size_t j = 0; j < BRAID_DIM; ++j) {
            levy_matrix[i][j] = 0.0f;
        }
    }

    // Anchor at initial state Z(t) = frames[t] - frames[0]
    // Raw unstandardized Chen iterated integral is strictly invariant under monotonic time warping
    std::array<std::array<float, BRAID_DIM>, SEQUENCE_STEPS> z{};
    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        for (std::size_t d = 0; d < BRAID_DIM; ++d) {
            z[t][d] = frames[t][d] - frames[0][d];
        }
    }

    // Trapezoidal stochastic Lévy area integral:
    // A_{ij} = 0.5 * sum_{t=1}^{T-1} (z_mid_i * dz_j - z_mid_j * dz_i)
    for (std::size_t t = 1; t < SEQUENCE_STEPS; ++t) {
        for (std::size_t i = 0; i < BRAID_DIM; ++i) {
            float mid_i = 0.5f * (z[t][i] + z[t - 1][i]);
            float dz_i = z[t][i] - z[t - 1][i];
            for (std::size_t j = i + 1; j < BRAID_DIM; ++j) {
                float mid_j = 0.5f * (z[t][j] + z[t - 1][j]);
                float dz_j = z[t][j] - z[t - 1][j];
                float dA = 0.5f * (mid_i * dz_j - mid_j * dz_i);
                levy_matrix[i][j] += dA;
                levy_matrix[j][i] -= dA;
            }
        }
    }
}

void EmbeddedBraidKernel::matrix_exponential_so4(
    const std::array<std::array<float, BRAID_DIM>, BRAID_DIM>& G,
    std::array<std::array<float, BRAID_DIM>, BRAID_DIM>& expG
) {
    // expG = I_4 + sum_{k=1}^8 G^k / k!
    // Identity initialization
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        for (std::size_t j = 0; j < BRAID_DIM; ++j) {
            expG[i][j] = (i == j) ? 1.0f : 0.0f;
        }
    }

    std::array<std::array<float, BRAID_DIM>, BRAID_DIM> current_power{};
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        for (std::size_t j = 0; j < BRAID_DIM; ++j) {
            current_power[i][j] = (i == j) ? 1.0f : 0.0f;
        }
    }

    float factorial = 1.0f;
    for (std::size_t k = 1; k <= TAYLOR_ITERATIONS; ++k) {
        factorial *= static_cast<float>(k);

        // next_power = current_power * G
        std::array<std::array<float, BRAID_DIM>, BRAID_DIM> next_power{};
        for (std::size_t i = 0; i < BRAID_DIM; ++i) {
            for (std::size_t j = 0; j < BRAID_DIM; ++j) {
                float sum = 0.0f;
                for (std::size_t m = 0; m < BRAID_DIM; ++m) {
                    sum += current_power[i][m] * G[m][j];
                }
                next_power[i][j] = sum;
            }
        }

        current_power = next_power;
        float inv_fact = 1.0f / factorial;
        for (std::size_t i = 0; i < BRAID_DIM; ++i) {
            for (std::size_t j = 0; j < BRAID_DIM; ++j) {
                expG[i][j] += current_power[i][j] * inv_fact;
            }
        }
    }
}

float EmbeddedBraidKernel::compute_subsystem_clock_dispersion(
    const std::array<std::array<float, BRAID_DIM>, SEQUENCE_STEPS>& frames
) {
    std::array<float, BRAID_DIM> velocities{};
    for (std::size_t d = 0; d < BRAID_DIM; ++d) {
        float sum_diff = 0.0f;
        for (std::size_t t = 1; t < SEQUENCE_STEPS; ++t) {
            sum_diff += std::abs(frames[t][d] - frames[t - 1][d]);
        }
        velocities[d] = sum_diff / static_cast<float>(SEQUENCE_STEPS - 1);
    }

    float max_diff = 0.0f;
    float sum_v = 0.0f;
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        sum_v += velocities[i];
        for (std::size_t j = i + 1; j < BRAID_DIM; ++j) {
            float d = std::abs(velocities[i] - velocities[j]);
            if (d > max_diff) max_diff = d;
        }
    }
    float mean_v = sum_v / static_cast<float>(BRAID_DIM);
    float var_v = 0.0f;
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        float diff = velocities[i] - mean_v;
        var_v += diff * diff;
    }
    float std_v = std::sqrt(var_v / static_cast<float>(BRAID_DIM));

    return max_diff + std_v;
}

float EmbeddedBraidKernel::compute_dtw_slippage(
    const std::array<std::array<float, BRAID_DIM>, SEQUENCE_STEPS>& frames,
    std::size_t ch_a,
    std::size_t ch_b
) {
    // Zero-heap static DP table
    static float dp[SEQUENCE_STEPS][SEQUENCE_STEPS];

    // Normalize sequences locally
    float mean_a = 0.0f, mean_b = 0.0f;
    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        mean_a += frames[t][ch_a];
        mean_b += frames[t][ch_b];
    }
    mean_a /= static_cast<float>(SEQUENCE_STEPS);
    mean_b /= static_cast<float>(SEQUENCE_STEPS);

    dp[0][0] = std::abs((frames[0][ch_a] - mean_a) - (frames[0][ch_b] - mean_b));
    for (std::size_t i = 1; i < SEQUENCE_STEPS; ++i) {
        float cost = std::abs((frames[i][ch_a] - mean_a) - (frames[0][ch_b] - mean_b));
        dp[i][0] = dp[i - 1][0] + cost;
    }
    for (std::size_t j = 1; j < SEQUENCE_STEPS; ++j) {
        float cost = std::abs((frames[0][ch_a] - mean_a) - (frames[j][ch_b] - mean_b));
        dp[0][j] = dp[0][j - 1] + cost;
    }

    for (std::size_t i = 1; i < SEQUENCE_STEPS; ++i) {
        float val_a = frames[i][ch_a] - mean_a;
        for (std::size_t j = 1; j < SEQUENCE_STEPS; ++j) {
            float cost = std::abs(val_a - (frames[j][ch_b] - mean_b));
            float prev_min = std::min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
            dp[i][j] = prev_min + cost;
        }
    }

    // Backtrack along optimal warping path to measure displacement |i - j| / T
    std::size_t i = SEQUENCE_STEPS - 1;
    std::size_t j = SEQUENCE_STEPS - 1;
    float sum_disp = 0.0f;
    std::size_t steps = 0;

    while (i > 0 || j > 0) {
        float disp = std::abs(static_cast<float>(i) - static_cast<float>(j)) / static_cast<float>(SEQUENCE_STEPS);
        sum_disp += disp;
        steps++;

        if (i > 0 && j > 0) {
            float diag = dp[i - 1][j - 1];
            float up = dp[i - 1][j];
            float left = dp[i][j - 1];
            if (diag <= up && diag <= left) {
                i--; j--;
            } else if (up <= left) {
                i--;
            } else {
                j--;
            }
        } else if (i > 0) {
            i--;
        } else {
            j--;
        }
    }
    return (steps > 0) ? (sum_disp / static_cast<float>(steps)) : 0.0f;
}

BraidTelemetryOutput EmbeddedBraidKernel::process_frames(const StaticSensorMatrix& input) {
    // 1. Zero-heap carry-forward interpolation
    std::array<std::array<float, BRAID_DIM>, SEQUENCE_STEPS> clean_frames{};
    interpolate_dropouts(input, clean_frames);

    // 2. Skew-symmetric Chen Lévy Area matrix G
    std::array<std::array<float, BRAID_DIM>, BRAID_DIM> G{};
    compute_chen_levy_matrix(clean_frames, G);

    // Frobenius norm of Lévy Area matrix
    float frob_sq = 0.0f;
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        for (std::size_t j = 0; j < BRAID_DIM; ++j) {
            frob_sq += G[i][j] * G[i][j];
        }
    }
    float levy_circulation = std::sqrt(frob_sq);

    // 3. Matrix exponential exp(G_scaled) in SO(4) via Taylor expansion
    // Scale G to ensure convergence and numerically stable Lie group action
    float scale = (levy_circulation > 1.0f) ? (1.0f / levy_circulation) : 1.0f;
    std::array<std::array<float, BRAID_DIM>, BRAID_DIM> G_scaled{};
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        for (std::size_t j = 0; j < BRAID_DIM; ++j) {
            G_scaled[i][j] = G[i][j] * scale;
        }
    }

    std::array<std::array<float, BRAID_DIM>, BRAID_DIM> expG{};
    matrix_exponential_so4(G_scaled, expG);

    // Jones skein trace deviation ||I_4 - exp(G_scaled)||_F
    float skein_frob_sq = 0.0f;
    for (std::size_t i = 0; i < BRAID_DIM; ++i) {
        for (std::size_t j = 0; j < BRAID_DIM; ++j) {
            float expected_id = (i == j) ? 1.0f : 0.0f;
            float diff = expected_id - expG[i][j];
            skein_frob_sq += diff * diff;
        }
    }
    float skein_trace_dev = std::sqrt(skein_frob_sq);

    // 4. Seifert irreversible entropy production
    // Proportional to non-equilibrium broken detailed balance trace
    float seifert_rate = frob_sq / static_cast<float>(SEQUENCE_STEPS);
    float seifert_total = std::log1pf(frob_sq * 0.5f);

    // 5. Clock dispersion & DTW slippage
    float clock_disp = compute_subsystem_clock_dispersion(clean_frames);
    float dtw_slip = compute_dtw_slippage(clean_frames, 0, 2);

    // 6. Byles D(S_3) Stabilizer Magic Monotone M_2
    // Theoretical baseline ln(16/13) ~ 0.20763936f
    constexpr float THEO_M2 = 0.20763936f;
    float ds3_magic = THEO_M2 * (1.0f + 0.12f * std::tanh(levy_circulation));

    // 7. Crowley Failed Avalanche vs Runaway Horizon Gate
    float expansion_index = seifert_total * (1.0f + 0.5f * levy_circulation) * (1.0f + 0.15f * clock_disp);
    float damping = 1.0f / (1.0f + 0.2f * std::max(0.1f, clock_disp));
    float avalanche_ratio = expansion_index / std::max(damping, 0.25f);

    bool is_breach = (avalanche_ratio >= 3.2f) ||
                     (levy_circulation > 1.2f && seifert_total > 2.1f) ||
                     (clock_disp > 2.5f);

    BraidTelemetryOutput out{};
    out.chen_levy_circulation = levy_circulation;
    out.seifert_entropy_rate = seifert_rate;
    out.seifert_irreversible_entropy = seifert_total;
    out.clock_dispersion = clock_disp;
    out.dtw_slippage = dtw_slip;
    out.jones_skein_trace_deviation = skein_trace_dev;
    out.ds3_magic_monotone_m2 = ds3_magic;
    out.critical_shock_horizon_breach = is_breach;

    return out;
}

} // namespace gsi::frontier::embedded
