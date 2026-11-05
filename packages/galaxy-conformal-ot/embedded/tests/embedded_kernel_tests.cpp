/**
 * tests/embedded_kernel_tests.cpp
 * ===============================
 * Bare-metal verification suite for GSI Sovereign v5.0 Embedded Braid &
 * 5-Domain Isomorphic Phase-Transition Kernel.
 * Compiled with `-fno-exceptions -fno-rtti`, Zero Heap Dynamic Allocations.
 */

#include "gsi_embedded_braid_kernel.hpp"
#include "gsi_telemetry_frame.hpp"
#include "gsi_cte_viscoelastic_waveguide_kernel.hpp"
#include <iostream>
#include <cassert>
#include <cmath>
#include <chrono>

using namespace gsi::frontier::embedded;

// 1. Verify Granger Slippage & Subsystem Clock Decoupling Detection
static bool verify_granger_slippage_resiliency() {
    std::cout << "[TEST 1] verify_granger_slippage_resiliency()... ";
    StaticSensorMatrix synchronized{};
    StaticSensorMatrix decoupled{};

    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        float tau = static_cast<float>(t) / static_cast<float>(SEQUENCE_STEPS);
        float base_wave = std::sin(2.0f * 3.14159265f * tau);
        synchronized.frames[t][0] = base_wave;
        synchronized.frames[t][1] = base_wave * 1.05f;
        synchronized.frames[t][2] = base_wave * 0.95f;
        synchronized.frames[t][3] = base_wave * 1.02f;

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
        homeostatic_calm.frames[t][0] = 0.05f * std::sin(3.14159265f * tau);
        homeostatic_calm.frames[t][1] = 0.04f * std::cos(3.14159265f * tau);
        homeostatic_calm.frames[t][2] = 0.02f * tau;
        homeostatic_calm.frames[t][3] = 0.03f * std::sin(2.0f * 3.14159265f * tau);

        critical_shock.frames[t][0] = 3.5f * std::sin(8.0f * 3.14159265f * tau) * (1.0f + 2.0f * tau);
        critical_shock.frames[t][1] = 3.5f * std::cos(8.0f * 3.14159265f * tau) * (1.0f + 2.0f * tau);
        critical_shock.frames[t][2] = 2.8f * std::pow(tau, 3.0f);
        critical_shock.frames[t][3] = -2.5f * tau;
    }

    auto out_calm = EmbeddedBraidKernel::process_frames(homeostatic_calm);
    auto out_shock = EmbeddedBraidKernel::process_frames(critical_shock);

    assert(!out_calm.critical_shock_horizon_breach);
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

    constexpr float THEO_M2 = 0.20763936f;
    assert(out.ds3_magic_monotone_m2 >= THEO_M2 * 0.99f);
    assert(out.ds3_magic_monotone_m2 <= 1.0f);
    assert(out.jones_skein_trace_deviation >= 0.0f);

    std::cout << "PASSED (M2: " << out.ds3_magic_monotone_m2
              << " vs Theo M2: " << THEO_M2 << ")\n";
    return true;
}

// 6. Verify 48B ECG500HzFrame, 28B NFL10HzKinematicNode & Lock-Free Zero-Copy Ring Buffer
static bool verify_zero_copy_ring_buffer_and_struct_alignment() {
    std::cout << "[TEST 6] verify_zero_copy_ring_buffer_and_struct_alignment()... ";
    static_assert(sizeof(ECG500HzFrame) == 48);
    static_assert(sizeof(NFL10HzKinematicNode) == 28);

    static LockFreeTelemetryRingBuffer<ECG500HzFrame, 256> ecg_ring{};
    static LockFreeTelemetryRingBuffer<NFL10HzKinematicNode, 256> nfl_ring{};

    for (uint32_t i = 0; i < 10000; ++i) {
        ECG500HzFrame* slot = ecg_ring.reserve_produce();
        assert(slot != nullptr);
        slot->timestamp_us = static_cast<uint64_t>(i) * 2000ULL;
        slot->patient_id = 42U;
        slot->sequence_id = i;
        for (int k = 0; k < 8; ++k) slot->leads[k] = 0.5f * static_cast<float>(k);
        ecg_ring.commit_produce();

        const ECG500HzFrame* read_slot = ecg_ring.peek_consume();
        assert(read_slot != nullptr);
        assert(read_slot->sequence_id == i);
        ecg_ring.commit_consume();
    }

    NFL10HzKinematicNode nfl_node{25.0f, 26.6f, 5.2f, 1.1f, 2.4f, 0.8f, 14.5f};
    assert(nfl_ring.push(nfl_node));
    NFL10HzKinematicNode popped{};
    assert(nfl_ring.pop(popped));
    assert(std::abs(popped.jerk_10hz - 14.5f) < 1e-5f);

    std::cout << "PASSED (48B ECG & 28B NFL 10,000-frame zero-copy SPSC ring buffer verified)\n";
    return true;
}

