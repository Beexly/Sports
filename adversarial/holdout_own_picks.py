"""Adversarial holdout: test OUR picks against our own past picks.
Design only — needs bet_log_v1.json entries first.
Usage: feed pick-level log (model_version, prob_est, line, outcome, pl)
Compare high-confidence picks (prob > 0.65) vs low-confidence (prob < 0.55) —
if high-conf doesn't outperform, the confidence is wrong (calibration failure).
Compare portfolio picks (portfolio_decision=true) vs singles — portfolio
must show positive ROI vs singles at same confidence.
Status: NOT BUILT — needs bet_log_v1 data (no picks yet; forecasting is
PARKED/KILLED, not SURVIVOR, so no picks to hold out).
"""
print("ADVERARIAL-HOLDOUT: design ready; run after falsifyBind produces first SURVIVOR picks")
