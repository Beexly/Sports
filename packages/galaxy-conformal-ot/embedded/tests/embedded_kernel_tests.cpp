/**
 * tests/embedded_kernel_tests.cpp
 * ===============================
 * Bare-metal verification suite for GSI Sovereign v4.0 Embedded Braid Kernel.
 * Compiled with `-fno-exceptions -fno-rtti`.
 */

#include "gsi_embedded_braid_kernel.hpp"
#include <iostream>
#include <cassert>
#include <cmath>

using namespace gsi::frontier::embedded;

// 1. Verify Granger Slippage & Subsystem Clock Decoupling Detection
static bool verify_granger_slippage_resiliency() {
    std::cout << "[TEST 1] verify_granger_slippage_resiliency()... ";
    StaticSensorMatrix synchronized{};
    StaticSensorMatrix decoupled{};

    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        float tau = static_cast<float>(t) / static_cast<float>(SEQUENCE_STEPS);
        // Synchronized pacing across all 4 channels
        float base_wave = std::sin(2.0f * 3.14159265f * tau);
        synchronized.frames[t][0] = base_wave;
        synchronized.frames[t][1] = base_wave * 1.05f;
        synchronized.frames[t][2] = base_wave * 0.95f;
        synchronized.frames[t][3] = base_wave * 1.02f;

        // Decoupled / asynchronous clocks: fast ch0, lagging ch2
        decoupled.frames[t][0] = std::sin(6.0f * 3.14159265f * std::pow(tau, 0.45f));
        decoupled.frames[t][1] = std::sin(2.0f * 3.14159265f * tau);
        decoupled.frames[t][2] = std::sin(2.0f * 3.14159265f * std::pow(tau, 2.20f));
        decoupled.frames[t][3] = 0.5f * tau;
    }

    auto out_sync = EmbeddedBraidKernel::process_frames(synchronized);
    auto out_decoupled = EmbeddedBraidKernel::process_frames(decoupled);

    assert(out_decoupled.clock_dispersion > out_sync.clock_dispersion);
    assert(out_decoupled.dtw_slippage >= out_sync.dtw_slippage);

    std::cout << "PASSED (Sync disp: " << out_sync.clock_dispersion
              << " vs Decoupled disp: " << out_decoupled.clock_dispersion << ")\n";
    return true;
}

// 2. Verify Sparse Packet Dropout Invariance (Carry-Forward Interpolation)
static bool verify_sparse_packet_dropout_invariance() {
    std::cout << "[TEST 2] verify_sparse_packet_dropout_invariance()... ";
    StaticSensorMatrix pristine{};
    StaticSensorMatrix dropped{};

    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        float tau = static_cast<float>(t) / static_cast<float>(SEQUENCE_STEPS);
        pristine.frames[t][0] = std::sin(2.0f * 3.14159265f * tau);
        pristine.frames[t][1] = std::cos(2.0f * 3.14159265f * tau);
        pristine.frames[t][2] = std::sin(4.0f * 3.14159265f * tau);
        pristine.frames[t][3] = 0.5f * tau;

        // Introduce 25% periodic packet loss (zeroed frames)
        if (t % 4 == 0) {
            dropped.frames[t][0] = 0.0f;
            dropped.frames[t][1] = 0.0f;
            dropped.frames[t][2] = 0.0f;
            dropped.frames[t][3] = 0.0f;
        } else {
            dropped.frames[t] = pristine.frames[t];
        }
    }

    auto out_pristine = EmbeddedBraidKernel::process_frames(pristine);
    auto out_dropped = EmbeddedBraidKernel::process_frames(dropped);

    float rel_circ_diff = std::abs(out_pristine.chen_levy_circulation - out_dropped.chen_levy_circulation) /
                          std::max(out_pristine.chen_levy_circulation, 1e-4f);

    // Carry-forward interpolation maintains circulation within 10% tolerance
    assert(rel_circ_diff < 0.10f);

    std::cout << "PASSED (Rel error: " << (rel_circ_diff * 100.0f) << "%)\n";
    return true;
}

// 3. Verify Nonlinear Clock Time Warp Invariance
static bool verify_nonlinear_time_warp_invariance() {
    std::cout << "[TEST 3] verify_nonlinear_time_warp_invariance()... ";
    StaticSensorMatrix linear_time{};
    StaticSensorMatrix warped_time{};

    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        float tau = static_cast<float>(t) / static_cast<float>(SEQUENCE_STEPS);
        float tau_warped = std::pow(tau, 1.8f);

        auto path_point = [](float s) -> std::array<float, 4> {
            return {
                std::sin(2.0f * 3.14159265f * s) + 0.3f * s,
                std::cos(2.0f * 3.14159265f * s) - 0.2f * (s * s),
                0.7f * std::pow(s, 1.2f),
                0.4f * std::sin(4.0f * 3.14159265f * s)
            };
        };

        linear_time.frames[t] = path_point(tau);
        warped_time.frames[t] = path_point(tau_warped);
    }

    auto out_linear = EmbeddedBraidKernel::process_frames(linear_time);
    auto out_warped = EmbeddedBraidKernel::process_frames(warped_time);

    float circ_err = std::abs(out_linear.chen_levy_circulation - out_warped.chen_levy_circulation) /
                     std::max(out_linear.chen_levy_circulation, 1e-4f);

    // Chen Lévy area topological integral invariant under time warp < 5%
    assert(circ_err < 0.05f);

    std::cout << "PASSED (Warp drift: " << (circ_err * 100.0f) << "%)\n";
    return true;
}

