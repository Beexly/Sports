// packages/genesis-kernel/include/gsi_virtual_icp_mahler_kernel.hpp
// Zero-Heap Bare-Metal C++20 Kernel for ARM Cortex-M7 (STM32H7 @ 480 MHz)
// Memory Map: 128 KB DTCM (0x20000000), 64 KB ITCM (0x00000000), 64 KB AXI SRAM
#pragma once
#include <array>
#include <cmath>
#include <cstdint>

namespace gsi::kernel {

enum class HelmetChassis : uint8_t {
  RIDDELL_SPEEDFLEX_NO_ADDON = 0,
  RIDDELL_SPEEDFLEX_GUARDIAN_NXT = 1, // Stark et al. 2024: -19.1% PLA, -27.9% PRA
  SCHUTT_F7_VTD_NO_ADDON = 2,
  SCHUTT_F7_VTD_GUARDIAN_NXT = 3,     // Stark et al. 2024: -1.5% PLA, -22.6% PRA
  SCHUTT_F7_VTD_GUARDIAN_XT = 4       // Stark et al. 2024: -2.8% PLA, +0.4% PRA (increase)
};

struct MultiModalTelemetryFrame {
  float dt_sec;                       // Frame interval (e.g., 0.002s at 500 Hz)
  // 1. SkeleTrack v2 + iMG Kinematic Inputs
  std::array<float, 3> omega_img_rad_s;     // Mouthguard angular velocity (rad/s)
  std::array<float, 3> alpha_rot_rad_s2;    // Debiased rotational acceleration (rad/s^2)
  float linear_pla_g;                       // Peak linear acceleration (g)
  float mandible_bite_coupling;             // [0.0 = open jaw artifact, 1.0 = custom NG+ locked]
  HelmetChassis chassis;
  // 2. US9895070B2 3-Vessel + B4C Non-Invasive ICP Inputs
  float supraorbital_pulse_v;               // Sensor 1: Intracranial ophthalmic/supraorbital branch
  float external_carotid_pulse_v;           // Sensor 2: Extracranial superficial temporal branch
  float distal_radial_pulse_v;              // Sensor 3: Distal finger/radial reference
  float b4c_p2_p1_ratio;                    // Brain4Care micrometric cranial P2/P1 compliance ratio
  // 3. Nocera et al. (2023) SportDB 2.0 ECG/HRV + Lefaivre Breaker-Box Inputs
  float ecg_rmssd_ms;                       // Vagal HRV RMSSD (ms)
  float session_trimp_load;                 // Internal Training Impulse (TRIMP)
  float environmental_sensory_load;         // Lefaivre Breaker-Box sensory flux [0, 1]
};

struct KernelDiagnosticOutput {
  float sulcal_shear_strain;                // Reconstructed WHIM sulcal depth strain
  float non_commutative_braid_commutator;   // |[Phi_A, Phi_B]_{tau_3}| multi-hit cavitation
  float virtual_icp_mmhg;                   // Deconfounded non-invasive ICP (mmHg)
  float lefaivre_breaker_state;             // [0, 1+] Neuro-autonomic breaker load B_i(t)
  float mahler_dual_conformal_score;        // Mahler L1-Linf polar dual nonconformity score
  float conformal_ess_c_hat;                // Effective Sample Size diagnostic (Gate <= 12.42)
  bool breaker_tripped_alert;               // True if B_i(t) >= 1.0 or sulcal strain >= threshold
  bool conformal_abstention_pass;           // True if c_hat > 12.42 (FDA PCCP abstention)
};

class VirtualIcpAndSulcalWaveguideKernel {
public:
  // 3-Mode Prony/Ogden relaxation constants: tau_1 = 0.05s, tau_2 = 2.5s, tau_3 = 65.0s
  static constexpr std::array<float, 3> TAU_PRONY = {0.05f, 2.50f, 65.00f};
  static constexpr std::array<float, 3> G_PRONY   = {0.55f, 0.30f, 0.15f};
  static constexpr float ESS_C_HAT_MAX = 12.42f;

