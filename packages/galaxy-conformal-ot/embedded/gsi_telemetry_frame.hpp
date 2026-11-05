#pragma once
/**
 * gsi_telemetry_frame.hpp
 * =======================
 * GSI Sovereign v4.0 Bare-Metal Embedded C++20 Telemetry Framing,
 * STM32H7 / ARM Cortex-M7 256KB SRAM Hardware Arena, Lock-Free Zero-Copy
 * Ring Buffers, Doubly-Adaptive Conformal Risk Control (ACI-CRC), and Hardware Profiler.
 *
 * Deterministic memory layout, zero heap dynamic allocations (`malloc`/`new` forbidden),
 * hardware-aligned binary structs with static asserts.
 */

#include <cstdint>
#include <cstddef>
#include <array>
#include <atomic>
#include <algorithm>
#include <cmath>
#include <chrono>

#if defined(_MSC_VER)
#include <intrin.h>
#elif defined(__x86_64__) || defined(__i386__)
#include <x86intrin.h>
#endif

namespace gsi::frontier::embedded {

// ============================================================================
// 1. Hardware-Aligned Binary Telemetry Structs
// ============================================================================

#pragma pack(push, 1)

/**
 * ECG500HzFrame: 48-byte packed telemetry struct for high-frequency 12-lead / 8-lead ECG.
 * Aligned to 16 bytes for single-instruction vector loads (NEON / AVX).
 */
struct alignas(16) ECG500HzFrame {
    uint64_t timestamp_us;     // 8 bytes: Microsecond telemetry timestamp
    uint32_t patient_id;       // 4 bytes: Unique patient / subject identifier
    float leads[8];            // 32 bytes: 8 spatial leads (I, II, V1-V6) in millivolts
    uint32_t sequence_id;      // 4 bytes: Monotonic DMA packet counter
};
static_assert(sizeof(ECG500HzFrame) == 48, "ECG500HzFrame must be exactly 48 bytes");
static_assert(alignof(ECG500HzFrame) == 16, "ECG500HzFrame must be aligned to 16 bytes");

/**
 * NFL10HzKinematicNode: 28-byte packed kinematic telemetry struct for player tracking.
 * Aligned to 4 bytes for zero-padding DMA transmission.
 */
struct alignas(4) NFL10HzKinematicNode {
    float x;                   // 4 bytes: Field X coordinate (yards)
    float y;                   // 4 bytes: Field Y coordinate (yards)
    float vx;                  // 4 bytes: Velocity X (yards/sec)
    float vy;                  // 4 bytes: Velocity Y (yards/sec)
    float ax;                  // 4 bytes: Linear acceleration X (g-force)
    float ay;                  // 4 bytes: Linear acceleration Y (g-force)
    float jerk_10hz;           // 4 bytes: 10Hz jerk vector magnitude (g/sec)
};
static_assert(sizeof(NFL10HzKinematicNode) == 28, "NFL10HzKinematicNode must be exactly 28 bytes");
static_assert(alignof(NFL10HzKinematicNode) == 4, "NFL10HzKinematicNode must be aligned to 4 bytes");

#pragma pack(pop)

// ============================================================================
// 2. STM32H7 / ARM Cortex-M7 Explicit 256KB SRAM Hardware Arena
// ============================================================================

constexpr std::size_t DTCM_SRAM_BYTES  = 131072; // 128 KB: Zero-wait-state data RAM (Core 0/1 queues + active tensors)
constexpr std::size_t ITCM_SRAM_BYTES  = 65536;  // 64 KB:  Zero-wait-state instruction RAM for ISR & hot-loops
constexpr std::size_t AXI_SRAM_BYTES   = 65536;  // 64 KB:  AXI bus RAM for conformal audit & calibration ring
constexpr std::size_t TOTAL_SRAM_BYTES = DTCM_SRAM_BYTES + ITCM_SRAM_BYTES + AXI_SRAM_BYTES; // 262,144 Bytes (256 KB)

/**
 * Sram256KbHardwareArena:
 * Maps explicitly to STM32H7 / ARM Cortex-M7 embedded physical memory boundaries:
 * DTCM @ 0x20000000 (128KB), ITCM @ 0x00000000 (64KB), AXI SRAM @ 0x24000000 (64KB).
 */
struct alignas(64) Sram256KbHardwareArena {
    uint8_t dtcm[DTCM_SRAM_BYTES];
    uint8_t itcm[ITCM_SRAM_BYTES];
    uint8_t axi[AXI_SRAM_BYTES];

