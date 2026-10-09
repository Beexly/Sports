# Audit re-run — 2026-10-09 11:00 CT

Run from the 10:48 delivery extract. ESPN scoreboard was re-hit. EPL database was not on disk, so the 1.047 figure is explained from the fixed scorer, not re-fit.

## Printed here

- calibration2.py: conformal_coverage_90 = 0.908. Raw Brier 0.25875 → Platt 0.23805, T = 2.4986.
- kelly2.py: fractions [0.1228, 0.0, 0.0836] at rho 0.55. Middle leg is 0. Delivery print was [0.1295, 0.0, 0.0575]. Same structure, different Monte Carlo path. Do not treat the third digit as canonical.
- backtest.py 2025 weeks 1-6: 93 games, 77 predictions, Brier 0.2868 → 0.2464 at T = 7.512, pick acc 0.558, PIT max dev 0.082.

## Not re-fit here

EPL 1.0470 vs Pinnacle 0.9664 needs research.db. The scorer in fit_engines.py now marginalizes the score grid to 1X2 before taking log-loss. That is the right scale. The 21.58 number was the wrong scale.

## 21.58 scale bug

Dixon-Coles dc_loglik scores the exact scoreline: -log P(home goals = x, away goals = y). A single cell in a 9x9 grid is a small probability. Averaged the wrong way, that landed at 21.58 nats per match. Pinnacle 0.966 is -log P(home win / draw / away win) after a multiplicative devig. Three outcomes, not 81.

The gap of +20.6 nats was not a model failure. It was a score-matrix likelihood set next to a 1X2 log-loss. The fix marginalizes the grid to (ph, pd, pa) and scores -log of the outcome that happened. Both sides then sit near 1 nat. Ipswich still needs att.get(team, 0.0), which the fixed scorer has.

## What this does not mean

SRS-only pick accuracy 55.8% with no market input loses to the closing line. T = 7.5 means those probabilities were overconfident. A 100% prediction engine is not a target this packet can claim. The close is the bar. Reasoning sits on top of the number: market, residual, injury replacement, rest, weather, scheme. A metric alone does not emit a pick.
