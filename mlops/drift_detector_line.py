"""Drift detection: line-change distributions drift faster than outcome distributions.
Source: Sculley et al. 2015 Hidden Technical Debt (NIPS); sports adaptation.
Design: KS-test on closing-spread-change series (week-over-week); PSI on odd/line
ratio distributions; flag when drift exceeds threshold. Only runs on new line data.
Status: DESIGN — needs live line-feed (The Odds API, once signed up); not simulated.
"""
print("DRIFT DETECTOR: KS/PSI on spread-change distributions; needs live feed")