    static constexpr std::size_t total_capacity() noexcept {
        return TOTAL_SRAM_BYTES;
    }
};
static_assert(sizeof(Sram256KbHardwareArena) == TOTAL_SRAM_BYTES, "Arena must exactly equal 262,144 bytes (256KB)");
static_assert(sizeof(Sram256KbHardwareArena) <= 262144, "Arena must not exceed 256KB hardware boundary");

// ============================================================================
// 3. Lock-Free Zero-Copy Single-Producer Single-Consumer (SPSC) Ring Buffer
// ============================================================================

/**
 * LockFreeTelemetryRingBuffer:
 * Lock-free, zero-copy, power-of-two ring buffer.
 * Decouples Core 0 (DMA / Telemetry Ingestion) from Core 1 (Non-Abelian Braid Inference).
 * 64-byte alignment on head/tail prevents CPU cache line bouncing and false sharing.
 */
template <typename T, std::size_t Capacity>
class LockFreeTelemetryRingBuffer {
    static_assert(Capacity > 0 && ((Capacity & (Capacity - 1)) == 0),
                  "Ring buffer Capacity must be a non-zero power of 2");

public:
    LockFreeTelemetryRingBuffer() noexcept : head_(0), tail_(0) {}

    // Disable copy/move to guarantee hardware memory pinning
    LockFreeTelemetryRingBuffer(const LockFreeTelemetryRingBuffer&) = delete;
    LockFreeTelemetryRingBuffer& operator=(const LockFreeTelemetryRingBuffer&) = delete;

    /**
     * Producer: Push item by copying into buffer slot.
     */
    bool push(const T& item) noexcept {
        const uint32_t current_head = head_.load(std::memory_order_relaxed);
        const uint32_t current_tail = tail_.load(std::memory_order_acquire);

        if ((current_head - current_tail) >= Capacity) {
            return false; // Buffer full (DMA overrun averted)
        }

        buffer_[current_head & MASK] = item;
        head_.store(current_head + 1, std::memory_order_release);
        return true;
    }

    /**
     * Consumer: Pop item from buffer slot.
     */
    bool pop(T& item) noexcept {
        const uint32_t current_tail = tail_.load(std::memory_order_relaxed);
        const uint32_t current_head = head_.load(std::memory_order_acquire);

        if (current_head == current_tail) {
            return false; // Buffer empty
        }

        item = buffer_[current_tail & MASK];
        tail_.store(current_tail + 1, std::memory_order_release);
        return true;
    }

    /**
     * Zero-Copy Producer: Reserve slot directly in DTCM for direct DMA write.
     */
    T* reserve_produce() noexcept {
        const uint32_t current_head = head_.load(std::memory_order_relaxed);
        const uint32_t current_tail = tail_.load(std::memory_order_acquire);

        if ((current_head - current_tail) >= Capacity) {
            return nullptr;
        }
        return &buffer_[current_head & MASK];
    }

    /**
     * Zero-Copy Producer: Commit after DMA has written directly to reserved slot.
     */
    void commit_produce() noexcept {
        const uint32_t current_head = head_.load(std::memory_order_relaxed);
        head_.store(current_head + 1, std::memory_order_release);
    }

    /**
     * Zero-Copy Consumer: Peek slot directly without copying.
     */
    const T* peek_consume() const noexcept {
        const uint32_t current_tail = tail_.load(std::memory_order_relaxed);
        const uint32_t current_head = head_.load(std::memory_order_acquire);

        if (current_head == current_tail) {
            return nullptr;
        }
        return &buffer_[current_tail & MASK];
    }

    /**
     * Zero-Copy Consumer: Commit after Core 1 kernel has finished processing.
     */
    void commit_consume() noexcept {
        const uint32_t current_tail = tail_.load(std::memory_order_relaxed);
        tail_.store(current_tail + 1, std::memory_order_release);
    }

    [[nodiscard]] std::size_t size() const noexcept {
        const uint32_t h = head_.load(std::memory_order_relaxed);
        const uint32_t t = tail_.load(std::memory_order_relaxed);
        return static_cast<std::size_t>(h - t);
    }

    [[nodiscard]] bool is_empty() const noexcept {
        return size() == 0;
    }

    [[nodiscard]] bool is_full() const noexcept {
        return size() >= Capacity;
    }

    [[nodiscard]] static constexpr std::size_t capacity() noexcept {
        return Capacity;
    }

    void reset() noexcept {
        head_.store(0, std::memory_order_relaxed);
        tail_.store(0, std::memory_order_relaxed);
    }

private:
    static constexpr uint32_t MASK = static_cast<uint32_t>(Capacity - 1);

