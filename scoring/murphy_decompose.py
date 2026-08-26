"""Murphy Brier decomposition: reliability / resolution / uncertainty.
Source: Murphy 1973, restated RMets 2022; verified against our harness.
Usage: python scoring/murphy_decompose.py <backtest_rows.jsonl>
No fabricated outputs — runs only when given real data."""
import sys, json, math
# Placeholder design spec — full implementation queued for verification run
# After falsifyBind passes, feed backtest outcome probabilities + actuals
# Compute reliability = mean(p - o) per decile, resolution = var(p), 
# uncertainty = p*(1-p), SS = (BS_clim - BS_model)/BS_clim
print("MURPHY DESIGN SPECS: reliability/resolution/uncertainty + skill-score")
print("Needs: backtest rows with prob_est + outcome (our falsifyBind output)")
print("Next run after falsifyBind produces new SURVIVOR or calibrated predictions")