  // [4/4] Minimax Pade Rational Approximant for exp(-x), x >= 0 (Zero-LUT ITCM execution)
  static constexpr float pade44_exp_neg(float x) noexcept {
    if (x <= 0.0f) return 1.0f;
    if (x > 10.0f) return 0.0f;
    uint32_t halvings = 0;
    while (x > 0.5f) {
      x *= 0.5f;
      ++halvings;
    }
    const float x2 = x * x;
    const float x3 = x2 * x;
    const float x4 = x2 * x2;
    const float num = 1680.0f - 840.0f * x + 180.0f * x2 - 20.0f * x3 + x4;
    const float den = 1680.0f + 840.0f * x + 180.0f * x2 + 20.0f * x3 + x4;
    float res = num / den;
    for (uint32_t k = 0; k < halvings; ++k) {
      res *= res;
    }
    return res;
  }

  // Stark et al. (2024, PMID 39356379) Chassis-Specific Attenuation Lookup
  static constexpr void get_stark2024_attenuation(
      HelmetChassis chassis, float& pla_atten, float& pra_atten) noexcept {
    switch (chassis) {
      case HelmetChassis::RIDDELL_SPEEDFLEX_GUARDIAN_NXT:
        pla_atten = 0.191f; pra_atten = 0.279f; break;
      case HelmetChassis::SCHUTT_F7_VTD_GUARDIAN_NXT:
        pla_atten = 0.015f; pra_atten = 0.226f; break;
      case HelmetChassis::SCHUTT_F7_VTD_GUARDIAN_XT:
        pla_atten = 0.028f; pra_atten = -0.004f; break; // +0.4% PRA amplification in Stark 2024
      default:
        pla_atten = 0.0f;   pra_atten = 0.0f;   break;
    }
  }