// 7. Verify Surrogate WHIM CTE Cumulative Sub-Concussive Avalanche Braiding (dt = 40s vs dt = 300s)
static bool verify_cte_cumulative_subconcussive_avalanche_braiding() {
    std::cout << "[TEST 7] verify_cte_cumulative_subconcussive_avalanche_braiding()... ";
    IsomorphicPhaseTransitionKernel kernel{};

    // Case A: Hit A (18g) followed dt = 40s later by Hit B (14g) before tau_3 = 65.0s relaxes
    const CteWaveguideHitEvent rapid_hits[2] = {
        {0.0f, 18.0f, 2200.0f, 45.0f, 1.15f},
        {40.0f, 14.0f, 1850.0f, 38.0f, 1.25f}
    };
    // Case B: Exact same two hits separated by dt = 300s (viscoelastic creep fully relaxed)
    const CteWaveguideHitEvent relaxed_hits[2] = {
        {0.0f, 18.0f, 2200.0f, 45.0f, 1.15f},
        {300.0f, 14.0f, 1850.0f, 38.0f, 1.25f}
    };

    auto res_rapid = kernel.evaluate_cte_subconcussive_waveguide(rapid_hits, 2);
    auto res_relaxed = kernel.evaluate_cte_subconcussive_waveguide(relaxed_hits, 2);

    assert(res_rapid.microtubule_cavitation_alert);
    assert(!res_relaxed.microtubule_cavitation_alert);
    assert(res_rapid.sulcal_waveguide_shear_stress_kpa > res_relaxed.sulcal_waveguide_shear_stress_kpa);

    std::cout << "PASSED (dt=40s stress: " << res_rapid.sulcal_waveguide_shear_stress_kpa
              << " kPa [ALERT=1] vs dt=300s stress: " << res_relaxed.sulcal_waveguide_shear_stress_kpa
              << " kPa [ALERT=0])\n";
    return true;
}

// 8. Verify Koopman EDMD + Takens 500Hz 12-Lead ECG V-Fib Standing-Wave Interception
static bool verify_500hz_ecg_vfib_standing_wave_interception() {
    std::cout << "[TEST 8] verify_500hz_ecg_vfib_standing_wave_interception()... ";
    IsomorphicPhaseTransitionKernel kernel{};
    static ECG500HzFrame sinus_rhythm[64]{};
    static ECG500HzFrame vfib_spiral[64]{};

    for (std::size_t t = 0; t < 64; ++t) {
        const float s = static_cast<float>(t) * 0.002f;
        for (int k = 0; k < 8; ++k) {
            sinus_rhythm[t].leads[k] = 0.25f * std::sin(2.0f * 3.14159265f * (1.2f + 0.3f * k) * s);
            vfib_spiral[t].leads[k] = 1.65f * std::cos(2.0f * 3.14159265f * 8.5f * s);
        }
    }

    auto out_sinus = kernel.evaluate_koopman_ecg_vfib_interception(sinus_rhythm, 64);
    auto out_vfib = kernel.evaluate_koopman_ecg_vfib_interception(vfib_spiral, 64);

    assert(!out_sinus.pre_fibrillation_interception_triggered);
    assert(out_vfib.pre_fibrillation_interception_triggered);

    std::cout << "PASSED (Sinus sync: " << out_sinus.standing_wave_sync_index
              << " vs V-Fib sync: " << out_vfib.standing_wave_sync_index << ")\n";
    return true;
}

// 9. Verify Domains 3-5 (Aerostructure Fracture, Power Grid Synchrophasor, CLOB Cavitation)
static bool verify_isomorphic_domains_aerospace_grid_clob() {
    std::cout << "[TEST 9] verify_isomorphic_domains_aerospace_grid_clob()... ";
    IsomorphicPhaseTransitionKernel kernel{};

    const float acoustic_burst[8] = {3.2f, 4.1f, 3.8f, 5.2f, 4.9f, 6.1f, 5.5f, 4.8f};
    auto d3 = kernel.evaluate_metamaterial_aerostructure_fracture(acoustic_burst, 8);
    assert(d3.autonomous_quarantine_triggered);

    const float grid_angles[9] = {0.0f, 2.1f, 0.2f, 0.0f, 2.4f, 0.1f, 0.0f, 2.6f, 0.0f};
    auto d4 = kernel.evaluate_power_grid_synchrophasor_islanding(grid_angles, 9);
    assert(d4.autonomous_quarantine_triggered);

    const float clob_vel[6] = {1.2f, 2.5f, 3.8f, 4.4f, 2.9f, 3.1f};
    auto d5 = kernel.evaluate_clob_liquidity_cavitation(clob_vel, 6);
    assert(d5.autonomous_quarantine_triggered);

    std::cout << "PASSED (Aerostructure chi=" << d3.crowley_failed_avalanche_chi
              << ", Grid chi=" << d4.crowley_failed_avalanche_chi
              << ", CLOB chi=" << d5.crowley_failed_avalanche_chi << ")\n";
    return true;
}