    alignas(64) std::atomic<uint32_t> head_{0};
    alignas(64) std::atomic<uint32_t> tail_{0};
    alignas(16) T buffer_[Capacity];
};

// ============================================================================
// 4. Doubly-Adaptive Conformal Risk Controller & Laplace CRPS Evaluator
// ============================================================================

/**
 * EmbeddedAdaptiveConformalCrpsGate:
 * Combines:
 * - Gibbs & Candès (NeurIPS 2021) Adaptive Conformal Inference (ACI)
 * - Angelopoulos et al. (ICLR 2024) Conformal Risk Control (CRC)
 * - Barber et al. (2023) Non-Exchangeable Exponential Decay Weights
 * - Closed-form Heavy-Tailed Laplace Continuous Ranked Probability Score (CRPS)
 */
class EmbeddedAdaptiveConformalCrpsGate {
public:
    explicit constexpr EmbeddedAdaptiveConformalCrpsGate(
        float alpha_target = 0.10f,
        float gamma = 0.015f,
        float decay_rho = 0.985f
    ) noexcept
        : alpha_t_(alpha_target),
          alpha_target_(alpha_target),
          gamma_(gamma),
          decay_rho_(decay_rho),
          weighted_risk_sum_(0.0f),
          weight_sum_(0.0f),
          total_steps_(0),
          coverage_errors_(0) {}

    /**
     * Closed-Form Heavy-Tailed Laplace Continuous Ranked Probability Score:
     * CRPS(Laplace(mu, b), y) = |y - mu| + b * exp(-|y - mu| / b) - 0.75 * b
     * Evaluates in O(1) arithmetic operations with 0 loops and 0 heap allocations.
     */
    static constexpr float evaluate_laplace_crps(float mu, float b, float y) noexcept {
        float abs_err = std::abs(y - mu);
        float scale = (b > 1e-5f) ? b : 1e-5f;
        float exp_term = std::exp(-abs_err / scale);
        return abs_err + scale * exp_term - 0.75f * scale;
    }

    /**
     * Steps Gibbs & Candès ACI update and Barber exponential decay weighted risk.
     * err_t = 1 if y_true is outside [pred_lower, pred_upper], else 0.
     */
    void update_observation(float y_true, float pred_lower, float pred_upper, float instantaneous_loss) noexcept {
        bool miscovered = (y_true < pred_lower) || (y_true > pred_upper);
        float err_t = miscovered ? 1.0f : 0.0f;

        // Gibbs & Candès ACI step update:
        // alpha_{t+1} = clamp(alpha_t + gamma * (alpha_target - err_t), 0.01, 0.25)
        float new_alpha = alpha_t_ + gamma_ * (alpha_target_ - err_t);
        alpha_t_ = std::clamp(new_alpha, 0.01f, 0.25f);

        // Barber non-exchangeable exponential decay weighting:
        weight_sum_ = weight_sum_ * decay_rho_ + 1.0f;
        weighted_risk_sum_ = weighted_risk_sum_ * decay_rho_ + instantaneous_loss;

        total_steps_++;
        if (miscovered) {
            coverage_errors_++;
        }
    }

    [[nodiscard]] float current_alpha() const noexcept {
        return alpha_t_;
    }

    [[nodiscard]] float empirical_weighted_risk() const noexcept {
        return (weight_sum_ > 1e-5f) ? (weighted_risk_sum_ / weight_sum_) : 0.0f;
    }

    [[nodiscard]] float empirical_miscoverage_rate() const noexcept {
        return (total_steps_ > 0) ? (static_cast<float>(coverage_errors_) / static_cast<float>(total_steps_)) : 0.0f;
    }

    [[nodiscard]] bool is_risk_breached(float risk_threshold) const noexcept {
        return empirical_weighted_risk() > risk_threshold;
    }

    void reset() noexcept {
        alpha_t_ = alpha_target_;
        weighted_risk_sum_ = 0.0f;
        weight_sum_ = 0.0f;
        total_steps_ = 0;
        coverage_errors_ = 0;
    }

private:
    float alpha_t_;
    float alpha_target_;
    float gamma_;
    float decay_rho_;
    float weighted_risk_sum_;
    float weight_sum_;
    uint32_t total_steps_;
    uint32_t coverage_errors_;
};

// ============================================================================
// 5. Hardware Cycle, Latency & SRAM Footprint Profiler
// ============================================================================

struct HardwareBenchmarkReport {
    uint64_t cpu_cycles_total;
    uint64_t cpu_cycles_per_frame;
    float execution_latency_us;
    std::size_t static_sram_bytes_used;
    std::size_t static_sram_bytes_total; // 262,144 Bytes (256 KB)
    float sram_utilization_pct;
    bool fits_256kb_sram;
};

class HardwareProfiler {
public:
    static inline uint64_t read_cycle_counter() noexcept {
#if defined(_MSC_VER)
        return __rdtsc();
#elif defined(__x86_64__) || defined(__i386__)
        return __builtin_ia32_rdtsc();
#elif defined(__ARM_ARCH_7EM__) || defined(__ARM_ARCH_8M_MAIN__) || defined(CORTEX_M7)
        // STM32H7 / ARM Cortex-M7 DWT CYCCNT Hardware Cycle Counter
        return *reinterpret_cast<volatile uint32_t*>(0xE0001004);
#else
        return static_cast<uint64_t>(std::chrono::steady_clock::now().time_since_epoch().count());
#endif
    }
};

} // namespace gsi::frontier::embedded
