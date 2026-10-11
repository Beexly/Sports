#!/usr/bin/env python3
"""
eval_module56_gamestate.py — Acceptance-gate evaluation for prediction-engine module 56.

Module: 2508-15299v1-basketlidar-the-first-lidarcamera-multimodal.ts
Paper: arXiv:2508.15299v1 — BasketLiDAR (adapted: game-state predictor + drive forecasts)

ACCEPTANCE GATE (from JSDoc): Adopt the repair pattern if on the 50-play
occlusion test it reduces ID switches by >=30% vs the single-view baseline
with per-play latency overhead <=2x; REJECT if ID-switch reduction <30% or the
trigger fires on >20% of non-occluded frames.

NOTE: The occlusion-tracking hardware test is not evaluable in Python without
video/tracking data. This eval tests the evaluable components:
  1. classifyGameState() — boundary correctness on close/lean/blowout.
  2. driveOutcomeForecast() — probabilities sum to 1, monotonic in yard line,
     sensible down/distance penalties.
  3. uncertaintyBand() — valid intervals, k scaling.
  4. clockWinProb() — boundary values (tied late ~ 0.5, big lead ~ 1.0).

Status: DIAGNOSTIC. The occlusion-repair gate needs tracking data.
"""
import math

# ---------------------------------------------------------------------------
# Faithful ports from 2508-15299v1-basketlidar-the-first-lidarcamera-multimodal.ts
# ---------------------------------------------------------------------------

def mean(xs):
    if not xs:
        raise ValueError("mean: empty")
    return sum(xs) / len(xs)


def std(xs):
    if not xs:
        raise ValueError("std: empty")
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))


def classify_game_state(score_diff, time_left_frac, yard_line, down, distance, pace):
    pressure = abs(score_diff) / max(0.05, time_left_frac)
    if pressure < 14:
        return "close"
    if pressure < 35:
        return "lean"
    return "blowout"


def drive_outcome_forecast(yard_line, down, distance):
    if not 0 <= yard_line <= 100:
        raise ValueError("driveOutcomeForecast: yardLine in [0,100]")
    to_go = max(0, 100 - yard_line)
    down_penalty = (down - 1) * 0.06 + min(0.3, distance * 0.012)
    td = max(0.02, 0.42 * math.exp(-to_go / 45) - down_penalty)
    fg = (max(0.05, 0.35 - down_penalty * 0.5) if to_go <= 35
          else max(0.01, 0.08 - down_penalty * 0.2))
    stop = max(0.05, 1 - (td + fg))
    z = td + fg + stop
    return {"td": td / z, "fg": fg / z, "stop": stop / z}


def uncertainty_band(ensemble, k=1.5):
    if len(ensemble) < 2:
        raise ValueError("uncertaintyBand: need >= 2 members")
    m, sd = mean(ensemble), std(ensemble)
    return (max(0, m - k * sd), min(1, m + k * sd))


def clock_win_prob(score_diff, time_left_frac):
    t = max(0.02, time_left_frac)
    return 1 / (1 + math.exp(-(score_diff * 0.35) / math.sqrt(t)))


# ---------------------------------------------------------------------------
# Eval
# ---------------------------------------------------------------------------

def run_eval():
    print("Module 56 — Game-state classifier + drive-outcome forecasts")
    checks = []

    # 1. Classification boundaries
    c1 = classify_game_state(0, 0.5, 50, 1, 10, 2.5) == "close"
    c2 = classify_game_state(7, 0.5, 50, 1, 10, 2.5) == "lean"   # 14.0 pressure
    c3 = classify_game_state(21, 0.5, 50, 1, 10, 2.5) == "blowout"  # 42 pressure
    c4 = classify_game_state(3, 0.02, 50, 1, 10, 2.5) == "blowout"  # late, small lead = high pressure
    print(f"  classify close/lean/blowout/late-pressure: {c1}/{c2}/{c3}/{c4}")
    checks += [c1, c2, c3, c4]

    # 2. Drive forecast: sums to 1, monotonic in field position
    f_own20 = drive_outcome_forecast(20, 1, 10)
    f_opp30 = drive_outcome_forecast(70, 1, 10)  # 70 yards = opp 30
    sums = abs(sum(f_own20.values()) - 1) < 1e-9 and abs(sum(f_opp30.values()) - 1) < 1e-9
    monotonic = f_opp30["td"] > f_own20["td"]  # closer to endzone = more TD
    # 4th and long should be worse than 1st and 10
    f_4th = drive_outcome_forecast(50, 4, 15)
    f_1st = drive_outcome_forecast(50, 1, 10)
    down_sensible = f_1st["td"] > f_4th["td"]
    print(f"  probs sum to 1: {sums}, TD monotonic in field pos: {monotonic}, down sensible: {down_sensible}")
    checks += [sums, monotonic, down_sensible]
    print(f"    own 20 1st&10: td={f_own20['td']:.3f} fg={f_own20['fg']:.3f} stop={f_own20['stop']:.3f}")
    print(f"    opp 30 1st&10: td={f_opp30['td']:.3f} fg={f_opp30['fg']:.3f} stop={f_opp30['stop']:.3f}")

    # 3. Uncertainty band
    lo, hi = uncertainty_band([0.4, 0.5, 0.6])
    band_ok = 0 <= lo < hi <= 1
    print(f"  uncertainty band [0.4,0.5,0.6]: [{lo:.3f}, {hi:.3f}] valid: {band_ok}")
    checks.append(band_ok)

    # 4. Clock win prob boundaries
    w_tied = clock_win_prob(0, 0.05)
    w_big = clock_win_prob(21, 0.5)
    w_down = clock_win_prob(-14, 0.25)
    wp_ok = abs(w_tied - 0.5) < 0.01 and w_big > 0.95 and w_down < 0.05
    print(f"  winprob tied-late={w_tied:.3f} up21={w_big:.3f} down14={w_down:.3f}: {wp_ok}")
    checks.append(wp_ok)

    gate = all(checks)
    print(f"  COMPONENT CHECKS: {'PASS' if gate else 'FAIL'} ({sum(checks)}/{len(checks)})")
    print("  OCCLUSION GATE: BLOCKED — needs 50-play tracking test with video data.")
    return {"component_pass": gate, "occlusion_gate_evaluable": False}


if __name__ == "__main__":
    run_eval()
    print("\nDIAGNOSTIC — components verified; occlusion gate needs tracking data.")