// 4. Verify Crowley Failed Avalanche vs Runaway Shock Phase Transition
static bool verify_crowley_failed_avalanche_vs_sepsis_runaway() {
    std::cout << "[TEST 4] verify_crowley_failed_avalanche_vs_sepsis_runaway()... ";
    StaticSensorMatrix homeostatic_calm{};
    StaticSensorMatrix critical_shock{};

    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        float tau = static_cast<float>(t) / static_cast<float>(SEQUENCE_STEPS);
        // Calm quasiperiodic homeostatic state
        homeostatic_calm.frames[t][0] = 0.05f * std::sin(3.14159265f * tau);
        homeostatic_calm.frames[t][1] = 0.04f * std::cos(3.14159265f * tau);
        homeostatic_calm.frames[t][2] = 0.02f * tau;
        homeostatic_calm.frames[t][3] = 0.03f * std::sin(2.0f * 3.14159265f * tau);

        // Runaway shock: explosive spiral circulation + extreme clock divergence
        critical_shock.frames[t][0] = 3.5f * std::sin(8.0f * 3.14159265f * tau) * (1.0f + 2.0f * tau);
        critical_shock.frames[t][1] = 3.5f * std::cos(8.0f * 3.14159265f * tau) * (1.0f + 2.0f * tau);
        critical_shock.frames[t][2] = 2.8f * std::pow(tau, 3.0f);
        critical_shock.frames[t][3] = -2.5f * tau;
    }

    auto out_calm = EmbeddedBraidKernel::process_frames(homeostatic_calm);
    auto out_shock = EmbeddedBraidKernel::process_frames(critical_shock);

    // Calm state is arrested (critical_shock_horizon_breach == false)
    assert(!out_calm.critical_shock_horizon_breach);

    // Shock state undergoes runaway transition (critical_shock_horizon_breach == true)
    assert(out_shock.critical_shock_horizon_breach);
    assert(out_shock.chen_levy_circulation > out_calm.chen_levy_circulation);
    assert(out_shock.seifert_irreversible_entropy > out_calm.seifert_irreversible_entropy);

    std::cout << "PASSED (Calm breach: " << out_calm.critical_shock_horizon_breach
              << " vs Shock breach: " << out_shock.critical_shock_horizon_breach << ")\n";
    return true;
}

// 5. Verify Byles D(S_3) Measurement-Only Monotone Monotonicity
static bool verify_byles_ds3_measurement_only_braid() {
    std::cout << "[TEST 5] verify_byles_ds3_measurement_only_braid()... ";
    StaticSensorMatrix matrix{};
    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        float tau = static_cast<float>(t) / static_cast<float>(SEQUENCE_STEPS);
        matrix.frames[t][0] = std::sin(2.0f * 3.14159265f * tau);
        matrix.frames[t][1] = std::cos(2.0f * 3.14159265f * tau);
        matrix.frames[t][2] = 0.5f * tau;
        matrix.frames[t][3] = 0.2f * (tau * tau);
    }

    auto out = EmbeddedBraidKernel::process_frames(matrix);

    // Theoretical M_2 = ln(16/13) ~ 0.20763936f
    constexpr float THEO_M2 = 0.20763936f;
    assert(out.ds3_magic_monotone_m2 >= THEO_M2 * 0.99f);
    assert(out.ds3_magic_monotone_m2 <= 1.0f);
    assert(out.jones_skein_trace_deviation >= 0.0f);

    std::cout << "PASSED (M2: " << out.ds3_magic_monotone_m2
              << " vs Theo M2: " << THEO_M2 << ")\n";
    return true;
}

int main() {
    std::cout << "===================================================================\n";
    std::cout << " GSI Sovereign v4.0 Bare-Metal Embedded C++20 Verification Suite   \n";
    std::cout << " (-fno-exceptions -fno-rtti, Zero Heap Dynamic Allocations)        \n";
    std::cout << "===================================================================\n";

    bool p1 = verify_granger_slippage_resiliency();
    bool p2 = verify_sparse_packet_dropout_invariance();
    bool p3 = verify_nonlinear_time_warp_invariance();
    bool p4 = verify_crowley_failed_avalanche_vs_sepsis_runaway();
    bool p5 = verify_byles_ds3_measurement_only_braid();

    if (p1 && p2 && p3 && p4 && p5) {
        std::cout << "===================================================================\n";
        std::cout << " ALL 5 BARE-METAL EMBEDDED TESTS PASSED PERFECTLY!\n";
        std::cout << "===================================================================\n";
        return 0;
    }
    return 1;
}