  KernelDiagnosticOutput step_frame(
      const MultiModalTelemetryFrame& f,
      const std::array<float, 8>& ot_weights) noexcept {
    // 1. Apply Stark et al. (2024) + Mandible Two-Pathway Impulse Transfer
    float pla_atten = 0.0f, pra_atten = 0.0f;
    get_stark2024_attenuation(f.chassis, pla_atten, pra_atten);
    const float jaw_transmission = 1.0f - 0.56f * f.mandible_bite_coupling; // Custom mouthguard 2.3x factor
    const float effective_rot_energy =
        (f.alpha_rot_rad_s2[0] * f.alpha_rot_rad_s2[0] +
         f.alpha_rot_rad_s2[1] * f.alpha_rot_rad_s2[1] +
         f.alpha_rot_rad_s2[2] * f.alpha_rot_rad_s2[2]) *
        (1.0f - pra_atten) * jaw_transmission * 1.0e-7f;

    // 2. Update 3-Mode Prony/Ogden Sulcal Waveguide with Non-Commutative Hit Braiding
    const float prev_slow_memory = prony_h_[2];
    float total_strain = 0.0f;
    for (size_t m = 0; m < 3; ++m) {
      // Outer shell foam only damps tau_1 (0.05s); slow tau_3 (65.0s) receives full rotational shear
      const float mode_forcing = (m == 0) ? effective_rot_energy * (1.0f - pla_atten) : effective_rot_energy;
      const float decay = pade44_exp_neg(f.dt_sec / TAU_PRONY[m]);
      prony_h_[m] = prony_h_[m] * decay + G_PRONY[m] * mode_forcing * f.dt_sec;
      total_strain += prony_h_[m];
    }
    // Non-commutative commutator |[Phi_A, Phi_B]_{tau_3}| when Hit B arrives while h_3 > 0.01
    const float braid_commutator =
        (prev_slow_memory > 0.01f && effective_rot_energy > 0.02f)
            ? (prev_slow_memory * effective_rot_energy * (TAU_PRONY[2] / TAU_PRONY[0]))
            : 0.0f;
    total_strain += 0.35f * braid_commutator;

    // 3. Theorem 11: Deconfounded 3-Vessel (US9895070B2) + B4C Virtual ICP Inversion
    const float ds1 = f.supraorbital_pulse_v - prev_s1_;
    const float ds2 = f.external_carotid_pulse_v - prev_s2_;
    const float ds3 = f.distal_radial_pulse_v - prev_s3_;
    area_s1_s2_ = 0.98f * area_s1_s2_ + 0.5f * (prev_s1_ * ds2 - prev_s2_ * ds1);
    area_s2_s3_ = 0.98f * area_s2_s3_ + 0.5f * (prev_s2_ * ds3 - prev_s3_ * ds2);
    prev_s1_ = f.supraorbital_pulse_v;
    prev_s2_ = f.external_carotid_pulse_v;
    prev_s3_ = f.distal_radial_pulse_v;

    // FWL Orthogonalization of peripheral sympathetic tone using Nocera HRV RMSSD
    const float vaso_beta = 40.0f / (f.ecg_rmssd_ms + 10.0f);
    const float deconfounded_icp_area = area_s1_s2_ - vaso_beta * area_s2_s3_;
    const float b4c_compliance_term = (f.b4c_p2_p1_ratio > 0.8f) ? (f.b4c_p2_p1_ratio - 0.8f) * 6.5f : 0.0f;
    const float virtual_icp = 11.5f + 4.2f * deconfounded_icp_area + b4c_compliance_term + 18.0f * prony_h_[2];

    // 4. Lefaivre "Rainbow Effect" Breaker-Box & Burn-Blister Neuro-Autonomic ODE
    const float tau_rec = 15.0f + 0.65f * f.ecg_rmssd_ms; // Vagal recovery horizon
    const float burn_blister_coupling = total_strain * (f.session_trimp_load * 0.01f);
    const float d_breaker =
        0.45f * total_strain + 0.80f * burn_blister_coupling + 0.15f * f.environmental_sensory_load -
        (breaker_state_ / tau_rec);
    breaker_state_ = std::fmax(0.0f, breaker_state_ + d_breaker * f.dt_sec);

    // 5. Theorem 6 & 12: Mahler-Dual Nonconformity Score & Conformal ESS Gate (c_hat <= 12.42)
    const std::array<float, 3> norm_state = {
        total_strain / 0.25f, (virtual_icp - 12.0f) / 10.0f, breaker_state_};
    const float l1_norm =
        (std::fabs(norm_state[0]) + std::fabs(norm_state[1]) + std::fabs(norm_state[2])) / 3.0f;
    const float linf_norm =
        std::fmax(std::fabs(norm_state[0]), std::fmax(std::fabs(norm_state[1]), std::fabs(norm_state[2])));
    const float mahler_score = std::sqrt(l1_norm * linf_norm);

    float sum_w = 0.0f, sum_w2 = 0.0f;
    for (float w : ot_weights) {
      sum_w += w;
      sum_w2 += w * w;
    }
    const float c_hat = (sum_w > 1e-6f) ? (8.0f * sum_w2 / (sum_w * sum_w)) * 2.0f : 99.9f;
    const bool abstention = (c_hat > ESS_C_HAT_MAX);

    return KernelDiagnosticOutput{
        total_strain,
        braid_commutator,
        virtual_icp,
        breaker_state_,
        mahler_score,
        c_hat,
        (!abstention) && (breaker_state_ >= 1.0f || total_strain >= 0.22f || virtual_icp >= 22.0f),
        abstention};
  }

private:
  std::array<float, 3> prony_h_{0.0f, 0.0f, 0.0f};
  float prev_s1_{0.0f}, prev_s2_{0.0f}, prev_s3_{0.0f};
  float area_s1_s2_{0.0f}, area_s2_s3_{0.0f};
  float breaker_state_{0.0f};
};

} // namespace gsi::kernel