// 10. Verify STM32H7 256KB SRAM Arena, ACI-CRC Conformal Gate & Cycle/Latency Profiler
static bool verify_hardware_sram_cycle_and_latency_profiler() {
    std::cout << "[TEST 10] verify_hardware_sram_cycle_and_latency_profiler()... ";
    EmbeddedAdaptiveConformalCrpsGate aci_crc(0.10f, 0.015f, 0.985f);
    for (int step = 0; step < 50; ++step) {
        const float crps = EmbeddedAdaptiveConformalCrpsGate::evaluate_laplace_crps(90.0f, 2.5f, 89.2f);
        aci_crc.update_observation(89.2f, 85.0f, 95.0f, crps);
    }
    assert(aci_crc.current_alpha() >= 0.01f && aci_crc.current_alpha() <= 0.25f);

    StaticSensorMatrix sensor{};
    for (std::size_t t = 0; t < SEQUENCE_STEPS; ++t) {
        const float s = static_cast<float>(t) * 0.05f;
        sensor.frames[t] = {std::sin(s), std::cos(s), 0.3f * s, 0.2f * std::sin(2.0f * s)};
    }

    const auto t0 = std::chrono::steady_clock::now();
    const uint64_t c0 = HardwareProfiler::read_cycle_counter();
    constexpr int N_ITERS = 1000;
    float accum = 0.0f;
    for (int i = 0; i < N_ITERS; ++i) {
        sensor.frames[0][0] = 0.5f + 0.0001f * static_cast<float>(i);
        auto out = EmbeddedBraidKernel::process_frames(sensor);
        accum += out.chen_levy_circulation;
    }
    const uint64_t c1 = HardwareProfiler::read_cycle_counter();
    const auto t1 = std::chrono::steady_clock::now();

    const float total_us = std::chrono::duration<float, std::micro>(t1 - t0).count();
    const std::size_t sram_used =
        sizeof(StaticSensorMatrix) +
        sizeof(LockFreeTelemetryRingBuffer<ECG500HzFrame, 256>) +
        sizeof(LockFreeTelemetryRingBuffer<NFL10HzKinematicNode, 256>) +
        sizeof(EmbeddedAdaptiveConformalCrpsGate) +
        sizeof(IsomorphicPhaseTransitionKernel);

    HardwareBenchmarkReport report{
        c1 - c0,
        (c1 - c0) / N_ITERS,
        total_us / static_cast<float>(N_ITERS),
        sram_used,
        TOTAL_SRAM_BYTES,
        (static_cast<float>(sram_used) / static_cast<float>(TOTAL_SRAM_BYTES)) * 100.0f,
        sram_used <= TOTAL_SRAM_BYTES && accum > 0.0f
    };

    assert(report.fits_256kb_sram);
    std::cout << "PASSED (SRAM used: " << report.static_sram_bytes_used << " / "
              << report.static_sram_bytes_total << " bytes [" << report.sram_utilization_pct
              << "%], Latency: " << report.execution_latency_us << " us/frame, Cycles: "
              << report.cpu_cycles_per_frame << " cycles/frame)\n";
    return true;
}

int main() {
    std::cout << "===================================================================\n";
    std::cout << " GSI Sovereign v5.0 Bare-Metal Embedded C++20 Verification Suite   \n";
    std::cout << " (STM32H7 DTCM/ITCM 256KB SRAM, Zero Heap Dynamic Allocations)     \n";
    std::cout << "===================================================================\n";

    bool p1 = verify_granger_slippage_resiliency();
    bool p2 = verify_sparse_packet_dropout_invariance();
    bool p3 = verify_nonlinear_time_warp_invariance();
    bool p4 = verify_crowley_failed_avalanche_vs_sepsis_runaway();
    bool p5 = verify_byles_ds3_measurement_only_braid();
    bool p6 = verify_zero_copy_ring_buffer_and_struct_alignment();
    bool p7 = verify_cte_cumulative_subconcussive_avalanche_braiding();
    bool p8 = verify_500hz_ecg_vfib_standing_wave_interception();
    bool p9 = verify_isomorphic_domains_aerospace_grid_clob();
    bool p10 = verify_hardware_sram_cycle_and_latency_profiler();

    if (p1 && p2 && p3 && p4 && p5 && p6 && p7 && p8 && p9 && p10) {
        std::cout << "===================================================================\n";
        std::cout << " ALL 10 BARE-METAL EMBEDDED & 5-DOMAIN TESTS PASSED PERFECTLY!\n";
        std::cout << "===================================================================\n";
        return 0;
    }
    return 1;
}
