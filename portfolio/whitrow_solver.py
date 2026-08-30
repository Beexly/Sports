"""Whitrow 2007 JRSS C simultaneous Kelly — portfolio bet sizing.
Source: ideas.repec.org/a/bla/jorssc/v56y2007i5p607-623.html (verified live)
Build note: needs correlation matrix Σ from historical bet logs (our bet_log_v1 schema)
Formula: max E[log(W)] s.t. Σ known; solve via convex optimization.
Status: DESIGN ONLY — needs real picks to build Σ; do NOT claim profit until.
"""
print("WHITROW DESIGN: simultaneous-Kelly max-log-wealth, needs correlation Σ")
print("Requires: bet_log_v1.json entries with portfolio_decision=true")
print("Next: once falsifyBind produces SURVIVOR picks, build Σ from those picks")
